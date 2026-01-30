# Focus Guard

A cross-platform desktop application that helps users maintain focus by automatically detecting and blocking distracting short-form content applications. Built with Electron, React, and modern web technologies, this project demonstrates full-stack desktop application development, system-level integration, and secure inter-process communication.

## Overview

Focus Guard is a productivity tool that monitors system activity in real-time and automatically blocks access to short-form content platforms like TikTok, Instagram, and YouTube Shorts. The application runs continuously in the background, detecting both native applications and browser tabs, then displays a blocking interface to help users stay focused on their work.

## Tech Stack

- **Frontend**: React 18, Modern CSS with Flexbox/Grid
- **Desktop Framework**: Electron
- **Build Tools**: Webpack, Babel
- **System Integration**: Node.js, macOS AppleScript automation
- **Architecture**: Multi-process Electron architecture with IPC communication
- **Security**: Context isolation, secure preload scripts, disabled node integration

## Key Features

### System-Level Monitoring
- Real-time process detection using native system commands
- Browser tab monitoring for Safari and Chrome
- Automatic app termination and tab closure
- Continuous background monitoring with configurable intervals

### Secure Architecture
- Context isolation between renderer and main processes
- Secure IPC communication via preload scripts
- No direct Node.js API exposure to renderer process
- Follows Electron security best practices

### Modern User Interface
- Responsive React-based UI with real-time status updates
- Real-time monitoring status indicators
- Interactive controls for starting/stopping monitoring
- Blocking popup interface with user acknowledgment flow

### Cross-Platform Compatibility
- macOS system integration with AppleScript
- Permission handling for Accessibility and Automation APIs
- Graceful error handling and fallback mechanisms

## Technical Highlights

### Inter-Process Communication (IPC)
Implemented secure bidirectional communication between Electron's main process and React renderer using IPC handlers and context bridge. The preload script exposes a controlled API surface, preventing direct Node.js access from the renderer process.

### System Integration
Leveraged macOS system APIs and AppleScript to:
- Detect running applications via process monitoring
- Query browser tabs for specific URL patterns
- Programmatically close applications and browser tabs
- Handle system permissions and user authorization

### Real-Time Monitoring
Built a continuous monitoring system that:
- Polls system state every 2 seconds
- Tracks multiple application types simultaneously
- Manages blocking windows and prevents duplicate popups
- Maintains application state across monitoring cycles

### Security Implementation
Applied Electron security best practices:
- Context isolation enabled
- Node integration disabled in renderer
- Preload script as secure API bridge
- Event-driven architecture for safe process communication

## Project Structure

```
project1/
├── main.js              # Electron main process with IPC handlers
├── preload.js           # Secure preload script with context bridge
├── webpack.config.js    # Webpack configuration for React build
├── package.json         # Dependencies and npm scripts
├── public/
│   ├── index.html       # Main application HTML template
│   └── blocking-popup.html  # Blocking popup interface
└── src/
    ├── index.jsx        # React application entry point
    ├── App.jsx          # Main React component with state management
    └── styles.css       # Modern CSS with animations and responsive design
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- macOS (for system integration features)

### Installation

```bash
npm install
```

### Development

Build the React application in watch mode:

```bash
npm run build:dev
```

In a separate terminal, start the Electron application:

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## System Requirements

### macOS Permissions

The application requires system-level permissions to function:

1. **Accessibility Permission**: System Settings → Privacy & Security → Accessibility
   - Required for detecting running applications
   
2. **Automation Permission**: System Settings → Privacy & Security → Automation
   - Required for controlling Safari and Chrome browser tabs

The application will prompt for these permissions on first use, or they can be configured manually in System Settings.

## What This Project Demonstrates

- **Full-Stack Development**: Integration of frontend React UI with backend Electron processes
- **System Programming**: Direct interaction with operating system APIs and processes
- **Security Best Practices**: Implementation of secure communication patterns in Electron
- **Real-Time Systems**: Continuous monitoring and event-driven architecture
- **User Experience Design**: Intuitive interface with clear feedback and controls
- **Cross-Platform Architecture**: Design patterns that support multiple operating systems
- **Problem Solving**: Addressing productivity challenges through technical solutions

## Architecture Decisions

- **Multi-Process Architecture**: Separated main and renderer processes for security and performance
- **Event-Driven IPC**: Used Electron's IPC system for asynchronous communication
- **State Management**: React hooks for component-level state with IPC for cross-process state
- **Modular Design**: Separated concerns between monitoring logic, UI components, and system integration

## Future Enhancements

Potential areas for expansion:
- Windows and Linux support
- Configurable monitoring intervals
- Customizable block lists
- Usage statistics and reporting
- Whitelist/blacklist management
- Scheduled blocking periods

## License

MIT
