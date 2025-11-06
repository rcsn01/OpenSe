// API Configuration
// Update this URL to match your backend server
export const API_BASE_URL = __DEV__ 
  //? 'http://localhost:5000' // Development: local backend
  ? 'http://192.168.1.10:5000' // Development: local backend
  : 'https://your-production-url.com'; // Production: replace with your deployed backend URL

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/api/auth/login`,
  signup: `${API_BASE_URL}/api/auth/signup`,
  products: `${API_BASE_URL}/api/products`,
  reports: `${API_BASE_URL}/api/reports`,
};
