import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Bell, MapPin, User } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export type ProcheTab = 'home' | 'alerts' | 'location' | 'profile';

interface TabItem {
  key: ProcheTab;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const TABS: TabItem[] = [
  { key: 'home',     label: 'Accueil',      Icon: Home   },
  { key: 'alerts',   label: 'Alertes',      Icon: Bell   },
  { key: 'location', label: 'Localisation', Icon: MapPin },
  { key: 'profile',  label: 'Profil',       Icon: User   },
];

interface Props {
  readonly activeTab: ProcheTab;
  readonly onTabChange: (tab: ProcheTab) => void;
  readonly alertCount?: number;
}

export default function ProcheTabBar({ activeTab, onTabChange, alertCount = 0 }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map(({ key, label, Icon }) => {
        const active = activeTab === key;
        const color = active ? colors.secondary : '#9CA3AF';
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            onPress={() => onTabChange(key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Icon size={22} color={color} strokeWidth={active ? 2.5 : 2} />
              {key === 'alerts' && alertCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {alertCount > 99 ? '99+' : String(alertCount)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
            {active && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingBottom: 24,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  labelActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    bottom: -10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },
});
