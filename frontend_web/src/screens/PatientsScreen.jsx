import { useState, useEffect, useCallback } from 'react';
import {
  Users, Clock, Search, ChevronRight, UserCheck,
  Mail, Phone, Stethoscope, AlertCircle, Plus, X,
  Activity, Utensils, Pill, Droplets, Heart, Footprints,
  Flame, AlertTriangle, CheckCircle, Send, UserPlus
} from 'lucide-react';
import authService from '../services/authService';
import { toastError, toastSuccess } from '../services/toastService';
import Sidebar from '../components/Sidebar';
import './css/patients.css';

const apiClient = authService.getApiClient();

function getInitials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

function StatusBadge({ status }) {
  const map = {
    2: { label: 'Actif',       cls: 'badge-active' },
    1: { label: 'En attente',  cls: 'badge-pending' },
    0: { label: 'Inactif',     cls: 'badge-inactive' },
  };
  const { label, cls } = map[status] || { label: 'Inconnu', cls: 'badge-inactive' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

/* ─── Helper : extrait une valeur primitive depuis un champ qui peut être
       soit un scalaire, soit un objet { value, unit, trend, recordedAt, … } ─── */
function extractValue(field) {
  if (field == null) return null;
  if (typeof field === 'object') return field.value ?? null;
  return field;
}

/* ─── Modal : Ajouter un patient ─── */
function AddPatientModal({ onClose, onSuccess }) {
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toastError('Erreur', 'Veuillez saisir un email valide');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/doctors/care-team/add-patient/', {
        email,
        phone_number: phone,
      });
      toastSuccess('Invitation envoyée', `Patient ${email} ajouté avec succès`);
      onSuccess(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message;
      toastError('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-wrap"><Plus size={20} /></div>
            <div>
              <h2>Ajouter un patient</h2>
              <p>Invitez un patient à rejoindre votre équipe de soins</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="mfield">
            <label>Email du patient <span className="required">*</span></label>
            <div className="minput-wrap">
              <Mail size={15} />
              <input
                type="email"
                placeholder="patient@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>
          <div className="mfield">
            <label>Téléphone <span className="optional">(optionnel)</span></label>
            <div className="minput-wrap">
              <Phone size={15} />
              <input
                type="tel"
                placeholder="+33 6 00 00 00 00"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="mbt-secondary" onClick={onClose}>Annuler</button>
          <button className="mbt-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="mini-spinner" /> Envoi…</> : 'Envoyer l\'invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Jauge de progression ─── */
function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ─── Helpers graphique SVG glycémie ─ */
function GlycemiaSparkline({ data }) {
  if (!data || data.length === 0) return null;
  const W = 560, H = 120, PAD = 12;
  const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xStep = (W - PAD * 2) / (values.length - 1);
  const toX = i => PAD + i * xStep;
  const toY = v => H - PAD - ((v - min) / range) * (H - PAD * 2);
  const points = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const areaPoints = `${toX(0)},${H} ` + values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ') + ` ${toX(values.length - 1)},${H}`;
  // Zone cible : détection auto mg/dL (>10) ou g/L
  const isMgdl = values.some(v => v > 10);
  const targetTop    = toY(isMgdl ? 140 : 1.4);
  const targetBottom = toY(isMgdl ? 70  : 0.7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 120 }}>
      <defs>
        <linearGradient id="glyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4A90E2" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Zone cible */}
      <rect x={PAD} y={Math.min(targetTop, targetBottom)} width={W - PAD * 2}
        height={Math.abs(targetBottom - targetTop)}
        fill="#16A34A" opacity="0.08" rx="4" />
      {/* Aire */}
      <polygon points={areaPoints} fill="url(#glyGrad)" />
      {/* Ligne */}
      <polyline points={points} fill="none" stroke="#4A90E2" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Points */}
      {values.map((v, i) => {
        const isMgdl = values.some(x => x > 10);
        const highThreshold = isMgdl ? 180 : 1.8;
        const lowThreshold  = isMgdl ? 70  : 0.7;
        const isHigh = v > highThreshold, isLow = v < lowThreshold;
        const color = isHigh ? '#DC2626' : isLow ? '#F97316' : '#4A90E2';
        return <circle key={i} cx={toX(i)} cy={toY(v)} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

/* ─── Jauge circulaire ───── */
function RadialGauge({ value, max, color, size = 72 }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth="7" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        style={{ transition: 'stroke-dasharray .6s ease' }} />
    </svg>
  );
}

/* ─── Carte métrique avec jauge ─── */
function MetricCard({ icon, label, value, unit, goal, goalLabel, color, colorBg }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : null;
  return (
    <div className="mcard">
      <div className="mcard-top">
        <div className="mcard-icon" style={{ background: colorBg, color }}>{icon}</div>
        <span className="mcard-label">{label}</span>
      </div>
      <div className="mcard-body">
        <div className="mcard-value" style={{ color }}>
          {value ?? '—'}
          {unit && <span className="mcard-unit">{unit}</span>}
        </div>
        {goal != null && (
          <>
            <div className="mcard-progress-track">
              <div className="mcard-progress-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="mcard-goal">{pct}% · Objectif : {goal}{unit ? ' ' + unit : ''}</div>
          </>
        )}
        {goalLabel && !goal && <div className="mcard-goal">{goalLabel}</div>}
      </div>
    </div>
  );
}

/* ─── Carte alerte ── */
const ALERT_TYPE_LABELS = {
  hypo:         'Hypoglycémie',
  hyper:        'Hyperglycémie',
  missed_dose:  'Dose manquée',
  low_activity: 'Activité insuffisante',
  high_glucose: 'Glycémie élevée',
  low_glucose:  'Glycémie basse',
};

const SEVERITY_COLORS = {
  critical: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', bar: '#DC2626', badge: '#DC2626' },
  warning:  { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', bar: '#F97316', badge: '#F97316' },
  info:     { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', bar: '#F59E0B', badge: '#F59E0B' },
};

const INDEX_COLORS = [
  { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', bar: '#DC2626' },
  { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', bar: '#F97316' },
  { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', bar: '#F59E0B' },
];

function AlertCard({ alert, index }) {
  if (typeof alert === 'string') {
    const c = INDEX_COLORS[index % INDEX_COLORS.length];
    return (
      <div className="alert-card" style={{ background: c.bg, borderColor: c.border }}>
        <div className="alert-card-bar" style={{ background: c.bar }} />
        <div className="alert-card-body">
          <div className="alert-card-title" style={{ color: c.text }}>
            <AlertTriangle size={13} /> {alert}
          </div>
        </div>
      </div>
    );
  }

  const severity = alert.severity || 'info';
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;

  const typeLabel   = ALERT_TYPE_LABELS[alert.type] || alert.type || 'Alerte';
  const message     = alert.message || typeLabel;
  const triggeredAt = alert.triggeredAt || alert.time || alert.created_at;
  const timeLabel   = triggeredAt
    ? new Date(triggeredAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  const severityLabel = {
    critical: 'Critique',
    warning:  'Attention',
    info:     'Info',
  }[severity] || severity;

  return (
    <div className="alert-card" style={{ background: c.bg, borderColor: c.border }}>
      <div className="alert-card-bar" style={{ background: c.bar }} />
      <div className="alert-card-body">
        <div className="alert-card-title" style={{ color: c.text }}>
          <AlertTriangle size={13} />
          <span>{message}</span>
          <span className="alert-severity-badge" style={{ background: c.badge }}>
            {severityLabel}
          </span>
        </div>
        {alert.type && alert.message && (
          <div className="alert-card-type">{typeLabel}</div>
        )}
        {timeLabel && <div className="alert-card-time">{timeLabel}</div>}
      </div>
    </div>
  );
}

/* ─── Score santé ─── */
function HealthScore({ score }) {
  const color = score >= 75 ? '#16A34A' : score >= 50 ? '#F97316' : '#DC2626';
  const label = score >= 75 ? 'Bon' : score >= 50 ? 'Moyen' : 'Faible';
  return (
    <div className="health-score-card">
      <div className="health-score-inner">
        <RadialGauge value={score} max={100} color={color} size={88} />
        <div className="health-score-center">
          <span className="health-score-num" style={{ color }}>{score}</span>
          <span className="health-score-denom">/100</span>
        </div>
      </div>
      <div className="health-score-info">
        <div className="health-score-label">Score de santé</div>
        <div className="health-score-status" style={{ color }}>{label}</div>
        <div className="health-score-desc">Basé sur l'activité, la nutrition et l'observance</div>
      </div>
    </div>
  );
}

/* ─── Modal : Dossier patient ── */
function PatientDashboardModal({ member, onClose }) {
  const p         = member.patient_details;
  const patientId = p.id_user;
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [dashboard,   setDashboard]   = useState(null);
  const [meals,       setMeals]       = useState([]);
  const [medications, setMedications] = useState([]);
  const [glycemia,    setGlycemia]    = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [glycFilter,  setGlycFilter]  = useState('all'); // 'all' | 'high' | 'low' | 'normal'
  const [period,      setPeriod]      = useState('week'); // 'week' | 'month' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');

  /* Calcule start/end en fonction de la période sélectionnée */
  const getPeriodDates = (p = period) => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (p === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 6);
      return { start_date: fmt(start), end_date: fmt(now) };
    }
    if (p === 'month') {
      const start = new Date(now); start.setDate(now.getDate() - 29);
      return { start_date: fmt(start), end_date: fmt(now) };
    }
    if (p === 'custom') return { start_date: customStart, end_date: customEnd };
    return {};
  };

  useEffect(() => {
    // Pour 'custom', n'envoie la requête que si les deux dates sont remplies
    if (period === 'custom' && (!customStart || !customEnd)) return;
    const load = async () => {
      setLoadingData(true);
      setGlycFilter('all');
      try {
        const dates = getPeriodDates();
        const qs = new URLSearchParams({ patient_user_id: patientId, ...dates }).toString();
        const [d, m, med, g] = await Promise.all([
          apiClient.get(`/doctors/care-team/patient-dashboard/?patient_user_id=${patientId}`),
          apiClient.get(`/doctors/care-team/patient-meals/?${qs}`),
          apiClient.get(`/doctors/care-team/patient-medications/?patient_user_id=${patientId}`),
          apiClient.get(`/doctors/care-team/patient-glycemia/?${qs}`),
        ]);
        setDashboard(d.data);
        const toArr = (data, keys) => {
          if (Array.isArray(data)) return data;
          for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
          return [];
        };
        setMeals(toArr(m.data, ['results','meals','data']));
        setMedications(toArr(med.data, ['results','medications','data']));
        setGlycemia(toArr(g.data, ['results','glycemia','data']));
      } catch (err) {
        toastError('Erreur', 'Impossible de charger les données du patient');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [patientId, period, customStart, customEnd]);

  const tabs = [
    { id: 'dashboard',   label: 'Vue d\'ensemble', icon: <Heart size={15} /> },
    { id: 'glycemia',    label: 'Glycémie',         icon: <Droplets size={15} /> },
    { id: 'meals',       label: 'Repas',            icon: <Utensils size={15} /> },
    { id: 'medications', label: 'Traitements',      icon: <Pill size={15} /> },
  ];

  /* Statistiques glycémie */
  const glycValues = glycemia.map(g => parseFloat(g.value)).filter(v => !isNaN(v));
  const glycAvg    = glycValues.length ? (glycValues.reduce((a, b) => a + b, 0) / glycValues.length).toFixed(2) : null;
  const glycMax    = glycValues.length ? Math.max(...glycValues).toFixed(2) : null;
  const glycMin    = glycValues.length ? Math.min(...glycValues).toFixed(2) : null;

  /* ── Extraction sécurisée des champs dashboard ──
     L'API peut renvoyer un scalaire OU un objet { value, unit, trend, recordedAt, … }
     pour chaque champ. On normalise ici une seule fois. */
  const dash = dashboard ? {
    healthScore: extractValue(dashboard.healthScore) ?? dashboard.healthScore ?? 0,
    alerts:      dashboard.alerts ?? [],
    glucose:     extractValue(dashboard.glucose),
    glucoseUnit: typeof dashboard.glucose === 'object' ? (dashboard.glucose?.unit ?? 'mg/dL') : 'mg/dL',
    glucoseDate: typeof dashboard.glucose === 'object' ? dashboard.glucose?.recordedAt : null,
    nutrition: {
      calories: {
        consumed: extractValue(dashboard.nutrition?.calories?.consumed ?? dashboard.nutrition?.calories),
        goal:     extractValue(dashboard.nutrition?.calories?.goal),
      },
      carbs: {
        grams: extractValue(dashboard.nutrition?.carbs?.grams ?? dashboard.nutrition?.carbs),
        goal:  extractValue(dashboard.nutrition?.carbs?.goal),
      },
    },
    activity: {
      steps: {
        value: extractValue(dashboard.activity?.steps?.value ?? dashboard.activity?.steps),
        goal:  extractValue(dashboard.activity?.steps?.goal),
      },
      activeMinutes: extractValue(dashboard.activity?.activeMinutes),
    },
    medication: {
      nextDose: extractValue(dashboard.medication?.nextDose) ?? dashboard.medication?.nextDose,
    },
  } : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-xl" onClick={e => e.stopPropagation()}>

        {/* ── Header patient ── */}
        <div className="pdm-header">
          <div className="pdm-header-left">
            <div className="pdm-avatar">{getInitials(p.first_name, p.last_name)}</div>
            <div>
              <h2 className="pdm-name">{p.first_name} {p.last_name}</h2>
              <div className="pdm-meta">
                {p.email && <span><Mail size={12} /> {p.email}</span>}
                {p.phone_number && <span><Phone size={12} /> {p.phone_number}</span>}
                <StatusBadge status={member.status} />
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* ── Tabs + sélecteur période ── */}
        <div className="modal-tabs-row">
          <div className="modal-tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`modal-tab ${activeTab === t.id ? 'modal-tab-active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Sélecteur de période — masqué sur l'onglet Traitements */}
          {activeTab !== 'medications' && (
            <div className="period-selector">
              {['week','month','custom'].map(p => (
                <button
                  key={p}
                  className={`period-btn ${period === p ? 'period-btn-active' : ''}`}
                  onClick={() => setPeriod(p)}
                >
                  {p === 'week' ? '7 jours' : p === 'month' ? '30 jours' : 'Personnalisé'}
                </button>
              ))}
              {period === 'custom' && (
                <div className="period-custom-inputs">
                  <input
                    type="date"
                    className="period-date-input"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                  />
                  <span className="period-date-sep">→</span>
                  <input
                    type="date"
                    className="period-date-input"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="modal-scroll">
          {loadingData ? (
            <div className="state-center" style={{ minHeight: 280 }}>
              <div className="big-spinner" /><p>Chargement des données…</p>
            </div>
          ) : (
            <>
              {/* ══ Vue d'ensemble ══ */}
              {activeTab === 'dashboard' && dash && (
                <div className="pdm-overview">

                  {/* Ligne 1 : score + alertes */}
                  <div className="pdm-row pdm-row-top">
                    <HealthScore score={dash.healthScore} />

                    <div className="pdm-alerts-block">
                      <div className="pdm-section-title"><AlertTriangle size={14} /> Alertes récentes</div>
                      {(!dash.alerts || dash.alerts.length === 0) ? (
                        <div className="pdm-no-alert"><CheckCircle size={16} /> Aucune alerte active</div>
                      ) : (
                        <div className="pdm-alerts-list">
                          {dash.alerts.map((a, i) => <AlertCard key={i} alert={a} index={i} />)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ligne 2 : métriques */}
                  <div className="pdm-section-title" style={{ marginTop: 20 }}><Activity size={14} /> Métriques du jour</div>
                  <div className="pdm-metrics-grid">
                    <MetricCard
                      icon={<Droplets size={18} />}
                      label="Glycémie actuelle"
                      value={dash.glucose != null ? dash.glucose : '—'}
                      unit={dash.glucose != null ? ` ${dash.glucoseUnit}` : ''}
                      color="#2563EB" colorBg="#EFF6FF"
                      goalLabel={dash.glucose == null
                        ? 'Aucune mesure récente'
                        : dash.glucoseDate
                          ? `Mesurée le ${new Date(dash.glucoseDate).toLocaleString('fr-FR', {dateStyle:'short',timeStyle:'short'})}`
                          : null}
                    />
                    <MetricCard
                      icon={<Flame size={18} />}
                      label="Calories"
                      value={dash.nutrition.calories.consumed}
                      unit=" kcal"
                      goal={dash.nutrition.calories.goal}
                      color="#EA580C" colorBg="#FFF7ED"
                    />
                    <MetricCard
                      icon={<Utensils size={18} />}
                      label="Glucides"
                      value={dash.nutrition.carbs.grams}
                      unit=" g"
                      goal={dash.nutrition.carbs.goal}
                      color="#16A34A" colorBg="#F0FDF4"
                    />
                    <MetricCard
                      icon={<Footprints size={18} />}
                      label="Pas"
                      value={dash.activity.steps.value != null
                        ? Number(dash.activity.steps.value).toLocaleString('fr-FR')
                        : '—'}
                      goal={dash.activity.steps.goal}
                      color="#7C3AED" colorBg="#F5F3FF"
                    />
                    <MetricCard
                      icon={<Activity size={18} />}
                      label="Minutes actives"
                      value={dash.activity.activeMinutes}
                      unit=" min"
                      color="#E11D48" colorBg="#FFF1F2"
                      goalLabel="Objectif : 30 min/jour"
                    />
                    <MetricCard
                      icon={<Pill size={18} />}
                      label="Prochain médicament"
                      value={dash.medication.nextDose ?? '—'}
                      color="#15803D" colorBg="#F0FDF4"
                      goalLabel={dash.medication.nextDose ? '' : 'Aucune prise prévue'}
                    />
                  </div>
                </div>
              )}

              {/* ══ Glycémie ══ */}
              {activeTab === 'glycemia' && (
                glycemia.length === 0 ? (
                  <div className="empty-state">
                    <Droplets size={40} strokeWidth={1} />
                    <p>Aucune mesure de glycémie enregistrée</p>
                  </div>
                ) : (
                  <div className="pdm-glycemia">
                    {/* Stats résumé — cliquables pour filtrer */}
                    {(() => {
                      const gUnit = glycemia[0]?.unit ?? (glycValues.some(v=>v>10) ? 'mg/dL' : 'g/L');
                      const isMgdl = gUnit === 'mg/dL' || glycValues.some(v => v > 10);
                      const highThreshold = isMgdl ? 180 : 1.8;
                      const lowThreshold  = isMgdl ? 70  : 0.7;
                      const highCount   = glycValues.filter(v => v > highThreshold).length;
                      const lowCount    = glycValues.filter(v => v < lowThreshold).length;
                      const normalCount = glycValues.filter(v => v >= lowThreshold && v <= highThreshold).length;
                      return (
                        <div className="gly-stats">
                          <div
                            className={`gly-stat gly-stat-clickable ${glycFilter === 'all' ? 'gly-stat-active' : ''}`}
                            onClick={() => setGlycFilter('all')}
                          >
                            <span className="gly-stat-val" style={{ color: '#2563EB' }}>{glycAvg} <small>{gUnit}</small></span>
                            <span className="gly-stat-lbl">Moyenne · Tout afficher</span>
                          </div>
                          <div className="gly-stat-sep" />
                          <div
                            className={`gly-stat gly-stat-clickable ${glycFilter === 'high' ? 'gly-stat-active gly-stat-active-high' : ''}`}
                            onClick={() => setGlycFilter(glycFilter === 'high' ? 'all' : 'high')}
                          >
                            <span className="gly-stat-val" style={{ color: '#DC2626' }}>{highCount} <small>mesures</small></span>
                            <span className="gly-stat-lbl">Hyperglycémie</span>
                          </div>
                          <div className="gly-stat-sep" />
                          <div
                            className={`gly-stat gly-stat-clickable ${glycFilter === 'low' ? 'gly-stat-active gly-stat-active-low' : ''}`}
                            onClick={() => setGlycFilter(glycFilter === 'low' ? 'all' : 'low')}
                          >
                            <span className="gly-stat-val" style={{ color: '#EA580C' }}>{lowCount} <small>mesures</small></span>
                            <span className="gly-stat-lbl">Hypoglycémie</span>
                          </div>
                          <div className="gly-stat-sep" />
                          <div
                            className={`gly-stat gly-stat-clickable ${glycFilter === 'normal' ? 'gly-stat-active gly-stat-active-normal' : ''}`}
                            onClick={() => setGlycFilter(glycFilter === 'normal' ? 'all' : 'normal')}
                          >
                            <span className="gly-stat-val" style={{ color: '#16A34A' }}>{normalCount} <small>mesures</small></span>
                            <span className="gly-stat-lbl">Normal</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Graphique */}
                    <div className="gly-chart-wrap">
                      <div className="gly-chart-title">Évolution de la glycémie</div>
                      {(() => {
                        const isMgdl = glycemia.length > 0 ? (glycemia[0].unit === 'mg/dL' || glycValues.some(v => v > 10)) : false;
                        return (
                          <div className="gly-legend">
                            <span className="gly-legend-dot" style={{ background: '#DC2626' }} />
                            {isMgdl ? 'Hyperglycémie (>180 mg/dL)' : 'Hyperglycémie (>1.8 g/L)'}
                            <span className="gly-legend-dot" style={{ background: '#F97316', marginLeft: 12 }} />
                            {isMgdl ? 'Hypoglycémie (<70 mg/dL)' : 'Hypoglycémie (<0.7 g/L)'}
                            <span className="gly-legend-dot" style={{ background: '#4A90E2', marginLeft: 12 }} /> Normal
                            <span className="gly-legend-zone" />
                            {isMgdl ? 'Zone cible (70–140 mg/dL)' : 'Zone cible (0.7–1.4 g/L)'}
                          </div>
                        );
                      })()}
                      <GlycemiaSparkline data={glycemia.slice().reverse()} />
                    </div>

                    {/* Filtre actif + tableau */}
                    {glycFilter !== 'all' && (
                      <div className="gly-filter-bar">
                        <span>
                          Filtre actif :&nbsp;
                          <strong>
                            {glycFilter === 'high' ? 'Hyperglycémie' : glycFilter === 'low' ? 'Hypoglycémie' : 'Normal'}
                          </strong>
                        </span>
                        <button className="gly-filter-clear" onClick={() => setGlycFilter('all')}>
                          <X size={12} /> Effacer le filtre
                        </button>
                      </div>
                    )}

                    <table className="data-table" style={{ marginTop: 8 }}>
                      <thead>
                        <tr><th>Date & Heure</th><th>Valeur</th><th>Statut</th></tr>
                      </thead>
                      <tbody>
                        {glycemia
                          .filter(g => {
                            if (glycFilter === 'all') return true;
                            const v = parseFloat(g.value);
                            const isMgdl = (g.unit === 'mg/dL') || v > 10;
                            const high = isMgdl ? v > 180 : v > 1.8;
                            const low  = isMgdl ? v < 70  : v < 0.7;
                            if (glycFilter === 'high')   return high;
                            if (glycFilter === 'low')    return low;
                            if (glycFilter === 'normal') return !high && !low;
                            return true;
                          })
                          .map((g, i) => {
                            const rawVal = g.value;
                            const val    = parseFloat(rawVal);
                            const unit   = g.unit ?? (val > 10 ? 'mg/dL' : 'g/L');
                            const isMgdl = unit === 'mg/dL' || val > 10;
                            const isHigh = isMgdl ? val > 180 : val > 1.8;
                            const isLow  = isMgdl ? val < 70  : val < 0.7;
                            return (
                              <tr key={i}>
                                <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                                  {g.measuredAt ? new Date(g.measuredAt).toLocaleString('fr-FR') : '—'}
                                </td>
                                <td>
                                  <span className={`gly-val-badge ${isHigh ? 'gly-high' : isLow ? 'gly-low' : 'gly-normal'}`}>
                                    {rawVal} {unit}
                                  </span>
                                </td>
                                <td>
                                  {isHigh ? (
                                    <span className="gly-status-badge gly-status-high">
                                      <AlertTriangle size={11} /> Hyperglycémie
                                    </span>
                                  ) : isLow ? (
                                    <span className="gly-status-badge gly-status-low">
                                      <AlertTriangle size={11} /> Hypoglycémie
                                    </span>
                                  ) : (
                                    <span className="gly-status-badge gly-status-normal">
                                      <CheckCircle size={11} /> Normal
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>

                    {/* Aucun résultat après filtre */}
                    {glycemia.filter(g => {
                      if (glycFilter === 'all') return true;
                      const v = parseFloat(g.value); const isMgdl = (g.unit==='mg/dL')||v>10;
                      const high = isMgdl?v>180:v>1.8; const low = isMgdl?v<70:v<0.7;
                      if (glycFilter==='high') return high; if (glycFilter==='low') return low;
                      if (glycFilter==='normal') return !high&&!low; return true;
                    }).length === 0 && (
                      <div className="gly-empty-filter">
                        <CheckCircle size={20} style={{ color: '#16A34A' }} />
                        Aucune mesure de ce type
                      </div>
                    )}
                  </div>
                )
              )}

              {/* ══ Repas ══ */}
              {activeTab === 'meals' && (
                meals.length === 0 ? (
                  <div className="empty-state">
                    <Utensils size={40} strokeWidth={1} />
                    <p>Aucun repas enregistré</p>
                  </div>
                ) : (
                  <div className="pdm-meals">
                    {/* Résumé nutrition */}
                    <div className="meals-summary">
                      <div className="meals-sum-item">
                        <Flame size={16} style={{ color: '#EA580C' }} />
                        <span className="meals-sum-val">{meals.reduce((acc, m) => acc + (m.calories ?? m.total_calories ?? m.kcal ?? m.energy ?? 0), 0)}</span>
                        <span className="meals-sum-lbl">kcal totales</span>
                      </div>
                      <div className="meals-sum-sep" />
                      <div className="meals-sum-item">
                        <Utensils size={16} style={{ color: '#16A34A' }} />
                        <span className="meals-sum-val">{meals.reduce((acc, m) => acc + (m.carbs ?? m.carbohydrates ?? m.glucides ?? m.carb_grams ?? 0), 0)} g</span>
                        <span className="meals-sum-lbl">Glucides totaux</span>
                      </div>
                      <div className="meals-sum-sep" />
                      <div className="meals-sum-item">
                        <span className="meals-sum-val" style={{ fontSize: 20 }}>{meals.length}</span>
                        <span className="meals-sum-lbl">Repas enregistrés</span>
                      </div>
                    </div>
                    <table className="data-table" style={{ marginTop: 16 }}>
                      <thead>
                        <tr><th>Date</th><th>Type de repas</th><th>Calories</th><th>Glucides</th></tr>
                      </thead>
                      <tbody>
                        {meals.map((m, i) => {
                          const mealDate  = m.date ?? m.meal_date ?? m.eaten_at ?? m.created_at ?? m.timestamp;
                          const mealName  = m.name ?? m.meal_type ?? m.meal_name ?? m.type ?? m.title;
                          const mealCals  = m.calories ?? m.total_calories ?? m.kcal ?? m.energy;
                          const mealCarbs = m.carbs ?? m.carbohydrates ?? m.glucides ?? m.carb_grams;
                          const mealProts = m.proteins ?? m.protein ?? m.proteines;
                          const mealFats  = m.fats ?? m.fat ?? m.lipids ?? m.lipides;
                          return (
                            <tr key={i}>
                              <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                                {mealDate ? new Date(mealDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                              </td>
                              <td><strong>{mealName || '—'}</strong></td>
                              <td>
                                <span className="meal-cal-badge">{mealCals != null ? `${mealCals} kcal` : '—'}</span>
                              </td>
                              <td>
                                <span style={{ color: '#16A34A', fontWeight: 600 }}>{mealCarbs != null ? `${mealCarbs} g` : '—'}</span>
                                {mealProts != null && <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>{mealProts}g prot.</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* ══ Médicaments ══ */}
              {activeTab === 'medications' && (
                medications.length === 0 ? (
                  <div className="empty-state">
                    <Pill size={40} strokeWidth={1} />
                    <p>Aucun médicament enregistré</p>
                  </div>
                ) : (
                  <div className="pdm-medications">
                    <div className="med-summary">
                      <div className="med-sum-item">
                        <span className="med-sum-val" style={{ color: '#16A34A' }}>
                          {medications.filter(m => m.is_active ?? m.active ?? m.status === 'active').length}
                        </span>
                        <span className="med-sum-lbl">Actifs</span>
                      </div>
                      <div className="med-sum-sep" />
                      <div className="med-sum-item">
                        <span className="med-sum-val" style={{ color: 'var(--muted)' }}>
                          {medications.filter(m => !(m.is_active ?? m.active ?? m.status === 'active')).length}
                        </span>
                        <span className="med-sum-lbl">Inactifs</span>
                      </div>
                      <div className="med-sum-sep" />
                      <div className="med-sum-item">
                        <span className="med-sum-val">{medications.length}</span>
                        <span className="med-sum-lbl">Total</span>
                      </div>
                    </div>
                    <table className="data-table" style={{ marginTop: 16 }}>
                      <thead>
                        <tr><th>Médicament</th><th>Dosage</th><th>Fréquence</th><th>Statut</th></tr>
                      </thead>
                      <tbody>
                        {medications.map((m, i) => {
                          const medName  = m.name ?? m.medication_name ?? m.drug_name ?? m.titre ?? m.label;
                          const medDose  = m.dosage ?? m.dose ?? m.strength ?? m.amount;
                          const medFreq  = m.frequency ?? m.freq ?? m.schedule ?? m.posology ?? m.timing;
                          const medStart = m.start_date ?? m.started_at ?? m.prescribed_at;
                          const medEnd   = m.end_date ?? m.ended_at ?? m.expiry_date;
                          const isActive = m.is_active ?? m.active ?? m.status === 'active' ?? true;
                          return (
                            <tr key={i}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div className="med-icon-sm"><Pill size={13} /></div>
                                  <div>
                                    <strong>{medName || '—'}</strong>
                                    {medStart && (
                                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                        Depuis le {new Date(medStart).toLocaleDateString('fr-FR')}
                                        {medEnd ? ` → ${new Date(medEnd).toLocaleDateString('fr-FR')}` : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ color: 'var(--blue)', fontWeight: 600 }}>{medDose || '—'}</td>
                              <td style={{ color: 'var(--muted)' }}>{medFreq || '—'}</td>
                              <td>
                                {isActive
                                  ? <span className="status-badge badge-active">Actif</span>
                                  : <span className="status-badge badge-inactive">Inactif</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Card patient ──*/
function PatientCard({ member, onClick }) {
  const p = member.patient_details;
  return (
    <div className="patient-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="card-top">
        <div className="patient-avatar">{getInitials(p.first_name, p.last_name)}</div>
        <div className="patient-meta">
          <h3 className="patient-name">{p.first_name} {p.last_name}</h3>
          <StatusBadge status={member.status} />
        </div>
        <span className="role-badge">{member.role_label}</span>
      </div>
      <div className="card-body">
        <div className="info-row"><Mail size={14} /><span>{p.email}</span></div>
        {p.phone_number && <div className="info-row"><Phone size={14} /><span>{p.phone_number}</span></div>}
      </div>
      <div className="card-footer">
        <button className="card-btn" onClick={onClick}>
          Voir le dossier <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/** Invitation envoyée par le médecin → en attente de réponse du patient */
function SentInviteCard({ invite }) {
  const p = invite.patient_details;
  return (
    <div className="patient-card invite-card invite-sent">
      <div className="card-top">
        <div className="patient-avatar invite-avatar-sent"><Send size={18} /></div>
        <div className="patient-meta">
          <h3 className="patient-name">{p?.first_name ? `${p.first_name} ${p.last_name}` : invite.invitation_email || '—'}</h3>
          <span className="status-badge badge-pending">Invitation envoyée</span>
        </div>
      </div>
      <div className="card-body" style={{ marginTop: 12 }}>
        {p?.email && <div className="info-row"><Mail size={14} /><span>{p.email}</span></div>}
        {p?.phone_number && <div className="info-row"><Phone size={14} /><span>{p.phone_number}</span></div>}
      </div>
      <div className="invite-waiting">
        <Clock size={13} /> En attente de la réponse du patient
      </div>
    </div>
  );
}

/** Invitation reçue par le médecin → il peut l'accepter */
function ReceivedInviteCard({ invite, onAccepted }) {
  const p = invite.patient_details;
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async (e) => {
    e.stopPropagation();
    setAccepting(true);
    try {
      await apiClient.post('/doctors/care-team/accept-invitation/', {
        id_team_member: invite.id_team_member,
      });
      toastSuccess('Invitation acceptée', `${p?.first_name ?? ''} ${p?.last_name ?? ''} a rejoint votre équipe`);
      onAccepted();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message;
      toastError('Erreur', msg);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="patient-card invite-card invite-received">
      <div className="invite-received-banner">
        <UserPlus size={13} /> Demande reçue d'un patient
      </div>
      <div className="card-top" style={{ marginTop: 12 }}>
        <div className="patient-avatar invite-avatar-received">
          {getInitials(p?.first_name, p?.last_name)}
        </div>
        <div className="patient-meta">
          <h3 className="patient-name">{p?.first_name ? `${p.first_name} ${p.last_name}` : '—'}</h3>
          <span className="status-badge badge-received">À accepter</span>
        </div>
      </div>
      <div className="card-body" style={{ marginTop: 12 }}>
        {p?.email && <div className="info-row"><Mail size={14} /><span>{p.email}</span></div>}
        {p?.phone_number && <div className="info-row"><Phone size={14} /><span>{p.phone_number}</span></div>}
      </div>
      <div className="card-footer">
        <button className="card-btn-accept" onClick={handleAccept} disabled={accepting}>
          {accepting
            ? <><span className="mini-spinner-sm" /> Acceptation…</>
            : <><CheckCircle size={14} /> Accepter la demande</>}
        </button>
      </div>
    </div>
  );
}

export default function PatientsScreen({ navigation }) {
  const [data,           setData]           = useState({ active_patients: [], pending_invites: [] });
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState('');
  const [tab,            setTab]            = useState('active');
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const storedUser = authService.getStoredUser();
  const myDoctorId =
    storedUser?.doctor_id ??
    storedUser?.identity?.profiles?.[0]?.doctor_details?.doctor_id;

  const fetchTeam = useCallback(async () => {
    try {
      const res = await apiClient.get('/doctors/care-team/my-team/');
      setData(res.data);
    } catch (err) {
      setError('Impossible de charger la liste des patients.');
      toastError('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    setLoading(true);
    fetchTeam();
  };

  const filtered = data.active_patients.filter(m => {
    const p = m.patient_details;
    const q = search.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  const sentInvites     = data.pending_invites.filter(inv => inv.approved_by !== null);
  const receivedInvites = data.pending_invites.filter(inv => inv.approved_by === null);

  const activeCount    = data.active_patients.length;
  const sentCount      = sentInvites.length;
  const receivedCount  = receivedInvites.length;

  return (
    <div className="patients-root">
      <Sidebar activePage="patients" navigation={navigation} />

      {/* ── Main ── */}
      <main className="patients-main">
        <header className="patients-header">
          <div>
            <h1>Mes patients</h1>
            <p>Gérez votre équipe de soins et suivez vos patients</p>
          </div>
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Ajouter un patient
          </button>
        </header>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon stat-blue"><UserCheck size={20} /></div>
            <div><div className="stat-value">{activeCount}</div><div className="stat-label">Patients actifs</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-orange"><Clock size={20} /></div>
            <div><div className="stat-value">{sentCount}</div><div className="stat-label">Invitations envoyées</div></div>
          </div>
          <div className="stat-card stat-card-received" style={{ position: 'relative' }}>
            <div className="stat-icon stat-green"><UserPlus size={20} /></div>
            <div>
              <div className="stat-value">{receivedCount}</div>
              <div className="stat-label">Demandes reçues</div>
            </div>
            {receivedCount > 0 && <span className="stat-notif">{receivedCount}</span>}
          </div>
        </div>

        <div className="toolbar">
          <div className="tabs">
            <button className={`tab ${tab === 'active'   ? 'tab-active' : ''}`} onClick={() => setTab('active')}>
              Mes patients <span className="tab-count">{activeCount}</span>
            </button>
            <button className={`tab ${tab === 'sent'     ? 'tab-active' : ''}`} onClick={() => setTab('sent')}>
              Invitations envoyées <span className="tab-count">{sentCount}</span>
            </button>
            <button className={`tab tab-received ${tab === 'received' ? 'tab-active' : ''}`} onClick={() => setTab('received')}>
              Demandes reçues
              {receivedCount > 0
                ? <span className="tab-count tab-count-received">{receivedCount}</span>
                : <span className="tab-count">{receivedCount}</span>}
            </button>
          </div>
          <div className="search-wrapper">
            <Search size={15} />
            <input
              type="text"
              placeholder="Rechercher un patient…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="patients-content">
          {loading && (
            <div className="state-center"><div className="big-spinner" /><p>Chargement des patients…</p></div>
          )}
          {!loading && error && (
            <div className="state-center state-error"><AlertCircle size={40} /><p>{error}</p></div>
          )}

          {/* Patients actifs */}
          {!loading && !error && tab === 'active' && (
            filtered.length === 0
              ? <div className="state-center"><Users size={48} strokeWidth={1} /><p>{search ? 'Aucun résultat.' : 'Aucun patient actif pour le moment.'}</p></div>
              : <div className="cards-grid">
                  {filtered.map(m => (
                    <PatientCard key={m.id_team_member} member={m} onClick={() => setSelectedMember(m)} />
                  ))}
                </div>
          )}

          {/* Invitations envoyées par le médecin */}
          {!loading && !error && tab === 'sent' && (
            sentInvites.length === 0
              ? <div className="state-center"><Send size={48} strokeWidth={1} /><p>Aucune invitation envoyée en attente.</p></div>
              : <div className="cards-grid">
                  {sentInvites.map(inv => <SentInviteCard key={inv.id_team_member} invite={inv} />)}
                </div>
          )}

          {/* Invitations reçues par le médecin (à accepter) */}
          {!loading && !error && tab === 'received' && (
            receivedInvites.length === 0
              ? <div className="state-center"><UserPlus size={48} strokeWidth={1} /><p>Aucune demande reçue.</p></div>
              : <div className="cards-grid">
                  {receivedInvites.map(inv => (
                    <ReceivedInviteCard
                      key={inv.id_team_member}
                      invite={inv}
                      onAccepted={() => { setLoading(true); fetchTeam(); }}
                    />
                  ))}
                </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
      {selectedMember && (
        <PatientDashboardModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}