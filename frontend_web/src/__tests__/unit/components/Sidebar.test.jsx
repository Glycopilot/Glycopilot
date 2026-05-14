import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../../../services/authService', () => {
  const apiClient = { get: jest.fn(), post: jest.fn() };
  return {
    __esModule: true,
    default: {
      getApiClient:  () => apiClient,
      getStoredUser: () => ({ first_name: 'Jean', last_name: 'Dupont' }),
      logout:        jest.fn(),
    },
  };
});

import Sidebar from '../../../components/Sidebar';
import authService from '../../../services/authService';

const apiClient = authService.getApiClient();
const navigation = { navigate: jest.fn() };

const renderSidebar = (activePage = 'home') =>
  render(<Sidebar activePage={activePage} navigation={navigation} />);

beforeEach(() => {
  jest.clearAllMocks();
  navigation.navigate.mockClear();
});

describe('Sidebar', () => {
  it('affiche les 3 liens de navigation', () => {
    renderSidebar();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mes patients').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mon profil').length).toBeGreaterThanOrEqual(1);
  });

  it('marque le lien actif via la classe sb-active', () => {
    renderSidebar('patients');
    const active = document.querySelectorAll('.sb-active');
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active[0].textContent).toMatch(/mes patients/i);
  });

  it('affiche les initiales et le nom du médecin', () => {
    renderSidebar();
    expect(screen.getAllByText('JD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dr. Dupont').length).toBeGreaterThanOrEqual(1);
  });

  it('clic Dashboard → navigate("/home")', () => {
    renderSidebar('patients');
    fireEvent.click(screen.getAllByText('Dashboard')[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('/home');
  });

  it('clic Mes patients → navigate("/patients")', () => {
    renderSidebar();
    fireEvent.click(screen.getAllByText('Mes patients')[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('/patients');
  });

  it('clic Mon profil → navigate("/profile")', () => {
    renderSidebar();
    fireEvent.click(screen.getAllByText('Mon profil')[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('/profile');
  });

  it('logout POST /auth/logout/ puis navigate("/login")', async () => {
    apiClient.post.mockResolvedValueOnce({});
    renderSidebar();
    const logoutBtn = document.querySelectorAll('.sb-logout')[0];
    fireEvent.click(logoutBtn);
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout/')
    );
    expect(authService.logout).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('/login');
  });

  it('logout navigue quand même si /auth/logout/ échoue', async () => {
    apiClient.post.mockRejectedValueOnce({ response: { status: 401 } });
    renderSidebar();
    const logoutBtn = document.querySelectorAll('.sb-logout')[0];
    fireEvent.click(logoutBtn);
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('/login'));
    expect(authService.logout).toHaveBeenCalled();
  });

  it('le bouton hamburger ouvre le drawer mobile', () => {
    renderSidebar();
    const hamburger = screen.getByLabelText(/ouvrir le menu/i);
    fireEvent.click(hamburger);
    expect(document.querySelector('.sidebar-mobile-open')).toBeTruthy();
  });

  it('le bouton X referme le drawer mobile', () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/ouvrir le menu/i));
    expect(document.querySelector('.sidebar-mobile-open')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/fermer le menu/i));
    expect(document.querySelector('.sidebar-mobile-open')).toBeFalsy();
  });

  it('clic sur l\'overlay referme le drawer mobile', () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/ouvrir le menu/i));
    fireEvent.click(document.querySelector('.mobile-overlay'));
    expect(document.querySelector('.sidebar-mobile-open')).toBeFalsy();
  });

  it('resize > 860px referme le drawer', () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/ouvrir le menu/i));
    window.innerWidth = 1024;
    fireEvent(window, new Event('resize'));
    expect(document.querySelector('.sidebar-mobile-open')).toBeFalsy();
  });

  it('navigation depuis le drawer mobile le ferme', () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/ouvrir le menu/i));
    const mobileDashboard = document.querySelector('.sidebar-mobile .sb-item');
    fireEvent.click(mobileDashboard);
    expect(document.querySelector('.sidebar-mobile-open')).toBeFalsy();
  });
});
