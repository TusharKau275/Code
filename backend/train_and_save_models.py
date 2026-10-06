"""
AI-Driven Phishing Email Detection - Model Training & Export Script
Indian Institute of Computing and Technology (IICT) Pipeline

Supports all standard datasets from the Dataset/ folder:
- phishing_email.csv (82k Kaggle master dataset)
- CEAS_08.csv
- Enron.csv
- Ling.csv
- Nazario.csv
- Nigerian_Fraud.csv
- SpamAssasin.csv
- emails_raw.csv

Trains and exports all 4 models (Random Forest, Logistic Regression, Naive Bayes, MLP Neural Network)
along with TF-IDF Vectorizer, MinMaxScaler, and evaluation metrics.
"""

import os
import re
import sys
import json
import argparse
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
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

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

DATASET_CANDIDATES = [
    "phishing_email.csv",
    "CEAS_08.csv",
    "Enron.csv",
    "Nazario.csv",
    "SpamAssasin.csv",
    "Nigerian_Fraud.csv",
    "Ling.csv",
    "emails_raw.csv",
    "emails_cleaned.csv"
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


def find_dataset_path(preferred_filename: str = None) -> str:
    """Search for dataset file in Dataset directory and relative paths."""
    search_dirs = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Dataset")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Dataset")),
        os.path.abspath(os.path.join(os.getcwd(), "Dataset")),
        os.path.abspath(os.path.join(os.getcwd(), "..", "Dataset")),
        os.path.abspath(os.getcwd())
    ]

    filenames_to_try = [preferred_filename] if preferred_filename else DATASET_CANDIDATES

    for directory in search_dirs:
        for fname in filenames_to_try:
            if not fname:
                continue
            path = os.path.join(directory, fname)
            if os.path.exists(path) and os.path.isfile(path):
                return os.path.abspath(path)

    # Check direct path if preferred_filename was passed as full or relative path
    if preferred_filename and os.path.exists(preferred_filename):
        return os.path.abspath(preferred_filename)

    return None


def prepare_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize any dataset format (phishing_email, CEAS_08, Enron, etc.) into unified features."""
    cols = {c.lower().strip(): c for c in df.columns}

    # 1. Extract subject and body
    if "text_combined" in cols:
        full_text = df[cols["text_combined"]].fillna("").astype(str)
        subject = pd.Series([""] * len(df))
        body = full_text
    elif "subject" in cols and "body" in cols:
        subject = df[cols["subject"]].fillna("").astype(str)
        body = df[cols["body"]].fillna("").astype(str)
        full_text = subject + " " + body
    elif "text" in cols:
        full_text = df[cols["text"]].fillna("").astype(str)
        subject = pd.Series([""] * len(df))
        body = full_text
    elif "body" in cols:
        body = df[cols["body"]].fillna("").astype(str)
        subject = pd.Series([""] * len(df))
        full_text = body
    else:
        raise ValueError(f"Could not find text column in dataset. Found columns: {list(df.columns)}")

    # 2. Extract sender domain if available
    sender_domain = pd.Series([""] * len(df))
    if "sender_domain" in cols:
        sender_domain = df[cols["sender_domain"]].fillna("").astype(str)
    elif "sender" in cols:
        def get_domain(s):
            s = str(s).strip()
            if "@" in s:
                return s.split("@")[-1].strip().lower().rstrip(">")
            return s.lower()
        sender_domain = df[cols["sender"]].apply(get_domain)

    # 3. Structural & NLP metadata features
    url_regex = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

    if "num_links" in cols:
        num_links = pd.to_numeric(df[cols["num_links"]], errors="coerce").fillna(0)
    elif "urls" in cols:
        num_links = pd.to_numeric(df[cols["urls"]], errors="coerce").fillna(0)
    else:
        num_links = body.apply(lambda t: len(url_regex.findall(str(t))))

    if "num_exclamations" in cols:
        num_exclamations = pd.to_numeric(df[cols["num_exclamations"]], errors="coerce").fillna(0)
    else:
        num_exclamations = full_text.apply(lambda t: str(t).count("!"))

    if "has_urgent_words" in cols:
        has_urgent_words = pd.to_numeric(df[cols["has_urgent_words"]], errors="coerce").fillna(0).astype(int)
    else:
        has_urgent_words = full_text.apply(
            lambda t: int(any(kw in str(t).lower() for kw in URGENT_KEYWORDS))
        )

    if "suspicious_tld" in cols:
        suspicious_tld = pd.to_numeric(df[cols["suspicious_tld"]], errors="coerce").fillna(0).astype(int)
    else:
        suspicious_tld = sender_domain.apply(
            lambda d: int(any(str(d).endswith(tld) for tld in SUSPICIOUS_TLDS))
        )

    subject_len = subject.apply(lambda s: len(str(s)))
    body_len = body.apply(lambda b: len(str(b)))

    # 4. Clean text for TF-IDF
    print("[*] Preprocessing and tokenizing text...")
    clean_text_series = full_text.apply(clean_text)

    # 5. Label normalization
    label_col = cols.get("label", cols.get("class", cols.get("target", None)))
    if not label_col:
        raise ValueError("Could not find label/target column in dataset.")

    raw_labels = df[label_col]
    if pd.api.types.is_numeric_dtype(raw_labels):
        y = (raw_labels == 1).astype(int)
    else:
        phish_strings = {"phishing", "phish", "spam", "1", "fraud", "malicious"}
        y = raw_labels.astype(str).str.lower().str.strip().isin(phish_strings).astype(int)

    processed_df = pd.DataFrame({
        "clean_text": clean_text_series,
        "num_links": num_links,
        "num_exclamations": num_exclamations,
        "has_urgent_words": has_urgent_words,
        "suspicious_tld": suspicious_tld,
        "subject_len": subject_len,
        "body_len": body_len,
        "label": y
    })

    # Drop completely empty texts
    valid_mask = processed_df["clean_text"].str.strip().str.len() > 0
    processed_df = processed_df[valid_mask].reset_index(drop=True)

    return processed_df


def train_and_export(dataset_file: str = None, sample_size: int = 15000):
    dataset_path = find_dataset_path(dataset_file)
    if not dataset_path:
        raise FileNotFoundError(
            f"Could not find any dataset matching {dataset_file or DATASET_CANDIDATES} in the Dataset directory."
        )

    print(f"[*] Loading dataset from: {dataset_path}")
    raw_df = pd.read_csv(dataset_path, low_memory=False)
    print(f"[*] Raw dataset loaded: {len(raw_df):,} records, columns: {list(raw_df.columns)}")

    # Prepare and normalize
    df = prepare_dataframe(raw_df)
    print(f"[*] Valid records after cleaning: {len(df):,}")
    print(f"[*] Class distribution: {dict(df['label'].value_counts())} (1=phishing, 0=legitimate)")

    # Downsample if specified to ensure fast training on huge datasets (e.g. 82k)
    if sample_size and sample_size > 0 and len(df) > sample_size:
        print(f"[*] Sampling {sample_size:,} stratified emails for optimal training speed & accuracy...")
        df, _ = train_test_split(
            df, train_size=sample_size, random_state=42, stratify=df["label"]
        )
        df = df.reset_index(drop=True)
        print(f"[*] Sampled class distribution: {dict(df['label'].value_counts())}")

    y = df["label"].values

    # 75/25 stratified train/test split
    train_df, test_df, y_train, y_test = train_test_split(
        df, y, test_size=0.25, random_state=42, stratify=y
    )

    print(f"[*] Fitting TF-IDF Vectorizer (max_features=1500, unigrams+bigrams)...")
    tfidf = TfidfVectorizer(max_features=1500, ngram_range=(1, 2))
    X_train_text = tfidf.fit_transform(train_df["clean_text"])
    X_test_text = tfidf.transform(test_df["clean_text"])

    meta_cols = ["num_links", "num_exclamations", "has_urgent_words", "suspicious_tld", "subject_len", "body_len"]
    print(f"[*] Scaling metadata features: {meta_cols}")
    scaler = MinMaxScaler()
    X_train_meta = scaler.fit_transform(train_df[meta_cols])
    X_test_meta = scaler.transform(test_df[meta_cols])

    X_train = hstack([X_train_text, csr_matrix(X_train_meta)]).tocsr()
    X_test = hstack([X_test_text, csr_matrix(X_test_meta)]).tocsr()

    feature_names = list(tfidf.get_feature_names_out()) + meta_cols
    print(f"[*] Train shape: {X_train.shape}, Test shape: {X_test.shape}")

    models = {
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Naive Bayes": MultinomialNB(),
        "Neural Network (MLP)": MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=300, random_state=42)
    }

    results = {}
    trained_models = {}

    for name, model in models.items():
        print(f"[*] Training {name}...")
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

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
            "confusion_matrix": cm,
            "tn": cm[0][0],
            "fp": cm[0][1],
            "fn": cm[1][0],
            "tp": cm[1][1]
        }
        trained_models[name] = model
        print(f"    -> Acc: {acc:.4f}, Prec: {prec:.4f}, Rec: {rec:.4f}, F1: {f1:.4f}")

    # Feature importances from Random Forest
    rf = trained_models["Random Forest"]
    importances = rf.feature_importances_
    top_indices = np.argsort(importances)[-20:][::-1]
    feature_importance_list = [
        {"feature": feature_names[i], "importance": round(float(importances[i]), 5)}
        for i in top_indices
    ]

    # Save artifacts
    save_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(save_dir, exist_ok=True)

    print(f"[*] Exporting model artifacts to: {save_dir}")
    joblib.dump(trained_models["Random Forest"], os.path.join(save_dir, "random_forest.joblib"), compress=3)
    joblib.dump(trained_models["Logistic Regression"], os.path.join(save_dir, "logistic_regression.joblib"), compress=3)
    joblib.dump(trained_models["Naive Bayes"], os.path.join(save_dir, "naive_bayes.joblib"), compress=3)
    joblib.dump(trained_models["Neural Network (MLP)"], os.path.join(save_dir, "neural_network.joblib"), compress=3)
    joblib.dump(tfidf, os.path.join(save_dir, "tfidf_vectorizer.joblib"), compress=3)
    joblib.dump(scaler, os.path.join(save_dir, "scaler.joblib"), compress=3)

    with open(os.path.join(save_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump({
            "dataset_source": os.path.basename(dataset_path),
            "models": results,
            "test_size": len(y_test),
            "train_size": len(y_train),
            "total_emails": len(df),
            "feature_count": len(feature_names),
            "meta_cols": meta_cols
        }, f, indent=2)

    with open(os.path.join(save_dir, "feature_importance.json"), "w", encoding="utf-8") as f:
        json.dump(feature_importance_list, f, indent=2)

    print(f"[+] All artifacts successfully trained on '{os.path.basename(dataset_path)}' and exported!")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PhishGuard AI models on real datasets.")
    parser.add_argument("--dataset", type=str, default=None, help="Name or path of dataset CSV file (e.g. phishing_email.csv, CEAS_08.csv, Enron.csv)")
    parser.add_argument("--sample-size", type=int, default=15000, help="Number of stratified rows to sample for fast training (0 for entire dataset)")
    args = parser.parse_args()

    train_and_export(dataset_file=args.dataset, sample_size=args.sample_size)
