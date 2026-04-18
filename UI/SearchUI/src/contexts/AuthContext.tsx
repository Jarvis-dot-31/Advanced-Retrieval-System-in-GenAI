'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'user' | 'recruiter';

interface User {
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, _password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hs-user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Simulated login — replace with real API call
    // Load role from stored data (in a real app, the server returns this)
    const stored = localStorage.getItem('hs-user-data-' + email);
    const role: UserRole = stored ? JSON.parse(stored).role : 'user';

    const newUser: User = {
      email,
      name: email.split('@')[0],
      role,
    };
    setUser(newUser);
    localStorage.setItem('hs-user', JSON.stringify(newUser));
    return true;
  };

  const signup = async (name: string, email: string, _password: string, role: UserRole): Promise<boolean> => {
    // Simulated signup — replace with real API call
    const newUser: User = { email, name, role };
    setUser(newUser);
    localStorage.setItem('hs-user', JSON.stringify(newUser));
    // Also persist role separately so login can retrieve it
    localStorage.setItem('hs-user-data-' + email, JSON.stringify({ role }));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hs-user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
