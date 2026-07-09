/**
 * LEDIndicator Implementation
 */

#include "led_indicator.h"

LEDIndicator::LEDIndicator(int ledPin) {
    pin = ledPin;
    connected = false;
    lastToggle = 0;
    blinkInterval = 500;  // 500ms blink interval
    ledState = false;
}

void LEDIndicator::begin() {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
    Serial.print("LED indicator initialized on pin ");
    Serial.println(pin);
}

void LEDIndicator::setConnected() {
    connected = true;
    digitalWrite(pin, HIGH);  // Solid LED on
    ledState = true;
    Serial.println("LED: Connected status (solid)");
}

void LEDIndicator::setDisconnected() {
    connected = false;
    Serial.println("LED: Disconnected status (blinking)");
}

void LEDIndicator::update() {
    if (!connected) {
        // Blink LED when disconnected
        unsigned long currentMillis = millis();
        if (currentMillis - lastToggle >= blinkInterval) {
            lastToggle = currentMillis;
            ledState = !ledState;
            digitalWrite(pin, ledState ? HIGH : LOW);
        }
    }
    // If connected, LED stays solid (no update needed)
}
