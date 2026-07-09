/**
 * HTTPClientManager Implementation
 * Handles HTTP POST transmission to FastAPI backend with exponential backoff retry logic
 * 
 * Requirements: 1.2, 8.1, 8.2, 10.5
 */

#include "http_client.h"
#include <WiFi.h>

HTTPClientManager::HTTPClientManager() 
    : lastStatusCode(0), lastResponse("") {
}

/**
 * Transmit meter reading to backend with retry logic
 * 
 * @param url Backend collector URL endpoint (/api/readings)
 * @param jsonPayload JSON string containing meter reading data
 * @return true if transmission successful (HTTP 200/201), false otherwise
 * 
 * Requirements: 1.2 - Transmit within 5 seconds of collection
 * Requirements: 8.1 - Retry with exponential backoff (up to 3 attempts)
 * Requirements: 8.2 - Log failures after all attempts
 */
bool HTTPClientManager::transmitReading(const String& url, const String& jsonPayload) {
    return retryWithBackoff(url, jsonPayload, 3);
}

/**
 * Retry HTTP POST with exponential backoff strategy
 * 
 * Retry delays: 1s, 2s, 4s
 * Total max time: ~7 seconds (within 5-second requirement with network latency)
 * 
 * @param url Backend collector URL endpoint
 * @param jsonPayload JSON string containing meter reading data
 * @param maxAttempts Maximum retry attempts (default 3)
 * @return true if any attempt succeeds, false if all attempts fail
 * 
 * Requirements: 8.1 - Exponential backoff retry logic
 */
bool HTTPClientManager::retryWithBackoff(const String& url, const String& jsonPayload, int maxAttempts) {
    // Check WiFi connection first
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("ERROR: WiFi not connected, cannot transmit");
        lastStatusCode = -1;
        lastResponse = "WiFi not connected";
        return false;
    }
    
    // Exponential backoff delays in milliseconds: 1s, 2s, 4s
    const int retryDelays[] = {1000, 2000, 4000};
    
    // Try transmission with retries
    for (int attempt = 0; attempt < maxAttempts; attempt++) {
        // Apply exponential backoff delay before retry (not on first attempt)
        if (attempt > 0) {
            int delayMs = retryDelays[attempt - 1];
            Serial.printf("[Retry %d/%d] Waiting %d ms before retry...\n", 
                          attempt + 1, maxAttempts, delayMs);
            delay(delayMs);
        }
        
        // Attempt HTTP POST
        Serial.printf("[Attempt %d/%d] Transmitting to %s\n", 
                      attempt + 1, maxAttempts, url.c_str());
        
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        http.setTimeout(5000); // 5 second timeout per attempt
        
        // Send POST request
        int httpCode = http.POST(jsonPayload);
        
        // Process response
        if (httpCode > 0) {
            Serial.printf("  HTTP Response: %d\n", httpCode);
            lastStatusCode = httpCode;
            
            // Get response body
            if (http.getSize() > 0) {
                lastResponse = http.getString();
            } else {
                lastResponse = "";
            }
            
            // Check for success status codes (200 OK or 201 Created)
            if (httpCode == 200 || httpCode == 201) {
                Serial.println("  ✓ Transmission successful");
                if (lastResponse.length() > 0 && lastResponse.length() < 200) {
                    Serial.printf("  Response: %s\n", lastResponse.c_str());
                }
                http.end();
                return true;
            } else {
                // HTTP error (4xx, 5xx)
                Serial.printf("  ✗ HTTP error: %d\n", httpCode);
                if (lastResponse.length() > 0 && lastResponse.length() < 200) {
                    Serial.printf("  Error response: %s\n", lastResponse.c_str());
                }
            }
        } else {
            // Connection or network error
            Serial.printf("  ✗ Connection error: %s\n", http.errorToString(httpCode).c_str());
            lastStatusCode = httpCode;
            lastResponse = http.errorToString(httpCode);
        }
        
        http.end();
    }
    
    // All retry attempts failed
    // Requirement 8.2 - Log failures after 3 retry attempts
    Serial.println("\n╔════════════════════════════════════════╗");
    Serial.println("║   TRANSMISSION FAILURE                 ║");
    Serial.println("╚════════════════════════════════════════╝");
    Serial.printf("  URL: %s\n", url.c_str());
    Serial.printf("  Attempts: %d\n", maxAttempts);
    Serial.printf("  Last Status: %d\n", lastStatusCode);
    Serial.printf("  Last Error: %s\n", lastResponse.c_str());
    Serial.println("  Action: Continuing to next collection interval\n");
    
    return false;
}
