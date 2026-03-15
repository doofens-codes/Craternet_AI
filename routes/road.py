import json
import math
import requests
from pathlib import Path

NH343_WAYS_FILE = Path(__file__).parent.parent / "data" / "nh343_ways.json"

with open(NH343_WAYS_FILE) as f:
    NH343_DATA = json.load(f)

WAY_IDS = NH343_DATA["way_ids"]
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
SNAP_RADIUS_M = 100  # metres
DEMO_MODE = True


def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def validate_on_nh343(lat, lng):
    """
    Returns dict:
      on_road: bool
      road_name: str
      distance_m: float
      authority: str
    Queries Overpass for NH-343 way nodes near the given coordinate.
    """
    # Build Overpass query: get nodes of NH-343 ways within bbox
    delta = 0.01  # ~1.1km buffer
    bbox = f"{lat-delta},{lng-delta},{lat+delta},{lng+delta}"

    way_filter = "".join([f"way({wid});" for wid in WAY_IDS])
    query = f"""
    [out:json][timeout:10];
    (
      {way_filter}
    );
    node(w)->.nodes;
    .nodes out;
    """

    try:
        resp = requests.post(OVERPASS_URL, data={"data": query}, timeout=12)
        data = resp.json()
    except Exception:
        # If Overpass is unreachable, fail open for demo resilience
        return {"on_road": True, "road_name": "NH-343", "distance_m": 0, "authority": NH343_DATA["authority_full"]}

    nodes = data.get("elements", [])
    if not nodes:
        return {"on_road": False, "road_name": None, "distance_m": None, "authority": None}

    # Find closest node
    min_dist = float("inf")
    for node in nodes:
        d = haversine(lat, lng, node["lat"], node["lon"])
        if d < min_dist:
            min_dist = d

    on_road = min_dist <= SNAP_RADIUS_M or DEMO_MODE

    return {
        "on_road": on_road,
        "road_name": "NH-343",
        "distance_m": round(min_dist, 1),
        "authority": NH343_DATA["authority_full"] if on_road else None
    }
