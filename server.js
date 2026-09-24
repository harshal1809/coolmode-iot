const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const { db, dbAsync } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'coolmode_iot_secret_jwt_key_2026_gcoey';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.coolmode_token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session. Please login again.' });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide Name, Email, and Password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await dbAsync.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbAsync.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), cleanEmail, hashedPassword]
    );

    const user = { id: result.id, name: name.trim(), email: cleanEmail };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('coolmode_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({ message: 'Registration successful!', user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both Email and Password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await dbAsync.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const tokenUser = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('coolmode_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Login successful!', user: tokenUser, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('coolmode_token');
  res.json({ message: 'Logged out successfully.' });
});

// Current User Info
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ==========================================
// TAB 1: ENVIRONMENT MONITORING ROUTES
// ==========================================

// Get Latest Sensor Reading
app.get('/api/sensors/latest', async (req, res) => {
  try {
    const reading = await dbAsync.get(
      'SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 1'
    );
    if (!reading) {
      return res.json({ reading: null });
    }

    const formatted = dbAsync.formatKolkata(reading.created_at);
    res.json({
      reading: {
        id: reading.id,
        temperature: Number(reading.temperature.toFixed(1)),
        humidity: Number(reading.humidity.toFixed(1)),
        raw_timestamp: reading.created_at,
        time: formatted.time,
        date: formatted.date
      }
    });
  } catch (error) {
    console.error('Error fetching latest reading:', error);
    res.status(500).json({ error: 'Failed to retrieve sensor reading.' });
  }
});

// Get Paginated Saved Records (Latest First, 20 per page, Kolkata TimeZone)
app.get('/api/sensors/history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const countRow = await dbAsync.get('SELECT COUNT(*) as count FROM sensor_readings');
    const total = countRow ? countRow.count : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const rows = await dbAsync.all(
      'SELECT * FROM sensor_readings ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const records = rows.map((r, index) => {
      const formatted = dbAsync.formatKolkata(r.created_at);
      return {
        rowNumber: total - (offset + index), // Decreasing record display sequence or absolute ID
        id: r.id,
        temperature: Number(r.temperature.toFixed(1)),
        humidity: Number(r.humidity.toFixed(1)),
        time: formatted.time,
        date: formatted.date,
        raw_timestamp: r.created_at
      };
    });

    res.json({
      records,
      total,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    res.status(500).json({ error: 'Failed to retrieve records.' });
  }
});

// Delete specific reading
app.delete('/api/sensors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbAsync.run('DELETE FROM sensor_readings WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json({ success: true, message: `Record #${id} deleted.` });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

// Clear all history
app.delete('/api/sensors', async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM sensor_readings');
    res.json({ success: true, message: 'All sensor records cleared.' });
  } catch (error) {
    console.error('Error clearing records:', error);
    res.status(500).json({ error: 'Failed to clear records.' });
  }
});

// Sensor Data for Real-time Chart (last 20 readings)
app.get('/api/sensors/chart', async (req, res) => {
  try {
    const rows = await dbAsync.all(
      'SELECT * FROM (SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 20) ORDER BY id ASC'
    );
    const chartData = rows.map((r) => {
      const formatted = dbAsync.formatKolkata(r.created_at);
      return {
        id: r.id,
        temperature: Number(r.temperature.toFixed(1)),
        humidity: Number(r.humidity.toFixed(1)),
        time: formatted.time,
        date: formatted.date
      };
    });
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data.' });
  }
});

// Sensor Simulator endpoint (Allows testing UI live without hardware attached)
app.post('/api/sensors/simulate', async (req, res) => {
  try {
    const temp = req.body.temperature !== undefined ? parseFloat(req.body.temperature) : parseFloat((25 + Math.random() * 8).toFixed(1));
    const hum = req.body.humidity !== undefined ? parseFloat(req.body.humidity) : parseFloat((50 + Math.random() * 25).toFixed(1));

    const result = await dbAsync.run(
      'INSERT INTO sensor_readings (temperature, humidity) VALUES (?, ?)',
      [temp, hum]
    );

    const formatted = dbAsync.formatKolkata(new Date());
    res.json({
      success: true,
      message: 'Simulated reading added',
      reading: {
        id: result.id,
        temperature: temp,
        humidity: hum,
        time: formatted.time,
        date: formatted.date
      }
    });
  } catch (error) {
    console.error('Error adding simulated reading:', error);
    res.status(500).json({ error: 'Failed to add simulated reading.' });
  }
});

// ==========================================
// TAB 2: SMART LCD ROUTES
// ==========================================

// Get current LCD text
app.get('/api/device/lcd', async (req, res) => {
  try {
    const config = await dbAsync.get('SELECT lcd_line1, lcd_line2, updated_at FROM device_config WHERE id = 1');
    res.json({
      line1: config ? config.lcd_line1 : 'COOLMODE IoT',
      line2: config ? config.lcd_line2 : 'System Ready',
      updated_at: config ? config.updated_at : null
    });
  } catch (error) {
    console.error('Error fetching LCD text:', error);
    res.status(500).json({ error: 'Failed to fetch LCD configuration.' });
  }
});

// Update LCD text (Row 1 & Row 2, max 16 chars each)
app.post('/api/device/lcd', async (req, res) => {
  try {
    let { line1, line2 } = req.body;
    line1 = (line1 || '').toString().slice(0, 16);
    line2 = (line2 || '').toString().slice(0, 16);

    await dbAsync.run(
      `UPDATE device_config 
       SET lcd_line1 = ?, lcd_line2 = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = 1`,
      [line1, line2]
    );

    res.json({
      success: true,
      message: 'LCD updated successfully!',
      lcd: { line1, line2 }
    });
  } catch (error) {
    console.error('Error updating LCD:', error);
    res.status(500).json({ error: 'Failed to update LCD text.' });
  }
});

// ==========================================
// TAB 3: LED AUTOMATION ROUTES
// ==========================================

// Get current LED status
app.get('/api/device/led', async (req, res) => {
  try {
    const config = await dbAsync.get('SELECT led_state, updated_at FROM device_config WHERE id = 1');
    res.json({
      state: config ? config.led_state : 0,
      updated_at: config ? config.updated_at : null
    });
  } catch (error) {
    console.error('Error fetching LED state:', error);
    res.status(500).json({ error: 'Failed to fetch LED status.' });
  }
});

// Toggle / Set LED status
app.post('/api/device/led', async (req, res) => {
  try {
    const state = req.body.state === 1 || req.body.state === true || req.body.state === '1' || req.body.state === 'on' ? 1 : 0;
    
    await dbAsync.run(
      `UPDATE device_config 
       SET led_state = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = 1`,
      [state]
    );

    res.json({
      success: true,
      message: `LED switched ${state === 1 ? 'ON' : 'OFF'}`,
      state
    });
  } catch (error) {
    console.error('Error setting LED state:', error);
    res.status(500).json({ error: 'Failed to update LED state.' });
  }
});

// ==========================================
// HARDWARE (ESP8266) INTEGRATED ENDPOINTS
// ==========================================

// ESP8266 Single Pulse Sync:
// Posts DHT11 reading every 10 seconds AND returns current LED + LCD config in response!
app.post('/api/device/sync', async (req, res) => {
  try {
    const { temperature, humidity } = req.body;

    // Save sensor reading if provided and valid
    if (temperature !== undefined && humidity !== undefined) {
      const tempVal = parseFloat(temperature);
      const humVal = parseFloat(humidity);

      if (!isNaN(tempVal) && !isNaN(humVal)) {
        await dbAsync.run(
          'INSERT INTO sensor_readings (temperature, humidity) VALUES (?, ?)',
          [tempVal, humVal]
        );
      }
    }

    // Retrieve current device configuration for hardware execution
    const config = await dbAsync.get('SELECT led_state, lcd_line1, lcd_line2 FROM device_config WHERE id = 1');

    res.json({
      success: true,
      led: config ? config.led_state : 0,
      lcd_line1: config ? config.lcd_line1 : 'COOLMODE IoT',
      lcd_line2: config ? config.lcd_line2 : 'System Ready'
    });
  } catch (error) {
    console.error('Error in hardware sync:', error);
    res.status(500).json({ error: 'Hardware sync error.' });
  }
});

// Alternate endpoint for ESP8266 status check
app.get('/api/device/status', async (req, res) => {
  try {
    const config = await dbAsync.get('SELECT led_state, lcd_line1, lcd_line2 FROM device_config WHERE id = 1');
    res.json({
      led: config ? config.led_state : 0,
      lcd_line1: config ? config.lcd_line1 : 'COOLMODE IoT',
      lcd_line2: config ? config.lcd_line2 : 'System Ready'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve device status.' });
  }
});

// ==========================================
// PAGE ROUTING & FALLBACK
// ==========================================
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Render Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK - COOLMODE Server is healthy.');
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 COOLMODE IoT Application Server`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`⏰ TimeZone configured: Asia/Kolkata (+05:30)`);
  console.log(`🌐 Ready for Render Deployment on port ${PORT}`);
  console.log(`====================================================`);
});
