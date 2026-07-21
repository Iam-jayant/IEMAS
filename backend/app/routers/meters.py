"""
IEMAS Backend - Meters Router
Endpoints for meter registration and management
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.config import settings
from app.models.schemas import (
    MeterRegistration,
    MeterResponse,
    MeterUpdate,
    APIResponse,
    ErrorResponse
)
from app.models.database import Meter, Threshold
from app.auth import get_current_user

router = APIRouter()

# Mock data for DEV_MODE
MOCK_METERS = [
    {
        "meter_id": "METER001",
        "name": "Main Building Meter",
        "location": "Building A - Floor 1",
        "created_at": "2024-01-15T10:00:00",
        "updated_at": "2024-01-15T10:00:00",
        "modbus_config": {
            "type": "RTU",
            "baudrate": 9600,
            "slave_id": 1,
            "registers": {"voltage": 0, "current": 6, "power": 12}
        }
    },
    {
        "meter_id": "METER002",
        "name": "Production Line 1",
        "location": "Factory - Section A",
        "created_at": "2024-01-16T14:30:00",
        "updated_at": "2024-01-16T14:30:00",
        "modbus_config": {
            "type": "RTU",
            "baudrate": 9600,
            "slave_id": 2,
            "registers": {"voltage": 0, "current": 6, "power": 12}
        }
    },
    {
        "meter_id": "METER003",
        "name": "HVAC System Meter",
        "location": "Building B - Rooftop",
        "created_at": "2024-01-17T09:15:00",
        "updated_at": "2024-01-17T09:15:00",
        "modbus_config": {
            "type": "RTU",
            "baudrate": 9600,
            "slave_id": 3,
            "registers": {"voltage": 0, "current": 6, "power": 12}
        }
    }
]


@router.get("/",
    response_model=List[MeterResponse],
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def list_meters(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all registered meters
    
    Returns all meters registered in the system with their configuration.
    
    Requirements: 7.1, 7.2, 7.3, 9.3
    """
    try:
        # DEV_MODE: Return mock data
        if settings.DEV_MODE:
            return MOCK_METERS
        
        meters = db.query(Meter).all()
        return meters
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve meters: {str(e)}"
        )


@router.get("/{meter_id}",
    response_model=MeterResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Meter not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_meter(
    meter_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific meter by ID
    
    - **meter_id**: Unique meter identifier
    
    Requirements: 7.1, 9.3
    """
    try:
        meter = db.query(Meter).filter(Meter.meter_id == meter_id).first()
        
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meter {meter_id} not found"
            )
        
        return meter
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve meter: {str(e)}"
        )


@router.post("/",
    status_code=status.HTTP_201_CREATED,
    response_model=MeterResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Meter already exists or validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def register_meter(
    meter: MeterRegistration,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Register a new meter
    
    - **meter_id**: Unique meter identifier
    - **name**: Meter display name
    - **location**: Physical location of meter
    - **modbus_config**: Modbus configuration (type, baudrate, slave_id, registers)
    
    Requirements: 7.1, 7.2, 7.3, 9.3
    """
    try:
        # Check if meter already exists
        existing_meter = db.query(Meter).filter(Meter.meter_id == meter.meter_id).first()
        if existing_meter:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Meter {meter.meter_id} already registered"
            )
        
        # Create new meter
        db_meter = Meter(
            meter_id=meter.meter_id,
            name=meter.name,
            location=meter.location,
            modbus_config=meter.modbus_config
        )
        
        db.add(db_meter)
        
        # Create default thresholds for the meter
        default_threshold = Threshold(
            meter_id=meter.meter_id,
            high_power_threshold=10000.0,  # 10 kW default
            low_power_factor_threshold=0.8  # 0.8 default
        )
        
        db.add(default_threshold)
        db.commit()
        db.refresh(db_meter)
        
        return db_meter
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register meter: {str(e)}"
        )


@router.put("/{meter_id}",
    response_model=MeterResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Meter not found"},
        400: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def update_meter(
    meter_id: str,
    meter_update: MeterUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update meter configuration
    
    - **meter_id**: Unique meter identifier
    - **name**: Updated meter display name (optional)
    - **location**: Updated physical location (optional)
    - **modbus_config**: Updated Modbus configuration (optional)
    
    Requirements: 7.1, 7.2, 7.3, 9.3
    """
    try:
        # Get existing meter
        meter = db.query(Meter).filter(Meter.meter_id == meter_id).first()
        
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meter {meter_id} not found"
            )
        
        # Update fields if provided
        if meter_update.name is not None:
            meter.name = meter_update.name
        
        if meter_update.location is not None:
            meter.location = meter_update.location
        
        if meter_update.modbus_config is not None:
            meter.modbus_config = meter_update.modbus_config
        
        db.commit()
        db.refresh(meter)
        
        return meter
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update meter: {str(e)}"
        )


@router.delete("/{meter_id}",
    response_model=APIResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Meter not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def delete_meter(
    meter_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a meter
    
    This will also delete all associated readings, alerts, and thresholds (CASCADE).
    
    - **meter_id**: Unique meter identifier
    
    Requirements: 7.1, 7.3, 9.3
    """
    try:
        # Get existing meter
        meter = db.query(Meter).filter(Meter.meter_id == meter_id).first()
        
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meter {meter_id} not found"
            )
        
        # Delete meter (cascade will handle related records)
        db.delete(meter)
        db.commit()
        
        return APIResponse(
            status="success",
            message=f"Meter {meter_id} deleted successfully",
            data={"meter_id": meter_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete meter: {str(e)}"
        )


@router.get("/{meter_id}/status",
    response_model=dict,
    responses={
        404: {"model": ErrorResponse, "description": "Meter not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_meter_status(
    meter_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get meter connection status
    
    Returns the meter's online/offline status based on last reading timestamp.
    A meter is considered offline if no reading received for 5 minutes.
    
    - **meter_id**: Unique meter identifier
    
    Requirements: 10.1, 10.2
    """
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import desc
        from app.models.database import MeterReading
        
        # Get meter
        meter = db.query(Meter).filter(Meter.meter_id == meter_id).first()
        
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meter {meter_id} not found"
            )
        
        # Get latest reading
        latest_reading = db.query(MeterReading).filter(
            MeterReading.meter_id == meter_id
        ).order_by(desc(MeterReading.timestamp)).first()
        
        if not latest_reading:
            return {
                "meter_id": meter_id,
                "status": "offline",
                "last_reading": None,
                "message": "No readings received"
            }
        
        # Check if reading is within 5 minutes
        five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
        is_online = latest_reading.timestamp >= five_minutes_ago
        
        return {
            "meter_id": meter_id,
            "status": "online" if is_online else "offline",
            "last_reading": latest_reading.timestamp.isoformat(),
            "firmware_version": latest_reading.firmware_version,
            "uptime_seconds": latest_reading.uptime_seconds
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get meter status: {str(e)}"
        )
