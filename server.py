import asyncio
import json
import os
import re
import time
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

from aiohttp import WSMsgType, web

PORT = int(os.environ.get("PORT", "4173"))
HOST = os.environ.get("HOST", "0.0.0.0")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COLORS = ["#ff4040", "#43a8ff", "#43e06f", "#ffe044", "#d65cff", "#ff923d", "#4de4df", "#ff70b7"]
PLAYERS = {}
ROOM = {"started": False, "paused": False, "floor": 1, "round": 1, "notebooks": set(), "ready": set()}
FEEDS = [{"source": "BBC", "url": "https://feeds.bbci.co.uk/news/rss.xml"}]


def public_players():
    return [{key: value for key, value in player.items() if key != "ws"} for player in PLAYERS.values()]


async def send(player_id, payload):
    player = PLAYERS.get(player_id)
    if player and not player["ws"].closed:
        await player["ws"].send_json(payload)


async def broadcast(payload, exclude=None):
    for player_id, player in list(PLAYERS.items()):
        if player_id == exclude or player["ws"].closed:
            continue
        try:
            await player["ws"].send_json(payload)
        except Exception:
            pass


async def broadcast_roster():
    await broadcast({"type": "roster", "players": public_players(), "count": len(PLAYERS)})


async def start_or_resume_room():
    if len(PLAYERS) < 2:
        ROOM["paused"] = True
        await broadcast({"type": "waiting", "count": len(PLAYERS), "minimum": 2})
        return
    if not ROOM["started"]:
        ROOM.update(started=True, paused=False, floor=1, round=1, notebooks=set(), ready=set())
        await broadcast({"type": "start", "floor": 1, "notebooks": []})
    elif ROOM["paused"]:
        ROOM["paused"] = False
        await broadcast({"type": "resume", "floor": ROOM["floor"]})


def safe_number(value, low, high, default=0.0):
    try:
        return max(low, min(high, float(value)))
    except (TypeError, ValueError):
        return default


async def websocket_handler(request):
    websocket = web.WebSocketResponse(heartbeat=25, max_msg_size=16_384)
    await websocket.prepare(request)
    player_id = None
    try:
        first = await websocket.receive(timeout=20)
        if first.type != WSMsgType.TEXT:
            return websocket
        message = json.loads(first.data)
        if message.get("type") != "join" or len(PLAYERS) >= 16:
            await websocket.send_json({"type": "error", "message": "The public server is full or the join request was invalid."})
            return websocket
        raw_name = re.sub(r"[^A-Za-z0-9 _-]", "", str(message.get("username", ""))).strip()[:18]
        base_name = raw_name or "Student"
        names = {player["username"].lower() for player in PLAYERS.values()}
        username, suffix = base_name, 2
        while username.lower() in names:
            username = f"{base_name[:14]} {suffix}"
            suffix += 1
        player_id = uuid.uuid4().hex[:12]
        player = {"id": player_id, "username": username, "color": COLORS[len(PLAYERS) % len(COLORS)], "x": 0.0, "y": 0.0, "z": 0.0, "a": 0.0, "floor": ROOM["floor"], "moving": False, "joinedAt": int(time.time()), "ws": websocket}
        PLAYERS[player_id] = player
        await websocket.send_json({"type": "joined", "id": player_id, "username": username, "color": player["color"], "started": ROOM["started"], "floor": ROOM["floor"]})
        await broadcast_roster()
        if ROOM["started"] and len(PLAYERS) >= 2:
            await websocket.send_json({"type": "start", "floor": ROOM["floor"], "notebooks": sorted(ROOM["notebooks"])})
        await start_or_resume_room()
        async for incoming in websocket:
            if incoming.type != WSMsgType.TEXT:
                if incoming.type in (WSMsgType.CLOSE, WSMsgType.ERROR):
                    break
                continue
            try:
                message = json.loads(incoming.data)
            except (TypeError, json.JSONDecodeError):
                continue
            kind = message.get("type")
            if kind == "state":
                try:
                    floor = max(1, min(4, int(message.get("floor", ROOM["floor"]))))
                except (TypeError, ValueError):
                    floor = ROOM["floor"]
                player.update(x=safe_number(message.get("x"), -2000, 2000), y=safe_number(message.get("y"), -2000, 2000), z=safe_number(message.get("z"), 0, 200), a=safe_number(message.get("a"), -1000, 1000), floor=floor, moving=bool(message.get("moving")))
                await broadcast({"type": "state", **{key: value for key, value in player.items() if key != "ws"}}, exclude=player_id)
            elif kind == "notebook" and player["floor"] == ROOM["floor"]:
                try:
                    index = max(0, min(255, int(message.get("index", 0))))
                    round_number = max(1, min(2, int(message.get("round", 1))))
                except (TypeError, ValueError):
                    continue
                key = f"{ROOM['floor']}:{round_number}:{index}"
                if key not in ROOM["notebooks"]:
                    ROOM["notebooks"].add(key)
                    await broadcast({"type": "notebook", "playerId": player_id, "index": index, "round": round_number, "floor": ROOM["floor"]})
            elif kind == "elevator" and player["floor"] == ROOM["floor"]:
                ROOM["ready"].add(player_id)
                active = set(PLAYERS)
                await broadcast({"type": "elevator_wait", "ready": len(ROOM["ready"] & active), "total": len(active)})
                if len(active) >= 2 and active.issubset(ROOM["ready"]):
                    if ROOM["floor"] == 4:
                        ROOM["ready"].clear()
                        await broadcast({"type": "boss"})
                        continue
                    ROOM["floor"] += 1
                    ROOM["round"] = 1
                    ROOM["ready"].clear()
                    ROOM["notebooks"].clear()
                    for connected in PLAYERS.values():
                        connected["floor"] = ROOM["floor"]
                    await broadcast({"type": "floor", "floor": ROOM["floor"], "notebooks": []})
            elif kind == "caught":
                victim_id = str(message.get("playerId", ""))
                if victim_id in PLAYERS:
                    await send(victim_id, {"type": "eliminated", "message": "Joseph caught you. You left the public game."})
                    await PLAYERS[victim_id]["ws"].close(code=4001, message=b"caught")
    except (asyncio.TimeoutError, ConnectionError, json.JSONDecodeError):
        pass
    finally:
        if player_id:
            PLAYERS.pop(player_id, None)
            ROOM["ready"].discard(player_id)
            await broadcast_roster()
            if not PLAYERS:
                ROOM.update(started=False, paused=False, floor=1, round=1, notebooks=set(), ready=set())
            else:
                await start_or_resume_room()
    return websocket


async def news_api(_request):
    try:
        return web.json_response({"items": await asyncio.to_thread(collect_news_items)})
    except Exception as error:
        return web.json_response({"items": [], "error": str(error)}, status=500)


async def wallpapers_api(_request):
    try:
        return web.json_response({"items": collect_wallpapers()})
    except Exception as error:
        return web.json_response({"items": [], "error": str(error)}, status=500)


async def static_file(request):
    relative = urllib.parse.unquote(request.match_info.get("path", "")) or "index.html"
    target = os.path.realpath(os.path.join(BASE_DIR, relative))
    if os.path.commonpath((BASE_DIR, target)) != BASE_DIR:
        raise web.HTTPForbidden()
    if os.path.isdir(target):
        target = os.path.join(target, "index.html")
    if not os.path.isfile(target):
        raise web.HTTPNotFound()
    return web.FileResponse(target)


def collect_news_items():
    items = []
    for feed in FEEDS:
        items.extend(fetch_feed_items(feed["source"], feed["url"]))
    items.sort(key=lambda item: item["timestamp"], reverse=True)
    return items[:4]


def fetch_feed_items(source, url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"})
    with urllib.request.urlopen(request, timeout=15) as response:
        xml_bytes = response.read()
    root = ET.fromstring(xml_bytes)
    channel = root.find("channel")
    if channel is None:
        return []
    channel_image = clean_text(channel.findtext("image/url", default=""))
    results, media_ns = [], {"media": "http://search.yahoo.com/mrss/"}
    for item in channel.findall("item")[:4]:
        link = clean_text(item.findtext("link", default="#"))
        description = item.findtext("description", default="")
        source_node = item.find("source")
        source_url = clean_text(source_node.get("url")) if source_node is not None and source_node.get("url") else ""
        results.append({"source": source, "title": clean_text(item.findtext("title", default=source)), "link": link, "image": extract_item_image(item, link, description, media_ns, source_url, channel_image), "timestamp": parse_timestamp(clean_text(item.findtext("pubDate", default="")))})
    return results


def parse_timestamp(value):
    try:
        return int(parsedate_to_datetime(value).timestamp()) if value else 0
    except Exception:
        return 0


def clean_text(value):
    return " ".join((value or "").split())


def extract_item_image(item, link, description, media_ns, source_url="", channel_image=""):
    thumbnail = item.find("media:thumbnail", media_ns)
    if thumbnail is not None and thumbnail.get("url"):
        return thumbnail.get("url")
    content = item.find("media:content", media_ns)
    if content is not None and content.get("url"):
        return content.get("url")
    match = re.search(r'<img[^>]+src="([^"]+)"', description or "", re.IGNORECASE)
    return match.group(1) if match else fetch_page_image(link) or fetch_page_image(source_url) or channel_image


def fetch_page_image(link):
    if not link or link == "#":
        return ""
    try:
        request = urllib.request.Request(link, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"})
        with urllib.request.urlopen(request, timeout=12) as response:
            html = response.read(200000).decode("utf-8", "ignore")
    except Exception:
        return ""
    for pattern in (r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', r'<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"', r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"', r'<meta[^>]+content="([^"]+)"[^>]+name="twitter:image"'):
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return html_unescape(match.group(1))
    return ""


def html_unescape(value):
    return (value or "").replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'")


def collect_wallpapers():
    wallpaper_dir = os.path.join(BASE_DIR, "AeroVistaX Wallpapers")
    if not os.path.isdir(wallpaper_dir):
        return []
    items = []
    for name in sorted(os.listdir(wallpaper_dir), key=lambda value: (0 if value.lower() == "null0.jpg" else 1, value.lower())):
        if name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            relative_path = os.path.join("AeroVistaX Wallpapers", name).replace("\\", "/")
            items.append({"name": name, "path": "/" + urllib.parse.quote(relative_path, safe="/")})
    return items


def create_app():
    app = web.Application()
    app.router.add_get("/api/news", news_api)
    app.router.add_get("/api/wallpapers", wallpapers_api)
    app.router.add_get("/ws", websocket_handler)
    app.router.add_get("/{path:.*}", static_file)
    return app


if __name__ == "__main__":
    web.run_app(create_app(), host=HOST, port=PORT)
