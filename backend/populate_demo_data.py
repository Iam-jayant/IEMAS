"""
Populate IEMAS Database with Demo/Mock Data
This script creates realistic meters, readings, and alerts for demonstration
"""
import sys
import os
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db
from app.models.database import Meter, MeterReading, Threshold, Alert
from sqlalchemy.orm import Session

def clear_existing_data(db: Session):
    """Clear existing demo data"""
    print("🗑️  Clearing existing data...")
    db.query(Alert).delete()
    db.query(MeterReading).delete()
    db.query(Threshold).delete()
    db.query(Meter).delete()
    db.commit()
    print("✓ Existing data cleared")

def create_meters(db: Session):
    """Create demo meters"""
    print("\n📊 Creating meters...")
    
    meters = [
        {
            "meter_id": "METER001",
            "name": "Main Building Meter",
            "location": "Building A - Floor 1",
            "modbus_config": {
                "type": "RTU",
                "baudrate": 9600,
                "slave_id": 1,
                "registers": {"voltage": 0, "current": 6, "power": 12}
            }
        },
        {
            "meter_id": "METER002",
            "name": "Production Line 1",
            "location": "Factory - Section A",
            "modbus_config": {
                "type": "RTU",
                "baudrate": 9600,
                "slave_id": 2,
                "registers": {"voltage": 0, "current": 6, "power": 12}
            }
        },
        {
            "meter_id": "METER003",
            "name": "HVAC System Meter",
            "location": "Building B - Rooftop",
            "modbus_config": {
                "type": "RTU",
                "baudrate": 9600,
                "slave_id": 3,
                "registers": {"voltage": 0, "current": 6, "power": 12}
            }
        },
        {
            "meter_id": "METER004",
            "name": "Assembly Line 2",
            "location": "Factory - Section B",
            "modbus_config": {
                "type": "RTU",
                "baudrate": 9600,
                "slave_id": 4,
                "registers": {"voltage": 0, "current": 6, "power": 12}
            }
        },
        {
            "meter_id": "METER005",
            "name": "Warehouse Lighting",
            "location": "Warehouse - Main Hall",
            "modbus_config": {
                "type": "RTU",
                "baudrate": 9600,
                "slave_id": 5,
                "registers": {"voltage": 0, "current": 6, "power": 12}
            }
        }
    ]
    
    for meter_data in meters:
        meter = Meter(**meter_data)
        db.add(meter)
        print(f"  ✓ {meter_data['meter_id']}: {meter_data['name']}")
    
    db.commit()
    print(f"✓ Created {len(meters)} meters")
    return [m["meter_id"] for m in meters]

def create_thresholds(db: Session, meter_ids: list):
    """Create alert thresholds for meters"""
    print("\n⚠️  Creating alert thresholds...")
    
    thresholds = [
        {"meter_id": "METER001", "high_power_threshold": 5000.0, "low_power_factor_threshold": 0.85},
        {"meter_id": "METER002", "high_power_threshold": 8000.0, "low_power_factor_threshold": 0.80},
        {"meter_id": "METER003", "high_power_threshold": 3000.0, "low_power_factor_threshold": 0.85},
        {"meter_id": "METER004", "high_power_threshold": 7000.0, "low_power_factor_threshold": 0.80},
        {"meter_id": "METER005", "high_power_threshold": 2000.0, "low_power_factor_threshold": 0.90},
    ]
    
    for threshold_data in thresholds:
        threshold = Threshold(**threshold_data)
        db.add(threshold)
        print(f"  ✓ {threshold_data['meter_id']}: {threshold_data['high_power_threshold']}W, PF>{threshold_data['low_power_factor_threshold']}")
    
    db.commit()
    print(f"✓ Created {len(thresholds)} thresholds")

def generate_realistic_reading(meter_id: str, timestamp: datetime, base_power: float):
    """Generate a realistic meter reading"""
    # Add some variation
    voltage = random.uniform(225.0, 235.0)
    power_variation = random.uniform(0.9, 1.1)
    active_power = base_power * power_variation
    
    # Calculate other parameters
    power_factor = random.uniform(0.92, 0.99)
    current = active_power / (voltage * power_factor) if power_factor > 0 else 0
    apparent_power = active_power / power_factor if power_factor > 0 else active_power
    reactive_power = (apparent_power ** 2 - active_power ** 2) ** 0.5
    frequency = random.uniform(49.8, 50.2)
    
    # Cumulative energy increases over time
    hours_since_epoch = (timestamp - datetime(2024, 1, 1)).total_seconds() / 3600
    cumulative_energy = base_power * hours_since_epoch / 1000  # kWh
    
    return {
        "meter_id": meter_id,
        "timestamp": timestamp,
        "voltage": round(voltage, 2),
        "current": round(current, 2),
        "active_power": round(active_power, 2),
        "reactive_power": round(reactive_power, 2),
        "apparent_power": round(apparent_power, 2),
        "power_factor": round(power_factor, 3),
        "frequency": round(frequency, 2),
        "cumulative_energy": round(cumulative_energy, 2),
        "firmware_version": f"v1.{random.randint(1,3)}.{random.randint(0,5)}",
        "uptime_seconds": random.randint(3600, 2592000),  # 1 hour to 30 days
        "wifi_rssi": random.randint(-80, -40)
    }

def create_historical_readings(db: Session):
    """Create historical readings for the past 7 days"""
    print("\n📈 Creating historical readings...")
    
    # Meter base power levels (watts)
    meter_power = {
        "METER001": 3500,  # Main Building - moderate
        "METER002": 6000,  # Production - high
        "METER003": 2000,  # HVAC - low
        "METER004": 5500,  # Assembly - high
        "METER005": 1200,  # Lighting - low
    }
    
    # Generate readings for past 7 days, every hour
    now = datetime.utcnow()
    start_time = now - timedelta(days=7)
    
    readings_count = 0
    for meter_id, base_power in meter_power.items():
        current_time = start_time
        while current_time <= now:
            # Skip night hours for some meters (simulating shutdown)
            hour = current_time.hour
            if meter_id in ["METER002", "METER004"] and (hour < 6 or hour > 22):
                # Production lines shut down at night
                current_time += timedelta(hours=1)
                continue
            
            reading_data = generate_realistic_reading(meter_id, current_time, base_power)
            reading = MeterReading(**reading_data)
            db.add(reading)
            readings_count += 1
            
            current_time += timedelta(hours=1)
        
        print(f"  ✓ {meter_id}: Generated readings for 7 days")
    
    db.commit()
    print(f"✓ Created {readings_count} historical readings")

def create_recent_readings(db: Session):
    """Create very recent readings (last few minutes)"""
    print("\n🕐 Creating recent readings...")
    
    meter_power = {
        "METER001": 3500,
        "METER002": 6000,
        "METER003": 2000,
        "METER004": 5500,
        "METER005": 1200,
    }
    
    now = datetime.utcnow()
    readings_count = 0
    
    for meter_id, base_power in meter_power.items():
        # Create reading from 30 seconds ago
        timestamp = now - timedelta(seconds=random.randint(15, 45))
        reading_data = generate_realistic_reading(meter_id, timestamp, base_power)
        reading = MeterReading(**reading_data)
        db.add(reading)
        readings_count += 1
        print(f"  ✓ {meter_id}: {reading_data['active_power']}W, PF={reading_data['power_factor']}")
    
    db.commit()
    print(f"✓ Created {readings_count} recent readings")

def create_alerts(db: Session):
    """Create sample alerts"""
    print("\n🚨 Creating sample alerts...")
    
    now = datetime.utcnow()
    
    alerts_data = [
        {
            "meter_id": "METER002",
            "alert_type": "HIGH_POWER",
            "measured_value": 8250.0,
            "threshold_value": 8000.0,
            "timestamp": now - timedelta(minutes=15),
            "acknowledged": False,
            "dismissed": False
        },
        {
            "meter_id": "METER001",
            "alert_type": "LOW_POWER_FACTOR",
            "measured_value": 0.78,
            "threshold_value": 0.85,
            "timestamp": now - timedelta(hours=2),
            "acknowledged": True,
            "acknowledged_at": now - timedelta(hours=1, minutes=30),
            "acknowledged_by": "admin@example.com",
            "dismissed": False
        },
        {
            "meter_id": "METER005",
            "alert_type": "HIGH_POWER",
            "measured_value": 2150.0,
            "threshold_value": 2000.0,
            "timestamp": now - timedelta(hours=6),
            "acknowledged": True,
            "acknowledged_at": now - timedelta(hours=5),
            "acknowledged_by": "operator@example.com",
            "dismissed": True,
            "dismissed_at": now - timedelta(hours=3),
            "dismissed_by": "admin@example.com"
        },
        {
            "meter_id": "METER004",
            "alert_type": "HIGH_POWER",
            "measured_value": 7200.0,
            "threshold_value": 7000.0,
            "timestamp": now - timedelta(days=1),
            "acknowledged": True,
            "acknowledged_at": now - timedelta(days=1),
            "acknowledged_by": "supervisor@example.com",
            "dismissed": True,
            "dismissed_at": now - timedelta(hours=12),
            "dismissed_by": "supervisor@example.com"
        }
    ]
    
    for alert_data in alerts_data:
        alert = Alert(**alert_data)
        db.add(alert)
        status = "ACTIVE" if not alert_data["dismissed"] else "DISMISSED"
        print(f"  ✓ {alert_data['meter_id']}: {alert_data['alert_type']} - {status}")
    
    db.commit()
    print(f"✓ Created {len(alerts_data)} alerts")

def main():
    """Main function"""
    print("=" * 70)
    print("IEMAS Database Population Script")
    print("=" * 70)
    print("\nThis will populate the database with realistic demo data:")
    print("  - 5 meters with different profiles")
    print("  - 7 days of historical readings (hourly)")
    print("  - Recent readings (last minute)")
    print("  - Sample alerts")
    print("")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Clear existing data
        clear_existing_data(db)
        
        # Create meters
        meter_ids = create_meters(db)
        
        # Create thresholds
        create_thresholds(db, meter_ids)
        
        # Create historical readings
        create_historical_readings(db)
        
        # Create very recent readings
        create_recent_readings(db)
        
        # Create alerts
        create_alerts(db)
        
        print("\n" + "=" * 70)
        print("✅ DATABASE POPULATED SUCCESSFULLY!")
        print("=" * 70)
        print("\nYou can now:")
        print("  1. Access the dashboard at http://localhost:3000")
        print("  2. View all meters and their current readings")
        print("  3. Check alert history and status")
        print("  4. Analyze 7 days of historical data")
        print("")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
