"""
Performance Validation Tests for IEMAS

Tests performance requirements:
- Database storage within 500ms for meter readings (Requirement 1.6)
- Threshold evaluation within 200ms (Requirement 5.1)
- Dashboard updates within 5 seconds of data storage (Requirement 4.1)
- System performance with 20 concurrent meters (Requirement 7.4)

Task: 17.3 Performance validation
"""
import pytest
import asyncio
import time
from datetime import datetime
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


async def setup_meter(meter_id, modbus_slave_id=99):
    """Helper to setup a test meter"""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        meter_data = {
            "meter_id": meter_id,
            "name": f"Performance Test {meter_id}",
            "location": "Test Lab - Performance",
            "modbus_slave_id": modbus_slave_id
        }
        
        await client.post(f"{BASE_URL}/api/meters", json=meter_data)
        
        threshold_data = {
            "high_power_threshold": 8000.0,
            "low_power_factor_threshold": 0.80
        }
        
        await client.put(
            f"{BASE_URL}/api/thresholds/{meter_id}",
            json=threshold_data
        )


async def cleanup_meter(meter_id):
    """Helper to cleanup a test meter"""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            await client.delete(f"{BASE_URL}/api/meters/{meter_id}")
        except Exception:
            pass


class TestPerformanceValidation:
    """Performance validation tests for IEMAS system"""

    @pytest.mark.asyncio
    async def test_01_database_storage_500ms(self):
        """
        Sub-task 1: Verify database storage within 500ms for meter readings
        
        Requirements: 1.6
        Acceptance Criteria: Database SHALL store reading within 500 milliseconds
        """
        meter_id = f"PERF_TEST_01_{int(time.time())}"
        
        await setup_meter(meter_id)
        
        try:
            reading_payload = {
                "meter_id": meter_id,
                "timestamp": datetime.utcnow().isoformat(),
                "voltage": 230.0,
                "current": 15.0,
                "active_power": 3450.0,
                "reactive_power": 200.0,
                "apparent_power": 3455.8,
                "power_factor": 0.95,
                "frequency": 50.0,
                "cumulative_energy": 1234.5
            }
            
            start_time = time.time()
            
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.post(f"{BASE_URL}/api/readings/", json=reading_payload)
            
            storage_time = time.time() - start_time
            
            assert response.status_code == 201, f"Failed to store reading: {response.text}"
            assert storage_time < 0.5, f"Storage took {storage_time*1000:.0f}ms, requirement is < 500ms"
            
            print(f"✓ Test 1 PASSED: Database storage = {storage_time*1000:.0f}ms (< 500ms requirement)")
            print(f"  Margin: {(0.5 - storage_time)*1000:.0f}ms under threshold")
        finally:
            await cleanup_meter(meter_id)


    @pytest.mark.asyncio
    async def test_02_threshold_evaluation_200ms(self):
        """
        Sub-task 2: Verify threshold evaluation within 200ms
        
        Requirements: 5.1
        Acceptance Criteria: Alert system SHALL evaluate readings against thresholds within 200ms
        """
        meter_id = f"PERF_TEST_02_{int(time.time())}"
        
        await setup_meter(meter_id)
        
        try:
            reading_payload = {
                "meter_id": meter_id,
                "timestamp": datetime.utcnow().isoformat(),
                "voltage": 230.0,
                "current": 40.0,
                "active_power": 9200.0,  # Exceeds 8000W threshold
                "reactive_power": 500.0,
                "apparent_power": 9213.6,
                "power_factor": 0.90,
                "frequency": 50.0,
                "cumulative_energy": 2000.0
            }
            
            start_time = time.time()
            
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.post(f"{BASE_URL}/api/readings/", json=reading_payload)
            
            evaluation_time = time.time() - start_time
            
            assert response.status_code == 201, f"Failed to process reading: {response.text}"
            assert evaluation_time < 0.2, f"Threshold evaluation took {evaluation_time*1000:.0f}ms, requirement is < 200ms"
            
            # Verify alert was created
            await asyncio.sleep(0.5)
            
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                alerts_response = await client.get(f"{BASE_URL}/api/alerts?meter_id={meter_id}")
                assert alerts_response.status_code == 200
                
                alerts = alerts_response.json()
                high_power_alerts = [a for a in alerts if a["alert_type"] == "HIGH_POWER"]
                assert len(high_power_alerts) > 0, "Alert was not generated"
            
            print(f"✓ Test 2 PASSED: Threshold evaluation = {evaluation_time*1000:.0f}ms (< 200ms requirement)")
            print(f"  Margin: {(0.2 - evaluation_time)*1000:.0f}ms under threshold")
            print(f"  Alert generated successfully")
        finally:
            await cleanup_meter(meter_id)


    @pytest.mark.asyncio
    async def test_03_dashboard_update_5_seconds(self):
        """
        Sub-task 3: Verify dashboard updates within 5 seconds of data storage
        
        Requirements: 4.1
        Acceptance Criteria: Dashboard SHALL display current readings within 5 seconds of database storage
        """
        meter_id = f"PERF_TEST_03_{int(time.time())}"
        
        await setup_meter(meter_id)
        
        try:
            reading_payload = {
                "meter_id": meter_id,
                "timestamp": datetime.utcnow().isoformat(),
                "voltage": 231.5,
                "current": 18.0,
                "active_power": 4167.0,
                "reactive_power": 250.0,
                "apparent_power": 4174.5,
                "power_factor": 0.94,
                "frequency": 49.95,
                "cumulative_energy": 2100.0
            }
            
            start_time = time.time()
            
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                post_response = await client.post(f"{BASE_URL}/api/readings/", json=reading_payload)
                assert post_response.status_code == 201
                
                get_response = await client.get(f"{BASE_URL}/api/readings/latest")
                assert get_response.status_code == 200
                
                readings = get_response.json()
            
            update_time = time.time() - start_time
            
            test_reading = next((r for r in readings if r["meter_id"] == meter_id), None)
            assert test_reading is not None, f"Reading for {meter_id} not found"
            assert update_time < 5.0, f"Dashboard update took {update_time:.2f}s, requirement is < 5s"
            
            assert abs(test_reading["voltage"] - 231.5) < 0.1
            assert abs(test_reading["active_power"] - 4167.0) < 0.1
            
            print(f"✓ Test 3 PASSED: Dashboard update time = {update_time:.3f}s (< 5s requirement)")
            print(f"  Margin: {5.0 - update_time:.3f}s under threshold")
            print(f"  Data integrity verified")
        finally:
            await cleanup_meter(meter_id)


    @pytest.mark.asyncio
    async def test_04_concurrent_20_meters_performance(self):
        """
        Sub-task 4: Test system performance with 20 concurrent meters
        
        Requirements: 2.3, 7.4
        Acceptance Criteria: System SHALL maintain performance requirements with 20 connected meters
        """
        meter_ids = [f"STRESS_METER_{i:02d}_{int(time.time())}" for i in range(1, 21)]
        
        # Setup all 20 meters
        for i, meter_id in enumerate(meter_ids):
            await setup_meter(meter_id, modbus_slave_id=i+1)
        
        print(f"✓ Registered {len(meter_ids)} meters for stress testing")
        
        try:
            print(f"\n=== Stress Testing with {len(meter_ids)} Concurrent Meters ===")
            
            async def send_reading(client, meter_id, index):
                reading = {
                    "meter_id": meter_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "voltage": 230.0 + (index % 10),
                    "current": 15.0 + (index % 20),
                    "active_power": 3000.0 + (index * 100),
                    "reactive_power": 200.0 + (index * 10),
                    "apparent_power": 3010.0 + (index * 100),
                    "power_factor": 0.85 + (index % 15) * 0.01,
                    "frequency": 50.0,
                    "cumulative_energy": 1000.0 + (index * 100)
                }
                
                start = time.time()
                try:
                    response = await client.post(f"{BASE_URL}/api/readings/", json=reading)
                    return {
                        "meter_id": meter_id,
                        "status": response.status_code,
                        "time": time.time() - start,
                        "success": response.status_code == 201
                    }
                except Exception as e:
                    return {
                        "meter_id": meter_id,
                        "status": 0,
                        "time": time.time() - start,
                        "success": False,
                        "error": str(e)
                    }

            
            # Test 1: Concurrent submission
            print("\n1. Testing concurrent submission of 20 readings...")
            start_time = time.time()
            
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                tasks = [send_reading(client, meter_id, idx) for idx, meter_id in enumerate(meter_ids)]
                results = await asyncio.gather(*tasks)
            
            total_time = time.time() - start_time
            successful = [r for r in results if r["success"]]
            avg_time = sum(r["time"] for r in successful) / len(successful) if successful else 0
            
            print(f"   Total time: {total_time:.3f}s")
            print(f"   Successful: {len(successful)}/{len(meter_ids)}")
            print(f"   Avg storage time: {avg_time*1000:.0f}ms")
            
            assert len(successful) == 20, f"Only {len(successful)}/20 readings succeeded"
            assert avg_time < 0.5, f"Average storage time {avg_time*1000:.0f}ms exceeds 500ms requirement"
            
            # Test 2: Retrieval performance
            print("\n2. Testing retrieval performance with 20 meters...")
            retrieval_start = time.time()
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(f"{BASE_URL}/api/readings/latest")
                assert response.status_code == 200
                latest_readings = response.json()
            
            retrieval_time = time.time() - retrieval_start
            print(f"   Retrieval time: {retrieval_time:.3f}s")
            
            assert retrieval_time < 5.0, f"Retrieval took {retrieval_time:.3f}s, should be < 5s"
            
            print(f"\n✓ Test 4 PASSED: System performance validated with 20 concurrent meters")
            print(f"  ✓ Concurrent submission: {total_time:.3f}s for 20 meters")
            print(f"  ✓ Average storage time: {avg_time*1000:.0f}ms (< 500ms requirement)")
            print(f"  ✓ Retrieval time: {retrieval_time:.3f}s (< 5s requirement)")
        finally:
            for meter_id in meter_ids:
                await cleanup_meter(meter_id)



# Standalone test runner
if __name__ == "__main__":
    print("IEMAS Performance Validation Tests")
    print("=" * 70)
    print("Task 17.3: Performance validation")
    print("Requirements: 1.6, 2.3, 4.1, 5.1, 7.4")
    print("=" * 70)
    print("\nRunning performance tests with pytest...")
    
    import subprocess
    result = subprocess.run(
        ["pytest", __file__, "-v", "--tb=short", "-s"],
        capture_output=False
    )
    
    exit(result.returncode)
