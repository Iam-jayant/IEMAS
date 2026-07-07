"""
IEMAS Backend - Thresholds Router
Endpoints for threshold configuration management
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.schemas import (
    ThresholdConfig,
    ThresholdResponse,
    APIResponse,
    ErrorResponse
)
from app.services.alert_service import AlertService
from app.auth import get_current_user

router = APIRouter()


@router.get("/{meter_id}",
    response_model=ThresholdResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Threshold configuration not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_threshold(
    meter_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get threshold configuration for a specific meter
    
    - **meter_id**: Meter identifier
    
    Requirements: 5.8
    """
    try:
        alert_service = AlertService(db)
        threshold = await alert_service.get_threshold(meter_id)
        
        if not threshold:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Threshold configuration not found for meter {meter_id}"
            )
        
        return ThresholdResponse.model_validate(threshold)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve threshold configuration: {str(e)}"
        )


@router.put("/{meter_id}",
    response_model=APIResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid threshold values"},
        404: {"model": ErrorResponse, "description": "Meter not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def update_threshold(
    meter_id: str,
    threshold_config: ThresholdConfig,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update threshold configuration for a specific meter
    
    - **meter_id**: Meter identifier
    - **high_power_threshold**: High power threshold in kW (must be > 0)
    - **low_power_factor_threshold**: Low power factor threshold (0.0 to 1.0)
    
    Requirements: 5.8
    """
    try:
        # Verify meter exists
        from sqlalchemy import select
        from app.models.database import Meter
        
        result = await db.execute(
            select(Meter).where(Meter.meter_id == meter_id)
        )
        meter = result.scalar_one_or_none()
        
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meter {meter_id} not found. Please register the meter first."
            )
        
        # Validate threshold values
        if threshold_config.high_power_threshold <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="High power threshold must be greater than 0"
            )
        
        if not (0.0 <= threshold_config.low_power_factor_threshold <= 1.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Low power factor threshold must be between 0.0 and 1.0"
            )
        
        # Update threshold
        alert_service = AlertService(db)
        threshold = await alert_service.update_threshold(
            meter_id=meter_id,
            high_power_threshold=threshold_config.high_power_threshold,
            low_power_factor_threshold=threshold_config.low_power_factor_threshold
        )
        
        return APIResponse(
            status="success",
            message=f"Threshold configuration updated for meter {meter_id}",
            data={
                "meter_id": threshold.meter_id,
                "high_power_threshold": threshold.high_power_threshold,
                "low_power_factor_threshold": threshold.low_power_factor_threshold,
                "updated_at": threshold.updated_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update threshold configuration: {str(e)}"
        )


@router.post("/{meter_id}",
    response_model=APIResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid threshold values or threshold already exists"},
        404: {"model": ErrorResponse, "description": "Meter not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def create_threshold(
    meter_id: str,
    threshold_config: ThresholdConfig,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create threshold configuration for a specific meter
    
    - **meter_id**: Meter identifier
    - **high_power_threshold**: High power threshold in kW (must be > 0)
    - **low_power_factor_threshold**: Low power factor threshold (0.0 to 1.0)
    
    Requirements: 5.8
    """
    try:
        # Verify meter exists
        from sqlalchemy import select
        from app.models.database import Meter, Threshold
        
        result = await db.execute(
            select(Meter).where(Meter.meter_id == meter_id)
        )
        meter = result.scalar_one_or_none()
        
        if not meter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meter {meter_id} not found. Please register the meter first."
            )
        
        # Check if threshold already exists
        result = await db.execute(
            select(Threshold).where(Threshold.meter_id == meter_id)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Threshold configuration already exists for meter {meter_id}. Use PUT to update."
            )
        
        # Validate threshold values
        if threshold_config.high_power_threshold <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="High power threshold must be greater than 0"
            )
        
        if not (0.0 <= threshold_config.low_power_factor_threshold <= 1.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Low power factor threshold must be between 0.0 and 1.0"
            )
        
        # Create threshold
        alert_service = AlertService(db)
        threshold = await alert_service.update_threshold(
            meter_id=meter_id,
            high_power_threshold=threshold_config.high_power_threshold,
            low_power_factor_threshold=threshold_config.low_power_factor_threshold
        )
        
        return APIResponse(
            status="success",
            message=f"Threshold configuration created for meter {meter_id}",
            data={
                "meter_id": threshold.meter_id,
                "high_power_threshold": threshold.high_power_threshold,
                "low_power_factor_threshold": threshold.low_power_factor_threshold,
                "updated_at": threshold.updated_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create threshold configuration: {str(e)}"
        )


@router.delete("/{meter_id}",
    response_model=APIResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Threshold configuration not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def delete_threshold(
    meter_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete threshold configuration for a specific meter
    
    - **meter_id**: Meter identifier
    """
    try:
        from sqlalchemy import select, delete
        from app.models.database import Threshold
        
        # Check if threshold exists
        result = await db.execute(
            select(Threshold).where(Threshold.meter_id == meter_id)
        )
        threshold = result.scalar_one_or_none()
        
        if not threshold:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Threshold configuration not found for meter {meter_id}"
            )
        
        # Delete the threshold
        await db.execute(
            delete(Threshold).where(Threshold.meter_id == meter_id)
        )
        await db.commit()
        
        return APIResponse(
            status="success",
            message=f"Threshold configuration deleted for meter {meter_id}",
            data={"meter_id": meter_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete threshold configuration: {str(e)}"
        )
