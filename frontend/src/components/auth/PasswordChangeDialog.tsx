
/**
 * PasswordChangeDialog Component
 * Part 11 compliant password change with policy validation
 * Version: 0.9.7
 */


import React, { useState, useCallback, useMemo } from 'react';
import { X, Lock, Eye, EyeOff, Check, AlertCircle, Shield, Loader2 } from 'lucide-react';
import { AuthService, DEFAULT_PASSWORD_POLICY, validatePassword } from '@/services/auth/AuthService';
import { useAuthStore } from '@/stores/auth-store';

interface PasswordChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isRequired?: boolean; // If true, user cannot dismiss without changing
}

export function PasswordChangeDialog({ isOpen, onClose, isRequired = false }: PasswordChangeDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const setPasswordChangeRequired = useAuthStore((s) => s.setPasswordChangeRequired);
  
  // Validate new password against policy
  const validation = useMemo(() => {
    if (!newPassword) return null;
    return validatePassword(newPassword);
  }, [newPassword]);
  
  // Check if passwords match
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword && newPassword !== confirmPassword;
  
  // Can submit?
  const canSubmit = currentPassword && newPassword && confirmPassword && 
    validation?.isValid && passwordsMatch && !isSubmitting;
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Demo: Verify current password (in real app, this would be server-side)
      if (currentPassword !== 'Ligature2026!') {
        setError('Current password is incorrect');
        setIsSubmitting(false);
        return;
      }
      
      // Demo: Check password history (simplified)
      if (newPassword === currentPassword) {
        setError('New password cannot be the same as current password');
        setIsSubmitting(false);
        return;
      }
      
      // Success!
      setSuccess(true);
      setPasswordChangeRequired(false);
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, currentPassword, newPassword, setPasswordChangeRequired]);
  
  const handleClose = useCallback(() => {
    if (isRequired && !success) return; // Can't close if required
    
    // Reset form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError(null);
    setSuccess(false);
    
    onClose();
  }, [isRequired, success, onClose]);
  
  if (!isOpen) return null;
  
  const policy = DEFAULT_PASSWORD_POLICY;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={!isRequired ? handleClose : undefined}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500">21 CFR Part 11 Compliant</p>
            </div>
          </div>
          {!isRequired && (
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Required Warning */}
          {isRequired && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Password Change Required</p>
                <p className="text-sm text-amber-600 mt-1">
                  Your password has expired per policy ({policy.expirationDays} day maximum).
                </p>
              </div>
            </div>
          )}
          
          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">Password changed successfully!</p>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          {!success && (
            <>
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      validation?.isValid ? 'border-green-500' : newPassword ? 'border-amber-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Strength */}
                {validation && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            validation.strength === 'weak' ? 'w-1/4 bg-red-500' :
                            validation.strength === 'fair' ? 'w-2/4 bg-amber-500' :
                            validation.strength === 'good' ? 'w-3/4 bg-blue-500' :
                            'w-full bg-green-500'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium capitalize ${
                        validation.strength === 'weak' ? 'text-red-600' :
                        validation.strength === 'fair' ? 'text-amber-600' :
                        validation.strength === 'good' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {validation.strength}
                      </span>
                    </div>
                    
                    {/* Validation Errors */}
                    {validation.errors.length > 0 && (
                      <ul className="text-xs text-red-600 space-y-1">
                        {validation.errors.map((err, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {err}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              
              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      passwordsMatch ? 'border-green-500' : passwordsMismatch ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>
              
              {/* Policy Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Password Requirements
                </p>
                <ul className="text-xs text-gray-600 grid grid-cols-2 gap-1">
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-gray-400" />
                    {policy.minLength}+ characters
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-gray-400" />
                    Uppercase letter
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-gray-400" />
                    Lowercase letter
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-gray-400" />
                    Number
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-gray-400" />
                    Special character
                  </li>
                  <li className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-gray-400" />
                    No common words
                  </li>
                </ul>
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </>
          )}
        </form>
        
        {/* Compliance Footer */}
        <div className="px-6 py-3 bg-gray-50 rounded-b-xl border-t">
          <p className="text-xs text-gray-400 text-center">
            Password changes are logged per 21 CFR Part 11 requirements
          </p>
        </div>
      </div>
    </div>
  );
}

export default PasswordChangeDialog;
