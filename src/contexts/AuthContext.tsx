import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    email: 'gerente@empresa.com',
    password: '123456',
    role: 'manager',
    department: 'Recursos Humanos',
  },
  {
    id: '2',
    name: 'Ana Santos',
    email: 'ana@empresa.com',
    password: '123456',
    role: 'employee',
    department: 'Desenvolvimento',
  },
  {
    id: '3',
    name: 'João Oliveira',
    email: 'joao@empresa.com',
    password: '123456',
    role: 'employee',
    department: 'Design',
  },
  {
    id: '4',
    name: 'Maria Costa',
    email: 'maria@empresa.com',
    password: '123456',
    role: 'employee',
    department: 'Marketing',
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Initialize mock users in localStorage
    const existingUsers = localStorage.getItem('users');
    if (!existingUsers) {
      localStorage.setItem('users', JSON.stringify(MOCK_USERS));
    }

    // Check for saved session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setAuthState({
        user: JSON.parse(savedUser),
        isAuthenticated: true,
      });
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(
      (u: User & { password: string }) => u.email === email && u.password === password
    );

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      setAuthState({
        user: userWithoutPassword,
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setAuthState({
      user: null,
      isAuthenticated: false,
    });
  };

  const updateUser = (user: User) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setAuthState((prev) => ({
      ...prev,
      user,
    }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
