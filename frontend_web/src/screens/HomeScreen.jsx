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
            <h2>GLYCOPILOT</h2>
          </div>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            <Activity size={20} />
            <span>Dashboard</span>
          </button>
          <button className="nav-item">
            <User size={20} />
            <span>Patients</span>
          </button>
          <button className="nav-item">
            <Bell size={20} />
            <span>Alerts</span>
          </button>
          <button className="nav-item">
            <FileText size={20} />
            <span>Reports</span>
          </button>
          <button className="nav-item">
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>
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
          <h1>Hello, {doctor.first_name} {doctor.last_name}</h1>
          <div className="top-bar-actions">
            <div className="user-profile" onClick={() => setShowProfile(true)}>
              <div className="user-avatar">
                {doctor.first_name?.[0]}{doctor.last_name?.[0]}
              </div>
              <span className="user-name">{doctor.first_name} {doctor.last_name}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.totalPatients}</div>
            <div className="stat-label">Patients</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{Math.floor(stats.averageCompliance)}%</div>
            <div className="stat-label">Patients with TIR &lt; 70%</div>
            <div className="stat-sublabel">&lt; 70 %</div>
          </div>
          <div className="stat-card alert">
            <div className="stat-number">{stats.criticalPatients}</div>
            <div className="stat-label">Critical alerts</div>
            <div className="stat-sublabel">last 24 h</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{Math.floor(stats.totalPatients * 0.35)}</div>
            <div className="stat-label">Patients with nighttime</div>
            <div className="stat-sublabel">hypo</div>
          </div>
        </div>

        {/* High-Risk Patients Table */}
        <div className="patients-table-container">
          <div className="table-header">
            <h2>High-Risk Patients</h2>
            <div className="table-filters">
              <select className="table-select">
                <option>TIR</option>
              </select>
              <select className="table-select">
                <option>Hypo</option>
              </select>
              <select className="table-select">
                <option>Status</option>
              </select>
            </div>
          </div>
          
          <table className="patients-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>TIR (7d)</th>
                <th>Hypo / day</th>
                <th>Last alert</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.slice(0, 5).map((patient) => (
                <tr key={patient.id}>
                  <td className="patient-name-cell">{patient.firstName} {patient.lastName}</td>
                  <td>Type {Math.random() > 0.5 ? '1' : '2'}</td>
                  <td>{Math.floor(patient.medicationCompliance)}%</td>
                  <td>{(Math.random() * 2).toFixed(1)}</td>
                  <td>{patient.lastUpdate} ago</td>
                  <td>
                    <button className="view-chart-btn">View chart</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Time in Range Distribution */}
        <div className="chart-container">
          <h2>Time in Range Distribution</h2>
          <div className="chart-bars">
            <div className="bar-group">
              <div className="bar" style={{ height: '120px' }}></div>
              <div className="bar-label">0-40%</div>
            </div>
            <div className="bar-group">
              <div className="bar" style={{ height: '140px' }}></div>
              <div className="bar-label">40-60%</div>
            </div>
            <div className="bar-group">
              <div className="bar" style={{ height: '200px' }}></div>
              <div className="bar-label">60-80%</div>
            </div>
            <div className="bar-group">
              <div className="bar" style={{ height: '100px' }}></div>
              <div className="bar-label">&gt;80%</div>
            </div>
          </div>
        </div>
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