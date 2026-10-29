/* ═══════════════════════════════════════════════════════════════
   blocks.js  —  Scratch 1.4 custom block definitions for Blockly
   Uses Geras renderer look (block shapes match Scratch 2.0 era)
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Colour palette matching Scratch 2.0 colours ──
  const C = {
    MOTION:   "#4a6cd4",
    LOOKS:    "#8a55d7",
    SOUND:    "#bb42c3",
    EVENTS:   "#c88330",
    CONTROL:  "#e1a91a",
    SENSING:  "#2ca5e2",
    OPERATOR: "#5cb712",
    VAR:      "#ee7d16",
    PEN:      "#0e9a6c",
    LOG:      "#8B0000",
    LIBRARY:  "#632d99",
    FILE:     "#978500",
  };

  // Safe field fallbacks — FieldAngle & FieldColour were
  // extracted to plugins in Blockly v11; fall back gracefully.
  const SafeFieldAngle  = (typeof Blockly.FieldAngle  === 'function') ? Blockly.FieldAngle  : Blockly.FieldNumber;

  // Custom colour field: shows a swatch and opens RGB dialog on click
  class ScratchFieldColour extends Blockly.FieldTextInput {
    constructor(value) {
      super(value || "#ff0000");
      this.SERIALIZABLE = true;
    }
    initView() {
      super.initView();
      this.updateColourSwatch_();
    }
    updateColourSwatch_() {
      if (this.borderRect_) {
        this.borderRect_.style.fill = this.getValue();
        this.borderRect_.style.fillOpacity = "1";
      }
      if (this.textElement_) {
        this.textElement_.style.fill = "#fff";
      }
    }
    doValueUpdate_(newVal) {
      super.doValueUpdate_(newVal);
      this.updateColourSwatch_();
    }
    render_() {
      super.render_();
      this.updateColourSwatch_();
    }
    showEditor_() {
      if (typeof _showColourDialog === "function") {
        _showColourDialog(this);
      }
    }
  }
  const SafeFieldColour = ScratchFieldColour;

  // Dynamic dropdown that lists all current sprites + mouse-pointer + edge
  function _spritesDropdown() {
    return function() {
      var opts = [["mouse-pointer", "_mouse_"], ["edge", "_edge_"]];
      if (typeof sprites !== 'undefined') {
        for (var i = 0; i < sprites.length; i++) opts.push([sprites[i].name, sprites[i].name]);
      }
      if (opts.length === 2) opts.push(["(no sprites)", "__none__"]);
      return opts;
    };
  }

  // Dropdown for go-to targets (mouse-pointer, edge, or sprite)
  function _goToDropdown() {
    return function() {
      var opts = [["mouse-pointer", "_mouse_"], ["random position", "_random_"]];
      if (typeof sprites !== 'undefined') {
        for (var i = 0; i < sprites.length; i++) opts.push([sprites[i].name, sprites[i].name]);
      }
      return opts;
    };
  }

  // All keyboard keys dropdown
  const ALL_KEYS = [
    ["space","space"],["up arrow","ArrowUp"],["down arrow","ArrowDown"],
    ["left arrow","ArrowLeft"],["right arrow","ArrowRight"],
    ["a","a"],["b","b"],["c","c"],["d","d"],["e","e"],
    ["f","f"],["g","g"],["h","h"],["i","i"],["j","j"],
    ["k","k"],["l","l"],["m","m"],["n","n"],["o","o"],
    ["p","p"],["q","q"],["r","r"],["s","s"],["t","t"],
    ["u","u"],["v","v"],["w","w"],["x","x"],["y","y"],["z","z"],
    ["0","0"],["1","1"],["2","2"],["3","3"],["4","4"],
    ["5","5"],["6","6"],["7","7"],["8","8"],["9","9"],
    ["enter","Enter"],["shift","Shift"],["control","Control"],
    ["alt","Alt"],["tab","Tab"],["escape","Escape"],
    ["backspace","Backspace"],["delete","Delete"],
    ["-","-"],["=","="],["[","["],  ["]","]"],
    [";",";"],["'","'"],  [",",","],[".","."],  ["/","/"],
    ["`","`"],["\\","\\"],
    ["any","any"]
  ];

  // ═══════════════ MOTION BLOCKS ═══════════════

  Blockly.Blocks["scratch_move_steps"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("move");
      this.appendValueInput("STEPS").setCheck(null);
      this.appendDummyInput().appendField("steps");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Move this sprite forward.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_move_steps"] = (b, gen) => {
    const v = gen.valueToCode(b, "STEPS", 0) || "10";
    return `sprite_move(${v});\n`;
  };

  Blockly.Blocks["scratch_turn_right"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("turn ↻");
      this.appendValueInput("DEG").setCheck(null);
      this.appendDummyInput().appendField("degrees");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_turn_right"] = (b, gen) => {
    const v = gen.valueToCode(b, "DEG", 0) || "15";
    return `sprite_turn(${v});\n`;
  };

  Blockly.Blocks["scratch_turn_left"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("turn ↺");
      this.appendValueInput("DEG").setCheck(null);
      this.appendDummyInput().appendField("degrees");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_turn_left"] = (b, gen) => {
    const v = gen.valueToCode(b, "DEG", 0) || "15";
    return `sprite_turn(-(${v}));\n`;
  };

  Blockly.Blocks["scratch_goto_xy"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("go to x:");
      this.appendValueInput("X").setCheck(null);
      this.appendDummyInput().appendField("y:");
      this.appendValueInput("Y").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_goto_xy"] = (b, gen) => {
    const x = gen.valueToCode(b, "X", 0) || "0";
    const y = gen.valueToCode(b, "Y", 0) || "0";
    return `sprite_goto(${x},${y});\n`;
  };

  // Go to [mouse-pointer / random position / sprite]
  Blockly.Blocks["scratch_goto_target"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput()
          .appendField("go to")
          .appendField(new Blockly.FieldDropdown(_goToDropdown()), "TARGET");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_goto_target"] = b => {
    const t = b.getFieldValue("TARGET");
    if (t === "_mouse_") return `sprite_goto(sc_mouseX(), sc_mouseY());\n`;
    if (t === "_random_") return `sprite_goto(Math.round(Math.random()*480-240), Math.round(Math.random()*360-180));\n`;
    return `sprite_gotoSprite(${JSON.stringify(t)});\n`;
  };

  // Point towards [mouse-pointer / sprite]
  Blockly.Blocks["scratch_point_towards"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput()
          .appendField("point towards")
          .appendField(new Blockly.FieldDropdown(_spritesDropdown()), "TARGET");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_point_towards"] = b => {
    const t = b.getFieldValue("TARGET");
    if (t === "_mouse_") return `sprite_pointTowards(sc_mouseX(), sc_mouseY());\n`;
    return `sprite_pointTowardsSprite(${JSON.stringify(t)});\n`;
  };

  Blockly.Blocks["scratch_glide"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("glide");
      this.appendValueInput("SECS").setCheck(null);
      this.appendDummyInput().appendField("secs to x:");
      this.appendValueInput("X").setCheck(null);
      this.appendDummyInput().appendField("y:");
      this.appendValueInput("Y").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_glide"] = (b, gen) => {
    const s = gen.valueToCode(b, "SECS", 0) || "1";
    const x = gen.valueToCode(b, "X", 0) || "0";
    const y = gen.valueToCode(b, "Y", 0) || "0";
    return `await sprite_glide(${s},${x},${y});\n`;
  };

  Blockly.Blocks["scratch_point_dir"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("point in direction");
      this.appendValueInput("DIR").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_point_dir"] = (b, gen) => {
    const v = gen.valueToCode(b, "DIR", 0) || "90";
    return `sprite_point(${v});\n`;
  };

  Blockly.Blocks["scratch_change_x"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("change x by");
      this.appendValueInput("DX").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_change_x"] = (b, gen) => {
    const v = gen.valueToCode(b, "DX", 0) || "10";
    return `sprite_changeX(${v});\n`;
  };

  Blockly.Blocks["scratch_change_y"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("change y by");
      this.appendValueInput("DY").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_change_y"] = (b, gen) => {
    const v = gen.valueToCode(b, "DY", 0) || "10";
    return `sprite_changeY(${v});\n`;
  };

  Blockly.Blocks["scratch_set_x"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("set x to");
      this.appendValueInput("X").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_x"] = (b, gen) => {
    const v = gen.valueToCode(b, "X", 0) || "0";
    return `sprite_setX(${v});\n`;
  };

  Blockly.Blocks["scratch_set_y"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("set y to");
      this.appendValueInput("Y").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_y"] = (b, gen) => {
    const v = gen.valueToCode(b, "Y", 0) || "0";
    return `sprite_setY(${v});\n`;
  };

  Blockly.Blocks["scratch_bounce"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput()
          .appendField("if on edge, bounce");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bounce"] = () => `sprite_bounce();\n`;

  // Set rotation style
  Blockly.Blocks["scratch_set_rotation_style"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput()
          .appendField("set rotation style")
          .appendField(new Blockly.FieldDropdown([
            ["left-right","left-right"],
            ["up-down","up-down"],
            ["any","any"],
            ["none","none"]
          ]), "STYLE");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_rotation_style"] = b =>
    `sprite_setRotationStyle(${JSON.stringify(b.getFieldValue("STYLE"))});\n`;

  // ── PHYSICS BLOCKS ──

  // Set gravity
  Blockly.Blocks["scratch_set_gravity"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendValueInput("G").setCheck(null).appendField("set gravity to");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_gravity"] = function(b) {
    var g = gen.valueToCode(b, "G", 0) || "9.8";
    return `sprite_setGravity(${g});\n`;
  };

  // Set velocity x
  Blockly.Blocks["scratch_set_velocity_x"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendValueInput("VX").setCheck(null).appendField("set x velocity to");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_velocity_x"] = function(b) {
    var v = gen.valueToCode(b, "VX", 0) || "0";
    return `sprite_setVelocityX(${v});\n`;
  };

  // Set velocity y
  Blockly.Blocks["scratch_set_velocity_y"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendValueInput("VY").setCheck(null).appendField("set y velocity to");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_velocity_y"] = function(b) {
    var v = gen.valueToCode(b, "VY", 0) || "0";
    return `sprite_setVelocityY(${v});\n`;
  };

  // Change velocity x
  Blockly.Blocks["scratch_change_velocity_x"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendValueInput("VX").setCheck(null).appendField("change x velocity by");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_change_velocity_x"] = function(b) {
    var v = gen.valueToCode(b, "VX", 0) || "0";
    return `sprite_changeVelocityX(${v});\n`;
  };

  // Change velocity y
  Blockly.Blocks["scratch_change_velocity_y"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendValueInput("VY").setCheck(null).appendField("change y velocity by");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_change_velocity_y"] = function(b) {
    var v = gen.valueToCode(b, "VY", 0) || "0";
    return `sprite_changeVelocityY(${v});\n`;
  };

  // Set static
  Blockly.Blocks["scratch_set_static"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput()
        .appendField("set static")
        .appendField(new Blockly.FieldDropdown([["on","true"],["off","false"]]), "VAL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_static"] = function(b) {
    var v = b.getFieldValue("VAL");
    return `sprite_setStatic(${v});\n`;
  };

  // Velocity X reporter
  Blockly.Blocks["scratch_velocity_x"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("x velocity");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_velocity_x"] = () => [`sprite_velocityX()`, 0];

  // Velocity Y reporter
  Blockly.Blocks["scratch_velocity_y"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("y velocity");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_velocity_y"] = () => [`sprite_velocityY()`, 0];

  // x position reporter
  Blockly.Blocks["scratch_x_pos"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("x position");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_x_pos"] = () => [`_getSprite().x`, 0];

  // y position reporter
  Blockly.Blocks["scratch_y_pos"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("y position");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_y_pos"] = () => [`_getSprite().y`, 0];

  // direction reporter
  Blockly.Blocks["scratch_direction"] = {
    init() {
      this.setColour(C.MOTION);
      this.appendDummyInput().appendField("direction");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_direction"] = () => [`_getSprite().dir`, 0];

  // ═══════════════ LOOKS BLOCKS ═══════════════

  Blockly.Blocks["scratch_say"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("say");
      this.appendValueInput("MSG").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_say"] = (b, gen) => {
    const msg = gen.valueToCode(b, "MSG", 0) || JSON.stringify("Hello!");
    return `sprite_say(${msg});\n`;
  };

  Blockly.Blocks["scratch_say_for"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("say");
      this.appendValueInput("MSG").setCheck(null);
      this.appendDummyInput().appendField("for");
      this.appendValueInput("SECS").setCheck(null);
      this.appendDummyInput().appendField("secs");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_say_for"] = (b, gen) => {
    const msg = gen.valueToCode(b, "MSG", 0) || JSON.stringify("Hello!");
    const s = gen.valueToCode(b, "SECS", 0) || "2";
    return `await sprite_sayFor(${msg},${s});\n`;
  };

  Blockly.Blocks["scratch_think"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("think");
      this.appendValueInput("MSG").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_think"] = (b, gen) => {
    const msg = gen.valueToCode(b, "MSG", 0) || JSON.stringify("Hmm...");
    return `sprite_think(${msg});\n`;
  };

  Blockly.Blocks["scratch_show"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("show");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_show"] = () => `sprite_show();\n`;

  Blockly.Blocks["scratch_hide"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("hide");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_hide"] = () => `sprite_hide();\n`;

  Blockly.Blocks["scratch_change_size"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("change size by");
      this.appendValueInput("CHANGE").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_change_size"] = (b, gen) => {
    const v = gen.valueToCode(b, "CHANGE", 0) || "10";
    return `sprite_changeSizeBy(${v});\n`;
  };

  Blockly.Blocks["scratch_set_size"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("set size to");
      this.appendValueInput("SIZE").setCheck(null);
      this.appendDummyInput().appendField("%");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_size"] = (b, gen) => {
    const v = gen.valueToCode(b, "SIZE", 0) || "100";
    return `sprite_setSize(${v});\n`;
  };

  // Scale X/Y/Z
  Blockly.Blocks["scratch_set_scale_x"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("set scale x to");
      this.appendValueInput("VAL").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_scale_x"] = (b, gen) => {
    const v = gen.valueToCode(b, "VAL", 0) || "100";
    return `sprite_setScaleX(${v});\n`;
  };

  Blockly.Blocks["scratch_set_scale_y"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("set scale y to");
      this.appendValueInput("VAL").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_scale_y"] = (b, gen) => {
    const v = gen.valueToCode(b, "VAL", 0) || "100";
    return `sprite_setScaleY(${v});\n`;
  };

  Blockly.Blocks["scratch_set_scale_z"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("set scale z to");
      this.appendValueInput("VAL").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_scale_z"] = (b, gen) => {
    const v = gen.valueToCode(b, "VAL", 0) || "100";
    return `sprite_setScaleZ(${v});\n`;
  };

  Blockly.Blocks["scratch_go_front"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("go to front");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_go_front"] = () => `sprite_goFront();\n`;

  Blockly.Blocks["scratch_go_back"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("go back");
      this.appendValueInput("N").setCheck(null);
      this.appendDummyInput().appendField("layers");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_go_back"] = (b, gen) => {
    const v = gen.valueToCode(b, "N", 0) || "1";
    return `sprite_goBack(${v});\n`;
  };

  // Camera follow
  Blockly.Blocks["scratch_camera_follow"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("camera follow this sprite");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_camera_follow"] = () =>
    `sprite_cameraFollow();\n`;

  // Previous costume
  Blockly.Blocks["scratch_prev_costume"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("previous costume");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_prev_costume"] = () =>
    `sprite_prevCostume();\n`;

  // Next costume
  Blockly.Blocks["scratch_next_costume"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("next costume");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_next_costume"] = () =>
    `sprite_nextCostume();\n`;

  // Switch costume to #
  Blockly.Blocks["scratch_switch_costume"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("switch to costume #");
      this.appendValueInput("NUM").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_switch_costume"] = (b, gen) => {
    const v = gen.valueToCode(b, "NUM", 0) || "1";
    return `sprite_switchCostume(${v});\n`;
  };

  // Set background color
  Blockly.Blocks["scratch_set_bg_color"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput()
          .appendField("set background color to")
          .appendField(new SafeFieldColour("#ffffff"), "COL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_bg_color"] = b =>
    `_bgColor=${JSON.stringify(b.getFieldValue("COL"))};\n`;

  // Set background image
  Blockly.Blocks["scratch_set_bg_image"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput()
          .appendField("set background image to")
          .appendField(new Blockly.FieldTextInput("url or costume"), "SRC");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_bg_image"] = b =>
    `sprite_setBgImage(${JSON.stringify(b.getFieldValue("SRC"))});\n`;

  // Draw on background
  Blockly.Blocks["scratch_draw_on_bg"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("stamp sprite on background");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_draw_on_bg"] = () =>
    `sprite_drawOnBg();\n`;

  // Costume # reporter
  Blockly.Blocks["scratch_costume_number"] = {
    init() {
      this.setColour(C.LOOKS);
      this.appendDummyInput().appendField("costume #");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_costume_number"] = () =>
    [`(_getSprite().currentCostume+1)`, 0];

  // ═══════════════ SOUND BLOCKS ═══════════════

  Blockly.Blocks["scratch_play_sound"] = {
    init() {
      this.setColour(C.SOUND);
      this.appendDummyInput()
          .appendField("play sound")
          .appendField(new Blockly.FieldTextInput("meow"), "SOUND");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_play_sound"] = b =>
    `sound_play(${JSON.stringify(b.getFieldValue("SOUND"))});\n`;

  Blockly.Blocks["scratch_play_sound_until_done"] = {
    init() {
      this.setColour(C.SOUND);
      this.appendDummyInput()
          .appendField("play sound")
          .appendField(new Blockly.FieldTextInput("meow"), "SOUND")
          .appendField("until done");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_play_sound_until_done"] = b =>
    `await sound_playUntilDone(${JSON.stringify(b.getFieldValue("SOUND"))});\n`;

  Blockly.Blocks["scratch_stop_sounds"] = {
    init() {
      this.setColour(C.SOUND);
      this.appendDummyInput().appendField("stop all sounds");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_stop_sounds"] = () => `sound_stopAll();\n`;

  Blockly.Blocks["scratch_play_uploaded_sound"] = {
    init() {
      this.setColour(C.SOUND);
      this.appendDummyInput().appendField("play uploaded sound #");
      this.appendValueInput("SLOT").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_play_uploaded_sound"] = (b, gen) => {
    const v = gen.valueToCode(b, "SLOT", 0) || "1";
    return `sound_playSlot(${v});\n`;
  };

  // Change volume
  Blockly.Blocks["scratch_change_volume"] = {
    init() {
      this.setColour(C.SOUND);
      this.appendDummyInput().appendField("change volume by");
      this.appendValueInput("VOL").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_change_volume"] = (b, gen) => {
    const v = gen.valueToCode(b, "VOL", 0) || "-10";
    return `_volume=Math.max(0,Math.min(100,_volume+(${v})));\n`;
  };

  Blockly.Blocks["scratch_set_volume"] = {
    init() {
      this.setColour(C.SOUND);
      this.appendDummyInput().appendField("set volume to");
      this.appendValueInput("VOL").setCheck(null);
      this.appendDummyInput().appendField("%");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_volume"] = (b, gen) => {
    const v = gen.valueToCode(b, "VOL", 0) || "100";
    return `_volume=Math.max(0,Math.min(100,${v}));\n`;
  };

  // ═══════════════ EVENT HAT BLOCKS ═══════════════

  Blockly.Blocks["scratch_when_flag"] = {
    init() {
      this.setStyle("events_blocks");
      this.appendDummyInput()
          .appendField(new Blockly.FieldImage("assets/green_flag.png", 18, 18, "flag"))
          .appendField("when green flag clicked");
      this.setNextStatement(true);
      this.setTooltip("Runs when the green flag is clicked.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_when_flag"] = () => ``;

  Blockly.Blocks["scratch_when_key"] = {
    init() {
      this.setStyle("events_blocks");
      this.appendDummyInput()
          .appendField("when")
          .appendField(new Blockly.FieldDropdown(ALL_KEYS), "KEY")
          .appendField("key pressed");
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_when_key"] = () => ``;

  Blockly.Blocks["scratch_when_clicked"] = {
    init() {
      this.setStyle("events_blocks");
      this.appendDummyInput()
          .appendField("when this sprite clicked");
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_when_clicked"] = () => ``;

  // Broadcast message
  Blockly.Blocks["scratch_broadcast"] = {
    init() {
      this.setColour(C.EVENTS);
      this.appendDummyInput()
          .appendField("broadcast")
          .appendField(new Blockly.FieldTextInput("message1"), "MSG");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_broadcast"] = b =>
    `sc_broadcast(${JSON.stringify(b.getFieldValue("MSG"))});\n`;

  // Broadcast and wait
  Blockly.Blocks["scratch_broadcast_wait"] = {
    init() {
      this.setColour(C.EVENTS);
      this.appendDummyInput()
          .appendField("broadcast")
          .appendField(new Blockly.FieldTextInput("message1"), "MSG")
          .appendField("and wait");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_broadcast_wait"] = b =>
    `await sc_broadcastWait(${JSON.stringify(b.getFieldValue("MSG"))});\n`;

  // When I receive
  Blockly.Blocks["scratch_when_receive"] = {
    init() {
      this.setStyle("events_blocks");
      this.appendDummyInput()
          .appendField("when I receive")
          .appendField(new Blockly.FieldTextInput("message1"), "MSG");
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_when_receive"] = () => ``;

  // ═══════════════ CONTROL BLOCKS ═══════════════

  Blockly.Blocks["scratch_wait"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendDummyInput().appendField("wait");
      this.appendValueInput("SECS").setCheck(null);
      this.appendDummyInput().appendField("secs");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_wait"] = (b, gen) => {
    const v = gen.valueToCode(b, "SECS", 0) || "1";
    return `await sc_wait(${v});\n`;
  };

  Blockly.Blocks["scratch_repeat"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendDummyInput().appendField("repeat");
      this.appendValueInput("TIMES").setCheck(null);
      this.appendStatementInput("DO").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_repeat"] = (b, gen) => {
    const n   = gen.valueToCode(b, "TIMES", 0) || "10";
    const body = gen.statementToCode(b, "DO");
    return `for(let _i=0;_i<${n};_i++){if(_stopFlag)break;\n${body}await sc_yield();}\n`;
  };

  Blockly.Blocks["scratch_forever"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendDummyInput().appendField("forever");
      this.appendStatementInput("DO").setCheck(null);
      this.setPreviousStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_forever"] = (b, gen) => {
    const body = gen.statementToCode(b, "DO");
    return `while(!_stopFlag){\n${body}await sc_yield();}\n`;
  };

  // Forever if — runs body on each frame only when condition is true
  Blockly.Blocks["scratch_forever_if"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendValueInput("COND")
          .setCheck("Boolean")
          .appendField("forever if");
      this.appendStatementInput("DO").setCheck(null);
      this.setPreviousStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_forever_if"] = (b, gen) => {
    const cond = gen.valueToCode(b, "COND", 0) || "false";
    const body = gen.statementToCode(b, "DO");
    return `while(!_stopFlag){if(${cond}){\n${body}}await sc_yield();}\n`;
  };

  Blockly.Blocks["scratch_if"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendDummyInput().appendField("if");
      this.appendValueInput("COND").setCheck("Boolean");
      this.appendDummyInput().appendField("then");
      this.setInputsInline(true);
      this.appendStatementInput("DO").setCheck(null);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_if"] = (b, gen) => {
    const cond = gen.valueToCode(b, "COND", 0) || "false";
    const body = gen.statementToCode(b, "DO");
    return `if(${cond}){\n${body}}\n`;
  };

  Blockly.Blocks["scratch_if_else"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendDummyInput().appendField("if");
      this.appendValueInput("COND").setCheck("Boolean");
      this.appendDummyInput().appendField("then");
      this.setInputsInline(true);
      this.appendStatementInput("DO").setCheck(null);
      this.appendStatementInput("ELSE").setCheck(null).appendField("else");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_if_else"] = (b, gen) => {
    const cond  = gen.valueToCode(b, "COND", 0) || "false";
    const body  = gen.statementToCode(b, "DO");
    const other = gen.statementToCode(b, "ELSE");
    return `if(${cond}){\n${body}}else{\n${other}}\n`;
  };

  // Repeat until
  Blockly.Blocks["scratch_repeat_until"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendValueInput("COND").setCheck("Boolean").appendField("repeat until");
      this.appendStatementInput("DO").setCheck(null);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_repeat_until"] = (b, gen) => {
    const cond = gen.valueToCode(b, "COND", 0) || "true";
    const body = gen.statementToCode(b, "DO");
    return `while(!(${cond})&&!_stopFlag){\n${body}await sc_yield();}\n`;
  };

  // Wait until
  Blockly.Blocks["scratch_wait_until"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendValueInput("COND").setCheck("Boolean").appendField("wait until");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_wait_until"] = (b, gen) => {
    const cond = gen.valueToCode(b, "COND", 0) || "true";
    return `while(!(${cond})&&!_stopFlag){await sc_yield();}\n`;
  };

  Blockly.Blocks["scratch_stop_this"] = {
    init() {
      this.setColour(C.CONTROL);
      this.appendDummyInput()
          .appendField("stop")
          .appendField(new Blockly.FieldDropdown([
            ["this script","this"],
            ["all","all"],
            ["other scripts","other"]
          ]), "STOP");
      this.setPreviousStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_stop_this"] = b => {
    const v = b.getFieldValue("STOP");
    if (v === "all")  return `_stopFlag=true;sc_stopAll();\n`;
    return `throw "stop";\n`;
  };

  // ═══════════════ SENSING BLOCKS ═══════════════

  Blockly.Blocks["scratch_key_pressed"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("key")
          .appendField(new Blockly.FieldDropdown(ALL_KEYS), "KEY")
          .appendField("pressed?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_key_pressed"] = b =>
    [`sc_keyPressed(${JSON.stringify(b.getFieldValue("KEY"))})`, 0];

  Blockly.Blocks["scratch_mouse_down"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("mouse down?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_mouse_down"] = () => [`sc_mouseDown()`, 0];

  // Mouse up? (opposite of mouse down)
  Blockly.Blocks["scratch_mouse_up"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("mouse up?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_mouse_up"] = () => [`(!sc_mouseDown())`, 0];

  // Is loud? (microphone level check)
  Blockly.Blocks["scratch_is_loud"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("is loud?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_is_loud"] = () => [`sc_isLoud()`, 0];

  Blockly.Blocks["scratch_ask"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("ask")
          .appendField(new Blockly.FieldTextInput("What's your name?"), "Q")
          .appendField("and wait");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_ask"] = b =>
    `await sc_ask(${JSON.stringify(b.getFieldValue("Q"))});\n`;

  Blockly.Blocks["scratch_answer"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("answer");
      this.setOutput(true, "String");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_answer"] = () => [`_answer`, 0];

  Blockly.Blocks["scratch_timer"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("timer");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_timer"] = () => [`sc_timer()`, 0];

  Blockly.Blocks["scratch_reset_timer"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("reset timer");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_reset_timer"] = () => `sc_resetTimer();\n`;

  // Mouse x/y reporters
  Blockly.Blocks["scratch_mouse_x"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("mouse x");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_mouse_x"] = () => [`sc_mouseX()`, 0];

  Blockly.Blocks["scratch_mouse_y"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("mouse y");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_mouse_y"] = () => [`sc_mouseY()`, 0];

  // Touching edge
  Blockly.Blocks["scratch_touching_edge"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("touching edge?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_touching_edge"] = () => [`sc_touchingEdge()`, 0];

  // Distance to mouse
  Blockly.Blocks["scratch_distance_to"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("distance to")
          .appendField(new Blockly.FieldDropdown([["mouse","mouse"]]), "TO");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_distance_to"] = () => [`sc_distanceTo()`, 0];

  // Set drag mode
  Blockly.Blocks["scratch_set_drag_mode"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("set drag mode to")
          .appendField(new Blockly.FieldDropdown([["true","true"],["false","false"]]), "MODE");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_set_drag_mode"] = b =>
    `sprite_setDragMode(${b.getFieldValue("MODE")});\n`;

  // ═══════════════ OPERATOR BLOCKS ═══════════════

  function mathOp(type, sym) {
    Blockly.Blocks[type] = {
      init() {
        this.setColour(C.OPERATOR);
        this.appendValueInput("A").setCheck(null);
        this.appendDummyInput().appendField(sym);
        this.appendValueInput("B").setCheck(null);
        this.setInputsInline(true);
        this.setOutput(true, "Number");
      }
    };
    javascript.javascriptGenerator.forBlock[type] = (b, gen) => {
      const a = gen.valueToCode(b, "A", 0) || "0";
      const bv = gen.valueToCode(b, "B", 0) || "0";
      return [`(${a}${sym}${bv})`, 0];
    };
  }
  mathOp("scratch_add",      "+");
  mathOp("scratch_subtract", "-");
  mathOp("scratch_multiply", "*");
  mathOp("scratch_divide",   "/");

  // Modulo
  Blockly.Blocks["scratch_mod"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendValueInput("A").setCheck(null);
      this.appendDummyInput().appendField("mod");
      this.appendValueInput("B").setCheck(null);
      this.setInputsInline(true);
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_mod"] = (b, gen) => {
    const a = gen.valueToCode(b, "A", 0) || "0";
    const bv = gen.valueToCode(b, "B", 0) || "1";
    return [`(${a}%${bv})`, 0];
  };

  // Round
  Blockly.Blocks["scratch_round"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendValueInput("NUM").setCheck(null).appendField("round");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_round"] = (b, gen) => {
    const n = gen.valueToCode(b, "NUM", 0) || "0";
    return [`Math.round(${n})`, 0];
  };

  // Math functions (abs, floor, ceil, sqrt, sin, cos, tan, ln, log, e^, 10^)
  Blockly.Blocks["scratch_mathop"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendValueInput("NUM").setCheck(null).appendField(
        new Blockly.FieldDropdown([
          ["abs","abs"],["floor","floor"],["ceiling","ceil"],
          ["sqrt","sqrt"],["sin","sin"],["cos","cos"],["tan","tan"],
          ["ln","log"],["log","log10"],["e ^","exp"],["10 ^","pow10"]
        ]), "OP"
      ).appendField("of");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_mathop"] = (b, gen) => {
    const n = gen.valueToCode(b, "NUM", 0) || "0";
    const op = b.getFieldValue("OP");
    const map = {abs:"Math.abs",floor:"Math.floor",ceil:"Math.ceil",sqrt:"Math.sqrt",
      sin:"Math.sin",cos:"Math.cos",tan:"Math.tan",log:"Math.log",log10:"Math.log10",
      exp:"Math.exp",pow10:"(x=>Math.pow(10,x))"};
    const fn = map[op] || "Math.abs";
    return [`${fn}(${n})`, 0];
  };

  Blockly.Blocks["scratch_random"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendDummyInput()
          .appendField("pick random")
          .appendField(new Blockly.FieldNumber(1), "FROM")
          .appendField("to")
          .appendField(new Blockly.FieldNumber(10), "TO");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_random"] = b => {
    const lo = +b.getFieldValue("FROM"), hi = +b.getFieldValue("TO");
    return [`Math.floor(Math.random()*(${hi}-${lo}+1))+${lo}`, 0];
  };

  function cmpOp(type, sym) {
    Blockly.Blocks[type] = {
      init() {
        this.setColour(C.OPERATOR);
        this.appendValueInput("A");
        this.appendDummyInput().appendField(sym);
        this.appendValueInput("B");
        this.setInputsInline(true);
        this.setOutput(true, "Boolean");
      }
    };
    javascript.javascriptGenerator.forBlock[type] = (b, gen) => {
      const a = gen.valueToCode(b, "A", 0) || "0";
      const bv = gen.valueToCode(b, "B", 0) || "0";
      return [`(${a}${sym}${bv})`, 0];
    };
  }
  cmpOp("scratch_less_than",    "<");
  cmpOp("scratch_equals",       "==");
  cmpOp("scratch_greater_than", ">");

  Blockly.Blocks["scratch_and"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendValueInput("A").setCheck("Boolean");
      this.appendDummyInput().appendField("and");
      this.appendValueInput("B").setCheck("Boolean");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_and"] = (b, gen) => {
    const a = gen.valueToCode(b,"A",0)||"false";
    const bv= gen.valueToCode(b,"B",0)||"false";
    return [`(${a}&&${bv})`,0];
  };

  Blockly.Blocks["scratch_or"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendValueInput("A").setCheck("Boolean");
      this.appendDummyInput().appendField("or");
      this.appendValueInput("B").setCheck("Boolean");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_or"] = (b, gen) => {
    const a = gen.valueToCode(b,"A",0)||"false";
    const bv= gen.valueToCode(b,"B",0)||"false";
    return [`(${a}||${bv})`,0];
  };

  Blockly.Blocks["scratch_not"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendValueInput("A").setCheck("Boolean");
      this.appendDummyInput().appendField("not");
      this.appendValueInput("B").setCheck("Boolean");
      this.setInputsInline(true);
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_not"] = (b, gen) => {
    const a = gen.valueToCode(b,"A",0)||"false";
    // B input is visual only (hexagonal shape like 'or'), not used in logic
    return [`(!${a})`,0];
  };

  Blockly.Blocks["scratch_join"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendDummyInput().appendField("join");
      this.appendValueInput("A");
      this.appendValueInput("B");
      this.setInputsInline(true);
      this.setOutput(true, "String");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_join"] = (b, gen) => {
    const a = gen.valueToCode(b,"A",0)||'""';
    const bv= gen.valueToCode(b,"B",0)||'""';
    return [`(String(${a})+String(${bv}))`,0];
  };

  // Letter of
  Blockly.Blocks["scratch_letter_of"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendDummyInput()
          .appendField("letter")
          .appendField(new Blockly.FieldNumber(1, 1), "IDX")
          .appendField("of")
          .appendField(new Blockly.FieldTextInput("world"), "STR");
      this.setOutput(true, "String");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_letter_of"] = b => {
    return [`(${JSON.stringify(b.getFieldValue("STR"))}).charAt(${b.getFieldValue("IDX")}-1)`, 0];
  };

  // Length of
  Blockly.Blocks["scratch_length"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendDummyInput()
          .appendField("length of")
          .appendField(new Blockly.FieldTextInput("world"), "STR");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_length"] = b => {
    return [`(${JSON.stringify(b.getFieldValue("STR"))}).length`, 0];
  };

  // ═══════════════ PEN BLOCKS ═══════════════

  Blockly.Blocks["scratch_pen_clear"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("clear");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_clear"] = () => `pen_clear();\n`;

  Blockly.Blocks["scratch_pen_down"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("pen down");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_down"] = () => `pen_down();\n`;

  Blockly.Blocks["scratch_pen_up"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("pen up");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_up"] = () => `pen_up();\n`;

  Blockly.Blocks["scratch_pen_set_color"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput()
          .appendField("set pen color to")
          .appendField(new SafeFieldColour("#ff0000"), "COL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_set_color"] = b =>
    `pen_setColor(${JSON.stringify(b.getFieldValue("COL"))});\n`;

  Blockly.Blocks["scratch_pen_change_size"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("change pen size by");
      this.appendValueInput("N").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_change_size"] = (b, gen) => {
    const v = gen.valueToCode(b, "N", 0) || "1";
    return `pen_changeSize(${v});\n`;
  };

  Blockly.Blocks["scratch_pen_set_size"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("set pen size to");
      this.appendValueInput("N").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_set_size"] = (b, gen) => {
    const v = gen.valueToCode(b, "N", 0) || "1";
    return `pen_setSize(${v});\n`;
  };

  Blockly.Blocks["scratch_stamp"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("stamp");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_stamp"] = () => `pen_stamp();\n`;

  Blockly.Blocks["scratch_pen_draw_line"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("draw line to x:");
      this.appendValueInput("X").setCheck(null);
      this.appendDummyInput().appendField("y:");
      this.appendValueInput("Y").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_draw_line"] = (b, gen) => {
    const x = gen.valueToCode(b, "X", 0) || "100";
    const y = gen.valueToCode(b, "Y", 0) || "100";
    return `pen_drawLine(${x},${y});\n`;
  };

  Blockly.Blocks["scratch_pen_draw_rect"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("draw rectangle w:");
      this.appendValueInput("W").setCheck(null);
      this.appendDummyInput().appendField("h:");
      this.appendValueInput("H").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_draw_rect"] = (b, gen) => {
    const w = gen.valueToCode(b, "W", 0) || "50";
    const h = gen.valueToCode(b, "H", 0) || "50";
    return `pen_drawRect(${w},${h});\n`;
  };

  Blockly.Blocks["scratch_pen_draw_circle"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("draw circle radius:");
      this.appendValueInput("R").setCheck(null);
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_draw_circle"] = (b, gen) => {
    const r = gen.valueToCode(b, "R", 0) || "25";
    return `pen_drawCircle(${r});\n`;
  };

  // Erase all
  Blockly.Blocks["scratch_pen_erase_all"] = {
    init() {
      this.setColour(C.PEN);
      this.appendDummyInput().appendField("erase all");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_pen_erase_all"] = () => `pen_clear();\n`;

  // ═══════════════ LOG BLOCKS ═══════════════

  Blockly.Blocks["scratch_log"] = {
    init() {
      this.setColour(C.LOG);
      this.appendDummyInput()
          .appendField("log")
          .appendField(new Blockly.FieldTextInput("hello"), "MSG");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_log"] = b =>
    `console.log(${JSON.stringify(b.getFieldValue("MSG"))});\n`;

  Blockly.Blocks["scratch_log_value"] = {
    init() {
      this.setColour(C.LOG);
      this.appendValueInput("VAL").appendField("log value");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_log_value"] = (b, gen) => {
    const v = gen.valueToCode(b, "VAL", 0) || '""';
    return `console.log(${v});\n`;
  };

  // ═══════════════ BOOLEAN BLOCKS (now in SENSING) ═══════════════

  Blockly.Blocks["scratch_bool_key_pressed"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("key")
          .appendField(new Blockly.FieldDropdown(ALL_KEYS), "KEY")
          .appendField("pressed?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bool_key_pressed"] = b =>
    [`sc_keyPressed(${JSON.stringify(b.getFieldValue("KEY"))})`, 0];

  Blockly.Blocks["scratch_bool_touching_sprite"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("touching")
          .appendField(new Blockly.FieldDropdown(_spritesDropdown()), "NAME")
          .appendField("?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bool_touching_sprite"] = b =>
    [`sc_touchingSprite(${JSON.stringify(b.getFieldValue("NAME"))})`, 0];

  Blockly.Blocks["scratch_bool_received_msg"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("received message")
          .appendField(new Blockly.FieldTextInput("message1"), "MSG")
          .appendField("?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bool_received_msg"] = b =>
    [`sc_receivedMessage(${JSON.stringify(b.getFieldValue("MSG"))})`, 0];

  Blockly.Blocks["scratch_bool_mouse_down"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("mouse down?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bool_mouse_down"] = () =>
    [`sc_mouseDown()`, 0];

  Blockly.Blocks["scratch_bool_sprite_clicked"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput().appendField("sprite clicked?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bool_sprite_clicked"] = () =>
    [`sc_spriteClicked()`, 0];

  Blockly.Blocks["scratch_bool_touching_color"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("touching color")
          .appendField(new SafeFieldColour("#ff0000"), "COL")
          .appendField("?");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bool_touching_color"] = b =>
    [`sc_touchingColor(${JSON.stringify(b.getFieldValue("COL"))})`, 0];

  Blockly.Blocks["scratch_bool_less_than_fps"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("FPS <")
          .appendField(new Blockly.FieldNumber(30), "N");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bool_less_than_fps"] = b =>
    [`(_currentFPS<${b.getFieldValue("N")})`, 0];

  Blockly.Blocks["scratch_bool_more_than_fps"] = {
    init() {
      this.setColour(C.SENSING);
      this.appendDummyInput()
          .appendField("FPS >")
          .appendField(new Blockly.FieldNumber(30), "N");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_bool_more_than_fps"] = b =>
    [`(_currentFPS>${b.getFieldValue("N")})`, 0];

  // ═══════════════ TRUE / FALSE BOOLEANS ═══════════════
  Blockly.Blocks["scratch_true"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendDummyInput().appendField("true");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_true"] = () => [`true`, 0];

  Blockly.Blocks["scratch_false"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendDummyInput().appendField("false");
      this.setOutput(true, "Boolean");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_false"] = () => [`false`, 0];

  // Editable number reporter (boolean-shaped number you can type)
  Blockly.Blocks["scratch_number"] = {
    init() {
      this.setColour(C.OPERATOR);
      this.appendDummyInput()
          .appendField(new Blockly.FieldNumber(0), "NUM");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_number"] = b =>
    [String(b.getFieldValue("NUM")), 0];

  // ═══════════════ LIBRARY BLOCKS ═══════════════

  // 1. Simple Player Controls
  Blockly.Blocks["scratch_lib_player_controls"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("simple player controls  speed:")
          .appendField(new Blockly.FieldNumber(3, 1, 50), "SPEED");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Arrow keys & WASD to move this sprite.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_player_controls"] = b => {
    const spd = b.getFieldValue("SPEED");
    return `if(_keysDown["ArrowLeft"]||_keysDown["Left"]||_keysDown["a"])sprite_changeX(-${spd});\n` +
      `if(_keysDown["ArrowRight"]||_keysDown["Right"]||_keysDown["d"])sprite_changeX(${spd});\n` +
      `if(_keysDown["ArrowUp"]||_keysDown["Up"]||_keysDown["w"])sprite_changeY(${spd * 4});\n` +
      `if(_keysDown["ArrowDown"]||_keysDown["Down"]||_keysDown["s"])sprite_changeY(-${spd});\n` +
      `sprite_bounce();\n`;
  };

  // 2. Move Platform Left-Right
  Blockly.Blocks["scratch_lib_platform_lr"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("platform left-right  range:")
          .appendField(new Blockly.FieldNumber(100, 1), "RANGE")
          .appendField("speed:")
          .appendField(new Blockly.FieldNumber(2, 1, 50), "SPEED");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Moves this sprite back and forth horizontally.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_platform_lr"] = b => {
    const range = b.getFieldValue("RANGE");
    const speed = b.getFieldValue("SPEED");
    return `if(typeof _plLR==="undefined"){_plLR={sx:_getSprite().x,d:1};}\n` +
      `var _s=_getSprite();_s.x+=_plLR.d*${speed};\n` +
      `if(_s.x>=_plLR.sx+${range})_plLR.d=-1;\n` +
      `if(_s.x<=_plLR.sx-${range})_plLR.d=1;\n`;
  };

  // 3. Move Platform Up-Down
  Blockly.Blocks["scratch_lib_platform_ud"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("platform up-down  range:")
          .appendField(new Blockly.FieldNumber(80, 1), "RANGE")
          .appendField("speed:")
          .appendField(new Blockly.FieldNumber(2, 1, 50), "SPEED");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Moves this sprite back and forth vertically.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_platform_ud"] = b => {
    const range = b.getFieldValue("RANGE");
    const speed = b.getFieldValue("SPEED");
    return `if(typeof _plUD==="undefined"){_plUD={sy:_getSprite().y,d:1};}\n` +
      `var _s=_getSprite();_s.y+=_plUD.d*${speed};\n` +
      `if(_s.y>=_plUD.sy+${range})_plUD.d=-1;\n` +
      `if(_s.y<=_plUD.sy-${range})_plUD.d=1;\n`;
  };

  // 4. AI Chase Object (dynamic sprite dropdown)
  Blockly.Blocks["scratch_lib_ai_chase"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("AI chase")
          .appendField(new Blockly.FieldDropdown(_spritesDropdown()), "TARGET")
          .appendField("speed:")
          .appendField(new Blockly.FieldNumber(2, 1, 50), "SPEED");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("This sprite chases the selected target sprite.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_ai_chase"] = b => {
    const target = b.getFieldValue("TARGET");
    const speed  = b.getFieldValue("SPEED");
    if (target === "_mouse_") {
      return `(function(){var _s=_getSprite();if(_s){var _dx=sc_mouseX()-_s.x,_dy=sc_mouseY()-_s.y,` +
        `_d=Math.sqrt(_dx*_dx+_dy*_dy);` +
        `if(_d>2){_s.x+=_dx/_d*${speed};_s.y+=_dy/_d*${speed};}}})();\n`;
    }
    return `var _t=sprites.find(function(sp){return sp.name===${JSON.stringify(target)};});\n` +
      `if(_t){var _s=_getSprite(),_dx=_t.x-_s.x,_dy=_t.y-_s.y,` +
      `_d=Math.sqrt(_dx*_dx+_dy*_dy);\n` +
      `if(_d>2){_s.x+=_dx/_d*${speed};_s.y+=_dy/_d*${speed};}}\n`;
  };

  // 5. Simple Mobile Controls
  Blockly.Blocks["scratch_lib_mobile_controls"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("show mobile controls  speed:")
          .appendField(new Blockly.FieldNumber(3, 1, 50), "SPEED");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Shows on-screen arrow buttons and moves this sprite.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_mobile_controls"] = b => {
    const spd = b.getFieldValue("SPEED");
    return `lib_showMobileControls();\n` +
      `if(_keysDown["ArrowLeft"]||_keysDown["Left"])sprite_changeX(-${spd});\n` +
      `if(_keysDown["ArrowRight"]||_keysDown["Right"])sprite_changeX(${spd});\n` +
      `if(_keysDown["ArrowUp"]||_keysDown["Up"])sprite_changeY(${spd});\n` +
      `if(_keysDown["ArrowDown"]||_keysDown["Down"])sprite_changeY(-${spd});\n` +
      `sprite_bounce();\n`;
  };

  // 6. Platform Rotate (with collision)
  Blockly.Blocks["scratch_lib_platform_rotate"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("platform rotate  speed:")
          .appendField(new Blockly.FieldNumber(2, -20, 20), "SPEED");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Rotates this sprite and pushes colliding sprites away.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_platform_rotate"] = b => {
    const spd = b.getFieldValue("SPEED");
    return `var _s=_getSprite();\n` +
      `_s.dir=(_s.dir+${spd}+360)%360;\n` +
      `lib_pushCollidingSprites(_s);\n`;
  };

  // 7. Simple Gravity Jump (platformer helper)
  Blockly.Blocks["scratch_lib_gravity_jump"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("gravity jump  power:")
          .appendField(new Blockly.FieldNumber(12, 1, 100), "POWER")
          .appendField("gravity:")
          .appendField(new Blockly.FieldNumber(0.6, 0.1, 10), "GRAV");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Applies gravity + lets sprite jump with UP/W.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_gravity_jump"] = b => {
    const pow = b.getFieldValue("POWER");
    const g   = b.getFieldValue("GRAV");
    return `(function(){var _s=_getSprite();if(!_s)return;\n` +
      `if(typeof _s._vy==="undefined"){_s._vy=0;_s._onGround=false;}\n` +
      `if(_s._onGround){\n` +
      `  _s._vy=0;_s._onGround=false;\n` +
      `  if(_keysDown["ArrowUp"]||_keysDown["Up"]||_keysDown["w"])_s._vy=${pow};\n` +
      `}\n` +
      `_s._vy-=${g}; _s.y+=_s._vy;\n` +
      `if(_s.y<=-120){_s.y=-120;_s._vy=0;_s._onGround=true;\n` +
      `if(_keysDown["ArrowUp"]||_keysDown["Up"]||_keysDown["w"])_s._vy=${pow};}\n` +
      `})();\n`;
  };

  // 8. Simple Health System
  Blockly.Blocks["scratch_lib_health_system"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("❤️ health system  max:")
          .appendField(new Blockly.FieldNumber(100, 1, 9999), "MAX");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Initialize a health variable for this sprite.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_health_system"] = b => {
    const max = b.getFieldValue("MAX");
    return `var _s=_getSprite();if(_s&&typeof _s._hp==="undefined"){_s._hp=${max};_s._hpMax=${max};}\n`;
  };

  // 9. Damage Sprite
  Blockly.Blocks["scratch_lib_damage"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("💥 damage")
          .appendField(new Blockly.FieldDropdown(_spritesDropdown()), "TARGET")
          .appendField("amount:")
          .appendField(new Blockly.FieldNumber(10, 1, 9999), "DMG");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Reduce target sprite's health.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_damage"] = b => {
    const target = b.getFieldValue("TARGET");
    const dmg = b.getFieldValue("DMG");
    return `(function(){var _t=sprites.find(function(sp){return sp.name===${JSON.stringify(target)};});\n` +
      `if(_t&&typeof _t._hp!=="undefined"){_t._hp=Math.max(0,_t._hp-${dmg});\n` +
      `if(_t._hp<=0)_t.visible=false;}})();\n`;
  };

  // 10. Show Health Bar
  Blockly.Blocks["scratch_lib_show_healthbar"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("❤️ show health bar");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Draws a health bar above this sprite.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_show_healthbar"] = () => {
    return `lib_showHealthBar();\n`;
  };

  // 11. Simple Timer
  Blockly.Blocks["scratch_lib_countdown"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("countdown  seconds:")
          .appendField(new Blockly.FieldNumber(30, 1, 9999), "SEC");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Starts a visible countdown timer on stage.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_countdown"] = b => {
    const sec = b.getFieldValue("SEC");
    return `lib_startCountdown(${sec});\n`;
  };

  // 12. Spawn Clone At Position
  Blockly.Blocks["scratch_lib_spawn_at"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("spawn clone at x:")
          .appendField(new Blockly.FieldNumber(0), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "Y");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Spawns a clone of this sprite at the given position.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_spawn_at"] = b => {
    const x = b.getFieldValue("X");
    const y = b.getFieldValue("Y");
    return `lib_spawnCloneAt(${x},${y});\n`;
  };

  // 13. Follow Mouse Smoothly
  Blockly.Blocks["scratch_lib_follow_mouse"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("follow mouse  smoothness:")
          .appendField(new Blockly.FieldNumber(5, 1, 100), "SMOOTH");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Smoothly follows the mouse cursor.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_follow_mouse"] = b => {
    const sm = b.getFieldValue("SMOOTH");
    return `(function(){var _s=_getSprite();if(!_s)return;\n` +
      `_s.x+=( sc_mouseX()-_s.x)/${sm};\n` +
      `_s.y+=( sc_mouseY()-_s.y)/${sm};})();\n`;
  };

  // 14. Camera Shake
  Blockly.Blocks["scratch_lib_camera_shake"] = {
    init() {
      this.setColour(C.LIBRARY);
      this.appendDummyInput()
          .appendField("camera shake  intensity:")
          .appendField(new Blockly.FieldNumber(5, 1, 100), "INT");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Shakes the camera for an impact effect.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_camera_shake"] = b => {
    const inten = b.getFieldValue("INT");
    return `lib_cameraShake(${inten});\n`;
  };

  // 15. Custom / define block (user creates their own reusable block)
  Blockly.Blocks["scratch_lib_define"] = {
    init() {
      this.setColour("#632d99");
      this.appendDummyInput()
          .appendField("define")
          .appendField(new Blockly.FieldTextInput("my block"), "NAME");
      this.appendStatementInput("BODY");
      this.setTooltip("Define a custom reusable block.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_define"] = (b, gen) => {
    const name = b.getFieldValue("NAME").replace(/[^a-zA-Z0-9_]/g, "_");
    const body = gen.statementToCode(b, "BODY");
    return `function _custom_${name}(){${body}}\n`;
  };

  // 16. Call custom block
  Blockly.Blocks["scratch_lib_call"] = {
    init() {
      this.setColour("#632d99");
      this.appendDummyInput()
          .appendField("run")
          .appendField(new Blockly.FieldTextInput("my block"), "NAME");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Run a custom block you defined.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_lib_call"] = b => {
    const name = b.getFieldValue("NAME").replace(/[^a-zA-Z0-9_]/g, "_");
    return `if(typeof _custom_${name}==="function")_custom_${name}();\n`;
  };

  // ═══════════════ FILE BLOCKS ═══════════════

  // Read text from a local variable/store (key-value)
  Blockly.Blocks["scratch_file_read"] = {
    init() {
      this.setColour(C.FILE);
      this.appendDummyInput()
          .appendField("read file")
          .appendField(new Blockly.FieldTextInput("mydata"), "KEY");
      this.setOutput(true, "String");
      this.setTooltip("Read a saved value by key.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_file_read"] = b => {
    const key = JSON.stringify(b.getFieldValue("KEY"));
    return [`(localStorage.getItem(${key})||"")`, 0];
  };

  // Write text to local store
  Blockly.Blocks["scratch_file_write"] = {
    init() {
      this.setColour(C.FILE);
      this.appendDummyInput()
          .appendField("write file")
          .appendField(new Blockly.FieldTextInput("mydata"), "KEY")
          .appendField("value:")
          .appendField(new Blockly.FieldTextInput("hello"), "VAL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Save a value to a key.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_file_write"] = b => {
    const key = JSON.stringify(b.getFieldValue("KEY"));
    const val = JSON.stringify(b.getFieldValue("VAL"));
    return `localStorage.setItem(${key},${val});\n`;
  };

  // Append text to stored value
  Blockly.Blocks["scratch_file_append"] = {
    init() {
      this.setColour(C.FILE);
      this.appendDummyInput()
          .appendField("append to file")
          .appendField(new Blockly.FieldTextInput("mydata"), "KEY")
          .appendField("text:")
          .appendField(new Blockly.FieldTextInput(" more"), "VAL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Append text to a stored value.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_file_append"] = b => {
    const key = JSON.stringify(b.getFieldValue("KEY"));
    const val = JSON.stringify(b.getFieldValue("VAL"));
    return `localStorage.setItem(${key},(localStorage.getItem(${key})||"")+${val});\n`;
  };

  // Download text as file
  Blockly.Blocks["scratch_file_download"] = {
    init() {
      this.setColour(C.FILE);
      this.appendDummyInput()
          .appendField("download as file")
          .appendField(new Blockly.FieldTextInput("output.txt"), "NAME");
      this.appendValueInput("CONTENT").appendField("content:");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Download text content as a file.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_file_download"] = (b, gen) => {
    const name = JSON.stringify(b.getFieldValue("NAME"));
    const content = gen.valueToCode(b, "CONTENT", 0) || '""';
    return `(function(){var _b=new Blob([${content}],{type:"text/plain"});var _a=document.createElement("a");_a.href=URL.createObjectURL(_b);_a.download=${name};_a.click();URL.revokeObjectURL(_a.href);})();\n`;
  };

  // Prompt user for text input
  Blockly.Blocks["scratch_file_prompt_text"] = {
    init() {
      this.setColour(C.FILE);
      this.appendDummyInput()
          .appendField("prompt for text")
          .appendField(new Blockly.FieldTextInput("Enter something:"), "MSG");
      this.setOutput(true, "String");
      this.setTooltip("Ask the user for text input.");
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_file_prompt_text"] = b => {
    const msg = JSON.stringify(b.getFieldValue("MSG"));
    return [`(prompt(${msg})||"")`, 0];
  };

  // ═══════════════ EXTENSION BLOCKS ═══════════════

  const EXT = "#5f60b0"; // extension block colour
  const RENDER3D = "#306998"; // 3D render block colour

  // ── HTML Extension ──
  Blockly.Blocks["ext_html_create_element"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("create HTML")
          .appendField(new Blockly.FieldDropdown([["div","div"],["p","p"],["span","span"],["button","button"],["input","input"],["h1","h1"],["h2","h2"],["img","img"]]), "TAG")
          .appendField("id:")
          .appendField(new Blockly.FieldTextInput("myElem"), "ID");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_create_element"] = b =>
    `ext_htmlCreate(${JSON.stringify(b.getFieldValue("TAG"))},${JSON.stringify(b.getFieldValue("ID"))});\n`;

  // Friendly: Create Title
  Blockly.Blocks["ext_html_create_title"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("\ud83d\udcdd Create Title")
          .appendField(new Blockly.FieldTextInput("My Title"), "TEXT")
          .appendField("id:")
          .appendField(new Blockly.FieldTextInput("title1"), "ID");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_create_title"] = b =>
    `ext_htmlCreateTitle(${JSON.stringify(b.getFieldValue("ID"))},${JSON.stringify(b.getFieldValue("TEXT"))});\n`;

  // Friendly: Create Text
  Blockly.Blocks["ext_html_create_text"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("\ud83d\udcc4 Create Text")
          .appendField(new Blockly.FieldTextInput("Hello World"), "TEXT")
          .appendField("at x:")
          .appendField(new Blockly.FieldNumber(10), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(40), "Y")
          .appendField("id:")
          .appendField(new Blockly.FieldTextInput("text1"), "ID");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_create_text"] = b =>
    `ext_htmlCreateText(${JSON.stringify(b.getFieldValue("ID"))},${JSON.stringify(b.getFieldValue("TEXT"))},${b.getFieldValue("X")},${b.getFieldValue("Y")});\n`;

  // Friendly: Create Button
  Blockly.Blocks["ext_html_create_button"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("\ud83d\udd18 Create Button")
          .appendField(new Blockly.FieldTextInput("Click Me"), "TEXT")
          .appendField("id:")
          .appendField(new Blockly.FieldTextInput("btn1"), "ID");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_create_button"] = b =>
    `ext_htmlCreateButton(${JSON.stringify(b.getFieldValue("ID"))},${JSON.stringify(b.getFieldValue("TEXT"))});\n`;

  // Friendly: Show Costume Image
  Blockly.Blocks["ext_html_show_costume"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("\ud83d\uddbc\ufe0f Show costume image #")
          .appendField(new Blockly.FieldNumber(1, 1), "NUM")
          .appendField("at x:")
          .appendField(new Blockly.FieldNumber(10), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(10), "Y")
          .appendField("id:")
          .appendField(new Blockly.FieldTextInput("img1"), "ID");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_show_costume"] = b =>
    `ext_htmlShowCostume(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("NUM")},${b.getFieldValue("X")},${b.getFieldValue("Y")});\n`;

  Blockly.Blocks["ext_html_set_text"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("set text of")
          .appendField(new Blockly.FieldTextInput("myElem"), "ID")
          .appendField("to")
          .appendField(new Blockly.FieldTextInput("Hello"), "TEXT");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_set_text"] = b =>
    `ext_htmlSetText(${JSON.stringify(b.getFieldValue("ID"))},${JSON.stringify(b.getFieldValue("TEXT"))});\n`;

  Blockly.Blocks["ext_html_set_style"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("set style of")
          .appendField(new Blockly.FieldTextInput("myElem"), "ID")
          .appendField("to")
          .appendField(new Blockly.FieldTextInput("color:red;font-size:20px"), "CSS");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_set_style"] = b =>
    `ext_htmlSetStyle(${JSON.stringify(b.getFieldValue("ID"))},${JSON.stringify(b.getFieldValue("CSS"))});\n`;

  Blockly.Blocks["ext_html_remove"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("\u274c remove element")
          .appendField(new Blockly.FieldTextInput("myElem"), "ID");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_remove"] = b =>
    `ext_htmlRemove(${JSON.stringify(b.getFieldValue("ID"))});\n`;

  Blockly.Blocks["ext_html_set_attr"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("set attribute of")
          .appendField(new Blockly.FieldTextInput("myElem"), "ID")
          .appendField("attr:")
          .appendField(new Blockly.FieldTextInput("src"), "ATTR")
          .appendField("to:")
          .appendField(new Blockly.FieldTextInput("image.png"), "VAL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_set_attr"] = b =>
    `ext_htmlSetAttr(${JSON.stringify(b.getFieldValue("ID"))},${JSON.stringify(b.getFieldValue("ATTR"))},${JSON.stringify(b.getFieldValue("VAL"))});\n`;

  Blockly.Blocks["ext_html_get_text"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("get text of")
          .appendField(new Blockly.FieldTextInput("myElem"), "ID");
      this.setOutput(true, "String");
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_get_text"] = b =>
    [`ext_htmlGetText(${JSON.stringify(b.getFieldValue("ID"))})`, 0];

  Blockly.Blocks["ext_html_on_click"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("\ud83d\udc46 when")
          .appendField(new Blockly.FieldTextInput("btn1"), "ID")
          .appendField("clicked");
      this.appendStatementInput("DO");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_html_on_click"] = function(b) {
    var id = JSON.stringify(b.getFieldValue("ID"));
    var body = gen.statementToCode(b, "DO");
    return `ext_htmlOnClick(${id}, async function(){ ${body} });\n`;
  };

  // ── iframe Extension ──
  Blockly.Blocks["ext_iframe_open"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("open iframe url:")
          .appendField(new Blockly.FieldTextInput("about:blank"), "URL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_iframe_open"] = b =>
    `ext_iframeOpen(${JSON.stringify(b.getFieldValue("URL"))});\n`;

  Blockly.Blocks["ext_iframe_close"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput().appendField("close iframe");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_iframe_close"] = () => `ext_iframeClose();\n`;

  Blockly.Blocks["ext_iframe_resize"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("resize iframe w:")
          .appendField(new Blockly.FieldNumber(480), "W")
          .appendField("h:")
          .appendField(new Blockly.FieldNumber(360), "H");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_iframe_resize"] = b =>
    `ext_iframeResize(${b.getFieldValue("W")},${b.getFieldValue("H")});\n`;

  Blockly.Blocks["ext_iframe_set_style"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("iframe set style:")
          .appendField(new Blockly.FieldTextInput("border:none"), "CSS");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_iframe_set_style"] = b =>
    `ext_iframeSetStyle(${JSON.stringify(b.getFieldValue("CSS"))});\n`;

  Blockly.Blocks["ext_iframe_reload"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput().appendField("reload iframe");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_iframe_reload"] = () => `ext_iframeReload();\n`;

  // ── 3D Render Extension ──
  Blockly.Blocks["ext_3d_init"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput().appendField("initialize 3D scene");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_init"] = () => `ext_3dInit();\n`;

  Blockly.Blocks["ext_3d_add_cube"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D add cube id:")
          .appendField(new Blockly.FieldTextInput("cube1"), "ID")
          .appendField("x:")
          .appendField(new Blockly.FieldNumber(0), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "Y")
          .appendField("z:")
          .appendField(new Blockly.FieldNumber(0), "Z");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_add_cube"] = b =>
    `ext_3dAddCube(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("X")},${b.getFieldValue("Y")},${b.getFieldValue("Z")});\n`;

  Blockly.Blocks["ext_3d_add_sphere"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D add sphere id:")
          .appendField(new Blockly.FieldTextInput("sphere1"), "ID")
          .appendField("x:")
          .appendField(new Blockly.FieldNumber(0), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "Y")
          .appendField("z:")
          .appendField(new Blockly.FieldNumber(0), "Z");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_add_sphere"] = b =>
    `ext_3dAddSphere(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("X")},${b.getFieldValue("Y")},${b.getFieldValue("Z")});\n`;

  Blockly.Blocks["ext_3d_rotate_scene"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D rotate scene by")
          .appendField(new Blockly.FieldNumber(1), "DEG")
          .appendField("degrees");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_rotate_scene"] = b =>
    `ext_3dRotate(${b.getFieldValue("DEG")});\n`;

  Blockly.Blocks["ext_3d_set_color"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D set next color:")
          .appendField(new SafeFieldColour("#ff0000"), "COL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_set_color"] = b =>
    `ext_3dSetColor(${JSON.stringify(b.getFieldValue("COL"))});\n`;

  Blockly.Blocks["ext_3d_remove_all"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput().appendField("3D remove all objects");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_remove_all"] = () => `ext_3dRemoveAll();\n`;

  Blockly.Blocks["ext_3d_set_camera"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D set camera z:")
          .appendField(new Blockly.FieldNumber(200), "Z");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_set_camera"] = b =>
    `ext_3dSetCamera(${b.getFieldValue("Z")});\n`;

  // New 3D shape blocks
  Blockly.Blocks["ext_3d_add_pyramid"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D add pyramid id:")
          .appendField(new Blockly.FieldTextInput("pyramid1"), "ID")
          .appendField("x:")
          .appendField(new Blockly.FieldNumber(0), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "Y")
          .appendField("z:")
          .appendField(new Blockly.FieldNumber(0), "Z");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_add_pyramid"] = b =>
    `ext_3dAddPyramid(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("X")},${b.getFieldValue("Y")},${b.getFieldValue("Z")});\n`;

  Blockly.Blocks["ext_3d_add_cylinder"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D add cylinder id:")
          .appendField(new Blockly.FieldTextInput("cylinder1"), "ID")
          .appendField("x:")
          .appendField(new Blockly.FieldNumber(0), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "Y")
          .appendField("z:")
          .appendField(new Blockly.FieldNumber(0), "Z");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_add_cylinder"] = b =>
    `ext_3dAddCylinder(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("X")},${b.getFieldValue("Y")},${b.getFieldValue("Z")});\n`;

  Blockly.Blocks["ext_3d_add_plane"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D add plane id:")
          .appendField(new Blockly.FieldTextInput("plane1"), "ID")
          .appendField("x:")
          .appendField(new Blockly.FieldNumber(0), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "Y")
          .appendField("z:")
          .appendField(new Blockly.FieldNumber(0), "Z");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_add_plane"] = b =>
    `ext_3dAddPlane(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("X")},${b.getFieldValue("Y")},${b.getFieldValue("Z")});\n`;

  Blockly.Blocks["ext_3d_move_object"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D move last object x:")
          .appendField(new Blockly.FieldNumber(0), "DX")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "DY")
          .appendField("z:")
          .appendField(new Blockly.FieldNumber(10), "DZ");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_move_object"] = b =>
    `ext_3dMoveLastObject(${b.getFieldValue("DX")},${b.getFieldValue("DY")},${b.getFieldValue("DZ")});\n`;

  // ── Move object by ID (per-axis) ──
  Blockly.Blocks["ext_3d_change_obj_x"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D object")
          .appendField(new Blockly.FieldTextInput("cube1"), "ID")
          .appendField("change x by")
          .appendField(new Blockly.FieldNumber(1), "DX");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_change_obj_x"] = b =>
    `ext_3dChangeObjX(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("DX")});\n`;

  Blockly.Blocks["ext_3d_change_obj_y"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D object")
          .appendField(new Blockly.FieldTextInput("cube1"), "ID")
          .appendField("change y by")
          .appendField(new Blockly.FieldNumber(1), "DY");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_change_obj_y"] = b =>
    `ext_3dChangeObjY(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("DY")});\n`;

  Blockly.Blocks["ext_3d_change_obj_z"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D object")
          .appendField(new Blockly.FieldTextInput("cube1"), "ID")
          .appendField("change z by")
          .appendField(new Blockly.FieldNumber(1), "DZ");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_change_obj_z"] = b =>
    `ext_3dChangeObjZ(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("DZ")});\n`;

  Blockly.Blocks["ext_3d_set_obj_pos"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D object")
          .appendField(new Blockly.FieldTextInput("cube1"), "ID")
          .appendField("set position x:")
          .appendField(new Blockly.FieldNumber(0), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "Y")
          .appendField("z:")
          .appendField(new Blockly.FieldNumber(0), "Z");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_set_obj_pos"] = b =>
    `ext_3dSetObjPos(${JSON.stringify(b.getFieldValue("ID"))},${b.getFieldValue("X")},${b.getFieldValue("Y")},${b.getFieldValue("Z")});\n`;

  // ── Change camera position incrementally ──
  Blockly.Blocks["ext_3d_change_cam_x"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D change camera x by")
          .appendField(new Blockly.FieldNumber(1), "DX");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_change_cam_x"] = b =>
    `ext_3dChangeCamX(${b.getFieldValue("DX")});\n`;

  Blockly.Blocks["ext_3d_change_cam_y"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D change camera y by")
          .appendField(new Blockly.FieldNumber(1), "DY");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_change_cam_y"] = b =>
    `ext_3dChangeCamY(${b.getFieldValue("DY")});\n`;

  // New 3D blocks: set size, resolution, FOV, camera position, camera rotation, object count
  Blockly.Blocks["ext_3d_set_size"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D set next shape size:")
          .appendField(new Blockly.FieldNumber(20, 1), "SIZE");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_set_size"] = b =>
    `ext_3dSetSize(${b.getFieldValue("SIZE")});\n`;

  Blockly.Blocks["ext_3d_set_resolution"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D set resolution")
          .appendField(new Blockly.FieldDropdown([["100%","1"],["75%","0.75"],["50%","0.5"],["25%","0.25"]]), "RES");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_set_resolution"] = b =>
    `ext_3dSetResolution(${b.getFieldValue("RES")});\n`;

  Blockly.Blocks["ext_3d_set_fov"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D set FOV:")
          .appendField(new Blockly.FieldNumber(250, 10), "FOV");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_set_fov"] = b =>
    `ext_3dSetFOV(${b.getFieldValue("FOV")});\n`;

  Blockly.Blocks["ext_3d_set_camera_pos"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D set camera x:")
          .appendField(new Blockly.FieldNumber(0), "X")
          .appendField("y:")
          .appendField(new Blockly.FieldNumber(0), "Y");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_set_camera_pos"] = b =>
    `ext_3dSetCameraPos(${b.getFieldValue("X")},${b.getFieldValue("Y")});\n`;

  Blockly.Blocks["ext_3d_set_camera_rot"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput()
          .appendField("3D camera tilt:")
          .appendField(new Blockly.FieldNumber(0, -90, 90), "DEG")
          .appendField("degrees");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_set_camera_rot"] = b =>
    `ext_3dSetCameraRotX(${b.getFieldValue("DEG")});\n`;

  Blockly.Blocks["ext_3d_object_count"] = {
    init() {
      this.setColour(RENDER3D);
      this.appendDummyInput().appendField("3D object count");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["ext_3d_object_count"] = () =>
    [`ext_3dObjectCount()`, 0];

  // ── Pen 3D Extension Blocks ──
  Blockly.Blocks["ext_pen3d_down"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput().appendField("\u270f\ufe0f pen 3D down");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_down"] = () => `pen3d_down();\n`;

  Blockly.Blocks["ext_pen3d_up"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput().appendField("\u270f\ufe0f pen 3D up");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_up"] = () => `pen3d_up();\n`;

  Blockly.Blocks["ext_pen3d_set_color"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput()
          .appendField("\u270f\ufe0f pen 3D set color:")
          .appendField(new SafeFieldColour("#ff0000"), "COL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_set_color"] = b =>
    `pen3d_setColor(${JSON.stringify(b.getFieldValue("COL"))});\n`;

  Blockly.Blocks["ext_pen3d_set_size"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput()
          .appendField("\u270f\ufe0f pen 3D set size:")
          .appendField(new Blockly.FieldNumber(2, 0.5), "SIZE");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_set_size"] = b =>
    `pen3d_setSize(${b.getFieldValue("SIZE")});\n`;

  Blockly.Blocks["ext_pen3d_set_z"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput()
          .appendField("\u270f\ufe0f pen 3D set Z:")
          .appendField(new Blockly.FieldNumber(0), "Z");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_set_z"] = b =>
    `pen3d_setZ(${b.getFieldValue("Z")});\n`;

  Blockly.Blocks["ext_pen3d_change_z"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput()
          .appendField("\u270f\ufe0f pen 3D change Z by:")
          .appendField(new Blockly.FieldNumber(10), "DZ");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_change_z"] = b =>
    `pen3d_changeZ(${b.getFieldValue("DZ")});\n`;

  Blockly.Blocks["ext_pen3d_get_z"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput().appendField("\u270f\ufe0f pen 3D z position");
      this.setOutput(true, "Number");
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_get_z"] = () =>
    [`pen3d_getZ()`, 0];

  Blockly.Blocks["ext_pen3d_clear"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput().appendField("\u270f\ufe0f pen 3D clear all");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_clear"] = () => `pen3d_clear();\n`;

  Blockly.Blocks["ext_pen3d_stamp"] = {
    init() {
      this.setColour("#0e9a6c");
      this.appendDummyInput().appendField("\u270f\ufe0f pen 3D stamp cube");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_pen3d_stamp"] = () => `pen3d_stamp();\n`;

  // ── Camera Extension ──
  Blockly.Blocks["ext_camera_start"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput().appendField("start camera");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_camera_start"] = () => `await ext_cameraStart();\n`;

  Blockly.Blocks["ext_camera_stop"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput().appendField("stop camera");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_camera_stop"] = () => `ext_cameraStop();\n`;

  Blockly.Blocks["ext_camera_snapshot"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput().appendField("camera snapshot to costume");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_camera_snapshot"] = () => `ext_cameraSnapshot();\n`;

  Blockly.Blocks["ext_camera_set_opacity"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("camera set opacity")
          .appendField(new Blockly.FieldNumber(50, 0, 100), "OPACITY")
          .appendField("%");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_camera_set_opacity"] = b =>
    `ext_cameraSetOpacity(${b.getFieldValue("OPACITY")});\n`;

  Blockly.Blocks["ext_camera_mirror"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("camera mirror")
          .appendField(new Blockly.FieldDropdown([["on","true"],["off","false"]]), "VAL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_camera_mirror"] = b =>
    `ext_cameraMirror(${JSON.stringify(b.getFieldValue("VAL"))});\n`;

  // ── Terminal NS-DOS 1.0 Extension ──
  Blockly.Blocks["ext_terminal_open"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput().appendField("open NS-DOS terminal");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_terminal_open"] = () => `ext_terminalOpen();\n`;

  Blockly.Blocks["ext_terminal_print"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("terminal print:")
          .appendField(new Blockly.FieldTextInput("Hello NS-DOS"), "TEXT");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_terminal_print"] = b =>
    `ext_terminalPrint(${JSON.stringify(b.getFieldValue("TEXT"))});\n`;

  Blockly.Blocks["ext_terminal_input"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("terminal input prompt:")
          .appendField(new Blockly.FieldTextInput("C:\\>"), "PROMPT");
      this.setOutput(true, "String");
    }
  };
  javascript.javascriptGenerator.forBlock["ext_terminal_input"] = b =>
    [`await ext_terminalInput(${JSON.stringify(b.getFieldValue("PROMPT"))})`, 0];

  Blockly.Blocks["ext_terminal_close"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput().appendField("close NS-DOS terminal");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_terminal_close"] = () => `ext_terminalClose();\n`;

  Blockly.Blocks["ext_terminal_clear"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput().appendField("terminal clear screen");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_terminal_clear"] = () => `ext_terminalClear();\n`;

  Blockly.Blocks["ext_terminal_run_command"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("terminal run command:")
          .appendField(new Blockly.FieldTextInput("dir"), "CMD");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_terminal_run_command"] = b =>
    `ext_terminalRunCommand(${JSON.stringify(b.getFieldValue("CMD"))});\n`;

  Blockly.Blocks["ext_terminal_set_color"] = {
    init() {
      this.setColour(EXT);
      this.appendDummyInput()
          .appendField("terminal text color:")
          .appendField(new SafeFieldColour("#00ff00"), "COL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["ext_terminal_set_color"] = b =>
    `ext_terminalSetColor(${JSON.stringify(b.getFieldValue("COL"))});\n`;

  // ── Variable show / hide ──
  Blockly.Blocks["scratch_var_show"] = {
    init() {
      this.setColour(C.VAR);
      this.appendDummyInput()
          .appendField("show variable")
          .appendField(new Blockly.FieldVariable("my variable"), "VAR");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_var_show"] = function(b) {
    var name = b.getFieldValue("VAR") || "my variable";
    return `_showVar(${JSON.stringify(name)});\n`;
  };

  Blockly.Blocks["scratch_var_hide"] = {
    init() {
      this.setColour(C.VAR);
      this.appendDummyInput()
          .appendField("hide variable")
          .appendField(new Blockly.FieldVariable("my variable"), "VAR");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
  };
  javascript.javascriptGenerator.forBlock["scratch_var_hide"] = function(b) {
    var name = b.getFieldValue("VAR") || "my variable";
    return `_hideVar(${JSON.stringify(name)});\n`;
  };

})();
