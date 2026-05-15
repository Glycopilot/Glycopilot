import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('../../services/authService', () => {
  const apiClient = { get: jest.fn(), post: jest.fn() };
  return {
    __esModule: true,
    default: {
      getApiClient: () => apiClient,
      getStoredUser: () => ({ first_name: 'Jean', last_name: 'Dupont' }),
    },
  };
});
jest.mock('../../services/toastService', () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
}));
jest.mock('../../components/Sidebar', () => ({
  __esModule: true,
  default: ({ activePage }) => <div data-testid="sidebar" data-page={activePage} />,
}));

import HomeScreen from '../../screens/HomeScreen';
import authService from '../../services/authService';
import { toastError } from '../../services/toastService';

const { get: mockGet } = authService.getApiClient();

function makePatient(id, firstName, lastName) {
  return {
    id_team_member: `tm-${id}`,
    patient_details: {
      id_user: id,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}@test.com`,
    },
    status: 2,
  };
}

function makeDashboard({ score = 80, steps = 5000, stepsGoal = 8000, alerts = [] } = {}) {
  return {
    healthScore: score,
    glucose: { value: 110, unit: 'mg/dL' },
    activity: { steps: { value: steps, goal: stepsGoal } },
    alerts,
  };
}

function setupMocks({ patients = [], dashboards = {}, glycemiaMap = {} } = {}) {
  mockGet.mockImplementation((url) => {
    if (url.includes('/doctors/care-team/my-team/'))
      return Promise.resolve({ data: { active_patients: patients, pending_invites: [] } });
    if (url.includes('patient-dashboard')) {
      const pid = new URLSearchParams(url.split('?')[1]).get('patient_user_id');
      return Promise.resolve({ data: dashboards[pid] ?? makeDashboard() });
    }
    if (url.includes('patient-glycemia')) {
      const pid = new URLSearchParams(url.split('?')[1]).get('patient_user_id');
      return Promise.resolve({ data: glycemiaMap[pid] ?? [] });
    }
    return Promise.resolve({ data: {} });
  });
}

const navigation = { navigate: jest.fn() };
const renderHome = () => render(<HomeScreen navigation={navigation} />);

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigation.navigate.mockClear();
  });

  describe('Chargement', () => {
    it('affiche le spinner pendant le fetch', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderHome();
      expect(screen.getByText('Chargement du tableau de bord…')).toBeInTheDocument();
    });

    it('affiche le greeting avec le prénom du médecin', async () => {
      setupMocks();
      renderHome();
      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      );
      expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Jean/);
    });

    it('toastError si /my-team/ échoue', async () => {
      mockGet.mockRejectedValue(new Error('Network down'));
      renderHome();
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', expect.any(String))
      );
    });

    it('sidebar montée avec activePage="home"', async () => {
      setupMocks();
      renderHome();
      await waitFor(() =>
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-page', 'home')
      );
    });
  });

  describe('KPI', () => {
    it('compteur "Patients suivis" = nombre de patients actifs', async () => {
      setupMocks({ patients: [makePatient('1', 'A', 'B'), makePatient('2', 'C', 'D')] });
      renderHome();
      await waitFor(() => screen.getByText('Patients suivis'));
      const kpi = screen.getByText('Patients suivis').closest('.kpi-card');
      expect(kpi.querySelector('.kpi-value').textContent).toBe('2');
    });

    it('compteur "Alertes" reflète les alertes des dashboards', async () => {
      setupMocks({
        patients: [makePatient('1', 'A', 'B')],
        dashboards: {
          '1': makeDashboard({
            alerts: [
              { type: 'hyper', severity: 'critical', triggeredAt: '2026-03-01T10:00:00Z' },
            ],
          }),
        },
      });
      renderHome();
      await waitFor(() => screen.getByText('Alertes enregistrées'));
      const kpi = screen.getByText('Alertes enregistrées').closest('.kpi-card');
      expect(kpi.querySelector('.kpi-value').textContent).toBe('1');
    });

    it('score moyen arrondi de tous les patients', async () => {
      setupMocks({
        patients: [makePatient('1', 'A', 'B'), makePatient('2', 'C', 'D')],
        dashboards: {
          '1': makeDashboard({ score: 60 }),
          '2': makeDashboard({ score: 80 }),
        },
      });
      renderHome();
      await waitFor(() => screen.getByText('Score santé moyen'));
      const kpi = screen.getByText('Score santé moyen').closest('.kpi-card');
      expect(kpi.querySelector('.kpi-value').textContent).toBe('70');
    });

    it('compte les patients avec score ≥ 70', async () => {
      setupMocks({
        patients: [
          makePatient('1', 'A', 'B'),
          makePatient('2', 'C', 'D'),
          makePatient('3', 'E', 'F'),
        ],
        dashboards: {
          '1': makeDashboard({ score: 75 }),
          '2': makeDashboard({ score: 65 }),
          '3': makeDashboard({ score: 90 }),
        },
      });
      renderHome();
      await waitFor(() => screen.getByText('Patients en bonne santé'));
      const kpi = screen.getByText('Patients en bonne santé').closest('.kpi-card');
      expect(kpi.querySelector('.kpi-value').textContent).toBe('2');
    });

    it('— si aucun patient (pas de score moyen)', async () => {
      setupMocks();
      renderHome();
      await waitFor(() => screen.getByText('Score santé moyen'));
      const kpi = screen.getByText('Score santé moyen').closest('.kpi-card');
      expect(kpi.querySelector('.kpi-value').textContent).toBe('—');
    });
  });

  describe('Section alertes', () => {
    it('"Aucune alerte active" quand aucun patient n\'a d\'alerte', async () => {
      setupMocks({ patients: [makePatient('1', 'Alice', 'Martin')] });
      renderHome();
      await waitFor(() =>
        expect(screen.getByText('Aucune alerte active')).toBeInTheDocument()
      );
    });

    it('affiche le nom du patient en alerte', async () => {
      setupMocks({
        patients: [makePatient('1', 'Alice', 'Martin')],
        dashboards: {
          '1': makeDashboard({
            alerts: [{ type: 'hyper', severity: 'critical', triggeredAt: '2026-03-09T10:00:00Z' }],
          }),
        },
        glycemiaMap: {
          '1': [{ value: 220, unit: 'mg/dL', measuredAt: '2026-03-09T10:00:00Z' }],
        },
      });
      renderHome();
      await waitFor(() =>
        expect(document.querySelector('.alert-patient')?.textContent).toBe('Alice Martin')
      );
    });

    it('déduplique les alertes du même type pour un même patient', async () => {
      setupMocks({
        patients: [makePatient('1', 'Alice', 'Martin')],
        dashboards: {
          '1': makeDashboard({
            alerts: [
              { type: 'hyper', severity: 'critical', triggeredAt: '2026-03-09T10:00:00Z' },
              { type: 'hyper', severity: 'critical', triggeredAt: '2026-03-09T11:00:00Z' },
            ],
          }),
        },
      });
      renderHome();
      await waitFor(() => screen.getByText('Alertes enregistrées'));
      const kpi = screen.getByText('Alertes enregistrées').closest('.kpi-card');
      expect(kpi.querySelector('.kpi-value').textContent).toBe('1');
    });
  });

  describe('Activité récente', () => {
    it('"Aucune donnée d\'activité" si aucun dashboard', async () => {
      setupMocks();
      renderHome();
      await waitFor(() =>
        expect(screen.getByText("Aucune donnée d'activité")).toBeInTheDocument()
      );
    });

    it('liste les patients triés par nombre de pas décroissant', async () => {
      setupMocks({
        patients: [
          makePatient('1', 'Alice', 'Low'),
          makePatient('2', 'Bob', 'High'),
        ],
        dashboards: {
          '1': makeDashboard({ steps: 2000 }),
          '2': makeDashboard({ steps: 9000 }),
        },
      });
      renderHome();
      await waitFor(() => screen.getByText('Bob High'));
      const names = Array.from(document.querySelectorAll('.act-name')).map((n) => n.textContent);
      expect(names[0]).toBe('Bob High');
      expect(names[1]).toBe('Alice Low');
    });

    it('clic "Voir tous" navigue vers /patients', async () => {
      setupMocks({
        patients: [makePatient('1', 'Alice', 'Martin')],
        dashboards: { '1': makeDashboard() },
      });
      renderHome();
      await waitFor(() => screen.getByText(/voir tous/i));
      fireEvent.click(screen.getByText(/voir tous/i));
      expect(navigation.navigate).toHaveBeenCalledWith('/patients');
    });
  });
});
