import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Gauge, MoveUpRight, MoveDownRight, Minus } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import { GLYCEMIA_TARGET } from '../../constants/glycemia.constants';

type GlycemieStatus =
  | 'normal'
  | 'warning'
  | 'attention'
  | 'danger'
  | 'alert'
  | 'high'
  | 'low';

interface GlycemieCardProps {
  value: number;
  status?: GlycemieStatus;
  timestamp?: string;
  unit?: string;
  trend?: 'rising' | 'falling' | 'flat';
  onPress?: () => void;
}

interface StatusConfig {
  color: string;
  bgColor: string;
  label: string;
}

export default function GlycemieCard({
  value,
  status,
  timestamp,
  unit = 'mg/dL',
  trend,
  onPress,
}: GlycemieCardProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const previousValue = useRef(value);

  // Calculer le status automatiquement à partir de la valeur si non fourni
  const calculatedStatus = (): GlycemieStatus => {
    if (status) return status;
    if (value < GLYCEMIA_TARGET.MIN) return 'low'; // < 70
    if (value > GLYCEMIA_TARGET.MAX) return 'high'; // > 180
    return 'normal'; // 70-180
  };

  const actualStatus = calculatedStatus();

  const getStatusConfig = (statusValue: GlycemieStatus): StatusConfig => {
    switch (statusValue.toLowerCase()) {
      case 'normal':
        return {
          color: '#13c88b',
          bgColor: '#D1FAE5',
          label: 'Normal',
        };
      case 'warning':
      case 'attention':
        return {
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          label: 'Élevé',
        };
      case 'danger':
      case 'alert':
      case 'high':
        return {
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          label: 'Hyper',
        };
      case 'low':
        return {
          color: '#EF4444',
          bgColor: '#FEE2E2',
          label: 'Hypo',
        };
      default:
        return {
          color: '#10B981',
          bgColor: '#D1FAE5',
          label: 'Normal',
        };
    }
  };

  const statusConfig = getStatusConfig(actualStatus);

  const formatTime = (isoString?: string): string => {
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

  const getTrendIcon = () => {
    if (!trend) return null;

    const iconProps = {
      size: 32,
      color: statusConfig.color,
      strokeWidth: 2.5,
    };

    switch (trend) {
      case 'rising':
        return <MoveUpRight {...iconProps} />;
      case 'falling':
        return <MoveDownRight {...iconProps} />;
      case 'flat':
        return <Minus {...iconProps} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (
      previousValue.current !== value &&
      previousValue.current !== undefined
    ) {
      Animated.sequence([
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

  const targetMin = GLYCEMIA_TARGET.MIN;
  const targetMax = GLYCEMIA_TARGET.MAX;
  const progressPercentage = Math.min((value / GLYCEMIA_TARGET.MAX) * 100, 100);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${statusConfig.color}20` },
            ]}
          >
            <Gauge size={24} color={statusConfig.color} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={styles.title}>Glycémie Actuelle</Text>
            {timestamp && (
              <Text style={styles.timestamp}>
                prise à: {formatTime(timestamp)}
              </Text>
            )}
          </View>
        </View>
        <View
          style={[styles.badge, { backgroundColor: `${statusConfig.color}20` }]}
        >
          <Text style={[styles.badgeText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.valueContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: statusConfig.color }]}>
            {value}
          </Text>
          <Text style={[styles.unit, { color: statusConfig.color }]}>
            {unit}
          </Text>
          {trend && <View style={styles.trendIcon}>{getTrendIcon()}</View>}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.targetRange}>
          <View style={styles.targetBar}>
            <View
              style={[
                styles.targetIndicator,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: statusConfig.color,
                },
              ]}
            />
          </View>
          <Text style={styles.targetText}>
            Objectif: {targetMin}-{targetMax} mg/dL
          </Text>
        </View>
      </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 13,
    color: colors.textSecondary || '#8E8E93',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  valueContainer: {
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 20,
    fontWeight: '600',
  },
  trendIcon: {
    marginLeft: 8,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetRange: {
    flex: 1,
  },
  targetBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  targetIndicator: {
    height: 6,
    borderRadius: 3,
  },
  targetText: {
    fontSize: 12,
    color: colors.textSecondary || '#8E8E93',
  },
});
