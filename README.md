# 🛡 AI-KAVACH  
### Real-Time AI-Powered Cyber Attack Detection & Threat Intelligence Platform

AI-KAVACH is a real-time AI-powered cyber defense system that integrates a live SSH honeypot, behavioral feature extraction pipeline, hybrid machine learning detection engine, and an interactive SOC-style dashboard.

It simulates a modern Security Operations Center (SOC) environment capable of detecting, classifying, and visualizing real attacker activity.

---

## 🚀 Key Features

### 🐝 Honeypot Integration
- Cowrie SSH honeypot captures real attacker activity
- Logs brute-force attempts, commands, malware behavior
- Streams structured JSON logs

### 🧠 AI / ML Detection Engine
- **KMeans** → Behavioral clustering
- **Isolation Forest** → Anomaly detection
- **Random Forest** → Attack classification
- Hybrid **Risk Scoring Engine (0–100)**
- Severity Levels:
  - 🟢 Low
  - 🟡 Moderate
  - 🔴 Critical

### ⚙ Backend (Node.js + MongoDB)
- REST API ingestion endpoint
- Real-time WebSocket broadcasting
- Automatic IoC extraction (files, URLs)
- Attack history persistence
- Delete & reset functionality

### 🌍 Real-Time Dashboard (React)
- Live attack feed
- Severity distribution charts
- 48-hour attack trend analysis
- Interactive world attack map
- Indicators of Compromise (IoC) table
- Dark / Light theme toggle

---

## 🏗 System Architecture

```
Cowrie Honeypot
        ↓
Log Processor (Feature Extraction)
        ↓
ML Service (Flask + Scikit-Learn)
        ↓
Backend API (Node + Mongo + Socket.io)
        ↓
React Dashboard (D3 + Recharts)
```

---

## 📂 Project Structure

```
ai-kavach/
│
├── backend/              # Node.js backend (API + WebSocket + DB)
├── dashboard/            # React + Vite frontend (SOC UI)
├── ml-service/           # Flask ML inference engine
├── processor/            # Cowrie log processor (feature extractor)
├── model/                # Saved ML models
└── README.md
```

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- Socket.io

### Frontend
- React (Vite)
- TailwindCSS
- Recharts
- D3.js

### Machine Learning
- Scikit-Learn
- KMeans
- IsolationForest
- RandomForestClassifier
- StandardScaler

### Security
- Cowrie SSH Honeypot

---

## 🔧 Full Startup Guide

Open **6 separate WSL terminal tabs**.

---

### 🚀 TAB 1 — Start MongoDB

```bash
mongod --dbpath /data/db --bind_ip_all
```

You should see:
```
Waiting for connections on port 27017
```

---

### 🚀 TAB 2 — Start ML Service

```bash
cd ai-kavach/ml-service
python -m venv ml-env
source ml-env/bin/activate
pip install -r requirements.txt
python app.py
```

Runs on:
```
http://127.0.0.1:5000
```

---

### 🚀 TAB 3 — Start Backend

```bash
cd ai-kavach/backend
npm install
node server.js
```

Runs on:
```
http://localhost:3000
```

---

### 🚀 TAB 4 — Start Cowrie Honeypot

```bash
cd ~/cowrie
source cowrie-env/bin/activate
twistd -n cowrie
```

SSH Honeypot running on:
```
Port 2222
```

---

### 🚀 TAB 5 — Start Log Processor

```bash
cd ai-kavach/processor
source ../ml-service/ml-env/bin/activate
python processor_logs_advanced.py
```

You should see:
```
AI-KAVACH PROCESSOR STARTED
```

---

### 🚀 TAB 6 — Start Dashboard

```bash
cd ai-kavach/dashboard
npm install
npm run dev
```

Open:
```
http://localhost:5173
```

---

## 📊 ML Risk Scoring Logic

Risk Score (0–100) is computed using:

- Isolation Forest anomaly score (weighted heavily)
- Random Forest classification confidence
- IP behavioral frequency
- File interaction indicators

Severity Mapping:
- 0–29 → Low
- 30–54 → Moderate
- 55+ → Critical

---

## 📈 Dashboard Capabilities

- Real-time WebSocket updates
- Live attack feed
- Global attack map
- Severity analytics
- IoC extraction & display
- Log deletion
- Full reset capability
- Dark/Light theme

---

## 🎯 Use Cases

- Cybersecurity research
- Honeypot monitoring
- SOC simulation
- Threat behavior analysis
- Machine learning experimentation
- Portfolio demonstration

---

## 🔮 Future Enhancements

- Threat Intelligence API integration (AbuseIPDB, VirusTotal)
- JWT Authentication & Role-Based Access
- Dockerized deployment
- Email / Slack alerting
- Cloud deployment (AWS / GCP)
- SIEM integration

---

## 👨‍💻 Author

**Mohammed Rayyan**  
Cybersecurity | Ethical Hacking | AI & ML  

---

## 📜 License

This project is built for educational and research purposes.
