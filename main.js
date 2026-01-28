const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

let mainWindow;
let blockingWindows = new Map(); // Track blocking windows by app name
let dismissingWindows = new Set(); // Track windows that are being dismissed
let monitoringInterval = null;
let isMonitoring = false;

// List of known short-form video apps to detect and block
const SHORT_FORM_APPS = [
  'TikTok',
  'Instagram',
  'com.zhiliaoapp.musically', // TikTok bundle ID
  'com.burbn.instagram', // Instagram bundle ID
  'com.google.ios.youtube', // YouTube iOS (if running)
  'com.google.Chrome', // Chrome (we'll check for shorts/reels URLs)
  'com.apple.Safari' // Safari (we'll check for shorts/reels URLs)
];

// URLs that indicate short-form content
const SHORT_FORM_URLS = [
  'youtube.com/shorts',
  'instagram.com/reels',
  'tiktok.com',
  'vm.tiktok.com'
];

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  // Load the index.html file
  const isDev = process.argv.includes('--dev');
  if (isDev) {
    // In development, load from webpack dev server or local file
    mainWindow.loadFile('dist/index.html');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('dist/index.html');
  }

  mainWindow.on('closed', () => {
    console.log('Main window closed');
    // Destroy all blocking windows when main window closes
    blockingWindows.forEach((window, appName) => {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    });
    blockingWindows.clear();
    dismissingWindows.clear();
    mainWindow = null;
  });
  
  // Prevent main window from closing unexpectedly
  mainWindow.on('close', (event) => {
    // Only allow closing if user explicitly closes it (not from blocking detection)
    // This ensures the app stays open for monitoring
    console.log('Main window close event - allowing');
  });
}

// Check if an app is running on macOS
async function isAppRunning(appName) {
  try {
    // Check by process name
    const { stdout } = await execAsync(`pgrep -f -i "${appName}"`);
    return stdout.trim().length > 0;
  } catch (error) {
    // pgrep returns non-zero exit code if no process found
    return false;
  }
}

// Check if browser tabs have short-form URLs open
async function checkBrowserTabs(browserName) {
  try {
    if (browserName === 'Safari') {
      // Use AppleScript to check Safari tabs
      const script = `
        tell application "Safari"
          if it is running then
            set tabURLs to {}
            repeat with w in windows
              repeat with t in tabs of w
                set tabURLs to tabURLs & (URL of t as string)
              end repeat
            end repeat
            return tabURLs
          end if
        end tell
      `;
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const urls = stdout.split(', ').map(url => url.trim());
      return urls.some(url => SHORT_FORM_URLS.some(pattern => url.includes(pattern)));
    } else if (browserName === 'Chrome') {
      // Check Chrome tabs using AppleScript
      const script = `
        tell application "Google Chrome"
          if it is running then
            set tabURLs to {}
            repeat with w in windows
              repeat with t in tabs of w
                set tabURLs to tabURLs & (URL of t as string)
              end repeat
            end repeat
            return tabURLs
          end if
        end tell
      `;
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const urls = stdout.split(', ').map(url => url.trim());
      return urls.some(url => SHORT_FORM_URLS.some(pattern => url.includes(pattern)));
    }
  } catch (error) {
    // App might not be running or accessible
    return false;
  }
  return false;
}

// Create a blocking popup window
function createBlockingPopup(appName, details = {}) {
  // Close existing blocking window for this app if it exists
  if (blockingWindows.has(appName)) {
    const existingWindow = blockingWindows.get(appName);
    if (!existingWindow.isDestroyed()) {
      existingWindow.close();
    }
    blockingWindows.delete(appName);
  }

  // Don't create popup if main window doesn't exist
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.error('Cannot create blocking popup: main window not available');
    return null;
  }

  const blockingWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    closable: false, // Prevent closing via window controls
    minimizable: false,
    maximizable: false,
    modal: false,
    parent: mainWindow, // Set parent to main window
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Store the app name on the window for easy access
  blockingWindow._appName = appName;

  // Handle errors loading the popup
  blockingWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load blocking popup: ${errorDescription}`);
    // Don't quit, just log the error
  });

  blockingWindow.loadFile('dist/blocking-popup.html', {
    query: {
      appName: appName,
      details: JSON.stringify(details)
    }
  }).catch(err => {
    console.error('Error loading blocking popup:', err);
    // Don't quit on error
  });

  // Make sure window stays on top
  blockingWindow.setAlwaysOnTop(true, 'screen-saver');
  blockingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  blockingWindow.show();
  blockingWindow.focus();

  blockingWindows.set(appName, blockingWindow);

  // Handle window closed event
  blockingWindow.on('closed', () => {
    console.log('Blocking window closed event:', appName);
    blockingWindows.delete(appName);
    dismissingWindows.delete(blockingWindow.id);
  });

  return blockingWindow;
}

// Close an app on macOS (after showing blocking popup)
async function closeApp(appName, showPopup = true) {
  try {
    // Show blocking popup first - it will stay open and block
    if (showPopup && !blockingWindows.has(appName)) {
      createBlockingPopup(appName, {
        timestamp: new Date().toISOString(),
        type: appName === 'Safari' || appName === 'Chrome' ? 'browser' : 'app'
      });
    }

    // Close the app/tabs immediately to block access
    if (appName === 'Safari' || appName === 'Chrome') {
      // For browsers, close tabs with short-form URLs instead of closing the whole app
      if (appName === 'Safari') {
        const script = `
          tell application "Safari"
            if it is running then
              repeat with w in windows
                repeat with t in tabs of w
                  set tabURL to URL of t as string
                  if tabURL contains "youtube.com/shorts" or tabURL contains "instagram.com/reels" or tabURL contains "tiktok.com" then
                    close t
                  end if
                end repeat
              end repeat
            end if
          end tell
        `;
        await execAsync(`osascript -e '${script}'`);
      } else if (appName === 'Chrome') {
        const script = `
          tell application "Google Chrome"
            if it is running then
              repeat with w in windows
                repeat with t in tabs of w
                  set tabURL to URL of t as string
                  if tabURL contains "youtube.com/shorts" or tabURL contains "instagram.com/reels" or tabURL contains "tiktok.com" then
                    close t
                  end if
                end repeat
              end repeat
            end if
          end tell
        `;
        await execAsync(`osascript -e '${script}'`);
      }
    } else {
      // For native apps, quit the entire app
      const script = `tell application "${appName}" to quit`;
      await execAsync(`osascript -e '${script}'`);
    }
    return true;
  } catch (error) {
    console.error(`Error closing ${appName}:`, error.message);
    return false;
  }
}

// Check for and block short-form apps
async function checkAndBlockShortFormApps() {
  const detectedApps = [];
  const newlyDetected = [];

  // Check native apps
  for (const appName of ['TikTok', 'Instagram']) {
    if (await isAppRunning(appName)) {
      detectedApps.push(appName);
      // Only show popup if not already showing one for this app
      const isNewDetection = !blockingWindows.has(appName);
      if (isNewDetection) {
        newlyDetected.push(appName);
      }
      await closeApp(appName, isNewDetection);
      console.log(`Blocked ${appName}`);
    } else {
      // App is closed, remove blocking window if it exists
      if (blockingWindows.has(appName)) {
        const window = blockingWindows.get(appName);
        if (!window.isDestroyed()) {
          blockingWindows.delete(appName);
          dismissingWindows.delete(window.id);
          window.destroy();
        } else {
          blockingWindows.delete(appName);
        }
      }
    }
  }

  // Check Safari for short-form URLs
  if (await isAppRunning('Safari')) {
    if (await checkBrowserTabs('Safari')) {
      detectedApps.push('Safari (short-form tabs)');
      const isNewDetection = !blockingWindows.has('Safari');
      if (isNewDetection) {
        newlyDetected.push('Safari (short-form tabs)');
      }
      await closeApp('Safari', isNewDetection);
      console.log('Blocked Safari short-form tabs');
    } else {
      // No short-form tabs, remove blocking window if it exists
      if (blockingWindows.has('Safari')) {
        const window = blockingWindows.get('Safari');
        if (!window.isDestroyed()) {
          blockingWindows.delete('Safari');
          dismissingWindows.delete(window.id);
          window.destroy();
        } else {
          blockingWindows.delete('Safari');
        }
      }
    }
  }

  // Check Chrome for short-form URLs
  if (await isAppRunning('Google Chrome') || await isAppRunning('Chrome')) {
    if (await checkBrowserTabs('Chrome')) {
      detectedApps.push('Chrome (short-form tabs)');
      const isNewDetection = !blockingWindows.has('Chrome');
      if (isNewDetection) {
        newlyDetected.push('Chrome (short-form tabs)');
      }
      await closeApp('Chrome', isNewDetection);
      console.log('Blocked Chrome short-form tabs');
    } else {
      // No short-form tabs, remove blocking window if it exists
      if (blockingWindows.has('Chrome')) {
        const window = blockingWindows.get('Chrome');
        if (!window.isDestroyed()) {
          blockingWindows.delete('Chrome');
          dismissingWindows.delete(window.id);
          window.destroy();
        } else {
          blockingWindows.delete('Chrome');
        }
      }
    }
  }

  // Notify renderer if apps were newly detected
  if (newlyDetected.length > 0 && mainWindow) {
    mainWindow.webContents.send('short-form-detected', {
      apps: newlyDetected,
      timestamp: new Date().toISOString()
    });
  }

  return detectedApps;
}

// Start monitoring for short-form apps
function startMonitoring() {
  if (isMonitoring) return;
  
  isMonitoring = true;
  console.log('Starting short-form app monitoring...');
  
  // Check immediately
  checkAndBlockShortFormApps();
  
  // Then check every 2 seconds
  monitoringInterval = setInterval(() => {
    checkAndBlockShortFormApps();
  }, 2000);
}

// Stop monitoring
function stopMonitoring() {
  if (!isMonitoring) return;
  
  isMonitoring = false;
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  console.log('Stopped short-form app monitoring');
}

// IPC handlers
ipcMain.handle('send-message', async (event, message) => {
  console.log('Message from renderer:', message);
  // Send a response back to the renderer
  if (mainWindow) {
    mainWindow.webContents.send('message-from-main', `Echo: ${message}`);
  }
  return { success: true, message: 'Message received' };
});

ipcMain.handle('start-monitoring', async () => {
  startMonitoring();
  return { success: true, monitoring: true };
});

ipcMain.handle('stop-monitoring', async () => {
  stopMonitoring();
  return { success: true, monitoring: false };
});

ipcMain.handle('get-monitoring-status', async () => {
  return { monitoring: isMonitoring };
});

ipcMain.handle('check-apps-now', async () => {
  const detected = await checkAndBlockShortFormApps();
  return { detected, timestamp: new Date().toISOString() };
});

ipcMain.handle('dismiss-blocking-popup', async (event, appName) => {
  console.log('dismiss-blocking-popup called for:', appName);
  console.log('Current blocking windows:', Array.from(blockingWindows.keys()));
  
  // Try to find window by appName in the map
  let targetWindow = null;
  if (blockingWindows.has(appName)) {
    targetWindow = blockingWindows.get(appName);
  } else {
    // Fallback: search all blocking windows by appName property
    for (const [name, win] of blockingWindows.entries()) {
      if (name === appName || (win._appName && win._appName === appName)) {
        targetWindow = win;
        break;
      }
    }
  }
  
  if (targetWindow && !targetWindow.isDestroyed()) {
    console.log('Destroying blocking window for:', appName);
    // Remove from map first
    blockingWindows.delete(appName);
    // Also remove from dismissing set if it was there
    dismissingWindows.delete(targetWindow.id);
    // Destroy the window directly (more reliable than close)
    targetWindow.destroy();
    console.log('Window destroyed');
    return { success: true };
  } else {
    console.log('No valid blocking window found for:', appName);
    // Clean up anyway
    blockingWindows.delete(appName);
    return { success: false, error: 'Window not found or already destroyed' };
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  
  // Start monitoring automatically when app is ready
  startMonitoring();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Clean up monitoring on app quit
app.on('before-quit', () => {
  stopMonitoring();
});

// Quit when all windows are closed (but not if blocking windows are still open)
app.on('window-all-closed', (event) => {
  console.log('window-all-closed event fired');
  console.log('Blocking windows count:', blockingWindows.size);
  console.log('All windows:', BrowserWindow.getAllWindows().length);
  console.log('Main window exists:', mainWindow && !mainWindow.isDestroyed());
  
  // NEVER quit if there are blocking windows still open
  if (blockingWindows.size > 0) {
    console.log('Preventing quit - blocking windows still open');
    event.preventDefault();
    return;
  }
  
  // NEVER quit if main window still exists
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('Preventing quit - main window still exists');
    event.preventDefault();
    return;
  }
  
  // Only quit on non-macOS platforms, and only if really no windows exist
  console.log('Allowing quit - no windows remain');
  if (process.platform !== 'darwin') {
    app.quit();
  }
  // On macOS, don't quit - let the app stay in dock
});

