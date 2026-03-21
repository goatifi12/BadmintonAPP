# 🏸 Badminton AI – Professional Match Analysis 

Badminton AI is a full-stack computer vision and analytics platform that turns raw badminton match videos into **actionable performance insights**. The system analyzes uploaded videos to detect players and the shuttlecock, segment rallies, classify strokes, and generate professional-level statistics — all presented in a modern, interactive dashboard with an AI coaching assistant.

This project is designed to simulate a **real-world sports analytics product**, combining machine learning, backend APIs, and a production-style frontend.

---

## 🚀 Core Features

### 🎥 Video-Based Match Analysis

* Upload match or practice footage (single-camera, Birds eye view)
* Automatic frame-by-frame analysis
* Processes videos asynchronously via a FastAPI backend

### 🧠 Computer Vision & AI

* **Player detection & tracking**
* **Shuttlecock detection**
* **Stroke classification** (Smash, Clear, Drop, Net)

### 📊 Performance Metrics

* Frames processed
* Total detections
* Rally count & rally length
* Shuttle speed statistics (avg / max / min)
* Player movement distance
* Stroke distribution breakdown
* Consistency & variance metrics

> ⚠️ Note: Some advanced metrics are currently experimental and require further normalization (e.g., pixel-to-meter conversion for real-world speed accuracy).

### 💬 AI Coaching Assistant

* Integrated chat interface
* Designed to explain metrics in plain language
* Intended to provide training suggestions based on match data

### 🖥️ Professional Dashboard UI

* Dark-mode, modern sports analytics aesthetic
* Tailwind CSS styling
* Chart.js visualizations
* Modular SPA-style navigation

---

## 🧩 System Architecture

### Frontend (Client)

* **HTML / CSS / JavaScript**
* Tailwind CSS for styling
* Chart.js for charts
* Modular component-based structure

Key frontend modules:

* `analysis.js` – analysis page logic, metrics rendering
* `dashboard.js` – overview dashboard
* `chat.js` – AI assistant UI
* `navigation.js` – SPA routing
* `auth.js` – authentication flow

### Backend (Server)

* **Python + FastAPI**
* Video upload & processing endpoint (`/analyze`)
* Model inference pipeline
* JSON-based metrics response

### AI / CV Pipeline (Current Scope)

* Frame sampling
* Object detection (players + shuttle)
* Temporal aggregation
* Stroke classification (≈70% accuracy target)

---

## 📁 Project Structure

```
project-root/
│
├── index.html              # Main HTML entry point
├── styles.css              # Global styles
│
├── js/
│   ├── app.js              # App initialization
│   ├── auth.js             # Auth logic
│   ├── navigation.js       # Page routing
│   ├── theme.js            # Dark/light mode
│   └── components/
│       ├── analysis.js     # Analysis page logic
│       ├── dashboard.js    # Dashboard UI
│       ├── chat.js         # AI assistant
│       ├── settings.js
│       └── navigation.js
│
├── backend/
│   ├── main.py             # FastAPI server
│   ├── analyze.py          # Video analysis pipeline
│   └── models/
│       └── stroke_classifier.py
│
└── outputs/
    └── *.mp4               # Processed videos
```

---

## 🔌 API Overview

### `POST /analyze`

Uploads a video and triggers analysis.

**Request**

* `multipart/form-data`
* Field: `file` (video/mp4)

**Response (simplified)**

```json
{
  "message": "Analysis complete",
  "analysis_id": "uuid",
  "video_url": "/outputs/analysis.mp4",
  "metrics": {
    "frames": 300,
    "detections": 300,
    "rallies": 1,
    "speed": {
      "avg": 58.5,
      "max": 940.7,
      "min": 0
    }
  }
}
```

> ⚠️ The frontend must map fields exactly as returned. A known issue is mismatch between backend metric structure and frontend expectations.

---

## Viewing the Website/Running the Backend
Have 2 terminals created:
* In the first terminal first type cd backend
* Then type uvicorn main:app --reload --host 127.0.0.1 --port 8000 (This is to run the backend)
* In the second terminal type python3 -m http.server 5500 (This loads the HTTP Server)
  

## 🎯 Project Goals

This project was built to demonstrate:

* Real-world application of computer vision to sports
* Full-stack engineering (frontend + backend + ML)
* Thoughtful product design for athlete feedback
* Ability to scale from prototype to production-grade system

## Author
**Smaran Rangarajan**

* Github: https://github.com/goatifi12
* Email: hifromsmaran@gmail.com

