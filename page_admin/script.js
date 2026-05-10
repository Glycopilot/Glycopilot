const state = {
  apiUrl: localStorage.getItem("glycopilot_admin_api") || "http://localhost:8006/api",
  accessToken: localStorage.getItem("glycopilot_admin_access") || "",
  refreshToken: localStorage.getItem("glycopilot_admin_refresh") || "",
  user: JSON.parse(localStorage.getItem("glycopilot_admin_user") || "null"),
};

const nodes = {
  apiUrl: document.querySelector("#api-url"),
  loginForm: document.querySelector("#login-form"),
  loginPanel: document.querySelector("#login-panel"),
  doctorsPanel: document.querySelector("#doctors-panel"),
  doctorList: document.querySelector("#doctor-list"),
  pendingCount: document.querySelector("#pending-count"),
  refreshBtn: document.querySelector("#refresh-btn"),
  logoutBtn: document.querySelector("#logout-btn"),
  toast: document.querySelector("#toast"),
  statusDot: document.querySelector("#api-status-dot"),
  statusText: document.querySelector("#api-status-text"),
  template: document.querySelector("#doctor-card-template"),
};

nodes.apiUrl.value = state.apiUrl;

function normalizeApiUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function setApiStatus(online, message) {
  nodes.statusDot.classList.toggle("online", online);
  nodes.statusDot.classList.toggle("offline", !online);
  nodes.statusText.textContent = message;
}

function showToast(message, type = "success") {
  nodes.toast.textContent = message;
  nodes.toast.className = `toast ${type}`;
  window.setTimeout(() => {
    nodes.toast.classList.add("hidden");
  }, 3600);
}

function getErrorMessage(error, fallback) {
  if (!error.response) return "Impossible de joindre l'API.";
  const data = error.response;
  if (typeof data === "string") return data;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;
  if (Array.isArray(data?.non_field_errors)) return data.non_field_errors[0];
  return fallback;
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.accessToken) {
    headers.Authorization = `Bearer ${state.accessToken}`;
  }

  const response = await fetch(`${state.apiUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.detail || data?.error || response.statusText);
    error.response = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

function isAdminUser(user) {
  const profiles = user?.identity?.profiles || user?.profiles || [];
  return profiles.some((profile) =>
    ["ADMIN", "SUPERADMIN"].includes(profile.role_name)
  );
}

function setSession({ access, refresh, user }) {
  state.accessToken = access;
  state.refreshToken = refresh;
  state.user = user;
  localStorage.setItem("glycopilot_admin_api", state.apiUrl);
  localStorage.setItem("glycopilot_admin_access", access);
  localStorage.setItem("glycopilot_admin_refresh", refresh);
  localStorage.setItem("glycopilot_admin_user", JSON.stringify(user));
}

function clearSession() {
  state.accessToken = "";
  state.refreshToken = "";
  state.user = null;
  localStorage.removeItem("glycopilot_admin_access");
  localStorage.removeItem("glycopilot_admin_refresh");
  localStorage.removeItem("glycopilot_admin_user");
}

function renderSession() {
  const loggedIn = Boolean(state.accessToken);
  nodes.loginPanel.classList.toggle("hidden", loggedIn);
  nodes.doctorsPanel.classList.toggle("hidden", !loggedIn);
  nodes.logoutBtn.classList.toggle("hidden", !loggedIn);

  if (loggedIn) {
    setApiStatus(true, `Connecte a ${state.apiUrl}`);
  } else {
    setApiStatus(false, "Non connecte");
  }
}

async function login(event) {
  event.preventDefault();
  state.apiUrl = normalizeApiUrl(nodes.apiUrl.value);

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  try {
    const data = await request("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!isAdminUser(data.user)) {
      clearSession();
      showToast("Ce compte n'est pas admin ou superadmin.", "error");
      return;
    }

    setSession(data);
    renderSession();
    showToast("Connexion admin reussie.");
    await loadPendingDoctors();
  } catch (error) {
    showToast(getErrorMessage(error, "Connexion impossible."), "error");
  }
}

function getDoctorName(doctor) {
  const user = doctor.user_details || {};
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Medecin";
}

function createEmptyState(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function renderDoctors(doctors) {
  nodes.pendingCount.textContent = doctors.length;
  nodes.doctorList.innerHTML = "";

  if (doctors.length === 0) {
    nodes.doctorList.appendChild(createEmptyState("Aucune demande en attente."));
    return;
  }

  doctors.forEach((doctor) => {
    const card = nodes.template.content.firstElementChild.cloneNode(true);
    const user = doctor.user_details || {};

    card.querySelector('[data-field="name"]').textContent = getDoctorName(doctor);
    card.querySelector('[data-field="status"]').textContent =
      doctor.verification_status || "PENDING";
    card.querySelector('[data-field="email"]').textContent =
      user.email || "Non renseigne";
    card.querySelector('[data-field="license"]').textContent =
      doctor.license_number || "Non renseignee";
    card.querySelector('[data-field="specialty"]').textContent =
      doctor.specialty || "Non renseignee";
    card.querySelector('[data-field="address"]').textContent =
      doctor.medical_center_address || "Non renseignee";

    card.querySelector(".accept-btn").addEventListener("click", () => {
      acceptDoctor(doctor);
    });
    card.querySelector(".decline-btn").addEventListener("click", () => {
      declineDoctor(doctor);
    });

    nodes.doctorList.appendChild(card);
  });
}

async function loadPendingDoctors() {
  nodes.doctorList.innerHTML = "";
  nodes.doctorList.appendChild(createEmptyState("Chargement des demandes..."));

  try {
    const data = await request("/doctors/verification/");
    renderDoctors(data.results || []);
  } catch (error) {
    nodes.doctorList.innerHTML = "";
    nodes.doctorList.appendChild(
      createEmptyState(getErrorMessage(error, "Chargement impossible."))
    );
    showToast(getErrorMessage(error, "Chargement impossible."), "error");
  }
}

async function acceptDoctor(doctor) {
  try {
    await request(`/doctors/verification/${doctor.doctor_id}/accept/`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    showToast(`${getDoctorName(doctor)} est valide.`);
    await loadPendingDoctors();
  } catch (error) {
    showToast(getErrorMessage(error, "Validation impossible."), "error");
  }
}

async function declineDoctor(doctor) {
  const reason = window.prompt(
    `Motif de refus pour ${getDoctorName(doctor)}`,
    "Informations professionnelles insuffisantes."
  );

  if (reason === null) return;

  try {
    await request(`/doctors/verification/${doctor.doctor_id}/decline/`, {
      method: "POST",
      body: JSON.stringify({ rejection_reason: reason }),
    });
    showToast(`${getDoctorName(doctor)} est refuse.`);
    await loadPendingDoctors();
  } catch (error) {
    showToast(getErrorMessage(error, "Refus impossible."), "error");
  }
}

nodes.loginForm.addEventListener("submit", login);
nodes.refreshBtn.addEventListener("click", loadPendingDoctors);
nodes.logoutBtn.addEventListener("click", () => {
  clearSession();
  renderSession();
});

renderSession();
if (state.accessToken) {
  loadPendingDoctors();
}
