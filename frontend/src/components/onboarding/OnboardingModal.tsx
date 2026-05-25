import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { ONBOARDING_SLIDES } from '../../constants/onboarding.constants';
import OnboardingSlide from './OnboardingSlide';
import { useOnboarding } from '../../hooks/useOnboarding';

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

export default function OnboardingModal() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeColor = ONBOARDING_SLIDES[currentIndex]?.color ?? '#007AFF';

  const goToNext = useCallback(() => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      completeOnboarding();
    }
  }, [currentIndex, completeOnboarding]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prev, animated: true });
      setCurrentIndex(prev);
    }
  }, [currentIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  if (!showOnboarding) return null;

  const isLast = currentIndex === ONBOARDING_SLIDES.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dotsRow}>
            {ONBOARDING_SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex
                    ? [styles.dotActive, { backgroundColor: activeColor }]
                    : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {!isLast && (
            <TouchableOpacity onPress={completeOnboarding} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: activeColor }]}>Passer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <OnboardingSlide slide={item} />}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          style={styles.flatList}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={goToPrev}
            style={[styles.navBtn, isFirst && styles.navBtnHidden]}
            disabled={isFirst}
          >
            <Text style={[styles.navBtnText, { color: '#9CA3AF' }]}>‹ Retour</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToNext}
            style={[styles.primaryBtn, { backgroundColor: activeColor }]}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isLast ? 'Commencer' : 'Suivant'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    borderRadius: 4,
    height: 6,
  },
  dotActive: {
    width: 22,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#E5E7EB',
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Slides
  flatList: {
    flex: 1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  navBtnHidden: {
    opacity: 0,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
