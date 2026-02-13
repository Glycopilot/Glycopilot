import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, ChartColumn, User, Droplet } from 'lucide-react-native';
import { colors } from '../../themes/colors';

interface Tab {
  name: string;
  icon: React.ComponentType<any>;
}

interface NavbarProps {
  navigation: any;
  currentRoute?: string;
}

export default function Navbar({
  navigation,
  currentRoute = 'Home',
}: NavbarProps) {
  const [activeTab, setActiveTab] = useState(currentRoute);

  useEffect(() => {
    setActiveTab(currentRoute);
  }, [currentRoute]);

  const tabs: Tab[] = [
    {
      name: 'Home',
      icon: Home,
    },
    {
      name: 'Glycemia',
      icon: Droplet,
    },
    {
      name: 'Stats',
      icon: ChartColumn,
    },
    {
      name: 'Profile',
      icon: User,
    },
  ];

  const handleTabPress = (tabName: string) => {
    setActiveTab(tabName);
    if (navigation && navigation.navigate) {
      navigation.navigate(tabName);
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.name;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                isActive && styles.iconContainerActive,
              ]}
            >
              <Icon
                size={24}
                color={isActive ? colors.secondary : colors.textSecondary}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingBottom: 10,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  iconContainer: {
    marginBottom: 2,
  },
  iconContainerActive: {},
});
