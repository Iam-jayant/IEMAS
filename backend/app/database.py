"""
IEMAS Backend - Database Connection and Session Management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create Base class for models
Base = declarative_base()

# Only initialize database if not in DEV_MODE
if not settings.DEV_MODE:
    # Create database engine
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

    # Create SessionLocal class
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    # DEV_MODE: No database connection
    engine = None
    SessionLocal = None

# Dependency to get database session
def get_db():
    """Get database session"""
    if settings.DEV_MODE:
        # DEV_MODE: Return None (endpoints should handle mock data)
        yield None
    else:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
