import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [adminAlias, setAdminAlias] = useState(null);
  const [logoUrl, setLogoUrl]       = useState(null);

  // On mount: verify session with the server (cookie is sent automatically).
  // We also restore cached display data from localStorage to avoid a flicker,
  // but the cookie is the real source of auth truth — not localStorage.
  useEffect(() => {
    const cached = localStorage.getItem('perscom_user');
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }

    const alias = sessionStorage.getItem('perscom_alias');
    if (alias) setAdminAlias(alias);

    async function initSession() {
      try {
        // Fast path: JWT still valid
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        localStorage.setItem('perscom_user', JSON.stringify(res.data.user));
      } catch {
        // JWT expired — attempt silent refresh using stored Discord refresh_token.
        // This avoids a full OAuth round-trip and won't hit the code-exchange rate limit.
        try {
          const res = await api.post('/auth/refresh');
          setUser(res.data.user);
          localStorage.setItem('perscom_user', JSON.stringify(res.data.user));
        } catch {
          // Refresh token also expired/revoked — user must log in again
          setUser(null);
          localStorage.removeItem('perscom_user');
          localStorage.removeItem('perscom_guest');
        }
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, []);

  // Fetch logo once on mount (public endpoint, no auth needed)
  useEffect(() => {
    api.get('/settings/logo').then((r) => setLogoUrl(r.data.logo_url || null)).catch(() => {});
  }, []);

  const login = async (username, password) => {
    // Server sets httpOnly cookie — response body contains only non-sensitive user info
    const res = await api.post('/auth/login', { username, password });
    const { user: u } = res.data;
    // Cache display data only (no token stored anywhere in the browser)
    localStorage.setItem('perscom_user', JSON.stringify(u));
    localStorage.removeItem('perscom_guest');
    setUser(u);
    return u;
  };

  const enterGuest = async () => {
    const res = await api.post('/auth/guest');
    const { user: u } = res.data;
    localStorage.setItem('perscom_user', JSON.stringify(u));
    localStorage.setItem('perscom_guest', '1');
    setUser(u);
    return u;
  };

  const logout = useCallback(async () => {
    try {
      // Tell the server to clear the httpOnly cookie
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('perscom_user');
    localStorage.removeItem('perscom_guest');
    sessionStorage.removeItem('perscom_alias');
    setUser(null);
    setAdminAlias(null);
  }, []);

  const selectAlias = (alias) => {
    setAdminAlias(alias);
    sessionStorage.setItem('perscom_alias', alias);
  };

  const isAdmin  = user?.role === 'admin';
  const isMod    = user?.role === 'moderator';
  const isGuest  = user?.role === 'guest';
  const isMarine = user?.role === 'marine';
  const isStaff  = isAdmin || isMod;
  const canEdit  = isAdmin || isMod;

  return (
    <AuthContext.Provider value={{
      user, loading,
      isAdmin, isMod, isGuest, isMarine, isStaff, canEdit,
      adminAlias, selectAlias,
      logoUrl, setLogoUrl,
      login, enterGuest, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
