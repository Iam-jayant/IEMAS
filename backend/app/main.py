"""
IEMAS Backend - Main Application Entry Point
Industrial Energy Monitoring & Analytics System
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 IEMAS Backend starting up...")
    try:
        from app.database import engine, Base
        import app.models.database  # Ensure models are loaded
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables initialized successfully")
    except Exception as e:
        print(f"⚠️ Warning: Database initialization skipped or failed: {e}")
    yield
    # Shutdown
    print("🔌 IEMAS Backend shutting down...")

# Initialize FastAPI application
app = FastAPI(
    title="IEMAS Backend API",
    description="Industrial Energy Monitoring & Analytics System",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://iemas-hq.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "IEMAS Backend API",
        "version": "1.0.0",
        "status": "running"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "iemas-backend",
        "version": "1.0.0"
    }

# Include routers
from app.routers import readings, meters, health, alerts, thresholds, websocket, ai

app.include_router(readings.router, prefix="/api/readings", tags=["readings"])
app.include_router(meters.router, prefix="/api/meters", tags=["meters"])
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(thresholds.router, prefix="/api/thresholds", tags=["thresholds"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

# trigger reload

# trigger reload 2
