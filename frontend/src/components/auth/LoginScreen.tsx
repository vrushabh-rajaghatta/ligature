
/**
 * LoginScreen Component
 * Full-page login experience
 * Version: 0.25.0
 */


import React, { useCallback } from 'react';
import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { useAuthStore } from '@/stores/auth-store';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const passwordChangeRequired = useAuthStore((s) => s.passwordChangeRequired);
  const setPasswordChangeRequired = useAuthStore((s) => s.setPasswordChangeRequired);
  
  const handlePasswordDialogClose = useCallback(() => {
    setPasswordChangeRequired(false);
  }, [setPasswordChangeRequired]);
  
  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle overlay for better text readability */}
      <div className="absolute inset-0 bg-white/30" />
      
      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="py-6 px-8">
          <div className="flex items-center gap-4">
            <Image 
              src="/ligature-logo.png" 
              alt="Ligature" 
              width={52} 
              height={52}
              className="rounded-lg"
              priority
              unoptimized
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ligature</h1>
              <p className="text-sm text-gray-600">R&D Connected</p>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <LoginForm onSuccess={onLoginSuccess} />
          </div>
        </main>
        
        {/* Footer */}
        <footer className="py-6 px-8 text-center">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Ligature. All rights reserved.
          </p>
        </footer>
      </div>
      
      {/* Password Change Dialog */}
      <PasswordChangeDialog
        isOpen={passwordChangeRequired}
        onClose={handlePasswordDialogClose}
        isRequired={passwordChangeRequired}
      />
    </div>
  );
}

export default LoginScreen;
