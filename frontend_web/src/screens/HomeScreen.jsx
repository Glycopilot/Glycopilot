import { useState, useEffect } from 'react';
import { 
  LogOut, 
  User, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Pill,
  Clock,
  Search,
  MoreVertical,
  ChevronRight,
  Bell,
  Menu,
  X,
  UserPlus,
  Settings
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';
import { toastSuccess, toastError } from '../services/toastService';
import AddPatient from './AddPatient';
import Profile from './Profile';
import './css/HomeScreen.css';

export default function HomeScreen({ navigation }) {
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!authService.isAuthenticated()) {
          if (navigation?.navigate) {
            navigation.navigate('/login');
          } else {
            window.location.href = '/login';
          }
          return;
        }

        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setDoctor(storedUser);
          
          // Récupération de tous les utilisateurs depuis la base de données
          try {
            const response = await fetch('/api/users', {
              headers: {
                'Authorization': `Bearer ${authService.getTokens().accessToken}`
              }
            });
            
            if (response.ok) {
              const users = await response.json();
              setAllUsers(users);
              
              // Transformation des utilisateurs en format patients avec des données aléatoires
              const transformedPatients = users.map((user, index) => {
                const glycemiaValues = [0.65, 0.85, 1.10, 1.15, 1.28, 1.45, 1.65, 1.85];
                const statuses = ['low', 'normal', 'normal', 'normal', 'normal', 'high', 'high', 'critical'];
                const trends = ['down', 'stable', 'stable', 'stable', 'stable', 'up', 'up', 'up'];
                const messages = [
                  'Hypoglycémie légère',
                  'Tout va bien',
                  'Valeurs stables',
                  'Médicament pris à 9h',
                  'Glycémie en hausse',
                  'À surveiller',
                  'Glycémie critique détectée',
                  'Consultation recommandée'
                ];
                
                const randomIndex = index % glycemiaValues.length;
                const glycemia = glycemiaValues[randomIndex];
                const status = statuses[randomIndex];
                const firstName = user.first_name || 'Patient';
                const lastName = user.last_name || 'Inconnu';
                
                // Couleur de fond selon le statut
                let bgColor = '2ECC71';
                if (status === 'critical') bgColor = 'E74C3C';
                else if (status === 'high') bgColor = 'F39C12';
                else if (status === 'low') bgColor = '3498DB';
                
                return {
                  id: user.id,
                  firstName,
                  lastName,
                  email: user.email,
                  age: Math.floor(Math.random() * 40) + 30,
                  lastGlycemia: glycemia,
                  status,
                  trend: trends[randomIndex],
                  lastUpdate: ['2 min', '5 min', '15 min', '30 min', '45 min', '1h'][Math.floor(Math.random() * 6)],
                  medicationCompliance: Math.floor(Math.random() * 30) + 70,
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=${bgColor}&color=fff&bold=true`,
                  pendingPrescriptions: Math.floor(Math.random() * 3),
                  unreadAlerts: status === 'critical' || status === 'low' ? Math.floor(Math.random() * 5) + 1 : 0,
                  lastMessage: messages[randomIndex]
                };
              });
              
              setPatients(transformedPatients);
            } else {
              toastError('Erreur', 'Impossible de récupérer la liste des patients');
            }
          } catch (fetchError) {
            console.error('Erreur lors de la récupération des utilisateurs:', fetchError);
            toastError('Erreur', 'Impossible de récupérer les patients');
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur:', error);
        toastError('Erreur', 'Impossible de récupérer vos informations');
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigation]);

  const handleLogout = async () => {
    try {
      await logout();
      toastSuccess('Déconnexion réussie', 'À bientôt !');
      
      if (navigation?.navigate) {
        navigation.navigate('/login');
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      toastError('Erreur', 'Erreur lors de la déconnexion');
    }
  };

  const handlePatientClick = (patient) => {
    toastSuccess('Patient sélectionné', `${patient.firstName} ${patient.lastName}`);
  };

  const handleProfileUpdated = (updatedUser) => {
    setDoctor(updatedUser);
  };

  const handlePatientAdded = (newPatient) => {
    // Recharger la liste des patients
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${authService.getTokens().accessToken}`
          }
        });
        
        if (response.ok) {
          const users = await response.json();
          setAllUsers(users);
          
          const transformedPatients = users.map((user, index) => {
            const glycemiaValues = [0.65, 0.85, 1.10, 1.15, 1.28, 1.45, 1.65, 1.85];
            const statuses = ['low', 'normal', 'normal', 'normal', 'normal', 'high', 'high', 'critical'];
            const trends = ['down', 'stable', 'stable', 'stable', 'stable', 'up', 'up', 'up'];
            const messages = [
              'Hypoglycémie légère',
              'Tout va bien',
              'Valeurs stables',
              'Médicament pris à 9h',
              'Glycémie en hausse',
              'À surveiller',
              'Glycémie critique détectée',
              'Consultation recommandée'
            ];
            
            const randomIndex = index % glycemiaValues.length;
            const glycemia = glycemiaValues[randomIndex];
            const status = statuses[randomIndex];
            const firstName = user.first_name || 'Patient';
            const lastName = user.last_name || 'Inconnu';
            
            let bgColor = '2ECC71';
            if (status === 'critical') bgColor = 'E74C3C';
            else if (status === 'high') bgColor = 'F39C12';
            else if (status === 'low') bgColor = '3498DB';
            
            return {
              id: user.id,
              firstName,
              lastName,
              email: user.email,
              age: Math.floor(Math.random() * 40) + 30,
              lastGlycemia: glycemia,
              status,
              trend: trends[randomIndex],
              lastUpdate: ['2 min', '5 min', '15 min', '30 min', '45 min', '1h'][Math.floor(Math.random() * 6)],
              medicationCompliance: Math.floor(Math.random() * 30) + 70,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=${bgColor}&color=fff&bold=true`,
              pendingPrescriptions: Math.floor(Math.random() * 3),
              unreadAlerts: status === 'critical' || status === 'low' ? Math.floor(Math.random() * 5) + 1 : 0,
              lastMessage: messages[randomIndex]
            };
          });
          
          setPatients(transformedPatients);
        }
      } catch (error) {
        console.error('Erreur lors du rechargement des patients:', error);
      }
    };
    
    checkAuth();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#E74C3C';
      case 'high': return '#F39C12';
      case 'normal': return '#2ECC71';
      case 'low': return '#3498DB';
      default: return '#95A5A6';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp size={16} />;
      case 'down': return <TrendingDown size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      selectedFilter === 'all' ||
      (selectedFilter === 'critical' && (patient.status === 'critical' || patient.status === 'low')) ||
      (selectedFilter === 'normal' && patient.status === 'normal');
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalPatients: patients.length,
    criticalPatients: patients.filter(p => p.status === 'critical' || p.status === 'low').length,
    averageCompliance: Math.round(patients.reduce((acc, p) => acc + p.medicationCompliance, 0) / patients.length) || 0
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!doctor) {
    return null;
  }

  return (
    <div className="medical-dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/glycopilot.png" alt="Logo" className="sidebar-logo" />
            <h2>GlycoPilot</h2>
          </div>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="doctor-profile" onClick={() => setShowProfile(true)}>
          <div className="doctor-avatar">
            {doctor.first_name?.[0]}{doctor.last_name?.[0]}
          </div>
          <div className="doctor-details">
            <h3>Dr. {doctor.first_name} {doctor.last_name}</h3>
            <p>{doctor.email}</p>
          </div>
          <Settings size={18} className="profile-edit-icon" />
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            <User size={20} />
            <span>Mes patients</span>
          </button>
          <button className="nav-item">
            <FileText size={20} />
            <span>Prescriptions</span>
          </button>
          <button className="nav-item">
            <Activity size={20} />
            <span>Statistiques</span>
          </button>
          <button className="nav-item">
            <Bell size={20} />
            <span>Alertes</span>
          </button>
        </nav>

        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.totalPatients}</span>
            <span className="stat-label">Patients</span>
          </div>
          <div className="stat-item critical">
            <span className="stat-value">{stats.criticalPatients}</span>
            <span className="stat-label">Critiques</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.averageCompliance}%</span>
            <span className="stat-label">Observance</span>
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Déconnexion</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1>Mes Patients</h1>
          <div className="top-bar-actions">
            <button className="icon-btn add-patient-btn" onClick={() => setShowAddPatient(true)}>
              <UserPlus size={20} />
              <h4>Ajouter un patient</h4>
            </button>
            <button className="icon-btn">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-bar-modern">
            <Search size={20} />
            <input
              type="text"
              placeholder="Rechercher un patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="filter-chips">
          <button 
            className={`chip ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            Tous ({patients.length})
          </button>
          <button 
            className={`chip critical ${selectedFilter === 'critical' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('critical')}
          >
            <AlertTriangle size={14} />
            Critiques ({stats.criticalPatients})
          </button>
          <button 
            className={`chip ${selectedFilter === 'normal' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('normal')}
          >
            Normaux
          </button>
        </div>

        {/* Patients List */}
        <div className="patients-list">
          {filteredPatients.map((patient) => (
            <div 
              key={patient.id}
              className="patient-item"
              onClick={() => handlePatientClick(patient)}
            >
              <div className="patient-avatar-container">
                <img 
                  src={patient.avatar} 
                  alt={`${patient.firstName} ${patient.lastName}`}
                  className="patient-avatar-img"
                />
                {patient.unreadAlerts > 0 && (
                  <div className="avatar-badge">{patient.unreadAlerts}</div>
                )}
              </div>

              <div className="patient-content">
                <div className="patient-header">
                  <div className="patient-name-row">
                    <h3 className="patient-name">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <span className="patient-time">{patient.lastUpdate}</span>
                  </div>
                </div>

                <div className="patient-info-row">
                  <div className="patient-status-info">
                    <div 
                      className="glycemia-badge"
                      style={{ background: getStatusColor(patient.status) }}
                    >
                      <span className="glycemia-value">{patient.lastGlycemia} g/L</span>
                      {getTrendIcon(patient.trend)}
                    </div>
                    <span className="patient-message">{patient.lastMessage}</span>
                  </div>
                  <ChevronRight size={20} className="chevron-icon" />
                </div>

                <div className="patient-meta">
                  <div className="meta-item">
                    <Pill size={14} />
                    <span>{patient.medicationCompliance}%</span>
                  </div>
                  {patient.pendingPrescriptions > 0 && (
                    <div className="meta-item warning">
                      <FileText size={14} />
                      <span>{patient.pendingPrescriptions} prescription(s)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="empty-state">
            <User size={64} />
            <p>Aucun patient trouvé</p>
          </div>
        )}
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Add Patient Modal */}
      <AddPatient 
        isOpen={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        onPatientAdded={handlePatientAdded}
      />

      {/* Profile Modal */}
      <Profile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        doctor={doctor}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}