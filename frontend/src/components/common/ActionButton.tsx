import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Gauge, Utensils, Pill, Zap } from 'lucide-react-native';
import { colors } from '../../themes/colors';

interface ActionConfig {
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  label: string;
}

interface ActionButtonProps {
  type: 'glycemie' | 'repas' | 'medic' | 'medicament' | 'action' | string;
  label?: string;
  onPress?: () => void;
}

export default function ActionButton({
  type,
  label,
  onPress,
}: ActionButtonProps) {
  const getActionConfig = (actionType: string): ActionConfig => {
    switch (actionType.toLowerCase()) {
      case 'glycemie':
        return {
          icon: Gauge,
          color: '#FF6B6B',
          bgColor: '#FFE5E5',
          label: label || 'Glycémie',
        };
      case 'repas':
        return {
          icon: Utensils,
          color: '#51CF66',
          bgColor: '#E8F9ED',
          label: label || 'Repas',
        };
      case 'medic':
      case 'medicament':
        return {
          icon: Pill,
          color: '#4C9AFF',
          bgColor: '#E5F2FF',
          label: label || 'Médic',
        };
      case 'action':
        return {
          icon: Zap,
          color: '#FFB84D',
          bgColor: '#FFF4E5',
          label: label || 'Action',
        };
      default:
        return {
          icon: Zap,
          color: '#007AFF',
          bgColor: '#E5F2FF',
          label: label || 'Action',
        };
    }
  };

  const config = getActionConfig(type);
  const Icon = config.icon;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Icon size={28} color={config.color} strokeWidth={2} />
      </View>
      <Text style={styles.label}>{config.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary || '#000000',
    textAlign: 'center',
  },
});
