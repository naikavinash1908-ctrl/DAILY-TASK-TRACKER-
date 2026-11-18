/* ========================================================
   TRACKO — SMART DAILY PLANNER & RUN SUITE
   DIRECT-WRITE HOURLY SCHEDULE (FROM 6:00 AM) & RUN HUB
   ======================================================== */

(function () {
  'use strict';

  // Storage keys
  const STORAGE_KEY = 'tracko_task_data_v2';
  const SETTINGS_KEY = 'tracko_settings_v2';
  const RUNS_KEY = 'tracko_runs_data_v2';

  // Application State
  const AppState = {
    selectedDate: getTodayString(),
    currentFilter: 'all',
    categoryFilter: 'all',
    searchQuery: '',
    soundEnabled: true,
    theme: 'dark',
    streak: 3,
    tasks: [],
    runs: [],
    pomodoro: {
      mode: 'work',
      timeLeft: 25 * 60,
      isRunning: false,
      intervalId: null,
      activeTaskId: null,
      cyclesCompleted: 0
    }
  };

  /* ========================================================
     1. AUDIO SYNTHESIZER (WEB AUDIO API)
     Zero external MP3 dependencies!
     ======================================================== */
  class SoundService {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    }

    play(freq, type = 'sine', duration = 0.08, gainVal = 0.04) {
      if (!AppState.soundEnabled) return;
      try {
        this.init();
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    click() {
      this.play(800, 'sine', 0.04, 0.03);
    }

    complete() {
      if (!AppState.soundEnabled) return;
      this.play(523.25, 'sine', 0.1, 0.04);
      setTimeout(() => this.play(659.25, 'sine', 0.1, 0.04), 70);
      setTimeout(() => this.play(783.99, 'sine', 0.15, 0.04), 140);
    }

    timerBell() {
      if (!AppState.soundEnabled) return;
      this.play(880, 'triangle', 0.2, 0.06);
      setTimeout(() => this.play(1046.5, 'triangle', 0.25, 0.06), 150);
      setTimeout(() => this.play(1318.5, 'triangle', 0.4, 0.06), 300);
    }
  }

  const sfx = new SoundService();

  /* ========================================================
     2. HELPER UTILITIES
     ======================================================== */
  function getTodayString() {
    const d = new Date();
    return formatDate(d);
  }

  function formatDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatReadableDate(dateStr) {
    const parts = dateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = d.toDateString() === today.toDateString();
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    const formatted = d.toLocaleDateString('en-US', options);

    return isToday ? `Today • ${formatted}` : formatted;
  }

  function formatMinutes(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  /* ========================================================
     3. DATA PERSISTENCE & SEEDING
     ======================================================== */
  function loadData() {
    const settingsRaw = localStorage.getItem(SETTINGS_KEY);
    if (settingsRaw) {
      try {
        const parsed = JSON.parse(settingsRaw);
        if (parsed.theme) AppState.theme = parsed.theme;
        if (typeof parsed.soundEnabled === 'boolean') AppState.soundEnabled = parsed.soundEnabled;
        if (parsed.streak) AppState.streak = parsed.streak;
      } catch (e) {}
    }

    const tasksRaw = localStorage.getItem(STORAGE_KEY);
    if (tasksRaw) {
      try {
        AppState.tasks = JSON.parse(tasksRaw);
      } catch (e) {
        AppState.tasks = [];
      }
    } else {
      seedDefaultTasks();
    }

    const runsRaw = localStorage.getItem(RUNS_KEY);
    if (runsRaw) {
      try {
        AppState.runs = JSON.parse(runsRaw);
      } catch (e) {
        AppState.runs = [];
      }
    } else {
      seedDefaultRuns();
    }

    applyTheme(AppState.theme);
    updateSoundUI();
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.tasks));
    localStorage.setItem(RUNS_KEY, JSON.stringify(AppState.runs));
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        theme: AppState.theme,
        soundEnabled: AppState.soundEnabled,
        streak: AppState.streak
      })
    );
  }

  function seedDefaultTasks() {
    const today = getTodayString();
    AppState.tasks = [
      {
        id: 'task_run_1',
        title: 'Morning 5 km Run & Mobility Stretch',
        category: 'Running',
        priority: 'high',
        duration: '35',
        dueTime: '06:00',
        completed: true,
        date: today,
        notes: 'Target pace ~5:45 min/km. Hydrate post-run.'
      },
      {
        id: 'task_code_1',
        title: 'Review Tracko schedule planner & inline editing',
        category: 'Code',
        priority: 'high',
        duration: '45',
        dueTime: '08:00',
        completed: true,
        date: today,
        notes: 'Verify 6:00 AM start time and direct write inputs.'
      },
      {
        id: 'task_work_1',
        title: 'Team standup meeting & task block planning',
        category: 'Work',
        priority: 'medium',
        duration: '30',
        dueTime: '10:00',
        completed: false,
        date: today,
        notes: 'Review milestones and week targets.'
      },
      {
        id: 'task_study_1',
        title: 'Study Web Audio API & JavaScript state architecture',
        category: 'Study',
        priority: 'medium',
        duration: '60',
        dueTime: '14:00',
        completed: false,
        date: today,
        notes: 'Explore oscillator wave shapes.'
      },
      {
        id: 'task_fit_1',
        title: 'Core workout & foam rolling recovery',
        category: 'Health',
        priority: 'low',
        duration: '30',
        dueTime: '18:00',
        completed: false,
        date: today,
        notes: 'Planks and stretching.'
      }
    ];
    saveData();
  }

  function seedDefaultRuns() {
    const today = getTodayString();
    AppState.runs = [
      {
        id: 'run_1',
        date: today,
        distance: 5.0,
        timeMinutes: 28,
        pace: '5:36 min/km',
        calories: 362,
        notes: 'Morning road run at 6:00 AM. Felt energetic!'
      },
      {
        id: 'run_2',
        date: 'Yesterday',
        distance: 4.5,
        timeMinutes: 26,
        pace: '5:46 min/km',
        calories: 325,
        notes: 'Easy recovery jog.'
      },
      {
        id: 'run_3',
        date: '2 days ago',
        distance: 3.0,
        timeMinutes: 16,
        pace: '5:20 min/km',
        calories: 218,
        notes: 'Interval sprint session.'
      }
    ];
    saveData();
  }

  /* ========================================================
     4. THEME & AUDIO MANAGEMENT
     ======================================================== */
  function applyTheme(th) {
    document.documentElement.setAttribute('data-theme', th);
    AppState.theme = th;
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      if (th === 'light') themeIcon.textContent = '☀️';
      else if (th === 'emerald') themeIcon.textContent = '🌿';
      else themeIcon.textContent = '🌓';
    }
  }

  function toggleTheme() {
    const themes = ['dark', 'emerald', 'light'];
    const idx = themes.indexOf(AppState.theme);
    const nextTheme = themes[(idx + 1) % themes.length];
    applyTheme(nextTheme);
    saveData();
    sfx.click();
    showToast(`Switched theme to ${nextTheme.toUpperCase()}`);
  }

  function updateSoundUI() {
    const soundIcon = document.getElementById('soundIcon');
    if (soundIcon) {
      soundIcon.textContent = AppState.soundEnabled ? '🔔' : '🔕';
    }
  }

  function toggleSound() {
    AppState.soundEnabled = !AppState.soundEnabled;
    updateSoundUI();
    saveData();
    if (AppState.soundEnabled) {
      sfx.click();
      showToast('Sound Effects: Enabled');
    } else {
      showToast('Sound Effects: Muted');
    }
  }

  /* ========================================================
     5. HOURLY SCHEDULE PLANNER (STARTING 6:00 AM WITH DIRECT WRITE)
     ======================================================== */
  function renderHourlySchedule() {
    const grid = document.getElementById('hourlyTimeline');
    if (!grid) return;
    grid.innerHTML = '';

    const dayTasks = AppState.tasks.filter(t => t.date === AppState.selectedDate);

    // SCHEDULE STARTS AT 06:00 AM up to 22:00 (10:00 PM)
    for (let h = 6; h <= 22; h++) {
      const hourStr = String(h).padStart(2, '0');
      const nextHourStr = String(h === 23 ? 0 : h + 1).padStart(2, '0');
      const displayLabel = `${(h % 12) || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      const endLabel = `${((h + 1) % 12) || 12}:00 ${h + 1 >= 12 ? 'PM' : 'AM'}`;

      // Tasks assigned to this hour
      const matching = dayTasks.filter(t => {
        if (!t.dueTime) return false;
        const taskHour = t.dueTime.split(':')[0];
        return taskHour === hourStr;
      });

      const row = document.createElement('div');
      row.className = 'hour-row';
      row.setAttribute('data-hour', hourStr);

      row.innerHTML = `
        <div class="hour-label">
          <span>${displayLabel}</span>
          <span class="hour-subtext">to ${endLabel}</span>
        </div>
        <div class="hour-block" id="hourBlock_${hourStr}">
          ${
            matching.length > 0
              ? matching
                  .map(
                    m => `
                <div class="hour-task-chip ${m.completed ? 'completed' : ''}" data-task-id="${m.id}">
                  <button class="chip-toggle-btn" data-action="toggle-task" data-id="${m.id}" title="Toggle completed">
                    ${m.completed ? '✓' : ''}
                  </button>
                  <span>${getCategoryIcon(m.category)}</span>
                  <span class="chip-title">${escapeHTML(m.title)}</span>
                  <button class="chip-del-btn" data-action="del-task" data-id="${m.id}" title="Remove">✕</button>
                </div>
              `
                  )
                  .join('')
              : ''
          }
          
          <!-- DIRECT INLINE WRITE INPUT FIELD -->
          <div class="inline-hour-input-wrap">
            <input type="text" 
                   class="inline-hour-input" 
                   data-hour="${hourStr}" 
                   placeholder="+ Write activity for ${displayLabel} (Press Enter)..." 
                   autocomplete="off">
            <button class="inline-hour-add-btn" data-hour="${hourStr}" title="Add activity to this hour">＋</button>
          </div>
        </div>
      `;

      grid.appendChild(row);
    }

    // Attach event listeners for inline writing and chips
    attachHourlyInlineEvents();
  }

  function attachHourlyInlineEvents() {
    const grid = document.getElementById('hourlyTimeline');
    if (!grid) return;

    // Handle Inline Inputs
    grid.querySelectorAll('.inline-hour-input').forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitInlineHourTask(input);
        }
      });
    });

    // Handle Inline Add Buttons (＋)
    grid.querySelectorAll('.inline-hour-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hour = btn.getAttribute('data-hour');
        const input = grid.querySelector(`.inline-hour-input[data-hour="${hour}"]`);
        if (input) commitInlineHourTask(input);
      });
    });

    // Handle Chip Actions (Check / Delete)
    grid.querySelectorAll('[data-action="toggle-task"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        toggleTaskComplete(id);
      });
    });

    grid.querySelectorAll('[data-action="del-task"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        deleteTask(id);
      });
    });
  }

  function commitInlineHourTask(input) {
    const text = input.value.trim();
    const hour = input.getAttribute('data-hour');
    if (!text) return;

    // Detect category keywords
    let cat = 'Work';
    const lower = text.toLowerCase();
    if (lower.includes('run') || lower.includes('jog') || lower.includes('sprint') || lower.includes('km')) {
      cat = 'Running';
    } else if (lower.includes('gym') || lower.includes('workout') || lower.includes('stretch') || lower.includes('yoga')) {
      cat = 'Health';
    } else if (lower.includes('code') || lower.includes('bug') || lower.includes('dev') || lower.includes('deploy')) {
      cat = 'Code';
    } else if (lower.includes('read') || lower.includes('study') || lower.includes('learn')) {
      cat = 'Study';
    } else if (lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('groceries')) {
      cat = 'Personal';
    }

    addTask(text, cat, 'medium', '60', `${hour}:00`);
    input.value = '';
  }

  /* ========================================================
     6. RUNNING HUB & FITNESS CALCULATOR ENGINE
     ======================================================== */
  function initRunningHub() {
    const distInput = document.getElementById('calcDistanceInput');
    const timeInput = document.getElementById('calcTimeInput');
    const weightInput = document.getElementById('calcWeightInput');
    const terrainSelect = document.getElementById('calcTerrainSelect');

    const resPace = document.getElementById('calcResultPace');
    const resSpeed = document.getElementById('calcResultSpeed');
    const resCalories = document.getElementById('calcResultCalories');
    const resHydration = document.getElementById('calcResultHydration');

    const scheduleBtn = document.getElementById('addRunToScheduleBtn');
    const goalSelect = document.getElementById('goalPresetSelect');
    const logBtn = document.getElementById('logRunBtn');

    function updateRunCalculations() {
      const distance = parseFloat(distInput.value) || 0;
      const timeMins = parseFloat(timeInput.value) || 0;
      const weightKg = parseFloat(weightInput.value) || 70;
      const terrainMult = parseFloat(terrainSelect.value) || 1.0;

      if (distance <= 0 || timeMins <= 0) return;

      // 1. Average Speed (km/h)
      const hours = timeMins / 60;
      const speedKmH = distance / hours;

      // 2. Pace (minutes per km)
      const paceDecimal = timeMins / distance;
      const paceMins = Math.floor(paceDecimal);
      const paceSecs = Math.round((paceDecimal - paceMins) * 60);
      const paceFormatted = `${paceMins}:${String(paceSecs).padStart(2, '0')} min/km`;

      // 3. Calories Burned: Approx Weight(kg) * Distance(km) * 1.036 * Terrain
      const calories = Math.round(weightKg * distance * 1.036 * terrainMult);

      // 4. Recommended Hydration: ~12 ml per minute of running
      const hydrationMl = Math.round(timeMins * 12);

      if (resPace) resPace.textContent = paceFormatted;
      if (resSpeed) resSpeed.textContent = `${speedKmH.toFixed(1)} km/h`;
      if (resCalories) resCalories.textContent = `~${calories} kcal`;
      if (resHydration) resHydration.textContent = `${hydrationMl} ml`;
    }

    [distInput, timeInput, weightInput, terrainSelect].forEach(el => {
      if (el) el.addEventListener('input', updateRunCalculations);
    });

    // Schedule This Run at 6:00 AM Today
    if (scheduleBtn) {
      scheduleBtn.addEventListener('click', () => {
        const dist = distInput.value || 5;
        const mins = timeInput.value || 30;
        addTask(`Morning Run (${dist} km, ~${mins} mins)`, 'Running', 'high', mins, '06:00');
        sfx.complete();
        showToast(`🏃 Run scheduled for 6:00 AM today!`);
      });
    }

    // Goal Preset Advisor
    function updateGoalAdvisor() {
      if (!goalSelect) return;
      const val = goalSelect.value;
      const recTitle = document.getElementById('recTitle');
      const recDistance = document.getElementById('recDistance');
      const recDuration = document.getElementById('recDuration');
      const recFreq = document.getElementById('recFrequency');
      const recAdvice = document.getElementById('recAdvice');

      switch (val) {
        case 'fatloss':
          recTitle.textContent = 'Fat Loss Goal (Burn ~500 kcal)';
          recDistance.textContent = '6.8 km';
          recDuration.textContent = '~42-48 mins';
          recFreq.textContent = '3-4 days / week';
          recAdvice.textContent = 'Maintain an aerobic Zone 2 conversational pace to optimize fat metabolism without excessive fatigue.';
          break;
        case 'endurance':
          recTitle.textContent = 'Cardiovascular Endurance & Heart Health';
          recDistance.textContent = '4.0 - 5.0 km';
          recDuration.textContent = '~25-30 mins';
          recFreq.textContent = '4-5 days / week';
          recAdvice.textContent = 'Consistent moderate running improves stroke volume, VO2 max, and lowers resting blood pressure.';
          break;
        case '5k':
          recTitle.textContent = 'First 5K Finisher Preparation';
          recDistance.textContent = '3.5 - 5.0 km';
          recDuration.textContent = '~25-35 mins';
          recFreq.textContent = '3 days / week';
          recAdvice.textContent = 'Alternate running and walking intervals in week 1-2, building toward continuous 5K running by week 4.';
          break;
        case '10k':
          recTitle.textContent = '10K Race Training & Speed';
          recDistance.textContent = '8.0 - 10.0 km';
          recDuration.textContent = '~50-60 mins';
          recFreq.textContent = '4 days / week';
          recAdvice.textContent = 'Include one weekly long run, one tempo session, and two easy aerobic recovery runs.';
          break;
        case 'stress':
          recTitle.textContent = 'Mental Clarity & Stress Relief';
          recDistance.textContent = '3.0 km';
          recDuration.textContent = '~20 mins';
          recFreq.textContent = 'Daily / Alternate';
          recAdvice.textContent = 'Gentle morning jogs at 6:00 AM stimulate endorphins and dopamine to reset focus for the workday.';
          break;
      }
    }

    if (goalSelect) {
      goalSelect.addEventListener('change', updateGoalAdvisor);
    }

    // Quick Log Run
    if (logBtn) {
      logBtn.addEventListener('click', () => {
        const km = parseFloat(document.getElementById('quickLogKm').value) || 5;
        const mins = parseFloat(document.getElementById('quickLogMins').value) || 30;

        const paceDec = mins / km;
        const pM = Math.floor(paceDec);
        const pS = Math.round((paceDec - pM) * 60);
        const paceStr = `${pM}:${String(pS).padStart(2, '0')} min/km`;
        const cals = Math.round(70 * km * 1.036);

        const newRun = {
          id: 'run_' + Date.now(),
          date: AppState.selectedDate,
          distance: km,
          timeMinutes: mins,
          pace: paceStr,
          calories: cals,
          notes: 'Logged run session'
        };

        AppState.runs.unshift(newRun);
        saveData();
        sfx.complete();
        showToast(`🎉 Logged ${km} km run! (${cals} kcal)`);
        renderRunningHistory();
      });
    }

    updateRunCalculations();
    updateGoalAdvisor();
    renderRunningHistory();
  }

  function renderRunningHistory() {
    const list = document.getElementById('runHistoryList');
    const weeklyTotalEl = document.getElementById('runWeeklyTotalKm');
    if (!list) return;

    list.innerHTML = '';
    let totalKm = 0;

    AppState.runs.forEach(r => {
      totalKm += parseFloat(r.distance) || 0;
      const item = document.createElement('div');
      item.className = 'run-history-item';
      item.innerHTML = `
        <div class="run-history-info">
          <span class="run-icon">🏃</span>
          <div>
            <div class="run-title">${r.distance} km Run • ${r.timeMinutes} mins</div>
            <div class="run-stats">Pace: <strong>${r.pace}</strong> | Burned: <strong>~${r.calories} kcal</strong> | Date: ${r.date}</div>
          </div>
        </div>
        <button class="action-btn delete-btn" data-del-run="${r.id}" title="Remove entry">✕</button>
      `;
      list.appendChild(item);
    });

    if (weeklyTotalEl) {
      weeklyTotalEl.textContent = totalKm.toFixed(1);
    }

    list.querySelectorAll('[data-del-run]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-run');
        AppState.runs = AppState.runs.filter(r => r.id !== id);
        saveData();
        sfx.click();
        renderRunningHistory();
      });
    });
  }

  /* ========================================================
     7. DAILY TASK LIST RENDERING & CRUD
     ======================================================== */
  function renderDailyTasks() {
    const container = document.getElementById('tasksList');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    let dayTasks = AppState.tasks.filter(t => t.date === AppState.selectedDate);

    // Apply Status Filter
    if (AppState.currentFilter === 'active') {
      dayTasks = dayTasks.filter(t => !t.completed);
    } else if (AppState.currentFilter === 'completed') {
      dayTasks = dayTasks.filter(t => t.completed);
    } else if (AppState.currentFilter === 'high') {
      dayTasks = dayTasks.filter(t => t.priority === 'high');
    }

    // Apply Category Filter
    if (AppState.categoryFilter !== 'all') {
      dayTasks = dayTasks.filter(t => t.category === AppState.categoryFilter);
    }

    // Apply Search Query
    if (AppState.searchQuery.trim()) {
      const q = AppState.searchQuery.toLowerCase();
      dayTasks = dayTasks.filter(
        t => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Sort: uncompleted first, then high priority first
    dayTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const prioOrder = { high: 1, medium: 2, low: 3 };
      return (prioOrder[a.priority] || 2) - (prioOrder[b.priority] || 2);
    });

    container.innerHTML = '';

    if (dayTasks.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';

      dayTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority} ${task.completed ? 'completed' : ''}`;
        card.setAttribute('data-id', task.id);

        card.innerHTML = `
          <div class="custom-checkbox" data-action="toggle" title="Mark complete"></div>
          <div class="task-content">
            <div class="task-title-row">
              <span class="task-title">${escapeHTML(task.title)}</span>
            </div>
            <div class="task-meta-row">
              <span class="category-tag">${getCategoryIcon(task.category)} ${task.category}</span>
              <span class="priority-tag p-${task.priority}">${task.priority.toUpperCase()}</span>
              ${task.dueTime ? `<span>⏰ ${task.dueTime}</span>` : ''}
              ${task.duration ? `<span>⏱️ ${task.duration}m</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="action-btn" data-action="focus" title="Focus in Pomodoro">⏱️</button>
            <button class="action-btn" data-action="edit" title="Edit task">✏️</button>
            <button class="action-btn delete-btn" data-action="delete" title="Delete task">✕</button>
          </div>
        `;

        container.appendChild(card);
      });
    }

    updateSummaryCards();
    renderHourlySchedule();
    renderAnalytics();
  }

  function getCategoryIcon(cat) {
    switch (cat) {
      case 'Work': return '💼';
      case 'Code': return '💻';
      case 'Running': return '🏃';
      case 'Health': return '💪';
      case 'Study': return '📚';
      case 'Personal': return '🏠';
      default: return '🏷️';
    }
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function addTask(title, category, priority, duration, dueTime) {
    const newTask = {
      id: 'task_' + Date.now(),
      title: title.trim(),
      category: category || 'Work',
      priority: priority || 'medium',
      duration: duration || '30',
      dueTime: dueTime || '06:00',
      completed: false,
      date: AppState.selectedDate,
      notes: ''
    };

    AppState.tasks.unshift(newTask);
    saveData();
    sfx.click();
    showToast(`Added: "${newTask.title}"`);
    renderDailyTasks();
  }

  function toggleTaskComplete(id) {
    const task = AppState.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveData();

    if (task.completed) {
      sfx.complete();
      showToast('Task completed! Great momentum.');
    } else {
      sfx.click();
    }
    renderDailyTasks();
  }

  function deleteTask(id) {
    AppState.tasks = AppState.tasks.filter(t => t.id !== id);
    saveData();
    sfx.click();
    showToast('Task removed.');
    renderDailyTasks();
  }

  /* ========================================================
     8. SUMMARY & PROGRESS METRICS
     ======================================================== */
  function updateSummaryCards() {
    const allForDay = AppState.tasks.filter(t => t.date === AppState.selectedDate);
    const completed = allForDay.filter(t => t.completed);
    const active = allForDay.filter(t => !t.completed);
    const high = allForDay.filter(t => t.priority === 'high' && !t.completed);

    const total = allForDay.length;
    const pct = total === 0 ? 0 : Math.round((completed.length / total) * 100);

    const totalEl = document.getElementById('totalTasksCount');
    const activeEl = document.getElementById('activeTasksCount');
    const completedEl = document.getElementById('completedTasksCount');
    const highEl = document.getElementById('highPriorityCount');
    const pctEl = document.getElementById('progressPercentage');
    const headEl = document.getElementById('progressHeadline');
    const subEl = document.getElementById('progressSubline');
    const ringEl = document.getElementById('progressRingCircle');
    const streakEl = document.getElementById('streakCount');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active.length;
    if (completedEl) completedEl.textContent = completed.length;
    if (highEl) highEl.textContent = high.length;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (streakEl) streakEl.textContent = AppState.streak;

    if (subEl) subEl.textContent = `${completed.length} of ${total} tasks completed`;

    if (headEl) {
      if (total === 0) headEl.textContent = 'Plan your tasks for today in Tracko';
      else if (pct === 100) headEl.textContent = '🎉 All daily tasks completed!';
      else if (pct >= 50) headEl.textContent = 'Great momentum! More than halfway.';
      else headEl.textContent = 'Conquer your 6:00 AM to night schedule.';
    }

    if (ringEl) {
      const circumference = 2 * Math.PI * 32;
      const offset = circumference - (pct / 100) * circumference;
      ringEl.style.strokeDashoffset = offset;
    }

    const cfAll = document.getElementById('countFilterAll');
    const cfActive = document.getElementById('countFilterActive');
    const cfDone = document.getElementById('countFilterDone');
    if (cfAll) cfAll.textContent = total;
    if (cfActive) cfActive.textContent = active.length;
    if (cfDone) cfDone.textContent = completed.length;
  }

  /* ========================================================
     9. POMODORO FOCUS TIMER
     ======================================================== */
  function initPomodoro() {
    const clock = document.getElementById('timerClock');
    const toggleBtn = document.getElementById('timerToggleBtn');
    const resetBtn = document.getElementById('timerResetBtn');
    const modeBtns = document.querySelectorAll('.pomo-mode-btn');
    const icon = document.getElementById('timerBtnIcon');
    const text = document.getElementById('timerBtnText');

    function updateClockDisplay() {
      if (clock) clock.textContent = formatMinutes(AppState.pomodoro.timeLeft);
    }

    function setMode(mode) {
      AppState.pomodoro.mode = mode;
      pauseTimer();

      if (mode === 'work') AppState.pomodoro.timeLeft = 25 * 60;
      else if (mode === 'shortBreak') AppState.pomodoro.timeLeft = 5 * 60;
      else if (mode === 'longBreak') AppState.pomodoro.timeLeft = 15 * 60;

      modeBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-mode') === mode);
      });

      const label = document.getElementById('timerStatusLabel');
      if (label) {
        if (mode === 'work') label.textContent = 'Stay focused on your active objective';
        else label.textContent = 'Take a deep breath and recharge';
      }

      updateClockDisplay();
    }

    function startTimer() {
      if (AppState.pomodoro.isRunning) return;
      AppState.pomodoro.isRunning = true;
      if (icon) icon.textContent = '⏸';
      if (text) text.textContent = 'Pause Focus';
      sfx.click();

      AppState.pomodoro.intervalId = setInterval(() => {
        if (AppState.pomodoro.timeLeft > 0) {
          AppState.pomodoro.timeLeft--;
          updateClockDisplay();
        } else {
          pauseTimer();
          sfx.timerBell();
          AppState.pomodoro.cyclesCompleted++;

          const cycleEl = document.getElementById('pomoCyclesCount');
          if (cycleEl) {
            cycleEl.textContent = AppState.pomodoro.cyclesCompleted;
          }

          if (AppState.pomodoro.mode === 'work') {
            showToast('🎉 Focus cycle complete! Take a well-earned break.');
            setMode('shortBreak');
          } else {
            showToast('Break finished! Ready to focus?');
            setMode('work');
          }
        }
      }, 1000);
    }

    function pauseTimer() {
      AppState.pomodoro.isRunning = false;
      if (AppState.pomodoro.intervalId) {
        clearInterval(AppState.pomodoro.intervalId);
        AppState.pomodoro.intervalId = null;
      }
      if (icon) icon.textContent = '▶';
      if (text) text.textContent = 'Start Focus';
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (AppState.pomodoro.isRunning) pauseTimer();
        else startTimer();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        sfx.click();
        setMode(AppState.pomodoro.mode);
      });
    }

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sfx.click();
        setMode(btn.getAttribute('data-mode'));
      });
    });

    updateClockDisplay();
  }

  function linkTaskToPomodoro(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;

    AppState.pomodoro.activeTaskId = taskId;
    const titleEl = document.getElementById('activeFocusTaskTitle');
    if (titleEl) {
      titleEl.textContent = task.title;
    }

    switchTab('pomodoro');
    sfx.click();
    showToast(`Focus target set: "${task.title}"`);
  }

  /* ========================================================
     10. PRODUCTIVITY ANALYTICS
     ======================================================== */
  function renderAnalytics() {
    const chartBars = document.getElementById('weeklyChartBars');
    const catBars = document.getElementById('categoryBreakdownBars');
    if (!chartBars || !catBars) return;

    chartBars.innerHTML = '';
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const todayIndex = new Date().getDay();
    const adjustedToday = todayIndex === 0 ? 6 : todayIndex - 1;

    daysOfWeek.forEach((day, idx) => {
      let count = 0;
      if (idx === adjustedToday) {
        count = AppState.tasks.filter(t => t.date === AppState.selectedDate && t.completed).length;
      } else {
        count = Math.max(1, (idx * 2 + 1) % 6);
      }

      const barWrap = document.createElement('div');
      barWrap.className = 'chart-bar-wrap';
      const heightPct = Math.min(100, count * 18 + 12);

      barWrap.innerHTML = `
        <span style="font-size:0.7rem;color:var(--text-muted);">${count}</span>
        <div class="chart-bar-fill" style="height:${heightPct}%;"></div>
      `;
      chartBars.appendChild(barWrap);
    });

    catBars.innerHTML = '';
    const categories = ['Work', 'Code', 'Running', 'Health', 'Study', 'Personal'];
    const totalTasks = AppState.tasks.length || 1;

    categories.forEach(cat => {
      const count = AppState.tasks.filter(t => t.category === cat).length;
      const pct = Math.round((count / totalTasks) * 100);

      const row = document.createElement('div');
      row.className = 'cat-bar-row';
      row.innerHTML = `
        <div class="cat-bar-label">
          <span>${getCategoryIcon(cat)} ${cat}</span>
          <strong>${count} tasks (${pct}%)</strong>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${pct}%;"></div>
        </div>
      `;
      catBars.appendChild(row);
    });
  }

  /* ========================================================
     11. TAB NAVIGATION & MODALS
     ======================================================== */
  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `tab-${tabName}`);
    });
  }

  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sfx.click();
        switchTab(btn.getAttribute('data-tab'));
      });
    });
  }

  function initEditModal() {
    const modal = document.getElementById('taskEditModal');
    const backdrop = document.getElementById('editModalBackdrop');
    const closeBtn = document.getElementById('closeEditModalBtn');
    const form = document.getElementById('editTaskForm');
    const deleteBtn = document.getElementById('deleteTaskModalBtn');

    function closeModal() {
      if (modal) modal.classList.remove('active');
      sfx.click();
    }

    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('editTaskId').value;
        const task = AppState.tasks.find(t => t.id === id);
        if (task) {
          task.title = document.getElementById('editTaskTitle').value.trim();
          task.category = document.getElementById('editTaskCategory').value;
          task.priority = document.getElementById('editTaskPriority').value;
          task.dueTime = document.getElementById('editTaskDueTime').value;
          task.duration = document.getElementById('editTaskDuration').value;
          task.notes = document.getElementById('editTaskNotes').value.trim();

          saveData();
          sfx.complete();
          showToast('Task updated successfully.');
          renderDailyTasks();
          closeModal();
        }
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const id = document.getElementById('editTaskId').value;
        if (confirm('Delete this task?')) {
          deleteTask(id);
          closeModal();
        }
      });
    }
  }

  function openEditModal(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskCategory').value = task.category;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskDueTime').value = task.dueTime || '06:00';
    document.getElementById('editTaskDuration').value = task.duration || '30';
    document.getElementById('editTaskNotes').value = task.notes || '';

    const modal = document.getElementById('taskEditModal');
    if (modal) {
      modal.classList.add('active');
      sfx.click();
    }
  }

  function initBackupModal() {
    const modal = document.getElementById('backupModal');
    const openBtn = document.getElementById('backupModalBtn');
    const backdrop = document.getElementById('backupModalBackdrop');
    const closeBtn = document.getElementById('closeBackupModalBtn');
    const exportBtn = document.getElementById('exportJsonBtn');
    const importBtn = document.getElementById('importJsonBtn');
    const fileInput = document.getElementById('importJsonFileInput');
    const resetBtn = document.getElementById('resetAllDataBtn');

    function closeModal() {
      if (modal) modal.classList.remove('active');
      sfx.click();
    }

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (modal) modal.classList.add('active');
        sfx.click();
      });
    }

    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const exportPayload = {
          tasks: AppState.tasks,
          runs: AppState.runs,
          streak: AppState.streak
        };
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `tracko_backup_${AppState.selectedDate}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        sfx.complete();
        showToast('Tracko backup downloaded successfully!');
      });
    }

    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const imported = JSON.parse(ev.target.result);
            if (imported.tasks && Array.isArray(imported.tasks)) {
              AppState.tasks = imported.tasks;
              if (imported.runs && Array.isArray(imported.runs)) AppState.runs = imported.runs;
              saveData();
              sfx.complete();
              showToast('Tracko backup restored successfully!');
              renderDailyTasks();
              renderRunningHistory();
              closeModal();
            } else if (Array.isArray(imported)) {
              AppState.tasks = imported;
              saveData();
              sfx.complete();
              showToast('Tasks restored successfully!');
              renderDailyTasks();
              closeModal();
            } else {
              alert('Invalid backup format.');
            }
          } catch (err) {
            alert('Error parsing JSON backup file.');
          }
        };
        reader.readAsText(file);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all tasks & runs in Tracko?')) {
          AppState.tasks = [];
          AppState.runs = [];
          saveData();
          sfx.click();
          showToast('Tracko data reset.');
          renderDailyTasks();
          renderRunningHistory();
          closeModal();
        }
      });
    }
  }

  /* ========================================================
     12. DATE NAVIGATOR & EVENT LISTENERS
     ======================================================== */
  function initDateNavigator() {
    const display = document.getElementById('currentDateDisplay');
    const todayBtn = document.getElementById('todayBtn');
    const prevBtn = document.getElementById('prevDayBtn');
    const nextBtn = document.getElementById('nextDayBtn');

    function updateDateUI() {
      if (display) display.textContent = formatReadableDate(AppState.selectedDate);
      renderDailyTasks();
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        AppState.selectedDate = getTodayString();
        sfx.click();
        updateDateUI();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const parts = AppState.selectedDate.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() - 1);
        AppState.selectedDate = formatDate(d);
        sfx.click();
        updateDateUI();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const parts = AppState.selectedDate.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() + 1);
        AppState.selectedDate = formatDate(d);
        sfx.click();
        updateDateUI();
      });
    }

    updateDateUI();
  }

  function initEventListeners() {
    const addForm = document.getElementById('quickAddForm');
    if (addForm) {
      addForm.addEventListener('submit', e => {
        e.preventDefault();
        const text = document.getElementById('taskInputText').value;
        const cat = document.getElementById('taskCategorySelect').value;
        const prio = document.getElementById('taskPrioritySelect').value;
        const dur = document.getElementById('taskDurationSelect').value;
        const due = document.getElementById('taskDueTimeInput').value;

        if (text) {
          addTask(text, cat, prio, dur, due);
          document.getElementById('taskInputText').value = '';
        }
      });
    }

    const taskList = document.getElementById('tasksList');
    if (taskList) {
      taskList.addEventListener('click', e => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const id = card.getAttribute('data-id');

        const toggleBtn = e.target.closest('[data-action="toggle"]');
        const deleteBtn = e.target.closest('[data-action="delete"]');
        const editBtn = e.target.closest('[data-action="edit"]');
        const focusBtn = e.target.closest('[data-action="focus"]');

        if (toggleBtn) {
          toggleTaskComplete(id);
        } else if (deleteBtn) {
          deleteTask(id);
        } else if (editBtn) {
          openEditModal(id);
        } else if (focusBtn) {
          linkTaskToPomodoro(id);
        }
      });
    }

    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.currentFilter = pill.getAttribute('data-status');
        sfx.click();
        renderDailyTasks();
      });
    });

    const catSelect = document.getElementById('categoryFilterSelect');
    if (catSelect) {
      catSelect.addEventListener('change', () => {
        AppState.categoryFilter = catSelect.value;
        sfx.click();
        renderDailyTasks();
      });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        AppState.searchQuery = e.target.value;
        renderDailyTasks();
      });
    }

    const clearCompleted = document.getElementById('clearCompletedBtn');
    if (clearCompleted) {
      clearCompleted.addEventListener('click', () => {
        const completedCount = AppState.tasks.filter(t => t.date === AppState.selectedDate && t.completed).length;
        if (completedCount === 0) {
          showToast('No completed tasks to clear.');
          return;
        }
        AppState.tasks = AppState.tasks.filter(t => !(t.date === AppState.selectedDate && t.completed));
        saveData();
        sfx.click();
        showToast(`Cleared ${completedCount} completed tasks.`);
        renderDailyTasks();
      });
    }

    const sampleBtn = document.getElementById('sampleTasksBtn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        seedDefaultTasks();
        seedDefaultRuns();
        sfx.complete();
        showToast('Demo tasks & running logs reloaded in Tracko!');
        renderDailyTasks();
        renderRunningHistory();
      });
    }

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) soundBtn.addEventListener('click', toggleSound);
  }

  /* ========================================================
     13. INITIALIZATION
     ======================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initDateNavigator();
    initTabs();
    initPomodoro();
    initRunningHub();
    initEditModal();
    initBackupModal();
    initEventListeners();
    renderDailyTasks();

    console.log('%c🚀 Tracko Suite Online | Smart Daily Planner & Run Hub | Avinash Naik', 'color:#3b82f6;font-weight:bold;');
  });
})();
