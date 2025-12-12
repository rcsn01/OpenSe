import { Platform } from 'react-native';

// API Configuration
// Update this URL to match your backend server
const LOCAL_IP = '192.168.1.15'; // Update this to your machine's LAN IP
const PORT = 5279;

export const API_BASE_URL = __DEV__ 
  ? (Platform.OS === 'web' ? `http://${LOCAL_IP}:${PORT}` : `http://${LOCAL_IP}:${PORT}`)
  : 'https://your-production-url.com'; // Production: replace with your deployed backend URL

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  signup: `${API_BASE_URL}/api/auth/signup`,
  users: `${API_BASE_URL}/api/auth/users`,
  products: `${API_BASE_URL}/api/products`,
  reports: `${API_BASE_URL}/api/reports`,
};
