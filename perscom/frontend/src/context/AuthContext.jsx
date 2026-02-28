import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [adminAlias, setAdminAlias] = useState(null);  // 'A. Achilles' | 'C. Shelby'
  const [logoUrl, setLogoUrl]     = useState(null);

  // Restore session on mount
  useEffect(() => {
    const token  = localStorage.getItem('perscom_token');
    const stored = localStorage.getItem('perscom_user');
    const alias  = sessionStorage.getItem('perscom_alias');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        if (alias) setAdminAlias(alias);
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // Fetch logo on mount
  useEffect(() => {
    api.get('/settings/logo').then((r) => setLogoUrl(r.data.logo_url || null)).catch(() => {});
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, user: u } = res.data;
    localStorage.setItem('perscom_token', token);
    localStorage.setItem('perscom_user', JSON.stringify(u));
    localStorage.removeItem('perscom_guest');
    setUser(u);
    return u;
  };

  const enterGuest = async () => {
    const res = await api.post('/auth/guest');
    const { token, user: u } = res.data;
    localStorage.setItem('perscom_token', token);
    localStorage.setItem('perscom_user', JSON.stringify(u));
    localStorage.setItem('perscom_guest', '1');
    setUser(u);
    return u;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('perscom_token');
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
  const canEdit  = isAdmin || isMod; // shorthand: any logged-in non-guest

  return (
    <AuthContext.Provider value={{
      user, loading,
      isAdmin, isMod, isGuest, canEdit,
      adminAlias, selectAlias,
      logoUrl, setLogoUrl,
      login, enterGuest, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
