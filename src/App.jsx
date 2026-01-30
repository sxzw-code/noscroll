import React, { useState, useEffect } from 'react';

function App() {
  const [platform, setPlatform] = useState('');
  const [version, setVersion] = useState('');
  const [message, setMessage] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [detectedApps, setDetectedApps] = useState([]);
  const [lastDetection, setLastDetection] = useState(null);

  useEffect(() => {
    // Access the exposed Electron API from the preload script
    if (window.electronAPI) {
      setPlatform(window.electronAPI.getPlatform());
      setVersion(window.electronAPI.getVersion());
      
      // Get initial monitoring status
      window.electronAPI.getMonitoringStatus().then((status) => {
        setIsMonitoring(status.monitoring);
      });
      
      // Listen for messages from the main process
      window.electronAPI.onMessage((data) => {
        setMessage(`Received: ${data}`);
      });
      
      // Listen for short-form app detection
      window.electronAPI.onShortFormDetected((data) => {
        setDetectedApps(data.apps);
        setLastDetection(new Date(data.timestamp).toLocaleTimeString());
      });
    }
    
    // Cleanup listener on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeShortFormListener();
      }
    };
  }, []);

  const handleSendMessage = () => {
    if (window.electronAPI) {
      window.electronAPI.sendMessage('Hello from React!');
    }
  };

  const handleStartMonitoring = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.startMonitoring();
      setIsMonitoring(result.monitoring);
    }
  };

  const handleStopMonitoring = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.stopMonitoring();
      setIsMonitoring(result.monitoring);
    }
  };

  const handleCheckNow = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.checkAppsNow();
      if (result.detected && result.detected.length > 0) {
        setDetectedApps(result.detected);
        setLastDetection(new Date(result.timestamp).toLocaleTimeString());
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Focus Guard</h1>
          <p>Stay focused by blocking distracting short-form content</p>
        </div>
      </header>
      
      <main className="app-main">
        <div className="info-section">
          <h2>System Information</h2>
          <p><strong>Platform:</strong> {platform || 'Loading...'}</p>
          <p><strong>Electron Version:</strong> {version || 'Loading...'}</p>
        </div>
        
        <div className="monitoring-section">
          <h2>Short-Form App Blocker</h2>
          <div className="monitoring-status">
            <p className={`status-indicator ${isMonitoring ? 'active' : 'inactive'}`}>
              <span className="status-dot"></span>
              <strong>Status:</strong> {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
            </p>
          </div>
          
          <div className="monitoring-controls">
            {!isMonitoring ? (
              <button onClick={handleStartMonitoring} className="action-button start-button">
                Start Monitoring
              </button>
            ) : (
              <button onClick={handleStopMonitoring} className="action-button stop-button">
                Stop Monitoring
              </button>
            )}
            <button onClick={handleCheckNow} className="action-button check-button">
              Check Now
            </button>
          </div>
          
          {detectedApps.length > 0 && (
            <div className="detection-alert">
              <h3>Blocked Apps</h3>
              <ul>
                {detectedApps.map((app, index) => (
                  <li key={index}>{app}</li>
                ))}
              </ul>
              {lastDetection && (
                <p className="detection-time">Last detected: {lastDetection}</p>
              )}
            </div>
          )}
          
          <div className="monitoring-info">
            <p><strong>Monitored Apps:</strong></p>
            <ul className="monitored-list">
              <li>TikTok</li>
              <li>Instagram</li>
              <li>Safari (YouTube Shorts, Instagram Reels, TikTok)</li>
              <li>Chrome (YouTube Shorts, Instagram Reels, TikTok)</li>
            </ul>
          </div>
        </div>
        
        <div className="action-section">
          <h2>IPC Communication</h2>
          <button onClick={handleSendMessage} className="action-button">
            Send Message to Main Process
          </button>
          {message && <p className="message">{message}</p>}
        </div>
        
        <div className="features-section">
          <h2>How It Works</h2>
          <ul>
            <li>Monitors your system for short-form content apps</li>
            <li>Automatically blocks TikTok, Instagram, and short-form browser tabs</li>
            <li>Shows a reminder popup when content is detected</li>
            <li>Runs continuously in the background</li>
            <li>Secure and privacy-focused design</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;

