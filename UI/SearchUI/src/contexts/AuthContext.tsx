'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export type UserRole = 'user' | 'recruiter';

interface User {
  email: string;
  name: string;
  role: UserRole | null;
  image?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  needsRoleSelection: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setRole: (role: UserRole) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const loading = status === 'loading';

  const user: User | null = session?.user
    ? {
        email: session.user.email || '',
        name: session.user.name || '',
        role: (session.user.role as UserRole) || null,
        image: session.user.image || undefined,
      }
    : null;

  const isAuthenticated = !!session?.user;
  const needsRoleSelection = isAuthenticated && user?.role === null;

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await signIn('google', { callbackUrl: '/select-role' });
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    // First, register the user via our API
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Signup failed' };
    }

    // Then sign them in automatically
    const signInResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      return { ok: false, error: signInResult.error };
    }
    return { ok: true };
  }, []);

  const setRole = useCallback(async (role: UserRole) => {
    const res = await fetch('/api/auth/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });

    if (!res.ok) return false;

    // Update the client-side session with the new role
    await update({ role });
    return true;
  }, [update]);

  const logout = useCallback(() => {
    signOut({ callbackUrl: '/' });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        needsRoleSelection,
        login,
        loginWithGoogle,
        signup,
        logout,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
