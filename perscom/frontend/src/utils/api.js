import axios from 'axios';

// In production without VITE_API_URL, fall back to same-domain /perscom/api so
// the .htaccess proxy can route it to Railway — keeps cookies same-origin for Firefox.
// In development, the Vite proxy handles /api → localhost:3001
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`,
  timeout: 15000,
  withCredentials: true,
});

// sessionStorage key for Bearer token (Firefox/Safari cross-origin fallback)
const TOKEN_KEY = 'perscom_tok';

export function storeToken(t) {
  if (t) sessionStorage.setItem(TOKEN_KEY, t);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Attach stored Bearer token to every request when available.
// Browsers that accept httpOnly cookies (Chrome, Edge) will use the cookie instead —
// the Authorization header is a no-op when the cookie is already present.
api.interceptors.request.use((config) => {
  const tok = sessionStorage.getItem(TOKEN_KEY);
  if (tok) config.headers['Authorization'] = `Bearer ${tok}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    // If the server included a (fresh) token in the response body, persist it.
    if (res.data?.token) storeToken(res.data.token);
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect on session-check or silent-refresh calls — AuthContext handles
      // those 401s itself. Redirecting here would cause an infinite reload loop.
      const url = err.config?.url || '';
      const isSessionCheck = url.endsWith('/auth/me') || url.endsWith('/auth/refresh');
      // Don't redirect during the registration flow — Register.jsx handles its own 401s
      const isRegisterFlow = url.includes('/discord/register');
      if (!isSessionCheck && !isRegisterFlow) {
        localStorage.removeItem('perscom_user');
        localStorage.removeItem('perscom_guest');
        sessionStorage.removeItem('perscom_alias');
        clearToken();
        window.location.href = import.meta.env.BASE_URL + 'login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
