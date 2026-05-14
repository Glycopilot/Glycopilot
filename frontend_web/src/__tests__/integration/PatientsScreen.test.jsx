import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../services/authService', () => {
  const apiClient = { get: jest.fn(), post: jest.fn() };
  return {
    __esModule: true,
    default: {
      getApiClient: () => apiClient,
      getStoredUser: jest.fn(() => ({ first_name: 'Jean', last_name: 'Dupont', doctor_id: 'doc-1' })),
      logout: jest.fn(),
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

import PatientsScreen from '../../screens/PatientsScreen';
import authService from '../../services/authService';
import { toastError, toastSuccess } from '../../services/toastService';

const { get: mockGet, post: mockPost } = authService.getApiClient();

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
    approved_by: 'doc-1',
  };
}

function makeSentInvite(id = 'inv-s1', email = 'invite@test.com') {
  return {
    id_team_member: id,
    patient_details: { first_name: null, last_name: null, email },
    invitation_email: email,
    status: 1,
    approved_by: 'doc-1',
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
    approved_by: null,
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
    { value: 200, unit: 'mg/dL', context: 'fasting', measuredAt: '2026-03-09T12:00:00Z', notes: '' },
    { value: 55, unit: 'mg/dL', context: 'preprandial', measuredAt: '2026-03-09T11:00:00Z', notes: '' },
    { value: 110, unit: 'mg/dL', context: 'fasting', measuredAt: '2026-03-09T10:00:00Z', notes: '' },
  ];
}

function setupDefaultMocks({
  activePatients = [],
  pendingInvites = [],
  dashboard = makeDashboard(),
  glycemia = [],
  meals = [],
  medications = [],
  alerts = [],
} = {}) {
  mockGet.mockImplementation((url) => {
    if (url.includes('/doctors/care-team/my-team/'))
      return Promise.resolve({ data: { active_patients: activePatients, pending_invites: pendingInvites } });
    if (url.includes('patient-dashboard')) return Promise.resolve({ data: dashboard });
    if (url.includes('patient-glycemia')) return Promise.resolve({ data: glycemia });
    if (url.includes('patient-meals')) return Promise.resolve({ data: meals });
    if (url.includes('patient-medications')) return Promise.resolve({ data: medications });
    if (url.includes('patient-alerts')) return Promise.resolve({ data: alerts });
    return Promise.resolve({ data: {} });
  });
}

const navigation = { navigate: jest.fn() };
const renderPatients = () => render(<PatientsScreen navigation={navigation} />);

describe('PatientsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigation.navigate.mockClear();
    mockPost.mockResolvedValue({ data: {} });
  });

  describe('État de chargement', () => {
    it('affiche le spinner pendant le fetch', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderPatients();
      expect(screen.getByText('Chargement des patients…')).toBeInTheDocument();
    });

    it('affiche le header "Mes patients" après chargement', async () => {
      setupDefaultMocks();
      renderPatients();
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Mes patients' })).toBeInTheDocument()
      );
    });

    it('affiche un message d\'erreur si l\'API échoue', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));
      renderPatients();
      await waitFor(() =>
        expect(screen.getByText('Impossible de charger la liste des patients.')).toBeInTheDocument()
      );
    });

    it('monte la sidebar avec activePage="patients"', async () => {
      setupDefaultMocks();
      renderPatients();
      await waitFor(() =>
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-page', 'patients')
      );
    });
  });

  describe('Onglets et compteurs', () => {
    const tabCount = (tabName) =>
      screen.getByRole('button', { name: tabName }).querySelector('.tab-count')?.textContent.trim();

    it('compteur Mes patients', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1'), makeActiveMember('2')] });
      renderPatients();
      await waitFor(() => screen.getByRole('button', { name: /mes patients/i }));
      expect(tabCount(/mes patients/i)).toBe('2');
    });

    it('compteur Invitations envoyées', async () => {
      setupDefaultMocks({ pendingInvites: [makeSentInvite()] });
      renderPatients();
      await waitFor(() => screen.getByRole('button', { name: /invitations envoyées/i }));
      expect(tabCount(/invitations envoyées/i)).toBe('1');
    });

    it('compteur Demandes reçues', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite()] });
      renderPatients();
      await waitFor(() => screen.getByRole('button', { name: /demandes reçues/i }));
      expect(tabCount(/demandes reçues/i)).toBe('1');
    });

    it('3 onglets présents', async () => {
      setupDefaultMocks();
      renderPatients();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mes patients/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /invitations envoyées/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /demandes reçues/i })).toBeInTheDocument();
      });
    });
  });

  describe('Onglet Actifs', () => {
    it('affiche le nom du patient', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1', 'Alice', 'Martin')] });
      renderPatients();
      await waitFor(() => expect(screen.getByText('Alice Martin')).toBeInTheDocument());
    });

    it('affiche l\'email du patient', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1', 'Alice', 'Martin')] });
      renderPatients();
      await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument());
    });

    it('affiche le badge "Actif"', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1')] });
      renderPatients();
      await waitFor(() => expect(screen.getByText('Actif')).toBeInTheDocument());
    });

    it('affiche un message si liste vide', async () => {
      setupDefaultMocks();
      renderPatients();
      await waitFor(() =>
        expect(screen.getByText('Aucun patient actif pour le moment.')).toBeInTheDocument()
      );
    });

    it('bouton "Voir le dossier" par patient', async () => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1')] });
      renderPatients();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /voir le dossier/i })).toBeInTheDocument()
      );
    });
  });

  describe('Recherche', () => {
    beforeEach(() => {
      setupDefaultMocks({
        activePatients: [
          makeActiveMember('1', 'Alice', 'Martin'),
          makeActiveMember('2', 'Bob', 'Durand'),
        ],
      });
    });

    it('filtre sur le prénom (insensible à la casse)', async () => {
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      await userEvent.type(screen.getByPlaceholderText(/rechercher un patient/i), 'ALICE');
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.queryByText('Bob Durand')).not.toBeInTheDocument();
    });

    it('filtre sur le nom', async () => {
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      await userEvent.type(screen.getByPlaceholderText(/rechercher un patient/i), 'durand');
      expect(screen.getByText('Bob Durand')).toBeInTheDocument();
      expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument();
    });

    it('filtre sur l\'email', async () => {
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      await userEvent.type(screen.getByPlaceholderText(/rechercher un patient/i), 'alice@');
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.queryByText('Bob Durand')).not.toBeInTheDocument();
    });

    it('"Aucun résultat" si aucune correspondance', async () => {
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      await userEvent.type(screen.getByPlaceholderText(/rechercher un patient/i), 'zzzzz');
      expect(screen.getByText('Aucun résultat.')).toBeInTheDocument();
    });

    it('restaure tout après avoir vidé le champ', async () => {
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      const searchInput = screen.getByPlaceholderText(/rechercher un patient/i);
      await userEvent.type(searchInput, 'Alice');
      await userEvent.clear(searchInput);
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.getByText('Bob Durand')).toBeInTheDocument();
    });
  });

  describe('Onglet Envoyées', () => {
    it('affiche le badge "Invitation envoyée"', async () => {
      setupDefaultMocks({ pendingInvites: [makeSentInvite('inv-s1', 'invite@test.com')] });
      renderPatients();
      await waitFor(() => screen.getByRole('button', { name: /envoyées/i }));
      fireEvent.click(screen.getByRole('button', { name: /envoyées/i }));
      await waitFor(() =>
        expect(screen.getByText('Invitation envoyée')).toBeInTheDocument()
      );
    });

    it('affiche "En attente de la réponse du patient"', async () => {
      setupDefaultMocks({ pendingInvites: [makeSentInvite()] });
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /envoyées/i }));
      await waitFor(() =>
        expect(screen.getByText('En attente de la réponse du patient')).toBeInTheDocument()
      );
    });

    it('message si aucune invitation envoyée', async () => {
      setupDefaultMocks();
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /envoyées/i }));
      await waitFor(() =>
        expect(screen.getByText('Aucune invitation envoyée en attente.')).toBeInTheDocument()
      );
    });

    it('affiche l\'email de l\'invitation', async () => {
      setupDefaultMocks({ pendingInvites: [makeSentInvite('inv-s1', 'nouveau@test.com')] });
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /invitations envoyées/i }));
      await waitFor(() =>
        expect(screen.getAllByText('nouveau@test.com').length).toBeGreaterThanOrEqual(1)
      );
    });
  });

  describe('Onglet Reçues', () => {
    it('affiche le nom du patient', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1', 'Bob', 'Durand')] });
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() => expect(screen.getByText('Bob Durand')).toBeInTheDocument());
    });

    it('bouton "Accepter la demande" présent', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite()] });
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /accepter la demande/i })).toBeInTheDocument()
      );
    });

    it('message si aucune demande reçue', async () => {
      setupDefaultMocks();
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() =>
        expect(screen.getByText('Aucune demande reçue.')).toBeInTheDocument()
      );
    });

    it('POST /accept-invitation au clic', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() => screen.getByRole('button', { name: /accepter la demande/i }));
      fireEvent.click(screen.getByRole('button', { name: /accepter la demande/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/doctors/care-team/accept-invitation/', {
          id_team_member: 'inv-r1',
        })
      );
    });

    it('toastSuccess après acceptation', async () => {
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() => screen.getByRole('button', { name: /accepter la demande/i }));
      fireEvent.click(screen.getByRole('button', { name: /accepter la demande/i }));
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    });

    it('toastError si acceptation échoue', async () => {
      mockPost.mockRejectedValue({ response: { data: { error: 'Déjà membre' } } });
      setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
      renderPatients();
      fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
      await waitFor(() => screen.getByRole('button', { name: /accepter la demande/i }));
      fireEvent.click(screen.getByRole('button', { name: /accepter la demande/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Déjà membre')
      );
    });

    describe('Refus d\'une demande', () => {
      async function goToReceived() {
        renderPatients();
        fireEvent.click(await screen.findByRole('button', { name: /reçues/i }));
        await waitFor(() => screen.getByRole('button', { name: /^refuser$/i }));
      }

      it('bouton "Refuser" présent à côté de "Accepter la demande"', async () => {
        setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
        await goToReceived();
        expect(screen.getByRole('button', { name: /^refuser$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /accepter la demande/i })).toBeInTheDocument();
      });

      it('clic "Refuser" affiche la confirmation et masque les boutons initiaux', async () => {
        setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
        await goToReceived();
        fireEvent.click(screen.getByRole('button', { name: /^refuser$/i }));
        expect(screen.getByRole('alertdialog', { name: /confirmer le refus/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirmer le refus/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /accepter la demande/i })).not.toBeInTheDocument();
      });

      it('"Annuler" referme la confirmation sans POST', async () => {
        setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
        await goToReceived();
        fireEvent.click(screen.getByRole('button', { name: /^refuser$/i }));
        fireEvent.click(screen.getByRole('button', { name: /^annuler$/i }));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /accepter la demande/i })).toBeInTheDocument();
        expect(mockPost).not.toHaveBeenCalledWith(
          '/doctors/care-team/decline-invitation/',
          expect.anything()
        );
      });

      it('"Confirmer le refus" → POST /decline-invitation/ avec l\'id', async () => {
        setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
        await goToReceived();
        fireEvent.click(screen.getByRole('button', { name: /^refuser$/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirmer le refus/i }));
        await waitFor(() =>
          expect(mockPost).toHaveBeenCalledWith('/doctors/care-team/decline-invitation/', {
            id_team_member: 'inv-r1',
          })
        );
      });

      it('refus réussi → toastSuccess', async () => {
        setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
        await goToReceived();
        fireEvent.click(screen.getByRole('button', { name: /^refuser$/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirmer le refus/i }));
        await waitFor(() =>
          expect(toastSuccess).toHaveBeenCalledWith(
            'Demande refusée',
            expect.stringMatching(/refusée/i)
          )
        );
      });

      it('refus réussi → fetchTeam relancé pour rafraîchir la liste', async () => {
        setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
        await goToReceived();
        const initialCallCount = mockGet.mock.calls.filter(
          ([url]) => url.includes('/doctors/care-team/my-team/')
        ).length;
        fireEvent.click(screen.getByRole('button', { name: /^refuser$/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirmer le refus/i }));
        await waitFor(() => {
          const after = mockGet.mock.calls.filter(
            ([url]) => url.includes('/doctors/care-team/my-team/')
          ).length;
          expect(after).toBeGreaterThan(initialCallCount);
        });
      });

      it('refus échoue → toastError, confirmation se ferme', async () => {
        mockPost.mockRejectedValueOnce({ response: { data: { error: 'Action non autorisée' } } });
        setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
        await goToReceived();
        fireEvent.click(screen.getByRole('button', { name: /^refuser$/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirmer le refus/i }));
        await waitFor(() =>
          expect(toastError).toHaveBeenCalledWith('Erreur', 'Action non autorisée')
        );
      });

      it('aucun POST envoyé si on accepte sans passer par le refus', async () => {
        setupDefaultMocks({ pendingInvites: [makeReceivedInvite('inv-r1')] });
        await goToReceived();
        fireEvent.click(screen.getByRole('button', { name: /accepter la demande/i }));
        await waitFor(() =>
          expect(mockPost).toHaveBeenCalledWith(
            '/doctors/care-team/accept-invitation/',
            expect.anything()
          )
        );
        expect(mockPost).not.toHaveBeenCalledWith(
          '/doctors/care-team/decline-invitation/',
          expect.anything()
        );
      });
    });
  });

  describe('Modal Ajouter un patient', () => {
    beforeEach(() => setupDefaultMocks());

    async function openModal() {
      await waitFor(() => screen.getByRole('button', { name: /ajouter un patient/i }));
      fireEvent.click(screen.getByRole('button', { name: /ajouter un patient/i }));
    }

    it('fermée par défaut', async () => {
      renderPatients();
      await waitFor(() => screen.getByRole('heading', { name: 'Mes patients' }));
      expect(screen.queryByRole('heading', { name: 'Ajouter un patient' })).not.toBeInTheDocument();
    });

    it('ouverte au clic', async () => {
      renderPatients();
      await openModal();
      expect(screen.getByRole('heading', { name: 'Ajouter un patient' })).toBeInTheDocument();
    });

    it('fermée au clic "Annuler"', async () => {
      renderPatients();
      await openModal();
      fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
      expect(screen.queryByRole('heading', { name: 'Ajouter un patient' })).not.toBeInTheDocument();
    });

    it('fermée au clic sur l\'overlay', async () => {
      renderPatients();
      await openModal();
      fireEvent.click(document.querySelector('.modal-overlay'));
      expect(screen.queryByRole('heading', { name: 'Ajouter un patient' })).not.toBeInTheDocument();
    });

    it('email invalide → toastError', async () => {
      renderPatients();
      await openModal();
      await userEvent.type(screen.getByPlaceholderText('patient@exemple.com'), 'pasunemail');
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez saisir un email valide');
    });

    it('email vide → toastError', async () => {
      renderPatients();
      await openModal();
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez saisir un email valide');
    });

    it('POST /add-patient avec email et téléphone', async () => {
      renderPatients();
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

    it('toastSuccess après envoi', async () => {
      renderPatients();
      await openModal();
      await userEvent.type(screen.getByPlaceholderText('patient@exemple.com'), 'nouveau@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    });

    it('modal se ferme après envoi réussi', async () => {
      renderPatients();
      await openModal();
      await userEvent.type(screen.getByPlaceholderText('patient@exemple.com'), 'nouveau@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer l'invitation/i }));
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Ajouter un patient' })).not.toBeInTheDocument()
      );
    });
  });

  describe('Modal dossier patient', () => {
    beforeEach(() => {
      setupDefaultMocks({ activePatients: [makeActiveMember('1', 'Alice', 'Martin')] });
    });

    async function openDossier() {
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      await waitFor(() =>
        expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument()
      );
    }

    it('s\'ouvre au clic "Voir le dossier"', async () => {
      await openDossier();
      expect(screen.getAllByText('Alice Martin').length).toBeGreaterThanOrEqual(1);
    });

    it('se ferme au clic sur le X', async () => {
      await openDossier();
      const closeBtns = document.querySelectorAll('.modal-close');
      fireEvent.click(closeBtns[closeBtns.length - 1]);
      await waitFor(() =>
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

    it('affiche le score de santé', async () => {
      await openDossier();
      expect(screen.getByText('68')).toBeInTheDocument();
    });

    it('affiche la glycémie actuelle', async () => {
      await openDossier();
      expect(screen.getByText('170')).toBeInTheDocument();
    });

    it('affiche "Aucune alerte active" si pas d\'alerte', async () => {
      await openDossier();
      expect(screen.getByText('Aucune alerte active')).toBeInTheDocument();
    });

    it('affiche le sélecteur de période', async () => {
      await openDossier();
      expect(screen.getByRole('button', { name: '7 jours' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30 jours' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Personnalisé' })).toBeInTheDocument();
    });

    it('mode Personnalisé → 2 inputs date', async () => {
      await openDossier();
      fireEvent.click(screen.getByRole('button', { name: 'Personnalisé' }));
      expect(document.querySelectorAll('.period-date-input').length).toBe(2);
    });

    it('sélecteur absent sur l\'onglet Traitements', async () => {
      await openDossier();
      fireEvent.click(screen.getByRole('button', { name: /traitements/i }));
      expect(screen.queryByRole('button', { name: '7 jours' })).not.toBeInTheDocument();
    });

    it('Glycémie vide → message dédié', async () => {
      await openDossier();
      fireEvent.click(screen.getByRole('button', { name: /glycémie/i }));
      await waitFor(() =>
        expect(screen.getByText('Aucune mesure de glycémie enregistrée')).toBeInTheDocument()
      );
    });

    it('Traitements vide → message dédié', async () => {
      await openDossier();
      fireEvent.click(screen.getByRole('button', { name: /traitements/i }));
      await waitFor(() =>
        expect(screen.getByText('Aucun médicament enregistré')).toBeInTheDocument()
      );
    });
  });

  describe('Tableau glycémie avec données', () => {
    beforeEach(() => {
      setupDefaultMocks({
        activePatients: [makeActiveMember('1', 'Alice', 'Martin')],
        glycemia: makeGlycemia(),
      });
    });

    async function openGlycemiaTab() {
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      await waitFor(() =>
        expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole('button', { name: /glycémie/i }));
      await waitFor(() => screen.getByText('200 mg/dL'));
    }

    function getStatClickable(label) {
      const lbl = Array.from(document.querySelectorAll('.gly-stat-lbl'))
        .find((el) => el.textContent.trim() === label);
      return lbl?.closest('.gly-stat-clickable');
    }

    it('affiche les 3 valeurs de glycémie', async () => {
      await openGlycemiaTab();
      expect(screen.getByText('200 mg/dL')).toBeInTheDocument();
      expect(screen.getByText('55 mg/dL')).toBeInTheDocument();
      expect(screen.getByText('110 mg/dL')).toBeInTheDocument();
    });

    it('Hyperglycémie pour 200 mg/dL', async () => {
      await openGlycemiaTab();
      expect(screen.getAllByText('Hyperglycémie').length).toBeGreaterThanOrEqual(1);
    });

    it('Hypoglycémie pour 55 mg/dL', async () => {
      await openGlycemiaTab();
      expect(screen.getAllByText('Hypoglycémie').length).toBeGreaterThanOrEqual(1);
    });

    it('Normal pour 110 mg/dL', async () => {
      await openGlycemiaTab();
      expect(screen.getAllByText('Normal').length).toBeGreaterThanOrEqual(1);
    });

    it('les compteurs de résumé sont corrects', async () => {
      await openGlycemiaTab();
      const counts = Array.from(document.querySelectorAll('.gly-stat-clickable'))
        .map((el) => el.textContent);
      expect(counts.some((t) => t.includes('1'))).toBe(true);
    });

    it('clic sur un stat filtre le tableau', async () => {
      await openGlycemiaTab();
      fireEvent.click(getStatClickable('Hyperglycémie'));
      expect(screen.getByText('200 mg/dL')).toBeInTheDocument();
      expect(screen.queryByText('55 mg/dL')).not.toBeInTheDocument();
      expect(screen.queryByText('110 mg/dL')).not.toBeInTheDocument();
    });

    it('la barre de filtre actif apparaît', async () => {
      await openGlycemiaTab();
      fireEvent.click(getStatClickable('Hyperglycémie'));
      expect(document.querySelector('.gly-filter-bar')).toBeTruthy();
    });

    it('"Effacer le filtre" restaure toutes les lignes', async () => {
      await openGlycemiaTab();
      fireEvent.click(getStatClickable('Hyperglycémie'));
      fireEvent.click(screen.getByText(/effacer le filtre/i));
      expect(screen.getByText('55 mg/dL')).toBeInTheDocument();
      expect(screen.getByText('110 mg/dL')).toBeInTheDocument();
    });
  });

  describe('Alertes glycémiques', () => {
    it('traduit hypo → Hypoglycémie', async () => {
      setupDefaultMocks({
        activePatients: [makeActiveMember('1', 'Alice', 'Martin')],
        alerts: [{ alertId: 'a1', type: 'hypo', severity: 'critical', triggeredAt: '2026-03-09T10:00:00Z' }],
        dashboard: makeDashboard({
          alerts: [{ alertId: 'a1', type: 'hypo', severity: 'critical', triggeredAt: '2026-03-09T10:00:00Z' }],
        }),
      });
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      await waitFor(() =>
        expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument()
      );
      expect(screen.getAllByText('Hypoglycémie').length).toBeGreaterThanOrEqual(1);
    });

    it('traduit hyper → Hyperglycémie', async () => {
      setupDefaultMocks({
        activePatients: [makeActiveMember('1', 'Alice', 'Martin')],
        alerts: [{ alertId: 'a2', type: 'hyper', severity: 'warning', triggeredAt: '2026-03-09T10:00:00Z' }],
        dashboard: makeDashboard({
          alerts: [{ alertId: 'a2', type: 'hyper', severity: 'warning', triggeredAt: '2026-03-09T10:00:00Z' }],
        }),
      });
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      await waitFor(() =>
        expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument()
      );
      expect(screen.getAllByText('Hyperglycémie').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('HbA1c', () => {
    async function openDossier(dashboardOverride = {}) {
      setupDefaultMocks({
        activePatients: [makeActiveMember('1', 'Alice', 'Martin')],
        dashboard: makeDashboard(dashboardOverride),
      });
      renderPatients();
      await waitFor(() => screen.getByText('Alice Martin'));
      fireEvent.click(screen.getByRole('button', { name: /voir le dossier/i }));
      await waitFor(() =>
        expect(screen.queryByText('Chargement des données…')).not.toBeInTheDocument()
      );
    }

    it('affiche la carte HbA1c dans la vue d\'ensemble', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%', measuredAt: '2026-03-01T10:00:00Z' } });
      expect(screen.getByTestId('hba1c-card')).toBeInTheDocument();
      expect(screen.getByText('HbA1c (3 derniers mois)')).toBeInTheDocument();
    });

    it('affiche la valeur formatée à une décimale', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%', measuredAt: '2026-03-01T10:00:00Z' } });
      expect(screen.getByText('6.8')).toBeInTheDocument();
    });

    it('catégorise < 7 % comme "Objectif atteint"', async () => {
      await openDossier({ hba1c: { value: 6.5, unit: '%' } });
      expect(screen.getByText('Objectif atteint')).toBeInTheDocument();
    });

    it('catégorise 7–8 % comme "Légèrement élevée"', async () => {
      await openDossier({ hba1c: { value: 7.5, unit: '%' } });
      expect(screen.getByText('Légèrement élevée')).toBeInTheDocument();
    });

    it('catégorise > 8 % comme "Élevée"', async () => {
      await openDossier({ hba1c: { value: 9.2, unit: '%' } });
      expect(screen.getByText('Élevée')).toBeInTheDocument();
    });

    it('affiche un placeholder si aucune valeur', async () => {
      await openDossier({ hba1c: null });
      expect(screen.getByText('Aucune valeur renseignée')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /renseigner/i })).toBeInTheDocument();
    });

    it('clic "Modifier" ouvre le champ d\'édition', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      expect(screen.getByLabelText('Valeur HbA1c')).toBeInTheDocument();
    });

    it('"Annuler" referme l\'édition sans POST', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
      expect(screen.queryByLabelText('Valeur HbA1c')).not.toBeInTheDocument();
      expect(mockPost).not.toHaveBeenCalledWith(
        '/doctors/care-team/patient-hba1c/',
        expect.anything()
      );
    });

    it('valeur < 3 → toastError, pas de POST', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      const input = screen.getByLabelText('Valeur HbA1c');
      await userEvent.clear(input);
      await userEvent.type(input, '2');
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      expect(toastError).toHaveBeenCalledWith('Valeur invalide', expect.any(String));
      expect(mockPost).not.toHaveBeenCalledWith(
        '/doctors/care-team/patient-hba1c/',
        expect.anything()
      );
    });

    it('valeur > 20 → toastError, pas de POST', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      const input = screen.getByLabelText('Valeur HbA1c');
      await userEvent.clear(input);
      await userEvent.type(input, '25');
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      expect(toastError).toHaveBeenCalledWith('Valeur invalide', expect.any(String));
      expect(mockPost).not.toHaveBeenCalledWith(
        '/doctors/care-team/patient-hba1c/',
        expect.anything()
      );
    });

    it('valeur vide → toastError, pas de POST', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      const input = screen.getByLabelText('Valeur HbA1c');
      await userEvent.clear(input);
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      expect(toastError).toHaveBeenCalledWith('Valeur invalide', expect.any(String));
    });

    it('valeur valide → POST /patient-hba1c/ avec le bon payload', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      const input = screen.getByLabelText('Valeur HbA1c');
      await userEvent.clear(input);
      await userEvent.type(input, '7.2');
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/doctors/care-team/patient-hba1c/', {
          patient_user_id: '1',
          value: 7.2,
          unit: '%',
        })
      );
    });

    it('POST réussi → toastSuccess et fermeture de l\'éditeur', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      const input = screen.getByLabelText('Valeur HbA1c');
      await userEvent.clear(input);
      await userEvent.type(input, '7.2');
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.queryByLabelText('Valeur HbA1c')).not.toBeInTheDocument()
      );
    });

    it('POST échoue → toastError et l\'éditeur reste ouvert', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      mockPost.mockRejectedValueOnce({ response: { data: { error: 'Service indisponible' } } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      const input = screen.getByLabelText('Valeur HbA1c');
      await userEvent.clear(input);
      await userEvent.type(input, '7.2');
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Service indisponible')
      );
      expect(screen.getByLabelText('Valeur HbA1c')).toBeInTheDocument();
    });

    it('virgule comme séparateur décimal acceptée', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      const input = screen.getByLabelText('Valeur HbA1c');
      await userEvent.clear(input);
      fireEvent.change(input, { target: { value: '6,5' } });
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/doctors/care-team/patient-hba1c/',
          expect.objectContaining({ value: 6.5 })
        )
      );
    });

    it('touche Entrée déclenche l\'enregistrement', async () => {
      await openDossier({ hba1c: { value: 6.8, unit: '%' } });
      fireEvent.click(screen.getByRole('button', { name: /modifier l'hba1c/i }));
      const input = screen.getByLabelText('Valeur HbA1c');
      await userEvent.clear(input);
      await userEvent.type(input, '7.1{Enter}');
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith('/doctors/care-team/patient-hba1c/',
          expect.objectContaining({ value: 7.1 })
        )
      );
    });
  });
});
