// ── Page router ──
const pages = ["landing", "map", "login", "report", "admin-login", "admin"];

function showPage(name) {
  pages.forEach((p) => {
    const el = document.getElementById("page-" + p);
    if (el) el.style.display = "none";
  });

  const target = document.getElementById("page-" + name);
  const flexPages = ["login", "report", "admin-login", "landing"];
  if (target)
    target.style.display = flexPages.includes(name) ? "flex" : "block";
  // Nav button active states
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  const activeBtn = document.getElementById("btn-" + name);
  if (activeBtn) activeBtn.classList.add("active");

  // Init maps lazily
  if (name === "map") {
    initMainMap();
    document.getElementById("header-stats").style.display = "flex";
  }
  if (name === "landing") {
    initLandingMap();
    document.getElementById("header-stats").style.display = "none";
  }
  if (name === "report") {
    initUploadPage();
  }
  if (name === "admin") {
    initAdminMap();
  }

  // Map pages need full height — remove padding from page
  if (name === "map" || name === "admin") {
    target.style.paddingTop = "52px";
    target.style.height = "100vh";
    target.style.overflow = "hidden";
  }
}

// ── Theme ──
function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "light" : "dark",
  );
  document.getElementById("theme-btn").textContent = isDark
    ? "🌙 Dark"
    : "☀️ Light";
  refreshMapTiles();
}

// ── Boot ──
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("app-header").style.display = "flex";

  // Load landing stats immediately
  fetch("/api/potholes")
    .then((r) => r.json())
    .then((data) => {
      document.getElementById("h-total").textContent = data.length;
      document.getElementById("h-severe").textContent = data.filter(
        (d) => d.severity === "severe",
      ).length;
    });

  showPage("landing");
});
