namespace NetworkMonitor {
    var NETWORK_STATS_WINDOW_CLASS = 'network-stats';
    var MOCK_STATS = DEBUG;

    function openNetworkStats() {
        enum StatKind { receive, send };

        var categoryGroups = [
            { text: "Base protocol", paletteIndex: 102 },
            { text: "Commands", paletteIndex: 138 },
            { text: "Map", paletteIndex: 171 },
        ];

        var historyReceived: number[][] = [];
        var historySent: number[][] = [];
        var totalSentBytes = 0;
        var totalReceivedBytes = 0;
        var accumulatedSentBytes = 0;
        var accumulatedReceivedBytes = 0;
        var sentBytesPerSecond = 0;
        var receivedBytesPerSecond = 0;
        var lastStatsUpdateTime = 0;
        var receivedMax = 0;
        var sentMax = 0;

        function open() {
            var width = 450;
            var height = 210;

            var padding = 5;
            var heightTab = 43;
            var textHeight = 12;
            var totalHeight = height;
            var totalHeightText = (textHeight + (padding * 2)) * 3;
            var graphWidth = width - (padding * 2);
            var graphHeight = (totalHeight - totalHeightText - heightTab) / 2;
            graphHeight = ~~graphHeight;

            var x = padding;
            var y = heightTab + padding;
            var widgets: Widget[] = [];
            createGraphTextWidgets(widgets, x, y, StatKind.receive);
            y += textHeight + padding;
            createGraphWidget(widgets, x, y, graphWidth, graphHeight, StatKind.receive, 'graphReceived');
            y += graphHeight + padding;
            createGraphTextWidgets(widgets, x, y, StatKind.send);
            y += textHeight + padding;
            createGraphWidget(widgets, x, y, graphWidth, graphHeight, StatKind.send, 'graphSent');
            y += graphHeight + padding;
            createLegendWidgets(widgets, x, y);

            var stats = getStats();
            var w = ui.openWindow({
                x: (ui.width - width) / 2,
                y: (ui.height - height) / 2,
                width: width,
                height: height,
                minWidth: width,
                minHeight: height,
                maxWidth: width * 4,
                maxHeight: height * 4,
                title: 'Network Monitor',
                classification: NETWORK_STATS_WINDOW_CLASS,
                colours: [0, 0],
                tabs: [
                    {
                        image: {
                            frameBase: 5367,
                            frameCount: 8,
                            frameDuration: 4
                        },
                        widgets: widgets
                    }
                ],
                onUpdate: function () {
                    var deltaStats = {
                        bytesReceived: [0, 0, 0],
                        bytesSent: [0, 0, 0]
                    };
                    var receivedSum = 0;
                    var sentSum = 0;

                    var newStats = getStats();
                    for (var i = 0; i < categoryGroups.length; i++) {
                        deltaStats.bytesReceived[i] = newStats.bytesReceived[i + 1] - stats.bytesReceived[i + 1];
                        deltaStats.bytesSent[i] = newStats.bytesSent[i + 1] - stats.bytesSent[i + 1];
                        accumulatedReceivedBytes += deltaStats.bytesReceived[i];
                        accumulatedSentBytes += deltaStats.bytesSent[i]
                        receivedSum += deltaStats.bytesReceived[i];
                        sentSum += deltaStats.bytesSent[i];
                    }
                    stats = newStats;

                    totalReceivedBytes = stats.bytesReceived[0];
                    totalSentBytes = stats.bytesSent[0];
                    receivedMax = Math.max(receivedMax, receivedSum);
                    sentMax = Math.max(sentMax, sentSum);

                    while (historyReceived.length >= 256) {
                        historyReceived.shift();
                    }
                    historyReceived.push(deltaStats.bytesReceived);
                    while (historySent.length >= 256) {
                        historySent.shift();
                    }
                    historySent.push(deltaStats.bytesSent);

                    // @ts-ignore
                    var currentTime = performance.now();
                    if (currentTime > lastStatsUpdateTime + 1000) {
                        var elapsed = (currentTime - lastStatsUpdateTime) / 1000;
                        lastStatsUpdateTime = currentTime;

                        receivedBytesPerSecond = accumulatedReceivedBytes / elapsed;
                        sentBytesPerSecond = accumulatedSentBytes / elapsed;
                        accumulatedReceivedBytes = 0;
                        accumulatedSentBytes = 0;
                    }

                    var setWidgetText = function (name: string, text: string) {
                        var label = w.findWidget<LabelWidget>(name);
                        if (label) {
                            label.text = text;
                        }
                    };

                    setWidgetText('lblReceivedBytes', formatReadableSpeed(receivedBytesPerSecond));
                    setWidgetText('lblTotalReceivedBytes', formatReadableSize(totalReceivedBytes));
                    setWidgetText('lblSentBytes', formatReadableSpeed(sentBytesPerSecond));
                    setWidgetText('lblTotalSentBytes', formatReadableSize(totalSentBytes));

                    performLayout(w);
                }
            });
        }

        function performLayout(w: Window) {
            var width = w.width;
            var height = w.height;
            var padding = 5;
            var heightTab = 43;
            var textHeight = 12;
            // var graphBarWidth = Math.min(1, width / width);
            var graphBarWidth = 1;
            var totalHeight = height;
            var totalHeightText = (textHeight + (padding * 2)) * 3;
            var graphWidth = width - (padding * 2);
            var graphHeight = (totalHeight - totalHeightText - heightTab) / 2;
            graphHeight = ~~graphHeight;

            var x = padding;
            var y = heightTab + padding;

            var setWidgetY = function (names: string[], y: number) {
                for (var i = 0; i < names.length; i++) {
                    var widget = w.findWidget(names[i]);
                    if (widget) {
                        widget.y = y;
                    }
                }
            }

            setWidgetY(['lblReceive', 'lblReceivedBytes', 'lblTotalReceived', 'lblTotalReceivedBytes'], y);
            y += textHeight + padding;
            var graph = w.findWidget('graphReceived');
            graph.y = y;
            graph.width = graphWidth;
            graph.height = graphHeight;
            y += graphHeight + padding;
            setWidgetY(['lblSend', 'lblSentBytes', 'lblTotalSent', 'lblTotalSentBytes'], y);
            y += textHeight + padding;
            var graph = w.findWidget('graphSent');
            graph.y = y;
            graph.width = graphWidth;
            graph.height = graphHeight;
            y += graphHeight + padding;
            for (var n = 0; n < categoryGroups.length; n++) {
                setWidgetY(['legendColour' + n], y + 4);
                setWidgetY(['legendLabel' + n], y);
            }
        }

        function createLabel(name: string, x: number, y: number, text: string): LabelWidget {
            return {
                type: 'label',
                name: name,
                x: x,
                y: y,
                width: 100,
                height: 16,
                text: text
            };
        }

        function createLegendColourWidget(name: string, x: number, y: number, w: number, h: number, colour: number): CustomWidget {
            return {
                type: 'custom',
                name: name,
                x: x,
                y: y,
                width: w,
                height: h,
                onDraw: function (g) {
                    g.fill = colour;
                    g.clear();
                }
            };
        }

        function createGraphTextWidgets(widgets: Widget[], x: number, y: number, kind: StatKind) {
            if (kind === StatKind.receive) {
                widgets.push(createLabel('lblReceive', x, y, "Receive"));
                widgets.push(createLabel('lblReceivedBytes', x + 70, y, "0.000 B/sec"));
                widgets.push(createLabel('lblTotalReceived', x + 200, y, "Total received"));
                widgets.push(createLabel('lblTotalReceivedBytes', x + 300, y, "0.000 B/sec"));
            } else {
                widgets.push(createLabel('lblSend', x, y, "Send"));
                widgets.push(createLabel('lblSentBytes', x + 70, y, "0.000 B/sec"));
                widgets.push(createLabel('lblTotalSent', x + 200, y, "Total sent"));
                widgets.push(createLabel('lblTotalSentBytes', x + 300, y, "0.000 B/sec"));
            }
        }

        function createGraphWidget(widgets: Widget[], x: number, y: number, w: number, h: number, kind: StatKind, name: string) {
            widgets.push({
                type: 'custom',
                name: name,
                x: x,
                y: y,
                width: w,
                height: h,
                onDraw: function (g) {
                    g.colour = this.window?.colours[1] || 0;
                    g.well(0, 0, this.width, this.height);
                    g.clip(1, 1, this.width - 2, this.height - 2);
                    drawGraph(g, this.width - 2, this.height - 2, kind);
                }
            });
        }

        function createLegendWidgets(widgets: Widget[], x: number, y: number) {
            for (var n = 0; n < categoryGroups.length; n++) {
                var cg = categoryGroups[n];

                widgets.push(createLegendColourWidget('legendColour' + n, x, y + 4, 6, 4, cg.paletteIndex));
                widgets.push(createLabel('legendLabel' + n, x + 10, y, cg.text));
                x += cg.text.length * 10;
            }
        }

        function drawGraph(g: GraphicsContext, width: number, height: number, kind: number) {
            var barWidth = 1;
            var history = kind == StatKind.receive ? historyReceived : historySent;
            var dataMax = kind == StatKind.receive ? receivedMax : sentMax;

            var numBars = Math.min(history.length, Math.floor(width / barWidth));
            var gap = (width - (numBars * barWidth)) / numBars;
            var x = 0;
            for (var i = 0; i < numBars; i++) {
                var historyItem = history[i];
                var totalSum = 0;
                for (var n = 0; n < categoryGroups.length; n++) {
                    totalSum += historyItem[n];
                }

                var totalHeight = (totalSum / dataMax) * height;
                var yOffset = height;
                for (var n = 0; n < categoryGroups.length; n++) {
                    var amount = historyItem[n];
                    var singleHeight = (amount / totalSum) * totalHeight;
                    var lineHeight = Math.ceil(singleHeight);
                    lineHeight = Math.min(lineHeight, height);
                    yOffset -= lineHeight;
                    if (lineHeight > 0) {
                        g.fill = categoryGroups[n].paletteIndex;
                        g.rect(x, yOffset, barWidth, lineHeight);
                    }
                }

                x += barWidth + gap;
            }
        }

        var getStats: () => NetworkStats;
        if (MOCK_STATS) {
            var mockStats = {
                bytesReceived: [0, 0, 0, 0],
                bytesSent: [0, 0, 0, 0]
            };
            var mockSizeInc = 4;
            getStats = function () {
                for (var i = 1; i < 4; i++) {
                    mockStats.bytesReceived[i] += ~~(Math.random() * mockSizeInc);
                    mockStats.bytesSent[i] += ~~(Math.random() * mockSizeInc);
                    mockStats.bytesReceived[0] += mockStats.bytesReceived[i];
                    mockStats.bytesSent[0] += mockStats.bytesSent[i];
                }
                return JSON.parse(JSON.stringify(mockStats));
            };
        } else {
            getStats = function () {
                return network.stats;
            };
        }

        function formatReadableSpeed(speed: number) {
            return formatReadableSize(speed) + "/sec";
        }

        function formatReadableSize(size: number) {
            var sizeTable = ['B', 'KiB', 'MiB', 'GiB'];
            var idx = 0;
            while (size >= 1024 && idx < sizeTable.length - 1) {
                size /= 1024;
                idx++;
            }
            return context.formatString('{COMMA1DP16} {STRING}', size * 10, sizeTable[idx]);
        }

        return open();
    }

    export function getOrOpen() {
        var w = ui.getWindow(NETWORK_STATS_WINDOW_CLASS);
        if (w) {
            w.bringToFront();
        } else {
            openNetworkStats();
        }
    }

    export function register() {
        ui.registerMenuItem('Network Monitor', function () {
            getOrOpen();
        });
    }
}
