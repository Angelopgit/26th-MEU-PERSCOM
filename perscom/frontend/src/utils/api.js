import axios from 'axios';

// In production, VITE_API_URL points to the backend server (e.g. https://api.26thmeu.org/api)
// In development, the Vite proxy handles /api → localhost:3001
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect on session-check or silent-refresh calls — AuthContext handles
      // those 401s itself. Redirecting here would cause an infinite reload loop.
      const url = err.config?.url || '';
      const isSessionCheck = url.endsWith('/auth/me') || url.endsWith('/auth/refresh');
      if (!isSessionCheck) {
        localStorage.removeItem('perscom_user');
        localStorage.removeItem('perscom_guest');
        sessionStorage.removeItem('perscom_alias');
        window.location.href = import.meta.env.BASE_URL + 'login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
