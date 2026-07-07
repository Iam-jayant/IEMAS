"""
IEMAS Backend - Readings Router
Endpoints for meter reading ingestion and retrieval
"""
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.schemas import (
    MeterReadingCreate,
    MeterReadingResponse,
    MeterReadingQuery,
    APIResponse,
    ErrorResponse
)
from app.models.database import MeterReading, Meter
from app.services.alert_service import AlertService
from app.auth import get_current_user

router = APIRouter()


@router.post("/", 
    status_code=status.HTTP_201_CREATED,
    response_model=APIResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error or unregistered meter"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def create_reading(
    reading: MeterReadingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Receive meter reading from ESP32 device
    
    - **meter_id**: Unique meter identifier
    - **timestamp**: Reading timestamp (ISO 8601)
    - **voltage**: Voltage in Volts (0-1000V)
    - **current**: Current in Amperes (≥0)
    - **active_power**: Active power in kW
    - **reactive_power**: Reactive power in kVAR
    - **apparent_power**: Apparent power in kVA
    - **power_factor**: Power factor (-1 to 1)
    - **frequency**: Frequency in Hz (0-100)
    - **cumulative_energy**: Cumulative energy in kWh
    - **firmware_version**: Optional ESP32 firmware version
    - **uptime_seconds**: Optional ESP32 uptime
    
    Requirements: 1.2, 1.4, 1.5, 1.6, 9.6, 9.7, 9.8
    """
    try:
        # Check if meter is registered (Requirement 1.4)
        meter = db.query(Meter).filter(Meter.meter_id == reading.meter_id).first()
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Meter {reading.meter_id} is not registered. Please register the meter first."
            )
        
        # Create database record (Requirement 1.6 - store within 500ms)
        db_reading = MeterReading(
            meter_id=reading.meter_id,
            timestamp=reading.timestamp,
            voltage=reading.voltage,
            current=reading.current,
            active_power=reading.active_power,
            reactive_power=reading.reactive_power,
            apparent_power=reading.apparent_power,
            power_factor=reading.power_factor,
            frequency=reading.frequency,
            cumulative_energy=reading.cumulative_energy,
            firmware_version=reading.firmware_version,
            uptime_seconds=reading.uptime_seconds
        )
        
        db.add(db_reading)
        db.commit()
        db.refresh(db_reading)
        
        # Trigger alert evaluation in background (Task 4.1 - Requirement 5.1)
        alert_service = AlertService(db)
        background_tasks.add_task(
            alert_service.evaluate_reading,
            reading,
            reading.meter_id
        )
        
        return APIResponse(
            status="success",
            message="Meter reading stored successfully",
            data={
                "reading_id": db_reading.id,
                "meter_id": db_reading.meter_id,
                "timestamp": db_reading.timestamp.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store meter reading: {str(e)}"
        )


@router.get("/",
    response_model=List[MeterReadingResponse],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid query parameters"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_readings(
    meter_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 1000,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get meter readings with filters
    
    - **meter_id**: Filter by specific meter (optional)
    - **start_time**: Start of time range (optional)
    - **end_time**: End of time range (optional)
    - **limit**: Maximum number of records (default: 1000, max: 10000)
    
    Requirements: 4.1, 4.5, 9.1, 9.2
    """
    try:
        # Validate limit
        if limit > 10000:
            limit = 10000
        
        # Build query
        query = db.query(MeterReading)
        
        # Apply filters
        if meter_id:
            query = query.filter(MeterReading.meter_id == meter_id)
        
        if start_time:
            query = query.filter(MeterReading.timestamp >= start_time)
        
        if end_time:
            query = query.filter(MeterReading.timestamp <= end_time)
        
        # Order by timestamp descending and apply limit
        readings = query.order_by(desc(MeterReading.timestamp)).limit(limit).all()
        
        return readings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve meter readings: {str(e)}"
        )


@router.get("/latest",
    response_model=List[MeterReadingResponse],
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_latest_readings(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get latest reading for each meter
    
    Returns the most recent reading for all registered meters.
    
    Requirements: 4.1, 9.2
    """
    try:
        # Get all meters
        meters = db.query(Meter).all()
        
        latest_readings = []
        for meter in meters:
            # Get latest reading for this meter
            reading = db.query(MeterReading).filter(
                MeterReading.meter_id == meter.meter_id
            ).order_by(desc(MeterReading.timestamp)).first()
            
            if reading:
                latest_readings.append(reading)
        
        return latest_readings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve latest readings: {str(e)}"
        )


@router.get("/{reading_id}",
    response_model=MeterReadingResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Reading not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_reading_by_id(
    reading_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific meter reading by ID
    
    - **reading_id**: Database ID of the reading
    """
    try:
        reading = db.query(MeterReading).filter(MeterReading.id == reading_id).first()
        
        if not reading:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reading with ID {reading_id} not found"
            )
        
        return reading
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve reading: {str(e)}"
        )
