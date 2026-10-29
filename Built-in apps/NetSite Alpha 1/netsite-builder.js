/* NetSite Pre-Alpha website builder
   HTML-producing blocks only. Dedicated CSS and JavaScript editors are planned for later. */
(function () {
  "use strict";

  var FONT_OPTIONS = [
    ["Arial", "Arial"],
    ["Verdana", "Verdana"],
    ["Georgia", "Georgia"],
    ["Times New Roman", "Times New Roman"],
    ["Courier New", "Courier New"],
    ["Trebuchet MS", "Trebuchet MS"],
    ["Helvetica Neue", "Helvetica Neue"],
    ["Helvetica Neue Bold", "Helvetica Neue Bold"],
    ["Helvetica Neue Condensed", "Helvetica Neue Condensed"],
    ["Helvetica Neue Light", "Helvetica Neue Light"],
    ["Segoe UI", "Segoe UI"],
    ["Segoe UI Bold", "Segoe UI Bold"],
    ["Segoe UI Light", "Segoe UI Light"],
    ["Black Boys on Mopeds", "Black Boys on Mopeds"]
  ];

  function colourField(value) {
    return Blockly.FieldColour ? new Blockly.FieldColour(value) : new Blockly.FieldTextInput(value);
  }

  function addTextStyleFields(block, size, color) {
    block.appendDummyInput()
      .appendField("Size")
      .appendField(new Blockly.FieldNumber(size, 8, 120, 1), "SIZE")
      .appendField("Font")
      .appendField(new Blockly.FieldDropdown(FONT_OPTIONS), "FONT");
    block.appendDummyInput()
      .appendField("Color")
      .appendField(colourField(color), "COLOR");
  }

  function statementBlock(block, color, tooltip) {
    if (block.type !== "netsite_page_style") {
      block.appendDummyInput()
        .appendField("Horizontal X")
        .appendField(new Blockly.FieldNumber(0, -2000, 2000, 1), "X");
    }
    block.setPreviousStatement(true, null);
    block.setNextStatement(true, null);
    block.setColour(color);
    block.setTooltip(tooltip);
    block.setInputsInline(false);
  }

  function defineTextBlock(type, label, defaultText, defaultSize, colour) {
    Blockly.Blocks[type] = {
      init: function () {
        this.appendDummyInput()
          .appendField(label)
          .appendField(new Blockly.FieldTextInput(defaultText), "TEXT");
        addTextStyleFields(this, defaultSize, "#222222");
        statementBlock(this, colour, "Adds a " + label.toLowerCase() + " to the website preview.");
      }
    };
  }

  defineTextBlock("netsite_title", "Title", "My Website", 42, "#d94b3d");
  defineTextBlock("netsite_header", "Header", "Welcome", 28, "#d96c3d");
  defineTextBlock("netsite_text", "Text", "Write something here.", 16, "#e49245");
  defineTextBlock("netsite_subtext", "SubText", "A little more information.", 13, "#eba75a");

  Blockly.Blocks.netsite_button = {
    init: function () {
      this.appendDummyInput().appendField("Button").appendField(new Blockly.FieldTextInput("Click me"), "TEXT");
      addTextStyleFields(this, 15, "#ffffff");
      this.appendDummyInput()
        .appendField("Background").appendField(colourField("#cc181e"), "BG")
        .appendField("W").appendField(new Blockly.FieldNumber(140, 30, 1000, 1), "WIDTH")
        .appendField("H").appendField(new Blockly.FieldNumber(40, 20, 300, 1), "HEIGHT");
      statementBlock(this, "#c83c54", "Adds a button. Actions will be expanded later.");
    }
  };

  Blockly.Blocks.netsite_input = {
    init: function () {
      this.appendDummyInput()
        .appendField("Input faded text")
        .appendField(new Blockly.FieldTextInput("Type here..."), "TEXT");
      this.appendDummyInput()
        .appendField("Type")
        .appendField(new Blockly.FieldDropdown([["Text", "text"], ["Email", "email"], ["Password", "password"], ["Search", "search"]]), "TYPE");
      addTextStyleFields(this, 15, "#333333");
      this.appendDummyInput()
        .appendField("W").appendField(new Blockly.FieldNumber(280, 60, 1200, 1), "WIDTH")
        .appendField("H").appendField(new Blockly.FieldNumber(38, 20, 300, 1), "HEIGHT");
      statementBlock(this, "#b84469", "Adds an input field with placeholder text.");
    }
  };

  Blockly.Blocks.netsite_image = {
    init: function () {
      this.appendDummyInput().appendField("Image URL").appendField(new Blockly.FieldTextInput("https://placehold.co/640x360"), "URL");
      this.appendDummyInput().appendField("Alt text").appendField(new Blockly.FieldTextInput("Website image"), "ALT");
      this.appendDummyInput()
        .appendField("W").appendField(new Blockly.FieldNumber(480, 20, 1600, 1), "WIDTH")
        .appendField("H").appendField(new Blockly.FieldNumber(270, 20, 1200, 1), "HEIGHT");
      statementBlock(this, "#a74475", "Adds an image from a web address.");
    }
  };

  Blockly.Blocks.netsite_divider = {
    init: function () {
      this.appendDummyInput().appendField("Divider").appendField("Color").appendField(colourField("#dddddd"), "COLOR");
      this.appendDummyInput().appendField("Thickness").appendField(new Blockly.FieldNumber(1, 1, 20, 1), "SIZE");
      statementBlock(this, "#9e4b79", "Adds a horizontal divider.");
    }
  };

  Blockly.Blocks.netsite_spacer = {
    init: function () {
      this.appendDummyInput().appendField("Space").appendField(new Blockly.FieldNumber(24, 0, 500, 1), "HEIGHT").appendField("px");
      statementBlock(this, "#8e537c", "Adds vertical space.");
    }
  };

  Blockly.Blocks.netsite_page_style = {
    init: function () {
      this.appendDummyInput().appendField("Page Style");
      this.appendDummyInput()
        .appendField("Background").appendField(colourField("#ffffff"), "BG")
        .appendField("Content W").appendField(new Blockly.FieldNumber(900, 240, 1600, 10), "WIDTH");
      this.appendDummyInput()
        .appendField("Padding").appendField(new Blockly.FieldNumber(40, 0, 200, 1), "PADDING")
        .appendField("Align").appendField(new Blockly.FieldDropdown([["Left", "left"], ["Center", "center"], ["Right", "right"]]), "ALIGN");
      statementBlock(this, "#4b8dc6", "Controls the overall website page style.");
    }
  };

  Blockly.Blocks.netsite_section = {
    init: function () {
      this.appendDummyInput().appendField("Section").appendField(new Blockly.FieldTextInput("Section"), "NAME");
      this.appendDummyInput()
        .appendField("Background").appendField(colourField("#f5f5f5"), "BG")
        .appendField("Padding").appendField(new Blockly.FieldNumber(24, 0, 200, 1), "PADDING");
      this.appendDummyInput().appendField("Corner radius").appendField(new Blockly.FieldNumber(8, 0, 100, 1), "RADIUS");
      this.appendStatementInput("CONTENT").setCheck(null).appendField("inside");
      statementBlock(this, "#397cb5", "Groups blocks into a styled section.");
    }
  };

  Blockly.Blocks.netsite_link = {
    init: function () {
      this.appendDummyInput().appendField("Link").appendField(new Blockly.FieldTextInput("Learn more"), "TEXT");
      this.appendDummyInput().appendField("Go to").appendField(new Blockly.FieldTextInput("https://example.com"), "URL");
      addTextStyleFields(this, 15, "#0033cc");
      statementBlock(this, "#55a45d", "Adds a clickable link. JavaScript actions are not available yet.");
    }
  };

  Blockly.Blocks.netsite_iframe = {
    init: function () {
      this.appendDummyInput().appendField("Iframe URL").appendField(new Blockly.FieldTextInput("https://example.com"), "URL");
      this.appendDummyInput()
        .appendField("W").appendField(new Blockly.FieldNumber(640, 100, 1600, 1), "WIDTH")
        .appendField("H").appendField(new Blockly.FieldNumber(360, 100, 1200, 1), "HEIGHT");
      this.appendDummyInput().appendField("Title").appendField(new Blockly.FieldTextInput("Embedded website"), "TITLE");
      statementBlock(this, "#7256a8", "Embeds another website in the preview.");
    }
  };

  var toolbox = document.getElementById("toolbox");
  if (toolbox) {
    toolbox.innerHTML =
      '<category name="Builder" colour="#d94b3d" data-netsite="true">' +
        '<sep gap="150"></sep>' +
        '<block type="netsite_title"></block><block type="netsite_header"></block><block type="netsite_text"></block>' +
        '<block type="netsite_subtext"></block><block type="netsite_button"></block><block type="netsite_input"></block>' +
        '<block type="netsite_image"></block><block type="netsite_divider"></block><block type="netsite_spacer"></block>' +
      '</category>' +
      '<category name="Styler" colour="#4b8dc6" data-netsite="true">' +
        '<sep gap="150"></sep>' +
        '<block type="netsite_page_style"></block><block type="netsite_section"></block>' +
      '</category>' +
      '<category name="Action" colour="#55a45d" data-netsite="true">' +
        '<sep gap="150"></sep>' +
        '<block type="netsite_link"></block>' +
        '<label text="JavaScript actions are coming later."></label>' +
      '</category>' +
      '<category name="Iframe" colour="#7256a8" data-netsite="true">' +
        '<sep gap="150"></sep>' +
        '<block type="netsite_iframe"></block>' +
      '</category>';
  }

  // Hide the legacy extension button; Iframe is now a first-class category.
  window._injectExtButton = function () {};

  function field(block, name, fallback) {
    var value = block && block.getFieldValue(name);
    return value === null || value === undefined || value === "" ? fallback : value;
  }

  function esc(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function safeColor(value, fallback) {
    value = String(value || "");
    return /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
  }

  function number(value, fallback, min, max) {
    var parsed = Number(value);
    if (!isFinite(parsed)) parsed = fallback;
    return Math.max(min, Math.min(max, parsed));
  }

  function textStyle(block) {
    var size = number(field(block, "SIZE", 16), 16, 8, 120);
    var font = esc(field(block, "FONT", "Arial"));
    var color = safeColor(field(block, "COLOR", "#222222"), "#222222");
    return "font-size:" + size + "px;font-family:'" + font + "',sans-serif;color:" + color + ";";
  }

  function renderBlock(block) {
    var type = block.type;
    var html = "";
    if (type === "netsite_title") html = '<h1 class="ns-title" style="' + textStyle(block) + '">' + esc(field(block, "TEXT", "My Website")) + "</h1>";
    else if (type === "netsite_header") html = '<h2 class="ns-header" style="' + textStyle(block) + '">' + esc(field(block, "TEXT", "Welcome")) + "</h2>";
    else if (type === "netsite_text") html = '<p class="ns-text" style="' + textStyle(block) + '">' + esc(field(block, "TEXT", "")) + "</p>";
    else if (type === "netsite_subtext") html = '<p class="ns-subtext" style="' + textStyle(block) + '">' + esc(field(block, "TEXT", "")) + "</p>";
    else if (type === "netsite_button") {
      html = '<button class="ns-button" style="' + textStyle(block) + "background:" + safeColor(field(block, "BG", "#cc181e"), "#cc181e") +
        ";width:" + number(field(block, "WIDTH", 140), 140, 30, 1000) + "px;height:" + number(field(block, "HEIGHT", 40), 40, 20, 300) + 'px;">' +
        esc(field(block, "TEXT", "Click me")) + "</button>";
    } else if (type === "netsite_input") {
      html = '<input class="ns-input" type="' + esc(field(block, "TYPE", "text")) + '" placeholder="' + esc(field(block, "TEXT", "Type here...")) +
        '" style="' + textStyle(block) + "width:" + number(field(block, "WIDTH", 280), 280, 60, 1200) + "px;height:" +
        number(field(block, "HEIGHT", 38), 38, 20, 300) + 'px;">';
    } else if (type === "netsite_image") {
      html = '<img class="ns-image" src="' + esc(field(block, "URL", "")) + '" alt="' + esc(field(block, "ALT", "Website image")) +
        '" style="width:' + number(field(block, "WIDTH", 480), 480, 20, 1600) + "px;height:" + number(field(block, "HEIGHT", 270), 270, 20, 1200) + 'px;">';
    } else if (type === "netsite_divider") {
      html = '<hr style="border:0;border-top:' + number(field(block, "SIZE", 1), 1, 1, 20) + "px solid " + safeColor(field(block, "COLOR", "#dddddd"), "#dddddd") + ';">';
    } else if (type === "netsite_spacer") {
      html = '<div aria-hidden="true" style="height:' + number(field(block, "HEIGHT", 24), 24, 0, 500) + 'px"></div>';
    } else if (type === "netsite_section") {
      var child = block.getInputTargetBlock("CONTENT");
      html = '<section class="ns-section" style="background:' + safeColor(field(block, "BG", "#f5f5f5"), "#f5f5f5") +
        ";padding:" + number(field(block, "PADDING", 24), 24, 0, 200) + "px;border-radius:" + number(field(block, "RADIUS", 8), 8, 0, 100) + 'px;">' +
        renderChain(child) + "</section>";
    } else if (type === "netsite_link") {
      html = '<a class="ns-link" href="' + esc(field(block, "URL", "#")) + '" target="_blank" rel="noopener" style="' + textStyle(block) + '">' + esc(field(block, "TEXT", "Learn more")) + "</a>";
    } else if (type === "netsite_iframe") {
      html = '<iframe class="ns-embed" src="' + esc(field(block, "URL", "about:blank")) + '" title="' + esc(field(block, "TITLE", "Embedded website")) +
        '" style="width:' + number(field(block, "WIDTH", 640), 640, 100, 1600) + "px;height:" + number(field(block, "HEIGHT", 360), 360, 100, 1200) + 'px;"></iframe>';
    }
    if (html && type !== "netsite_page_style") {
      var x = number(field(block, "X", 0), 0, -2000, 2000);
      html = '<div class="ns-movable" data-block-id="' + esc(block.id) + '" data-x="' + x + '" style="transform:translateX(' + x + 'px)">' +
        '<span class="ns-drag-handle" title="Drag left or right" aria-label="Drag left or right">&#8596;</span>' + html + '</div>';
    }
    return html;
  }

  function renderChain(block) {
    var result = "";
    var current = block;
    while (current) {
      if (current.type !== "netsite_page_style") result += renderBlock(current);
      current = current.getNextBlock ? current.getNextBlock() : null;
    }
    return result;
  }

  function pageSettings() {
    var settings = { bg: "#ffffff", width: 900, padding: 40, align: "left" };
    if (!window.workspace) return settings;
    var blocks = workspace.getAllBlocks(false);
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].type === "netsite_page_style") {
        settings.bg = safeColor(field(blocks[i], "BG", "#ffffff"), "#ffffff");
        settings.width = number(field(blocks[i], "WIDTH", 900), 900, 240, 1600);
        settings.padding = number(field(blocks[i], "PADDING", 40), 40, 0, 200);
        settings.align = field(blocks[i], "ALIGN", "left");
      }
    }
    return settings;
  }

  window.renderWebsitePreview = function () {
    var preview = document.getElementById("website-preview");
    if (!preview || !window.workspace) return;
    var settings = pageSettings();
    var topBlocks = workspace.getTopBlocks(true);
    var content = "";
    for (var i = 0; i < topBlocks.length; i++) content += renderChain(topBlocks[i]);
    preview.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>' +
      '@font-face{font-family:"Helvetica Neue";src:url("assets/fonts/HelveticaNeue-Regular.ttf") format("truetype")}' +
      '@font-face{font-family:"Helvetica Neue Bold";src:url("assets/fonts/Helvetica Neu Bold.ttf") format("truetype")}' +
      '@font-face{font-family:"Helvetica Neue Condensed";src:url("assets/fonts/HelveticaNeue-CondensedBold.ttf") format("truetype")}' +
      '@font-face{font-family:"Helvetica Neue Light";src:url("assets/fonts/HelveticaNeue-Light.ttf") format("truetype")}' +
      '@font-face{font-family:"Segoe UI";src:url("assets/fonts/SegoeUI-Regular.ttf") format("truetype")}' +
      '@font-face{font-family:"Segoe UI Bold";src:url("assets/fonts/SegoeUI-Bold.ttf") format("truetype")}' +
      '@font-face{font-family:"Segoe UI Light";src:url("assets/fonts/SegoeUI-Light.ttf") format("truetype")}' +
      '@font-face{font-family:"Black Boys on Mopeds";src:url("assets/fonts/BLACKBOYSONMOPEDS.ttf") format("truetype")}' +
      '*{box-sizing:border-box}body{margin:0;background:' + settings.bg + ';font-family:Arial,sans-serif;color:#222}' +
      '.ns-page{width:min(100%,' + settings.width + 'px);margin:0 auto;padding:' + settings.padding + 'px;text-align:' + settings.align + '}' +
      '.ns-title,.ns-header,.ns-text,.ns-subtext{margin:0 0 16px;line-height:1.25}.ns-title{text-shadow:0 3px 0 rgba(0,0,0,.22),0 7px 12px rgba(0,0,0,.48)}.ns-subtext{opacity:.72}' +
      '.ns-movable{position:relative;display:table;max-width:100%;transition:filter .12s;will-change:transform}' +
      '.ns-movable:hover{filter:drop-shadow(0 2px 3px rgba(0,0,0,.14))}' +
      '.ns-drag-handle{position:absolute;z-index:20;top:-9px;left:-10px;display:none;width:22px;height:18px;line-height:16px;text-align:center;' +
      'font:700 13px Arial,sans-serif;color:#fff;background:#315d92;border:1px solid #173e6b;border-radius:9px;cursor:ew-resize;touch-action:none;user-select:none}' +
      '.ns-movable:hover>.ns-drag-handle,.ns-drag-handle:focus{display:block}' +
      '@media (hover:none){.ns-movable>.ns-drag-handle{display:block;opacity:.82}}' +
      '.ns-movable.ns-dragging{z-index:50;filter:drop-shadow(0 4px 6px rgba(0,0,0,.3))}.ns-movable.ns-dragging>.ns-drag-handle{display:block;background:#cc181e}' +
      '.ns-button{display:inline-block;margin:0 8px 16px 0;border:0;border-radius:4px;font-weight:bold;cursor:pointer}' +
      '.ns-input{display:block;max-width:100%;margin:0 0 16px;padding:8px 10px;border:1px solid #aaa;border-radius:3px}' +
      '.ns-image,.ns-embed{display:block;max-width:100%;object-fit:cover;margin:0 0 18px;border:0}' +
      '.ns-embed{border:1px solid #aaa}.ns-section{margin:0 0 18px}.ns-link{display:inline-block;margin:0 0 16px;text-decoration:underline}' +
      'hr{margin:18px 0}</style></head><body><main class="ns-page">' + (content || '<div style="padding:50px 20px;text-align:center;color:#888"><h2>Your website preview</h2><p>Drag Builder blocks into the workspace to begin.</p></div>') +
      '</main><script>(function(){var drag=null;function endDrag(){if(!drag)return;drag.el.classList.remove("ns-dragging");parent.postMessage({type:"netsite-horizontal-position",blockId:drag.id,x:drag.x},"*");drag=null}' +
      'document.addEventListener("pointerdown",function(e){if(!e.target.classList.contains("ns-drag-handle"))return;var el=e.target.parentElement;drag={el:el,id:el.dataset.blockId,start:e.clientX,base:Number(el.dataset.x)||0,x:Number(el.dataset.x)||0};el.classList.add("ns-dragging");e.target.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation()});' +
      'document.addEventListener("pointermove",function(e){if(!drag)return;drag.x=Math.max(-2000,Math.min(2000,Math.round(drag.base+e.clientX-drag.start)));drag.el.style.transform="translateX("+drag.x+"px)";e.preventDefault()});' +
      'document.addEventListener("pointerup",endDrag);document.addEventListener("pointercancel",endDrag)})();</script></body></html>';
    if (typeof setStatus === "function") setStatus("Website preview updated.");
  };

  window.runScripts = window.renderWebsitePreview;
  window.clearWebsitePreview = function () {
    var preview = document.getElementById("website-preview");
    if (preview) preview.srcdoc = '<!doctype html><html><body style="margin:0;background:#fff"></body></html>';
    if (typeof setStatus === "function") setStatus("Preview cleared. Your blocks are unchanged.");
  };

  window.addEventListener("message", function (event) {
    var preview = document.getElementById("website-preview");
    var data = event.data;
    if (!preview || event.source !== preview.contentWindow || !data || data.type !== "netsite-horizontal-position" || !window.workspace) return;
    var block = workspace.getBlockById(data.blockId);
    if (!block || !block.getField("X")) return;
    block.setFieldValue(String(number(data.x, 0, -2000, 2000)), "X");
    if (typeof setStatus === "function") setStatus("Position saved. Drag the handle again to keep moving it.");
  });

  function seedStarterBlocks() {
    if (!window.workspace || workspace.getAllBlocks(false).length) return;
    var specs = [
      ["netsite_page_style", {}],
      ["netsite_title", { TEXT: "Welcome to my NetSite" }],
      ["netsite_subtext", { TEXT: "Built with blocks — no code required." }],
      ["netsite_button", { TEXT: "Explore" }]
    ];
    var previous = null;
    for (var i = 0; i < specs.length; i++) {
      var block = workspace.newBlock(specs[i][0]);
      var values = specs[i][1];
      Object.keys(values).forEach(function (name) { block.setFieldValue(values[name], name); });
      block.initSvg();
      block.render();
      if (previous && previous.nextConnection && block.previousConnection) previous.nextConnection.connect(block.previousConnection);
      previous = block;
    }
    var first = workspace.getTopBlocks(true)[0];
    if (first) first.moveBy(60, 45);
  }

  window.addEventListener("load", function () {
    seedStarterBlocks();
    var timer = null;
    if (window.workspace) {
      workspace.addChangeListener(function (event) {
        if (event && event.isUiEvent) return;
        clearTimeout(timer);
        timer = setTimeout(window.renderWebsitePreview, 180);
      });
      Blockly.svgResize(workspace);
    }
    window.renderWebsitePreview();
    if (typeof setStatus === "function") setStatus("Ready. Build with blocks and watch the website preview update.");
  });
})();
