#!/usr/bin/env bash
# ===================================================
# PhishGuard AI - Startup Launcher (Linux/macOS)
# ===================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "==================================================="
echo "    PhishGuard AI - Startup Launcher"
echo "==================================================="
echo ""

# Train models if not present
if [ ! -f "backend/models/random_forest.joblib" ]; then
    echo "[*] Model artifacts not found. Training models now..."
    python3 backend/train_and_save_models.py
fi

echo "[+] Starting server at http://127.0.0.1:8000"
echo "[+] Press Ctrl+C to stop."
echo ""

python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
