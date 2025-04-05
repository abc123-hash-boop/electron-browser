// renderer.js
const tabsContainer = document.getElementById('tabs');
const newTabButton = document.getElementById('new-tab-button');
const backButton = document.getElementById('back-button');
const forwardButton = document.getElementById('forward-button');
const reloadButton = document.getElementById('reload-button');
const urlInput = document.getElementById('url-input');

let activeViewId = null;
let tabs = {}; // Store tab elements { viewId: { element: DOMElement, title: string, url: string, isLoading: boolean } }

// --- Create Tab UI ---
function createTabElement(viewId, url, activate) {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.viewId = viewId; // Store viewId on the element

    // Loading indicator (optional)
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'tab-loading';
    loadingIndicator.style.display = 'none'; // Initially hidden

    const titleElement = document.createElement('span');
    titleElement.className = 'tab-title';
    titleElement.textContent = 'Loading...'; // Initial title

    const closeButton = document.createElement('button');
    closeButton.className = 'tab-close-button';
    closeButton.innerHTML = '&times;'; // 'x' symbol
    closeButton.title = 'Close Tab';

    tabElement.appendChild(loadingIndicator);
    tabElement.appendChild(titleElement);
    tabElement.appendChild(closeButton);
    tabsContainer.appendChild(tabElement);

    tabs[viewId] = {
        element: tabElement,
        title: 'Loading...',
        url: url,
        isLoading: true
    };

    // --- Event Listeners for the new tab element ---
    tabElement.addEventListener('click', (event) => {
        // Don't switch tab if close button was clicked
        if (event.target !== closeButton) {
             window.electronAPI.switchToTab(viewId);
        }
    });

    closeButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent tab click event
        window.electronAPI.closeTab(viewId);
    });

    if (activate) {
        setActiveTab(viewId);
    }
}

// --- Set Active Tab UI ---
function setActiveTab(viewId) {
    // Deactivate previous tab
    if (activeViewId && tabs[activeViewId]) {
        tabs[activeViewId].element.classList.remove('active');
    } else {
         // Deactivate any other tabs that might somehow be marked active
         document.querySelectorAll('.tab.active').forEach(t => t.classList.remove('active'));
    }


    // Activate new tab
    if (tabs[viewId]) {
        tabs[viewId].element.classList.add('active');
        activeViewId = viewId;
        urlInput.value = tabs[viewId].url || ''; // Update URL bar
        updateNavButtons(); // Update back/forward state
        // Scroll the active tab into view if the container overflows
        tabs[viewId].element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    } else {
        console.warn("Tried to activate a non-existent tab:", viewId);
        activeViewId = null;
        urlInput.value = ''; // Clear URL bar if no tab active
    }

}

// --- Remove Tab UI ---
function removeTabElement(viewId) {
    if (tabs[viewId]) {
        tabs[viewId].element.remove();
        delete tabs[viewId];
         // If the closed tab was active, the main process should trigger a switch
         // If no tabs remain, clear the url input
         if (Object.keys(tabs).length === 0) {
             activeViewId = null;
             urlInput.value = '';
             updateNavButtons(); // Disable buttons
         }
    }
}

// --- Update Tab Properties ---
function updateTabTitle(viewId, title) {
    if (tabs[viewId]) {
        tabs[viewId].title = title;
        const titleElement = tabs[viewId].element.querySelector('.tab-title');
        if (titleElement) {
            titleElement.textContent = title;
            tabs[viewId].element.title = title; // Set tooltip
        }
    }
}

function updateTabUrl(viewId, url) {
     if (tabs[viewId]) {
         tabs[viewId].url = url;
         if (viewId === activeViewId) {
             urlInput.value = url;
             // Update nav buttons potentially after URL change (canGoBack/Forward might change)
             updateNavButtons();
         }
     }
}

function updateTabLoadingState(viewId, isLoading) {
    if (tabs[viewId]) {
        tabs[viewId].isLoading = isLoading;
        const loadingIndicator = tabs[viewId].element.querySelector('.tab-loading');
        const reloadBtn = document.getElementById('reload-button'); // Assuming single reload button

        if (loadingIndicator) {
            loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }

        // Update reload/stop button state if it's the active tab
        if (viewId === activeViewId) {
            reloadBtn.innerHTML = isLoading ? '&#10005;' : '&#8635;'; // Change icon to 'X' (stop) or 'Reload'
             reloadBtn.title = isLoading ? 'Stop Loading' : 'Reload';
        }
    }
}


// --- Update Navigation Buttons ---
// Note: We don't have direct access to canGoBack/canGoForward here.
// A more robust solution would involve the main process sending updates
// about navigation state changes for the active tab.
// For simplicity, we'll just enable them generically.
// A better approach: Main process sends `nav-state-update { viewId, canGoBack, canGoForward }`
function updateNavButtons() {
     // Basic implementation: Enable if an active tab exists
     const hasActiveTab = activeViewId !== null && tabs[activeViewId];
     backButton.disabled = !hasActiveTab; // Simplistic: enable if tab exists
     forwardButton.disabled = !hasActiveTab; // Simplistic: enable if tab exists
     reloadButton.disabled = !hasActiveTab;
     urlInput.disabled = !hasActiveTab;

     // TODO: Listen for messages from main process with actual canGoBack/canGoForward state
     // for the active viewId and update disabled property accordingly.
}

// --- Event Listeners ---
newTabButton.addEventListener('click', () => {
    // Ask main process to create a tab and activate it
    window.electronAPI.createNewTab(undefined, true);
});

backButton.addEventListener('click', () => {
    if (activeViewId) window.electronAPI.goBack(activeViewId);
});

forwardButton.addEventListener('click', () => {
    if (activeViewId) window.electronAPI.goForward(activeViewId);
});

reloadButton.addEventListener('click', () => {
    if (activeViewId) {
        // Check if currently loading to implement Stop functionality
        if (tabs[activeViewId] && tabs[activeViewId].isLoading) {
            // Need an IPC message for 'stop-loading' in main.js
             console.warn("Stop loading not implemented in main.js yet");
             // window.electronAPI.stopLoading(activeViewId);
        } else {
            window.electronAPI.reloadPage(activeViewId);
        }
    }
});


urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && activeViewId) {
        event.preventDefault(); // Prevent form submission if it were in a form
        let url = urlInput.value.trim();
        if(url) {
            window.electronAPI.navigate(activeViewId, url);
        }
    }
});

// --- IPC Listeners (Main -> Renderer) ---
window.electronAPI.onAddTab(({ viewId, url, activate }) => {
    createTabElement(viewId, url, activate);
});

window.electronAPI.onRemoveTab((viewId) => {
    removeTabElement(viewId);
});

window.electronAPI.onTabSwitched(({ viewId, url }) => {
     setActiveTab(viewId);
     // Main process already sent the URL, but we ensure UI consistency
     if(tabs[viewId]) {
         tabs[viewId].url = url;
         urlInput.value = url;
     } else {
         urlInput.value = ''; // Clear if tab data somehow missing
     }
     updateNavButtons(); // Update nav buttons on switch
});

window.electronAPI.onTabTitleUpdated(({ viewId, title }) => {
    updateTabTitle(viewId, title);
});

window.electronAPI.onTabUrlUpdated(({ viewId, url }) => {
     updateTabUrl(viewId, url);
});

window.electronAPI.onTabLoadingState(({ viewId, isLoading }) => {
     updateTabLoadingState(viewId, isLoading);
});


// --- Initial State ---
updateNavButtons(); // Set initial button state (likely disabled)
