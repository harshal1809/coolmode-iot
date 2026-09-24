/*
 =========================================================================================
  PROJECT: COOLMODE IoT Station
  DESCRIPTION: Formative Information on Temperature & Humidity, Smart LCD & LED Automation
  INSTITUTION: Government College Of Engineering Yavatmal (GCOEY)
  DEPARTMENT: Dept. of Electrical Engineering
  AUTHORS: JAYESH AND PRAKASH
 =========================================================================================

  HARDWARE PIN CONNECTIONS (NodeMCU / ESP8266):
  ---------------------------------------------------------------------------------------
  Component         ESP8266 Pin    GPIO Pin     Notes
  ---------------------------------------------------------------------------------------
  DHT11 Data Pin    D5             GPIO 14      Use 10k pull-up resistor to 3.3V if bare sensor
  LED Anode (+)     D6             GPIO 12      Cathode (-) to GND via 220-330 ohm resistor
  LCD 16x2 I2C SCL  D1             GPIO 5       Connect to I2C Backpack SCL (VCC to 5V/VIN)
  LCD 16x2 I2C SDA  D2             GPIO 4       Connect to I2C Backpack SDA (GND to GND)
  ---------------------------------------------------------------------------------------

  REQUIRED ARDUINO LIBRARIES:
  1. ESP8266WiFi (Included with ESP8266 Board Package)
  2. ESP8266HTTPClient (Included with ESP8266 Board Package)
  3. DHT sensor library by Adafruit (Install via Library Manager)
  4. Adafruit Unified Sensor by Adafruit (Dependency for DHT)
  5. LiquidCrystal_I2C by Frank de Brabander (Install via Library Manager)
  6. ArduinoJson by Benoit Blanchon (Version 6.x or 7.x, Install via Library Manager)
 =========================================================================================
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ==========================================
// 1. NETWORK & CREDENTIALS
// ==========================================
const char* WIFI_SSID     = "CoE Yavatmal";
const char* WIFI_PASSWORD = "shoaib845";

// ==========================================
// 2. BACKEND SERVER CONFIGURATION
// ==========================================
// For Local Testing: Use your laptop's local IP (e.g., "http://192.168.1.15:3000")
// For Render Cloud: Use your Render web service URL (e.g., "http://coolmode-iot.onrender.com" or https)
// NOTE: Make sure to include "http://" or "https://"
const char* SERVER_URL = "http://192.168.1.100:3000"; // REPLACE with your server IP or Render URL

// Device Sync Endpoint: POST /api/device/sync
String syncEndpoint = String(SERVER_URL) + "/api/device/sync";

// ==========================================
// 3. PIN DEFINITIONS
// ==========================================
#define DHTPIN  D5      // GPIO 14: DHT11 Sensor
#define DHTTYPE DHT11   // Sensor Model
#define LED_PIN D6      // GPIO 12: Digital Actuator / LED

// I2C LCD Configuration (Address 0x27 is standard; some modules use 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// Polling interval: exactly every 10 seconds
const unsigned long POLL_INTERVAL = 10000;
unsigned long lastPollTime = 0;

// Track last displayed LCD message to prevent screen flicker
String lastLine1 = "";
String lastLine2 = "";

// Helper to center or pad strings to 16 characters
String formatLcdLine(String text) {
  if (text.length() > 16) {
    return text.substring(0, 16);
  }
  while (text.length() < 16) {
    text += " ";
  }
  return text;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n=======================================================");
  Serial.println("  COOLMODE IoT - GCOE YAVATMAL ELECTRICAL DEPT");
  Serial.println("  Authors: JAYESH AND PRAKASH");
  Serial.println("=======================================================");

  // Initialize LED Pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize DHT11 Sensor
  dht.begin();

  // Initialize I2C LCD on D1 (SCL) and D2 (SDA)
  Wire.begin(D2, D1); // SDA = D2 (GPIO 4), SCL = D1 (GPIO 5)
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Welcome Boot Screen
  lcd.setCursor(0, 0);
  lcd.print("   COOLMODE   ");
  lcd.setCursor(0, 1);
  lcd.print("GCOE  YAVATMAL");
  delay(2000);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connecting");
  lcd.setCursor(0, 1);
  lcd.print("CoE Yavatmal...");

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected successfully!");
    Serial.print("Assigned IP: ");
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected! ");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println("\nWiFi connection failed! Running in offline fallback mode.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!    ");
    lcd.setCursor(0, 1);
    lcd.print("Local Mode Active");
    delay(2000);
  }

  lcd.clear();
}

void loop() {
  unsigned long currentMillis = millis();

  // Execute sync routine every 10 seconds
  if (currentMillis - lastPollTime >= POLL_INTERVAL || lastPollTime == 0) {
    lastPollTime = currentMillis;

    // 1. Read DHT11 Temperature & Humidity
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature(); // Celsius

    // Handle sensor read failure gracefully
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("[ERROR] Failed to read from DHT11 sensor! Checking connections...");
      temperature = 0.0;
      humidity = 0.0;
    } else {
      Serial.println("-------------------------------------------------------");
      Serial.printf("[SENSOR READ] Temp: %.1f °C  |  Humidity: %.1f %%\n", temperature, humidity);
    }

    // 2. Synchronize with COOLMODE Cloud Server
    if (WiFi.status() == WL_CONNECTED) {
      syncWithServer(temperature, humidity);
    } else {
      // Offline fallback: Reconnect & display local sensor reading on LCD
      Serial.println("[WARN] WiFi disconnected. Attempting reconnection...");
      WiFi.reconnect();

      // Show local sensor values on LCD
      char buf1[17];
      char buf2[17];
      snprintf(buf1, sizeof(buf1), "Temp: %.1f C", temperature);
      snprintf(buf2, sizeof(buf2), "Humidity: %.1f %%", humidity);
      updateLcd(String(buf1), String(buf2));
    }
  }
}

// Perform Cloud Sync (Sends DHT11 data, receives LED & LCD updates in single pulse)
void syncWithServer(float temp, float hum) {
  WiFiClient client;
  HTTPClient http;

  Serial.print("[HTTP] Connecting to: ");
  Serial.println(syncEndpoint);

  if (http.begin(client, syncEndpoint)) {
    http.addHeader("Content-Type", "application/json");

    // Build JSON Payload
    StaticJsonDocument<128> docOut;
    docOut["temperature"] = temp;
    docOut["humidity"] = hum;

    String requestBody;
    serializeJson(docOut, requestBody);

    // Send HTTP POST
    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode == HTTP_CODE_OK || httpResponseCode == 201) {
      String response = http.getString();
      Serial.print("[HTTP Response] ");
      Serial.println(response);

      // Parse Server Response
      StaticJsonDocument<384> docIn;
      DeserializationError error = deserializeJson(docIn, response);

      if (!error) {
        // Tab 3: Update LED state on Pin D6
        int ledState = docIn["led"] | 0;
        digitalWrite(LED_PIN, (ledState == 1) ? HIGH : LOW);
        Serial.printf("[LED ACTUATOR] State: %s (Pin D6)\n", (ledState == 1) ? "HIGH / ON" : "LOW / OFF");

        // Tab 2: Update Smart LCD 16x2
        const char* l1 = docIn["lcd_line1"] | "COOLMODE IoT";
        const char* l2 = docIn["lcd_line2"] | "System Ready";
        updateLcd(String(l1), String(l2));
      } else {
        Serial.print("[JSON ERROR] Parsing failed: ");
        Serial.println(error.f_str());
      }
    } else {
      Serial.printf("[HTTP ERROR] POST failed with code: %d\n", httpResponseCode);
      // Display error on LCD
      updateLcd("Server Sync Err", "Code: " + String(httpResponseCode));
    }

    http.end();
  } else {
    Serial.println("[HTTP ERROR] Unable to initiate HTTP connection.");
  }
}

// Update LCD screen with anti-flicker check
void updateLcd(String line1, String line2) {
  line1 = formatLcdLine(line1);
  line2 = formatLcdLine(line2);

  if (line1 != lastLine1 || line2 != lastLine2) {
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);

    lastLine1 = line1;
    lastLine2 = line2;
    Serial.println("[LCD UPDATE]");
    Serial.println("  Line 1: [" + line1 + "]");
    Serial.println("  Line 2: [" + line2 + "]");
  }
}
