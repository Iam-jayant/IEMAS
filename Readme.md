# IEMAS - Industrial Energy Monitoring & Analytics System

## Overview

IEMAS is an enterprise-grade Industrial IoT platform designed to monitor and analyze energy consumption from Schneider Energy Meters in industrial environments. The system provides real-time data collection, storage, visualization, and AI-powered analytics through a modular architecture that scales from 1 to 20+ meter installations.

## Architecture

```
Schneider Energy Meters (Modbus RTU/TCP)
           ↓
    ESP32 Devices (Edge Layer)
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
- **Database**: Supabase PostgreSQL
- **AI**: Google Gemini 2.5 Flash

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Icons**: Lucide React

### Edge Devices
- **Hardware**: ESP32 microcontrollers
- **Communication**: Modbus RTU over RS485 (MAX3485)
- **Protocol**: HTTP POST to backend API

## Project Structure

```
IEMAS/
├── backend/              # FastAPI backend service
│   ├── app/
│   │   ├── main.py      # Application entry point
│   │   ├── config.py    # Configuration management
│   │   ├── database.py  # Database connection
│   │   ├── models/      # Pydantic & SQLAlchemy models
│   │   ├── routers/     # API route handlers
│   │   └── services/    # Business logic
│   ├── requirements.txt # Python dependencies
│   ├── Dockerfile       # Backend containerization
│   └── .env.example     # Environment variables template
│
├── frontend/            # Next.js dashboard
│   ├── app/            # App Router pages
│   │   ├── (auth)/     # Authentication pages
│   │   └── (dashboard)/# Dashboard pages
│   ├── components/     # React components
│   ├── lib/            # Utilities & API client
│   ├── hooks/          # Custom React hooks
│   ├── Dockerfile      # Frontend containerization
│   └── .env.local.example
│
├── firmware/           # ESP32 firmware (Arduino/ESP-IDF)
│   └── README.md       # Firmware documentation
│
├── database/           # Database schema & migrations
│   ├── schema.sql      # PostgreSQL schema
│   ├── seed.sql        # Sample data
│   └── README.md       # Database setup guide
│
├── docs/               # Documentation
├── docker-compose.yml  # Multi-container orchestration
└── README.md           # This file
```

## Getting Started

### Prerequisites

- **Backend**: Python 3.11+, pip
- **Frontend**: Node.js 20+, npm
- **Database**: Supabase account (or local PostgreSQL)
- **ESP32**: Arduino IDE or PlatformIO (for firmware development)

### 1. Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema:
   ```bash
   # Copy contents of database/schema.sql
   # Paste and execute in Supabase SQL Editor
   ```
3. (Optional) Seed sample data:
   ```bash
   # Copy contents of database/seed.sql and execute
   ```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials and Gemini API key

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at http://localhost:8000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local with your API URL and Supabase credentials

# Run development server
npm run dev
```

Frontend will be available at http://localhost:3000

### 4. Docker Deployment (Optional)

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Variables

### Backend (.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
ENVIRONMENT=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Features

### Real-Time Data Collection
- Automatic meter readings every 1-2 minutes
- ESP32 → FastAPI → Supabase pipeline
- Exponential backoff retry logic

### Threshold-Based Alerts
- High power consumption alerts
- Low power factor warnings
- Real-time WebSocket notifications

### AI-Powered Analytics
- Natural language queries via Gemini AI
- Energy trend analysis
- Peak consumption insights
- Cost estimation

### Industrial UI Design
- SCADA-inspired interface
- Dark sidebar with light content area
- High-contrast status indicators
- Real-time charts and metrics

### System Monitoring
- Meter connection status
- Backend service health
- Database connectivity
- ESP32 device metrics

## API Endpoints

### Readings
- `POST /api/readings` - Receive meter reading from ESP32
- `GET /api/readings` - Get filtered readings
- `GET /api/readings/latest` - Get latest reading per meter

### Meters
- `GET /api/meters` - List all meters
- `POST /api/meters` - Register new meter
- `PUT /api/meters/{id}` - Update meter
- `DELETE /api/meters/{id}` - Delete meter

### Alerts
- `GET /api/alerts` - Get alert history
- `POST /api/alerts/{id}/acknowledge` - Acknowledge alert
- `POST /api/alerts/{id}/dismiss` - Dismiss alert

### Thresholds
- `GET /api/thresholds/{meter_id}` - Get thresholds
- `PUT /api/thresholds/{meter_id}` - Update thresholds

### AI
- `POST /api/ai/query` - Submit natural language query

### Health
- `GET /api/health` - Health check

## Performance Targets

- **Data Collection**: 60-120 second intervals
- **Database Storage**: <500ms per reading
- **Alert Evaluation**: <200ms per reading
- **Dashboard Updates**: <5 seconds from storage
- **AI Query Response**: <10 seconds

## Development Roadmap

- [x] Phase 1: Project scaffolding and infrastructure setup
- [ ] Phase 2: Backend data models and API endpoints
- [ ] Phase 3: Database integration and authentication
- [ ] Phase 4: Alert system and WebSocket real-time updates
- [ ] Phase 5: ESP32 firmware development
- [ ] Phase 6: Frontend dashboard and authentication
- [ ] Phase 7: Real-time meter visualization
- [ ] Phase 8: Alert notification system
- [ ] Phase 9: AI assistant integration
- [ ] Phase 10: System monitoring dashboard
- [ ] Phase 11: End-to-end integration and testing
- [ ] Phase 12: Production deployment

## License

Proprietary - Industrial Energy Monitoring & Analytics System

## Support

For issues and questions, contact the development team.
