import axios from 'axios';

const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const fallbackApiUrl = `http://${runtimeHost}:5000`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || fallbackApiUrl,
  timeout: 30000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wp_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
