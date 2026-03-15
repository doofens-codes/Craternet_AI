from flask import Blueprint, request, jsonify, session
import config
from routes.potholes import load_detections, save_detections

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json()
    if data and data.get("password") == config.ADMIN_PASSWORD:
        session["admin"] = True
        return jsonify({"success": True})
    return jsonify({"success": False}), 401


def require_admin(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin"):
            return jsonify({"error": "Unauthorised"}), 401
        return f(*args, **kwargs)
    return decorated


@admin_bp.route("/api/admin/resolve/<uid>", methods=["POST"])
@require_admin
def resolve(uid):
    return jsonify({
        "error": "Manual resolution disabled. Potholes are resolved automatically when a clear road photo is submitted from the same location."
    }), 403

@admin_bp.route("/api/admin/stats")
@require_admin
def stats():
    data   = load_detections()
    total  = len(data)
    severe = sum(1 for d in data if d.get("severity") == "severe")
    mod    = sum(1 for d in data if d.get("severity") == "moderate")
    res    = sum(1 for d in data if d.get("severity") == "resolved")
    return jsonify({"total": total, "severe": severe, "moderate": mod, "resolved": res})
