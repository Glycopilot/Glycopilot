import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';
import authService from '../../services/authService';

jest.mock('../../services/authService', () => ({
  getApiClient: jest.fn(() => ({
    post: jest.fn().mockResolvedValue({}),
  })),
  getStoredUser: jest.fn(() => ({
    first_name: 'Jean',
    last_name: 'Dupont',
  })),
  logout: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <div data-testid="icon-dashboard" />,
  Users: () => <div data-testid="icon-users" />,
  User: () => <div data-testid="icon-user" />,
  LogOut: () => <div data-testid="icon-logout" />,
  Menu: () => <div data-testid="icon-menu" />,
  X: () => <div data-testid="icon-x" />,
}));

describe('Sidebar component', () => {
  const mockNavigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render desktop sidebar with correct initials and name', () => {
    render(<Sidebar activePage="home" navigation={mockNavigation} />);
    expect(screen.getAllByText('Dr. Dupont').length).toBeGreaterThan(0);
    expect(screen.getAllByText('JD').length).toBeGreaterThan(0);
  });

  it('should highlight the active page', () => {
    render(<Sidebar activePage="patients" navigation={mockNavigation} />);
    const patientsBtn = screen.getAllByRole('button', { name: /mes patients/i })[0];
    expect(patientsBtn.closest('.sb-item')).toHaveClass('sb-active');
  });

  it('should navigate when a link is clicked', () => {
    render(<Sidebar activePage="home" navigation={mockNavigation} />);
    const profileBtn = screen.getAllByRole('button', { name: /mon profil/i })[0];
    fireEvent.click(profileBtn);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('/profile');
  });

  it('should call handleLogout when logout button is clicked', async () => {
    render(<Sidebar activePage="home" navigation={mockNavigation} />);
    const logoutBtns = screen.getAllByTitle('Se déconnecter');
    fireEvent.click(logoutBtns[0]);

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should open and close mobile menu', () => {
    render(<Sidebar activePage="home" navigation={mockNavigation} />);
    const menuBtn = screen.getByLabelText('Ouvrir le menu');
    fireEvent.click(menuBtn);
    
    expect(document.querySelector('.sidebar-mobile')).toHaveClass('sidebar-mobile-open');

    const closeBtn = screen.getByLabelText('Fermer le menu');
    fireEvent.click(closeBtn);
    expect(document.querySelector('.sidebar-mobile')).not.toHaveClass('sidebar-mobile-open');
  });
});
