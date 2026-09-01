"""
Database Cleanup Script for IEMAS
Purges all test, mock, and simulator data from the Supabase PostgreSQL database
to prepare for real physical Schneider Electric meter deployment.
"""
import os
import sys
from pathlib import Path

# Add backend root to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env", override=True)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def clean_database():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERROR] DATABASE_URL not found in .env")
        sys.exit(1)

    print("[INFO] Connecting to Supabase PostgreSQL database...")
    engine = create_engine(db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    session = Session()

    tables = ["alerts", "meter_readings", "thresholds", "meters"]

    try:
        print("\n[INFO] Current Database Record Counts:")
        for table in tables:
            count = session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"  - {table}: {count} records")

        print("\n[INFO] Purging all records from database...")
        # Delete child records first, then parent records
        for table in tables:
            deleted = session.execute(text(f"DELETE FROM {table}")).rowcount
            print(f"  [OK] Deleted {deleted} records from {table}")

        session.commit()
        print("[OK] Commit successful.")

        print("\n[INFO] Verifying clean database state:")
        all_clean = True
        for table in tables:
            count = session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"  - {table}: {count} records")
            if count != 0:
                all_clean = False

        if all_clean:
            print("\n[SUCCESS] Database is completely clean and ready for physical meter data!")
        else:
            print("\n[WARNING] Some tables still contain records.")

    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] Error during database cleanup: {e}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    clean_database()
