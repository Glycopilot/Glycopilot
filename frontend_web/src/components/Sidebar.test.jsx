/**
 * @file Sidebar.test.jsx
 * Tests complets du composant Sidebar
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mocks
jest.mock('../services/authService', () => {
  const api = { post: jest.fn() };
  return {
    __esModule: true,
    default: {
      getApiClient: () => api,
      getStoredUser: jest.fn(() => ({
        first_name: 'Gregory',
        last_name: 'House',
      })),
      logout: jest.fn(),
    },
  };
});

jest.mock('../assets/glycopilot.png', () => 'glycopilot-logo.png');

jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <div data-testid="icon-dashboard" />,
  Users: () => <div data-testid="icon-users" />,
  User: () => <div data-testid="icon-user" />,
  LogOut: () => <div data-testid="icon-logout" />,
  Menu: () => <div data-testid="icon-menu" />,
  X: () => <div data-testid="icon-x" />,
}));

import Sidebar from './Sidebar';
import authService from '../services/authService';

const mockNavigation = { navigate: jest.fn() };

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders nav links correctly', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Mes patients').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Mon profil').length).toBeGreaterThanOrEqual(1);
    });

    it('shows doctor name from stored user', () => {
      authService.getStoredUser.mockReturnValue({
        first_name: 'Gregory',
        last_name: 'House',
      });
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      expect(screen.getAllByText('Dr. House').length).toBeGreaterThanOrEqual(1);
    });

    it('renders with empty user gracefully', () => {
      authService.getStoredUser.mockReturnValueOnce(null);
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    });

    it('reads first_name/last_name from identity when direct fields absent', () => {
      authService.getStoredUser.mockReturnValueOnce({
        identity: { first_name: 'John', last_name: 'Doe' },
      });
      render(<Sidebar activePage="profile" navigation={mockNavigation} />);
      expect(screen.getAllByText('Dr. Doe').length).toBeGreaterThanOrEqual(1);
    });

    it('applies sb-active class to the active link', () => {
      render(<Sidebar activePage="patients" navigation={mockNavigation} />);
      const patientsBtn = screen.getAllByText('Mes patients')[0].closest('button');
      expect(patientsBtn).toHaveClass('sb-active');
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  describe('navigation', () => {
    it('navigates to /home when Dashboard is clicked', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      fireEvent.click(screen.getAllByText('Dashboard')[0]);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('/home');
    });

    it('navigates to /patients when Mes patients is clicked', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      fireEvent.click(screen.getAllByText('Mes patients')[0]);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('/patients');
    });

    it('navigates to /profile when Mon profil is clicked', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      fireEvent.click(screen.getAllByText('Mon profil')[0]);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('/profile');
    });
  });

  // ── Mobile menu ───────────────────────────────────────────────────────────
  describe('mobile menu', () => {
    it('opens mobile drawer when hamburger is clicked', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      const mobileSidebar = document.querySelector('.sidebar-mobile');
      expect(mobileSidebar).not.toHaveClass('sidebar-mobile-open');

      fireEvent.click(screen.getByLabelText('Ouvrir le menu'));
      expect(document.querySelector('.sidebar-mobile')).toHaveClass('sidebar-mobile-open');
    });

    it('closes mobile drawer when sb-close is clicked', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      fireEvent.click(screen.getByLabelText('Ouvrir le menu'));
      expect(document.querySelector('.sidebar-mobile')).toHaveClass('sidebar-mobile-open');

      fireEvent.click(screen.getByLabelText('Fermer le menu'));
      expect(document.querySelector('.sidebar-mobile')).not.toHaveClass('sidebar-mobile-open');
    });

    it('closes mobile drawer when overlay is clicked', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      fireEvent.click(screen.getByLabelText('Ouvrir le menu'));

      const overlay = document.querySelector('.mobile-overlay');
      expect(overlay).toBeInTheDocument();
      fireEvent.click(overlay);
      expect(document.querySelector('.sidebar-mobile')).not.toHaveClass('sidebar-mobile-open');
    });

    it('closes mobile drawer and navigates when a link is clicked', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      fireEvent.click(screen.getByLabelText('Ouvrir le menu'));
      expect(document.querySelector('.sidebar-mobile')).toHaveClass('sidebar-mobile-open');

      // Click on a nav item in the mobile sidebar
      const mobilePatientBtn = document.querySelector('.sidebar-mobile').querySelectorAll('.sb-item')[1];
      fireEvent.click(mobilePatientBtn);
      expect(document.querySelector('.sidebar-mobile')).not.toHaveClass('sidebar-mobile-open');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('/patients');
    });

    it('closes on window resize above 860px', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      fireEvent.click(screen.getByLabelText('Ouvrir le menu'));
      expect(document.querySelector('.sidebar-mobile')).toHaveClass('sidebar-mobile-open');

      // Simulate resize to desktop width
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
        fireEvent(window, new Event('resize'));
      });
      expect(document.querySelector('.sidebar-mobile')).not.toHaveClass('sidebar-mobile-open');
    });

    it('blocks body scroll when mobile menu is open', () => {
      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      fireEvent.click(screen.getByLabelText('Ouvrir le menu'));
      expect(document.body.style.overflow).toBe('hidden');

      fireEvent.click(screen.getByLabelText('Fermer le menu'));
      expect(document.body.style.overflow).toBe('');
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('calls authService.logout and navigates to /login', async () => {
      const api = authService.getApiClient();
      api.post.mockResolvedValueOnce({});

      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      // Use the first logout button (desktop sidebar)
      const logoutBtns = document.querySelectorAll('.sb-logout');
      await act(async () => {
        fireEvent.click(logoutBtns[0]);
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith('/login');
    });

    it('still calls logout and navigates even if API fails', async () => {
      const api = authService.getApiClient();
      api.post.mockRejectedValueOnce(new Error('Network error'));

      render(<Sidebar activePage="home" navigation={mockNavigation} />);
      const logoutBtns = document.querySelectorAll('.sb-logout');
      await act(async () => {
        fireEvent.click(logoutBtns[0]);
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith('/login');
    });
  });
});
