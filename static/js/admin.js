let adminMap = null;
let adminMapInited = false;

async function adminLogin() {
  const pw = document.getElementById("admin-pw").value;
  const msg = document.getElementById("admin-msg");
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: pw }),
  });
  const data = await res.json();
  if (data.success) {
    showPage("admin");
  } else {
    msg.textContent = "Incorrect password.";
    msg.className = "auth-msg error";
  }
}

function initAdminMap() {
  if (adminMapInited) return;
  adminMapInited = true;
  adminMap = L.map("admin-map", {
    zoomControl: true,
    attributionControl: false,
  }).setView([23.6250693, 83.6364204], 14);
  setMapTiles(adminMap);
  loadAdminData();
}

async function loadAdminData() {
  const res = await fetch("/api/potholes");
  const data = await res.json();

  // Stats
  document.getElementById("a-total").textContent = data.length;
  document.getElementById("a-severe").textContent = data.filter(
    (d) => d.severity === "severe",
  ).length;
  document.getElementById("a-moderate").textContent = data.filter(
    (d) => d.severity === "moderate",
  ).length;
  document.getElementById("a-resolved").textContent = data.filter(
    (d) => d.severity === "resolved",
  ).length;

  // PDF count
  const rRes = await fetch("/api/admin/reports");
  if (rRes.ok) {
    const reports = await rRes.json();
    document.getElementById("a-reports").textContent = reports.length;
    renderReports(reports);
  }

  const detList = document.getElementById("panel-detections");
  const cmpList = document.getElementById("panel-complaints");
  detList.innerHTML = "";
  cmpList.innerHTML = "";

  const heatData = [];
  const sorted = [...data].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
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
    }).addTo(adminMap);
    marker.bindPopup(`<div>
      <div class="popup-title">#${d.id}</div>
      <div class="popup-row"><b>Severity:</b> ${sevLabel}</div>
      <div class="popup-row"><b>Confidence:</b> ${(d.confidence * 100).toFixed(0)}%</div>
      <div class="popup-row"><b>Source:</b> ${d.source}</div>
      <div class="popup-row"><b>Time:</b> ${d.timestamp}</div>
    </div>`);

    heatData.push([
      d.lat,
      d.lng,
      d.severity === "severe" ? 1.0 : d.severity === "moderate" ? 0.55 : 0.1,
    ]);

    // Detection item
    const item = document.createElement("div");
    item.className = `det-item sev-${d.severity}`;
    item.innerHTML = `
      <div class="det-item-top">
        <span class="det-item-id">#${d.id} · ${d.source}</span>
        <span class="sev-badge sev-${d.severity}">${sevLabel}</span>
      </div>
      <div class="det-meta">${d.lat}, ${d.lng}</div>
      <div class="det-meta">${d.timestamp} · ${(d.confidence * 100).toFixed(0)}% conf</div>
      <div style="display:flex;gap:4px;margin-top:6px">
${
  d.severity === "resolved"
    ? `<span style="font-size:10px;color:var(--green);padding:3px 0;display:inline-block">✓ Cleared by field verification</span>`
    : `<span style="font-size:10px;color:var(--muted);padding:3px 0;display:inline-block">Awaiting field clearance photo</span>`
}
        ${
          !d.report_generated
            ? `<button class="report-btn" onclick="manualReport('${d.id}')">📄 Report</button>`
            : `<span style="font-size:10px;color:var(--green);padding:3px 6px">✓ Reported</span>`
        }
      </div>
    `;
    item.querySelector(".det-item-top").onclick = () => {
      adminMap.flyTo([d.lat, d.lng], 17, { duration: 1 });
      marker.openPopup();
    };
    detList.appendChild(item);

    // Complaint card
    if (d.source === "citizen") {
      const card = document.createElement("div");
      card.className = "complaint-card";
      card.innerHTML = d.result_url
        ? `<img class="complaint-img" src="${d.result_url}" onerror="this.style.display='none'">`
        : `<div class="complaint-no-img">No image</div>`;
      card.innerHTML += `
        <div class="complaint-body">
          <div class="complaint-coords">${d.lat}, ${d.lng}</div>
          <div class="complaint-time">${d.timestamp}</div>
          <span class="sev-badge sev-${d.severity}" style="margin-top:5px;display:inline-block">${sevLabel}</span>
        </div>`;
      cmpList.appendChild(card);
    }
  });

  // Heatmap
  if (window._adminHeat) adminMap.removeLayer(window._adminHeat);
  if (heatData.length) {
    window._adminHeat = L.heatLayer(heatData, {
      radius: 36,
      blur: 26,
      maxZoom: 17,
      gradient: heatGradient(),
    }).addTo(adminMap);
  }
}

function renderReports(reports) {
  const list = document.getElementById("panel-reports");
  list.innerHTML = "";
  if (!reports.length) {
    list.innerHTML = `<div style="padding:20px;text-align:center;font-size:12px;color:var(--muted)">No reports generated yet</div>`;
    return;
  }
  reports.forEach((r) => {
    const card = document.createElement("div");
    card.className = "pdf-card";
    card.innerHTML = `
      <div>
        <div class="pdf-name">${r.name}</div>
        <div class="pdf-size">${r.size_kb} KB</div>
      </div>
      <a class="pdf-dl" href="${r.url}" download>⬇ Download</a>
    `;
    list.appendChild(card);
  });
}

async function resolveDetection(uid) {
  await fetch(`/api/admin/resolve/${uid}`, { method: "POST" });
  loadAdminData();
}

async function manualReport(uid) {
  const res = await fetch(`/api/admin/report/generate/${uid}`, {
    method: "POST",
  });
  const data = await res.json();
  if (data.pdf_url) {
    loadAdminData();
    alert("Report generated. Download from the PDF Reports tab.");
  }
}

function switchPanel(name, el) {
  document
    .querySelectorAll(".ptab")
    .forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".panel-content").forEach((t) => {
    t.classList.remove("active");
    t.style.display = "none";
  });
  el.classList.add("active");
  const panel = document.getElementById("panel-" + name);
  panel.classList.add("active");
  panel.style.display = "flex";
}
