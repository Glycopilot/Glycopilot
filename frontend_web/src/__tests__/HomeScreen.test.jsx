import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HomeScreen from '../screens/HomeScreen';
import authService from '../services/authService';

// Mock authService AVANT l'import du composant (géré par hoisting)
jest.mock('../services/authService', () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      getApiClient: () => mockApi,
      getStoredUser: jest.fn(),
      isAuthenticated: jest.fn(),
    },
  };
});

jest.mock('../services/toastService', () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
}));
jest.mock('../components/Sidebar', () => () => <div data-testid="sidebar" />);
jest.mock('../screens/css/HomeScreen.css', () => ({}));

describe('HomeScreen', () => {
  const mockApiClient = authService.getApiClient();
  
  const mockUser = { first_name: 'Jean', last_name: 'Patient', email: 'jean@test.com' };
  const mockTeam = {
    active_patients: [{ patient_details: { id_user: 'p1', first_name: 'Alice', last_name: 'Wonderland' } }],
    pending_invites: [],
  };
  const mockDashboard = {
    healthScore: 85,
    activity: { steps: { value: 5000, goal: 10000 } },
    alerts: ['hypo'],
  };
  const mockGlycemia = { results: [{ value: 65, unit: 'mg/dL', recorded_at: new Date().toISOString() }] };

  beforeEach(() => {
    jest.clearAllMocks();
    authService.getStoredUser.mockReturnValue(mockUser);
    
    mockApiClient.get.mockImplementation((url) => {
      if (url.includes('/doctors/care-team/my-team/')) return Promise.resolve({ data: mockTeam });
      if (url.includes('/doctors/care-team/patient-dashboard/')) return Promise.resolve({ data: mockDashboard });
      if (url.includes('/doctors/care-team/patient-glycemia/')) return Promise.resolve({ data: mockGlycemia });
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  const renderHome = () => render(<HomeScreen navigation={{ navigate: jest.fn() }} />);

  it('renders correctly and displays user greeting', async () => {
    renderHome();
    await waitFor(() => {
      expect(screen.getByText(/Bonjour|Bon après-midi|Bonsoir/)).toBeTruthy();
      expect(screen.getByText(/Jean/)).toBeTruthy();
    });
  });

  it('displays KPI cards with correct values', async () => {
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('85')).toBeTruthy();
    });
  });

  it('displays alerts in the alerts list', async () => {
    renderHome();
    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeTruthy();
      expect(screen.getByText('Hypoglycémie')).toBeTruthy();
    });
  });
});
