/**
 * HTTP Client Manager Header
 * Handles HTTP POST transmission with retry logic
 */

#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <Arduino.h>
#include <HTTPClient.h>

class HTTPClientManager {
public:
    HTTPClientManager();
    
    bool transmitReading(const String& url, const String& jsonPayload);
    bool retryWithBackoff(const String& url, const String& jsonPayload, int maxAttempts = 3);
    
private:
    HTTPClient http;
    int lastStatusCode;
    String lastResponse;
};

#endif // HTTP_CLIENT_H
