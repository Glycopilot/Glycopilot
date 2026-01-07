import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Gauge } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export default function GlycemieCard({
  value,
  status = 'normal',
  timestamp,
  onPress,
}) {
  // Animation pour le fade
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const previousValue = useRef(value);

  // Formater le timestamp en heure lisible
  const formatTime = isoString => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Animer quand la valeur change
  useEffect(() => {
    if (
      previousValue.current !== value &&
      previousValue.current !== undefined
    ) {
      // Animation de fade + pulse
      Animated.sequence([
        // Fade out + scale down légèrement
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Fade in + scale up avec un petit bounce
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    previousValue.current = value;
  }, [value, fadeAnim, scaleAnim]);

  // Déterminer la couleur et le label selon le status
  const getStatusConfig = status => {
    switch (status.toLowerCase()) {
      case 'normal':
        return {
          color: '#34C759',
          bgColor: '#E8F9ED',
          label: 'Normal',
        };
      case 'warning':
      case 'attention':
        return {
          color: '#FF9500',
          bgColor: '#FFF4E5',
          label: 'Élevé',
        };
      case 'danger':
      case 'alert':
      case 'high':
      case 'low':
        return {
          color: '#FF3B30',
          bgColor: '#FFE5E5',
          label: 'Alerte',
        };
      default:
        return {
          color: '#34C759',
          bgColor: '#E8F9ED',
          label: 'Normal',
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header avec titre et badge status */}
      <View style={styles.header}>
        <Text style={styles.title}>Glycémie Actuelle</Text>
        <View style={[styles.badge, { backgroundColor: statusConfig.bgColor }]}>
          <Text style={[styles.badgeText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Valeur principale avec animation */}
      <Animated.View
        style={[
          styles.valueContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: statusConfig.bgColor }]}
        >
          <Gauge size={28} color={statusConfig.color} strokeWidth={2.5} />
        </View>
        <View style={styles.valueWithTime}>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.unit}>mg/dl</Text>
          </View>
          {timestamp && (
            <Text style={styles.timestamp}>
              prise à: {formatTime(timestamp)}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    // Ombre pour iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // Ombre pour Android
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueWithTime: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textSecondary || '#8E8E93',
    marginTop: 12,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary || '#8E8E93',
    marginTop: 4,
  },
});
