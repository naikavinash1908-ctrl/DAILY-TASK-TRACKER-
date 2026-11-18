/* ========================================================
   DAILY TASK TRACKER — PRODUCTION APPLICATION LOGIC
   FULL CRUD, TIME-BLOCKING, POMODORO TIMER, SOUND & ANALYTICS
   ======================================================== */

(function () {
  'use strict';

  // State keys
  const STORAGE_KEY = 'daily_task_tracker_data_v1';
  const SETTINGS_KEY = 'daily_task_tracker_settings_v1';

  // Application State
  const AppState = {
    selectedDate: getTodayString(),
    currentFilter: 'all',
    categoryFilter: 'all',
    searchQuery: '',
    soundEnabled: true,
    theme: 'dark',
    streak: 1,
    tasks: [],
    pomodoro: {
      mode: 'work', // work (25), shortBreak (5), longBreak (15)
      timeLeft: 25 * 60,
      isRunning: false,
      intervalId: null,
      activeTaskId: null,
      cyclesCompleted: 0
    }
  };

  /* ========================================================
     1. AUDIO SYNTHESIZER (WEB AUDIO API)
     No external audio files needed!
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
      } catch (e) {
        // Audio might be waiting for user gesture
      }
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
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
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
      // Seed default productive demo tasks for Today
      seedDefaultTasks();
    }

    applyTheme(AppState.theme);
    updateSoundUI();
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.tasks));
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
        id: 'task_1',
        title: 'Review Daily Task Tracker UI & Architecture',
        category: 'Code',
        priority: 'high',
        duration: '45',
        dueTime: '09:30',
        completed: true,
        date: today,
        notes: 'Ensure responsive breakpoints and Pomodoro timer cycle counts.'
      },
      {
        id: 'task_2',
        title: 'Deploy to GitHub Pages and verify live telemetry',
        category: 'Work',
        priority: 'high',
        duration: '30',
        dueTime: '11:00',
        completed: true,
        date: today,
        notes: 'Check repository contents and custom domain routing.'
      },
      {
        id: 'task_3',
        title: '30-minute cardio & strength routine',
        category: 'Health',
        priority: 'medium',
        duration: '30',
        dueTime: '16:00',
        completed: false,
        date: today,
        notes: 'Hydrate well and stretch post-workout.'
      },
      {
        id: 'task_4',
        title: 'Study JavaScript ES6 state patterns & Web Audio API',
        category: 'Study',
        priority: 'medium',
        duration: '60',
        dueTime: '14:30',
        completed: false,
        date: today,
        notes: 'Review audio oscillator wave shapes (sine vs triangle).'
      },
      {
        id: 'task_5',
        title: 'Plan tomorrow’s priorities & time blocks',
        category: 'Personal',
        priority: 'low',
        duration: '15',
        dueTime: '20:00',
        completed: false,
        date: today,
        notes: 'Keep high priority slots in the morning.'
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
     5. TASK RENDERING & CRUD
     ======================================================== */
  function renderDailyTasks() {
    const container = document.getElementById('tasksList');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    // Filter tasks for current selected date
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
      case 'Study': return '📚';
      case 'Health': return '💪';
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
      dueTime: dueTime || '12:00',
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
     6. SUMMARY & PROGRESS METRICS
     ======================================================== */
  function updateSummaryCards() {
    const allForDay = AppState.tasks.filter(t => t.date === AppState.selectedDate);
    const completed = allForDay.filter(t => t.completed);
    const active = allForDay.filter(t => !t.completed);
    const high = allForDay.filter(t => t.priority === 'high' && !t.completed);

    const total = allForDay.length;
    const pct = total === 0 ? 0 : Math.round((completed.length / total) * 100);

    // Update Counts
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
      if (total === 0) headEl.textContent = 'Plan your tasks for today';
      else if (pct === 100) headEl.textContent = '🎉 All daily tasks completed!';
      else if (pct >= 50) headEl.textContent = 'Great momentum! More than halfway.';
      else headEl.textContent = 'Stay focused and conquer your day.';
    }

    // Progress Ring Calculation (Circumference ~ 201 for r=32)
    if (ringEl) {
      const circumference = 2 * Math.PI * 32;
      const offset = circumference - (pct / 100) * circumference;
      ringEl.style.strokeDashoffset = offset;
    }

    // Filter Badges
    const cfAll = document.getElementById('countFilterAll');
    const cfActive = document.getElementById('countFilterActive');
    const cfDone = document.getElementById('countFilterDone');
    if (cfAll) cfAll.textContent = total;
    if (cfActive) cfActive.textContent = active.length;
    if (cfDone) cfDone.textContent = completed.length;
  }

  /* ========================================================
     7. POMODORO FOCUS TIMER
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
          // Timer finished
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

    // Switch to pomodoro tab
    switchTab('pomodoro');
    sfx.click();
    showToast(`Focus target set: "${task.title}"`);
  }

  /* ========================================================
     8. HOURLY SCHEDULE TIMELINE
     ======================================================== */
  function renderHourlySchedule() {
    const grid = document.getElementById('hourlyTimeline');
    if (!grid) return;
    grid.innerHTML = '';

    const dayTasks = AppState.tasks.filter(t => t.date === AppState.selectedDate);

    // Hours from 08:00 to 20:00 (8 AM to 8 PM)
    for (let h = 8; h <= 20; h++) {
      const hourStr = String(h).padStart(2, '0');
      const displayLabel = `${(h % 12) || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;

      // Find tasks assigned to this hour
      const matching = dayTasks.filter(t => {
        if (!t.dueTime) return false;
        const taskHour = t.dueTime.split(':')[0];
        return taskHour === hourStr;
      });

      const row = document.createElement('div');
      row.className = 'hour-row';
      row.innerHTML = `
        <div class="hour-label">${displayLabel}</div>
        <div class="hour-block">
          ${
            matching.length > 0
              ? matching
                  .map(
                    m => `
                <div class="hour-task-chip ${m.completed ? 'completed' : ''}" style="${
                      m.completed ? 'opacity:0.6;text-decoration:line-through;' : ''
                    }">
                  <span>${getCategoryIcon(m.category)}</span>
                  <span>${escapeHTML(m.title)}</span>
                </div>
              `
                  )
                  .join('')
              : '<span style="color:var(--text-muted);font-size:0.78rem;">Free window</span>'
          }
        </div>
      `;
      grid.appendChild(row);
    }
  }

  /* ========================================================
     9. PRODUCTIVITY ANALYTICS
     ======================================================== */
  function renderAnalytics() {
    const chartBars = document.getElementById('weeklyChartBars');
    const catBars = document.getElementById('categoryBreakdownBars');
    if (!chartBars || !catBars) return;

    // A. Weekly completion bars
    chartBars.innerHTML = '';
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Simulated weekly sample data mapped with current day counts
    const todayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
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

    // B. Category Distribution
    catBars.innerHTML = '';
    const categories = ['Work', 'Code', 'Study', 'Personal', 'Health'];
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
     10. TAB NAVIGATION & MODALS
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
    document.getElementById('editTaskDueTime').value = task.dueTime || '12:00';
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

    // Export JSON
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(AppState.tasks, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `daily_tasks_backup_${AppState.selectedDate}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        sfx.complete();
        showToast('Backup JSON downloaded successfully!');
      });
    }

    // Import JSON
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const imported = JSON.parse(ev.target.result);
            if (Array.isArray(imported)) {
              AppState.tasks = imported;
              saveData();
              sfx.complete();
              showToast('Backup restored successfully!');
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

    // Reset All
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all tasks? This action cannot be undone.')) {
          AppState.tasks = [];
          saveData();
          sfx.click();
          showToast('All tasks cleared.');
          renderDailyTasks();
          closeModal();
        }
      });
    }
  }

  /* ========================================================
     11. DATE NAVIGATOR & EVENT LISTENERS
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
    // Quick Add Form
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

    // List event delegation (complete, edit, delete, focus)
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

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.currentFilter = pill.getAttribute('data-status');
        sfx.click();
        renderDailyTasks();
      });
    });

    // Category filter dropdown
    const catSelect = document.getElementById('categoryFilterSelect');
    if (catSelect) {
      catSelect.addEventListener('change', () => {
        AppState.categoryFilter = catSelect.value;
        sfx.click();
        renderDailyTasks();
      });
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        AppState.searchQuery = e.target.value;
        renderDailyTasks();
      });
    }

    // Clear completed button
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

    // Load sample template button
    const sampleBtn = document.getElementById('sampleTasksBtn');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        seedDefaultTasks();
        sfx.complete();
        showToast('Demo productivity tasks loaded!');
        renderDailyTasks();
      });
    }

    // Theme & Sound header buttons
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) soundBtn.addEventListener('click', toggleSound);
  }

  /* ========================================================
     12. INITIALIZATION
     ======================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initDateNavigator();
    initTabs();
    initPomodoro();
    initEditModal();
    initBackupModal();
    initEventListeners();
    renderDailyTasks();

    console.log('%c🚀 Daily Task Tracker Engine Online | Crafted by Avinash Naik', 'color:#3b82f6;font-weight:bold;');
  });
})();
