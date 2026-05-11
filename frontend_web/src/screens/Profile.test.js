import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileScreen from './ProfileScreen';
import authService from '../services/authService';
import passwordService from '../services/passwordService';
import { toastSuccess, toastError } from '../services/toastService';

// Mocks
jest.mock('../services/authService', () => {
  const mockApi = {
    get: jest.fn().mockResolvedValue({ data: { identity: { profiles: [] } } }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
  };
  return {
    __esModule: true,
    default: {
      getApiClient: () => mockApi,
      getStoredUser: jest.fn(),
    }
  };
});
jest.mock('../services/passwordService');
jest.mock('../services/toastService');
jest.mock('../components/Sidebar', () => () => <div data-testid="sidebar" />);
jest.mock('../assets/glycopilot.png', () => 'logo.png');
jest.mock('./css/Profile.css', () => ({}));
jest.mock('lucide-react', () => ({
  User: () => <div />, Mail: () => <div />, Phone: () => <div />, 
  MapPin: () => <div />, Stethoscope: () => <div />, CreditCard: () => <div />,
  Save: () => <div />, Send: () => <div />, CheckCircle: () => <div />, 
  Pencil: () => <div />, X: () => <div />, Eye: () => <div />, EyeOff: () => <div />,
  Key: () => <div />, Shield: () => <div />, Award: () => <div />, Building: () => <div />,
  LogOut: () => <div />, ChevronRight: () => <div />
}));

const mockDoctorData = {
  identity: {
    profiles: [{
      doctor_details: {
        id_doctor: 'doc-1',
        license_number: '12345',
        specialty: 'Cardiologue',
        medical_center_address: 'Paris',
        user_details: {
          id_auth: 'user-1',
          first_name: 'Gregory',
          last_name: 'House',
          email: 'house@test.com',
          phone_number: '0600000000'
        }
      }
    }]
  }
};

describe('ProfileScreen', () => {
  let mockGet, mockPatch;

  beforeEach(() => {
    jest.clearAllMocks();
    const api = authService.getApiClient();
    mockGet = api.get;
    mockPatch = api.patch;
    mockGet.mockResolvedValue({ data: mockDoctorData });
  });

  it('renders profile data after loading', async () => {
    render(<ProfileScreen navigation={{}} />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Gregory')).toBeInTheDocument();
      expect(screen.getByDisplayValue('House')).toBeInTheDocument();
      expect(screen.getByDisplayValue('house@test.com')).toBeInTheDocument();
    });
  });

  it('handles profile update', async () => {
    render(<ProfileScreen navigation={{}} />);
    
    await waitFor(() => screen.getByDisplayValue('Gregory'));
    
    // Start editing
    fireEvent.click(screen.getByRole('button', { name: /Modifier/i }));
    
    const firstNameInput = screen.getByDisplayValue('Gregory');
    fireEvent.change(firstNameInput, { target: { value: 'Greg' } });
    
    mockPatch.mockResolvedValueOnce({ data: {} });
    mockGet.mockResolvedValueOnce({ data: {
      ...mockDoctorData,
      identity: {
        profiles: [{
          doctor_details: {
            ...mockDoctorData.identity.profiles[0].doctor_details,
            user_details: {
              ...mockDoctorData.identity.profiles[0].doctor_details.user_details,
              first_name: 'Greg'
            }
          }
        }]
      }
    }});

    fireEvent.click(screen.getByText(/Sauvegarder/i));
    
    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/users/me/', expect.objectContaining({
        first_name: 'Greg'
      }));
      expect(toastSuccess).toHaveBeenCalledWith('Profil mis à jour', expect.any(String));
    });
  });

  it('handles password reset request', async () => {
    render(<ProfileScreen navigation={{}} />);
    
    await waitFor(() => screen.getByDisplayValue('Gregory'));
    
    passwordService.requestPasswordReset.mockResolvedValueOnce({});
    
    fireEvent.click(screen.getByText(/Envoyer le lien de réinitialisation/i));
    
    await waitFor(() => {
      expect(passwordService.requestPasswordReset).toHaveBeenCalledWith('house@test.com');
      expect(toastSuccess).toHaveBeenCalledWith('Email envoyé', expect.any(String));
    });
  });
});
