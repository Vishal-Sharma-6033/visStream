import axios from 'axios';

const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const resolveApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  const fallbackApiUrl = `http://${runtimeHost}:5000`;

  if (!envUrl) return fallbackApiUrl;

  try {
    const parsed = new URL(envUrl);
    const isEnvLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isRuntimeLocalhost = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';

    if (isEnvLocalhost && !isRuntimeLocalhost) {
      parsed.hostname = runtimeHost;
      return parsed.toString().replace(/\/$/, '');
    }

    return envUrl;
  } catch {
    return fallbackApiUrl;
  }
};

const api = axios.create({
  baseURL: resolveApiUrl(),
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
