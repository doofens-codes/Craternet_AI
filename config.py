import os
from pathlib import Path
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials

load_dotenv()

BASE_DIR = Path(__file__).parent

# Paths
MODEL_PATH        = BASE_DIR / "models" / "yolo26n.pt"
UPLOAD_DIR        = BASE_DIR / "static" / "uploads"
RESULTS_DIR       = BASE_DIR / "static" / "results"
DATA_DIR          = BASE_DIR / "data"
REPORTS_DIR       = BASE_DIR / "data" / "reports"
DETECTIONS_FILE   = BASE_DIR / "data" / "detections.json"
NH343_WAYS_FILE   = BASE_DIR / "data" / "nh343_ways.json"

# Create dirs
for d in [UPLOAD_DIR, RESULTS_DIR, DATA_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Firebase Admin
FIREBASE_KEY_PATH = BASE_DIR / os.getenv("FIREBASE_ADMIN_KEY", "firebase-admin-key.json")
if not firebase_admin._apps:
    cred = credentials.Certificate(str(FIREBASE_KEY_PATH))
    firebase_admin.initialize_app(cred)

# App config
ADMIN_PASSWORD    = os.getenv("ADMIN_PASSWORD", "craternet2026")
FLASK_SECRET      = os.getenv("FLASK_SECRET", "dev-secret")
NH343_RELATION_ID = os.getenv("NH343_RELATION_ID", "5793727")

# Clustering thresholds
SEVERE_THRESHOLD   = 1   # 1 severe = auto PDF
MODERATE_THRESHOLD = 3   # 3 moderate within 500m = auto PDF
CLUSTER_RADIUS_M   = 500 # metres

# Severity mapping
def confidence_to_severity(conf):
    if conf >= 0.70:
        return "severe"
    return "moderate"
