

/**
 * useAuth Hook
 * Client-side authentication state management
 * Version: 0.13.10
 */


import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  title?: string;
  mfaEnabled: boolean;
}

export interface AuthSession {
  id: string;
  expiresAt: string;
  refreshed?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: {
    code: string;
    message: string;
    attemptsRemaining?: number;
    lockedUntil?: string;
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useAuth() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Zustand store state and actions
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setLoginError = useAuthStore((s) => s.setLoginError);
  const setLocked = useAuthStore((s) => s.setLocked);
  const incrementLoginAttempts = useAuthStore((s) => s.incrementLoginAttempts);
  const resetLoginAttempts = useAuthStore((s) => s.resetLoginAttempts);
  
  // =============================================================================
  // CHECK SESSION
  // =============================================================================
  
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          organizationId: 'org-001', // TODO: Add to API response
          isActive: true,
          mfaEnabled: data.user.mfaEnabled,
        });
        
        if (data.session) {
          setSession({
            id: data.session.id,
            userId: data.user.id,
            token: '', // Token is in HTTP-only cookie
            expiresAt: new Date(data.session.expiresAt),
            createdAt: new Date(),
            lastActiveAt: new Date(),
          });
        }
        
        return true;
      } else {
        // Not authenticated - clear store
        setUser(null);
        setSession(null);
        return false;
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
      setSession(null);
      return false;
    }
  }, [setUser, setSession]);
  
  // =============================================================================
  // LOGIN
  // =============================================================================
  
  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    setLoading(true);
    setLoginError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        // Login successful
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          organizationId: 'org-001',
          isActive: true,
          mfaEnabled: data.user.mfaEnabled,
        });
        
        if (data.session) {
          setSession({
            id: data.session.id,
            userId: data.user.id,
            token: '',
            expiresAt: new Date(data.session.expiresAt),
            createdAt: new Date(),
            lastActiveAt: new Date(),
          });
        }
        
        resetLoginAttempts();
        setLocked(false);
        
        return { success: true, user: data.user };
      } else {
        // Login failed
        const error = data.error || { code: 'UNKNOWN', message: 'Login failed' };
        
        setLoginError(error.message);
        
        if (error.code === 'ACCOUNT_LOCKED') {
          setLocked(true, error.lockedUntil ? new Date(error.lockedUntil) : undefined);
        } else {
          incrementLoginAttempts();
        }
        
        return { success: false, error };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'Network error. Please try again.';
      setLoginError(errorMessage);
      return { 
        success: false, 
        error: { code: 'NETWORK_ERROR', message: errorMessage } 
      };
    } finally {
      setLoading(false);
    }
  }, [
    setLoading, setLoginError, setUser, setSession, 
    resetLoginAttempts, setLocked, incrementLoginAttempts
  ]);
  
  // =============================================================================
  // LOGOUT
  // =============================================================================
  
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state, even if API call fails
      logout();
    }
  }, [logout]);
  
  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  
  useEffect(() => {
    if (!isInitialized) {
      checkSession().finally(() => {
        setIsInitialized(true);
        setIsLoading(false);
      });
    }
  }, [isInitialized, checkSession]);
  
  // =============================================================================
  // PERIODIC SESSION CHECK
  // =============================================================================
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Check session every 5 minutes
    const interval = setInterval(() => {
      checkSession();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, checkSession]);
  
  // =============================================================================
  // RETURN
  // =============================================================================
  
  return {
    // State
    user,
    session,
    isAuthenticated,
    isLoading,
    isInitialized,
    
    // Actions
    login,
    logout: handleLogout,
    checkSession,
  };
}

export default useAuth;
