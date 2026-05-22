import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import { dedupeDoctorTeamLists } from '../lib/careTeamInvites';
import { UiChevronRight, UiClose } from '../components/UiIcon';
import authService from '../services/authService';
import { toastError, toastSuccess } from '../services/toastService';
import DoctorDashboardHeader from '../components/DoctorDashboardHeader';
import { getInitials, extractValue, toArr, hba1cBand, parseDashboardGlucose } from '../lib/utils';

import './css/patients.css';

const apiClient = authService.getApiClient();

function healthScoreOf(dash) {
  const raw = extractValue(dash?.healthScore) ?? dash?.healthScore;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatNextDose(nextDose) {
  if (!nextDose) return null;
  if (typeof nextDose === 'string') return nextDose;

  const label = nextDose.label || nextDose.medicationName || nextDose.medication_name || nextDose.name;
  const time = nextDose.time || nextDose.scheduledAt || nextDose.scheduled_at || nextDose.datetime;

  if (label && time) return `${label} - ${time}`;
  return label || time || null;
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
            <div className="modal-icon-wrap"><AppIcon name="user-plus" size={20} /></div>
            <div>
              <h2>Ajouter un patient</h2>
              <p>Invitez un patient à rejoindre votre équipe de soins</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><AppIcon name="x" size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="mfield">
            <label>Email du patient <span className="required">*</span></label>
            <div className="minput-wrap">
              <AppIcon name="mail" size={15} />
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
              <AppIcon name="phone" size={15} />
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
            <AppIcon name="alert" size={13} /> {alert}
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

  return (
    <div className="alert-card" style={{ background: c.bg, borderColor: c.border }}>
      <div className="alert-card-bar" style={{ background: c.bar }} />
      <div className="alert-card-body">
        <div className="alert-card-title" style={{ color: c.text }}>
          <AppIcon name="alert" size={13} />
          <span>{message}</span>
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

function HbA1cCard({ value, unit, measuredAt, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const band = hba1cBand(value);

  const startEdit = () => {
    setDraft(value != null ? String(value) : '');
    setEditing(true);
  };

  const cancel = () => {
    setDraft('');
    setEditing(false);
  };

  const save = async () => {
    const parsed = parseFloat(String(draft).replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 3 || parsed > 20) {
      toastError('Valeur invalide', "L'HbA1c doit être un nombre entre 3 et 20 %");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
      setEditing(false);
    } catch {
      // toast déjà affiché par onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hba1c-card" data-testid="hba1c-card">
      <div className="hba1c-top">
        <div className="hba1c-icon"><AppIcon name="chart" size={18} /></div>
        <div className="hba1c-meta">
          <span className="hba1c-label">HbA1c (3 derniers mois)</span>
          {measuredAt && (
            <span className="hba1c-date">
              Dernière mesure le {new Date(measuredAt).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
        {!editing && (
          <button
            className="hba1c-edit-btn"
            onClick={startEdit}
            aria-label={value != null ? "Modifier l'HbA1c" : "Renseigner l'HbA1c"}
          >
            <AppIcon name="chart" size={14} /> {value != null ? 'Modifier' : 'Renseigner'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="hba1c-edit">
          <div className="hba1c-input-wrap">
            <input
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="Ex : 6.8"
              aria-label="Valeur HbA1c"
              autoFocus
            />
            <span className="hba1c-unit-input">{unit || '%'}</span>
          </div>
          <div className="hba1c-actions">
            <button className="hba1c-cancel" onClick={cancel} disabled={saving}>Annuler</button>
            <button className="hba1c-save" onClick={save} disabled={saving}>
              {saving
                ? <><span className="mini-spinner" /> Enregistrement…</>
                : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : (
        <div className="hba1c-display">
          {value != null ? (
            <>
              <span className="hba1c-value" style={{ color: band.color }}>
                {Number(value).toFixed(1)}
              </span>
              <span className="hba1c-unit-display">{unit || '%'}</span>
              <span className="hba1c-band" style={{ color: band.color, background: band.bg }}>
                {band.label}
              </span>
            </>
          ) : (
            <span className="hba1c-empty">Aucune valeur renseignée</span>
          )}
        </div>
      )}
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
  const getPeriodDates = useCallback((p = period) => {
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
  }, [period, customStart, customEnd]);

  const refreshDashboard = useCallback(async () => {
    const res = await apiClient.get(`/doctors/care-team/patient-dashboard/?patient_user_id=${patientId}`);
    setDashboard(res.data);
    return res.data;
  }, [patientId]);

  useEffect(() => {
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
        setMeals(toArr(m.data, ['results', 'meals', 'data']));
        setMedications(toArr(med.data, ['results', 'medications', 'data']));
        setGlycemia(toArr(g.data, ['results', 'glycemia', 'data']));
      } catch (err) {
        toastError('Erreur', 'Impossible de charger les données du patient');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [patientId, period, customStart, customEnd, getPeriodDates]);

  const handleSaveHba1c = async (newValue) => {
    try {
      await apiClient.patch(`/doctors/patients/${patientId}/medical/`, { hba1c: newValue });
      toastSuccess('HbA1c mis à jour', `Nouvelle valeur : ${newValue.toFixed(1)} %`);
      await refreshDashboard();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message;
      toastError('Erreur', msg);
      throw err;
    }
  };

  const tabs = [
    { id: 'dashboard',   label: 'Vue d\'ensemble', icon: <AppIcon name="grid" size={15} /> },
    { id: 'glycemia',    label: 'Glycémie',         icon: <AppIcon name="droplets" size={15} /> },
    { id: 'meals',       label: 'Repas',            icon: <AppIcon name="utensils" size={15} /> },
    { id: 'medications', label: 'Traitements',      icon: <AppIcon name="pill" size={15} /> },
  ];

  const glycValues = glycemia.map(g => parseFloat(g.value)).filter(v => !isNaN(v));
  const glycAvg    = glycValues.length ? (glycValues.reduce((a, b) => a + b, 0) / glycValues.length).toFixed(2) : null;

  const glucoseParsed = parseDashboardGlucose(dashboard?.glucose);
  const dash = dashboard ? {
    healthScore: extractValue(dashboard.healthScore) ?? dashboard.healthScore ?? 0,
    alerts:      dashboard.alerts ?? [],
    glucose:     glucoseParsed.value,
    glucoseUnit: glucoseParsed.unit,
    glucoseDate: glucoseParsed.recordedAt,
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
      nextDose: formatNextDose(dashboard.medication?.nextDose),
    },
    hba1c: (() => {
      const fromApi = extractValue(dashboard.hba1c);
      if (fromApi == null) {
        return { value: null, unit: '%', measuredAt: null };
      }
      return {
        value: fromApi,
        unit: typeof dashboard.hba1c === 'object' ? (dashboard.hba1c?.unit ?? '%') : '%',
        measuredAt: typeof dashboard.hba1c === 'object' ? (dashboard.hba1c?.measuredAt ?? null) : null,
      };
    })(),
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
                {p.email && <span><AppIcon name="mail" size={12} /> {p.email}</span>}
                {p.phone_number && <span><AppIcon name="phone" size={12} /> {p.phone_number}</span>}
                <StatusBadge status={member.status} />
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><AppIcon name="x" size={20} /></button>
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

                  <HbA1cCard
                    value={dash.hba1c.value}
                    unit={dash.hba1c.unit}
                    measuredAt={dash.hba1c.measuredAt}
                    onSave={handleSaveHba1c}
                  />

                  {/* Ligne 1 : score + alertes */}
                  <div className="pdm-row pdm-row-top">
                    <HealthScore score={dash.healthScore} />

                    <div className="pdm-alerts-block">
                      <div className="pdm-section-title"><AppIcon name="alert" size={14} /> Alertes récentes</div>
                      {(!dash.alerts || dash.alerts.length === 0) ? (
                        <div className="pdm-no-alert"><AppIcon name="check" size={16} /> Aucune alerte active</div>
                      ) : (
                        <div className="pdm-alerts-list">
                          {dash.alerts.map((a, i) => <AlertCard key={i} alert={a} index={i} />)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ligne 2 : métriques */}
                  <div className="pdm-section-title" style={{ marginTop: 20 }}><AppIcon name="activity" size={14} /> Métriques du jour</div>
                  <div className="pdm-metrics-grid">
                    <MetricCard
                      icon={<AppIcon name="droplets" size={18} />}
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
                      icon={<AppIcon name="flame" size={18} />}
                      label="Calories"
                      value={dash.nutrition.calories.consumed}
                      unit=" kcal"
                      goal={dash.nutrition.calories.goal}
                      color="#EA580C" colorBg="#FFF7ED"
                    />
                    <MetricCard
                      icon={<AppIcon name="utensils" size={18} />}
                      label="Glucides"
                      value={dash.nutrition.carbs.grams}
                      unit=" g"
                      goal={dash.nutrition.carbs.goal}
                      color="#16A34A" colorBg="#F0FDF4"
                    />
                    <MetricCard
                      icon={<AppIcon name="footsteps" size={18} />}
                      label="Pas"
                      value={dash.activity.steps.value != null
                        ? Number(dash.activity.steps.value).toLocaleString('fr-FR')
                        : '—'}
                      goal={dash.activity.steps.goal}
                      color="#7C3AED" colorBg="#F5F3FF"
                    />
                    <MetricCard
                      icon={<AppIcon name="activity" size={18} />}
                      label="Minutes actives"
                      value={dash.activity.activeMinutes}
                      unit=" min"
                      color="#E11D48" colorBg="#FFF1F2"
                      goalLabel="Objectif : 30 min/jour"
                    />
                    <MetricCard
                      icon={<AppIcon name="pill" size={18} />}
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
                    <AppIcon name="droplets" size={40} />
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
                          <AppIcon name="filter-x" size={12} /> Effacer le filtre
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
                                      <AppIcon name="trend-up" size={11} /> Hyperglycémie
                                    </span>
                                  ) : isLow ? (
                                    <span className="gly-status-badge gly-status-low">
                                      <AppIcon name="trend-down" size={11} /> Hypoglycémie
                                    </span>
                                  ) : (
                                    <span className="gly-status-badge gly-status-normal">
                                      <AppIcon name="minus" size={11} /> Normal
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
                        <AppIcon name="filter-x" size={20} />
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
                    <AppIcon name="utensils" size={40} />
                    <p>Aucun repas enregistré</p>
                  </div>
                ) : (
                  <div className="pdm-meals">
                    {/* Résumé nutrition */}
                    <div className="meals-summary">
                      <div className="meals-sum-item">
                        <AppIcon name="flame" size={16} />
                        <span className="meals-sum-val">{meals.reduce((acc, m) => acc + (m.calories ?? m.total_calories ?? m.kcal ?? m.energy ?? 0), 0)}</span>
                        <span className="meals-sum-lbl">kcal totales</span>
                      </div>
                      <div className="meals-sum-sep" />
                      <div className="meals-sum-item">
                        <AppIcon name="utensils" size={16} />
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
                    <AppIcon name="pill" size={40} />
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
                                  <div className="med-icon-sm"><AppIcon name="pill" size={13} /></div>
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
        <div className="info-row"><AppIcon name="mail" size={14} /><span>{p.email}</span></div>
        {p.phone_number && <div className="info-row"><AppIcon name="phone" size={14} /><span>{p.phone_number}</span></div>}
      </div>
      <div className="card-footer">
        <button className="card-btn" onClick={onClick}>
          Voir le dossier <AppIcon name="chevron" size={14} />
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
        <div className="patient-avatar invite-avatar-sent"><AppIcon name="send" size={18} /></div>
        <div className="patient-meta">
          <h3 className="patient-name">{p?.first_name ? `${p.first_name} ${p.last_name}` : invite.invitation_email || '—'}</h3>
          <span className="status-badge badge-pending">Invitation envoyée</span>
        </div>
      </div>
      <div className="card-body" style={{ marginTop: 12 }}>
        {p?.email && <div className="info-row"><AppIcon name="mail" size={14} /><span>{p.email}</span></div>}
        {p?.phone_number && <div className="info-row"><AppIcon name="phone" size={14} /><span>{p.phone_number}</span></div>}
      </div>
      <div className="invite-waiting">
        <AppIcon name="clock" size={13} /> En attente de la réponse du patient
      </div>
    </div>
  );
}

function ReceivedInviteCard({ invite, onAccepted, onDeclined }) {
  const p = invite.patient_details;
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const handleAccept = async (e) => {
    if (e) e.stopPropagation();
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

  const handleDecline = async (e) => {
    if (e) e.stopPropagation();
    setDeclining(true);
    try {
      await apiClient.post('/doctors/care-team/decline-invitation/', {
        id_team_member: invite.id_team_member,
      });
      toastSuccess('Demande refusée', `La demande de ${p?.first_name ?? ''} ${p?.last_name ?? ''} a été refusée`);
      onDeclined?.();
    } catch (err) {
      const status = err.response?.status;
      if (status === 404 || status === 405) {
        toastError('Bientôt disponible', "Le refus d'invitation n'est pas encore activé côté serveur.");
      } else {
        const msg = err.response?.data?.error || err.response?.data?.detail || err.message;
        toastError('Erreur', msg);
      }
    } finally {
      setDeclining(false);
      setShowDeclineModal(false);
    }
  };

  return (
    <>
      <div className="patient-card invite-card">
        <div className="invite-badge-top">Demande reçue</div>
        <div className="card-top" style={{ marginTop: 8 }}>
          <div className="patient-avatar" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            {getInitials(p?.first_name, p?.last_name)}
          </div>
          <div className="patient-meta">
            <h3 className="patient-name">{p?.first_name ? `${p.first_name} ${p.last_name}` : '—'}</h3>
            <span className="status-badge" style={{ background: '#F1F5F9', color: '#64748B' }}>Souhaite que vous deveniez son médecin</span>
          </div>
        </div>
        <div className="card-body" style={{ marginTop: 12 }}>
          {p?.email && <div className="info-row"><AppIcon name="mail" size={14} /><span>{p.email}</span></div>}
          {p?.phone_number && <div className="info-row"><AppIcon name="phone" size={14} /><span>{p.phone_number}</span></div>}
        </div>

        <div className="card-footer card-footer-split">
          <button
            className="card-btn-decline"
            onClick={(e) => { e.stopPropagation(); setShowDeclineModal(true); }}
            disabled={accepting}
          >
            Refuser
          </button>
          <button className="card-btn-accept" onClick={handleAccept} disabled={accepting}>
            {accepting
              ? <><span className="mini-spinner-sm" /> En cours…</>
              : 'Accepter la demande'}
          </button>
        </div>
      </div>

      {showDeclineModal && (
        <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon-wrap modal-icon-neutral"><AppIcon name="user-x" size={20} /></div>
                <div>
                  <h2>Refuser la demande</h2>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDeclineModal(false)}><AppIcon name="x" size={20} /></button>
            </div>
            <div className="modal-body" style={{ fontSize: 14, color: 'var(--muted)' }}>
              <p>Êtes-vous sûr de vouloir refuser la demande de <strong>{p?.first_name} {p?.last_name}</strong> ?</p>
              <p style={{ marginTop: 8 }}>Le patient ne pourra plus vous solliciter tant qu'il n'envoie pas une nouvelle invitation.</p>
            </div>
            <div className="modal-footer">
              <button className="mbt-secondary" onClick={() => setShowDeclineModal(false)} disabled={declining}>Annuler</button>
              <button type="button" className="mbt-primary mbt-danger" onClick={handleDecline} disabled={declining}>
                {declining ? <><span className="mini-spinner" /> Refus…</> : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PatientTableRow({ member, type, dashboard, onClick, onAccepted, onDeclined }) {
  const p = member.patient_details ?? {};

  const score = type === 'active' ? healthScoreOf(dashboard) : null;
  const { value: glucoseVal, unit: glucoseUnit } = parseDashboardGlucose(dashboard?.glucose);


  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const handleAccept = async (e) => {
    if (e) e.stopPropagation();
    setAccepting(true);
    try {
      await authService.getApiClient().post('/doctors/care-team/accept-invitation/', {
        id_team_member: member.id_team_member,
      });
      toastSuccess('Demande validée', `${p?.first_name ?? ''} ${p?.last_name ?? ''} a rejoint votre équipe`);
      onAccepted?.();
    } catch (err) {
      toastError('Erreur', err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async (e) => {
    if (e) e.stopPropagation();
    setDeclining(true);
    try {
      await authService.getApiClient().post('/doctors/care-team/decline-invitation/', {
        id_team_member: member.id_team_member,
      });
      toastSuccess('Demande refusée', `La demande de ${p?.first_name ?? ''} ${p?.last_name ?? ''} a été refusée`);
      onDeclined?.();
    } catch (err) {
      toastError('Erreur', err.message);
    } finally {
      setDeclining(false);
      setShowDeclineModal(false);
    }
  };

  return (
    <>
      <tr className={`patient-tr pt-row-${type}`} onClick={type === 'active' ? onClick : undefined} style={{ cursor: type === 'active' ? 'pointer' : 'default' }}>
        <td>
          <div className="pt-name-cell">
            <div className={`patient-avatar pt-avatar pt-av-${type}`}>
              {type === 'sent' ? <AppIcon name="send" size={16} /> : getInitials(p.first_name, p.last_name)}
            </div>
            <div>
              <div className="pt-name">
                {type === 'sent' && !p?.first_name ? (member.invitation_email || '—') : `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || '—'}
              </div>
              <div className="pt-email">{p.email || '—'}</div>
            </div>
          </div>
        </td>
        <td>
          {type === 'active' ? (
            <span className="tb-status-badge tb-active">Actif</span>
          ) : type === 'sent' ? (
            <span className="tb-status-badge tb-sent">En attente</span>
          ) : (
            <span className="tb-status-badge tb-pending">À valider</span>
          )}
        </td>
        <td>
          {type === 'active' && score != null ? (
            <span className="pt-score-text">{score}/100</span>
          ) : <span className="pt-muted">—</span>}
        </td>
        <td>
          {type === 'active' && glucoseVal != null ? (
            <div className="pt-glucose">
               <span className="pt-glucose-val">{glucoseVal}</span>
               <span className="pt-glucose-unit">{glucoseUnit}</span>
            </div>
          ) : <span className="pt-muted">—</span>}
        </td>
        <td>
          <div className="pt-actions-col">
            {type === 'active' && (
              <button className="pt-action-btn" onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <AppIcon name="eye" size={14} /> Ouvrir
              </button>
            )}
            {type === 'sent' && (
              <span className="pt-muted">—</span>
            )}
            {type === 'received' && (
              <div className="pt-actions-row">
                <button type="button" className="pt-btn-accept" onClick={handleAccept} disabled={accepting || declining}>
                  {accepting ? '…' : <><AppIcon name="check" size={14} /> Accepter</>}
                </button>
                <button type="button" className="pt-btn-decline" onClick={(e) => { e.stopPropagation(); setShowDeclineModal(true); }} disabled={declining}>
                  <AppIcon name="x" size={14} /> Refuser
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {showDeclineModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon-wrap modal-icon-neutral"><AppIcon name="user-x" size={20} /></div>
                <div>
                  <h2>Refuser la demande</h2>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDeclineModal(false)}><AppIcon name="x" size={20} /></button>
            </div>
            <div className="modal-body" style={{ fontSize: 14, color: 'var(--muted)' }}>
              <p>Êtes-vous sûr de vouloir refuser la demande de <strong>{p?.first_name} {p?.last_name}</strong> ?</p>
            </div>
            <div className="modal-footer">
              <button className="mbt-secondary" onClick={() => setShowDeclineModal(false)} disabled={declining}>Annuler</button>
              <button type="button" className="mbt-primary mbt-danger" onClick={handleDecline} disabled={declining}>
                {declining ? 'Refus…' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function PatientsDataTable({ rows, dashboards, onOpenPatient, onAccepted, onDeclined }) {
  if (!rows.length) return null;

  return (
    <div className="patients-table-wrap">
      <table className="patients-table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Statut</th>
            <th>Score santé</th>
            <th>Dernière glycémie</th>
            <th className="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <PatientTableRow
              key={m.id_team_member}
              member={m}
              type={m._type}
              dashboard={dashboards[m.patient_details?.id_user]}
              onClick={() => onOpenPatient(m)}
              onAccepted={onAccepted}
              onDeclined={onDeclined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PatientsStatusFilter({ value, onChange, receivedCount }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const options = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'active', label: 'Actifs' },
    {
      value: 'received',
      label: receivedCount > 0 ? `Demandes reçues (${receivedCount})` : 'Demandes reçues',
    },
    { value: 'sent', label: 'Invitations envoyées' },
  ];

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  return (
    <div className="patients-status-filter" ref={rootRef}>
      <button
        type="button"
        className={`patients-filter-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filtrer par statut"
      >
        <span className="patients-filter-value">{selected.label}</span>
        <AppIcon name="chevron" size={14} className={`patients-filter-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      {isOpen && (
        <ul className="patients-filter-dropdown" role="listbox" aria-label="Statuts">
          {options.map((opt) => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`patients-filter-option ${opt.value === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function filterMembers(members, roleFilter, searchQuery) {
  let list = members;
  if (roleFilter !== 'all') {
    list = list.filter((m) => m._type === roleFilter);
  }
  const q = searchQuery.trim().toLowerCase();
  if (!q) return list;
  return list.filter((m) => {
    const p = m.patient_details ?? {};
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      m.invitation_email?.toLowerCase().includes(q)
    );
  });
}

export default function PatientsScreen() {
  const { navigation } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [data,           setData]           = useState({ active_patients: [], pending_invites: [] });
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState('');
  const [roleFilter,     setRoleFilter]     = useState('all');
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [dashboards,     setDashboards]     = useState({});

  const fetchTeam = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await apiClient.get('/doctors/care-team/my-team/');
      const teamData = res.data ?? {};
      const pending = teamData.pending_invites ?? [];
      const active = teamData.active_patients ?? [];
      setData({ ...teamData, pending_invites: pending, active_patients: active });

      const activeIds = active
        .map(m => m.patient_details?.id_user)
        .filter(Boolean);
      if (activeIds.length > 0) {
        const dashPromises = activeIds.map(pid =>
          apiClient.get(`/doctors/care-team/patient-dashboard/?patient_user_id=${pid}`)
            .then(r => ({ pid, data: r.data }))
            .catch(() => ({ pid, data: null }))
        );
        const results = await Promise.all(dashPromises);
        const dashMap = {};
        results.forEach(r => {
          if (r.data) dashMap[r.pid] = r.data;
        });
        setDashboards(dashMap);
      } else {
        setDashboards({});
      }
    } catch (err) {
      setError('Impossible de charger la liste des patients.');
      toastError('Erreur', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleAddSuccess = () => {
    setShowAddModal(false);
    setLoading(true);
    fetchTeam();
  };

  const team = dedupeDoctorTeamLists(data);
  const receivedCount = team.receivedInvites.length;
  const activeCount = team.activePatients.length;
  const sentCount = team.sentInvites.length;

  const refreshAfterInviteAction = () => fetchTeam({ silent: true });

  const pendingRows = filterMembers(
    team.receivedInvites.map((m) => ({ ...m, _type: 'received' })),
    roleFilter,
    search
  );
  const activeRows = filterMembers(
    team.activePatients.map((m) => ({ ...m, _type: 'active' })),
    roleFilter,
    search
  );
  const sentRows = filterMembers(
    team.sentInvites.map((m) => ({ ...m, _type: 'sent' })),
    roleFilter,
    search
  );
  const rosterRows = [...activeRows, ...sentRows];
  const showPendingSection = roleFilter === 'all' || roleFilter === 'received';
  const showRosterSection = roleFilter === 'all' || roleFilter === 'active' || roleFilter === 'sent';
  const hasAnyRow = pendingRows.length + rosterRows.length > 0;

  return (
    <main className="patients-main dash-main">
        <DoctorDashboardHeader
          title="Mes patients"
          subtitle="Gérez votre équipe de soins, les invitations et les dossiers patients."
          actions={(
            <button type="button" className="dash-btn-primary" onClick={() => setShowAddModal(true)}>
              <AppIcon name="user-plus" size={16} /> Ajouter un patient
            </button>
          )}
        />

        <div className="dash-content">
        <div className="patients-stats">
          <div className="patients-stat">
            <span className="patients-stat-value">{activeCount}</span>
            <span className="patients-stat-label">Patients actifs</span>
          </div>
          <div className="patients-stat">
            <span className="patients-stat-value">{receivedCount}</span>
            <span className="patients-stat-label">Demandes à traiter</span>
          </div>
          <div className="patients-stat">
            <span className="patients-stat-value">{sentCount}</span>
            <span className="patients-stat-label">Invitations envoyées</span>
          </div>
        </div>

        <div className="toolbar tb-users">
          <div className="search-wrapper">
            <AppIcon name="search" size={15} />
            <input
              type="text"
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <PatientsStatusFilter
            value={roleFilter}
            onChange={setRoleFilter}
            receivedCount={receivedCount}
          />
        </div>

        <div className="patients-content">
          {loading && (
            <div className="state-center"><div className="big-spinner" /><p>Chargement…</p></div>
          )}
          {!loading && error && (
            <div className="state-center state-error"><AppIcon name="alert-circle" size={40} /><p>{error}</p></div>
          )}

          {!loading && !error && !hasAnyRow && (
            <div className="state-center">
              <AppIcon name="users" size={48} />
              <p>{search ? 'Aucun résultat pour cette recherche.' : 'Aucun patient pour le moment.'}</p>
            </div>
          )}

          {!loading && !error && hasAnyRow && (
            <>
              {showPendingSection && pendingRows.length > 0 && (
                <section className="patients-section patients-section-pending">
                  <div className="patients-section-head">
                    <h2>Demandes à traiter</h2>
                    <span className="patients-section-badge">{pendingRows.length}</span>
                  </div>
                  <p className="patients-section-desc">
                    Demandes d&apos;ajout à votre équipe de soins.
                  </p>
                  <PatientsDataTable
                    rows={pendingRows}
                    dashboards={dashboards}
                    onOpenPatient={setSelectedMember}
                    onAccepted={refreshAfterInviteAction}
                    onDeclined={refreshAfterInviteAction}
                  />
                </section>
              )}

              {showRosterSection && rosterRows.length > 0 && (
                <section className="patients-section">
                  <div className="patients-section-head">
                    <h2>{roleFilter === 'sent' ? 'Invitations en attente' : 'Patients suivis'}</h2>
                    <span className="patients-section-badge patients-section-badge-muted">{rosterRows.length}</span>
                  </div>
                  <PatientsDataTable
                    rows={rosterRows}
                    dashboards={dashboards}
                    onOpenPatient={setSelectedMember}
                    onAccepted={refreshAfterInviteAction}
                    onDeclined={refreshAfterInviteAction}
                  />
                </section>
              )}

              {showPendingSection && roleFilter === 'received' && pendingRows.length === 0 && (
                <div className="state-center state-empty-section">
                  <AppIcon name="inbox" size={40} />
                  <p>Aucune demande en attente.</p>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      {refreshing && !loading && (
        <div className="patients-refresh-hint" aria-live="polite">Mise à jour…</div>
      )}

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
    </main>
  );
}
