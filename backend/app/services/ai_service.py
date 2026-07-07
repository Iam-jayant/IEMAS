"""
AI Service for Natural Language Query Processing
Integrates with Google Gemini AI for energy analytics
"""
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import google.generativeai as genai
import json

from app.models.database import MeterReading, Meter, Alert


class AIService:
    """Service for processing natural language queries about energy data"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Configure Gemini AI
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def classify_query(self, query: str) -> str:
        """
        Classify user query into predefined categories
        
        Args:
            query: Natural language query from user
            
        Returns:
            Query type classification:
            - CURRENT_STATUS: Real-time meter status queries
            - HISTORICAL_TRENDS: Historical data analysis
            - PEAK_ANALYSIS: Peak consumption identification
            - COST_ESTIMATE: Energy cost calculations
            - ALERTS_SUMMARY: Alert and threshold queries
            - COMPARISON: Meter comparison queries
            - GENERAL: General energy questions
            
        Requirements: 6.1, 6.3, 6.5
        """
        query_lower = query.lower()
        
        # Current status keywords
        if any(word in query_lower for word in ["current", "now", "status", "right now", "present", "today"]):
            return "CURRENT_STATUS"
        
        # Historical trends keywords
        if any(word in query_lower for word in ["trend", "history", "past", "yesterday", "last week", "last month", "over time", "historical"]):
            return "HISTORICAL_TRENDS"
        
        # Peak analysis keywords
        if any(word in query_lower for word in ["peak", "maximum", "highest", "most", "spike", "surge"]):
            return "PEAK_ANALYSIS"
        
        # Cost estimate keywords
        if any(word in query_lower for word in ["cost", "expense", "bill", "money", "price", "rate", "$/kwh"]):
            return "COST_ESTIMATE"
        
        # Alerts and thresholds keywords
        if any(word in query_lower for word in ["alert", "threshold", "warning", "alarm", "exceeded", "violation"]):
            return "ALERTS_SUMMARY"
        
        # Comparison keywords
        if any(word in query_lower for word in ["compare", "comparison", "versus", "vs", "difference between", "which meter"]):
            return "COMPARISON"
        
        # Default to general
        return "GENERAL"
    
    async def fetch_context_data(self, query_type: str, meter_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch relevant meter data based on query type
        
        Args:
            query_type: Classification of the query
            meter_id: Optional specific meter ID
            
        Returns:
            Dictionary with relevant meter data
            
        Requirements: 6.2, 6.3
        """
        context = {
            "query_type": query_type,
            "timestamp": datetime.utcnow().isoformat(),
            "meters": [],
            "readings": [],
            "alerts": [],
            "aggregates": {}
        }
        
        if query_type == "CURRENT_STATUS":
            # Get latest readings for all or specific meter
            context["readings"] = await self._get_latest_readings(meter_id)
            context["meters"] = await self._get_meters_info(meter_id)
            
        elif query_type == "HISTORICAL_TRENDS":
            # Get readings from last 7 days
            start_time = datetime.utcnow() - timedelta(days=7)
            context["readings"] = await self._get_readings_by_time_range(
                start_time=start_time,
                meter_id=meter_id,
                limit=1000
            )
            context["aggregates"] = await self._calculate_aggregates(meter_id, start_time)
            
        elif query_type == "PEAK_ANALYSIS":
            # Get peak power readings from last 30 days
            start_time = datetime.utcnow() - timedelta(days=30)
            context["readings"] = await self._get_peak_readings(
                meter_id=meter_id,
                start_time=start_time,
                limit=50
            )
            
        elif query_type == "COST_ESTIMATE":
            # Get energy consumption for cost calculation
            start_time = datetime.utcnow() - timedelta(days=30)
            context["readings"] = await self._get_readings_by_time_range(
                start_time=start_time,
                meter_id=meter_id,
                limit=500
            )
            context["aggregates"] = await self._calculate_energy_totals(meter_id, start_time)
            
        elif query_type == "ALERTS_SUMMARY":
            # Get recent alerts
            start_time = datetime.utcnow() - timedelta(days=7)
            context["alerts"] = await self._get_alerts_by_time_range(
                meter_id=meter_id,
                start_time=start_time,
                limit=100
            )
            
        elif query_type == "COMPARISON":
            # Get latest readings from all meters for comparison
            context["readings"] = await self._get_latest_readings(None)
            context["meters"] = await self._get_meters_info(None)
            context["aggregates"] = await self._calculate_aggregates(None, datetime.utcnow() - timedelta(days=7))
            
        else:  # GENERAL
            # Provide general overview
            context["readings"] = await self._get_latest_readings(meter_id)
            context["meters"] = await self._get_meters_info(meter_id)
            context["alerts"] = await self._get_alerts_by_time_range(
                meter_id=meter_id,
                start_time=datetime.utcnow() - timedelta(days=1),
                limit=10
            )
        
        return context
    
    def build_prompt(self, query: str, context_data: Dict[str, Any]) -> str:
        """
        Build prompt for Gemini AI with query and context data
        
        Args:
            query: User's natural language query
            context_data: Relevant meter data
            
        Returns:
            Formatted prompt string
        """
        prompt = f"""You are an industrial energy monitoring assistant for the IEMAS (Industrial Energy Monitoring & Analytics System).

USER QUERY: {query}

QUERY TYPE: {context_data.get('query_type', 'GENERAL')}

AVAILABLE METER DATA:
{json.dumps(context_data, indent=2, default=str)}

INSTRUCTIONS:
1. Analyze the user's query and the provided meter data
2. Provide insights, trends, or answers based on the data
3. If calculating costs, assume $0.12 per kWh unless user specifies otherwise
4. For trend analysis, identify patterns, anomalies, or notable changes
5. For peak analysis, identify the highest consumption periods and possible causes
6. For alerts, summarize the severity and frequency
7. Be specific with numbers, timestamps, and meter IDs
8. If data is insufficient, clearly explain what additional information is needed
9. Use technical terminology appropriate for industrial energy engineers
10. Format responses in a clear, professional manner

RESPONSE:"""
        
        return prompt
    
    async def process_query(self, query: str, user_id: str, meter_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process natural language query about energy data
        
        Args:
            query: User's natural language query
            user_id: ID of the user making the query
            meter_id: Optional specific meter ID
            
        Returns:
            Dictionary with query, response, and metadata
            
        Requirements: 6.1, 6.3, 6.4
        """
        try:
            # 1. Classify query type
            query_type = self.classify_query(query)
            
            # 2. Fetch relevant data
            context_data = await self.fetch_context_data(query_type, meter_id)
            
            # 3. Build prompt
            prompt = self.build_prompt(query, context_data)
            
            # 4. Get Gemini response
            response = self.model.generate_content(prompt)
            
            return {
                "query": query,
                "query_type": query_type,
                "response": response.text,
                "data_used": {
                    "meters_count": len(context_data.get("meters", [])),
                    "readings_count": len(context_data.get("readings", [])),
                    "alerts_count": len(context_data.get("alerts", [])),
                    "has_aggregates": bool(context_data.get("aggregates"))
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            # Handle errors gracefully
            return {
                "query": query,
                "query_type": "ERROR",
                "response": f"I encountered an error processing your query: {str(e)}. Please try rephrasing your question or contact support if the issue persists.",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    # Helper methods for data fetching
    
    async def _get_latest_readings(self, meter_id: Optional[str] = None) -> List[Dict]:
        """Get latest readings for each meter"""
        if meter_id:
            reading = self.db.query(MeterReading).filter(
                MeterReading.meter_id == meter_id
            ).order_by(desc(MeterReading.timestamp)).first()
            
            return [self._reading_to_dict(reading)] if reading else []
        else:
            # Get latest reading for each meter
            meters = self.db.query(Meter).all()
            readings = []
            
            for meter in meters:
                reading = self.db.query(MeterReading).filter(
                    MeterReading.meter_id == meter.meter_id
                ).order_by(desc(MeterReading.timestamp)).first()
                
                if reading:
                    readings.append(self._reading_to_dict(reading))
            
            return readings
    
    async def _get_readings_by_time_range(
        self,
        start_time: datetime,
        end_time: Optional[datetime] = None,
        meter_id: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict]:
        """Get readings within a time range"""
        query = self.db.query(MeterReading)
        
        if meter_id:
            query = query.filter(MeterReading.meter_id == meter_id)
        
        query = query.filter(MeterReading.timestamp >= start_time)
        
        if end_time:
            query = query.filter(MeterReading.timestamp <= end_time)
        
        readings = query.order_by(desc(MeterReading.timestamp)).limit(limit).all()
        
        return [self._reading_to_dict(r) for r in readings]
    
    async def _get_peak_readings(
        self,
        meter_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get peak power readings"""
        query = self.db.query(MeterReading)
        
        if meter_id:
            query = query.filter(MeterReading.meter_id == meter_id)
        
        if start_time:
            query = query.filter(MeterReading.timestamp >= start_time)
        
        readings = query.order_by(desc(MeterReading.active_power)).limit(limit).all()
        
        return [self._reading_to_dict(r) for r in readings]
    
    async def _get_alerts_by_time_range(
        self,
        meter_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get alerts within a time range"""
        query = self.db.query(Alert)
        
        if meter_id:
            query = query.filter(Alert.meter_id == meter_id)
        
        if start_time:
            query = query.filter(Alert.timestamp >= start_time)
        
        if end_time:
            query = query.filter(Alert.timestamp <= end_time)
        
        alerts = query.order_by(desc(Alert.timestamp)).limit(limit).all()
        
        return [self._alert_to_dict(a) for a in alerts]
    
    async def _get_meters_info(self, meter_id: Optional[str] = None) -> List[Dict]:
        """Get meter information"""
        if meter_id:
            meter = self.db.query(Meter).filter(Meter.meter_id == meter_id).first()
            return [self._meter_to_dict(meter)] if meter else []
        else:
            meters = self.db.query(Meter).all()
            return [self._meter_to_dict(m) for m in meters]
    
    async def _calculate_aggregates(
        self,
        meter_id: Optional[str] = None,
        start_time: Optional[datetime] = None
    ) -> Dict:
        """Calculate aggregate statistics"""
        query = self.db.query(
            func.avg(MeterReading.active_power).label('avg_power'),
            func.max(MeterReading.active_power).label('max_power'),
            func.min(MeterReading.active_power).label('min_power'),
            func.avg(MeterReading.power_factor).label('avg_power_factor'),
            func.count(MeterReading.id).label('reading_count')
        )
        
        if meter_id:
            query = query.filter(MeterReading.meter_id == meter_id)
        
        if start_time:
            query = query.filter(MeterReading.timestamp >= start_time)
        
        result = query.first()
        
        return {
            "average_power_kw": float(result.avg_power) if result.avg_power else 0,
            "max_power_kw": float(result.max_power) if result.max_power else 0,
            "min_power_kw": float(result.min_power) if result.min_power else 0,
            "average_power_factor": float(result.avg_power_factor) if result.avg_power_factor else 0,
            "total_readings": result.reading_count or 0
        }
    
    async def _calculate_energy_totals(
        self,
        meter_id: Optional[str] = None,
        start_time: Optional[datetime] = None
    ) -> Dict:
        """Calculate total energy consumption"""
        # Get first and last cumulative energy reading
        query = self.db.query(MeterReading)
        
        if meter_id:
            query = query.filter(MeterReading.meter_id == meter_id)
        
        if start_time:
            query = query.filter(MeterReading.timestamp >= start_time)
        
        first_reading = query.order_by(MeterReading.timestamp.asc()).first()
        last_reading = query.order_by(MeterReading.timestamp.desc()).first()
        
        if first_reading and last_reading:
            total_energy = last_reading.cumulative_energy - first_reading.cumulative_energy
        else:
            total_energy = 0
        
        return {
            "total_energy_kwh": float(total_energy),
            "estimated_cost_usd": float(total_energy * 0.12),  # Default $0.12/kWh
            "period_start": first_reading.timestamp.isoformat() if first_reading else None,
            "period_end": last_reading.timestamp.isoformat() if last_reading else None
        }
    
    # Helper methods to convert ORM objects to dictionaries
    
    def _reading_to_dict(self, reading: MeterReading) -> Dict:
        """Convert MeterReading to dictionary"""
        return {
            "meter_id": reading.meter_id,
            "timestamp": reading.timestamp.isoformat(),
            "voltage": reading.voltage,
            "current": reading.current,
            "active_power": reading.active_power,
            "reactive_power": reading.reactive_power,
            "apparent_power": reading.apparent_power,
            "power_factor": reading.power_factor,
            "frequency": reading.frequency,
            "cumulative_energy": reading.cumulative_energy
        }
    
    def _alert_to_dict(self, alert: Alert) -> Dict:
        """Convert Alert to dictionary"""
        return {
            "id": alert.id,
            "meter_id": alert.meter_id,
            "alert_type": alert.alert_type,
            "measured_value": alert.measured_value,
            "threshold_value": alert.threshold_value,
            "timestamp": alert.timestamp.isoformat(),
            "acknowledged": alert.acknowledged,
            "dismissed": alert.dismissed
        }
    
    def _meter_to_dict(self, meter: Meter) -> Dict:
        """Convert Meter to dictionary"""
        return {
            "meter_id": meter.meter_id,
            "name": meter.name,
            "location": meter.location
        }
