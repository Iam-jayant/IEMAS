/**
 * ConfigManager Implementation
 */

#include "../include/config.h"
#include <LittleFS.h>

ConfigManager::ConfigManager() {
    // Default values
    meterId = "METER_001";
    collectorUrl = "http://192.168.1.100:8000/api/readings";
    collectionInterval = 60;
    wifiSSID = "";
    wifiPassword = "";
    
    // Default Modbus config
    modbusConfig.type = "RTU";
    modbusConfig.baudrate = 9600;
    modbusConfig.slaveId = 1;
    modbusConfig.host = "";
    modbusConfig.port = 502;
    
    // Default Schneider PM5000 register addresses (example)
    modbusConfig.voltageReg = 0;
    modbusConfig.currentReg = 6;
    modbusConfig.activePowerReg = 12;
    modbusConfig.reactivePowerReg = 18;
    modbusConfig.apparentPowerReg = 24;
    modbusConfig.powerFactorReg = 30;
    modbusConfig.frequencyReg = 36;
    modbusConfig.energyReg = 42;
}

/**
 * Initialize LittleFS and load configuration
 * @return true if initialization and config load successful, false otherwise
 */
bool ConfigManager::begin() {
    Serial.println("Initializing LittleFS...");
    
    if (!LittleFS.begin(true)) {  // true = format on fail
        Serial.println("ERROR: Failed to initialize LittleFS");
        return false;
    }
    
    Serial.println("LittleFS initialized successfully");
    
    // Load configuration from default path
    return loadFromFile();
}

bool ConfigManager::loadFromFile(const char* path) {
    Serial.printf("Loading configuration from %s...\n", path);
    
    if (!LittleFS.exists(path)) {
        Serial.println("WARNING: Config file not found, using defaults");
        return true;  // Use defaults
    }
    
    File configFile = LittleFS.open(path, "r");
    if (!configFile) {
        Serial.println("ERROR: Failed to open config file");
        return false;
    }
    
    // Parse JSON
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, configFile);
    configFile.close();
    
    if (error) {
        Serial.print("ERROR: JSON parsing failed: ");
        Serial.println(error.c_str());
        return false;
    }
    
    // Load configuration values
    meterId = doc["meter_id"] | "METER_001";
    collectorUrl = doc["collector_url"] | "http://192.168.1.100:8000/api/readings";
    collectionInterval = doc["collection_interval"] | 60;
    
    // Load WiFi configuration
    JsonObject wifi = doc["wifi"];
    if (!wifi.isNull()) {
        wifiSSID = wifi["ssid"] | "";
        wifiPassword = wifi["password"] | "";
    }
    
    // Load Modbus configuration
    JsonObject modbus = doc["modbus"];
    if (!modbus.isNull()) {
        modbusConfig.type = modbus["type"] | "RTU";
        modbusConfig.baudrate = modbus["baudrate"] | 9600;
        modbusConfig.slaveId = modbus["slave_id"] | 1;
        modbusConfig.host = modbus["host"] | "";
        modbusConfig.port = modbus["port"] | 502;
        
        // Load register addresses
        JsonObject registers = modbus["registers"];
        if (!registers.isNull()) {
            modbusConfig.voltageReg = registers["voltage"] | 0;
            modbusConfig.currentReg = registers["current"] | 6;
            modbusConfig.activePowerReg = registers["active_power"] | 12;
            modbusConfig.reactivePowerReg = registers["reactive_power"] | 18;
            modbusConfig.apparentPowerReg = registers["apparent_power"] | 24;
            modbusConfig.powerFactorReg = registers["power_factor"] | 30;
            modbusConfig.frequencyReg = registers["frequency"] | 36;
            modbusConfig.energyReg = registers["energy"] | 42;
        }
    }
    
    Serial.println("Configuration loaded successfully");
    return true;
}

bool ConfigManager::saveToFile(const char* path) {
    JsonDocument doc;
    
    doc["meter_id"] = meterId;
    doc["collector_url"] = collectorUrl;
    doc["collection_interval"] = collectionInterval;
    
    JsonObject wifi = doc["wifi"].to<JsonObject>();
    wifi["ssid"] = wifiSSID;
    wifi["password"] = wifiPassword;
    
    JsonObject modbus = doc["modbus"].to<JsonObject>();
    modbus["type"] = modbusConfig.type;
    modbus["baudrate"] = modbusConfig.baudrate;
    modbus["slave_id"] = modbusConfig.slaveId;
    modbus["host"] = modbusConfig.host;
    modbus["port"] = modbusConfig.port;
    
    JsonObject registers = modbus["registers"].to<JsonObject>();
    registers["voltage"] = modbusConfig.voltageReg;
    registers["current"] = modbusConfig.currentReg;
    registers["active_power"] = modbusConfig.activePowerReg;
    registers["reactive_power"] = modbusConfig.reactivePowerReg;
    registers["apparent_power"] = modbusConfig.apparentPowerReg;
    registers["power_factor"] = modbusConfig.powerFactorReg;
    registers["frequency"] = modbusConfig.frequencyReg;
    registers["energy"] = modbusConfig.energyReg;
    
    File configFile = LittleFS.open(path, "w");
    if (!configFile) {
        Serial.println("ERROR: Failed to open config file for writing");
        return false;
    }
    
    serializeJsonPretty(doc, configFile);
    configFile.close();
    
    Serial.printf("Configuration saved to %s\n", path);
    return true;
}


