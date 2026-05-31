export interface OnboardingSlide {
  id: string;
  color: string;
  bgColor: string;
  title: string;
  description: string;
  hints?: string[];
  illustration: 'welcome' | 'glycemia' | 'stats' | 'medications' | 'lifestyle' | 'ready';
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    color: '#007AFF',
    bgColor: '#EBF5FF',
    title: 'Bienvenue sur Glycopilot',
    description: 'Votre compagnon quotidien pour gérer votre diabète et améliorer votre qualité de vie.',
    hints: [
      'Suivi glycémique, repas, médicaments et activité',
      'Données accessibles à votre équipe soignante',
      'Interface pensée pour un usage quotidien simple',
    ],
    illustration: 'welcome',
  },
  {
    id: 'glycemia',
    color: '#10B981',
    bgColor: '#ECFDF5',
    title: 'Enregistrez votre glycémie',
    description: 'Ajoutez une mesure en quelques secondes, manuellement ou depuis votre capteur CGM.',
    hints: [
      'Saisie manuelle ou connexion capteur CGM',
      'Alertes configurables hors de votre cible',
      'Historique complet avec courbe journalière',
    ],
    illustration: 'glycemia',
  },
  {
    id: 'stats',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    title: 'Visualisez vos tendances',
    description: 'Suivez vos courbes, votre temps dans la cible (TIR) et exportez un rapport pour votre médecin.',
    hints: [
      'Temps dans la cible (TIR) par jour, semaine ou mois',
      'Analyse des plages basse, normale et haute',
      'Export PDF médical en un tap',
    ],
    illustration: 'stats',
  },
  {
    id: 'medications',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    title: 'Gérez vos médicaments',
    description: 'Ajoutez vos traitements et suivez vos prises au quotidien depuis votre téléphone.',
    hints: [
      'Recherche dans la base médicale BDPM',
      'Suivi des prises avec rappels',
      'Historique de votre observance',
    ],
    illustration: 'medications',
  },
  {
    id: 'lifestyle',
    color: '#14B8A6',
    bgColor: '#F0FDFA',
    title: 'Votre mode de vie compte',
    description: 'Enregistrez vos repas et activités physiques pour mieux comprendre leur impact sur votre glycémie.',
    hints: [
      'Journal alimentaire avec type de repas',
      'Activités physiques et intensité',
      'Corrélation avec vos valeurs glycémiques',
    ],
    illustration: 'lifestyle',
  },
  {
    id: 'ready',
    color: '#007AFF',
    bgColor: '#EBF5FF',
    title: "Vous êtes prêt !",
    description: "L'équipe Glycopilot est là pour vous accompagner. Commencez dès maintenant à prendre soin de vous.",
    illustration: 'ready',
  },
];
