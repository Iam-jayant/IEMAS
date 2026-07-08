-- Migration: Add wifi_rssi column to meter_readings table
-- Date: 2024
-- Description: Adds WiFi signal strength (RSSI) field to support ESP32 device monitoring (Requirement 10.6)

-- Add wifi_rssi column to meter_readings table
ALTER TABLE meter_readings 
ADD COLUMN IF NOT EXISTS wifi_rssi INTEGER CHECK (wifi_rssi >= -100 AND wifi_rssi <= 0);

COMMENT ON COLUMN meter_readings.wifi_rssi IS 'WiFi signal strength in dBm (-100 to 0), transmitted by ESP32 device';
