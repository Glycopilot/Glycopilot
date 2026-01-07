import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Bell,
  Pill,
  Utensils,
  Activity,
  MessageSquare,
} from 'lucide-react-native';
import { colors } from '../../themes/colors';

export default function NotificationCard({
  type = 'medicament',
  title,
  message,
  time,
  onPress,
  onDismiss,
}) {
  // Configuration pour chaque type de notification
  const getNotificationConfig = type => {
    switch (type.toLowerCase()) {
      case 'medicament':
      case 'medic':
        return {
          icon: Pill,
          iconColor: '#4C9AFF',
          bgColor: '#E5F2FF',
          gradient: 'linear-gradient(135deg, #667EEA 0%, #4C9AFF 100%)',
          solidColor: '#4C9AFF',
          title: title || 'Medicaments',
        };
      case 'repas':
        return {
          icon: Utensils,
          iconColor: '#51CF66',
          bgColor: '#E8F9ED',
          gradient: 'linear-gradient(135deg, #51CF66 0%, #38B249 100%)',
          solidColor: '#51CF66',
          title: title || 'Repas',
        };
      case 'glycemie':
        return {
          icon: Activity,
          iconColor: '#FF6B6B',
          bgColor: '#FFE5E5',
          gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF3B30 100%)',
          solidColor: '#FF6B6B',
          title: title || 'Glycémie',
        };
      case 'recommandation':
        return {
          icon: MessageSquare,
          iconColor: '#FFB84D',
          bgColor: '#FFF4E5',
          gradient: 'linear-gradient(135deg, #FFB84D 0%, #FF9500 100%)',
          solidColor: '#FFB84D',
          title: title || 'Recommandation',
        };
      default:
        return {
          icon: Bell,
          iconColor: '#007AFF',
          bgColor: '#E5F2FF',
          gradient: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
          solidColor: '#007AFF',
          title: title || 'Notification',
        };
    }
  };

  const config = getNotificationConfig(type);
  const Icon = config.icon;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header avec icône et type */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Icon size={16} color={config.iconColor} strokeWidth={2.5} />
          <Text style={styles.typeText}>{config.title}</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dismissText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Card Content avec couleur de fond */}
      <View style={[styles.content, { backgroundColor: config.solidColor }]}>
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{message}</Text>
          {time && (
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>{time.label || 'Metformine'}</Text>
              <Text style={styles.timeValue}> : {time.value || '14:39'}</Text>
            </View>
          )}
        </View>

        {/* Icône à droite */}
        <View style={styles.iconCircle}>
          <Bell size={24} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary || '#8E8E93',
  },
  dismissText: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.textSecondary || '#8E8E93',
  },
  content: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Ombre pour iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    // Ombre pour Android
    elevation: 6,
  },
  messageContainer: {
    flex: 1,
    gap: 8,
  },
  message: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
