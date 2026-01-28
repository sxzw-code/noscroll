const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: Send a message to the main process
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  
  // Example: Listen for messages from the main process
  onMessage: (callback) => {
    ipcRenderer.on('message-from-main', (event, data) => callback(data));
  },
  
  // Get platform information
  getPlatform: () => process.platform,
  
  // Get app version
  getVersion: () => process.versions.electron,
  
  // Short-form app monitoring controls
  startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
  stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
  getMonitoringStatus: () => ipcRenderer.invoke('get-monitoring-status'),
  checkAppsNow: () => ipcRenderer.invoke('check-apps-now'),
  
  // Listen for short-form app detection events
  onShortFormDetected: (callback) => {
    ipcRenderer.on('short-form-detected', (event, data) => callback(data));
  },
  
  // Remove listener
  removeShortFormListener: () => {
    ipcRenderer.removeAllListeners('short-form-detected');
  },
  
  // Dismiss blocking popup
  dismissBlockingPopup: (appName) => ipcRenderer.invoke('dismiss-blocking-popup', appName)
});

// You can expose more APIs here as needed
console.log('Preload script loaded');

