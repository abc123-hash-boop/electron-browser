// main.js
const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
const views = {}; // Store BrowserView instances { viewId: BrowserView }
let activeViewId = null;
const defaultURL = 'https://www.google.com'; // Or your preferred homepage
const newTabURL = 'about:blank'; // URL for new tabs

// Calculate content bounds (adjust vertical offset based on your UI height)
const navBarHeight = 85; // Approximate height for tabs + nav controls
function calculateBounds(window) {
    const { width, height } = window.getBounds();
    return {
        x: 0,
        y: navBarHeight,
        width: width,
        height: height - navBarHeight
    };
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // Recommended security practice
            nodeIntegration: false  // Recommended security practice
        }
    });

    mainWindow.loadFile('index.html');

    // Open DevTools (optional)
    // mainWindow.webContents.openDevTools();

    // --- Initial Tab ---
    // Create the first BrowserView after the window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        createNewTab(defaultURL, true); // Create the first tab and make it active
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        // Clean up views? This depends on desired behavior on window close vs app quit
    });

    // Adjust view bounds on window resize
    mainWindow.on('resize', () => {
        if (activeViewId && views[activeViewId]) {
             const bounds = calculateBounds(mainWindow);
             views[activeViewId].setBounds(bounds);
        }
    });
}

function createNewTab(url = newTabURL, activate = true) {
    if (!mainWindow) return;

    const view = new BrowserView();
    mainWindow.addBrowserView(view); // Add but don't show yet if not activating immediately

    const viewId = view.webContents.id; // Use webContents.id as a unique identifier
    views[viewId] = view;

    // Set initial bounds
    const bounds = calculateBounds(mainWindow);
    view.setBounds(bounds);
    view.setAutoResize({ width: true, height: true });
    view.webContents.loadURL(url);

    // --- Event listeners for the new view ---
    view.webContents.on('did-start-loading', () => {
        mainWindow.webContents.send('tab-loading-state', { viewId, isLoading: true });
    });

    view.webContents.on('did-stop-loading', () => {
        mainWindow.webContents.send('tab-loading-state', { viewId, isLoading: false });
    });

    view.webContents.on('page-title-updated', (event, title) => {
        mainWindow.webContents.send('tab-title-updated', { viewId, title });
    });

    view.webContents.on('did-navigate', (event, newUrl) => {
        mainWindow.webContents.send('tab-url-updated', { viewId, url: newUrl });
    });
    view.webContents.on('did-navigate-in-page', (event, newUrl) => {
         mainWindow.webContents.send('tab-url-updated', { viewId, url: newUrl });
    });
    // --- End event listeners ---


    // Send message to renderer to add tab to UI
    mainWindow.webContents.send
