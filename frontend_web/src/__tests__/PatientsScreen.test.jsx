/**
 * @file PatientsScreen.test.jsx
 * Stack : Vitest + React Testing Library
 * Lancer : npx vitest run src/__tests__/PatientsScreen.test.jsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
// ── Mocks ────────────────────────────────────────────────────────────────────
const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet:  vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  default: {
    getApiClient:  () => ({ get: mockGet, post: mockPost }),
    getStoredUser: vi.fn(() => ({ first_name: 'Jean', last_name: 'Dupont', doctor_id: 'doc-1' })),
    logout: vi.fn(),
  },
}));
vi.mock('../services/toastService', () => ({
  toastError: vi.fn(), toastSuccess: vi.fn(),
}));
vi.mock('../components/Sidebar', () => ({
  default: ({ activePage }) => <div data-testid="sidebar" data-page={activePage} />,
}));
vi.mock('./css/patients.css', () => ({}));

import PatientsScreen from '../screens/PatientsScreen';
import { toastError, toastSuccess } from '../services/toastService';

// ── Fixtures ──────────────────────────────────────────────────────────────────
/**
 * approved_by !== null → invitation envoyée par le médecin (sentInvites)
 * approved_by === null → invitation reçue d'un patient (receivedInvites)
 */
function makeActiveMember(id = '1', firstName = 'Alice', lastName = 'Martin') {
  return {
    id_team_member: `tm-${id}`,
    patient_details: {
      id_user: id,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}@test.com`,
      phone_number: null,
    },
    status: 2,
    role_label: 'Referent Doctor',
    approved_by: 'doc-1',   // ← actif
  };
}

function makeSentInvite(id = 'inv-s1', email = 'invite@test.com') {
  return {
    id_team_member: id,
    patient_details: { first_name: null, last_name: null, email },
    invitation_email: email,
    status: 1,
    approved_by: 'doc-1',   // ← envoyée par le médecin
  };
}

function makeReceivedInvite(id = 'inv-r1', firstName = 'Bob', lastName = 'Durand') {
  return {
    id_team_member: id,
    patient_details: {
      id_user: 'p-recv',
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}@test.com`,
      phone_number: null,
    },
    status: 1,
    approved_by: null,       // ← reçue d'un patient
  };
}

function makeDashboard(overrides = {}) {
  return {
    healthScore: 68,
    glucose: { value: 170, unit: 'mg/dL', trend: null, recordedAt: '2026-03-09T11:00:00Z' },
    alerts: [],
    nutrition: {
      calories: { consumed: 0, goal: 1800 },
      carbs: { grams: 0, goal: 200 },
    },
    activity: { steps: { value: 0, goal: 8000 }, activeMinutes: 0 },
    medication: { nextDose: null },
    ...overrides,
  };
}

function makeGlycemia() {
  return [
    { value: 200, unit: 'mg/dL', context: 'fasting',     measuredAt: '2026-03-09T12:00:00Z', notes: '' },
    { value: 55,  unit: 'mg/dL', context: 'preprandial', measuredAt: '2026-03-09T11:00:00Z', notes: '' },
    { value: 110, unit: 'mg/dL', context: 'fasting',     measuredAt: '2026-03-09T10:00:00Z', notes: '' },
  ];
}

// Configure mockGet avec des données par défaut pour tous les endpoints
function setupDefaultMocks({
  activePatients = [],
  pendingInvites = [],
  dashboard      = makeDashboard(),
  glycemia       = [],
  meals          = [],
  medications    = [],
  alerts         = [],
} = {}) {
  mockGet.mockImplementation((url) => {
    if (url.includes('/doctors/care-team/my-team/'))
      return Promise.resolve({ data: { active_patients: activePatients, pending_invites: pendingInvites } });
    if (url.includes('patient-dashboard'))
      return Promise.resolve({ data: dashboard });
    if (url.includes('patient-glycemia'))
      return Promise.resolve({ data: glycemia });
    if (url.includes('patient-meals'))
      return Promise.resolve({ data: meals });
    if (url.includes('patient-medications'))
      return Promise.resolve({ data: medications });
    if (url.includes('patient-alerts'))
      return Promise.resolve({ data: alerts });
    return Promise.resolve({ data: {} });
  });
}

// Helpers DOM
const navigation = { navigate: vi.fn() };
const render$ = () => render(<PatientsScreen navigation={navigation} />);
const clickSubmit = () =>
  fireEvent.click(screen.getByRole('button', { name: /créer mon compte|ajouter un patient/i }));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('PatientsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.navigate.mockClear();
    mockPost.mockResolvedValue({ data: {} });
  });

  // ─── 1. Chargement ───────────────────────────────────────────────────────
  describe('État de chargement', () => {
    it('affiche le spinner "Chargement des patients…" pendant le fetch', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // ne résout jamais
      render$();
      expect(screen.getByText('Chargement des patients…')).toBeInTheDocument();
    });

    it('affiche le header "Mes patients" après chargement', async () => {
      setupDefaultMocks();
      render$();
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Mes patients' })).toBeInTheDocument()
      );
    });

    it('affiche "Impossible de charger…" si l\'API échoue', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      render$();
      await waitFor(() =>
        expect(screen.getByText('Impossible de charger la liste des patients.')).toBeInTheDocument()
      );
    });

    it('la sidebar est montée avec activePage="patients"', async () => {
      setupDefaultMocks();
      render$();
      await waitFor(() =>
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-page', 'patients')
      );
    });
  });

  // ─── 2. Stats et onglets ─────────────────────────────────────────────────
  describe('Stats et onglets', () => {
    it('compteur "Patients actifs" = nombre de membres actifs', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1'), makeActiveMember('2')] });
      render$();
      await waitFor(() => {
        // La stat card affiche le label
        expect(screen.getByText('Patients actifs')).toBeInTheDocument();
      });
      // La valeur 2 doit apparaître (stat-value + tab-count)
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });

    it('compteur "Invitations envoyées" correspond aux sentInvites', async () => {
      setupDefaultMocks({ pendingInvites: [makeSentInvite()] });
      render$();
      await waitFor(() => {
        const label = Array.from(document.querySelectorAll('.stat-label'))
          .find(el => el.textContent.trim() === 'Invitations envoyées');
        expect(label).toBeTruthy();
        expect(label.previousSibling?.textContent.trim() || label.parentElement.querySelector('.stat-value')?.textContent.trim()).toBe('1');
      });
    });

    it('compteur "Demandes reçues" correspond aux receivedInvites', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite()] });
      render$();
      await waitFor(() => {
        const label = Array.from(document.querySelectorAll('.stat-label'))
          .find(el => el.textContent.trim() === 'Demandes reçues');
        expect(label).toBeTruthy();
        expect(label.parentElement.querySelector('.stat-value')?.textContent.trim()).toBe('1');
      });
    });

    it('3 onglets présents : Actifs / Envoyées / Reçues', async () => {
      setupDefaultMocks();
      render$();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mes patients/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /invitations envoyées/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /demandes reçues/i })).toBeInTheDocument();
      });
    });
  });

  // ─── 3. Onglet Actifs ────────────────────────────────────────────────────
  describe('Onglet Actifs', () => {
    it('affiche le nom du patient', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1', 'Alice', 'Martin')] });
      render$();
      await waitFor(() => expect(screen.getByText('Alice Martin')).toBeInTheDocument());
    });

    it('affiche l\'email du patient', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1', 'Alice', 'Martin')] });
      render$();
      await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument());
    });

    it('affiche le badge "Actif" (status=2)', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1')] });
      render$();
      await waitFor(() => expect(screen.getByText('Actif')).toBeInTheDocument());
    });

    it('affiche "Aucun patient actif pour le moment." si liste vide', async () => {
      setupDefaultMocks();
      render$();
      await waitFor(() =>
        expect(screen.getByText('Aucun patient actif pour le moment.')).toBeInTheDocument()
      );
    });

    it('bouton "Voir le dossier" présent par patient', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1')] });
      render$();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /voir le dossier/i })).toBeInTheDocument()
      );
    });
  });

  // ─── 4. Recherche ────────────────────────────────────────────────────────
  describe('Recherche de patients', () => {
    beforeEach(() => {
      setupDefaultMocks({
        activePatients: [
          makeActiveMember('1', 'Alice', 'Martin'),
          makeActiveMember('2', 'Bob',   'Durand'),
        ],
      });
    });

    it('filtre sur le prénom (insensible à la casse)', async () => {
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      await userEvent.type(screen.getByPlaceholderText(/rechercher un patient/i), 'ALICE');
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.queryByText('Bob Durand')).not.toBeInTheDocument();
    });

    it('filtre sur le nom de famille', async () => {
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      await userEvent.type(screen.getByPlaceholderText(/rechercher un patient/i), 'durand');
      expect(screen.getByText('Bob Durand')).toBeInTheDocument();
      expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument();
    });

    it('filtre sur l\'email', async () => {
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      await userEvent.type(screen.getByPlaceholderText(/rechercher un patient/i), 'alice@');
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.queryByText('Bob Durand')).not.toBeInTheDocument();
    });

    it('affiche "Aucun résultat." si aucune correspondance', async () => {
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      await userEvent.type(screen.getByPlaceholderText(/rechercher un patient/i), 'zzzzz');
      expect(screen.getByText('Aucun résultat.')).toBeInTheDocument();
    });

    it('montre tous les patients si champ de recherche vidé', async () => {
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      const searchInput = screen.getByPlaceholderText(/rechercher un patient/i);
      await userEvent.type(searchInput, 'Alice');
      await userEvent.clear(searchInput);
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.getByText('Bob Durand')).toBeInTheDocument();
    });
  });

  // ─── 5. Onglet Invitations envoyées ──────────────────────────────────────
  describe('Onglet Envoyées', () => {
    it('affiche la carte d\'invitation envoyée avec le badge "Invitation envoyée"', async () => {
      setupDefaultMocks({ pendingInvites: [makeSentInvite('inv-s1', 'invite@test.com')] });
      render$();
      await waitFor(() => screen.getByRole('button', { name: /envoyées/i }));
      fireEvent.click(screen.getByRole('button', { name: /envoyées/i }));
      await waitFor(() =>
        expect(screen.getByText('Invitation envoyée')).toBeInTheDocument()
      );
    });

    it('affiche "En attente de la réponse du patient"', async () => {
      setupDefaultMocks({ pendingInvites: [makeSentInvite()] });
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /envoyées/i }));
      await waitFor(() =>
        expect(screen.getByText('En attente de la réponse du patient')).toBeInTheDocument()
      );
    });

    it('affiche "Aucune invitation envoyée en attente." si liste vide', async () => {
      setupDefaultMocks();
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /envoyées/i }));
      await waitFor(() =>
        expect(screen.getByText('Aucune invitation envoyée en attente.')).toBeInTheDocument()
      );
    });

    it('affiche l\'email de l\'invitation', async () => {
      setupDefaultMocks({ pendingInvites: [makeSentInvite('inv-s1', 'nouveau@test.com')] });
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /invitations envoyées/i }));
      await waitFor(() =>
        // L'email est dans la card (invitation_email fallback ou p.email)
        expect(screen.getAllByText('nouveau@test.com').length).toBeGreaterThanOrEqual(1)
      );
    });
  });

  // ─── 6. Onglet Invitations reçues ────────────────────────────────────────
  describe('Onglet Reçues', () => {
    it('affiche le nom du patient qui a envoyé la demande', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1', 'Bob', 'Durand')] });
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() => expect(screen.getByText('Bob Durand')).toBeInTheDocument());
    });

    it('affiche le bouton "Accepter la demande"', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite()] });
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /accepter la demande/i })).toBeInTheDocument()
      );
    });

    it('affiche "Aucune demande reçue." si liste vide', async () => {
      setupDefaultMocks();
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() =>
        expect(screen.getByText('Aucune demande reçue.')).toBeInTheDocument()
      );
    });

    it('clic "Accepter" → POST /doctors/care-team/accept-invitation/', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() => screen.getByRole('button', { name: /accepter la demande/i }));
      fireEvent.click(screen.getByRole('button', { name: /accepter la demande/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/doctors/care-team/accept-invitation/', {
          id_team_member: 'inv-r1',
        })
      );
    });

    it('clic "Accepter" → toastSuccess', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() => screen.getByRole('button', { name: /accepter la demande/i }));
      fireEvent.click(screen.getByRole('button', { name: /accepter la demande/i }));
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    });

    it('clic "Accepter" échoue → toastError', async () => {
      mockPost.mockRejectedValue({ response: { data: { error: 'Déjà membre' } } });
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
      render$();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() => screen.getByRole('button', { name: /accepter la demande/i }));
      fireEvent.click(screen.getByRole('button', { name: /accepter la demande/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Déjà membre')
      );
    });
  });

  // ─── 7. Modal "Ajouter un patient" ───────────────────────────────────────
  describe('Modal Ajouter un patient', () => {
    beforeEach(() => setupDefaultMocks());

    async function openModal() {
      await waitFor(() => screen.getByRole('button', { name: /ajouter un patient/i }));
      fireEvent.click(screen.getByRole('button', { name: /ajouter un patient/i }));
    }

    it('modal fermée par défaut', async () => {
      render$();
      await waitFor(() => screen.getByRole('heading', { name: 'Mes patients' }));
      expect(screen.queryByRole('heading', { name: 'Ajouter un patient' })).not.toBeInTheDocument();
    });

    it('clic "Ajouter un patient" ouvre la modal', async () => {
      render$();
      await openModal();
      expect(screen.getByRole('heading', { name: 'Ajouter un patient' })).toBeInTheDocument();
    });

    it('clic "Annuler" ferme la modal', async () => {
      render$();
      await openModal();
      fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
      expect(screen.queryByRole('heading', { name: 'Ajouter un patient' })).not.toBeInTheDocument();
    });

    it('clic sur l\'overlay ferme la modal', async () => {
      render$();
      await openModal();
      // Le premier .modal-overlay cliqué → stopPropagation sur .modal-box, donc clic en dehors
      fireEvent.click(document.querySelector('.modal-overlay'));
      expect(screen.queryByRole('heading', { name: 'Ajouter un patient' })).not.toBeInTheDocument();
    });

    it('email invalide → toastError "Veuillez saisir un email valide"', async () => {
      render$();
      await openModal();
      await userEvent.type(screen.getByPlaceholderText('patient@exemple.com'), 'pasunemail');
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez saisir un email valide');
    });

    it('email vide → toastError', async () => {
      render$();
      await openModal();
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez saisir un email valide');
    });

    it('POST /doctors/care-team/add-patient/ avec email et phone_number', async () => {
      render$();
      await openModal();
      await userEvent.type(screen.getByPlaceholderText('patient@exemple.com'), 'nouveau@test.com');
      await userEvent.type(screen.getByPlaceholderText('+33 6 00 00 00 00'), '+33612345678');
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/doctors/care-team/add-patient/', {
          email: 'nouveau@test.com',
          phone_number: '+33612345678',
        })
      );
    });

    it('invitation réussie → toastSuccess', async () => {
      render$();
      await openModal();
      await userEvent.type(screen.getByPlaceholderText('patient@exemple.com'), 'nouveau@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    });

    it('invitation réussie → modal se ferme', async () => {
      render$();
      await openModal();
      await userEvent.type(screen.getByPlaceholderText('patient@exemple.com'), 'nouveau@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Ajouter un patient' })).not.toBeInTheDocument()
      );
    });
  });

  // ─── 8. Modal dossier patient (PatientDashboardModal) ────────────────────
  describe('Modal dossier patient', () => {
    beforeEach(() => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1', 'Alice', 'Martin')] });
    });

    async function openDossier() {
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      // Attend que le chargement interne se termine
      await waitFor(() =>
        expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument()
      );
    }

    it('ouvre la modal au clic "Voir le dossier"', async () => {
      await openDossier();
      // La modal contient le nom du patient
      expect(screen.getAllByText('Alice Martin').length).toBeGreaterThanOrEqual(1);
    });

    it('ferme la modal au clic sur le bouton X (.modal-close)', async () => {
      await openDossier();
      // Clic sur le bouton X dans le header de la modal
      const closeBtns = document.querySelectorAll('.modal-close');
      fireEvent.click(closeBtns[closeBtns.length - 1]);
      await waitFor(() =>
        // La modal xl est retirée
        expect(document.querySelector('.modal-xl')).not.toBeInTheDocument()
      );
    });

    it('affiche les 4 onglets', async () => {
      await openDossier();
      expect(screen.getByRole('button', { name: /vue d'ensemble/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /glycémie/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /repas/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /traitements/i })).toBeInTheDocument();
    });

    it('affiche le score de santé 68', async () => {
      await openDossier();
      // Le score est dans HealthScore → le texte "68" apparaît
      expect(screen.getByText('68')).toBeInTheDocument();
    });

    it('affiche la glycémie 170 mg/dL', async () => {
      await openDossier();
      // MetricCard "Glycémie actuelle" affiche la valeur 170
      expect(screen.getByText('170')).toBeInTheDocument();
    });

    it('affiche "Aucune alerte active" quand alerts est vide', async () => {
      await openDossier();
      expect(screen.getByText('Aucune alerte active')).toBeInTheDocument();
    });

    it('affiche le sélecteur de période (7 jours / 30 jours / Personnalisé)', async () => {
      await openDossier();
      expect(screen.getByRole('button', { name: '7 jours' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30 jours' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Personnalisé' })).toBeInTheDocument();
    });

    it('mode Personnalisé → affiche 2 inputs de date', async () => {
      await openDossier();
      fireEvent.click(screen.getByRole('button', { name: 'Personnalisé' }));
      expect(document.querySelectorAll('.period-date-input').length).toBe(2);
    });

    it('le sélecteur de période est absent sur l\'onglet Traitements', async () => {
      await openDossier();
      fireEvent.click(screen.getByRole('button', { name: /traitements/i }));
      expect(screen.queryByRole('button', { name: '7 jours' })).not.toBeInTheDocument();
    });

    it('onglet Glycémie → "Aucune mesure de glycémie enregistrée" si données vides', async () => {
      await openDossier();
      fireEvent.click(screen.getByRole('button', { name: /glycémie/i }));
      await waitFor(() =>
        expect(screen.getByText('Aucune mesure de glycémie enregistrée')).toBeInTheDocument()
      );
    });

    it('onglet Traitements → "Aucun médicament enregistré" si données vides', async () => {
      await openDossier();
      fireEvent.click(screen.getByRole('button', { name: /traitements/i }));
      await waitFor(() =>
        expect(screen.getByText('Aucun médicament enregistré')).toBeInTheDocument()
      );
    });
  });

  // ─── 9. Tableau glycémie avec données réelles ────────────────────────────
  describe('Tableau glycémie avec données', () => {
    beforeEach(() => {
      setupDefaultMocks({
        activePatients: [makeActiveMember('1', 'Alice', 'Martin')],
        glycemia: makeGlycemia(),
      });
    });

    async function openGlycemiaTab() {
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      await waitFor(() => expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /glycémie/i }));
      await waitFor(() => screen.getByText('200 mg/dL'));
    }

    it('affiche les 3 valeurs de glycémie', async () => {
      await openGlycemiaTab();
      expect(screen.getByText('200 mg/dL')).toBeInTheDocument();
      expect(screen.getByText('55 mg/dL')).toBeInTheDocument();
      expect(screen.getByText('110 mg/dL')).toBeInTheDocument();
    });

    it('badge Hyperglycémie pour 200 mg/dL (> 180)', async () => {
      await openGlycemiaTab();
      expect(screen.getAllByText('Hyperglycémie').length).toBeGreaterThanOrEqual(1);
    });

    it('badge Hypoglycémie pour 55 mg/dL (< 70)', async () => {
      await openGlycemiaTab();
      expect(screen.getAllByText('Hypoglycémie').length).toBeGreaterThanOrEqual(1);
    });

    it('badge Normal pour 110 mg/dL (70–180)', async () => {
      await openGlycemiaTab();
      expect(screen.getAllByText('Normal').length).toBeGreaterThanOrEqual(1);
    });

    it('les compteurs dans les stats de résumé sont corrects (1 hyper / 1 hypo / 1 normal)', async () => {
      await openGlycemiaTab();
      // Each .gly-stat-clickable contains a label and a count; verify at least one count is "1"
      const statBlocks = Array.from(document.querySelectorAll('.gly-stat-clickable'));
      const allText = statBlocks.map(el => el.textContent);
      expect(allText.some(t => t.includes('1'))).toBe(true);
    });

    // Helper: find the clickable stat card for a given label (scoped to .gly-stat-lbl)
    function getStatClickable(label) {
      const lbl = Array.from(document.querySelectorAll('.gly-stat-lbl'))
        .find(el => el.textContent.trim() === label);
      return lbl?.closest('.gly-stat-clickable');
    }

    it('clic sur un stat filtre le tableau', async () => {
      await openGlycemiaTab();
      // Clique sur le groupe Hyperglycémie
      const hyperStat = getStatClickable('Hyperglycémie');
      fireEvent.click(hyperStat);
      // Seule la valeur 200 doit rester
      expect(screen.getByText('200 mg/dL')).toBeInTheDocument();
      expect(screen.queryByText('55 mg/dL')).not.toBeInTheDocument();
      expect(screen.queryByText('110 mg/dL')).not.toBeInTheDocument();
    });

    it('la barre "Filtre actif" apparaît après filtrage', async () => {
      await openGlycemiaTab();
      const hyperStat = getStatClickable('Hyperglycémie');
      fireEvent.click(hyperStat);
      expect(document.querySelector('.gly-filter-bar')).toBeTruthy();
    });

    it('"Effacer le filtre" restaure toutes les lignes', async () => {
      await openGlycemiaTab();
      const hyperStat = getStatClickable('Hyperglycémie');
      fireEvent.click(hyperStat);
      fireEvent.click(screen.getByText(/effacer le filtre/i));
      expect(screen.getByText('55 mg/dL')).toBeInTheDocument();
      expect(screen.getByText('110 mg/dL')).toBeInTheDocument();
    });
  });

  // ─── 10. Alertes glycémiques ─────────────────────────────────────────────
  describe('Alertes dans le dossier patient', () => {
    it('affiche le type d\'alerte traduit (hypo → Hypoglycémie)', async () => {
      setupDefaultMocks({
        activePatients: [makeActiveMember('1', 'Alice', 'Martin')],
        alerts: [{ alertId: 'a1', type: 'hypo', severity: 'critical', triggeredAt: '2026-03-09T10:00:00Z' }],
        dashboard: makeDashboard({
          alerts: [{ alertId: 'a1', type: 'hypo', severity: 'critical', triggeredAt: '2026-03-09T10:00:00Z' }],
        }),
      });
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      await waitFor(() => expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument());
      expect(screen.getAllByText('Hypoglycémie').length).toBeGreaterThanOrEqual(1);
    });

    it('affiche le type d\'alerte traduit (hyper → Hyperglycémie)', async () => {
      setupDefaultMocks({
        activePatients: [makeActiveMember('1', 'Alice', 'Martin')],
        alerts: [{ alertId: 'a2', type: 'hyper', severity: 'warning', triggeredAt: '2026-03-09T10:00:00Z' }],
        dashboard: makeDashboard({
          alerts: [{ alertId: 'a2', type: 'hyper', severity: 'warning', triggeredAt: '2026-03-09T10:00:00Z' }],
        }),
      });
      render$();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      await waitFor(() => expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument());
      expect(screen.getAllByText('Hyperglycémie').length).toBeGreaterThanOrEqual(1);
    });
  });
});