import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import passwordService from '../services/passwordService';
import { toastError, toastSuccess } from '../services/toastService';
import './css/LoginScreen.css';

// Composants personnalisés
const CustomButton = ({ title, onPress, disabled }) => (
  <button 
    className="custom-button" 
    onClick={onPress} 
    disabled={disabled}
  >
    {disabled ? 'Chargement...' : title}
  </button>
);

const InputField = ({ 
  label, 
  value, 
  onChangeText, 
  icon, 
  placeholder, 
  type = 'text',
  rightElement 
}) => (
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

const Decorations = () => (
  <div className="decorations">
    <div className="decoration decoration-1"></div>
    <div className="decoration decoration-2"></div>
    <div className="decoration decoration-3"></div>
  </div>
);

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Utilisation du hook useAuth
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      toastError('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      await login(email, password);
      toastSuccess('Connexion réussie', 'Bienvenue !');
      setEmail('');
      setPassword('');
      
      // Navigation
      if (navigation?.navigate) {
        navigation.navigate('/home');
      } else {
        window.location.href = '/home';
      }
    } catch (error) {
      toastError('Erreur de connexion', error.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toastError('Email manquant', 'Veuillez entrer votre email.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      toastError('Email invalide', "L'adresse email n'est pas valide");
      return;
    }

    setIsResettingPassword(true);
    try {
      await passwordService.requestPasswordReset(resetEmail);
      toastSuccess(
        'Email envoyé',
        'Vérifiez votre email pour réinitialiser votre mot de passe'
      );
      setResetEmail('');
      setIsPasswordResetMode(false);
    } catch (error) {
      toastError('Erreur', error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (isPasswordResetMode) {
        handlePasswordReset();
      } else {
        handleLogin();
      }
    }
  };

  return (
    <div className="login-container">
      <Decorations />

      {/* Logo */}
      <img
        src="/glycopilot.png"
        alt="GlycoPilot Logo"
        className="logo"
      />

      {/* Formulaire */}
      <div className="form" onKeyPress={handleKeyPress}>
        {!isPasswordResetMode ? (
          <>
            {/* EMAIL */}
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={20} color="#666" />}
              placeholder="user@example.com"
              type="email"
            />

            {/* PASSWORD */}
            <InputField
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={20} color="#666" />}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#666" />
                  ) : (
                    <Eye size={20} color="#666" />
                  )}
                </button>
              }
            />

            <p
              className="forgot-password"
              onClick={() => setIsPasswordResetMode(true)}
            >
              Mot de passe oublié ?
            </p>

            {/* Afficher l'erreur si elle existe */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <CustomButton
              title="Se connecter"
              onPress={handleLogin}
              disabled={loading}
            />
          </>
        ) : (
          <>
            {/* PASSWORD RESET FORM */}
            <InputField
              label="Votre email"
              value={resetEmail}
              onChangeText={setResetEmail}
              icon={<Mail size={20} color="#666" />}
              placeholder="user@example.com"
              type="email"
            />

            <p className="reset-info">
              Un lien de réinitialisation sera envoyé à votre email
            </p>

            <CustomButton
              title="Envoyer le lien"
              onPress={handlePasswordReset}
              disabled={isResettingPassword}
            />

            <button
              type="button"
              onClick={() => {
                setIsPasswordResetMode(false);
                setResetEmail('');
              }}
              className="back-button"
            >
              Retour
            </button>
          </>
        )}
      </div>

      <p
        className="signup-link"
        onClick={() => navigation?.navigate ? navigation.navigate('/signin') : window.location.href = '/signin'}
      >
        Pas encore de compte ? Inscrivez-vous
      </p>
    </div>
  );
}