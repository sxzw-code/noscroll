# Electron React App

A modern Electron application with React renderer and preload script, featuring secure context isolation and short-form app blocking.

## Features

- ✅ Electron main process
- ✅ Preload script with context isolation
- ✅ React renderer process
- ✅ Secure IPC communication
- ✅ Webpack build configuration
- ✅ Modern UI with CSS
- ✅ **Short-form app detection and blocking** (TikTok, Instagram, YouTube Shorts, etc.)

## Getting Started

### Installation

```bash
npm install
```

### Development

Build the React app and start Electron:

```bash
npm run build:dev
```

In another terminal:

```bash
npm run dev
```

### Production

Build for production:

```bash
npm run build
npm start
```

## Project Structure

```
project1/
├── main.js           # Main Electron process
├── preload.js        # Preload script (runs in isolated context)
├── webpack.config.js # Webpack configuration
├── package.json      # Dependencies and scripts
├── public/
│   └── index.html   # HTML template
└── src/
    ├── index.jsx    # React entry point
    ├── App.jsx      # Main React component
    └── styles.css   # Application styles
```

## Security

This app uses:
- **Context Isolation**: Enabled for security
- **Node Integration**: Disabled in renderer
- **Preload Script**: Secure bridge between main and renderer processes

## Short-Form App Blocker

This app automatically detects and blocks short-form scrolling apps to help you stay focused. It monitors for:

- **Native Apps**: TikTok, Instagram
- **Browser Tabs**: YouTube Shorts, Instagram Reels, TikTok (in Safari/Chrome)

The monitoring starts automatically when the app launches and checks every 2 seconds. You can control it from the UI.

### macOS Permissions

**Important**: On macOS, you'll need to grant **Accessibility** and **Automation** permissions for the app to detect and close other applications:

1. Go to **System Settings** → **Privacy & Security** → **Accessibility**
2. Add this app and enable it
3. Go to **System Settings** → **Privacy & Security** → **Automation**
4. Ensure the app has permission to control Safari/Chrome

Without these permissions, the app detection may not work properly.

## IPC Communication

The preload script exposes a safe API (`window.electronAPI`) that the React renderer can use to communicate with the main process without exposing Node.js APIs directly.

