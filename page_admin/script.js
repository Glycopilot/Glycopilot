const state = {
  apiUrl: localStorage.getItem("glycopilot_admin_api") || "http://localhost:8006/api",
  accessToken: localStorage.getItem("glycopilot_admin_access") || "",
  refreshToken: localStorage.getItem("glycopilot_admin_refresh") || "",
  user: JSON.parse(localStorage.getItem("glycopilot_admin_user") || "null"),
  activePanel: "validation",
  validatedDoctors: [],
  selectedDoctorId: null,
  selectedFile: null,
  editingMessageId: null,
};

const MESSAGES_STORAGE_KEY = "glycopilot_admin_doctor_messages";

const fallbackDoctors = [
  {
    id: "doc-yanis",
    name: "Dr Yanis Gherdane",
    email: "yanis.gherdane@epitech.eu",
    specialty: "Diabetologie",
    status: "Actif maintenant",
  },
  {
    id: "doc-martin",
    name: "Dr Clara Martin",
    email: "clara.martin@example.com",
    specialty: "Endocrinologie",
    status: "Il y a 12 min",
  },
  {
    id: "doc-benali",
    name: "Dr Mehdi Benali",
    email: "mehdi.benali@example.com",
    specialty: "Medecine generale",
    status: "Hier",
  },
];

const initialAdminMessages = {
  "doc-yanis": [
    {
      id: 1,
      author: "doctor",
      text: "Bonjour, mon compte est bien valide. Merci.",
      time: "09:24",
    },
    {
      id: 2,
      author: "admin",
      text: "Bonjour docteur, parfait. Vous pouvez maintenant utiliser votre espace medecin.",
      time: "09:26",
      edited: false,
    },
  ],
};

const nodes = {
  apiUrl: document.querySelector("#api-url"),
  loginForm: document.querySelector("#login-form"),
  loginPanel: document.querySelector("#login-panel"),
  adminTabs: document.querySelector("#admin-tabs"),
  validationTab: document.querySelector("#validation-tab"),
  messagesTab: document.querySelector("#messages-tab"),
  doctorsPanel: document.querySelector("#doctors-panel"),
  messagesPanel: document.querySelector("#messages-panel"),
  doctorList: document.querySelector("#doctor-list"),
  pendingCount: document.querySelector("#pending-count"),
  refreshBtn: document.querySelector("#refresh-btn"),
  refreshDoctorsBtn: document.querySelector("#refresh-doctors-btn"),
  doctorSearch: document.querySelector("#doctor-search"),
  messengerDoctorList: document.querySelector("#messenger-doctor-list"),
  chatAvatar: document.querySelector("#chat-avatar"),
  chatDoctorName: document.querySelector("#chat-doctor-name"),
  chatDoctorMeta: document.querySelector("#chat-doctor-meta"),
  messageThread: document.querySelector("#message-thread"),
  messageForm: document.querySelector("#message-form"),
  messageInput: document.querySelector("#message-input"),
  messageFile: document.querySelector("#message-file"),
  composerFile: document.querySelector("#composer-file"),
  composerFileName: document.querySelector("#composer-file-name"),
  removeFileBtn: document.querySelector("#remove-file-btn"),
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

function loadMessages() {
  try {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialAdminMessages;
  } catch (_error) {
    return initialAdminMessages;
  }
}

function saveMessages(messages) {
  localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
}

let adminMessages = loadMessages();

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
  nodes.adminTabs.classList.toggle("hidden", !loggedIn);
  nodes.logoutBtn.classList.toggle("hidden", !loggedIn);
  renderActivePanel();

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
    await loadValidatedDoctors();
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

function getInitials(name) {
  return String(name || "DR")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "DR";
}

function getNowLabel() {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function getDoctorMessages(doctorId) {
  return adminMessages[doctorId] || [];
}

function updateDoctorMessages(doctorId, messages) {
  adminMessages = {
    ...adminMessages,
    [doctorId]: messages,
  };
  saveMessages(adminMessages);
}

function getLastMessageLabel(doctor) {
  const messages = getDoctorMessages(doctor.id);
  if (!messages.length) return "Aucun message pour le moment";
  const last = messages[messages.length - 1];
  if (last.text) return last.text;
  if (last.attachment) return `Fichier : ${last.attachment.name}`;
  return "Message";
}

function renderActivePanel() {
  const loggedIn = Boolean(state.accessToken);
  const showValidation = loggedIn && state.activePanel === "validation";
  const showMessages = loggedIn && state.activePanel === "messages";

  nodes.doctorsPanel.classList.toggle("hidden", !showValidation);
  nodes.messagesPanel.classList.toggle("hidden", !showMessages);
  nodes.validationTab.classList.toggle("active", showValidation);
  nodes.messagesTab.classList.toggle("active", showMessages);
}

function setActivePanel(panel) {
  state.activePanel = panel;
  renderActivePanel();
  if (panel === "messages") {
    loadValidatedDoctors();
  }
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

function mapUserToDoctor(user) {
  const doctorProfile = (user.profiles || []).find(
    (profile) => profile.role_name === "DOCTOR"
  );
  const details = doctorProfile?.doctor_details || {};
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();

  return {
    id: details.doctor_id || user.id_user || user.email,
    name: fullName ? `Dr ${fullName}` : "Dr Medecin",
    email: user.email || "email non renseigne",
    specialty: details.specialty || "Specialite non renseignee",
    status: "Valide",
    verificationStatus: details.verification_status,
  };
}

function dedupeDoctors(doctors) {
  const seen = new Set();
  return doctors.filter((doctor) => {
    const key = doctor.email || doctor.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadValidatedDoctors() {
  nodes.messengerDoctorList.innerHTML = "";
  nodes.messengerDoctorList.appendChild(createEmptyState("Chargement des medecins valides..."));

  try {
    const data = await request("/users/?role=DOCTOR&is_active=true");
    const users = Array.isArray(data) ? data : data.results || [];
    const doctors = dedupeDoctors(users
      .map(mapUserToDoctor)
      .filter((doctor) => !doctor.verificationStatus || doctor.verificationStatus === "VERIFIED"));

    state.validatedDoctors = doctors.length ? doctors : fallbackDoctors;
  } catch (_error) {
    state.validatedDoctors = dedupeDoctors(fallbackDoctors);
  }

  if (!state.selectedDoctorId || !state.validatedDoctors.some((doctor) => doctor.id === state.selectedDoctorId)) {
    state.selectedDoctorId = state.validatedDoctors[0]?.id || null;
  }

  renderMessengerDoctors();
  renderChat();
}

function renderMessengerDoctors() {
  const query = nodes.doctorSearch.value.trim().toLowerCase();
  const doctors = state.validatedDoctors.filter((doctor) => {
    const haystack = `${doctor.name} ${doctor.email} ${doctor.specialty}`.toLowerCase();
    return haystack.includes(query);
  });

  nodes.messengerDoctorList.innerHTML = "";

  if (!doctors.length) {
    nodes.messengerDoctorList.appendChild(createEmptyState("Aucun medecin valide trouve."));
    return;
  }

  doctors.forEach((doctor) => {
    const button = document.createElement("button");
    button.className = `messenger-doctor ${doctor.id === state.selectedDoctorId ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <div class="messenger-avatar">${getInitials(doctor.name)}<span></span></div>
      <div class="messenger-copy">
        <div><strong></strong><time></time></div>
        <p></p>
      </div>
    `;
    button.querySelector("strong").textContent = doctor.name;
    button.querySelector("time").textContent = doctor.status || "Valide";
    button.querySelector("p").textContent = getLastMessageLabel(doctor);
    button.addEventListener("click", () => {
      state.selectedDoctorId = doctor.id;
      state.editingMessageId = null;
      renderMessengerDoctors();
      renderChat();
    });
    nodes.messengerDoctorList.appendChild(button);
  });
}

function renderAttachment(attachment) {
  if (!attachment) return "";
  const isImage = attachment.type?.startsWith("image/");
  if (isImage) {
    return `<a class="message-attachment image" href="${attachment.dataUrl}" download="${attachment.name}">
      <img src="${attachment.dataUrl}" alt="${attachment.name}" />
    </a>`;
  }

  return `<a class="message-attachment" href="${attachment.dataUrl}" download="${attachment.name}">
    <span>📄</span><strong>${attachment.name}</strong>
  </a>`;
}

function renderChat() {
  const doctor = state.validatedDoctors.find((item) => item.id === state.selectedDoctorId);
  nodes.messageThread.innerHTML = "";

  if (!doctor) {
    nodes.chatAvatar.textContent = "DR";
    nodes.chatDoctorName.textContent = "Selectionnez un medecin";
    nodes.chatDoctorMeta.textContent = "Messagerie admin-medecin";
    nodes.messageThread.appendChild(createEmptyState("Selectionnez un medecin valide pour commencer."));
    return;
  }

  nodes.chatAvatar.textContent = getInitials(doctor.name);
  nodes.chatDoctorName.textContent = doctor.name;
  nodes.chatDoctorMeta.textContent = `${doctor.specialty} · ${doctor.email}`;

  const day = document.createElement("div");
  day.className = "thread-day";
  day.textContent = "Aujourd'hui";
  nodes.messageThread.appendChild(day);

  const messages = getDoctorMessages(doctor.id);
  if (!messages.length) {
    nodes.messageThread.appendChild(createEmptyState("Aucun message. Envoyez le premier message."));
    return;
  }

  messages.forEach((message) => {
    const row = document.createElement("div");
    row.className = `message-row ${message.author === "admin" ? "message-row-me" : ""}`;

    if (message.author === "doctor") {
      const avatar = document.createElement("div");
      avatar.className = "message-mini-avatar";
      avatar.textContent = getInitials(doctor.name);
      row.appendChild(avatar);
    }

    if (message.author === "admin") {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      actions.innerHTML = `
        <button type="button" data-action="edit" aria-label="Modifier">✎</button>
        <button type="button" data-action="delete" aria-label="Supprimer">🗑</button>
      `;
      actions.querySelector('[data-action="edit"]').addEventListener("click", () => {
        state.editingMessageId = message.id;
        renderChat();
      });
      actions.querySelector('[data-action="delete"]').addEventListener("click", () => deleteMessage(message.id));
      row.appendChild(actions);
    }

    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${message.author === "admin" ? "message-me" : "message-them"}`;

    if (state.editingMessageId === message.id) {
      bubble.innerHTML = `
        <form class="message-edit-form">
          <input value="" />
          <div>
            <button type="button" data-action="cancel">Annuler</button>
            <button type="submit">OK</button>
          </div>
        </form>
      `;
      const input = bubble.querySelector("input");
      input.value = message.text || "";
      bubble.querySelector("form").addEventListener("submit", (event) => {
        event.preventDefault();
        saveEditedMessage(message.id, input.value);
      });
      bubble.querySelector('[data-action="cancel"]').addEventListener("click", () => {
        state.editingMessageId = null;
        renderChat();
      });
    } else {
      bubble.innerHTML = `
        ${message.text ? `<p></p>` : ""}
        ${renderAttachment(message.attachment)}
        <span>${message.time}${message.edited ? " · modifie" : ""}${message.author === "admin" ? " ✓✓" : ""}</span>
      `;
      const paragraph = bubble.querySelector("p");
      if (paragraph) paragraph.textContent = message.text;
    }

    row.appendChild(bubble);
    nodes.messageThread.appendChild(row);
  });

  nodes.messageThread.scrollTop = nodes.messageThread.scrollHeight;
}

function saveEditedMessage(messageId, text) {
  const doctorId = state.selectedDoctorId;
  const cleaned = text.trim();
  if (!cleaned) return;

  const messages = getDoctorMessages(doctorId).map((message) =>
    message.id === messageId ? { ...message, text: cleaned, edited: true } : message
  );
  updateDoctorMessages(doctorId, messages);
  state.editingMessageId = null;
  renderMessengerDoctors();
  renderChat();
}

function deleteMessage(messageId) {
  if (!window.confirm("Supprimer ce message ?")) return;
  const doctorId = state.selectedDoctorId;
  const messages = getDoctorMessages(doctorId).filter((message) => message.id !== messageId);
  updateDoctorMessages(doctorId, messages);
  state.editingMessageId = null;
  renderMessengerDoctors();
  renderChat();
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    showToast("Fichier trop lourd. Taille maximale : 3 Mo.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.selectedFile = {
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      dataUrl: reader.result,
    };
    renderSelectedFile();
  };
  reader.readAsDataURL(file);
}

function renderSelectedFile() {
  const hasFile = Boolean(state.selectedFile);
  nodes.composerFile.classList.toggle("hidden", !hasFile);
  nodes.composerFileName.textContent = hasFile ? state.selectedFile.name : "";
}

function sendMessage(event) {
  event.preventDefault();
  const doctorId = state.selectedDoctorId;
  if (!doctorId) return;

  const text = nodes.messageInput.value.trim();
  if (!text && !state.selectedFile) return;

  const messages = [
    ...getDoctorMessages(doctorId),
    {
      id: Date.now(),
      author: "admin",
      text,
      attachment: state.selectedFile,
      time: getNowLabel(),
      edited: false,
    },
  ];

  updateDoctorMessages(doctorId, messages);
  nodes.messageInput.value = "";
  state.selectedFile = null;
  renderSelectedFile();
  renderMessengerDoctors();
  renderChat();
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
nodes.refreshDoctorsBtn.addEventListener("click", loadValidatedDoctors);
nodes.validationTab.addEventListener("click", () => setActivePanel("validation"));
nodes.messagesTab.addEventListener("click", () => setActivePanel("messages"));
nodes.doctorSearch.addEventListener("input", renderMessengerDoctors);
nodes.messageForm.addEventListener("submit", sendMessage);
nodes.messageFile.addEventListener("change", handleFileChange);
nodes.removeFileBtn.addEventListener("click", () => {
  state.selectedFile = null;
  renderSelectedFile();
});
nodes.logoutBtn.addEventListener("click", () => {
  clearSession();
  renderSession();
});

renderSession();
if (state.accessToken) {
  loadPendingDoctors();
  loadValidatedDoctors();
}
