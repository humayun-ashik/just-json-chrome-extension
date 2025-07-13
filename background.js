// background.js

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`Background: Received message - Action: ${request.action}`);

    if (request.action === "saveJson") {
        chrome.storage.local.set({ lastJsonInput: request.data }, () => {
            if (chrome.runtime.lastError) {
                console.error("Background: Error saving JSON:", chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log("Background: JSON saved to storage successfully.");
                sendResponse({ success: true });
            }
        });
        return true; // Keep message channel open for async sendResponse
    } else if (request.action === "loadJson") {
        chrome.storage.local.get('lastJsonInput', (data) => {
            if (chrome.runtime.lastError) {
                console.error("Background: Error loading JSON:", chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log("Background: JSON loaded from storage. Data present:", !!data.lastJsonInput);
                sendResponse({ success: true, data: data.lastJsonInput });
            }
        });
        return true;
    } else if (request.action === "clearJson") {
        chrome.storage.local.remove('lastJsonInput', () => {
            if (chrome.runtime.lastError) {
                console.error("Background: Error clearing JSON:", chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log("Background: JSON cleared from storage.");
                sendResponse({ success: true });
            }
        });
        return true;
    } else if (request.action === "saveTheme") { // Added for theme persistence
        chrome.storage.local.set({ darkMode: request.data }, () => {
            if (chrome.runtime.lastError) {
                console.error("Background: Error saving theme:", chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log("Background: Theme saved to storage:", request.data);
                sendResponse({ success: true });
            }
        });
        return true;
    } else if (request.action === "loadTheme") { // Added for theme persistence
        chrome.storage.local.get('darkMode', (data) => {
            if (chrome.runtime.lastError) {
                console.error("Background: Error loading theme:", chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log("Background: Theme loaded from storage:", data.darkMode);
                sendResponse({ success: true, data: data.darkMode });
            }
        });
        return true;
    }
});

console.log("Background Service Worker registered and running.");
