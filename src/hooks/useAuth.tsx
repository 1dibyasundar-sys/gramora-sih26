'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { authService, userService } from '@/services';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, onboardingData: Record<string, unknown>) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  switchRole: (role: UserRole) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('farmer');
  const [loading, setLoading] = useState<boolean>(true);
  const isFirebaseConfigured = authService.isConfigured();

  useEffect(() => {
    let mounted = true;

    if (isFirebaseConfigured) {
      const unsubscribe = authService.onAuthStateChanged((u) => {
        if (mounted) {
          if (u) {
            setUser(u);
            setRole(u.role);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      });
      return () => {
        mounted = false;
        unsubscribe();
      };
    } else {
      userService.getCurrentUser().then((u) => {
        if (mounted) {
          setUser(u);
          setRole(u.role);
          setLoading(false);
        }
      });
      return () => {
        mounted = false;
      };
    }
  }, [isFirebaseConfigured]);

  const signIn = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const authenticatedUser = await authService.signIn(email, password);
      setUser(authenticatedUser);
      setRole(authenticatedUser.role);
      return authenticatedUser;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    onboardingData: Record<string, unknown>
  ): Promise<User> => {
    setLoading(true);
    try {
      const registeredUser = await authService.signUp(email, password, onboardingData);
      setUser(registeredUser);
      setRole(registeredUser.role);
      return registeredUser;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    await authService.signOut();
    setUser(null);
  };

  const resetPassword = async (email: string): Promise<void> => {
    await authService.resetPassword(email);
  };

  const getIdToken = async (forceRefresh = false): Promise<string | null> => {
    return authService.getIdToken(forceRefresh);
  };

  const switchRole = async (newRole: UserRole) => {
    setLoading(true);
    const updated = await userService.switchUserRole(newRole);
    setUser(updated);
    setRole(newRole);
    setLoading(false);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = await userService.updateProfile(user.id, updates);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isFirebaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        getIdToken,
        switchRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
