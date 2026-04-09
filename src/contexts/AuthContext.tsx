import React, { createContext, useContext, useState, useCallback } from 'react';
import { store } from '@/lib/store';
import { auditLog } from '@/lib/audit-logger';

interface AuthContextType {
  isLoggedIn: boolean;
  username: string;
  role: string;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<{ username: string; role: string } | null>(() => {
    // Run migration once before reading auth state (removes legacy demo accounts)
    store.migrateFromDemo();

    const saved = store.getAuth();
    if (!saved) return null;

    // Detect stale session: logged in as a user that no longer has a real account
    const users = store.getUsers();
    const stillExists = users.some(
      u => u.username.toLowerCase() === saved.username.toLowerCase() && !!u.password_hash,
    );
    if (!stillExists) {
      store.logout();
      return null;
    }
    return saved;
  });

  const login = useCallback((username: string, password: string) => {
    const result = store.login(username, password);
    if (result.success) {
      setAuth({ username, role: result.role! });
      auditLog({ action_type: 'USER_LOGIN', module_name: 'Auth', description: `${username} logged in`, username, user_role: result.role!, status: 'success' });
      return true;
    }
    auditLog({ action_type: 'LOGIN_FAILED', module_name: 'Auth', description: `Failed login attempt for "${username}"`, username, user_role: 'unknown', status: 'failed' });
    return false;
  }, []);

  const logout = useCallback(() => {
    const currentAuth = store.getAuth();
    auditLog({ action_type: 'USER_LOGOUT', module_name: 'Auth', description: `${currentAuth?.username ?? 'User'} logged out`, username: currentAuth?.username ?? 'unknown', user_role: currentAuth?.role ?? 'unknown' });
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
