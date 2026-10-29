/* NetSite Alpha 1 component sprites — extends the existing editor without replacing its UI. */
(function () {
  "use strict";

  var TYPES = ["title", "header", "text", "subtext", "button", "input", "image", "divider", "box", "space", "dropdown", "progress", "iframe"];
  var LABELS = { title: "Title", header: "Header", text: "Text", subtext: "SubText", button: "Button", input: "Input", image: "Image", divider: "Divider", box: "Box", space: "Space", dropdown: "Dropdown", progress: "Progress Bar", iframe: "Iframe" };
  var FONTS = ["Arial", "Verdana", "Georgia", "Times New Roman", "Courier New", "Trebuchet MS", "Comic Sans MS", "Helvetica Neue", "Helvetica Neue Bold", "Helvetica Neue Condensed", "Helvetica Neue Light", "Segoe UI", "Segoe UI Bold", "Segoe UI Light", "Black Boys on Mopeds"];
  var FONT_ASSETS = ["HelveticaNeue-Regular.ttf", "Helvetica Neu Bold.ttf", "HelveticaNeue-CondensedBold.ttf", "HelveticaNeue-Light.ttf", "SegoeUI-Regular.ttf", "SegoeUI-Bold.ttf", "SegoeUI-Light.ttf", "BLACKBOYSONMOPEDS.ttf"];
  var COLORS = ["#000000", "#333333", "#666666", "#ffffff", "#cc181e", "#ef6c35", "#f2c744", "#4da64d", "#1683d8", "#315d92", "#6f42c1", "#d63384"];
  var state = loadState();
  var selectedId = null;
  var testMode = false;
  var actionRun = 0;
  var drag = null;
  var pageEl = null;
  var stageContainer = null;
  var stylerEl = null;
  var scriptOwnerId = "__global";

  function id(prefix) { return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function number(value, fallback) { var n = Number(value); return isFinite(n) ? n : fallback; }
  function emptyWorkspaceState() { return { blocks: { languageVersion: 0, blocks: [] } }; }
  function partitionWorkspaceBySprite(workspaceState) { var result = { __global: emptyWorkspaceState() }; var serialized = workspaceState && workspaceState.blocks; var tops = serialized && Array.isArray(serialized.blocks) ? serialized.blocks : []; tops.forEach(function (block) { var owner = block.type === "netsite_when_sprite_clicked" && block.fields && block.fields.SPRITE ? block.fields.SPRITE : "__global"; if (!result[owner]) result[owner] = emptyWorkspaceState(); result[owner].blocks.blocks.push(block); }); return result; }
  function blankState() { var pageId = id("page"); return { activePage: pageId, pages: [{ id: pageId, name: "Page 1", background: "", backgroundColor: "#ffffff", sprites: [] }], spriteScripts: { __global: emptyWorkspaceState() }, blocks: null }; }
  function normalizeState(saved) { if (!saved.spriteScripts) saved.spriteScripts = partitionWorkspaceBySprite(saved.blocks); if (!saved.spriteScripts.__global) saved.spriteScripts.__global = emptyWorkspaceState(); return saved; }
  function loadState() { try { var saved = JSON.parse(localStorage.getItem("netsite_components_alpha1") || "null"); if (saved && saved.pages && saved.pages.length) return normalizeState(saved); } catch (error) {} return blankState(); }
  function saveCurrentScriptWorkspace() { if (!window.workspace) return; if (!state.spriteScripts) state.spriteScripts = { __global: emptyWorkspaceState() }; state.spriteScripts[scriptOwnerId] = Blockly.serialization.workspaces.save(workspace); }
  function saveState() { try { saveCurrentScriptWorkspace(); localStorage.setItem("netsite_components_alpha1", JSON.stringify(state)); } catch (error) {} }
  function switchScriptOwner(ownerId) { ownerId = ownerId || "__global"; if (!window.workspace || ownerId === scriptOwnerId) return; saveCurrentScriptWorkspace(); scriptOwnerId = ownerId; Blockly.Events.disable(); try { workspace.clear(); var saved = state.spriteScripts && state.spriteScripts[ownerId]; if (saved) Blockly.serialization.workspaces.load(saved, workspace); } finally { Blockly.Events.enable(); } setTimeout(function () { Blockly.svgResize(workspace); }, 0); }
  function currentPage() { return state.pages.find(function (page) { return page.id === state.activePage; }) || state.pages[0]; }
  function selected() { return currentPage().sprites.find(function (sprite) { return sprite.id === selectedId; }) || null; }
  function spriteOptions(iframeOnly) {
    var sprites = currentPage().sprites.filter(function (sprite) { return !iframeOnly || sprite.type === "iframe"; });
    sprites.sort(function (a, b) { if (a.id === scriptOwnerId) return -1; if (b.id === scriptOwnerId) return 1; return 0; });
    var choices = sprites.map(function (sprite, index) { return [sprite.name + " [" + (index + 1) + "]", sprite.id]; });
    return choices.length ? choices : [[iframeOnly ? "No iframes" : "No elements", ""]];
  }
  function pageOptions() { return state.pages.map(function (page) { return [page.name, page.id]; }); }

  function statement(block, colour) { block.setPreviousStatement(true); block.setNextStatement(true); block.setColour(colour); }
  function defineBlocks() {
    if (Blockly.Blocks.netsite_when_sprite_clicked) return;
    Blockly.Blocks.netsite_when_test = { init: function () { this.appendDummyInput().appendField("when Test Actions is clicked"); this.setNextStatement(true); this.setColour("#c88330"); }};
    Blockly.Blocks.netsite_when_sprite_clicked = { init: function () { this.appendDummyInput().appendField("when").appendField(new Blockly.FieldDropdown(function () { return spriteOptions(false); }), "SPRITE").appendField("is clicked"); this.setNextStatement(true); this.setColour("#c88330"); }};
    Blockly.Blocks.netsite_action_show = { init: function () { this.appendDummyInput().appendField("show element").appendField(new Blockly.FieldDropdown(function () { return spriteOptions(false); }), "TARGET"); statement(this, "#55a45d"); }};
    Blockly.Blocks.netsite_action_hide = { init: function () { this.appendDummyInput().appendField("hide element").appendField(new Blockly.FieldDropdown(function () { return spriteOptions(false); }), "TARGET"); statement(this, "#55a45d"); }};
    Blockly.Blocks.netsite_action_toggle = { init: function () { this.appendDummyInput().appendField("toggle element").appendField(new Blockly.FieldDropdown(function () { return spriteOptions(false); }), "TARGET"); statement(this, "#55a45d"); }};
    Blockly.Blocks.netsite_action_page = { init: function () { this.appendDummyInput().appendField("go to page").appendField(new Blockly.FieldDropdown(function () { return pageOptions(); }), "PAGE"); statement(this, "#55a45d"); }};
    Blockly.Blocks.netsite_iframe_url = { init: function () { this.appendDummyInput().appendField("set iframe").appendField(new Blockly.FieldDropdown(function () { return spriteOptions(true); }), "TARGET"); this.appendDummyInput().appendField("URL").appendField(new Blockly.FieldTextInput("https://example.com"), "URL"); statement(this, "#7256a8"); }};
    Blockly.Blocks.netsite_iframe_show = { init: function () { this.appendDummyInput().appendField("show iframe").appendField(new Blockly.FieldDropdown(function () { return spriteOptions(true); }), "TARGET"); statement(this, "#7256a8"); }};
    Blockly.Blocks.netsite_iframe_hide = { init: function () { this.appendDummyInput().appendField("hide iframe").appendField(new Blockly.FieldDropdown(function () { return spriteOptions(true); }), "TARGET"); statement(this, "#7256a8"); }};
  }

  defineBlocks();
  var toolbox = document.getElementById("toolbox");
  if (toolbox) toolbox.innerHTML =
    '<category name="JavaScript" colour="#55a45d" data-netsite="true"><sep gap="150"></sep>' +
      '<label text="Events"></label><block type="netsite_when_test"></block><block type="netsite_when_sprite_clicked"></block>' +
      '<label text="Element actions"></label><block type="netsite_action_show"></block><block type="netsite_action_hide"></block><block type="netsite_action_toggle"></block><block type="netsite_action_page"></block>' +
      '<label text="Control"></label>' +
      '<block type="scratch_wait"><value name="SECS"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>' +
      '<block type="scratch_repeat"><value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>' +
      '<block type="scratch_if"></block><block type="scratch_if_else"></block>' +
      '<label text="Looks"></label>' +
      '<block type="scratch_say"><value name="MSG"><shadow type="text"><field name="TEXT">Hello!</field></shadow></value></block>' +
      '<block type="scratch_say_for"><value name="MSG"><shadow type="text"><field name="TEXT">Hello!</field></shadow></value><value name="SECS"><shadow type="math_number"><field name="NUM">2</field></shadow></value></block>' +
      '<label text="Values and math"></label><block type="math_number"><field name="NUM">0</field></block><block type="text"><field name="TEXT">text</field></block><block type="logic_boolean"></block><block type="logic_compare"></block><block type="math_arithmetic"></block>' +
      '<label text="Console"></label><block type="scratch_log"></block><block type="scratch_log_value"></block>' +
    '</category>' +
    '<category name="Iframe" colour="#7256a8" data-netsite="true"><sep gap="150"></sep><block type="netsite_iframe_url"></block><block type="netsite_iframe_show"></block><block type="netsite_iframe_hide"></block></category>';
  window._injectExtButton = function () {};

  function makeSprite(type) {
    var count = currentPage().sprites.length;
    var typeNumber = currentPage().sprites.filter(function (sprite) { return sprite.type === type; }).length + 1;
    var sprite = { id: id("sprite"), type: type, name: LABELS[type] + " " + typeNumber, x: 28 + (count % 4) * 22, y: 35 + count * 62, width: 260, height: 48, content: LABELS[type], font: "Arial", size: 16, color: "#222222", background: "transparent", gradient: false, gradient2: "#1683d8", direction: "to right", hidden: false, url: "", value: 50 };
    if (type === "title") { sprite.content = "Website Title"; sprite.size = 38; sprite.width = 390; sprite.height = 62; }
    if (type === "header") { sprite.content = "Section Header"; sprite.size = 27; sprite.width = 340; sprite.height = 52; }
    if (type === "text") { sprite.content = "Write your text here."; sprite.width = 380; }
    if (type === "subtext") { sprite.content = "Add more information here."; sprite.size = 13; sprite.color = "#666666"; sprite.width = 350; }
    if (type === "button") { sprite.content = "Button"; sprite.width = 110; sprite.height = 32; }
    if (type === "input") { sprite.content = "Type here..."; sprite.width = 260; sprite.height = 32; }
    if (type === "image") { sprite.content = "Image"; sprite.url = "https://placehold.co/400x220"; sprite.width = 400; sprite.height = 220; }
    if (type === "divider") { sprite.width = 380; sprite.height = 2; sprite.background = "#999999"; }
    if (type === "box") { sprite.content = "Box"; sprite.width = 300; sprite.height = 160; sprite.background = "#eeeeee"; }
    if (type === "space") { sprite.content = "Space"; sprite.width = 260; sprite.height = 70; }
    if (type === "dropdown") { sprite.content = "Option 1\nOption 2\nOption 3"; sprite.width = 200; sprite.height = 32; }
    if (type === "progress") { sprite.content = "Progress"; sprite.width = 280; sprite.height = 22; }
    if (type === "iframe") { sprite.content = "Iframe"; sprite.url = "https://example.com"; sprite.width = 420; sprite.height = 260; }
    return sprite;
  }

  function inner(sprite) {
    if (sprite.type === "title") return '<h1>' + esc(sprite.content) + '</h1>';
    if (sprite.type === "header") return '<h2>' + esc(sprite.content) + '</h2>';
    if (sprite.type === "text") return '<p>' + esc(sprite.content) + '</p>';
    if (sprite.type === "subtext") return '<small>' + esc(sprite.content) + '</small>';
    if (sprite.type === "button") return '<button type="button" class="default win7-button">' + esc(sprite.content) + '</button>';
    if (sprite.type === "input") return '<input type="text" placeholder="' + esc(sprite.content) + '">';
    if (sprite.type === "image") return '<img src="' + esc(sprite.url) + '" alt="' + esc(sprite.content) + '">';
    if (sprite.type === "divider") return '<hr>';
    if (sprite.type === "box") return '<div class="component-box">' + esc(sprite.content) + '</div>';
    if (sprite.type === "space") return '<div class="component-space">Space</div>';
    if (sprite.type === "dropdown") return '<select>' + String(sprite.content).split(/\r?\n/).map(function (option) { return '<option>' + esc(option) + '</option>'; }).join("") + '</select>';
    if (sprite.type === "progress") return '<div class="component-progress"><div style="width:' + Math.max(0, Math.min(100, number(sprite.value, 50))) + '%"></div></div>';
    if (sprite.type === "iframe") return '<iframe src="' + esc(sprite.url) + '" title="Iframe"></iframe><span class="iframe-shield"></span>';
    return "";
  }

  function renderPageTabs() {
    var tabs = document.getElementById("component-page-tabs"); if (!tabs) return;
    tabs.innerHTML = state.pages.map(function (page) { var active = page.id === state.activePage; return '<span class="page-tab-wrap"><button type="button" role="tab" aria-selected="' + active + '" class="' + (active ? "active" : "") + '" data-page="' + page.id + '">' + esc(page.name) + '</button><button type="button" class="delete-page" data-delete-page="' + page.id + '" title="Delete ' + esc(page.name) + '" aria-label="Delete ' + esc(page.name) + '">×</button></span>'; }).join("") + '<button type="button" class="add-page" data-add-page title="Add page" aria-label="Add page">+</button>';
  }
  function pageHeight() {
    var height = Math.max(360, stageContainer ? stageContainer.clientHeight : 360);
    currentPage().sprites.forEach(function (sprite) {
      height = Math.max(height, number(sprite.y, 0) + number(sprite.height, 0) + 48);
    });
    return Math.ceil(height);
  }
  function renderPage() {
    if (!pageEl) return;
    var page = currentPage();
    pageEl.style.height = pageHeight() + "px"; pageEl.style.backgroundColor = page.backgroundColor;
    pageEl.style.setProperty("background-image", page.background ? 'url("' + page.background.replace(/"/g, "") + '")' : "none", "important");
    pageEl.innerHTML = page.sprites.map(function (sprite) {
      var bg = sprite.gradient ? "linear-gradient(" + sprite.direction + "," + sprite.background + "," + sprite.gradient2 + ")" : sprite.background;
      var buttonColor = sprite.background === "transparent" ? "#d7d7d7" : sprite.background;
      var buttonFill = sprite.gradient ? "linear-gradient(" + sprite.direction + "," + buttonColor + "," + sprite.gradient2 + ")" : "linear-gradient(color-mix(in srgb," + buttonColor + " 38%,white)," + buttonColor + ")";
      var containerBg = sprite.type === "button" ? "transparent" : bg;
      return '<div class="website-sprite' + (sprite.id === selectedId ? " selected" : "") + (sprite.hidden ? " hidden" : "") + (testMode ? " testing" : "") + '" data-sprite="' + sprite.id + '" style="left:' + sprite.x + "px;top:" + sprite.y + "px;width:" + sprite.width + "px;height:" + sprite.height + "px;font-family:'" + esc(sprite.font) + "',sans-serif;font-size:" + sprite.size + "px;color:" + sprite.color + ";background:" + containerBg + ";--button-fill:" + buttonFill + ';"><b class="sprite-tag">' + esc(sprite.name) + '</b>' + inner(sprite) + (sprite.speech != null ? '<span class="sprite-speech">' + esc(sprite.speech) + '</span>' : '') + '</div>';
    }).join("");
  }
  function renderSpriteList() {
    var list = document.getElementById("sprite-list"); if (!list) return;
    list.innerHTML = currentPage().sprites.map(function (sprite) { return '<div class="component-sprite-item' + (sprite.id === selectedId ? " active" : "") + '" data-select="' + sprite.id + '" role="button" tabindex="0"><span class="component-sprite-summary"><strong>' + esc(sprite.name) + '</strong><small>' + sprite.type + ' · x ' + sprite.x + ' y ' + sprite.y + '</small></span><button type="button" class="delete-sprite" data-delete-sprite="' + sprite.id + '" title="Delete ' + esc(sprite.name) + '" aria-label="Delete ' + esc(sprite.name) + '">×</button></div>'; }).join("") || '<p class="component-empty">Click + Element to add a website element.</p>';
  }

  function palette(field) { return '<div class="component-palette">' + COLORS.map(function (color) { return '<button type="button" data-palette="' + field + '" data-color="' + color + '" title="' + color + '" style="background:' + color + '"></button>'; }).join("") + '</div>'; }
  function row(label, field, value, type) { return '<label class="styler-row"><span>' + label + '</span><input data-field="' + field + '" type="' + (type || "text") + '" value="' + esc(value) + '"></label>'; }
  function renderStyler() {
    if (!stylerEl) return; var sprite = selected();
    if (!sprite) { stylerEl.innerHTML = '<p class="component-empty">Select an element to style it.</p>'; return; }
    stylerEl.innerHTML = '<h3>Styler · ' + esc(sprite.name) + '</h3>' + row("Name", "name", sprite.name) + (sprite.type !== "divider" && sprite.type !== "progress" ? row(sprite.type === "input" ? "Placeholder" : "Content", "content", sprite.content) : "") + row("X", "x", sprite.x, "number") + row("Y", "y", sprite.y, "number") + row("Width", "width", sprite.width, "number") + row("Height", "height", sprite.height, "number") + '<label class="styler-row"><span>Font</span><select data-field="font">' + FONTS.map(function (font) { return '<option' + (font === sprite.font ? " selected" : "") + '>' + font + '</option>'; }).join("") + '</select></label>' + row("Size", "size", sprite.size, "number") + row("Text", "color", sprite.color, "color") + palette("color") + row("Background", "background", sprite.background === "transparent" ? "#ffffff" : sprite.background, "color") + palette("background") + '<label class="styler-check"><input data-field="gradient" type="checkbox"' + (sprite.gradient ? " checked" : "") + '> Gradient</label>' + row("Gradient 2", "gradient2", sprite.gradient2, "color") + '<label class="styler-row"><span>Direction</span><select data-field="direction"><option>to right</option><option>to bottom</option><option>135deg</option><option>45deg</option></select></label>' + (sprite.type === "image" || sprite.type === "iframe" ? row("URL", "url", sprite.url, "url") : "") + (sprite.type === "progress" ? row("Progress", "value", sprite.value, "number") : "") + '<div class="styler-actions"><button type="button" data-hide>' + (sprite.hidden ? "Show" : "Hide") + '</button><button type="button" data-delete>Delete</button></div>';
  }
  function renderAll() { renderPageTabs(); renderPage(); renderSpriteList(); renderStyler(); saveState(); }

  function addSprite(type) { var sprite = makeSprite(type); currentPage().sprites.push(sprite); selectedId = sprite.id; switchScriptOwner(sprite.id); closePicker(); renderAll(); showTab("costumes"); }
  function deleteSprite(spriteId) { currentPage().sprites = currentPage().sprites.filter(function (sprite) { return sprite.id !== spriteId; }); if (state.spriteScripts) delete state.spriteScripts[spriteId]; if (selectedId === spriteId) { selectedId = null; switchScriptOwner("__global"); } renderAll(); }
  function deletePage(pageId) { var index = state.pages.findIndex(function (page) { return page.id === pageId; }); if (index < 0) return; state.pages[index].sprites.forEach(function (sprite) { if (state.spriteScripts) delete state.spriteScripts[sprite.id]; }); state.pages.splice(index, 1); if (!state.pages.length) { var fresh = blankState(); state.pages = fresh.pages; state.activePage = fresh.activePage; } else if (state.activePage === pageId) state.activePage = state.pages[Math.max(0, index - 1)].id; selectedId = null; switchScriptOwner("__global"); renderAll(); }
  function openPicker() { var overlay = document.getElementById("sprite-picker-overlay"); overlay.classList.add("open", "component-picker-open"); overlay.setAttribute("aria-hidden", "false"); }
  function closePicker() { var overlay = document.getElementById("sprite-picker-overlay"); overlay.classList.remove("open", "component-picker-open"); overlay.setAttribute("aria-hidden", "true"); }

  function inputValue(block, name, fallback) {
    var child = block && block.getInputTargetBlock(name);
    return child ? valueOf(child) : fallback;
  }

  function valueOf(block) {
    if (!block) return 0;
    if (block.type === "math_number") return number(block.getFieldValue("NUM"), 0);
    if (block.type === "text") return block.getFieldValue("TEXT") || "";
    if (block.type === "logic_boolean") return block.getFieldValue("BOOL") === "TRUE";
    if (block.type === "logic_compare") {
      var left = inputValue(block, "A", 0); var right = inputValue(block, "B", 0);
      var comparison = block.getFieldValue("OP");
      if (comparison === "EQ") return left == right;
      if (comparison === "NEQ") return left != right;
      if (comparison === "LT") return left < right;
      if (comparison === "LTE") return left <= right;
      if (comparison === "GT") return left > right;
      if (comparison === "GTE") return left >= right;
    }
    if (block.type === "math_arithmetic") {
      var a = number(inputValue(block, "A", 0), 0); var b = number(inputValue(block, "B", 0), 0);
      var operation = block.getFieldValue("OP");
      if (operation === "ADD") return a + b;
      if (operation === "MINUS") return a - b;
      if (operation === "MULTIPLY") return a * b;
      if (operation === "DIVIDE") return b === 0 ? 0 : a / b;
      if (operation === "POWER") return Math.pow(a, b);
    }
    return 0;
  }

  function pause(seconds) {
    return new Promise(function (resolve) { setTimeout(resolve, Math.max(0, Math.min(60, number(seconds, 0))) * 1000); });
  }

  async function executeStack(block, runId, speakerId) {
    var safety = 0;
    while (block && safety++ < 500 && runId === actionRun) {
      var changed = false;
      if (block.type === "scratch_wait") await pause(inputValue(block, "SECS", 1));
      if (block.type === "scratch_repeat") {
        var times = Math.max(0, Math.min(1000, Math.floor(number(inputValue(block, "TIMES", 10), 10))));
        for (var i = 0; i < times && runId === actionRun; i++) await executeStack(block.getInputTargetBlock("DO"), runId, speakerId);
      }
      if (block.type === "scratch_if" && valueOf(block.getInputTargetBlock("COND"))) await executeStack(block.getInputTargetBlock("DO"), runId, speakerId);
      if (block.type === "scratch_if_else") {
        var branch = valueOf(block.getInputTargetBlock("COND")) ? "DO" : "ELSE";
        await executeStack(block.getInputTargetBlock(branch), runId, speakerId);
      }
      if (block.type === "scratch_log") console.log(block.getFieldValue("MSG") || "");
      if (block.type === "scratch_log_value") console.log(valueOf(block.getInputTargetBlock("VAL")));
      var speaker = currentPage().sprites.find(function (sprite) { return sprite.id === speakerId; });
      if (block.type === "scratch_say" && speaker) { speaker.speech = String(inputValue(block, "MSG", "Hello!")); changed = true; }
      if (block.type === "scratch_say_for" && speaker) {
        speaker.speech = String(inputValue(block, "MSG", "Hello!")); renderAll();
        await pause(inputValue(block, "SECS", 2));
        if (runId === actionRun) { speaker.speech = null; renderAll(); }
      }
      var target = currentPage().sprites.find(function (sprite) { return sprite.id === block.getFieldValue("TARGET"); });
      if (block.type === "netsite_action_show" && target) { target.hidden = false; changed = true; }
      if (block.type === "netsite_action_hide" && target) { target.hidden = true; changed = true; }
      if (block.type === "netsite_action_toggle" && target) { target.hidden = !target.hidden; changed = true; }
      if (block.type === "netsite_iframe_url" && target) { target.url = block.getFieldValue("URL") || "about:blank"; changed = true; }
      if (block.type === "netsite_iframe_show" && target) { target.hidden = false; changed = true; }
      if (block.type === "netsite_iframe_hide" && target) { target.hidden = true; changed = true; }
      if (block.type === "netsite_action_page") {
        var pageId = block.getFieldValue("PAGE");
        if (state.pages.some(function (page) { return page.id === pageId; })) { state.activePage = pageId; selectedId = null; changed = true; }
      }
      if (changed) renderAll();
      block = block.getNextBlock();
    }
  }

  async function runActions(triggerId) {
    if (!window.workspace) return;
    switchScriptOwner(triggerId);
    var runId = actionRun;
    var hats = workspace.getTopBlocks(true).filter(function (block) {
      return block.type === "netsite_when_sprite_clicked" && block.getFieldValue("SPRITE") === triggerId;
    });
    for (var i = 0; i < hats.length; i++) await executeStack(hats[i].getNextBlock(), runId, triggerId);
    renderAll();
  }

  function isRunnableJavaScript(block) {
    return block.type.indexOf("netsite_action_") === 0 || block.type.indexOf("netsite_iframe_") === 0 || ["scratch_wait", "scratch_repeat", "scratch_if", "scratch_if_else", "scratch_say", "scratch_say_for", "scratch_log", "scratch_log_value"].indexOf(block.type) !== -1;
  }

  async function runTestActions(runId) {
    if (!window.workspace) return;
    var blocks = workspace.getTopBlocks(true);
    for (var i = 0; i < blocks.length && runId === actionRun; i++) {
      if (blocks[i].type === "netsite_when_test") await executeStack(blocks[i].getNextBlock(), runId);
      else if (isRunnableJavaScript(blocks[i])) await executeStack(blocks[i], runId);
    }
    renderAll();
  }

  function safeFolderName(value) {
    var cleaned = String(value || "PLACEHOLDER").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").trim();
    return cleaned || "PLACEHOLDER";
  }

  async function writeFile(directory, name, contents) {
    var handle = await directory.getFileHandle(name, { create: true });
    var writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  function imageExtension(dataUrl) {
    var match = String(dataUrl || "").match(/^data:image\/(png|jpe?g|gif|webp|bmp)/i);
    if (!match) return "png";
    return match[1].toLowerCase().replace("jpeg", "jpg");
  }

  function dataUrlBlob(dataUrl) {
    var parts = String(dataUrl || "").split(",");
    if (parts.length < 2) throw new Error("Invalid image data");
    var header = parts.shift();
    var mime = (header.match(/^data:([^;]+)/i) || [null, "application/octet-stream"])[1];
    var bytes;
    if (/;base64/i.test(header)) {
      var binary = atob(parts.join(","));
      bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } else {
      var decoded = decodeURIComponent(parts.join(","));
      bytes = new TextEncoder().encode(decoded);
    }
    return new Blob([bytes], { type: mime });
  }

  async function saveDataImage(directory, filename, dataUrl) {
    await writeFile(directory, filename, dataUrlBlob(dataUrl));
  }

  async function saveBundledFonts(directory) {
    var skipped = [];
    for (var i = 0; i < FONT_ASSETS.length; i++) {
      var filename = FONT_ASSETS[i];
      try {
        var response = await fetch(new URL("assets/fonts/" + filename, document.baseURI).href);
        if (!response.ok) throw new Error("HTTP " + response.status);
        await writeFile(directory, filename, await response.blob());
      } catch (error) {
        skipped.push(filename);
      }
    }
    if (skipped.length) await writeFile(directory, "README.txt", "NetSite was opened locally, so the browser could not copy these bundled fonts:\n" + skipped.join("\n") + "\nThe exported website will use installed system-font fallbacks. Open NetSite through localhost to include these font files automatically.\n");
    return skipped;
  }

  function exportedSpriteInner(sprite, imageFiles) {
    if (sprite.type === "title") return '<h1>' + esc(sprite.content) + '</h1>';
    if (sprite.type === "header") return '<h2>' + esc(sprite.content) + '</h2>';
    if (sprite.type === "text") return '<p>' + esc(sprite.content) + '</p>';
    if (sprite.type === "subtext") return '<small>' + esc(sprite.content) + '</small>';
    if (sprite.type === "button") return '<button type="button" class="win7-button">' + esc(sprite.content) + '</button>';
    if (sprite.type === "input") return '<input type="text" placeholder="' + esc(sprite.content) + '">';
    if (sprite.type === "image") {
      var imageSource = /^data:image\//i.test(sprite.url || "") ? sprite.url : (imageFiles[sprite.id] || sprite.url);
      return '<img src="' + esc(imageSource) + '" alt="' + esc(sprite.content) + '">';
    }
    if (sprite.type === "divider") return '<hr>';
    if (sprite.type === "box") return '<div class="component-box">' + esc(sprite.content) + '</div>';
    if (sprite.type === "space") return '<div class="component-space" aria-hidden="true"></div>';
    if (sprite.type === "dropdown") return '<select>' + String(sprite.content).split(/\r?\n/).map(function (option) { return '<option>' + esc(option) + '</option>'; }).join("") + '</select>';
    if (sprite.type === "progress") return '<div class="component-progress"><div style="width:' + Math.max(0, Math.min(100, number(sprite.value, 50))) + '%"></div></div>';
    if (sprite.type === "iframe") return '<iframe src="' + esc(sprite.url) + '" title="' + esc(sprite.name) + '"></iframe>';
    return "";
  }

  function exportedPageHeight(page) {
    var height = 360;
    page.sprites.forEach(function (sprite) { height = Math.max(height, number(sprite.y, 0) + number(sprite.height, 0) + 48); });
    return Math.ceil(height);
  }

  function serializeActionBlock(block, seen) {
    if (!block || seen[block.id]) return null;
    seen[block.id] = true;
    var fields = {};
    ["TARGET", "URL", "PAGE", "SPRITE", "MSG", "NUM", "TEXT", "BOOL", "OP"].forEach(function (name) {
      var value = block.getFieldValue(name);
      if (value !== null && value !== undefined) fields[name] = value;
    });
    var inputs = {};
    block.inputList.forEach(function (input) {
      if (!input.name || !input.connection) return;
      var child = input.connection.targetBlock();
      if (child) inputs[input.name] = serializeActionBlock(child, seen);
    });
    return { type: block.type, fields: fields, inputs: inputs, next: serializeActionBlock(block.getNextBlock(), seen) };
  }

  function serializeActionProgram() {
    saveCurrentScriptWorkspace(); var program = [];
    Object.keys(state.spriteScripts || {}).forEach(function (owner) { var savedWorkspace = state.spriteScripts[owner]; var tops = savedWorkspace && savedWorkspace.blocks && savedWorkspace.blocks.blocks; (tops || []).forEach(function (block) { var serialized = serializeSavedActionBlock(block); if (serialized) program.push(serialized); }); });
    return program;
  }
  function serializeSavedActionBlock(block) { if (!block) return null; var inputs = {}; Object.keys(block.inputs || {}).forEach(function (name) { var connection = block.inputs[name] || {}; var child = connection.block || connection.shadow; if (child) inputs[name] = serializeSavedActionBlock(child); }); return { type: block.type, fields: block.fields || {}, inputs: inputs, next: serializeSavedActionBlock(block.next && block.next.block) }; }

  function exportedActionRuntime() {
    var program = JSON.stringify(serializeActionProgram());
    return '(function(){"use strict";var program=' + program + ';' +
      'function switchPage(id){document.querySelectorAll(".site-page").forEach(function(page){page.hidden=page.dataset.page!==id});document.querySelectorAll("[data-page-target]").forEach(function(tab){tab.classList.toggle("active",tab.dataset.pageTarget===id)})}' +
      'function spriteElement(id){var list=document.querySelectorAll("[data-sprite]");for(var i=0;i<list.length;i++)if(list[i].dataset.sprite===id)return list[i];return null}' +
      'function input(block,name,fallback){return block&&block.inputs&&block.inputs[name]?value(block.inputs[name]):fallback}' +
      'function value(block){if(!block)return 0;var f=block.fields||{};if(block.type==="math_number")return Number(f.NUM)||0;if(block.type==="text")return f.TEXT||"";if(block.type==="logic_boolean")return f.BOOL==="TRUE";if(block.type==="logic_compare"){var l=input(block,"A",0),r=input(block,"B",0);if(f.OP==="EQ")return l==r;if(f.OP==="NEQ")return l!=r;if(f.OP==="LT")return l<r;if(f.OP==="LTE")return l<=r;if(f.OP==="GT")return l>r;if(f.OP==="GTE")return l>=r}if(block.type==="math_arithmetic"){var a=Number(input(block,"A",0))||0,b=Number(input(block,"B",0))||0;if(f.OP==="ADD")return a+b;if(f.OP==="MINUS")return a-b;if(f.OP==="MULTIPLY")return a*b;if(f.OP==="DIVIDE")return b===0?0:a/b;if(f.OP==="POWER")return Math.pow(a,b)}return 0}' +
      'function wait(seconds){return new Promise(function(resolve){setTimeout(resolve,Math.max(0,Math.min(60,Number(seconds)||0))*1000)})}' +
      'function setSpeech(id,message){var el=spriteElement(id);if(!el)return;var bubble=el.querySelector(".sprite-speech");if(!bubble){bubble=document.createElement("span");bubble.className="sprite-speech";el.appendChild(bubble)}bubble.textContent=String(message)}' +
      'function clearSpeech(id){var el=spriteElement(id),bubble=el&&el.querySelector(".sprite-speech");if(bubble)bubble.remove()}' +
      'async function run(block,speakerId){var guard=0;while(block&&guard++<500){var f=block.fields||{},el;if(block.type==="scratch_wait")await wait(input(block,"SECS",1));else if(block.type==="scratch_repeat"){var times=Math.max(0,Math.min(1000,Math.floor(Number(input(block,"TIMES",10))||0)));for(var i=0;i<times;i++)await run(block.inputs&&block.inputs.DO,speakerId)}else if(block.type==="scratch_if"){if(value(block.inputs&&block.inputs.COND))await run(block.inputs&&block.inputs.DO,speakerId)}else if(block.type==="scratch_if_else"){await run(value(block.inputs&&block.inputs.COND)?block.inputs&&block.inputs.DO:block.inputs&&block.inputs.ELSE,speakerId)}else if(block.type==="scratch_say")setSpeech(speakerId,input(block,"MSG","Hello!"));else if(block.type==="scratch_say_for"){setSpeech(speakerId,input(block,"MSG","Hello!"));await wait(input(block,"SECS",2));clearSpeech(speakerId)}else if(block.type==="scratch_log")console.log(f.MSG||"");else if(block.type==="scratch_log_value")console.log(input(block,"VAL",""));else if(block.type==="netsite_action_show"){el=spriteElement(f.TARGET);if(el)el.style.display=""}else if(block.type==="netsite_action_hide"){el=spriteElement(f.TARGET);if(el)el.style.display="none"}else if(block.type==="netsite_action_toggle"){el=spriteElement(f.TARGET);if(el)el.style.display=el.style.display==="none"?"":"none"}else if(block.type==="netsite_action_page")switchPage(f.PAGE);else if(block.type==="netsite_iframe_url"){el=spriteElement(f.TARGET);if(el&&el.querySelector("iframe"))el.querySelector("iframe").src=f.URL||"about:blank"}else if(block.type==="netsite_iframe_show"){el=spriteElement(f.TARGET);if(el)el.style.display=""}else if(block.type==="netsite_iframe_hide"){el=spriteElement(f.TARGET);if(el)el.style.display="none"}block=block.next}}' +
      'async function runClick(id){for(var i=0;i<program.length;i++)if(program[i].type==="netsite_when_sprite_clicked"&&program[i].fields.SPRITE===id)await run(program[i].next,id)}' +
      'document.addEventListener("click",function(event){var nav=event.target.closest("[data-page-target]");if(nav){switchPage(nav.dataset.pageTarget);return}var sprite=event.target.closest("[data-sprite]");if(sprite)runClick(sprite.dataset.sprite)});' +
      'async function boot(){for(var i=0;i<program.length;i++){var block=program[i];if(block.type==="netsite_when_test")await run(block.next);else if(block.type!=="netsite_when_sprite_clicked")await run(block)}}' +
      'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();})();\n';
  }

  function buildWebsiteFiles(backgroundFiles, imageFiles, projectName) {
    var pageMarkup = state.pages.map(function (page, pageIndex) {
      var sprites = page.sprites.map(function (sprite) {
        var background = sprite.background === "transparent" ? "transparent" : sprite.background;
        var fill = sprite.gradient ? "linear-gradient(" + sprite.direction + "," + background + "," + sprite.gradient2 + ")" : background;
        var outerBackground = sprite.type === "button" ? "transparent" : fill;
        var exportedButtonColor = background === "transparent" ? "#d7d7d7" : background;
        var exportedButtonFill = sprite.gradient ? "linear-gradient(" + sprite.direction + "," + exportedButtonColor + "," + sprite.gradient2 + ")" : "linear-gradient(color-mix(in srgb," + exportedButtonColor + " 38%,white)," + exportedButtonColor + ")";
        var inner = exportedSpriteInner(sprite, imageFiles);
        if (sprite.type === "button") inner = inner.replace('class="win7-button"', 'class="win7-button" style="--button-fill:' + exportedButtonFill + '"');
        return '<div class="site-sprite site-' + esc(sprite.type) + '" data-sprite="' + esc(sprite.id) + '" style="left:' + number(sprite.x, 0) + 'px;top:' + number(sprite.y, 0) + 'px;width:' + number(sprite.width, 100) + 'px;height:' + number(sprite.height, 30) + 'px;font-family:&quot;' + esc(sprite.font) + '&quot;,sans-serif;font-size:' + number(sprite.size, 16) + 'px;color:' + esc(sprite.color) + ';background:' + outerBackground + ';' + (sprite.hidden ? "display:none;" : "") + '">' + inner + (sprite.speech != null ? '<span class="sprite-speech">' + esc(sprite.speech) + '</span>' : '') + '</div>';
      }).join("");
      /* Keep uploaded assets inline as well as in /images so index.html also works when opened directly from the ZIP. */
      var exportedBackground = page.background || backgroundFiles[page.id] || "";
      return '<main class="site-page" data-page="' + esc(page.id) + '" style="min-height:' + exportedPageHeight(page) + 'px;background-color:' + esc(page.backgroundColor || "#fff") + ';' + (exportedBackground ? 'background-image:url(&quot;' + esc(exportedBackground) + '&quot;);' : "") + '"' + (pageIndex ? " hidden" : "") + '>' + sprites + '</main>';
    }).join("");
    var navigation = state.pages.length > 1 ? '<nav class="site-pages">' + state.pages.map(function (page, index) { return '<button type="button" data-page-target="' + esc(page.id) + '"' + (index === 0 ? ' class="active"' : "") + '>' + esc(page.name) + '</button>'; }).join("") + '</nav>' : "";
    var css = '@font-face{font-family:"Helvetica Neue";src:url("../fonts/HelveticaNeue-Regular.ttf") format("truetype");font-weight:400}' +
      '@font-face{font-family:"Helvetica Neue";src:url("../fonts/Helvetica Neu Bold.ttf") format("truetype");font-weight:700}' +
      '@font-face{font-family:"Helvetica Neue Bold";src:url("../fonts/Helvetica Neu Bold.ttf") format("truetype")}' +
      '@font-face{font-family:"Helvetica Neue Condensed";src:url("../fonts/HelveticaNeue-CondensedBold.ttf") format("truetype")}' +
      '@font-face{font-family:"Helvetica Neue Light";src:url("../fonts/HelveticaNeue-Light.ttf") format("truetype")}' +
      '@font-face{font-family:"Segoe UI";src:url("../fonts/SegoeUI-Regular.ttf") format("truetype")}' +
      '@font-face{font-family:"Segoe UI Bold";src:url("../fonts/SegoeUI-Bold.ttf") format("truetype")}' +
      '@font-face{font-family:"Segoe UI Light";src:url("../fonts/SegoeUI-Light.ttf") format("truetype")}' +
      '@font-face{font-family:"Black Boys on Mopeds";src:url("../fonts/BLACKBOYSONMOPEDS.ttf") format("truetype")}' +
      '*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Arial,sans-serif}.site-pages{position:sticky;top:0;z-index:999;display:flex;gap:4px;padding:6px;background:#eee;border-bottom:1px solid #aaa}.site-pages button.active{font-weight:bold}.site-page{position:relative;width:100%;overflow:hidden;background-position:center top;background-repeat:no-repeat;background-size:cover}.site-page[hidden]{display:none}.site-sprite{position:absolute;min-width:24px;min-height:18px}.site-sprite h1,.site-sprite h2,.site-sprite p{margin:0;font:inherit;color:inherit}.site-sprite small{display:block;font:inherit;color:inherit}.site-sprite button,.site-sprite input,.site-sprite select{width:100%;height:100%;font:inherit;color:inherit}.site-sprite img{display:block;width:100%;height:100%;object-fit:contain}.site-sprite iframe{display:block;width:100%;height:100%;border:1px solid #777;background:#fff}.site-sprite hr{position:absolute;top:50%;width:100%;margin:0;border:0;border-top:1px solid currentColor}.sprite-speech{position:absolute;left:50%;bottom:calc(100% + 8px);z-index:20;min-width:70px;max-width:240px;padding:7px 10px;color:#111;background:#fff;border:2px solid #777;border-radius:12px;font:13px Arial,sans-serif;white-space:normal;overflow-wrap:anywhere;box-shadow:0 2px 5px rgba(0,0,0,.25);pointer-events:none}.sprite-speech:after{content:"";position:absolute;left:18px;top:100%;border:7px solid transparent;border-top-color:#777}.component-box{width:100%;height:100%;padding:4px;border:1px solid currentColor}.component-space{width:100%;height:100%}.component-progress{width:100%;height:100%;overflow:hidden;border:1px solid #777;background:#eee}.component-progress>div{height:100%;background:linear-gradient(#80c45b,#45962b)}' +
      '.win7-button{min-width:0;padding:0 12px;color:inherit;border:1px solid #707070;border-radius:3px;background:var(--button-fill,linear-gradient(#fefefe,#d7d7d7));box-shadow:inset 0 0 0 1px rgba(255,255,255,.8),0 1px 1px rgba(0,0,0,.15);text-shadow:0 1px #fff}.win7-button:hover{border-color:#3c7fb1;filter:brightness(1.08) saturate(1.08);box-shadow:inset 0 0 0 1px #fff,0 0 3px rgba(60,127,177,.7)}.win7-button:active{border-color:#2c628b;filter:brightness(.9) saturate(1.12);box-shadow:inset 0 1px 3px rgba(0,0,0,.25)}\n';
    css += '.site-page{background-attachment:fixed}';
    var js = exportedActionRuntime();
    var inlineCss = css.replace(/\.\.\/fonts\//g, "fonts/");
    var inlineJs = js.replace(/<\/script/gi, "<\\/script");
    var html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(projectName) + '</title><style>' + inlineCss + '</style></head><body>' + navigation + pageMarkup + '<script>' + inlineJs + '<\/script></body></html>\n';
    return { html: html, css: css, js: js };
  }

  async function saveProjectFolder() {
    if (!window.showDirectoryPicker) { alert("Folder saving needs Chrome or Edge and must be opened from localhost or HTTPS."); return; }
    try {
      setStatus("Choose or create the PLACEHOLDER project folder inside Downloads, Documents, or another location.");
      var projectDirectory = await window.showDirectoryPicker({ mode: "readwrite", startIn: "downloads", id: "netsite-project-folder" });
      var projectName = safeFolderName(projectDirectory.name || "PLACEHOLDER");
      var cssDirectory = await projectDirectory.getDirectoryHandle("css", { create: true });
      var jsDirectory = await projectDirectory.getDirectoryHandle("js", { create: true });
      var imagesDirectory = await projectDirectory.getDirectoryHandle("images", { create: true });
      var fontsDirectory = await projectDirectory.getDirectoryHandle("fonts", { create: true });
      saveState();
      var backgroundFiles = {}; var imageFiles = {};
      for (var p = 0; p < state.pages.length; p++) {
        var page = state.pages[p];
        if (/^data:image\//i.test(page.background || "")) {
          var backgroundName = "page-" + (p + 1) + "-background." + imageExtension(page.background);
          await saveDataImage(imagesDirectory, backgroundName, page.background);
          backgroundFiles[page.id] = "images/" + backgroundName;
        }
        for (var s = 0; s < page.sprites.length; s++) {
          var sprite = page.sprites[s];
          if (sprite.type === "image" && /^data:image\//i.test(sprite.url || "")) {
            var imageName = "sprite-" + sprite.id.replace(/[^a-z0-9_-]/gi, "-") + "." + imageExtension(sprite.url);
            await saveDataImage(imagesDirectory, imageName, sprite.url);
            imageFiles[sprite.id] = "images/" + imageName;
          }
        }
      }
      var files = buildWebsiteFiles(backgroundFiles, imageFiles, projectName);
      var skippedFonts = await saveBundledFonts(fontsDirectory);
      await writeFile(projectDirectory, "index.html", files.html);
      await writeFile(cssDirectory, "style.css", files.css);
      await writeFile(jsDirectory, "script.js", files.js);
      await writeFile(projectDirectory, "project.json", JSON.stringify({ format: "netsite-alpha1-folder", version: 1, name: projectName, state: state }, null, 2));
      await writeFile(imagesDirectory, "README.txt", "Images used by this NetSite project are stored here.\n");
      setStatus("Saved project folder: " + projectName + (skippedFonts.length ? " (some local fonts used system fallbacks)" : ""));
    } catch (error) {
      if (error && error.name === "AbortError") { setStatus("Save cancelled. Select a project subfolder, not the Downloads or Documents folder itself."); return; }
      alert("NetSite could not save this project folder. " + (error.message || error));
    }
  }

  async function downloadProjectZip() {
    if (!window.JSZip) { alert("The ZIP library did not load. Check your internet connection and try again."); return; }
    try {
      setStatus("Compressing PLACEHOLDER.zip...");
      saveState();
      var projectName = "PLACEHOLDER";
      var zip = new JSZip();
      var root = zip.folder(projectName);
      var cssFolder = root.folder("css");
      var jsFolder = root.folder("js");
      var imagesFolder = root.folder("images");
      var fontsFolder = root.folder("fonts");
      var backgroundFiles = {}; var imageFiles = {};

      for (var p = 0; p < state.pages.length; p++) {
        var page = state.pages[p];
        if (/^data:image\//i.test(page.background || "")) {
          var backgroundName = "page-" + (p + 1) + "-background." + imageExtension(page.background);
          imagesFolder.file(backgroundName, dataUrlBlob(page.background));
          backgroundFiles[page.id] = "images/" + backgroundName;
        }
        for (var s = 0; s < page.sprites.length; s++) {
          var sprite = page.sprites[s];
          if (sprite.type === "image" && /^data:image\//i.test(sprite.url || "")) {
            var imageName = "sprite-" + sprite.id.replace(/[^a-z0-9_-]/gi, "-") + "." + imageExtension(sprite.url);
            imagesFolder.file(imageName, dataUrlBlob(sprite.url));
            imageFiles[sprite.id] = "images/" + imageName;
          }
        }
      }

      var skippedFonts = [];
      for (var f = 0; f < FONT_ASSETS.length; f++) {
        var fontName = FONT_ASSETS[f];
        try {
          var response = await fetch(new URL("assets/fonts/" + fontName, document.baseURI).href);
          if (!response.ok) throw new Error("HTTP " + response.status);
          fontsFolder.file(fontName, await response.blob());
        } catch (fontError) {
          skippedFonts.push(fontName);
        }
      }

      var files = buildWebsiteFiles(backgroundFiles, imageFiles, projectName);
      root.file("index.html", files.html);
      cssFolder.file("style.css", files.css);
      jsFolder.file("script.js", files.js);
      root.file("project.json", JSON.stringify({ format: "netsite-alpha1-folder", version: 1, name: projectName, state: state }, null, 2));
      imagesFolder.file("README.txt", "Images used by this NetSite project are stored here.\n");
      if (skippedFonts.length) fontsFolder.file("README.txt", "These local fonts could not be copied while NetSite was opened as a local file:\n" + skippedFonts.join("\n") + "\n");

      var blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = projectName + ".zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
      setStatus("Downloaded " + projectName + ".zip" + (skippedFonts.length ? " (some local fonts use fallbacks)" : ""));
    } catch (error) {
      alert("NetSite could not create the ZIP file. " + (error.message || error));
      setStatus("ZIP export failed.");
    }
  }

  async function importProjectFolder() {
    if (!window.showDirectoryPicker) { alert("Folder importing needs Chrome or Edge and must be opened from localhost or HTTPS."); return; }
    try {
      var directory = await window.showDirectoryPicker({ mode: "read", startIn: "downloads", id: "netsite-import-folder" });
      var projectFile = await (await directory.getFileHandle("project.json")).getFile();
      var project = JSON.parse(await projectFile.text());
      var imported = project && project.state;
      if (!imported || !Array.isArray(imported.pages) || !imported.pages.length) throw new Error("This folder does not contain a valid NetSite project.json file.");
      state = normalizeState(imported);
      state.activePage = state.pages.some(function (page) { return page.id === state.activePage; }) ? state.activePage : state.pages[0].id;
      selectedId = null; scriptOwnerId = "__global"; testMode = false; actionRun++;
      if (window.workspace) {
        Blockly.Events.disable();
        try {
          workspace.clear();
          if (state.spriteScripts.__global) Blockly.serialization.workspaces.load(state.spriteScripts.__global, workspace);
        } finally {
          Blockly.Events.enable();
        }
      }
      document.getElementById("btn-flag").querySelector("span").textContent = "Test Actions";
      renderAll();
      setStatus("Imported project folder: " + (project.name || directory.name));
    } catch (error) {
      if (error && error.name === "AbortError") return;
      alert("Choose a NetSite project folder containing project.json. " + (error.message || error));
    }
  }

  function installUI() {
    stageContainer = document.getElementById("stage-container");
    pageEl = document.createElement("div"); pageEl.id = "component-page"; stageContainer.appendChild(pageEl);
    var pageTabs = document.createElement("menu"); pageTabs.id = "component-page-tabs"; pageTabs.className = "component-page-tabs"; pageTabs.setAttribute("role", "tablist"); pageTabs.setAttribute("aria-label", "Website pages");
    document.getElementById("stage-controls").insertBefore(pageTabs, document.querySelector("#stage-controls .prealpha-note"));
    document.getElementById("tab-costumes-content").innerHTML = '<div id="component-styler" class="component-styler"></div>';
    stylerEl = document.getElementById("component-styler");
    document.getElementById("sprite-picker-title").textContent = "Choose your element";
    document.getElementById("sprite-picker-grid").innerHTML = TYPES.map(function (type) { return '<button type="button" data-add-component="' + type + '">' + LABELS[type] + '</button>'; }).join("");
    document.getElementById("sprite-panel-header").querySelectorAll("button")[0].textContent = "+ Element";
    document.getElementById("sprite-panel-header").querySelectorAll("button")[1].style.display = "none";

    window.openSpritePicker = openPicker;
    window.closeSpritePicker = function (event) { if (!event || event.target === document.getElementById("sprite-picker-overlay") || event.target.closest("#sprite-picker-footer")) closePicker(); };
    window.runScripts = async function () {
      testMode = !testMode;
      actionRun++;
      document.getElementById("btn-flag").querySelector("span").textContent = testMode ? "Exit Test" : "Test Actions";
      if (testMode) await runTestActions(actionRun); else renderPage();
    };
    window.clearWebsitePreview = function () { if (confirm("Remove all elements from this page?")) { currentPage().sprites.forEach(function (sprite) { delete state.spriteScripts[sprite.id]; }); currentPage().sprites = []; selectedId = null; switchScriptOwner("__global"); renderAll(); } };
    window.clearStage = window.clearWebsitePreview;
    window.newProject = function () {
      if (!confirm("Start a new project? Unsaved changes will be lost.")) return;
      state = blankState(); selectedId = null; scriptOwnerId = "__global"; testMode = false; actionRun++;
      if (window.workspace) workspace.clear();
      document.getElementById("btn-flag").querySelector("span").textContent = "Test Actions";
      renderAll(); showTab("scripts"); setStatus("New NetSite project ready.");
    };
    window.saveProject = downloadProjectZip;
    window.exportProject = downloadProjectZip;
    window.loadProject = importProjectFolder;
    window.showTab = function (tab) { document.querySelectorAll(".tab-btn").forEach(function (button) { var active = button.id === "tab-" + tab; button.classList.toggle("active", active); button.setAttribute("aria-selected", String(active)); }); document.querySelectorAll(".tab-content").forEach(function (content) { content.classList.toggle("active", content.id === "tab-" + tab + "-content"); }); if (window.workspace) setTimeout(function () { Blockly.svgResize(workspace); }, 30); };

    var overlay = document.getElementById("sprite-picker-overlay");
    overlay.addEventListener("click", function (event) { var button = event.target.closest("[data-add-component]"); if (button) addSprite(button.dataset.addComponent); else if (event.target === overlay) closePicker(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closePicker(); });
    pageTabs.addEventListener("click", function (event) { var button = event.target.closest("button"); if (!button) return; if (button.dataset.deletePage) { deletePage(button.dataset.deletePage); return; } if (button.dataset.page) { state.activePage = button.dataset.page; selectedId = null; switchScriptOwner("__global"); renderAll(); } else if (button.hasAttribute("data-add-page")) { var page = { id: id("page"), name: "Page " + (state.pages.length + 1), background: "", backgroundColor: "#ffffff", sprites: [] }; state.pages.push(page); state.activePage = page.id; selectedId = null; switchScriptOwner("__global"); renderAll(); } });
    document.getElementById("sprite-list").addEventListener("click", function (event) { var remove = event.target.closest("[data-delete-sprite]"); if (remove) { event.stopPropagation(); deleteSprite(remove.dataset.deleteSprite); return; } var button = event.target.closest("[data-select]"); if (button) { selectedId = button.dataset.select; switchScriptOwner(selectedId); renderAll(); showTab("costumes"); } });
    pageEl.addEventListener("click", function (event) { var el = event.target.closest(".website-sprite"); if (!el) return; if (testMode) runActions(el.dataset.sprite); else { selectedId = el.dataset.sprite; switchScriptOwner(selectedId); renderAll(); } });
    pageEl.addEventListener("pointerdown", function (event) { if (testMode) return; var el = event.target.closest(".website-sprite"); if (!el) return; var sprite = currentPage().sprites.find(function (item) { return item.id === el.dataset.sprite; }); if (!sprite) return; selectedId = sprite.id; switchScriptOwner(selectedId); drag = { sprite: sprite, el: el, startX: event.clientX, startY: event.clientY, x: sprite.x, y: sprite.y }; el.setPointerCapture(event.pointerId); el.classList.add("dragging"); event.preventDefault(); });
    pageEl.addEventListener("pointermove", function (event) { if (!drag) return; drag.sprite.x = Math.max(0, Math.round(drag.x + event.clientX - drag.startX)); drag.sprite.y = Math.max(0, Math.round(drag.y + event.clientY - drag.startY)); drag.el.style.left = drag.sprite.x + "px"; drag.el.style.top = drag.sprite.y + "px"; pageEl.style.height = pageHeight() + "px"; });
    function endDrag() { if (!drag) return; drag.el.classList.remove("dragging"); drag = null; renderAll(); }
    pageEl.addEventListener("pointerup", endDrag); pageEl.addEventListener("pointercancel", endDrag);
    stylerEl.addEventListener("input", function (event) { var sprite = selected(); if (!sprite || !event.target.dataset.field) return; var field = event.target.dataset.field; if (event.target.type === "checkbox") sprite[field] = event.target.checked; else if (event.target.type === "number") sprite[field] = number(event.target.value, sprite[field]); else sprite[field] = event.target.value; renderPage(); renderSpriteList(); saveState(); });
    stylerEl.addEventListener("click", function (event) { var sprite = selected(); if (!sprite) return; var paletteButton = event.target.closest("[data-palette]"); if (paletteButton) { sprite[paletteButton.dataset.palette] = paletteButton.dataset.color; renderAll(); return; } if (event.target.closest("[data-hide]")) { sprite.hidden = !sprite.hidden; renderAll(); } if (event.target.closest("[data-delete]")) deleteSprite(sprite.id); });
    document.getElementById("upload-background-btn").addEventListener("click", function () { var input = document.getElementById("website-background-input"); input.value = ""; input.click(); });
    document.getElementById("website-background-input").addEventListener("change", function (event) { var file = event.target.files && event.target.files[0]; if (!file) return; if (!/^image\//i.test(file.type)) { alert("Choose an image file for the website background."); return; } var targetPage = currentPage(); var reader = new FileReader(); reader.onload = function () { targetPage.background = String(reader.result || ""); renderAll(); setStatus("Website background updated."); }; reader.onerror = function () { alert("NetSite could not read that background image."); }; reader.readAsDataURL(file); });

    window.toggleMenu = function (menuId) {
      var menu = document.getElementById(menuId); if (!menu) return;
      var wasOpen = menu.classList.contains("open");
      document.querySelectorAll("#menubar .menu-dropdown").forEach(function (item) { item.classList.remove("open"); });
      if (wasOpen) return;
      var menuIds = ["file-menu", "edit-menu", "help-menu"];
      var index = menuIds.indexOf(menuId);
      var trigger = document.querySelectorAll("#menubar .menu-item")[index];
      if (trigger) menu.style.left = trigger.offsetLeft + "px";
      menu.classList.add("open");
    };
    [["file-menu", 0], ["edit-menu", 1], ["help-menu", 2]].forEach(function (pair) { var item = document.querySelectorAll("#menubar .menu-item")[pair[1]]; if (!item) return; item.onclick = function (event) { event.preventDefault(); event.stopPropagation(); window.toggleMenu(pair[0]); }; });

    if (window.workspace) { try { workspace.clear(); if (state.spriteScripts.__global) Blockly.serialization.workspaces.load(state.spriteScripts.__global, workspace); } catch (error) {} }
    if (window.workspace) workspace.addChangeListener(function (event) { if (!event.isUiEvent) saveState(); });
    renderAll(); showTab("scripts"); setStatus("NetSite Alpha 1 ready. Add elements with the + Element button.");
  }

  window.addEventListener("load", installUI);
})();
