"""IEMAS Backend - Data Models"""

# Pydantic schemas for API validation
from .schemas import (
    MeterReadingCreate,
    MeterReadingResponse,
    MeterReadingQuery,
    MeterRegistration,
    MeterResponse,
    MeterUpdate,
    ThresholdConfig,
    ThresholdResponse,
    AlertCreate,
    AlertResponse,
    AlertAcknowledge,
    AlertDismiss,
    HealthCheckResponse,
    APIResponse,
    ErrorResponse,
)

# SQLAlchemy ORM models
from .database import (
    Meter,
    MeterReading,
    Threshold,
    Alert,
)

__all__ = [
    # Pydantic schemas
    "MeterReadingCreate",
    "MeterReadingResponse",
    "MeterReadingQuery",
    "MeterRegistration",
    "MeterResponse",
    "MeterUpdate",
    "ThresholdConfig",
    "ThresholdResponse",
    "AlertCreate",
    "AlertResponse",
    "AlertAcknowledge",
    "AlertDismiss",
    "HealthCheckResponse",
    "APIResponse",
    "ErrorResponse",
    # SQLAlchemy models
    "Meter",
    "MeterReading",
    "Threshold",
    "Alert",
]

