const DEBUG = false;

const main = () => {
    if (typeof ui === 'undefined') {
        console.log("Plugin not available on headless mode.");
        return;
    }

    NetworkMonitor.register();

    if (DEBUG) {
        ui.closeAllWindows();
        NetworkMonitor.getOrOpen();
    }
};

registerPlugin({
    name: 'DevTools',
    version: '1.0',
    authors: ['OpenRCT2'],
    type: 'local',
    licence: 'MIT',
    main: main
});
