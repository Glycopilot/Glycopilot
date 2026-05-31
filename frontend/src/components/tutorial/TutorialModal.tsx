import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import type { TutorialStep } from '../../constants/tutorial.constants';

interface TutorialModalProps {
  visible: boolean;
  steps: TutorialStep[];
  accentColor: string;
  onComplete: () => void;
}

export default function TutorialModal({
  visible,
  steps,
  accentColor,
  onComplete,
}: TutorialModalProps) {
  const [index, setIndex] = useState(0);

  if (!visible) return null;

  const isLast = index === steps.length - 1;
  const step = steps[index];

  const handleNext = () => {
    if (isLast) {
      setIndex(0);
      onComplete();
    } else {
      setIndex(i => i + 1);
    }
  };

  const handleSkip = () => {
    setIndex(0);
    onComplete();
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={handleSkip} />

      {/* Card */}
      <View style={styles.cardWrapper} pointerEvents="box-none">
        <View style={styles.card}>
          {/* Skip */}
          {!isLast && (
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>Passer</Text>
            </TouchableOpacity>
          )}

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '15' }]}>
            {step.icon}
          </View>

          {/* Content */}
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          {/* Dots */}
          {steps.length > 1 && (
            <View style={styles.dots}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === index
                      ? [styles.dotActive, { backgroundColor: accentColor }]
                      : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accentColor }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{isLast ? 'Compris !' : 'Suivant'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 999,
  },

  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
  },

  skipBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },

  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },

  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#E5E7EB',
  },

  btn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
