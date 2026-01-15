import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toastError, toastSuccess } from '../services/toastService';
import './css/SignInScreen.css';

// Composants personnalisés
const CustomButton = ({ title, onPress, disabled }) => (
  <button 
    className="custom-button" 
    onClick={onPress} 
    disabled={disabled}
  >
    {title}
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
      {icon && <span className="input-icon">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'new-password' : type === 'email' ? 'email' : 'off'}
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

export default function SignInScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationPassword, setConfirmationPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Utilisation du hook useAuth
  const { register, loading, error } = useAuth();

  const handleSignIn = async () => {
    // Validation du nom et prénom
    if (!firstName || !lastName) {
      toastError('Erreur', 'Veuillez fournir le nom et le prénom');
      return;
    }

    // Validation de l'email
    if (!email) {
      toastError('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toastError('Erreur', "L'adresse email n'est pas valide");
      return;
    }

    if (confirmationEmail !== email) {
      toastError('Erreur', 'Les emails ne correspondent pas');
      return;
    }

    // Validation du mot de passe
    if (!password) {
      toastError('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 8) {
      toastError('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!/\d/.test(password)) {
      toastError('Erreur', 'Le mot de passe doit contenir au moins un chiffre');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toastError('Erreur', 'Le mot de passe doit contenir au moins une lettre majuscule');
      return;
    }

    if (confirmationPassword !== password) {
      toastError('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    // Soumission du formulaire avec le hook
    try {
      await register({
        email,
        firstName,
        lastName,
        password,
        passwordConfirm: confirmationPassword,
      });
      
      toastSuccess('Inscription réussie!', 'Bienvenue !');

      // Vider le formulaire
      setEmail('');
      setFirstName('');
      setLastName('');
      setPassword('');
      setConfirmationPassword('');
      setConfirmationEmail('');

      // Rediriger vers la page de connexion
      if (navigation?.navigate) {
        navigation.navigate('/login');
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      toastError('Erreur inscription', error.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <div className="signin-container">
      {/* Header */}
      <div className="signin-header">
        <Decorations />
        <p
          className="login-link"
          onClick={() => navigation?.navigate ? navigation.navigate('/login') : window.location.href = '/login'}
        >
          Avez vous compte ? Connectez-vous
        </p>

        {/* Logo */}
        <img
          src="/glycopilot.png"
          alt="GlycoPilot Logo"
          className="logo"
        />
      </div>

      {/* Formulaire avec scroll */}
      <div className="signin-scroll-content">
        <div className="form" onKeyPress={handleKeyPress}>
          {/* Nom et Prénom sur la même ligne */}
          <div className="row-container">
            <div className="half-width">
              <InputField
                label="Nom"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
              />
            </div>

            <div className="half-width">
              <InputField
                label="Prénom"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
              />
            </div>
          </div>

          {/* EMAIL */}
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={20} color="#666" />}
            placeholder="user@example.com"
            type="email"
          />

          <InputField
            label="Confirmation d'email"
            value={confirmationEmail}
            onChangeText={setConfirmationEmail}
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

          <InputField
            label="Confirmation du mot de passe"
            value={confirmationPassword}
            onChangeText={setConfirmationPassword}
            icon={<Lock size={20} color="#666" />}
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle"
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#666" />
                ) : (
                  <Eye size={20} color="#666" />
                )}
              </button>
            }
          />

          {/* Afficher l'erreur si elle existe */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <CustomButton 
            title={loading ? "Inscription..." : "S'inscrire"} 
            onPress={handleSignIn}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}