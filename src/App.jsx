import React, { useState, useEffect } from 'react';
import AIChat from './AIChat';

function App() {
  const [message, setMessage] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [detectedApps, setDetectedApps] = useState([]);
  const [lastDetection, setLastDetection] = useState(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getMonitoringStatus().then((status) => {
        setIsMonitoring(status.monitoring);
      });
      
      window.electronAPI.onMessage((data) => {
        setMessage(`Received: ${data}`);
      });
      
      window.electronAPI.onShortFormDetected((data) => {
        setDetectedApps(data.apps);
        setLastDetection(new Date(data.timestamp).toLocaleTimeString());
      });
    }
    
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeShortFormListener();
      }
    };
  }, []);

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
          <div className="header-title">
            <div className="logo-icon">🛡️</div>
            <div>
              <h1>Focus Guard</h1>
              <p>Protect your productivity</p>
            </div>
          </div>
          <div className={`status-badge ${isMonitoring ? 'active' : 'inactive'}`}>
            <span className="status-pulse"></span>
            {isMonitoring ? 'Active' : 'Inactive'}
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <div className="dashboard-grid">
          {/* Main Control Card */}
          <div className="card main-control-card">
            <div className="card-header">
              <h2>Monitoring Control</h2>
              <div className={`status-indicator-large ${isMonitoring ? 'active' : 'inactive'}`}>
                <div className="status-ring"></div>
                <div className="status-dot-large"></div>
              </div>
            </div>
            <div className="card-content">
              <p className="status-text">
                {isMonitoring 
                  ? 'System is actively monitoring for distracting content' 
                  : 'Monitoring is currently disabled'}
              </p>
              <div className="control-buttons">
                {!isMonitoring ? (
                  <button onClick={handleStartMonitoring} className="btn btn-primary btn-large">
                    <span className="btn-icon">▶</span>
                    Start Monitoring
                  </button>
                ) : (
                  <button onClick={handleStopMonitoring} className="btn btn-danger btn-large">
                    <span className="btn-icon">⏸</span>
                    Stop Monitoring
                  </button>
                )}
                <button onClick={handleCheckNow} className="btn btn-secondary btn-large">
                  <span className="btn-icon">🔍</span>
                  Check Now
                </button>
              </div>
            </div>
          </div>

          {/* Detection Alert Card */}
          {detectedApps.length > 0 && (
            <div className="card alert-card">
              <div className="card-header">
                <h2>Recent Blocks</h2>
                <span className="alert-badge">{detectedApps.length}</span>
              </div>
              <div className="card-content">
                <div className="detected-apps">
                  {detectedApps.map((app, index) => (
                    <div key={index} className="app-tag">
                      {app}
                    </div>
                  ))}
                </div>
                {lastDetection && (
                  <p className="detection-time">Last detected: {lastDetection}</p>
                )}
              </div>
            </div>
          )}

          {/* Monitored Apps Card */}
          <div className="card apps-card">
            <div className="card-header">
              <h2>Protected Apps</h2>
            </div>
            <div className="card-content">
              <div className="apps-grid">
                <div className="app-item">
                  <div className="app-icon">📱</div>
                  <div className="app-info">
                    <div className="app-name">TikTok</div>
                    <div className="app-status">Protected</div>
                  </div>
                </div>
                <div className="app-item">
                  <div className="app-icon">📷</div>
                  <div className="app-info">
                    <div className="app-name">Instagram</div>
                    <div className="app-status">Protected</div>
                  </div>
                </div>
                <div className="app-item">
                  <div className="app-icon">🌐</div>
                  <div className="app-info">
                    <div className="app-name">Safari</div>
                    <div className="app-status">Short-form tabs</div>
                  </div>
                </div>
                <div className="app-item">
                  <div className="app-icon">🌐</div>
                  <div className="app-info">
                    <div className="app-name">Chrome</div>
                    <div className="app-status">Short-form tabs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works Card */}
          <div className="card features-card">
            <div className="card-header">
              <h2>How It Works</h2>
            </div>
            <div className="card-content">
              <div className="features-list">
                <div className="feature-item">
                  <div className="feature-icon">🔍</div>
                  <div className="feature-text">Continuous system monitoring</div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🚫</div>
                  <div className="feature-text">Automatic content blocking</div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">💡</div>
                  <div className="feature-text">Reminder notifications</div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🔒</div>
                  <div className="feature-text">Secure & privacy-focused</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Chat Card */}
          <div className="card ai-chat-card">
            <AIChat isMonitoring={isMonitoring} detectedApps={detectedApps} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
