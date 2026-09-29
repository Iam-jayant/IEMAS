#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ModbusMaster.h>
#include <time.h>
#include <SPI.h>
#include <SD.h>

const char* WIFI_SSID     = "pattagobi";
const char* WIFI_PASSWORD = "12345@678";

// Backend URL
const char* BACKEND_URL   = "https://iemas.onrender.com/api/readings";
const char* METER_ID      = "CNC DX 250";
const char* DEVICE_TOKEN  = ""; 

const unsigned long COLLECTION_INTERVAL_MS = 10000;

// ================================================================
// 2. HARDWARE PIN DEFINITIONS
// ================================================================
#define RX_PIN          16
#define TX_PIN          17
#define MAX485_RE_PIN   4
#define MAX485_DE_PIN   2
#define SLAVE_ID        3

// FIXED: Moved from Pin 2 to Pin 33 to prevent RS485 line crashes
#define STATUS_LED      33   
#define SD_CS_PIN       5

// ================================================================
// 3. SCHNEIDER EM6436H MODBUS HOLDING REGISTERS
// ================================================================
// CURRENTS
#define REG_CURRENT_R         2999  // Current Phase 1 (R)
#define REG_CURRENT_Y         3001  // Current Phase 2 (Y)
#define REG_CURRENT_B         3003  // Current Phase 3 (B)
#define REG_CURRENT_AVG       3009  // Average Current

// VOLTAGES (LINE-TO-LINE)
#define REG_VOLTAGE_RY        3019  // Voltage R-Y
#define REG_VOLTAGE_YB        3021  // Voltage Y-B
#define REG_VOLTAGE_BR        3023  // Voltage B-R
#define REG_VOLTAGE_LL_AVG    3025  // Average L-L Voltage

// VOLTAGES (LINE-TO-NEUTRAL)
#define REG_VOLTAGE_RN        3027  // Voltage R-N
#define REG_VOLTAGE_YN        3029  // Voltage Y-N
#define REG_VOLTAGE_BN        3031  // Voltage B-N
#define REG_VOLTAGE_LN_AVG    3035  // Average L-N Voltage

// POWER & ENERGY
#define REG_ACTIVE_POWER      3059  // Total Active Power (kW)
#define REG_REACTIVE_POWER    3067  // Total Reactive Power (kVAR)
#define REG_APPARENT_POWER    3075  // Total Apparent Power (kVA)
#define REG_POWER_FACTOR      3083  // Total Power Factor
#define REG_FREQUENCY         3109  // Frequency (Hz)
#define REG_ACTIVE_ENERGY     2699  // Active Energy Delivered (kWh)

ModbusMaster node;
unsigned long lastCollectionTime = 0;
bool sdCardPresent = false;

void preTransmission() {
  digitalWrite(MAX485_RE_PIN, HIGH);
  digitalWrite(MAX485_DE_PIN, HIGH);
}

void postTransmission() {
  digitalWrite(MAX485_RE_PIN, LOW);
  digitalWrite(MAX485_DE_PIN, LOW);
}

float getFloat(uint16_t highWord, uint16_t lowWord) {
  uint32_t raw = ((uint32_t)highWord << 16) | lowWord;
  float value;
  memcpy(&value, &raw, sizeof(value));
  return value;
}

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
    configTime(19800, 0, "pool.ntp.org"); // IST Time
  } else {
    digitalWrite(STATUS_LED, LOW);
  }
}

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
  Serial.println("  IEMAS - EM6436H Full Parameter Gateway");
  Serial.println("==============================================");

  Serial2.begin(9600, SERIAL_8E1, RX_PIN, TX_PIN);
  node.begin(SLAVE_ID, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  initSDCard();
  checkWiFiConnection();
}

void loop() {
  checkWiFiConnection();

  unsigned long currentMillis = millis();
  if (currentMillis - lastCollectionTime >= COLLECTION_INTERVAL_MS) {
    lastCollectionTime = currentMillis;

    Serial.println("\n--- Polling All EM6436H Parameters ---");

    // Initialize all 17 variables
    float c_r = 0, c_y = 0, c_b = 0, c_avg = 0;
    float v_ry = 0, v_yb = 0, v_br = 0, v_ll_avg = 0;
    float v_rn = 0, v_yn = 0, v_bn = 0, v_ln_avg = 0;
    float act_pwr = 0, react_pwr = 0, app_pwr = 0, pwr_fact = 1, freq = 50, energy = 0;

    // Read Currents
    readRegisterFloat(REG_CURRENT_R, c_r);
    readRegisterFloat(REG_CURRENT_Y, c_y);
    readRegisterFloat(REG_CURRENT_B, c_b);
    readRegisterFloat(REG_CURRENT_AVG, c_avg);

    // Read Voltages (L-L)
    readRegisterFloat(REG_VOLTAGE_RY, v_ry);
    readRegisterFloat(REG_VOLTAGE_YB, v_yb);
    readRegisterFloat(REG_VOLTAGE_BR, v_br);
    readRegisterFloat(REG_VOLTAGE_LL_AVG, v_ll_avg);

    // Read Voltages (L-N)
    readRegisterFloat(REG_VOLTAGE_RN, v_rn);
    readRegisterFloat(REG_VOLTAGE_YN, v_yn);
    readRegisterFloat(REG_VOLTAGE_BN, v_bn);
    readRegisterFloat(REG_VOLTAGE_LN_AVG, v_ln_avg);

    // Read Power & Energy
    readRegisterFloat(REG_ACTIVE_POWER, act_pwr);
    readRegisterFloat(REG_REACTIVE_POWER, react_pwr);
    readRegisterFloat(REG_APPARENT_POWER, app_pwr);
    readRegisterFloat(REG_POWER_FACTOR, pwr_fact);
    readRegisterFloat(REG_FREQUENCY, freq);
    readRegisterFloat(REG_ACTIVE_ENERGY, energy);

    // Print to Serial
    Serial.printf("  Current (R/Y/B/Avg):  %.2f / %.2f / %.2f / %.2f A\n", c_r, c_y, c_b, c_avg);
    Serial.printf("  Voltage L-L (Avg):    %.2f V\n", v_ll_avg);
    Serial.printf("  Voltage L-N (Avg):    %.2f V\n", v_ln_avg);
    Serial.printf("  Active Power:         %.2f kW\n", act_pwr);
    Serial.printf("  Active Energy:        %.2f kWh\n", energy);

    // INCREASED BUFFER SIZE to hold all new parameters safely
    StaticJsonDocument<1024> doc;
    doc["meter_id"]          = METER_ID;
    
    // Currents
    doc["current_r"]         = isnan(c_r) ? 0 : c_r;
    doc["current_y"]         = isnan(c_y) ? 0 : c_y;
    doc["current_b"]         = isnan(c_b) ? 0 : c_b;
    doc["current_avg"]       = isnan(c_avg) ? 0 : c_avg;
    
    // Voltages Line-to-Line
    doc["voltage_ry"]        = isnan(v_ry) ? 0 : v_ry;
    doc["voltage_yb"]        = isnan(v_yb) ? 0 : v_yb;
    doc["voltage_br"]        = isnan(v_br) ? 0 : v_br;
    doc["voltage_ll_avg"]    = isnan(v_ll_avg) ? 0 : v_ll_avg;
    
    // Voltages Line-to-Neutral
    doc["voltage_rn"]        = isnan(v_rn) ? 0 : v_rn;
    doc["voltage_yn"]        = isnan(v_yn) ? 0 : v_yn;
    doc["voltage_bn"]        = isnan(v_bn) ? 0 : v_bn;
    doc["voltage_ln_avg"]    = isnan(v_ln_avg) ? 0 : v_ln_avg;
    
    // Power & Energy
    doc["active_power"]      = isnan(act_pwr) ? 0 : act_pwr;
    doc["reactive_power"]    = isnan(react_pwr) ? 0 : react_pwr;
    doc["apparent_power"]    = isnan(app_pwr) ? 0 : app_pwr;
    doc["power_factor"]      = isnan(pwr_fact) ? 1.0 : pwr_fact;
    doc["frequency"]         = isnan(freq) ? 50.0 : freq;
    doc["cumulative_energy"] = isnan(energy) ? 0 : energy;
    
    // System Metadata
    doc["firmware_version"]  = "1.1.0-EM6436H";
    doc["uptime_seconds"]    = millis() / 1000;
    doc["wifi_rssi"]         = WiFi.RSSI();

    // Timestamp
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 100)) {
      char timeStringBuff[35];
      strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%S+05:30", &timeinfo);
      doc["timestamp"] = timeStringBuff;
    }

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    saveToSD(jsonPayload);

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