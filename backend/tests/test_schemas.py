"""
Unit tests for Pydantic schemas.

Tests validation rules for MeterReading, MeterRegistration, ThresholdConfig, and Alert models.
"""

import pytest
from datetime import datetime
from pydantic import ValidationError
from app.models.schemas import (
    MeterReadingCreate,
    MeterRegistration,
    MeterUpdate,
    ThresholdConfig,
    AlertCreate,
    AlertAcknowledge,
    AlertDismiss,
    HealthCheckResponse,
)


class TestMeterReadingCreate:
    """Test MeterReadingCreate model validations."""
    
    def test_valid_meter_reading(self):
        """Test that a valid meter reading is accepted."""
        reading = MeterReadingCreate(
            meter_id="METER_001",
            timestamp=datetime(2024, 1, 15, 10, 30, 0),
            voltage=230.5,
            current=15.2,
            active_power=3500.0,
            reactive_power=150.0,
            apparent_power=3503.2,
            power_factor=0.998,
            frequency=50.0,
            cumulative_energy=1250.5,
            firmware_version="1.0.0",
            uptime_seconds=86400
        )
        
        assert reading.meter_id == "METER_001"
        assert reading.voltage == 230.5
        assert reading.current == 15.2
        assert reading.power_factor == 0.998
    
    def test_voltage_out_of_range_high(self):
        """Test that voltage > 1000V is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterReadingCreate(
                meter_id="METER_001",
                timestamp=datetime.now(),
                voltage=1500.0,  # Invalid: > 1000V
                current=15.2,
                active_power=3500.0,
                reactive_power=150.0,
                apparent_power=3503.2,
                power_factor=0.998,
                frequency=50.0,
                cumulative_energy=1250.5
            )
        
        assert "voltage" in str(exc_info.value)
    
    def test_voltage_negative(self):
        """Test that negative voltage is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterReadingCreate(
                meter_id="METER_001",
                timestamp=datetime.now(),
                voltage=-10.0,  # Invalid: negative
                current=15.2,
                active_power=3500.0,
                reactive_power=150.0,
                apparent_power=3503.2,
                power_factor=0.998,
                frequency=50.0,
                cumulative_energy=1250.5
            )
        
        assert "voltage" in str(exc_info.value)
    
    def test_current_negative(self):
        """Test that negative current is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterReadingCreate(
                meter_id="METER_001",
                timestamp=datetime.now(),
                voltage=230.0,
                current=-5.0,  # Invalid: negative
                active_power=3500.0,
                reactive_power=150.0,
                apparent_power=3503.2,
                power_factor=0.998,
                frequency=50.0,
                cumulative_energy=1250.5
            )
        
        assert "current" in str(exc_info.value)
    
    def test_power_factor_out_of_range_high(self):
        """Test that power factor > 1 is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterReadingCreate(
                meter_id="METER_001",
                timestamp=datetime.now(),
                voltage=230.0,
                current=15.2,
                active_power=3500.0,
                reactive_power=150.0,
                apparent_power=3503.2,
                power_factor=1.5,  # Invalid: > 1
                frequency=50.0,
                cumulative_energy=1250.5
            )
        
        assert "power_factor" in str(exc_info.value)
    
    def test_power_factor_out_of_range_low(self):
        """Test that power factor < -1 is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterReadingCreate(
                meter_id="METER_001",
                timestamp=datetime.now(),
                voltage=230.0,
                current=15.2,
                active_power=3500.0,
                reactive_power=150.0,
                apparent_power=3503.2,
                power_factor=-1.5,  # Invalid: < -1
                frequency=50.0,
                cumulative_energy=1250.5
            )
        
        assert "power_factor" in str(exc_info.value)
    
    def test_frequency_out_of_range(self):
        """Test that frequency > 100Hz is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterReadingCreate(
                meter_id="METER_001",
                timestamp=datetime.now(),
                voltage=230.0,
                current=15.2,
                active_power=3500.0,
                reactive_power=150.0,
                apparent_power=3503.2,
                power_factor=0.998,
                frequency=150.0,  # Invalid: > 100Hz
                cumulative_energy=1250.5
            )
        
        assert "frequency" in str(exc_info.value)
    
    def test_frequency_negative(self):
        """Test that negative frequency is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterReadingCreate(
                meter_id="METER_001",
                timestamp=datetime.now(),
                voltage=230.0,
                current=15.2,
                active_power=3500.0,
                reactive_power=150.0,
                apparent_power=3503.2,
                power_factor=0.998,
                frequency=-10.0,  # Invalid: negative
                cumulative_energy=1250.5
            )
        
        assert "frequency" in str(exc_info.value)
    
    def test_meter_reading_with_optional_fields(self):
        """Test meter reading without optional firmware fields."""
        reading = MeterReadingCreate(
            meter_id="METER_001",
            timestamp=datetime.now(),
            voltage=230.0,
            current=15.2,
            active_power=3500.0,
            reactive_power=150.0,
            apparent_power=3503.2,
            power_factor=0.998,
            frequency=50.0,
            cumulative_energy=1250.5
        )
        
        assert reading.firmware_version is None
        assert reading.uptime_seconds is None
    
    def test_empty_meter_id_rejected(self):
        """Test that empty meter_id is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterReadingCreate(
                meter_id="",  # Invalid: empty
                timestamp=datetime.now(),
                voltage=230.0,
                current=15.2,
                active_power=3500.0,
                reactive_power=150.0,
                apparent_power=3503.2,
                power_factor=0.998,
                frequency=50.0,
                cumulative_energy=1250.5
            )
        
        assert "meter_id" in str(exc_info.value)


class TestMeterRegistration:
    """Test MeterRegistration model validations."""
    
    def test_valid_meter_registration(self):
        """Test that a valid meter registration is accepted."""
        registration = MeterRegistration(
            meter_id="METER_001",
            name="Production Line 1",
            location="Building A - Floor 2",
            modbus_config={
                "type": "RTU",
                "baudrate": 9600,
                "slave_id": 1
            }
        )
        
        assert registration.meter_id == "METER_001"
        assert registration.name == "Production Line 1"
        assert registration.modbus_config["type"] == "RTU"
    
    def test_registration_without_location(self):
        """Test that location is optional."""
        registration = MeterRegistration(
            meter_id="METER_001",
            name="Production Line 1",
            modbus_config={"type": "RTU"}
        )
        
        assert registration.location is None
    
    def test_empty_meter_id_rejected(self):
        """Test that empty meter_id is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterRegistration(
                meter_id="",  # Invalid: empty
                name="Production Line 1",
                modbus_config={"type": "RTU"}
            )
        
        assert "meter_id" in str(exc_info.value)
    
    def test_empty_name_rejected(self):
        """Test that empty name is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterRegistration(
                meter_id="METER_001",
                name="",  # Invalid: empty
                modbus_config={"type": "RTU"}
            )
        
        assert "name" in str(exc_info.value)


class TestThresholdConfig:
    """Test ThresholdConfig model validations."""
    
    def test_valid_threshold_config(self):
        """Test that a valid threshold configuration is accepted."""
        config = ThresholdConfig(
            meter_id="METER_001",
            high_power_threshold=10000.0,
            low_power_factor_threshold=0.8
        )
        
        assert config.meter_id == "METER_001"
        assert config.high_power_threshold == 10000.0
        assert config.low_power_factor_threshold == 0.8
    
    def test_high_power_threshold_zero_rejected(self):
        """Test that zero or negative high_power_threshold is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ThresholdConfig(
                meter_id="METER_001",
                high_power_threshold=0.0,  # Invalid: must be > 0
                low_power_factor_threshold=0.8
            )
        
        assert "high_power_threshold" in str(exc_info.value)
    
    def test_high_power_threshold_negative_rejected(self):
        """Test that negative high_power_threshold is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ThresholdConfig(
                meter_id="METER_001",
                high_power_threshold=-100.0,  # Invalid: must be > 0
                low_power_factor_threshold=0.8
            )
        
        assert "high_power_threshold" in str(exc_info.value)
    
    def test_power_factor_threshold_out_of_range_high(self):
        """Test that power factor threshold > 1 is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ThresholdConfig(
                meter_id="METER_001",
                high_power_threshold=10000.0,
                low_power_factor_threshold=1.5  # Invalid: > 1
            )
        
        assert "low_power_factor_threshold" in str(exc_info.value)
    
    def test_power_factor_threshold_negative_rejected(self):
        """Test that negative power factor threshold is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ThresholdConfig(
                meter_id="METER_001",
                high_power_threshold=10000.0,
                low_power_factor_threshold=-0.5  # Invalid: < 0
            )
        
        assert "low_power_factor_threshold" in str(exc_info.value)


class TestAlert:
    """Test Alert model validations."""
    
    def test_valid_high_power_alert(self):
        """Test that a valid HIGH_POWER alert is accepted."""
        alert = Alert(
            meter_id="METER_001",
            alert_type="HIGH_POWER",
            measured_value=12500.0,
            threshold_value=10000.0,
            timestamp=datetime.now()
        )
        
        assert alert.meter_id == "METER_001"
        assert alert.alert_type == "HIGH_POWER"
        assert alert.measured_value == 12500.0
        assert alert.acknowledged is False
        assert alert.dismissed is False
    
    def test_valid_low_power_factor_alert(self):
        """Test that a valid LOW_POWER_FACTOR alert is accepted."""
        alert = Alert(
            meter_id="METER_001",
            alert_type="LOW_POWER_FACTOR",
            measured_value=0.65,
            threshold_value=0.8,
            timestamp=datetime.now()
        )
        
        assert alert.alert_type == "LOW_POWER_FACTOR"
        assert alert.measured_value == 0.65
    
    def test_invalid_alert_type_rejected(self):
        """Test that invalid alert types are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            Alert(
                meter_id="METER_001",
                alert_type="INVALID_TYPE",  # Invalid: not HIGH_POWER or LOW_POWER_FACTOR
                measured_value=12500.0,
                threshold_value=10000.0,
                timestamp=datetime.now()
            )
        
        assert "alert_type" in str(exc_info.value)
    
    def test_alert_with_acknowledgment_fields(self):
        """Test alert with acknowledgment information."""
        alert = Alert(
            meter_id="METER_001",
            alert_type="HIGH_POWER",
            measured_value=12500.0,
            threshold_value=10000.0,
            timestamp=datetime.now(),
            acknowledged=True,
            acknowledged_at=datetime.now(),
            acknowledged_by="user_123"
        )
        
        assert alert.acknowledged is True
        assert alert.acknowledged_by == "user_123"
        assert alert.acknowledged_at is not None


class TestMeterStatus:
    """Test MeterStatus model validations."""
    
    def test_valid_online_meter_status(self):
        """Test that a valid online meter status is accepted."""
        status = MeterStatus(
            meter_id="METER_001",
            name="Production Line 1",
            location="Building A",
            status="online",
            last_reading_timestamp=datetime.now(),
            firmware_version="1.0.0",
            uptime_seconds=86400
        )
        
        assert status.status == "online"
        assert status.meter_id == "METER_001"
    
    def test_valid_offline_meter_status(self):
        """Test that a valid offline meter status is accepted."""
        status = MeterStatus(
            meter_id="METER_001",
            name="Production Line 1",
            status="offline"
        )
        
        assert status.status == "offline"
        assert status.last_reading_timestamp is None
    
    def test_invalid_status_rejected(self):
        """Test that invalid status values are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            MeterStatus(
                meter_id="METER_001",
                name="Production Line 1",
                status="disconnected"  # Invalid: must be 'online' or 'offline'
            )
        
        assert "status" in str(exc_info.value)


class TestHealthCheck:
    """Test HealthCheck model validations."""
    
    def test_valid_healthy_status(self):
        """Test that a valid healthy status is accepted."""
        health = HealthCheck(
            status="healthy",
            service_version="1.0.0",
            uptime_seconds=3600,
            database_connected=True,
            database_ping_ms=15.3
        )
        
        assert health.status == "healthy"
        assert health.database_connected is True
        assert health.database_ping_ms == 15.3
    
    def test_health_check_without_ping(self):
        """Test health check without database ping (when DB is disconnected)."""
        health = HealthCheck(
            status="degraded",
            service_version="1.0.0",
            uptime_seconds=3600,
            database_connected=False
        )
        
        assert health.database_connected is False
        assert health.database_ping_ms is None
    
    def test_negative_uptime_rejected(self):
        """Test that negative uptime is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            HealthCheck(
                status="healthy",
                service_version="1.0.0",
                uptime_seconds=-100,  # Invalid: negative
                database_connected=True
            )
        
        assert "uptime_seconds" in str(exc_info.value)


class TestThresholdUpdate:
    """Test ThresholdUpdate model validations."""
    
    def test_valid_threshold_update(self):
        """Test that a valid threshold update is accepted."""
        update = ThresholdUpdate(
            high_power_threshold=12000.0,
            low_power_factor_threshold=0.85
        )
        
        assert update.high_power_threshold == 12000.0
        assert update.low_power_factor_threshold == 0.85
    
    def test_partial_threshold_update(self):
        """Test that partial updates are allowed."""
        update = ThresholdUpdate(high_power_threshold=12000.0)
        
        assert update.high_power_threshold == 12000.0
        assert update.low_power_factor_threshold is None
    
    def test_invalid_power_factor_threshold_rejected(self):
        """Test that invalid power factor threshold is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            ThresholdUpdate(low_power_factor_threshold=1.5)  # Invalid: > 1
        
        assert "low_power_factor_threshold" in str(exc_info.value)



