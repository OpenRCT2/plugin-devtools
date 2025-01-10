const DEBUG = false;

const main = () => {
    if (typeof ui === 'undefined') {
        console.log("Plugin not available on headless mode.");
        return;
    }

    EntityViewer.register();
    ImageList.register();
    NetworkMonitor.register();

    if (DEBUG) {
        ui.closeAllWindows();
        // NetworkMonitor.getOrOpen();
        ImageList.getOrOpen();
    }
};

registerPlugin({
    name: 'DevTools',
    version: '1.2',
    authors: ['OpenRCT2'],
    type: 'local',
    licence: 'MIT',
    targetApiVersion: 81,
    main: main
});
