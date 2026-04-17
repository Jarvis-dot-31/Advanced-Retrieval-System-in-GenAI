import { createContext, useContext, useState, type ReactNode } from 'react';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, _password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hs-user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Simulated login — replace with real API call
    const newUser: User = {
      email,
      name: email.split('@')[0],
    };
    setUser(newUser);
    localStorage.setItem('hs-user', JSON.stringify(newUser));
    return true;
  };

  const signup = async (name: string, email: string, _password: string): Promise<boolean> => {
    // Simulated signup — replace with real API call
    const newUser: User = { email, name };
    setUser(newUser);
    localStorage.setItem('hs-user', JSON.stringify(newUser));
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
