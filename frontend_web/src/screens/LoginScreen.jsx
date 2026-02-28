import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import passwordService from '../services/passwordService';
import { toastError, toastSuccess } from '../services/toastService';
import logo from '../assets/glycopilot.png';
import './css/auth.css';

const InputField = ({ label, value, onChangeText, icon, placeholder, type = 'text', rightElement }) => (
  <div className="input-field">
    <label>{label}</label>
    <div className="input-wrapper">
      <span className="input-icon">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : 'email'}
      />
      {rightElement && <span className="input-right">{rightElement}</span>}
    </div>
  </div>
);

export default function LoginScreen({ navigation }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [resetEmail, setResetEmail]     = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [pendingEmail, setPendingEmail] = useState(null);
  const { login, loading, error } = useAuth();

  const goToSignin = () => navigation.navigate('/signin');

  const handleLogin = async () => {
    if (!email || !password) return toastError('Champs manquants', 'Veuillez remplir tous les champs.');
    try {
      await login(email, password);
      toastSuccess('Connexion réussie', 'Bienvenue !');
      setEmail(''); setPassword('');
      navigation.navigate('/home');
    } catch (err) {
      if (err.code === 'ACCOUNT_PENDING') {
        setPendingEmail(email);
      } else {
        toastError('Erreur de connexion', err.message);
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) return toastError('Email manquant', 'Veuillez entrer votre email.');
    if (!/\S+@\S+\.\S+/.test(resetEmail)) return toastError('Email invalide', "L'adresse email n'est pas valide");
    setIsResettingPassword(true);
    try {
      await passwordService.requestPasswordReset(resetEmail);
      toastSuccess('Email envoyé', 'Vérifiez votre email pour réinitialiser votre mot de passe');
      setResetEmail('');
      setIsPasswordResetMode(false);
    } catch (err) {
      toastError('Erreur', err.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') isPasswordResetMode ? handlePasswordReset() : handleLogin();
  };

  // ── Écran compte en attente de vérification ──
  if (pendingEmail) {
    return (
      <div className="auth-root">
        <aside className="auth-aside">
          <div className="aside-top">
            <img src={logo} alt="GlycoPilot" className="aside-logo" />
          </div>
          <div className="aside-body">
            <div className="aside-tag">Compte en attente</div>
            <h1 className="aside-title">Vérification en cours…</h1>
            <p className="aside-desc">
              Votre licence médicale est en cours de vérification par notre équipe. Vous recevrez un email dès que votre compte sera activé.
            </p>
            <ul className="aside-steps">
              <li><span className="step-dot" /><span>Vérification sous 24 à 48h</span></li>
              <li><span className="step-dot" /><span>Notification par email à l'activation</span></li>
              <li><span className="step-dot" /><span>Accès complet à la plateforme</span></li>
            </ul>
          </div>
          <div className="aside-bottom">
            <span>Pas encore inscrit ?</span>
            <button className="aside-link" onClick={goToSignin}>S'inscrire →</button>
          </div>
          <div className="aside-circles">
            <div className="circle c1" /><div className="circle c2" /><div className="circle c3" />
          </div>
        </aside>

        <main className="auth-main">
          <div className="auth-form-wrapper auth-form-centered">
            <div className="verification-card">
              <div className="verif-icon-wrap">
                <svg viewBox="0 0 64 64" fill="none" className="verif-svg">
                  <circle cx="32" cy="32" r="30" stroke="#4A90E2" strokeWidth="2.5" strokeDasharray="6 4" />
                  <circle cx="32" cy="32" r="20" fill="#EEF5FD" />
                  <path d="M22 32l7 7 13-13" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h2 className="verif-title">Licence en cours de vérification</h2>
              <p className="verif-subtitle">Votre compte existe mais n'est pas encore activé</p>

              <div className="verif-info-box">
                <div className="verif-email-row">
                  <span className="verif-email-label">Email de contact</span>
                  <span className="verif-email-value">{pendingEmail}</span>
                </div>
              </div>

              <div className="verif-steps">
                <div className="vstep vstep-done">
                  <div className="vstep-dot vstep-dot-done">✓</div>
                  <div className="vstep-body">
                    <div className="vstep-title">Compte créé</div>
                    <div className="vstep-desc">Vos informations ont été enregistrées</div>
                  </div>
                </div>
                <div className="vstep-line" />
                <div className="vstep vstep-active">
                  <div className="vstep-dot vstep-dot-active">
                    <span className="vstep-pulse" />
                  </div>
                  <div className="vstep-body">
                    <div className="vstep-title">Vérification de la licence</div>
                    <div className="vstep-desc">Notre équipe vérifie votre numéro de licence médicale. Ce processus prend généralement <strong>24 à 48h</strong>.</div>
                  </div>
                </div>
                <div className="vstep-line" />
                <div className="vstep vstep-pending">
                  <div className="vstep-dot vstep-dot-pending">3</div>
                  <div className="vstep-body">
                    <div className="vstep-title">Accès à la plateforme</div>
                    <div className="vstep-desc">Vous recevrez un email dès que votre compte sera activé</div>
                  </div>
                </div>
              </div>

              <div className="verif-notice">
                <span>📧</span>
                <p>Un email vous sera envoyé à <strong>{pendingEmail}</strong> dès que votre licence sera validée.</p>
              </div>

              <button className="submit-btn" style={{ marginBottom: 12 }} onClick={() => setPendingEmail(null)}>
                ← Réessayer avec un autre compte
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-root">
      <aside className="auth-aside">
        <div className="aside-top">
          <img src="/glycopilot.png" alt="GlycoPilot" className="aside-logo" />
        </div>
        <div className="aside-body">
          <div className="aside-tag">Connexion</div>
          <h1 className="aside-title">
            {isPasswordResetMode ? 'Réinitialiser\nvotre mot de passe' : 'Bon retour\nparmi nous'}
          </h1>
          <p className="aside-desc">
            {isPasswordResetMode
              ? 'Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.'
              : 'Connectez-vous à votre espace médecin pour accéder à vos patients, vos rapports et vos outils de suivi glycémique.'}
          </p>
          {!isPasswordResetMode && (
            <ul className="aside-steps">
              <li><span className="step-dot"/><span>Accédez à vos patients en temps réel</span></li>
              <li><span className="step-dot"/><span>Consultez vos rapports intelligents</span></li>
              <li><span className="step-dot"/><span>Gérez vos alertes glycémiques</span></li>
            </ul>
          )}
        </div>
        <div className="aside-bottom">
          <span>Pas encore de compte ?</span>
          <button className="aside-link" onClick={goToSignin}>S'inscrire →</button>
        </div>
        <div className="aside-circles">
          <div className="circle c1" /><div className="circle c2" /><div className="circle c3" />
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-form-wrapper auth-form-centered" onKeyPress={handleKeyPress}>
          {!isPasswordResetMode ? (
            <>
              <div className="form-header">
                <h2>Connexion</h2>
                <p>Entrez vos identifiants pour accéder à votre espace</p>
              </div>
              <section className="form-section">
                <InputField
                  label="Email" value={email} onChangeText={setEmail}
                  icon={<Mail size={16} color="#94A3B8"/>} placeholder="medecin@exemple.com" type="email"
                />
                <InputField
                  label="Mot de passe" value={password} onChangeText={setPassword}
                  icon={<Lock size={16} color="#94A3B8"/>}
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  }
                />
                <button type="button" className="forgot-link" onClick={() => setIsPasswordResetMode(true)}>
                  Mot de passe oublié ?
                </button>
              </section>
              {error && <div className="error-message">{error}</div>}
              <button className="submit-btn" onClick={handleLogin} disabled={loading}>
                {loading
                  ? <span className="btn-loading"><span className="spinner"/>Connexion…</span>
                  : <span>Se connecter <ChevronRight size={18}/></span>}
              </button>
            </>
          ) : (
            <>
              <div className="form-header">
                <h2>Mot de passe oublié ?</h2>
                <p>Un lien de réinitialisation sera envoyé à votre adresse email</p>
              </div>
              <section className="form-section">
                <InputField
                  label="Votre email" value={resetEmail} onChangeText={setResetEmail}
                  icon={<Mail size={16} color="#94A3B8"/>} placeholder="medecin@exemple.com" type="email"
                />
              </section>
              <button className="submit-btn" onClick={handlePasswordReset} disabled={isResettingPassword}>
                {isResettingPassword
                  ? <span className="btn-loading"><span className="spinner"/>Envoi en cours…</span>
                  : <span>Envoyer le lien <ChevronRight size={18}/></span>}
              </button>
              <button type="button" className="back-link" onClick={() => { setIsPasswordResetMode(false); setResetEmail(''); }}>
                ← Retour à la connexion
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}