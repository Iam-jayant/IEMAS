# ESP32 Firmware

This directory contains the ESP32 firmware for the IEMAS project.

## Overview

The ESP32 firmware is responsible for:
- Reading electrical parameters from Schneider Energy Meters via Modbus RTU/TCP
- Transmitting meter readings to the FastAPI backend via HTTP POST
- Handling communication failures with retry logic
- Indicating connection status via onboard LED

## Project Structure

```
firmware/
├── platformio.ini          # PlatformIO configuration
├── src/
│   └── main.cpp           # Main application code
├── include/
│   ├── config.h           # Configuration manager
│   ├── modbus_client.h    # Modbus communication
│   ├── http_client.h      # HTTP client with retry
│   └── led_indicator.h    # LED status indicator
├── lib/                   # Custom libraries (if needed)
├── data/
│   └── config.json       # Configuration file template
└── test/                  # Unit tests
```

## Getting Started

### Prerequisites

1. Install [PlatformIO IDE](https://platformio.org/install/ide?install=vscode) for VS Code
2. Install ESP32 USB driver (CP210x or CH340)

### Configuration

1. Edit `data/config.json` with your settings:
   - `meter_id`: Unique identifier for this meter
   - `collector_url`: URL of the FastAPI backend endpoint
   - `collection_interval`: Reading interval in seconds (60-120 recommended)
   - `wifi.ssid`: WiFi network name
   - `wifi.password`: WiFi password
   - `modbus`: Modbus configuration (RTU or TCP)

2. Upload filesystem with configuration:
   ```bash
   pio run --target uploadfs
   ```

### Building and Uploading

1. Build the project:
   ```bash
   pio run
   ```

2. Upload to ESP32:
   ```bash
   pio run --target upload
   ```

3. Monitor serial output:
   ```bash
   pio device monitor
   ```

## Hardware Setup

### Modbus RTU (RS485)

Connect MAX485 or similar RS485 transceiver to ESP32:

```
ESP32          MAX485
-----          ------
GPIO16 (RX)    RO
GPIO17 (TX)    DI
GPIO4          DE/RE
GND            GND
3.3V           VCC

MAX485         Schneider Meter
------         ---------------
A              A/+
B              B/-
```

### Modbus TCP

No additional hardware needed - connect ESP32 to the same network as the Schneider meter.

### LED Indicator

- **Solid LED**: Connected and transmitting data
- **Blinking LED**: Disconnected or communication failure

## Features

- ✅ WiFi connectivity with automatic reconnection
- ✅ NTP time synchronization
- ✅ Modbus RTU/TCP support
- ✅ HTTP POST with exponential backoff retry (3 attempts)
- ✅ LED status indicator
- ✅ Firmware version and uptime reporting
- ✅ Configuration via JSON file
- ✅ Serial debug logging

## Dependencies

Library dependencies are automatically managed by PlatformIO. See `platformio.ini` for the complete list.

## Troubleshooting

### WiFi Connection Failed
- Check WiFi credentials in `config.json`
- Ensure 2.4GHz WiFi network (ESP32 doesn't support 5GHz)
- Check signal strength

### Modbus Communication Failed
- Verify wiring and RS485 connections
- Check Modbus slave ID and baudrate
- Ensure meter is powered and responding
- Check register addresses match your meter model

### HTTP Transmission Failed
- Verify backend URL is correct and reachable
- Check firewall settings
- Ensure backend service is running
- Check API endpoint accepts POST requests

### Serial Monitor Not Working
- Install CH340 or CP210x USB driver
- Check COM port in `platformio.ini`
- Set correct baud rate (115200)

## Development

To implement the actual Modbus and HTTP functionality:

1. Implement `ConfigManager` in a new `.cpp` file
2. Implement `ModbusClient` with actual Modbus library calls
3. Implement `HTTPClientManager` with retry logic
4. Implement `LEDIndicator` LED control logic

Refer to the design document for detailed implementation specifications.

## License

Part of the IEMAS (Industrial Energy Monitoring & Analytics System) project.
