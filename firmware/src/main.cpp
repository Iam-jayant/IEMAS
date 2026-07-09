/**
 * IEMAS ESP32 Firmware - Main Application
 * Industrial Energy Monitoring & Analytics System
 * 
 * Reads electrical parameters from Schneider Energy Meters via Modbus RTU/TCP
 * and transmits data to FastAPI backend via HTTP POST
 * 
 * Requirements Fulfilled:
 * - Requirement 1.1: Read electrical parameters every 60-120 seconds (configurable)
 * - Requirement 1.2: Transmit readings within 5 seconds of collection (HTTP timeout)
 * - Requirement 8.5: Resume data collection within 30 seconds after restart
 *   (Typical setup time: WiFi ~15s + NTP ~10s + Modbus init <1s = ~26s)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "config.h"
#include "modbus_client.h"
#include "http_client.h"
#include "led_indicator.h"

// Global instances
ConfigManager configManager;
ModbusClient modbusClient;
HTTPClientManager httpClient;
LEDIndicator ledIndicator(LED_BUILTIN);

// Configuration
String meterId;
String collectorUrl;
unsigned long collectionInterval = 60000; // Default 60 seconds
unsigned long lastReadingTime = 0;

// WiFi credentials (from config or WiFiManager)
String wifiSSID;
String wifiPassword;

void setup() {
    Serial.begin(115200);
    Serial.println("\n=================================");
    Serial.println("IEMAS ESP32 Firmware Starting");
    Serial.println("Version: 1.0.0");
    Serial.println("=================================\n");
    
    // Initialize LED indicator
    ledIndicator.begin();
    ledIndicator.setDisconnected(); // Blinking until connected
    
    // Load configuration from file
    if (!configManager.begin()) {
        Serial.println("ERROR: Failed to load configuration");
        Serial.println("Please upload config.json to the filesystem");
        while (true) {
            ledIndicator.update();
            delay(100);
        }
    }
    
    // Get configuration values
    meterId = configManager.getMeterId();
    collectorUrl = configManager.getCollectorUrl();
    collectionInterval = configManager.getCollectionInterval() * 1000; // Convert to ms
    wifiSSID = configManager.getWiFiSSID();
    wifiPassword = configManager.getWiFiPassword();
    
    Serial.printf("Meter ID: %s\n", meterId.c_str());
    Serial.printf("Collector URL: %s\n", collectorUrl.c_str());
    Serial.printf("Collection Interval: %lu seconds\n", collectionInterval / 1000);
    
    // Connect to WiFi
    Serial.println("\nConnecting to WiFi...");
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
    
    int wifiRetries = 0;
    while (WiFi.status() != WL_CONNECTED && wifiRetries < 30) {
        delay(500);
        Serial.print(".");
        ledIndicator.update();
        wifiRetries++;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\nERROR: Failed to connect to WiFi");
        Serial.println("Please check WiFi credentials in config.json");
        while (true) {
            ledIndicator.update();
            delay(100);
        }
    }
    
    Serial.println("\nWiFi connected!");
    Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Signal Strength: %d dBm\n", WiFi.RSSI());
    
    // Initialize NTP for time synchronization
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.println("Waiting for NTP time sync...");
    
    int ntpRetries = 0;
    while (time(nullptr) < 100000 && ntpRetries < 20) {
        delay(500);
        Serial.print(".");
        ntpRetries++;
    }
    Serial.println();
    
    // Initialize Modbus client
    if (!modbusClient.begin(configManager.getModbusConfig())) {
        Serial.println("ERROR: Failed to initialize Modbus client");
        while (true) {
            ledIndicator.update();
            delay(100);
        }
    }
    
    Serial.println("Modbus client initialized");
    
    // Set LED to connected
    ledIndicator.setConnected();
    
    Serial.println("\n=================================");
    Serial.println("Initialization Complete");
    Serial.println("Starting data collection...");
    Serial.println("=================================\n");
}

void loop() {
    // Update LED indicator
    ledIndicator.update();
    
    // Check if it's time to read meter data
    unsigned long currentTime = millis();
    if (currentTime - lastReadingTime >= collectionInterval) {
        lastReadingTime = currentTime;
        
        Serial.println("\n--- Reading Meter Data ---");
        
        // Read data from meter via Modbus
        MeterReading reading = modbusClient.readMeterData();
        
        if (!reading.valid) {
            Serial.println("ERROR: Failed to read meter data");
            if (reading.errorMessage.length() > 0) {
                Serial.printf("  Error: %s\n", reading.errorMessage.c_str());
            }
            modbusClient.handleError("Meter reading failed");
            ledIndicator.setDisconnected();
            return;
        }
        
        // Print reading data
        Serial.println("Reading successful:");
        Serial.printf("  Voltage: %.2f V\n", reading.voltage);
        Serial.printf("  Current: %.2f A\n", reading.current);
        Serial.printf("  Active Power: %.2f kW\n", reading.activePower);
        Serial.printf("  Reactive Power: %.2f kVAR\n", reading.reactivePower);
        Serial.printf("  Apparent Power: %.2f kVA\n", reading.apparentPower);
        Serial.printf("  Power Factor: %.3f\n", reading.powerFactor);
        Serial.printf("  Frequency: %.2f Hz\n", reading.frequency);
        Serial.printf("  Energy: %.2f kWh\n", reading.cumulativeEnergy);
        
        // Get current timestamp
        time_t now = time(nullptr);
        struct tm timeinfo;
        gmtime_r(&now, &timeinfo);
        char timestamp[30];
        strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
        
        // Build JSON payload
        StaticJsonDocument<512> doc;
        doc["meter_id"] = meterId;
        doc["timestamp"] = timestamp;
        doc["voltage"] = reading.voltage;
        doc["current"] = reading.current;
        doc["active_power"] = reading.activePower;
        doc["reactive_power"] = reading.reactivePower;
        doc["apparent_power"] = reading.apparentPower;
        doc["power_factor"] = reading.powerFactor;
        doc["frequency"] = reading.frequency;
        doc["cumulative_energy"] = reading.cumulativeEnergy;
        doc["firmware_version"] = "1.0.0";
        doc["uptime_seconds"] = millis() / 1000;
        doc["wifi_rssi"] = WiFi.RSSI(); // WiFi signal strength in dBm
        
        String jsonPayload;
        serializeJson(doc, jsonPayload);
        
        // Transmit to backend
        Serial.println("\nTransmitting to backend...");
        bool success = httpClient.transmitReading(collectorUrl, jsonPayload);
        
        if (success) {
            Serial.println("✓ Transmission successful");
            ledIndicator.setConnected();
        } else {
            Serial.println("✗ Transmission failed");
            ledIndicator.setDisconnected();
        }
    }
    
    // Small delay to prevent watchdog issues
    delay(10);
}
