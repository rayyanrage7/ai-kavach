# train_and_save.py
import os
import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib

os.makedirs("model", exist_ok=True)

rng = np.random.RandomState(42)

# feature ordering (same as processor and app)
# 0: failed_logins
# 1: cmd_count
# 2: avg_cmd_length
# 3: session_duration
# 4: file_interactions
# 5: suspicious_cmds_count
# 6: ip_frequency

# ---------- Build synthetic dataset ----------
# Normal sessions (human explorers)
normal = rng.normal(
    loc=[0.3, 3.0, 6.0, 40.0, 0.05, 0.0, 0.2],
    scale=[0.6, 1.5, 3.0, 20.0, 0.2, 0.1, 0.4],
    size=(1200, 7),
)

# Recon / scanning (many small commands, short duration, high ip_frequency)
recon = rng.normal(
    loc=[0.5, 8.0, 4.0, 25.0, 0.0, 0.0, 3.0],
    scale=[1.0, 3.0, 2.5, 15.0, 0.1, 0.1, 1.5],
    size=(300, 7),
)

# Brute-force style (many failed_logins, many short login tries)
bruteforce = rng.normal(
    loc=[15.0, 6.0, 3.0, 60.0, 0.0, 0.0, 5.0],
    scale=[6.0, 2.5, 2.0, 40.0, 0.2, 0.2, 2.0],
    size=(250, 7),
)

# Malware deployment (long commands, file interactions, suspicious keywords)
malware = rng.normal(
    loc=[3.0, 20.0, 18.0, 180.0, 3.0, 4.0, 2.0],
    scale=[2.0, 6.0, 6.0, 80.0, 1.5, 1.8, 1.4],
    size=(250, 7),
)

# Combine
X = np.vstack([normal, recon, bruteforce, malware])

# Create labels for attack_type classifier (for supervised model)
y = np.array(
    ["normal"] * normal.shape[0]
    + ["recon"] * recon.shape[0]
    + ["bruteforce"] * bruteforce.shape[0]
    + ["malware"] * malware.shape[0]
)

# Standardize features for classifiers where appropriate
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# KMeans on raw or scaled features (clustering behavior)
kmeans = KMeans(n_clusters=4, random_state=42)
kmeans.fit(X_scaled)

# IsolationForest anomaly detection
iso = IsolationForest(contamination=0.12, random_state=42)
iso.fit(X_scaled)

# RandomForest attack type classifier
rf = RandomForestClassifier(n_estimators=200, random_state=42)
rf.fit(X_scaled, y)

# Save everything
joblib.dump(kmeans, "model/kmeans.pkl")
joblib.dump(iso, "model/isolation_forest.pkl")
joblib.dump(rf, "model/attack_classifier.pkl")
joblib.dump(scaler, "model/scaler.pkl")

print("Saved models to model/; dataset shape:", X.shape)
