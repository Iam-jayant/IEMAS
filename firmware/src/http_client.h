/**
 * HTTPClientManager - Handles HTTP communication with FastAPI backend
 * 
 * Features:
 * - POST meter readings to /api/readings endpoint
 * - Exponential backoff retry logic (1s, 2s, 4s delays)
 * - Connection error handling and failure logging
 * - Requirement 1.2: Transmit readings within 5 seconds of collection
 * - Requirement 8.1: Retry transmission with exponential backoff (up to 3 attempts)
 * - Requirement 8.2: Log failures after all retry attempts
 * - Requirement 10.5: Report firmware version and uptime with each reading
 */

#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <Arduino.h>
#include <HTTPClient.h>

class HTTPClientManager {
public:
    HTTPClientManager();
    
    /**
     * Transmit meter reading to backend with automatic retry logic
     * @param url Backend collector URL endpoint (/api/readings)
     * @param jsonPayload JSON string containing meter reading data
     * @return true if transmission successful (HTTP 200/201), false otherwise
     */
    bool transmitReading(const String& url, const String& jsonPayload);
    
    /**
     * Retry HTTP POST with exponential backoff strategy
     * Retry delays: 1s, 2s, 4s (exponential backoff)
     * @param url Backend collector URL endpoint
     * @param jsonPayload JSON string containing meter reading data
     * @param maxAttempts Maximum retry attempts (default 3)
     * @return true if any attempt succeeds, false if all attempts fail
     */
    bool retryWithBackoff(const String& url, const String& jsonPayload, int maxAttempts = 3);
    
    /**
     * Get last HTTP status code from transmission attempt
     * @return HTTP status code or negative value for connection errors
     */
    int getLastStatusCode() const { return lastStatusCode; }
    
    /**
     * Get last response body or error message
     * @return Response string from backend or error description
     */
    String getLastResponse() const { return lastResponse; }
    
private:
    HTTPClient http;
    int lastStatusCode;
    String lastResponse;
};

#endif // HTTP_CLIENT_H
