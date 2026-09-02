"""
IEMAS Backend - Readings Router
Endpoints for meter reading ingestion and retrieval
"""
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, Header
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
from app.websocket import broadcast_reading_to_clients
from app.auth import get_current_user

router = APIRouter()



@router.post("", 
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
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
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
        # Validate device token if configured in settings
        if settings.DEVICE_API_KEY and x_device_token != settings.DEVICE_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-Device-Token"
            )

        # Check if meter is registered (Requirement 1.4)
        meter = db.query(Meter).filter(Meter.meter_id == reading.meter_id).first()
        if not meter:
            if settings.AUTO_REGISTER_METERS:
                meter = Meter(
                    meter_id=reading.meter_id,
                    name=f"Schneider Meter {reading.meter_id}",
                    location="PMCC / Factory Floor",
                    modbus_config={"type": "RTU", "auto_registered": True}
                )
                db.add(meter)
                db.commit()
                db.refresh(meter)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Meter {reading.meter_id} is not registered. Please register the meter first."
                )
        
        # Create database record (Requirement 1.6 - store within 500ms)
        db_reading = MeterReading(
            meter_id=reading.meter_id,
            timestamp=reading.timestamp,
            current_r=reading.current_r,
            current_y=reading.current_y,
            current_b=reading.current_b,
            current_avg=reading.current_avg,
            voltage_ry=reading.voltage_ry,
            voltage_yb=reading.voltage_yb,
            voltage_br=reading.voltage_br,
            voltage_ll_avg=reading.voltage_ll_avg,
            voltage_rn=reading.voltage_rn,
            voltage_yn=reading.voltage_yn,
            voltage_bn=reading.voltage_bn,
            voltage_ln_avg=reading.voltage_ln_avg,
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

        # Broadcast live reading to connected WebSocket clients (sub-second UI update)
        reading_dict = reading.model_dump() if hasattr(reading, "model_dump") else reading.dict()
        if isinstance(reading_dict.get("timestamp"), datetime):
            reading_dict["timestamp"] = reading_dict["timestamp"].isoformat() + "Z"
        reading_dict["id"] = db_reading.id
        background_tasks.add_task(broadcast_reading_to_clients, reading_dict)
        
        return APIResponse(
            status="success",
            message="Meter reading stored successfully",
            data={
                "reading_id": db_reading.id,
                "meter_id": db_reading.meter_id,
                "timestamp": db_reading.timestamp.isoformat() + "Z"
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


@router.get("", 
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
        
        print(f"DEBUG /api/readings query: meter_id={meter_id}, start_time={start_time}")
        if start_time:
            start_time = start_time.replace(tzinfo=None)
            query = query.filter(MeterReading.timestamp >= start_time)
        
        if end_time:
            end_time = end_time.replace(tzinfo=None)
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
            start_time = start_time.replace(tzinfo=None)
            query = query.filter(MeterReading.timestamp >= start_time)
        
        if end_time:
            end_time = end_time.replace(tzinfo=None)
            query = query.filter(MeterReading.timestamp <= end_time)
        
        # Order by timestamp descending and apply limit
        readings = query.order_by(desc(MeterReading.timestamp)).limit(limit).all()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Meter ID', 'Timestamp', 
            'Current R (A)', 'Current Y (A)', 'Current B (A)', 'Current Avg (A)',
            'Voltage R-Y (V)', 'Voltage Y-B (V)', 'Voltage B-R (V)', 'Voltage L-L Avg (V)',
            'Voltage R-N (V)', 'Voltage Y-N (V)', 'Voltage B-N (V)', 'Voltage L-N Avg (V)', 
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
                reading.current_r,
                reading.current_y,
                reading.current_b,
                reading.current_avg,
                reading.voltage_ry,
                reading.voltage_yb,
                reading.voltage_br,
                reading.voltage_ll_avg,
                reading.voltage_rn,
                reading.voltage_yn,
                reading.voltage_bn,
                reading.voltage_ln_avg,
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
            start_time = start_time.replace(tzinfo=None)
            query = query.filter(MeterReading.timestamp >= start_time)
        
        if end_time:
            end_time = end_time.replace(tzinfo=None)
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
                "current_r": reading.current_r,
                "current_y": reading.current_y,
                "current_b": reading.current_b,
                "current_avg": reading.current_avg,
                "voltage_ry": reading.voltage_ry,
                "voltage_yb": reading.voltage_yb,
                "voltage_br": reading.voltage_br,
                "voltage_ll_avg": reading.voltage_ll_avg,
                "voltage_rn": reading.voltage_rn,
                "voltage_yn": reading.voltage_yn,
                "voltage_bn": reading.voltage_bn,
                "voltage_ln_avg": reading.voltage_ln_avg,
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
