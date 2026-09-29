#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ModbusMaster.h>
#include <time.h>
// #include <SPI.h>
// #include <SD.h>

// ================================================================
// 1. NETWORK & BACKEND CONFIGURATION
// ================================================================
const char* WIFI_SSID     = "pattagobi";
const char* WIFI_PASSWORD = "12345@678";

const char* BACKEND_URL   = "https://iemas.onrender.com/api/readings";
const char* DEVICE_TOKEN  = ""; 

// Production Polling interval: 30 seconds
const unsigned long COLLECTION_INTERVAL_MS = 30000;

// ================================================================
// 2. HARDWARE PIN DEFINITIONS
// ================================================================
#define RX_PIN          16
#define TX_PIN          17
#define MAX485_RE_PIN   4
#define MAX485_DE_PIN   2
#define STATUS_LED      33   
// #define SD_CS_PIN       5

// ================================================================
// 3. MULTISPAN EM10-M1 MODBUS MAP
// ================================================================
#define REG_ACTIVE_ENERGY  0   // Kwh
#define REG_LINE1_POWER    4   // Line1 kw
#define REG_LINE2_POWER    6   // Line2 kw
#define REG_LINE3_POWER    8   // Line3 kw
#define REG_TOTAL_POWER    10  // Total kw

ModbusMaster node;
unsigned long lastCollectionTime = 0;
// bool sdCardPresent = false;

// ================================================================
// METER NAME MAPPING (Matches Slave IDs 1 through 11)
// ================================================================
const char* METER_NAMES[] = {
  "HMC KH63G 36 KVA",          // ID 1
  "VMC APC1050 25KW",          // ID 2
  "VMC 850 25KW",              // ID 3
  "Turning DX250 25KW",        // ID 4
  "SPARE",                     // ID 5
  "SPARE",                     // ID 6
  "VMC HAAS VF4I 35 AMP",      // ID 7
  "VMC PX20 20KW",             // ID 8
  "Turning DX200-7B-1 20KW",   // ID 9
  "Turning DX200-7B-2 20KW",   // ID 10
  "Turning DX200-12B-1 18.8KW" // ID 11
};

// ================================================================
// 4. HARDWARE TIMING & BITWISE RECONSTRUCTION
// ================================================================
void preTransmission() {
  digitalWrite(MAX485_RE_PIN, HIGH);
  digitalWrite(MAX485_DE_PIN, HIGH);
}

void postTransmission() {
  Serial2.flush();
  digitalWrite(MAX485_RE_PIN, LOW);
  digitalWrite(MAX485_DE_PIN, LOW);
}

bool readFloatCDAB(uint16_t address, float &outputVal) {
  uint8_t result = node.readHoldingRegisters(address, 2);
  
  if (result == node.ku8MBSuccess) {
    uint16_t word0 = node.getResponseBuffer(0);
    uint16_t word1 = node.getResponseBuffer(1);
    
    uint32_t raw = ((uint32_t)word1 << 16) | word0;
    memcpy(&outputVal, &raw, sizeof(outputVal));
    return true;
  }
  return false;
}

// ================================================================
// 5. CORE SYSTEM FUNCTIONS
// ================================================================
void checkWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) return;

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
    digitalWrite(STATUS_LED, HIGH);
    configTime(19800, 0, "pool.ntp.org"); 
  } else {
    digitalWrite(STATUS_LED, LOW);
  }
}

/* --- SD CARD FUNCTIONS TEMPORARILY DISABLED ---
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

void saveToSD(const String& payload) {
  if (!sdCardPresent) return;
  File dataFile = SD.open("/readings.jsonl", FILE_APPEND);
  if (dataFile) {
    dataFile.println(payload);
    dataFile.close();
    Serial.println("[SD] Successfully saved data locally.");
  } else {
    Serial.println("[SD] Error opening readings.jsonl");
    initSDCard(); 
  }
}
------------------------------------------------- */

bool transmitToBackend(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  const int maxRetries = 2;
  const int delaysMs[] = {1000, 2000};

  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    if (strlen(DEVICE_TOKEN) > 0) http.addHeader("X-Device-Token", DEVICE_TOKEN);
    
    int httpCode = http.POST(payload);
    if (httpCode == 200 || httpCode == 201) {
      Serial.printf("[HTTP] SUCCESS (HTTP %d)\n", httpCode);
      http.end();
      return true;
    } else {
      Serial.printf("[HTTP] FAILED (HTTP %d)\n", httpCode);
      http.end();
      if (attempt < maxRetries) delay(delaysMs[attempt - 1]);
    }
  }
  return false;
}

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
  Serial.println("  IEMAS - PRODUCTION FLEET GATEWAY");
  Serial.println("==============================================");

  Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  // initSDCard(); // Disabled
  checkWiFiConnection();
}

void loop() {
  checkWiFiConnection();

  unsigned long currentMillis = millis();
  if (currentMillis - lastCollectionTime >= COLLECTION_INTERVAL_MS) {
    lastCollectionTime = currentMillis;

    Serial.println("\n--- Polling 11 Multispan EM10-M1 Meters ---");

    for (uint8_t currentSlaveID = 1; currentSlaveID <= 11; currentSlaveID++) {
      
      node.begin(currentSlaveID, Serial2);
      const char* currentMeterName = METER_NAMES[currentSlaveID - 1];
      
      Serial.printf("\n[%s (ID: %d)] Requesting data...\n", currentMeterName, currentSlaveID);

      float energy = 0, pwr_l1 = 0, pwr_l2 = 0, pwr_l3 = 0, pwr_total = 0;
      bool success = false;

      // Extract all available line-wise and total parameters
      if (readFloatCDAB(REG_ACTIVE_ENERGY, energy)) success = true;
      delay(100);
      readFloatCDAB(REG_LINE1_POWER, pwr_l1);
      delay(100);
      readFloatCDAB(REG_LINE2_POWER, pwr_l2);
      delay(100);
      readFloatCDAB(REG_LINE3_POWER, pwr_l3);
      delay(100);
      readFloatCDAB(REG_TOTAL_POWER, pwr_total);

      if (success) {
        Serial.printf("  Active Energy: %.2f kWh\n", energy);
        Serial.printf("  Line 1 Power:  %.2f kW\n", pwr_l1);
        Serial.printf("  Line 2 Power:  %.2f kW\n", pwr_l2);
        Serial.printf("  Line 3 Power:  %.2f kW\n", pwr_l3);
        Serial.printf("  Total Power:   %.2f kW\n", pwr_total);

        StaticJsonDocument<1024> doc;
        
        // Exact name and location applied to the payload
        doc["meter_id"]          = currentMeterName;
        doc["name"]              = currentMeterName;
        doc["location"]          = "Shopfloor Panel";
        
        // Telemetry mapping
        doc["cumulative_energy"] = isnan(energy) ? 0 : energy;
        doc["line1_power"]       = isnan(pwr_l1) ? 0 : pwr_l1;
        doc["line2_power"]       = isnan(pwr_l2) ? 0 : pwr_l2;
        doc["line3_power"]       = isnan(pwr_l3) ? 0 : pwr_l3;
        doc["active_power"]      = isnan(pwr_total) ? 0 : pwr_total;
        
        // Zero out missing Schneider schema parameters to satisfy the backend
        doc["current_r"]         = 0;
        doc["current_y"]         = 0;
        doc["current_b"]         = 0;
        doc["current_avg"]       = 0;
        
        doc["voltage_ry"]        = 0;
        doc["voltage_yb"]        = 0;
        doc["voltage_br"]        = 0;
        doc["voltage_ll_avg"]    = 0;
        
        doc["voltage_rn"]        = 0;
        doc["voltage_yn"]        = 0;
        doc["voltage_bn"]        = 0;
        doc["voltage_ln_avg"]    = 0;
        
        doc["reactive_power"]    = 0;
        doc["apparent_power"]    = 0;
        doc["power_factor"]      = 0;
        doc["frequency"]         = 0;
        
        // System Metadata
        doc["firmware_version"]  = "1.3.0-Production";
        doc["uptime_seconds"]    = millis() / 1000;
        doc["wifi_rssi"]         = WiFi.RSSI();

        struct tm timeinfo;
        if (getLocalTime(&timeinfo, 100)) {
          char timeStringBuff[35];
          strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%S+05:30", &timeinfo);
          doc["timestamp"] = timeStringBuff;
        }

        String jsonPayload;
        serializeJson(doc, jsonPayload);

        // saveToSD(jsonPayload); // Disabled
        transmitToBackend(jsonPayload);
      } else {
        Serial.printf("  [ERROR] %s (ID: %d) is offline or Modbus Timeout.\n", currentMeterName, currentSlaveID);
      }

      delay(500); 
    }
    Serial.println("=============================================");
  }
  delay(50);
}