import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = 'themePreference';
type Pref = 'light' | 'dark' | 'system';

let currentPref: Pref = 'system';
let listeners: Array<() => void> = [];

export async function setPreferredColorScheme(value: Pref) {
  try {
    await AsyncStorage.setItem(PREF_KEY, value);
    currentPref = value;
    listeners.forEach((l) => l());
  } catch (e) {
    console.error('Failed to save theme preference', e);
  }
}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const systemScheme = useRNColorScheme();
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setHasHydrated(true);

    const updateScheme = () => {
      if (currentPref === 'light') {
        setScheme('light');
      } else if (currentPref === 'dark') {
        setScheme('dark');
      } else {
        setScheme(systemScheme ?? 'light');
      }
    };

    // Initial load
    AsyncStorage.getItem(PREF_KEY).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        currentPref = val as Pref;
      }
      updateScheme();
    });

    listeners.push(updateScheme);
    return () => {
      listeners = listeners.filter((l) => l !== updateScheme);
    };
  }, []);

  // Update when system scheme changes, if preference is system
  useEffect(() => {
    if (currentPref === 'system') {
      setScheme(systemScheme ?? 'light');
    }
  }, [systemScheme]);

  if (hasHydrated) {
    return scheme;
  }

  return 'light';
}
