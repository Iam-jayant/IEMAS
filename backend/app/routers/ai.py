"""
IEMAS Backend - AI Router
Endpoints for Gemini AI-powered natural language queries
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
from app.models.schemas import APIResponse, ErrorResponse
from app.services.ai_service import AIService
from app.auth import get_current_user

router = APIRouter()


class AIQueryRequest(BaseModel):
    """AI query request model"""
    query: str = Field(..., min_length=1, max_length=500, description="Natural language query about energy data")
    meter_id: Optional[str] = Field(None, description="Optional specific meter ID to query")


class AIQueryResponse(BaseModel):
    """AI query response model"""
    query: str
    query_type: str
    response: str
    data_used: dict
    timestamp: str


@router.post("/query",
    response_model=AIQueryResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid query"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def query_ai_assistant(
    request: AIQueryRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a natural language query to the AI assistant
    
    The AI assistant can answer questions about:
    - Current meter status and readings
    - Historical trends and patterns
    - Peak consumption periods
    - Energy cost estimates
    - Alerts and threshold violations
    - Meter comparisons
    
    Examples:
    - "What is the current power consumption of METER_001?"
    - "Show me the power trend for the last 7 days"
    - "Which meter had the highest consumption yesterday?"
    - "How much did METER_002 cost this month?"
    - "Summarize recent alerts"
    
    Requirements: 6.1, 6.3, 6.4, 6.6
    """
    try:
        # Validate query length
        if len(request.query) > 500:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query too long. Please limit queries to 500 characters."
            )
        
        # Initialize AI service
        ai_service = AIService(db)
        user_id = user.get("id")
        
        # Process query
        result = await ai_service.process_query(
            query=request.query,
            user_id=user_id,
            meter_id=request.meter_id
        )
        
        return AIQueryResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process AI query: {str(e)}"
        )


@router.get("/capabilities",
    response_model=dict
)
async def get_ai_capabilities(
    user: dict = Depends(get_current_user)
):
    """
    Get information about AI assistant capabilities
    
    Returns supported query types and example queries.
    """
    return {
        "query_types": {
            "CURRENT_STATUS": {
                "description": "Real-time meter status queries",
                "examples": [
                    "What is the current power consumption?",
                    "Show me the status of METER_001",
                    "What are the current readings?"
                ]
            },
            "HISTORICAL_TRENDS": {
                "description": "Historical data analysis",
                "examples": [
                    "Show power trends for the last week",
                    "What was the energy consumption yesterday?",
                    "How has the power factor changed over time?"
                ]
            },
            "PEAK_ANALYSIS": {
                "description": "Peak consumption identification",
                "examples": [
                    "When was the highest power consumption?",
                    "Show me peak power periods",
                    "What was the maximum power this month?"
                ]
            },
            "COST_ESTIMATE": {
                "description": "Energy cost calculations",
                "examples": [
                    "How much did we spend on energy this month?",
                    "Estimate the cost for METER_002",
                    "What's the energy bill forecast?"
                ]
            },
            "ALERTS_SUMMARY": {
                "description": "Alert and threshold queries",
                "examples": [
                    "Summarize recent alerts",
                    "How many high power alerts occurred?",
                    "Show me threshold violations"
                ]
            },
            "COMPARISON": {
                "description": "Meter comparison queries",
                "examples": [
                    "Compare METER_001 and METER_002",
                    "Which meter uses the most power?",
                    "Show differences between meters"
                ]
            },
            "GENERAL": {
                "description": "General energy questions",
                "examples": [
                    "Give me an overview of the system",
                    "What should I know about energy usage?",
                    "Explain power factor"
                ]
            }
        },
        "limitations": [
            "AI responses are based on available meter data only",
            "Cost estimates assume $0.12/kWh unless specified",
            "Historical analysis limited to data retention period",
            "Queries limited to 500 characters",
            "Response time typically under 10 seconds"
        ],
        "tips": [
            "Be specific with meter IDs and time ranges",
            "Ask one question at a time for best results",
            "Include relevant context in your query",
            "Use technical terms familiar to energy engineers"
        ]
    }
