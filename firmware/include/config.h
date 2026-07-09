/**
 * Configuration Manager Header
 * Loads and manages configuration from JSON file
 */

#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <FS.h>
#include <LittleFS.h>

// Modbus configuration structure
struct ModbusConfig {
    String type;        // "RTU" or "TCP"
    int baudrate;       // For RTU (e.g., 9600, 19200)
    uint8_t slaveId;    // Modbus slave ID
    String host;        // For TCP
    int port;           // For TCP
    
    // Register addresses
    uint16_t voltageReg;
    uint16_t currentReg;
    uint16_t activePowerReg;
    uint16_t reactivePowerReg;
    uint16_t apparentPowerReg;
    uint16_t powerFactorReg;
    uint16_t frequencyReg;
    uint16_t energyReg;
};

class ConfigManager {
public:
    ConfigManager();
    
    bool begin();
    bool loadFromFile(const char* path = "/config.json");
    bool saveToFile(const char* path = "/config.json");
    
    String getMeterId() const { return meterId; }
    String getCollectorUrl() const { return collectorUrl; }
    unsigned long getCollectionInterval() const { return collectionInterval; }
    String getWiFiSSID() const { return wifiSSID; }
    String getWiFiPassword() const { return wifiPassword; }
    ModbusConfig getModbusConfig() const { return modbusConfig; }
    
private:
    String meterId;
    String collectorUrl;
    unsigned long collectionInterval; // seconds
    String wifiSSID;
    String wifiPassword;
    ModbusConfig modbusConfig;
};

#endif // CONFIG_H
