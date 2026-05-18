// Color Palette Panel for After Effects
// Version: 1.5
// Last Updated: May 18, 2026
//
// CHANGELOG:
// v1.5 - Hex value drawn inside each color swatch (auto-contrasting text)
//      - Color names removed from UI (kept in data for reference)
//      - Click swatch to apply color directly to selected color properties
//        in the active composition (no eyedropper switch needed)
// v1.4 - Added Reset button to restore default Elkjøp colors
// v1.3 - Fixed Elkjøp Save Yellow hex code from #ff1000 to #fff100
// v1.2 - Updated first 8 colors to Elkjøp brand colors
//      - Adjusted layout to accommodate longer color names
// v1.1 - Fixed color swatch visibility with improved drawing method
//      - Changed swatches from buttons to statictext with custom onDraw
// v1.0 - Initial release with add/edit/delete functionality
//
// Save this file to: After Effects > Scripts > ScriptUI Panels folder
// Then restart AE and find it under Window menu

(function(thisObj) {

    // Default color palette data
    var defaultPalette = [
        { name: "Elkjøp Wing Blue",       hex: "#041753", rgb: [4,   23,  83]  },
        { name: "Elkjøp Background Blue", hex: "#0e2d7b", rgb: [14,  45,  123] },
        { name: "Elkjøp Green",           hex: "#78bf26", rgb: [120, 191, 38]  },
        { name: "Elkjøp Save Yellow",     hex: "#fff100", rgb: [255, 241, 0]   },
        { name: "Black",                  hex: "#000000", rgb: [0,   0,   0]   },
        { name: "Elkjøp Save Pink",       hex: "#ee308a", rgb: [238, 48,  138] },
        { name: "Elkjøp Singles Pink",    hex: "#fa9ec4", rgb: [250, 158, 196] },
        { name: "White",                  hex: "#ffffff", rgb: [255, 255, 255] },
        { name: "Deep Purple",            hex: "#6C5CE7", rgb: [108, 92,  231] },
        { name: "Forest",                 hex: "#00B894", rgb: [0,   184, 148] },
        { name: "Peachy",                 hex: "#FDCB6E", rgb: [253, 203, 110] },
        { name: "Slate",                  hex: "#2D3436", rgb: [45,  52,  54]  }
    ];

    var colorPalette = [];

    // Load/Save functions
    function savePreferences() {
        try {
            app.settings.saveSetting("ColorPalette", "paletteData", colorPalette.toSource());
        } catch(e) {}
    }

    function loadPreferences() {
        try {
            var saved = app.settings.getSetting("ColorPalette", "paletteData");
            if (saved) {
                colorPalette = eval(saved);
            } else {
                colorPalette = defaultPalette.slice();
            }
        } catch(e) {
            colorPalette = defaultPalette.slice();
        }
    }

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    // Returns [r, g, b, a] (0–1) for text that contrasts against the given rgb (0–255)
    function contrastPen(rgb) {
        var luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        return luminance > 0.45 ? [0, 0, 0, 1] : [1, 1, 1, 1];
    }

    // Apply a palette color to all selected color properties in the active comp.
    // Returns true if at least one property was updated.
    function applyColorToSelection(color) {
        var applied = false;
        try {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) return false;
            app.beginUndoGroup("Apply Palette Color");
            var layers = comp.selectedLayers;
            for (var l = 0; l < layers.length; l++) {
                var props = layers[l].selectedProperties;
                for (var p = 0; p < props.length; p++) {
                    var prop = props[p];
                    if (prop.propertyValueType === PropertyValueType.COLOR) {
                        prop.setValue([color.rgb[0]/255, color.rgb[1]/255, color.rgb[2]/255, 1]);
                        applied = true;
                    }
                }
            }
            app.endUndoGroup();
        } catch(e) {}
        return applied;
    }

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Color Palette", undefined, {resizeable: true});

        win.alignChildren = ["fill", "top"];
        win.spacing = 10;
        win.margins = 10;

        // Title and controls
        var headerGroup = win.add("group");
        headerGroup.alignment = ["fill", "top"];
        headerGroup.orientation = "row";

        var title = headerGroup.add("statictext", undefined, "COLOR PALETTE");
        title.graphics.font = ScriptUI.newFont(title.graphics.font.name, "BOLD", 12);
        title.alignment = ["left", "center"];

        var resetBtn = headerGroup.add("button", undefined, "Reset");
        resetBtn.alignment = ["right", "center"];
        resetBtn.preferredSize = [60, 25];
        resetBtn.helpTip = "Reset to default colors";

        var addBtn = headerGroup.add("button", undefined, "+ Add");
        addBtn.alignment = ["right", "center"];
        addBtn.preferredSize = [60, 25];

        // Scrollable panel for colors
        var scrollPanel = win.add("panel", undefined, "");
        scrollPanel.alignment = ["fill", "fill"];
        scrollPanel.alignChildren = ["fill", "top"];
        scrollPanel.spacing = 5;
        scrollPanel.margins = 10;

        function refreshColorList() {
            for (var i = scrollPanel.children.length - 1; i >= 0; i--) {
                scrollPanel.remove(scrollPanel.children[i]);
            }

            for (var i = 0; i < colorPalette.length; i++) {
                var color = colorPalette[i];

                var colorGroup = scrollPanel.add("group");
                colorGroup.orientation = "row";
                colorGroup.alignment = ["fill", "top"];
                colorGroup.spacing = 8;
                colorGroup.colorIndex = i;

                // Color swatch — draws fill, border, and hex label
                var swatch = colorGroup.add("statictext", undefined, "");
                swatch.preferredSize = [110, 36];
                swatch.color = color;
                swatch.helpTip = color.name + "\nClick to apply to selected color property";

                swatch.onDraw = function() {
                    try {
                        var g = this.graphics;
                        var c = this.color;
                        var w = this.size.width;
                        var h = this.size.height;

                        // Background fill
                        var brush = g.newBrush(g.BrushType.SOLID_COLOR, [
                            c.rgb[0]/255, c.rgb[1]/255, c.rgb[2]/255, 1
                        ]);
                        g.newPath();
                        g.rectPath(0, 0, w, h);
                        g.fillPath(brush);

                        // Border
                        var borderPen = g.newPen(g.PenType.SOLID_COLOR, [0.3, 0.3, 0.3, 1], 1);
                        g.newPath();
                        g.rectPath(0, 0, w, h);
                        g.strokePath(borderPen);

                        // Hex label — auto-contrasting color
                        var textColor = contrastPen(c.rgb);
                        var textPen = g.newPen(g.PenType.SOLID_COLOR, textColor, 1);
                        var font = ScriptUI.newFont("Arial", "REGULAR", 9);
                        var label = c.hex.toUpperCase();
                        g.drawString(label, textPen, 8, (h - 12) / 2, font);
                    } catch(e) {}
                };

                swatch.addEventListener("click", function() {
                    var c = this.color;
                    var applied = applyColorToSelection(c);
                    if (!applied) {
                        prompt("No color property selected in comp. Copy hex:", c.hex);
                    }
                });

                // Buttons
                var btnGroup = colorGroup.add("group");
                btnGroup.orientation = "column";
                btnGroup.alignment = ["right", "center"];
                btnGroup.spacing = 2;

                var copyBtn = btnGroup.add("button", undefined, "Copy");
                copyBtn.preferredSize = [50, 20];
                copyBtn.hexCode = color.hex;
                copyBtn.onClick = function() {
                    prompt("Copy this hex code:", this.hexCode);
                };

                var editDeleteGroup = btnGroup.add("group");
                editDeleteGroup.orientation = "row";
                editDeleteGroup.spacing = 2;

                var editBtn = editDeleteGroup.add("button", undefined, "Edit");
                editBtn.preferredSize = [24, 20];
                editBtn.colorIndex = i;
                editBtn.onClick = function() {
                    showEditDialog(this.colorIndex);
                };

                var deleteBtn = editDeleteGroup.add("button", undefined, "×");
                deleteBtn.preferredSize = [24, 20];
                deleteBtn.colorIndex = i;
                deleteBtn.onClick = function() {
                    if (confirm("Delete this color?", false, "Confirm Delete")) {
                        colorPalette.splice(this.colorIndex, 1);
                        savePreferences();
                        refreshColorList();
                    }
                };
            }

            scrollPanel.layout.layout(true);
            scrollPanel.layout.resize();
            win.layout.layout(true);
        }

        function showEditDialog(index) {
            var isNew = (index === undefined);
            var color = isNew ? { name: "New Color", hex: "#000000", rgb: [0, 0, 0] } : colorPalette[index];

            var dialog = new Window("dialog", isNew ? "Add Color" : "Edit Color");
            dialog.alignChildren = ["fill", "top"];
            dialog.spacing = 10;
            dialog.margins = 15;

            var nameGroup = dialog.add("group");
            nameGroup.add("statictext", undefined, "Name:");
            var nameInput = nameGroup.add("edittext", undefined, color.name);
            nameInput.characters = 20;

            var hexGroup = dialog.add("group");
            hexGroup.add("statictext", undefined, "Hex:  ");
            var hexInput = hexGroup.add("edittext", undefined, color.hex);
            hexInput.characters = 20;

            var buttonGroup = dialog.add("group");
            buttonGroup.alignment = ["fill", "top"];
            buttonGroup.add("button", undefined, "OK",     {name: "ok"});
            buttonGroup.add("button", undefined, "Cancel", {name: "cancel"});

            if (dialog.show() == 1) {
                var newHex = hexInput.text;
                if (newHex.charAt(0) != "#") newHex = "#" + newHex;

                var newColor = {
                    name: nameInput.text || "Unnamed",
                    hex: newHex,
                    rgb: hexToRgb(newHex)
                };

                if (isNew) {
                    colorPalette.push(newColor);
                } else {
                    colorPalette[index] = newColor;
                }

                savePreferences();
                refreshColorList();
            }
        }

        addBtn.onClick = function() { showEditDialog(); };

        resetBtn.onClick = function() {
            if (confirm("Reset to default Elkjøp colors? This will delete all custom colors.", false, "Reset Palette")) {
                colorPalette = defaultPalette.slice();
                savePreferences();
                refreshColorList();
            }
        };

        refreshColorList();

        var instructGroup = win.add("group");
        instructGroup.alignment = ["fill", "top"];
        instructGroup.margins = [0, 10, 0, 0];

        var instructions = instructGroup.add("statictext", undefined,
            "Click swatch to apply to selected color property. Copy for hex.", {multiline: true});
        instructions.graphics.foregroundColor = instructions.graphics.newPen(
            instructions.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5], 1);

        win.layout.layout(true);
        win.layout.resize();

        return win;
    }

    loadPreferences();

    var win = buildUI(thisObj);

    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
    }

})(this);
