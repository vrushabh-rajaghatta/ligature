
/**
 * LoginForm Component
 * Part 11 compliant login with lockout support
 * Version: 0.25.0
 */


import React, { useState, useCallback } from 'react';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { LOCKOUT_CONFIG } from '@/config/auth-config';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  // Local form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Auth hook
  const { login } = useAuth();
  
  // Auth store state
  const loginError = useAuthStore((s) => s.loginError);
  const loginAttempts = useAuthStore((s) => s.loginAttempts);
  const isLocked = useAuthStore((s) => s.isLocked);
  const lockedUntil = useAuthStore((s) => s.lockedUntil);
  
  // Auth store actions
  const setLoginError = useAuthStore((s) => s.setLoginError);
  
  const attemptsRemaining = LOCKOUT_CONFIG.maxFailedAttempts - loginAttempts;
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      return;
    }
    
    setIsSubmitting(true);
    setLoginError(null);
    
    try {
      const result = await login({ email, password });
      
      if (result.success) {
        onSuccess?.();
      }
      // Error handling is done in the useAuth hook
    } catch (error) {
      setLoginError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, isLocked, login, setLoginError, onSuccess]);
  
  const formatLockoutTime = useCallback(() => {
    if (!lockedUntil) return '';
    const now = new Date();
    const diff = Math.max(0, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000));
    return `${diff} minute${diff !== 1 ? 's' : ''}`;
  }, [lockedUntil]);
  
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Ligature</h1>
      </div>
      
      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Alert */}
        {loginError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Authentication Failed</p>
              <p className="text-sm text-red-600 mt-1">{loginError}</p>
            </div>
          </div>
        )}
        
        {/* Lockout Warning */}
        {isLocked && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Account Temporarily Locked</p>
              <p className="text-sm text-amber-600 mt-1">
                Please wait {formatLockoutTime()} before attempting to log in again.
              </p>
            </div>
          </div>
        )}
        
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLocked || isSubmitting}
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              autoComplete="email"
              data-testid="email-input"
            />
          </div>
        </div>
        
        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLocked || isSubmitting}
              placeholder="Enter your password"
              className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              autoComplete="current-password"
              data-testid="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLocked || isSubmitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Attempts Warning */}
        {loginAttempts > 0 && attemptsRemaining <= 3 && !isLocked && (
          <p className="text-sm text-amber-600">
            ⚠️ {attemptsRemaining} login attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before account lockout
          </p>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLocked || isSubmitting || !email || !password}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          data-testid="login-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Authenticating...
            </>
          ) : (
            'Sign In'
          )}
        </button>
        
        {/* Forgot Password */}
        {onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-sm text-blue-600 hover:text-blue-800"
          >
            Forgot your password?
          </button>
        )}
      </form>
      

    </div>
  );
}

export default LoginForm;
