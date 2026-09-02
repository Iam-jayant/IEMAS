import sys
import os

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from app.database import Base, engine
from app.models.database import Meter, MeterReading, Threshold, Alert

print("WARNING: This will drop ALL tables and all data in the database.")
print("Dropping tables...")
Base.metadata.drop_all(bind=engine)
print("Creating tables with new schema...")
Base.metadata.create_all(bind=engine)
print("Done! Database has been reset.")
