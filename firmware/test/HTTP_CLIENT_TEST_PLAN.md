# HTTPClientManager Test Plan

## Overview
This document outlines the test plan for validating the HTTPClientManager implementation (Task 10.3).

## Test Environment Setup

### Hardware Requirements
- ESP32 development board
- USB cable for serial monitoring and power
- WiFi network access

### Software Requirements
- PlatformIO or Arduino IDE
- Serial monitor (115200 baud)
- FastAPI backend running and accessible
- Mock HTTP server (optional for failure testing)

## Test Cases

### TC1: Successful Transmission (Happy Path)
**Objective**: Verify successful transmission on first attempt

**Preconditions**:
- ESP32 connected to WiFi
- Backend server running and accessible
- Valid meter reading data available

**Test Steps**:
1. Construct valid JSON payload with meter reading
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Monitor serial output

**Expected Results**:
- HTTP POST sent to backend
- HTTP 200 or 201 response received
- Method returns `true`
- Serial output shows: "[Attempt 1/3] Transmitting to..."
- Serial output shows: "✓ Transmission successful"
- No retry attempts made

**Requirements Validated**: 1.2, 10.5

---

### TC2: Retry Logic - Success on Second Attempt
**Objective**: Verify exponential backoff retry succeeds on second attempt

**Preconditions**:
- ESP32 connected to WiFi
- Backend server temporarily unavailable on first attempt, available on second

**Test Steps**:
1. Configure backend to reject first request (return 503)
2. Configure backend to accept second request (return 201)
3. Call `httpClient.transmitReading(url, jsonPayload)`
4. Monitor serial output and timing

**Expected Results**:
- First attempt fails with HTTP 503
- 1-second delay before second attempt
- Second attempt succeeds with HTTP 201
- Method returns `true`
- Total time: ~1-2 seconds
- Serial shows: "[Retry 2/3] Waiting 1000 ms before retry..."

**Requirements Validated**: 8.1 (exponential backoff)

---

### TC3: Retry Logic - Success on Third Attempt
**Objective**: Verify all three retry attempts execute correctly

**Preconditions**:
- ESP32 connected to WiFi
- Backend fails first two attempts, succeeds on third

**Test Steps**:
1. Configure backend to fail first two requests
2. Configure backend to succeed on third request
3. Call `httpClient.transmitReading(url, jsonPayload)`
4. Measure timing between attempts

**Expected Results**:
- First attempt fails
- 1-second delay before second attempt
- Second attempt fails
- 2-second delay before third attempt
- Third attempt succeeds
- Method returns `true`
- Total time: ~3-4 seconds (1s + 2s + network time)
- Serial shows exponential backoff: 1000ms, 2000ms

**Requirements Validated**: 8.1 (exponential backoff sequence)

---

### TC4: Complete Failure - All Attempts Exhausted
**Objective**: Verify proper failure logging after all retries fail

**Preconditions**:
- ESP32 connected to WiFi
- Backend unreachable or returning errors for all attempts

**Test Steps**:
1. Set backend URL to unreachable address or configure to fail all requests
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Monitor serial output

**Expected Results**:
- Three transmission attempts made
- Delays of 1s and 2s between attempts
- Comprehensive failure log displayed:
  ```
  ╔════════════════════════════════════════╗
  ║   TRANSMISSION FAILURE                 ║
  ╚════════════════════════════════════════╝
    URL: http://...
    Attempts: 3
    Last Status: [error code]
    Last Error: [error message]
    Action: Continuing to next collection interval
  ```
- Method returns `false`
- Total time: ~7 seconds (1s + 2s + 4s + network attempts)

**Requirements Validated**: 8.1, 8.2 (failure logging)

---

### TC5: WiFi Disconnection
**Objective**: Verify graceful handling when WiFi is disconnected

**Preconditions**:
- ESP32 WiFi disconnected

**Test Steps**:
1. Disconnect ESP32 from WiFi
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Monitor serial output

**Expected Results**:
- Method returns `false` immediately
- No retry attempts made
- Serial output: "ERROR: WiFi not connected, cannot transmit"
- lastStatusCode = -1
- lastResponse = "WiFi not connected"

**Requirements Validated**: 8.1 (connection resilience)

---

### TC6: HTTP 4xx Error (Bad Request)
**Objective**: Verify handling of client errors (validation failures)

**Preconditions**:
- ESP32 connected to WiFi
- Backend returns HTTP 400 Bad Request (e.g., invalid meter_id)

**Test Steps**:
1. Configure payload with invalid meter ID
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Monitor serial output

**Expected Results**:
- All three attempts return HTTP 400
- Exponential backoff delays applied
- Error response body logged (validation error message)
- Method returns `false`
- Failure log displayed after 3 attempts

**Requirements Validated**: 8.1, 8.2

---

### TC7: HTTP 5xx Error (Server Error)
**Objective**: Verify handling of server-side errors

**Preconditions**:
- ESP32 connected to WiFi
- Backend returns HTTP 500 Internal Server Error

**Test Steps**:
1. Configure backend to return HTTP 500
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Monitor serial output

**Expected Results**:
- All three attempts return HTTP 500
- Exponential backoff delays applied
- Method returns `false`
- Failure log displayed

**Requirements Validated**: 8.1, 8.2

---

### TC8: Network Timeout
**Objective**: Verify HTTP timeout handling

**Preconditions**:
- ESP32 connected to WiFi
- Backend configured with deliberate delay > 5 seconds

**Test Steps**:
1. Configure backend to delay response > 5 seconds
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Monitor timing and serial output

**Expected Results**:
- Each attempt times out after 5 seconds
- Retry logic triggers with exponential backoff
- Method returns `false` after 3 timeouts
- Total time: ~15+ seconds (3 × 5s timeouts + delays)

**Requirements Validated**: 1.2 (5-second timeout), 8.1

---

### TC9: Malformed JSON Response
**Objective**: Verify handling of unexpected response format

**Preconditions**:
- ESP32 connected to WiFi
- Backend returns HTTP 201 but with malformed JSON

**Test Steps**:
1. Configure backend to return invalid JSON
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Monitor serial output

**Expected Results**:
- HTTP 201 status code received
- Method returns `true` (transmission successful)
- Response body logged even if malformed
- HTTPClientManager doesn't parse response (that's caller's responsibility)

**Requirements Validated**: 1.2

---

### TC10: Large Response Body
**Objective**: Verify handling of large response bodies

**Preconditions**:
- ESP32 connected to WiFi
- Backend returns HTTP 201 with large response body (> 200 chars)

**Test Steps**:
1. Configure backend to return large response
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Monitor serial output

**Expected Results**:
- HTTP 201 received
- Method returns `true`
- Response body truncated in logs (only displays if < 200 chars)
- Full response available via `getLastResponse()`

**Requirements Validated**: 1.2

---

### TC11: Firmware Version and Uptime Reporting
**Objective**: Verify firmware metadata is included in payload

**Preconditions**:
- ESP32 connected to WiFi
- Backend running and logging requests

**Test Steps**:
1. Construct JSON payload (in main.cpp) with firmware_version and uptime_seconds
2. Call `httpClient.transmitReading(url, jsonPayload)`
3. Check backend logs for received data

**Expected Results**:
- Payload includes `firmware_version`: "1.0.0"
- Payload includes `uptime_seconds`: [current uptime]
- Backend successfully receives and stores these fields

**Requirements Validated**: 10.5

---

### TC12: Rapid Sequential Transmissions
**Objective**: Verify HTTPClientManager can handle multiple sequential calls

**Preconditions**:
- ESP32 connected to WiFi
- Backend running

**Test Steps**:
1. Call `httpClient.transmitReading()` multiple times in quick succession
2. Monitor for memory leaks or resource issues
3. Verify each transmission completes independently

**Expected Results**:
- All transmissions succeed
- No memory leaks
- HTTP connections properly closed after each transmission
- lastStatusCode and lastResponse updated correctly for each call

**Requirements Validated**: General robustness

---

### TC13: Concurrent WiFi and HTTP Operations
**Objective**: Verify HTTPClientManager works during WiFi events

**Preconditions**:
- ESP32 connected to WiFi
- Simulate WiFi reconnection during transmission

**Test Steps**:
1. Start transmission
2. Briefly disconnect and reconnect WiFi during retry
3. Monitor behavior

**Expected Results**:
- Transmission fails if WiFi disconnected during attempt
- Next retry succeeds if WiFi reconnected
- No crashes or undefined behavior

**Requirements Validated**: 8.1, 8.3

---

## Performance Benchmarks

### Timing Requirements
| Scenario | Max Time | Actual Time | Pass/Fail |
|----------|----------|-------------|-----------|
| Successful first attempt | 5s | ___ s | ___ |
| Success after 1 retry | 6s | ___ s | ___ |
| Success after 2 retries | 8s | ___ s | ___ |
| Complete failure (3 attempts) | 10s | ___ s | ___ |

### Memory Usage
- Measure heap usage before and after transmissions
- Verify no memory leaks after 100 transmissions
- Monitor stack usage during retry logic

---

## Integration Testing

### With MeterDataCollector
1. Verify main.cpp correctly constructs JSON payload
2. Verify httpClient.transmitReading() called after successful Modbus read
3. Verify LED indicator updates based on transmission result

### With LEDIndicator
1. Verify LED set to connected on successful transmission
2. Verify LED set to disconnected on failed transmission

### With Backend API
1. Verify backend receives correct JSON format
2. Verify backend validates and stores readings
3. Verify backend returns appropriate status codes

---

## Test Execution Checklist

- [ ] TC1: Successful transmission
- [ ] TC2: Retry - success on second attempt
- [ ] TC3: Retry - success on third attempt
- [ ] TC4: Complete failure logging
- [ ] TC5: WiFi disconnection handling
- [ ] TC6: HTTP 4xx error handling
- [ ] TC7: HTTP 5xx error handling
- [ ] TC8: Network timeout handling
- [ ] TC9: Malformed response handling
- [ ] TC10: Large response handling
- [ ] TC11: Firmware metadata verification
- [ ] TC12: Sequential transmissions
- [ ] TC13: Concurrent WiFi operations
- [ ] Performance benchmarks
- [ ] Integration testing

---

## Test Result Documentation

### Test Execution Date: ___________
### Tester: ___________
### Firmware Version: ___________
### Backend Version: ___________

### Overall Results
- Total Test Cases: 13
- Passed: _____
- Failed: _____
- Blocked: _____

### Issues Found
| Issue ID | Description | Severity | Status |
|----------|-------------|----------|--------|
| | | | |

### Sign-off
- [ ] All critical tests passed
- [ ] No blocking issues
- [ ] Ready for integration with remaining firmware components (Task 10.4, 10.5)

**Tester Signature**: _______________  
**Date**: _______________
