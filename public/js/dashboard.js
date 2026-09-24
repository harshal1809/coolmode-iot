// COOLMODE IoT Dashboard Controller
// Designed and Developed by JAYESH AND PRAKASH, Dept. of Electrical Engineering, GCOE Yavatmal

let currentTab = 'tab1';
let currentPage = 1;
const PAGE_LIMIT = 20;
let pollTimer = null;
let countdownSeconds = 10;
let envChartInstance = null;
let currentLedState = 0;

// Theme Controller
function initTheme() {
  const savedTheme = localStorage.getItem('coolmode_theme') || 'dark';
  setTheme(savedTheme, false);
}

function setTheme(theme, save = true) {
  const root = document.documentElement;
  const lightBtn = document.getElementById('theme-light-btn');
  const darkBtn = document.getElementById('theme-dark-btn');

  if (theme === 'dark') {
    root.classList.add('dark');
    if (darkBtn && lightBtn) {
      darkBtn.className = "flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-blue-600 text-white shadow-sm";
      lightBtn.className = "flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100";
    }
  } else {
    root.classList.remove('dark');
    if (lightBtn && darkBtn) {
      lightBtn.className = "flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-amber-500 text-white shadow-sm";
      darkBtn.className = "flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100";
    }
  }

  if (save) {
    localStorage.setItem('coolmode_theme', theme);
  }

  // Update chart colors if chart exists
  if (envChartInstance) {
    updateChartTheme();
  }
}

// Global Toast Banner
function showToast(message, type = 'success') {
  const banner = document.getElementById('toast-banner');
  const msgEl = document.getElementById('toast-msg');
  const iconEl = document.getElementById('toast-icon');

  msgEl.textContent = message;
  banner.className = "mb-4 p-3.5 rounded-2xl text-sm font-medium flex items-center justify-between transition-all duration-300 shadow-md";

  if (type === 'success') {
    banner.classList.add('bg-emerald-50', 'text-emerald-800', 'border', 'border-emerald-200', 'dark:bg-emerald-950/80', 'dark:text-emerald-300', 'dark:border-emerald-800');
    iconEl.className = 'fa-solid fa-circle-check text-lg text-emerald-500';
  } else if (type === 'error') {
    banner.classList.add('bg-red-50', 'text-red-800', 'border', 'border-red-200', 'dark:bg-red-950/80', 'dark:text-red-300', 'dark:border-red-800');
    iconEl.className = 'fa-solid fa-circle-exclamation text-lg text-red-500';
  } else {
    banner.classList.add('bg-blue-50', 'text-blue-800', 'border', 'border-blue-200', 'dark:bg-blue-950/80', 'dark:text-blue-300', 'dark:border-blue-800');
    iconEl.className = 'fa-solid fa-circle-info text-lg text-blue-500';
  }

  banner.classList.remove('hidden');
  setTimeout(() => closeToast(), 4000);
}

function closeToast() {
  const banner = document.getElementById('toast-banner');
  if (banner) banner.classList.add('hidden');
}

// Dashboard Tab Switching
function switchDashboardTab(tabId) {
  currentTab = tabId;
  const tabs = ['tab1', 'tab2', 'tab3'];

  tabs.forEach(t => {
    const navBtn = document.getElementById(`nav-${t}`);
    const content = document.getElementById(`content-${t}`);
    if (t === tabId) {
      navBtn.className = "flex-1 min-w-[160px] py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2.5 transition-all duration-200 bg-blue-600 text-white shadow-md shadow-blue-500/25";
      content.classList.remove('hidden');
    } else {
      navBtn.className = "flex-1 min-w-[160px] py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2.5 transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800";
      content.classList.add('hidden');
    }
  });

  if (tabId === 'tab1') {
    fetchSensorData();
    fetchRecordsTable(currentPage);
    fetchChartData();
  } else if (tabId === 'tab2') {
    fetchLcdData();
  } else if (tabId === 'tab3') {
    fetchLedState();
  }
}

// ========================================================
// TAB 1: SENSOR DATA, INNOVATIVE GAUGES & RECORDS TABLE
// ========================================================

const CIRCUMFERENCE = 2 * Math.PI * 50; // ~314.159

function updateGauge(temp, hum) {
  // Update Temperature Circular Gauge (0°C to 50°C range)
  const tempVal = Math.min(Math.max(temp, 0), 50);
  const tempRatio = tempVal / 50;
  const tempOffset = CIRCUMFERENCE - (tempRatio * CIRCUMFERENCE);
  const tempCircle = document.getElementById('temp-gauge-circle');
  const tempDisplay = document.getElementById('temp-display-val');
  const tempSeekFill = document.getElementById('temp-seek-fill');
  const tempComfort = document.getElementById('temp-comfort-badge');

  if (tempCircle && tempDisplay) {
    tempCircle.style.strokeDashoffset = tempOffset;
    tempDisplay.textContent = temp.toFixed(1);

    // Color coordination based on temperature
    if (temp < 20) {
      tempCircle.setAttribute('stroke', '#38bdf8'); // Cyan / Cold
      tempComfort.textContent = 'Cool';
      tempComfort.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300/50";
    } else if (temp <= 28) {
      tempCircle.setAttribute('stroke', '#10b981'); // Emerald / Ideal Comfort
      tempComfort.textContent = 'Optimal Comfort';
      tempComfort.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50";
    } else if (temp <= 36) {
      tempCircle.setAttribute('stroke', '#f59e0b'); // Amber / Warm
      tempComfort.textContent = 'Warm Climate';
      tempComfort.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/50";
    } else {
      tempCircle.setAttribute('stroke', '#ef4444'); // Red / Hot
      tempComfort.textContent = 'High Heat Alert';
      tempComfort.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300/50";
    }

    if (tempSeekFill) {
      tempSeekFill.style.width = `${tempRatio * 100}%`;
    }
  }

  // Update Humidity Circular Gauge (0% to 100% range)
  const humVal = Math.min(Math.max(hum, 0), 100);
  const humRatio = humVal / 100;
  const humOffset = CIRCUMFERENCE - (humRatio * CIRCUMFERENCE);
  const humCircle = document.getElementById('hum-gauge-circle');
  const humDisplay = document.getElementById('hum-display-val');
  const humSeekFill = document.getElementById('hum-seek-fill');
  const humComfort = document.getElementById('hum-comfort-badge');

  if (humCircle && humDisplay) {
    humCircle.style.strokeDashoffset = humOffset;
    humDisplay.textContent = hum.toFixed(1);

    if (hum < 35) {
      humComfort.textContent = 'Dry Air';
      humComfort.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/50";
    } else if (hum <= 65) {
      humComfort.textContent = 'Comfortable';
      humComfort.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300/50";
    } else {
      humComfort.textContent = 'High Humidity';
      humComfort.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/50";
    }

    if (humSeekFill) {
      humSeekFill.style.width = `${humRatio * 100}%`;
    }
  }
}

// Fetch Latest Sensor Reading from Server
async function fetchSensorData(isManual = false) {
  const icon = document.getElementById('refresh-icon');
  if (icon && isManual) icon.classList.add('fa-spin');

  try {
    const res = await fetch('/api/sensors/latest');
    const data = await res.json();

    if (data.reading) {
      updateGauge(data.reading.temperature, data.reading.humidity);
    }
  } catch (err) {
    console.error('Failed to fetch sensor reading:', err);
  } finally {
    if (icon && isManual) {
      setTimeout(() => icon.classList.remove('fa-spin'), 600);
    }
  }
}

// Section 2: Fetch Paginated Records Table
async function fetchRecordsTable(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('records-tbody');

  try {
    const res = await fetch(`/api/sensors/history?page=${page}&limit=${PAGE_LIMIT}`);
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-10 text-center text-slate-400">
            <i class="fa-solid fa-wind text-2xl mb-2 block opacity-40"></i>
            <p>No sensor records found in database.</p>
            <p class="text-xs text-slate-500 mt-1">Connect your ESP8266 hardware or click "Simulate Sensor" to push data.</p>
          </td>
        </tr>
      `;
      updatePaginationControls(0, 0, 0, 1, 1);
      return;
    }

    tbody.innerHTML = data.records.map((r) => {
      // Temperature styling badge
      let tempClass = "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
      if (r.temperature < 22) tempClass = "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300";
      else if (r.temperature > 32) tempClass = "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300";

      return `
        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
          <td class="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">#${r.id}</td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${tempClass}">
              <i class="fa-solid fa-temperature-half"></i>
              <span>${r.temperature.toFixed(1)} °C</span>
            </span>
          </td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <i class="fa-solid fa-droplet"></i>
              <span>${r.humidity.toFixed(1)} %</span>
            </span>
          </td>
          <td class="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-200">
            <i class="fa-regular fa-clock text-slate-400 mr-1.5"></i>${r.time}
          </td>
          <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300">
            <i class="fa-regular fa-calendar text-slate-400 mr-1.5"></i>${r.date}
          </td>
          <td class="py-3.5 px-4 text-center">
            <button onclick="deleteRecord(${r.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Delete record #${r.id}">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const startIdx = (data.page - 1) * PAGE_LIMIT + 1;
    const endIdx = Math.min(startIdx + data.records.length - 1, data.total);
    updatePaginationControls(startIdx, endIdx, data.total, data.page, data.totalPages);

  } catch (err) {
    console.error('Failed to load records table:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-red-500">
          <i class="fa-solid fa-triangle-exclamation mr-1"></i> Failed to retrieve records.
        </td>
      </tr>
    `;
  }
}

function updatePaginationControls(start, end, total, page, totalPages) {
  document.getElementById('page-start-idx').textContent = total > 0 ? start : 0;
  document.getElementById('page-end-idx').textContent = total > 0 ? end : 0;
  document.getElementById('page-total-records').textContent = total;
  document.getElementById('current-page-num').textContent = page;
  document.getElementById('total-pages-num').textContent = totalPages;

  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
}

function changePage(newPage) {
  if (newPage < 1) return;
  fetchRecordsTable(newPage);
}

// Delete Record
async function deleteRecord(id) {
  if (!confirm(`Are you sure you want to delete record #${id}?`)) return;

  try {
    const res = await fetch(`/api/sensors/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to delete');

    showToast(`Record #${id} successfully removed!`, 'success');
    fetchRecordsTable(currentPage);
    fetchSensorData();
    fetchChartData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Clear all records
async function clearAllRecords() {
  if (!confirm('CAUTION: This will delete ALL saved sensor readings permanently. Proceed?')) return;

  try {
    const res = await fetch('/api/sensors', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('All sensor records cleared.', 'info');
    fetchRecordsTable(1);
    fetchSensorData();
    fetchChartData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Simulate Sensor Reading (For UI Testing)
async function simulateSensorReading() {
  try {
    const res = await fetch('/api/sensors/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();

    if (data.success) {
      showToast(`Simulated: ${data.reading.temperature}°C, ${data.reading.humidity}%`, 'success');
      fetchSensorData();
      fetchRecordsTable(currentPage);
      fetchChartData();
    }
  } catch (err) {
    showToast('Simulation failed.', 'error');
  }
}

// ========================================================
// CHART.JS REAL-TIME ENVIRONMENTAL GRAPH
// ========================================================

async function fetchChartData() {
  try {
    const res = await fetch('/api/sensors/chart');
    const chartData = await res.json();

    if (!Array.isArray(chartData) || chartData.length === 0) return;

    const labels = chartData.map(d => d.time.split(' ')[0]); // extract time
    const temps = chartData.map(d => d.temperature);
    const hums = chartData.map(d => d.humidity);

    renderChart(labels, temps, hums);
  } catch (err) {
    console.error('Failed to load chart data:', err);
  }
}

function renderChart(labels, temps, hums) {
  const ctx = document.getElementById('envChart');
  if (!ctx) return;

  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  if (envChartInstance) {
    envChartInstance.data.labels = labels;
    envChartInstance.data.datasets[0].data = temps;
    envChartInstance.data.datasets[1].data = hums;
    envChartInstance.options.scales.x.grid.color = gridColor;
    envChartInstance.options.scales.y.grid.color = gridColor;
    envChartInstance.options.scales.x.ticks.color = textColor;
    envChartInstance.options.scales.y.ticks.color = textColor;
    envChartInstance.update();
    return;
  }

  envChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temps,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b'
        },
        {
          label: 'Humidity (%)',
          data: hums,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#06b6d4'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
        }
      }
    }
  });
}

function updateChartTheme() {
  if (envChartInstance) {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    envChartInstance.options.scales.x.grid.color = gridColor;
    envChartInstance.options.scales.y.grid.color = gridColor;
    envChartInstance.options.scales.x.ticks.color = textColor;
    envChartInstance.options.scales.y.ticks.color = textColor;
    envChartInstance.update();
  }
}

// 10-Second Continuous Polling Loop
function startSensorPolling() {
  if (pollTimer) clearInterval(pollTimer);

  countdownSeconds = 10;
  const countdownEl = document.getElementById('sync-countdown');

  pollTimer = setInterval(() => {
    countdownSeconds--;
    if (countdownEl) countdownEl.textContent = `${countdownSeconds}s`;

    if (countdownSeconds <= 0) {
      countdownSeconds = 10;
      if (currentTab === 'tab1') {
        fetchSensorData();
        fetchRecordsTable(currentPage);
        fetchChartData();
      }
    }
  }, 1000);
}

// ========================================================
// TAB 2: SMART LCD (16x2 I2C D1-SCL, D2-SDA)
// ========================================================

function updateCharCount(row) {
  const input = document.getElementById(`lcd-${row}-input`);
  const countEl = document.getElementById(`${row}-char-count`);
  const previewEl = document.getElementById(`lcd-preview-${row}`);

  const val = input.value || '';
  countEl.textContent = `${val.length} / 16 chars`;

  // Pad preview with spaces to simulate fixed 16 chars
  const padded = (val + '                ').slice(0, 16);
  previewEl.textContent = padded;
}

// Fetch current LCD message from database
async function fetchLcdData() {
  try {
    const res = await fetch('/api/device/lcd');
    const data = await res.json();

    const row1Input = document.getElementById('lcd-row1-input');
    const row2Input = document.getElementById('lcd-row2-input');

    if (row1Input && row2Input) {
      row1Input.value = data.line1 || '';
      row2Input.value = data.line2 || '';
      updateCharCount('row1');
      updateCharCount('row2');
    }
  } catch (err) {
    console.error('Failed to load LCD data:', err);
  }
}

// Handle LCD Update Form Submit
async function handleLcdUpdate(e) {
  e.preventDefault();
  const line1 = document.getElementById('lcd-row1-input').value;
  const line2 = document.getElementById('lcd-row2-input').value;
  const btn = document.getElementById('lcd-update-btn');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Transmitting...';

  try {
    const res = await fetch('/api/device/lcd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line1, line2 })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to update LCD');

    showToast('Display updated! Ready for ESP8266 sync.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane text-xs mr-2"></i><span>Update LCD Display</span>';
  }
}

// Quick message presets
function applyLcdPreset(line1, line2) {
  const row1Input = document.getElementById('lcd-row1-input');
  const row2Input = document.getElementById('lcd-row2-input');
  row1Input.value = line1;
  row2Input.value = line2;
  updateCharCount('row1');
  updateCharCount('row2');
}

// LCD Backlight color switcher
function toggleLcdColor(color) {
  const screen = document.getElementById('lcd-screen-display');
  if (color === 'green') {
    screen.classList.add('lcd-green-mode');
  } else {
    screen.classList.remove('lcd-green-mode');
  }
}

// ========================================================
// TAB 3: LED AUTOMATION (PIN D6 / GPIO 12)
// ========================================================

async function fetchLedState() {
  try {
    const res = await fetch('/api/device/led');
    const data = await res.json();
    applyLedVisuals(data.state);
  } catch (err) {
    console.error('Failed to fetch LED status:', err);
  }
}

function applyLedVisuals(state) {
  currentLedState = state === 1 ? 1 : 0;
  const bulb = document.getElementById('led-bulb-graphic');
  const icon = document.getElementById('led-bulb-icon');
  const text = document.getElementById('led-status-text');
  const dot = document.getElementById('led-status-dot');
  const badge = document.getElementById('led-status-badge');
  const btn = document.getElementById('led-toggle-btn');
  const label = document.getElementById('led-btn-label');
  const logic = document.getElementById('led-logic-level');
  const ambient = document.getElementById('led-ambient-glow');

  if (currentLedState === 1) {
    bulb.className = "w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-emerald-400 transition-all duration-500 flex items-center justify-center led-glow-on";
    icon.className = "fa-solid fa-lightbulb text-3xl sm:text-4xl text-white";
    text.textContent = "LED IS CURRENTLY ON";
    dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse";
    badge.className = "inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50";
    btn.className = "w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-base sm:text-lg shadow-xl shadow-rose-500/25 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-3";
    label.textContent = "TURN LED OFF";
    logic.textContent = "HIGH (3.3V)";
    logic.className = "font-bold text-emerald-500";
    if (ambient) ambient.style.opacity = '0.35';
  } else {
    bulb.className = "w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-slate-700 transition-all duration-500 flex items-center justify-center led-glow-off";
    icon.className = "fa-regular fa-lightbulb text-3xl sm:text-4xl text-slate-400";
    text.textContent = "LED IS CURRENTLY OFF";
    dot.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
    badge.className = "inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
    btn.className = "w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base sm:text-lg shadow-xl shadow-emerald-500/25 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-3";
    label.textContent = "TURN LED ON";
    logic.textContent = "LOW (0V)";
    logic.className = "font-bold text-slate-400";
    if (ambient) ambient.style.opacity = '0.05';
  }
}

async function toggleLedState() {
  const targetState = currentLedState === 1 ? 0 : 1;
  const btn = document.getElementById('led-toggle-btn');
  btn.disabled = true;

  try {
    const res = await fetch('/api/device/led', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: targetState })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to switch LED');

    applyLedVisuals(data.state);
    showToast(`LED switched ${data.state === 1 ? 'ON' : 'OFF'}! Hardware will sync on next cycle.`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ========================================================
// AUTHENTICATION & SESSION VERIFICATION
// ========================================================

async function verifySession() {
  const token = localStorage.getItem('coolmode_token');
  const storedUser = localStorage.getItem('coolmode_user');

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      document.getElementById('user-display-name').textContent = user.name || 'User';
    } catch (_) {}
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      window.location.href = '/index.html';
      return;
    }

    const data = await res.json();
    document.getElementById('user-display-name').textContent = data.user.name || 'User';
  } catch (_) {
    // If running offline or testing
  }
}

async function handleLogout() {
  if (!confirm('Log out from COOLMODE Dashboard?')) return;

  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (_) {}

  localStorage.removeItem('coolmode_token');
  localStorage.removeItem('coolmode_user');
  window.location.href = '/index.html';
}

// ========================================================
// INITIALIZATION ON PAGE LOAD
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  verifySession();

  // Load Tab 1 by default
  fetchSensorData();
  fetchRecordsTable(1);
  fetchChartData();

  // Pre-load device configurations
  fetchLcdData();
  fetchLedState();

  // Start continuous 10s auto-polling
  startSensorPolling();
});
