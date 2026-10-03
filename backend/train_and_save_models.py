"""
AI-Driven Phishing Email Detection - Model Training & Export Script
Indian Institute of Computing and Technology (IICT) Pipeline
Trains and exports all 4 models (Random Forest, Logistic Regression, Naive Bayes, MLP Neural Network)
along with TF-IDF Vectorizer, MinMaxScaler, and evaluation metrics.
"""

import os
import re
import json
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report

STOPWORDS = set("""
a an the is are was were be been being to of and or in on at for with as by
this that these those it its it's i you he she we they my your his her our
their from not no do does did have has had will would can could should just
about into over under again further then once here there all any both each
few more most other some such only own same so than too very s t
""".split())

SUSPICIOUS_TLDS = (".xyz", ".tk", ".ml", ".cf", ".ga", ".info", ".co", ".top", ".club", ".buzz", ".work")

URGENT_KEYWORDS = [
    "urgent", "immediately", "action needed", "action required", "verify",
    "verification", "suspended", "suspend", "unauthorized", "confirm",
    "password", "security alert", "compromised", "refund", "pending",
    "billing update", "account locked", "restriction", "terminate",
    "expire", "expiration", "threat", "breach", "warning", "attention"
]

def clean_text(text: str) -> str:
    """Preprocess and clean raw email text using the IICT pipeline."""
    text = str(text).lower()
    text = re.sub(r"<[^>]+>", " ", text)                     # strip HTML tags
    text = re.sub(r"http\S+|www\.\S+", " urltoken ", text)  # normalize URLs
    text = re.sub(r"[^a-z\s]", " ", text)                     # strip punctuation/numbers
    tokens = text.split()
    tokens = [t for t in tokens if t not in STOPWORDS and len(t) > 1]
    return " ".join(tokens)

def find_dataset_path():
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", "Dataset", "emails_raw.csv"),
        os.path.join(os.path.dirname(__file__), "..", "Dataset", "emails_raw.csv"),
        os.path.join(os.getcwd(), "Dataset", "emails_raw.csv"),
        os.path.join(os.getcwd(), "..", "Dataset", "emails_raw.csv"),
        "emails_raw.csv"
    ]
    for path in candidates:
        if os.path.exists(path):
            return os.path.abspath(path)
    return None

def train_and_export():
    dataset_path = find_dataset_path()
    if not dataset_path:
        raise FileNotFoundError("Could not find emails_raw.csv in any standard dataset path.")
    
    print(f"[*] Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"[*] Total emails: {len(df)}")
    print(df["label"].value_counts().to_dict())

    # Preprocessing
    df["clean_subject"] = df["subject"].apply(clean_text)
    df["clean_body"] = df["body"].apply(clean_text)
    df["clean_text"] = df["clean_subject"] + " " + df["clean_body"]

    # Metadata features
    df["suspicious_tld"] = df["sender_domain"].apply(lambda d: int(str(d).endswith(SUSPICIOUS_TLDS)))
    df["subject_len"] = df["subject"].apply(len)
    df["body_len"] = df["body"].apply(len)

    # Ground truth: 1 for phishing, 0 for legitimate
    y = (df["label"] == "phishing").astype(int)

    # 75/25 stratified split as in notebook
    X_train_df, X_test_df, y_train, y_test = train_test_split(
        df, y, test_size=0.25, random_state=42, stratify=y
    )

    print("[*] Fitting TF-IDF Vectorizer...")
    tfidf = TfidfVectorizer(max_features=1500, ngram_range=(1, 2))
    X_train_text = tfidf.fit_transform(X_train_df["clean_text"])
    X_test_text = tfidf.transform(X_test_df["clean_text"])

    meta_cols = ["num_links", "num_exclamations", "has_urgent_words", "suspicious_tld", "subject_len", "body_len"]
    print(f"[*] Scaling metadata features: {meta_cols}")
    scaler = MinMaxScaler()
    X_train_meta = scaler.fit_transform(X_train_df[meta_cols])
    X_test_meta = scaler.transform(X_test_df[meta_cols])

    X_train = hstack([X_train_text, csr_matrix(X_train_meta)]).tocsr()
    X_test = hstack([X_test_text, csr_matrix(X_test_meta)]).tocsr()

    feature_names = list(tfidf.get_feature_names_out()) + meta_cols
    print(f"[*] Train shape: {X_train.shape}, Test shape: {X_test.shape}")

    models = {
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42),
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Naive Bayes": MultinomialNB(),
        "Neural Network (MLP)": MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=500, random_state=42)
    }

    results = {}
    trained_models = {}

    for name, model in models.items():
        print(f"[*] Training {name}...")
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        
        # Probabilities
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_test)[:, 1].tolist()
        else:
            probs = preds.tolist()

        cm = confusion_matrix(y_test, preds).tolist()
        acc = float(accuracy_score(y_test, preds))
        prec = float(precision_score(y_test, preds, zero_division=0))
        rec = float(recall_score(y_test, preds, zero_division=0))
        f1 = float(f1_score(y_test, preds, zero_division=0))

        results[name] = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": cm,  # [[TN, FP], [FN, TP]]
            "tn": cm[0][0],
            "fp": cm[0][1],
            "fn": cm[1][0],
            "tp": cm[1][1]
        }
        trained_models[name] = model
        print(f"    -> Acc: {acc:.4f}, Prec: {prec:.4f}, Rec: {rec:.4f}, F1: {f1:.4f}")

    # Top 20 feature importances from Random Forest
    rf = trained_models["Random Forest"]
    importances = rf.feature_importances_
    top_indices = np.argsort(importances)[-20:][::-1]
    feature_importance_list = [
        {"feature": feature_names[i], "importance": round(float(importances[i]), 5)}
        for i in top_indices
    ]

    # Save models directory
    save_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(save_dir, exist_ok=True)

    print(f"[*] Exporting model artifacts to: {save_dir}")
    joblib.dump(trained_models["Random Forest"], os.path.join(save_dir, "random_forest.joblib"))
    joblib.dump(trained_models["Logistic Regression"], os.path.join(save_dir, "logistic_regression.joblib"))
    joblib.dump(trained_models["Naive Bayes"], os.path.join(save_dir, "naive_bayes.joblib"))
    joblib.dump(trained_models["Neural Network (MLP)"], os.path.join(save_dir, "neural_network.joblib"))
    joblib.dump(tfidf, os.path.join(save_dir, "tfidf_vectorizer.joblib"))
    joblib.dump(scaler, os.path.join(save_dir, "scaler.joblib"))

    with open(os.path.join(save_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump({
            "models": results,
            "test_size": len(y_test),
            "train_size": len(y_train),
            "total_emails": len(df),
            "feature_count": len(feature_names),
            "meta_cols": meta_cols
        }, f, indent=2)

    with open(os.path.join(save_dir, "feature_importance.json"), "w", encoding="utf-8") as f:
        json.dump(feature_importance_list, f, indent=2)

    print("[+] All artifacts trained and exported successfully!")
    return results

if __name__ == "__main__":
    train_and_export()
