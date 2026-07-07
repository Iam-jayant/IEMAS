"""
Alert Evaluation Service
Evaluates meter readings against thresholds and generates alerts
"""
from datetime import datetime
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.database import Alert, Threshold, MeterReading
from app.models.schemas import MeterReadingCreate, AlertResponse
import asyncio


class AlertService:
    """Service for alert evaluation and management"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def evaluate_reading(self, reading: MeterReadingCreate, meter_id: str) -> List[AlertResponse]:
        """
        Evaluate a meter reading against configured thresholds
        Generates alerts for threshold violations
        
        Args:
            reading: MeterReadingCreate object with meter data
            meter_id: Meter identifier
            
        Returns:
            List of generated alerts (if any)
        """
        alerts_generated = []
        
        # Get thresholds for this meter
        threshold = await self.get_threshold(meter_id)
        
        if not threshold:
            # No thresholds configured, skip evaluation
            return alerts_generated
        
        # Check high power threshold
        if reading.active_power > threshold.high_power_threshold:
            alert = await self.create_alert(
                meter_id=meter_id,
                alert_type="HIGH_POWER",
                measured_value=reading.active_power,
                threshold_value=threshold.high_power_threshold,
                timestamp=reading.timestamp
            )
            alerts_generated.append(alert)
        
        # Check low power factor threshold
        if reading.power_factor < threshold.low_power_factor_threshold:
            alert = await self.create_alert(
                meter_id=meter_id,
                alert_type="LOW_POWER_FACTOR",
                measured_value=reading.power_factor,
                threshold_value=threshold.low_power_factor_threshold,
                timestamp=reading.timestamp
            )
            alerts_generated.append(alert)
        
        # Broadcast alerts to WebSocket clients
        if alerts_generated:
            from app.websocket import broadcast_alert_to_clients
            for alert in alerts_generated:
                try:
                    await broadcast_alert_to_clients({
                        "id": alert.id,
                        "meter_id": alert.meter_id,
                        "alert_type": alert.alert_type,
                        "measured_value": alert.measured_value,
                        "threshold_value": alert.threshold_value,
                        "timestamp": alert.timestamp.isoformat() if alert.timestamp else None
                    })
                except Exception as e:
                    print(f"Failed to broadcast alert: {e}")
        
        return alerts_generated
    
    async def get_threshold(self, meter_id: str) -> Optional[Threshold]:
        """
        Get threshold configuration for a specific meter
        
        Args:
            meter_id: Meter identifier
            
        Returns:
            Threshold object or None if not configured
        """
        result = await self.db.execute(
            select(Threshold).where(Threshold.meter_id == meter_id)
        )
        return result.scalar_one_or_none()
    
    async def create_alert(
        self,
        meter_id: str,
        alert_type: str,
        measured_value: float,
        threshold_value: float,
        timestamp: datetime
    ) -> AlertResponse:
        """
        Create and store a new alert
        
        Args:
            meter_id: Meter identifier
            alert_type: Type of alert (HIGH_POWER, LOW_POWER_FACTOR)
            measured_value: Measured value that triggered alert
            threshold_value: Threshold value that was exceeded
            timestamp: Timestamp of the reading that triggered alert
            
        Returns:
            Created alert object
        """
        alert = Alert(
            meter_id=meter_id,
            alert_type=alert_type,
            measured_value=measured_value,
            threshold_value=threshold_value,
            timestamp=timestamp,
            acknowledged=False,
            dismissed=False
        )
        
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        
        return AlertResponse.model_validate(alert)
    
    async def get_active_alerts(self, meter_id: Optional[str] = None) -> List[AlertResponse]:
        """
        Get all active (non-dismissed) alerts
        
        Args:
            meter_id: Optional meter ID filter
            
        Returns:
            List of active alerts
        """
        query = select(Alert).where(Alert.dismissed == False)
        
        if meter_id:
            query = query.where(Alert.meter_id == meter_id)
        
        query = query.order_by(Alert.timestamp.desc())
        
        result = await self.db.execute(query)
        alerts = result.scalars().all()
        
        return [AlertResponse.model_validate(alert) for alert in alerts]
    
    async def get_alert_history(
        self,
        meter_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[AlertResponse]:
        """
        Get alert history with optional filters
        
        Args:
            meter_id: Optional meter ID filter
            start_time: Optional start time filter
            end_time: Optional end time filter
            limit: Maximum number of alerts to return
            
        Returns:
            List of alerts matching filters
        """
        query = select(Alert)
        
        conditions = []
        if meter_id:
            conditions.append(Alert.meter_id == meter_id)
        if start_time:
            conditions.append(Alert.timestamp >= start_time)
        if end_time:
            conditions.append(Alert.timestamp <= end_time)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(Alert.timestamp.desc()).limit(limit)
        
        result = await self.db.execute(query)
        alerts = result.scalars().all()
        
        return [AlertResponse.model_validate(alert) for alert in alerts]
    
    async def acknowledge_alert(self, alert_id: int, user_id: str) -> Optional[AlertResponse]:
        """
        Acknowledge an alert
        
        Args:
            alert_id: Alert ID to acknowledge
            user_id: User ID performing acknowledgment
            
        Returns:
            Updated alert or None if not found
        """
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        
        if not alert:
            return None
        
        alert.acknowledged = True
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = user_id
        
        await self.db.commit()
        await self.db.refresh(alert)
        
        return AlertResponse.model_validate(alert)
    
    async def dismiss_alert(self, alert_id: int, user_id: str) -> Optional[AlertResponse]:
        """
        Dismiss an alert
        
        Args:
            alert_id: Alert ID to dismiss
            user_id: User ID performing dismissal
            
        Returns:
            Updated alert or None if not found
        """
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        
        if not alert:
            return None
        
        alert.dismissed = True
        alert.dismissed_at = datetime.utcnow()
        alert.dismissed_by = user_id
        
        await self.db.commit()
        await self.db.refresh(alert)
        
        return AlertResponse.model_validate(alert)
    
    async def update_threshold(
        self,
        meter_id: str,
        high_power_threshold: Optional[float] = None,
        low_power_factor_threshold: Optional[float] = None
    ) -> Threshold:
        """
        Update or create threshold configuration for a meter
        
        Args:
            meter_id: Meter identifier
            high_power_threshold: High power threshold value (optional)
            low_power_factor_threshold: Low power factor threshold value (optional)
            
        Returns:
            Updated or created threshold object
        """
        result = await self.db.execute(
            select(Threshold).where(Threshold.meter_id == meter_id)
        )
        threshold = result.scalar_one_or_none()
        
        if threshold:
            # Update existing threshold
            if high_power_threshold is not None:
                threshold.high_power_threshold = high_power_threshold
            if low_power_factor_threshold is not None:
                threshold.low_power_factor_threshold = low_power_factor_threshold
            threshold.updated_at = datetime.utcnow()
        else:
            # Create new threshold with defaults
            threshold = Threshold(
                meter_id=meter_id,
                high_power_threshold=high_power_threshold or 10000.0,
                low_power_factor_threshold=low_power_factor_threshold or 0.8
            )
            self.db.add(threshold)
        
        await self.db.commit()
        await self.db.refresh(threshold)
        
        return threshold
