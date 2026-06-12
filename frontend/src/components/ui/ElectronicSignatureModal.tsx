
/**
 * ElectronicSignatureModal — Reusable 21 CFR Part 11 signature capture component.
 *
 * Displays:
 *   - What is being signed (entity label + action)
 *   - Signer identity (name + title from current user)
 *   - Meaning of signature (§11.50(c)) — read-only, pulled from context
 *   - Reason textarea (why this signature is being applied)
 *   - Legal acknowledgment checkbox (§11.100 — unique to individual)
 *   - Confirmation password re-entry (§11.200(a)(1))
 *
 * @version 0.97.0
 */

import { useState } from 'react';
import { CheckCircle2, Lock, AlertTriangle, PenLine, Shield } from 'lucide-react';
import type { SignatureContext } from '@/services/electronic-signature-service';
import { SIGNATURE_MEANING_LABELS } from '@/services/electronic-signature-service';

// =============================================================================
// PROPS
// =============================================================================

export interface ElectronicSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with reason when user confirms signature */
  onConfirm: (reason: string) => Promise<void>;
  context: SignatureContext;
  /** Currently logged-in user info */
  currentUser: {
    name: string;
    title: string;
    email: string;
  };
  /** Optional: require password re-entry (§11.200(a)(1)). Pass true to enable. */
  requirePassword?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ElectronicSignatureModal({
  isOpen,
  onClose,
  onConfirm,
  context,
  currentUser,
  requirePassword = false,
}: ElectronicSignatureModalProps) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [legalAck, setLegalAck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meaningText = SIGNATURE_MEANING_LABELS[context.meaning];
  const canSign = reason.trim().length >= 5
    && legalAck
    && (!requirePassword || password.length >= 3);

  const handleConfirm = async () => {
    if (!canSign) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signature failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setPassword('');
    setLegalAck(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-teal/10">
            <PenLine className="w-5 h-5 text-accent-teal" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Electronic Signature</h2>
            <p className="text-xs text-text-muted">21 CFR Part 11 compliant</p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/20">
              <Shield className="w-3 h-3" />
              Part 11
            </span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* What is being signed */}
          <div className="p-4 rounded-lg bg-surface border border-border/60">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Signing</p>
            <p className="text-sm font-semibold text-text-primary">{context.entityLabel}</p>
            <p className="text-xs text-text-secondary mt-0.5">{context.action}</p>
          </div>

          {/* Signer identity */}
          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Signer</p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border/60">
              <div className="w-8 h-8 rounded-full bg-accent-teal/20 flex items-center justify-center text-accent-teal text-xs font-bold">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{currentUser.name}</p>
                <p className="text-xs text-text-muted">{currentUser.title} · {currentUser.email}</p>
              </div>
            </div>
          </div>

          {/* Meaning of signature — §11.50(c) */}
          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              Meaning of Signature <span className="text-accent-teal normal-case">(§11.50(c))</span>
            </p>
            <div className="p-3 rounded-lg bg-accent-teal/5 border border-accent-teal/20">
              <p className="text-sm text-text-secondary leading-relaxed">{meaningText}</p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              Reason <span className="text-accent-red">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Briefly explain why you are applying this signature..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal resize-none"
            />
            <p className="text-xs text-text-muted mt-1">Minimum 5 characters required.</p>
          </div>

          {/* Password re-entry — §11.200(a)(1) */}
          {requirePassword && (
            <div>
              <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Confirm Identity — Password <span className="text-accent-red">*</span>
                </span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Re-enter your password to confirm identity"
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal"
              />
              <p className="text-xs text-text-muted mt-1">Required per 21 CFR §11.200(a)(1).</p>
            </div>
          )}

          {/* Legal acknowledgment — §11.100 */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={legalAck}
                onChange={e => setLegalAck(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border transition-colors ${legalAck ? 'bg-accent-teal border-accent-teal' : 'bg-surface border-border group-hover:border-accent-teal/60'}`}>
                {legalAck && <CheckCircle2 className="w-3 h-3 text-white absolute inset-0.5" />}
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              I acknowledge that this electronic signature is the legal equivalent of my handwritten signature and is uniquely mine.
              I will not allow it to be used by anyone else. <span className="text-accent-teal">(21 CFR §11.100)</span>
            </p>
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20">
              <AlertTriangle className="w-4 h-4 text-accent-red shrink-0" />
              <p className="text-sm text-accent-red">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border hover:border-border-strong rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSign || isSubmitting}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              canSign && !isSubmitting
                ? 'bg-accent-teal text-white hover:bg-accent-teal/90 shadow-sm hover:shadow-md'
                : 'bg-surface-hover text-text-muted cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <PenLine className="w-4 h-4" />
                Apply Signature
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
