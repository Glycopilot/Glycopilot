import { useState, useEffect } from 'react';
import {
  Users, Heart, Activity, AlertTriangle,
  TrendingUp, ArrowRight, Footprints,
  Bell, CheckCircle, Droplets
} from 'lucide-react';
import authService from '../services/authService';
import { toastError } from '../services/toastService';
import Sidebar from '../components/Sidebar';
import './css/HomeScreen.css';

const apiClient = authService.getApiClient();

function getInitials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function ScoreGauge({ score }) {
  const color = score >= 70 ? '#16A34A' : score >= 40 ? '#F97316' : '#DC2626';
  const deg   = Math.round((score / 100) * 180);
  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 120 70" className="gauge-svg">
        <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round"/>
        <path
          d="M10,60 A50,50 0 0,1 110,60"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(deg / 180) * 157} 157`}
        />
      </svg>
      <div className="gauge-value" style={{ color }}>{score}<span>/100</span></div>
    </div>
  );
}

const ALERT_TYPE_LABELS = {
  hypo:         'Hypoglycémie',
  hyper:        'Hyperglycémie',
  missed_dose:  'Dose manquée',
  low_activity: 'Activité insuffisante',
  high_glucose: 'Glycémie élevée',
  low_glucose:  'Glycémie basse',
};

const SEVERITY_CONFIG = {
  critical: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Critique' },
  warning:  { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', label: 'Attention' },
  info:     { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Info' },
};

function AlertItem({ alert, patientName, triggerValue, triggerUnit }) {
  const isObj    = alert && typeof alert === 'object';
  const severity = isObj ? (alert.severity || 'critical') : 'critical';
  const cfg      = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.critical;

  const typeLabel   = isObj ? (ALERT_TYPE_LABELS[alert.type] || alert.type || 'Alerte') : (alert || 'Alerte');
  const triggeredAt = isObj ? (alert.triggeredAt || alert.triggered_at || alert.time) : null;
  const timeLabel   = triggeredAt
    ? new Date(triggeredAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  // Mesure qui a déclenché l'alerte, issue de dashboard.glucose
  const isGlycAlert = isObj && ['hypo', 'hyper', 'high_glucose', 'low_glucose'].includes(alert.type);
  const unit        = triggerUnit ?? (triggerValue != null && triggerValue > 10 ? 'mg/dL' : 'g/L');
  const glycLabel   = isGlycAlert && triggerValue != null
    ? `${parseFloat(triggerValue).toFixed(1)} ${unit}`
    : null;

  return (
    <div className="alert-row" style={{ borderLeftColor: cfg.color, background: cfg.bg }}>
      <div className="alert-dot" style={{ background: cfg.color }} />
      <div className="alert-text">
        {/* Ligne 1 : nom du patient + valeur glycémie à droite */}
        <div className="alert-top-row">
          <span className="alert-patient">{patientName}</span>
          {glycLabel && (
            <span className="alert-glyc-badge" style={{ background: cfg.color }}>
              <Droplets size={12} />
              {glycLabel}
            </span>
          )}
        </div>
        {/* Ligne 2 : type d'alerte + heure */}
        <div className="alert-bottom-row">
          <span className="alert-msg" style={{ color: cfg.color }}>{typeLabel}</span>
          {timeLabel && <span className="alert-time">{timeLabel}</span>}
        </div>
      </div>
      <AlertTriangle size={15} className="alert-icon" style={{ color: cfg.color }} />
    </div>
  );
}

function ActivityRow({ patient, dashboard }) {
  if (!dashboard) return null;
  const steps = dashboard.activity?.steps;
  const pct   = steps?.goal > 0 ? Math.min(100, Math.round((steps.value / steps.goal) * 100)) : 0;
  const name  = `${patient.first_name} ${patient.last_name}`;

  return (
    <div className="activity-row">
      <div className="act-avatar">{getInitials(patient.first_name, patient.last_name)}</div>
      <div className="act-info">
        <div className="act-name">{name}</div>
        <div className="act-bar-wrap">
          <div className="act-bar">
            <div className="act-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="act-pct">{pct}%</span>
        </div>
        <div className="act-sub">
          <Footprints size={12} /> {steps?.value?.toLocaleString() ?? '—'} / {steps?.goal?.toLocaleString() ?? '—'} pas
        </div>
      </div>
      <div className={`act-score ${dashboard.healthScore >= 70 ? 'score-good' : dashboard.healthScore >= 40 ? 'score-mid' : 'score-low'}`}>
        {dashboard.healthScore}
      </div>
    </div>
  );
}

export default function HomeScreen({ navigation }) {
  const doctor = authService.getStoredUser();
  const [team,        setTeam]        = useState({ active_patients: [], pending_invites: [] });
  const [dashboards,  setDashboards]  = useState({});
  const [glycemiaMap, setGlycemiaMap] = useState({}); // { [pid]: [records] }
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const getFmt = () => {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const start = new Date(now); start.setDate(now.getDate() - 6);
      return { start_date: fmt(start), end_date: fmt(now) };
    };
    const toArr = (data) => {
      if (Array.isArray(data)) return data;
      for (const k of ['results', 'glycemia', 'data']) if (Array.isArray(data?.[k])) return data[k];
      return [];
    };

    const load = async () => {
      try {
        const teamRes  = await apiClient.get('/doctors/care-team/my-team/');
        const teamData = teamRes.data;
        setTeam(teamData);

        const dates = getFmt();

        // Fetch dashboard + glycémie en parallèle pour chaque patient
        const entries = await Promise.allSettled(
          teamData.active_patients.map(async (m) => {
            const pid = m.patient_details.id_user;
            const qs  = new URLSearchParams({ patient_user_id: pid, ...dates }).toString();
            const [dashRes, glycRes] = await Promise.all([
              apiClient.get(`/doctors/care-team/patient-dashboard/?patient_user_id=${pid}`),
              apiClient.get(`/doctors/care-team/patient-glycemia/?${qs}`),
            ]);
            return [pid, dashRes.data, toArr(glycRes.data)];
          })
        );

        const dashMap = {};
        const glycMap = {};
        entries.forEach(e => {
          if (e.status === 'fulfilled') {
            const [pid, dash, glycRecords] = e.value;
            dashMap[pid] = dash;
            glycMap[pid] = glycRecords;
          }
        });
        setDashboards(dashMap);
        setGlycemiaMap(glycMap);
      } catch (err) {
        toastError('Erreur', 'Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Retourne la mesure anormale la plus récente correspondant au type d'alerte
  const getTriggerRecord = (pid, alertType) => {
    const records = glycemiaMap[pid] ?? [];
    const isHyper = ['hyper', 'high_glucose'].includes(alertType);
    const isHypo  = ['hypo',  'low_glucose' ].includes(alertType);
    if (!isHyper && !isHypo) return null;

    const matching = records.filter(g => {
      const v      = parseFloat(g.value);
      const isMg   = (g.unit === 'mg/dL') || v > 10;
      const high   = isMg ? v > 180 : v > 1.8;
      const low    = isMg ? v < 70  : v < 0.7;
      return isHyper ? high : low;
    });
    // Trier par date décroissante, prendre la plus récente
    matching.sort((a, b) =>
      new Date(b.measuredAt ?? b.recorded_at ?? b.date ?? 0) -
      new Date(a.measuredAt ?? a.recorded_at ?? a.date ?? 0)
    );
    return matching[0] ?? null;
  };

  const activeCount = team.active_patients.length;
  const allDashes   = Object.values(dashboards);
  const avgScore    = allDashes.length
    ? Math.round(allDashes.reduce((s, d) => s + (d.healthScore || 0), 0) / allDashes.length)
    : null;

  // Dédupliquer par (pid, type) pour n'avoir qu'une alerte par type par patient
  const allAlerts = [];
  const seen = new Set();
  team.active_patients.forEach(m => {
    const pid = m.patient_details.id_user;
    const d   = dashboards[pid];
    if (!d?.alerts?.length) return;
    d.alerts.forEach(a => {
      const alertType = typeof a === 'object' ? a.type : a;
      const key = `${pid}::${alertType}`;
      if (seen.has(key)) return;
      seen.add(key);
      const rec          = getTriggerRecord(pid, alertType);
      const triggerValue = rec ? parseFloat(rec.value) : null;
      const triggerUnit  = rec?.unit ?? (triggerValue != null && triggerValue > 10 ? 'mg/dL' : 'g/L');
      allAlerts.push({ alert: a, patient: m.patient_details, triggerValue, triggerUnit });
    });
  });

  const sortedByActivity = [...team.active_patients]
    .filter(m => dashboards[m.patient_details.id_user])
    .sort((a, b) => {
      const da = dashboards[a.patient_details.id_user];
      const db = dashboards[b.patient_details.id_user];
      return (db?.activity?.steps?.value || 0) - (da?.activity?.steps?.value || 0);
    })
    .slice(0, 5);

  return (
    <div className="home-root">
      <Sidebar activePage="home" navigation={navigation} />

      <main className="home-main">
        <div className="home-greeting">
          <div>
            <h1>{getGreeting()} {doctor?.first_name}</h1>
            <p>Voici un aperçu de l'état de santé de vos patients aujourd'hui</p>
          </div>
          <div className="home-date">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {loading ? (
          <div className="home-loading">
            <div className="big-spinner" /><p>Chargement du tableau de bord…</p>
          </div>
        ) : (
          <>
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-icon kpi-blue"><Users size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">{activeCount}</div>
                  <div className="kpi-label">Patients suivis</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-red"><AlertTriangle size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">{allAlerts.length}</div>
                  <div className="kpi-label">Alertes enregistrées</div>
                </div>
                {allAlerts.length > 0 && (
                  <div className="kpi-badge">{allAlerts.length}</div>
                )}
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-green"><Heart size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">{avgScore ?? '—'}</div>
                  <div className="kpi-label">Score santé moyen</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-teal"><CheckCircle size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">
                    {allDashes.filter(d => d.healthScore >= 70).length}
                  </div>
                  <div className="kpi-label">Patients en bonne santé</div>
                </div>
              </div>
            </div>

            <div className="home-grid">
              {/* Score moyen */}
              <div className="hcard hcard-score">
                <div className="hcard-header">
                  <div className="hcard-title"><TrendingUp size={16} /> Score de santé moyen</div>
                </div>
                {avgScore !== null
                  ? <ScoreGauge score={avgScore} />
                  : <div className="empty-mini">Aucune donnée disponible</div>
                }
                <div className="score-legend">
                  <span className="leg-good">● Bon (≥70)</span>
                  <span className="leg-mid">● Moyen (40–69)</span>
                  <span className="leg-low">● Faible (&lt;40)</span>
                </div>
                {allDashes.length > 0 && (
                  <div className="score-dist">
                    {[
                      { label: 'Bon',    count: allDashes.filter(d => d.healthScore >= 70).length,                              cls: 'dist-good' },
                      { label: 'Moyen',  count: allDashes.filter(d => d.healthScore >= 40 && d.healthScore < 70).length,        cls: 'dist-mid'  },
                      { label: 'Faible', count: allDashes.filter(d => d.healthScore < 40).length,                               cls: 'dist-low'  },
                    ].map(({ label, count, cls }) => (
                      <div key={label} className={`dist-item ${cls}`}>
                        <div className="dist-count">{count}</div>
                        <div className="dist-label">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alertes glycémiques */}
              <div className="hcard hcard-alerts">
                <div className="hcard-header">
                  <div className="hcard-title"><Bell size={16} /> Alertes glycémiques</div>
                  {allAlerts.length > 0 && <span className="alert-count-badge">{allAlerts.length}</span>}
                </div>
                {allAlerts.length === 0 ? (
                  <div className="empty-mini">
                    <CheckCircle size={32} strokeWidth={1} />
                    <p>Aucune alerte active</p>
                  </div>
                ) : (
                  <div className="alerts-list">
                    {allAlerts.map((item, i) => (
                      <AlertItem
                        key={i}
                        alert={item.alert}
                        patientName={`${item.patient.first_name} ${item.patient.last_name}`}
                        triggerValue={item.triggerValue}
                        triggerUnit={item.triggerUnit}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Activité récente */}
              <div className="hcard hcard-activity">
                <div className="hcard-header">
                  <div className="hcard-title"><Activity size={16} /> Activité récente des patients</div>
                  <button className="see-all-btn" onClick={() => navigation.navigate('/patients')}>
                    Voir tous <ArrowRight size={13} />
                  </button>
                </div>
                {sortedByActivity.length === 0 ? (
                  <div className="empty-mini">
                    <Footprints size={32} strokeWidth={1} />
                    <p>Aucune donnée d'activité</p>
                  </div>
                ) : (
                  <div className="activity-list">
                    {sortedByActivity.map(m => (
                      <ActivityRow
                        key={m.id_team_member}
                        patient={m.patient_details}
                        dashboard={dashboards[m.patient_details.id_user]}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}