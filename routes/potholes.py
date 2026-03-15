import json
import math
from pathlib import Path
from flask import Blueprint, jsonify
import config

potholes_bp = Blueprint("potholes", __name__)


def load_detections():
    if config.DETECTIONS_FILE.exists():
        with open(config.DETECTIONS_FILE) as f:
            return json.load(f)
    return []


def save_detections(data):
    with open(config.DETECTIONS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def append_detection(detection):
    data = load_detections()
    data.append(detection)
    save_detections(data)


def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = (math.sin(dphi/2)**2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlam/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def check_and_trigger_report(lat, lng, severity):
    """
    Check clustering thresholds and auto-generate PDF if met.
    Returns PDF path if generated, else None.
    """
    from routes.report import generate_report

    data = load_detections()

    # Find all open reports near this coordinate
    nearby = [
        d for d in data
        if d.get("status") == "open"
        and d.get("lat") and d.get("lng")
        and haversine(lat, lng, d["lat"], d["lng"]) <= config.CLUSTER_RADIUS_M
    ]

    severe_count   = sum(1 for d in nearby if d.get("severity") == "severe")
    moderate_count = sum(1 for d in nearby if d.get("severity") == "moderate")

    should_generate = (
        severe_count   >= config.SEVERE_THRESHOLD or
        moderate_count >= config.MODERATE_THRESHOLD
    )

    if not should_generate:
        return None

    # Check if a report already exists for this cluster
    already_reported = any(d.get("report_generated") for d in nearby)
    if already_reported:
        return None

    # Generate PDF
    pdf_path = generate_report(nearby)

    # Mark all nearby as report_generated
    ids = {d["id"] for d in nearby}
    for d in data:
        if d["id"] in ids:
            d["report_generated"] = True
            d["pdf_path"] = str(pdf_path)
    save_detections(data)

    return pdf_path


@potholes_bp.route("/api/potholes")
def get_potholes():
    return jsonify(load_detections())
