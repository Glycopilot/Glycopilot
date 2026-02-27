import { useState, useEffect, useCallback } from 'react';
import {
  Users, Clock, Search, ChevronRight, UserCheck,
  Mail, Phone, Stethoscope, AlertCircle, Plus, X,
  Activity, Utensils, Pill, Droplets, Heart, Footprints,
  Flame, AlertTriangle, CheckCircle
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

/* ─── Modal : Ajouter un patient ─────────────────────────────── */
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

/* ─── Jauge de progression ───────────────────────────────────── */
function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ─── Modal : Dossier patient ────────────────────────────────── */
function PatientDashboardModal({ member, onClose }) {
  const p            = member.patient_details;
  const patientId    = p.id_user;
  const [activeTab, setActiveTab] = useState('dashboard');

  const [dashboard,    setDashboard]    = useState(null);
  const [meals,        setMeals]        = useState([]);
  const [medications,  setMedications]  = useState([]);
  const [glycemia,     setGlycemia]     = useState([]);
  const [loadingData,  setLoadingData]  = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const [d, m, med, g] = await Promise.all([
          apiClient.get(`/doctors/care-team/patient-dashboard/?patient_user_id=${patientId}`),
          apiClient.get(`/doctors/care-team/patient-meals/?patient_user_id=${patientId}`),
          apiClient.get(`/doctors/care-team/patient-medications/?patient_user_id=${patientId}`),
          apiClient.get(`/doctors/care-team/patient-glycemia/?patient_user_id=${patientId}`),
        ]);
        setDashboard(d.data);
        setMeals(m.data);
        setMedications(med.data);
        setGlycemia(g.data);
      } catch (err) {
        toastError('Erreur', 'Impossible de charger les données du patient');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [patientId]);

  const tabs = [
    { id: 'dashboard',   label: 'Résumé',      icon: <Heart size={15} /> },
    { id: 'glycemia',    label: 'Glycémie',     icon: <Droplets size={15} /> },
    { id: 'meals',       label: 'Repas',        icon: <Utensils size={15} /> },
    { id: 'medications', label: 'Médicaments',  icon: <Pill size={15} /> },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-large" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="patient-avatar-lg">{getInitials(p.first_name, p.last_name)}</div>
            <div>
              <h2>{p.first_name} {p.last_name}</h2>
              <p>{p.email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge status={member.status} />
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
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

        {/* Content */}
        <div className="modal-scroll">
          {loadingData ? (
            <div className="state-center" style={{ minHeight: 240 }}>
              <div className="big-spinner" /><p>Chargement…</p>
            </div>
          ) : (
            <>
              {/* ── Dashboard ── */}
              {activeTab === 'dashboard' && dashboard && (
                <div className="dash-grid">
                  {/* Health score */}
                  <div className="dash-card dash-score">
                    <div className="score-circle" style={{
                      background: `conic-gradient(#4A90E2 ${dashboard.healthScore * 3.6}deg, #E2E8F0 0deg)`
                    }}>
                      <span>{dashboard.healthScore}</span>
                    </div>
                    <div>
                      <div className="dash-card-title">Score de santé</div>
                      <div className="dash-card-sub">sur 100</div>
                    </div>
                  </div>

                  {/* Glucose */}
                  <div className="dash-card">
                    <div className="dash-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                      <Droplets size={18} />
                    </div>
                    <div className="dash-card-title">Glycémie</div>
                    <div className="dash-card-value">
                      {dashboard.glucose != null ? `${dashboard.glucose} mg/dL` : '—'}
                    </div>
                  </div>

                  {/* Calories */}
                  <div className="dash-card">
                    <div className="dash-card-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                      <Flame size={18} />
                    </div>
                    <div className="dash-card-title">Calories</div>
                    <div className="dash-card-value">
                      {dashboard.nutrition.calories.consumed}
                      <span className="dash-card-max">/ {dashboard.nutrition.calories.goal} kcal</span>
                    </div>
                    <ProgressBar value={dashboard.nutrition.calories.consumed} max={dashboard.nutrition.calories.goal} color="#EA580C" />
                  </div>

                  {/* Glucides */}
                  <div className="dash-card">
                    <div className="dash-card-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                      <Utensils size={18} />
                    </div>
                    <div className="dash-card-title">Glucides</div>
                    <div className="dash-card-value">
                      {dashboard.nutrition.carbs.grams}
                      <span className="dash-card-max">/ {dashboard.nutrition.carbs.goal} g</span>
                    </div>
                    <ProgressBar value={dashboard.nutrition.carbs.grams} max={dashboard.nutrition.carbs.goal} color="#16A34A" />
                  </div>

                  {/* Pas */}
                  <div className="dash-card">
                    <div className="dash-card-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                      <Footprints size={18} />
                    </div>
                    <div className="dash-card-title">Pas</div>
                    <div className="dash-card-value">
                      {dashboard.activity.steps.value.toLocaleString()}
                      <span className="dash-card-max">/ {dashboard.activity.steps.goal.toLocaleString()}</span>
                    </div>
                    <ProgressBar value={dashboard.activity.steps.value} max={dashboard.activity.steps.goal} color="#7C3AED" />
                  </div>

                  {/* Activité */}
                  <div className="dash-card">
                    <div className="dash-card-icon" style={{ background: '#FFF1F2', color: '#E11D48' }}>
                      <Activity size={18} />
                    </div>
                    <div className="dash-card-title">Minutes actives</div>
                    <div className="dash-card-value">{dashboard.activity.activeMinutes} min</div>
                  </div>

                  {/* Alertes */}
                  {dashboard.alerts.length > 0 && (
                    <div className="dash-card dash-alerts">
                      <div className="dash-card-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                        <AlertTriangle size={18} />
                      </div>
                      <div className="dash-card-title">Alertes</div>
                      {dashboard.alerts.map((a, i) => (
                        <div key={i} className="alert-item">{a}</div>
                      ))}
                    </div>
                  )}

                  {/* Prochain médicament */}
                  <div className="dash-card">
                    <div className="dash-card-icon" style={{ background: '#F0FDF4', color: '#15803D' }}>
                      <Pill size={18} />
                    </div>
                    <div className="dash-card-title">Prochain médicament</div>
                    <div className="dash-card-value">
                      {dashboard.medication.nextDose ?? '—'}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Glycémie ── */}
              {activeTab === 'glycemia' && (
                glycemia.length === 0 ? (
                  <div className="empty-state">
                    <Droplets size={40} strokeWidth={1} />
                    <p>Aucune mesure de glycémie enregistrée</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>Date</th><th>Valeur</th><th>Type</th><th>Note</th></tr>
                    </thead>
                    <tbody>
                      {glycemia.map((g, i) => (
                        <tr key={i}>
                          <td>{g.measured_at ? new Date(g.measured_at).toLocaleString('fr-FR') : '—'}</td>
                          <td><strong>{g.value} mg/dL</strong></td>
                          <td>{g.measurement_type || '—'}</td>
                          <td>{g.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* ── Repas ── */}
              {activeTab === 'meals' && (
                meals.length === 0 ? (
                  <div className="empty-state">
                    <Utensils size={40} strokeWidth={1} />
                    <p>Aucun repas enregistré</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>Date</th><th>Repas</th><th>Calories</th><th>Glucides</th></tr>
                    </thead>
                    <tbody>
                      {meals.map((m, i) => (
                        <tr key={i}>
                          <td>{m.date ? new Date(m.date).toLocaleDateString('fr-FR') : '—'}</td>
                          <td>{m.name || m.meal_type || '—'}</td>
                          <td>{m.calories ?? '—'} kcal</td>
                          <td>{m.carbs ?? '—'} g</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* ── Médicaments ── */}
              {activeTab === 'medications' && (
                medications.length === 0 ? (
                  <div className="empty-state">
                    <Pill size={40} strokeWidth={1} />
                    <p>Aucun médicament enregistré</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>Médicament</th><th>Dosage</th><th>Fréquence</th><th>Statut</th></tr>
                    </thead>
                    <tbody>
                      {medications.map((m, i) => (
                        <tr key={i}>
                          <td><strong>{m.name || '—'}</strong></td>
                          <td>{m.dosage || '—'}</td>
                          <td>{m.frequency || '—'}</td>
                          <td>
                            {m.is_active
                              ? <span className="status-badge badge-active">Actif</span>
                              : <span className="status-badge badge-inactive">Inactif</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Card patient ───────────────────────────────────────────── */
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

function InviteCard({ invite }) {
  return (
    <div className="patient-card invite-card">
      <div className="card-top">
        <div className="patient-avatar invite-avatar"><Mail size={20} /></div>
        <div className="patient-meta">
          <h3 className="patient-name">{invite.invitation_email}</h3>
          <span className="status-badge badge-pending">Invitation envoyée</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────────── */
export default function PatientsScreen({ navigation }) {
  const [data,           setData]           = useState({ active_patients: [], pending_invites: [] });
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState('');
  const [tab,            setTab]            = useState('active');
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

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

  const activeCount  = data.active_patients.length;
  const pendingCount = data.pending_invites.length;

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
            <div><div className="stat-value">{pendingCount}</div><div className="stat-label">Invitations en attente</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-teal"><Stethoscope size={20} /></div>
            <div><div className="stat-value">{activeCount + pendingCount}</div><div className="stat-label">Total équipe</div></div>
          </div>
        </div>

        <div className="toolbar">
          <div className="tabs">
            <button className={`tab ${tab === 'active'  ? 'tab-active' : ''}`} onClick={() => setTab('active')}>
              Actifs <span className="tab-count">{activeCount}</span>
            </button>
            <button className={`tab ${tab === 'pending' ? 'tab-active' : ''}`} onClick={() => setTab('pending')}>
              En attente <span className="tab-count">{pendingCount}</span>
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
          {!loading && !error && tab === 'active' && (
            filtered.length === 0
              ? <div className="state-center"><Users size={48} strokeWidth={1} /><p>{search ? 'Aucun résultat.' : 'Aucun patient actif pour le moment.'}</p></div>
              : <div className="cards-grid">
                  {filtered.map(m => (
                    <PatientCard key={m.id_team_member} member={m} onClick={() => setSelectedMember(m)} />
                  ))}
                </div>
          )}
          {!loading && !error && tab === 'pending' && (
            data.pending_invites.length === 0
              ? <div className="state-center"><Clock size={48} strokeWidth={1} /><p>Aucune invitation en attente.</p></div>
              : <div className="cards-grid">
                  {data.pending_invites.map((inv, i) => <InviteCard key={i} invite={inv} />)}
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