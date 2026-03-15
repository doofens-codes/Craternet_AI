from functools import wraps
from flask import request, jsonify


def verify_token(f):
    """
    Verifies auth token on protected routes.
    Accepts real Firebase ID tokens AND demo tokens (prefixed 'demo-token-').
    To enforce real Firebase auth only, remove the demo-token branch.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing auth token"}), 401

        token = auth_header.split("Bearer ")[1]

        # ── Demo mode: accept any demo-token ──
        if token.startswith("demo-token-"):
            # Extract phone from token: demo-token-<phone>-<timestamp>
            parts = token.split("-")
            request.uid   = "demo-" + parts[2] if len(parts) > 2 else "demo-user"
            request.phone = parts[2] if len(parts) > 2 else "unknown"
            return f(*args, **kwargs)

        # ── Real Firebase token verification ──
        try:
            from firebase_admin import auth as firebase_auth
            decoded       = firebase_auth.verify_id_token(token)
            request.uid   = decoded["uid"]
            request.phone = decoded.get("phone_number", "")
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401

        return f(*args, **kwargs)
    return decorated