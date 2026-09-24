// Authentication & Theme Controller

// Theme Management
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
      darkBtn.className = "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-blue-600 text-white shadow-sm";
      lightBtn.className = "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100";
    }
  } else {
    root.classList.remove('dark');
    if (lightBtn && darkBtn) {
      lightBtn.className = "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-amber-500 text-white shadow-sm";
      darkBtn.className = "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100";
    }
  }

  if (save) {
    localStorage.setItem('coolmode_theme', theme);
  }
}

// Switch between Login and Register tabs
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  hideAlert();

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLoginBtn.className = "py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm";
    tabRegisterBtn.className = "py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200";
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabRegisterBtn.className = "py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm";
    tabLoginBtn.className = "py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200";
  }
}

// Password visibility toggle
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// Show alert banner
function showAlert(message, type = 'error') {
  const alertEl = document.getElementById('auth-alert');
  const msgEl = document.getElementById('auth-alert-msg');
  const iconEl = document.getElementById('auth-alert-icon');
  
  msgEl.textContent = message;
  alertEl.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'border-red-300', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-300', 'dark:bg-red-950/60', 'dark:text-red-300', 'dark:border-red-800', 'dark:bg-emerald-950/60', 'dark:text-emerald-300', 'dark:border-emerald-800');

  if (type === 'error') {
    alertEl.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-300', 'dark:bg-red-950/60', 'dark:text-red-300', 'dark:border-red-800');
    iconEl.className = 'fa-solid fa-triangle-exclamation';
  } else {
    alertEl.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-300', 'dark:bg-emerald-950/60', 'dark:text-emerald-300', 'dark:border-emerald-800');
    iconEl.className = 'fa-solid fa-circle-check';
  }
}

function hideAlert() {
  const alertEl = document.getElementById('auth-alert');
  if (alertEl) alertEl.classList.add('hidden');
}

// Handle Login Submission
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('login-submit-btn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Signing In...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    localStorage.setItem('coolmode_token', data.token);
    localStorage.setItem('coolmode_user', JSON.stringify(data.user));

    showAlert('Login successful! Redirecting to dashboard...', 'success');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 600);
  } catch (err) {
    showAlert(err.message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Sign In to Dashboard</span><i class="fa-solid fa-arrow-right text-xs"></i>';
  }
}

// Handle Register Submission
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const submitBtn = document.getElementById('register-submit-btn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Registering...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account');
    }

    localStorage.setItem('coolmode_token', data.token);
    localStorage.setItem('coolmode_user', JSON.stringify(data.user));

    showAlert('Account created! Redirecting to dashboard...', 'success');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 700);
  } catch (err) {
    showAlert(err.message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Create New Account</span><i class="fa-solid fa-user-check text-xs"></i>';
  }
}

// Check existing login on load
async function checkAuthSession() {
  const token = localStorage.getItem('coolmode_token');
  if (token) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        window.location.href = '/dashboard.html';
      }
    } catch (_) {}
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuthSession();
});
