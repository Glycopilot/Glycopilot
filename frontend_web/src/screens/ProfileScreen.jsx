import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Stethoscope, CreditCard,
  Save, Send, CheckCircle, Pencil, X
} from 'lucide-react';
import authService from '../services/authService';
import passwordService from '../services/passwordService';
import { toastError, toastSuccess } from '../services/toastService';
import Sidebar from '../components/Sidebar';
import './css/profile.css';

const apiClient = authService.getApiClient();

/**
 * Extrait les données "à plat" depuis la réponse de /api/auth/me/
 * afin de simplifier leur utilisation dans le composant.
 */
function flattenAuthMe(data) {
  const identity = data?.identity ?? {};
  const profile  = identity?.profiles?.[0] ?? {};
  const doctor   = profile?.doctor_details ?? {};
  const user     = doctor?.user_details ?? {};

  return {
    // identité
    id_auth:    data?.id_auth,
    id_user:    identity?.id_user,
    email:      data?.email ?? user?.email,
    first_name: identity?.first_name ?? user?.first_name,
    last_name:  identity?.last_name  ?? user?.last_name,
    phone_number: user?.phone_number,
    // profil médecin
    doctor_id:              doctor?.doctor_id,
    license_number:         doctor?.license_number,
    verification_status:    doctor?.verification_status,
    specialty:              doctor?.specialty,
    medical_center_name:    doctor?.medical_center_name,
    medical_center_address: doctor?.medical_center_address,
  };
}

function Field({ label, value, icon, editable = true, onChange, type = 'text', locked = false, hint }) {
  return (
    <div className="pfield">
      <label className="pfield-label">
        {label}
        {locked && <span className="locked-tag">Non modifiable</span>}
      </label>
      <div className={`pfield-input ${!editable || locked ? 'pfield-disabled' : ''}`}>
        {icon && <span className="pfield-icon">{icon}</span>}
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange && onChange(e.target.value)}
          disabled={!editable || locked}
          placeholder={locked ? '—' : `Votre ${label.toLowerCase()}`}
        />
      </div>
      {hint && <p className="pfield-hint">{hint}</p>}
    </div>
  );
}

export default function ProfileScreen({ navigation }) {
  const [doctor,    setDoctor]    = useState({});
  const [form,      setForm]      = useState({});
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loading,   setLoading]   = useState(true);

  /* ── Chargement initial ─────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    apiClient
      .get('/auth/me/')
      .then(res => {
        const flat = flattenAuthMe(res.data);
        setDoctor(flat);
        setForm(flat);
      })
      .catch(() => {
        // Fallback sur le stockage local (ancien format)
        const stored = authService.getStoredUser();
        const flat = stored ? flattenAuthMe(stored) : {};
        setDoctor(flat);
        setForm(flat);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Actions ────────────────────────────────────────────────────── */
  const startEdit  = () => { setForm({ ...doctor }); setEditing(true);  };
  const cancelEdit = () => { setForm({ ...doctor }); setEditing(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Mettre à jour les infos user (téléphone, prénom, nom)
      const userPayload = {
        first_name:   form.first_name,
        last_name:    form.last_name,
        phone_number: form.phone_number || '',
      };
      await apiClient.patch('/users/me/', userPayload);

      // 2. Mettre à jour les infos médecin (spécialité, centre)
      // Si votre API expose une route dédiée pour le profil médecin, adaptez ici.
      // En l'absence d'une telle route séparée dans la spec fournie,
      // on suppose que /users/me/ accepte aussi ces champs (ou on les ignore).
      // Si une route /doctors/me/ existe, décommentez :
      /*
      const doctorPayload = {
        specialty:              form.specialty,
        medical_center_name:    form.medical_center_name || '',
        medical_center_address: form.medical_center_address || '',
      };
      await apiClient.patch('/doctors/me/', doctorPayload);
      */

      // 3. Re-fetch les données fraîches depuis /auth/me/
      const res = await apiClient.get('/auth/me/');
      const updated = flattenAuthMe(res.data);
      setDoctor(updated);
      setForm(updated);

      // Mettre à jour le stockage local
      localStorage.setItem('user', JSON.stringify(res.data));

      toastSuccess('Profil mis à jour', 'Vos informations ont été sauvegardées');
      setEditing(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message;
      toastError('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!doctor.email) return;
    setResetting(true);
    try {
      await passwordService.requestPasswordReset(doctor.email);
      setResetSent(true);
      toastSuccess('Email envoyé', 'Consultez votre boîte mail pour réinitialiser votre mot de passe');
    } catch (err) {
      toastError('Erreur', err.message);
    } finally {
      setResetting(false);
    }
  };

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  /* ── Rendu ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="profile-root">
        <Sidebar activePage="profile" navigation={navigation} />
        <main className="profile-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="mini-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </main>
      </div>
    );
  }

  const display = editing ? form : doctor;

  return (
    <div className="profile-root">
      <Sidebar activePage="profile" navigation={navigation} />

      <main className="profile-main">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-hero">
            <div className="profile-big-avatar">
              {(doctor.first_name?.[0] || '') + (doctor.last_name?.[0] || '')}
            </div>
            <div>
              <h1>{doctor.first_name} {doctor.last_name}</h1>
              <p>{doctor.specialty || 'Médecin'} · {doctor.email}</p>
              {doctor.verification_status === 'VERIFIED' && (
                <span className="verified-badge"><CheckCircle size={13} /> Compte vérifié</span>
              )}
            </div>
          </div>

          <div className="profile-actions">
            {!editing ? (
              <button className="btn-edit" onClick={startEdit}>
                <Pencil size={15} /> Modifier le profil
              </button>
            ) : (
              <>
                <button className="btn-cancel" onClick={cancelEdit}>
                  <X size={15} /> Annuler
                </button>
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><span className="mini-spinner" /> Sauvegarde…</>
                    : <><Save size={15} /> Sauvegarder</>}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="profile-grid">
          {/* ── Informations personnelles ── */}
          <section className="pcard">
            <div className="pcard-title"><User size={16} /> Informations personnelles</div>
            <div className="pfields-row">
              <Field
                label="Nom"
                value={display.last_name}
                icon={<User size={15} />}
                editable={editing}
                onChange={set('last_name')}
              />
              <Field
                label="Prénom"
                value={display.first_name}
                icon={<User size={15} />}
                editable={editing}
                onChange={set('first_name')}
              />
            </div>
            <Field
              label="Email"
              value={doctor.email}
              icon={<Mail size={15} />}
              editable={false}
              locked
              hint="L'email ne peut pas être modifié."
            />
            <Field
              label="Téléphone"
              value={display.phone_number}
              icon={<Phone size={15} />}
              editable={editing}
              onChange={set('phone_number')}
              type="tel"
            />
          </section>

          {/* ── Informations professionnelles ── */}
          <section className="pcard">
            <div className="pcard-title"><Stethoscope size={16} /> Informations professionnelles</div>
            <Field
              label="Spécialité"
              value={display.specialty}
              icon={<Stethoscope size={15} />}
              editable={editing}
              onChange={set('specialty')}
            />
            <Field
              label="Numéro de licence"
              value={doctor.license_number}
              icon={<CreditCard size={15} />}
              editable={false}
              locked
              hint="Le numéro de licence ne peut pas être modifié."
            />
            <Field
              label="Nom du centre médical"
              value={display.medical_center_name}
              icon={<MapPin size={15} />}
              editable={editing}
              onChange={set('medical_center_name')}
            />
            <Field
              label="Adresse du centre médical"
              value={display.medical_center_address}
              icon={<MapPin size={15} />}
              editable={editing}
              onChange={set('medical_center_address')}
            />
          </section>

          {/* ── Sécurité ── */}
          <section className="pcard pcard-security">
            <div className="pcard-title"><CheckCircle size={16} /> Sécurité</div>
            <p className="security-desc">
              Pour modifier votre mot de passe, nous vous enverrons un lien de réinitialisation à <strong>{doctor.email}</strong>.
            </p>
            {resetSent ? (
              <div className="reset-sent">
                <CheckCircle size={18} />
                <span>Email envoyé ! Consultez votre boîte mail.</span>
              </div>
            ) : (
              <button className="btn-reset-pass" onClick={handlePasswordReset} disabled={resetting}>
                {resetting
                  ? <><span className="mini-spinner-blue" /> Envoi en cours…</>
                  : <><Send size={15} /> Envoyer le lien de réinitialisation</>}
              </button>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}