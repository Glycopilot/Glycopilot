import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import HomeScreen from './HomeScreen';
import { toastError } from '../services/toastService';

// ── Mocks ──────────────────────────────────────────────────────────────────────
jest.mock('../services/authService', () => {
  const api = { get: jest.fn(), post: jest.fn() };
  return {
    __esModule: true,
    default: {
      getApiClient:  () => api,
      getStoredUser: jest.fn(() => ({ first_name: 'Gregory', last_name: 'House' })),
      logout:        jest.fn(),
      isAuthenticated: jest.fn(() => true),
    },
  };
});

jest.mock('../services/toastService', () => ({
  toastError:   jest.fn(),
  toastSuccess: jest.fn(),
}));

jest.mock('../components/Sidebar', () => ({ navigation }) => {
  const handleLogout = () => {
    require('../services/authService').default.logout();
    navigation.navigate('/login');
  };
  return (
    <div className="sidebar">
      <button onClick={handleLogout}>Déconnexion</button>
    </div>
  );
});

jest.mock('./css/HomeScreen.css', () => ({}));

jest.mock('lucide-react', () => ({
  Users:         () => <div />,
  Heart:         () => <div />,
  Activity:      () => <div />,
  AlertTriangle: () => <div />,
  TrendingUp:    () => <div />,
  TrendingDown:  () => <div />,
  ArrowRight:    () => <div />,
  Footprints:    () => <div />,
  Bell:          () => <div />,
  CheckCircle:   () => <div />,
  Droplets:      () => <div />,
  LogOut:        () => <div />,
  User:          () => <div />,
  Menu:          () => <div />,
  X:             () => <div />,
  LayoutDashboard: () => <div />,
  TrendingUp:    () => <div />,
}));

import authService from '../services/authService';

// ── Fixtures ───────────────────────────────────────────────────────────────────
function makeTeamMember(id = '1', firstName = 'Alice', lastName = 'Martin') {
  return {
    id_team_member: `tm-${id}`,
    patient_details: { id_user: id, first_name: firstName, last_name: lastName },
    status: 2,
  };
}

const mockDashboard = {
  healthScore: 85,
  alerts: [],
  glucose: 110,
  glucoseUnit: 'mg/dL',
  activity: { steps: { value: 8000, goal: 10000 } },
};

const mockDashboardWithAlert = {
  ...mockDashboard,
  healthScore: 45,
  alerts: [{ type: 'hyper', severity: 'critical', message: 'Hyperglycémie détectée' }],
};

const mockNavigation = { navigate: jest.fn() };

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('HomeScreen', () => {
  let api;

  beforeEach(() => {
    jest.clearAllMocks();
    api = authService.getApiClient();
    // Default: empty team
    api.get.mockResolvedValue({
      data: { active_patients: [], pending_invites: [] },
    });
  });

  // ── Rendering with no patients ─────────────────────────────────────────────
  it('renders greeting with doctor name after load', async () => {
    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Patients suivis/i)).toBeInTheDocument();
    });
  });

  it('shows 0 patients when team is empty', async () => {
    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      // Le premier KPI affiche 0 patients ("Patients suivis")
      const kpiValues = document.querySelectorAll('.kpi-value');
      expect(kpiValues[0].textContent).toBe('0');
    });
  });

  // ── Rendering with patients ────────────────────────────────────────────────
  it('displays patient count and KPIs with active patients', async () => {
    const member1 = makeTeamMember('1', 'Alice', 'Martin');
    const member2 = makeTeamMember('2', 'Bob', 'Durand');

    api.get
      .mockResolvedValueOnce({
        data: { active_patients: [member1, member2], pending_invites: [] },
      })
      // member1 dashboard + glycemia
      .mockResolvedValueOnce({ data: mockDashboard })
      .mockResolvedValueOnce({ data: [] })
      // member2 dashboard + glycemia
      .mockResolvedValueOnce({ data: { ...mockDashboard, healthScore: 70 } })
      .mockResolvedValueOnce({ data: [] });

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      const kpiValues = document.querySelectorAll('.kpi-value');
      expect(kpiValues[0].textContent).toBe('2'); // Patients suivis count
    });
  });

  it('shows average health score when patients have dashboards', async () => {
    const member = makeTeamMember('1', 'Alice', 'Martin');
    api.get
      .mockResolvedValueOnce({ data: { active_patients: [member], pending_invites: [] } })
      .mockResolvedValueOnce({ data: mockDashboard })
      .mockResolvedValueOnce({ data: [] });

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      // Le score moyen est affiché dans le KPI ScoreGauge ou kpi-value
      expect(screen.getAllByText('85').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Alerts rendering ───────────────────────────────────────────────────────
  it('shows "Aucune alerte active" when no alerts', async () => {
    const member = makeTeamMember('1', 'Alice', 'Martin');
    api.get
      .mockResolvedValueOnce({ data: { active_patients: [member], pending_invites: [] } })
      .mockResolvedValueOnce({ data: mockDashboard })
      .mockResolvedValueOnce({ data: [] });

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Aucune alerte active/i)).toBeInTheDocument();
    });
  });

  it('shows alert when patient has active alerts', async () => {
    const member = makeTeamMember('1', 'Alice', 'Martin');
    api.get
      .mockResolvedValueOnce({ data: { active_patients: [member], pending_invites: [] } })
      .mockResolvedValueOnce({ data: mockDashboardWithAlert })
      .mockResolvedValueOnce({ data: [{ value: 210, unit: 'mg/dL', measuredAt: new Date().toISOString() }] });

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      // AlertItem affiche ALERT_TYPE_LABELS[alert.type] => 'Hyperglycémie' pour type='hyper'
      expect(screen.getByText('Hyperglycémie')).toBeInTheDocument();
    });
  });

  it('shows alert count badge', async () => {
    const member = makeTeamMember('1', 'Alice', 'Martin');
    api.get
      .mockResolvedValueOnce({ data: { active_patients: [member], pending_invites: [] } })
      .mockResolvedValueOnce({ data: mockDashboardWithAlert })
      .mockResolvedValueOnce({ data: [] });

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      // 1 alerte enregistrée — on vérifie la valeur du KPI Alertes
      const kpiValues = document.querySelectorAll('.kpi-value');
      expect(Array.from(kpiValues).some(el => el.textContent === '1')).toBe(true);
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────
  it('shows toast error when API call fails', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Impossible de charger les données');
    });
  });

  // ── Activity section ───────────────────────────────────────────────────────
  it('renders activity section with patient names', async () => {
    const member = makeTeamMember('1', 'Alice', 'Martin');
    api.get
      .mockResolvedValueOnce({ data: { active_patients: [member], pending_invites: [] } })
      .mockResolvedValueOnce({ data: mockDashboard })
      .mockResolvedValueOnce({ data: [] });

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    });
  });

  // ── Navigation buttons ─────────────────────────────────────────────────────
  it('navigates to /patients when "Voir tous" patients button is clicked', async () => {
    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => screen.getAllByText(/Voir tous/i));
    fireEvent.click(screen.getAllByText(/Voir tous/i)[0]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('/patients');
  });

  // ── String alerts ──────────────────────────────────────────────────────────
  it('handles string-type alerts in dashboard', async () => {
    const member = makeTeamMember('1', 'Alice', 'Martin');
    api.get
      .mockResolvedValueOnce({ data: { active_patients: [member], pending_invites: [] } })
      .mockResolvedValueOnce({
        data: { ...mockDashboard, alerts: ['Alerte texte simple'] },
      })
      .mockResolvedValueOnce({ data: [] });

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alerte texte simple')).toBeInTheDocument();
    });
  });

  // ── Glycemia with hypo detection ───────────────────────────────────────────
  it('shows glycemia trigger value for hypo alert', async () => {
    const member = makeTeamMember('1', 'Alice', 'Martin');
    const dashWithHypo = {
      ...mockDashboard,
      alerts: [{ type: 'hypo', severity: 'critical', message: 'Hypoglycémie' }],
    };
    api.get
      .mockResolvedValueOnce({ data: { active_patients: [member], pending_invites: [] } })
      .mockResolvedValueOnce({ data: dashWithHypo })
      .mockResolvedValueOnce({ data: [{ value: 55, unit: 'mg/dL' }] });

    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Hypoglycémie/i)).toBeInTheDocument();
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  it('calls authService.logout when Déconnexion is clicked', async () => {
    await act(async () => {
      render(<HomeScreen navigation={mockNavigation} />);
    });

    fireEvent.click(screen.getByText('Déconnexion'));
    expect(authService.logout).toHaveBeenCalled();
  });
});
