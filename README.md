# ⚡ Tracko — Smart Daily Planner & Run Suite

A modern, high-performance daily productivity, time-blocking, and cardio-tracking web application engineered by **Avinash Naik** (`@naikavinash1908-ctrl`).

Designed to streamline daily execution with **Direct-Write Hourly Time-Blocking (starting at 6:00 AM)**, an integrated **Running & Fitness Calculator Hub**, a **Pomodoro Focus Station**, and **Productivity Analytics**.

---

## 🌟 Key Features in Tracko

1. **📅 Direct-Write Daily Schedule Planner (Starts at 6:00 AM)**:
   - Full hourly time-block layout from **6:00 AM to 10:00 PM**.
   - **Direct Inline Writing**: Click or type right inside any hour slot and press <kbd>Enter</kbd> to instantly schedule your activity.
   - Quick checkmark toggle and removal directly on the schedule cards.

2. **🏃 Running Hub & Cardio Calculator Suite**:
   - **Instant Run Math**: Calculates speed ($km/h$), pace ($min/km$), total calories burned, and recommended hydration based on distance, duration, body weight, and terrain.
   - **"How Much Running Do I Need?" Advisor**: Goal-driven targets for Fat Loss (burn 500 kcal), 5K Preparation, 10K Training, Cardiovascular Endurance, and Stress Relief.
   - **One-Click Scheduling**: Automatically schedule your morning run at **6:00 AM** with one click.
   - **Run Activity Log**: Track running sessions, weekly mileage progress, and running streaks.

3. **⏱️ Integrated Pomodoro Focus Station**:
   - 25-minute Deep Work, 5-minute Short Break, and 15-minute Long Break intervals.
   - Link any active task directly from your list or schedule to the Pomodoro timer.
   - Web Audio API notification bells when cycles finish.

4. **📋 Daily Task Board & Priority Matrix**:
   - Priority badges (`P1 • High`, `P2 • Medium`, `P3 • Low`).
   - Category tags: `🏃 Running`, `💼 Work`, `💻 Coding`, `📚 Study`, `💪 Fitness`, and `🏠 Personal`.
   - Day navigator (`< Today >`) to inspect past or future days.
   - Local JSON backup & restore tool (export/import your data across devices).

5. **🎨 Modern Glassmorphic Design & Themes**:
   - 3 Curated Themes: **Cosmic Obsidian (Dark)**, **Focus Emerald (Teal)**, and **Clean Paper (Light)**.
   - Web Audio API synthesizer for clean sound feedback.

---

## 📂 File Architecture

```text
daily-task-tracker/
├── index.html     # Semantic dashboard structure, 6 AM scheduler, Run Hub & modals
├── style.css      # Glassmorphic UI design system, CSS variables & animations
├── script.js     # Direct-write scheduler, running calculator, Pomodoro & state
└── README.md      # Documentation & deployment guide
```

---

## 🚀 Running Locally

1. Open `C:\Users\naika\.gemini\antigravity\scratch\daily-task-tracker\`
2. Double-click **`index.html`** in any browser (Chrome, Edge, Firefox, Brave).
3. No build tools or Node.js required—runs 100% client-side with native `localStorage`.

---

## 🌐 Live Website (GitHub Pages)

Access Tracko online:  
`https://naikavinash1908-ctrl.github.io/DAILY-TASK-TRACKER-/`
