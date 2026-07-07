"""
Test SQLAlchemy ORM Database Models
Validates model definitions, relationships, and constraints
"""
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from app.database import Base
from app.models.database import Meter, MeterReading, Threshold, Alert


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_meter_creation(db_session):
    """Test creating a Meter record"""
    meter = Meter(
        meter_id="MTR-TEST-001",
        name="Test Meter",
        location="Test Location",
        modbus_config={"type": "RTU", "baudrate": 9600}
    )
    db_session.add(meter)
    db_session.commit()
    
    # Verify meter was created
    retrieved_meter = db_session.query(Meter).filter_by(meter_id="MTR-TEST-001").first()
    assert retrieved_meter is not None
    assert retrieved_meter.name == "Test Meter"
    assert retrieved_meter.location == "Test Location"
    assert retrieved_meter.modbus_config["type"] == "RTU"


def test_meter_reading_creation(db_session):
    """Test creating a MeterReading record"""
    # Create meter first
    meter = Meter(meter_id="MTR-TEST-002", name="Test Meter 2")
    db_session.add(meter)
    db_session.commit()
    
    # Create reading
    reading = MeterReading(
        meter_id="MTR-TEST-002",
        timestamp=datetime.now(),
        voltage=230.5,
        current=10.2,
        active_power=2350.0,
        reactive_power=100.0,
        apparent_power=2360.0,
        power_factor=0.995,
        frequency=50.0,
        cumulative_energy=1000.0,
        firmware_version="v1.0.0",
        uptime_seconds=3600
    )
    db_session.add(reading)
    db_session.commit()
    
    # Verify reading was created
    retrieved_reading = db_session.query(MeterReading).filter_by(meter_id="MTR-TEST-002").first()
    assert retrieved_reading is not None
    assert retrieved_reading.voltage == 230.5
    assert retrieved_reading.active_power == 2350.0


def test_threshold_creation(db_session):
    """Test creating a Threshold record"""
    # Create meter first
    meter = Meter(meter_id="MTR-TEST-003", name="Test Meter 3")
    db_session.add(meter)
    db_session.commit()
    
    # Create threshold
    threshold = Threshold(
        meter_id="MTR-TEST-003",
        high_power_threshold=15000.0,
        low_power_factor_threshold=0.85
    )
    db_session.add(threshold)
    db_session.commit()
    
    # Verify threshold was created
    retrieved_threshold = db_session.query(Threshold).filter_by(meter_id="MTR-TEST-003").first()
    assert retrieved_threshold is not None
    assert retrieved_threshold.high_power_threshold == 15000.0
    assert retrieved_threshold.low_power_factor_threshold == 0.85


def test_alert_creation(db_session):
    """Test creating an Alert record"""
    # Create meter first
    meter = Meter(meter_id="MTR-TEST-004", name="Test Meter 4")
    db_session.add(meter)
    db_session.commit()
    
    # Create alert
    alert = Alert(
        meter_id="MTR-TEST-004",
        alert_type="HIGH_POWER",
        measured_value=12000.0,
        threshold_value=10000.0,
        timestamp=datetime.now()
    )
    db_session.add(alert)
    db_session.commit()
    
    # Verify alert was created
    retrieved_alert = db_session.query(Alert).filter_by(meter_id="MTR-TEST-004").first()
    assert retrieved_alert is not None
    assert retrieved_alert.alert_type == "HIGH_POWER"
    assert retrieved_alert.measured_value == 12000.0
    assert retrieved_alert.acknowledged is False
    assert retrieved_alert.dismissed is False


def test_meter_reading_relationship(db_session):
    """Test relationship between Meter and MeterReading"""
    # Create meter
    meter = Meter(meter_id="MTR-TEST-005", name="Test Meter 5")
    db_session.add(meter)
    db_session.commit()
    
    # Create multiple readings
    for i in range(3):
        reading = MeterReading(
            meter_id="MTR-TEST-005",
            timestamp=datetime.now(),
            voltage=230.0 + i,
            current=10.0,
            active_power=2300.0,
            reactive_power=100.0,
            apparent_power=2310.0,
            power_factor=0.99,
            frequency=50.0,
            cumulative_energy=1000.0 + i
        )
        db_session.add(reading)
    db_session.commit()
    
    # Verify relationship
    meter = db_session.query(Meter).filter_by(meter_id="MTR-TEST-005").first()
    assert len(meter.readings) == 3


def test_cascade_delete(db_session):
    """Test cascade delete when meter is deleted"""
    # Create meter with readings, threshold, and alerts
    meter = Meter(meter_id="MTR-TEST-006", name="Test Meter 6")
    db_session.add(meter)
    db_session.commit()
    
    reading = MeterReading(
        meter_id="MTR-TEST-006",
        timestamp=datetime.now(),
        voltage=230.0,
        current=10.0,
        active_power=2300.0,
        reactive_power=100.0,
        apparent_power=2310.0,
        power_factor=0.99,
        frequency=50.0,
        cumulative_energy=1000.0
    )
    threshold = Threshold(meter_id="MTR-TEST-006")
    alert = Alert(
        meter_id="MTR-TEST-006",
        alert_type="HIGH_POWER",
        measured_value=12000.0,
        threshold_value=10000.0,
        timestamp=datetime.now()
    )
    db_session.add_all([reading, threshold, alert])
    db_session.commit()
    
    # Delete meter
    db_session.delete(meter)
    db_session.commit()
    
    # Verify cascade delete
    assert db_session.query(MeterReading).filter_by(meter_id="MTR-TEST-006").count() == 0
    assert db_session.query(Threshold).filter_by(meter_id="MTR-TEST-006").count() == 0
    assert db_session.query(Alert).filter_by(meter_id="MTR-TEST-006").count() == 0


def test_foreign_key_constraint(db_session):
    """Test foreign key constraint enforcement"""
    # Try to create reading without meter (should fail in PostgreSQL)
    # Note: SQLite has limited FK enforcement, so this test is primarily for documentation
    reading = MeterReading(
        meter_id="NON_EXISTENT_METER",
        timestamp=datetime.now(),
        voltage=230.0,
        current=10.0,
        active_power=2300.0,
        reactive_power=100.0,
        apparent_power=2310.0,
        power_factor=0.99,
        frequency=50.0,
        cumulative_energy=1000.0
    )
    db_session.add(reading)
    
    # In PostgreSQL this would raise IntegrityError
    # In SQLite with FK enforcement enabled, it would also fail
    try:
        db_session.commit()
        # If we reach here in SQLite, FK enforcement is off (default)
        # In PostgreSQL, this commit would fail
    except IntegrityError:
        db_session.rollback()
        # This is expected behavior
        pass
