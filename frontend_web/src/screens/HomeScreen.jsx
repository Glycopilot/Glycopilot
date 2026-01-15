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
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import authService from '../services/authService';
import { toastSuccess, toastError } from '../services/toastService';
import './css/HomeScreen.css';

export default function HomeScreen({ navigation }) {
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  // Données de démonstration
  const mockPatients = [
    {
      id: 1,
      firstName: 'Marie',
      lastName: 'Dubois',
      age: 45,
      lastGlycemia: 1.85,
      status: 'critical',
      trend: 'up',
      lastUpdate: '2 min',
      medicationCompliance: 85,
      avatar: 'https://ui-avatars.com/api/?name=Marie+Dubois&background=E74C3C&color=fff&bold=true',
      pendingPrescriptions: 1,
      unreadAlerts: 3,
      lastMessage: 'Glycémie critique détectée'
    },
    {
      id: 2,
      firstName: 'Jean',
      lastName: 'Martin',
      age: 62,
      lastGlycemia: 1.15,
      status: 'normal',
      trend: 'stable',
      lastUpdate: '15 min',
      medicationCompliance: 95,
      avatar: 'https://ui-avatars.com/api/?name=Jean+Martin&background=2ECC71&color=fff&bold=true',
      pendingPrescriptions: 0,
      unreadAlerts: 0,
      lastMessage: 'Tout va bien'
    },
    {
      id: 3,
      firstName: 'Sophie',
      lastName: 'Bernard',
      age: 38,
      lastGlycemia: 0.65,
      status: 'low',
      trend: 'down',
      lastUpdate: '5 min',
      medicationCompliance: 78,
      avatar: 'https://ui-avatars.com/api/?name=Sophie+Bernard&background=3498DB&color=fff&bold=true',
      pendingPrescriptions: 2,
      unreadAlerts: 5,
      lastMessage: 'Hypoglycémie légère'
    },
    {
      id: 4,
      firstName: 'Pierre',
      lastName: 'Leroy',
      age: 55,
      lastGlycemia: 1.45,
      status: 'high',
      trend: 'up',
      lastUpdate: '30 min',
      medicationCompliance: 90,
      avatar: 'https://ui-avatars.com/api/?name=Pierre+Leroy&background=F39C12&color=fff&bold=true',
      pendingPrescriptions: 0,
      unreadAlerts: 1,
      lastMessage: 'Glycémie en hausse'
    },
    {
      id: 5,
      firstName: 'Claire',
      lastName: 'Moreau',
      age: 41,
      lastGlycemia: 1.10,
      status: 'normal',
      trend: 'stable',
      lastUpdate: '1h',
      medicationCompliance: 100,
      avatar: 'https://ui-avatars.com/api/?name=Claire+Moreau&background=2ECC71&color=fff&bold=true',
      pendingPrescriptions: 0,
      unreadAlerts: 0,
      lastMessage: 'Médicament pris à 9h'
    },
    {
      id: 6,
      firstName: 'Thomas',
      lastName: 'Petit',
      age: 52,
      lastGlycemia: 1.28,
      status: 'normal',
      trend: 'stable',
      lastUpdate: '45 min',
      medicationCompliance: 88,
      avatar: 'https://ui-avatars.com/api/?name=Thomas+Petit&background=2ECC71&color=fff&bold=true',
      pendingPrescriptions: 0,
      unreadAlerts: 0,
      lastMessage: 'Valeurs stables'
    }
  ];

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
          setTimeout(() => {
            setPatients(mockPatients);
            setLoading(false);
          }, 500);
        }
      } catch (error) {
        console.error('Erreur:', error);
        toastError('Erreur', 'Impossible de récupérer vos informations');
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
    averageCompliance: Math.round(patients.reduce((acc, p) => acc + p.medicationCompliance, 0) / patients.length)
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

        <div className="doctor-profile">
          <div className="doctor-avatar">
            {doctor.first_name?.[0]}{doctor.last_name?.[0]}
          </div>
          <div className="doctor-details">
            <h3>Dr. {doctor.first_name} {doctor.last_name}</h3>
            <p>{doctor.email}</p>
          </div>
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

        {/* Patients List - WhatsApp Style */}
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
    </div>
  );
}