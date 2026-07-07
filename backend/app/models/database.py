"""
IEMAS Backend - SQLAlchemy ORM Models
Database table definitions and relationships
"""
from sqlalchemy import Column, String, Float, Integer, BigInteger, Boolean, TIMESTAMP, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Meter(Base):
    """Meter model - Registered Schneider Energy Meters"""
    __tablename__ = "meters"

    meter_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255))
    modbus_config = Column(JSON)  # JSONB in PostgreSQL
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    readings = relationship("MeterReading", back_populates="meter", cascade="all, delete-orphan")
    threshold = relationship("Threshold", back_populates="meter", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="meter", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Meter(meter_id='{self.meter_id}', name='{self.name}', location='{self.location}')>"


class MeterReading(Base):
    """MeterReading model - Time-series data from energy meters"""
    __tablename__ = "meter_readings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    meter_id = Column(String(50), ForeignKey("meters.meter_id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(TIMESTAMP, nullable=False, index=True)
    voltage = Column(Float, nullable=False)
    current = Column(Float, nullable=False)
    active_power = Column(Float, nullable=False)
    reactive_power = Column(Float, nullable=False)
    apparent_power = Column(Float, nullable=False)
    power_factor = Column(Float, nullable=False)
    frequency = Column(Float, nullable=False)
    cumulative_energy = Column(Float, nullable=False)
    firmware_version = Column(String(50))
    uptime_seconds = Column(Integer)
    wifi_rssi = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    meter = relationship("Meter", back_populates="readings")

    # Composite indexes for efficient querying
    __table_args__ = (
        Index('idx_meter_readings_meter_time', 'meter_id', 'timestamp'),
    )

    def __repr__(self):
        return f"<MeterReading(id={self.id}, meter_id='{self.meter_id}', timestamp='{self.timestamp}', power={self.active_power})>"


class Threshold(Base):
    """Threshold model - Alert threshold configurations per meter"""
    __tablename__ = "thresholds"

    meter_id = Column(String(50), ForeignKey("meters.meter_id", ondelete="CASCADE"), primary_key=True)
    high_power_threshold = Column(Float, nullable=False, default=10000.0)
    low_power_factor_threshold = Column(Float, nullable=False, default=0.8)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    meter = relationship("Meter", back_populates="threshold")

    def __repr__(self):
        return f"<Threshold(meter_id='{self.meter_id}', high_power={self.high_power_threshold}, low_pf={self.low_power_factor_threshold})>"


class Alert(Base):
    """Alert model - Generated alerts for threshold violations"""
    __tablename__ = "alerts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    meter_id = Column(String(50), ForeignKey("meters.meter_id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)
    measured_value = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False, index=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(TIMESTAMP)
    acknowledged_by = Column(String(255))  # User ID from Supabase Auth
    dismissed = Column(Boolean, default=False)
    dismissed_at = Column(TIMESTAMP)
    dismissed_by = Column(String(255))  # User ID from Supabase Auth
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    meter = relationship("Meter", back_populates="alerts")

    # Composite indexes for efficient querying
    __table_args__ = (
        Index('idx_alerts_active', 'meter_id', 'timestamp', postgresql_where=(dismissed == False)),
    )

    def __repr__(self):
        return f"<Alert(id={self.id}, meter_id='{self.meter_id}', type='{self.alert_type}', value={self.measured_value})>"
