/**
 * Modbus Client Header
 * Handles Modbus RTU/TCP communication with Schneider Energy Meters
 * 
 * This header is for inclusion in other modules
 * Main implementation is in src/modbus_client.h and src/modbus_client.cpp
 * 
 * Requirements: 1.1, 8.3
 */

#ifndef MODBUS_CLIENT_INCLUDE_H
#define MODBUS_CLIENT_INCLUDE_H

#include <Arduino.h>

// Forward declaration - actual implementation in src/
struct MeterReading;
struct ModbusConfig;
class ModbusClient;

// Include the actual implementation
#include "../src/modbus_client.h"

#endif // MODBUS_CLIENT_INCLUDE_H
