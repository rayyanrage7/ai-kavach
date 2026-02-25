#!/usr/bin/env python3
"""
AI-KAVACH Processor — FIXED VERSION

Fixes:
- Sends command text for IoC extraction
- GeoIP fallback when DB not available
- Persistent cursor prevents old log reprocessing
"""

import time
import json
import os
import requests
from collections import defaultdict, deque

# ==============================
# CONFIG
# ==============================
COWRIE_LOG = os.path.expanduser("~/cowrie/var/log/cowrie/cowrie.json")
BACKEND_INGEST = os.environ.get("INGEST_URL", "http://localhost:3000/ingest")
FLUSH_INTERVAL = 2.0
SESSION_TIMEOUT = 20

GEOIP_DB_PATH = os.environ.get("GEOIP_DB", "")
USE_GEOIP = bool(GEOIP_DB_PATH)

try:
    if USE_GEOIP:
        import geoip2.database
        geo_reader = geoip2.database.Reader(GEOIP_DB_PATH)
    else:
        geo_reader = None
except:
    geo_reader = None
    USE_GEOIP = False

sessions = {}
processed_sessions = set()
ip_activity = defaultdict(lambda: deque(maxlen=200))

CURSOR_FILE = "/tmp/ai_kavach_cowrie_cursor"

# ==============================
# HELPERS
# ==============================
def now_ts():
    return time.time()

def get_cursor():
    if not os.path.exists(CURSOR_FILE):
        return 0
    try:
        return int(open(CURSOR_FILE).read().strip())
    except:
        return 0

def save_cursor(pos):
    try:
        with open(CURSOR_FILE, "w") as f:
            f.write(str(pos))
    except:
        pass

def safe_get(d, k, default=None):
    return d.get(k, default) if isinstance(d, dict) else default

# ==============================
# SESSION HANDLING
# ==============================
def add_event(event):
    session_key = event.get("session")
    if not session_key:
        ip = safe_get(event, "src_ip", "unknown")
        t = int(now_ts() // 60)
        session_key = f"{ip}:{t}"

    s = sessions.get(session_key)
    if not s:
        s = {
            "events": [],
            "first_ts": now_ts(),
            "last_ts": now_ts(),
            "src_ip": safe_get(event, "src_ip"),
        }
        sessions[session_key] = s

    s["events"].append(event)
    s["last_ts"] = now_ts()
    return session_key

# ==============================
# FEATURE EXTRACTION
# ==============================
def extract_command(event):
    raw = (
        event.get("input")
        or event.get("input_line")
        or event.get("message")
        or ""
    )
    if not isinstance(raw, str):
        return ""
    if raw.startswith("CMD:"):
        raw = raw[4:].strip()
    return raw.strip()

def compute_features_for_session(s):
    events = s["events"]
    src_ip = s["src_ip"]
    duration = s["last_ts"] - s["first_ts"]

    failed_logins = 0
    cmd_count = 0
    total_cmd_len = 0
    file_interactions = 0
    suspicious_cmds = 0
    commands = []

    suspicious_keywords = [
        "wget", "curl", "base64", "bash", "nc ", "netcat",
        "perl -e", "python -c", "powershell", "invoke-webrequest"
    ]

    for e in events:
        eid = e.get("eventid") or e.get("event")

        if eid in ("cowrie.login.failed", "cowrie.login.failed.password"):
            failed_logins += 1

        raw_cmd = extract_command(e)
        if raw_cmd:
            cmd_count += 1
            total_cmd_len += len(raw_cmd)
            commands.append(raw_cmd)

            l = raw_cmd.lower()
            if any(k in l for k in suspicious_keywords):
                suspicious_cmds += 1
            if any(ext in l for ext in [".sh", ".exe", ".py", ".php", ".bin"]):
                file_interactions += 1

    avg_cmd_length = (total_cmd_len / cmd_count) if cmd_count else 0
    recent_count = len([t for t in ip_activity[src_ip] if t > now_ts() - 3600]) if src_ip else 0

    return {
        "src_ip": src_ip,
        "failed_logins": failed_logins,
        "cmd_count": cmd_count,
        "avg_cmd_length": round(avg_cmd_length, 2),
        "session_duration": int(duration),
        "file_interactions": file_interactions,
        "suspicious_cmds_count": suspicious_cmds,
        "ip_frequency": recent_count,
        "raw": {
            "events_count": len(events),
            "commands": commands[:20]
        },
    }

def enrich_geoip(data):
    ip = data.get("src_ip")

    # Real GeoIP
    if geo_reader and ip:
        try:
            res = geo_reader.city(ip)
            data["geo"] = {
                "country_name": getattr(res.country, "name", None),
                "city": getattr(res.city, "name", None),
                "latitude": getattr(res.location, "latitude", None),
                "longitude": getattr(res.location, "longitude", None),
            }
            return data
        except:
            pass

    # DEV fallback geo
    data["geo"] = {
        "country_name": "India",
        "city": "Delhi",
        "latitude": 28.6139,
        "longitude": 77.2090,
    }
    return data

# ==============================
# FLUSH SESSION
# ==============================
def flush_session(session_key):
    s = sessions.pop(session_key, None)
    if not s:
        return
    if session_key in processed_sessions:
        return

    features = compute_features_for_session(s)
    features = enrich_geoip(features)

    ip = features.get("src_ip")
    if ip:
        ip_activity[ip].append(now_ts())

    try:
        r = requests.post(BACKEND_INGEST, json=features, timeout=5)
        if r.ok:
            print(f"[OK] Sent → {ip} | cmds={features['cmd_count']}")
            processed_sessions.add(session_key)
        else:
            print("[ERROR]", r.status_code, r.text)
    except Exception as e:
        print("POST failed:", e)

# ==============================
# MAIN LOOP
# ==============================
def tail_loop():
    print("\n=== AI-KAVACH PROCESSOR STARTED ===")
    print("Cowrie log:", COWRIE_LOG)
    print("Backend:", BACKEND_INGEST)
    print("GeoIP:", "Enabled" if geo_reader else "Fallback")
    print("===================================\n")

    if not os.path.exists(COWRIE_LOG):
        print("Cowrie log not found.")
        return

    with open(COWRIE_LOG, "r", encoding="utf-8", errors="ignore") as fh:
        fh.seek(get_cursor(), os.SEEK_SET)

        while True:
            line = fh.readline()
            if not line:
                save_cursor(fh.tell())
                now = now_ts()
                expired = [
                    key for key, s in sessions.items()
                    if now - s["last_ts"] > SESSION_TIMEOUT
                ]
                for key in expired:
                    flush_session(key)
                time.sleep(FLUSH_INTERVAL)
                continue

            save_cursor(fh.tell())
            try:
                add_event(json.loads(line))
            except:
                continue

if __name__ == "__main__":
    try:
        tail_loop()
    except KeyboardInterrupt:
        print("Stopped.")
