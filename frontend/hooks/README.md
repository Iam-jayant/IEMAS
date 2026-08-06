# React Hooks Documentation

## useWebSocket Hook

### Overview

The `useWebSocket` hook provides a React interface for real-time alert notifications via WebSocket connection to the IEMAS backend. It handles connection management, automatic reconnection with exponential backoff, and alert state management.

### Requirements Coverage

- **Requirement 5.5**: Real-time alert display in dashboard
- **Requirement 5.6**: Alert updates within 10 seconds

### Features

- ✅ Automatic WebSocket connection on mount
- ✅ Auto-reconnect on disconnection with exponential backoff (1s → 2s → 4s → 8s → max 30s)
- ✅ Graceful error handling and JSON parsing
- ✅ Keepalive ping/pong mechanism (30s interval)
- ✅ Clean connection teardown on unmount
- ✅ Alert state management with newest-first ordering
- ✅ Connection status tracking
- ✅ Clear alerts functionality

### Installation

No additional dependencies required. The hook uses native browser WebSocket API.

### Usage

#### Basic Usage

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function AlertDashboard() {
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts';
  const { alerts, isConnected, clearAlerts } = useWebSocket(WS_URL);

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Active Alerts: {alerts.length}</p>
      
      {alerts.map(alert => (
        <div key={alert.id}>
          <h4>{alert.alert_type}</h4>
          <p>Meter: {alert.meter_id}</p>
          <p>Value: {alert.measured_value} (Threshold: {alert.threshold_value})</p>
        </div>
      ))}
      
      <button onClick={clearAlerts}>Clear Alerts</button>
    </div>
  );
}
```

#### With Environment Variables

Configure the WebSocket URL in your `.env.local` file:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/alerts
```

Then use it in your component:

```typescript
const { alerts, isConnected, clearAlerts } = useWebSocket(
  process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts'
);
```

### API Reference

#### Hook Signature

```typescript
function useWebSocket(url: string): UseWebSocketReturn
```

#### Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `url`     | string | Yes      | WebSocket endpoint URL (e.g., `ws://localhost:8000/ws/alerts`) |

#### Return Value

```typescript
interface UseWebSocketReturn {
  alerts: Alert[];        // Array of received alerts (newest first)
  isConnected: boolean;   // Connection status
  clearAlerts: () => void; // Function to clear all alerts
}
```

#### Alert Type

```typescript
interface Alert {
  id: number;               // Alert ID
  meter_id: string;         // Meter identifier
  alert_type: string;       // "HIGH_POWER" | "LOW_POWER_FACTOR"
  measured_value: number;   // Measured value that triggered alert
  threshold_value: number;  // Configured threshold value
  timestamp: string;        // ISO 8601 timestamp
  acknowledged: boolean;    // Whether alert has been acknowledged
  dismissed: boolean;       // Whether alert has been dismissed
}
```

### Message Protocol

The hook handles the following WebSocket message types from the backend:

#### Alert Message

```json
{
  "type": "alert",
  "timestamp": "2024-01-15T10:00:00Z",
  "alert": {
    "id": 1,
    "meter_id": "METER_001",
    "alert_type": "HIGH_POWER",
    "measured_value": 5500.0,
    "threshold_value": 5000.0,
    "timestamp": "2024-01-15T10:00:00Z",
    "acknowledged": false,
    "dismissed": false
  }
}
```

#### Connection Acknowledgment

```json
{
  "type": "connected",
  "message": "WebSocket connection established",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

#### Keepalive Pong

```json
{
  "type": "pong",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

#### System Message

```json
{
  "type": "system",
  "data": {
    "status": "maintenance",
    "message": "System maintenance scheduled"
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Connection Behavior

#### Initial Connection

- Connects automatically on component mount
- Sets `isConnected` to `true` when connection succeeds
- Starts keepalive ping interval (30s)

#### Reconnection Strategy

When the connection drops:

1. **First retry**: 1 second delay
2. **Second retry**: 2 seconds delay
3. **Third retry**: 4 seconds delay
4. **Fourth retry**: 8 seconds delay
5. **Subsequent retries**: 30 seconds delay (max)

The delay resets to 1 second after a successful reconnection.

#### Cleanup

- Closes WebSocket connection on component unmount
- Cancels all pending reconnection attempts
- Stops keepalive ping interval
- Prevents reconnection after unmount

### Error Handling

The hook handles errors gracefully:

- **Invalid JSON**: Logs error to console, doesn't crash
- **Unknown message types**: Warns to console
- **Connection errors**: Logs and triggers reconnection
- **Send failures**: Logs error, doesn't crash

All errors are logged to the console with `[WebSocket]` prefix for easy debugging.

### Performance Considerations

- **Memory**: Alerts accumulate in state. Use `clearAlerts()` periodically to prevent unbounded growth
- **Re-renders**: The hook only triggers re-renders when `alerts` or `isConnected` changes
- **Network**: Keepalive pings send every 30 seconds to maintain connection

### Testing

Comprehensive test suite available in `useWebSocket.test.ts`.

To run tests:

```bash
# Install test dependencies
npm install --save-dev vitest @testing-library/react @testing-library/react-hooks jsdom

# Run tests
npm test hooks/useWebSocket.test.ts
```

### Examples

See `useWebSocket.example.tsx` for detailed usage examples:

1. **AlertDashboard**: Basic alert display with connection status
2. **AlertNotificationToast**: Toast-style notifications for recent alerts
3. **AlertStatistics**: Statistical summary of alerts by type
4. **PersistentAlertView**: Combining live WebSocket alerts with historical data
5. **FilteredAlerts**: Filtering alerts by type and meter ID

### Troubleshooting

#### Connection keeps disconnecting

- Check backend WebSocket endpoint is running
- Verify network connectivity
- Check browser console for error messages
- Ensure backend supports keepalive pings

#### Alerts not appearing

- Verify `isConnected` is `true`
- Check backend is broadcasting alerts
- Inspect WebSocket messages in browser DevTools (Network → WS)
- Verify alert JSON structure matches `Alert` interface

#### Memory usage growing

- Call `clearAlerts()` periodically to clear old alerts
- Consider implementing a maximum alert limit
- Filter dismissed/acknowledged alerts

#### TypeScript errors

- Ensure Alert interface matches backend schema
- Update type definitions if backend changes
- Check `strict` mode compatibility

### Related Components

- **Backend**: `backend/app/websocket.py` - WebSocket connection manager
- **Backend**: `backend/app/routers/websocket.py` - WebSocket endpoint
- **Backend**: `backend/app/services/alert_service.py` - Alert broadcasting

### License

Part of the Industrial Energy Monitoring & Analytics System (IEMAS)
