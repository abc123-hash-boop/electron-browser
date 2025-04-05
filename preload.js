// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Main -> Renderer
    onAddTab: (callback) => ipcRenderer.on('add-tab', (event, data) => callback(data)),
    onRemoveTab: (callback) => ipcRenderer.on('remove-tab', (event, viewId) => callback(viewId)),
    onTabSwitched: (callback) => ipcRenderer.on('tab-switched', (event, data) => callback(data)),
    onTabTitleUpdated: (callback) => ipcRenderer.on('tab-title-updated', (event, data) => callback(data)),
    onTabUrlUpdated: (callback) => ipcRenderer.on('tab-url-updated', (event, data) => callback(data)),
    onTabLoadingState: (callback) => ipcRenderer.on('tab-loading-state', (event, data) => callback(data)),

    // Renderer -> Main (invoke for request/response)
    createNewTab: (url, activate = true) => ipcRenderer.invoke('create-new-tab', url, activate),

    // Renderer -> Main (send for one-way)
    switchToTab: (viewId) => ipcRenderer.send('switch-to-tab', viewId),
    closeTab: (viewId) => ipcRenderer.send('close-tab', viewId),
    navigate: (viewId, url) => ipcRenderer.send('navigate', { viewId, url }),
    goBack: (viewId) => ipcRenderer.send('go-back', viewId),
    goForward: (viewId) => ipcRenderer.send('go-forward', viewId),
    reloadPage: (viewId) => ipcRenderer.send('reload-page', viewId),

    // Cleanup listeners (important!)
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
