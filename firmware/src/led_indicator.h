/**
 * LEDIndicator - Visual status indication via onboard LED
 * 
 * Status indicators:
 * - Solid LED: Connected and transmitting successfully
 * - Blinking LED: Disconnected or transmission failures
 */

#ifndef LED_INDICATOR_H
#define LED_INDICATOR_H

#include <Arduino.h>

#define LED_PIN 2  // Built-in LED on most ESP32 boards

class LEDIndicator {
private:
    int pin;
    bool connected;
    unsigned long lastToggle;
    int blinkInterval;
    bool ledState;
    
public:
    LEDIndicator(int ledPin = LED_PIN);
    
    void begin();
    void setConnected();
    void setDisconnected();
    void update();  // Call in loop() to handle blinking
};

#endif
