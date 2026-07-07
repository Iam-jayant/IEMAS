"""
WebSocket Manager for Real-Time Alert Broadcasting
Maintains connections and broadcasts alerts to all connected dashboard clients
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Set
import json
import asyncio
from datetime import datetime


class ConnectionManager:
    """Manages WebSocket connections for real-time alert broadcasting"""
    
    def __init__(self):
        # Store active connections
        self.active_connections: List[WebSocket] = []
        # Track connection metadata (optional)
        self.connection_metadata: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        """
        Accept and register a new WebSocket connection
        
        Args:
            websocket: WebSocket connection instance
            client_id: Optional client identifier
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # Store metadata
        self.connection_metadata[websocket] = {
            "client_id": client_id,
            "connected_at": datetime.utcnow(),
            "alerts_sent": 0
        }
        
        print(f"✓ WebSocket client connected: {client_id or 'anonymous'} (Total: {len(self.active_connections)})")
    
    def disconnect(self, websocket: WebSocket):
        """
        Remove a WebSocket connection
        
        Args:
            websocket: WebSocket connection instance
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Clean up metadata
        client_info = self.connection_metadata.pop(websocket, {})
        client_id = client_info.get("client_id", "unknown")
        
        print(f"✗ WebSocket client disconnected: {client_id} (Total: {len(self.active_connections)})")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """
        Send a message to a specific connection
        
        Args:
            message: Message text to send
            websocket: Target WebSocket connection
        """
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        """
        Broadcast a message to all connected clients
        
        Args:
            message: Message text to broadcast
        """
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
                
                # Update metadata
                if connection in self.connection_metadata:
                    self.connection_metadata[connection]["alerts_sent"] += 1
                    
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def broadcast_alert(self, alert_data: Dict):
        """
        Broadcast an alert to all connected dashboard clients
        
        Args:
            alert_data: Alert data dictionary
        """
        message = json.dumps({
            "type": "alert",
            "timestamp": datetime.utcnow().isoformat(),
            "alert": alert_data
        })
        
        await self.broadcast(message)
        
        print(f"📢 Alert broadcast to {len(self.active_connections)} clients: {alert_data.get('alert_type')} - Meter {alert_data.get('meter_id')}")
    
    async def broadcast_system_message(self, message_type: str, data: Dict):
        """
        Broadcast a system message to all connected clients
        
        Args:
            message_type: Type of system message
            data: Message data
        """
        message = json.dumps({
            "type": message_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        })
        
        await self.broadcast(message)
    
    def get_stats(self) -> Dict:
        """
        Get connection statistics
        
        Returns:
            Dictionary with connection stats
        """
        return {
            "active_connections": len(self.active_connections),
            "connections": [
                {
                    "client_id": meta.get("client_id"),
                    "connected_at": meta.get("connected_at").isoformat() if meta.get("connected_at") else None,
                    "alerts_sent": meta.get("alerts_sent", 0)
                }
                for meta in self.connection_metadata.values()
            ]
        }


# Global connection manager instance
manager = ConnectionManager()


async def broadcast_alert_to_clients(alert_data: Dict):
    """
    Helper function to broadcast an alert from anywhere in the application
    
    Args:
        alert_data: Alert data dictionary with keys:
            - id: Alert ID
            - meter_id: Meter identifier
            - alert_type: Alert type (HIGH_POWER, LOW_POWER_FACTOR)
            - measured_value: Measured value that triggered alert
            - threshold_value: Threshold value
            - timestamp: Alert timestamp
    """
    await manager.broadcast_alert(alert_data)
