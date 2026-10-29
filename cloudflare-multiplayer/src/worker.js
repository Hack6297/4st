const COLORS = ["#ff4040", "#43a8ff", "#43e06f", "#ffe044", "#d65cff", "#ff923d", "#4de4df", "#ff70b7"];
const FEATURED_JOSEPH_STORY = {
  source: "4STUDIOS",
  title: "Joseph's Fun Schoolhouse is now playable online",
  link: "https://www.4studios.club/Built-in%20apps/Joseph%27s%20Fun%20schoolhouse/Josephs_Basics.html",
  image: "https://www.4studios.club/imageres/joseph-splash.svg",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/news") {
      return liveNews();
    }
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "four-studios-multiplayer" });
    }
    if (url.pathname === "/minecraft" || url.pathname.startsWith("/minecraft/")) {
      const gameUrl = new URL(request.url);
      gameUrl.pathname = gameUrl.pathname.slice("/minecraft".length) || "/";
      return env.MINECRAFT_ROOMS.getByName("public-world").fetch(new Request(gameUrl, request));
    }
    if (url.pathname !== "/ws" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Not found", { status: 404 });
    }
    return env.ROOMS.getByName("public-schoolhouse").fetch(request);
  },
};

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rssField(item, name) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return decodeXml(match?.[1] || "");
}

function rssThumbnail(item) {
  const match = item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  return decodeXml(match?.[1] || "");
}

async function liveNews() {
  try {
    const response = await fetch("https://feeds.bbci.co.uk/news/rss.xml", {
      headers: { "User-Agent": "4StudiosHeadlines/1.0" },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!response.ok) throw new Error(`BBC returned ${response.status}`);
    const xml = await response.text();
    const items = [FEATURED_JOSEPH_STORY, ...[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 3).map((match) => ({
      source: "BBC",
      title: rssField(match[1], "title"),
      link: rssField(match[1], "link"),
      image: rssThumbnail(match[1]),
    }))].filter((item) => item.title && item.link);
    if (!items.length) throw new Error("BBC returned no headlines");
    return Response.json({ items }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ items: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export class MultiplayerRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.players = new Map();
    this.room = { started: false, paused: false, floor: 1, round: 1, notebooks: new Set(), ready: new Set() };
    for (const ws of ctx.getWebSockets()) {
      const player = ws.deserializeAttachment();
      if (player?.id) this.players.set(player.id, { ...player, ws });
    }
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get("room");
      if (saved) {
        this.room = {
          ...saved,
          notebooks: new Set(saved.notebooks || []),
          ready: new Set(saved.ready || []),
        };
      }
    });
  }

  persistRoom() {
    return this.ctx.storage.put("room", {
      ...this.room,
      notebooks: [...this.room.notebooks],
      ready: [...this.room.ready],
    });
  }

  async fetch() {
    if (this.players.size >= 16) {
      return new Response("The public server is full.", { status: 503 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ joined: false });
    return new Response(null, { status: 101, webSocket: client });
  }

  publicPlayer(player) {
    const { ws, lastChat, ...publicData } = player;
    return publicData;
  }

  send(ws, payload) {
    try { ws.send(JSON.stringify(payload)); } catch {}
  }

  broadcast(payload, excludedId = null) {
    const data = JSON.stringify(payload);
    for (const player of this.players.values()) {
      if (player.id === excludedId) continue;
      try { player.ws.send(data); } catch {}
    }
  }

  roster() {
    this.broadcast({ type: "roster", players: [...this.players.values()].map((p) => this.publicPlayer(p)), count: this.players.size });
  }

  startOrResume() {
    if (this.players.size < 2) {
      this.room.paused = true;
      this.broadcast({ type: "waiting", count: this.players.size, minimum: 2 });
      this.ctx.waitUntil(this.persistRoom());
      return;
    }
    if (!this.room.started) {
      Object.assign(this.room, { started: true, paused: false, floor: 1, round: 1 });
      this.room.notebooks.clear();
      this.room.ready.clear();
      this.broadcast({ type: "start", floor: 1, notebooks: [] });
    } else if (this.room.paused) {
      this.room.paused = false;
      this.broadcast({ type: "resume", floor: this.room.floor });
    }
    this.ctx.waitUntil(this.persistRoom());
  }

  cleanName(value) {
    return String(value ?? "").replace(/[^A-Za-z0-9 _-]/g, "").trim().slice(0, 18) || "Student";
  }

  number(value, low, high, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(low, Math.min(high, parsed)) : fallback;
  }

  async webSocketMessage(ws, raw) {
    let message;
    try { message = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)); } catch { return; }
    const attachment = ws.deserializeAttachment() || {};

    if (!attachment.joined) {
      if (message.type !== "join" || this.players.size >= 16) {
        this.send(ws, { type: "error", message: "The public server is full or the join request was invalid." });
        ws.close(1008, "invalid join");
        return;
      }
      const base = this.cleanName(message.username);
      const names = new Set([...this.players.values()].map((p) => p.username.toLowerCase()));
      let username = base;
      let suffix = 2;
      while (names.has(username.toLowerCase())) username = `${base.slice(0, 14)} ${suffix++}`;
      const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
      const player = { id, username, color: COLORS[this.players.size % COLORS.length], x: 0, y: 0, z: 0, a: 0, floor: this.room.floor, moving: false, joinedAt: Math.floor(Date.now() / 1000), lastChat: 0, ws };
      this.players.set(id, player);
      ws.serializeAttachment({ joined: true, id, username, color: player.color, x: 0, y: 0, z: 0, a: 0, floor: player.floor, moving: false, joinedAt: player.joinedAt, lastChat: 0 });
      this.send(ws, { type: "joined", id, username, color: player.color, started: this.room.started, floor: this.room.floor });
      this.roster();
      if (this.room.started && this.players.size >= 2) this.send(ws, { type: "start", floor: this.room.floor, notebooks: [...this.room.notebooks].sort() });
      this.startOrResume();
      return;
    }

    const player = this.players.get(attachment.id);
    if (!player) return;
    if (message.type === "state") {
      player.x = this.number(message.x, -2000, 2000);
      player.y = this.number(message.y, -2000, 2000);
      player.z = this.number(message.z, 0, 200);
      player.a = this.number(message.a, -1000, 1000);
      player.floor = Math.max(1, Math.min(4, Number.parseInt(message.floor, 10) || this.room.floor));
      player.moving = Boolean(message.moving);
      // Keep the join marker in the hibernatable WebSocket attachment. Without
      // it, the next state update is treated as an invalid first message and
      // the player is immediately disconnected.
      ws.serializeAttachment({ joined: true, ...this.publicPlayer(player), lastChat: player.lastChat });
      this.broadcast({ type: "state", ...this.publicPlayer(player) }, player.id);
    } else if (message.type === "chat") {
      const now = Date.now();
      const text = String(message.text ?? "").replace(/[\x00-\x1f\x7f]/g, " ").trim().replace(/\s+/g, " ").slice(0, 180);
      if (text && now - player.lastChat >= 750) {
        player.lastChat = now;
        this.broadcast({ type: "chat", playerId: player.id, username: player.username, color: player.color, text, sentAt: Math.floor(now / 1000) });
      }
    } else if (message.type === "notebook" && player.floor === this.room.floor) {
      const index = Math.max(0, Math.min(255, Number.parseInt(message.index, 10) || 0));
      const round = Math.max(1, Math.min(2, Number.parseInt(message.round, 10) || 1));
      const key = `${this.room.floor}:${round}:${index}`;
      if (!this.room.notebooks.has(key)) {
        this.room.notebooks.add(key);
        this.broadcast({ type: "notebook", playerId: player.id, index, round, floor: this.room.floor });
        this.ctx.waitUntil(this.persistRoom());
      }
    } else if (message.type === "elevator" && player.floor === this.room.floor) {
      this.room.ready.add(player.id);
      this.broadcast({ type: "elevator_wait", ready: this.room.ready.size, total: this.players.size });
      if (this.players.size >= 2 && [...this.players.keys()].every((id) => this.room.ready.has(id))) {
        this.room.ready.clear();
        if (this.room.floor === 4) {
          this.broadcast({ type: "boss" });
        } else {
          this.room.floor += 1;
          this.room.round = 1;
          this.room.notebooks.clear();
          for (const connected of this.players.values()) connected.floor = this.room.floor;
          this.broadcast({ type: "floor", floor: this.room.floor, notebooks: [] });
        }
      }
      this.ctx.waitUntil(this.persistRoom());
    } else if (message.type === "caught") {
      const victim = this.players.get(String(message.playerId ?? ""));
      if (victim) {
        this.send(victim.ws, { type: "eliminated", message: "Joseph caught you. You left the public game." });
        victim.ws.close(4001, "caught");
      }
    }
  }

  async webSocketClose(ws) { this.remove(ws); }
  async webSocketError(ws) { this.remove(ws); }

  remove(ws) {
    const id = ws.deserializeAttachment()?.id;
    if (!id) return;
    this.players.delete(id);
    this.room.ready.delete(id);
    this.roster();
    if (!this.players.size) {
      Object.assign(this.room, { started: false, paused: false, floor: 1, round: 1 });
      this.room.notebooks.clear();
      this.room.ready.clear();
    } else {
      this.startOrResume();
    }
    this.ctx.waitUntil(this.persistRoom());
  }
}

const MINECRAFT_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export class MinecraftRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = { seed: 199201, spawn: null, cubes: [], removed: [], players: {}, chat: [] };
    this.events = [];
    this.nextEventId = 1;
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get("minecraft-state");
      if (saved) {
        this.state = saved.state || this.state;
        this.events = saved.events || [];
        this.nextEventId = saved.nextEventId || 1;
      }
    });
  }

  json(payload, status = 200) {
    return Response.json(payload, { status, headers: MINECRAFT_CORS });
  }

  number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  vector(value, fallback) {
    return Array.isArray(value) && value.length >= 3
      ? value.slice(0, 3).map((item, index) => this.number(item, fallback[index]))
      : fallback;
  }

  addEvent(event) {
    const recorded = { ...event, id: this.nextEventId++, time: Date.now() / 1000 };
    this.events.push(recorded);
    if (this.events.length > 1000) this.events.splice(0, this.events.length - 1000);
    return recorded;
  }

  async persist() {
    await this.ctx.storage.put("minecraft-state", {
      state: this.state,
      events: this.events,
      nextEventId: this.nextEventId,
    });
  }

  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: MINECRAFT_CORS });
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/state") {
      return this.json({ state: this.state, last_event_id: this.events.at(-1)?.id || 0 });
    }
    if (request.method === "GET" && path === "/events") {
      const since = Math.max(0, Number.parseInt(url.searchParams.get("since") || "0", 10) || 0);
      return this.json({ events: this.events.filter((event) => event.id > since), last_event_id: this.events.at(-1)?.id || 0 });
    }
    if (request.method !== "POST") return this.json({ error: "not found" }, 404);

    let body = {};
    try { body = await request.json(); } catch {}
    const playerId = String(body.player_id || "").trim().slice(0, 80);
    if (!playerId) return this.json({ error: "player_id required" }, 400);

    let response;
    if (path === "/join") {
      if (!this.state.spawn) this.state.spawn = this.vector(body.spawn, [0.5, 72, 0.5]);
      this.state.players[playerId] = { position: this.state.spawn, rotation: [0, 0, 0], last_seen: Date.now() / 1000 };
      this.addEvent({ type: "join", player_id: playerId, ...this.state.players[playerId] });
      response = { ok: true, state: this.state, last_event_id: this.events.at(-1)?.id || 0 };
    } else if (path === "/move") {
      const player = this.state.players[playerId] || {};
      player.position = this.vector(body.position, [0, 15, 0]);
      player.rotation = this.vector(body.rotation, [0, 0, 0]);
      player.last_seen = Date.now() / 1000;
      this.state.players[playerId] = player;
      response = { ok: true, event: this.addEvent({ type: "move", player_id: playerId, position: player.position, rotation: player.rotation }) };
    } else if (path === "/place") {
      const cube = body.cube || {};
      const cleanCube = { id: String(cube.id || ""), x: this.number(cube.x), y: this.number(cube.y), z: this.number(cube.z), texture: String(cube.texture || "grass") };
      if (!cleanCube.id) return this.json({ error: "cube.id required" }, 400);
      this.state.removed = this.state.removed.filter((id) => id !== cleanCube.id);
      this.state.cubes = this.state.cubes.filter((old) => old.id !== cleanCube.id);
      this.state.cubes.push(cleanCube);
      response = { ok: true, event: this.addEvent({ type: "place", player_id: playerId, cube: cleanCube }) };
    } else if (path === "/break") {
      const cubeId = String(body.cube_id || "");
      this.state.cubes = this.state.cubes.filter((cube) => cube.id !== cubeId);
      if (cubeId && !this.state.removed.includes(cubeId)) this.state.removed.push(cubeId);
      if (this.state.removed.length > 5000) this.state.removed.splice(0, this.state.removed.length - 5000);
      response = { ok: true, event: this.addEvent({ type: "break", player_id: playerId, cube_id: cubeId }) };
    } else if (path === "/chat") {
      const message = String(body.message || "").replace(/[\x00-\x1f\x7f]/g, " ").trim().slice(0, 160);
      if (!message) return this.json({ error: "message required" }, 400);
      const chat = { player_id: playerId, message, time: Date.now() / 1000 };
      this.state.chat.push(chat);
      if (this.state.chat.length > 100) this.state.chat.shift();
      response = { ok: true, event: this.addEvent({ type: "chat", ...chat }) };
    } else if (path === "/quit") {
      delete this.state.players[playerId];
      response = { ok: true, event: this.addEvent({ type: "quit", player_id: playerId }) };
    } else {
      return this.json({ error: "not found" }, 404);
    }

    await this.persist();
    return this.json(response);
  }
}
