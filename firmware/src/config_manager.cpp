/**
 * ConfigManager Implementation
 */

#include "../include/config.h"
#include <LittleFS.h>

ConfigManager::ConfigManager() {
    // Default values
    meterId = "METER_001";
    collectorUrl = "http://192.168.1.100:8000/api/readings";
    deviceToken = "";
    collectionInterval = 60;
    wifiSSID = "";
    wifiPassword = "";
    
    // Default Modbus config
    modbusConfig.type = "RTU";
    modbusConfig.baudrate = 9600;
    modbusConfig.slaveId = 1;
    modbusConfig.host = "";
    modbusConfig.port = 502;
    modbusConfig.wordOrder = "ABCD"; // Default Big-Endian
    
    // Default Schneider PM2000/PM5000 register addresses
    modbusConfig.voltageReg = 3027;       // Voltage L-L Avg
    modbusConfig.currentReg = 3009;       // Current Avg
    modbusConfig.activePowerReg = 3059;   // Total Active Power (kW)
    modbusConfig.reactivePowerReg = 3067; // Total Reactive Power (kVAR)
    modbusConfig.apparentPowerReg = 3075; // Total Apparent Power (kVA)
    modbusConfig.powerFactorReg = 3083;   // Total Power Factor
    modbusConfig.frequencyReg = 3109;     // Frequency (Hz)
    modbusConfig.energyReg = 3203;        // Active Energy (kWh)
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
    deviceToken = doc["device_token"] | "";
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
        modbusConfig.wordOrder = modbus["word_order"] | "ABCD";
        
        // Load register addresses
        JsonObject registers = modbus["registers"];
        if (!registers.isNull()) {
            modbusConfig.voltageReg = registers["voltage"] | 3027;
            modbusConfig.currentReg = registers["current"] | 3009;
            modbusConfig.activePowerReg = registers["active_power"] | 3059;
            modbusConfig.reactivePowerReg = registers["reactive_power"] | 3067;
            modbusConfig.apparentPowerReg = registers["apparent_power"] | 3075;
            modbusConfig.powerFactorReg = registers["power_factor"] | 3083;
            modbusConfig.frequencyReg = registers["frequency"] | 3109;
            modbusConfig.energyReg = registers["energy"] | 3203;
        }
    }
    
    Serial.println("Configuration loaded successfully");
    return true;
}

bool ConfigManager::saveToFile(const char* path) {
    JsonDocument doc;
    
    doc["meter_id"] = meterId;
    doc["collector_url"] = collectorUrl;
    doc["device_token"] = deviceToken;
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
    modbus["word_order"] = modbusConfig.wordOrder;
    
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


