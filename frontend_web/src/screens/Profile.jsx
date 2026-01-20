import { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Save, Camera, Lock } from 'lucide-react';
import authService from '../services/authService';
import { toastSuccess, toastError } from '../services/toastService';
import './css/Profile.css';

export default function Profile({ isOpen, onClose, doctor, onProfileUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // Informations du profil
  const [formData, setFormData] = useState({
    firstName: doctor?.first_name || '',
    lastName: doctor?.last_name || '',
    email: doctor?.email || '',
    phone: doctor?.phone || '',
    address: doctor?.address || '',
    specialization: doctor?.specialization || 'Endocrinologie',
    licenseNumber: doctor?.license_number || '',
  });

  // Changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Appel API pour mettre à jour le profil
      const response = await fetch(`/api/users/${doctor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getTokens().accessToken}`
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          specialization: formData.specialization,
          license_number: formData.licenseNumber,
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        
        // Mettre à jour le localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        toastSuccess('Profil mis à jour', 'Vos informations ont été enregistrées');
        setIsEditing(false);
        
        if (onProfileUpdated) {
          onProfileUpdated(updatedUser);
        }
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toastError('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toastError('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toastError('Erreur', 'Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toastError('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getTokens().accessToken}`
        },
        body: JSON.stringify({
          old_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
          password_confirm: passwordData.confirmPassword,
        })
      });

      if (response.ok) {
        toastSuccess('Mot de passe modifié', 'Votre mot de passe a été mis à jour');
        setShowPasswordChange(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Mot de passe incorrect');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toastError('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: doctor?.first_name || '',
      lastName: doctor?.last_name || '',
      email: doctor?.email || '',
      phone: doctor?.phone || '',
      address: doctor?.address || '',
      specialization: doctor?.specialization || 'Endocrinologie',
      licenseNumber: doctor?.license_number || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Mon Profil</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {doctor?.first_name?.[0]}{doctor?.last_name?.[0]}
            </div>
            <button className="avatar-edit-btn" disabled>
              <Camera size={16} />
              <span>Changer la photo</span>
            </button>
            <p className="avatar-help">Fonctionnalité à venir</p>
          </div>

          {/* Tabs */}
          <div className="profile-tabs">
            <button 
              className={`tab-btn ${!showPasswordChange ? 'active' : ''}`}
              onClick={() => setShowPasswordChange(false)}
            >
              <User size={18} />
              Informations personnelles
            </button>
            <button 
              className={`tab-btn ${showPasswordChange ? 'active' : ''}`}
              onClick={() => setShowPasswordChange(true)}
            >
              <Lock size={18} />
              Sécurité
            </button>
          </div>

          {/* Personal Information Tab */}
          {!showPasswordChange && (
            <div className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <User size={16} />
                    Prénom
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Votre prénom"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <User size={16} />
                    Nom
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <Mail size={16} />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="votre.email@exemple.com"
                />
              </div>

              <div className="form-group">
                <label>
                  <Phone size={16} />
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div className="form-group">
                <label>
                  <MapPin size={16} />
                  Adresse
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Votre adresse"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Spécialisation</label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  >
                    <option value="Endocrinologie">Endocrinologie</option>
                    <option value="Diabétologie">Diabétologie</option>
                    <option value="Médecine Générale">Médecine Générale</option>
                    <option value="Médecine Interne">Médecine Interne</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Numéro de licence</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="N° RPPS"
                  />
                </div>
              </div>

              <div className="profile-info-box">
                <p><strong>Rôle :</strong> Médecin</p>
                <p><strong>Compte créé le :</strong> {new Date(doctor?.created_at || Date.now()).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          )}

          {/* Password Change Tab */}
          {showPasswordChange && (
            <div className="password-form">
              <div className="form-group">
                <label>
                  <Lock size={16} />
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
              </div>

              <div className="form-group">
                <label>
                  <Lock size={16} />
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
                <p className="help-text">Minimum 8 caractères, 1 majuscule, 1 chiffre</p>
              </div>

              <div className="form-group">
                <label>
                  <Lock size={16} />
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
              </div>

              <button 
                className="btn-primary full-width"
                onClick={handleChangePassword}
                disabled={loading}
              >
                {loading ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showPasswordChange && (
          <div className="modal-footer">
            {!isEditing ? (
              <button 
                className="btn-primary"
                onClick={() => setIsEditing(true)}
              >
                Modifier mes informations
              </button>
            ) : (
              <>
                <button 
                  className="btn-secondary"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  <Save size={18} />
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}