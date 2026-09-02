/**
 * WebSocket Hook for Real-Time Alerts
 * 
 * Implements WebSocket connection to backend /ws/alerts endpoint
 * with automatic reconnection, exponential backoff, and alert management.
 * 
 * Requirements: 5.5, 5.6
 */

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Alert interface matching backend schema
 */
export interface Alert {
  id: number;
  meter_id: string;
  alert_type: string;
  measured_value: number;
  threshold_value: number;
  timestamp: string;
  acknowledged: boolean;
  dismissed: boolean;
}

/**
 * WebSocket message types from backend
 */
interface WebSocketMessage {
  type: 'alert' | 'connected' | 'pong' | 'system' | 'new_reading';
  timestamp?: string;
  alert?: Alert;
  message?: string;
  data?: any;
}

/**
 * Hook return type
 */
interface UseWebSocketReturn {
  alerts: Alert[];
  isConnected: boolean;
  clearAlerts: () => void;
}

/**
 * WebSocket configuration
 */
const WS_CONFIG = {
  INITIAL_RETRY_DELAY: 1000,      // 1 second
  MAX_RETRY_DELAY: 30000,          // 30 seconds
  BACKOFF_MULTIPLIER: 2,           // Exponential backoff
  PING_INTERVAL: 30000,            // 30 seconds keepalive
};

/**
 * Custom hook for WebSocket connection to real-time alerts
 * 
 * @param url - WebSocket URL endpoint (e.g., 'ws://localhost:8000/ws/alerts')
 * @returns Object containing alerts array, connection status, and clearAlerts function
 * 
 * Features:
 * - Automatic connection on mount
 * - Auto-reconnect on disconnection with exponential backoff
 * - Stores incoming alerts in state array
 * - Graceful error handling and JSON parsing
 * - Cleanup on unmount
 * - Keepalive ping/pong
 * 
 * @example
 * ```tsx
 * const { alerts, isConnected, clearAlerts } = useWebSocket('ws://localhost:8000/ws/alerts');
 * 
 * return (
 *   <div>
 *     <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
 *     {alerts.map(alert => (
 *       <AlertCard key={alert.id} alert={alert} />
 *     ))}
 *     <button onClick={clearAlerts}>Clear Alerts</button>
 *   </div>
 * );
 * ```
 */
export function useWebSocket(url: string): UseWebSocketReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Use refs to persist values across renders without causing re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelayRef = useRef(WS_CONFIG.INITIAL_RETRY_DELAY);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const mountedRef = useRef(true);

  /**
   * Clear all alerts from state
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  /**
   * Setup ping interval for keepalive
   */
  const setupPingInterval = useCallback(() => {
    // Clear existing interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Send ping every 30 seconds to keep connection alive
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send('ping');
        } catch (error) {
          console.error('[WebSocket] Failed to send ping:', error);
        }
      }
    }, WS_CONFIG.PING_INTERVAL);
  }, []);

  /**
   * Clear ping interval
   */
  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    // Don't connect if component is unmounted or already connected
    if (!mountedRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log('[WebSocket] Connecting to:', url);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        retryDelayRef.current = WS_CONFIG.INITIAL_RETRY_DELAY; // Reset retry delay on successful connection
        setupPingInterval();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle different message types
          switch (message.type) {
            case 'alert':
              if (message.alert) {
                console.log('[WebSocket] Received alert:', message.alert);
                // Add new alert to the beginning of the array
                setAlerts((prev) => [message.alert!, ...prev]);
              }
              break;
            
            case 'connected':
              console.log('[WebSocket] Server acknowledged connection:', message.message);
              break;
            
            case 'pong':
              // Keepalive response, no action needed
              break;
            
            case 'system':
              console.log('[WebSocket] System message:', message.data);
              break;
              
            case 'new_reading':
              // Handled by UI polling currently, could update cache here in future
              break;
            
            default:
              console.warn('[WebSocket] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
          console.error('[WebSocket] Raw message:', event.data);
        }
      };

      ws.onerror = () => {
        // Browser WebSocket 'error' events carry no useful payload (they log as {}).
        // The subsequent 'onclose' handler already manages reconnection, so we
        // only emit a brief warning here to avoid alarming console noise.
        console.warn('[WebSocket] Connection error – will auto-reconnect');
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        clearPingInterval();
        wsRef.current = null;

        // Attempt to reconnect if component is still mounted and reconnection is enabled
        if (mountedRef.current && shouldReconnectRef.current) {
          const delay = retryDelayRef.current;
          console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
          
          retryTimeoutRef.current = setTimeout(() => {
            // Exponential backoff up to max delay
            retryDelayRef.current = Math.min(
              retryDelayRef.current * WS_CONFIG.BACKOFF_MULTIPLIER,
              WS_CONFIG.MAX_RETRY_DELAY
            );
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      setIsConnected(false);
      
      // Retry connection
      if (mountedRef.current && shouldReconnectRef.current) {
        const delay = retryDelayRef.current;
        retryTimeoutRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(
            retryDelayRef.current * WS_CONFIG.BACKOFF_MULTIPLIER,
            WS_CONFIG.MAX_RETRY_DELAY
          );
          connect();
        }, delay);
      }
    }
  }, [url, setupPingInterval, clearPingInterval]);

  /**
   * Disconnect and cleanup
   */
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Clear ping interval
    clearPingInterval();

    // Close WebSocket connection
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Component unmounting');
      } catch (error) {
        console.error('[WebSocket] Error closing connection:', error);
      }
      wsRef.current = null;
    }

    setIsConnected(false);
  }, [clearPingInterval]);

  /**
   * Setup connection on mount, cleanup on unmount
   */
  useEffect(() => {
    mountedRef.current = true;
    shouldReconnectRef.current = true;
    
    connect();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    alerts,
    isConnected,
    clearAlerts,
  };
}
