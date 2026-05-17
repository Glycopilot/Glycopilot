import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Droplet, BookOpen, User } from 'lucide-react-native';
import { colors } from '../../themes/colors';

interface Tab {
  name: string;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

interface NavbarProps {
  navigation: any;
  currentRoute?: string;
}

const TABS: Tab[] = [
  { name: 'Home',     label: 'Accueil',  Icon: Home     },
  { name: 'Glycemia', label: 'Glycémie', Icon: Droplet  },
  { name: 'Journal',  label: 'Journal',  Icon: BookOpen },
  { name: 'Profile',  label: 'Profil',   Icon: User     },
];

export default function Navbar({ navigation, currentRoute = 'Home' }: NavbarProps) {
  const [activeTab, setActiveTab] = useState(currentRoute);

  useEffect(() => {
    setActiveTab(currentRoute);
  }, [currentRoute]);

  const handleTabPress = (tabName: string) => {
    setActiveTab(tabName);
    if (navigation?.navigate) navigation.navigate(tabName);
  };

  return (
    <View style={styles.bar}>
      {TABS.map(({ name, label, Icon }) => {
        const active = activeTab === name;
        const color = active ? colors.secondary : '#9CA3AF';
        return (
          <TouchableOpacity
            key={name}
            style={styles.tab}
            onPress={() => handleTabPress(name)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Icon size={22} color={color} strokeWidth={active ? 2.5 : 2} />
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
