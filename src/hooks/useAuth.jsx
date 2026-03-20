import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

// ── AuthProvider ──────────────────────────────────────────────────────────────
// Token storage strategy for web:
//   • Access token  → HttpOnly cookie set by the backend (never readable by JS)
//   • Refresh token → HttpOnly cookie on /api/auth/refresh path
//   • The client sends both automatically via withCredentials: true
//   • On startup, we call GET /auth/me; if the cookie is still valid the
//     backend returns the user, otherwise we treat the session as expired.
//   • The Axios interceptor in client.js handles silent refresh on 401.
//   • 'auth:logout' is fired by the interceptor when refresh also fails.

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on page load ──
  useEffect(() => {
    authApi.me()
      .then(data => setUser(data?.data?.user || data?.user || data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // ── Listen for forced logout (interceptor fires this on refresh failure) ──
  useEffect(() => {
    const handler = () => { setUser(null); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  // ── signin ────────────────────────────────────────────────────────────────
  // Backend: POST /auth/signin → sets HttpOnly cookies → returns { user, accessToken, refreshToken }
  // We store the user object in state; we deliberately ignore the tokens in
  // the body — the browser already has them in cookies.
  const signin = useCallback(async (email, password) => {
    const data = await authApi.signin({ email, password });
    const u = data?.data?.user || data?.user || data;
    setUser(u);
    return u;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  // Tell the backend to clear the cookies, then clear local state.
  const logout = useCallback(async () => {
    await authApi.logout().catch(() => null); // best-effort
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
