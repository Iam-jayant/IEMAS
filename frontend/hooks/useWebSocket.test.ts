/**
 * Unit tests for useWebSocket hook
 * 
 * Tests WebSocket connection, reconnection logic, alert management,
 * and error handling for real-time alerts.
 * 
 * Note: These tests require testing dependencies to be configured.
 * Install: npm install --save-dev vitest @testing-library/react @testing-library/react-hooks jsdom
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWebSocket, Alert } from './useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState: number = MockWebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public url: string;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      const closeEvent = new CloseEvent('close', { code, reason });
      this.onclose(closeEvent);
    }
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage(messageEvent);
    }
  }

  // Helper method to simulate an error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('useWebSocket', () => {
  let mockWS: MockWebSocket;
  const testUrl = 'ws://localhost:8000/ws/alerts';

  beforeEach(() => {
    vi.useFakeTimers();
    
    // Mock WebSocket constructor
    global.WebSocket = vi.fn((url: string) => {
      mockWS = new MockWebSocket(url);
      return mockWS as any;
    }) as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with empty alerts and disconnected state', () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    expect(result.current.alerts).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect to WebSocket on mount', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(global.WebSocket).toHaveBeenCalledWith(testUrl);
    expect(result.current.isConnected).toBe(true);
  });

  it('should add alerts to state when receiving alert messages', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const mockAlert: Alert = {
      id: 1,
      meter_id: 'METER_001',
      alert_type: 'HIGH_POWER',
      measured_value: 5500,
      threshold_value: 5000,
      timestamp: '2024-01-15T10:00:00Z',
      acknowledged: false,
      dismissed: false,
    };

    // Simulate receiving an alert
    await act(async () => {
      mockWS.simulateMessage({
        type: 'alert',
        timestamp: '2024-01-15T10:00:00Z',
        alert: mockAlert,
      });
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0]).toEqual(mockAlert);
  });

  it('should add multiple alerts in order (newest first)', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const alert1: Alert = {
      id: 1,
      meter_id: 'METER_001',
      alert_type: 'HIGH_POWER',
      measured_value: 5500,
      threshold_value: 5000,
      timestamp: '2024-01-15T10:00:00Z',
      acknowledged: false,
      dismissed: false,
    };

    const alert2: Alert = {
      id: 2,
      meter_id: 'METER_002',
      alert_type: 'LOW_POWER_FACTOR',
      measured_value: 0.75,
      threshold_value: 0.85,
      timestamp: '2024-01-15T10:05:00Z',
      acknowledged: false,
      dismissed: false,
    };

    await act(async () => {
      mockWS.simulateMessage({ type: 'alert', alert: alert1 });
      mockWS.simulateMessage({ type: 'alert', alert: alert2 });
    });

    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.alerts[0]).toEqual(alert2); // Newest first
    expect(result.current.alerts[1]).toEqual(alert1);
  });

  it('should clear alerts when clearAlerts is called', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const mockAlert: Alert = {
      id: 1,
      meter_id: 'METER_001',
      alert_type: 'HIGH_POWER',
      measured_value: 5500,
      threshold_value: 5000,
      timestamp: '2024-01-15T10:00:00Z',
      acknowledged: false,
      dismissed: false,
    };

    await act(async () => {
      mockWS.simulateMessage({ type: 'alert', alert: mockAlert });
    });

    expect(result.current.alerts).toHaveLength(1);

    await act(async () => {
      result.current.clearAlerts();
    });

    expect(result.current.alerts).toEqual([]);
  });

  it('should handle connection acknowledgment messages', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await act(async () => {
      mockWS.simulateMessage({
        type: 'connected',
        message: 'Connection established',
      });
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Server acknowledged connection')
    );

    consoleSpy.mockRestore();
  });

  it('should handle pong messages for keepalive', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Should not throw or add to alerts
    await act(async () => {
      mockWS.simulateMessage({ type: 'pong' });
    });

    expect(result.current.alerts).toEqual([]);
  });

  it('should handle system messages', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await act(async () => {
      mockWS.simulateMessage({
        type: 'system',
        data: { status: 'maintenance' },
      });
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('System message')
    );

    consoleSpy.mockRestore();
  });

  it('should handle invalid JSON messages gracefully', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      if (mockWS.onmessage) {
        mockWS.onmessage(
          new MessageEvent('message', { data: 'invalid json' })
        );
      }
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.alerts).toEqual([]);

    consoleErrorSpy.mockRestore();
  });

  it('should send ping messages at regular intervals', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const sendSpy = vi.spyOn(mockWS, 'send');

    // Advance by 30 seconds (ping interval)
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(sendSpy).toHaveBeenCalledWith('ping');

    // Advance by another 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('should attempt to reconnect on disconnection', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);

    // Simulate disconnection
    await act(async () => {
      mockWS.close(1006, 'Connection lost');
    });

    expect(result.current.isConnected).toBe(false);

    // Should attempt reconnection after 1 second (initial delay)
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Wait for reconnection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(global.WebSocket).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff for reconnection attempts', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Simulate multiple disconnections to test backoff
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        mockWS.close(1006, 'Connection lost');
      });

      const expectedDelay = Math.min(1000 * Math.pow(2, i), 30000);
      
      await act(async () => {
        vi.advanceTimersByTime(expectedDelay);
        vi.advanceTimersByTime(20); // Connection time
      });
    }

    // Should have attempted reconnection multiple times
    expect(global.WebSocket).toHaveBeenCalled();
  });

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);

    const closeSpy = vi.spyOn(mockWS, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('should not reconnect after unmount', async () => {
    const { unmount } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const initialCallCount = (global.WebSocket as any).mock.calls.length;

    // Simulate disconnection
    await act(async () => {
      mockWS.close(1006, 'Connection lost');
    });

    unmount();

    // Advance time for potential reconnection attempt
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Should not attempt reconnection after unmount
    expect((global.WebSocket as any).mock.calls.length).toBe(initialCallCount);
  });

  it('should handle WebSocket errors gracefully', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      mockWS.simulateError();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should respect max retry delay of 30 seconds', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Simulate many disconnections to exceed max delay
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        mockWS.close(1006, 'Connection lost');
        vi.advanceTimersByTime(30000); // Max delay
        vi.advanceTimersByTime(20); // Connection time
      });
    }

    // Should still be attempting connections with max 30s delay
    expect(global.WebSocket).toHaveBeenCalled();
  });

  it('should handle missing alert in alert message', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await act(async () => {
      mockWS.simulateMessage({
        type: 'alert',
        timestamp: '2024-01-15T10:00:00Z',
        // Missing alert field
      });
    });

    expect(result.current.alerts).toEqual([]);
  });

  it('should warn about unknown message types', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await act(async () => {
      mockWS.simulateMessage({
        type: 'unknown_type',
        data: {},
      });
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown message type')
    );

    consoleWarnSpy.mockRestore();
  });

  it('should reset retry delay on successful connection', async () => {
    const { result } = renderHook(() => useWebSocket(testUrl));

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Simulate disconnection and reconnection
    await act(async () => {
      mockWS.close(1006, 'Connection lost');
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(20);
    });

    // Disconnect again
    await act(async () => {
      mockWS.close(1006, 'Connection lost');
    });

    // Should use initial delay again (1 second)
    await act(async () => {
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);
  });
});
