import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  FileText,
  HeartPulse,
  Home,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';

const glucoseReadings = [
  { time: '06:30', value: 0.82, status: 'stable' },
  { time: '08:00', value: 1.06, status: 'stable' },
  { time: '10:30', value: 1.22, status: 'stable' },
  { time: '12:45', value: 1.74, status: 'warning' },
  { time: '14:10', value: 1.58, status: 'warning' },
  { time: '16:00', value: 1.14, status: 'stable' },
  { time: '18:30', value: 0.92, status: 'stable' },
];

const patient = {
  firstName: 'Yanis',
  lastName: 'Gherdane',
  age: 22,
  relation: 'Frère',
  diabetesType: 'Diabète type 1',
  phone: '+33 6 12 34 56 78',
  lastMeasureAt: '18:30',
  currentGlucose: 0.92,
  targetRange: '0.70 - 1.80 g/L',
  nextMedication: 'Insuline lente à 21:00',
};

const STORAGE_KEY = 'glycopilot_relative_messages';

const initialMessages = [
  {
    id: 1,
    author: 'patient',
    text: 'Je viens de faire ma mesure, je suis à 0.92 g/L.',
    time: '18:31',
  },
  {
    id: 2,
    author: 'relative',
    text: 'Parfait, merci. Tu as prévu de manger bientôt ?',
    time: '18:32',
    edited: false,
  },
  {
    id: 3,
    author: 'patient',
    text: 'Oui, dans 30 minutes. Je note le repas après.',
    time: '18:34',
  },
];

function loadMessages() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialMessages;
  } catch (_error) {
    return initialMessages;
  }
}

function saveMessages(messages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function initials(firstName, lastName) {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
}

function getNowLabel() {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function getGlycemiaStatus(value) {
  if (value < 0.7) return { label: 'Hypoglycémie', className: 'status-low', tone: 'danger' };
  if (value > 1.8) return { label: 'Hyperglycémie', className: 'status-high', tone: 'danger' };
  if (value > 1.5) return { label: 'À surveiller', className: 'status-watch', tone: 'warning' };
  return { label: 'Dans la cible', className: 'status-good', tone: 'success' };
}

function Sidebar({ currentView, setCurrentView }) {
  const links = [
    { id: 'dashboard', label: 'Surveillance', icon: <Home size={18} /> },
    { id: 'messages', label: 'Messagerie', icon: <MessageCircle size={18} /> },
    { id: 'profile', label: 'Profil proche', icon: <UserRound size={18} /> },
  ];

  return (
    <aside className="relative-sidebar">
      <div className="brand-block">
        <div className="brand-mark">G</div>
        <div>
          <strong>GlycoPilot</strong>
          <span>Proche</span>
        </div>
      </div>

      <nav className="relative-nav">
        {links.map((link) => (
          <button
            key={link.id}
            className={`nav-link ${currentView === link.id ? 'active' : ''}`}
            onClick={() => setCurrentView(link.id)}
            type="button"
          >
            {link.icon}
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <div className="relative-footer">
        <div className="relative-avatar">YG</div>
        <div>
          <strong>Yanis Proche</strong>
          <span>Famille autorisée</span>
        </div>
      </div>
    </aside>
  );
}

function Sparkline() {
  const width = 640;
  const height = 180;
  const pad = 18;
  const values = glucoseReadings.map((reading) => reading.value);
  const min = 0.5;
  const max = 2.1;
  const xStep = (width - pad * 2) / (values.length - 1);
  const toX = (index) => pad + index * xStep;
  const toY = (value) => height - pad - ((value - min) / (max - min)) * (height - pad * 2);
  const points = values.map((value, index) => `${toX(index)},${toY(value)}`).join(' ');
  const area = `${toX(0)},${height - pad} ${values.map((value, index) => `${toX(index)},${toY(value)}`).join(' ')} ${toX(values.length - 1)},${height - pad}`;

  return (
    <div className="chart-card">
      <div className="section-heading">
        <div>
          <p>Courbe du jour</p>
          <h2>Évolution glycémique</h2>
        </div>
        <span className="range-chip">Cible {patient.targetRange}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="glycemia-chart">
        <defs>
          <linearGradient id="glucoseArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={pad} y={toY(1.8)} width={width - pad * 2} height={toY(0.7) - toY(1.8)} rx="8" fill="#16A34A" opacity="0.09" />
        <polygon points={area} fill="url(#glucoseArea)" />
        <polyline points={points} fill="none" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {glucoseReadings.map((reading, index) => {
          const status = getGlycemiaStatus(reading.value);
          const fill = status.tone === 'danger' ? '#DC2626' : status.tone === 'warning' ? '#F97316' : '#A78BFA';
          return (
            <g key={reading.time}>
              <circle cx={toX(index)} cy={toY(reading.value)} r="6" fill={fill} stroke="#fff" strokeWidth="3" />
              <text x={toX(index)} y={height - 2} textAnchor="middle" className="chart-label">{reading.time}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DashboardView({ setCurrentView }) {
  const status = getGlycemiaStatus(patient.currentGlucose);
  const highReadings = glucoseReadings.filter((reading) => reading.value > 1.5).length;

  return (
    <main className="relative-main">
      <header className="page-header">
        <div>
          <p className="eyebrow">Espace proche</p>
          <h1>Surveillance de {patient.firstName}</h1>
          <span>{patient.relation} · {patient.diabetesType} · Dernière mesure à {patient.lastMeasureAt}</span>
        </div>
        <button className="primary-action" onClick={() => setCurrentView('messages')} type="button">
          <MessageCircle size={18} />
          Contacter {patient.firstName}
        </button>
      </header>

      <section className="kpi-grid">
        <article className="kpi-card">
          <div className="kpi-icon blue"><Activity size={22} /></div>
          <div>
            <strong>{patient.currentGlucose.toFixed(2)}</strong>
            <span>g/L maintenant</span>
          </div>
          <em className={`status-pill ${status.className}`}>{status.label}</em>
        </article>
        <article className="kpi-card">
          <div className="kpi-icon green"><ShieldCheck size={22} /></div>
          <div>
            <strong>86%</strong>
            <span>temps dans la cible</span>
          </div>
        </article>
        <article className="kpi-card">
          <div className="kpi-icon orange"><AlertTriangle size={22} /></div>
          <div>
            <strong>{highReadings}</strong>
            <span>points à surveiller</span>
          </div>
        </article>
        <article className="kpi-card">
          <div className="kpi-icon teal"><Bell size={22} /></div>
          <div>
            <strong>21:00</strong>
            <span>prochain rappel</span>
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <Sparkline />

        <aside className="patient-panel">
          <div className="patient-card-top">
            <div className="patient-avatar">{initials(patient.firstName, patient.lastName)}</div>
            <div>
              <h2>{patient.firstName} {patient.lastName}</h2>
              <p>{patient.age} ans · {patient.relation}</p>
            </div>
          </div>
          <div className="patient-info-list">
            <div>
              <span>Tendance</span>
              <strong>Stable après repas</strong>
            </div>
            <div>
              <span>Traitement</span>
              <strong>{patient.nextMedication}</strong>
            </div>
            <div>
              <span>Téléphone patient</span>
              <strong>{patient.phone}</strong>
            </div>
          </div>
          <button className="secondary-action" type="button">
            <Phone size={17} />
            Appeler le patient
          </button>
        </aside>
      </section>

      <section className="events-section">
        <div className="section-heading">
          <div>
            <p>Journal récent</p>
            <h2>Événements importants</h2>
          </div>
        </div>
        <div className="event-list">
          <article>
            <span className="event-dot green" />
            <div>
              <strong>Glycémie revenue dans la cible</strong>
              <p>0.92 g/L à 18:30, aucune action urgente requise.</p>
            </div>
          </article>
          <article>
            <span className="event-dot orange" />
            <div>
              <strong>Pic post-repas à surveiller</strong>
              <p>1.74 g/L à 12:45, suivi recommandé après déjeuner.</p>
            </div>
          </article>
          <article>
            <span className="event-dot blue" />
            <div>
              <strong>Message du patient</strong>
              <p>{patient.firstName} a confirmé son prochain repas.</p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function MessagesView() {
  const [messages, setMessages] = useState(loadMessages);
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [query, setQuery] = useState('');

  const visibleMessages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return messages;
    return messages.filter((message) =>
      `${message.text || ''} ${message.attachment?.name || ''}`.toLowerCase().includes(normalized)
    );
  }, [messages, query]);

  const persist = (nextMessages) => {
    setMessages(nextMessages);
    saveMessages(nextMessages);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      window.alert('Le fichier est trop lourd. Taille maximale : 3 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !selectedFile) return;
    persist([
      ...messages,
      {
        id: Date.now(),
        author: 'relative',
        text,
        attachment: selectedFile,
        time: getNowLabel(),
        edited: false,
      },
    ]);
    setDraft('');
    setSelectedFile(null);
  };

  const startEdit = (message) => {
    setEditingId(message.id);
    setEditDraft(message.text || '');
  };

  const saveEdit = (messageId) => {
    const text = editDraft.trim();
    if (!text) return;
    persist(messages.map((message) =>
      message.id === messageId ? { ...message, text, edited: true } : message
    ));
    setEditingId(null);
    setEditDraft('');
  };

  const deleteMessage = (messageId) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    persist(messages.filter((message) => message.id !== messageId));
  };

  const renderAttachment = (attachment) => {
    if (!attachment) return null;
    const isImage = attachment.type?.startsWith('image/');
    return (
      <a
        className={`chat-attachment ${isImage ? 'image' : ''}`}
        href={attachment.dataUrl}
        download={attachment.name}
      >
        {isImage ? <img src={attachment.dataUrl} alt={attachment.name} /> : <><FileText size={18} /><span>{attachment.name}</span></>}
      </a>
    );
  };

  return (
    <main className="relative-main messages-page">
      <section className="messenger-shell">
        <aside className="conversation-panel">
          <div className="conversation-title">
            <div>
              <p className="eyebrow">Patient surveillé</p>
              <h1>Messages</h1>
            </div>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher dans la conversation" />
          </label>
          <button className="conversation-card active" type="button">
            <div className="conversation-avatar">{initials(patient.firstName, patient.lastName)}<span /></div>
            <div>
              <strong>{patient.firstName} {patient.lastName}</strong>
              <p>{messages[messages.length - 1]?.text || 'Conversation proche-patient'}</p>
            </div>
          </button>
        </aside>

        <section className="chat-panel">
          <header className="chat-header">
            <div className="chat-user">
              <div className="chat-avatar">{initials(patient.firstName, patient.lastName)}<span /></div>
              <div>
                <h2>{patient.firstName} {patient.lastName}</h2>
                <p>Actif maintenant · {patient.diabetesType}</p>
              </div>
            </div>
            <div className="chat-actions">
              <button type="button" aria-label="Appeler le patient"><Phone size={19} /></button>
              <button type="button" aria-label="Options"><MoreHorizontal size={20} /></button>
            </div>
          </header>

          <div className="message-thread">
            <div className="thread-day">Aujourd’hui</div>
            {visibleMessages.map((message) => (
              <div key={message.id} className={`message-row ${message.author === 'relative' ? 'message-row-me' : ''}`}>
                {message.author === 'patient' && (
                  <div className="mini-avatar">{initials(patient.firstName, patient.lastName)}</div>
                )}
                {message.author === 'relative' && (
                  <div className="message-actions">
                    <button type="button" onClick={() => startEdit(message)} aria-label="Modifier"><Pencil size={14} /></button>
                    <button type="button" onClick={() => deleteMessage(message.id)} aria-label="Supprimer"><Trash2 size={14} /></button>
                  </div>
                )}
                <div className={`message-bubble ${message.author === 'relative' ? 'message-me' : 'message-them'}`}>
                  {editingId === message.id ? (
                    <form className="edit-message-form" onSubmit={(event) => { event.preventDefault(); saveEdit(message.id); }}>
                      <input value={editDraft} onChange={(event) => setEditDraft(event.target.value)} autoFocus />
                      <div>
                        <button type="button" onClick={() => setEditingId(null)}>Annuler</button>
                        <button type="submit">OK</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {message.text && <p>{message.text}</p>}
                      {renderAttachment(message.attachment)}
                      <span>{message.time}{message.edited ? ' · modifié' : ''}{message.author === 'relative' && <CheckCheck size={13} />}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form className="message-composer" onSubmit={sendMessage}>
            {selectedFile && (
              <div className="composer-file">
                <FileText size={17} />
                <span>{selectedFile.name}</span>
                <button type="button" onClick={() => setSelectedFile(null)}><X size={15} /></button>
              </div>
            )}
            <label className="composer-icon" aria-label="Joindre un fichier">
              <Paperclip size={20} />
              <input type="file" onChange={handleFileChange} />
            </label>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message à ${patient.firstName}`} />
            <button className="send-button" type="submit" aria-label="Envoyer"><Send size={19} /></button>
          </form>
        </section>
      </section>
    </main>
  );
}

function ProfileView() {
  return (
    <main className="relative-main">
      <header className="page-header">
        <div>
          <p className="eyebrow">Profil proche</p>
          <h1>Accès de surveillance</h1>
          <span>Un proche peut être un membre de la famille, un voisin, ou un intervenant d’aide à la personne.</span>
        </div>
      </header>
      <section className="profile-grid">
        <article className="profile-card">
          <UsersRound size={28} />
          <h2>Rôle du proche</h2>
          <p>Suivre les mesures, recevoir les alertes et garder un lien avec le patient sans remplacer le suivi médical.</p>
        </article>
        <article className="profile-card">
          <HeartPulse size={28} />
          <h2>Responsabilité</h2>
          <p>Surveillance bienveillante de la glycémie pour un enfant, une personne âgée, un voisin ou un bénéficiaire accompagné.</p>
        </article>
        <article className="profile-card">
          <ShieldCheck size={28} />
          <h2>Droits d’accès</h2>
          <p>Accès limité aux données nécessaires : mesures glycémiques, alertes, journal récent et messagerie patient.</p>
        </article>
      </section>
    </main>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <div className="relative-app">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      {currentView === 'dashboard' && <DashboardView setCurrentView={setCurrentView} />}
      {currentView === 'messages' && <MessagesView />}
      {currentView === 'profile' && <ProfileView />}
    </div>
  );
}
