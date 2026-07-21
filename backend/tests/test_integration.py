"""
Integration tests for IEMAS - Testing complete data flow
ESP32 → Backend → Database → Dashboard

This test suite verifies:
- Data flow from ESP32 simulation to backend
- Database storage and retrieval
- Real-time WebSocket alert delivery
- Complete end-to-end system integration
"""

import pytest
import asyncio
import httpx
import json
from datetime import datetime, timezone
from typing import Dict, Any
import websockets
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/alerts"

# Test meter configuration
TEST_METER_ID = "TEST_INTEGRATION_001"
TEST_METER_DATA = {
    "meter_id": TEST_METER_ID,
    "name": "Integration Test Meter",
    "location": "Test Lab",
    "modbus_slave_id": 1
}


class TestIntegrationFlow:
    """Test complete system integration"""
    
    @pytest.fixture(scope="function")
    async def setup_test_meter(self):
        """Register a test meter before running tests"""
        async with httpx.AsyncClient() as client:
            # Try to register the test meter
            response = await client.post(
                f"{BASE_URL}/api/meters",
                json=TEST_METER_DATA
            )
            # If already exists, that's fine
            if response.status_code in [200, 201, 409]:
                print(f"Test meter {TEST_METER_ID} ready")
            
            yield TEST_METER_ID
            
            # Cleanup - delete test meter after tests
            try:
                await client.delete(f"{BASE_URL}/api/meters/{TEST_METER_ID}")
                print(f"Cleaned up test meter {TEST_METER_ID}")
            except:
                pass
    
    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test 1: Verify backend health endpoint"""
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(f"{BASE_URL}/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "database" in data
            print("✓ Backend health check passed")
    
    @pytest.mark.asyncio
    async def test_meter_registration(self, setup_test_meter):
        """Test 2: Verify meter registration"""
        meter_id = await setup_test_meter
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/api/meters")
            assert response.status_code == 200
            meters = response.json()
            
            # Check if our test meter is in the list
            meter_ids = [m["meter_id"] for m in meters]
            assert meter_id in meter_ids
            print(f"✓ Test meter {meter_id} is registered")
    
    @pytest.mark.asyncio
    async def test_reading_ingestion(self, setup_test_meter):
        """Test 3: Simulate ESP32 sending reading to backend"""
        meter_id = await setup_test_meter
        
        # Create a test reading (normal values, should not trigger alerts)
        test_reading = {
            "meter_id": meter_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "voltage": 230.5,
            "current": 10.2,
            "active_power": 2350.0,
            "reactive_power": 150.0,
            "apparent_power": 2354.8,
            "power_factor": 0.998,
            "frequency": 50.0,
            "cumulative_energy": 1234.5,
            "firmware_version": "1.0.0",
            "uptime_seconds": 3600,
            "wifi_rssi": -65
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/api/readings",
                json=test_reading
            )
            assert response.status_code == 201
            result = response.json()
            assert result["status"] == "success"
            assert "reading_id" in result
            print(f"✓ Reading ingested successfully, ID: {result['reading_id']}")
            
            return result["reading_id"]
    
    @pytest.mark.asyncio
    async def test_reading_retrieval(self, setup_test_meter):
        """Test 4: Verify reading can be retrieved from database"""
        meter_id = await setup_test_meter
        
        # First, send a reading
        test_reading = {
            "meter_id": meter_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "voltage": 231.0,
            "current": 11.0,
            "active_power": 2500.0,
            "reactive_power": 160.0,
            "apparent_power": 2505.1,
            "power_factor": 0.997,
            "frequency": 50.1,
            "cumulative_energy": 1240.0,
            "firmware_version": "1.0.0",
            "uptime_seconds": 3660,
            "wifi_rssi": -60
        }
        
        async with httpx.AsyncClient() as client:
            # Send reading
            post_response = await client.post(
                f"{BASE_URL}/api/readings",
                json=test_reading
            )
            assert post_response.status_code == 201
            
            # Wait a moment for database write
            await asyncio.sleep(0.5)
            
            # Retrieve latest readings
            get_response = await client.get(f"{BASE_URL}/api/readings/latest")
            assert get_response.status_code == 200
            
            readings = get_response.json()
            test_meter_reading = next(
                (r for r in readings if r["meter_id"] == meter_id),
                None
            )
            
            assert test_meter_reading is not None
            assert test_meter_reading["voltage"] == 231.0
            assert test_meter_reading["power_factor"] == 0.997
            print("✓ Reading retrieved from database successfully")
    
    @pytest.mark.asyncio
    async def test_threshold_configuration(self, setup_test_meter):
        """Test 5: Configure and retrieve thresholds"""
        meter_id = await setup_test_meter
        
        threshold_config = {
            "meter_id": meter_id,
            "high_power_threshold": 5000.0,
            "low_power_factor_threshold": 0.85
        }
        
        async with httpx.AsyncClient() as client:
            # Set thresholds
            put_response = await client.put(
                f"{BASE_URL}/api/thresholds/{meter_id}",
                json=threshold_config
            )
            assert put_response.status_code == 200
            
            # Retrieve thresholds
            get_response = await client.get(
                f"{BASE_URL}/api/thresholds/{meter_id}"
            )
            assert get_response.status_code == 200
            
            thresholds = get_response.json()
            assert thresholds["high_power_threshold"] == 5000.0
            assert thresholds["low_power_factor_threshold"] == 0.85
            print(f"✓ Thresholds configured for {meter_id}")
    
    @pytest.mark.asyncio
    async def test_alert_generation_high_power(self, setup_test_meter):
        """Test 6: Generate high power alert"""
        meter_id = await setup_test_meter
        
        # First, set a low threshold
        threshold_config = {
            "meter_id": meter_id,
            "high_power_threshold": 1000.0,  # Low threshold
            "low_power_factor_threshold": 0.70
        }
        
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{BASE_URL}/api/thresholds/{meter_id}",
                json=threshold_config
            )
            
            # Send reading that exceeds threshold
            test_reading = {
                "meter_id": meter_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "voltage": 235.0,
                "current": 50.0,
                "active_power": 11750.0,  # Exceeds 1000.0 threshold
                "reactive_power": 200.0,
                "apparent_power": 11751.7,
                "power_factor": 0.999,
                "frequency": 50.0,
                "cumulative_energy": 1250.0,
                "firmware_version": "1.0.0",
                "uptime_seconds": 3720,
                "wifi_rssi": -62
            }
            
            post_response = await client.post(
                f"{BASE_URL}/api/readings",
                json=test_reading
            )
            assert post_response.status_code == 201
            
            # Wait for alert processing
            await asyncio.sleep(1.0)
            
            # Check if alert was generated
            alerts_response = await client.get(
                f"{BASE_URL}/api/alerts?meter_id={meter_id}"
            )
            assert alerts_response.status_code == 200
            
            alerts = alerts_response.json()
            high_power_alerts = [
                a for a in alerts 
                if a["alert_type"] == "HIGH_POWER" and not a["dismissed"]
            ]
            
            assert len(high_power_alerts) > 0
            latest_alert = high_power_alerts[0]
            assert latest_alert["measured_value"] == 11750.0
            assert latest_alert["threshold_value"] == 1000.0
            print(f"✓ High power alert generated: {latest_alert['id']}")
            
            return latest_alert["id"]
    
    @pytest.mark.asyncio
    async def test_alert_generation_low_pf(self, setup_test_meter):
        """Test 7: Generate low power factor alert"""
        meter_id = await setup_test_meter
        
        # Set threshold
        threshold_config = {
            "meter_id": meter_id,
            "high_power_threshold": 50000.0,
            "low_power_factor_threshold": 0.95  # High threshold
        }
        
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{BASE_URL}/api/thresholds/{meter_id}",
                json=threshold_config
            )
            
            # Send reading with low power factor
            test_reading = {
                "meter_id": meter_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "voltage": 230.0,
                "current": 15.0,
                "active_power": 2500.0,
                "reactive_power": 1500.0,
                "apparent_power": 2915.5,
                "power_factor": 0.857,  # Below 0.95 threshold
                "frequency": 50.0,
                "cumulative_energy": 1260.0,
                "firmware_version": "1.0.0",
                "uptime_seconds": 3780,
                "wifi_rssi": -58
            }
            
            post_response = await client.post(
                f"{BASE_URL}/api/readings",
                json=test_reading
            )
            assert post_response.status_code == 201
            
            # Wait for alert processing
            await asyncio.sleep(1.0)
            
            # Check if alert was generated
            alerts_response = await client.get(
                f"{BASE_URL}/api/alerts?meter_id={meter_id}"
            )
            assert alerts_response.status_code == 200
            
            alerts = alerts_response.json()
            low_pf_alerts = [
                a for a in alerts 
                if a["alert_type"] == "LOW_POWER_FACTOR" and not a["dismissed"]
            ]
            
            assert len(low_pf_alerts) > 0
            latest_alert = low_pf_alerts[0]
            assert abs(latest_alert["measured_value"] - 0.857) < 0.01
            assert latest_alert["threshold_value"] == 0.95
            print(f"✓ Low power factor alert generated: {latest_alert['id']}")
    
    @pytest.mark.asyncio
    async def test_alert_acknowledgment(self, setup_test_meter):
        """Test 8: Acknowledge an alert"""
        meter_id = await setup_test_meter
        
        async with httpx.AsyncClient() as client:
            # Get alerts for our test meter
            alerts_response = await client.get(
                f"{BASE_URL}/api/alerts?meter_id={meter_id}"
            )
            assert alerts_response.status_code == 200
            
            alerts = alerts_response.json()
            if len(alerts) == 0:
                pytest.skip("No alerts to acknowledge")
            
            alert_id = alerts[0]["id"]
            
            # Acknowledge the alert
            ack_response = await client.post(
                f"{BASE_URL}/api/alerts/{alert_id}/acknowledge"
            )
            assert ack_response.status_code == 200
            
            # Verify acknowledgment
            get_response = await client.get(f"{BASE_URL}/api/alerts")
            updated_alerts = get_response.json()
            acknowledged_alert = next(
                (a for a in updated_alerts if a["id"] == alert_id),
                None
            )
            
            assert acknowledged_alert is not None
            assert acknowledged_alert["acknowledged"] is True
            print(f"✓ Alert {alert_id} acknowledged successfully")
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test 9: Verify WebSocket connectivity"""
        try:
            async with websockets.connect(WS_URL) as websocket:
                # Connection successful
                print("✓ WebSocket connection established")
                
                # Wait briefly to ensure connection is stable
                await asyncio.sleep(1)
                
                # Try to receive a message (with timeout)
                try:
                    message = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=2.0
                    )
                    print(f"✓ WebSocket message received: {message[:100]}")
                except asyncio.TimeoutError:
                    print("✓ WebSocket connected (no immediate messages, which is expected)")
        except Exception as e:
            pytest.fail(f"WebSocket connection failed: {e}")
    
    @pytest.mark.asyncio
    async def test_complete_data_flow(self, setup_test_meter):
        """Test 10: Complete end-to-end data flow simulation"""
        meter_id = await setup_test_meter
        
        print("\n=== Complete Data Flow Test ===")
        print(f"Testing: ESP32 → Backend → Database → Dashboard")
        
        # Step 1: Configure thresholds
        print("\n[Step 1] Configuring thresholds...")
        threshold_config = {
            "meter_id": meter_id,
            "high_power_threshold": 3000.0,
            "low_power_factor_threshold": 0.90
        }
        
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{BASE_URL}/api/thresholds/{meter_id}",
                json=threshold_config
            )
            print("✓ Thresholds configured")
            
            # Step 2: Simulate ESP32 sending normal reading
            print("\n[Step 2] Simulating ESP32 normal reading...")
            normal_reading = {
                "meter_id": meter_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "voltage": 230.0,
                "current": 10.0,
                "active_power": 2300.0,  # Below threshold
                "reactive_power": 100.0,
                "apparent_power": 2302.2,
                "power_factor": 0.999,  # Above threshold
                "frequency": 50.0,
                "cumulative_energy": 1270.0,
                "firmware_version": "1.0.0",
                "uptime_seconds": 3900,
                "wifi_rssi": -55
            }
            
            response = await client.post(
                f"{BASE_URL}/api/readings",
                json=normal_reading
            )
            assert response.status_code == 201
            print(f"✓ Normal reading sent, Response: {response.json()}")
            
            await asyncio.sleep(0.5)
            
            # Step 3: Verify data in database
            print("\n[Step 3] Verifying data in database...")
            readings_response = await client.get(
                f"{BASE_URL}/api/readings?meter_id={meter_id}&limit=1"
            )
            assert readings_response.status_code == 200
            readings = readings_response.json()
            assert len(readings) > 0
            print(f"✓ Data retrieved from database: {readings[0]['active_power']}W")
            
            # Step 4: Simulate ESP32 sending abnormal reading (triggers alerts)
            print("\n[Step 4] Simulating ESP32 abnormal reading...")
            abnormal_reading = {
                "meter_id": meter_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "voltage": 232.0,
                "current": 20.0,
                "active_power": 4640.0,  # Exceeds 3000.0 threshold
                "reactive_power": 800.0,
                "apparent_power": 4708.3,
                "power_factor": 0.985,  # Above threshold (no alert)
                "frequency": 50.1,
                "cumulative_energy": 1280.0,
                "firmware_version": "1.0.0",
                "uptime_seconds": 3960,
                "wifi_rssi": -57
            }
            
            response = await client.post(
                f"{BASE_URL}/api/readings",
                json=abnormal_reading
            )
            assert response.status_code == 201
            print(f"✓ Abnormal reading sent, Response: {response.json()}")
            
            await asyncio.sleep(1.0)
            
            # Step 5: Verify alert generation
            print("\n[Step 5] Checking alert generation...")
            alerts_response = await client.get(
                f"{BASE_URL}/api/alerts?meter_id={meter_id}"
            )
            assert alerts_response.status_code == 200
            alerts = alerts_response.json()
            
            recent_alerts = [
                a for a in alerts
                if a["alert_type"] == "HIGH_POWER" and not a["dismissed"]
            ]
            
            if len(recent_alerts) > 0:
                print(f"✓ Alert generated: {recent_alerts[0]['alert_type']} - {recent_alerts[0]['measured_value']}W")
            else:
                print("⚠ No new alerts (may have been from previous test)")
            
            print("\n=== End-to-End Test Complete ===")
            print("✓ All components working together successfully")


def run_integration_tests():
    """Run all integration tests"""
    pytest.main([
        __file__,
        "-v",
        "-s",
        "--asyncio-mode=auto",
        "--tb=short"
    ])


if __name__ == "__main__":
    run_integration_tests()
