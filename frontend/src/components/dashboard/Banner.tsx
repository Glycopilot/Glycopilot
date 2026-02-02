import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Pill,
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

  const displayName = user
    ? `${user.firstName || ''}`.trim() || 'Utilisateur'
    : 'Utilisateur';

  const getGlucoseTrendIcon = () => {
    const iconProps = { size: 20, color: '#FFFFFF', strokeWidth: 2.5 };
    switch (glucoseTrend) {
      case 'rising':
        return <TrendingUp {...iconProps} />;
      case 'falling':
        return <TrendingDown {...iconProps} />;
      default:
        return <Minus {...iconProps} />;
    }
  };

  const getGlucoseTrendMessage = () => {
    if (!glucoseValue) return 'Aucune mesure récente';
    const trends = {
      rising: 'En hausse',
      falling: 'En baisse',
      flat: 'Stable',
    };
    return `${glucoseValue} mg/dL • ${trends[glucoseTrend || 'flat']}`;
  };

  const getHealthScoreColor = () => {
    if (!healthScore) return colors.secondary;
    if (healthScore >= 90) return '#10b981'; // Vert excellent
    if (healthScore >= 70) return colors.secondary; // Bleu bon
    if (healthScore >= 50) return '#ffb22e'; // Orange moyen
    return '#ef4444'; // Rouge faible
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
    if (!medication?.nextDose) {
      return 'Aucun médicament prévu';
    }
    const scheduledDate = new Date(medication.nextDose.scheduledAt);
    const time = scheduledDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${medication.nextDose.name} à ${time}`;
  };

  const getMedicationTitle = () => {
    if (!medication?.nextDose) {
      return 'Rappel médicaments';
    }
    return 'Prochain médicament';
  };

  // Définir les différents états du banner
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
      icon: (
        <Heart size={20} color="#FFFFFF" strokeWidth={2.5} fill="#FFFFFF" />
      ),
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
      const day = today.getDate();
      const month = today.toLocaleDateString('fr-FR', { month: 'long' });
      const year = today.getFullYear();
      return `${day} ${month} ${year}`;
    }
    return dateStr;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setCurrentIndex(prevIndex => (prevIndex + 1) % bannerStates.length);
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, [bannerStates.length]);

  const currentState = bannerStates[currentIndex];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentState.backgroundColor },
      ]}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.titleContainer}>
          {currentState.icon && (
            <View style={styles.iconContainer}>{currentState.icon}</View>
          )}
          <Text style={styles.greeting} numberOfLines={1}>
            {currentState.text}
          </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    position: 'relative',
  },
  content: {
    marginBottom: 16,
    height: 80, // Hauteur fixe pour éviter le changement de taille
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  greeting: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.95,
    letterSpacing: 0.3,
    flex: 1,
  },
  question: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.95,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeDot: {
    width: 20,
    backgroundColor: '#FFFFFF',
  },
});
