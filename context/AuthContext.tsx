'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'CLINICIAN' | 'PATIENT_PROXY';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  facility?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (nameOrUser: string | User, role?: UserRole) => void;
  logout: () => void;
  loginAsGuest: (role?: UserRole) => void;
}

const STORAGE_KEY = 'medlens_auth_session';

const DEFAULT_CLINICIAN: User = {
  id: 'usr-guest-clinician-01',
  name: 'Dr. Alex Vance, MD',
  email: 'a.vance@cardiorenal-health.org',
  role: 'CLINICIAN',
  facility: 'Cardiorenal Health Institute',
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: true,
  user: DEFAULT_CLINICIAN,
  login: () => {},
  logout: () => {},
  loginAsGuest: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_CLINICIAN);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('Failed to load auth session:', err);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  const login = (nameOrUser: string | User, role: UserRole = 'CLINICIAN') => {
    let newUser: User;
    if (typeof nameOrUser === 'string') {
      newUser = {
        id: `USR-${Date.now()}`,
        name: nameOrUser,
        email: `${nameOrUser.toLowerCase().replace(/[^a-z0-9]/g, '')}@medlens.internal`,
        role,
      };
    } else {
      newUser = nameOrUser;
    }
    setUser(newUser);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      } catch (err) {
        console.warn('Failed to persist auth session:', err);
      }
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to clear auth session:', err);
      }
    }
  };

  const loginAsGuest = (role: UserRole = 'CLINICIAN') => {
    const guestUser: User = role === 'CLINICIAN'
      ? DEFAULT_CLINICIAN
      : {
          id: 'usr-guest-patient-01',
          name: 'Sarah Jenkins (Patient Proxy)',
          email: 'sarah.jenkins@patientportal.org',
          role: 'PATIENT_PROXY',
          facility: 'Patient Portal',
        };
    login(guestUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loginAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
