# PhishGuard AI: Real-Time Phishing Email Detection & Threat Analysis

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.5.0-F7931E?style=flat&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade, deployable full-stack machine learning web application for real-time phishing email detection, threat scoring, and explainability. Built on the **Indian Institute of Computing and Technology (IICT)** NLP research pipeline.

> 📖 **Looking for step-by-step production deployment instructions?**  
> Check the full **[Deployment Guide](DEPLOYMENT_GUIDE.md)** covering Docker, Render, Railway, Hugging Face, AWS, GCP, Azure, and Systemd.

---

## 🌟 Key Features

### 🔍 1. Live NLP Email Threat Scanner
- **Dual Feature Extraction**: Combines 1,500 TF-IDF n-grams (unigrams + bigrams) with 6 structural metadata features.
- **Dynamic Risk Gauge**: Interactive animated circular SVG gauge visualizing risk severity (0% to 100%).
- **Multi-Model Consensus Bar**: Side-by-side probability breakdown across all 4 trained classifiers.
- **Linguistic Highlight View**: Real-time visual highlighting of suspicious tokens, pressure tactics, and URL tokens directly inside the email body.
- **Structural Threat Signals**: Instant auditing of sender domain TLD reputation, link counts, urgency triggers, and punctuation pressure.
- **1-Click Sample Chips**: Quick-load realistic test emails including tax refund scams, account suspension threats, IT quota alerts, and legitimate workplace correspondence.

### 📊 2. Model Benchmarks & Metrics Explorer
- **Leaderboard Comparison**: Full performance breakdown (Accuracy, Precision, Recall, F1-Score) across:
  - **Random Forest** (200 Estimators) — *100.0% Accuracy / 1.000 F1*
  - **Neural Network (MLP)** — *100.0% Accuracy / 1.000 F1*
  - **Naive Bayes (Multinomial)** — *100.0% Accuracy / 1.000 F1*
  - **Logistic Regression** — *99.7% Accuracy / 0.9967 F1*
- **Visual Confusion Matrices**: Interactive 2×2 grid displaying True Positives, True Negatives, False Positives, and False Negatives for all 4 models.
- **Top 20 Feature Importances**: Ranked horizontal bar visualization of top predictive NLP terms and metadata features.

### 📁 3. High-Throughput Batch CSV Scanner
- **Drag & Drop Upload**: Upload any `.csv` file containing email records (`sender`, `subject`, `body`).
- **Summary Analytics**: Live counting of total scanned, phishing count/percentage, safe emails, and average risk score.
- **Searchable Results Stream**: Instant client-side filtering and search across subject, sender, and prediction.
- **CSV Export**: 1-click export of complete threat reports with classification badges and risk percentages.

### ⚡ 4. Developer REST API & Playground
- **OpenAPI & Swagger UI**: Interactive API documentation at `/docs` and ReDoc at `/redoc`.
- **Live Code Generator**: Copy-pasteable integration code in **cURL**, **Python (`requests`)**, and **JavaScript (`fetch`)**.
- **Cross-Platform Deployment**: Containerized with Docker, docker-compose, and deployable to Render, Railway, AWS, or GCP.

---

## 🏗️ System Architecture

```
phising-email-detection/Code/
├── backend/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application with REST endpoints & static file serving
│   ├── pipeline.py              # NLP preprocessing, feature scaling, model inference, & explainability
│   ├── train_and_save_models.py # Training pipeline exporting joblib models and metrics
│   ├── samples.py               # Curated realistic sample emails for 1-click UI testing
│   └── models/                  # Exported model artifacts
│       ├── random_forest.joblib
│       ├── logistic_regression.joblib
│       ├── naive_bayes.joblib
│       ├── neural_network.joblib
│       ├── tfidf_vectorizer.joblib
│       ├── scaler.joblib
│       ├── metrics.json
│       └── feature_importance.json
├── frontend/
│   ├── index.html               # Semantic HTML5 layout with glassmorphic cyber-defense theme
│   ├── styles.css               # Vanilla CSS3 with Outfit, Inter, and JetBrains Mono typography
│   ├── app.js                   # Client-side state management, gauge animations, and API calls
│   └── favicon.svg              # Vector cyber shield icon
├── Dataset/                     # IICT benchmark datasets (emails_raw.csv, emails_cleaned.csv)
├── Dockerfile                   # Production Python 3.11 container
├── docker-compose.yml           # Single-command Docker runner
├── render.yaml                  # 1-click Render blueprint
├── Procfile                     # Heroku & Railway process file
├── start_app.bat                # Windows 1-click launcher
├── start_app.ps1                # PowerShell launcher
├── start_app.sh                 # Linux/macOS launcher
└── requirements.txt             # Locked Python dependencies
```

---

## 🚀 Quickstart Guide

### Option 1: One-Click Launchers

#### On Windows:
Double-click `start_app.bat` or run:
```powershell
.\start_app.ps1
```

#### On Linux or macOS:
```bash
chmod +x start_app.sh
./start_app.sh
```

---

### Option 2: Manual Setup

1. **Clone & Navigate:**
   ```bash
   cd "d:/IICT Files/phising-email-detection/Code"
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Train Models (if not already trained):**
   ```bash
   python backend/train_and_save_models.py
   ```

4. **Start Web Server:**
   ```bash
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

5. **Open Browser:**
   Visit **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

### Option 3: Docker Deployment

Run with Docker Compose:
```bash
docker compose up --build
```
Access the application at `http://localhost:8000`.

---

## 📡 REST API Reference

### 1. Healthcheck
- **Endpoint**: `GET /api/health`
- **Response**:
```json
{
  "status": "healthy",
  "service": "AI-Driven Phishing Email Detection API",
  "models_loaded": ["Random Forest", "Logistic Regression", "Naive Bayes", "Neural Network (MLP)"],
  "dataset_total": 1200
}
```

### 2. Predict Single Email
- **Endpoint**: `POST /api/predict`
- **Request Body**:
```json
{
  "sender": "security@irs-refund-claim.xyz",
  "subject": "Urgent: Refund Pending - Action Required",
  "body": "Dear Priya, your refund of $482.50 is pending. Confirm credentials at http://irs-refund-claim.xyz immediately.",
  "model_name": "Random Forest"
}
```
- **Response**:
```json
{
  "is_phishing": true,
  "prediction": "phishing",
  "risk_score": 98.4,
  "risk_level": "Critical Phishing Threat",
  "risk_badge": "critical",
  "confidence_percent": 98.4,
  "selected_model": "Random Forest",
  "recommendation": "Do not click any embedded links or respond with personal information.",
  "all_models": {
    "Random Forest": { "prediction": "phishing", "phishing_probability": 0.984 },
    "Logistic Regression": { "prediction": "phishing", "phishing_probability": 0.962 },
    "Naive Bayes": { "prediction": "phishing", "phishing_probability": 0.999 },
    "Neural Network (MLP)": { "prediction": "phishing", "phishing_probability": 0.998 }
  },
  "consensus": { "phish_votes": 4, "legit_votes": 0, "total_models": 4 },
  "signals": [
    { "name": "Sender Domain Reputation", "value": "irs-refund-claim.xyz", "status": "danger" },
    { "name": "Urgency & Coercion Language", "value": "3 triggers found", "status": "danger" }
  ],
  "suspicious_tokens": ["urgent", "refund", "pending", "action required", "urltoken"]
}
```

### 3. Batch Email Analysis
- **Endpoint**: `POST /api/batch-predict`
- Takes an array of emails and returns summary statistics alongside individual predictions.

### 4. CSV Upload
- **Endpoint**: `POST /api/upload-csv`
- Upload a `.csv` file via multipart form data for instant tabular analysis.

### 5. Benchmark Metrics & Feature Weights
- **Endpoint**: `GET /api/models`
- Returns accuracy, precision, recall, F1, confusion matrices, and top 20 feature importances.

---

## ☁️ Cloud Deployment Options

### Render.com
1. Connect this Git repository to Render.
2. Render will automatically detect `render.yaml`.
3. Click **Apply Blueprint** to deploy.

### Railway / Heroku
The included `Procfile` is pre-configured:
```
web: uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Hugging Face Spaces (Docker Space)
1. Create a new Space with the **Docker** SDK.
2. Push this repository.
3. Hugging Face Spaces will automatically build the `Dockerfile` and expose port 7860/8000.

---

## 📜 Citation & Credits
- **Pipeline Methodology**: Indian Institute of Computing and Technology (IICT).
- **Core Models**: Random Forest, Multilayer Perceptron (MLP), Naive Bayes, Logistic Regression.
- **Frontend Design**: Cyber-defense theme with glassmorphism, responsive CSS3, and Outfit / Inter typography.
