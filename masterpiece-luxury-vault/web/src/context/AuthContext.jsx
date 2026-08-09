import { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, setToken } from '../api/client';

const AuthContext = createContext(null);

// Decodes the JWT payload without verifying it — safe here because this
// is purely for reading display info (email, role) client-side; the
// server independently verifies the signature on every real request.
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('mlv_token');
    return stored ? decodeToken(stored) : null;
  });

  const login = useCallback(async (email, password) => {
    const data = await apiLogin({ email, password });
    setToken(data.token);
    setUser(decodeToken(data.token));
    return data;
  }, []);

  const register = useCallback(async (email, password, fullName) => {
    const data = await apiRegister({ email, password, fullName });
    setToken(data.token);
    setUser(decodeToken(data.token));
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
