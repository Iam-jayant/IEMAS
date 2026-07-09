/**
 * ModbusClient Implementation
 * 
 * Comprehensive Modbus RTU/TCP communication with Schneider Energy Meters
 * Implements robust error handling, retry logic, and data validation
 * 
 * Requirements: 1.1, 8.3
 */

#include "modbus_client.h"

ModbusClient::ModbusClient() : initialized(false), 
                                lastError(ModbusError::NONE), 
                                lastErrorTime(0),
                                consecutiveErrors(0) {
}

bool ModbusClient::init(ModbusConfig cfg) {
    config = cfg;
    
    Serial.println("\n--- Initializing Modbus Client ---");
    
    if (config.type == "RTU") {
        Serial.printf("Mode: Modbus RTU\n");
        Serial.printf("Baudrate: %d\n", config.baudrate);
        Serial.printf("Slave ID: %d\n", config.slaveId);
        Serial.printf("Pins - TX: %d, RX: %d, DE: %d\n", 
                     config.txPin, config.rxPin, config.dePin);
        
        // Initialize serial port for RS485
        Serial2.begin(config.baudrate, SERIAL_8N1, config.rxPin, config.txPin);
        
        // Allow serial port to stabilize
        delay(100);
        
        // Initialize Modbus RTU with DE/RE control pin
        mb.begin(&Serial2, config.dePin);
        mb.master();
        
        // Set timeouts
        mb.setTimeout(READ_TIMEOUT_MS);
        
        initialized = true;
        lastError = ModbusError::NONE;
        consecutiveErrors = 0;
        
        Serial.println("Modbus RTU initialized successfully");
        return true;
        
    } else if (config.type == "TCP") {
        Serial.println("ERROR: Modbus TCP not yet implemented");
        Serial.println("Please use RTU mode or implement TCP support");
        logError(ModbusError::NOT_INITIALIZED, "TCP mode not supported");
        return false;
        
    } else {
        Serial.printf("ERROR: Unknown Modbus type: %s\n", config.type.c_str());
        logError(ModbusError::NOT_INITIALIZED, "Invalid Modbus type");
        return false;
    }
}

MeterReading ModbusClient::readMeterData() {
    MeterReading reading;
    reading.valid = false;
    reading.errorMessage = "";
    
    // Check initialization
    if (!initialized) {
        reading.errorMessage = "Modbus client not initialized";
        logError(ModbusError::NOT_INITIALIZED, reading.errorMessage.c_str());
        return reading;
    }
    
    Serial.println("\n--- Reading Meter Data via Modbus ---");
    
    bool allReadsSuccessful = true;
    
    // Read voltage (typically 2 registers for 32-bit float)
    if (!readFloat32(config.voltageReg, reading.voltage)) {
        logError(ModbusError::REGISTER_READ_FAILED, "Failed to read voltage");
        allReadsSuccessful = false;
    } else {
        Serial.printf("Voltage: %.2f V\n", reading.voltage);
    }
    delay(INTER_READ_DELAY_MS);
    mb.task(); // Process Modbus tasks
    
    // Read current
    if (!readFloat32(config.currentReg, reading.current)) {
        logError(ModbusError::REGISTER_READ_FAILED, "Failed to read current");
        allReadsSuccessful = false;
    } else {
        Serial.printf("Current: %.2f A\n", reading.current);
    }
    delay(INTER_READ_DELAY_MS);
    mb.task();
    
    // Read active power
    if (!readFloat32(config.activePowerReg, reading.activePower)) {
        logError(ModbusError::REGISTER_READ_FAILED, "Failed to read active power");
        allReadsSuccessful = false;
    } else {
        Serial.printf("Active Power: %.2f W\n", reading.activePower);
    }
    delay(INTER_READ_DELAY_MS);
    mb.task();
    
    // Read reactive power
    if (!readFloat32(config.reactivePowerReg, reading.reactivePower)) {
        logError(ModbusError::REGISTER_READ_FAILED, "Failed to read reactive power");
        allReadsSuccessful = false;
    } else {
        Serial.printf("Reactive Power: %.2f VAR\n", reading.reactivePower);
    }
    delay(INTER_READ_DELAY_MS);
    mb.task();
    
    // Read apparent power
    if (!readFloat32(config.apparentPowerReg, reading.apparentPower)) {
        logError(ModbusError::REGISTER_READ_FAILED, "Failed to read apparent power");
        allReadsSuccessful = false;
    } else {
        Serial.printf("Apparent Power: %.2f VA\n", reading.apparentPower);
    }
    delay(INTER_READ_DELAY_MS);
    mb.task();
    
    // Read power factor
    if (!readFloat32(config.powerFactorReg, reading.powerFactor)) {
        logError(ModbusError::REGISTER_READ_FAILED, "Failed to read power factor");
        allReadsSuccessful = false;
    } else {
        Serial.printf("Power Factor: %.3f\n", reading.powerFactor);
    }
    delay(INTER_READ_DELAY_MS);
    mb.task();
    
    // Read frequency
    if (!readFloat32(config.frequencyReg, reading.frequency)) {
        logError(ModbusError::REGISTER_READ_FAILED, "Failed to read frequency");
        allReadsSuccessful = false;
    } else {
        Serial.printf("Frequency: %.2f Hz\n", reading.frequency);
    }
    delay(INTER_READ_DELAY_MS);
    mb.task();
    
    // Read cumulative energy
    if (!readFloat32(config.energyReg, reading.cumulativeEnergy)) {
        logError(ModbusError::REGISTER_READ_FAILED, "Failed to read energy");
        allReadsSuccessful = false;
    } else {
        Serial.printf("Energy: %.2f kWh\n", reading.cumulativeEnergy);
    }
    
    // Check if all reads were successful
    if (!allReadsSuccessful) {
        reading.errorMessage = "One or more register reads failed";
        consecutiveErrors++;
        Serial.printf("ERROR: Reading failed (consecutive errors: %d)\n", consecutiveErrors);
        return reading;
    }
    
    // Validate the reading
    if (!validateReading(reading)) {
        reading.errorMessage = "Reading validation failed - values out of range";
        logError(ModbusError::INVALID_DATA, reading.errorMessage.c_str());
        consecutiveErrors++;
        return reading;
    }
    
    // Success - reset error counter
    reading.valid = true;
    lastError = ModbusError::NONE;
    consecutiveErrors = 0;
    Serial.println("✓ Meter data read successfully");
    
    return reading;
}

bool ModbusClient::readFloat32(uint16_t regAddr, float& value) {
    uint16_t buffer[2] = {0, 0};
    
    // Try reading with retries
    for (int attempt = 0; attempt < MAX_READ_RETRIES; attempt++) {
        if (attempt > 0) {
            Serial.printf("  Retry %d/%d for register %d\n", attempt, MAX_READ_RETRIES - 1, regAddr);
            delay(100 * attempt); // Exponential backoff
        }
        
        // Read 2 consecutive holding registers (32-bit float)
        if (readHoldingRegisters(regAddr, 2, buffer)) {
            value = parseFloat32FromRegisters(buffer);
            return true;
        }
        
        mb.task(); // Process any pending Modbus tasks
    }
    
    Serial.printf("ERROR: Failed to read register %d after %d attempts\n", 
                  regAddr, MAX_READ_RETRIES);
    value = 0.0;
    return false;
}

bool ModbusClient::readUint16(uint16_t regAddr, uint16_t& value) {
    uint16_t buffer[1] = {0};
    
    // Try reading with retries
    for (int attempt = 0; attempt < MAX_READ_RETRIES; attempt++) {
        if (attempt > 0) {
            Serial.printf("  Retry %d/%d for register %d\n", attempt, MAX_READ_RETRIES - 1, regAddr);
            delay(100 * attempt);
        }
        
        if (readHoldingRegisters(regAddr, 1, buffer)) {
            value = buffer[0];
            return true;
        }
        
        mb.task();
    }
    
    Serial.printf("ERROR: Failed to read register %d after %d attempts\n", 
                  regAddr, MAX_READ_RETRIES);
    value = 0;
    return false;
}

bool ModbusClient::readHoldingRegisters(uint16_t startAddr, uint16_t count, uint16_t* buffer) {
    // Use callback-based reading for emelianov/modbus-esp8266 library
    bool success = mb.readHreg(config.slaveId, startAddr, buffer, count);
    
    if (!success) {
        return false;
    }
    
    // Wait for response with timeout
    unsigned long startTime = millis();
    while (millis() - startTime < READ_TIMEOUT_MS) {
        mb.task();
        delay(10);
        
        // Check if transaction completed (library specific)
        // The emelianov library sets buffer values when complete
        if (buffer[0] != 0 || count == 1) {
            return true;
        }
    }
    
    logError(ModbusError::READ_TIMEOUT, "Register read timeout");
    return false;
}

float ModbusClient::parseFloat32FromRegisters(uint16_t* regs) {
    // Schneider Energy Meters typically use big-endian float representation
    // Two 16-bit registers combine to form one 32-bit float
    // Format: [High Word][Low Word]
    
    union {
        uint32_t i;
        float f;
    } value;
    
    // Combine registers (big-endian)
    value.i = ((uint32_t)regs[0] << 16) | regs[1];
    
    return value.f;
}

bool ModbusClient::validateReading(const MeterReading& reading) {
    // Sanity checks for electrical parameters
    
    // Voltage should be within reasonable range (0-1000V)
    if (reading.voltage < 0 || reading.voltage > 1000) {
        Serial.printf("VALIDATION: Voltage out of range: %.2f V\n", reading.voltage);
        return false;
    }
    
    // Current should be non-negative (0-10000A)
    if (reading.current < 0 || reading.current > 10000) {
        Serial.printf("VALIDATION: Current out of range: %.2f A\n", reading.current);
        return false;
    }
    
    // Power factor should be between -1 and 1
    if (reading.powerFactor < -1.0 || reading.powerFactor > 1.0) {
        Serial.printf("VALIDATION: Power factor out of range: %.3f\n", reading.powerFactor);
        return false;
    }
    
    // Frequency should be around 50-60 Hz (allow 45-65 Hz range)
    if (reading.frequency < 45 || reading.frequency > 65) {
        Serial.printf("VALIDATION: Frequency out of range: %.2f Hz\n", reading.frequency);
        return false;
    }
    
    // Active power should be non-negative (allow up to 1MW)
    if (reading.activePower < 0 || reading.activePower > 1000000) {
        Serial.printf("VALIDATION: Active power out of range: %.2f W\n", reading.activePower);
        return false;
    }
    
    // Cumulative energy should be non-negative
    if (reading.cumulativeEnergy < 0) {
        Serial.printf("VALIDATION: Energy cannot be negative: %.2f kWh\n", reading.cumulativeEnergy);
        return false;
    }
    
    return true;
}

void ModbusClient::logError(ModbusError error, const char* context) {
    lastError = error;
    lastErrorTime = millis();
    
    Serial.print("MODBUS ERROR: ");
    Serial.print(errorToString(error));
    if (context && strlen(context) > 0) {
        Serial.print(" - ");
        Serial.print(context);
    }
    Serial.println();
}

const char* ModbusClient::errorToString(ModbusError error) {
    switch (error) {
        case ModbusError::NONE:
            return "No error";
        case ModbusError::NOT_INITIALIZED:
            return "Not initialized";
        case ModbusError::CONNECTION_FAILED:
            return "Connection failed";
        case ModbusError::READ_TIMEOUT:
            return "Read timeout";
        case ModbusError::INVALID_RESPONSE:
            return "Invalid response";
        case ModbusError::CRC_ERROR:
            return "CRC error";
        case ModbusError::SLAVE_NOT_RESPONDING:
            return "Slave not responding";
        case ModbusError::REGISTER_READ_FAILED:
            return "Register read failed";
        case ModbusError::INVALID_DATA:
            return "Invalid data";
        default:
            return "Unknown error";
    }
}

void ModbusClient::handleError(const char* errorMsg) {
    Serial.print("MODBUS ERROR HANDLER: ");
    Serial.println(errorMsg);
    Serial.println("Will retry on next collection interval");
    consecutiveErrors++;
    
    if (consecutiveErrors > 10) {
        Serial.println("WARNING: More than 10 consecutive errors detected");
        Serial.println("Please check:");
        Serial.println("  - Modbus wiring (RS485 A, B, GND)");
        Serial.println("  - Slave ID configuration");
        Serial.println("  - Baudrate settings");
        Serial.println("  - Meter power supply");
    }
}
