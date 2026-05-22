import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Pill,
  HelpCircle,
  X,
  Droplets,
  UtensilsCrossed,
  Dumbbell,
  ClipboardCheck,
} from 'lucide-react-native';
import { colors } from '../../themes/colors';
import useUser from '../../hooks/useUser';

interface BannerProps {
  date?: string;
  healthScore?: number;
  glucoseTrend?: 'rising' | 'falling' | 'flat';
  glucoseValue?: number;
  medication?: {
    taken_count: number;
    total_count: number;
    nextDose: {
      name: string;
      scheduledAt: string;
      status: string;
    } | null;
  };
}

interface BannerState {
  text: string;
  subText: string;
  backgroundColor: string;
  icon?: React.ReactNode;
  isHealthScore?: boolean;
}

const SCORE_COMPONENTS = [
  {
    Icon: Droplets,
    color: '#2563EB',
    bg: '#DBEAFE',
    label: 'Glycémie',
    weight: '40%',
    desc: 'Temps passé dans la cible (70–180 mg/dL) sur les dernières 24h.',
  },
  {
    Icon: ClipboardCheck,
    color: '#8B5CF6',
    bg: '#EDE9FE',
    label: 'Observance',
    weight: '20%',
    desc: 'Ratio des prises médicamenteuses effectuées sur les 7 derniers jours.',
  },
  {
    Icon: UtensilsCrossed,
    color: '#10B981',
    bg: '#D1FAE5',
    label: 'Nutrition',
    weight: '20%',
    desc: 'Régularité des repas enregistrés (objectif : 3 repas/jour sur 7 jours).',
  },
  {
    Icon: Dumbbell,
    color: '#F59E0B',
    bg: '#FEF3C7',
    label: 'Activité',
    weight: '20%',
    desc: 'Minutes d\'activité physique par jour sur 7 jours (objectif : 30 min/j).',
  },
];

const SCORE_LEVELS = [
  { min: 90, max: 100, label: 'Excellent', color: '#10B981', desc: 'Votre suivi est remarquable. Continuez ainsi !' },
  { min: 70, max: 89,  label: 'Bon',       color: '#2563EB', desc: 'Bonne gestion globale, quelques axes d\'amélioration possibles.' },
  { min: 50, max: 69,  label: 'Moyen',     color: '#F59E0B', desc: 'Des efforts sont à fournir sur certains critères.' },
  { min: 0,  max: 49,  label: 'Attention', color: '#EF4444', desc: 'Plusieurs critères nécessitent votre attention.' },
];

function ScoreModal({
  visible,
  score,
  onClose,
}: {
  readonly visible: boolean;
  readonly score?: number;
  readonly onClose: () => void;
}): React.JSX.Element {
  const level = score != null
    ? SCORE_LEVELS.find(l => score >= l.min && score <= l.max) ?? SCORE_LEVELS[3]
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.modalBox}>
        <View style={styles.modalHandle} />

        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Score de santé</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Score */}
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNumber, { color: level?.color ?? '#6B7280' }]}>
            {score != null ? score : '—'}
          </Text>
          <View style={styles.scoreRight}>
            <Text style={styles.scoreMax}>/100</Text>
            {level && (
              <Text style={[styles.levelBadge, { color: level.color }]}>● {level.label}</Text>
            )}
          </View>
        </View>
        {level && <Text style={styles.levelDesc}>{level.desc}</Text>}

        <View style={styles.divider} />

        {/* Composantes */}
        {SCORE_COMPONENTS.map(({ Icon, color, label, weight, desc }) => (
          <View key={label} style={styles.componentRow}>
            <Icon size={16} color={color} />
            <View style={styles.componentBody}>
              <View style={styles.componentTopRow}>
                <Text style={styles.componentLabel}>{label}</Text>
                <Text style={[styles.weightText, { color }]}>{weight}</Text>
              </View>
              <Text style={styles.componentDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </Modal>
  );
}

export default function Banner({
  date,
  healthScore,
  glucoseTrend,
  glucoseValue,
  medication,
}: BannerProps) {
  const { user } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showScoreModal, setShowScoreModal] = useState(false);

  const displayName = user
    ? `${user.firstName || ''}`.trim() || 'Utilisateur'
    : 'Utilisateur';

  const getGlucoseTrendIcon = () => {
    const iconProps = { size: 20, color: '#FFFFFF', strokeWidth: 2.5 };
    switch (glucoseTrend) {
      case 'rising': return <TrendingUp {...iconProps} />;
      case 'falling': return <TrendingDown {...iconProps} />;
      default: return <Minus {...iconProps} />;
    }
  };

  const getGlucoseTrendMessage = () => {
    if (!glucoseValue) return 'Aucune mesure récente';
    const trends = { rising: 'En hausse', falling: 'En baisse', flat: 'Stable' };
    return `${glucoseValue} mg/dL • ${trends[glucoseTrend || 'flat']}`;
  };

  const getHealthScoreColor = () => {
    if (!healthScore) return colors.secondary;
    if (healthScore >= 90) return '#10b981';
    if (healthScore >= 70) return colors.secondary;
    if (healthScore >= 50) return '#ffb22e';
    return '#ef4444';
  };

  const getHealthScoreMessage = () => {
    if (!healthScore) return 'Score non disponible';
    if (healthScore >= 90) return `Excellent • ${healthScore}/100`;
    if (healthScore >= 70) return `Bon score • ${healthScore}/100`;
    if (healthScore >= 50) return `À améliorer • ${healthScore}/100`;
    return `Attention requise • ${healthScore}/100`;
  };

  const getHealthScoreLabel = () => {
    if (!healthScore) return 'Score de santé';
    if (healthScore >= 90) return 'Score de santé excellent';
    if (healthScore >= 70) return 'Score de santé bon';
    if (healthScore >= 50) return 'Score de santé moyen';
    return 'Score de santé faible';
  };

  const getMedicationMessage = () => {
    if (!medication || medication.total_count === 0) return "Aucun traitement prévu aujourd'hui";
    const progress = `${medication.taken_count}/${medication.total_count} prises`;
    if (!medication.nextDose) {
      if (medication.taken_count >= medication.total_count) return `Toutes les prises effectuées • ${progress}`;
      return `${progress} effectuées`;
    }
    const time = new Date(medication.nextDose.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${medication.nextDose.name} à ${time} • ${progress}`;
  };

  const getMedicationTitle = () => {
    if (!medication?.nextDose) {
      if (medication && medication.total_count > 0 && medication.taken_count < medication.total_count) return 'Rappel médicaments';
      return 'Médicaments';
    }
    return 'Prochain médicament';
  };

  const bannerStates: BannerState[] = [
    {
      text: `Bonjour ${displayName}`,
      subText: "Comment allez-vous aujourd'hui ?",
      backgroundColor: colors.secondary,
    },
    {
      text: 'Niveau de glycémie',
      subText: getGlucoseTrendMessage(),
      backgroundColor: colors.secondary,
      icon: getGlucoseTrendIcon(),
    },
    {
      text: getHealthScoreLabel(),
      subText: getHealthScoreMessage(),
      backgroundColor: getHealthScoreColor(),
      icon: <Heart size={20} color="#FFFFFF" strokeWidth={2.5} fill="#FFFFFF" />,
      isHealthScore: true,
    },
    {
      text: getMedicationTitle(),
      subText: getMedicationMessage(),
      backgroundColor: colors.secondary,
      icon: <Pill size={20} color="#FFFFFF" strokeWidth={2.5} />,
    },
  ];

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) {
      const today = new Date();
      return `${today.getDate()} ${today.toLocaleDateString('fr-FR', { month: 'long' })} ${today.getFullYear()}`;
    }
    return dateStr;
  };

  const advanceIndex = React.useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % bannerStates.length);
  }, [bannerStates.length]);

  useEffect(() => {
    const tick = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
      setTimeout(advanceIndex, 400);
    };
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [fadeAnim, advanceIndex]);

  const currentState = bannerStates[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: currentState.backgroundColor }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.titleContainer}>
          {currentState.icon && (
            <View style={styles.iconContainer}>{currentState.icon}</View>
          )}
          <Text style={styles.greeting} numberOfLines={1}>
            {currentState.text}
          </Text>
          {currentState.isHealthScore && (
            <TouchableOpacity
              onPress={() => setShowScoreModal(true)}
              style={styles.helpBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <HelpCircle size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.question} numberOfLines={2}>
          {currentState.subText}
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.dateText}>{formatDate(date)}</Text>
        </View>
        <View style={styles.dotsContainer}>
          {bannerStates.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentIndex === index && styles.activeDot]}
            />
          ))}
        </View>
      </View>

      <ScoreModal
        visible={showScoreModal}
        score={healthScore}
        onClose={() => setShowScoreModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 20, position: 'relative' },
  content: { marginBottom: 16, height: 80, justifyContent: 'center' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  iconContainer: {
    width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  greeting: { fontSize: 15, color: '#FFFFFF', fontWeight: '500', opacity: 0.95, letterSpacing: 0.3, flex: 1 },
  helpBtn: { marginLeft: 4 },
  question: { fontSize: 26, color: '#FFFFFF', fontWeight: '700', lineHeight: 32, letterSpacing: -0.5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateContainer: {
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  dateText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600', opacity: 0.95 },
  dotsContainer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  activeDot: { width: 20, backgroundColor: '#FFFFFF' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalBox: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#111827', letterSpacing: -0.3 },

  // Score
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 6 },
  scoreNumber: { fontSize: 72, fontWeight: '800', lineHeight: 76, letterSpacing: -2 },
  scoreRight: { paddingBottom: 10, gap: 4 },
  scoreMax: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  levelBadge: { fontSize: 14, fontWeight: '600' },
  levelDesc: { fontSize: 13, color: '#9CA3AF', lineHeight: 19, marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 },

  // Components
  componentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  componentBody: { flex: 1 },
  componentTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  componentLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  weightText: { fontSize: 13, fontWeight: '700' },
  componentDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },
});
