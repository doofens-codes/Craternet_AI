let currentLat = null;
let currentLng = null;
let selectedFile = null;
let gpsReady = false;

function initUploadPage() {
  selectedFile = null;
  gpsReady = false;
  currentLat = null;
  currentLng = null;

  document.getElementById("preview-img").style.display = "none";
  document.getElementById("result-box").style.display = "none";
  document.getElementById("submit-btn").disabled = true;
  document.getElementById("file-input").value = "";
  document.getElementById("gps-bar").className = "gps-bar";
  document.getElementById("gps-text").textContent = "Acquiring GPS location...";
  document.getElementById("gps-indicator").textContent = "⊙";

  acquireGPS();
}

function acquireGPS() {
  if (!navigator.geolocation) {
    setGPSError("Geolocation not supported on this device.");
    return;
  }
  // Try high accuracy first, fall back to low accuracy if it fails
  navigator.geolocation.getCurrentPosition(
    onGPSSuccess,
    (err) => {
      // High accuracy failed, try low accuracy
      navigator.geolocation.getCurrentPosition(
        onGPSSuccess,
        (err) => {
          setGPSError("Location unavailable. Check browser permissions.");
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
  );
}

function onGPSSuccess(pos) {
  currentLat = pos.coords.latitude;
  currentLng = pos.coords.longitude;
  gpsReady = true;
  document.getElementById("gps-bar").className = "gps-bar ok";
  document.getElementById("gps-indicator").textContent = "✓";
  document.getElementById("gps-text").textContent =
    `GPS locked: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`;
  checkSubmitReady();
}

function setGPSError(msg) {
  document.getElementById("gps-bar").className = "gps-bar error";
  document.getElementById("gps-indicator").textContent = "✗";
  document.getElementById("gps-text").textContent = msg;
}

function checkSubmitReady() {
  document.getElementById("submit-btn").disabled = !(selectedFile && gpsReady);
}

// File input
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const previewImg = document.getElementById("preview-img");
  const dropZone = document.getElementById("drop-zone");

  if (!fileInput) return;

  fileInput.addEventListener("change", function () {
    if (this.files[0]) {
      selectedFile = this.files[0];
      previewImg.src = URL.createObjectURL(selectedFile);
      previewImg.style.display = "block";
      checkSubmitReady();
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () =>
    dropZone.classList.remove("drag-over"),
  );
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const f = e.dataTransfer.files[0];
    if (f) {
      selectedFile = f;
      previewImg.src = URL.createObjectURL(f);
      previewImg.style.display = "block";
      checkSubmitReady();
    }
  });
});

async function submitReport() {
  if (!selectedFile || !gpsReady) return;

  const btn = document.getElementById("submit-btn");
  const spinner = document.getElementById("spinner");
  const btnText = document.getElementById("btn-text");

  btn.disabled = true;
  spinner.style.display = "block";
  btnText.textContent = "Analysing...";
  document.getElementById("result-box").style.display = "none";

  const token = await getToken();
  if (!token) {
    showPage("login");
    return;
  }

  const form = new FormData();
  form.append("image", selectedFile);
  form.append("lat", currentLat);
  form.append("lng", currentLng);
  form.append("source", "citizen");

  try {
    const res = await fetch("/api/detect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();

    const resultBox = document.getElementById("result-box");
    const banner = document.getElementById("result-banner");
    const annotated = document.getElementById("result-annotated");
    const pdfNotice = document.getElementById("pdf-notice");
    const cta = document.getElementById("complaint-link");

    resultBox.style.display = "block";

    if (res.status === 422 && data.error === "not_on_road") {
      banner.className = "result-banner result-off-road";
      banner.textContent = `⚠ ${data.message}`;
      annotated.style.display = "none";
      pdfNotice.style.display = "none";
      cta.style.display = "none";
      selectedFile = null;
      document.getElementById("preview-img").style.display = "none";
      document.getElementById("file-input").value = "";
    } else if (data.pothole_detected) {
      const sevLabel = data.severity === "severe" ? "Severe" : "Moderate";
      banner.className = "result-banner result-detected";
      banner.textContent = `✓ Pothole Detected — ${sevLabel} · ${(data.confidence * 100).toFixed(0)}% confidence`;
      annotated.src = data.result_image;
      annotated.style.display = "block";
      pdfNotice.style.display = data.pdf_generated ? "block" : "none";
      cta.style.display = "block";
      addMarkerToMap(currentLat, currentLng, data.severity);
    } else if (data.auto_resolved) {
      banner.className = "result-banner result-detected";
      banner.textContent = `✓ ${data.message}`;
      annotated.style.display = "none";
      pdfNotice.style.display = "none";
      cta.style.display = "none";
    } else {
      banner.className = "result-banner result-none";
      banner.textContent = `✗ ${data.message || "No pothole detected. Please upload a clearer photo."}`;
      annotated.style.display = "none";
      pdfNotice.style.display = "none";
      cta.style.display = "none";
      selectedFile = null;
      document.getElementById("preview-img").style.display = "none";
      document.getElementById("file-input").value = "";
    }
  } catch (e) {
    alert("Connection error. Please check your network and try again.");
  }

  spinner.style.display = "none";
  btnText.textContent = "Analyse & Submit";
  btn.disabled = false;
}
