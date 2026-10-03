# ===================================================
# PhishGuard AI - PowerShell Launcher (Windows)
# ===================================================

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    PhishGuard AI - Startup Launcher" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# Check model artifacts
if (-not (Test-Path "backend\models\random_forest.joblib")) {
    Write-Host "[*] Model artifacts not found. Training models now..." -ForegroundColor Yellow
    python backend\train_and_save_models.py
}

Write-Host "[+] Starting server at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "[+] Press Ctrl+C in terminal to stop." -ForegroundColor DarkGray
Write-Host ""

Start-Process "http://127.0.0.1:8000"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
