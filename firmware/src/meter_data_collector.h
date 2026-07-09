/**
 * MeterDataCollector - Main application logic coordinator
 * 
 * Orchestrates the complete data collection cycle:
 * 1. Read meter data via Modbus
 * 2. Format data as JSON
 * 3. Transmit to backend via HTTP
 * 4. Handle failures and update status indicators
 */

#ifndef METER_DATA_COLLECTOR_H
#define METER_DATA_COLLECTOR_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "config_manager.h"
#include "modbus_client.h"
#include "http_client.h"
#include "led_indicator.h"

#define FIRMWARE_VERSION "1.0.0"

class MeterDataCollector {
private:
    ConfigManager* config;
    ModbusClient* modbusClient;
    HTTPClientWrapper* httpClient;
    LEDIndicator* ledIndicator;
    
    unsigned long lastCollection;
    unsigned long startTime;
    
    String formatReadingAsJson(MeterReading reading);
    
public:
    MeterDataCollector();
    
    void init(ConfigManager* cfg, ModbusClient* modbus, 
              HTTPClientWrapper* http, LEDIndicator* led);
    void loop();
    void collectAndTransmit();
};

#endif
