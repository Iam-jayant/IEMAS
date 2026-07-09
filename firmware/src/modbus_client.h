/**
 * ModbusClient - Communicates with Schneider Energy Meters via Modbus RTU/TCP
 * 
 * Reads electrical parameters from configured register addresses
 * Supports both Modbus RTU (RS485) and TCP protocols
 * Implements error handling with logging and automatic retry on next interval
 * 
 * Requirements: 1.1, 8.3
 */

#ifndef MODBUS_CLIENT_H
#define MODBUS_CLIENT_H

#include <Arduino.h>
#include <ModbusRTU.h>
#include "config_manager.h"

// Meter reading structure
struct MeterReading {
    float voltage;          // Volts (V)
    float current;          // Amperes (A)
    float activePower;      // Watts (W)
    float reactivePower;    // VAR
    float apparentPower;    // VA
    float powerFactor;      // -1.0 to 1.0
    float frequency;        // Hertz (Hz)
    float cumulativeEnergy; // Kilowatt-hours (kWh)
    bool valid;             // Reading success flag
    String errorMessage;    // Error description if valid=false
};

// Modbus error codes
enum class ModbusError {
    NONE = 0,
    NOT_INITIALIZED,
    CONNECTION_FAILED,
    READ_TIMEOUT,
    INVALID_RESPONSE,
    CRC_ERROR,
    SLAVE_NOT_RESPONDING,
    REGISTER_READ_FAILED,
    INVALID_DATA
};

class ModbusClient {
private:
    ModbusRTU mb;
    ModbusConfig config;
    bool initialized;
    ModbusError lastError;
    unsigned long lastErrorTime;
    int consecutiveErrors;
    
    // Constants
    static const int MAX_READ_RETRIES = 3;
    static const int READ_TIMEOUT_MS = 1000;
    static const int INTER_READ_DELAY_MS = 50;
    
    // Private methods for register reading
    bool readFloat32(uint16_t regAddr, float& value);
    bool readUint16(uint16_t regAddr, uint16_t& value);
    bool readHoldingRegisters(uint16_t startAddr, uint16_t count, uint16_t* buffer);
    
    // Data parsing
    float parseFloat32FromRegisters(uint16_t* regs);
    
    // Error handling
    void logError(ModbusError error, const char* context);
    const char* errorToString(ModbusError error);
    bool validateReading(const MeterReading& reading);
    
public:
    ModbusClient();
    
    // Initialization
    bool init(ModbusConfig cfg);
    
    // Main read operation
    MeterReading readMeterData();
    
    // Error handling
    void handleError(const char* errorMsg);
    ModbusError getLastError() const { return lastError; }
    int getConsecutiveErrorCount() const { return consecutiveErrors; }
    
    // Status check
    bool isInitialized() const { return initialized; }
};

#endif // MODBUS_CLIENT_H
