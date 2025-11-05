import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Default development hosts - adjust as needed for your environment.
const ANDROID_EMULATOR_HOST = 'http://10.0.2.2:5000';
const IOS_HOST = 'http://localhost:5000';
const WEB_HOST = 'http://localhost:5000';

const platformHost = Platform.select({
  android: ANDROID_EMULATOR_HOST,
  ios: IOS_HOST,
  web: WEB_HOST,
});

// Allow override via app config extras (app.json) if present
const extraHost = (Constants.expoConfig as any)?.extra?.API_BASE;

export const API_BASE = extraHost || platformHost;

export default {
  API_BASE,
};
