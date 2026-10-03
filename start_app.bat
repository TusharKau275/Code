@echo off
echo ===================================================
echo     PhishGuard AI - Startup Launcher (Windows)
echo ===================================================
echo.

cd /d "%~dp0"

echo [*] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    pause
    exit /b 1
)

echo [*] Checking model artifacts...
if not exist "backend\models\random_forest.joblib" (
    echo [*] Model artifacts not found. Training models now...
    python backend\train_and_save_models.py
)

echo [*] Launching PhishGuard AI Application at http://127.0.0.1:8000
echo [*] Press Ctrl+C to stop the server.
echo.

start "" "http://127.0.0.1:8000"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
