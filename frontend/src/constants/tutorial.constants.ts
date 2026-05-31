import React from 'react';
import {
  LayoutGrid,
  Activity,
  Gauge,
  TrendingUp,
  Target,
  Download,
  PlusCircle,
  Wifi,
  Bell,
  Footprints,
  Flame,
  Utensils,
  ScanBarcode,
  Salad,
  Pill,
  CheckCircle,
  Clock,
} from 'lucide-react-native';

export interface TutorialStep {
  icon: React.ReactElement;
  title: string;
  description: string;
}

export interface ScreenTutorial {
  screenId: string;
  accentColor: string;
  steps: TutorialStep[];
}

export const SCREEN_TUTORIALS: Record<string, ScreenTutorial> = {
  home: {
    screenId: 'home',
    accentColor: '#007AFF',
    steps: [
      {
        icon: React.createElement(LayoutGrid, { size: 32, color: '#007AFF', strokeWidth: 2 }),
        title: 'Votre tableau de bord',
        description:
          "La carte glycémie affiche votre dernière mesure et la tendance de la journée. Appuyez dessus pour accéder à l'historique complet.",
      },
      {
        icon: React.createElement(Activity, { size: 32, color: '#007AFF', strokeWidth: 2 }),
        title: 'Activité & Médicaments',
        description:
          "Suivez vos pas quotidiens et vos prises de médicaments en un coup d'oeil. Les compteurs se remettent à zéro chaque jour.",
      },
      {
        icon: React.createElement(Gauge, { size: 32, color: '#007AFF', strokeWidth: 2 }),
        title: 'Actions rapides',
        description:
          "Activez votre capteur CGM pour synchroniser vos mesures automatiquement, ou consultez les prédictions glycémiques basées sur vos données.",
      },
    ],
  },

  stats: {
    screenId: 'stats',
    accentColor: '#8B5CF6',
    steps: [
      {
        icon: React.createElement(TrendingUp, { size: 32, color: '#8B5CF6', strokeWidth: 2 }),
        title: 'Votre courbe glycémique',
        description:
          "La courbe affiche toutes vos mesures sur la période sélectionnée. Les zones colorées indiquent les plages basse (< 70), normale (70–180) et haute (> 180 mg/dL).",
      },
      {
        icon: React.createElement(Target, { size: 32, color: '#8B5CF6', strokeWidth: 2 }),
        title: 'Temps dans la cible (TIR)',
        description:
          "Les barres montrent le pourcentage de temps passé dans chaque zone. L'objectif clinique recommandé est d'atteindre plus de 70 % dans la plage normale.",
      },
      {
        icon: React.createElement(Download, { size: 32, color: '#8B5CF6', strokeWidth: 2 }),
        title: 'Export PDF médical',
        description:
          "Appuyez sur l'icône de téléchargement en haut à droite pour générer un rapport complet à partager avec votre médecin ou endocrinologue.",
      },
    ],
  },

  glycemia: {
    screenId: 'glycemia',
    accentColor: '#10B981',
    steps: [
      {
        icon: React.createElement(PlusCircle, { size: 32, color: '#10B981', strokeWidth: 2 }),
        title: 'Ajouter une mesure',
        description:
          "Appuyez sur le bouton + pour saisir manuellement une glycémie. Vous pouvez indiquer la valeur, l'heure et le contexte (à jeun, avant ou après repas).",
      },
      {
        icon: React.createElement(Wifi, { size: 32, color: '#10B981', strokeWidth: 2 }),
        title: 'Capteur CGM',
        description:
          "Si vous utilisez un capteur en continu (CGM), activez-le depuis l'accueil pour synchroniser vos mesures automatiquement sans saisie manuelle.",
      },
      {
        icon: React.createElement(Bell, { size: 32, color: '#10B981', strokeWidth: 2 }),
        title: 'Alertes glycémiques',
        description:
          "Des alertes vous notifient automatiquement quand votre glycémie sort de votre plage cible. Configurez vos seuils dans votre profil.",
      },
    ],
  },
  activities: {
    screenId: 'activities',
    accentColor: '#10B981',
    steps: [
      {
        icon: React.createElement(PlusCircle, { size: 32, color: '#10B981', strokeWidth: 2 }),
        title: 'Enregistrer une activité',
        description:
          "Appuyez sur + pour ajouter une activité physique (marche, course, vélo...). Renseignez la durée et l'intensité pour un suivi précis.",
      },
      {
        icon: React.createElement(Footprints, { size: 32, color: '#10B981', strokeWidth: 2 }),
        title: 'Objectif de pas',
        description:
          "Définissez votre objectif quotidien de pas. Le compteur est mis à jour en temps réel grâce au capteur de mouvement de votre téléphone.",
      },
      {
        icon: React.createElement(Flame, { size: 32, color: '#10B981', strokeWidth: 2 }),
        title: 'Calories & effort',
        description:
          "Consultez les calories brûlées et la durée totale d'effort par activité pour mieux comprendre votre dépense énergétique quotidienne.",
      },
    ],
  },

  meals: {
    screenId: 'meals',
    accentColor: '#14B8A6',
    steps: [
      {
        icon: React.createElement(Utensils, { size: 32, color: '#14B8A6', strokeWidth: 2 }),
        title: 'Journaliser un repas',
        description:
          "Appuyez sur + pour ajouter un repas. Saisissez un aliment manuellement ou scannez le code-barres du produit pour l'ajouter automatiquement.",
      },
      {
        icon: React.createElement(ScanBarcode, { size: 32, color: '#14B8A6', strokeWidth: 2 }),
        title: 'Scanner un produit',
        description:
          "Le scanner de code-barres reconnaît automatiquement les informations nutritionnelles du produit (glucides, calories, lipides).",
      },
      {
        icon: React.createElement(Salad, { size: 32, color: '#14B8A6', strokeWidth: 2 }),
        title: 'Impact sur la glycémie',
        description:
          "Enregistrer vos repas vous aide à comprendre comment les glucides influencent votre glycémie après les repas et à mieux ajuster vos doses.",
      },
    ],
  },

  medications: {
    screenId: 'medications',
    accentColor: '#F59E0B',
    steps: [
      {
        icon: React.createElement(Pill, { size: 32, color: '#F59E0B', strokeWidth: 2 }),
        title: 'Ajouter un traitement',
        description:
          "Appuyez sur + pour rechercher votre médicament dans la base BDPM ou le saisir manuellement. Configurez ensuite vos horaires de prise.",
      },
      {
        icon: React.createElement(CheckCircle, { size: 32, color: '#F59E0B', strokeWidth: 2 }),
        title: 'Valider une prise',
        description:
          "Confirmez chaque prise depuis la liste du jour. Un historique complet de votre observance est conservé pour votre suivi médical.",
      },
      {
        icon: React.createElement(Clock, { size: 32, color: '#F59E0B', strokeWidth: 2 }),
        title: 'Rappels automatiques',
        description:
          "Des notifications vous rappellent aux heures configurées pour ne jamais oublier votre traitement, même en déplacement.",
      },
    ],
  },
};
