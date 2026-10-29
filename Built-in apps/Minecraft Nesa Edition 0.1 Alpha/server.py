import json
import mimetypes
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8765"))
ROOT_DIR = Path(__file__).resolve().parent
STATIC_DIR = ROOT_DIR / "dist"
STATIC_EXTENSIONS = {
    ".css",
    ".html",
    ".js",
    ".jpg",
    ".jpeg",
    ".mp3",
    ".mp4",
    ".png",
    ".svg",
    ".ttf",
    ".webp",
}

state = {
    "seed": 199201,
    "spawn": None,
    "cubes": [],
    "removed": [],
    "players": {},
    "chat": [],
}
events = []
next_event_id = 1


def send_event(event):
    global next_event_id

    event["id"] = next_event_id
    event["time"] = time.time()
    next_event_id += 1
    events.append(event)

    if len(events) > 1000:
        del events[: len(events) - 1000]

    return event


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}

    try:
        return json.loads(handler.rfile.read(length).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


def clean_cube(cube):
    return {
        "id": str(cube.get("id", "")),
        "x": int(cube.get("x", 0)),
        "y": int(cube.get("y", 0)),
        "z": int(cube.get("z", 0)),
        "texture": str(cube.get("texture", "grass")),
    }


def clean_vector(value, fallback):
    if not isinstance(value, list) or len(value) < 3:
        return fallback

    try:
        return [float(value[0]), float(value[1]), float(value[2])]
    except (TypeError, ValueError):
        return fallback


def static_file_for_path(path):
    base_dir = STATIC_DIR if (STATIC_DIR / "index.html").is_file() else ROOT_DIR
    candidate = base_dir / ("index.html" if path == "/" else path.lstrip("/"))

    try:
        resolved = candidate.resolve()
        if not resolved.is_relative_to(base_dir.resolve()):
            return None
    except (OSError, ValueError):
        return None

    if resolved.is_file() and resolved.suffix.lower() in STATIC_EXTENSIONS:
        return resolved

    fallback = base_dir / "index.html"
    return fallback if fallback.is_file() else None


class SyncHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def write_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def write_file(self, file_path):
        body = file_path.read_bytes()
        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.write_json({"ok": True})

    def do_HEAD(self):
        parsed = urlparse(self.path)
        static_file = static_file_for_path(parsed.path)
        if static_file:
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(str(static_file))[0] or "application/octet-stream")
            self.send_header("Content-Length", str(static_file.stat().st_size))
            self.end_headers()
            return

        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/health":
            self.write_json({
                "ok": True,
                "message": "Minecraft Nesa sync server is running",
                "game": "Open / for the game after npm run build",
                "state": "Open /state to inspect multiplayer state",
            })
            return

        if parsed.path == "/events":
            query = parse_qs(parsed.query)
            since = int(query.get("since", ["0"])[0] or 0)
            recent_events = [event for event in events if event["id"] > since]
            self.write_json({
                "events": recent_events,
                "last_event_id": events[-1]["id"] if events else 0,
            })
            return

        if parsed.path == "/state":
            self.write_json({
                "state": state,
                "last_event_id": events[-1]["id"] if events else 0,
            })
            return

        static_file = static_file_for_path(parsed.path)
        if static_file:
            self.write_file(static_file)
            return

        self.write_json({"error": "not found"}, 404)

    def do_POST(self):
        payload = read_json(self)
        player_id = str(payload.get("player_id", "")).strip()

        if self.path != "/join" and not player_id:
            self.write_json({"error": "player_id required"}, 400)
            return

        if self.path == "/join":
            if not player_id:
                self.write_json({"error": "player_id required"}, 400)
                return

            if state["spawn"] is None:
                state["spawn"] = clean_vector(payload.get("spawn"), [0.5, 72, 0.5])

            state["players"][player_id] = {
                "position": state["spawn"],
                "rotation": [0, 0, 0],
                "last_seen": time.time(),
            }
            send_event({
                "type": "join",
                "player_id": player_id,
                "position": state["players"][player_id]["position"],
                "rotation": state["players"][player_id]["rotation"],
            })
            self.write_json({
                "ok": True,
                "state": state,
                "last_event_id": events[-1]["id"] if events else 0,
            })
            return

        if self.path == "/move":
            player = state["players"].setdefault(player_id, {})
            player["position"] = clean_vector(payload.get("position"), [0, 15, 0])
            player["rotation"] = clean_vector(payload.get("rotation"), [0, 0, 0])
            player["last_seen"] = time.time()
            event = send_event({
                "type": "move",
                "player_id": player_id,
                "position": player["position"],
                "rotation": player["rotation"],
            })
            self.write_json({"ok": True, "event": event})
            return

        if self.path == "/place":
            cube = clean_cube(payload.get("cube", {}))
            if not cube["id"]:
                self.write_json({"error": "cube.id required"}, 400)
                return

            state["removed"] = [cube_id for cube_id in state["removed"] if cube_id != cube["id"]]
            state["cubes"] = [old for old in state["cubes"] if old["id"] != cube["id"]]
            state["cubes"].append(cube)
            event = send_event({"type": "place", "player_id": player_id, "cube": cube})
            self.write_json({"ok": True, "event": event})
            return

        if self.path == "/break":
            cube_id = str(payload.get("cube_id", ""))
            state["cubes"] = [cube for cube in state["cubes"] if cube["id"] != cube_id]
            if cube_id and cube_id not in state["removed"]:
                state["removed"].append(cube_id)
            if len(state["removed"]) > 5000:
                del state["removed"][: len(state["removed"]) - 5000]
            event = send_event({"type": "break", "player_id": player_id, "cube_id": cube_id})
            self.write_json({"ok": True, "event": event})
            return

        if self.path == "/quit":
            state["players"].pop(player_id, None)
            event = send_event({"type": "quit", "player_id": player_id})
            self.write_json({"ok": True, "event": event})
            return

        if self.path == "/chat":
            message = str(payload.get("message", "")).strip()
            if not message:
                self.write_json({"error": "message required"}, 400)
                return

            chat_message = {
                "player_id": player_id,
                "message": message[:160],
                "time": time.time(),
            }
            state["chat"].append(chat_message)
            if len(state["chat"]) > 100:
                del state["chat"][: len(state["chat"]) - 100]

            event = send_event({"type": "chat", **chat_message})
            self.write_json({"ok": True, "event": event})
            return

        self.write_json({"error": "not found"}, 404)

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), SyncHandler)
    print(f"Minecraft Nesa sync server listening on http://{HOST}:{PORT}")
    server.serve_forever()
