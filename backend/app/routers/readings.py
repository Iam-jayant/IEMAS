"""
IEMAS Backend - Readings Router
Endpoints for meter reading ingestion and retrieval
"""
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timedelta
import csv
import io

from app.database import get_db
from app.config import settings
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

# Mock data for DEV_MODE
def get_mock_latest_readings():
    """Generate mock latest readings for DEV_MODE"""
    now = datetime.utcnow()
    created = now - timedelta(days=30)
    return [
        {
            "id": 1,
            "meter_id": "METER001",
            "timestamp": (now - timedelta(seconds=30)).isoformat(),
            "voltage": 230.5,
            "current": 15.2,
            "active_power": 3.5,
            "reactive_power": 0.8,
            "apparent_power": 3.6,
            "power_factor": 0.97,
            "frequency": 50.1,
            "cumulative_energy": 1250.4,
            "firmware_version": "v1.2.0",
            "uptime_seconds": 86400,
            "wifi_rssi": -45,
            "created_at": created.isoformat()
        },
        {
            "id": 2,
            "meter_id": "METER002",
            "timestamp": (now - timedelta(seconds=45)).isoformat(),
            "voltage": 228.3,
            "current": 22.8,
            "active_power": 5.2,
            "reactive_power": 1.2,
            "apparent_power": 5.3,
            "power_factor": 0.98,
            "frequency": 50.0,
            "cumulative_energy": 3450.7,
            "firmware_version": "v1.2.0",
            "uptime_seconds": 172800,
            "wifi_rssi": -52,
            "created_at": created.isoformat()
        },
        {
            "id": 3,
            "meter_id": "METER003",
            "timestamp": (now - timedelta(seconds=60)).isoformat(),
            "voltage": 232.1,
            "current": 8.5,
            "active_power": 2.0,
            "reactive_power": 0.3,
            "apparent_power": 2.0,
            "power_factor": 0.99,
            "frequency": 49.9,
            "cumulative_energy": 890.2,
            "firmware_version": "v1.1.5",
            "uptime_seconds": 259200,
            "wifi_rssi": -68,
            "created_at": created.isoformat()
        }
    ]


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
    - **wifi_rssi**: Optional WiFi signal strength in dBm
    
    Requirements: 1.2, 1.4, 1.5, 1.6, 9.6, 9.7, 9.8, 10.5
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
            uptime_seconds=reading.uptime_seconds,
            wifi_rssi=reading.wifi_rssi
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
        # DEV_MODE: Return mock data
        if settings.DEV_MODE:
            return get_mock_latest_readings()
        
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


@router.get("/export/csv",
    responses={
        200: {"description": "CSV file download"},
        400: {"model": ErrorResponse, "description": "Invalid query parameters"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def export_readings_csv(
    meter_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 10000,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export meter readings to CSV format
    
    - **meter_id**: Filter by specific meter (optional)
    - **start_time**: Start of time range (optional)
    - **end_time**: End of time range (optional)
    - **limit**: Maximum number of records (default: 10000)
    
    Returns a CSV file with all readings matching the filters.
    """
    try:
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
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Meter ID', 'Timestamp', 'Voltage (V)', 'Current (A)', 
            'Active Power (kW)', 'Reactive Power (kVAR)', 'Apparent Power (kVA)',
            'Power Factor', 'Frequency (Hz)', 'Cumulative Energy (kWh)',
            'Firmware Version', 'Uptime (s)', 'WiFi RSSI (dBm)', 'Created At'
        ])
        
        # Write data rows
        for reading in readings:
            writer.writerow([
                reading.id,
                reading.meter_id,
                reading.timestamp.isoformat(),
                reading.voltage,
                reading.current,
                reading.active_power,
                reading.reactive_power,
                reading.apparent_power,
                reading.power_factor,
                reading.frequency,
                reading.cumulative_energy,
                reading.firmware_version or '',
                reading.uptime_seconds or '',
                reading.wifi_rssi or '',
                reading.created_at.isoformat()
            ])
        
        # Prepare file for download
        output.seek(0)
        
        # Generate filename
        filename = f"meter_readings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        if meter_id:
            filename = f"meter_{meter_id}_readings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export readings: {str(e)}"
        )


@router.get("/export/json",
    responses={
        200: {"description": "JSON file download"},
        400: {"model": ErrorResponse, "description": "Invalid query parameters"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def export_readings_json(
    meter_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 10000,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export meter readings to JSON format
    
    - **meter_id**: Filter by specific meter (optional)
    - **start_time**: Start of time range (optional)
    - **end_time**: End of time range (optional)
    - **limit**: Maximum number of records (default: 10000)
    
    Returns a JSON file with all readings matching the filters.
    """
    try:
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
        
        # Convert to dict format
        readings_data = []
        for reading in readings:
            readings_data.append({
                "id": reading.id,
                "meter_id": reading.meter_id,
                "timestamp": reading.timestamp.isoformat(),
                "voltage": reading.voltage,
                "current": reading.current,
                "active_power": reading.active_power,
                "reactive_power": reading.reactive_power,
                "apparent_power": reading.apparent_power,
                "power_factor": reading.power_factor,
                "frequency": reading.frequency,
                "cumulative_energy": reading.cumulative_energy,
                "firmware_version": reading.firmware_version,
                "uptime_seconds": reading.uptime_seconds,
                "wifi_rssi": reading.wifi_rssi,
                "created_at": reading.created_at.isoformat()
            })
        
        # Generate filename
        filename = f"meter_readings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        if meter_id:
            filename = f"meter_{meter_id}_readings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        
        import json
        json_content = json.dumps({
            "export_date": datetime.utcnow().isoformat(),
            "total_records": len(readings_data),
            "filters": {
                "meter_id": meter_id,
                "start_time": start_time.isoformat() if start_time else None,
                "end_time": end_time.isoformat() if end_time else None
            },
            "readings": readings_data
        }, indent=2)
        
        return StreamingResponse(
            iter([json_content]),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export readings: {str(e)}"
        )
