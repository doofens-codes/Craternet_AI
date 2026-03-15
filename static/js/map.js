let mainMap = null;
let landingMap = null;
let mapsInited = { main: false, landing: false };

function makeIcon(color, glow) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.25),0 0 0 3px ${glow}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const ICONS = {
  severe: makeIcon("#d32f2f", "rgba(211,47,47,.2)"),
  moderate: makeIcon("#f5a800", "rgba(245,168,0,.2)"),
  resolved: makeIcon("#2e7d32", "rgba(46,125,50,.2)"),
};

const CENTER = [23.6250693, 83.6364204];

function initMainMap() {
  if (mapsInited.main) return;
  mapsInited.main = true;
  mainMap = L.map("main-map", {
    zoomControl: true,
    attributionControl: false,
  }).setView(CENTER, 14);
  setMapTiles(mainMap);
  loadMapDetections(mainMap, "det-list", "det-count", true);
}

function initLandingMap() {
  if (mapsInited.landing) return;
  mapsInited.landing = true;
  landingMap = L.map("landing-map", {
    zoomControl: true,
    attributionControl: false,
    dragging: true,
    scrollWheelZoom: true,
    tap: true,
  }).setView(CENTER, 13);
  setMapTiles(landingMap);
  setTimeout(() => landingMap.invalidateSize(), 100);
  loadMapDetections(landingMap, null, null, false);
}

function setMapTiles(map) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  L.tileLayer(
    isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 },
  ).addTo(map);
}

function refreshMapTiles() {
  [mainMap, landingMap].forEach((map) => {
    if (!map) return;
    map.eachLayer((l) => {
      if (l._url) map.removeLayer(l);
    });
    setMapTiles(map);
  });
  if (window._mainHeat)
    window._mainHeat.setOptions({ gradient: heatGradient() });
  if (window._landingHeat)
    window._landingHeat.setOptions({ gradient: heatGradient() });
}

function heatGradient() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return isDark
    ? { 0.2: "#66bb6a", 0.55: "#f5a800", 1.0: "#ef5350" }
    : { 0.2: "#2e7d32", 0.55: "#f5a800", 1.0: "#d32f2f" };
}

async function loadMapDetections(map, listId, countId, buildSidebar) {
  const res = await fetch("/api/potholes");
  const data = await res.json();

  // Update header stats
  document.getElementById("h-total").textContent = data.length;
  document.getElementById("h-severe").textContent = data.filter(
    (d) => d.severity === "severe",
  ).length;

  // Landing stats
  document.getElementById("l-total").textContent = data.length;
  document.getElementById("l-severe").textContent = data.filter(
    (d) => d.severity === "severe",
  ).length;
  document.getElementById("l-resolved").textContent = data.filter(
    (d) => d.severity === "resolved",
  ).length;

  if (countId) document.getElementById(countId).textContent = data.length;

  const heatData = [];
  const list = listId ? document.getElementById(listId) : null;
  if (list) list.innerHTML = "";

  const sorted = [...data].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  );

  sorted.forEach((d) => {
    if (!d.lat || !d.lng) return;

    const sevLabel =
      d.severity === "severe"
        ? "Severe"
        : d.severity === "moderate"
          ? "Moderate"
          : "Resolved";
    const marker = L.marker([d.lat, d.lng], {
      icon: ICONS[d.severity] || ICONS.moderate,
    }).addTo(map);
    marker.bindPopup(`
      <div>
        <div class="popup-title">Pothole #${d.id}</div>
        <div class="popup-row"><b>Severity:</b> ${sevLabel}</div>
        <div class="popup-row"><b>Confidence:</b> ${(d.confidence * 100).toFixed(0)}%</div>
        <div class="popup-row"><b>Road:</b> ${d.road || "NH-343"}</div>
        <div class="popup-row"><b>Detected:</b> ${d.timestamp}</div>
        <div class="popup-row"><b>Coords:</b> ${d.lat}, ${d.lng}</div>
      </div>
    `);

    heatData.push([
      d.lat,
      d.lng,
      d.severity === "severe" ? 1.0 : d.severity === "moderate" ? 0.55 : 0.1,
    ]);

    if (list && buildSidebar) {
      const card = document.createElement("div");
      card.className = `det-card sev-${d.severity}`;
      card.innerHTML = `
        <div class="det-card-top">
          <span class="det-id">#${d.id}</span>
          <span class="sev-badge sev-${d.severity}">${sevLabel}</span>
        </div>
        <div class="det-coords">${d.lat}, ${d.lng}</div>
        <div class="det-meta-row">
          <span class="det-time">${d.timestamp}</span>
          <span class="det-conf">${(d.confidence * 100).toFixed(0)}%</span>
        </div>
        <div class="conf-track">
          <div class="conf-fill fill-${d.severity}" style="width:${d.confidence * 100}%"></div>
        </div>
      `;
      card.onclick = () => {
        map.flyTo([d.lat, d.lng], 17, { duration: 1 });
        marker.openPopup();
      };
      list.appendChild(card);
    }
  });

  // Heatmap
  const heatKey = buildSidebar ? "_mainHeat" : "_landingHeat";
  if (window[heatKey]) map.removeLayer(window[heatKey]);
  if (heatData.length) {
    window[heatKey] = L.heatLayer(heatData, {
      radius: 36,
      blur: 26,
      maxZoom: 17,
      gradient: heatGradient(),
    }).addTo(map);
  }
}

function addMarkerToMap(lat, lng, severity) {
  if (!mainMap) return;
  const sevLabel = severity === "severe" ? "Severe" : "Moderate";
  L.marker([lat, lng], { icon: ICONS[severity] || ICONS.moderate })
    .addTo(mainMap)
    .bindPopup(
      `<div><div class="popup-title">New Report</div><div class="popup-row"><b>Severity:</b> ${sevLabel}</div></div>`,
    )
    .openPopup();
}
