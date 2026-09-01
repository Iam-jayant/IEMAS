"""
Health check endpoints for system monitoring
"""
from fastapi import APIRouter, status, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.schemas import HealthCheckResponse
from datetime import datetime

router = APIRouter(tags=["health"])

@router.get("/", response_model=HealthCheckResponse, status_code=status.HTTP_200_OK)
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint - returns system status and database connectivity
    No authentication required
    """
    health_data = {
        "status": "healthy",
        "service": "iemas-backend",
        "version": "1.0.0",
        "timestamp": datetime.utcnow(),
        "database_connected": False
    }
    
    # Check database connectivity
    try:
        # Try to execute a simple query
        result = db.execute(text("SELECT 1"))
        result.scalar()
        health_data["database_connected"] = True
    except Exception as e:
        health_data["status"] = "unhealthy"
        health_data["database_connected"] = False
        
        # Return 503 Service Unavailable if database is down
        return HealthCheckResponse(**health_data)
    
    return HealthCheckResponse(**health_data)


@router.get("/ping", status_code=status.HTTP_200_OK)
async def ping():
    """
    Simple ping endpoint for basic service availability check
    No authentication or database check
    """
    return {"status": "ok", "message": "pong"}
