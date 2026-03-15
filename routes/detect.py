import uuid
import base64
import datetime
import io
from pathlib import Path
from flask import Blueprint, request, jsonify
from PIL import Image
from ultralytics import YOLO
from routes.auth import verify_token
from routes.road import validate_on_nh343
import config

detect_bp = Blueprint("detect", __name__)
model = YOLO(str(config.MODEL_PATH))


@detect_bp.route("/api/detect", methods=["POST"])
@verify_token
def detect():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400

    file = request.files["image"]
    lat  = request.form.get("lat")
    lng  = request.form.get("lng")

    if not lat or not lng:
        return jsonify({"error": "GPS coordinates required"}), 400

    lat, lng = float(lat), float(lng)

    # Road validation
    road_check = validate_on_nh343(lat, lng)
    if not road_check["on_road"]:
        return jsonify({
            "error": "not_on_road",
            "message": f"You must be on NH-343 to submit a report. Nearest road point is {road_check['distance_m']}m away.",
            "distance_m": road_check["distance_m"]
        }), 422

    # Save upload
    ext = Path(file.filename).suffix.lower() or ".jpg"
    uid = str(uuid.uuid4())[:8]
    upload_path = config.UPLOAD_DIR / f"{uid}{ext}"
    file.save(str(upload_path))

    # YOLO inference
    results = model(str(upload_path), conf=0.25)
    result  = results[0]

    if not len(result.boxes):
        upload_path.unlink(missing_ok=True)
        # Check if this clears a nearby open pothole
        from routes.potholes import load_detections, save_detections, haversine
        data = load_detections()
        resolved_ids = []
        for d in data:
            if (d.get("status") == "open"
                    and d.get("lat") and d.get("lng")
                    and haversine(lat, lng, d["lat"], d["lng"]) <= 80):
                d["status"]      = "resolved"
                d["severity"]    = "resolved"
                d["resolved_by"] = request.uid
                d["resolved_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                resolved_ids.append(d["id"])
        if resolved_ids:
            save_detections(data)
            return jsonify({
                "pothole_detected": False,
                "auto_resolved":    True,
                "resolved_ids":     resolved_ids,
                "message": f"No pothole found. {len(resolved_ids)} nearby report(s) marked as resolved."
            })
        return jsonify({"pothole_detected": False, "message": "No pothole detected in this image."})

    # Annotated result
    annotated  = result.plot()
    result_img = Image.fromarray(annotated[..., ::-1])
    result_path = config.RESULTS_DIR / f"{uid}_result.jpg"
    result_img.save(str(result_path))

    best_conf = max(result.boxes.conf.tolist())
    severity  = config.confidence_to_severity(best_conf)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Base64 for immediate display
    buf = io.BytesIO()
    result_img.save(buf, format="JPEG")
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    detection = {
        "id":         uid,
        "timestamp":  timestamp,
        "confidence": round(best_conf, 3),
        "severity":   severity,
        "lat":        lat,
        "lng":        lng,
        "source":     "citizen",
        "uid":        request.uid,
        "image_url":  f"/static/uploads/{uid}{ext}",
        "result_url": f"/static/results/{uid}_result.jpg",
        "status":     "open",
        "road":       "NH-343",
        "authority":  road_check["authority"]
    }

    # Save detection and check report threshold
    from routes.potholes import append_detection, check_and_trigger_report
    append_detection(detection)
    pdf_path = check_and_trigger_report(lat, lng, severity)

    return jsonify({
        "pothole_detected": True,
        "confidence":       round(best_conf, 3),
        "severity":         severity,
        "result_image":     f"data:image/jpeg;base64,{img_b64}",
        "result_url":       f"/static/results/{uid}_result.jpg",
        "id":               uid,
        "timestamp":        timestamp,
        "road":             "NH-343",
        "pdf_generated":    pdf_path is not None,
        "pdf_url":          f"/api/admin/report/{Path(pdf_path).name}" if pdf_path else None
    })