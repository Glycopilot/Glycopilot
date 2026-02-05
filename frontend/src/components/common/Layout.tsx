import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Header from './Header';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
  navigation: any;
  currentRoute?: string;
  userName?: string;
  userImage?: string;
  onNotificationPress?: () => void;
}

export default function Layout({
  children,
  navigation,
  currentRoute = 'Home',
  onNotificationPress,
}: LayoutProps) {
  return (
    <View style={styles.container}>
      <Header
        onNotificationPress={onNotificationPress}
        navigation={navigation}
      />

      <View style={styles.content}>{children}</View>

      <Navbar navigation={navigation} currentRoute={currentRoute} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    flex: 1,
  },
});
