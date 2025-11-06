import { useColorScheme as useRNColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Pref = 'light' | 'dark' | 'system';
const PREF_KEY = 'themePreference';

let preferredValue: Pref | null = null;
let listeners: Array<() => void> = [];

export async function setPreferredColorScheme(value: Pref) {
	try {
		await AsyncStorage.setItem(PREF_KEY, value);
		preferredValue = value;
		listeners.forEach((l) => l());
	} catch (e) {
		// ignore
	}
}

export function subscribeToPref(cb: () => void) {
	listeners.push(cb);
	return () => {
		listeners = listeners.filter((l) => l !== cb);
	};
}

export function useColorScheme() {
	const rn = useRNColorScheme();
	const [scheme, setScheme] = useState<'light' | 'dark'>(() => {
		if (preferredValue === 'light') return 'light';
		if (preferredValue === 'dark') return 'dark';
		return (rn ?? 'light') as 'light' | 'dark';
	});

	useEffect(() => {
		let mounted = true;

		// initialize from AsyncStorage if needed
		(async () => {
			try {
				const v = await AsyncStorage.getItem(PREF_KEY);
				if (!mounted) return;
				if (v === 'light' || v === 'dark') {
					preferredValue = v as Pref;
					setScheme(v as 'light' | 'dark');
				} else {
					preferredValue = v as Pref | null;
					setScheme((rn ?? 'light') as 'light' | 'dark');
				}
			} catch (e) {
				preferredValue = null;
				if (mounted) setScheme((rn ?? 'light') as 'light' | 'dark');
			}
		})();

		// react to RN system changes when preference is system/null
		const sub = subscribeToPref(() => {
			if (preferredValue === 'light' || preferredValue === 'dark') {
				setScheme(preferredValue as 'light' | 'dark');
			} else {
				setScheme((useRNColorScheme() ?? 'light') as 'light' | 'dark');
			}
		});

		return () => {
			mounted = false;
			sub();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rn]);

	// Also update when RN scheme changes and no explicit preference
	useEffect(() => {
		if (preferredValue === 'light' || preferredValue === 'dark') return;
		setScheme((rn ?? 'light') as 'light' | 'dark');
	}, [rn]);

	return scheme;
}
