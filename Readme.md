# IEMAS - Industrial Energy Monitoring & Analytics System

## Overview

IEMAS is an enterprise-grade Industrial IoT platform designed to monitor and analyze energy consumption from Schneider Energy Meters in industrial environments. The system provides real-time data collection, storage, visualization, and AI-powered analytics through a modular architecture that scales from 1 to 20+ meter installations.

## Architecture

```
Schneider Energy Meters (Modbus RTU/TCP) / Realistic Meter Simulator
           ↓
    ESP32 Devices (Edge Layer) / Python HTTP Client
           ↓
    FastAPI Backend (Python)
           ↓
  Supabase PostgreSQL Database
           ↓
  Next.js Dashboard (TypeScript/React)
           +
    Gemini AI Assistant
```

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Database**: PostgreSQL (via Supabase or local asyncpg)
- **AI**: Google Gemini AI

### Frontend
- **Framework**: Next.js 16.2.9 (App Router with Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Data Fetching**: TanStack Query
- **Charts**: Recharts v3
- **Icons**: Lucide React

### Production Hardware & Archive
- **Physical Edge**: ESP32 Gateways reading Schneider Electric Energy Meters (Modbus RTU/TCP) on PMCC panels & machines.
- **Simulator Archive**: Historical synthetic testing engine archived under `archieve/realistic_meter_simulator/`.

## Project Structure

```
IEMAS/
├── backend/                    # FastAPI backend service
│   ├── app/
│   │   ├── main.py             # Application entry point
│   │   ├── database.py         # Database connection
│   │   ├── models/             # Pydantic & SQLAlchemy models
│   │   └── routers/            # API route handlers
│   ├── scripts/                # Database maintenance & cleanup scripts
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # Next.js dashboard
│   ├── app/                    # App Router pages
│   ├── components/             # React components (RealtimeChart, Analytics, etc.)
│   ├── lib/                    # API clients and utilities
│   ├── hooks/                  # Custom React hooks
│   └── package.json            # Node dependencies
│
├── firmware/                   # ESP32 firmware (Arduino/ESP-IDF)
│   ├── src/                    # Modbus & HTTP transmission logic
│   ├── include/                # Register mappings & configs
│   └── data/                   # Device config JSON
│
├── archieve/                   # Archived tools & prototypes
│   └── realistic_meter_simulator/  # Archived Modbus/IoT synthetic simulator
│
├── database/                   # Database schema & migrations
└── docker-compose.yml          # Multi-container orchestration
```

## Getting Started

### 1. Database Setup
Create a PostgreSQL database (e.g. Supabase) and run the SQL schema located in `database/schema.sql`.

To purge test data for fresh deployment:
```bash
python backend/scripts/clean_database.py
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend will be available at http://localhost:8000

### 3. Frontend Setup

```bash
cd frontend
npm install

# Run development server with Turbopack
npm run dev
```
Frontend will be available at http://localhost:3000

### 4. Running the Archived Simulator (Optional Testing)
For offline synthetic testing without physical meters:

```bash
python -m archieve.realistic_meter_simulator.main
```
This will start generating simulated Modbus data and pushing it to the backend via HTTP.

## Features

### Real-Time Data Collection
- Automatic meter readings via Modbus / REST APIs
- Full simulation suite for synthetic operational testing
- Exponential backoff retry logic

### AI-Powered Analytics
- Natural language queries via Gemini AI
- Energy trend analysis and reporting
- Peak consumption insights

### Industrial UI Design
- Responsive SCADA-inspired interface
- Real-time Recharts visualizations
- High-contrast status indicators

## API Endpoints

- `GET /api/readings` - Get filtered historical readings
- `GET /api/readings/latest` - Get real-time latest reading per meter
- `POST /api/readings` - Receive meter reading from Edge/Simulator
- `GET /api/meters` - List all configured meters

## Development Roadmap

- [x] Phase 1: Project scaffolding and infrastructure setup
- [x] Phase 2: Backend data models and API endpoints
- [x] Phase 3: Database integration and authentication
- [x] Phase 4: Alert system and WebSocket real-time updates
- [x] Phase 5: ESP32 firmware development (Simulated)
- [x] Phase 6: Frontend dashboard and routing
- [x] Phase 7: Real-time meter visualization
- [x] Phase 8: Alert notification system
- [x] Phase 9: AI assistant integration
- [x] Phase 10: System monitoring dashboard
- [x] Phase 11: End-to-end integration and testing
- [x] Phase 12: Production deployment preparation

## License

Proprietary - Industrial Energy Monitoring & Analytics System
