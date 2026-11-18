# 📌 Daily Task Tracker — Focus & Productivity Suite

A modern, high-performance daily productivity and task-tracking web application engineered by **Avinash Naik** (`@naikavinash1908-ctrl`).

Designed to streamline task execution with **Time-Blocking**, integrated **Pomodoro Focus Timer**, **Daily Streaks**, and real-time **Productivity Analytics**.

---

## 🌟 Key Features

1. **Daily Task Management & Prioritization**:
   - Quick-add with **Priority Badges** (`P1 • High`, `P2 • Medium`, `P3 • Low`).
   - Category tags: `💼 Work`, `💻 Coding`, `📚 Study`, `💪 Health`, and `🏠 Personal`.
   - Estimated durations & scheduled due times.
   - Smooth check transitions with completion sound chimes.

2. **⏱️ Integrated Pomodoro Focus Station**:
   - 25-minute Deep Work, 5-minute Short Break, and 15-minute Long Break intervals.
   - Link any active task directly from your list to the Pomodoro timer.
   - Web Audio API notification bells when cycles finish.

3. **📅 Hourly Schedule Planner (Time-Blocking)**:
   - Visual time-block grid from **8:00 AM to 8:00 PM**.
   - Automatically maps your daily tasks to their scheduled hour slots for balanced workflow management.

4. **📊 Real-time Productivity Analytics**:
   - Circular daily completion progress ring.
   - 7-day completion momentum bar chart.
   - Category distribution percentage tracker.
   - Productivity health score rating.

5. **🔥 Daily Streak Engine & Day Navigator**:
   - Easily traverse between days using `< Today >` navigation controls.
   - Keeps track of consecutive productive execution days.

6. **🎨 Customization & Data Sovereignty**:
   - 3 Curated Themes: **Cosmic Obsidian (Dark)**, **Focus Emerald (Teal)**, and **Clean Paper (Light)**.
   - Web Audio API synthesizer for clean sound feedback (no external MP3 downloads required).
   - Local JSON data backup & restore tool (export/import your tasks across any browser).

---

## 📂 File Architecture

```text
daily-task-tracker/
├── index.html     # Semantic dashboard structure, modals & view tabs
├── style.css      # Glassmorphic UI design system, CSS variables & animations
├── script.js     # State management, Pomodoro timer, audio synth & analytics
└── README.md      # Documentation & deployment guide
```

---

## 🚀 Running Locally

1. Open `C:\Users\naika\.gemini\antigravity\scratch\daily-task-tracker\`
2. Double-click **`index.html`** in any browser (Chrome, Edge, Firefox, Brave).
3. No build tools or Node.js required—runs 100% client-side with native `localStorage`.

---

## 🌐 Deploy to GitHub Pages (Free Hosting)

To make your Daily Task Tracker accessible from your mobile phone or any computer:

1. In this repository (`naikavinash1908-ctrl/DAILY-TASK-TRACKER-`), navigate to:
   **Settings** > **Pages**
2. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / Folder: `/(root)`
3. Click **Save**.
4. Your tracker will be live at:
   `https://naikavinash1908-ctrl.github.io/DAILY-TASK-TRACKER-/`
