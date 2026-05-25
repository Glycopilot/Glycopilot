import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const onboardingKey = (userId: string) => `@glycopilot_onboarding_${userId}`;

interface UseOnboardingReturn {
  showOnboarding: boolean;
  isChecking: boolean;
  completeOnboarding: () => Promise<void>;
}

export const useOnboarding = (): UseOnboardingReturn => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(raw => {
        if (!raw) return null;
        const user = JSON.parse(raw) as { id?: string | number };
        return user?.id ? String(user.id) : null;
      })
      .then(userId => {
        if (!userId) {
          setIsChecking(false);
          return;
        }
        const k = onboardingKey(userId);
        setKey(k);
        return AsyncStorage.getItem(k).then(value => setShowOnboarding(value === null));
      })
      .catch(() => setShowOnboarding(false))
      .finally(() => setIsChecking(false));
  }, []);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    try {
      if (key) await AsyncStorage.setItem(key, 'true');
    } finally {
      setShowOnboarding(false);
    }
  }, [key]);

  return { showOnboarding, isChecking, completeOnboarding };
};
