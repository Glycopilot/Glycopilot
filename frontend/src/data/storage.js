import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACTIVITIES: 'glyco_activities',
  MEALS: 'glyco_meals',
  TREATMENTS: 'glyco_treatments',
};

export async function getStored(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('getStored error', err);
    return null;
  }
}

export async function setStored(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('setStored error', err);
  }
}

export const storage = {
  getActivities: () => getStored(KEYS.ACTIVITIES),
  setActivities: data => setStored(KEYS.ACTIVITIES, data),
  getMeals: () => getStored(KEYS.MEALS),
  setMeals: data => setStored(KEYS.MEALS, data),
  getTreatments: () => getStored(KEYS.TREATMENTS),
  setTreatments: data => setStored(KEYS.TREATMENTS, data),
};
