import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import { countReceivedInvites } from '../lib/careTeamInvites';
import authService from '../services/authService';
import { toastError } from '../services/toastService';
import DoctorDashboardHeader from '../components/DoctorDashboardHeader';
import { extractValue, getInitials, toArr } from '../lib/utils';
import './css/HomeScreen.css';

const apiClient = authService.getApiClient();

function healthScoreOf(dash) {
  const raw = extractValue(dash?.healthScore) ?? dash?.healthScore;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function getHomeSubtitle() {
  return `${getGreeting()}. Vue d'ensemble de la santé et de l'activité de vos patients.`;
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
              <AppIcon name="droplets" size={12} />
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
      <AppIcon name="chevron" size={15} />
    </div>
  );
}

function ActivityRow({ patient, dashboard }) {
  if (!dashboard) return null;
  const stepsVal = extractValue(dashboard.activity?.steps?.value ?? dashboard.activity?.steps) ?? 0;
  const stepsGoal = extractValue(dashboard.activity?.steps?.goal) ?? 0;
  const pct = stepsGoal > 0 ? Math.min(100, Math.round((stepsVal / stepsGoal) * 100)) : 0;
  const score = healthScoreOf(dashboard);
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
          <AppIcon name="footsteps" size={12} /> {Number(stepsVal).toLocaleString('fr-FR')} / {Number(stepsGoal).toLocaleString('fr-FR')} pas
        </div>
      </div>
      <div className={`act-score ${score >= 70 ? 'score-good' : score >= 40 ? 'score-mid' : 'score-low'}`}>
        {score}
      </div>
    </div>
  );
}

export default function HomeScreen() {
  const { navigation } = useOutletContext();
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
            return [pid, dashRes.data, toArr(glycRes.data, ['results', 'glycemia', 'data'])];
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
  const receivedInviteCount = team.pending_received_count
    ?? countReceivedInvites(team.pending_invites, team.active_patients);
  const allDashes   = Object.values(dashboards);
  const avgScore    = allDashes.length
    ? Math.round(allDashes.reduce((s, d) => s + healthScoreOf(d), 0) / allDashes.length)
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
    <main className="home-main dash-main">
        <DoctorDashboardHeader
          title="Tableau de bord"
          subtitle={getHomeSubtitle()}
        />

        <div className="home-content dash-content">

        {loading ? (
          <div className="home-loading">
            <div className="big-spinner" /><p>Chargement du tableau de bord…</p>
          </div>
        ) : (
          <>
            {receivedInviteCount > 0 && (
              <div className="home-invite-banner" role="status">
                <div className="home-invite-banner-text">
                  <AppIcon name="inbox" size={18} />
                  <div>
                    <strong>
                      {receivedInviteCount === 1
                        ? '1 nouvelle demande patient'
                        : `${receivedInviteCount} nouvelles demandes patients`}
                    </strong>
                    <p>Des patients souhaitent vous ajouter à leur équipe de soins.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="home-invite-banner-btn"
                  onClick={() => navigation.navigate('/patients?tab=received')}
                >
                  Voir les demandes
                </button>
              </div>
            )}

            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-icon kpi-blue"><AppIcon name="users" size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">{activeCount}</div>
                  <div className="kpi-label">Patients suivis</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-red"><AppIcon name="alert" size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">{allAlerts.length}</div>
                  <div className="kpi-label">Alertes enregistrées</div>
                </div>
                {allAlerts.length > 0 && (
                  <div className="kpi-badge">{allAlerts.length}</div>
                )}
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-green"><AppIcon name="heart" size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">{avgScore ?? '—'}</div>
                  <div className="kpi-label">Score santé moyen</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-teal"><AppIcon name="activity" size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">
                    {allDashes.filter(d => healthScoreOf(d) >= 70).length}
                  </div>
                  <div className="kpi-label">Patients en bonne santé</div>
                </div>
              </div>
            </div>

            <div className="home-grid">
              {/* --- COLONNE GAUCHE --- */}
              <div className="home-col-left">
                {/* Carte profil style EdSquare */}
                <div className="hcard hcard-doc-profile">
                  <div className="doc-prof-title">Informations praticien</div>
                  <div className="doc-prof-body">
                    <div className="doc-prof-avatar">{getInitials(doctor?.first_name, doctor?.last_name)}</div>
                    <div className="doc-prof-info">
                      <div className="doc-prof-name">Dr. {doctor?.first_name} {doctor?.last_name}</div>
                      <div className="doc-prof-badge">Diabétologue</div>
                    </div>
                  </div>
                </div>

                {/* Score moyen */}
                <div className="hcard hcard-score">
                  <div className="hcard-header">
                    <div className="hcard-title"><AppIcon name="heart" size={16} /> Score de santé moyen</div>
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
                      { label: 'Bon',    count: allDashes.filter(d => healthScoreOf(d) >= 70).length,                              cls: 'dist-good' },
                      { label: 'Moyen',  count: allDashes.filter(d => healthScoreOf(d) >= 40 && healthScoreOf(d) < 70).length,        cls: 'dist-mid'  },
                      { label: 'Faible', count: allDashes.filter(d => healthScoreOf(d) < 40).length,                               cls: 'dist-low'  },
                      ].map(({ label, count, cls }) => (
                        <div key={label} className={`dist-item ${cls}`}>
                          <div className="dist-count">{count}</div>
                          <div className="dist-label">{label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* --- COLONNE DROITE --- */}
              <div className="home-col-right">
                {/* Alertes glycémiques */}
                <div className="hcard hcard-alerts">
                  <div className="hcard-header">
                    <div className="hcard-title"><AppIcon name="alert" size={16} /> Alertes glycémiques récentes</div>
                    {allAlerts.length > 0 && <span className="alert-count-badge">{allAlerts.length}</span>}
                  </div>
                  {allAlerts.length === 0 ? (
                    <div className="empty-mini">
                      <AppIcon name="alert" size={32} />
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
                    <div className="hcard-title"><AppIcon name="activity" size={16} /> Activité récente des patients</div>
                    <button className="see-all-btn" onClick={() => navigation.navigate('/patients')}>
                      Voir tous <AppIcon name="chevron" size={13} />
                    </button>
                  </div>
                  {sortedByActivity.length === 0 ? (
                    <div className="empty-mini">
                      <AppIcon name="alert" size={32} />
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
            </div>
          </>
        )}
        </div>
    </main>
  );
}