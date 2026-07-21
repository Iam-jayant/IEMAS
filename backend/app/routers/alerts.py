"""
IEMAS Backend - Alerts Router
Endpoints for alert management, history, and actions
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.config import settings
from app.models.schemas import (
    AlertResponse,
    AlertAcknowledge,
    AlertDismiss,
    APIResponse,
    ErrorResponse
)
from app.services.alert_service import AlertService
from app.auth import get_current_user

router = APIRouter()

# Mock data for DEV_MODE
def get_mock_alerts():
    """Generate mock alerts for DEV_MODE"""
    now = datetime.utcnow()
    return [
        {
            "id": 1,
            "meter_id": "METER002",
            "alert_type": "HIGH_POWER",
            "measured_value": 5.2,
            "threshold_value": 5.0,
            "timestamp": (now - timedelta(minutes=10)).isoformat(),
            "acknowledged": False,
            "acknowledged_at": None,
            "acknowledged_by": None,
            "dismissed": False,
            "dismissed_at": None,
            "dismissed_by": None,
            "created_at": (now - timedelta(minutes=10)).isoformat()
        },
        {
            "id": 2,
            "meter_id": "METER001",
            "alert_type": "LOW_POWER_FACTOR",
            "measured_value": 0.75,
            "threshold_value": 0.80,
            "timestamp": (now - timedelta(hours=2)).isoformat(),
            "acknowledged": True,
            "acknowledged_at": (now - timedelta(hours=1, minutes=30)).isoformat(),
            "acknowledged_by": "admin@example.com",
            "dismissed": False,
            "dismissed_at": None,
            "dismissed_by": None,
            "created_at": (now - timedelta(hours=2)).isoformat()
        },
        {
            "id": 3,
            "meter_id": "METER003",
            "alert_type": "HIGH_POWER",
            "measured_value": 2.5,
            "threshold_value": 2.0,
            "timestamp": (now - timedelta(days=1)).isoformat(),
            "acknowledged": True,
            "acknowledged_at": (now - timedelta(days=1)).isoformat(),
            "acknowledged_by": "operator@example.com",
            "dismissed": True,
            "dismissed_at": (now - timedelta(hours=12)).isoformat(),
            "dismissed_by": "admin@example.com",
            "created_at": (now - timedelta(days=1)).isoformat()
        }
    ]


@router.get("/",
    response_model=List[AlertResponse],
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_alerts(
    meter_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    active_only: bool = False,
    limit: int = 100,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get alert history with optional filters
    
    - **meter_id**: Filter by specific meter (optional)
    - **start_time**: Start of time range (optional)
    - **end_time**: End of time range (optional)
    - **active_only**: Show only non-dismissed alerts (default: False)
    - **limit**: Maximum number of records (default: 100, max: 1000)
    
    Requirements: 5.4, 9.4
    """
    try:
        # DEV_MODE: Return mock data
        if settings.DEV_MODE:
            alerts = get_mock_alerts()
            if meter_id:
                alerts = [a for a in alerts if a["meter_id"] == meter_id]
            if active_only:
                alerts = [a for a in alerts if not a["dismissed"]]
            return alerts[:limit]
        
        # Validate limit
        if limit > 1000:
            limit = 1000
        
        alert_service = AlertService(db)
        
        if active_only:
            # Get only active (non-dismissed) alerts
            alerts = await alert_service.get_active_alerts(meter_id)
            
            # Apply time filters if provided
            if start_time:
                alerts = [a for a in alerts if a.timestamp >= start_time]
            if end_time:
                alerts = [a for a in alerts if a.timestamp <= end_time]
            
            # Apply limit
            alerts = alerts[:limit]
        else:
            # Get full alert history
            alerts = await alert_service.get_alert_history(
                meter_id=meter_id,
                start_time=start_time,
                end_time=end_time,
                limit=limit
            )
        
        return alerts
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve alerts: {str(e)}"
        )


@router.get("/active",
    response_model=List[AlertResponse],
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_active_alerts(
    meter_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active (non-dismissed) alerts
    
    - **meter_id**: Filter by specific meter (optional)
    
    Requirements: 5.5, 5.6
    """
    try:
        alert_service = AlertService(db)
        alerts = await alert_service.get_active_alerts(meter_id)
        return alerts
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve active alerts: {str(e)}"
        )


@router.get("/{alert_id}",
    response_model=AlertResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Alert not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_alert_by_id(
    alert_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific alert by ID
    
    - **alert_id**: Alert ID
    """
    try:
        from sqlalchemy import select
        from app.models.database import Alert
        
        result = await db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert with ID {alert_id} not found"
            )
        
        return AlertResponse.model_validate(alert)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve alert: {str(e)}"
        )


@router.post("/{alert_id}/acknowledge",
    response_model=APIResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Alert not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def acknowledge_alert(
    alert_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Acknowledge an alert
    
    - **alert_id**: Alert ID to acknowledge
    
    Requirements: 5.7
    """
    try:
        alert_service = AlertService(db)
        user_id = user.get("id")
        
        alert = await alert_service.acknowledge_alert(alert_id, user_id)
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert with ID {alert_id} not found"
            )
        
        return APIResponse(
            status="success",
            message=f"Alert {alert_id} acknowledged successfully",
            data={
                "alert_id": alert.id,
                "acknowledged": alert.acknowledged,
                "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                "acknowledged_by": alert.acknowledged_by
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to acknowledge alert: {str(e)}"
        )


@router.post("/{alert_id}/dismiss",
    response_model=APIResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Alert not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def dismiss_alert(
    alert_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dismiss an alert
    
    - **alert_id**: Alert ID to dismiss
    
    Requirements: 5.7
    """
    try:
        alert_service = AlertService(db)
        user_id = user.get("id")
        
        alert = await alert_service.dismiss_alert(alert_id, user_id)
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert with ID {alert_id} not found"
            )
        
        return APIResponse(
            status="success",
            message=f"Alert {alert_id} dismissed successfully",
            data={
                "alert_id": alert.id,
                "dismissed": alert.dismissed,
                "dismissed_at": alert.dismissed_at.isoformat() if alert.dismissed_at else None,
                "dismissed_by": alert.dismissed_by
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to dismiss alert: {str(e)}"
        )


@router.delete("/{alert_id}",
    response_model=APIResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Alert not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def delete_alert(
    alert_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an alert (admin only)
    
    - **alert_id**: Alert ID to delete
    """
    try:
        from sqlalchemy import select, delete
        from app.models.database import Alert
        
        # Check if alert exists
        result = await db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert with ID {alert_id} not found"
            )
        
        # Delete the alert
        await db.execute(
            delete(Alert).where(Alert.id == alert_id)
        )
        await db.commit()
        
        return APIResponse(
            status="success",
            message=f"Alert {alert_id} deleted successfully",
            data={"alert_id": alert_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete alert: {str(e)}"
        )
