import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, ChartColumn, Newspaper, User } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export default function BottomNavBar({ navigation, currentRoute = 'Home' }) {
  const [activeTab, setActiveTab] = useState(currentRoute);

  // Synchroniser l'état avec la route actuelle
  useEffect(() => {
    setActiveTab(currentRoute);
  }, [currentRoute]);

  const tabs = [
    {
      name: 'Home',
      icon: Home,
    },
    {
      name: 'Stats',
      icon: ChartColumn,
    },
    // {
    //   name: 'Journal',
    //   icon: Newspaper,
    // },
    {
      name: 'Profile',
      icon: User,
    },
  ];

  const handleTabPress = tabName => {
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
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // Ombre pour iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Ombre pour Android
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    marginBottom: 4,
  },
  iconContainerActive: {
    // Vous pouvez ajouter un effet ici si vous voulez
  },
  labelActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
});
