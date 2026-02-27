import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, CreditCard, Stethoscope, MapPin, User, ChevronRight } from 'lucide-react';
import authService from '../services/authService';
import { toastError, toastSuccess } from '../services/toastService';
import './css/auth.css';

const InputField = ({ label, value, onChangeText, icon, placeholder, type = 'text', rightElement }) => (
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

export default function SignInScreen({ navigation }) {
  const [firstName, setFirstName]                       = useState('');
  const [lastName, setLastName]                         = useState('');
  const [email, setEmail]                               = useState('');
  const [confirmationEmail, setConfirmationEmail]       = useState('');
  const [password, setPassword]                         = useState('');
  const [confirmationPassword, setConfirmationPassword] = useState('');
  const [showPassword, setShowPassword]                 = useState(false);
  const [showConfirmPassword, setShowConfirmPassword]   = useState(false);
  const [isLoading, setIsLoading]                       = useState(false);
  const [licenseNumber, setLicenseNumber]               = useState('');
  const [specialty, setSpecialty]                       = useState('');
  const [medicalCenterAddress, setMedicalCenterAddress] = useState('');

  const goToLogin = () => navigation.navigate('/login');

  const handleSignIn = async () => {
    if (!firstName || !lastName) return toastError('Erreur', 'Veuillez fournir le nom et le prénom');
    if (!email)                   return toastError('Erreur', 'Veuillez remplir tous les champs');
    if (!/\S+@\S+\.\S+/.test(email)) return toastError('Erreur', "L'adresse email n'est pas valide");
    if (confirmationEmail !== email)  return toastError('Erreur', 'Les emails ne correspondent pas');
    if (!licenseNumber)           return toastError('Erreur', 'Veuillez fournir votre numéro de licence');
    if (!specialty)               return toastError('Erreur', 'Veuillez indiquer votre spécialité');
    if (!medicalCenterAddress)    return toastError('Erreur', "Veuillez indiquer l'adresse de votre centre médical");
    if (!password)                return toastError('Erreur', 'Veuillez remplir tous les champs');
    if (password.length < 8)      return toastError('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
    if (!/\d/.test(password))     return toastError('Erreur', 'Le mot de passe doit contenir au moins un chiffre');
    if (!/[A-Z]/.test(password))  return toastError('Erreur', 'Le mot de passe doit contenir au moins une lettre majuscule');
    if (confirmationPassword !== password) return toastError('Erreur', 'Les mots de passe ne correspondent pas');

    setIsLoading(true);
    try {
      await authService.register({
        email, firstName, lastName, password,
        passwordConfirm: confirmationPassword,
        role: 'DOCTOR', licenseNumber, specialty, medicalCenterAddress,
      });
      toastSuccess('Inscription réussie!', 'Bienvenue !');
      setEmail(''); setFirstName(''); setLastName(''); setPassword('');
      setConfirmationPassword(''); setConfirmationEmail('');
      setLicenseNumber(''); setSpecialty(''); setMedicalCenterAddress('');
      goToLogin();
    } catch (error) {
      toastError('Erreur inscription', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <aside className="auth-aside">
        <div className="aside-top">
          <img src="/glycopilot.png" alt="GlycoPilot" className="aside-logo" />
        </div>
        <div className="aside-body">
          <div className="aside-tag">Inscription</div>
          <h1 className="aside-title">Rejoignez<br />GlycoPilot</h1>
          <p className="aside-desc">
            Créez votre espace médecin en quelques minutes et commencez à suivre vos patients dès aujourd'hui.
          </p>
          <ul className="aside-steps">
            <li><span className="step-num">01</span><span>Renseignez votre identité</span></li>
            <li><span className="step-num">02</span><span>Ajoutez vos informations professionnelles</span></li>
            <li><span className="step-num">03</span><span>Sécurisez votre compte</span></li>
          </ul>
        </div>
        <div className="aside-bottom">
          <span>Déjà inscrit ?</span>
          <button className="aside-link" onClick={goToLogin}>Se connecter →</button>
        </div>
        <div className="aside-circles">
          <div className="circle c1" /><div className="circle c2" /><div className="circle c3" />
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-form-wrapper">
          <div className="form-header">
            <h2>Créer un compte médecin</h2>
            <p>Renseignez vos informations pour commencer</p>
          </div>

          <section className="form-section">
            <div className="section-label"><span className="section-number">01</span><span>Identité</span></div>
            <div className="row-2">
              <InputField label="Nom"    value={lastName}  onChangeText={setLastName}  icon={<User size={16}/>} placeholder="Dupont" />
              <InputField label="Prénom" value={firstName} onChangeText={setFirstName} icon={<User size={16}/>} placeholder="Jean" />
            </div>
            <InputField label="Email"             value={email}             onChangeText={setEmail}             icon={<Mail size={16}/>} placeholder="medecin@exemple.com" type="email" />
            <InputField label="Confirmer l'email" value={confirmationEmail} onChangeText={setConfirmationEmail} icon={<Mail size={16}/>} placeholder="medecin@exemple.com" type="email" />
          </section>

          <section className="form-section">
            <div className="section-label"><span className="section-number">02</span><span>Informations professionnelles</span></div>
            <InputField label="Numéro de licence"         value={licenseNumber}        onChangeText={setLicenseNumber}        icon={<CreditCard size={16}/>}  placeholder="10001234567" />
            <InputField label="Spécialité"                value={specialty}            onChangeText={setSpecialty}            icon={<Stethoscope size={16}/>} placeholder="Ex : Cardiologue" />
            <InputField label="Adresse du centre médical" value={medicalCenterAddress} onChangeText={setMedicalCenterAddress} icon={<MapPin size={16}/>}      placeholder="123 Rue de l'Hôpital, Paris" />
          </section>

          <section className="form-section">
            <div className="section-label"><span className="section-number">03</span><span>Sécurité</span></div>
            <InputField
              label="Mot de passe" value={password} onChangeText={setPassword}
              icon={<Lock size={16}/>} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
              rightElement={<button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>}
            />
            <p className="password-hint">Min. 8 caractères, 1 majuscule, 1 chiffre</p>
            <InputField
              label="Confirmer le mot de passe" value={confirmationPassword} onChangeText={setConfirmationPassword}
              icon={<Lock size={16}/>} type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••"
              rightElement={<button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle">{showConfirmPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>}
            />
          </section>

          <button className="submit-btn" onClick={handleSignIn} disabled={isLoading}>
            {isLoading
              ? <span className="btn-loading"><span className="spinner"/>Inscription en cours…</span>
              : <span>Créer mon compte <ChevronRight size={18}/></span>}
          </button>
        </div>
      </main>
    </div>
  );
}