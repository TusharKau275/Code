"""
Inference Pipeline and Explainability Engine for Phishing Email Detection.
Supports model inference, feature extraction, multi-model consensus, and explainability.
"""

import os
import re
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from scipy.sparse import hstack, csr_matrix

STOPWORDS = set("""
a an the is are was were be been being to of and or in on at for with as by
this that these those it its it's i you he she we they my your his her our
their from not no do does did have has had will would can could should just
about into over under again further then once here there all any both each
few more most other some such only own same so than too very s t
""".split())

SUSPICIOUS_TLDS = (".xyz", ".tk", ".ml", ".cf", ".ga", ".info", ".co", ".top", ".club", ".buzz", ".work", ".site", ".live")

URGENT_KEYWORDS = [
    "urgent", "immediately", "action needed", "action required", "verify",
    "verification", "suspended", "suspend", "unauthorized", "confirm",
    "password", "security alert", "compromised", "refund", "pending",
    "billing update", "account locked", "restriction", "terminate",
    "expire", "expiration", "threat", "breach", "warning", "attention",
    "validate", "forfeiture", "deactivated"
]

def clean_text(text: str) -> str:
    """Preprocess and clean raw email text using the IICT pipeline."""
    text = str(text).lower()
    text = re.sub(r"<[^>]+>", " ", text)                      # strip HTML tags
    text = re.sub(r"https?://\S+|www\.\S+", " urltoken ", text) # normalize URLs
    text = re.sub(r"[^a-z\s]", " ", text)                     # strip punctuation/numbers
    tokens = text.split()
    tokens = [t for t in tokens if t not in STOPWORDS and len(t) > 1]
    return " ".join(tokens)

class PhishingDetector:
    def __init__(self, models_dir: Optional[str] = None):
        if models_dir is None:
            models_dir = os.path.join(os.path.dirname(__file__), "models")
        self.models_dir = models_dir
        self.models: Dict[str, Any] = {}
        self.tfidf = None
        self.scaler = None
        self.metrics: Dict[str, Any] = {}
        self.feature_importance: List[Dict[str, Any]] = []
        self.load_artifacts()

    def load_artifacts(self):
        """Load trained models, vectorizers, scalers, and metric stats."""
        model_files = {
            "Random Forest": "random_forest.joblib",
            "Logistic Regression": "logistic_regression.joblib",
            "Naive Bayes": "naive_bayes.joblib",
            "Neural Network (MLP)": "neural_network.joblib"
        }
        for name, filename in model_files.items():
            path = os.path.join(self.models_dir, filename)
            if os.path.exists(path):
                self.models[name] = joblib.load(path)

        tfidf_path = os.path.join(self.models_dir, "tfidf_vectorizer.joblib")
        if os.path.exists(tfidf_path):
            self.tfidf = joblib.load(tfidf_path)

        scaler_path = os.path.join(self.models_dir, "scaler.joblib")
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)

        metrics_path = os.path.join(self.models_dir, "metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, "r", encoding="utf-8") as f:
                self.metrics = json.load(f)

        feat_path = os.path.join(self.models_dir, "feature_importance.json")
        if os.path.exists(feat_path):
            with open(feat_path, "r", encoding="utf-8") as f:
                self.feature_importance = json.load(f)

    def extract_metadata(self, sender: str, subject: str, body: str) -> Dict[str, Any]:
        """Extract structural and metadata signals from raw email fields."""
        sender = str(sender).strip()
        subject = str(subject).strip()
        body = str(body).strip()

        # Sender Domain
        sender_domain = ""
        if "@" in sender:
            sender_domain = sender.split("@")[-1].strip().lower()
        elif sender:
            sender_domain = sender.lower()

        # Suspicious TLD check
        suspicious_tld = int(any(sender_domain.endswith(tld) for tld in SUSPICIOUS_TLDS))

        # URL extraction
        url_regex = r"(?:https?://[^\s<>\"']+|www\.[^\s<>\"']+)"
        body_urls = re.findall(url_regex, body, re.IGNORECASE)
        subject_urls = re.findall(url_regex, subject, re.IGNORECASE)
        detected_urls = list(set(body_urls + subject_urls))
        num_links = len(detected_urls)

        # Exclamations
        num_exclamations = subject.count("!") + body.count("!")

        # Urgent phrases detection
        full_text_lower = (subject + " " + body).lower()
        urgent_found = [kw for kw in URGENT_KEYWORDS if kw in full_text_lower]
        has_urgent_words = 1 if len(urgent_found) > 0 else 0

        subject_len = len(subject)
        body_len = len(body)

        return {
            "sender_domain": sender_domain,
            "suspicious_tld": suspicious_tld,
            "num_links": num_links,
            "num_exclamations": num_exclamations,
            "has_urgent_words": has_urgent_words,
            "urgent_words_found": urgent_found,
            "detected_urls": detected_urls,
            "subject_len": subject_len,
            "body_len": body_len
        }

    def find_suspicious_tokens(self, text: str) -> List[str]:
        """Identify high-risk tokens present in the email text."""
        cleaned = clean_text(text)
        tokens = set(cleaned.split())
        highlighted = []

        # Urgent keywords
        text_lower = text.lower()
        for kw in URGENT_KEYWORDS:
            if kw in text_lower and kw not in highlighted:
                highlighted.append(kw)

        # Top feature importance terms
        if self.feature_importance:
            top_terms = {item["feature"] for item in self.feature_importance[:20]}
            for t in tokens:
                if t in top_terms and t not in highlighted:
                    highlighted.append(t)

        return highlighted

    def predict(self, sender: str, subject: str, body: str, selected_model: str = "Random Forest") -> Dict[str, Any]:
        """Run full NLP & metadata prediction across all available models."""
        meta = self.extract_metadata(sender, subject, body)

        clean_sub = clean_text(subject)
        clean_bd = clean_text(body)
        clean_full = (clean_sub + " " + clean_bd).strip()

        if self.tfidf is None or self.scaler is None:
            raise RuntimeError("TF-IDF vectorizer or scaler not loaded. Train models first.")

        # Vectorization
        text_vec = self.tfidf.transform([clean_full])
        meta_cols = self.metrics.get("meta_cols", ["num_links", "num_exclamations", "has_urgent_words", "suspicious_tld", "subject_len", "body_len"])
        meta_df = pd.DataFrame([[
            meta["num_links"],
            meta["num_exclamations"],
            meta["has_urgent_words"],
            meta["suspicious_tld"],
            meta["subject_len"],
            meta["body_len"]
        ]], columns=meta_cols)
        meta_scaled = self.scaler.transform(meta_df)
        X = hstack([text_vec, csr_matrix(meta_scaled)]).tocsr()

        # Multi-model evaluation
        model_predictions = {}
        probabilities = {}
        phish_votes = 0

        for name, model in self.models.items():
            pred = int(model.predict(X)[0])
            if hasattr(model, "predict_proba"):
                prob = float(model.predict_proba(X)[0][1])
            else:
                prob = 1.0 if pred == 1 else 0.0
            
            model_predictions[name] = {
                "prediction": "phishing" if pred == 1 else "legitimate",
                "is_phishing": bool(pred == 1),
                "phishing_probability": round(prob, 4),
                "confidence_percent": round(max(prob, 1 - prob) * 100, 2)
            }
            probabilities[name] = prob
            if pred == 1:
                phish_votes += 1

        # Use chosen model or fallback to Random Forest
        active_model_name = selected_model if selected_model in self.models else "Random Forest"
        primary_result = model_predictions[active_model_name]
        primary_prob = probabilities[active_model_name]
        is_phishing = primary_result["is_phishing"]

        # Risk Score (0 to 100)
        risk_score = round(primary_prob * 100, 1)

        # Risk Level category
        if risk_score >= 75:
            risk_level = "Critical Phishing Threat"
            risk_badge = "critical"
            recommendation = "Do not click any links, open attachments, or reply. Report this email to your security operations team."
        elif risk_score >= 50:
            risk_level = "Suspicious Email"
            risk_badge = "warning"
            recommendation = "Exercise extreme caution. Verify sender domain directly via official secondary channels before proceeding."
        elif risk_score >= 25:
            risk_level = "Low Risk"
            risk_badge = "caution"
            recommendation = "Email exhibits minor automated indicators but no critical threats detected."
        else:
            risk_level = "Safe / Legitimate"
            risk_badge = "safe"
            recommendation = "Email patterns match normal workplace or verified correspondence."

        # Suspicious tokens for highlighting in the UI
        suspicious_tokens = self.find_suspicious_tokens(subject + " " + body)

        # Signal Breakdown
        signals = [
            {
                "name": "Sender Domain Reputation",
                "value": meta["sender_domain"] or "No domain parsed",
                "status": "danger" if meta["suspicious_tld"] else "safe",
                "detail": f"Suspicious top-level domain detected ({meta['sender_domain']})" if meta["suspicious_tld"] else "Sender domain extension is standard"
            },
            {
                "name": "Urgency & Coercion Language",
                "value": f"{len(meta['urgent_words_found'])} triggers found" if meta["has_urgent_words"] else "None",
                "status": "danger" if meta["has_urgent_words"] else "safe",
                "detail": f"Found urgency keywords: {', '.join(meta['urgent_words_found'])}" if meta["has_urgent_words"] else "No high-pressure urgency keywords detected"
            },
            {
                "name": "Hyperlink Analysis",
                "value": f"{meta['num_links']} links detected",
                "status": "warning" if meta["num_links"] > 0 else "safe",
                "detail": f"Contains links: {', '.join(meta['detected_urls'][:3])}" if meta["num_links"] > 0 else "No embedded URLs found"
            },
            {
                "name": "Punctuation Pressure",
                "value": f"{meta['num_exclamations']} exclamation marks",
                "status": "warning" if meta["num_exclamations"] > 2 else "safe",
                "detail": "Excessive exclamation marks often used in social engineering" if meta["num_exclamations"] > 2 else "Normal punctuation pattern"
            }
        ]

        return {
            "is_phishing": is_phishing,
            "prediction": "phishing" if is_phishing else "legitimate",
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_badge": risk_badge,
            "confidence_percent": primary_result["confidence_percent"],
            "selected_model": active_model_name,
            "recommendation": recommendation,
            "metadata": meta,
            "all_models": model_predictions,
            "consensus": {
                "phish_votes": phish_votes,
                "legit_votes": len(self.models) - phish_votes,
                "total_models": len(self.models)
            },
            "signals": signals,
            "suspicious_tokens": suspicious_tokens
        }

# Global singleton detector
detector = PhishingDetector()
