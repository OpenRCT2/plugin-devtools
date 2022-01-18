namespace PerfMonitor {
    var PERF_MONITOR_WINDOW_CLASS = 'perf-monitor';

    var tree: ProfileTreeNode;
    var visibleNodes: ProfileTreeNode[] = [];

    function openPerfMonitor() {
        var intervalHandle: number;
        var width = Math.min(1000, ui.width - 200);
        var height = Math.min(600, ui.height - 200);
        var w = ui.openWindow({
            x: (ui.width - width) / 2,
            y: (ui.height - height) / 2,
            width: width,
            height: height,
            minWidth: width,
            minHeight: height,
            maxWidth: ui.width - 8,
            maxHeight: ui.height - 32,
            title: 'Performance Monitor',
            classification: PERF_MONITOR_WINDOW_CLASS,
            colours: [0, 0],
            tabs: [
                {
                    image: 0xFFFFFFFF
                },
                {
                    image: 0xFFFFFFFF
                }
            ],
            widgets: [
                {
                    type: 'button',
                    name: 'btnReset',
                    x: 200,
                    y: 17,
                    width: 23,
                    height: 23,
                    image: 5165,
                    onClick: () => {
                        profiler.reset();
                        context.setTimeout(() => tree = updateList(w), 100);
                    }
                },
                {
                    type: 'button',
                    name: 'btnStartStop',
                    x: 200,
                    y: 17,
                    width: 23,
                    height: 23,
                    image: 5180,
                    isPressed: profiler.isEnabled(),
                    onClick: () => {
                        let btn = w.findWidget<ButtonWidget>('btnStartStop');
                        if (btn.isPressed) {
                            profiler.stop();
                            btn.isPressed = false;
                        } else {
                            profiler.start();
                            btn.isPressed = true;
                        }
                    }
                },
                {
                    type: "listview",
                    name: "list",
                    scrollbars: "vertical",
                    showColumnHeaders: true,
                    columns: [
                        {
                            width: 250,
                            header: ''
                        },
                        {
                            width: 80,
                            header: '{GREY}Inclusive'
                        },
                        {
                            width: 80,
                            header: '{GREY}Exclusive'
                        }
                    ],
                    x: 5,
                    y: 50,
                    width: width - 10,
                    height: height - 65,
                    onClick: function (i, c) {
                        if (w.tabIndex === 1) {
                            toggleVisibleNode(w, i);
                        }
                    }
                }
            ],
            onClose: () => {
                context.clearInterval(intervalHandle);
            },
            onTabChange: () => {
                tree = updateList(w);
            },
            onUpdate: () => {
                const listView = w.findWidget<ListViewWidget>('list');
                listView.width = w.width - 10;
                listView.height = w.height - 65;

                let button = w.findWidget<ButtonWidget>('btnReset');
                button.x = w.width - button.width - 5;

                let button2 = w.findWidget<ButtonWidget>('btnStartStop');
                button2.x = button.x - button.width - 5;
                button2.image = button2.isPressed ? 5180 : 5179;
            }
        });

        intervalHandle = context.setInterval(function() {
            let btn = w.findWidget<ButtonWidget>('btnStartStop');
            if (btn.isPressed) {
                tree = updateList(w);
            }
        }, 1000);

        tree = updateList(w);
    }

    function updateList(w: Window) {
        const data = profiler.getData();
        tree = createTreeFromData(data);
        refreshList(w);
        return tree;
    }

    function refreshList(w: Window) {
        const listView = w.findWidget<ListViewWidget>('list');
        if (w.tabIndex === 0) {
            listView.columns = getFlatViewColumns();
            listView.items = getFlatViewItems();
        } else {

            listView.columns = getTreeViewColumns();
            listView.items = getTreeViewItems();
        }
    }

    function getFlatViewColumns() {
        return [
            {
                width: 500,
                header: ''
            },
            {
                width: 70,
                header: '{WINDOW_COLOUR_2}Calls'
            },
            {
                width: 70,
                header: '{WINDOW_COLOUR_2}Inclusive'
            },
            {
                width: 80,
                header: '{WINDOW_COLOUR_2}Min'
            },
            {
                width: 80,
                header: '{WINDOW_COLOUR_2}Max'
            },
            {
                width: 80,
                header: '{WINDOW_COLOUR_2}Average'
            }
        ];
    }

    function getFlatViewItems() {
        const flatList: ProfileTreeNode[] = [];
        function appendItems(node: ProfileTreeNode) {
            if (node !== tree && flatList.indexOf(node) == -1) {
                flatList.push(node);
            }
            if (node.depth <= 16) {
                node.children.forEach(child => appendItems(child));
            }
        }
        appendItems(tree);
        flatList.sort((a, b) => b.averageTime - a.averageTime);

        return flatList.map(node => [
            `{WINDOW_COLOUR_2}${node.label}`,
            `{WINDOW_COLOUR_2}${node.callCount}`,
            percent(node.inclusive),
            time(node.minTime),
            time(node.maxTime),
            time(node.averageTime)
        ]);
    }

    function getTreeViewColumns() {
        return [
            {
                width: 500,
                header: ''
            },
            {
                width: 70,
                header: '{WINDOW_COLOUR_2}Inclusive'
            },
            {
                width: 80,
                header: '{WINDOW_COLOUR_2}Min'
            },
            {
                width: 80,
                header: '{WINDOW_COLOUR_2}Max'
            },
            {
                width: 80,
                header: '{WINDOW_COLOUR_2}Average'
            }
        ];
    }

    function getTreeViewItems() {
        function appendItems(node: ProfileTreeNode) {
            visibleNodes.push(node);
            if (node.expanded && node.depth <= 16) {
                node.children.forEach(child => appendItems(child));
            }
        }

        visibleNodes = [];
        appendItems(tree);
        return visibleNodes.map(function (n) {
            return [
                "{WINDOW_COLOUR_2}" + ' '.repeat(n.depth * 4) + n.label,
                percent(n.inclusive),
                time(n.minTime),
                time(n.maxTime),
                time(n.averageTime)
            ];
        });
    }

    function toggleVisibleNode(w: Window, index: number) {
        var visibleNode = visibleNodes[index];
        visibleNode.expanded = !visibleNode.expanded;
        refreshList(w);
    }

    interface ProfileTreeNode {
        label: string;
        depth: number;
        expanded: boolean;
        minTime: number;
        maxTime: number;
        averageTime: number;
        callCount: number;
        inclusive: number;
        parents: ProfileTreeNode[];
        children: ProfileTreeNode[];
    }

    interface FunctionProfileTreeNode extends ProfileTreeNode {
        f: ProfiledFunction;
    }

    function createTreeFromData(data: ProfiledFunction[]) {
        // Create node for each function
        var nodes = data.map(function (f) {
            return <FunctionProfileTreeNode>{
                label: getFriendlyFunctionName(f.name),
                depth: 0,
                expanded: true,
                minTime: f.minTime,
                maxTime: f.maxTime,
                averageTime: f.totalTime / f.callCount,
                callCount: f.callCount,
                inclusive: 0,
                parents: [],
                children: [],
                f: f
            };
        });
    
        // Set parents and children for each node
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            node.parents = node.f.parents.map(idx => nodes[idx]);
            node.children = node.f.children.map(idx => nodes[idx]);
        }

        var root = <ProfileTreeNode>{
            label: 'root',
            depth: 0,
            expanded: true,
            minTime: 0,
            maxTime: 0,
            averageTime: 0,
            callCount: 0,
            inclusive: 1,
            parents: [],
            children: nodes.filter(function (n) {
                return n.parents.length === 0;
            })
        };

        function setDepth(node: ProfileTreeNode, depth: number) {
            if (node.depth !== 0)
                return;

            node.depth = depth;
            for (const child of node.children) {
                setDepth(child, depth + 1);
            }
        }
        setDepth(root, 0);

        for (var i = 0; i < root.children.length; i++) {
            var child = root.children[i];
            if (isFinite(child.averageTime)) {
                root.averageTime += child.averageTime;
            }
        }

        function removeZeroCalls(node: ProfileTreeNode) {
            node.children = node.children.filter(node => node.callCount !== 0);
            node.children.forEach(removeZeroCalls);
        }
        removeZeroCalls(root);

        // Calculate inclusive
        nodes.forEach(node => {
            node.inclusive = node.averageTime / root.averageTime;
            node.children.sort((a, b) => b.averageTime - a.averageTime);
        });
    
        return root;
    }

    function getFriendlyFunctionName(name: string) {
        var pattern = /.+cdecl (?:OpenRCT2::)?(.+)\(.*/i;
        var result = name.match(pattern);
        return result ? result[1] : name;
    }

    function percent(n: number) {
        var s = (n * 100).toFixed(2) + '%';
        if (n > 0.3) {
            s = "{RED}" + s;
        } else if (n > 0.1) {
            s = "{YELLOW}" + s;
        } else {
            s = "{GREEN}" + s;
        }
        return s;
    }

    function time(ns: number) {
        const ms = ns / 1000;
        var s = ms.toFixed(3);
        if (ms > 10) {
            s = "{RED}" + s;
        } else if (ms > 5) {
            s = "{YELLOW}" + s;
        } else {
            s = "{GREEN}" + s;
        }
        return s;
    }

    export function getOrOpen() {
        var w = ui.getWindow(PERF_MONITOR_WINDOW_CLASS);
        if (w) {
            w.bringToFront();
        } else {
            openPerfMonitor();
        }
    }

    export function register() {
        ui.registerMenuItem('Performance Monitor', function () {
            getOrOpen();
        });
    }
}
