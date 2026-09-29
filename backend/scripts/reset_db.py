import sys
import os
import time
from sqlalchemy import text

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from app.database import Base, engine
from app.models.database import Meter, MeterReading, Threshold, Alert

print("WARNING: This will drop ALL tables and all data in the database.")
print("Dropping tables using raw SQL CASCADE to avoid pooler locks...")

with engine.connect() as conn:
    try:
        # Commit any open transactions first
        conn.execute(text("COMMIT"))
        
        print("- Dropping meter_readings...")
        conn.execute(text("DROP TABLE IF EXISTS meter_readings CASCADE"))
        
        print("- Dropping alerts...")
        conn.execute(text("DROP TABLE IF EXISTS alerts CASCADE"))
        
        print("- Dropping thresholds...")
        conn.execute(text("DROP TABLE IF EXISTS thresholds CASCADE"))
        
        print("- Dropping meters...")
        conn.execute(text("DROP TABLE IF EXISTS meters CASCADE"))
        
        # We must commit these changes
        conn.execute(text("COMMIT"))
    except Exception as e:
        print(f"Error dropping tables: {e}")
        # Try to rollback if failed
        conn.execute(text("ROLLBACK"))

print("Wait 2 seconds for pooler...")
time.sleep(2)

print("Creating tables with new schema...")
Base.metadata.create_all(bind=engine)
print("Done! Database has been reset.")
