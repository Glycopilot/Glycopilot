import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  Heart,
  Droplets,
  TrendingUp,
  Pill,
  Utensils,
  CheckCircle,
  Activity,
  Apple,
} from 'lucide-react-native';
import type { OnboardingSlide as SlideData } from '../../constants/onboarding.constants';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
  slide: SlideData;
}

// ─── Illustrations par slide ─────────────────────────────────────────────────

function WelcomeIllustration({ color, bgColor }: { color: string; bgColor: string }) {
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.outerRing, { borderColor: color + '20' }]} />
      <View style={[styles.middleRing, { borderColor: color + '40' }]} />
      <View style={[styles.iconCircle, { backgroundColor: bgColor, borderColor: color + '30' }]}>
        <Heart size={52} color={color} fill={color + '30'} />
      </View>
      <View style={[styles.dot, styles.dotTopRight, { backgroundColor: color + '60' }]} />
      <View style={[styles.dot, styles.dotBottomLeft, { backgroundColor: color + '40' }]} />
      <View style={[styles.dot, styles.dotTopLeft, { backgroundColor: color + '30' }]} />
    </View>
  );
}

function GlycemiaIllustration({ color, bgColor }: { color: string; bgColor: string }) {
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.outerRing, { borderColor: color + '20' }]} />
      <View style={[styles.iconCircle, { backgroundColor: bgColor, borderColor: color + '30' }]}>
        <Droplets size={52} color={color} fill={color + '30'} />
      </View>
      {/* Mini carte de mesure */}
      <View style={[styles.miniCard, { backgroundColor: '#fff', top: 20, right: 10 }]}>
        <Text style={[styles.miniCardValue, { color }]}>92</Text>
        <Text style={styles.miniCardUnit}>mg/dL</Text>
      </View>
      <View style={[styles.miniCard, { backgroundColor: '#fff', bottom: 30, left: 10 }]}>
        <Text style={[styles.miniCardValue, { color, fontSize: 12 }]}>CGM</Text>
        <Activity size={12} color={color} />
      </View>
      <View style={[styles.dot, styles.dotTopLeft, { backgroundColor: color + '50' }]} />
      <View style={[styles.dot, styles.dotBottomRight, { backgroundColor: color + '40' }]} />
    </View>
  );
}

function StatsIllustration({ color, bgColor }: { color: string; bgColor: string }) {
  const bars = [40, 65, 45, 80, 55, 90, 70];
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.outerRing, { borderColor: color + '20' }]} />
      <View style={[styles.iconCircle, { backgroundColor: bgColor, borderColor: color + '30' }]}>
        <TrendingUp size={52} color={color} />
      </View>
      {/* Mini barre chart */}
      <View style={[styles.miniBarsCard, { backgroundColor: '#fff' }]}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[
              styles.miniBar,
              { height: h * 0.4, backgroundColor: i === 5 ? color : color + '40' },
            ]}
          />
        ))}
      </View>
      <View style={[styles.dot, styles.dotTopRight, { backgroundColor: color + '50' }]} />
    </View>
  );
}

function MedicationsIllustration({ color, bgColor }: { color: string; bgColor: string }) {
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.outerRing, { borderColor: color + '20' }]} />
      <View style={[styles.middleRing, { borderColor: color + '30' }]} />
      <View style={[styles.iconCircle, { backgroundColor: bgColor, borderColor: color + '30' }]}>
        <Pill size={52} color={color} />
      </View>
      {/* Mini pills decoratives */}
      <View style={[styles.miniPill, { backgroundColor: color + '30', top: 25, right: 20, transform: [{ rotate: '30deg' }] }]} />
      <View style={[styles.miniPill, { backgroundColor: color + '50', bottom: 35, left: 15, transform: [{ rotate: '-20deg' }] }]} />
      <View style={[styles.dot, styles.dotTopLeft, { backgroundColor: color + '40' }]} />
    </View>
  );
}

function LifestyleIllustration({ color, bgColor }: { color: string; bgColor: string }) {
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.outerRing, { borderColor: color + '20' }]} />
      <View style={[styles.iconCircle, { backgroundColor: bgColor, borderColor: color + '30' }]}>
        <Utensils size={44} color={color} />
      </View>
      {/* Icône activité en haut à droite */}
      <View style={[styles.secondaryIcon, { backgroundColor: bgColor, borderColor: color + '40', top: 15, right: 5 }]}>
        <Activity size={22} color={color} />
      </View>
      {/* Icône fruit en bas à gauche */}
      <View style={[styles.secondaryIcon, { backgroundColor: bgColor, borderColor: color + '40', bottom: 25, left: 5 }]}>
        <Apple size={22} color={color} />
      </View>
      <View style={[styles.dot, styles.dotBottomRight, { backgroundColor: color + '40' }]} />
    </View>
  );
}

function ReadyIllustration({ color, bgColor }: { color: string; bgColor: string }) {
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.outerRing, { borderColor: color + '20' }]} />
      <View style={[styles.middleRing, { borderColor: color + '40' }]} />
      <View style={[styles.iconCircle, { backgroundColor: bgColor, borderColor: color + '50', borderWidth: 2 }]}>
        <CheckCircle size={56} color={color} fill={color + '20'} />
      </View>
      <View style={[styles.dot, styles.dotTopRight, { backgroundColor: color + '70', width: 14, height: 14, borderRadius: 7 }]} />
      <View style={[styles.dot, styles.dotBottomLeft, { backgroundColor: color + '50', width: 10, height: 10, borderRadius: 5 }]} />
      <View style={[styles.dot, styles.dotTopLeft, { backgroundColor: color + '40', width: 8, height: 8, borderRadius: 4 }]} />
      <View style={[styles.dot, styles.dotBottomRight, { backgroundColor: color + '60', width: 12, height: 12, borderRadius: 6 }]} />
    </View>
  );
}

const ILLUSTRATIONS = {
  welcome: WelcomeIllustration,
  glycemia: GlycemiaIllustration,
  stats: StatsIllustration,
  medications: MedicationsIllustration,
  lifestyle: LifestyleIllustration,
  ready: ReadyIllustration,
};

// ─── Slide ────────────────────────────────────────────────────────────────────

export default function OnboardingSlide({ slide }: OnboardingSlideProps) {
  const Illustration = ILLUSTRATIONS[slide.illustration];

  return (
    <View style={[styles.slide, { width }]}>
      <Illustration color={slide.color} bgColor={slide.bgColor} />

      <View style={styles.textBlock}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
        {slide.hints && slide.hints.length > 0 && (
          <View style={styles.hintsList}>
            {slide.hints.map((hint, i) => (
              <View key={i} style={styles.hintRow}>
                <View style={[styles.hintBullet, { backgroundColor: slide.color }]} />
                <Text style={styles.hintText}>{hint}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ILLUSTRATION_SIZE = 220;
const ICON_CIRCLE = 130;

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Illustration
  illustrationContainer: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  outerRing: {
    position: 'absolute',
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    borderRadius: ILLUSTRATION_SIZE / 2,
    borderWidth: 1.5,
  },
  middleRing: {
    position: 'absolute',
    width: ILLUSTRATION_SIZE * 0.78,
    height: ILLUSTRATION_SIZE * 0.78,
    borderRadius: (ILLUSTRATION_SIZE * 0.78) / 2,
    borderWidth: 1,
  },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotTopRight: { top: 18, right: 22 },
  dotTopLeft: { top: 28, left: 16 },
  dotBottomLeft: { bottom: 22, left: 24 },
  dotBottomRight: { bottom: 18, right: 16 },

  // Mini décorations Glycémie
  miniCard: {
    position: 'absolute',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  miniCardValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  miniCardUnit: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // Mini chart Stats
  miniBarsCard: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  miniBar: {
    width: 6,
    borderRadius: 3,
  },

  // Mini pilules Medications
  miniPill: {
    position: 'absolute',
    width: 28,
    height: 14,
    borderRadius: 7,
  },

  // Icônes secondaires Lifestyle
  secondaryIcon: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  // Texte
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Bullets
  hintsList: {
    marginTop: 4,
    alignSelf: 'stretch',
    gap: 10,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hintBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  hintText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
});
