
// SignatureCapture Component - Phase 2.3e.4
// 21 CFR Part 11 compliant electronic signature capture
// Includes re-authentication, meaning selection, and audit trail


import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  X, Lock, CheckCircle, XCircle, AlertTriangle, Shield,
  Eye, Key, FileCheck, UserCheck, Edit3, PenTool,
  Loader2, AlertCircle, ChevronRight, Info
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  SignatureMeaning,
  SignatureCaptureProps,
  SignatureCaptureState,
  ElectronicSignature,
  AuthenticationMethod,
  SIGNATURE_MEANING_INFO,
  AUTHENTICATION_METHOD_INFO,
  generateSignatureId,
  generateDocumentHash,
  generateDocumentHashAsync,
  meaningRequiresComment,
} from '@/types/signature';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SignatureCapture({
  documentId,
  documentVersionId,
  documentTitle,
  documentVersion,
  approvalRequestId,
  approvalStepId,
  signerId,
  signerName,
  signerEmail,
  signerTitle,
  signerDepartment,
  allowedMeanings = ['approval', 'review', 'verification', 'rejection', 'revision-request'],
  defaultMeaning,
  requireAuthentication = true,
  authenticationMethods = ['password', 'two-factor'],
  onSign,
  onCancel,
  onError,
  isOpen,
}: SignatureCaptureProps) {
  // State
  const [state, setState] = useState<SignatureCaptureState>({
    step: 'meaning',
    selectedMeaning: defaultMeaning || null,
    isAuthenticated: !requireAuthentication,
    authenticationMethod: null,
    authenticationError: null,
    authAttempts: 0,
    maxAuthAttempts: 3,
    comments: '',
    reason: '',
    isSubmitting: false,
    error: null,
    signatureId: null,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState({
        step: 'meaning',
        selectedMeaning: defaultMeaning || null,
        isAuthenticated: !requireAuthentication,
        authenticationMethod: null,
        authenticationError: null,
        authAttempts: 0,
        maxAuthAttempts: 3,
        comments: '',
        reason: '',
        isSubmitting: false,
        error: null,
        signatureId: null,
      });
    }
  }, [isOpen, defaultMeaning, requireAuthentication]);

  // Derived state
  const selectedMeaningInfo = state.selectedMeaning 
    ? SIGNATURE_MEANING_INFO[state.selectedMeaning] 
    : null;

  const needsReason = state.selectedMeaning 
    ? meaningRequiresComment(state.selectedMeaning)
    : false;

  const canProceedFromMeaning = state.selectedMeaning !== null && 
    (!needsReason || state.reason.trim().length > 0);

  const canSign = state.isAuthenticated && 
    state.selectedMeaning !== null &&
    (!needsReason || state.reason.trim().length > 0);

  // Handlers
  const handleSelectMeaning = useCallback((meaning: SignatureMeaning) => {
    setState(prev => ({
      ...prev,
      selectedMeaning: meaning,
      reason: '',
    }));
  }, []);

  const handleProceedToAuth = useCallback(() => {
    if (!canProceedFromMeaning) return;
    
    if (requireAuthentication && !state.isAuthenticated) {
      setState(prev => ({ ...prev, step: 'authenticate' }));
    } else {
      setState(prev => ({ ...prev, step: 'confirm' }));
    }
  }, [canProceedFromMeaning, requireAuthentication, state.isAuthenticated]);

  const handleAuthenticate = useCallback(async (
    method: AuthenticationMethod,
    credentials: { password?: string; code?: string }
  ) => {
    setState(prev => ({
      ...prev,
      authenticationMethod: method,
      authenticationError: null,
      isSubmitting: true,
    }));

    try {
      // Simulate authentication (in production, call auth API)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Demo: Accept any non-empty password or code
      const isValid = method === 'password' 
        ? (credentials.password?.length ?? 0) > 0
        : (credentials.code?.length ?? 0) > 0;

      if (isValid) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          isSubmitting: false,
          step: 'confirm',
        }));
      } else {
        const attempts = state.authAttempts + 1;
        setState(prev => ({
          ...prev,
          authAttempts: attempts,
          authenticationError: attempts >= prev.maxAuthAttempts
            ? 'Maximum authentication attempts exceeded. Please try again later.'
            : 'Authentication failed. Please check your credentials.',
          isSubmitting: false,
        }));

        if (attempts >= state.maxAuthAttempts) {
          setTimeout(() => onCancel(), 2000);
        }
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        authenticationError: 'Authentication service error. Please try again.',
        isSubmitting: false,
      }));
      onError?.(err instanceof Error ? err : new Error('Authentication failed'));
    }
  }, [state.authAttempts, onCancel, onError]);

  const handleSign = useCallback(async () => {
    if (!canSign || !state.selectedMeaning) return;

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Generate signature record
      const signatureId = generateSignatureId();
      const now = new Date().toISOString();
      const meaningInfo = SIGNATURE_MEANING_INFO[state.selectedMeaning];

      const signature: ElectronicSignature = {
        id: `sig-${Date.now()}`,
        signatureId,
        
        // Document
        documentId,
        documentVersionId,
        documentTitle,
        documentVersion,
        approvalRequestId,
        approvalStepId,
        
        // Signer
        signerId,
        signerName,
        signerEmail,
        signerTitle,
        signerDepartment,
        
        // Meaning
        meaning: state.selectedMeaning,
        meaningLabel: meaningInfo.label,
        legalStatement: meaningInfo.legalText,
        
        // Context
        comments: state.comments || undefined,
        reason: needsReason ? state.reason : undefined,
        
        // Authentication
        authenticationMethod: state.authenticationMethod || 'sso-session',
        authenticationTimestamp: now,
        sessionId: `session-${Date.now()}`,
        
        // Timestamp
        signedAt: now,
        serverTimestamp: now,
        timezoneOffset: new Date().getTimezoneOffset(),
        
        // Integrity — real SHA-256 digests via Web Crypto / Node crypto
        documentHash: await generateDocumentHashAsync(`${documentId}-${documentVersionId}`),
        signatureHash: await generateDocumentHashAsync(`${signatureId}-${now}-${signerId}`),
        
        // Audit
        createdAt: now,
        auditTrailId: `audit-${Date.now()}`,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      setState(prev => ({
        ...prev,
        step: 'complete',
        signatureId,
        isSubmitting: false,
      }));

      // Notify parent after brief delay to show success
      setTimeout(() => onSign(signature), 1500);

    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to apply signature',
        isSubmitting: false,
      }));
      onError?.(err instanceof Error ? err : new Error('Signing failed'));
    }
  }, [
    canSign, state.selectedMeaning, state.comments, state.reason,
    state.authenticationMethod, needsReason,
    documentId, documentVersionId, documentTitle, documentVersion,
    approvalRequestId, approvalStepId,
    signerId, signerName, signerEmail, signerTitle, signerDepartment,
    onSign, onError,
  ]);

  const handleBack = useCallback(() => {
    setState(prev => {
      if (prev.step === 'confirm') {
        return { ...prev, step: requireAuthentication ? 'authenticate' : 'meaning' };
      }
      if (prev.step === 'authenticate') {
        return { ...prev, step: 'meaning' };
      }
      return prev;
    });
  }, [requireAuthentication]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-surface-base rounded-xl shadow-2xl border border-border w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-primary/10">
                <PenTool className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Electronic Signature
                </h2>
                <p className="text-sm text-text-muted">
                  21 CFR Part 11 Compliant
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            <StepIndicator 
              step={1} 
              label="Meaning" 
              isActive={state.step === 'meaning'}
              isComplete={state.step !== 'meaning'}
            />
            <div className="flex-1 h-px bg-border" />
            {requireAuthentication && (
              <>
                <StepIndicator 
                  step={2} 
                  label="Authenticate" 
                  isActive={state.step === 'authenticate'}
                  isComplete={state.step === 'confirm' || state.step === 'complete'}
                />
                <div className="flex-1 h-px bg-border" />
              </>
            )}
            <StepIndicator 
              step={requireAuthentication ? 3 : 2} 
              label="Confirm" 
              isActive={state.step === 'confirm'}
              isComplete={state.step === 'complete'}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Document info */}
          <div className="mb-6 p-3 bg-surface-elevated rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-text-muted flex-none mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {documentTitle}
                </p>
                <p className="text-xs text-text-muted">
                  Version {documentVersion}
                </p>
              </div>
            </div>
          </div>

          {/* Step content */}
          {state.step === 'meaning' && (
            <MeaningSelectionStep
              allowedMeanings={allowedMeanings}
              selectedMeaning={state.selectedMeaning}
              onSelect={handleSelectMeaning}
              reason={state.reason}
              onReasonChange={(reason) => setState(prev => ({ ...prev, reason }))}
              comments={state.comments}
              onCommentsChange={(comments) => setState(prev => ({ ...prev, comments }))}
              needsReason={needsReason}
            />
          )}

          {state.step === 'authenticate' && (
            <AuthenticationStep
              methods={authenticationMethods}
              selectedMethod={state.authenticationMethod}
              onAuthenticate={handleAuthenticate}
              error={state.authenticationError}
              attempts={state.authAttempts}
              maxAttempts={state.maxAuthAttempts}
              isSubmitting={state.isSubmitting}
            />
          )}

          {state.step === 'confirm' && selectedMeaningInfo && (
            <ConfirmationStep
              meaning={selectedMeaningInfo}
              signerName={signerName}
              signerTitle={signerTitle}
              comments={state.comments}
              reason={state.reason}
              needsReason={needsReason}
            />
          )}

          {state.step === 'complete' && (
            <CompletionStep
              signatureId={state.signatureId}
              signerName={signerName}
            />
          )}

          {/* Error display */}
          {state.error && (
            <div className="mt-4 p-3 bg-status-error/10 border border-status-error/30 rounded-lg">
              <div className="flex items-center gap-2 text-status-error">
                <AlertCircle className="w-4 h-4 flex-none" />
                <span className="text-sm">{state.error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {state.step !== 'complete' && (
          <div className="px-6 py-4 border-t border-border bg-surface-elevated flex items-center justify-between">
            <div>
              {(state.step === 'authenticate' || state.step === 'confirm') && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={state.isSubmitting}
                >
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={state.isSubmitting}
              >
                Cancel
              </Button>
              
              {state.step === 'meaning' && (
                <Button
                  variant="primary"
                  onClick={handleProceedToAuth}
                  disabled={!canProceedFromMeaning}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              
              {state.step === 'confirm' && (
                <Button
                  variant="primary"
                  onClick={handleSign}
                  disabled={!canSign || state.isSubmitting}
                  className="min-w-[120px]"
                >
                  {state.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <PenTool className="w-4 h-4 mr-2" />
                      Sign
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StepIndicatorProps {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function StepIndicator({ step, label, isActive, isComplete }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
        ${isActive 
          ? 'bg-accent-primary text-white' 
          : isComplete 
            ? 'bg-status-success text-white'
            : 'bg-surface-card text-text-muted border border-border'}
      `}>
        {isComplete && !isActive ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          step
        )}
      </div>
      <span className={`text-xs ${isActive ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
        {label}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Meaning Selection Step
// ----------------------------------------------------------------------------

interface MeaningSelectionStepProps {
  allowedMeanings: SignatureMeaning[];
  selectedMeaning: SignatureMeaning | null;
  onSelect: (meaning: SignatureMeaning) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  comments: string;
  onCommentsChange: (comments: string) => void;
  needsReason: boolean;
}

function MeaningSelectionStep({
  allowedMeanings,
  selectedMeaning,
  onSelect,
  reason,
  onReasonChange,
  comments,
  onCommentsChange,
  needsReason,
}: MeaningSelectionStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Signature Meaning
        </label>
        <p className="text-xs text-text-muted mb-3">
          Select the meaning/intent of your signature
        </p>
        
        <div className="space-y-2">
          {allowedMeanings.map((meaning) => {
            const info = SIGNATURE_MEANING_INFO[meaning];
            const isSelected = selectedMeaning === meaning;
            const Icon = getMeaningIcon(meaning);
            
            return (
              <button
                key={meaning}
                onClick={() => onSelect(meaning)}
                className={`
                  w-full p-3 rounded-lg border text-left transition-all
                  ${isSelected 
                    ? 'border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary' 
                    : 'border-border hover:border-accent-primary/50 hover:bg-surface-elevated'}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    p-2 rounded-lg flex-none
                    ${isSelected ? 'bg-accent-primary/10' : 'bg-surface-elevated'}
                  `}>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-accent-primary' : 'text-text-muted'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {info.label}
                      </span>
                      {info.requiresComment && (
                        <Badge color="amber" size="sm">Requires reason</Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {info.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-accent-primary flex-none" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reason field (required for rejection/revision) */}
      {needsReason && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Reason <span className="text-status-error">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Please provide a reason..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
          />
          {reason.length === 0 && (
            <p className="text-xs text-status-warning mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              A reason is required for this signature meaning
            </p>
          )}
        </div>
      )}

      {/* Optional comments */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Additional Comments <span className="text-text-muted">(optional)</span>
        </label>
        <textarea
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Authentication Step
// ----------------------------------------------------------------------------

interface AuthenticationStepProps {
  methods: AuthenticationMethod[];
  selectedMethod: AuthenticationMethod | null;
  onAuthenticate: (method: AuthenticationMethod, credentials: { password?: string; code?: string }) => void;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  isSubmitting: boolean;
}

function AuthenticationStep({
  methods,
  selectedMethod,
  onAuthenticate,
  error,
  attempts,
  maxAttempts,
  isSubmitting,
}: AuthenticationStepProps) {
  const [activeMethod, setActiveMethod] = useState<AuthenticationMethod>(methods[0]);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onAuthenticate(activeMethod, { password, code });
  }, [activeMethod, password, code, onAuthenticate]);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-status-warning/10 border border-status-warning/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-status-warning flex-none mt-0.5" />
          <div>
            <p className="text-sm font-medium text-status-warning">
              Re-authentication Required
            </p>
            <p className="text-xs text-text-muted mt-1">
              Per 21 CFR Part 11, you must verify your identity before signing.
            </p>
          </div>
        </div>
      </div>

      {/* Method tabs */}
      {methods.length > 1 && (
        <div className="flex gap-2 p-1 bg-surface-elevated rounded-lg">
          {methods.map((method) => {
            const info = AUTHENTICATION_METHOD_INFO[method];
            return (
              <button
                key={method}
                onClick={() => setActiveMethod(method)}
                className={`
                  flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeMethod === method 
                    ? 'bg-surface-base text-text-primary shadow-sm' 
                    : 'text-text-muted hover:text-text-secondary'}
                `}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Authentication form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {activeMethod === 'password' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
          </div>
        )}

        {activeMethod === 'two-factor' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 font-mono text-center tracking-widest text-lg"
            />
            <p className="text-xs text-text-muted mt-2">
              Enter the code from your authenticator app
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-lg">
            <div className="flex items-center gap-2 text-status-error">
              <XCircle className="w-4 h-4 flex-none" />
              <span className="text-sm">{error}</span>
            </div>
            {attempts < maxAttempts && (
              <p className="text-xs text-text-muted mt-2">
                {maxAttempts - attempts} attempt(s) remaining
              </p>
            )}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || (activeMethod === 'password' && !password) || (activeMethod === 'two-factor' && code.length < 6)}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Verify Identity
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Confirmation Step
// ----------------------------------------------------------------------------

interface ConfirmationStepProps {
  meaning: { label: string; legalText: string };
  signerName: string;
  signerTitle: string;
  comments: string;
  reason: string;
  needsReason: boolean;
}

function ConfirmationStep({
  meaning,
  signerName,
  signerTitle,
  comments,
  reason,
  needsReason,
}: ConfirmationStepProps) {
  const now = new Date();
  
  return (
    <div className="space-y-4">
      {/* Legal statement */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-accent-primary flex-none mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              {meaning.label} Statement
            </p>
            <p className="text-sm text-text-secondary">
              {meaning.legalText}
            </p>
          </div>
        </div>
      </div>

      {/* Signature preview */}
      <div className="p-4 bg-surface-card rounded-lg border-2 border-dashed border-border">
        <div className="text-center">
          <p className="text-lg font-medium text-text-primary">
            {signerName}
          </p>
          <p className="text-sm text-text-muted">
            {signerTitle}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-text-muted">
            <span>{now.toLocaleDateString()}</span>
            <span>•</span>
            <span>{now.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Reason (if provided) */}
      {needsReason && reason && (
        <div className="p-3 bg-surface-elevated rounded-lg">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
            Reason
          </p>
          <p className="text-sm text-text-secondary">{reason}</p>
        </div>
      )}

      {/* Comments (if provided) */}
      {comments && (
        <div className="p-3 bg-surface-elevated rounded-lg">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
            Comments
          </p>
          <p className="text-sm text-text-secondary">{comments}</p>
        </div>
      )}

      {/* Warning */}
      <div className="p-3 bg-status-info/10 border border-status-info/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-status-info flex-none mt-0.5" />
          <p className="text-xs text-text-secondary">
            By clicking "Sign", you confirm that you understand and agree to the 
            statement above. This action creates a legally binding electronic signature 
            per 21 CFR Part 11.
          </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Completion Step
// ----------------------------------------------------------------------------

interface CompletionStepProps {
  signatureId: string | null;
  signerName: string;
}

function CompletionStep({ signatureId, signerName }: CompletionStepProps) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-status-success/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-status-success" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Signature Applied
      </h3>
      <p className="text-sm text-text-muted mb-4">
        Document signed by {signerName}
      </p>
      {signatureId && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-elevated rounded-lg">
          <span className="text-xs text-text-muted">Signature ID:</span>
          <span className="text-xs font-mono text-text-primary">{signatureId}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMeaningIcon(meaning: SignatureMeaning) {
  switch (meaning) {
    case 'approval': return CheckCircle;
    case 'review': return Eye;
    case 'verification': return Shield;
    case 'authorization': return Key;
    case 'acknowledgment': return FileCheck;
    case 'responsibility': return UserCheck;
    case 'rejection': return XCircle;
    case 'revision-request': return Edit3;
    default: return CheckCircle;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { SignatureCaptureProps };
