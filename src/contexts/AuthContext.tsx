import React, { createContext, useContext, useState, useCallback } from 'react';
import { store } from '@/lib/store';

interface AuthContextType {
  isLoggedIn: boolean;
  username: string;
  role: string;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState(store.getAuth());

  const login = useCallback((username: string, password: string) => {
    const result = store.login(username, password);
    if (result.success) {
      setAuth({ username, role: result.role! });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    store.logout();
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoggedIn: !!auth,
      username: auth?.username ?? '',
      role: auth?.role ?? '',
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
