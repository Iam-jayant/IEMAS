#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ModbusMaster.h>
#include <time.h>
#include <SPI.h>
#include <SD.h>

const char* WIFI_SSID     = "pattagobi";
const char* WIFI_PASSWORD = "12345@678";

// Backend URL: Point to your backend server running IEMAS
const char* BACKEND_URL   = "https://iemas.onrender.com/api/readings";

// Meter Identifier (matches registered meter in IEMAS dashboard)
const char* METER_ID      = "CNC DX 250";

// Optional Security Token (leave blank if DEVICE_API_KEY is not configured in backend)
const char* DEVICE_TOKEN  = "";

// Collection interval in milliseconds (e.g., 10000ms = 10s, 60000ms = 1 minute)
const unsigned long COLLECTION_INTERVAL_MS = 10000;

// ================================================================
// 2. HARDWARE PIN DEFINITIONS (PROVEN CONFIGURATION)
// ================================================================
#define RX_PIN          16
#define TX_PIN          17
#define MAX485_RE_PIN   4
#define MAX485_DE_PIN   2
#define SLAVE_ID        3
#define STATUS_LED      2   // Built-in LED on most ESP32 boards

// SD Card CS Pin (Standard VSPI CS is 5 for ESP32)
#define SD_CS_PIN       5

// ================================================================
// 3. SCHNEIDER EM6433H / EM64XXH MODBUS HOLDING REGISTERS
// Note: ModbusMaster Address = Schneider Register Address - 1
// ================================================================
#define REG_CURRENT_L1        2999  // Current Phase 1 (A)
#define REG_CURRENT_L2        3001  // Current Phase 2 (A)
#define REG_CURRENT_L3        3003  // Current Phase 3 (A)
#define REG_CURRENT_AVG       3009  // Average 3-Phase Current (A)
#define REG_VOLTAGE_LN        3019  // Voltage L-N Average (V)
#define REG_VOLTAGE_LL        3027  // Voltage L-L Average (V)
#define REG_ACTIVE_POWER      3059  // Total Active Power (kW)
#define REG_REACTIVE_POWER    3067  // Total Reactive Power (kVAR)
#define REG_APPARENT_POWER    3075  // Total Apparent Power (kVA)
#define REG_POWER_FACTOR      3083  // Total Power Factor (-1.0 to 1.0)
#define REG_FREQUENCY         3109  // Frequency (Hz)
#define REG_ACTIVE_ENERGY     2699  // Active Energy Delivered (kWh)

// Global Instances
ModbusMaster node;
unsigned long lastCollectionTime = 0;
bool sdCardPresent = false;

// Transceiver Direction Callbacks
void preTransmission() {
  digitalWrite(MAX485_RE_PIN, HIGH);
  digitalWrite(MAX485_DE_PIN, HIGH);
}

void postTransmission() {
  digitalWrite(MAX485_RE_PIN, LOW);
  digitalWrite(MAX485_DE_PIN, LOW);
}

// Convert 2 consecutive 16-bit registers into IEEE 754 32-bit Float
float getFloat(uint16_t highWord, uint16_t lowWord) {
  uint32_t raw = ((uint32_t)highWord << 16) | lowWord;
  float value;
  memcpy(&value, &raw, sizeof(value));
  return value;
}

// Read float parameter from meter holding registers
bool readRegisterFloat(uint16_t address, float &outputVal) {
  uint8_t result = node.readHoldingRegisters(address, 2);
  if (result == node.ku8MBSuccess) {
    uint16_t word0 = node.getResponseBuffer(0);
    uint16_t word1 = node.getResponseBuffer(1);
    outputVal = getFloat(word0, word1);
    return true;
  }
  return false;
}

// Ensure WiFi is connected
void checkWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("\n[WiFi] Connecting to: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
    Serial.printf("[WiFi] Signal RSSI: %d dBm\n", WiFi.RSSI());
    digitalWrite(STATUS_LED, HIGH);
  } else {
    Serial.println("\n[WiFi] Connection timeout. Retrying next cycle...");
    digitalWrite(STATUS_LED, LOW);
  }
}

// Initialize SD Card
void initSDCard() {
  Serial.print("[SD] Initializing SD card...");
  if (!SD.begin(SD_CS_PIN)) {
    Serial.println(" Initialization failed!");
    sdCardPresent = false;
    return;
  }
  Serial.println(" Initialization done.");
  sdCardPresent = true;
}

// Save payload to local SD card
void saveToSD(const String& payload) {
  if (!sdCardPresent) {
    Serial.println("[SD] SD card not present, skipping local save.");
    return;
  }

  // Open file in append mode. Storing as JSON Lines (.jsonl)
  File dataFile = SD.open("/readings.jsonl", FILE_APPEND);
  
  if (dataFile) {
    dataFile.println(payload);
    dataFile.close();
    Serial.println("[SD] Successfully saved data locally.");
  } else {
    Serial.println("[SD] Error opening readings.jsonl for writing.");
    // Attempt reinitialization in case card was temporarily disconnected
    initSDCard(); 
  }
}

// Transmit JSON payload to IEMAS FastAPI backend with exponential backoff
bool transmitToBackend(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Cannot transmit: WiFi not connected");
    return false;
  }

  HTTPClient http;
  const int maxRetries = 3;
  const int delaysMs[] = {1000, 2000, 4000};

  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    Serial.printf("[HTTP] Attempt %d/%d POST to: %s\n", attempt, maxRetries, BACKEND_URL);

    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    if (strlen(DEVICE_TOKEN) > 0) {
      http.addHeader("X-Device-Token", DEVICE_TOKEN);
    }
    http.setTimeout(5000);

    int httpCode = http.POST(payload);

    if (httpCode == 200 || httpCode == 201) {
      Serial.printf("[HTTP] SUCCESS (HTTP %d)\n", httpCode);
      String response = http.getString();
      if (response.length() > 0) {
        Serial.printf("[HTTP] Response: %s\n", response.c_str());
      }
      http.end();
      return true;
    } else {
      Serial.printf("[HTTP] FAILED (HTTP %d): %s\n", httpCode, http.errorToString(httpCode).c_str());
      http.end();
      if (attempt < maxRetries) {
        delay(delaysMs[attempt - 1]);
      }
    }
  }

  return false;
}

// ================================================================
// SETUP
// ================================================================
void setup() {
  pinMode(MAX485_RE_PIN, OUTPUT);
  pinMode(MAX485_DE_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);

  digitalWrite(MAX485_RE_PIN, LOW);
  digitalWrite(MAX485_DE_PIN, LOW);
  digitalWrite(STATUS_LED, LOW);

  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==============================================");
  Serial.println("  IEMAS - Schneider EM6433H Edge Gateway");
  Serial.println("  Industrial Energy Monitoring System");
  Serial.println("==============================================");

  // Initialize Serial2 with proven 9600 Baud, SERIAL_8E1
  Serial2.begin(9600, SERIAL_8E1, RX_PIN, TX_PIN);

  // Initialize ModbusMaster node
  node.begin(SLAVE_ID, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  Serial.printf("[MODBUS] Initialized on RX:%d, TX:%d, RE:%d, DE:%d | 9600 8-E-1 | Slave ID: %d\n",
                RX_PIN, TX_PIN, MAX485_RE_PIN, MAX485_DE_PIN, SLAVE_ID);

  // Initialize SD Card
  initSDCard();

  // Connect to WiFi
  checkWiFiConnection();
}

// ================================================================
// MAIN LOOP
// ================================================================
void loop() {
  checkWiFiConnection();

  unsigned long currentMillis = millis();
  if (currentMillis - lastCollectionTime >= COLLECTION_INTERVAL_MS) {
    lastCollectionTime = currentMillis;

    Serial.println("\n--- Polling Schneider EM6433H Registers ---");

    float voltage = 0.0f;
    float current = 0.0f;
    float activePower = 0.0f;
    float reactivePower = 0.0f;
    float apparentPower = 0.0f;
    float powerFactor = 1.0f;
    float frequency = 50.0f;
    float cumulativeEnergy = 0.0f;

    // 1. Voltage Average L-L (Reg 3027)
    if (!readRegisterFloat(REG_VOLTAGE_LL, voltage)) {
      // Fallback to L-N if single phase wiring
      readRegisterFloat(REG_VOLTAGE_LN, voltage);
    }

    // 2. Average Current (Reg 3009)
    readRegisterFloat(REG_CURRENT_AVG, current);

    // 3. Total Active Power (Reg 3059) [kW]
    readRegisterFloat(REG_ACTIVE_POWER, activePower);

    // 4. Reactive Power (Reg 3067) [kVAR]
    if (!readRegisterFloat(REG_REACTIVE_POWER, reactivePower)) {
      reactivePower = 0.0f;
    }

    // 5. Apparent Power (Reg 3075) [kVA]
    if (!readRegisterFloat(REG_APPARENT_POWER, apparentPower)) {
      apparentPower = activePower;
    }

    // 6. Power Factor (Reg 3083)
    if (!readRegisterFloat(REG_POWER_FACTOR, powerFactor) || powerFactor == 0.0f) {
      powerFactor = (apparentPower > 0) ? (activePower / apparentPower) : 1.0f;
    }

    // 7. Frequency (Reg 3109) [Hz]
    if (!readRegisterFloat(REG_FREQUENCY, frequency) || frequency < 40.0f) {
      frequency = 50.0f;
    }

    // 8. Active Energy Delivered (Reg 2699) [kWh] - PROVEN WORKING REGISTER
    if (!readRegisterFloat(REG_ACTIVE_ENERGY, cumulativeEnergy)) {
      Serial.println("[MODBUS] Warning: Failed to read Active Energy register 2699");
    }

    // Sanitize any NaN values from the meter to prevent JSON/backend 422 validation errors
    if (isnan(voltage)) voltage = 0.0f;
    if (isnan(current)) current = 0.0f;
    if (isnan(activePower)) activePower = 0.0f;
    if (isnan(reactivePower)) reactivePower = 0.0f;
    if (isnan(apparentPower)) apparentPower = 0.0f;
    if (isnan(powerFactor)) powerFactor = 1.0f;
    if (isnan(frequency)) frequency = 50.0f;
    if (isnan(cumulativeEnergy)) cumulativeEnergy = 0.0f;

    // Print values to Serial Monitor
    Serial.printf("  Voltage (L-L):     %.2f V\n", voltage);
    Serial.printf("  Current (Avg):     %.2f A\n", current);
    Serial.printf("  Active Power:      %.2f kW\n", activePower);
    Serial.printf("  Reactive Power:    %.2f kVAR\n", reactivePower);
    Serial.printf("  Apparent Power:    %.2f kVA\n", apparentPower);
    Serial.printf("  Power Factor:      %.3f\n", powerFactor);
    Serial.printf("  Frequency:         %.2f Hz\n", frequency);
    Serial.printf("  Active Energy:     %.2f kWh\n", cumulativeEnergy);

    // Build JSON Payload matching IEMAS MeterReadingCreate schema
    StaticJsonDocument<512> doc;
    doc["meter_id"]          = METER_ID;
    doc["voltage"]           = voltage;
    doc["current"]           = current;
    doc["active_power"]      = activePower;
    doc["reactive_power"]    = reactivePower;
    doc["apparent_power"]    = apparentPower;
    doc["power_factor"]      = powerFactor;
    doc["frequency"]         = frequency;
    doc["cumulative_energy"] = cumulativeEnergy;
    doc["firmware_version"]  = "1.0.0-EM6433H";
    doc["uptime_seconds"]    = millis() / 1000;
    doc["wifi_rssi"]         = WiFi.RSSI();

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    // 1. Save locally to SD card first
    saveToSD(jsonPayload);

    // 2. Transmit to FastAPI Backend
    Serial.println("\n[HTTP] Transmitting payload to IEMAS backend...");
    bool ok = transmitToBackend(jsonPayload);
    if (ok) {
      digitalWrite(STATUS_LED, HIGH);
    } else {
      digitalWrite(STATUS_LED, LOW);
    }

    Serial.println("=============================================");
  }

  delay(50);
}
