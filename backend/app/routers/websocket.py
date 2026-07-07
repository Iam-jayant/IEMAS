"""
WebSocket Router for Real-Time Alert Broadcasting
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket import manager
import asyncio

router = APIRouter()


@router.websocket("/alerts")
async def websocket_alerts_endpoint(
    websocket: WebSocket,
    client_id: str = Query(None, description="Optional client identifier")
):
    """
    WebSocket endpoint for real-time alert broadcasting
    
    Clients connect to this endpoint to receive real-time alerts.
    No authentication required for WebSocket connection (authentication happens at dashboard level).
    
    Message format:
    ```json
    {
        "type": "alert",
        "timestamp": "2024-01-15T10:30:00Z",
        "alert": {
            "id": 1,
            "meter_id": "METER_001",
            "alert_type": "HIGH_POWER",
            "measured_value": 12500.0,
            "threshold_value": 10000.0,
            "timestamp": "2024-01-15T10:30:00Z"
        }
    }
    ```
    
    Requirements: 5.5, 5.6
    """
    await manager.connect(websocket, client_id)
    
    try:
        # Send welcome message
        await manager.send_personal_message(
            '{"type":"connected","message":"Connected to IEMAS alert stream"}',
            websocket
        )
        
        # Keep connection alive and handle incoming messages
        while True:
            # Wait for messages from client (e.g., ping/pong for keepalive)
            data = await websocket.receive_text()
            
            # Echo back or handle client messages
            if data == "ping":
                await manager.send_personal_message('{"type":"pong"}', websocket)
            
            # Small delay to prevent busy waiting
            await asyncio.sleep(0.1)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@router.websocket("/system")
async def websocket_system_endpoint(
    websocket: WebSocket,
    client_id: str = Query(None, description="Optional client identifier")
):
    """
    WebSocket endpoint for system-wide notifications
    
    Broadcasts system events like:
    - Meter online/offline status changes
    - System health updates
    - Configuration changes
    
    Requirements: 10.1, 10.2
    """
    await manager.connect(websocket, client_id)
    
    try:
        # Send welcome message
        await manager.send_personal_message(
            '{"type":"connected","message":"Connected to IEMAS system stream"}',
            websocket
        )
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            
            if data == "ping":
                await manager.send_personal_message('{"type":"pong"}', websocket)
            
            await asyncio.sleep(0.1)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@router.get("/stats")
async def get_websocket_stats():
    """
    Get WebSocket connection statistics
    
    Returns information about active WebSocket connections.
    """
    return manager.get_stats()
