const STORAGE_KEY = 'healthLogs';
const REMINDER_PREF_KEY = 'reminderPrefs';
const REMINDER_STATUS_KEY = 'reminderStatus';

const REMINDERS = [
  {
    id: 'preLunch',
    label: 'Pre-lunch check',
    defaultTime: '10:45',
    description: 'Log fasting end, first meal plan, supplements due.'
  },
  {
    id: 'midAfternoon',
    label: 'Mid-afternoon check',
    defaultTime: '14:30',
    description: 'Log snack, water, mood/energy.'
  },
  {
    id: 'dinner',
    label: 'Dinner check',
    defaultTime: '19:00',
    description: 'Log dinner, supplements, steps or workout.'
  }
];

const state = {
  today: new Date(),
  logs: [],
  reminderPrefs: {},
  reminderStatus: {},
  deferredPrompt: null
};

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateReminderCards();
    checkPendingReminders();
  }
});

function init() {
  state.today = new Date();
  state.logs = getStoredLogs();
  state.reminderPrefs = loadReminderPrefs();
  state.reminderStatus = loadReminderStatus();

  setupInstallPrompt();
  renderDate();
  populateReminderSettings();
  populateLogForm();
  attachEventListeners();
  renderHistory();
  drawCharts();
  renderReminderCards();
  checkPendingReminders();
  updateNotificationBanner();
  startMinuteTicker();
  registerServiceWorker();
}

function renderDate() {
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('currentDate').textContent = formatter.format(state.today);
}

function getTodayIso() {
  return state.today.toISOString().split('T')[0];
}

function getStoredLogs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to parse stored logs', error);
    return [];
  }
}

function saveLogs(logs) {
  state.logs = logs;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function loadReminderPrefs() {
  try {
    const stored = localStorage.getItem(REMINDER_PREF_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse reminder prefs', error);
  }
  const defaults = {};
  for (const reminder of REMINDERS) {
    defaults[reminder.id] = {
      time: reminder.defaultTime,
      enabled: true
    };
  }
  return defaults;
}

function saveReminderPrefs() {
  localStorage.setItem(REMINDER_PREF_KEY, JSON.stringify(state.reminderPrefs));
}

function loadReminderStatus() {
  try {
    const stored = localStorage.getItem(REMINDER_STATUS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const today = getTodayIso();
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to parse reminder status', error);
  }
  return { date: getTodayIso(), triggered: {} };
}

function saveReminderStatus() {
  localStorage.setItem(REMINDER_STATUS_KEY, JSON.stringify(state.reminderStatus));
}

function populateReminderSettings() {
  document.getElementById('preLunchTime').value = state.reminderPrefs.preLunch.time;
  document.getElementById('preLunchEnabled').checked = state.reminderPrefs.preLunch.enabled;
  document.getElementById('midAfternoonTime').value = state.reminderPrefs.midAfternoon.time;
  document.getElementById('midAfternoonEnabled').checked = state.reminderPrefs.midAfternoon.enabled;
  document.getElementById('dinnerTime').value = state.reminderPrefs.dinner.time;
  document.getElementById('dinnerEnabled').checked = state.reminderPrefs.dinner.enabled;
}

function populateLogForm() {
  const todayEntry = state.logs.find((entry) => entry.date === getTodayIso());
  if (!todayEntry) {
    updateProgress();
    return;
  }

  document.getElementById('mealBreakfast').value = todayEntry.meals.breakfast || '';
  document.getElementById('mealLunch').value = todayEntry.meals.lunch || '';
  document.getElementById('mealSnack').value = todayEntry.meals.snack || '';
  document.getElementById('mealDinner').value = todayEntry.meals.dinner || '';

  document.getElementById('servingBreakfast').value = todayEntry.servingSizes?.breakfast || '';
  document.getElementById('servingLunch').value = todayEntry.servingSizes?.lunch || '';
  document.getElementById('servingSnack').value = todayEntry.servingSizes?.snack || '';
  document.getElementById('servingDinner').value = todayEntry.servingSizes?.dinner || '';

  if (todayEntry.calories) {
    displayCalories(todayEntry.calories);
  }

  document.getElementById('suppD3').checked = Boolean(todayEntry.supplements.d3?.taken);
  document.getElementById('suppD3Time').value = todayEntry.supplements.d3?.time || '';
  document.getElementById('suppOmega3').checked = Boolean(todayEntry.supplements.omega3?.taken);
  document.getElementById('suppOmega3Time').value = todayEntry.supplements.omega3?.time || '';
  document.getElementById('suppIron').checked = Boolean(todayEntry.supplements.iron?.taken);
  document.getElementById('suppIronTime').value = todayEntry.supplements.iron?.time || '';

  document.getElementById('fastingStart').value = todayEntry.fasting.start || '';
  document.getElementById('fastingEnd').value = todayEntry.fasting.end || '';
  updateFastingHours();

  document.getElementById('waterCups').value = todayEntry.waterCups ?? '';
  document.getElementById('exerciseType').value = todayEntry.exercise.type || '';
  document.getElementById('exerciseMinutes').value = todayEntry.exercise.minutes ?? '';

  document.getElementById('energyLevel').value = todayEntry.wellbeing.energy ?? '';
  document.getElementById('moodLevel').value = todayEntry.wellbeing.mood ?? '';
  document.getElementById('stressLevel').value = todayEntry.wellbeing.stress ?? '';
  document.getElementById('wellbeingNotes').value = todayEntry.wellbeing.notes || '';

  document.getElementById('sleepHours').value = todayEntry.sleep.hours ?? '';
  document.getElementById('sleepQuality').value = todayEntry.sleep.quality ?? '';

  updateProgress();
}

function attachEventListeners() {
  document.querySelectorAll('.chip-group').forEach((group) => {
    group.addEventListener('click', (event) => {
      if (event.target.matches('.chip')) {
        const targetId = group.dataset.target;
        const input = document.getElementById(targetId);
        const chipText = event.target.textContent;
        input.value = input.value ? `${input.value.trim()}, ${chipText}` : chipText;
        input.dispatchEvent(new Event('input'));
      }
    });
  });

  document.getElementById('logForm').addEventListener('submit', handleSaveEntry);
  document.getElementById('clearToday').addEventListener('click', clearTodayEntry);
  document.getElementById('exportLogs').addEventListener('click', exportLogs);
  document.getElementById('importLogs').addEventListener('change', importLogs);

  ['mealBreakfast', 'mealLunch', 'mealSnack', 'mealDinner', 'suppIronTime', 'suppIron'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('input', checkIronWarning);
    el.addEventListener('change', checkIronWarning);
  });

  ['mealBreakfast', 'mealLunch', 'mealSnack', 'mealDinner', 'fastingStart', 'fastingEnd', 'waterCups', 'exerciseType', 'exerciseMinutes', 'energyLevel', 'moodLevel', 'stressLevel', 'wellbeingNotes', 'sleepHours', 'sleepQuality'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('input', updateProgress);
    el.addEventListener('change', updateProgress);
  });

  document.getElementById('fastingStart').addEventListener('change', updateFastingHours);
  document.getElementById('fastingEnd').addEventListener('change', updateFastingHours);
  document.getElementById('fastingStart').addEventListener('blur', updateFastingHours);
  document.getElementById('fastingEnd').addEventListener('blur', updateFastingHours);

  document.getElementById('settingsForm').addEventListener('submit', handleSaveReminders);
  document.getElementById('testNotification').addEventListener('click', async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      showNotification('Reminder test', {
        body: 'Notifications are working!'
      });
      showToast('Test notification sent');
    }
  });

  document.getElementById('estimateCalories').addEventListener('click', handleEstimateCalories);
}

function updateProgress() {
  const sections = {
    meals: ['mealBreakfast', 'mealLunch', 'mealSnack', 'mealDinner'],
    supplements: ['suppD3', 'suppOmega3', 'suppIron'],
    fasting: ['fastingStart', 'fastingEnd'],
    water: ['waterCups'],
    exercise: ['exerciseType', 'exerciseMinutes'],
    wellbeing: ['energyLevel', 'moodLevel', 'stressLevel', 'wellbeingNotes'],
    sleep: ['sleepHours', 'sleepQuality']
  };

  const totalSections = Object.keys(sections).length;
  let completed = 0;
  for (const key in sections) {
    const hasValue = sections[key].some((id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      if (el.type === 'checkbox') return el.checked;
      return el.value && String(el.value).trim().length > 0;
    });
    if (hasValue) completed++;
  }
  const percent = Math.round((completed / totalSections) * 100);
  document.getElementById('progressValue').textContent = `${percent}%`;
}

function updateFastingHours() {
  const start = document.getElementById('fastingStart').value;
  const end = document.getElementById('fastingEnd').value;
  const result = document.getElementById('fastingHours');
  if (!start || !end) {
    result.textContent = 'Fasting hours: —';
    return;
  }
  const hours = computeFastingHours(start, end);
  if (Number.isFinite(hours)) {
    result.textContent = `Fasting hours: ${hours}`;
  } else {
    result.textContent = 'Fasting hours: —';
  }
}

function computeFastingHours(start, end) {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) return NaN;
  let diff = (endH * 60 + endM) - (startH * 60 + startM);
  if (diff < 0) diff += 24 * 60;
  return +(diff / 60).toFixed(2);
}

function handleSaveEntry(event) {
  event.preventDefault();
  const data = collectFormData();
  const existingIndex = state.logs.findIndex((entry) => entry.date === data.date);
  if (existingIndex >= 0) {
    state.logs[existingIndex] = data;
  } else {
    state.logs.push(data);
  }
  saveLogs([...state.logs]);
  showToast('Log saved');
  renderHistory();
  drawCharts();
}

function collectFormData() {
  const fastingStart = document.getElementById('fastingStart').value || '';
  const fastingEnd = document.getElementById('fastingEnd').value || '';
  const fastingHours = fastingStart && fastingEnd ? computeFastingHours(fastingStart, fastingEnd) : null;

  const data = {
    date: getTodayIso(),
    meals: {
      breakfast: document.getElementById('mealBreakfast').value.trim(),
      lunch: document.getElementById('mealLunch').value.trim(),
      snack: document.getElementById('mealSnack').value.trim(),
      dinner: document.getElementById('mealDinner').value.trim()
    },
    servingSizes: {
      breakfast: document.getElementById('servingBreakfast').value.trim(),
      lunch: document.getElementById('servingLunch').value.trim(),
      snack: document.getElementById('servingSnack').value.trim(),
      dinner: document.getElementById('servingDinner').value.trim()
    },
    supplements: {
      d3: {
        taken: document.getElementById('suppD3').checked,
        time: document.getElementById('suppD3Time').value
      },
      omega3: {
        taken: document.getElementById('suppOmega3').checked,
        time: document.getElementById('suppOmega3Time').value
      },
      iron: {
        taken: document.getElementById('suppIron').checked,
        time: document.getElementById('suppIronTime').value
      }
    },
    fasting: {
      start: fastingStart,
      end: fastingEnd,
      hours: fastingHours
    },
    waterCups: parseNumber(document.getElementById('waterCups').value),
    exercise: {
      type: document.getElementById('exerciseType').value,
      minutes: parseNumber(document.getElementById('exerciseMinutes').value)
    },
    wellbeing: {
      energy: parseNumber(document.getElementById('energyLevel').value),
      mood: parseNumber(document.getElementById('moodLevel').value),
      stress: parseNumber(document.getElementById('stressLevel').value),
      notes: document.getElementById('wellbeingNotes').value.trim()
    },
    sleep: {
      hours: parseFloat(document.getElementById('sleepHours').value) || null,
      quality: parseNumber(document.getElementById('sleepQuality').value)
    }
  };

  const todayEntry = state.logs.find((entry) => entry.date === getTodayIso());
  if (todayEntry?.calories) {
    data.calories = todayEntry.calories;
  }

  return data;
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function clearTodayEntry() {
  if (!confirm('Clear all entries for today?')) return;
  const index = state.logs.findIndex((entry) => entry.date === getTodayIso());
  if (index >= 0) {
    state.logs.splice(index, 1);
    saveLogs([...state.logs]);
  }
  document.getElementById('logForm').reset();
  updateFastingHours();
  updateProgress();
  showToast('Today\'s log cleared');
  renderHistory();
  drawCharts();
}

function exportLogs() {
  const blob = new Blob([JSON.stringify(state.logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `healthLogs-${getTodayIso()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Logs exported');
}

function importLogs(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('Invalid file');
      const merged = mergeLogs(state.logs, imported);
      saveLogs(merged);
      populateLogForm();
      renderHistory();
      drawCharts();
      showToast('Logs imported');
    } catch (error) {
      console.error(error);
      showToast('Import failed');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function mergeLogs(existing, incoming) {
  const map = new Map(existing.map((entry) => [entry.date, entry]));
  for (const entry of incoming) {
    if (!entry?.date) continue;
    map.set(entry.date, entry);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

function renderHistory() {
  const container = document.getElementById('historyList');
  container.innerHTML = '';
  if (!state.logs.length) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'No history yet. Save today\'s log to get started.';
    container.appendChild(empty);
    return;
  }

  const last14 = [...state.logs]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 14);

  last14.forEach((entry) => {
    const details = document.createElement('details');
    details.className = 'history-entry';
    const summary = document.createElement('summary');
    summary.textContent = new Date(entry.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
    details.appendChild(summary);

    const content = document.createElement('div');
    content.innerHTML = `
      <p><strong>Fasting:</strong> ${entry.fasting.hours ?? '—'} hrs</p>
      <p><strong>Water:</strong> ${entry.waterCups ?? '—'} cups</p>
      <p><strong>Energy:</strong> ${entry.wellbeing.energy ?? '—'} / 5</p>
      <p><strong>Notes:</strong> ${entry.wellbeing.notes || '—'}</p>
    `;
    details.appendChild(content);
    container.appendChild(details);
  });
}

function drawCharts() {
  const data = [...state.logs]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-14);
  drawLineChart(document.getElementById('fastingChart'), data.map((d) => d.fasting.hours ?? 0), data.map((d) => d.date));
  drawBarChart(document.getElementById('energyChart'), data.map((d) => d.wellbeing.energy ?? 0), data.map((d) => d.date));
}

function drawLineChart(canvas, values, labels) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!values.length) {
    drawEmptyState(ctx, canvas, 'No fasting data yet');
    return;
  }
  const padding = 30;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const stepX = (canvas.width - padding * 2) / Math.max(values.length - 1, 1);

  drawAxes(ctx, canvas, padding, min, max);

  ctx.strokeStyle = '#2a5bff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = padding + index * stepX;
    const y = mapValue(value, min, max, canvas.height - padding, padding);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#2a5bff';
  values.forEach((value, index) => {
    const x = padding + index * stepX;
    const y = mapValue(value, min, max, canvas.height - padding, padding);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBarChart(canvas, values, labels) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!values.length) {
    drawEmptyState(ctx, canvas, 'No energy data yet');
    return;
  }
  const padding = 30;
  const max = Math.max(...values, 5);
  drawAxes(ctx, canvas, padding, 0, max);
  const barWidth = (canvas.width - padding * 2) / values.length - 10;
  ctx.fillStyle = '#60a5fa';
  values.forEach((value, index) => {
    const x = padding + index * (barWidth + 10);
    const y = mapValue(value, 0, max, canvas.height - padding, padding);
    const height = canvas.height - padding - y;
    ctx.fillRect(x, y, barWidth, height);
  });
}

function drawAxes(ctx, canvas, padding, min, max) {
  ctx.strokeStyle = '#cbd5f5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '12px sans-serif';
  ctx.fillText(max.toString(), 5, padding + 4);
  ctx.fillText(min.toString(), 5, canvas.height - padding);
}

function drawEmptyState(ctx, canvas, message) {
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function mapValue(value, min, max, maxPixel, minPixel) {
  if (max === min) return (maxPixel + minPixel) / 2;
  return minPixel + ((value - min) / (max - min)) * (maxPixel - minPixel);
}

function handleSaveReminders(event) {
  event.preventDefault();
  state.reminderPrefs = {
    preLunch: {
      time: document.getElementById('preLunchTime').value || REMINDERS[0].defaultTime,
      enabled: document.getElementById('preLunchEnabled').checked
    },
    midAfternoon: {
      time: document.getElementById('midAfternoonTime').value || REMINDERS[1].defaultTime,
      enabled: document.getElementById('midAfternoonEnabled').checked
    },
    dinner: {
      time: document.getElementById('dinnerTime').value || REMINDERS[2].defaultTime,
      enabled: document.getElementById('dinnerEnabled').checked
    }
  };
  saveReminderPrefs();
  renderReminderCards();
  checkPendingReminders();
  showToast('Reminders updated');
}

function renderReminderCards() {
  const container = document.getElementById('reminderCards');
  container.innerHTML = '';
  REMINDERS.forEach((reminder) => {
    const prefs = state.reminderPrefs[reminder.id];
    const card = document.createElement('div');
    card.className = 'reminder-card';

    const info = document.createElement('div');
    info.innerHTML = `
      <div class="time">${prefs.time}</div>
      <div class="label">${reminder.label}</div>
      <p class="label">${reminder.description}</p>
    `;

    const status = document.createElement('span');
    status.className = 'label';
    status.textContent = prefs.enabled ? 'On' : 'Off';

    card.appendChild(info);
    card.appendChild(status);
    container.appendChild(card);
  });
}

function updateReminderCards() {
  renderReminderCards();
}

function checkPendingReminders() {
  const now = new Date();
  const today = getTodayIso();
  if (state.reminderStatus.date !== today) {
    state.reminderStatus = { date: today, triggered: {} };
    saveReminderStatus();
  }
  const overdueContainer = document.getElementById('overdueReminders');
  overdueContainer.innerHTML = '';
  let hasOverdue = false;

  REMINDERS.forEach((reminder) => {
    const prefs = state.reminderPrefs[reminder.id];
    if (!prefs.enabled) return;
    const scheduled = getReminderDate(now, prefs.time);
    const triggered = state.reminderStatus.triggered?.[reminder.id];
    if (triggered) return;
    if (now >= scheduled) {
      hasOverdue = true;
      const card = document.createElement('div');
      card.className = 'reminder-card overdue';
      card.innerHTML = `
        <div>
          <div class="time">${prefs.time}</div>
          <div class="label">${reminder.label}</div>
        </div>
        <div class="label">Overdue</div>
      `;
      overdueContainer.appendChild(card);
    }
  });
  overdueContainer.hidden = !hasOverdue;
}

function getReminderDate(reference, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(reference);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function startMinuteTicker() {
  checkReminders();
  setInterval(checkReminders, 60 * 1000);
}

async function checkReminders() {
  const now = new Date();
  const today = getTodayIso();
  if (state.reminderStatus.date !== today) {
    state.reminderStatus = { date: today, triggered: {} };
  }

  for (const reminder of REMINDERS) {
    const prefs = state.reminderPrefs[reminder.id];
    if (!prefs.enabled) continue;
    if (state.reminderStatus.triggered?.[reminder.id]) continue;
    const scheduled = getReminderDate(now, prefs.time);
    if (now >= scheduled) {
      const granted = await ensureNotificationPermission();
      if (granted) {
        showNotification(reminder.label, {
          body: reminder.description
        });
      }
      state.reminderStatus.triggered[reminder.id] = new Date().toISOString();
      saveReminderStatus();
      showToast(`${reminder.label} reminder`);
    }
  }
  checkPendingReminders();
  updateNotificationBanner();
}

async function ensureNotificationPermission() {
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return requestNotificationPermission();
}

async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Notification permission request failed', error);
    return false;
  }
}

function updateNotificationBanner() {
  const banner = document.getElementById('notificationBanner');
  banner.hidden = Notification.permission !== 'denied';
}

function showNotification(title, options) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.showNotification(title, options);
      } else if (Notification.permission === 'granted') {
        new Notification(title, options);
      }
    });
  } else if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function checkIronWarning() {
  const ironTaken = document.getElementById('suppIron').checked;
  const ironTime = document.getElementById('suppIronTime').value;
  const warning = document.getElementById('ironWarning');
  if (!ironTaken || !ironTime) {
    warning.hidden = true;
    return;
  }
  const keywords = ['coffee', 'tea', 'calcium'];
  const mealIds = ['mealBreakfast', 'mealLunch', 'mealSnack', 'mealDinner'];
  const ironMinutes = timeToMinutes(ironTime);
  let show = false;
  mealIds.forEach((id) => {
    const text = document.getElementById(id).value.toLowerCase();
    if (!keywords.some((word) => text.includes(word))) return;
    const matches = text.match(/(\d{1,2}:\d{2})/g) || [];
    if (!matches.length) {
      show = true;
      return;
    }
    matches.forEach((match) => {
      const diff = Math.abs(timeToMinutes(match) - ironMinutes);
      if (diff <= 60) show = true;
    });
  });
  warning.hidden = !show;
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

async function handleEstimateCalories() {
  const button = document.getElementById('estimateCalories');
  const meals = {
    breakfast: {
      food: document.getElementById('mealBreakfast').value.trim(),
      servingSize: document.getElementById('servingBreakfast').value.trim()
    },
    lunch: {
      food: document.getElementById('mealLunch').value.trim(),
      servingSize: document.getElementById('servingLunch').value.trim()
    },
    snack: {
      food: document.getElementById('mealSnack').value.trim(),
      servingSize: document.getElementById('servingSnack').value.trim()
    },
    dinner: {
      food: document.getElementById('mealDinner').value.trim(),
      servingSize: document.getElementById('servingDinner').value.trim()
    }
  };

  const hasMeals = Object.values(meals).some(m => m.food);
  if (!hasMeals) {
    showToast('Please enter at least one meal first');
    return;
  }

  button.disabled = true;
  button.innerHTML = '<span>⏳ Estimating...</span>';

  try {
    const response = await fetch('/api/estimate-calories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ meals })
    });

    if (!response.ok) {
      throw new Error('Failed to estimate calories');
    }

    const calorieData = await response.json();
    displayCalories(calorieData);

    const todayEntry = state.logs.find((entry) => entry.date === getTodayIso());
    if (todayEntry) {
      todayEntry.calories = calorieData;
      saveLogs([...state.logs]);
    }

    showToast('Calories estimated successfully');
  } catch (error) {
    console.error('Error estimating calories:', error);
    showToast('Failed to estimate calories');
  } finally {
    button.disabled = false;
    button.innerHTML = '<span>🔍 Estimate Calories</span>';
  }
}

function displayCalories(calorieData) {
  const meals = ['breakfast', 'lunch', 'snack', 'dinner'];
  meals.forEach(meal => {
    const displayEl = document.getElementById(`calories${meal.charAt(0).toUpperCase() + meal.slice(1)}`);
    const calories = calorieData[meal];
    if (calories && calories > 0) {
      displayEl.textContent = `≈ ${calories} cal`;
      displayEl.hidden = false;
    } else {
      displayEl.hidden = true;
    }
  });

  const total = calorieData.totalCalories || 0;
  if (total > 0) {
    document.getElementById('totalCalories').textContent = total;
    document.getElementById('calorieSummary').hidden = false;
  } else {
    document.getElementById('calorieSummary').hidden = true;
  }
}

function setupInstallPrompt() {
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', async () => {
    if (!state.deferredPrompt) return;
    state.deferredPrompt.prompt();
    const choice = await state.deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      showToast('App installation started');
    }
    state.deferredPrompt = null;
    installBtn.hidden = true;
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch((error) => {
    console.error('Service worker registration failed', error);
  });
}
