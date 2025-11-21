import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import type { LoginCredentials, RegisterPayload, User } from '@/lib/auth';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest, restoreSession } from '@/lib/auth';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const session = await restoreSession();
        if (session && mounted) {
          setUser(session.user);
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsSubmitting(true);
    try {
      const response = await loginRequest(credentials);
      setUser(response.user);
    } finally {
      setIsSubmitting(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsSubmitting(true);
    try {
      const response = await registerRequest(payload);
      setUser(response.user);
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    setIsSubmitting(true);
    try {
      await logoutRequest();
      setUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshUser = async () => {
    const profile = await getCurrentUser();
    setUser(profile);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      isSubmitting,
      login,
      register,
      logout,
      refreshUser,
    }),
    [isInitializing, isSubmitting, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
