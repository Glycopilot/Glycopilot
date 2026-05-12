import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfileScreen from '../screens/ProfileScreen';
import authService from '../services/authService';
import passwordService from '../services/passwordService';

// Mock authService AVANT l'import du composant
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

jest.mock('../services/passwordService');
jest.mock('../services/toastService', () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
}));
jest.mock('../components/Sidebar', () => () => <div data-testid="sidebar" />);
jest.mock('../screens/css/Profile.css', () => ({}));

describe('ProfileScreen', () => {
  const mockApiClient = authService.getApiClient();

  const mockUserFull = {
    id_auth: 1,
    email: 'jean@test.com',
    identity: {
      id_user: 'u1',
      first_name: 'Jean',
      last_name: 'Patient',
      profiles: [{
        doctor_details: {
          doctor_id: 'd1',
          license_number: '12345',
          verification_status: 'VERIFIED',
          specialty: 'Endocrinologue',
          medical_center_name: 'Hôpital de Paris',
          medical_center_address: 'Paris',
          user_details: {
            email: 'jean@test.com',
            first_name: 'Jean',
            last_name: 'Patient',
            phone_number: '0123456789',
          }
        }
      }]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService.getStoredUser.mockReturnValue(mockUserFull);
    mockApiClient.get.mockImplementation((url) => {
      if (url.includes('/auth/me/')) return Promise.resolve({ data: mockUserFull });
      return Promise.reject(new Error('Unknown URL'));
    });
    mockApiClient.patch.mockResolvedValue({ data: {} });
  });

  const renderProfile = () => render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);

  it('renders correctly and displays doctor information', async () => {
    renderProfile();
    await waitFor(() => {
      expect(screen.getByText('Jean Patient')).toBeTruthy();
      expect(screen.getByText(/Endocrinologue/)).toBeTruthy();
    });
  });

  it('allows entering edit mode', async () => {
    renderProfile();
    await waitFor(() => expect(screen.getByText('Modifier le profil')).toBeTruthy());
    fireEvent.click(screen.getByText('Modifier le profil'));
    expect(screen.getByText('Sauvegarder')).toBeTruthy();
  });
});
