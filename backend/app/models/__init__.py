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

# Pydantic schemas (API validation)
from app.models.schemas import (
    MeterReading,
    MeterRegistration,
    MeterUpdate,
    MeterResponse,
    Alert,
    AlertType,
    AlertAcknowledge,
    AlertDismiss,
    ThresholdConfig,
    ThresholdResponse,
    ReadingResponse,
    HealthCheck,
    APIResponse,
    ErrorResponse,
)

# SQLAlchemy models (ORM)
from app.models.database import (
    Meter,
    MeterReading as MeterReadingDB,
    Threshold,
    Alert as AlertDB,
    init_db,
    get_or_create,
)

__all__ = [
    # Pydantic schemas
    "MeterReading",
    "MeterRegistration",
    "MeterUpdate",
    "MeterResponse",
    "Alert",
    "AlertType",
    "AlertAcknowledge",
    "AlertDismiss",
    "ThresholdConfig",
    "ThresholdResponse",
    "ReadingResponse",
    "HealthCheck",
    "APIResponse",
    "ErrorResponse",
    # SQLAlchemy models
    "Meter",
    "MeterReadingDB",
    "Threshold",
    "AlertDB",
    "init_db",
    "get_or_create",
]

from .schemas import (
    MeterReading,
    MeterRegistration,
    MeterUpdate,
    ThresholdConfig,
    ThresholdUpdate,
    Alert,
    AlertAcknowledge,
    AlertDismiss,
    MeterStatus,
    HealthCheck,
)

__all__ = [
    "MeterReading",
    "MeterRegistration",
    "MeterUpdate",
    "ThresholdConfig",
    "ThresholdUpdate",
    "Alert",
    "AlertAcknowledge",
    "AlertDismiss",
    "MeterStatus",
    "HealthCheck",
]

from app.models.database import Meter, MeterReading, Threshold, Alert

__all__ = ["Meter", "MeterReading", "Threshold", "Alert"]
