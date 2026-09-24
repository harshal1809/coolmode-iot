# COOLMODE - IoT Environment Monitoring & Automation

> **Formative Information on Temperature and Humidity**  
> **Designed and Developed by JAYESH AND PRAKASH**  
> *Dept. of Electrical Engineering, Government College Of Engineering Yavatmal (GCOEY)*

---

## 📌 Project Overview
**COOLMODE** is an end-to-end IoT platform featuring real-time environmental telemetry, dynamic actuator automation, and smart physical display synchronization.

- **Frontend**: Clean HTML5 & Tailwind CSS, responsive dark/light mode toggle with dual-button structure, circular SVG gauges, dynamic range seek bars, 16x2 LCD hardware twin simulator, glowing diode actuators, and Chart.js trend graphs.
- **Backend**: Node.js & Express RESTful API with SQLite database (`data/coolmode.db`).
- **Hardware**: ESP8266 (NodeMCU / Wemos D1), DHT11 sensor, LED indicator, and 16x2 I2C LCD.
- **Cloud Deployment**: **Render** ready (`render.yaml` and npm start scripts).
- **Timezone**: Strict **Asia/Kolkata (+05:30 IST)** timestamping.

---

## 🔌 Hardware Circuit & Wiring Diagram

The physical model pinout for ESP8266 NodeMCU:

| Component | Pin on ESP8266 | GPIO | Connection Details |
|---|---|---|---|
| **DHT11 Sensor** | **D5** | GPIO 14 | VCC to 3.3V, GND to GND, DATA to D5 |
| **LED Actuator** | **D6** | GPIO 12 | Anode (+) to D6, Cathode (-) to GND via 220Ω-330Ω resistor |
| **LCD 16x2 I2C** | **D1 (SCL)** | GPIO 5 | SCL to D1, VCC to 5V (VIN), GND to GND |
| **LCD 16x2 I2C** | **D2 (SDA)** | GPIO 4 | SDA to D2, VCC to 5V (VIN), GND to GND |

### WiFi Credentials Configured in Firmware
- **WiFi SSID**: `CoE Yavatmal`
- **WiFi Password**: `shoaib845`

---

## 📁 Repository Structure

```text
IOT_PROJECT/
├── package.json               # Node.js dependencies & Render start scripts
├── server.js                  # Express backend API & static asset server
├── database.js                # SQLite database configuration & Asia/Kolkata formatter
├── render.yaml                # Render Blueprint infrastructure specification
├── .gitignore                 # Standard Node.js & SQLite ignore rules
├── public/
│   ├── index.html             # Login & Registration page (Dual Theme Switcher)
│   ├── dashboard.html         # Main COOLMODE 3-Tab Dashboard
│   ├── css/
│   │   └── custom.css         # Glassmorphism, 16x2 LCD matrix font, LED glows
│   └── js/
│       ├── auth.js            # Authentication logic & token management
│       └── dashboard.js       # Gauge math, seek bars, pagination, Chart.js, tabs
└── firmware/
    └── esp8266_coolmode/
        └── esp8266_coolmode.ino # Arduino C++ sketch for ESP8266
```

---

## 🚀 Running Locally on Your Machine

Node.js LTS is installed on your system.

### 1. Start the Server
Open PowerShell in the project directory:
```powershell
npm start
```
Or with auto-reload:
```powershell
node server.js
```

### 2. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```
- Create a new account on the **Register** tab.
- Log in to access the **COOLMODE** dashboard.
- Test with the **Simulate Sensor** button to see real-time gauges, seek bars, and charts in action even before powering your hardware!

---

## ☁️ Deploying on Render (Step-by-Step)

This application is 100% prepared for **Render**:

### Step 1: Push to GitHub
1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of COOLMODE IoT Project"
   ```
2. Create a new repository on GitHub (e.g. `coolmode-iot`).
3. Link and push your repository:
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/coolmode-iot.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Create Web Service on Render
1. Go to [https://render.com](https://render.com) and log in.
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository (`coolmode-iot`).
4. Configure the settings:
   - **Name**: `coolmode-iot`
   - **Region**: Closest to you (e.g., Singapore or Frankfurt)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Create Web Service**.
6. Once deployed, Render will provide a live URL such as:
   ```
   https://coolmode-iot.onrender.com
   ```

---

## 🛠️ Arduino ESP8266 Firmware Setup

1. Open **Arduino IDE**.
2. Go to **File -> Preferences** and add the ESP8266 board manager URL:
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. Install the **esp8266** board package from **Tools -> Board -> Boards Manager**.
4. Install the following libraries via **Tools -> Manage Libraries**:
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor` by Adafruit
   - `LiquidCrystal_I2C` by Frank de Brabander
   - `ArduinoJson` by Benoit Blanchon (v6 or v7)
5. Open `firmware/esp8266_coolmode/esp8266_coolmode.ino`.
6. Update `SERVER_URL`:
   - For local WiFi testing: `http://<YOUR_LAPTOP_IP>:3000` (Find using `ipconfig`)
   - For Render cloud: `https://coolmode-iot.onrender.com`
7. Select Board: **NodeMCU 1.0 (ESP-12E Module)** and your COM Port.
8. Click **Upload**.

---

## 📡 API Reference

### Hardware Integrated Endpoint
- `POST /api/device/sync`: ESP8266 posts `{ temperature: 27.5, humidity: 62.0 }`.
  - Saves sensor reading to SQLite.
  - Returns current actuator configurations in one single payload:
    ```json
    {
      "success": true,
      "led": 1,
      "lcd_line1": "COOLMODE IoT",
      "lcd_line2": "System Ready"
    }
    ```

### Environmental Telemetry (Tab 1)
- `GET /api/sensors/latest`: Returns the most recent reading with formatted Kolkata IST time.
- `GET /api/sensors/history?page=1&limit=20`: Returns 20 paginated records (latest first).
- `GET /api/sensors/chart`: Returns time series data for Chart.js.
- `DELETE /api/sensors/:id`: Removes a single record.
- `DELETE /api/sensors`: Clears all history.
- `POST /api/sensors/simulate`: Injects mock sensor data for instant previewing.

### Smart LCD (Tab 2)
- `GET /api/device/lcd`: Fetches current text for Line 1 & Line 2.
- `POST /api/device/lcd`: Updates Line 1 & Line 2 (max 16 characters each).

### LED Automation (Tab 3)
- `GET /api/device/led`: Fetches current state (0 or 1).
- `POST /api/device/led`: Toggles LED state (body: `{ "state": 1 }`).
