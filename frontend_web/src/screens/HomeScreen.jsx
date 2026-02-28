import { useState, useEffect } from 'react';
import {
  Users, Heart, Activity, AlertTriangle,
  TrendingUp, ArrowRight, Footprints,
  Bell, CheckCircle
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
        {/* Track */}
        <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round"/>
        {/* Fill */}
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

function AlertItem({ alert, patientName }) {
  return (
    <div className="alert-row">
      <div className="alert-dot" />
      <div className="alert-text">
        <span className="alert-patient">{patientName}</span>
        <span className="alert-msg">{typeof alert === 'string' ? alert : JSON.stringify(alert)}</span>
      </div>
      <AlertTriangle size={15} className="alert-icon" />
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
  const [team,       setTeam]       = useState({ active_patients: [], pending_invites: [] });
  const [dashboards, setDashboards] = useState({});
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const teamRes = await apiClient.get('/doctors/care-team/my-team/');
        const teamData = teamRes.data;
        setTeam(teamData);

        // Charger tous les dashboards en parallèle
        const entries = await Promise.allSettled(
          teamData.active_patients.map(async (m) => {
            const pid = m.patient_details.id_user;
            const res = await apiClient.get(`/doctors/care-team/patient-dashboard/?patient_user_id=${pid}`);
            return [pid, res.data];
          })
        );

        const map = {};
        entries.forEach(e => {
          if (e.status === 'fulfilled') {
            const [pid, data] = e.value;
            map[pid] = data;
          }
        });
        setDashboards(map);
      } catch (err) {
        toastError('Erreur', 'Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Calcul des stats agrégées
  const activeCount = team.active_patients.length;
  const allDashes   = Object.values(dashboards);
  const avgScore    = allDashes.length
    ? Math.round(allDashes.reduce((s, d) => s + (d.healthScore || 0), 0) / allDashes.length)
    : null;

  const allAlerts = [];
  team.active_patients.forEach(m => {
    const d = dashboards[m.patient_details.id_user];
    if (d?.alerts?.length) {
      d.alerts.forEach(a => allAlerts.push({ alert: a, patient: m.patient_details }));
    }
  });

  // Tri par score de santé pour "activité récente"
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

      {/* ── Main ── */}
      <main className="home-main">
        {/* Greeting */}
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
            {/* ── KPIs ── */}
            <div className="kpi-row">
              <div className="kpi-card">
                <div className="kpi-icon kpi-blue"><Users size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">{activeCount}</div>
                  <div className="kpi-label">Patients actifs</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-red"><AlertTriangle size={22} /></div>
                <div className="kpi-body">
                  <div className="kpi-value">{allAlerts.length}</div>
                  <div className="kpi-label">Alertes en cours</div>
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

            {/* ── Contenu principal ── */}
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
                      { label: 'Bon',   count: allDashes.filter(d => d.healthScore >= 70).length, cls: 'dist-good' },
                      { label: 'Moyen', count: allDashes.filter(d => d.healthScore >= 40 && d.healthScore < 70).length, cls: 'dist-mid' },
                      { label: 'Faible',count: allDashes.filter(d => d.healthScore < 40).length, cls: 'dist-low' },
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