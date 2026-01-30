import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors } from '../../themes/colors';

interface StatCardProps {
  title: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBgColor: string;
  value: number;
  secondaryValue?: string | number;
  subtitle: string;
  onPress?: () => void;
}

export default function StatCard({
  title,
  icon: IconComponent,
  iconColor,
  iconBgColor,
  value,
  secondaryValue,
  subtitle,
  onPress,
}: StatCardProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const previousValue = useRef(value);

  // S'assurer que value est un nombre valide
  const displayValue = typeof value === 'number' ? value : 0;
  const displaySecondary =
    secondaryValue !== undefined && secondaryValue !== null
      ? String(secondaryValue)
      : undefined;

  useEffect(() => {
    if (
      previousValue.current !== displayValue &&
      previousValue.current !== undefined
    ) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.4,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.96,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    previousValue.current = displayValue;
  }, [displayValue, fadeAnim, scaleAnim]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={styles.contentContainer}>
        <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
          <IconComponent size={24} color={iconColor} strokeWidth={2.5} />
        </View>

        <Animated.View
          style={[
            styles.valueSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.valueRow}>
            <Text style={styles.mainValue}>
              {displayValue.toLocaleString()}
            </Text>
            {displaySecondary && (
              <>
                <Text style={styles.fractionSeparator}>/</Text>
                <Text style={styles.totalValue}>{displaySecondary}</Text>
              </>
            )}
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
    marginBottom: 16,
  },
  contentContainer: {
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueSection: {
    gap: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary || '#000000',
    letterSpacing: -0.5,
  },
  fractionSeparator: {
    fontSize: 24,
    fontWeight: '400',
    color: colors.textSecondary || '#8E8E93',
    marginHorizontal: 2,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary || '#8E8E93',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary || '#8E8E93',
  },
});
