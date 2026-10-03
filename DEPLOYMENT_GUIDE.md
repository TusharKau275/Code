# PhishGuard AI - Comprehensive Production Deployment Guide

This guide provides end-to-end instructions for deploying **PhishGuard AI** across various hosting environments, from local servers and Docker containers to free cloud PaaS services and enterprise cloud providers (AWS, GCP, Azure).

---

## 📋 Table of Contents
1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [Local & On-Premises Production Deployment](#2-local--on-premises-production-deployment)
   - [Linux / Ubuntu Server with Systemd](#linux--ubuntu-server-with-systemd)
   - [Nginx Reverse Proxy with HTTPS / SSL](#nginx-reverse-proxy-with-https--ssl)
3. [Containerized Deployment (Docker & Docker Compose)](#3-containerized-deployment-docker--docker-compose)
4. [Cloud Platform Deployments (PaaS)](#4-cloud-platform-deployments-paas)
   - [Deploying to Render.com (Recommended Free/Low-Cost)](#deploying-to-rendercom)
   - [Deploying to Railway.app](#deploying-to-railwayapp)
   - [Deploying to Hugging Face Spaces (Free Docker Hosting)](#deploying-to-hugging-face-spaces)
   - [Deploying to Fly.io](#deploying-to-flyio)
5. [Enterprise Cloud Providers](#5-enterprise-cloud-providers)
   - [Google Cloud Run (Serverless Container)](#google-cloud-run)
   - [AWS App Runner / Elastic Container Service (ECS)](#aws-app-runner--ecs)
   - [Azure App Service](#azure-app-service)
6. [Production Hardening & Performance Optimization](#6-production-hardening--performance-optimization)
7. [Automated CI/CD Pipeline (GitHub Actions)](#7-automated-cicd-pipeline-github-actions)
8. [Troubleshooting & FAQ](#8-troubleshooting--faq)

---

## 1. Prerequisites & System Requirements

### Hardware Sizing
- **CPU**: 1 vCPU minimum (2+ vCPUs recommended for high-concurrency production).
- **RAM**: 512 MB minimum (1 GB recommended for fast scikit-learn tree traversals).
- **Disk**: ~500 MB (includes Python packages, model weights, and frontend static assets).

### Software Requirements
- **Python**: 3.10, 3.11, or 3.12.
- **Package Manager**: `pip` (or `poetry`/`conda`).
- **Docker** (Optional, for containerized deployments): Docker Engine 20.10+.

---

## 2. Local & On-Premises Production Deployment

### Quick Setup with Virtual Environment

1. **Clone the repository and enter the directory**:
   ```bash
   git clone <your-repo-url>
   cd phising-email-detection/Code
   ```

2. **Create and activate a virtual environment**:
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```

3. **Install dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Verify / Train Model Artifacts**:
   ```bash
   python backend/train_and_save_models.py
   ```
   *(This ensures `backend/models/*.joblib` files are generated).*

5. **Run Production Server**:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

---

### Linux / Ubuntu Server with Systemd

To keep PhishGuard AI running 24/7 as a background daemon that restarts automatically on reboot or crash:

1. **Create a systemd service file**:
   ```bash
   sudo nano /etc/systemd/system/phishguard.service
   ```

2. **Paste the following configuration** (adjust paths and user as appropriate):
   ```ini
   [Unit]
   Description=PhishGuard AI FastAPI Service
   After=network.target

   [Service]
   User=ubuntu
   Group=ubuntu
   WorkingDirectory=/var/www/phishguard/Code
   Environment="PATH=/var/www/phishguard/Code/venv/bin"
   ExecStart=/var/www/phishguard/Code/venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 4
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start the service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable phishguard
   sudo systemctl start phishguard
   sudo systemctl status phishguard
   ```

---

### Nginx Reverse Proxy with HTTPS / SSL

To serve PhishGuard on a custom domain (e.g., `phishguard.yourdomain.com`) with an SSL certificate:

1. **Install Nginx and Certbot**:
   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. **Create an Nginx server block**:
   ```bash
   sudo nano /etc/nginx/sites-available/phishguard
   ```

3. **Add the configuration**:
   ```nginx
   server {
       listen 80;
       server_name phishguard.yourdomain.com;

       client_max_body_size 20M;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Enable the site and obtain free SSL via Let's Encrypt**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/phishguard /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d phishguard.yourdomain.com
   ```

---

## 3. Containerized Deployment (Docker & Docker Compose)

Docker packages Python, Scikit-learn, FastAPI, and the frontend into an isolated image that runs identically on any cloud or OS.

### Build and Run with Docker

1. **Build the image**:
   ```bash
   docker build -t phishguard-ai:latest .
   ```

2. **Run the container**:
   ```bash
   docker run -d --name phishguard -p 8000:8000 --restart always phishguard-ai:latest
   ```

3. **Test the health endpoint**:
   ```bash
   curl http://localhost:8000/api/health
   ```

---

### Run with Docker Compose

The repository includes a ready-to-use `docker-compose.yml`:

```bash
# Start in detached mode
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop the container
docker compose down
```

---

## 4. Cloud Platform Deployments (PaaS)

### Deploying to Render.com

[Render](https://render.com) offers free and low-cost web hosting with automatic SSL and zero-downtime deploys.

#### Method A: Using the included Blueprint (`render.yaml`)
1. Push this codebase to **GitHub** or **GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your repository. Render will automatically detect `render.yaml`.
5. Click **Apply Blueprint**.
6. Render will install dependencies, build models, and launch your app with a public `https://<app-name>.onrender.com` URL.

#### Method B: Manual Web Service Setup
1. On Render, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name**: `phishguard-ai`
   - **Region**: Choose closest to your users (e.g., Frankfurt, Ohio, Oregon, Singapore).
   - **Branch**: `main`
   - **Root Directory**: `Code` (if repo root has parent folders) or leave blank.
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python backend/train_and_save_models.py`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free or Starter ($7/mo).
4. Click **Create Web Service**.

---

### Deploying to Railway.app

[Railway](https://railway.app) provides instantaneous deployments from Git repositories:

1. Push your project to GitHub.
2. Log in to [Railway](https://railway.app).
3. Click **New Project** -> **Deploy from GitHub repo**.
4. Select your repository.
5. Railway will automatically detect the [Procfile](file:///d:/IICT%20Files/phising-email-detection/Code/Procfile):
   ```
   web: uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
   ```
6. Go to **Settings** -> **Networking** -> click **Generate Domain** to get a public `https://...up.railway.app` URL.

---

### Deploying to Hugging Face Spaces

[Hugging Face Spaces](https://huggingface.co/spaces) offers **free 16GB RAM CPU hosting**:

1. Log in to [Hugging Face](https://huggingface.co).
2. Click **Create new Space**.
3. Set:
   - **Space Name**: `phishing-email-detection`
   - **Space SDK**: **Docker** -> **Blank**.
4. Clone the space repository locally or upload files.
5. In your `Dockerfile`, ensure the port is set to `7860` (Hugging Face default):
   ```dockerfile
   EXPOSE 7860
   CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
   ```
6. Push to Hugging Face:
   ```bash
   git add .
   git commit -m "Deploy PhishGuard AI"
   git push origin main
   ```
7. Hugging Face builds the Docker container and opens the live web app in your Space.

---

### Deploying to Fly.io

1. Install the `flyctl` CLI:
   - **Windows**: `pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"`
   - **macOS/Linux**: `curl -L https://fly.io/install.sh | sh`
2. Authenticate:
   ```bash
   fly auth login
   ```
3. Initialize and deploy:
   ```bash
   fly launch --name phishguard-ai
   fly deploy
   ```

---

## 5. Enterprise Cloud Providers

### Google Cloud Run

Google Cloud Run runs containers serverlessly, scaling to zero when inactive and auto-scaling under load.

1. **Install and authenticate Google Cloud SDK**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Build and submit image to Google Artifact Registry**:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/phishguard-ai:latest .
   ```

3. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy phishguard-ai \
     --image gcr.io/YOUR_PROJECT_ID/phishguard-ai:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 1Gi \
     --port 8000
   ```
4. You will receive an HTTPS URL (e.g., `https://phishguard-ai-xyz.a.run.app`).

---

### AWS App Runner / ECS

**AWS App Runner** is the simplest managed container service on AWS:

1. Push your Docker image to **Amazon Elastic Container Registry (ECR)**:
   ```bash
   aws ecr create-repository --repository-name phishguard-ai
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   docker tag phishguard-ai:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/phishguard-ai:latest
   docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/phishguard-ai:latest
   ```

2. In the **AWS App Runner Console**:
   - Source: **Container registry** -> Select your ECR image.
   - Port: `8000`
   - Compute: `1 vCPU, 2 GB memory`
   - Click **Create & Deploy**.

---

### Azure App Service

1. Create a resource group and app service plan:
   ```bash
   az group create --name PhishGuardRG --location eastus
   az appservice plan create --name PhishGuardPlan --resource-group PhishGuardRG --sku B1 --is-linux
   ```
2. Deploy container:
   ```bash
   az webapp create --resource-group PhishGuardRG --plan PhishGuardPlan --name phishguard-ai --deployment-container-image-name phishguard-ai:latest
   az webapp config appsettings set --resource-group PhishGuardRG --name phishguard-ai --settings WEBSITES_PORT=8000
   ```

---

## 6. Production Hardening & Performance Optimization

### 1. Multi-Worker Gunicorn Setup
For production on Linux servers, use `gunicorn` with the `uvicorn.workers.UvicornWorker` to distribute requests across multiple CPU cores:
```bash
pip install gunicorn
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```
*Rule of thumb for worker count: `(2 * CPU cores) + 1`.*

### 2. CORS Security
In `backend/main.py`, you can restrict allowed CORS origins to your production domains instead of `["*"]`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://phishguard.yourdomain.com",
        "https://your-frontend.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
```

### 3. Rate Limiting (Optional)
To protect against API abuse, integrate `slowapi`:
```bash
pip install slowapi
```
Add to `backend/main.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

---

## 7. Automated CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml` to automatically build, test, and deploy on push to `main`:

```yaml
name: Build, Test & Deploy PhishGuard AI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt

      - name: Train and verify models
        run: |
          python backend/train_and_save_models.py

      - name: Run API integration tests
        run: |
          python -c "
          from fastapi.testclient import TestClient
          from backend.main import app
          client = TestClient(app)
          assert client.get('/api/health').status_code == 200
          assert client.get('/api/models').status_code == 200
          assert client.get('/').status_code == 200
          print('All automated tests passed!')
          "

  deploy-docker:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: actions/setup-buildx-action@v3

      - name: Build Docker image
        run: |
          docker build -t phishguard-ai:${{ github.sha }} .
```

---

## 8. Troubleshooting & FAQ

### Issue: "Model artifacts not found"
- **Cause**: The application was launched before running model training.
- **Fix**: Run `python backend/train_and_save_models.py` once. This creates `backend/models/*.joblib` and `metrics.json`.

### Issue: "Port 8000 already in use"
- **Cause**: Another process is occupying port 8000.
- **Fix**:
  - Run on a different port: `uvicorn backend.main:app --port 8080`
  - Or terminate the existing process:
    - **Windows**: `Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process`
    - **Linux/macOS**: `fuser -k 8000/tcp` or `lsof -ti:8000 | xargs kill -9`

### Issue: "404 Not Found on Frontend Assets"
- **Cause**: Running uvicorn from a subfolder without correct relative paths.
- **Fix**: Ensure your working directory is the `Code` folder containing both `backend/` and `frontend/`.

---

## 🎯 Verification Checklist

Before opening your deployed application to users, verify that:
- [ ] `GET /api/health` returns status `healthy` with all 4 models listed.
- [ ] `GET /api/models` returns evaluation metrics and feature importances.
- [ ] `GET /` serves the glassmorphic web UI.
- [ ] Sample buttons populate the inputs and the **Analyze Threat** button successfully calculates risk score.
- [ ] Batch scanning works with CSV files.
- [ ] API documentation is accessible at `/docs`.
