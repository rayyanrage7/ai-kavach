# app.py
from flask import Flask, request, jsonify
import os
from inference import analyze_attack  # we import our improved analysis logic

app = Flask(__name__)

@app.route("/infer", methods=["POST"])
def infer():
    payload = request.json or {}

    try:
        result = analyze_attack(payload)

        # backend expects a simple ML object, so keep strict structure
        return jsonify({
            "ok": True,
            "ml": result
        })

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "ok": True,
        "service": "ai-kavach-ml",
        "message": "ML inference running",
        "version": "1.1"
    })


if __name__ == "__main__":
    host = os.environ.get("ML_HOST", "0.0.0.0")
    port = int(os.environ.get("ML_PORT", 5000))
    app.run(host=host, port=port)
