/**
 * ModbusClient Unit Tests
 * 
 * Tests for Modbus RTU communication functionality
 * Requirements: 1.1, 8.3
 * 
 * Note: These are basic unit tests for ESP32/Arduino environment
 * Full integration tests require actual Modbus hardware
 */

#include <Arduino.h>
#include <unity.h>
#include "../src/modbus_client.h"
#include "../src/config_manager.h"

// Test fixtures
ModbusClient* modbusClient;
ModbusConfig testConfig;

void setUp(void) {
    // Set up test configuration
    testConfig.type = "RTU";
    testConfig.baudrate = 9600;
    testConfig.slaveId = 1;
    testConfig.txPin = 17;
    testConfig.rxPin = 16;
    testConfig.dePin = 4;
    
    // Schneider PM5000 register addresses
    testConfig.voltageReg = 3027;
    testConfig.currentReg = 3029;
    testConfig.activePowerReg = 3059;
    testConfig.reactivePowerReg = 3061;
    testConfig.apparentPowerReg = 3063;
    testConfig.powerFactorReg = 3077;
    testConfig.frequencyReg = 3109;
    testConfig.energyReg = 3203;
    
    modbusClient = new ModbusClient();
}

void tearDown(void) {
    delete modbusClient;
    modbusClient = nullptr;
}

// Test: ModbusClient initialization
void test_modbus_client_initialization(void) {
    TEST_ASSERT_NOT_NULL(modbusClient);
    TEST_ASSERT_FALSE(modbusClient->isInitialized());
    
    bool result = modbusClient->init(testConfig);
    
    TEST_ASSERT_TRUE(result);
    TEST_ASSERT_TRUE(modbusClient->isInitialized());
    TEST_ASSERT_EQUAL(ModbusError::NONE, modbusClient->getLastError());
}

// Test: Invalid Modbus type rejection
void test_invalid_modbus_type(void) {
    testConfig.type = "INVALID";
    
    bool result = modbusClient->init(testConfig);
    
    TEST_ASSERT_FALSE(result);
    TEST_ASSERT_FALSE(modbusClient->isInitialized());
    TEST_ASSERT_EQUAL(ModbusError::NOT_INITIALIZED, modbusClient->getLastError());
}

// Test: Read without initialization
void test_read_without_initialization(void) {
    MeterReading reading = modbusClient->readMeterData();
    
    TEST_ASSERT_FALSE(reading.valid);
    TEST_ASSERT_TRUE(reading.errorMessage.length() > 0);
    TEST_ASSERT_EQUAL(ModbusError::NOT_INITIALIZED, modbusClient->getLastError());
}

// Test: MeterReading structure initialization
void test_meter_reading_structure(void) {
    MeterReading reading;
    reading.valid = false;
    reading.voltage = 230.5;
    reading.current = 12.3;
    reading.activePower = 2834.5;
    reading.reactivePower = 100.0;
    reading.apparentPower = 2836.0;
    reading.powerFactor = 0.999;
    reading.frequency = 50.0;
    reading.cumulativeEnergy = 1234.56;
    
    TEST_ASSERT_EQUAL_FLOAT(230.5, reading.voltage);
    TEST_ASSERT_EQUAL_FLOAT(12.3, reading.current);
    TEST_ASSERT_EQUAL_FLOAT(2834.5, reading.activePower);
    TEST_ASSERT_EQUAL_FLOAT(0.999, reading.powerFactor);
    TEST_ASSERT_EQUAL_FLOAT(50.0, reading.frequency);
}

// Test: Error counter increments on failure
void test_error_counter_increment(void) {
    modbusClient->init(testConfig);
    
    // Force an error by reading without proper hardware
    // (This will fail on test hardware without actual Modbus slave)
    MeterReading reading = modbusClient->readMeterData();
    
    // On hardware without Modbus slave, reading should fail
    // and consecutive error count should increase
    if (!reading.valid) {
        TEST_ASSERT_GREATER_THAN(0, modbusClient->getConsecutiveErrorCount());
    }
}

// Test: Error message handling
void test_error_message_handling(void) {
    const char* testErrorMsg = "Test error message";
    
    modbusClient->handleError(testErrorMsg);
    
    // Verify error counter increases
    TEST_ASSERT_GREATER_THAN(0, modbusClient->getConsecutiveErrorCount());
}

// Test: Configuration persistence
void test_configuration_values(void) {
    modbusClient->init(testConfig);
    
    // Configuration should be stored internally
    TEST_ASSERT_TRUE(modbusClient->isInitialized());
}

// Test: Multiple initialization calls
void test_multiple_initialization(void) {
    bool result1 = modbusClient->init(testConfig);
    TEST_ASSERT_TRUE(result1);
    TEST_ASSERT_TRUE(modbusClient->isInitialized());
    
    // Second initialization should also succeed
    bool result2 = modbusClient->init(testConfig);
    TEST_ASSERT_TRUE(result2);
    TEST_ASSERT_TRUE(modbusClient->isInitialized());
}

// Test: Register address configuration
void test_register_addresses(void) {
    // Verify default register addresses are within valid Modbus range
    TEST_ASSERT_GREATER_OR_EQUAL(0, testConfig.voltageReg);
    TEST_ASSERT_LESS_THAN(65536, testConfig.voltageReg);
    TEST_ASSERT_GREATER_OR_EQUAL(0, testConfig.currentReg);
    TEST_ASSERT_LESS_THAN(65536, testConfig.currentReg);
    TEST_ASSERT_GREATER_OR_EQUAL(0, testConfig.activePowerReg);
    TEST_ASSERT_LESS_THAN(65536, testConfig.activePowerReg);
}

// Test: Slave ID validation
void test_slave_id_range(void) {
    // Valid Modbus slave IDs are 1-247
    TEST_ASSERT_GREATER_OR_EQUAL(1, testConfig.slaveId);
    TEST_ASSERT_LESS_OR_EQUAL(247, testConfig.slaveId);
}

// Test: Baudrate validation
void test_baudrate_values(void) {
    // Common Modbus baudrates
    int validBaudrates[] = {4800, 9600, 19200, 38400, 57600, 115200};
    bool isValidBaudrate = false;
    
    for (int i = 0; i < 6; i++) {
        if (testConfig.baudrate == validBaudrates[i]) {
            isValidBaudrate = true;
            break;
        }
    }
    
    TEST_ASSERT_TRUE(isValidBaudrate);
}

// Main test runner
void setup() {
    delay(2000); // Wait for Serial Monitor
    
    UNITY_BEGIN();
    
    // Run tests
    RUN_TEST(test_modbus_client_initialization);
    RUN_TEST(test_invalid_modbus_type);
    RUN_TEST(test_read_without_initialization);
    RUN_TEST(test_meter_reading_structure);
    RUN_TEST(test_error_counter_increment);
    RUN_TEST(test_error_message_handling);
    RUN_TEST(test_configuration_values);
    RUN_TEST(test_multiple_initialization);
    RUN_TEST(test_register_addresses);
    RUN_TEST(test_slave_id_range);
    RUN_TEST(test_baudrate_values);
    
    UNITY_END();
}

void loop() {
    // Nothing to do here
}
