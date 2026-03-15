// ============================================================
// DEMO PIN MODE — SMS gateway ready, using demo OTP for presentation
// To re-enable real Firebase Phone Auth, uncomment the block below
// and comment out the DEMO MODE block
// ============================================================

// ── DEMO MODE CONFIG ──
const DEMO_PIN      = "2024";   // OTP accepted for any number
const DEMO_DELAY_MS = 1200;     // simulated SMS delivery delay

// ── Demo session state ──
let _demoPhone     = null;
let _demoVerified  = false;
window._authToken  = null;      // stays null in demo mode — backend skips verify

// ── sendOTP ──
function sendOTP() {
  const phone = document.getElementById("phone-input").value.trim();
  if (phone.length !== 10 || !/^\d+$/.test(phone)) {
    setAuthMsg("Please enter a valid 10-digit mobile number.", "error");
    return;
  }
  _demoPhone = phone;
  setAuthMsg("Sending OTP...", "");

  setTimeout(() => {
    document.getElementById("otp-step-1").style.display  = "none";
    document.getElementById("otp-step-2").style.display  = "block";
    document.getElementById("phone-display").textContent = phone;
    setAuthMsg("OTP sent to +91 " + phone, "success");
  }, DEMO_DELAY_MS);
}

// ── verifyOTP ──
function verifyOTP() {
  const code = document.getElementById("otp-input").value.trim();
  if (!code) {
    setAuthMsg("Please enter the OTP.", "error");
    return;
  }
  setAuthMsg("Verifying...", "");

  setTimeout(() => {
    if (code === DEMO_PIN) {
      _demoVerified     = true;
      window._authToken = "demo-token-" + _demoPhone + "-" + Date.now();
      setAuthMsg("Verified! Redirecting...", "success");
      setTimeout(() => {
        showPage("report");
        document.getElementById("btn-report").style.display = "block";
      }, 700);
    } else {
      setAuthMsg("Incorrect OTP. Hint: use " + DEMO_PIN, "error");
    }
  }, 600);
}

// ── resetOTP ──
function resetOTP() {
  _demoPhone    = null;
  _demoVerified = false;
  document.getElementById("otp-step-1").style.display = "block";
  document.getElementById("otp-step-2").style.display = "none";
  document.getElementById("otp-input").value          = "";
  setAuthMsg("", "");
}

// ── setAuthMsg ──
function setAuthMsg(msg, type) {
  const el       = document.getElementById("auth-msg");
  el.textContent = msg;
  el.className   = "auth-msg " + type;
}

// ── getToken — returns demo token, backend accepts it ──
async function getToken() {
  return window._authToken || null;
}

// ── requireAuth ──
function requireAuth(cb) {
  if (_demoVerified) {
    cb();
  } else {
    showPage("login");
  }
}


// ============================================================
// REAL FIREBASE PHONE AUTH — uncomment when billing is enabled
// ============================================================
/*
const firebaseConfig = {
  apiKey:            "AIzaSyD8guKoNIQrjCT413b4HPC5e4VVf7yt9AU",
  authDomain:        "craternet-e79e3.firebaseapp.com",
  projectId:         "craternet-e79e3",
  storageBucket:     "craternet-e79e3.firebasestorage.app",
  messagingSenderId: "765880653570",
  appId:             "1:765880653570:web:708a60d6de19f0214fd41b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
auth.useDeviceLanguage();

let confirmationResult = null;

function setupRecaptcha() {
  if (window.recaptchaVerifier) return;
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
    "recaptcha-container",
    {
      size: "normal",
      callback: () => {
        document.getElementById("recaptcha-container").style.display = "none";
      },
      "expired-callback": () => {
        window.recaptchaVerifier = null;
        setupRecaptcha();
      }
    }
  );
  window.recaptchaVerifier.render();
}

async function sendOTP() {
  setupRecaptcha();
  const phone = document.getElementById("phone-input").value.trim();
  if (phone.length !== 10 || !/^\d+$/.test(phone)) {
    setAuthMsg("Please enter a valid 10-digit mobile number.", "error");
    return;
  }
  const fullPhone = "+91" + phone;
  try {
    setAuthMsg("Sending OTP...", "");
    confirmationResult = await auth.signInWithPhoneNumber(fullPhone, window.recaptchaVerifier);
    document.getElementById("otp-step-1").style.display  = "none";
    document.getElementById("otp-step-2").style.display  = "block";
    document.getElementById("phone-display").textContent = phone;
    setAuthMsg("OTP sent successfully.", "success");
  } catch (err) {
    setAuthMsg("Failed: " + err.message, "error");
    if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    console.error(err);
  }
}

async function verifyOTP() {
  const code = document.getElementById("otp-input").value.trim();
  if (!code || code.length < 6) { setAuthMsg("Enter the 6-digit OTP.", "error"); return; }
  try {
    setAuthMsg("Verifying...", "");
    const result      = await confirmationResult.confirm(code);
    window._authToken = await result.user.getIdToken();
    setAuthMsg("Verified! Redirecting...", "success");
    setTimeout(() => {
      showPage("report");
      document.getElementById("btn-report").style.display = "block";
    }, 800);
  } catch (err) {
    setAuthMsg("Invalid OTP. Please try again.", "error");
    console.error(err);
  }
}

function resetOTP() {
  document.getElementById("otp-step-1").style.display = "block";
  document.getElementById("otp-step-2").style.display = "none";
  document.getElementById("otp-input").value          = "";
  setAuthMsg("", "");
  if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
}

function setAuthMsg(msg, type) {
  const el = document.getElementById("auth-msg"); el.textContent = msg; el.className = "auth-msg " + type;
}

async function getToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

function requireAuth(cb) {
  if (auth.currentUser) { cb(); } else { showPage("login"); }
}
*/