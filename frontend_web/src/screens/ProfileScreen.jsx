import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Stethoscope, CreditCard,
  Save, Send, CheckCircle, Pencil, Lock,
} from 'lucide-react';
import authService from '../services/authService';
import { UiClose } from '../components/UiIcon';
import { flattenAuthMe } from '../lib/utils';
import { saveDoctorProfile } from '../services/doctorProfileService';
import passwordService from '../services/passwordService';
import { toastError, toastSuccess } from '../services/toastService';
import Sidebar from '../components/Sidebar';
import ProfileSelectField from '../components/ProfileSelectField';
import FrenchAddressFields from '../components/FrenchAddressFields';
import { DOCTOR_SPECIALTY_OPTIONS, DOCTOR_STRUCTURE_OPTIONS } from '../constants/doctorOptions';
import './css/Profile.css';

const PROFILE_SPECIALTY_OPTIONS = DOCTOR_SPECIALTY_OPTIONS.filter((o) => o.value !== '');
const PROFILE_STRUCTURE_OPTIONS = DOCTOR_STRUCTURE_OPTIONS.filter((o) => o.value !== '');

const apiClient = authService.getApiClient();

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
          type={type === 'email' ? 'text' : type}
          value={value ?? ''}
          onChange={e => onChange && onChange(e.target.value)}
          disabled={!editable || locked}
          placeholder={locked ? '—' : `Votre ${label.toLowerCase()}`}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode={type === 'email' ? 'email' : undefined}
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
      const meData = await saveDoctorProfile(apiClient, form);
      const updated = flattenAuthMe(meData);
      setDoctor(updated);
      setForm(updated);
      localStorage.setItem('user', JSON.stringify(updated));

      toastSuccess('Profil mis à jour', 'Vos informations ont été sauvegardées');
      setEditing(false);
    } catch (err) {
      if (err.isValidation) {
        toastError('Erreur', err.message);
        return;
      }
      const data = err.response?.data;
      const msg =
        (typeof data === 'object' && (data?.error || Object.values(data || {})[0]))
        || data?.detail
        || err.message;
      toastError('Erreur', Array.isArray(msg) ? msg[0] : String(msg));
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
        <main className="profile-main profile-loading-center">
          <span className="mini-spinner" />
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
              <p>
                {[doctor.specialty, doctor.medical_center_name].filter(Boolean).join(' · ') || 'Médecin'}
                {' · '}{doctor.email}
              </p>
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
                  <UiClose size={15} /> Annuler
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
            <ProfileSelectField
              label="Spécialité"
              value={display.specialty || ''}
              options={PROFILE_SPECIALTY_OPTIONS}
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
            <ProfileSelectField
              label="Votre structure"
              value={display.medical_center_name || ''}
              options={PROFILE_STRUCTURE_OPTIONS}
              editable={editing}
              onChange={set('medical_center_name')}
            />
            {editing ? (
              <FrenchAddressFields
                postalCode={form.medical_center_postal_code}
                city={form.medical_center_city}
                address={form.medical_center_address}
                onPostalCodeChange={set('medical_center_postal_code')}
                onCityChange={set('medical_center_city')}
                onAddressChange={set('medical_center_address')}
                variant="profile"
              />
            ) : (
              <div className="pfields-row">
                <Field
                  label="Adresse"
                  value={display.medical_center_address}
                  icon={<MapPin size={15} />}
                  editable={false}
                />
                <Field
                  label="Code postal"
                  value={display.medical_center_postal_code}
                  icon={<MapPin size={15} />}
                  editable={false}
                />
                <Field
                  label="Ville"
                  value={display.medical_center_city}
                  icon={<MapPin size={15} />}
                  editable={false}
                />
              </div>
            )}
          </section>

          {/* ── Sécurité ── */}
          <section className="pcard pcard-security">
            <div className="pcard-title"><Lock size={16} /> Sécurité</div>
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