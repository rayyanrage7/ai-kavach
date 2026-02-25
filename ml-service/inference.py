# inference.py
import os
import joblib
import numpy as np
import math

ROOT = os.path.dirname(__file__)
MODEL_DIR = os.path.join(ROOT, "model")

kmeans = joblib.load(os.path.join(MODEL_DIR, "kmeans.pkl"))
isof = joblib.load(os.path.join(MODEL_DIR, "isolation_forest.pkl"))
clf = joblib.load(os.path.join(MODEL_DIR, "attack_classifier.pkl"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))

# feature vector order must match processor
FEATURE_ORDER = [
    "failed_logins",
    "cmd_count",
    "avg_cmd_length",
    "session_duration",
    "file_interactions",
    "suspicious_cmds_count",
    "ip_frequency",
]

def to_array(features):
    vals = [features.get(k, 0) for k in FEATURE_ORDER]
    return np.array(vals).reshape(1, -1)

def sigmoid(x):
    return 1 / (1 + math.exp(-x))

def analyze_attack(features):
    """
    Accepts features dict from processor and returns:
    {
      cluster, anomaly_score, attack_type, confidence, risk_score, severity, extras...
    }
    """
    X = to_array(features)
    Xs = scaler.transform(X)  # use scaler from train

    # cluster
    cluster = int(kmeans.predict(Xs)[0])

    # anomaly score (decision_function): higher -> more normal; lower -> anomalous
    raw_anom = float(isof.decision_function(Xs)[0])

    # normalize anomaly to 0..1 where 1 == very anomalous
    # We invert and scale: anom_norm = sigmoid(-raw_anom * factor)
    anom_norm = sigmoid(-raw_anom * 3.0)

    # classification
    try:
        probs = clf.predict_proba(Xs)[0]
        classes = clf.classes_
        best_idx = int(np.argmax(probs))
        attack_type = str(classes[best_idx])
        confidence = float(probs[best_idx])
    except Exception:
        attack_type = "unknown"
        confidence = 0.0

    # Heuristic IP reputation placeholder (0..100)
    # If features include ip_reputation from external TI, use it; otherwise approximate.
    ip_rep = features.get("ip_reputation", None)
    if ip_rep is None:
        # Simple heuristic: more failed_logins and higher ip_frequency => worse reputation
        ip_rep = min(95, int(features.get("failed_logins", 0) * 4 + features.get("ip_frequency", 0) * 8))

    # risk score: weighted aggregation (0..100)
    # weights can be tuned later
    risk = (
        anom_norm * 50.0  # anomaly carries big weight
        + (confidence * 100.0 if attack_type != "normal" else 0.0) * 0.2
        + min(100, ip_rep) * 0.25
        + min(100, (features.get("file_interactions", 0) * 20)) * 0.05
        + min(100, features.get("failed_logins", 0) * 3) * 0.0
    )
    risk_score = int(max(0, min(100, risk)))

    # severity buckets
    if risk_score >= 55:
        severity = "critical"
    elif risk_score >= 30:
        severity = "moderate"
    else:
        severity = "low"

    result = {
        "cluster": cluster,
        "anomaly_score": raw_anom,
        "anomaly_norm": round(anom_norm, 4),
        "attack_type": attack_type,
        "confidence": round(confidence, 3),
        "ip_reputation": int(ip_rep),
        "risk_score": risk_score,
        "severity": severity,
    }

    # pass back some model debug values for later inspection
    result["model_debug"] = {"classes": list(map(str, clf.classes_))}
    return result
