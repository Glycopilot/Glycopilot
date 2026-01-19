import { useState } from 'react';
import { X, User, Mail, Phone, Calendar, Loader, AtSign } from 'lucide-react';
import userService from '../services/userService';
import { toastSuccess, toastError } from '../services/toastService';
import './css/AddPatient.css';

export default function AddPatient({ isOpen, onClose, onPatientAdded }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Générer un mot de passe aléatoire robuste
  const generateStrongPassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    // Assurer au moins un de chaque type de caractère
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Majuscule
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minuscule
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Chiffre
    password += '!@#$%^&*()_+-='[Math.floor(Math.random() * 14)]; // Caractère spécial
    
    // Remplir le reste
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Mélanger les caractères
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (!formData.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (formData.username.length < 3) {
      newErrors.username = "Le nom d'utilisateur doit contenir au moins 3 caractères";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores";
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toastError('Erreur', 'Veuillez corriger les erreurs du formulaire');
      return;
    }

    setLoading(true);

    try {
      // Générer un mot de passe robuste
      const generatedPassword = generateStrongPassword();
      
      const patientData = {
        ...formData,
        password: generatedPassword
      };
      
      const newPatient = await userService.createPatient(patientData);
      
      // Afficher le mot de passe généré à l'utilisateur
      toastSuccess(
        'Patient créé avec succès !', 
        `Mot de passe temporaire : ${generatedPassword}\n\nLe patient devra le modifier à sa première connexion.`
      );
      
      // Réinitialiser le formulaire
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        dateOfBirth: '',
      });
      setErrors({});

      // Notifier le parent et fermer le modal
      if (onPatientAdded) {
        onPatientAdded(newPatient);
      }
      
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Erreur lors de la création du patient:', error);
      toastError('Erreur', error.message || 'Impossible de créer le patient');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phone: '',
      dateOfBirth: '',
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="modal-icon">
              <User size={28} />
            </div>
            <div>
              <h2>Ajouter un Patient</h2>
              <p>Créez un nouveau profil patient</p>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">
                <User size={16} />
                Prénom *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Prénom du patient"
                className={errors.firstName ? 'error' : ''}
              />
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">
                <User size={16} />
                Nom *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Nom du patient"
                className={errors.lastName ? 'error' : ''}
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">
              <AtSign size={16} />
              Nom d'utilisateur *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="nomutilisateur123"
              className={errors.username ? 'error' : ''}
            />
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={16} />
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@exemple.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={16} />
                Téléphone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+33 6 12 34 56 78"
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">
                <Calendar size={16} />
                Date de naissance
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-info">
            <p className="info-title">* Champs obligatoires</p>
            <p>Un mot de passe robuste sera généré automatiquement pour le patient.</p>
            <p>Le patient devra modifier son mot de passe lors de sa première connexion.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-cancel"
            onClick={handleClose}
            disabled={loading}
          >
            Annuler
          </button>
          <button 
            type="button" 
            className="btn-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="spinner" />
                Création...
              </>
            ) : (
              <>
                <User size={18} />
                Créer le patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}