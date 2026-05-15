export const tourSteps = [
  {
    id: 'welcome',
    title: 'Bienvenue sur Glycopilot',
    body:
      "On va te faire visiter rapidement les principales fonctionnalités de ton espace médecin. " +
      'Tu peux quitter à tout moment en appuyant sur Échap.',
  },
  {
    id: 'nav',
    title: 'Navigation principale',
    body:
      'Trois sections accessibles via la barre latérale : ton tableau de bord, tes patients et ton profil.',
    target: '.sidebar-desktop, .sidebar-mobile',
    placement: 'right',
    route: '/home',
  },
  {
    id: 'kpis',
    title: "Vue d'ensemble",
    body:
      "En un coup d'œil : patients suivis, alertes glycémiques actives, score de santé moyen et patients en bonne santé.",
    target: '.kpi-row',
    placement: 'bottom',
    route: '/home',
  },
  {
    id: 'alerts',
    title: 'Alertes glycémiques',
    body:
      "Les patients en hyperglycémie ou hypoglycémie remontent ici avec la mesure qui a déclenché l'alerte.",
    target: '.hcard-alerts',
    placement: 'left',
    route: '/home',
  },
  {
    id: 'patients',
    title: 'Tes patients',
    body:
      'Liste complète de tes patients actifs avec recherche, plus trois onglets pour gérer les invitations envoyées et reçues.',
    target: '.toolbar',
    placement: 'bottom',
    route: '/patients',
  },
  {
    id: 'add-patient',
    title: 'Inviter un patient',
    body:
      "Envoie une invitation par email pour qu'un patient rejoigne ton équipe de soins. Il devra simplement accepter pour apparaître dans tes patients actifs.",
    target: '.add-btn',
    placement: 'left',
    route: '/patients',
  },
  {
    id: 'received',
    title: 'Demandes reçues',
    body:
      'Les patients peuvent aussi te solliciter en direct. Tu peux accepter ou refuser leurs demandes depuis cet onglet.',
    target: '.tab-received',
    placement: 'bottom',
    route: '/patients',
  },
  {
    id: 'hba1c',
    title: 'Dossier patient et HbA1c',
    body:
      "Clique sur « Voir le dossier » pour ouvrir la vue complète d'un patient : glycémie, repas, traitements, et le champ HbA1c que tu peux renseigner et mettre à jour.",
    target: '.card-btn',
    placement: 'top',
    route: '/patients',
  },
  {
    id: 'profile',
    title: 'Ton profil',
    body:
      'Mets à jour tes informations professionnelles, ou réinitialise ton mot de passe à tout moment.',
    target: '.profile-hero',
    placement: 'bottom',
    route: '/profile',
  },
  {
    id: 'done',
    title: 'Et voilà !',
    body:
      "Tu peux relancer cette visite quand tu veux via le bouton d'aide en bas de la barre latérale.",
  },
];
