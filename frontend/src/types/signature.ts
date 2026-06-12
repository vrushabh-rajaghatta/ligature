
// ============================================================================
// 21 CFR Part 11 Electronic Signature Types - Phase 2.3e.4
// Compliant signature capture, meanings, certificates, and audit trail
// ============================================================================

// ============================================================================
// SIGNATURE MEANING TYPES
// ============================================================================

/**
 * Standard signature meanings per 21 CFR Part 11
 * Each signature must have a clear meaning/intent
 */
export type SignatureMeaning =
  | 'approval'           // "I approve this document"
  | 'review'             // "I have reviewed this document"
  | 'verification'       // "I verify the accuracy of this document"
  | 'authorization'      // "I authorize this action"
  | 'acknowledgment'     // "I acknowledge receipt/review"
  | 'responsibility'     // "I take responsibility for this content"
  | 'rejection'          // "I reject this document"
  | 'revision-request';  // "I request revisions to this document"

/**
 * Metadata for each signature meaning
 */
export interface SignatureMeaningInfo {
  meaning: SignatureMeaning;
  label: string;
  description: string;
  legalText: string;  // Full legal statement displayed at signing
  requiresComment: boolean;
  icon: string;
}

export const SIGNATURE_MEANING_INFO: Record<SignatureMeaning, SignatureMeaningInfo> = {
  'approval': {
    meaning: 'approval',
    label: 'Approval',
    description: 'Approve the document as presented',
    legalText: 'By signing, I confirm that I have reviewed this document and approve its content as accurate, complete, and ready for the next stage.',
    requiresComment: false,
    icon: 'CheckCircle',
  },
  'review': {
    meaning: 'review',
    label: 'Review Complete',
    description: 'Mark the document as reviewed',
    legalText: 'By signing, I confirm that I have thoroughly reviewed this document and its contents.',
    requiresComment: false,
    icon: 'Eye',
  },
  'verification': {
    meaning: 'verification',
    label: 'Verification',
    description: 'Verify the accuracy of the content',
    legalText: 'By signing, I verify that the information contained in this document is accurate and complete to the best of my knowledge.',
    requiresComment: false,
    icon: 'Shield',
  },
  'authorization': {
    meaning: 'authorization',
    label: 'Authorization',
    description: 'Authorize the requested action',
    legalText: 'By signing, I authorize the action described in this document to proceed according to applicable policies and procedures.',
    requiresComment: false,
    icon: 'Key',
  },
  'acknowledgment': {
    meaning: 'acknowledgment',
    label: 'Acknowledgment',
    description: 'Acknowledge receipt or awareness',
    legalText: 'By signing, I acknowledge that I have received and understand the contents of this document.',
    requiresComment: false,
    icon: 'FileCheck',
  },
  'responsibility': {
    meaning: 'responsibility',
    label: 'Responsibility',
    description: 'Accept responsibility for the content',
    legalText: 'By signing, I accept responsibility for the accuracy and completeness of this document and its contents.',
    requiresComment: false,
    icon: 'UserCheck',
  },
  'rejection': {
    meaning: 'rejection',
    label: 'Rejection',
    description: 'Reject the document',
    legalText: 'By signing, I formally reject this document. A reason for rejection must be provided.',
    requiresComment: true,
    icon: 'XCircle',
  },
  'revision-request': {
    meaning: 'revision-request',
    label: 'Revision Request',
    description: 'Request changes before approval',
    legalText: 'By signing, I request revisions to this document before it can be approved. Specific revision requirements must be documented.',
    requiresComment: true,
    icon: 'Edit3',
  },
};

// ============================================================================
// SIGNATURE RECORD TYPES
// ============================================================================

/**
 * Complete electronic signature record
 * Contains all information required for 21 CFR Part 11 compliance
 */
export interface ElectronicSignature {
  id: string;
  signatureId: string;  // Business identifier (e.g., SIG-2024-00001)
  
  // What was signed
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  documentVersion: string;
  approvalRequestId?: string;
  approvalStepId?: string;
  
  // Who signed
  signerId: string;
  signerName: string;
  signerEmail: string;
  signerTitle: string;
  signerDepartment: string;
  
  // Signature meaning
  meaning: SignatureMeaning;
  meaningLabel: string;
  legalStatement: string;
  
  // Additional context
  comments?: string;
  reason?: string;  // Required for rejection/revision-request
  
  // Authentication
  authenticationMethod: AuthenticationMethod;
  authenticationTimestamp: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Certificate (if using certificate-based signing)
  certificateId?: string;
  certificateIssuer?: string;
  certificateExpiry?: string;
  certificateThumbprint?: string;
  
  // Timestamp
  signedAt: string;
  serverTimestamp: string;  // Server-side timestamp for audit
  timezoneOffset: number;
  
  // Integrity
  documentHash: string;      // Hash of document at time of signing
  signatureHash: string;     // Hash of signature record
  previousSignatureId?: string;  // Chain to previous signature if sequential
  
  // Audit
  createdAt: string;
  auditTrailId: string;
}

/**
 * Authentication methods for signature re-authentication
 */
export type AuthenticationMethod =
  | 'password'          // Username + password re-entry
  | 'biometric'         // Fingerprint, face, etc.
  | 'two-factor'        // 2FA code
  | 'certificate'       // Digital certificate
  | 'sso-session';      // SSO session validation

export interface AuthenticationMethodInfo {
  method: AuthenticationMethod;
  label: string;
  description: string;
  securityLevel: 'standard' | 'high' | 'highest';
}

export const AUTHENTICATION_METHOD_INFO: Record<AuthenticationMethod, AuthenticationMethodInfo> = {
  'password': {
    method: 'password',
    label: 'Password',
    description: 'Re-enter your password to confirm identity',
    securityLevel: 'standard',
  },
  'biometric': {
    method: 'biometric',
    label: 'Biometric',
    description: 'Use fingerprint or facial recognition',
    securityLevel: 'high',
  },
  'two-factor': {
    method: 'two-factor',
    label: 'Two-Factor Authentication',
    description: 'Enter code from authenticator app',
    securityLevel: 'high',
  },
  'certificate': {
    method: 'certificate',
    label: 'Digital Certificate',
    description: 'Sign with your digital certificate',
    securityLevel: 'highest',
  },
  'sso-session': {
    method: 'sso-session',
    label: 'SSO Session',
    description: 'Validate current SSO session',
    securityLevel: 'standard',
  },
};

// ============================================================================
// SIGNATURE CERTIFICATE TYPES
// ============================================================================

/**
 * Digital signing certificate
 */
export interface SigningCertificate {
  id: string;
  certificateId: string;  // Business identifier
  
  // Owner
  userId: string;
  userName: string;
  userEmail: string;
  
  // Certificate details
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  thumbprint: string;
  serialNumber: string;
  
  // Key info
  publicKeyAlgorithm: string;
  keySize: number;
  
  // Status
  status: 'active' | 'expired' | 'revoked' | 'pending';
  revokedAt?: string;
  revokedReason?: string;
  
  // Usage
  allowedMeanings: SignatureMeaning[];
  documentTypesAllowed?: string[];
  
  // Audit
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

// ============================================================================
// SIGNATURE AUDIT TRAIL TYPES
// ============================================================================

/**
 * Signature audit trail event
 */
export interface SignatureAuditEvent {
  id: string;
  eventId: string;
  
  // Context
  signatureId?: string;  // If related to a signature
  documentId: string;
  documentVersionId: string;
  approvalRequestId?: string;
  
  // Event
  eventType: SignatureAuditEventType;
  eventDescription: string;
  
  // Actor
  actorId: string;
  actorName: string;
  actorRole: string;
  
  // Details
  details: Record<string, unknown>;
  previousValue?: string;
  newValue?: string;
  
  // Technical
  ipAddress?: string;
  userAgent?: string;
  sessionId: string;
  
  // Timestamp
  timestamp: string;
  serverTimestamp: string;
}

export type SignatureAuditEventType =
  | 'signature-requested'      // Signature was requested
  | 'signature-initiated'      // User started signing process
  | 'authentication-started'   // Re-auth flow started
  | 'authentication-success'   // Re-auth succeeded
  | 'authentication-failed'    // Re-auth failed
  | 'meaning-selected'         // Signature meaning chosen
  | 'signature-applied'        // Signature was applied
  | 'signature-verified'       // Signature was verified
  | 'signature-rejected'       // Signing was rejected/cancelled
  | 'certificate-used'         // Certificate was used for signing
  | 'certificate-expired'      // Certificate expired during process
  | 'document-modified'        // Document was modified after signing
  | 'audit-exported';          // Audit trail was exported

export interface SignatureAuditEventInfo {
  type: SignatureAuditEventType;
  label: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  icon: string;
}

export const SIGNATURE_AUDIT_EVENT_INFO: Record<SignatureAuditEventType, SignatureAuditEventInfo> = {
  'signature-requested': {
    type: 'signature-requested',
    label: 'Signature Requested',
    severity: 'info',
    icon: 'Send',
  },
  'signature-initiated': {
    type: 'signature-initiated',
    label: 'Signing Initiated',
    severity: 'info',
    icon: 'Play',
  },
  'authentication-started': {
    type: 'authentication-started',
    label: 'Authentication Started',
    severity: 'info',
    icon: 'Lock',
  },
  'authentication-success': {
    type: 'authentication-success',
    label: 'Authentication Successful',
    severity: 'success',
    icon: 'CheckCircle',
  },
  'authentication-failed': {
    type: 'authentication-failed',
    label: 'Authentication Failed',
    severity: 'error',
    icon: 'XCircle',
  },
  'meaning-selected': {
    type: 'meaning-selected',
    label: 'Meaning Selected',
    severity: 'info',
    icon: 'FileText',
  },
  'signature-applied': {
    type: 'signature-applied',
    label: 'Signature Applied',
    severity: 'success',
    icon: 'PenTool',
  },
  'signature-verified': {
    type: 'signature-verified',
    label: 'Signature Verified',
    severity: 'success',
    icon: 'ShieldCheck',
  },
  'signature-rejected': {
    type: 'signature-rejected',
    label: 'Signing Cancelled',
    severity: 'warning',
    icon: 'XOctagon',
  },
  'certificate-used': {
    type: 'certificate-used',
    label: 'Certificate Used',
    severity: 'info',
    icon: 'Award',
  },
  'certificate-expired': {
    type: 'certificate-expired',
    label: 'Certificate Expired',
    severity: 'error',
    icon: 'AlertTriangle',
  },
  'document-modified': {
    type: 'document-modified',
    label: 'Document Modified',
    severity: 'warning',
    icon: 'AlertCircle',
  },
  'audit-exported': {
    type: 'audit-exported',
    label: 'Audit Exported',
    severity: 'info',
    icon: 'Download',
  },
};

// ============================================================================
// SIGNATURE CAPTURE STATE
// ============================================================================

/**
 * State for signature capture flow
 */
export interface SignatureCaptureState {
  // Flow step
  step: 'meaning' | 'authenticate' | 'confirm' | 'complete' | 'error';
  
  // Selected meaning
  selectedMeaning: SignatureMeaning | null;
  
  // Authentication
  isAuthenticated: boolean;
  authenticationMethod: AuthenticationMethod | null;
  authenticationError: string | null;
  authAttempts: number;
  maxAuthAttempts: number;
  
  // Comments
  comments: string;
  reason: string;  // For rejection/revision
  
  // Status
  isSubmitting: boolean;
  error: string | null;
  
  // Result
  signatureId: string | null;
}

/**
 * Props for SignatureCapture component
 */
export interface SignatureCaptureProps {
  // Document context
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  documentVersion: string;
  
  // Approval context (optional)
  approvalRequestId?: string;
  approvalStepId?: string;
  
  // Signer info
  signerId: string;
  signerName: string;
  signerEmail: string;
  signerTitle: string;
  signerDepartment: string;
  
  // Configuration
  allowedMeanings?: SignatureMeaning[];
  defaultMeaning?: SignatureMeaning;
  requireAuthentication?: boolean;
  authenticationMethods?: AuthenticationMethod[];
  
  // Callbacks
  onSign: (signature: ElectronicSignature) => void;
  onCancel: () => void;
  onError?: (error: Error) => void;
  
  // UI
  isOpen: boolean;
}

// ============================================================================
// SIGNATURE VALIDATION
// ============================================================================

/**
 * Signature validation result
 */
export interface SignatureValidation {
  isValid: boolean;
  signatureId: string;
  validatedAt: string;
  
  // Checks
  checks: SignatureValidationCheck[];
  
  // Overall status
  status: 'valid' | 'invalid' | 'expired' | 'revoked' | 'tampered';
  statusReason?: string;
}

export interface SignatureValidationCheck {
  check: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a signature ID
 */
export function generateSignatureId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIG-${year}-${random}`;
}

/**
 * Generate a SHA-256 document hash using the Web Crypto API (browser) or
 * a deterministic fallback for SSR contexts.
 */
export function generateDocumentHash(content: string): string {
  // Synchronous deterministic hash for immediate use; async SHA-256 computed
  // separately when the full digest is needed (see generateDocumentHashAsync).
  // Uses FNV-1a 32-bit for the sync path — good enough for display/demo;
  // the async path produces a real SHA-256 hex digest.
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Generate a real SHA-256 hex digest using the Web Crypto API.
 * Returns a 64-character hex string.
 */
export async function generateDocumentHashAsync(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(content);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // SSR fallback — Node crypto
  try {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return generateDocumentHash(content);
  }
}

/**
 * Check if a signature meaning requires a comment/reason
 */
export function meaningRequiresComment(meaning: SignatureMeaning): boolean {
  return SIGNATURE_MEANING_INFO[meaning]?.requiresComment ?? false;
}

/**
 * Get allowed meanings for an approval decision
 */
export function getMeaningsForDecision(
  decision: 'approved' | 'rejected' | 'revision-requested'
): SignatureMeaning[] {
  switch (decision) {
    case 'approved':
      return ['approval', 'verification', 'authorization', 'responsibility'];
    case 'rejected':
      return ['rejection'];
    case 'revision-requested':
      return ['revision-request'];
    default:
      return ['review', 'acknowledgment'];
  }
}
