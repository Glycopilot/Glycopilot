import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Send, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import passwordService from '../services/passwordService';
import { toastError, toastSuccess } from '../services/toastService';
import InputField from '../components/InputField';
import { validateEmail } from '../lib/utils';
import logo from '../assets/glycopilot.png';
import './css/auth.css';

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
      } else if (err.message?.includes('administrateur') || err.message?.includes('validé')) {
        toastError("Désolé, votre compte n'a pas encore été validé par un administrateur.");
      } else {
        toastError('Erreur de connexion', err.message);
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) return toastError('Email manquant', 'Veuillez entrer votre email.');
    const emailError = validateEmail(resetEmail);
    if (emailError) return toastError('Email invalide', emailError);
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

  const onSubmit = (e) => {
    e.preventDefault();
    if (isPasswordResetMode) handlePasswordReset();
    else handleLogin();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') onSubmit(e);
  };

  // ── Compte en attente ──
  if (pendingEmail) {
    return (
      <div className="auth-root">
        {/* Mobile topbar */}
        <div className="auth-mobile-topbar">
          <img src={logo} alt="GlycoPilot" />
          <button type="button" className="auth-mobile-topbar-link" onClick={goToSignin}>
            <span>S&apos;inscrire</span> <ArrowRight size={14} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <aside className="auth-aside">
          <div className="aside-top"><img src={logo} alt="GlycoPilot" className="aside-logo" /></div>
          <div className="aside-body">
            <div className="aside-tag">Compte en attente</div>
            <h1 className="aside-title">Vérification en cours…</h1>
            <p className="aside-desc">Votre licence médicale est en cours de vérification par notre équipe. Vous recevrez un email dès que votre compte sera activé.</p>
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
                  <div className="vstep-dot vstep-dot-active"><span className="vstep-pulse" /></div>
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
              <button className="submit-btn submit-btn-retry" onClick={() => setPendingEmail(null)}>
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
      {/* ── Mobile topbar ── */}
      <div className="auth-mobile-topbar">
        <img src={logo} alt="GlycoPilot" />
        <button type="button" className="auth-mobile-topbar-link" onClick={goToSignin}>
          <span>S&apos;inscrire</span> <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <aside className="auth-aside">
        <div className="aside-top"><img src={logo} alt="GlycoPilot" className="aside-logo" /></div>
        <div className="aside-body">
          <div className="aside-tag">Espace Praticien</div>
          <h1 className="aside-title">
            {isPasswordResetMode ? 'Récupération de mot de passe' : 'Ravis de vous revoir sur GlycoPilot'}
          </h1>
          <p className="aside-desc">
            {isPasswordResetMode
              ? 'Indiquez votre adresse email professionnelle. Un lien sécurisé vous sera envoyé pour réinitialiser votre accès.'
              : 'Connectez-vous à votre espace pour reprendre le suivi de vos patients avec des outils d\'analyse toujours plus performants.'}
          </p>
          {!isPasswordResetMode && (
            <ul className="aside-steps">
              <li><span className="step-dot"/><span>Visualisation des glycémies en temps réel</span></li>
              <li><span className="step-dot"/><span>Rapports intelligents et prédictifs</span></li>
              <li><span className="step-dot"/><span>Gestion proactive des alertes médicales</span></li>
            </ul>
          )}
        </div>
        <div className="aside-bottom">
          <span>Pas encore de compte ?</span>
          <button className="aside-link" onClick={goToSignin}>
            <span>S&apos;inscrire</span> <ArrowRight size={16} strokeWidth={2} />
          </button>
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
                  icon={<Mail size={16} />} placeholder="medecin@exemple.com" type="email"
                />
                <InputField
                  label="Mot de passe" value={password} onChangeText={setPassword}
                  icon={<Lock size={16} strokeWidth={1.75} />}
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle" aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                      {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
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
                  : <><span>Se connecter</span> <LogIn size={18} strokeWidth={2} aria-hidden /></>}
              </button>
              {/* Lien inscription visible uniquement sur mobile */}
              <p className="auth-mobile-switch">
                Pas encore de compte ?{' '}
                <button type="button" className="auth-mobile-switch-btn" onClick={goToSignin}>
                  <span>S&apos;inscrire</span> <UserPlus size={14} strokeWidth={2} aria-hidden />
                </button>
              </p>
            </>
          ) : (
            <div className="auth-forgot-panel">
              <div className="form-header form-header-forgot">
                <h2>Mot de passe oublié ?</h2>
                <div className="form-header-note" role="note">
                  <span className="form-header-note-icon" aria-hidden>
                    <Mail size={18} strokeWidth={1.75} />
                  </span>
                  <p className="form-header-note-text">
                    Un lien de réinitialisation sera envoyé à votre adresse email.
                  </p>
                </div>
              </div>
              <section className="form-section form-section-forgot">
                <InputField
                  label="Votre email"
                  name="reset-email"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  icon={<Mail size={16} strokeWidth={1.75} />}
                  placeholder="medecin@exemple.com"
                  type="email"
                  autoComplete="email"
                />
              </section>
              <button type="button" className="submit-btn" onClick={handlePasswordReset} disabled={isResettingPassword}>
                {isResettingPassword
                  ? <span className="btn-loading"><span className="spinner"/>Envoi en cours…</span>
                  : <><span>Envoyer le lien</span> <Send size={18} strokeWidth={2} aria-hidden /></>}
              </button>
              <button
                type="button"
                className="back-link"
                onClick={() => { setIsPasswordResetMode(false); setResetEmail(''); }}
              >
                <ArrowLeft size={16} strokeWidth={2} aria-hidden />
                <span>Retour à la connexion</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}