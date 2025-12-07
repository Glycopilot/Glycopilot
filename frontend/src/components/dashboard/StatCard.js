import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Activity, Pill } from 'lucide-react-native';
import { colors } from '../../themes/colors';

// Composant réutilisable pour Activity et Medic
export default function StatCard({
  title,
  icon: IconComponent,
  iconColor,
  iconBgColor,
  value,
  secondaryValue, // Pour le total des médics (ex: /5)
  subtitle,
  onPress,
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={styles.contentContainer}>
        <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
          <IconComponent size={24} color={iconColor} strokeWidth={2.5} />
        </View>

        <View style={styles.valueSection}>
          <View style={styles.valueRow}>
            <Text style={styles.mainValue}>{value?.toLocaleString()}</Text>
            {secondaryValue && (
              <>
                <Text style={styles.fractionSeparator}>/</Text>
                <Text style={styles.totalValue}>{secondaryValue}</Text>
              </>
            )}
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
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
    // Ombre pour iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    // Ombre pour Android
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
