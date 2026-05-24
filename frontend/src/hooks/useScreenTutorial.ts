import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const tutorialKey = (userId: string, screenId: string) =>
  `@glycopilot_tutorial_${userId}_${screenId}`;

interface UseScreenTutorialReturn {
  showTutorial: boolean;
  completeTutorial: () => Promise<void>;
}

export const useScreenTutorial = (screenId: string): UseScreenTutorialReturn => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(raw => {
        if (!raw) return null;
        const user = JSON.parse(raw) as { id?: string | number };
        return user?.id ? String(user.id) : null;
      })
      .then(userId => {
        if (!userId) return;
        const k = tutorialKey(userId, screenId);
        setKey(k);
        return AsyncStorage.getItem(k).then(value => {
          if (value === null) setShowTutorial(true);
        });
      })
      .catch(() => {});
  }, [screenId]);

  const completeTutorial = useCallback(async (): Promise<void> => {
    try {
      if (key) await AsyncStorage.setItem(key, 'true');
    } finally {
      setShowTutorial(false);
    }
  }, [key]);

  return { showTutorial, completeTutorial };
};
