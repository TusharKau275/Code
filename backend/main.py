"""
FastAPI Backend Application for AI-Driven Phishing Email Detection.
Indian Institute of Computing and Technology (IICT) NLP Architecture.
"""

import os
import io
import csv
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from backend.pipeline import detector
from backend.samples import SAMPLE_EMAILS

app = FastAPI(
    title="Phishing Email Detection API",
    description="NLP-powered Machine Learning API for real-time phishing email detection, threat scoring, and explainability.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local and remote deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmailInput(BaseModel):
    sender: str = Field(..., example="security-alert@irs-refund-claim.xyz")
    subject: str = Field(..., example="Urgent: Tax Refund Pending Action Required")
    body: str = Field(..., example="Dear Customer, click http://irs-refund-claim.xyz to verify your identity immediately.")
    model_name: Optional[str] = Field("Random Forest", example="Random Forest")

class BatchEmailItem(BaseModel):
    id: Optional[str] = None
    sender: str
    subject: str
    body: str
    model_name: Optional[str] = "Random Forest"

class BatchRequest(BaseModel):
    emails: List[BatchEmailItem]

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI-Driven Phishing Email Detection API",
        "models_loaded": list(detector.models.keys()),
        "dataset_total": detector.metrics.get("total_emails", 1200)
    }

@app.get("/api/samples")
def get_sample_emails():
    """Retrieve preloaded sample emails representing phishing vectors and legitimate messages."""
    return {"samples": SAMPLE_EMAILS}

@app.get("/api/models")
def get_models_info():
    """Return model performance metrics, confusion matrices, and feature importances."""
    return {
        "models": detector.metrics.get("models", {}),
        "test_size": detector.metrics.get("test_size", 300),
        "train_size": detector.metrics.get("train_size", 900),
        "total_emails": detector.metrics.get("total_emails", 1200),
        "feature_count": detector.metrics.get("feature_count", 1302),
        "feature_importance": detector.feature_importance,
        "available_models": list(detector.models.keys())
    }

@app.post("/api/predict")
def predict_email(payload: EmailInput):
    """Analyze a single email and return threat score, classification, and explainability signals."""
    try:
        result = detector.predict(
            sender=payload.sender,
            subject=payload.subject,
            body=payload.body,
            selected_model=payload.model_name or "Random Forest"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/api/batch-predict")
def batch_predict(payload: BatchRequest):
    """Analyze a batch of emails provided via JSON payload."""
    results = []
    phishing_count = 0
    scores = []

    for item in payload.emails:
        try:
            pred = detector.predict(
                sender=item.sender,
                subject=item.subject,
                body=item.body,
                selected_model=item.model_name or "Random Forest"
            )
            item_result = {
                "id": item.id,
                "sender": item.sender,
                "subject": item.subject,
                "prediction": pred["prediction"],
                "risk_score": pred["risk_score"],
                "risk_level": pred["risk_level"],
                "risk_badge": pred["risk_badge"],
                "is_phishing": pred["is_phishing"],
                "confidence_percent": pred["confidence_percent"]
            }
            results.append(item_result)
            if pred["is_phishing"]:
                phishing_count += 1
            scores.append(pred["risk_score"])
        except Exception as e:
            results.append({
                "id": item.id,
                "sender": item.sender,
                "subject": item.subject,
                "error": str(e)
            })

    total = len(payload.emails)
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    return {
        "summary": {
            "total_analyzed": total,
            "phishing_detected": phishing_count,
            "legitimate_detected": total - phishing_count,
            "phishing_rate_percent": round((phishing_count / total) * 100, 1) if total > 0 else 0,
            "average_threat_score": avg_score
        },
        "results": results
    }

@app.post("/api/upload-csv")
async def upload_csv_and_predict(file: UploadFile = File(...), model_name: str = Query("Random Forest")):
    """Upload a CSV file of emails to scan in bulk."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    decoded = content.decode("utf-8", errors="replace")
    csv_reader = csv.DictReader(io.StringIO(decoded))

    emails_to_scan = []
    for idx, row in enumerate(csv_reader):
        sender = row.get("sender", row.get("Sender", row.get("From", "")))
        subject = row.get("subject", row.get("Subject", ""))
        body = row.get("body", row.get("Body", row.get("Text", row.get("content", ""))))
        email_id = row.get("id", row.get("email_id", f"CSV-{idx + 1}"))

        if not subject and not body:
            continue

        emails_to_scan.append(
            BatchEmailItem(
                id=str(email_id),
                sender=str(sender),
                subject=str(subject),
                body=str(body),
                model_name=model_name
            )
        )

    if not emails_to_scan:
        raise HTTPException(status_code=400, detail="No valid emails with subject/body found in CSV.")

    return batch_predict(BatchRequest(emails=emails_to_scan))

# Mount static frontend files if directory exists
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
