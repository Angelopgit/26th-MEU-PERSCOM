import axios from 'axios';

// In development, Vite proxies /api to localhost:3001
// In production, Express serves both frontend and API from the same origin
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('perscom_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('perscom_token');
      localStorage.removeItem('perscom_user');
      localStorage.removeItem('perscom_guest');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
