

/**
 * Auth Store
 * Part 11 compliant authentication state management
 * Version: 0.9.7
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Session, PasswordValidationResult } from '@/services/auth/AuthService';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthState {
  // Core auth state
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Login state
  loginError: string | null;
  loginAttempts: number;
  isLocked: boolean;
  lockedUntil: Date | null;
  
  // Password change state
  passwordChangeRequired: boolean;
  passwordValidation: PasswordValidationResult | null;
  
  // Session management
  activeSessions: Session[];
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setLoginError: (error: string | null) => void;
  incrementLoginAttempts: () => void;
  resetLoginAttempts: () => void;
  setLocked: (locked: boolean, until?: Date) => void;
  setPasswordChangeRequired: (required: boolean) => void;
  setPasswordValidation: (validation: PasswordValidationResult | null) => void;
  setActiveSessions: (sessions: Session[]) => void;
  logout: () => void;
  clearErrors: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  loginError: null,
  loginAttempts: 0,
  isLocked: false,
  lockedUntil: null,
  passwordChangeRequired: false,
  passwordValidation: null,
  activeSessions: [],
};

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: user !== null 
      }),
      
      setSession: (session) => set({ session }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setLoginError: (loginError) => set({ loginError }),
      
      incrementLoginAttempts: () => set((state) => ({ 
        loginAttempts: state.loginAttempts + 1 
      })),
      
      resetLoginAttempts: () => set({ loginAttempts: 0 }),
      
      setLocked: (isLocked, lockedUntil) => set({ 
        isLocked, 
        lockedUntil: lockedUntil || null 
      }),
      
      setPasswordChangeRequired: (passwordChangeRequired) => set({ 
        passwordChangeRequired 
      }),
      
      setPasswordValidation: (passwordValidation) => set({ 
        passwordValidation 
      }),
      
      setActiveSessions: (activeSessions) => set({ activeSessions }),
      
      logout: () => set({
        ...initialState,
      }),
      
      clearErrors: () => set({ 
        loginError: null, 
        passwordValidation: null 
      }),
    }),
    {
      name: 'ligature-auth',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        // Only persist minimal auth info for session restoration
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);

// =============================================================================
// SELECTORS (prevent unnecessary re-renders)
// =============================================================================

export const useUser = () => useAuthStore((s) => s.user);
export const useSession = () => useAuthStore((s) => s.session);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useIsLoading = () => useAuthStore((s) => s.isLoading);
export const useLoginError = () => useAuthStore((s) => s.loginError);
export const useIsLocked = () => useAuthStore((s) => s.isLocked);
export const usePasswordChangeRequired = () => useAuthStore((s) => s.passwordChangeRequired);
export const useActiveSessions = () => useAuthStore((s) => s.activeSessions);
