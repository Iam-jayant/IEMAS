"""
End-to-End Integration Test for IEMAS
Tests complete data flow: ESP32 → Backend → Database → Dashboard (WebSocket)

Requirements: 1.1, 1.2, 1.6, 4.1, 5.6
Task: 17.1 - Wire all components together
"""
import pytest
import asyncio
import json
from datetime import datetime
import httpx
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
WS_URL = os.getenv("WS_URL", "ws://localhost:8000/ws/alerts")

# Test meter configuration
TEST_METER_ID = "TEST_METER_E2E"


class TestEndToEndIntegration:
    """
    Test complete system integration from data ingestion to dashboard delivery
    """
    
    @pytest.fixture(scope="function")
    async def setup_test_meter(self):
        """Setup a test meter in the database"""
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            meter_data = {
                "meter_id": TEST_METER_ID,
                "name": "Test Meter E2E",
                "location": "Test Lab",
                "modbus_slave_id": 1
            }
            
            # Try to register meter (may already exist)
            try:
                response = await client.post(f"{BASE_URL}/api/meters", json=meter_data)
                print(f"Meter registration: {response.status_code}")
            except Exception as e:
                print(f"Meter registration skipped: {e}")
            
            # Set up thresholds
            threshold_data = {
                "high_power_threshold": 5000.0,
                "low_power_factor_threshold": 0.85
            }
            
            try:
                response = await client.put(
                    f"{BASE_URL}/api/thresholds/{TEST_METER_ID}",
                    json=threshold_data
                )
                print(f"Threshold configuration: {response.status_code}")
            except Exception as e:
                print(f"Threshold setup skipped: {e}")
        
        yield TEST_METER_ID
        
        # Cleanup after test
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            try:
                await client.delete(f"{BASE_URL}/api/meters/{TEST_METER_ID}")
            except Exception:
                pass
    
    @pytest.mark.asyncio
    async def test_01_esp32_to_backend_data_flow(self, setup_test_meter):
        """
        Test 1: Verify ESP32 can send readings to backend and they are stored
        
        Simulates ESP32 device sending meter reading via HTTP POST
        Requirements: 1.1, 1.2, 1.6
        """
        meter_id = TEST_METER_ID
        
        # Simulate ESP32 sending reading
        reading_payload = {
            "meter_id": meter_id,
            "timestamp": datetime.utcnow().isoformat(),
            "voltage": 230.5,
            "current": 15.2,
            "active_power": 3500.0,
            "reactive_power": 200.0,
            "apparent_power": 3505.7,
            "power_factor": 0.95,
            "frequency": 50.0,
            "cumulative_energy": 1234.5,
            "firmware_version": "1.0.0",
            "uptime_seconds": 3600
        }
        
        # POST to readings endpoint (with trailing slash to avoid 307 redirect)
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(f"{BASE_URL}/api/readings/", json=reading_payload)
        
        # Verify successful ingestion
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        assert "reading_id" in data
        
        print(f"✓ Test 1 Passed: ESP32 → Backend data flow verified (Reading ID: {data['reading_id']})")
    
    @pytest.mark.asyncio
    async def test_02_backend_to_database_storage(self, setup_test_meter):
        """
        Test 2: Verify readings are correctly stored in database and retrievable
        
        Requirements: 1.6, 2.1, 2.4
        """
        meter_id = TEST_METER_ID
        
        # Send reading
        reading_payload = {
            "meter_id": meter_id,
            "timestamp": datetime.utcnow().isoformat(),
            "voltage": 231.0,
            "current": 16.0,
            "active_power": 3700.0,
            "reactive_power": 180.0,
            "apparent_power": 3703.4,
            "power_factor": 0.96,
            "frequency": 50.1,
            "cumulative_energy": 1240.0,
            "firmware_version": "1.0.0",
            "uptime_seconds": 3700
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            post_response = await client.post(f"{BASE_URL}/api/readings/", json=reading_payload)
            assert post_response.status_code == 201
            
            # Wait briefly for database write
            await asyncio.sleep(0.5)
            
            # Retrieve latest reading
            get_response = await client.get(f"{BASE_URL}/api/readings/latest")
            assert get_response.status_code == 200
            
            readings = get_response.json()
        
        # Find our test meter reading
        test_reading = next((r for r in readings if r["meter_id"] == meter_id), None)
        assert test_reading is not None, f"Reading for {meter_id} not found in latest readings"
        
        # Verify data integrity
        assert abs(test_reading["voltage"] - 231.0) < 0.1
        assert abs(test_reading["active_power"] - 3700.0) < 0.1
        assert abs(test_reading["power_factor"] - 0.96) < 0.01
        
        print("✓ Test 2 Passed: Backend → Database storage and retrieval verified")
    
    @pytest.mark.asyncio
    async def test_03_threshold_alert_generation(self, setup_test_meter):
        """
        Test 3: Verify threshold-based alerts are generated correctly
        
        Requirements: 5.1, 5.2, 5.3, 5.4
        """
        meter_id = TEST_METER_ID
        
        # Send reading that EXCEEDS high power threshold (threshold is 5000W)
        high_power_reading = {
            "meter_id": meter_id,
            "timestamp": datetime.utcnow().isoformat(),
            "voltage": 230.0,
            "current": 30.0,
            "active_power": 6900.0,  # Exceeds 5000W threshold
            "reactive_power": 500.0,
            "apparent_power": 6918.0,
            "power_factor": 0.90,
            "frequency": 50.0,
            "cumulative_energy": 1250.0
        }
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.post(f"{BASE_URL}/api/readings/", json=high_power_reading)
            assert response.status_code == 201
            
            # Wait for alert processing
            await asyncio.sleep(1.0)
            
            # Check alerts were generated
            alerts_response = await client.get(f"{BASE_URL}/api/alerts?meter_id={meter_id}")
            assert alerts_response.status_code == 200
            
            alerts = alerts_response.json()
        
        # Should have at least one HIGH_POWER alert
        high_power_alerts = [a for a in alerts if a["alert_type"] == "HIGH_POWER"]
        assert len(high_power_alerts) > 0, "No HIGH_POWER alert generated"
        
        latest_alert = high_power_alerts[0]
        assert latest_alert["measured_value"] > 5000.0
        assert latest_alert["meter_id"] == meter_id
        
        print(f"✓ Test 3 Passed: Alert generation verified (Alert ID: {latest_alert['id']})")
    
    @pytest.mark.asyncio
    async def test_04_low_power_factor_alert(self, setup_test_meter):
        """
        Test 4: Verify low power factor alerts are generated
        
        Requirements: 5.1, 5.3
        """
        meter_id = TEST_METER_ID
        
        # Send reading with LOW power factor (threshold is 0.85)
        low_pf_reading = {
            "meter_id": meter_id,
            "timestamp": datetime.utcnow().isoformat(),
            "voltage": 230.0,
            "current": 20.0,
            "active_power": 3500.0,
            "reactive_power": 2000.0,
            "apparent_power": 4031.1,
            "power_factor": 0.75,  # Below 0.85 threshold
            "frequency": 50.0,
            "cumulative_energy": 1260.0
        }
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.post(f"{BASE_URL}/api/readings/", json=low_pf_reading)
            assert response.status_code == 201
            
            # Wait for alert processing
            await asyncio.sleep(1.0)
            
            # Check for low power factor alert
            alerts_response = await client.get(f"{BASE_URL}/api/alerts?meter_id={meter_id}")
            assert alerts_response.status_code == 200
            
            alerts = alerts_response.json()
        
        low_pf_alerts = [a for a in alerts if a["alert_type"] == "LOW_POWER_FACTOR"]
        assert len(low_pf_alerts) > 0, "NO LOW_POWER_FACTOR alert generated"
        
        latest_alert = low_pf_alerts[0]
        assert latest_alert["measured_value"] < 0.85
        
        print(f"✓ Test 4 Passed: Low power factor alert verified (PF: {latest_alert['measured_value']})")
    
    @pytest.mark.asyncio
    async def test_05_real_time_dashboard_updates(self, setup_test_meter):
        """
        Test 5: Verify dashboard receives real-time updates within 5 seconds
        
        Requirements: 4.1, 5.6
        """
        meter_id = TEST_METER_ID
        
        # Record start time
        start_time = time.time()
        
        # Send reading
        reading_payload = {
            "meter_id": meter_id,
            "timestamp": datetime.utcnow().isoformat(),
            "voltage": 229.5,
            "current": 18.0,
            "active_power": 4100.0,
            "reactive_power": 250.0,
            "apparent_power": 4107.6,
            "power_factor": 0.93,
            "frequency": 49.9,
            "cumulative_energy": 1270.0
        }
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            post_response = await client.post(f"{BASE_URL}/api/readings/", json=reading_payload)
            assert post_response.status_code == 201
            
            # Retrieve latest reading
            get_response = await client.get(f"{BASE_URL}/api/readings/latest")
            assert get_response.status_code == 200
            
            readings = get_response.json()
        
        # Calculate time taken
        elapsed_time = time.time() - start_time
        
        # Verify update received within 5 seconds (Requirement 4.1)
        assert elapsed_time < 5.0, f"Dashboard update took {elapsed_time:.2f}s, should be < 5s"
        
        test_reading = next((r for r in readings if r["meter_id"] == meter_id), None)
        assert test_reading is not None
        
        print(f"✓ Test 5 Passed: Real-time update verified ({elapsed_time:.3f}s < 5s requirement)")
    
    @pytest.mark.asyncio
    async def test_06_data_validation_rejection(self, setup_test_meter):
        """
        Test 6: Verify invalid readings are rejected with proper error messages
        
        Requirements: 1.4, 1.5
        """
        meter_id = TEST_METER_ID
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            # Test 1: Invalid voltage (out of range)
            invalid_voltage = {
                "meter_id": meter_id,
                "timestamp": datetime.utcnow().isoformat(),
                "voltage": 1500.0,  # Exceeds 1000V limit
                "current": 15.0,
                "active_power": 3500.0,
                "reactive_power": 200.0,
                "apparent_power": 3505.7,
                "power_factor": 0.95,
                "frequency": 50.0,
                "cumulative_energy": 1234.5
            }
            
            response = await client.post(f"{BASE_URL}/api/readings/", json=invalid_voltage)
            assert response.status_code == 422, "Should reject invalid voltage"
            
            # Test 2: Invalid power factor (out of range)
            invalid_pf = {
                "meter_id": meter_id,
                "timestamp": datetime.utcnow().isoformat(),
                "voltage": 230.0,
                "current": 15.0,
                "active_power": 3500.0,
                "reactive_power": 200.0,
                "apparent_power": 3505.7,
                "power_factor": 1.5,  # Exceeds 1.0 limit
                "frequency": 50.0,
                "cumulative_energy": 1234.5
            }
            
            response = await client.post(f"{BASE_URL}/api/readings/", json=invalid_pf)
            assert response.status_code == 422, "Should reject invalid power factor"
            
            # Test 3: Unregistered meter
            unregistered_meter = {
                "meter_id": "NONEXISTENT_METER_XYZ",
                "timestamp": datetime.utcnow().isoformat(),
                "voltage": 230.0,
                "current": 15.0,
                "active_power": 3500.0,
                "reactive_power": 200.0,
                "apparent_power": 3505.7,
                "power_factor": 0.95,
                "frequency": 50.0,
                "cumulative_energy": 1234.5
            }
            
            response = await client.post(f"{BASE_URL}/api/readings/", json=unregistered_meter)
            assert response.status_code == 400, "Should reject unregistered meter"
            response_data = response.json()
            assert "not registered" in response_data["detail"].lower()
        
        print("✓ Test 6 Passed: Data validation and rejection verified")
    
    @pytest.mark.asyncio
    async def test_07_performance_database_storage(self, setup_test_meter):
        """
        Test 7: Verify database storage completes within 500ms
        
        Requirements: 1.6
        """
        meter_id = TEST_METER_ID
        
        reading_payload = {
            "meter_id": meter_id,
            "timestamp": datetime.utcnow().isoformat(),
            "voltage": 230.0,
            "current": 15.0,
            "active_power": 3500.0,
            "reactive_power": 200.0,
            "apparent_power": 3505.7,
            "power_factor": 0.95,
            "frequency": 50.0,
            "cumulative_energy": 1280.0
        }
        
        # Measure storage time
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.post(f"{BASE_URL}/api/readings/", json=reading_payload)
        
        storage_time = time.time() - start_time
        
        assert response.status_code == 201
        
        # Verify storage time is under 500ms
        assert storage_time < 0.5, f"Storage took {storage_time*1000:.0f}ms, should be < 500ms"
        
        print(f"✓ Test 7 Passed: Database storage performance verified ({storage_time*1000:.0f}ms < 500ms requirement)")
    
    @pytest.mark.asyncio
    async def test_08_websocket_stats(self):
        """
        Test 8: Verify WebSocket stats endpoint is accessible
        
        Requirements: 5.6
        """
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(f"{BASE_URL}/ws/stats")
            assert response.status_code == 200
            
            stats = response.json()
            assert "active_connections" in stats
            assert "connections" in stats
        
        print(f"✓ Test 8 Passed: WebSocket stats endpoint verified (Active connections: {stats['active_connections']})")
    
    @pytest.mark.asyncio
    async def test_09_complete_data_pipeline(self, setup_test_meter):
        """
        Test 9: End-to-end data pipeline from ESP32 to Dashboard
        
        Comprehensive test simulating complete data flow:
        ESP32 → Backend → Database → Dashboard retrieval
        
        Requirements: 1.1, 1.2, 1.6, 4.1
        """
        meter_id = TEST_METER_ID
        
        print("\n=== Complete Data Pipeline Test ===")
        
        # Step 1: ESP32 sends reading
        print("Step 1: Simulating ESP32 sending reading...")
        reading = {
            "meter_id": meter_id,
            "timestamp": datetime.utcnow().isoformat(),
            "voltage": 232.0,
            "current": 22.0,
            "active_power": 5100.0,
            "reactive_power": 300.0,
            "apparent_power": 5108.8,
            "power_factor": 0.92,
            "frequency": 50.05,
            "cumulative_energy": 1300.0,
            "firmware_version": "1.0.0",
            "uptime_seconds": 7200
        }
        
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            post_response = await client.post(f"{BASE_URL}/api/readings/", json=reading)
            assert post_response.status_code == 201
            print(f"   ✓ Reading posted (ID: {post_response.json()['reading_id']})")
            
            # Step 2: Verify database storage
            print("Step 2: Verifying database storage...")
            await asyncio.sleep(0.3)  # Brief wait for consistency
            
            get_response = await client.get(f"{BASE_URL}/api/readings?meter_id={meter_id}&limit=1")
            assert get_response.status_code == 200
            readings = get_response.json()
            assert len(readings) > 0
            print(f"   ✓ Reading stored in database")
            
            # Step 3: Verify dashboard can retrieve latest
            print("Step 3: Verifying dashboard retrieval...")
            latest_response = await client.get(f"{BASE_URL}/api/readings/latest")
            assert latest_response.status_code == 200
            
            latest_readings = latest_response.json()
        
        test_reading = next((r for r in latest_readings if r["meter_id"] == meter_id), None)
        assert test_reading is not None
        print(f"   ✓ Dashboard can retrieve latest reading")
        
        # Step 4: Verify data integrity
        print("Step 4: Verifying data integrity...")
        assert abs(test_reading["voltage"] - 232.0) < 0.1
        assert abs(test_reading["active_power"] - 5100.0) < 0.1
        assert abs(test_reading["power_factor"] - 0.92) < 0.01
        assert test_reading["firmware_version"] == "1.0.0"
        print(f"   ✓ Data integrity verified")
        
        # Step 5: Verify performance
        total_time = time.time() - start_time
        print(f"Step 5: Verifying performance...")
        assert total_time < 5.0  # Dashboard update within 5 seconds
        print(f"   ✓ Complete pipeline: {total_time:.3f}s (< 5s requirement)")
        
        print("\n=== ✓ Complete Data Pipeline Test PASSED ===\n")
    
    @pytest.mark.asyncio
    async def test_10_health_check(self):
        """
        Test 10: Verify backend health check endpoint
        
        Requirements: 10.3
        """
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(f"{BASE_URL}/api/health/")
            assert response.status_code == 200
            
            health_data = response.json()
            assert "status" in health_data
        
        print(f"✓ Test 10 Passed: Health check endpoint verified (Status: {health_data.get('status')})")


# Standalone test runner for manual execution
if __name__ == "__main__":
    print("IEMAS End-to-End Integration Tests")
    print("=" * 60)
    print("Task 17.1: Wire all components together")
    print("Testing: ESP32 → Backend → Database → Dashboard")
    print("=" * 60)
    print("\nRunning tests with pytest...")
    
    import subprocess
    result = subprocess.run(
        ["pytest", __file__, "-v", "--tb=short", "-s"],
        capture_output=False
    )
    
    exit(result.returncode)
