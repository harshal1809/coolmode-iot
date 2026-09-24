const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists (crucial for local and Render deployment)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'coolmode.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper for formatting timestamps in Asia/Kolkata (+05:30)
function formatKolkata(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  
  // Format Time in Asia/Kolkata (hh:mm:ss A)
  const timeStr = d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Format Date in Asia/Kolkata (DD/MM/YYYY)
  const dateStr = d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return { time: timeStr, date: dateStr };
}

// Initialize tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sensor Readings table
  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperature REAL NOT NULL,
      humidity REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Device configuration (LED & LCD)
  db.run(`
    CREATE TABLE IF NOT EXISTS device_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      led_state INTEGER DEFAULT 0,
      lcd_line1 TEXT DEFAULT 'COOLMODE IoT',
      lcd_line2 TEXT DEFAULT 'System Ready',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default config row if not exists
  db.get(`SELECT id FROM device_config WHERE id = 1`, (err, row) => {
    if (!err && !row) {
      db.run(`
        INSERT INTO device_config (id, led_state, lcd_line1, lcd_line2)
        VALUES (1, 0, 'COOLMODE IoT', 'System Ready')
      `);
      console.log('Default device configuration initialized.');
    }
  });
});

// Promise-based query helpers
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  formatKolkata
};

module.exports = { db, dbAsync };
