/**
 * Example usage of useWebSocket hook for real-time alerts
 * 
 * This example demonstrates how to integrate the useWebSocket hook
 * into a React component for displaying real-time alerts from the backend.
 */

import React from 'react';
import { useWebSocket } from './useWebSocket';

/**
 * Example 1: Basic Alert Display Component
 */
export function AlertDashboard() {
  // Get WebSocket URL from environment variable or use default
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts';
  
  const { alerts, isConnected, clearAlerts } = useWebSocket(WS_URL);

  return (
    <div className="alert-dashboard">
      {/* Connection Status */}
      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      {/* Alerts List */}
      <div className="alerts-container">
        <div className="alerts-header">
          <h2>Active Alerts ({alerts.length})</h2>
          {alerts.length > 0 && (
            <button onClick={clearAlerts} className="clear-btn">
              Clear All
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <p className="no-alerts">No active alerts</p>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert-card alert-${alert.alert_type.toLowerCase()}`}>
                <div className="alert-header">
                  <span className="alert-type">{alert.alert_type.replace('_', ' ')}</span>
                  <span className="alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="alert-body">
                  <p><strong>Meter:</strong> {alert.meter_id}</p>
                  <p>
                    <strong>Measured:</strong> {alert.measured_value.toFixed(2)} 
                    <span className="threshold">(Threshold: {alert.threshold_value.toFixed(2)})</span>
                  </p>
                </div>
                <div className="alert-status">
                  {alert.acknowledged && <span className="badge">✓ Acknowledged</span>}
                  {alert.dismissed && <span className="badge">✗ Dismissed</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example 2: Alert Notification Toast
 */
export function AlertNotificationToast() {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts';
  const { alerts, isConnected } = useWebSocket(WS_URL);

  // Show only the most recent 3 alerts as toasts
  const recentAlerts = alerts.slice(0, 3);

  return (
    <div className="notification-container fixed top-4 right-4 z-50">
      {!isConnected && (
        <div className="notification-toast bg-yellow-900 border-yellow-700">
          ⚠️ WebSocket disconnected. Reconnecting...
        </div>
      )}
      
      {recentAlerts.map((alert) => (
        <div 
          key={alert.id} 
          className="notification-toast bg-red-900 border-red-700 animate-slide-in"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div className="flex-1">
              <h4 className="font-bold">{alert.alert_type.replace('_', ' ')}</h4>
              <p className="text-sm">Meter {alert.meter_id}</p>
              <p className="text-xs text-gray-400">
                {alert.measured_value.toFixed(2)} exceeds {alert.threshold_value.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Example 3: Alert Statistics Summary
 */
export function AlertStatistics() {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts';
  const { alerts, isConnected, clearAlerts } = useWebSocket(WS_URL);

  // Calculate statistics
  const highPowerAlerts = alerts.filter(a => a.alert_type === 'HIGH_POWER').length;
  const lowPowerFactorAlerts = alerts.filter(a => a.alert_type === 'LOW_POWER_FACTOR').length;
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged).length;
  const activeAlerts = alerts.filter(a => !a.dismissed).length;

  return (
    <div className="statistics-panel">
      <h3>Alert Statistics</h3>
      
      <div className="stats-grid grid grid-cols-2 gap-4">
        <div className="stat-card">
          <span className="stat-label">Total Alerts</span>
          <span className="stat-value">{alerts.length}</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">Active</span>
          <span className="stat-value">{activeAlerts}</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">High Power</span>
          <span className="stat-value">{highPowerAlerts}</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">Low Power Factor</span>
          <span className="stat-value">{lowPowerFactorAlerts}</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">Acknowledged</span>
          <span className="stat-value">{acknowledgedAlerts}</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">Connection</span>
          <span className={`stat-value ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <button onClick={clearAlerts} className="clear-stats-btn mt-4">
        Clear All Alerts
      </button>
    </div>
  );
}

/**
 * Example 4: Using with React Query for Persistent Alerts
 */
export function PersistentAlertView() {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts';
  const { alerts: liveAlerts, isConnected } = useWebSocket(WS_URL);

  // You could combine live WebSocket alerts with persisted alerts from API
  // const { data: historicalAlerts } = useQuery(['alerts'], fetchHistoricalAlerts);

  return (
    <div className="persistent-alert-view">
      <div className="connection-indicator">
        {isConnected ? (
          <span className="text-green-500">● Live Updates Active</span>
        ) : (
          <span className="text-red-500">● Reconnecting...</span>
        )}
      </div>

      <div className="live-alerts-section">
        <h3>Recent Alerts (Live)</h3>
        {liveAlerts.length === 0 ? (
          <p>No recent alerts</p>
        ) : (
          <ul>
            {liveAlerts.slice(0, 10).map((alert) => (
              <li key={alert.id} className="border-b py-2">
                <div className="flex justify-between">
                  <span>{alert.alert_type}</span>
                  <span className="text-gray-500">{alert.meter_id}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Example 5: Custom Alert Filter
 */
export function FilteredAlerts() {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts';
  const { alerts, isConnected, clearAlerts } = useWebSocket(WS_URL);
  
  const [filterType, setFilterType] = React.useState<string>('ALL');
  const [filterMeter, setFilterMeter] = React.useState<string>('ALL');

  // Filter alerts based on selected criteria
  const filteredAlerts = alerts.filter(alert => {
    if (filterType !== 'ALL' && alert.alert_type !== filterType) return false;
    if (filterMeter !== 'ALL' && alert.meter_id !== filterMeter) return false;
    return true;
  });

  // Get unique meter IDs from alerts
  const meterIds = Array.from(new Set(alerts.map(a => a.meter_id)));

  return (
    <div className="filtered-alerts">
      <div className="filters flex gap-4 mb-4">
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="ALL">All Types</option>
          <option value="HIGH_POWER">High Power</option>
          <option value="LOW_POWER_FACTOR">Low Power Factor</option>
        </select>

        <select 
          value={filterMeter} 
          onChange={(e) => setFilterMeter(e.target.value)}
          className="filter-select"
        >
          <option value="ALL">All Meters</option>
          {meterIds.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>

        <button onClick={clearAlerts} className="clear-btn">
          Clear All
        </button>
      </div>

      <div className="alerts-list">
        {filteredAlerts.map(alert => (
          <div key={alert.id} className="alert-item">
            <span>{alert.alert_type}</span>
            <span>{alert.meter_id}</span>
            <span>{alert.measured_value.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="status-bar">
        Showing {filteredAlerts.length} of {alerts.length} alerts
        {' · '}
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
}
