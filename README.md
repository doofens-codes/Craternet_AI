# CraterNet.AI 🛣️

**Autonomous pothole detection, geotagging, and grievance resolution system for NH-343, Chhattisgarh**

> Built at E-Summmit 2026, CHIPS Chhattisgarh AIML Hackathon 2026 · IIIT Naya Raipur 

---

## What It Does

CraterNet.AI closes the full loop between road damage detection and government action — something no existing system does end-to-end.

A citizen on NH-343 opens the portal on their phone, takes a photo of a pothole, and submits it. The system verifies they are physically on the highway using GPS + OpenStreetMap road data, runs the photo through a YOLOv8 computer vision model, classifies severity, geotags the detection, and auto-generates a formal technical report addressed to the NHAI Regional Officer in Raipur. The admin dashboard tracks all detections live on a heatmap. When a contractor or citizen submits a clear photo from the same location with no pothole detected, the system auto-resolves the case — no manual admin override.

---

## The Solution Loop

```
Citizen on NH-343
      ↓
OTP Login (mobile)
      ↓
GPS verified on highway via Overpass API
      ↓
Photo submitted → YOLOv8 inference
      ↓
Pothole detected? → Severity classified (Severe / Moderate)
      ↓
Geotagged + stored → Heatmap updated live
      ↓
Threshold met? → PDF report auto-generated → NHAI Raipur
      ↓
Contractor submits clear photo from same location
      ↓
YOLO finds no pothole → Case auto-resolved → Map turns green
```

---

## Features

**Citizen Portal**
- Mobile-first, OTP-authenticated (phone number only — not stored or shared)
- Live GPS acquisition with high-accuracy + network fallback
- Road validation — rejects uploads from anyone not on NH-343
- Real-time YOLOv8 detection with annotated result image
- Automatic PDF report generation queued for NHAI on threshold
- PG Portal redirect for formal complaint registration

**Admin Dashboard**
- Password-protected dashboard
- Live heatmap of all detections on NH-343
- Color-coded severity: 🔴 Severe · 🟡 Moderate · 🟢 Resolved
- Citizen complaint review panel with evidence images
- PDF report download panel
- Manual report generation per detection
- No manual resolve — cases close only via field photo verification

**AI Detection**
- YOLOv8n fine-tuned on RDD2022 road damage dataset
- Confidence threshold: 25% minimum
- Severity classification: ≥70% confidence → Severe, else Moderate
- Auto-report triggers: 1 severe detection OR 3+ moderate within 500m cluster

**Road Intelligence**
- NH-343 validated against OpenStreetMap relation ID 5793727
- 41 way segments cached locally — no API dependency during demo
- Overpass API fallback for live node-proximity validation
- Authority mapped from OSM ref tag: NH → NHAI Raipur

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python · Flask · Blueprints |
| AI Model | YOLOv8n (Ultralytics) · fine-tuned weights |
| Road Validation | OpenStreetMap · Overpass API |
| Auth | Firebase Phone Auth (OTP) |
| PDF Generation | ReportLab |
| Frontend | Vanilla JS modules · Leaflet.js · Leaflet.heat |
| Mapping | CartoDB tiles · OpenStreetMap data |
| Tunnel | ngrok (laptop-hosted, public HTTPS URL) |

---

## Project Structure

```
CraterNetV2/
├── app.py                    # Flask app, blueprint registration
├── config.py                 # Env vars, Firebase init, paths, thresholds
├── .env                      # Secrets (not committed)
├── firebase-admin-key.json   # Firebase service account (not committed)
├── requirements.txt
├── run.bat                   # One-click start: Flask + ngrok
│
├── routes/
│   ├── auth.py               # Firebase token verification middleware
│   ├── detect.py             # POST /api/detect — YOLO inference endpoint
│   ├── potholes.py           # GET /api/potholes — CRUD + clustering + auto-resolve
│   ├── road.py               # Overpass road validation (NH-343 proximity check)
│   ├── report.py             # PDF generation + download endpoints
│   └── admin.py              # Admin login + stats endpoints
│
├── data/
│   ├── detections.json       # Live detection store
│   ├── nh343_ways.json       # Cached OSM way IDs for NH-343
│   └── reports/              # Auto-generated PDF reports
│
├── models/
│   └── best.pt               # Fine-tuned YOLOv8 weights (not committed)
│
├── static/
│   ├── css/main.css          # Government theme, light/dark, responsive
│   ├── js/
│   │   ├── app.js            # Page router, theme toggle, boot
│   │   ├── firebase.js       # OTP auth flow
│   │   ├── map.js            # Leaflet map, markers, heatmap
│   │   ├── upload.js         # GPS acquisition, road check, YOLO submit
│   │   └── admin.js          # Admin dashboard, PDF panel, resolve logic
│   ├── uploads/              # Citizen-submitted images
│   └── results/              # Annotated YOLO output images
│
└── templates/
    └── app.html              # Single HTML shell — all pages rendered here
```

---

## Setup

### Prerequisites

- Python 3.10+
- ngrok account (free) — [ngrok.com](https://ngrok.com)
- Firebase project with Phone Authentication enabled

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/CraterNet.git
cd CraterNet

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1        # Windows
source .venv/bin/activate          # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

### Configuration

**1. Add your model weights**
```
models/best.pt   ← your fine-tuned YOLOv8 weights
```

**2. Create `.env`**
```env
FIREBASE_ADMIN_KEY=firebase-admin-key.json
ADMIN_PASSWORD=your_admin_password
FLASK_SECRET=your_secret_key
NH343_RELATION_ID=5793727
REPORT_OUTPUT_DIR=data/reports
```

**3. Add Firebase service account**

Download from Firebase Console → Project Settings → Service Accounts → Generate new private key. Save as `firebase-admin-key.json` in the project root.

**4. Add your Firebase config to `static/js/firebase.js`**

Replace the placeholder values with your project's config object.

**5. Configure ngrok**
```bash
ngrok config add-authtoken YOUR_TOKEN
```

### Running

```bash
# Start Flask
python app.py

# In a second terminal, start ngrok
ngrok http 5000 --request-header-add "ngrok-skip-browser-warning:true"
```

Or just double-click `run.bat` on Windows.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/potholes` | None | All detections as JSON |
| POST | `/api/detect` | Bearer token | Upload image, run YOLO, validate road |
| POST | `/api/admin/login` | None | Admin password auth |
| GET | `/api/admin/reports` | Session | List generated PDF reports |
| GET | `/api/admin/report/<file>` | Session | Download PDF report |
| POST | `/api/admin/report/generate/<uid>` | Session | Manually generate report for detection |
| POST | `/api/admin/resolve/<uid>` | Session | Disabled — field photo verification only |

---

## Detection Thresholds

These are configurable in `config.py`:

```python
SEVERE_THRESHOLD   = 1    # 1 severe detection → auto PDF
MODERATE_THRESHOLD = 3    # 3 moderate within 500m → auto PDF
CLUSTER_RADIUS_M   = 500  # clustering radius in metres
SNAP_RADIUS_M      = 100  # max distance from NH-343 to accept report
```

---

## Road Authority Mapping

| Highway Prefix | Authority | Contact |
|---|---|---|
| NH-* | NHAI | Regional Officer, NHAI Raipur |
| SH-* | Chhattisgarh PWD | Executive Engineer, PWD Raipur Division |
| MDR-* | District Collector / PMGSY | District Office |

NH-343 was reclassified from SH-343 to a National Highway — jurisdiction belongs to NHAI.

---

## What's Not In This Repo

| File | Why |
|---|---|
| `firebase-admin-key.json` | Private key — treat like a password |
| `.env` | Contains secrets |
| `models/best.pt` | Large binary, proprietary training |
| `static/uploads/` | User-submitted images |
| `static/results/` | Generated annotated images |
| `data/reports/` | Generated PDF reports |

---

## Team

Built by a 4-member team from IIIT Naya Raipur for the CHIPS Chhattisgarh AIML Hackathon 2026.

| Role | Scope |
|---|---|
| AI / ML | YOLOv8 training, inference pipeline, severity classification |
| Backend | Flask API, road validation, PDF generation, clustering logic |
| Frontend / Map | Leaflet heatmap, citizen portal, OTP flow |
| Dashboard / DevOps | Admin panel, ngrok deployment, Firebase setup |

---

## License

MIT License. Road data © OpenStreetMap contributors, ODbL.
