import { View, StyleSheet } from 'react-native';

export default function Decorations() {
  return (
    <>
      {/* Décorations bleues en haut */}
      <View style={styles.decorTopLarge} />
      <View style={styles.decorTopSmall} />
      {/* Décorations bleues en bas */}
      <View style={styles.decorBottomLarge} />
      <View style={styles.decorBottomSmall} />
    </>
  );
}

const styles = StyleSheet.create({
  decorTopLarge: {
    position: 'absolute',
    top: -110,
    left: -80,
    width: 220,
    height: 220,
    backgroundColor: '#1d8de9ff',
    borderRadius: 110,
    transform: [{ rotate: '45deg' }],
  },
  decorTopSmall: {
    position: 'absolute',
    top: -100,
    left: -70,
    width: 170,
    height: 170,
    backgroundColor: '#2774F2',
    borderRadius: 85,
    transform: [{ rotate: '45deg' }],
  },
  decorBottomLarge: {
    position: 'absolute',
    bottom: -110,
    right: -80,
    width: 220,
    height: 220,
    backgroundColor: '#1d8de9ff',
    borderRadius: 110,
    transform: [{ rotate: '45deg' }],
    zIndex: -2,
  },
  decorBottomSmall: {
    position: 'absolute',
    bottom: -100,
    right: -70,
    width: 170,
    height: 170,
    backgroundColor: '#2774F2',
    borderRadius: 85,
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
  },
});
