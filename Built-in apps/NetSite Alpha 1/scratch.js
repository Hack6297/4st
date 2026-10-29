/* ===============================================================
   scratch.js  -  Scratch 1.0 runtime, stage, sprite, Blockly init
   Uses Blockly v11 JavaScript generator (Geras renderer)
   =============================================================== */

"use strict";

// ==============================================================
//  CONSTANTS
// ==============================================================
var STAGE_W = 480;
var STAGE_H = 360;
var UNIT_PX = 3; // 1 Scratch unit = 3 pixels on stage

// ==============================================================
//  CAMERA (infinite scrolling)
// ==============================================================
var cameraX = 0;
var cameraY = 0;
var _cameraFollowTarget = null;  // sprite being followed (set by camera follow block)
var _cameraSmooth = 0.6;        // lerp factor for smooth following

// ==============================================================
//  SPRITE LIBRARY (from assets/sprites)
// ==============================================================
var SPRITE_LIBRARY = [
  { name: "Bob", path: "assets/sprites/bob/bob.png" },
  { name: "Bob Running1", path: "assets/sprites/bob/bob_running1.png" },
  { name: "Bob Running2", path: "assets/sprites/bob/bob_running2.png" },
  { name: "Bob Talking", path: "assets/sprites/bob/bob_talking.png" },
  { name: "Bob Shocked", path: "assets/sprites/bob/bob_shocked.png" },
  { name: "Cat", path: "assets/sprites/cat.png" },
  { name: "Gobo", path: "assets/sprites/gobo.png" },
  { name: "Apple", path: "assets/sprites/apple.png" },
  { name: "Banana", path: "assets/sprites/banana.png" },
  { name: "Bug", path: "assets/sprites/bug.png" },
  { name: "Butterfly", path: "assets/sprites/butterfly.png" },
  { name: "Cheese Puffs", path: "assets/sprites/cheese_puffs.png" },
  { name: "Crab", path: "assets/sprites/crab.png" },
  { name: "Duck", path: "assets/sprites/duck.png" },
  { name: "Fortune Cookie", path: "assets/sprites/fortune_cookie.png" },
  { name: "Fruit Salad", path: "assets/sprites/fruit_salad.png" },
  { name: "Birthday Cake", path: "assets/sprites/birthday_cake/birthday_cake.png" },
  { name: "Creature 1", path: "assets/sprites/creatures/creature1.png" },
  { name: "Creature 1 Happy", path: "assets/sprites/creatures/creature1_happy.png" },
  { name: "Creature 2", path: "assets/sprites/creatures/creature2.png" },
  { name: "Creature 3", path: "assets/sprites/creatures/creature3.png" },
  { name: "Creature 4", path: "assets/sprites/creatures/creature4.png" },
  { name: "Creature 5", path: "assets/sprites/creatures/creature5.png" },
  { name: "Creature 6", path: "assets/sprites/creatures/creature6.png" },
  { name: "Dog", path: "assets/sprites/dog/dog.png" },
  { name: "Dog Thinking", path: "assets/sprites/dog/dog_thinking.png" },
  { name: "Dog Walking", path: "assets/sprites/dog/dog_walking.png" },
  { name: "Elephant", path: "assets/sprites/elephant/elephant.png" },
  { name: "Elephant 1", path: "assets/sprites/elephant/elephant1.png" },
  { name: "Lion", path: "assets/sprites/lion/lion.png" },
  { name: "Lion Roaring", path: "assets/sprites/lion/lion_roaring.png" },
  { name: "Shark", path: "assets/sprites/shark/shark.png" },
  { name: "Shark Bite", path: "assets/sprites/shark/shark_bite.png" },
  { name: "Shark Open Mouth", path: "assets/sprites/shark/shark_open_mouth.png" },
];

// ==============================================================
//  OBJECT LIBRARY (built-in geometric/physics objects)
// ==============================================================
var OBJECT_LIBRARY = [
  { name: "Square", shape: "square" },
  { name: "Ground", shape: "ground" },
  { name: "Platform", shape: "platform" },
  { name: "Physics Ball", shape: "physics_ball" },
  { name: "Bouncing Ball", shape: "bouncing_ball" },
  { name: "Ramp", shape: "ramp" },
  { name: "Triangle", shape: "triangle" },
  { name: "Circle", shape: "circle" },
  { name: "3D Cube", shape: "cube3d" },
  { name: "Custom", shape: "custom" },
];

var OBJECT_DIMS = {
  square: { w: 40, h: 40 },
  ground: { w: 160, h: 16 },
  platform: { w: 100, h: 12 },
  physics_ball: { w: 32, h: 32 },
  bouncing_ball: { w: 32, h: 32 },
  ramp: { w: 60, h: 30 },
  triangle: { w: 40, h: 35 },
  circle: { w: 40, h: 40 },
  cube3d: { w: 52, h: 52 },
  custom: { w: 40, h: 40 },
};

// ==============================================================
//  SPRITE MODEL
// ==============================================================
class Sprite {
  constructor(name, imgPath) {
    this.name = name;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.dir = 90;
    this.size = 50;
    this.visible = true;
    this.imgPath = imgPath || null;
    this.img = null;
    this.imgLoaded = false;
    this.speech = null;
    this.speechType = "say";
    this.speechTimeout = null;
    this._workspace = null;
    this._baseW = 80;
    this._baseH = 80;

    // New properties
    this.isStatic = false;
    this.gravity = 0;
    this.vx = 0;
    this.vy = 0;
    this.objectType = "sprite";  // "sprite" or "object"
    this.objectShape = null;     // null for sprites, shape name for objects
    this.costumes = [];        // array of {name, dataURL}
    this.currentCostume = 0;
    this.sounds = [];        // array of {name, dataURL}
    this.rotationStyle = "any";  // "any", "left-right", "up-down", "none"
    this.scaleX = 100;
    this.scaleY = 100;
    this.scaleZ = 100;
    this.draggable = true;   // drag mode (disabled during green flag)
    this.collideable = true;  // whether this sprite participates in collision
    this.isBackground = false; // true for the built-in background sprite

    if (this.imgPath) {
      this.img = new Image();
      var self = this;
      this.img.onload = function () {
        self.imgLoaded = true;
        var w = self.img.naturalWidth;
        var h = self.img.naturalHeight;
        var maxDim = Math.max(w, h, 1);
        var fit = 80 / maxDim;
        self._baseW = w * fit;
        self._baseH = h * fit;
      };
      this.img.src = this.imgPath;
    }
  }

  draw(ctx) {
    if (!this.visible) return;
    ctx.save();
    var cx = STAGE_W / 2 + (this.x - cameraX) * UNIT_PX;
    var cy = STAGE_H / 2 - (this.y - cameraY) * UNIT_PX;
    var scale = this.size / 100;

    ctx.translate(cx, cy);

    // Apply scale X/Y
    var sxFactor = (this.scaleX || 100) / 100;
    var syFactor = (this.scaleY || 100) / 100;
    // For object shapes, pass sx/sy to _drawShape to avoid stroke distortion
    if (!this.objectShape) ctx.scale(sxFactor, syFactor);

    // Apply rotation style
    var flipH = false;
    if (this.rotationStyle === "any") {
      ctx.rotate((this.dir - 90) * Math.PI / 180);
    } else if (this.rotationStyle === "left-right") {
      if (this.dir > 180) flipH = true;
      if (flipH) ctx.scale(-1, 1);
    } else if (this.rotationStyle === "up-down") {
      if (this.dir > 90 && this.dir < 270) ctx.scale(1, -1);
    }
    // "none" — no rotation at all

    if (this.img && this.imgLoaded) {
      var hw = this._baseW * scale * UNIT_PX / 2;
      var hh = this._baseH * scale * UNIT_PX / 2;
      ctx.drawImage(this.img, -hw, -hh, hw * 2, hh * 2);
    } else if (this.objectShape) {
      this._drawShape(ctx, scale * UNIT_PX, sxFactor, syFactor);
    } else {
      var r = 20 * scale * UNIT_PX;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = "#4C97FF";
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Direction arrow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r + 6, 0);
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r + 6, 0);
      ctx.lineTo(r + 1, -4);
      ctx.lineTo(r + 1, 4);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fill();
      // Eyes
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.3, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.3, r * 0.09, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    if (this.speech) {
      var bubbleY = cy - (this.img && this.imgLoaded ? this._baseH * scale * UNIT_PX / 2 : 20 * scale * UNIT_PX) - 10;
      this._drawBubble(ctx, cx, bubbleY);
    }
  }

  hitTest(canvasX, canvasY) {
    var cx = STAGE_W / 2 + (this.x - cameraX) * UNIT_PX;
    var cy = STAGE_H / 2 - (this.y - cameraY) * UNIT_PX;
    var scale = this.size / 100;
    var sxF = (this.scaleX || 100) / 100, syF = (this.scaleY || 100) / 100;
    var hw, hh;
    if (this.img && this.imgLoaded) {
      hw = this._baseW * scale * sxF * UNIT_PX / 2;
      hh = this._baseH * scale * syF * UNIT_PX / 2;
    } else if (this.objectShape) {
      var dims = OBJECT_DIMS[this.objectShape] || { w: 40, h: 40 };
      hw = dims.w * scale * sxF * UNIT_PX / 2;
      hh = dims.h * scale * syF * UNIT_PX / 2;
    } else {
      hw = 20 * scale * sxF * UNIT_PX;
      hh = 20 * scale * syF * UNIT_PX;
    }
    return Math.abs(canvasX - cx) <= hw && Math.abs(canvasY - cy) <= hh;
  }

  _drawShape(ctx, scale, sx, sy) {
    sx = sx || 1; sy = sy || 1;
    var shape = this.objectShape;
    switch (shape) {
      case "square":
        ctx.fillStyle = "#e04040";
        ctx.strokeStyle = "#900";
        ctx.lineWidth = 2;
        ctx.fillRect(-20 * scale * sx, -20 * scale * sy, 40 * scale * sx, 40 * scale * sy);
        ctx.strokeRect(-20 * scale * sx, -20 * scale * sy, 40 * scale * sx, 40 * scale * sy);
        break;
      case "ground":
        ctx.fillStyle = "#2a8e23";
        ctx.strokeStyle = "#105014";
        ctx.lineWidth = 2;
        ctx.fillRect(-80 * scale * sx, -8 * scale * sy, 160 * scale * sx, 16 * scale * sy);
        ctx.strokeRect(-80 * scale * sx, -8 * scale * sy, 160 * scale * sx, 16 * scale * sy);
        break;
      case "platform":
        ctx.fillStyle = "#8b7355";
        ctx.strokeStyle = "#5a4830";
        ctx.lineWidth = 2;
        ctx.fillRect(-50 * scale * sx, -6 * scale * sy, 100 * scale * sx, 12 * scale * sy);
        ctx.strokeRect(-50 * scale * sx, -6 * scale * sy, 100 * scale * sx, 12 * scale * sy);
        break;
      case "physics_ball":
        ctx.beginPath();
        ctx.ellipse(0, 0, 16 * scale * sx, 16 * scale * sy, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#4488ff";
        ctx.fill();
        ctx.strokeStyle = "#2255cc";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case "bouncing_ball":
        ctx.beginPath();
        ctx.ellipse(0, 0, 16 * scale * sx, 16 * scale * sy, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#ff6644";
        ctx.fill();
        ctx.strokeStyle = "#cc3311";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(-4 * scale * sx, -4 * scale * sy, 5 * scale * sx, 5 * scale * sy, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();
        break;
      case "ramp":
        ctx.beginPath();
        ctx.moveTo(-30 * scale * sx, 15 * scale * sy);
        ctx.lineTo(30 * scale * sx, 15 * scale * sy);
        ctx.lineTo(-30 * scale * sx, -15 * scale * sy);
        ctx.closePath();
        ctx.fillStyle = "#a0522d";
        ctx.fill();
        ctx.strokeStyle = "#6b3410";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(0, -20 * scale * sy);
        ctx.lineTo(20 * scale * sx, 15 * scale * sy);
        ctx.lineTo(-20 * scale * sx, 15 * scale * sy);
        ctx.closePath();
        ctx.fillStyle = "#44bb44";
        ctx.fill();
        ctx.strokeStyle = "#228822";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case "circle":
        ctx.beginPath();
        ctx.ellipse(0, 0, 20 * scale * sx, 20 * scale * sy, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#cc66cc";
        ctx.fill();
        ctx.strokeStyle = "#993399";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case "cube3d":
        var sw = 20 * scale * sx;
        var sh = 20 * scale * sy;
        var ox = 6 * scale, oy = 6 * scale;
        // Back face
        ctx.fillStyle = "#7799cc";
        ctx.strokeStyle = "#445577";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-sw + ox, -sh - oy); ctx.lineTo(sw + ox, -sh - oy);
        ctx.lineTo(sw + ox, sh - oy); ctx.lineTo(-sw + ox, sh - oy);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Top face
        ctx.fillStyle = "#99bbee";
        ctx.beginPath();
        ctx.moveTo(-sw, -sh); ctx.lineTo(-sw + ox, -sh - oy);
        ctx.lineTo(sw + ox, -sh - oy); ctx.lineTo(sw, -sh);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Side face
        ctx.fillStyle = "#5577aa";
        ctx.beginPath();
        ctx.moveTo(sw, -sh); ctx.lineTo(sw + ox, -sh - oy);
        ctx.lineTo(sw + ox, sh - oy); ctx.lineTo(sw, sh);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Front face
        ctx.fillStyle = "#88aadd";
        ctx.fillRect(-sw, -sh, sw * 2, sh * 2);
        ctx.strokeRect(-sw, -sh, sw * 2, sh * 2);
        break;
      case "custom":
        ctx.fillStyle = "#ddd";
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 2;
        ctx.fillRect(-20 * scale * sx, -20 * scale * sy, 40 * scale * sx, 40 * scale * sy);
        ctx.strokeRect(-20 * scale * sx, -20 * scale * sy, 40 * scale * sx, 40 * scale * sy);
        ctx.fillStyle = "#999";
        ctx.font = (10 * scale * Math.min(sx, sy)) + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Custom", 0, 0);
        break;
    }
  }

  _drawBubble(ctx, bx, by) {
    var text = String(this.speech);
    ctx.font = "bold 11px Arial";
    var tw = ctx.measureText(text).width;
    var pad = 8, bw = tw + pad * 2, bh = 24;
    var lx = bx - bw / 2;
    var ly = Math.max(4, by - bh - 8);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    var rr = 6;
    ctx.moveTo(lx + rr, ly);
    ctx.lineTo(lx + bw - rr, ly);
    ctx.quadraticCurveTo(lx + bw, ly, lx + bw, ly + rr);
    ctx.lineTo(lx + bw, ly + bh - rr);
    ctx.quadraticCurveTo(lx + bw, ly + bh, lx + bw - rr, ly + bh);
    ctx.lineTo(bx + 6, ly + bh);
    ctx.lineTo(bx, ly + bh + 8);
    ctx.lineTo(bx - 6, ly + bh);
    ctx.lineTo(lx + rr, ly + bh);
    ctx.quadraticCurveTo(lx, ly + bh, lx, ly + bh - rr);
    ctx.lineTo(lx, ly + rr);
    ctx.quadraticCurveTo(lx, ly, lx + rr, ly);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.fillText(text, lx + pad, ly + bh / 2 + 4);
    if (this.speechType === "think") {
      ctx.beginPath();
      ctx.arc(bx - 3, ly + bh + 4, 3, 0, Math.PI * 2);
      ctx.arc(bx, ly + bh + 9, 2, 0, Math.PI * 2);
      ctx.fillStyle = "white"; ctx.fill();
      ctx.strokeStyle = "#333"; ctx.stroke();
    }
  }
}

// ==============================================================
//  GLOBALS (use var so AsyncFunction generated code can access them)
// ==============================================================
var sprites = [];
var activeSprite = null;
var workspace = null;
var _stopFlag = false;
var _answer = "";
var _initialPositions = []; // saved on run, restored on stop
var _timerStart = Date.now();
var _keysDown = {};
var _mouseDown = false;
var _bgColor = "#ffffff";
var _bgImage = null;
var FNE_VERSION = "Pre-Alpha";

// FPS tracking
var _currentFPS = 60;
var _fpsFrames = 0;
var _fpsTime = Date.now();

// Sprite click tracking
var _spriteClickedFlags = {};  // sprite index -> true if clicked this frame

// Message tracking for boolean check
var _receivedMessages = {};  // msg -> timestamp

// Variable system – shared across all scripts
var _scratchVars = {};       // name -> value
var _varMonitors = {};       // name -> true/false (visible)

var stageCanvas, stageCtx;

// Pen canvas (overlay for pen drawing)
var _penCanvas, _penCtx;
var _penDown = {};    // per-sprite pen state
var _penColor = {};
var _penSize = {};
var _penLastPos = {}; // last known position per sprite for drawing lines

// Volume
var _volume = 100;

function _stripBlocklyComments(value) {
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) _stripBlocklyComments(value[i]);
    return value;
  }
  if (!value || typeof value !== "object") return value;
  if (value.comment !== undefined) delete value.comment;
  if (value.comments !== undefined) delete value.comments;
  if (value.icons && value.icons.comment) {
    delete value.icons.comment;
    if (Object.keys(value.icons).length === 0) delete value.icons;
  }
  Object.keys(value).forEach(function (key) {
    _stripBlocklyComments(value[key]);
  });
  return value;
}

function _cleanWorkspaceState(state) {
  if (!state || typeof state !== "object") return null;
  try {
    return _stripBlocklyComments(JSON.parse(JSON.stringify(state)));
  } catch (e) {
    return null;
  }
}

function _saveWorkspaceState(ws) {
  if (!ws) return null;
  return _cleanWorkspaceState(Blockly.serialization.workspaces.save(ws));
}

function _loadWorkspaceState(state, ws) {
  if (!state || !ws) return;
  var clean = _cleanWorkspaceState(state);
  if (clean) Blockly.serialization.workspaces.load(clean, ws);
}

// Mouse position in stage coordinates
var _mouseStageX = 0;
var _mouseStageY = 0;

// Broadcast system
var _broadcastListeners = {};  // msg -> [{sprite, hatBlock}]

// Drag state
var _dragSprite = null;
var _dragOffsetX = 0;
var _dragOffsetY = 0;
var _isPanning = false;
var _panStartX = 0;
var _panStartY = 0;
var _panStartCamX = 0;
var _panStartCamY = 0;

// ==============================================================
//  STAGE RENDER LOOP
// ==============================================================
function renderStage() {
  // FPS tracking
  _fpsFrames++;
  var now = Date.now();
  if (now - _fpsTime >= 1000) {
    _currentFPS = _fpsFrames;
    _fpsFrames = 0;
    _fpsTime = now;
  }

  stageCtx.clearRect(0, 0, STAGE_W, STAGE_H);
  // Draw background: use Background sprite costume, or _bgColor/_bgImage, or black
  var _bgSp = _getBackgroundSprite();
  if (_bgSp && _bgSp.visible && _bgSp.img && _bgSp.imgLoaded) {
    stageCtx.drawImage(_bgSp.img, 0, 0, STAGE_W, STAGE_H);
  } else if (_bgSp) {
    stageCtx.fillStyle = _bgColor;
    stageCtx.fillRect(0, 0, STAGE_W, STAGE_H);
    if (_bgImage) {
      stageCtx.drawImage(_bgImage, 0, 0, STAGE_W, STAGE_H);
    }
  } else {
    // No background sprite — screen is black
    stageCtx.fillStyle = "#000000";
    stageCtx.fillRect(0, 0, STAGE_W, STAGE_H);
  }
  _drawGrid(stageCtx);
  // Draw pen canvas overlay
  if (_penCanvas) {
    stageCtx.drawImage(_penCanvas, 0, 0);
  }
  _updatePenTrails();
  // WASD camera scrolling (only when not focused on an input)
  var _wasdActive = !document.activeElement || document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "SELECT";
  if (_wasdActive) {
    var _camSpeed = 3;
    if (_keysDown["w"] || _keysDown["W"]) cameraY += _camSpeed;
    if (_keysDown["s"] || _keysDown["S"]) cameraY -= _camSpeed;
    if (_keysDown["a"] || _keysDown["A"]) cameraX -= _camSpeed;
    if (_keysDown["d"] || _keysDown["D"]) cameraX += _camSpeed;
  }
  if (!_stopFlag) _physicsStep();

  // Smooth camera follow — runs AFTER physics so collision is resolved first
  if (_cameraFollowTarget && !_stopFlag) {
    var tx = _cameraFollowTarget.x;
    var ty = _cameraFollowTarget.y;
    cameraX += (tx - cameraX) * _cameraSmooth;
    cameraY += (ty - cameraY) * _cameraSmooth;
    // Snap if very close to avoid endless tiny drift
    if (Math.abs(tx - cameraX) < 0.01) cameraX = tx;
    if (Math.abs(ty - cameraY) < 0.01) cameraY = ty;
  }

  _applyShake();
  if (!_stopFlag && _ext3dCanvas) _pen3dUpdate();
  for (var i = 0; i < sprites.length; i++) { if (!sprites[i].isBackground) sprites[i].draw(stageCtx); }
  requestAnimationFrame(renderStage);
}

function _drawGrid(ctx) {
  ctx.save();
  var gs = 50 * UNIT_PX;
  var offX = (((-cameraX * UNIT_PX) % gs) + gs) % gs;
  var offY = (((cameraY * UNIT_PX) % gs) + gs) % gs;
  // Vertical lines (Scratch 1.4 style)
  ctx.strokeStyle = "rgba(180,180,180,0.25)";
  ctx.lineWidth = 1;
  for (var x = offX; x < STAGE_W; x += gs) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, STAGE_H); ctx.stroke();
  }
  // Horizontal lines (lighter)
  ctx.strokeStyle = "rgba(180,180,180,0.15)";
  for (var y = offY; y < STAGE_H; y += gs) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(STAGE_W, y); ctx.stroke();
  }
  // Origin crosshair
  var ox = STAGE_W / 2 - cameraX * UNIT_PX;
  var oy = STAGE_H / 2 + cameraY * UNIT_PX;
  ctx.strokeStyle = "rgba(80,80,80,0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, STAGE_H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(STAGE_W, oy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ==============================================================
//  INPUT TRACKING
// ==============================================================
document.addEventListener("keydown", function (e) { _keysDown[e.key] = true; });
document.addEventListener("keyup", function (e) { delete _keysDown[e.key]; });
window.addEventListener("beforeunload", function (e) { e.preventDefault(); e.returnValue = ""; });
document.addEventListener("mousedown", function () { _mouseDown = true; });
document.addEventListener("mouseup", function () { _mouseDown = false; });
document.addEventListener("click", function (e) {
  if (!e.target.classList.contains("menu-item")) {
    document.querySelectorAll(".menu-dropdown").forEach(function (m) { m.classList.remove("open"); });
  }
});

// ==============================================================
//  STAGE MOUSE - DRAG SPRITES + PAN CAMERA
// ==============================================================
function _getCanvasPos(e) {
  var rect = stageCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * STAGE_W / rect.width,
    y: (e.clientY - rect.top) * STAGE_H / rect.height
  };
}

function _initStageMouse() {
  stageCanvas.addEventListener("mousedown", function (e) {
    var pos = _getCanvasPos(e);
    // Update mouse stage coordinates
    _mouseStageX = (pos.x - STAGE_W / 2) / UNIT_PX + cameraX;
    _mouseStageY = (STAGE_H / 2 - pos.y) / UNIT_PX + cameraY;
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      _isPanning = true;
      _panStartX = e.clientX;
      _panStartY = e.clientY;
      _panStartCamX = cameraX;
      _panStartCamY = cameraY;
      stageCanvas.style.cursor = "grabbing";
      return;
    }
    for (var i = sprites.length - 1; i >= 0; i--) {
      if (sprites[i].visible && sprites[i].hitTest(pos.x, pos.y)) {
        // Don't allow dragging when green flag is running and draggable is false
        if (!_stopFlag && !sprites[i].draggable) {
          // Still track click but don't drag
          var idx2 = sprites.indexOf(sprites[i]);
          _spriteClickedFlags[idx2] = true;
          setTimeout(function () { _spriteClickedFlags[idx2] = false; }, 200);
          if (idx2 >= 0) selectSprite(idx2);
          return;
        }
        _dragSprite = sprites[i];
        _dragOffsetX = pos.x - (STAGE_W / 2 + sprites[i].x - cameraX);
        _dragOffsetY = pos.y - (STAGE_H / 2 - sprites[i].y + cameraY);
        stageCanvas.style.cursor = "move";
        var idx = sprites.indexOf(_dragSprite);
        // Track sprite click for boolean block
        _spriteClickedFlags[idx] = true;
        setTimeout(function () { _spriteClickedFlags[idx] = false; }, 200);
        if (idx >= 0) selectSprite(idx);
        return;
      }
    }
  });

  document.addEventListener("mousemove", function (e) {
    // Update mouse stage coordinates
    var mpos = _getCanvasPos(e);
    _mouseStageX = (mpos.x - STAGE_W / 2) / UNIT_PX + cameraX;
    _mouseStageY = (STAGE_H / 2 - mpos.y) / UNIT_PX + cameraY;

    if (_isPanning) {
      var rect = stageCanvas.getBoundingClientRect();
      cameraX = _panStartCamX - (e.clientX - _panStartX) * STAGE_W / rect.width / UNIT_PX;
      cameraY = _panStartCamY + (e.clientY - _panStartY) * STAGE_H / rect.height / UNIT_PX;
      return;
    }
    if (_dragSprite) {
      var pos = _getCanvasPos(e);
      _dragSprite.x = (pos.x - _dragOffsetX) / UNIT_PX - STAGE_W / 2 / UNIT_PX + cameraX;
      _dragSprite.y = STAGE_H / 2 / UNIT_PX + cameraY - (pos.y - _dragOffsetY) / UNIT_PX;
    }
  });

  document.addEventListener("mouseup", function () {
    if (_isPanning) { _isPanning = false; stageCanvas.style.cursor = "crosshair"; }
    if (_dragSprite) { _dragSprite = null; stageCanvas.style.cursor = "crosshair"; }
  });

  stageCanvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  stageCanvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    cameraX += e.deltaX * 0.5 / UNIT_PX;
    cameraY -= e.deltaY * 0.5 / UNIT_PX;
  }, { passive: false });
}

// ==============================================================
//  RUNTIME PRIMITIVES (called by generated block code)
// ==============================================================
var _scriptSprite = null;
function _getSprite() { return _scriptSprite || activeSprite; }

function sprite_move(steps) {
  var s = _getSprite(); if (!s) return;
  var rad = s.dir * Math.PI / 180;
  s.x += Math.sin(rad) * steps;
  s.y += Math.cos(rad) * steps;
}
function sprite_turn(deg) {
  var s = _getSprite(); if (!s) return;
  s.dir = (s.dir + deg + 360) % 360;
}
function sprite_goto(x, y) {
  var s = _getSprite(); if (!s) return;
  s.x = x; s.y = y;
}
function sprite_point(dir) {
  var s = _getSprite(); if (!s) return;
  s.dir = ((dir % 360) + 360) % 360;
}
function sprite_changeX(dx) {
  var s = _getSprite(); if (!s) return;
  s.x += dx;
}
function sprite_changeY(dy) {
  var s = _getSprite(); if (!s) return;
  s.y += dy;
}
function sprite_setX(x) {
  var s = _getSprite(); if (!s) return;
  s.x = x;
}
function sprite_setY(y) {
  var s = _getSprite(); if (!s) return;
  s.y = y;
}
function sprite_setRotationStyle(style) {
  var s = _getSprite(); if (!s) return;
  s.rotationStyle = style;
}
function sprite_bounce() {
  var s = _getSprite(); if (!s) return;
  var hw = (s._baseW * s.size / 100) / 2;
  var hh = (s._baseH * s.size / 100) / 2;
  // Bounce relative to camera viewport (supports infinite scrolling)
  var left = cameraX - STAGE_W / 2 / UNIT_PX;
  var right = cameraX + STAGE_W / 2 / UNIT_PX;
  var bottom = cameraY - STAGE_H / 2 / UNIT_PX;
  var top = cameraY + STAGE_H / 2 / UNIT_PX;
  if (s.x + hw > right) { s.x = right - hw; s.dir = (360 - s.dir) % 360; }
  if (s.x - hw < left) { s.x = left + hw; s.dir = (360 - s.dir) % 360; }
  if (s.y + hh > top) { s.y = top - hh; s.dir = (180 - s.dir + 360) % 360; }
  if (s.y - hh < bottom) { s.y = bottom + hh; s.dir = (180 - s.dir + 360) % 360; }
}

// Go to another sprite by name
function sprite_gotoSprite(name) {
  var s = _getSprite(); if (!s) return;
  var target = sprites.find(function (sp) { return sp.name === name && sp !== s; });
  if (target) { s.x = target.x; s.y = target.y; }
}

// Point towards a specific coordinate
function sprite_pointTowards(tx, ty) {
  var s = _getSprite(); if (!s) return;
  var dx = tx - s.x;
  var dy = ty - s.y;
  s.dir = ((Math.atan2(dx, dy) * 180 / Math.PI) + 360) % 360;
}

// Point towards a sprite by name
function sprite_pointTowardsSprite(name) {
  var s = _getSprite(); if (!s) return;
  if (name === "_edge_") return;
  var target = sprites.find(function (sp) { return sp.name === name && sp !== s; });
  if (target) sprite_pointTowards(target.x, target.y);
}

function sprite_say(msg) {
  var s = _getSprite(); if (!s) return;
  clearTimeout(s.speechTimeout);
  s.speech = msg;
  s.speechType = "say";
}
function sprite_think(msg) {
  var s = _getSprite(); if (!s) return;
  clearTimeout(s.speechTimeout);
  s.speech = msg;
  s.speechType = "think";
}
function sprite_sayFor(msg, secs) {
  return new Promise(function (res) {
    var s = _getSprite(); if (!s) { res(); return; }
    clearTimeout(s.speechTimeout);
    s.speech = msg; s.speechType = "say";
    s.speechTimeout = setTimeout(function () { s.speech = null; res(); }, secs * 1000);
  });
}
function sprite_show() { var s = _getSprite(); if (s) s.visible = true; }
function sprite_hide() { var s = _getSprite(); if (s) s.visible = false; }
function sprite_changeSizeBy(n) {
  var s = _getSprite(); if (!s) return;
  s.size = Math.max(5, s.size + n);
}
function sprite_setSize(n) {
  var s = _getSprite(); if (!s) return;
  s.size = Math.max(5, n);
}
function sprite_setScaleX(n) {
  var s = _getSprite(); if (!s) return;
  s.scaleX = n;
}
function sprite_setScaleY(n) {
  var s = _getSprite(); if (!s) return;
  s.scaleY = n;
}
function sprite_setScaleZ(n) {
  var s = _getSprite(); if (!s) return;
  s.scaleZ = n;
}
function sprite_setBgImage(src) {
  var img = new Image();
  img.onload = function () { _bgImage = img; };
  img.onerror = function () { _bgImage = null; };
  img.src = src;
}
function sprite_drawOnBg() {
  if (!_penCtx) return;
  var s = _getSprite(); if (!s) return;
  // Stamp the sprite onto the pen canvas (acts as background drawing)
  var cx = STAGE_W / 2 + (s.x - cameraX) * UNIT_PX;
  var cy = STAGE_H / 2 - (s.y - cameraY) * UNIT_PX;
  var scale = s.size / 100;
  if (s.img && s.imgLoaded) {
    var hw = s._baseW * scale * UNIT_PX / 2;
    var hh = s._baseH * scale * UNIT_PX / 2;
    _penCtx.drawImage(s.img, cx - hw, cy - hh, hw * 2, hh * 2);
  }
}
function sprite_setDragMode(mode) {
  var s = _getSprite(); if (!s) return;
  s.draggable = !!mode;
}
function sprite_goFront() {
  var s = _getSprite(); if (!s) return;
  var idx = sprites.indexOf(s);
  if (idx >= 0 && idx < sprites.length - 1) {
    sprites.splice(idx, 1); sprites.push(s);
  }
}
function sprite_goBack(n) {
  var s = _getSprite(); if (!s) return;
  var idx = sprites.indexOf(s);
  var newIdx = Math.max(0, idx - (n || 1));
  if (idx >= 0 && idx !== newIdx) {
    sprites.splice(idx, 1); sprites.splice(newIdx, 0, s);
  }
}

function sprite_glide(secs, tx, ty) {
  return new Promise(function (res) {
    var s = _getSprite(); if (!s) { res(); return; }
    var sx = s.x, sy = s.y;
    var t0 = Date.now(), dur = secs * 1000;
    function step() {
      if (_stopFlag) { res(); return; }
      var elapsed = Date.now() - t0;
      if (elapsed >= dur) { s.x = tx; s.y = ty; res(); return; }
      var p = elapsed / dur;
      s.x = sx + (tx - sx) * p;
      s.y = sy + (ty - sy) * p;
      requestAnimationFrame(step);
    }
    step();
  });
}



// ── Camera follow ──
function sprite_cameraFollow() {
  var s = _getSprite(); if (!s) return;
  _cameraFollowTarget = s;
}

// ── Costume switching ──
function sprite_nextCostume() {
  var s = _getSprite(); if (!s || s.costumes.length < 2) return;
  s.currentCostume = (s.currentCostume + 1) % s.costumes.length;
  _applyCostumeImage(s);
}
function sprite_prevCostume() {
  var s = _getSprite(); if (!s || s.costumes.length < 2) return;
  s.currentCostume = (s.currentCostume - 1 + s.costumes.length) % s.costumes.length;
  _applyCostumeImage(s);
}
function sprite_switchCostume(num) {
  var s = _getSprite(); if (!s || s.costumes.length === 0) return;
  var idx = Math.max(0, Math.min(s.costumes.length - 1, num - 1));
  s.currentCostume = idx;
  _applyCostumeImage(s);
}
function _applyCostumeImage(s) {
  var c = s.costumes[s.currentCostume];
  if (!c) return;
  s.img = new Image();
  s.img.onload = function () {
    s.imgLoaded = true;
    var w = s.img.naturalWidth, h = s.img.naturalHeight;
    var maxDim = Math.max(w, h, 1);
    var fit = 80 / maxDim;
    s._baseW = w * fit;
    s._baseH = h * fit;
  };
  s.img.src = c.dataURL;
}

// ── Pen system ──
function _penSpriteId() {
  var s = _getSprite(); return s ? sprites.indexOf(s) : -1;
}
function pen_clear() {
  if (_penCtx) _penCtx.clearRect(0, 0, STAGE_W, STAGE_H);
}
function pen_down() {
  var id = _penSpriteId(); if (id < 0) return;
  _penDown[id] = true;
  var s = _getSprite();
  _penLastPos[id] = { x: s.x, y: s.y };
}
function pen_up() {
  var id = _penSpriteId(); if (id < 0) return;
  _penDown[id] = false;
}
function pen_setColor(col) {
  var id = _penSpriteId(); if (id < 0) return;
  _penColor[id] = col;
}
function pen_changeSize(n) {
  var id = _penSpriteId(); if (id < 0) return;
  _penSize[id] = Math.max(1, (_penSize[id] || 1) + n);
}
function pen_setSize(n) {
  var id = _penSpriteId(); if (id < 0) return;
  _penSize[id] = Math.max(1, n);
}
function pen_stamp() {
  var s = _getSprite(); if (!s || !_penCtx) return;
  s.draw(_penCtx);
}
function pen_drawLine(tx, ty) {
  var s = _getSprite(); if (!s || !_penCtx) return;
  var id = sprites.indexOf(s);
  var col = _penColor[id] || "#000000";
  var sz = _penSize[id] || 1;
  var sx = STAGE_W / 2 + (s.x - cameraX) * UNIT_PX;
  var sy = STAGE_H / 2 - (s.y - cameraY) * UNIT_PX;
  var ex = STAGE_W / 2 + (tx - cameraX) * UNIT_PX;
  var ey = STAGE_H / 2 - (ty - cameraY) * UNIT_PX;
  _penCtx.strokeStyle = col;
  _penCtx.lineWidth = sz;
  _penCtx.lineCap = "round";
  _penCtx.beginPath();
  _penCtx.moveTo(sx, sy);
  _penCtx.lineTo(ex, ey);
  _penCtx.stroke();
}
function pen_drawRect(w, h) {
  var s = _getSprite(); if (!s || !_penCtx) return;
  var id = sprites.indexOf(s);
  var col = _penColor[id] || "#000000";
  var sz = _penSize[id] || 1;
  var cx = STAGE_W / 2 + (s.x - cameraX) * UNIT_PX;
  var cy = STAGE_H / 2 - (s.y - cameraY) * UNIT_PX;
  _penCtx.strokeStyle = col;
  _penCtx.lineWidth = sz;
  _penCtx.strokeRect(cx - w / 2, cy - h / 2, w, h);
}
function pen_drawCircle(r) {
  var s = _getSprite(); if (!s || !_penCtx) return;
  var id = sprites.indexOf(s);
  var col = _penColor[id] || "#000000";
  var sz = _penSize[id] || 1;
  var cx = STAGE_W / 2 + (s.x - cameraX) * UNIT_PX;
  var cy = STAGE_H / 2 - (s.y - cameraY) * UNIT_PX;
  _penCtx.strokeStyle = col;
  _penCtx.lineWidth = sz;
  _penCtx.beginPath();
  _penCtx.arc(cx, cy, r, 0, Math.PI * 2);
  _penCtx.stroke();
}

// Update pen trail when sprites move (called from renderStage)
function _updatePenTrails() {
  for (var i = 0; i < sprites.length; i++) {
    if (!_penDown[i]) continue;
    var s = sprites[i];
    var last = _penLastPos[i];
    if (!last) { _penLastPos[i] = { x: s.x, y: s.y }; continue; }
    if (last.x !== s.x || last.y !== s.y) {
      var col = _penColor[i] || "#000000";
      var sz = _penSize[i] || 1;
      var sx = STAGE_W / 2 + (last.x - cameraX) * UNIT_PX;
      var sy = STAGE_H / 2 - (last.y - cameraY) * UNIT_PX;
      var ex = STAGE_W / 2 + (s.x - cameraX) * UNIT_PX;
      var ey = STAGE_H / 2 - (s.y - cameraY) * UNIT_PX;
      _penCtx.strokeStyle = col;
      _penCtx.lineWidth = sz;
      _penCtx.lineCap = "round";
      _penCtx.beginPath();
      _penCtx.moveTo(sx, sy);
      _penCtx.lineTo(ex, ey);
      _penCtx.stroke();
      _penLastPos[i] = { x: s.x, y: s.y };
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  PHYSICS ENGINE  — gravity, velocity, collision response
// ══════════════════════════════════════════════════════════════
var _lastPhysicsTime = 0;

function _physicsStep() {
  var now = performance.now();
  if (!_lastPhysicsTime) { _lastPhysicsTime = now; return; }
  var dt = (now - _lastPhysicsTime) / 1000;
  _lastPhysicsTime = now;
  if (dt > 0.1) dt = 0.1; // cap delta to avoid spiral of death

  // Apply gravity + velocity to non-static sprites
  for (var i = 0; i < sprites.length; i++) {
    var s = sprites[i];
    if (s.isStatic) continue;
    if (s.gravity !== 0) {
      s.vy -= s.gravity * dt * 60; // gravity pulls downward (negative y)
    }
    if (s.vx !== 0 || s.vy !== 0) {
      s.x += s.vx * dt * 60;
      s.y += s.vy * dt * 60;
    }
  }

  // Collision detection + response (multiple passes for stability)
  for (var pass = 0; pass < 3; pass++) {
    for (var i = 0; i < sprites.length; i++) {
      var a = sprites[i];
      if (!a.visible || a.collideable === false) continue;
      for (var j = i + 1; j < sprites.length; j++) {
        var b = sprites[j];
        if (!b.visible || b.collideable === false) continue;
        if (a.isStatic && b.isStatic) continue;
        if (!_spritesCollide(a, b)) continue;
        _resolveCollision(a, b);
      }
    }
  }
}

function _resolveCollision(a, b) {
  // AABB overlap in scratch coordinates (accounts for size + scaleX/scaleY)
  var scA = a.size / 100, scB = b.size / 100;
  var sxA = (a.scaleX || 100) / 100, syA = (a.scaleY || 100) / 100;
  var sxB = (b.scaleX || 100) / 100, syB = (b.scaleY || 100) / 100;
  var hwA = (a._baseW || 30) * scA * sxA / 2, hhA = (a._baseH || 30) * scA * syA / 2;
  var hwB = (b._baseW || 30) * scB * sxB / 2, hhB = (b._baseH || 30) * scB * syB / 2;

  var dx = a.x - b.x;
  var dy = a.y - b.y;

  var overlapX = (hwA + hwB) - Math.abs(dx);
  var overlapY = (hhA + hhB) - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return;

  // Resolve along the axis with the smallest overlap (most stable)
  var nx, ny, overlap;
  if (overlapX < overlapY) {
    nx = dx > 0 ? 1 : -1;
    ny = 0;
    overlap = overlapX;
  } else {
    nx = 0;
    ny = dy > 0 ? 1 : -1;
    overlap = overlapY;
  }

  // Separate sprites with a small extra push to avoid re-collision
  var pushExtra = 0.1;
  if (a.isStatic && !b.isStatic) {
    b.x -= nx * (overlap + pushExtra);
    b.y -= ny * (overlap + pushExtra);
  } else if (b.isStatic && !a.isStatic) {
    a.x += nx * (overlap + pushExtra);
    a.y += ny * (overlap + pushExtra);
  } else {
    a.x += nx * (overlap * 0.5 + pushExtra);
    a.y += ny * (overlap * 0.5 + pushExtra);
    b.x -= nx * (overlap * 0.5 + pushExtra);
    b.y -= ny * (overlap * 0.5 + pushExtra);
  }

  // Velocity resolution — for platformers, zero velocity into the surface
  if (a.isStatic && !b.isStatic) {
    // b hit static a
    var vDot = b.vx * (-nx) + b.vy * (-ny);
    if (vDot > 0) {
      b.vx += nx * vDot;
      b.vy += ny * vDot;
    }
    // Also zero the library _vy for gravity jump compatibility
    if (ny !== 0 && typeof b._vy !== "undefined") {
      if ((ny < 0 && b._vy < 0) || (ny > 0 && b._vy > 0)) {
        // don't zero — sprite is moving away
      } else {
        b._vy = 0;
        b._onGround = true;
      }
    }
  } else if (b.isStatic && !a.isStatic) {
    // a hit static b
    var vDot2 = a.vx * nx + a.vy * ny;
    if (vDot2 < 0) {
      a.vx -= nx * vDot2;
      a.vy -= ny * vDot2;
    }
    if (ny !== 0 && typeof a._vy !== "undefined") {
      if ((ny > 0 && a._vy > 0) || (ny < 0 && a._vy < 0)) {
        // moving away
      } else {
        a._vy = 0;
        a._onGround = true;
      }
    }
  } else {
    // Both dynamic — exchange velocity along normal
    var relVn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (relVn < 0) {
      a.vx -= relVn * 0.5 * nx;
      a.vy -= relVn * 0.5 * ny;
      b.vx += relVn * 0.5 * nx;
      b.vy += relVn * 0.5 * ny;
    }
  }

  // Friction on tangent
  if (Math.abs(ny) > 0.5) {
    if (!a.isStatic) a.vx *= 0.9;
    if (!b.isStatic) b.vx *= 0.9;
  }
}

// Runtime functions for physics blocks
function sprite_setGravity(g) {
  var s = _getSprite(); if (!s) return;
  s.gravity = g;
}
function sprite_setVelocityX(v) {
  var s = _getSprite(); if (!s) return;
  s.vx = v;
}
function sprite_setVelocityY(v) {
  var s = _getSprite(); if (!s) return;
  s.vy = v;
}
function sprite_changeVelocityX(v) {
  var s = _getSprite(); if (!s) return;
  s.vx += v;
}
function sprite_changeVelocityY(v) {
  var s = _getSprite(); if (!s) return;
  s.vy += v;
}
function sprite_velocityX() {
  var s = _getSprite(); return s ? s.vx : 0;
}
function sprite_velocityY() {
  var s = _getSprite(); return s ? s.vy : 0;
}
function sprite_setStatic(val) {
  var s = _getSprite(); if (!s) return;
  s.isStatic = val;
  if (val) { s.vx = 0; s.vy = 0; }
}

// ── Mouse stage coordinates ──
function sc_mouseX() { return _mouseStageX; }
function sc_mouseY() { return _mouseStageY; }

// ── Touching edge (camera-relative for infinite scrolling) ──
function sc_touchingEdge() {
  var s = _getSprite(); if (!s) return false;
  var hw = (s._baseW * s.size / 100) / 2;
  var hh = (s._baseH * s.size / 100) / 2;
  var left = cameraX - STAGE_W / 2 / UNIT_PX;
  var right = cameraX + STAGE_W / 2 / UNIT_PX;
  var bottom = cameraY - STAGE_H / 2 / UNIT_PX;
  var top = cameraY + STAGE_H / 2 / UNIT_PX;
  return s.x + hw >= right || s.x - hw <= left ||
    s.y + hh >= top || s.y - hh <= bottom;
}

// ── Distance to mouse ──
function sc_distanceTo() {
  var s = _getSprite(); if (!s) return 0;
  var dx = _mouseStageX - s.x;
  var dy = _mouseStageY - s.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ══════════════════════════════════════════════════════════════
//  COLLISION SYSTEM  — OBB (oriented bounding box) via SAT
// ══════════════════════════════════════════════════════════════

// Get 4 corners of a sprite's Oriented Bounding Box (accounts for rotation)
function _getOBBCorners(sp) {
  var scale = sp.size / 100;
  var sx = (sp.scaleX || 100) / 100, sy = (sp.scaleY || 100) / 100;
  var hw = sp._baseW * scale * sx / 2;
  var hh = sp._baseH * scale * sy / 2;
  var rad = (sp.dir - 90) * Math.PI / 180;
  var c = Math.cos(rad), s = Math.sin(rad);
  var pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  for (var i = 0; i < 4; i++) {
    var px = pts[i][0], py = pts[i][1];
    pts[i] = [sp.x + px * c - py * s, sp.y + px * s + py * c];
  }
  return pts;
}

// Circle bounding radius for round shapes
function _circleRadius(sp) {
  var scale = sp.size / 100;
  var sx = (sp.scaleX || 100) / 100, sy = (sp.scaleY || 100) / 100;
  return Math.max(sp._baseW * sx, sp._baseH * sy) * scale / 2;
}

function _isCircleShape(sp) {
  var sh = sp.objectShape;
  return sh === "physics_ball" || sh === "bouncing_ball" || sh === "circle";
}

// Separating Axis Theorem test for two convex polygons (arrays of [x,y])
function _satOverlap(cornersA, cornersB) {
  function axes(c) {
    var ax = [];
    for (var i = 0; i < c.length; i++) {
      var j = (i + 1) % c.length;
      ax.push([-(c[j][1] - c[i][1]), c[j][0] - c[i][0]]);
    }
    return ax;
  }
  function project(c, axis) {
    var mn = Infinity, mx = -Infinity;
    for (var i = 0; i < c.length; i++) {
      var d = c[i][0] * axis[0] + c[i][1] * axis[1];
      if (d < mn) mn = d;
      if (d > mx) mx = d;
    }
    return [mn, mx];
  }
  var all = axes(cornersA).concat(axes(cornersB));
  for (var i = 0; i < all.length; i++) {
    var pA = project(cornersA, all[i]);
    var pB = project(cornersB, all[i]);
    if (pA[1] < pB[0] || pB[1] < pA[0]) return false;
  }
  return true;
}

// Main collision test between two sprites
function _spritesCollide(a, b) {
  var circA = _isCircleShape(a), circB = _isCircleShape(b);
  if (circA && circB) {
    var rA = _circleRadius(a), rB = _circleRadius(b);
    var dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy < (rA + rB) * (rA + rB);
  }
  if (circA || circB) {
    // Circle vs OBB: approximate circle as 8-sided polygon
    var circ = circA ? a : b;
    var box = circA ? b : a;
    var r = _circleRadius(circ);
    var cp = [];
    for (var i = 0; i < 8; i++) {
      var ang = i * Math.PI / 4;
      cp.push([circ.x + r * Math.cos(ang), circ.y + r * Math.sin(ang)]);
    }
    return _satOverlap(cp, _getOBBCorners(box));
  }
  // OBB vs OBB
  return _satOverlap(_getOBBCorners(a), _getOBBCorners(b));
}

// ── Touching sprite by name (uses OBB/Circle collision) ──
function sc_touchingSprite(name) {
  var s = _getSprite(); if (!s) return false;
  var target = sprites.find(function (sp) { return sp.name === name && sp !== s; });
  if (!target || !target.visible) return false;
  return _spritesCollide(s, target);
}

// ── Received message boolean ──
function sc_receivedMessage(msg) {
  var ts = _receivedMessages[msg];
  return ts ? (Date.now() - ts < 200) : false;
}

// ── Sprite clicked boolean ──
function sc_spriteClicked() {
  var s = _getSprite(); if (!s) return false;
  var id = sprites.indexOf(s);
  return !!_spriteClickedFlags[id];
}

// ── Touching color (simplified) ──
function sc_touchingColor(col) {
  // Simplified: checks if the stage pixel at sprite's position matches color
  var s = _getSprite(); if (!s) return false;
  var cx = Math.round(STAGE_W / 2 + (s.x - cameraX) * UNIT_PX);
  var cy = Math.round(STAGE_H / 2 - (s.y - cameraY) * UNIT_PX);
  if (cx < 0 || cx >= STAGE_W || cy < 0 || cy >= STAGE_H) return false;
  var pixel = stageCtx.getImageData(cx, cy, 1, 1).data;
  var hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
  return hex.toLowerCase() === col.toLowerCase();
}

// ══════════════════════════════════════════════════════════════
//  LIBRARY RUNTIME FUNCTIONS
// ══════════════════════════════════════════════════════════════

// Show on-screen mobile control buttons overlaid on the stage
function lib_showMobileControls() {
  if (document.getElementById("mobile-ctrl-overlay")) return;
  var container = document.getElementById("stage-container");
  if (!container) return;
  var ov = document.createElement("div");
  ov.id = "mobile-ctrl-overlay";
  ov.style.cssText = "position:absolute;bottom:10px;left:10px;z-index:100;" +
    "display:flex;flex-direction:column;align-items:center;gap:2px;" +
    "opacity:0.75;pointer-events:auto;";
  function mkBtn(label, key) {
    var b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); _keysDown[key] = true; });
    b.addEventListener("pointerup", function (e) { e.preventDefault(); delete _keysDown[key]; });
    b.addEventListener("pointerleave", function () { delete _keysDown[key]; });
    return b;
  }
  var r1 = document.createElement("div"); r1.style.cssText = "display:flex;justify-content:center;";
  r1.appendChild(mkBtn("\u25B2", "ArrowUp"));
  var r2 = document.createElement("div"); r2.style.cssText = "display:flex;gap:38px;";
  r2.appendChild(mkBtn("\u25C0", "ArrowLeft"));
  r2.appendChild(mkBtn("\u25B6", "ArrowRight"));
  var r3 = document.createElement("div"); r3.style.cssText = "display:flex;justify-content:center;";
  r3.appendChild(mkBtn("\u25BC", "ArrowDown"));
  ov.appendChild(r1); ov.appendChild(r2); ov.appendChild(r3);
  container.appendChild(ov);
}

// Push any sprites that collide with the given sprite away from it
function lib_pushCollidingSprites(src) {
  if (!src) return;
  for (var i = 0; i < sprites.length; i++) {
    var other = sprites[i];
    if (other === src || !other.visible) continue;
    if (!_spritesCollide(src, other)) continue;
    // Push other away from src center
    var dx = other.x - src.x;
    var dy = other.y - src.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    // Push distance: half of combined half-widths
    var scA = src.size / 100, scB = other.size / 100;
    var push = (src._baseW * scA / 2 + other._baseW * scB / 2) * 0.3;
    other.x += (dx / dist) * push;
    other.y += (dy / dist) * push;
  }
}

// Remove mobile controls overlay (used on stop)
function _removeMobileControls() {
  var el = document.getElementById("mobile-ctrl-overlay");
  if (el) el.remove();
}

// ── Health Bar Drawing ──
function lib_showHealthBar() {
  var s = _getSprite(); if (!s) return;
  if (typeof s._hp === "undefined") return;
  var ctx = stageCtx;
  var cx = STAGE_W / 2 + (s.x - cameraX) * UNIT_PX;
  var cy = STAGE_H / 2 - (s.y - cameraY) * UNIT_PX;
  var scale = s.size / 100;
  var barW = 40 * scale * UNIT_PX;
  var barH = 4 * UNIT_PX;
  var topY = cy - (s.img && s.imgLoaded ? s._baseH * scale * UNIT_PX / 2 : 20 * scale * UNIT_PX) - barH - 4;
  ctx.fillStyle = "#333";
  ctx.fillRect(cx - barW / 2, topY, barW, barH);
  var pct = Math.max(0, s._hp / (s._hpMax || 100));
  ctx.fillStyle = pct > 0.5 ? "#4caf50" : pct > 0.2 ? "#ff9800" : "#f44336";
  ctx.fillRect(cx - barW / 2, topY, barW * pct, barH);
}

// ── Countdown Timer ──
var _countdownEnd = 0;
var _countdownSec = 0;
function lib_startCountdown(sec) {
  if (_countdownEnd === 0) {
    _countdownSec = sec;
    _countdownEnd = Date.now() + sec * 1000;
  }
  var remaining = Math.max(0, Math.ceil((_countdownEnd - Date.now()) / 1000));
  stageCtx.save();
  stageCtx.font = "bold 20px Arial";
  stageCtx.fillStyle = "rgba(0,0,0,0.6)";
  stageCtx.fillRect(STAGE_W / 2 - 30, 4, 60, 26);
  stageCtx.fillStyle = remaining <= 5 ? "#f44336" : "#fff";
  stageCtx.textAlign = "center";
  stageCtx.fillText(remaining + "s", STAGE_W / 2, 24);
  stageCtx.restore();
}

// ── Spawn Clone ──
function lib_spawnCloneAt(x, y) {
  var src = _getSprite(); if (!src) return;
  var clone = new Sprite(src.name + "_clone", src.imgPath, x, y);
  clone.size = src.size;
  clone.scaleX = src.scaleX;
  clone.scaleY = src.scaleY;
  clone.dir = src.dir;
  sprites.push(clone);
  refreshSpriteList();
}

// ── Camera Shake ──
var _shakeFrames = 0;
var _shakeIntensity = 0;
function lib_cameraShake(intensity) {
  _shakeFrames = 12;
  _shakeIntensity = intensity;
}
function _applyShake() {
  if (_shakeFrames > 0) {
    cameraX += (Math.random() - 0.5) * _shakeIntensity;
    cameraY += (Math.random() - 0.5) * _shakeIntensity;
    _shakeFrames--;
  }
}

// ── Broadcast system ──
function sc_broadcast(msg) {
  // Track for boolean check
  _receivedMessages[msg] = Date.now();
  // Find all when_receive hats matching this message across all sprites
  if (activeSprite && workspace) {
    var savedActive = activeSprite;
    var savedWS = _saveWorkspaceState(workspace);
    for (var si = 0; si < sprites.length; si++) {
      var sp = sprites[si];
      var ws = sp._workspace;
      if (!ws) continue;
      workspace.clear();
      try { _loadWorkspaceState(ws, workspace); } catch (e) { continue; }
      var topBlocks = workspace.getTopBlocks(true);
      for (var bi = 0; bi < topBlocks.length; bi++) {
        if (topBlocks[bi].type === "scratch_when_receive" &&
          topBlocks[bi].getFieldValue("MSG") === msg) {
          _runScript(sp, topBlocks[bi]);
        }
      }
    }
    workspace.clear();
    try { _loadWorkspaceState(savedWS, workspace); } catch (e) { }
    activeSprite = savedActive;
  }
}

function sc_broadcastWait(msg) {
  sc_broadcast(msg);
  return sc_wait(0.05);
}

// ── Play uploaded sound by slot ──
function sound_playSlot(slot) {
  var s = _getSprite(); if (!s) return;
  var idx = slot - 1;
  if (idx >= 0 && idx < s.sounds.length) {
    var a = new Audio(s.sounds[idx].dataURL);
    a.volume = _volume / 100;
    a.play();
  }
}

function sc_wait(secs) {
  return new Promise(function (res) { setTimeout(res, secs * 1000); });
}
function sc_yield() {
  return new Promise(function (res, rej) {
    setTimeout(function () {
      if (_stopFlag) rej("stop");
      else res();
    }, 0);
  });
}
function sc_keyPressed(key) {
  if (key === "any") return Object.keys(_keysDown).length > 0;
  if (key === "space") return !!_keysDown[" "];
  if (key === "ArrowUp" || key === "up") return !!(_keysDown["ArrowUp"] || _keysDown["Up"]);
  if (key === "ArrowDown" || key === "down") return !!(_keysDown["ArrowDown"] || _keysDown["Down"]);
  if (key === "ArrowLeft" || key === "left") return !!(_keysDown["ArrowLeft"] || _keysDown["Left"]);
  if (key === "ArrowRight" || key === "right") return !!(_keysDown["ArrowRight"] || _keysDown["Right"]);
  return !!_keysDown[key];
}
function sc_mouseDown() { return _mouseDown; }

// Microphone loudness detection
var _micStream = null;
var _micAnalyser = null;
var _micLoudness = 0;
function _initMicrophone() {
  if (_micStream) return;
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    _micStream = stream;
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var src = ctx.createMediaStreamSource(stream);
    _micAnalyser = ctx.createAnalyser();
    _micAnalyser.fftSize = 256;
    src.connect(_micAnalyser);
    (function poll() {
      if (!_micAnalyser) return;
      var data = new Uint8Array(_micAnalyser.frequencyBinCount);
      _micAnalyser.getByteFrequencyData(data);
      var sum = 0;
      for (var i = 0; i < data.length; i++) sum += data[i];
      _micLoudness = sum / data.length;
      requestAnimationFrame(poll);
    })();
  }).catch(function () { _micLoudness = 0; });
}
function sc_isLoud() {
  if (!_micStream) _initMicrophone();
  return _micLoudness > 30;
}

function sc_ask(q) {
  return new Promise(function (res) {
    _answer = prompt(q) || "";
    res();
  });
}
function sc_timer() { return (Date.now() - _timerStart) / 1000; }
function sc_resetTimer() { _timerStart = Date.now(); }
function sc_stopAll() { _stopFlag = true; setStatus("Scripts stopped."); }

// ==============================================================
//  GREEN FLAG / STOP
// ==============================================================
var AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

function runScripts() {
  _stopFlag = true; // stop any existing scripts first
  setTimeout(function () {
    _stopFlag = false;
    _timerStart = Date.now();
    _lastPhysicsTime = 0;
    setStatus("Running...");

    // Save the current editor state for the active sprite
    if (activeSprite && workspace) {
      activeSprite._workspace = _saveWorkspaceState(workspace);
    }

    // Save initial positions for restore on stop
    _initialPositions = sprites.map(function (s) {
      return { x: s.x, y: s.y, dir: s.dir, size: s.size, visible: s.visible };
    });

    // Reset all sprites to initial state
    for (var ri = 0; ri < sprites.length; ri++) {
      sprites[ri].speech = null;
      sprites[ri].vx = 0;
      sprites[ri].vy = 0;
      clearTimeout(sprites[ri].speechTimeout);
    }

    // Clear pen canvas
    if (_penCtx) {
      _penCtx.clearRect(0, 0, STAGE_W, STAGE_H);
    }

    // Use a HIDDEN headless workspace for code generation so
    // we never touch the visible workspace or fire change events
    var tempWs = new Blockly.Workspace();

    for (var si = 0; si < sprites.length; si++) {
      var sp = sprites[si];
      var savedWS = sp._workspace;
      if (!savedWS) continue;

      tempWs.clear();
      try {
        _loadWorkspaceState(savedWS, tempWs);
      } catch (e) { continue; }

      var topBlocks = tempWs.getTopBlocks(true);
      for (var bi = 0; bi < topBlocks.length; bi++) {
        if (topBlocks[bi].type === "scratch_when_flag") {
          _runScript(sp, topBlocks[bi], tempWs);
        } else if (_isRunnableLooseStack(topBlocks[bi])) {
          _runScript(sp, topBlocks[bi], tempWs);
        }
      }
    }

    tempWs.dispose();
  }, 50);
}

function stopScripts() {
  _stopFlag = true;
  _lastPhysicsTime = 0;
  _cameraFollowTarget = null;
  cameraX = 0;
  cameraY = 0;
  for (var i = 0; i < sprites.length; i++) {
    sprites[i].speech = null;
    sprites[i].vx = 0;
    sprites[i].vy = 0;
    sprites[i]._vy = undefined;
    sprites[i]._onGround = false;
    clearTimeout(sprites[i].speechTimeout);
    // Restore initial positions
    if (_initialPositions[i]) {
      sprites[i].x = _initialPositions[i].x;
      sprites[i].y = _initialPositions[i].y;
      sprites[i].dir = _initialPositions[i].dir;
      sprites[i].size = _initialPositions[i].size;
      sprites[i].visible = _initialPositions[i].visible;
    }
  }
  updateInfoPanel();
  _scriptSprite = null;
  _removeMobileControls();
  _countdownEnd = 0;
  _shakeFrames = 0;
  // Extension cleanup
  if (typeof ext_iframeClose === "function") ext_iframeClose();
  if (typeof ext_cameraStop === "function") ext_cameraStop();
  if (typeof ext_terminalClose === "function") ext_terminalClose();
  if (typeof _extHtmlContainer !== "undefined" && _extHtmlContainer) _extHtmlContainer.innerHTML = "";
  if (typeof _ext3dCanvas !== "undefined" && _ext3dCanvas) { _ext3dCanvas.remove(); _ext3dCanvas = null; _ext3dCtx = null; }
  if (typeof _ext3dObjects !== "undefined") _ext3dObjects = [];
  _pen3dLines = []; _pen3dDown = {}; _pen3dColor = {}; _pen3dSize = {}; _pen3dLastPos = {};
  if (typeof _penplusGradient !== "undefined") { _penplusGradient = null; _penplusOpacity = 1; }
  // Clear variable monitors
  _scratchVars = {};
  _varMonitors = {};
  _updateVarMonitors();
  setStatus("Stopped.");
}

function _isRunnableLooseStack(block) {
  if (!block || !block.previousConnection || block.outputConnection) return false;
  return block.type !== "scratch_lib_define";
}

function _isEventHatBlock(block) {
  return !!block && (
    block.type === "scratch_when_flag" ||
    block.type === "scratch_when_receive" ||
    block.type === "scratch_when_key" ||
    block.type === "scratch_when_clicked"
  );
}

function _runScript(sprite, hatBlock, srcWorkspace) {
  var gen = javascript.javascriptGenerator;
  var firstBlock = _isEventHatBlock(hatBlock) ? hatBlock.getNextBlock() : hatBlock;
  if (!firstBlock) return;

  // Collect define block code from all top-level define blocks in the same workspace
  var defineCode = "";
  var ws = srcWorkspace || (hatBlock.workspace);
  if (ws) {
    var allTop = ws.getTopBlocks(true);
    for (var di = 0; di < allTop.length; di++) {
      if (allTop[di].type === "scratch_lib_define") {
        try {
          var dc = gen.blockToCode(allTop[di]);
          if (typeof dc === "string") defineCode += dc;
        } catch (e) { }
      }
    }
  }

  // blockToCode already recursively generates the full stack via scrub_()
  var code;
  try {
    code = gen.blockToCode(firstBlock);
    if (typeof code !== "string") code = Array.isArray(code) ? code[0] : String(code);
  } catch (e) {
    console.warn("Code gen error:", e);
    return;
  }

  if (!code.trim()) return;

  // Prepend define blocks, then restore _scriptSprite before each await
  var safeCode = defineCode + "_scriptSprite=_sp_;\n" + code.replace(/\bawait\s/g, "_scriptSprite=_sp_;await ");

  var fn;
  try {
    fn = new AsyncFunction("_sp_", safeCode);
  } catch (e) {
    console.warn("Compile error:", e, safeCode);
    return;
  }

  fn(sprite).catch(function (e) {
    if (e !== "stop") console.warn("Script error:", e);
  });
}

// ==============================================================
//  SPRITE MANAGEMENT
// ==============================================================
function openSpritePicker() {
  var grid = document.getElementById("sprite-picker-grid");
  grid.innerHTML = "";
  SPRITE_LIBRARY.forEach(function (s) {
    var item = document.createElement("div");
    item.className = "picker-item";
    var img = document.createElement("img");
    img.src = s.path;
    img.alt = s.name;
    var lbl = document.createElement("div");
    lbl.className = "picker-name";
    lbl.textContent = s.name;
    item.appendChild(img);
    item.appendChild(lbl);
    item.addEventListener("click", function () {
      addSpriteFromLibrary(s.name, s.path);
      document.getElementById("sprite-picker-overlay").classList.remove("open");
    });
    grid.appendChild(item);
  });
  document.getElementById("sprite-picker-overlay").classList.add("open");
}

function closeSpritePicker(e) {
  if (!e || e.target === document.getElementById("sprite-picker-overlay")) {
    document.getElementById("sprite-picker-overlay").classList.remove("open");
  }
}

function addSpriteFromLibrary(name, imgPath) {
  var finalName = name;
  var n = 2;
  while (sprites.find(function (s) { return s.name === finalName; })) finalName = name + n++;
  var sp = new Sprite(finalName, imgPath);
  sprites.push(sp);
  refreshSpriteList();
  selectSprite(sprites.length - 1);
  setStatus("Added sprite: " + finalName);
}

// Built-in Background sprite — always at index 0, draws as stage background
function _addBackgroundSprite() {
  var bg = new Sprite("Background", null);
  bg.isBackground = true;
  bg.visible = true;
  bg.collideable = false;
  bg.draggable = false;
  bg.size = 100;
  sprites.unshift(bg);
}

function _getBackgroundSprite() {
  return sprites.find(function (s) { return s.isBackground; }) || null;
}

function addSprite(name, imgPath) {
  var sp = new Sprite(name || "Sprite" + (sprites.length + 1), imgPath || null);
  sprites.push(sp);
  refreshSpriteList();
  selectSprite(sprites.length - 1);
}

var _switchingSprite = false;

function selectSprite(idx) {
  _switchingSprite = true;
  if (activeSprite && workspace) {
    activeSprite._workspace = _saveWorkspaceState(workspace);
  }
  activeSprite = sprites[idx];
  document.querySelectorAll(".sprite-entry").forEach(function (el, i) {
    el.classList.toggle("selected", i === idx);
  });
  if (workspace) {
    workspace.clear();
    if (activeSprite._workspace && typeof activeSprite._workspace === "object") {
      try {
        _loadWorkspaceState(activeSprite._workspace, workspace);
      } catch (e) { }
    }
  }
  // Defer resetting the flag long enough for all pending Blockly change events
  // (which may fire via requestAnimationFrame) to drain before we allow saving
  setTimeout(function () { _switchingSprite = false; }, 100);
  updateInfoPanel();
  // Hide Motion category for background sprite
  _updateToolboxForSprite(activeSprite);
  _refreshCostumeList();
  _selectedSoundIdx = activeSprite.sounds.length ? 0 : -1;
  _refreshSoundList();
  // Load current costume into editor if available
  if (activeSprite.costumes.length && _costumeCtx) {
    _loadCostumeToCanvas(activeSprite.costumes[activeSprite.currentCostume].dataURL);
  } else if (_costumeCtx) {
    _costumeCtx.fillStyle = "white";
    _costumeCtx.fillRect(0, 0, 480, 360);
  }
}

function _closeSpriteCtxMenu() {
  var old = document.getElementById("sprite-ctx-menu");
  if (old) old.remove();
}
function _showSpriteContextMenu(x, y, sp, idx) {
  _closeSpriteCtxMenu();
  var menu = document.createElement("div");
  menu.id = "sprite-ctx-menu";
  menu.className = "ctx-menu";
  menu.style.left = x + "px";
  menu.style.top = y + "px";

  var items = [];
  if (sp.isBackground) {
    // Background sprite: only allow Delete (turns screen black)
    items.push({
      label: "Delete", danger: true, action: function () {
        sprites.splice(idx, 1);
        if (activeSprite === sp) {
          activeSprite = null;
          if (workspace) workspace.clear();
        }
        refreshSpriteList();
        if (sprites.length) selectSprite(0);
      }
    });
  } else {
    items = [
      {
        label: "Rename", action: function () {
          var nn = prompt("Rename sprite:", sp.name);
          if (nn) { sp.name = nn; refreshSpriteList(); }
        }
      },
      {
        label: "Duplicate", action: function () {
          var clone = new Sprite(sp.name + " copy", sp.imgPath);
          if (sp._workspace) clone._workspace = JSON.parse(JSON.stringify(sp._workspace));
          clone.x = sp.x + 15; clone.y = sp.y - 15;
          sprites.push(clone);
          refreshSpriteList();
          selectSprite(sprites.length - 1);
        }
      },
      { label: "sep" },
      {
        label: "Delete", danger: true, action: function () {
          sprites.splice(idx, 1);
          if (activeSprite === sp) {
            activeSprite = null;
            if (workspace) workspace.clear();
          }
          refreshSpriteList();
          if (sprites.length) selectSprite(0);
        }
      }
    ];
  } // close else for non-background items

  items.forEach(function (it) {
    if (it.label === "sep") {
      var sep = document.createElement("div");
      sep.className = "ctx-sep";
      menu.appendChild(sep);
      return;
    }
    var opt = document.createElement("div");
    opt.className = "ctx-opt" + (it.danger ? " ctx-danger" : "");
    opt.textContent = it.label;
    opt.addEventListener("click", function () { _closeSpriteCtxMenu(); it.action(); });
    menu.appendChild(opt);
  });

  document.body.appendChild(menu);

  // Clamp to viewport
  var rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + "px";
  if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + "px";
}
document.addEventListener("click", function () { _closeSpriteCtxMenu(); });

function refreshSpriteList() {
  var list = document.getElementById("sprite-list");
  list.innerHTML = "";
  sprites.forEach(function (sp, i) {
    var div = document.createElement("div");
    div.className = "sprite-entry" + (sp === activeSprite ? " selected" : "");
    if (sp.isBackground) {
      // Background sprite thumbnail — show costume preview or gradient icon
      if (sp.img && sp.imgLoaded) {
        var bgImg = document.createElement("img");
        bgImg.src = sp.img.src;
        bgImg.alt = "Background";
        bgImg.style.cssText = "width:48px;height:48px;object-fit:cover;border:1px solid #888;border-radius:2px;";
        div.appendChild(bgImg);
      } else {
        var bgIcon = document.createElement("div");
        bgIcon.style.cssText = "width:48px;height:48px;background:white;border:1px solid #ccc;border-radius:2px;";
        bgIcon.textContent = "";
        div.appendChild(bgIcon);
      }
    } else if (sp.imgPath || (sp.img && sp.imgLoaded)) {
      var img = document.createElement("img");
      img.src = sp.img && sp.imgLoaded ? sp.img.src : sp.imgPath;
      img.alt = sp.name;
      img.style.cssText = "width:48px;height:48px;object-fit:contain;border:1px solid #ccc;border-radius:2px;background:white;image-rendering:pixelated;";
      div.appendChild(img);
    } else if (sp.objectShape) {
      var cvs = document.createElement("canvas");
      cvs.width = 48; cvs.height = 48;
      cvs.style.cssText = "width:48px;height:48px;border:1px solid #ccc;border-radius:2px;background:white;";
      var pCtx = cvs.getContext("2d");
      pCtx.save();
      pCtx.translate(24, 24);
      sp._drawShape(pCtx, 0.5);
      pCtx.restore();
      div.appendChild(cvs);
    } else {
      var sq = document.createElement("div");
      sq.style.cssText = "width:48px;height:48px;background:#4C97FF;border:1px solid #333;border-radius:2px;";
      div.appendChild(sq);
    }
    var nameEl = document.createElement("div");
    nameEl.className = "sprite-name";
    nameEl.textContent = sp.name;
    div.appendChild(nameEl);
    div.addEventListener("click", function () { selectSprite(i); });
    div.addEventListener("dblclick", function () {
      if (sp.isBackground) return;
      var nn = prompt("Rename sprite:", sp.name);
      if (nn) { sp.name = nn; refreshSpriteList(); }
    });
    div.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      _showSpriteContextMenu(e.clientX, e.clientY, sp, i);
    });
    list.appendChild(div);
  });
}

// ==============================================================
//  CUSTOM FIELD EDITORS (dialog-based to avoid framework conflicts)
// ==============================================================

// ── Number field: opens centered dialog "Change X to:" ──
(function () {
  var origShowEditor = Blockly.FieldNumber.prototype.showEditor_;
  Blockly.FieldNumber.prototype.showEditor_ = function () {
    var field = this;
    var oldVal = String(field.getValue());
    // Build overlay
    var ov = document.createElement("div");
    ov.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:20000;display:flex;align-items:center;justify-content:center;";
    var box = document.createElement("div");
    box.style.cssText = "background:linear-gradient(180deg,#e8e8e8,#d0d0d0);border:3px outset #e0e0e0;border-radius:6px;padding:16px 22px;min-width:260px;box-shadow:0 6px 20px rgba(0,0,0,0.4);font-family:Arial,sans-serif;font-size:13px;color:#222;";
    var title = document.createElement("div");
    title.textContent = "Change " + oldVal + " to:";
    title.style.cssText = "margin-bottom:10px;font-weight:bold;font-size:13px;";
    box.appendChild(title);
    var inp = document.createElement("input");
    inp.type = "text";
    inp.value = oldVal;
    inp.style.cssText = "width:100%;padding:5px 6px;font-size:13px;border:2px inset #aaa;border-radius:3px;background:#fff;color:#000;outline:none;box-sizing:border-box;font-family:Arial,sans-serif;";
    box.appendChild(inp);
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:12px;";
    function mkBtn(label) {
      var b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = "padding:4px 16px;font-size:12px;font-family:Arial,sans-serif;border:2px outset #d0d0d0;background:linear-gradient(180deg,#f0f0f0,#d8d8d8);border-radius:3px;cursor:pointer;";
      return b;
    }
    var okBtn = mkBtn("OK");
    var cancelBtn = mkBtn("Cancel");
    btnRow.appendChild(okBtn);
    btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    ov.appendChild(box);
    document.body.appendChild(ov);
    inp.focus();
    inp.select();
    function accept() {
      var v = parseFloat(inp.value);
      if (!isNaN(v)) field.setValue(v);
      cleanup();
    }
    function cleanup() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }
    okBtn.addEventListener("click", accept);
    cancelBtn.addEventListener("click", cleanup);
    inp.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") accept();
      if (e.key === "Escape") cleanup();
    });
    ov.addEventListener("mousedown", function (e) {
      if (e.target === ov) cleanup();
    });
  };
})();

// ── Text field: same dialog approach ──
(function () {
  Blockly.FieldTextInput.prototype.showEditor_ = function () {
    var field = this;
    var oldVal = String(field.getValue());
    var ov = document.createElement("div");
    ov.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:20000;display:flex;align-items:center;justify-content:center;";
    var box = document.createElement("div");
    box.style.cssText = "background:linear-gradient(180deg,#e8e8e8,#d0d0d0);border:3px outset #e0e0e0;border-radius:6px;padding:16px 22px;min-width:260px;box-shadow:0 6px 20px rgba(0,0,0,0.4);font-family:Arial,sans-serif;font-size:13px;color:#222;";
    var title = document.createElement("div");
    title.textContent = "Change \"" + oldVal + "\" to:";
    title.style.cssText = "margin-bottom:10px;font-weight:bold;font-size:13px;";
    box.appendChild(title);
    var inp = document.createElement("input");
    inp.type = "text";
    inp.value = oldVal;
    inp.style.cssText = "width:100%;padding:5px 6px;font-size:13px;border:2px inset #aaa;border-radius:3px;background:#fff;color:#000;outline:none;box-sizing:border-box;font-family:Arial,sans-serif;";
    box.appendChild(inp);
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:12px;";
    function mkBtn(label) {
      var b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = "padding:4px 16px;font-size:12px;font-family:Arial,sans-serif;border:2px outset #d0d0d0;background:linear-gradient(180deg,#f0f0f0,#d8d8d8);border-radius:3px;cursor:pointer;";
      return b;
    }
    var okBtn = mkBtn("OK");
    var cancelBtn = mkBtn("Cancel");
    btnRow.appendChild(okBtn);
    btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    ov.appendChild(box);
    document.body.appendChild(ov);
    inp.focus();
    inp.select();
    function accept() { field.setValue(inp.value); cleanup(); }
    function cleanup() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    okBtn.addEventListener("click", accept);
    cancelBtn.addEventListener("click", cleanup);
    inp.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") accept();
      if (e.key === "Escape") cleanup();
    });
    ov.addEventListener("mousedown", function (e) {
      if (e.target === ov) cleanup();
    });
  };
})();

// ── Colour field: dialog with RGB sliders + preview ──
(function () {
  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return { r: parseInt(hex.substring(0, 2), 16) || 0, g: parseInt(hex.substring(2, 4), 16) || 0, b: parseInt(hex.substring(4, 6), 16) || 0 };
  }
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  // Override for FieldTextInput-based colour fallback AND FieldColour if available
  var targets = [Blockly.FieldTextInput];
  if (typeof Blockly.FieldColour === "function") targets.push(Blockly.FieldColour);
  // We'll create a standalone function and hook into SafeFieldColour in blocks.js
  window._showColourDialog = function (field) {
    var oldVal = String(field.getValue()) || "#ff0000";
    var rgb = hexToRgb(oldVal);
    var ov = document.createElement("div");
    ov.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:20000;display:flex;align-items:center;justify-content:center;";
    var box = document.createElement("div");
    box.style.cssText = "background:linear-gradient(180deg,#e8e8e8,#d0d0d0);border:3px outset #e0e0e0;border-radius:6px;padding:16px 22px;min-width:300px;box-shadow:0 6px 20px rgba(0,0,0,0.4);font-family:Arial,sans-serif;font-size:13px;color:#222;";
    var title = document.createElement("div");
    title.textContent = "Pick a colour";
    title.style.cssText = "margin-bottom:10px;font-weight:bold;font-size:13px;";
    box.appendChild(title);
    // Preview swatch
    var preview = document.createElement("div");
    preview.style.cssText = "width:100%;height:40px;border:2px inset #aaa;border-radius:3px;margin-bottom:10px;background:" + oldVal + ";";
    box.appendChild(preview);
    // Hex input
    var hexRow = document.createElement("div");
    hexRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:8px;";
    var hexLabel = document.createElement("span");
    hexLabel.textContent = "Hex:";
    hexLabel.style.fontWeight = "bold";
    var hexInp = document.createElement("input");
    hexInp.type = "text";
    hexInp.value = oldVal;
    hexInp.style.cssText = "flex:1;padding:4px 6px;font-size:12px;border:2px inset #aaa;border-radius:3px;background:#fff;color:#000;font-family:monospace;";
    hexRow.appendChild(hexLabel);
    hexRow.appendChild(hexInp);
    box.appendChild(hexRow);
    // RGB sliders
    function makeSlider(label, val, max) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
      var lbl = document.createElement("span");
      lbl.textContent = label;
      lbl.style.cssText = "width:14px;font-weight:bold;";
      var slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = String(max);
      slider.value = String(val);
      slider.style.cssText = "flex:1;";
      var num = document.createElement("input");
      num.type = "number";
      num.min = "0";
      num.max = String(max);
      num.value = String(val);
      num.style.cssText = "width:50px;padding:2px 4px;font-size:12px;border:2px inset #aaa;border-radius:3px;background:#fff;color:#000;text-align:center;";
      row.appendChild(lbl);
      row.appendChild(slider);
      row.appendChild(num);
      box.appendChild(row);
      return { slider: slider, num: num };
    }
    var rCtrl = makeSlider("R", rgb.r, 255);
    var gCtrl = makeSlider("G", rgb.g, 255);
    var bCtrl = makeSlider("B", rgb.b, 255);
    function updatePreview() {
      var r = parseInt(rCtrl.slider.value) || 0, g = parseInt(gCtrl.slider.value) || 0, b = parseInt(bCtrl.slider.value) || 0;
      var hex = rgbToHex(r, g, b);
      preview.style.background = hex;
      hexInp.value = hex;
    }
    function syncFromSlider(ctrl) {
      ctrl.num.value = ctrl.slider.value;
      updatePreview();
    }
    function syncFromNum(ctrl) {
      var v = Math.max(0, Math.min(255, parseInt(ctrl.num.value) || 0));
      ctrl.slider.value = String(v);
      ctrl.num.value = String(v);
      updatePreview();
    }
    [rCtrl, gCtrl, bCtrl].forEach(function (c) {
      c.slider.addEventListener("input", function () { syncFromSlider(c); });
      c.num.addEventListener("input", function () { syncFromNum(c); });
      c.num.addEventListener("keydown", function (e) { e.stopPropagation(); });
    });
    hexInp.addEventListener("input", function () {
      var v = hexInp.value.trim();
      if (/^#?[0-9a-f]{6}$/i.test(v)) {
        if (v[0] !== "#") v = "#" + v;
        var c = hexToRgb(v);
        rCtrl.slider.value = rCtrl.num.value = String(c.r);
        gCtrl.slider.value = gCtrl.num.value = String(c.g);
        bCtrl.slider.value = bCtrl.num.value = String(c.b);
        preview.style.background = v;
      }
    });
    hexInp.addEventListener("keydown", function (e) { e.stopPropagation(); });
    // Buttons
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:12px;";
    function mkBtn(label) {
      var b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = "padding:4px 16px;font-size:12px;font-family:Arial,sans-serif;border:2px outset #d0d0d0;background:linear-gradient(180deg,#f0f0f0,#d8d8d8);border-radius:3px;cursor:pointer;";
      return b;
    }
    var okBtn = mkBtn("OK");
    var cancelBtn = mkBtn("Cancel");
    btnRow.appendChild(okBtn);
    btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    ov.appendChild(box);
    document.body.appendChild(ov);
    hexInp.focus();
    hexInp.select();
    function accept() { field.setValue(hexInp.value); cleanup(); }
    function cleanup() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    okBtn.addEventListener("click", accept);
    cancelBtn.addEventListener("click", cleanup);
    hexInp.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") accept();
      if (e.key === "Escape") cleanup();
    });
    ov.addEventListener("mousedown", function (e) {
      if (e.target === ov) cleanup();
    });
  };
})();

// ==============================================================
//  BLOCKLY INIT
// ==============================================================

// ── Custom compact Zelos renderer (Scratch 2.0 proportions + clay bevel) ──
// Dimensions derived from scratchblocks-main/scratch2 reference project
(function () {
  class Scratch2Constants extends Blockly.zelos.ConstantProvider {
    constructor() {
      super();
      this.FIELD_TEXT_HEIGHT = 9;
      this.FIELD_BORDER_RECT_HEIGHT = 12;
      this.FIELD_BORDER_RECT_X_PADDING = 2;
      this.FIELD_BORDER_RECT_Y_PADDING = 0;
      this.FIELD_DROPDOWN_SVG_ARROW_PADDING = 1;
      this.FIELD_DROPDOWN_BORDER_RECT_HEIGHT = 12;
      this.FIELD_DROPDOWN_PADDING = 2;
      this.FIELD_TEXT_FONTSIZE = 9;
      this.FIELD_TEXT_FONTWEIGHT = 'bold';
      this.FIELD_TEXT_FONTFAMILY = 'Lucida Grande, Verdana, Arial, DejaVu Sans, sans-serif';
      this.FIELD_COLOUR_DEFAULT_WIDTH = 12;
      this.FIELD_COLOUR_DEFAULT_HEIGHT = 10;

      // Row heights — compact
      this.TOP_ROW_MIN_HEIGHT = 0;
      this.TOP_ROW_PRECEDES_STATEMENT_MIN_HEIGHT = 0;
      this.BOTTOM_ROW_MIN_HEIGHT = 0;
      this.BOTTOM_ROW_AFTER_STATEMENT_MIN_HEIGHT = 6;
      this.MIN_BLOCK_HEIGHT = 22;
      this.MIN_BLOCK_WIDTH = 0;
      this.EMPTY_STATEMENT_INPUT_HEIGHT = 10;

      // Zelos overrides — shrink reporters, booleans & inline inputs
      this.DUMMY_INPUT_MIN_HEIGHT = 22;
      this.DUMMY_INPUT_SHADOW_MIN_HEIGHT = 16;
      this.EMPTY_INLINE_INPUT_HEIGHT = 16;
      this.MAX_DYNAMIC_CONNECTION_SHAPE_WIDTH = 12;

      // Notch: scratchblocks2 13→27 width=14, depth=3
      this.NOTCH_WIDTH = 14;
      this.NOTCH_HEIGHT = 3;
      this.TAB_HEIGHT = 10;
      this.TAB_WIDTH = 5;

      // C-block mouth
      this.INSIDE_CORNERS_RADIUS = 1;
      this.STATEMENT_INPUT_PADDING_LEFT = 10;
      this.STATEMENT_BOTTOM_SPACER = 0;

      // Padding
      this.MEDIUM_PADDING = 1;
      this.MEDIUM_LARGE_PADDING = 1;
      this.LARGE_PADDING = 1;

      // Block corners
      this.CORNER_RADIUS = 3;

      // Zelos-specific
      this.START_HAT_HEIGHT = 12;
      this.START_HAT_WIDTH = 80;
      this.TALL_INPUT_FIELD_OFFSET_Y = 0;

      this.NO_PADDING = 0;
      this.SMALL_PADDING = 1;
    }
  }

  class Scratch2Renderer extends Blockly.zelos.Renderer {
    constructor(name) {
      super(name);
    }
    makeConstants_() {
      return new Scratch2Constants();
    }
  }

  Blockly.blockRendering.register('scratch2', Scratch2Renderer);
})();

function initBlockly() {
  var tb = document.getElementById("toolbox");
  if (tb) {
    tb.querySelectorAll("category").forEach(function(cat) {
      if (cat.getAttribute("name") !== "Variables" && !cat.hasAttribute("data-netsite")) {
        var topSep = document.createElement("sep");
        topSep.setAttribute("gap", "160");
        var dummy = document.createElement("block");
        dummy.setAttribute("type", "scratch_show");
        cat.insertBefore(topSep, cat.firstChild);
        cat.insertBefore(dummy, cat.firstChild);

        var endSep = document.createElement("sep");
        endSep.setAttribute("gap", "40");
        cat.appendChild(endSep);
      }
    });
  }

  workspace = Blockly.inject("blockly-div", {
    renderer: "scratch2",
    toolbox: document.getElementById("toolbox"),
    scrollbars: true,
    trashcan: true,
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.2,
      maxScale: 5,
      minScale: 0.1,
      scaleSpeed: 1.2
    },
    grid: {
      spacing: 20,
      length: 20,
      colour: "#ddd",
      snap: true
    },
    theme: buildScratchTheme()
  });

  var _saveTimer = null;
  workspace.addChangeListener(function (e) {
    if (e.isUiEvent) return;
    if (activeSprite && !_switchingSprite) {
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(function () {
        activeSprite._workspace = _saveWorkspaceState(workspace);
      }, 300);
    }
  });

  workspace.registerToolboxCategoryCallback("VARIABLE", function (ws) {
    var blockList = Blockly.Variables.flyoutCategory(ws);
    
    var topSep = document.createElement("sep");
    topSep.setAttribute("gap", "160");
    var dummy = document.createElement("block");
    dummy.setAttribute("type", "scratch_show");
    blockList.unshift(topSep);
    blockList.unshift(dummy);
    
    var sep = document.createElement("sep");
    sep.setAttribute("gap", "16");
    blockList.push(sep);
    var showBlock = document.createElement("block");
    showBlock.setAttribute("type", "scratch_var_show");
    blockList.push(showBlock);
    var hideBlock = document.createElement("block");
    hideBlock.setAttribute("type", "scratch_var_hide");
    blockList.push(hideBlock);
    
    var endSep = document.createElement("sep");
    endSep.setAttribute("gap", "40");
    blockList.push(endSep);
    
    return blockList;
  });

  // Inject SVG filters — exact algorithm from scratchblocks-main/scratch2
  _injectScratch2Filters();

  // Override Blockly's hardcoded ".blocklyDropdownText { fill: #fff !important }"
  // Blockly inserts its <style> at the START of <head>; appending at END wins the cascade.
  var ddOverride = document.createElement('style');
  ddOverride.textContent =
    '.blocklyDropdownText { fill: #000 !important; }' +
    'text.blocklyDropdownText { fill: #000 !important; }' +
    'text.blocklyText.blocklyDropdownText { fill: #000 !important; }' +
    '.blocklySvg .blocklyDropdownText { fill: #000 !important; }' +
    '#blockly-div .blocklyDropdownText { fill: #000 !important; }';
  document.head.appendChild(ddOverride);
}

// Bevel/dark filters ported from scratchblocks-main/scratch2/style.js
function _injectScratch2Filters() {
  var svg = workspace.getParentSvg();
  if (!svg) return;
  var defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  if (!defs.parentNode) svg.insertBefore(defs, svg.firstChild);

  // ── 1. Block bevel (raised) — from Style.bevelFilter(id, inset=false) ──
  // blur(1, alpha); merge [SourceGraphic, white-highlight-top-left, black-shadow-bottom-right]
  var bevel = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  bevel.setAttribute('id', 'scratch2Bevel');
  bevel.setAttribute('x0', '-50%'); bevel.setAttribute('y0', '-50%');
  bevel.setAttribute('width', '200%'); bevel.setAttribute('height', '200%');
  bevel.innerHTML =
    '<feGaussianBlur in="SourceAlpha" stdDeviation="1 1" result="blur1"/>' +
    '<feOffset in="blur1" dx="1" dy="1" result="off2"/>' +
    '<feComposite operator="arithmetic" in="SourceAlpha" in2="off2" k2="1" k3="-1" result="sub3"/>' +
    '<feFlood flood-color="#fff" flood-opacity="0.32" result="flood4"/>' +
    '<feComposite operator="in" in="flood4" in2="sub3" result="hi5"/>' +
    '<feOffset in="blur1" dx="-1" dy="-1" result="off6"/>' +
    '<feComposite operator="arithmetic" in="SourceAlpha" in2="off6" k2="1" k3="-1" result="sub7"/>' +
    '<feFlood flood-color="#000" flood-opacity="0.9" result="flood8"/>' +
    '<feComposite operator="in" in="flood8" in2="sub7" result="sh9"/>' +
    '<feMerge>' +
    '<feMergeNode in="SourceGraphic"/>' +
    '<feMergeNode in="hi5"/>' +
    '<feMergeNode in="sh9"/>' +
    '</feMerge>';
  defs.appendChild(bevel);

  // ── 2. Input bevel (inset) — from Style.bevelFilter(id, inset=true) ──
  var insetBevel = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  insetBevel.setAttribute('id', 'scratch2InputBevel');
  insetBevel.setAttribute('x0', '-50%'); insetBevel.setAttribute('y0', '-50%');
  insetBevel.setAttribute('width', '200%'); insetBevel.setAttribute('height', '200%');
  insetBevel.innerHTML =
    '<feGaussianBlur in="SourceAlpha" stdDeviation="1 1" result="blur1"/>' +
    '<feOffset in="blur1" dx="-1" dy="-1" result="off2"/>' +
    '<feComposite operator="arithmetic" in="SourceAlpha" in2="off2" k2="1" k3="-1" result="sub3"/>' +
    '<feFlood flood-color="#fff" flood-opacity="0.15" result="flood4"/>' +
    '<feComposite operator="in" in="flood4" in2="sub3" result="hi5"/>' +
    '<feOffset in="blur1" dx="1" dy="1" result="off6"/>' +
    '<feComposite operator="arithmetic" in="SourceAlpha" in2="off6" k2="1" k3="-1" result="sub7"/>' +
    '<feFlood flood-color="#000" flood-opacity="0.7" result="flood8"/>' +
    '<feComposite operator="in" in="flood8" in2="sub7" result="sh9"/>' +
    '<feMerge>' +
    '<feMergeNode in="SourceGraphic"/>' +
    '<feMergeNode in="hi5"/>' +
    '<feMergeNode in="sh9"/>' +
    '</feMerge>';
  defs.appendChild(insetBevel);

  // ── 3. Dark filter — from Style.darkFilter(id) ──
  var dark = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  dark.setAttribute('id', 'scratch2Dark');
  dark.setAttribute('x0', '-50%'); dark.setAttribute('y0', '-50%');
  dark.setAttribute('width', '200%'); dark.setAttribute('height', '200%');
  dark.innerHTML =
    '<feFlood flood-color="#000" flood-opacity="0.2" result="flood1"/>' +
    '<feComposite operator="in" in="flood1" in2="SourceAlpha" result="dark2"/>' +
    '<feMerge>' +
    '<feMergeNode in="SourceGraphic"/>' +
    '<feMergeNode in="dark2"/>' +
    '</feMerge>';
  defs.appendChild(dark);

  // ── 4. Text drop-shadow ──
  var txtShadow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  txtShadow.setAttribute('id', 'scratch2TextShadow');
  txtShadow.setAttribute('x', '-5%'); txtShadow.setAttribute('y', '-25%');
  txtShadow.setAttribute('width', '110%'); txtShadow.setAttribute('height', '160%');
  txtShadow.innerHTML =
    '<feDropShadow dx="0" dy="1" stdDeviation="0" flood-color="#000" flood-opacity="0.35"/>';
  defs.appendChild(txtShadow);

  // ── 5. Inline SVG style — forces dropdown text black ──
  var svgStyle = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  svgStyle.setAttribute('id', 'scratch2OverrideStyle');
  svgStyle.textContent =
    '.blocklyDropdownText { fill: #000 !important; filter: none !important; }';
  defs.appendChild(svgStyle);
}

function buildScratchTheme() {
  return Blockly.Theme.defineTheme("scratch14", {
    name: "scratch14",
    blockStyles: {
      // Exact Scratch 2.0 colors
      // In Zelos: tertiary = block stroke/border colour (dark edges)
      motion_blocks: { colourPrimary: "#4a6cd4", colourSecondary: "#6888dc", colourTertiary: "#344d97" },
      looks_blocks: { colourPrimary: "#8a55d7", colourSecondary: "#9e70dc", colourTertiary: "#623c99" },
      sound_blocks: { colourPrimary: "#bb42c3", colourSecondary: "#c760cd", colourTertiary: "#68246d" },
      events_blocks: { colourPrimary: "#c88330", colourSecondary: "#d4993f", colourTertiary: "#8e5d22", hat: "cap" },
      control_blocks: { colourPrimary: "#e1a91a", colourSecondary: "#e8ba3c", colourTertiary: "#a07812" },
      sensing_blocks: { colourPrimary: "#2ca5e2", colourSecondary: "#52b8e8", colourTertiary: "#1f75a1" },
      operator_blocks: { colourPrimary: "#5cb712", colourSecondary: "#78c832", colourTertiary: "#336609" },
      variable_blocks: { colourPrimary: "#ee7d16", colourSecondary: "#f09838", colourTertiary: "#c36612" },
      pen_blocks: { colourPrimary: "#0e9a6c", colourSecondary: "#34b088", colourTertiary: "#0a6e4d" },
      log_blocks: { colourPrimary: "#666666", colourSecondary: "#808080", colourTertiary: "#3d3d3d" },
      boolean_blocks: { colourPrimary: "#8B0000", colourSecondary: "#a82020", colourTertiary: "#5a0000" },
      file_blocks: { colourPrimary: "#978500", colourSecondary: "#b09e20", colourTertiary: "#6b5e00" },
    },
    componentStyles: {
      workspaceBackgroundColour: "#7E7E7E",
      toolboxBackgroundColour: "#505050",
      toolboxForegroundColour: "#e8e8e8",
      flyoutBackgroundColour: "#585858",
      flyoutForegroundColour: "#e8e8e8",
      flyoutOpacity: 0.97,
      scrollbarColour: "#888888",
      insertionMarkerColour: "#fff",
      insertionMarkerOpacity: 0.4,
      scrollbarOpacity: 0.8,
      cursorColour: "#ffffff",
    }
  });
}

// ==============================================================
//  VARIABLE MONITOR SYSTEM
// ==============================================================
(function () {
  // Override Blockly variable generators to use _scratchVars
  var gen = javascript.javascriptGenerator;

  gen.forBlock["variables_get"] = function (block) {
    var name = block.getFieldValue("VAR") || "x";
    return ["_scratchVars[" + JSON.stringify(name) + "]", 0];
  };

  gen.forBlock["variables_set"] = function (block) {
    var name = block.getFieldValue("VAR") || "x";
    var val = gen.valueToCode(block, "VALUE", 0) || "0";
    return "_scratchVars[" + JSON.stringify(name) + "] = " + val + ";\n_updateVarMonitors();\n";
  };

  gen.forBlock["math_change"] = function (block) {
    var name = block.getFieldValue("VAR") || "x";
    var delta = gen.valueToCode(block, "DELTA", 0) || "1";
    return "_scratchVars[" + JSON.stringify(name) + "] = (Number(_scratchVars[" + JSON.stringify(name) + "]) || 0) + " + delta + ";\n_updateVarMonitors();\n";
  };
})();

function _showVar(name) {
  _varMonitors[name] = true;
  _updateVarMonitors();
}

function _hideVar(name) {
  _varMonitors[name] = false;
  _updateVarMonitors();
}

function _updateVarMonitors() {
  var container = document.getElementById("var-monitors");
  if (!container) return;
  container.innerHTML = "";
  var yOff = 5;
  for (var name in _varMonitors) {
    if (!_varMonitors[name]) continue;
    var div = document.createElement("div");
    div.className = "var-monitor";
    div.style.left = "5px";
    div.style.top = yOff + "px";
    var val = _scratchVars[name];
    if (val === undefined) val = 0;
    div.innerHTML = '<span class="var-label">' + _escHtml(name) + '</span><span class="var-value">' + _escHtml(String(val)) + '</span>';
    container.appendChild(div);
    yOff += 22;
  }
}

function _escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ==============================================================
//  TABS
// ==============================================================
function showTab(name) {
  ["scripts", "costumes", "sounds"].forEach(function (t) {
    document.getElementById("tab-" + t + "-content").classList.toggle("active", t === name);
    document.getElementById("tab-" + t).classList.toggle("active", t === name);
  });
  if (name === "scripts") {
    setTimeout(function () { Blockly.svgResize(workspace); }, 50);
  }
  if (name === "costumes") {
    _refreshCostumeList();
    if (activeSprite && activeSprite.costumes.length && _costumeCtx) {
      _loadCostumeToCanvas(activeSprite.costumes[activeSprite.currentCostume].dataURL);
    }
  }
  if (name === "sounds") {
    _refreshSoundList();
  }
}

// ==============================================================
//  MENU
// ==============================================================
function toggleMenu(id) {
  var el = document.getElementById(id);
  var isOpen = el.classList.contains("open");
  document.querySelectorAll(".menu-dropdown").forEach(function (m) { m.classList.remove("open"); });
  if (!isOpen) {
    var items = document.querySelectorAll(".menu-item");
    var menus = ["file-menu", "edit-menu", "help-menu"];
    var xOffset = 0;
    items.forEach(function (item, idx) {
      if (menus[idx] === id) xOffset = item.offsetLeft;
    });
    el.style.left = xOffset + "px";
    el.classList.add("open");
  }
}

function newProject() {
  if (!confirm("Start a new project? Unsaved changes will be lost.")) return;
  sprites = [];
  activeSprite = null;
  cameraX = 0; cameraY = 0;
  workspace.clear();
  _addBackgroundSprite();
  refreshSpriteList();
  addSpriteFromLibrary("Cat", "assets/sprites/cat.png");
  setStatus("New project.");
}

function saveProject() {
  if (activeSprite && workspace) {
    activeSprite._workspace = _saveWorkspaceState(workspace);
  }
  var data = {
    engineVersion: FNE_VERSION,
    camera: { x: cameraX, y: cameraY },
    sprites: sprites.map(function (s) {
      return {
        name: s.name, imgPath: s.imgPath,
        x: s.x, y: s.y, z: s.z, dir: s.dir,
        size: s.size, visible: s.visible,
        isStatic: s.isStatic, gravity: s.gravity, vx: s.vx, vy: s.vy,
        objectType: s.objectType, objectShape: s.objectShape,
        costumes: s.costumes, sounds: s.sounds,
        currentCostume: s.currentCostume,
        scaleX: s.scaleX, scaleY: s.scaleY, scaleZ: s.scaleZ,
        draggable: s.draggable, collideable: s.collideable,
        isBackground: s.isBackground || false,
        blocks: _cleanWorkspaceState(s._workspace)
      };
    })
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "project.fn0";
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("Project saved.");
}

function loadProject() {
  document.getElementById("load-file-input").click();
}

function doLoadProject(evt) {
  var file = evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      sprites = [];
      workspace.clear();
      activeSprite = null;
      if (data.camera) { cameraX = data.camera.x || 0; cameraY = data.camera.y || 0; }
      data.sprites.forEach(function (sd) {
        var sp = new Sprite(sd.name, sd.imgPath || null);
        sp.x = sd.x || 0; sp.y = sd.y || 0; sp.z = sd.z || 0;
        sp.dir = sd.dir || 90;
        sp.size = sd.size || 100;
        sp.visible = sd.visible !== false;
        sp.isStatic = sd.isStatic || false;
        sp.gravity = sd.gravity || 0;
        sp.vx = sd.vx || 0;
        sp.vy = sd.vy || 0;
        sp.objectType = sd.objectType || "sprite";
        sp.objectShape = sd.objectShape || null;
        sp.costumes = sd.costumes || [];
        sp.sounds = sd.sounds || [];
        sp.currentCostume = sd.currentCostume || 0;
        sp.scaleX = sd.scaleX !== undefined ? sd.scaleX : 100;
        sp.scaleY = sd.scaleY !== undefined ? sd.scaleY : 100;
        sp.scaleZ = sd.scaleZ !== undefined ? sd.scaleZ : 100;
        sp.draggable = sd.draggable !== undefined ? sd.draggable : true;
        sp.collideable = sd.collideable !== undefined ? sd.collideable : true;
        sp.isBackground = sd.isBackground || false;
        if (sp.isBackground) { sp.collideable = false; sp.draggable = false; }
        if (sp.objectShape) {
          var dims = OBJECT_DIMS[sp.objectShape] || { w: 40, h: 40 };
          sp._baseW = dims.w; sp._baseH = dims.h;
        }
        // Restore costume image
        if (sp.costumes.length > 0 && sp.costumes[sp.currentCostume]) {
          var costumeData = sp.costumes[sp.currentCostume].dataURL;
          if (costumeData) {
            var cimg = new Image();
            cimg.onload = (function (spr, img2) {
              return function () {
                spr.img = img2; spr.imgLoaded = true;
                var w2 = img2.naturalWidth, h2 = img2.naturalHeight;
                var maxD = Math.max(w2, h2, 1);
                var fit2 = 80 / maxD;
                spr._baseW = w2 * fit2; spr._baseH = h2 * fit2;
              };
            })(sp, cimg);
            cimg.src = costumeData;
          }
        } else if (sp.imgPath) {
          var pimg = new Image();
          pimg.onload = (function (spr, img3) {
            return function () {
              spr.img = img3; spr.imgLoaded = true;
              var w3 = img3.naturalWidth, h3 = img3.naturalHeight;
              var maxD = Math.max(w3, h3, 1);
              var fit3 = 80 / maxD;
              spr._baseW = w3 * fit3; spr._baseH = h3 * fit3;
            };
          })(sp, pimg);
          pimg.src = sp.imgPath;
        }
        sp._workspace = _cleanWorkspaceState(sd.blocks) || null;
        sprites.push(sp);
      });
      // Add Background sprite if missing (backward compatibility)
      if (!sprites.find(function (s) { return s.isBackground; })) _addBackgroundSprite();
      refreshSpriteList();
      if (sprites.length) selectSprite(0);
      setStatus("Project loaded: " + file.name);
    } catch (ex) {
      alert("Failed to load project: " + ex.message);
    }
  };
  reader.readAsText(file);
  evt.target.value = "";
}

function exportProject() { saveProject(); }
function undoBlocks() { if (workspace) workspace.undo(false); }
function redoBlocks() { if (workspace) workspace.undo(true); }
function clearStage() {
  sprites.forEach(function (s) { s.x = 0; s.y = 0; s.speech = null; });
  cameraX = 0; cameraY = 0;
  setStatus("Stage cleared.");
}

// ==============================================================
//  STAGE MODE
// ==============================================================
function setStageMode(mode) {
  document.getElementById("btn-normal").classList.toggle("active", mode === "normal");
  document.getElementById("btn-big").classList.toggle("active", mode === "big");
  var rp = document.getElementById("right-panel");
  var sc = document.getElementById("stage-container");
  var app = document.getElementById("app");
  var ep = document.getElementById("editor-panel");
  var ip = document.getElementById("info-panel");
  var sp = document.getElementById("sprite-panel");
  var stageCtrl = document.getElementById("stage-controls");
  if (mode === "big") {
    // Hide left panel, info panel, sprite panel
    ep.style.display = "none";
    ip.style.display = "none";
    sp.style.display = "none";
    rp.style.width = "100%";
    rp.style.background = "#000";
    app.style.background = "#000";
    // Controls on top of stage, centered
    stageCtrl.style.background = "#000";
    stageCtrl.style.borderColor = "#000";
    stageCtrl.style.justifyContent = "center";
    // Center stage container
    sc.style.margin = "auto";
    sc.style.maxWidth = "100vw";
    sc.style.maxHeight = "calc(100vh - 40px)";
    stageCanvas.style.width = "100%";
    stageCanvas.style.height = "calc(100vh - 60px)";
    stageCanvas.style.objectFit = "contain";
  } else {
    ep.style.display = "";
    ip.style.display = "";
    sp.style.display = "";
    rp.style.width = "492px";
    rp.style.background = "";
    app.style.background = "";
    stageCtrl.style.background = "";
    stageCtrl.style.borderColor = "";
    stageCtrl.style.justifyContent = "";
    sc.style.margin = "";
    sc.style.maxWidth = "";
    sc.style.maxHeight = "";
    stageCanvas.style.width = "480px";
    stageCanvas.style.height = "360px";
    stageCanvas.style.objectFit = "";
  }
  setTimeout(function () { Blockly.svgResize(workspace); }, 100);
}

// ==============================================================
//  STATUS
// ==============================================================
function setStatus(msg) {
  document.getElementById("status-msg").textContent = msg;
}

// ==============================================================
//  ABOUT
// ==============================================================
function showAbout() {
  document.querySelectorAll(".menu-dropdown").forEach(function (m) { m.classList.remove("open"); });
  var box = document.getElementById("about-overlay");
  if (!box) {
    box = document.createElement("div");
    box.id = "about-overlay";
    box.innerHTML = '<div id="about-box">' +
      '<h2>NetSite Pre-Alpha</h2>' +
      '<p>A Scratch 1.4-style programming environment</p>' +
      '<p>Blocks powered by Google Blockly (Geras renderer)</p>' +
      '<p style="margin-top:10px;color:#888;font-size:10px;">Built for NetSite 2026</p>' +
      '<button class="clay-btn close-btn" id="about-close-btn">Close</button>' +
      '</div>';
    document.body.appendChild(box);
    document.getElementById("about-close-btn").addEventListener("click", function () {
      document.getElementById("about-overlay").classList.remove("open");
    });
  }
  box.classList.add("open");
}

// ==============================================================
//  AUTH SYSTEM (localStorage-based accounts)
// ==============================================================
var _currentUser = null;

function _loadAuth() {
  var saved = localStorage.getItem("fne_current_user");
  if (saved) {
    try {
      _currentUser = JSON.parse(saved);
      _showLoggedIn();
    } catch (e) { _currentUser = null; }
  }
}

function _showLoggedIn() {
  document.getElementById("auth-buttons").style.display = "none";
  var ua = document.getElementById("user-area");
  ua.style.display = "";
  document.getElementById("user-nickname").textContent = _currentUser.nickname;
}

function _showLoggedOut() {
  document.getElementById("auth-buttons").style.display = "";
  document.getElementById("user-area").style.display = "none";
  _currentUser = null;
}

function openJoinModal() {
  document.querySelectorAll(".menu-dropdown").forEach(function (m) { m.classList.remove("open"); });
  // Populate year dropdown
  var ySel = document.getElementById("join-year");
  if (ySel.options.length <= 1) {
    for (var y = 2020; y >= 1950; y--) {
      var o = document.createElement("option");
      o.value = y; o.textContent = y;
      ySel.appendChild(o);
    }
  }
  // Reset to step 1
  document.getElementById("join-step-1").style.display = "";
  document.getElementById("join-step-2").style.display = "none";
  document.getElementById("join-step-3").style.display = "none";
  document.getElementById("join-overlay").classList.add("open");
}
function closeJoinModal() { document.getElementById("join-overlay").classList.remove("open"); }

function joinStep(n) {
  if (n === 2) {
    var month = document.getElementById("join-month").value;
    var year = document.getElementById("join-year").value;
    if (!month || !year) { alert("Please select your birth month and year."); return; }
    document.getElementById("join-step-1").style.display = "none";
    document.getElementById("join-step-2").style.display = "";
  } else if (n === 3) {
    var nick = document.getElementById("join-nickname").value.trim();
    if (!nick) { alert("Please enter a nickname."); return; }
    // Check if nickname already taken
    var users = JSON.parse(localStorage.getItem("fne_users") || "{}");
    if (users[nick.toLowerCase()]) { alert("That nickname is already taken."); return; }
    document.getElementById("join-step-2").style.display = "none";
    document.getElementById("join-step-3").style.display = "";
  }
}

function doJoin() {
  var nickname = document.getElementById("join-nickname").value.trim();
  var nickname2 = document.getElementById("join-nickname2").value.trim();
  var password = document.getElementById("join-password").value;
  if (!password) { alert("Please choose a password."); return; }

  var users = JSON.parse(localStorage.getItem("fne_users") || "{}");
  users[nickname.toLowerCase()] = {
    nickname: nickname,
    nickname2: nickname2 || "",
    password: password,
    created: new Date().toISOString(),
    projects: []
  };
  localStorage.setItem("fne_users", JSON.stringify(users));

  _currentUser = { nickname: nickname, nickname2: nickname2 };
  localStorage.setItem("fne_current_user", JSON.stringify(_currentUser));
  _showLoggedIn();
  closeJoinModal();
  setStatus("Welcome, " + nickname + "!");
}

function openLoginModal() {
  document.querySelectorAll(".menu-dropdown").forEach(function (m) { m.classList.remove("open"); });
  document.getElementById("login-nickname").value = "";
  document.getElementById("login-password").value = "";
  document.getElementById("login-overlay").classList.add("open");
}
function closeLoginModal() { document.getElementById("login-overlay").classList.remove("open"); }

function doLogin() {
  var nick = document.getElementById("login-nickname").value.trim();
  var pw = document.getElementById("login-password").value;
  if (!nick || !pw) { alert("Please enter your nickname and password."); return; }

  var users = JSON.parse(localStorage.getItem("fne_users") || "{}");
  var user = users[nick.toLowerCase()];
  if (!user || user.password !== pw) {
    alert("Incorrect nickname or password.");
    return;
  }
  _currentUser = { nickname: user.nickname, nickname2: user.nickname2 || "" };
  localStorage.setItem("fne_current_user", JSON.stringify(_currentUser));
  _showLoggedIn();
  closeLoginModal();
  setStatus("Welcome back, " + user.nickname + "!");
}

function logoutUser() {
  localStorage.removeItem("fne_current_user");
  _showLoggedOut();
  document.querySelectorAll(".menu-dropdown").forEach(function (m) { m.classList.remove("open"); });
  setStatus("Logged out.");
}

function toggleUserMenu() {
  var menu = document.getElementById("user-menu");
  var isOpen = menu.classList.contains("open");
  document.querySelectorAll(".menu-dropdown").forEach(function (m) { m.classList.remove("open"); });
  if (!isOpen) menu.classList.add("open");
}

// Save project to My Stuff (localStorage)
function saveProjectToMyStuff() {
  document.querySelectorAll(".menu-dropdown").forEach(function (m) { m.classList.remove("open"); });
  if (!_currentUser) {
    alert("Please log in first to save to My Stuff.");
    return;
  }
  if (activeSprite && workspace) {
    activeSprite._workspace = _saveWorkspaceState(workspace);
  }
  var projectName = prompt("Project name:", "My Project");
  if (!projectName) return;

  var data = {
    camera: { x: cameraX, y: cameraY },
    sprites: sprites.map(function (s) {
      return {
        name: s.name, imgPath: s.imgPath,
        x: s.x, y: s.y, z: s.z, dir: s.dir,
        size: s.size, visible: s.visible,
        isStatic: s.isStatic, gravity: s.gravity, vx: s.vx, vy: s.vy,
        objectType: s.objectType, objectShape: s.objectShape,
        costumes: s.costumes, sounds: s.sounds,
        currentCostume: s.currentCostume,
        scaleX: s.scaleX, scaleY: s.scaleY, scaleZ: s.scaleZ,
        draggable: s.draggable, collideable: s.collideable,
        isBackground: s.isBackground || false,
        blocks: _cleanWorkspaceState(s._workspace)
      };
    })
  };

  var users = JSON.parse(localStorage.getItem("fne_users") || "{}");
  var user = users[_currentUser.nickname.toLowerCase()];
  if (!user) { alert("User not found. Please log in again."); return; }
  if (!user.projects) user.projects = [];

  // Check if same-named project exists — update it
  var found = false;
  for (var i = 0; i < user.projects.length; i++) {
    if (user.projects[i].name === projectName) {
      user.projects[i].data = JSON.stringify(data);
      user.projects[i].updated = new Date().toISOString();
      found = true;
      break;
    }
  }
  if (!found) {
    user.projects.push({
      name: projectName,
      data: JSON.stringify(data),
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    });
  }
  users[_currentUser.nickname.toLowerCase()] = user;
  localStorage.setItem("fne_users", JSON.stringify(users));
  setStatus("Saved \"" + projectName + "\" to My Stuff.");
}

// ==============================================================
//  RESIZE
// ==============================================================
window.addEventListener("resize", function () {
  if (workspace) Blockly.svgResize(workspace);
});

// ==============================================================
//  OBJECT PICKER
// ==============================================================
function openObjectPicker() {
  var grid = document.getElementById("object-picker-grid");
  grid.innerHTML = "";
  OBJECT_LIBRARY.forEach(function (obj) {
    var item = document.createElement("div");
    item.className = "picker-item";
    // Draw a preview on a small canvas
    var cvs = document.createElement("canvas");
    cvs.width = 60; cvs.height = 60;
    cvs.style.cssText = "width:60px;height:60px;border:1px solid #bbb;border-radius:3px;background:white;";
    var pCtx = cvs.getContext("2d");
    pCtx.save();
    pCtx.translate(30, 30);
    var tmpSprite = new Sprite(obj.name, null);
    tmpSprite.objectShape = obj.shape;
    tmpSprite._drawShape(pCtx, 0.6);
    pCtx.restore();
    var lbl = document.createElement("div");
    lbl.className = "picker-name";
    lbl.textContent = obj.name;
    item.appendChild(cvs);
    item.appendChild(lbl);
    item.addEventListener("click", function () {
      addObjectFromLibrary(obj.name, obj.shape);
      document.getElementById("object-picker-overlay").classList.remove("open");
    });
    grid.appendChild(item);
  });
  document.getElementById("object-picker-overlay").classList.add("open");
}

function closeObjectPicker(e) {
  if (!e || e.target === document.getElementById("object-picker-overlay")) {
    document.getElementById("object-picker-overlay").classList.remove("open");
  }
}

function addObjectFromLibrary(name, shape) {
  var finalName = name;
  var n = 2;
  while (sprites.find(function (s) { return s.name === finalName; })) finalName = name + n++;
  var sp = new Sprite(finalName, null);
  sp.objectType = "object";
  sp.objectShape = shape;
  var dims = OBJECT_DIMS[shape] || { w: 40, h: 40 };
  sp._baseW = dims.w;
  sp._baseH = dims.h;
  if (shape === "ground") { sp.isStatic = true; sp.y = -120; }
  if (shape === "platform") { sp.isStatic = true; }
  if (shape === "physics_ball") { sp.gravity = 9.8; }
  if (shape === "bouncing_ball") { sp.gravity = 9.8; }
  if (shape === "custom") {
    // Open costume editor tab automatically for custom objects
    setTimeout(function () { showTab("costumes"); }, 100);
  }
  sprites.push(sp);
  refreshSpriteList();
  selectSprite(sprites.length - 1);
  setStatus("Added object: " + finalName);
}

// ==============================================================
//  INFO PANEL BINDING
// ==============================================================
function updateInfoPanel() {
  var sp = activeSprite;
  if (!sp) return;
  document.getElementById("info-name").value = sp.name;
  document.getElementById("info-rotation").value = Math.round(sp.dir);
  document.getElementById("info-x").value = Math.round(sp.x * 10) / 10;
  document.getElementById("info-y").value = Math.round(sp.y * 10) / 10;
  document.getElementById("info-z").value = sp.z || 0;
  document.getElementById("info-scale").value = sp.size;
  document.getElementById("info-scale-x").value = sp.scaleX || 100;
  document.getElementById("info-scale-y").value = sp.scaleY || 100;
  document.getElementById("info-static").checked = sp.isStatic;
  document.getElementById("info-collision").checked = sp.collideable !== false;
  document.getElementById("info-gravity").value = sp.gravity;
  document.getElementById("info-object-type").value = sp.objectType;
}

function _initInfoPanel() {
  document.getElementById("info-name").addEventListener("input", function () {
    if (activeSprite) { activeSprite.name = this.value; refreshSpriteList(); }
  });
  document.getElementById("info-rotation").addEventListener("input", function () {
    if (activeSprite) activeSprite.dir = parseFloat(this.value) || 0;
  });
  document.getElementById("info-x").addEventListener("input", function () {
    if (activeSprite) activeSprite.x = parseFloat(this.value) || 0;
  });
  document.getElementById("info-y").addEventListener("input", function () {
    if (activeSprite) activeSprite.y = parseFloat(this.value) || 0;
  });
  document.getElementById("info-z").addEventListener("input", function () {
    if (activeSprite) activeSprite.z = parseFloat(this.value) || 0;
  });
  document.getElementById("info-scale").addEventListener("input", function () {
    if (activeSprite) activeSprite.size = Math.max(5, parseFloat(this.value) || 100);
  });
  document.getElementById("info-scale-x").addEventListener("input", function () {
    if (activeSprite) activeSprite.scaleX = parseFloat(this.value) || 100;
  });
  document.getElementById("info-scale-y").addEventListener("input", function () {
    if (activeSprite) activeSprite.scaleY = parseFloat(this.value) || 100;
  });
  document.getElementById("info-static").addEventListener("change", function () {
    if (activeSprite) activeSprite.isStatic = this.checked;
  });
  document.getElementById("info-collision").addEventListener("change", function () {
    if (activeSprite) activeSprite.collideable = this.checked;
  });
  document.getElementById("info-gravity").addEventListener("input", function () {
    if (activeSprite) activeSprite.gravity = parseFloat(this.value) || 0;
  });
  document.getElementById("info-object-type").addEventListener("change", function () {
    if (activeSprite) activeSprite.objectType = this.value;
  });

  // Poll to keep info panel in sync with stage dragging
  setInterval(function () {
    if (activeSprite) updateInfoPanel();
  }, 200);
}

function toggleInfoSection(section) {
  var el = document.getElementById("info-" + section + "-section");
  if (el) el.style.display = el.style.display === "none" ? "" : "none";
}

// ==============================================================
//  COSTUME EDITOR (bitmap drawing)
// ==============================================================
var _costumeCanvas, _costumeCtx;
var _costumeTool = "pencil";
var _costumeColor = "#000000";
var _costumeBrush = 3;
var _costumeDrawing = false;
var _costumeLastX = 0;
var _costumeLastY = 0;
var _costumeShapeStart = null;
var _costumeShapeSnap = null;

function _initCostumeEditor() {
  _costumeCanvas = document.getElementById("costume-canvas");
  _costumeCtx = _costumeCanvas.getContext("2d");
  _costumeCtx.fillStyle = "white";
  _costumeCtx.fillRect(0, 0, 480, 360);

  document.getElementById("costume-color").addEventListener("input", function () {
    _costumeColor = this.value;
  });
  document.getElementById("costume-brush-size").addEventListener("input", function () {
    _costumeBrush = parseInt(this.value) || 3;
    document.getElementById("costume-brush-size-label").textContent = _costumeBrush;
  });
  var _selRect = null, _selImg = null, _selDragging = false, _selOffX = 0, _selOffY = 0;

  _costumeCanvas.addEventListener("mousedown", function (e) {
    var pos = _getCostumePos(e);
    _costumeLastX = pos.x; _costumeLastY = pos.y;
    _costumeDrawing = true;

    if (_costumeTool === "eyedropper") {
      var d = _costumeCtx.getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
      if (d[3] > 0) {
        var h = "#" + ((1 << 24) + (d[0] << 16) + (d[1] << 8) + d[2]).toString(16).slice(1);
        _costumeColor = h; document.getElementById("costume-color").value = h;
      }
      _costumeDrawing = false; return;
    }
    if (_costumeTool === "text") {
      var txt = prompt("Enter text:");
      if (txt) {
        _costumeCtx.font = "bold " + Math.max(12, _costumeBrush * 4) + "px Arial";
        _costumeCtx.fillStyle = _costumeColor;
        _costumeCtx.fillText(txt, pos.x, pos.y);
        _saveCostumeState();
      }
      _costumeDrawing = false; return;
    }
    if (_costumeTool === "select" || _costumeTool === "stamp") {
      if (_selImg && pos.x >= _selRect.x && pos.x <= _selRect.x + _selRect.w && pos.y >= _selRect.y && pos.y <= _selRect.y + _selRect.h) {
        _selDragging = true; _selOffX = pos.x - _selRect.x; _selOffY = pos.y - _selRect.y;
        _costumeShapeSnap = _costumeCtx.getImageData(0, 0, 480, 360);
      } else {
        if (_selImg) { // commit previous selection
          _costumeCtx.putImageData(_selImg, _selRect.x, _selRect.y);
          _selImg = null; _saveCostumeState();
        }
        _costumeShapeStart = { x: pos.x, y: pos.y };
        _costumeShapeSnap = _costumeCtx.getImageData(0, 0, 480, 360);
      }
      return;
    }
    if (_selImg) { // clicked another tool while selection active
      _costumeCtx.putImageData(_selImg, _selRect.x, _selRect.y);
      _selImg = null; _saveCostumeState();
    }
    if (_costumeTool === "fill") {
      _costumeFill(Math.round(pos.x), Math.round(pos.y));
      _costumeDrawing = false; _saveCostumeState(); return;
    }
    if (_costumeTool === "rect" || _costumeTool === "circle" || _costumeTool === "line") {
      _costumeShapeStart = { x: pos.x, y: pos.y };
      _costumeShapeSnap = _costumeCtx.getImageData(0, 0, 480, 360);
      return;
    }
    if (_costumeTool === "pencil" || _costumeTool === "eraser") _costumeDot(pos.x, pos.y);
  });

  _costumeCanvas.addEventListener("mousemove", function (e) {
    if (!_costumeDrawing) return;
    var pos = _getCostumePos(e);
    if (_costumeTool === "select" || _costumeTool === "stamp") {
      if (_selDragging) {
        _costumeCtx.putImageData(_costumeShapeSnap, 0, 0);
        _selRect.x = pos.x - _selOffX; _selRect.y = pos.y - _selOffY;
        _costumeCtx.putImageData(_selImg, _selRect.x, _selRect.y);
        _costumeCtx.strokeStyle = "black"; _costumeCtx.setLineDash([4, 4]);
        _costumeCtx.strokeRect(_selRect.x, _selRect.y, _selRect.w, _selRect.h); _costumeCtx.setLineDash([]);
      } else if (_costumeShapeStart) {
        _costumeCtx.putImageData(_costumeShapeSnap, 0, 0);
        var rx = Math.min(_costumeShapeStart.x, pos.x), ry = Math.min(_costumeShapeStart.y, pos.y);
        var rw = Math.abs(pos.x - _costumeShapeStart.x), rh = Math.abs(pos.y - _costumeShapeStart.y);
        _costumeCtx.strokeStyle = "rgba(0,0,0,0.5)"; _costumeCtx.setLineDash([4, 4]);
        _costumeCtx.strokeRect(rx, ry, rw, rh); _costumeCtx.setLineDash([]);
      }
      _costumeLastX = pos.x; _costumeLastY = pos.y; return;
    }
    if (_costumeTool === "pencil" || _costumeTool === "eraser") {
      _costumeStroke(_costumeLastX, _costumeLastY, pos.x, pos.y);
    }
    if (_costumeShapeStart && _costumeShapeSnap) {
      _costumeCtx.putImageData(_costumeShapeSnap, 0, 0); _costumeDrawShapePreview(_costumeShapeStart, pos);
    }
    _costumeLastX = pos.x; _costumeLastY = pos.y;
  });

  document.addEventListener("mouseup", function () {
    if (!_costumeDrawing) return;
    _costumeDrawing = false;
    if (_costumeTool === "select" || _costumeTool === "stamp") {
      if (_selDragging) {
        _selDragging = false;
        if (_costumeTool === "stamp") {
          _costumeCtx.putImageData(_costumeShapeSnap, 0, 0);
          _costumeCtx.putImageData(_selImg, _selRect.x, _selRect.y);
          _costumeShapeSnap = _costumeCtx.getImageData(0, 0, 480, 360);
          _costumeCtx.strokeStyle = "black"; _costumeCtx.setLineDash([4, 4]);
          _costumeCtx.strokeRect(_selRect.x, _selRect.y, _selRect.w, _selRect.h); _costumeCtx.setLineDash([]);
          _saveCostumeState();
        }
      } else if (_costumeShapeStart) {
        _costumeCtx.putImageData(_costumeShapeSnap, 0, 0);
        var rx = Math.floor(Math.min(_costumeShapeStart.x, _costumeLastX)), ry = Math.floor(Math.min(_costumeShapeStart.y, _costumeLastY));
        var rw = Math.floor(Math.abs(_costumeLastX - _costumeShapeStart.x)), rh = Math.floor(Math.abs(_costumeLastY - _costumeShapeStart.y));
        if (rw > 0 && rh > 0) {
          _selRect = { x: rx, y: ry, w: rw, h: rh };
          _selImg = _costumeCtx.getImageData(rx, ry, rw, rh);
          if (_costumeTool === "select") {
            _costumeCtx.fillStyle = "white"; _costumeCtx.fillRect(rx, ry, rw, rh);
            _costumeShapeSnap = _costumeCtx.getImageData(0, 0, 480, 360);
          }
          _costumeCtx.putImageData(_selImg, rx, ry);
          _costumeCtx.strokeStyle = "black"; _costumeCtx.setLineDash([4, 4]);
          _costumeCtx.strokeRect(rx, ry, rw, rh); _costumeCtx.setLineDash([]);
        }
      }
    } else {
      _saveCostumeState();
    }
    if (_costumeTool !== "select" && _costumeTool !== "stamp") {
      _costumeShapeStart = null; _costumeShapeSnap = null;
    }
  });
}

function _getCostumePos(e) {
  var rect = _costumeCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * 480 / rect.width,
    y: (e.clientY - rect.top) * 360 / rect.height
  };
}

function setCostumeTool(tool) {
  _costumeTool = tool;
  document.querySelectorAll(".paint-tool").forEach(function (el) {
    el.classList.toggle("active", el.getAttribute("data-tool") === tool);
  });
  _costumeCanvas.style.cursor = tool === "fill" ? "crosshair" : "crosshair";
}

function _costumeDot(x, y) {
  _costumeCtx.fillStyle = _costumeTool === "eraser" ? "white" : _costumeColor;
  _costumeCtx.beginPath();
  _costumeCtx.arc(x, y, _costumeBrush / 2, 0, Math.PI * 2);
  _costumeCtx.fill();
}

function _costumeStroke(x1, y1, x2, y2) {
  _costumeCtx.strokeStyle = _costumeTool === "eraser" ? "white" : _costumeColor;
  _costumeCtx.lineCap = "round";
  _costumeCtx.lineWidth = _costumeBrush;
  _costumeCtx.beginPath();
  _costumeCtx.moveTo(x1, y1);
  _costumeCtx.lineTo(x2, y2);
  _costumeCtx.stroke();
}

function _costumeDrawShapePreview(start, end) {
  _costumeCtx.strokeStyle = _costumeColor;
  _costumeCtx.fillStyle = _costumeColor;
  _costumeCtx.lineWidth = _costumeBrush;
  if (_costumeTool === "rect") {
    _costumeCtx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  } else if (_costumeTool === "circle") {
    var rx = Math.abs(end.x - start.x) / 2;
    var ry = Math.abs(end.y - start.y) / 2;
    var cx = (start.x + end.x) / 2;
    var cy = (start.y + end.y) / 2;
    _costumeCtx.beginPath();
    _costumeCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    _costumeCtx.stroke();
  } else if (_costumeTool === "line") {
    _costumeCtx.beginPath();
    _costumeCtx.moveTo(start.x, start.y);
    _costumeCtx.lineTo(end.x, end.y);
    _costumeCtx.stroke();
  }
}

function _costumeFill(sx, sy) {
  var imgData = _costumeCtx.getImageData(0, 0, 480, 360);
  var data = imgData.data;
  var w = 480, h = 360;
  var idx = (sy * w + sx) * 4;
  var tr = data[idx], tg = data[idx + 1], tb = data[idx + 2], ta = data[idx + 3];
  var hex = _costumeColor;
  var fr = parseInt(hex.slice(1, 3), 16), fg = parseInt(hex.slice(3, 5), 16), fb = parseInt(hex.slice(5, 7), 16);
  if (tr === fr && tg === fg && tb === fb) return;
  var stack = [[sx, sy]];
  var visited = new Uint8Array(w * h);
  while (stack.length) {
    var pt = stack.pop();
    var px = pt[0], py = pt[1];
    if (px < 0 || px >= w || py < 0 || py >= h) continue;
    var pi = py * w + px;
    if (visited[pi]) continue;
    var i = pi * 4;
    if (Math.abs(data[i] - tr) > 20 || Math.abs(data[i + 1] - tg) > 20 || Math.abs(data[i + 2] - tb) > 20) continue;
    visited[pi] = 1;
    data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = 255;
    stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }
  _costumeCtx.putImageData(imgData, 0, 0);
}

function _saveCostumeState() {
  if (!activeSprite) return;
  var dataURL = _costumeCanvas.toDataURL();
  if (activeSprite.costumes.length === 0) {
    activeSprite.costumes.push({ name: "costume1", dataURL: dataURL });
    activeSprite.currentCostume = 0;
  } else {
    activeSprite.costumes[activeSprite.currentCostume].dataURL = dataURL;
  }
  _refreshCostumeList();
}

function _loadCostumeToCanvas(dataURL) {
  var img = new Image();
  img.onload = function () {
    _costumeCtx.fillStyle = "white";
    _costumeCtx.fillRect(0, 0, 480, 360);
    _costumeCtx.drawImage(img, 0, 0, 480, 360);
  };
  img.src = dataURL;
}

function _refreshCostumeList() {
  var list = document.getElementById("costume-list");
  list.innerHTML = "";
  if (!activeSprite) return;
  activeSprite.costumes.forEach(function (c, i) {
    var div = document.createElement("div");
    div.className = "costume-thumb" + (i === activeSprite.currentCostume ? " selected" : "");
    div.draggable = true;
    
    // Drag-and-drop logic
    div.addEventListener("dragstart", function(e) {
      e.dataTransfer.setData("text/plain", i);
      setTimeout(function() { div.style.opacity = "0.5"; }, 0);
    });
    div.addEventListener("dragend", function(e) { div.style.opacity = "1"; });
    div.addEventListener("dragover", function(e) {
      e.preventDefault();
      div.classList.add("drag-over");
    });
    div.addEventListener("dragleave", function(e) { div.classList.remove("drag-over"); });
    div.addEventListener("drop", function(e) {
      e.preventDefault();
      div.classList.remove("drag-over");
      var fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
      if (fromIdx !== i && !isNaN(fromIdx)) {
        var moved = activeSprite.costumes.splice(fromIdx, 1)[0];
        activeSprite.costumes.splice(i, 0, moved);
        // Adjust currently selected costume index
        if (activeSprite.currentCostume === fromIdx) activeSprite.currentCostume = i;
        else if (activeSprite.currentCostume > fromIdx && activeSprite.currentCostume <= i) activeSprite.currentCostume--;
        else if (activeSprite.currentCostume < fromIdx && activeSprite.currentCostume >= i) activeSprite.currentCostume++;
        _refreshCostumeList();
      }
    });

    var cvs = document.createElement("canvas");
    cvs.width = 84; cvs.height = 50;
    var pCtx = cvs.getContext("2d");
    var img = new Image();
    img.onload = function () { pCtx.drawImage(img, 0, 0, 84, 50); };
    img.src = c.dataURL;
    
    var nameDiv = document.createElement("div");
    nameDiv.className = "costume-thumb-name";
    nameDiv.textContent = c.name;

    // Delete and Duplicate buttons
    var btnOverlay = document.createElement("div");
    btnOverlay.className = "costume-thumb-btns";
    
    var dupeBtn = document.createElement("button");
    dupeBtn.className = "dupe-btn";
    dupeBtn.textContent = "📋";
    dupeBtn.title = "Duplicate";
    dupeBtn.onclick = function(e) {
      e.stopPropagation();
      var dupe = { name: c.name + " copy", dataURL: c.dataURL };
      activeSprite.costumes.splice(i + 1, 0, dupe);
      activeSprite.currentCostume = i + 1;
      _loadCostumeToCanvas(dupe.dataURL);
      _refreshCostumeList();
    };

    var delBtn = document.createElement("button");
    delBtn.textContent = "✖";
    delBtn.title = "Delete";
    delBtn.onclick = function(e) {
      e.stopPropagation();
      if (activeSprite.costumes.length > 1) {
        activeSprite.costumes.splice(i, 1);
        if (activeSprite.currentCostume >= activeSprite.costumes.length) activeSprite.currentCostume--;
        _loadCostumeToCanvas(activeSprite.costumes[activeSprite.currentCostume].dataURL);
        _refreshCostumeList();
      } else {
        alert("A sprite must have at least one costume.");
      }
    };

    btnOverlay.appendChild(dupeBtn);
    btnOverlay.appendChild(delBtn);
    
    div.appendChild(btnOverlay);
    div.appendChild(cvs);
    div.appendChild(nameDiv);

    div.addEventListener("click", function () {
      activeSprite.currentCostume = i;
      _loadCostumeToCanvas(c.dataURL);
      _refreshCostumeList();
    });
    list.appendChild(div);
  });
}


function addBlankCostume() {
  if (!activeSprite) return;
  var name = "costume" + (activeSprite.costumes.length + 1);
  var cvs = document.createElement("canvas");
  cvs.width = 480; cvs.height = 360;
  var ctx = cvs.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 480, 360);
  activeSprite.costumes.push({ name: name, dataURL: cvs.toDataURL() });
  activeSprite.currentCostume = activeSprite.costumes.length - 1;
  _costumeCtx.fillStyle = "white";
  _costumeCtx.fillRect(0, 0, 480, 360);
  _refreshCostumeList();
}

function addCostumeFromFile() {
  document.getElementById("costume-file-input").click();
}

function doCostumeUpload(evt) {
  var file = evt.target.files[0];
  if (!file || !activeSprite) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var name = file.name.replace(/\.[^.]+$/, "") || "imported";
    activeSprite.costumes.push({ name: name, dataURL: e.target.result });
    activeSprite.currentCostume = activeSprite.costumes.length - 1;
    _loadCostumeToCanvas(e.target.result);
    _refreshCostumeList();
  };
  reader.readAsDataURL(file);
  evt.target.value = "";
}

// ==============================================================
//  SOUND EDITOR
// ==============================================================
var _selectedSoundIdx = -1;
var _soundAudio = null;
var _mediaRecorder = null;
var _recordChunks = [];

function _initSoundEditor() {
  // nothing to set up at init; waveform drawn on demand
}

function _refreshSoundList() {
  var list = document.getElementById("sound-list");
  list.innerHTML = "";
  if (!activeSprite) return;
  activeSprite.sounds.forEach(function (s, i) {
    var div = document.createElement("div");
    div.className = "sound-entry" + (i === _selectedSoundIdx ? " selected" : "");
    div.textContent = s.name;
    div.addEventListener("click", function () {
      _selectedSoundIdx = i;
      _refreshSoundList();
      _drawSoundWaveform(s.dataURL);
      document.getElementById("sound-name-label").textContent = s.name;
    });
    list.appendChild(div);
  });
}

function _drawSoundWaveform(dataURL) {
  var cvs = document.getElementById("sound-waveform");
  var ctx = cvs.getContext("2d");
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.strokeStyle = "#44ff88";
  ctx.lineWidth = 1;
  ctx.beginPath();
  var mid = cvs.height / 2;
  ctx.moveTo(0, mid);
  // Simple visual representation
  for (var i = 0; i < cvs.width; i++) {
    var amp = Math.sin(i * 0.15) * (mid * 0.6) * Math.random();
    ctx.lineTo(i, mid + amp);
  }
  ctx.stroke();
  // Center line
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(cvs.width, mid);
  ctx.stroke();
}

function uploadSound() {
  document.getElementById("sound-file-input").click();
}

function doSoundUpload(evt) {
  var file = evt.target.files[0];
  if (!file || !activeSprite) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var name = file.name.replace(/\.[^.]+$/, "") || "sound";
    activeSprite.sounds.push({ name: name, dataURL: e.target.result });
    _selectedSoundIdx = activeSprite.sounds.length - 1;
    _refreshSoundList();
    _drawSoundWaveform(e.target.result);
    document.getElementById("sound-name-label").textContent = name;
    setStatus("Sound added: " + name);
  };
  reader.readAsDataURL(file);
  evt.target.value = "";
}

function recordSound() {
  if (_mediaRecorder && _mediaRecorder.state === "recording") {
    _mediaRecorder.stop();
    setStatus("Recording stopped.");
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    _recordChunks = [];
    _mediaRecorder = new MediaRecorder(stream);
    _mediaRecorder.ondataavailable = function (e) { _recordChunks.push(e.data); };
    _mediaRecorder.onstop = function () {
      stream.getTracks().forEach(function (t) { t.stop(); });
      var blob = new Blob(_recordChunks, { type: "audio/webm" });
      var reader = new FileReader();
      reader.onload = function (e) {
        if (!activeSprite) return;
        var name = "recording" + (activeSprite.sounds.length + 1);
        activeSprite.sounds.push({ name: name, dataURL: e.target.result });
        _selectedSoundIdx = activeSprite.sounds.length - 1;
        _refreshSoundList();
        _drawSoundWaveform(e.target.result);
        document.getElementById("sound-name-label").textContent = name;
        setStatus("Recording saved: " + name);
      };
      reader.readAsDataURL(blob);
    };
    _mediaRecorder.start();
    setStatus("Recording... click Record again to stop.");
  }).catch(function () {
    alert("Could not access microphone.");
  });
}

function playSoundPreview() {
  if (!activeSprite || _selectedSoundIdx < 0) return;
  var s = activeSprite.sounds[_selectedSoundIdx];
  if (!s) return;
  if (_soundAudio) { _soundAudio.pause(); _soundAudio = null; }
  _soundAudio = new Audio(s.dataURL);
  _soundAudio.play();
}

function stopSoundPreview() {
  if (_soundAudio) { _soundAudio.pause(); _soundAudio.currentTime = 0; _soundAudio = null; }
}

function deleteSoundEntry() {
  if (!activeSprite || _selectedSoundIdx < 0) return;
  activeSprite.sounds.splice(_selectedSoundIdx, 1);
  _selectedSoundIdx = Math.min(_selectedSoundIdx, activeSprite.sounds.length - 1);
  _refreshSoundList();
  if (_selectedSoundIdx < 0) {
    document.getElementById("sound-name-label").textContent = "No sound selected";
    var cvs = document.getElementById("sound-waveform");
    var ctx = cvs.getContext("2d");
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, cvs.width, cvs.height);
  }
}

// Update sound_play to actually play sprite sounds
function sound_play(name) {
  var s = _getSprite();
  if (!s) return;
  var snd = s.sounds.find(function (x) { return x.name === name; });
  if (snd) { new Audio(snd.dataURL).play(); }
}
function sound_playUntilDone(name) {
  var s = _getSprite();
  if (!s) return Promise.resolve();
  var snd = s.sounds.find(function (x) { return x.name === name; });
  if (!snd) return Promise.resolve();
  return new Promise(function (res) {
    var a = new Audio(snd.dataURL);
    a.onended = res;
    a.onerror = res;
    a.play();
  });
}
function sound_stopAll() {
  // no global audio tracking in this simple implementation
}

// ==============================================================
//  KEY HAT RUNNER (when key pressed hats)
// ==============================================================
function _initKeyHatRunner() {
  document.addEventListener("keydown", function (e) {
    if (_stopFlag) return;
    var pressedKey = e.key;
    if (!activeSprite || !workspace) return;
    var savedActive = activeSprite;
    var savedWS = _saveWorkspaceState(workspace);
    for (var si = 0; si < sprites.length; si++) {
      var sp = sprites[si];
      var ws = sp._workspace;
      if (!ws) continue;
      workspace.clear();
      try { _loadWorkspaceState(ws, workspace); } catch (e2) { continue; }
      var topBlocks = workspace.getTopBlocks(true);
      for (var bi = 0; bi < topBlocks.length; bi++) {
        if (topBlocks[bi].type === "scratch_when_key") {
          var hatKey = topBlocks[bi].getFieldValue("KEY");
          var match = (hatKey === "any") ||
            (hatKey === "space" && pressedKey === " ") ||
            (hatKey === pressedKey) ||
            (hatKey === "ArrowUp" && (pressedKey === "ArrowUp" || pressedKey === "Up")) ||
            (hatKey === "ArrowDown" && (pressedKey === "ArrowDown" || pressedKey === "Down")) ||
            (hatKey === "ArrowLeft" && (pressedKey === "ArrowLeft" || pressedKey === "Left")) ||
            (hatKey === "ArrowRight" && (pressedKey === "ArrowRight" || pressedKey === "Right"));
          if (match) {
            _runScript(sp, topBlocks[bi]);
          }
        }
      }
    }
    workspace.clear();
    try { _loadWorkspaceState(savedWS, workspace); } catch (e2) { }
    activeSprite = savedActive;
  });
}

// ==============================================================
//  EXTENSION SYSTEM
// ==============================================================
var _enabledExtensions = {};  // name -> true

// Extension toolbox XML definitions
var _extToolboxDefs = {
  html: '<category name="HTML" colour="#5f60b0">' +
    '<block type="ext_html_create_title"></block>' +
    '<block type="ext_html_create_text"></block>' +
    '<block type="ext_html_create_button"></block>' +
    '<block type="ext_html_show_costume"></block>' +
    '<block type="ext_html_create_element"></block>' +
    '<block type="ext_html_set_text"></block>' +
    '<block type="ext_html_set_style"></block>' +
    '<block type="ext_html_set_attr"></block>' +
    '<block type="ext_html_get_text"></block>' +
    '<block type="ext_html_on_click"></block>' +
    '<block type="ext_html_remove"></block>' +
    '</category>',
  iframe: '<category name="iframe" colour="#5f60b0">' +
    '<block type="ext_iframe_open"></block>' +
    '<block type="ext_iframe_close"></block>' +
    '<block type="ext_iframe_resize"></block>' +
    '<block type="ext_iframe_set_style"></block>' +
    '<block type="ext_iframe_reload"></block>' +
    '</category>',
  "3d": '<category name="3D Render" colour="#306998">' +
    '<block type="ext_3d_init"></block>' +
    '<block type="ext_3d_add_cube"></block>' +
    '<block type="ext_3d_add_sphere"></block>' +
    '<block type="ext_3d_add_pyramid"></block>' +
    '<block type="ext_3d_add_cylinder"></block>' +
    '<block type="ext_3d_add_plane"></block>' +
    '<block type="ext_3d_set_color"></block>' +
    '<block type="ext_3d_set_size"></block>' +
    '<block type="ext_3d_rotate_scene"></block>' +
    '<block type="ext_3d_change_obj_x"></block>' +
    '<block type="ext_3d_change_obj_y"></block>' +
    '<block type="ext_3d_change_obj_z"></block>' +
    '<block type="ext_3d_set_obj_pos"></block>' +
    '<block type="ext_3d_remove_all"></block>' +
    '<block type="ext_3d_set_camera_pos"></block>' +
    '<block type="ext_3d_change_cam_x"></block>' +
    '<block type="ext_3d_change_cam_y"></block>' +
    '<block type="ext_3d_set_camera_rot"></block>' +
    '<block type="ext_3d_set_resolution"></block>' +
    '<block type="ext_3d_set_fov"></block>' +
    '<block type="ext_3d_object_count"></block>' +
    '</category>',
  pen3d: '<category name="Pen 3D" colour="#0e9a6c">' +
    '<block type="ext_pen3d_down"></block>' +
    '<block type="ext_pen3d_up"></block>' +
    '<block type="ext_pen3d_set_color"></block>' +
    '<block type="ext_pen3d_set_size"></block>' +
    '<block type="ext_pen3d_set_z"></block>' +
    '<block type="ext_pen3d_change_z"></block>' +
    '<block type="ext_pen3d_get_z"></block>' +
    '<block type="ext_pen3d_clear"></block>' +
    '<block type="ext_pen3d_stamp"></block>' +
    '</category>',
  camera: '<category name="Camera" colour="#5f60b0">' +
    '<block type="ext_camera_start"></block>' +
    '<block type="ext_camera_stop"></block>' +
    '<block type="ext_camera_snapshot"></block>' +
    '<block type="ext_camera_set_opacity"></block>' +
    '<block type="ext_camera_mirror"></block>' +
    '</category>',
  terminal: '<category name="NS-DOS" colour="#5f60b0">' +
    '<block type="ext_terminal_open"></block>' +
    '<block type="ext_terminal_print"></block>' +
    '<block type="ext_terminal_input"></block>' +
    '<block type="ext_terminal_run_command"></block>' +
    '<block type="ext_terminal_set_color"></block>' +
    '<block type="ext_terminal_clear"></block>' +
    '<block type="ext_terminal_close"></block>' +
    '</category>',
};

// Hide Motion category when Background sprite is selected
function _updateToolboxForSprite(sp) {
  if (!workspace) return;
  var toolbox = workspace.getToolbox();
  if (!toolbox) return;
  var contents = toolbox.getToolboxItems();
  for (var i = 0; i < contents.length; i++) {
    var item = contents[i];
    var name = item.name_ || (item.toolboxItemDef_ && item.toolboxItemDef_.name) || "";
    if (!name) {
      var el = item.getDiv();
      if (el) name = el.textContent.trim();
    }
    if (name === "Motion") {
      var div = item.getDiv();
      if (div) div.style.display = (sp && sp.isBackground) ? "none" : "";
      break;
    }
  }
}

function _rebuildToolbox() {
  var toolboxEl = document.getElementById("toolbox");
  // Parse existing toolbox, find the closing </xml>
  var xml = toolboxEl.innerHTML;
  // Remove any existing extension categories
  xml = xml.replace(/<!-- EXT_START -->[\s\S]*?<!-- EXT_END -->/g, "");
  // Build extension categories
  var extXml = "<!-- EXT_START -->";
  for (var key in _enabledExtensions) {
    if (_enabledExtensions[key] && _extToolboxDefs[key]) {
      extXml += _extToolboxDefs[key];
    }
  }
  extXml += "<!-- EXT_END -->";
  // Insert before the closing of the Library category's end
  xml += extXml;
  toolboxEl.innerHTML = xml;
  if (workspace) workspace.updateToolbox(toolboxEl);
}

function openExtPicker() {
  document.getElementById("ext-picker-overlay").style.display = "flex";
}
function closeExtPicker(e) {
  if (!e || e.target.id === "ext-picker-overlay") {
    document.getElementById("ext-picker-overlay").style.display = "none";
  }
}
function addExtension(name) {
  if (_enabledExtensions[name]) {
    setStatus("Extension '" + name + "' is already added.");
    closeExtPicker();
    return;
  }
  _enabledExtensions[name] = true;
  document.getElementById("blockly-div").classList.add("has-extensions");
  _rebuildToolbox();
  closeExtPicker();
  setStatus("Extension added: " + name);
}

// Inject "Add Extension" button into toolbox after Blockly loads
function _injectExtButton() {
  var toolboxDiv = document.querySelector(".blocklyToolboxDiv");
  if (!toolboxDiv) return;
  var btn = document.createElement("button");
  btn.id = "ext-add-btn";
  btn.innerHTML = "➕ Add Extension";
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    openExtPicker();
  });
  toolboxDiv.appendChild(btn);
}

// ── HTML Extension Runtime ──
var _extHtmlContainer = null;
function _getHtmlContainer() {
  if (!_extHtmlContainer) {
    _extHtmlContainer = document.createElement("div");
    _extHtmlContainer.id = "ext-html-container";
    _extHtmlContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;padding:10px;box-sizing:border-box;";
    document.getElementById("stage-container").appendChild(_extHtmlContainer);
  }
  return _extHtmlContainer;
}
function ext_htmlCreate(tag, id) {
  var container = _getHtmlContainer();
  if (container.querySelector("#ext-html-" + CSS.escape(id))) return;
  var el = document.createElement(tag);
  el.id = "ext-html-" + id;
  el.style.cssText = "position:absolute;pointer-events:auto;";
  container.appendChild(el);
}
function ext_htmlSetText(id, text) {
  var el = _getHtmlContainer().querySelector("#ext-html-" + CSS.escape(id));
  if (el) el.textContent = text;
}
function ext_htmlSetStyle(id, css) {
  var el = _getHtmlContainer().querySelector("#ext-html-" + CSS.escape(id));
  if (el) el.style.cssText += ";" + css;
}
function ext_htmlRemove(id) {
  var el = _getHtmlContainer().querySelector("#ext-html-" + CSS.escape(id));
  if (el) el.remove();
}
function ext_htmlSetAttr(id, attr, val) {
  var el = _getHtmlContainer().querySelector("#ext-html-" + CSS.escape(id));
  if (el) el.setAttribute(attr, val);
}
function ext_htmlGetText(id) {
  var el = _getHtmlContainer().querySelector("#ext-html-" + CSS.escape(id));
  return el ? el.textContent : "";
}
function ext_htmlOnClick(id, fn) {
  var el = _getHtmlContainer().querySelector("#ext-html-" + CSS.escape(id));
  if (el) el.addEventListener("click", fn);
}
function ext_htmlCreateTitle(id, text) {
  var container = _getHtmlContainer();
  if (container.querySelector("#ext-html-" + CSS.escape(id))) return;
  var el = document.createElement("h1");
  el.id = "ext-html-" + id;
  el.textContent = text;
  el.style.cssText = "position:absolute;pointer-events:auto;margin:0;padding:4px;font-size:24px;font-weight:bold;color:#333;";
  container.appendChild(el);
}
function ext_htmlCreateText(id, text, x, y) {
  var container = _getHtmlContainer();
  if (container.querySelector("#ext-html-" + CSS.escape(id))) return;
  var el = document.createElement("p");
  el.id = "ext-html-" + id;
  el.textContent = text;
  el.style.cssText = "position:absolute;pointer-events:auto;margin:0;padding:2px;left:" + x + "px;top:" + y + "px;font-size:16px;color:#333;";
  container.appendChild(el);
}
function ext_htmlCreateButton(id, text) {
  var container = _getHtmlContainer();
  if (container.querySelector("#ext-html-" + CSS.escape(id))) return;
  var el = document.createElement("button");
  el.id = "ext-html-" + id;
  el.textContent = text;
  el.style.cssText = "position:absolute;pointer-events:auto;padding:6px 16px;font-size:14px;cursor:pointer;";
  container.appendChild(el);
}
function ext_htmlShowCostume(id, num, x, y) {
  var container = _getHtmlContainer();
  var existing = container.querySelector("#ext-html-" + CSS.escape(id));
  if (existing) existing.remove();
  if (!activeSprite || !activeSprite.costumes.length) return;
  var idx = Math.max(0, Math.min(num - 1, activeSprite.costumes.length - 1));
  var costume = activeSprite.costumes[idx];
  if (!costume || !costume.dataURL) return;
  var el = document.createElement("img");
  el.id = "ext-html-" + id;
  el.src = costume.dataURL;
  el.style.cssText = "position:absolute;pointer-events:auto;left:" + x + "px;top:" + y + "px;max-width:200px;max-height:200px;";
  container.appendChild(el);
}

// ── iframe Extension Runtime ──
var _extIframe = null;
function ext_iframeOpen(url) {
  ext_iframeClose();
  _extIframe = document.createElement("iframe");
  _extIframe.id = "ext-iframe";
  _extIframe.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;border:none;z-index:15;";
  _extIframe.sandbox = "allow-scripts allow-same-origin";
  _extIframe.src = url;
  document.getElementById("stage-container").appendChild(_extIframe);
}
function ext_iframeClose() {
  if (_extIframe) { _extIframe.remove(); _extIframe = null; }
}
function ext_iframeResize(w, h) {
  if (_extIframe) { _extIframe.style.width = w + "px"; _extIframe.style.height = h + "px"; }
}
function ext_iframeSetStyle(css) {
  if (_extIframe) _extIframe.style.cssText += ";" + css;
}
function ext_iframeReload() {
  if (_extIframe) _extIframe.src = _extIframe.src;
}

// ── 3D Render Extension Runtime (simple CSS3D simulation) ──
var _ext3dCanvas = null;
var _ext3dCtx = null;
var _ext3dObjects = [];
var _ext3dAngle = 0;
var _ext3dNextColor = "#4488cc";
var _ext3dCameraZ = 200;
var _ext3dCamX = 0, _ext3dCamY = 0;
var _ext3dCamRotX = 0, _ext3dCamRotY = 0;
var _ext3dResolution = 1;        // 1 = full res, 0.5 = half
var _ext3dLightDir = { x: 0.3, y: 1, z: -0.5 };
var _ext3dFOV = 250;
var _ext3dNextSize = 40;
var _ext3dAmbient = 0.25;
// pen3d state
var _pen3dDown = {};
var _pen3dColor = {};
var _pen3dSize = {};
var _pen3dLastPos = {};
var _pen3dLines = [];

function ext_3dInit() {
  if (!_ext3dCanvas) {
    _ext3dCanvas = document.createElement("canvas");
    _ext3dCanvas.style.cssText = "position:absolute;top:0;left:0;width:" + STAGE_W + "px;height:" + STAGE_H + "px;z-index:5;pointer-events:none;image-rendering:pixelated;";
    document.getElementById("stage-container").appendChild(_ext3dCanvas);
  }
  var rw = Math.max(1, Math.round(STAGE_W * _ext3dResolution));
  var rh = Math.max(1, Math.round(STAGE_H * _ext3dResolution));
  _ext3dCanvas.width = rw;
  _ext3dCanvas.height = rh;
  _ext3dCtx = _ext3dCanvas.getContext("2d");
  _ext3dObjects = [];
  _ext3dAngle = 25;
  _ext3dCamX = 0; _ext3dCamY = 0;
  _ext3dCamRotX = -20; _ext3dCamRotY = 0;
  _pen3dLines = [];
}

function _ext3dSetResolution(r) {
  _ext3dResolution = Math.max(0.1, Math.min(1, Number(r) || 1));
  if (_ext3dCanvas) {
    var rw = Math.max(1, Math.round(STAGE_W * _ext3dResolution));
    var rh = Math.max(1, Math.round(STAGE_H * _ext3dResolution));
    _ext3dCanvas.width = rw;
    _ext3dCanvas.height = rh;
    _ext3dCtx = _ext3dCanvas.getContext("2d");
    _ext3dRender();
  }
}

// ── Vector / Matrix helpers ──
function _v3Normalize(v) {
  var l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
function _v3Dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function _v3Cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
function _v3Sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }

function _ext3dProjectVert(vx, vy, vz) {
  // Apply scene rotation (Y-axis from _ext3dAngle, X-axis from _ext3dCamRotX)
  var ry = _ext3dAngle * Math.PI / 180;
  var rx = _ext3dCamRotX * Math.PI / 180;
  var cosY = Math.cos(ry), sinY = Math.sin(ry);
  var cosX = Math.cos(rx), sinX = Math.sin(rx);
  // Rotate Y (scene rotation)
  var x1 = vx * cosY - vz * sinY;
  var z1 = vx * sinY + vz * cosY;
  var y1 = vy;
  // Rotate X (camera tilt)
  var y2 = y1 * cosX - z1 * sinX;
  var z2 = y1 * sinX + z1 * cosX;
  var x2 = x1;
  // Apply camera offset in view space (screen-relative)
  x2 -= _ext3dCamX;
  y2 -= _ext3dCamY;

  var rw = _ext3dCanvas ? _ext3dCanvas.width : STAGE_W;
  var rh = _ext3dCanvas ? _ext3dCanvas.height : STAGE_H;
  var fov = _ext3dFOV * _ext3dResolution;
  var d = fov + z2;
  if (d < 1) d = 1;
  var scale = fov / d;
  return { sx: rw / 2 + x2 * scale, sy: rh / 2 - y2 * scale, z: z2, scale: scale };
}

// ── Mesh generators (return array of faces, each face = { verts: [{x,y,z},...], color }) ──
function _genCubeFaces(o) {
  var s = (o.size || 20) / 2;
  var c = o.color || "#4488cc";
  var x = o.x, y = o.y, z = o.z;
  var verts = [
    { x: x - s, y: y - s, z: z - s }, { x: x + s, y: y - s, z: z - s }, { x: x + s, y: y + s, z: z - s }, { x: x - s, y: y + s, z: z - s },
    { x: x - s, y: y - s, z: z + s }, { x: x + s, y: y - s, z: z + s }, { x: x + s, y: y + s, z: z + s }, { x: x - s, y: y + s, z: z + s }
  ];
  var faces = [
    [3, 2, 1, 0], // front  (z-)
    [4, 5, 6, 7], // back   (z+)
    [7, 3, 0, 4], // left   (x-)
    [2, 6, 5, 1], // right  (x+)
    [7, 6, 2, 3], // top    (y+)
    [0, 1, 5, 4], // bottom (y-)
  ];
  return faces.map(function (f) { return { verts: f.map(function (i) { return verts[i] }), color: c }; });
}

function _genSphereFaces(o) {
  var r = (o.size || 20) / 2;
  var c = o.color || "#4488cc";
  var x = o.x, y = o.y, z = o.z;
  var segs = 10, rings = 8;
  var faces = [];
  for (var i = 0; i < rings; i++) {
    var phi0 = Math.PI * i / rings - Math.PI / 2;
    var phi1 = Math.PI * (i + 1) / rings - Math.PI / 2;
    for (var j = 0; j < segs; j++) {
      var th0 = 2 * Math.PI * j / segs;
      var th1 = 2 * Math.PI * (j + 1) / segs;
      var v0 = { x: x + r * Math.cos(phi0) * Math.cos(th0), y: y + r * Math.sin(phi0), z: z + r * Math.cos(phi0) * Math.sin(th0) };
      var v1 = { x: x + r * Math.cos(phi0) * Math.cos(th1), y: y + r * Math.sin(phi0), z: z + r * Math.cos(phi0) * Math.sin(th1) };
      var v2 = { x: x + r * Math.cos(phi1) * Math.cos(th1), y: y + r * Math.sin(phi1), z: z + r * Math.cos(phi1) * Math.sin(th1) };
      var v3 = { x: x + r * Math.cos(phi1) * Math.cos(th0), y: y + r * Math.sin(phi1), z: z + r * Math.cos(phi1) * Math.sin(th0) };
      faces.push({ verts: [v3, v2, v1, v0], color: c });
    }
  }
  return faces;
}

function _genPyramidFaces(o) {
  var s = (o.size || 20) / 2;
  var h = o.size || 20;
  var c = o.color || "#4488cc";
  var x = o.x, y = o.y, z = o.z;
  var top = { x: x, y: y + h / 2, z: z };
  var b0 = { x: x - s, y: y - h / 2, z: z - s };
  var b1 = { x: x + s, y: y - h / 2, z: z - s };
  var b2 = { x: x + s, y: y - h / 2, z: z + s };
  var b3 = { x: x - s, y: y - h / 2, z: z + s };
  return [
    { verts: [b3, b2, b1, b0], color: c },  // base
    { verts: [b1, b0, top], color: c },     // front
    { verts: [b2, b1, top], color: c },     // right
    { verts: [b3, b2, top], color: c },     // back
    { verts: [b0, b3, top], color: c },     // left
  ];
}

function _genCylinderFaces(o) {
  var r = (o.size || 20) / 2;
  var h = o.size || 20;
  var c = o.color || "#4488cc";
  var x = o.x, y = o.y, z = o.z;
  var segs = 12;
  var faces = [];
  var topC = [], botC = [];
  for (var i = 0; i < segs; i++) {
    var a0 = 2 * Math.PI * i / segs;
    var a1 = 2 * Math.PI * (i + 1) / segs;
    var cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    var cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    var t0 = { x: x + r * cos0, y: y + h / 2, z: z + r * sin0 };
    var t1 = { x: x + r * cos1, y: y + h / 2, z: z + r * sin1 };
    var b0 = { x: x + r * cos0, y: y - h / 2, z: z + r * sin0 };
    var b1 = { x: x + r * cos1, y: y - h / 2, z: z + r * sin1 };
    faces.push({ verts: [t0, t1, b1, b0], color: c });
    topC.push(t0);
    botC.push(b0);
  }
  faces.push({ verts: topC.reverse(), color: c });
  faces.push({ verts: botC, color: c });
  return faces;
}

function _genPlaneFaces(o) {
  var s = (o.size || 20);
  var c = o.color || "#4488cc";
  var x = o.x, y = o.y, z = o.z;
  return [
    { verts: [{ x: x - s, y: y, z: z + s }, { x: x + s, y: y, z: z + s }, { x: x + s, y: y, z: z - s }, { x: x - s, y: y, z: z - s }], color: c },
    { verts: [{ x: x - s, y: y, z: z - s }, { x: x + s, y: y, z: z - s }, { x: x + s, y: y, z: z + s }, { x: x - s, y: y, z: z + s }], color: c }
  ];
}

// ── Lighting ──
function _ext3dShadeColor(hex, brightness) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);
  r = Math.min(255, Math.max(0, Math.round(r * brightness)));
  g = Math.min(255, Math.max(0, Math.round(g * brightness)));
  b = Math.min(255, Math.max(0, Math.round(b * brightness)));
  return "rgb(" + r + "," + g + "," + b + ")";
}

// ── Main 3D renderer ──
function _ext3dRender() {
  if (!_ext3dCtx) return;
  var ctx = _ext3dCtx;
  var rw = _ext3dCanvas.width, rh = _ext3dCanvas.height;
  ctx.clearRect(0, 0, rw, rh);

  // Collect all faces from all objects
  var allFaces = [];
  var lightN = _v3Normalize(_ext3dLightDir);
  for (var oi = 0; oi < _ext3dObjects.length; oi++) {
    var o = _ext3dObjects[oi];
    var meshFaces;
    if (o.type === "cube") meshFaces = _genCubeFaces(o);
    else if (o.type === "sphere") meshFaces = _genSphereFaces(o);
    else if (o.type === "pyramid") meshFaces = _genPyramidFaces(o);
    else if (o.type === "cylinder") meshFaces = _genCylinderFaces(o);
    else if (o.type === "plane") meshFaces = _genPlaneFaces(o);
    else continue;
    for (var fi = 0; fi < meshFaces.length; fi++) {
      allFaces.push(meshFaces[fi]);
    }
  }

  // Project all face verts, compute face depth and normals
  var projected = [];
  for (var i = 0; i < allFaces.length; i++) {
    var face = allFaces[i];
    var pverts = [];
    var zSum = 0;
    for (var v = 0; v < face.verts.length; v++) {
      var p = _ext3dProjectVert(face.verts[v].x, face.verts[v].y, face.verts[v].z);
      pverts.push(p);
      zSum += p.z;
    }
    // Backface culling using screen-space winding
    if (pverts.length >= 3) {
      var cross2d = (pverts[1].sx - pverts[0].sx) * (pverts[2].sy - pverts[0].sy)
        - (pverts[1].sy - pverts[0].sy) * (pverts[2].sx - pverts[0].sx);
      if (cross2d < 0) continue; // back-facing, skip
    }
    // Normal in world space for lighting
    if (face.verts.length >= 3) {
      var e1 = _v3Sub(face.verts[1], face.verts[0]);
      var e2 = _v3Sub(face.verts[2], face.verts[0]);
      var normal = _v3Normalize(_v3Cross(e1, e2));
      var dot = _v3Dot(normal, lightN);
      var brightness = _ext3dAmbient + (1 - _ext3dAmbient) * Math.max(0, dot);
      projected.push({ pverts: pverts, zAvg: zSum / pverts.length, color: face.color, brightness: brightness });
    }
  }

  // Add pen3d lines as projected faces (thin quads)
  for (var li = 0; li < _pen3dLines.length; li++) {
    var ln = _pen3dLines[li];
    var p0 = _ext3dProjectVert(ln.x1, ln.y1, ln.z1);
    var p1 = _ext3dProjectVert(ln.x2, ln.y2, ln.z2);
    projected.push({
      pverts: [p0, p1],
      zAvg: (p0.z + p1.z) / 2,
      color: ln.color,
      brightness: 1,
      isLine: true,
      lineWidth: ln.size * (p0.scale + p1.scale) / 2
    });
  }

  // Depth sort (painter's algorithm, farthest first)
  projected.sort(function (a, b) { return b.zAvg - a.zAvg; });

  // Render
  for (var i = 0; i < projected.length; i++) {
    var f = projected[i];
    if (f.isLine) {
      ctx.strokeStyle = f.color;
      ctx.lineWidth = Math.max(1, f.lineWidth);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(f.pverts[0].sx, f.pverts[0].sy);
      ctx.lineTo(f.pverts[1].sx, f.pverts[1].sy);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = _ext3dShadeColor(f.color, f.brightness);
    ctx.strokeStyle = _ext3dShadeColor(f.color, f.brightness * 0.6);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(f.pverts[0].sx, f.pverts[0].sy);
    for (var v = 1; v < f.pverts.length; v++) {
      ctx.lineTo(f.pverts[v].sx, f.pverts[v].sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function _darkenColor(hex, amt) {
  hex = hex.replace("#", "");
  var r = Math.round(parseInt(hex.substring(0, 2), 16) * amt);
  var g = Math.round(parseInt(hex.substring(2, 4), 16) * amt);
  var b = Math.round(parseInt(hex.substring(4, 6), 16) * amt);
  return "rgb(" + r + "," + g + "," + b + ")";
}
function _lightenColor(hex, amt) {
  hex = hex.replace("#", "");
  var r = Math.min(255, Math.round(parseInt(hex.substring(0, 2), 16) * (1 + amt)));
  var g = Math.min(255, Math.round(parseInt(hex.substring(2, 4), 16) * (1 + amt)));
  var b = Math.min(255, Math.round(parseInt(hex.substring(4, 6), 16) * (1 + amt)));
  return "rgb(" + r + "," + g + "," + b + ")";
}

// ── Public 3D API ──
function _ext3dFindObj(id) { for (var i = 0; i < _ext3dObjects.length; i++) { if (_ext3dObjects[i].id === id) return _ext3dObjects[i]; } return null; }
function ext_3dAddCube(id, x, y, z) { _ext3dObjects.push({ id: String(id), type: "cube", x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0, color: _ext3dNextColor, size: _ext3dNextSize }); _ext3dRender(); }
function ext_3dAddSphere(id, x, y, z) { _ext3dObjects.push({ id: String(id), type: "sphere", x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0, color: _ext3dNextColor, size: _ext3dNextSize }); _ext3dRender(); }
function ext_3dAddPyramid(id, x, y, z) { _ext3dObjects.push({ id: String(id), type: "pyramid", x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0, color: _ext3dNextColor, size: _ext3dNextSize }); _ext3dRender(); }
function ext_3dAddCylinder(id, x, y, z) { _ext3dObjects.push({ id: String(id), type: "cylinder", x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0, color: _ext3dNextColor, size: _ext3dNextSize }); _ext3dRender(); }
function ext_3dAddPlane(id, x, y, z) { _ext3dObjects.push({ id: String(id), type: "plane", x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0, color: _ext3dNextColor, size: _ext3dNextSize }); _ext3dRender(); }
function ext_3dRotate(deg) { _ext3dAngle += Number(deg) || 0; _ext3dRender(); }
function ext_3dSetColor(col) { _ext3dNextColor = col; }
function ext_3dRemoveAll() { _ext3dObjects = []; _ext3dAngle = 25; _ext3dCamRotX = -20; _pen3dLines = []; if (_ext3dCtx) _ext3dCtx.clearRect(0, 0, _ext3dCanvas.width, _ext3dCanvas.height); }
function ext_3dSetCamera(z) { _ext3dFOV = Math.max(50, Number(z) || 250); _ext3dRender(); }
function ext_3dMoveObject(idx, dx, dy, dz) {
  if (idx >= 0 && idx < _ext3dObjects.length) {
    _ext3dObjects[idx].x += Number(dx) || 0; _ext3dObjects[idx].y += Number(dy) || 0; _ext3dObjects[idx].z += Number(dz) || 0;
    _ext3dRender();
  }
}
function ext_3dMoveLastObject(dx, dy, dz) {
  if (_ext3dObjects.length > 0) {
    var o = _ext3dObjects[_ext3dObjects.length - 1];
    o.x += Number(dx) || 0; o.y += Number(dy) || 0; o.z += Number(dz) || 0;
    _ext3dRender();
  }
}
function ext_3dSetSize(s) { _ext3dNextSize = Math.max(1, Number(s) || 20); }
function ext_3dSetCameraPos(x, y) { _ext3dCamX = Number(x) || 0; _ext3dCamY = Number(y) || 0; _ext3dRender(); }
function ext_3dChangeCamX(dx) { _ext3dCamX += Number(dx) || 0; _ext3dRender(); }
function ext_3dChangeCamY(dy) { _ext3dCamY += Number(dy) || 0; _ext3dRender(); }
function ext_3dSetCameraRotX(deg) { _ext3dCamRotX = Number(deg) || 0; _ext3dRender(); }
function ext_3dSetResolution(r) { _ext3dSetResolution(r); }
function ext_3dSetFOV(f) { _ext3dFOV = Math.max(10, Number(f) || 250); _ext3dRender(); }
function ext_3dObjectCount() { return _ext3dObjects.length; }
function ext_3dChangeObjX(id, dx) { var o = _ext3dFindObj(String(id)); if (o) { o.x += Number(dx) || 0; _ext3dRender(); } }
function ext_3dChangeObjY(id, dy) { var o = _ext3dFindObj(String(id)); if (o) { o.y += Number(dy) || 0; _ext3dRender(); } }
function ext_3dChangeObjZ(id, dz) { var o = _ext3dFindObj(String(id)); if (o) { o.z += Number(dz) || 0; _ext3dRender(); } }
function ext_3dSetObjPos(id, x, y, z) { var o = _ext3dFindObj(String(id)); if (o) { o.x = Number(x) || 0; o.y = Number(y) || 0; o.z = Number(z) || 0; _ext3dRender(); } }

// ── Pen 3D Extension ──
function _pen3dSpriteId() { var s = _getSprite(); return s ? sprites.indexOf(s) : -1; }
function pen3d_down() {
  var id = _pen3dSpriteId(); if (id < 0) return;
  _pen3dDown[id] = true;
  var s = sprites[id];
  _pen3dLastPos[id] = { x: s.x, y: s.y, z: s._pen3dZ || 0 };
}
function pen3d_up() {
  var id = _pen3dSpriteId(); if (id < 0) return;
  _pen3dDown[id] = false;
}
function pen3d_setColor(col) {
  var id = _pen3dSpriteId(); if (id < 0) return;
  _pen3dColor[id] = col;
}
function pen3d_setSize(n) {
  var id = _pen3dSpriteId(); if (id < 0) return;
  _pen3dSize[id] = Math.max(0.5, n);
}
function pen3d_setZ(z) {
  var s = _getSprite(); if (!s) return;
  s._pen3dZ = z;
}
function pen3d_changeZ(dz) {
  var s = _getSprite(); if (!s) return;
  s._pen3dZ = (s._pen3dZ || 0) + dz;
}
function pen3d_getZ() {
  var s = _getSprite(); return s ? (s._pen3dZ || 0) : 0;
}
function pen3d_clear() {
  _pen3dLines = [];
  _ext3dRender();
}
function pen3d_stamp() {
  // Stamp current sprite as a small cube at its position
  var s = _getSprite(); if (!s) return;
  var id = sprites.indexOf(s);
  var col = _pen3dColor[id] || "#ff0000";
  _ext3dObjects.push({ type: "cube", x: s.x, y: s.y, z: (s._pen3dZ || 0), color: col, size: (_pen3dSize[id] || 4) * 2 });
  _ext3dRender();
}
// Called each frame from the game loop to draw pen3d trails
function _pen3dUpdate() {
  var changed = false;
  for (var i = 0; i < sprites.length; i++) {
    if (!_pen3dDown[i]) continue;
    var s = sprites[i];
    var last = _pen3dLastPos[i];
    var cz = s._pen3dZ || 0;
    if (!last) { _pen3dLastPos[i] = { x: s.x, y: s.y, z: cz }; continue; }
    if (last.x !== s.x || last.y !== s.y || last.z !== cz) {
      _pen3dLines.push({
        x1: last.x, y1: last.y, z1: last.z,
        x2: s.x, y2: s.y, z2: cz,
        color: _pen3dColor[i] || "#ff0000",
        size: _pen3dSize[i] || 2
      });
      _pen3dLastPos[i] = { x: s.x, y: s.y, z: cz };
      changed = true;
    }
  }
  if (changed) _ext3dRender();
}

// ── Python Extension Runtime (uses Pyodide CDN) ──
var _pyodide = null;
var _pyodideLoading = false;
function _loadPyodide() {
  if (_pyodide) return Promise.resolve(_pyodide);
  if (_pyodideLoading) {
    return new Promise(function (res) {
      var check = setInterval(function () {
        if (_pyodide) { clearInterval(check); res(_pyodide); }
      }, 200);
    });
  }
  _pyodideLoading = true;
  return new Promise(function (res) {
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
    s.onload = function () {
      loadPyodide().then(function (py) { _pyodide = py; res(py); });
    };
    document.head.appendChild(s);
  });
}
function ext_pythonRun(code) {
  return _loadPyodide().then(function (py) { py.runPython(code); });
}
function ext_pythonEval(code) {
  return _loadPyodide().then(function (py) { return String(py.runPython(code)); });
}

// ── Pen+ 1.0 Extension Runtime ──
var _penplusGradient = null;
var _penplusOpacity = 1;
function ext_penplusGradient(c1, c2) {
  _penplusGradient = [c1, c2];
}
function ext_penplusFillRect(w, h) {
  if (!_penCtx) return;
  var s = _getSprite(); if (!s) return;
  var sx = STAGE_W / 2 + (s.x - cameraX) * UNIT_PX;
  var sy = STAGE_H / 2 - (s.y - cameraY) * UNIT_PX;
  _penCtx.save();
  _penCtx.globalAlpha = _penplusOpacity;
  if (_penplusGradient) {
    var g = _penCtx.createLinearGradient(sx - w / 2, sy, sx + w / 2, sy);
    g.addColorStop(0, _penplusGradient[0]);
    g.addColorStop(1, _penplusGradient[1]);
    _penCtx.fillStyle = g;
  } else {
    _penCtx.fillStyle = _penColor[sprites.indexOf(s)] || "#ff0000";
  }
  _penCtx.fillRect(sx - w / 2, sy - h / 2, w, h);
  _penCtx.restore();
}
function ext_penplusFillCircle(r) {
  if (!_penCtx) return;
  var s = _getSprite(); if (!s) return;
  var sx = STAGE_W / 2 + (s.x - cameraX) * UNIT_PX;
  var sy = STAGE_H / 2 - (s.y - cameraY) * UNIT_PX;
  _penCtx.save();
  _penCtx.globalAlpha = _penplusOpacity;
  if (_penplusGradient) {
    var g = _penCtx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, _penplusGradient[0]);
    g.addColorStop(1, _penplusGradient[1]);
    _penCtx.fillStyle = g;
  } else {
    _penCtx.fillStyle = _penColor[sprites.indexOf(s)] || "#ff0000";
  }
  _penCtx.beginPath();
  _penCtx.arc(sx, sy, r, 0, Math.PI * 2);
  _penCtx.fill();
  _penCtx.restore();
}
function ext_penplusSetOpacity(pct) {
  _penplusOpacity = Math.max(0, Math.min(1, pct / 100));
}

// ── Camera Extension Runtime ──
var _camStream = null;
var _camVideo = null;
function ext_cameraStart() {
  return navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
    _camStream = stream;
    if (_camVideo) _camVideo.remove();
    _camVideo = document.createElement("video");
    _camVideo.srcObject = stream;
    _camVideo.autoplay = true;
    _camVideo.playsInline = true;
    _camVideo.muted = true;
    _camVideo.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;opacity:0.5;object-fit:cover;pointer-events:none;";
    document.getElementById("stage-container").appendChild(_camVideo);
    return _camVideo.play();
  });
}
function ext_cameraStop() {
  if (_camStream) {
    _camStream.getTracks().forEach(function (t) { t.stop(); });
    _camStream = null;
  }
  if (_camVideo) { _camVideo.remove(); _camVideo = null; }
}
function ext_cameraSnapshot() {
  if (!_camVideo || !activeSprite) return;
  if (_camVideo.readyState < 2) return; // not enough data yet
  var c = document.createElement("canvas");
  c.width = _camVideo.videoWidth || 480;
  c.height = _camVideo.videoHeight || 360;
  var cx = c.getContext("2d");
  cx.drawImage(_camVideo, 0, 0, c.width, c.height);
  var dataURL = c.toDataURL();
  activeSprite.costumes.push({ name: "snapshot", dataURL: dataURL });
  var img = new Image();
  var sp = activeSprite;
  img.onload = function () {
    sp.img = img;
    sp.imgLoaded = true;
    var w = img.naturalWidth, h = img.naturalHeight;
    var maxDim = Math.max(w, h, 1);
    var fit = 80 / maxDim;
    sp._baseW = w * fit;
    sp._baseH = h * fit;
  };
  img.src = dataURL;
  setStatus("Snapshot saved as costume.");
}
function ext_cameraSetOpacity(pct) { if (_camVideo) _camVideo.style.opacity = Math.max(0, Math.min(1, pct / 100)); }
function ext_cameraMirror(val) { if (_camVideo) _camVideo.style.transform = (val === "true" || val === "on" || val === true) ? "scaleX(-1)" : "none"; }

// ── Terminal NS-DOS 1.0 Extension Runtime ──
var _termOverlay = null;
var _termOutput = null;
var _termInputResolve = null;
var _termPromptEl = null;
var _termInputEl = null;
function ext_terminalOpen() {
  if (_termOverlay) return;
  _termOverlay = document.createElement("div");
  _termOverlay.id = "ext-terminal-overlay";
  _termOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:#000;color:#0f0;font-family:Consolas,monospace;font-size:13px;z-index:20;display:flex;flex-direction:column;padding:14px;overflow:hidden;box-sizing:border-box;";
  _termOutput = document.createElement("div");
  _termOutput.style.cssText = "flex:1;overflow-y:auto;white-space:pre-wrap;word-break:break-all;padding-bottom:4px;min-height:0;";
  _termOutput.textContent = "NS-DOS 1.0\n(C) FunnyNetwork Systems\n\n";
  _termOverlay.appendChild(_termOutput);
  var inputRow = document.createElement("div");
  inputRow.style.cssText = "display:flex;gap:4px;align-items:center;flex-shrink:0;padding-top:4px;border-top:1px solid #0a0;";
  _termPromptEl = document.createElement("span");
  _termPromptEl.textContent = "C:\\> ";
  _termPromptEl.id = "ext-term-prompt";
  inputRow.appendChild(_termPromptEl);
  _termInputEl = document.createElement("input");
  _termInputEl.type = "text";
  _termInputEl.id = "ext-term-input";
  _termInputEl.style.cssText = "flex:1;background:transparent;border:none;color:#0f0;font-family:inherit;font-size:inherit;outline:none;padding:2px 0;";
  _termInputEl.addEventListener("keydown", function (e) {
    e.stopPropagation();
    if (e.key === "Enter") {
      var val = _termInputEl.value;
      _termOutput.textContent += _termPromptEl.textContent + val + "\n";
      _termOutput.scrollTop = _termOutput.scrollHeight;
      _termInputEl.value = "";
      if (_termInputResolve) {
        var r = _termInputResolve;
        _termInputResolve = null;
        r(val);
      } else {
        // Run as command if no input promise pending
        ext_terminalRunCommand(val);
        _termOutput.scrollTop = _termOutput.scrollHeight;
      }
    }
  });
  inputRow.appendChild(_termInputEl);
  _termOverlay.appendChild(inputRow);
  document.getElementById("stage-container").appendChild(_termOverlay);
  setTimeout(function () { _termInputEl.focus(); }, 50);
}
function ext_terminalPrint(text) {
  if (!_termOverlay) ext_terminalOpen();
  if (_termOutput) {
    _termOutput.textContent += text + "\n";
    _termOutput.scrollTop = _termOutput.scrollHeight;
  }
}
function ext_terminalInput(promptText) {
  return new Promise(function (res) {
    if (!_termOverlay) ext_terminalOpen();
    if (_termPromptEl) _termPromptEl.textContent = promptText;
    if (_termInputEl) { _termInputEl.value = ""; _termInputEl.focus(); }
    _termInputResolve = res;
  });
}
function ext_terminalClear() {
  if (_termOutput) _termOutput.textContent = "";
}
function ext_terminalClose() {
  if (_termOverlay) { _termOverlay.remove(); _termOverlay = null; _termOutput = null; _termPromptEl = null; _termInputEl = null; _termInputResolve = null; }
}
function ext_terminalRunCommand(cmd) {
  if (!_termOutput) return;
  var c = String(cmd).trim().toLowerCase();
  if (c === "dir") ext_terminalPrint(" Volume in drive C has no label\n Directory of C:\\\n\n <DIR> NESOS\n <DIR> SYSTEM");
  else if (c === "ver") ext_terminalPrint("NS-DOS Version 1.0");
  else if (c === "cls") ext_terminalClear();
  else if (c === "help") ext_terminalPrint("Commands: dir, ver, cls, help, echo, date, time");
  else if (c === "date") ext_terminalPrint(new Date().toLocaleDateString());
  else if (c === "time") ext_terminalPrint(new Date().toLocaleTimeString());
  else if (c.indexOf("echo ") === 0) ext_terminalPrint(String(cmd).substring(5));
  else if (c !== "") ext_terminalPrint("Bad command or file name");
}
function ext_terminalSetColor(col) {
  if (_termOutput) _termOutput.style.color = col;
  if (_termInputEl) _termInputEl.style.color = col;
  if (_termPromptEl) _termPromptEl.style.color = col;
}

// ==============================================================
//  BOOT
// ==============================================================
window.addEventListener("load", function () {
  stageCanvas = document.getElementById("stage");
  stageCtx = stageCanvas.getContext("2d");

  // Create pen overlay canvas
  _penCanvas = document.createElement("canvas");
  _penCanvas.width = STAGE_W;
  _penCanvas.height = STAGE_H;
  _penCtx = _penCanvas.getContext("2d");

  _initStageMouse();
  _initKeyHatRunner();
  initBlockly();
  _injectExtButton();
  _initInfoPanel();
  _initCostumeEditor();
  _initSoundEditor();
  _addBackgroundSprite();
  addSpriteFromLibrary("Cat", "assets/sprites/cat.png");
  _loadAuth();
  renderStage();
  setStatus("Ready. Click the green flag to run your scripts.");

  // Check if we were redirected from the community "Open in Editor" button
  if (new URLSearchParams(window.location.search).get("loadFromCommunity")) {
    var communityData = sessionStorage.getItem("fne_load_project");
    if (communityData) {
      sessionStorage.removeItem("fne_load_project");
      try {
        var data = JSON.parse(communityData);
        sprites = [];
        workspace.clear();
        activeSprite = null;
        if (data.camera) { cameraX = data.camera.x || 0; cameraY = data.camera.y || 0; }
        data.sprites.forEach(function (sd) {
          var sp = new Sprite(sd.name, sd.imgPath || null);
          sp.x = sd.x || 0; sp.y = sd.y || 0; sp.z = sd.z || 0;
          sp.dir = sd.dir || 90;
          sp.size = sd.size || 100;
          sp.visible = sd.visible !== false;
          sp.isStatic = sd.isStatic || false;
          sp.gravity = sd.gravity || 0;
          sp.vx = sd.vx || 0; sp.vy = sd.vy || 0;
          sp.objectType = sd.objectType || "sprite";
          sp.objectShape = sd.objectShape || null;
          sp.costumes = sd.costumes || [];
          sp.sounds = sd.sounds || [];
          sp.currentCostume = sd.currentCostume || 0;
          sp.scaleX = sd.scaleX !== undefined ? sd.scaleX : 100;
          sp.scaleY = sd.scaleY !== undefined ? sd.scaleY : 100;
          sp.scaleZ = sd.scaleZ !== undefined ? sd.scaleZ : 100;
          sp.draggable = sd.draggable !== undefined ? sd.draggable : true;
          sp.collideable = sd.collideable !== undefined ? sd.collideable : true;
          sp.isBackground = sd.isBackground || false;
          if (sp.isBackground) { sp.collideable = false; sp.draggable = false; }
          if (sp.objectShape) {
            var dims = OBJECT_DIMS[sp.objectShape] || { w: 40, h: 40 };
            sp._baseW = dims.w; sp._baseH = dims.h;
          }
          if (sp.costumes.length > 0 && sp.costumes[sp.currentCostume]) {
            var costumeData = sp.costumes[sp.currentCostume].dataURL;
            if (costumeData) {
              var cimg = new Image();
              cimg.onload = (function (spr, img2) {
                return function () {
                  spr.img = img2; spr.imgLoaded = true;
                  var w2 = img2.naturalWidth, h2 = img2.naturalHeight;
                  var maxD = Math.max(w2, h2, 1);
                  var fit2 = 80 / maxD;
                  spr._baseW = w2 * fit2; spr._baseH = h2 * fit2;
                };
              })(sp, cimg);
              cimg.src = costumeData;
            }
          } else if (sp.imgPath) {
            var pimg = new Image();
            pimg.onload = (function (spr, img3) {
              return function () {
                spr.img = img3; spr.imgLoaded = true;
                var w3 = img3.naturalWidth, h3 = img3.naturalHeight;
                var maxD = Math.max(w3, h3, 1);
                var fit3 = 80 / maxD;
                spr._baseW = w3 * fit3; spr._baseH = h3 * fit3;
              };
            })(sp, pimg);
            pimg.src = sp.imgPath;
          }
          sp._workspace = _cleanWorkspaceState(sd.blocks) || null;
          sprites.push(sp);
        });
        // Add Background sprite if missing (backward compatibility)
        if (!sprites.find(function (s) { return s.isBackground; })) _addBackgroundSprite();
        refreshSpriteList();
        if (sprites.length) selectSprite(0);
        setStatus("Project loaded from community.");

        // Autoplay support (from viewproject green flag / fullscreen)
        var autoplay = sessionStorage.getItem("fne_autoplay");
        if (autoplay) {
          sessionStorage.removeItem("fne_autoplay");
          setTimeout(function () { runScripts(); }, 300);
        }
        var goFull = sessionStorage.getItem("fne_fullscreen");
        if (goFull) {
          sessionStorage.removeItem("fne_fullscreen");
          setTimeout(function () { setStageMode("big"); }, 100);
        }
      } catch (ex) {
        alert("Failed to load community project: " + ex.message);
      }
    }
  }
});
