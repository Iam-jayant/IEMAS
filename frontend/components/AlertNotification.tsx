'use client';

/**
 * IEMAS - Alert Notification Component
 * 
 * Fixed top-right notification area displaying active alerts with real-time updates.
 * Implements WebSocket connection for <10 second alert delivery.
 * 
 * Requirements: 5.5, 5.6, 5.7
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket, Alert } from '@/hooks/useWebSocket';
import { api } from '@/lib/api';

/**
 * Alert display item with auto-dismiss timer
 */
interface AlertDisplayItem extends Alert {
  dismissTimer?: NodeJS.Timeout;
}

/**
 * AlertNotification Component
 * 
 * Self-contained component that:
 * - Connects to WebSocket for real-time alerts
 * - Displays up to 5 most recent non-dismissed alerts
 * - Shows alert type, meter ID, measured/threshold values, timestamp
 * - Provides Acknowledge and Dismiss actions
 * - Auto-dismisses alerts after 30 seconds
 * - Slide-in animation for new alerts
 * - Color-coded by alert type (HIGH_POWER: red, LOW_POWER_FACTOR: yellow)
 * 
 * @example
 * ```tsx
 * // Add to layout or page
 * <AlertNotification />
 * ```
 */
export default function AlertNotification() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts';
  const { alerts: wsAlerts, isConnected } = useWebSocket(wsUrl);
  
  const [displayAlerts, setDisplayAlerts] = useState<AlertDisplayItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<Set<number>>(new Set());

  /**
   * Get color scheme based on alert type
   */
  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'HIGH_POWER':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-900',
          badge: 'bg-red-600',
          hover: 'hover:bg-red-100',
        };
      case 'LOW_POWER_FACTOR':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-900',
          badge: 'bg-yellow-600',
          hover: 'hover:bg-yellow-100',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-500',
          text: 'text-gray-900',
          badge: 'bg-gray-600',
          hover: 'hover:bg-gray-100',
        };
    }
  };

  /**
   * Format alert type for display
   */
  const formatAlertType = (alertType: string) => {
    return alertType.replace(/_/g, ' ');
  };

  /**
   * Format timestamp to relative time or absolute time
   */
  const formatTimestamp = (timestamp: string) => {
    const alertTime = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - alertTime.getTime()) / 1000);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}m ago`;
    } else {
      return alertTime.toLocaleTimeString();
    }
  };

  /**
   * Setup auto-dismiss timer for new alerts
   */
  const setupAutoDismiss = useCallback((alertId: number) => {
    const timer = setTimeout(() => {
      handleDismiss(alertId);
    }, 30000); // 30 seconds

    return timer;
  }, []);

  /**
   * Process new WebSocket alerts
   */
  useEffect(() => {
    // Filter out already displayed, acknowledged, or dismissed alerts
    const newAlerts = wsAlerts.filter(
      (wsAlert) =>
        !wsAlert.acknowledged &&
        !wsAlert.dismissed &&
        !displayAlerts.some((da) => da.id === wsAlert.id)
    );

    if (newAlerts.length > 0) {
      // Add new alerts with auto-dismiss timers
      const alertsWithTimers = newAlerts.map((alert) => ({
        ...alert,
        dismissTimer: setupAutoDismiss(alert.id),
      }));

      setDisplayAlerts((prev) => {
        // Combine and limit to 5 most recent
        const combined = [...alertsWithTimers, ...prev];
        return combined.slice(0, 5);
      });
    }
  }, [wsAlerts, displayAlerts, setupAutoDismiss]);

  /**
   * Handle acknowledge action
   */
  const handleAcknowledge = async (alertId: number) => {
    if (isProcessing.has(alertId)) return;

    setIsProcessing((prev) => new Set(prev).add(alertId));

    try {
      await api.post(`/api/alerts/${alertId}/acknowledge`, {});
      
      // Remove from display
      setDisplayAlerts((prev) => {
        const updated = prev.filter((alert) => {
          if (alert.id === alertId) {
            // Clear auto-dismiss timer
            if (alert.dismissTimer) {
              clearTimeout(alert.dismissTimer);
            }
            return false;
          }
          return true;
        });
        return updated;
      });
    } catch (error) {
      console.error('[AlertNotification] Failed to acknowledge alert:', error);
    } finally {
      setIsProcessing((prev) => {
        const updated = new Set(prev);
        updated.delete(alertId);
        return updated;
      });
    }
  };

  /**
   * Handle dismiss action
   */
  const handleDismiss = async (alertId: number) => {
    if (isProcessing.has(alertId)) return;

    setIsProcessing((prev) => new Set(prev).add(alertId));

    try {
      await api.post(`/api/alerts/${alertId}/dismiss`, {});
      
      // Remove from display
      setDisplayAlerts((prev) => {
        const updated = prev.filter((alert) => {
          if (alert.id === alertId) {
            // Clear auto-dismiss timer
            if (alert.dismissTimer) {
              clearTimeout(alert.dismissTimer);
            }
            return false;
          }
          return true;
        });
        return updated;
      });
    } catch (error) {
      console.error('[AlertNotification] Failed to dismiss alert:', error);
    } finally {
      setIsProcessing((prev) => {
        const updated = new Set(prev);
        updated.delete(alertId);
        return updated;
      });
    }
  };

  /**
   * Cleanup timers on unmount
   */
  useEffect(() => {
    return () => {
      displayAlerts.forEach((alert) => {
        if (alert.dismissTimer) {
          clearTimeout(alert.dismissTimer);
        }
      });
    };
  }, [displayAlerts]);

  // Don't render if no alerts
  if (displayAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 space-y-2">
      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          <span>Reconnecting to alert service...</span>
        </div>
      )}

      {/* Alert Cards */}
      {displayAlerts.map((alert, index) => {
        const colors = getAlertColor(alert.alert_type);
        const isLoading = isProcessing.has(alert.id);

        return (
          <div
            key={alert.id}
            className={`
              ${colors.bg} ${colors.border} border-l-4 rounded-lg shadow-lg p-4
              animate-slide-in
              transition-all duration-300 ease-out
            `}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Alert Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`${colors.badge} text-white text-xs font-bold px-2 py-1 rounded`}>
                  {formatAlertType(alert.alert_type)}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {formatTimestamp(alert.timestamp)}
                </span>
              </div>
              {isConnected && (
                <span className="w-2 h-2 bg-green-500 rounded-full" title="Connected"></span>
              )}
            </div>

            {/* Meter ID */}
            <div className="mb-3">
              <p className={`${colors.text} font-semibold text-sm`}>
                Meter: <span className="font-mono">{alert.meter_id}</span>
              </p>
            </div>

            {/* Measured vs Threshold Values */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <p className="text-gray-600 text-xs font-medium">Measured Value</p>
                <p className={`${colors.text} font-mono font-bold`}>
                  {alert.measured_value.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-medium">Threshold</p>
                <p className={`${colors.text} font-mono font-bold`}>
                  {alert.threshold_value.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAcknowledge(alert.id)}
                disabled={isLoading}
                className={`
                  flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isLoading ? 'Processing...' : 'Acknowledge'}
              </button>
              <button
                onClick={() => handleDismiss(alert.id)}
                disabled={isLoading}
                className={`
                  flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isLoading ? 'Processing...' : 'Dismiss'}
              </button>
            </div>
          </div>
        );
      })}

      {/* Slide-in animation styles */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
