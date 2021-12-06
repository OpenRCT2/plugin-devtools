
namespace ImageList {

    const WINDOW_CLASS = 'devtools.window.imagelist';

    export function register() {
        ui.registerMenuItem('Image List', () => {
            getOrOpen();
        });
    }

    export function getOrOpen() {
        const w = ui.getWindow(WINDOW_CLASS);
        if (w) {
            w.bringToFront();
        } else {
            open();
        }
    }

    function open() {
        let startId = 14222;
        let nextId = 0;
        let showImageBorders = false;
        let primaryChecked = false;
        let secondaryChecked = false;
        let primaryColour = 4;
        let secondaryColour = 18;
        let ternaryColour = 30;

        const width = ui.width - 64;
        const height = ui.height - 96;
        const window = ui.openWindow({
            classification: WINDOW_CLASS,
            title: 'Image List',
            x: (ui.width - width) / 2,
            y: (ui.height - height) / 2,
            width: width,
            height: height,
            minWidth: width,
            minHeight: height,
            maxWidth: 1500,
            maxHeight: 1200,
            widgets: [
                { type: 'groupbox', x: 8, y: 16, width: 286, height: 100 },
                { type: 'colourpicker', name: 'clrPrimary', onChange: c => onPrimaryColourChange(c), x: 16, y: 28, width: 12, height: 12 },
                { type: 'checkbox', name: 'chkPrimary', x: 32, y: 28, width: 100, height: 14, isChecked: true, text: 'Primary' },
                { type: 'colourpicker', name: 'clrSecondary', onChange: c => onSecondaryColourChange(c), x: 16, y: 42, width: 12, height: 12 },
                { type: 'checkbox', name: 'chkSecondary', x: 32, y: 42, width: 100, height: 14, isChecked: true, text: 'Secondary' },
                { type: 'colourpicker', name: 'clrTernary', onChange: c => onTernaryColourChange(c), x: 16, y: 56, width: 12, height: 12 },
                { type: 'checkbox', x: 32, y: 56, width: 100, height: 14, text: 'Blend' },
                { type: 'label', x: 16, y: 74, width: 50, height: 14, text: 'Palette:' },
                { type: 'spinner', name: 'spnPalette', x: 68, y: 72, width: 100, height: 14, text: '0', onDecrement: () => onDecrementPalette(), onIncrement: () => onIncrementPalette() },
                { type: 'label', x: 16, y: 92, width: 50, height: 14, text: 'Start ID:' },
                { type: 'spinner', name: 'spnStartId', x: 68, y: 90, width: 100, height: 14, text: startId.toString(), onClick: () => onSelectId(), onDecrement: () => onDecrementId(), onIncrement: () => onIncrementId() },
                { type: 'custom', name: 'imageChart', x: 300, y: 20, width: 1200, height: 96, onDraw: function (g) { onDrawChart(this, g); } },
                { type: 'custom', name: 'imageList', x: 8, y: 122, width: 200, height: 100, onDraw: function (g) { onDrawImages(this, g); } }
            ],
            onUpdate: () => onUpdate()
        });

        function onSelectId() {
            ui.showTextInput({
                title: 'Start ID',
                description: 'Type in the image ID to move to:',
                initialValue: startId.toString(),
                maxLength: 8,
                callback: text => {
                    startId = parseInt(text) || 0
                }
            });
        }

        function onPrimaryColourChange(c: number) {
            primaryColour = c;
        }

        function onSecondaryColourChange(c: number) {
            secondaryColour = c;
        }

        function onTernaryColourChange(c: number) {
            ternaryColour = c;
        }

        function onDecrementPalette() {
            const paletteSpinner = window.findWidget<SpinnerWidget>('spnPalette');
            if (paletteSpinner) {
                if (primaryColour === undefined) {
                    primaryColour = 0;
                }
                if (primaryColour > 0) {
                    primaryColour--;
                }
                paletteSpinner.text = primaryColour.toString();
            }
        }

        function onIncrementPalette() {
            const paletteSpinner = window.findWidget<SpinnerWidget>('spnPalette');
            if (paletteSpinner) {
                if (primaryColour === undefined) {
                    primaryColour = 0;
                }
                if (primaryColour < 255) {
                    primaryColour++;
                }
                paletteSpinner.text = primaryColour.toString();
            }
        }

        function onDecrementId() {
            const startIdSpinner = window.findWidget<SpinnerWidget>('spnStartId');
            if (startIdSpinner && startId > 0) {
                startId = Math.max(0, startId - 32);
            }
        }

        function onIncrementId() {
            const startIdSpinner = window.findWidget<SpinnerWidget>('spnStartId');
            if (startIdSpinner) {
                startId = nextId;
            }
        }

        function onUpdate() {
            const imageChart = window.findWidget<CustomWidget>('imageChart');
            if (imageChart) {
                imageChart.width = window.width - imageChart.x - 8;
            }

            const imageList = window.findWidget<CustomWidget>('imageList');
            if (imageList) {
                imageList.width = window.width - (imageList.x * 2);
                imageList.height = window.height - imageList.y - 16;
            }

            const startIdSpinner = window.findWidget<SpinnerWidget>('spnStartId');
            if (startIdSpinner) {
                startIdSpinner.text = startId.toString();
            }

            primaryChecked = window.findWidget<CheckboxWidget>('chkPrimary').isChecked || false;
            const primaryColourWidget = window.findWidget<ColourPickerWidget>('clrPrimary');
            if (primaryColourWidget) {
                primaryColourWidget.colour = primaryColour;
            }

            secondaryChecked = window.findWidget<CheckboxWidget>('chkSecondary').isChecked || false;
            const secondaryColourWidget = window.findWidget<ColourPickerWidget>('clrSecondary');
            if (secondaryColourWidget) {
                secondaryColourWidget.colour = secondaryColour;
            }

            const ternaryColourWidget = window.findWidget<ColourPickerWidget>('clrTernary');
            if (ternaryColourWidget) {
                ternaryColourWidget.colour = ternaryColour;
            }

            const paletteSpinner = window.findWidget<SpinnerWidget>('spnPalette');
            if (primaryColour !== undefined) {
                paletteSpinner.text = primaryColour.toString();
            }
        }

        function onDrawChart(widget: CustomWidget, g: GraphicsContext) {
            const clipWidth = widget.width - 2;
            const clipHeight = widget.height - 2;

            g.colour = 1;
            g.well(0, 0, widget.width, widget.height);
            g.clip(1, 1, clipWidth, clipHeight);

            g.fill = 61;
            g.clear();

            const allocatedRange = ui.imageManager.getPredefinedRange('allocated');
            if (!allocatedRange)
                return;

            const end = allocatedRange.start + allocatedRange.count;
            const indexToX = (index: number) => Math.floor((index / end) * clipWidth);

            const rangeNames = ['g1', 'g2', 'csg'];
            const colours = [60, 90, 120];
            const ranges = rangeNames.map(x => ui.imageManager.getPredefinedRange(x));

            // Range colours
            for (let i = 0; i < rangeNames.length; i++) {
                const range = ranges[i];
                if (!range)
                    continue;

                const x = indexToX(range.start);
                const width = indexToX(range.count);

                g.fill = colours[i];
                g.rect(x, 0, width, clipHeight);
            }

            // Range names
            for (let i = 0; i < rangeNames.length; i++) {
                const range = ranges[i];
                if (!range)
                    continue;

                const x = indexToX(range.start);
                const width = indexToX(range.count);
                
                const name = rangeNames[i];
                const textSize = g.measureText(name);
                g.text('{OUTLINE}{WHITE}' + name, x + ((width - textSize.width) / 2), clipHeight / 2 - 5);
            }

            // Free ranges
            const freeRanges = ui.imageManager.getAvailableAllocationRanges();
            for (const range of freeRanges) {
                const x = Math.floor((range.start / end) * clipWidth);
                const width = Math.floor((range.count / end) * clipWidth);

                g.fill = 20;
                g.rect(x, 0, width, clipHeight);
            }

            // Viewport
            const viewX = indexToX(startId);
            const viewSize = 8;
            g.fill = 8;
            g.stroke = 54;
            g.rect(viewX - (viewSize / 2), (clipHeight / 4) - (viewSize / 2), viewSize, viewSize);
        }

        function onDrawImages(widget: CustomWidget, g: GraphicsContext) {
            const margin = 2;
            const clipWidth = widget.width - 2 - margin;
            const clipHeight = widget.height - 2 - margin;

            g.colour = 1;
            g.well(0, 0, widget.width, widget.height);
            g.clip(1 + margin, 1 + margin, clipWidth, clipHeight);

            let id = startId;
            let x = 0;
            let y = 0;
            let width = clipWidth;
            let lineHeight = 0;
            let secondLineId: number | undefined = undefined;
            const output = { width: 0, height: 0 };
            while (y < clipHeight) {
                const img = g.getImage(id);
                if (img) {
                    const remWidth = width - x;
                    if (img.width > remWidth) {
                        x = 0;
                        y += lineHeight;
                        lineHeight = 0;
                        if (secondLineId === undefined) {
                            secondLineId = id;
                        }
                    }

                    drawImage(g, img, x, y, output);

                    x += output.width;
                    lineHeight = Math.max(lineHeight, output.height);
                }
                id++;

                // Prevent continuous loop
                if (id > startId + 1000)
                    break;
            }

            nextId = secondLineId || startId + 1;
        }

        function drawImage(g: GraphicsContext, img: ImageInfo, x: number, y: number, output: { width: number, height: number }) {
            const sz = '{TINYFONT}' + img.id;
            g.colour = 2;
            g.text(sz, x, y)
            const textWidth = g.measureText(sz).width;
            y += 8;

            if (showImageBorders) {
                g.stroke = 1;
                g.rect(x, y, img.width + 2, img.height + 2);
            }

            g.colour = primaryChecked && secondaryChecked ? primaryColour : undefined;
            g.secondaryColour = secondaryChecked ? secondaryColour : undefined;
            g.paletteId = primaryChecked && !secondaryChecked ? primaryColour : undefined;
            g.ternaryColour = ternaryColour;
            g.image(img.id, x - img.offset.x + 1, y - img.offset.y + 1);

            output.width = Math.max(textWidth + 4, img.width + 6);
            output.height = Math.max(8, img.height + 12);
        }
    }
}
