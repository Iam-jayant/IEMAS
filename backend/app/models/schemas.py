"""
IEMAS Backend - Pydantic Data Models
Data validation schemas for API requests and responses
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


class MeterReadingCreate(BaseModel):
    """Schema for creating a new meter reading (from ESP32)"""
    meter_id: str = Field(..., min_length=1, max_length=50, description="Unique meter identifier")
    timestamp: datetime = Field(..., description="Reading timestamp (ISO 8601)")
    voltage: float = Field(..., ge=0, le=1000, description="Voltage in Volts (0-1000V)")
    current: float = Field(..., ge=0, le=10000, description="Current in Amperes (≥0)")
    active_power: float = Field(..., ge=0, description="Active power in kW (≥0)")
    reactive_power: float = Field(..., description="Reactive power in kVAR")
    apparent_power: float = Field(..., ge=0, description="Apparent power in kVA (≥0)")
    power_factor: float = Field(..., ge=-1, le=1, description="Power factor (-1 to 1)")
    frequency: float = Field(..., ge=0, le=100, description="Frequency in Hz (0-100)")
    cumulative_energy: float = Field(..., ge=0, description="Cumulative energy in kWh (≥0)")
    firmware_version: Optional[str] = Field(None, max_length=50, description="ESP32 firmware version")
    uptime_seconds: Optional[int] = Field(None, ge=0, description="ESP32 uptime in seconds")
    wifi_rssi: Optional[int] = Field(None, ge=-100, le=0, description="WiFi signal strength in dBm")

    class Config:
        json_schema_extra = {
            "example": {
                "meter_id": "METER_001",
                "timestamp": "2024-01-15T10:30:00Z",
                "voltage": 415.0,
                "current": 18.4,
                "active_power": 7.5,
                "reactive_power": 2.1,
                "apparent_power": 7.8,
                "power_factor": 0.98,
                "frequency": 50.0,
                "cumulative_energy": 1502.42,
                "firmware_version": "1.0.0",
                "uptime_seconds": 86400,
                "wifi_rssi": -65
            }
        }


class MeterReadingResponse(MeterReadingCreate):
    """Schema for meter reading response (includes database ID)"""
    id: int = Field(..., description="Database record ID")
    created_at: datetime = Field(..., description="Record creation timestamp")

    class Config:
        from_attributes = True


class MeterRegistration(BaseModel):
    """Schema for registering a new meter"""
    meter_id: str = Field(..., min_length=1, max_length=50, description="Unique meter identifier")
    name: str = Field(..., min_length=1, max_length=255, description="Meter display name")
    location: str = Field(..., max_length=255, description="Physical location of meter")
    modbus_config: dict = Field(..., description="Modbus configuration (type, baudrate, slave_id, etc.)")

    @field_validator('modbus_config')
    @classmethod
    def validate_modbus_config(cls, v):
        """Validate Modbus configuration structure"""
        required_keys = ['type', 'baudrate', 'slave_id']
        if not all(key in v for key in required_keys):
            raise ValueError(f"modbus_config must contain: {', '.join(required_keys)}")
        
        if v['type'] not in ['RTU', 'TCP']:
            raise ValueError("modbus_config.type must be 'RTU' or 'TCP'")
        
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "meter_id": "METER_001",
                "name": "Production Line A - Main",
                "location": "Building A, Floor 1",
                "modbus_config": {
                    "type": "RTU",
                    "baudrate": 9600,
                    "slave_id": 1
                }
            }
        }


class MeterResponse(MeterRegistration):
    """Schema for meter response (includes timestamps)"""
    created_at: datetime = Field(..., description="Meter registration timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class MeterUpdate(BaseModel):
    """Schema for updating meter information"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    modbus_config: Optional[dict] = None

    @field_validator('modbus_config')
    @classmethod
    def validate_modbus_config(cls, v):
        """Validate Modbus configuration structure if provided"""
        if v is not None:
            required_keys = ['type', 'baudrate', 'slave_id']
            if not all(key in v for key in required_keys):
                raise ValueError(f"modbus_config must contain: {', '.join(required_keys)}")
            
            if v['type'] not in ['RTU', 'TCP']:
                raise ValueError("modbus_config.type must be 'RTU' or 'TCP'")
        
        return v


class ThresholdConfig(BaseModel):
    """Schema for meter threshold configuration"""
    meter_id: str = Field(..., min_length=1, max_length=50, description="Meter identifier")
    high_power_threshold: float = Field(..., gt=0, description="High power alert threshold in kW")
    low_power_factor_threshold: float = Field(..., ge=0, le=1, description="Low power factor alert threshold (0-1)")

    class Config:
        json_schema_extra = {
            "example": {
                "meter_id": "METER_001",
                "high_power_threshold": 15000.0,
                "low_power_factor_threshold": 0.85
            }
        }


class ThresholdResponse(ThresholdConfig):
    """Schema for threshold response (includes timestamp)"""
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    """Schema for creating an alert (internal use)"""
    meter_id: str = Field(..., min_length=1, max_length=50)
    alert_type: str = Field(..., description="Alert type: HIGH_POWER or LOW_POWER_FACTOR")
    measured_value: float = Field(..., description="Measured value that triggered alert")
    threshold_value: float = Field(..., description="Threshold value that was exceeded")
    timestamp: datetime = Field(..., description="Alert timestamp")

    @field_validator('alert_type')
    @classmethod
    def validate_alert_type(cls, v):
        """Validate alert type"""
        allowed_types = ['HIGH_POWER', 'LOW_POWER_FACTOR']
        if v not in allowed_types:
            raise ValueError(f"alert_type must be one of: {', '.join(allowed_types)}")
        return v


class AlertResponse(AlertCreate):
    """Schema for alert response (includes acknowledgment fields)"""
    id: int = Field(..., description="Alert ID")
    acknowledged: bool = Field(default=False, description="Whether alert has been acknowledged")
    acknowledged_at: Optional[datetime] = Field(None, description="Acknowledgment timestamp")
    acknowledged_by: Optional[str] = Field(None, description="User who acknowledged")
    dismissed: bool = Field(default=False, description="Whether alert has been dismissed")
    dismissed_at: Optional[datetime] = Field(None, description="Dismissal timestamp")
    dismissed_by: Optional[str] = Field(None, description="User who dismissed")
    created_at: datetime = Field(..., description="Alert creation timestamp")

    class Config:
        from_attributes = True


class AlertAcknowledge(BaseModel):
    """Schema for acknowledging an alert"""
    user_id: str = Field(..., description="User ID acknowledging the alert")


class AlertDismiss(BaseModel):
    """Schema for dismissing an alert"""
    user_id: str = Field(..., description="User ID dismissing the alert")


class HealthCheckResponse(BaseModel):
    """Schema for health check response"""
    status: str = Field(..., description="Service status: healthy or unhealthy")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    timestamp: datetime = Field(..., description="Health check timestamp")
    database_connected: Optional[bool] = Field(None, description="Database connection status")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "service": "iemas-backend",
                "version": "1.0.0",
                "timestamp": "2024-01-15T10:30:00Z",
                "database_connected": True
            }
        }


class MeterReadingQuery(BaseModel):
    """Schema for querying meter readings"""
    meter_id: Optional[str] = Field(None, description="Filter by meter ID")
    start_time: Optional[datetime] = Field(None, description="Start of time range")
    end_time: Optional[datetime] = Field(None, description="End of time range")
    limit: int = Field(1000, ge=1, le=10000, description="Maximum number of records to return")


class APIResponse(BaseModel):
    """Generic API response schema"""
    status: str = Field(..., description="Response status: success or error")
    message: Optional[str] = Field(None, description="Response message")
    data: Optional[dict] = Field(None, description="Response data")


class ErrorResponse(BaseModel):
    """Error response schema"""
    status: str = Field(default="error", description="Status: error")
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    detail: Optional[dict] = Field(None, description="Additional error details")
