
import { logger } from '@/lib/logger';
/**
 * Electronic Signature Service
 * 21 CFR Part 11 compliant electronic signatures
 * Version: 0.13.10
 * 
 * NOTE: Uses in-memory storage until Phase 1.4 (Audit Trail Enhancement)
 * connects this to the database with proper ElectronicSignature model.
 */

import { generateSignatureHash, verifySignatureHash, type SignatureManifest } from './AuthService';
import { MOCK_USERS } from '@/config/auth-config';

// =============================================================================
// TYPES
// =============================================================================

export interface SignatureRequest {
  documentId: string;
  userId: string;
  meaning: SignatureMeaning;
  reason?: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export type SignatureMeaning = 
  | 'Authored'
  | 'Reviewed'
  | 'Approved'
  | 'Witnessed'
  | 'Verified'
  | 'Certified'
  | 'Released';

export interface SignatureRecord {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  meaning: SignatureMeaning;
  reason?: string;
  signedAt: Date;
  ipAddress?: string;
  isValid: boolean;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  signature?: SignatureRecord;
  error?: string;
}

export interface DocumentSignatureStatus {
  documentId: string;
  totalSignatures: number;
  validSignatures: number;
  invalidSignatures: number;
  signatures: SignatureRecord[];
  isFullySigned: boolean;
  requiredMeanings: SignatureMeaning[];
  missingMeanings: SignatureMeaning[];
}

// =============================================================================
// IN-MEMORY STORAGE (Replace with DB in Phase 1.4)
// =============================================================================

interface StoredSignature {
  id: string;
  documentId: string;
  userId: string;
  meaning: string;
  reason?: string;
  signatureHash: string;
  ipAddress?: string;
  userAgent?: string;
  signedAt: Date;
  isValid: boolean;
  invalidatedAt?: Date;
  invalidatedBy?: string;
  invalidationReason?: string;
}

interface SignatureAuditEntry {
  eventId: string;
  eventType: 'SIGNATURE_APPLIED' | 'SIGNATURE_INVALIDATED';
  signatureId: string;
  documentId: string;
  userId: string;
  userName: string;
  meaning: string;
  reason?: string;
  timestamp: string;
  signatureHash: string;
}

const signatureStore = new Map<string, StoredSignature>();
// In-process 21 CFR Part 11 audit log — persisted to DB at Phase 1.4
const signatureAuditLog: SignatureAuditEntry[] = [];

export function getSignatureAuditLog(): SignatureAuditEntry[] {
  return [...signatureAuditLog];
}

// =============================================================================
// SIGNATURE WORKFLOWS
// =============================================================================

/**
 * Standard signature workflows for different document types
 */
export const SIGNATURE_WORKFLOWS: Record<string, SignatureMeaning[]> = {
  // Regulatory documents
  PROTOCOL: ['Authored', 'Reviewed', 'Approved'],
  IB: ['Authored', 'Reviewed', 'Approved'],
  CSR: ['Authored', 'Reviewed', 'Approved', 'Released'],
  SAP: ['Authored', 'Reviewed', 'Approved'],
  ICF: ['Authored', 'Reviewed', 'Approved', 'Released'],
  
  // Submission documents
  IND_MODULE: ['Authored', 'Reviewed', 'Approved'],
  NDA_MODULE: ['Authored', 'Reviewed', 'Approved', 'Released'],
  BLA_MODULE: ['Authored', 'Reviewed', 'Approved', 'Released'],
  
  // Quality documents
  SOP: ['Authored', 'Reviewed', 'Approved'],
  FORM: ['Authored', 'Approved'],
  DEVIATION: ['Authored', 'Reviewed', 'Approved'],
  CAPA: ['Authored', 'Reviewed', 'Approved', 'Verified'],
  
  // Default
  DEFAULT: ['Authored', 'Approved'],
};

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Apply an electronic signature to a document
 */
export async function applySignature(request: SignatureRequest): Promise<SignatureRecord> {
  // Verify user exists (mock implementation)
  const user = MOCK_USERS.find(u => u.id === request.userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('User account is not active');
  }

  // Create signature manifest
  const manifest: SignatureManifest = {
    documentId: request.documentId,
    userId: request.userId,
    meaning: request.meaning,
    timestamp: new Date(),
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  };

  // Generate signature hash
  const signatureHash = generateSignatureHash(manifest, request.password);

  // Create signature ID
  const signatureId = `sig-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const signedAt = new Date();

  // Store signature in memory
  const storedSignature: StoredSignature = {
    id: signatureId,
    userId: request.userId,
    documentId: request.documentId,
    meaning: request.meaning,
    reason: request.reason,
    signatureHash,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    signedAt,
    isValid: true,
  };
  
  signatureStore.set(signatureId, storedSignature);

  // 21 CFR Part 11 audit entry — written to in-process log; flushed to DB at Phase 1.4
  signatureAuditLog.push({
    eventId: `SIGAUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType: 'SIGNATURE_APPLIED',
    signatureId,
    documentId: request.documentId,
    userId: request.userId,
    userName: user.name,
    meaning: request.meaning,
    reason: request.reason,
    timestamp: signedAt,
    signatureHash,
  });
  logger.debug('E-Signature', ` Signature applied: ${signatureId} by ${user.name} (${request.meaning})`);

  return {
    id: signatureId,
    documentId: request.documentId,
    userId: request.userId,
    userName: user.name,
    meaning: request.meaning,
    reason: request.reason,
    signedAt,
    ipAddress: request.ipAddress,
    isValid: true,
  };
}

/**
 * Verify a signature
 */
export async function verifySignature(
  signatureId: string, 
  password: string
): Promise<SignatureVerificationResult> {
  const signature = signatureStore.get(signatureId);

  if (!signature) {
    return { isValid: false, error: 'Signature not found' };
  }

  if (!signature.isValid) {
    return { isValid: false, error: 'Signature has been invalidated' };
  }

  // Get user name
  const user = MOCK_USERS.find(u => u.id === signature.userId);

  // Recreate manifest and verify hash
  const manifest: SignatureManifest = {
    documentId: signature.documentId,
    userId: signature.userId,
    meaning: signature.meaning,
    timestamp: signature.signedAt,
    ipAddress: signature.ipAddress,
    userAgent: signature.userAgent,
  };

  const isValid = verifySignatureHash(manifest, password, signature.signatureHash);

  return {
    isValid,
    signature: isValid ? {
      id: signature.id,
      documentId: signature.documentId,
      userId: signature.userId,
      userName: user?.name || 'Unknown',
      meaning: signature.meaning as SignatureMeaning,
      reason: signature.reason,
      signedAt: signature.signedAt,
      ipAddress: signature.ipAddress,
      isValid: true,
    } : undefined,
    error: isValid ? undefined : 'Signature verification failed',
  };
}

/**
 * Invalidate a signature (e.g., for fraud detection)
 */
export async function invalidateSignature(
  signatureId: string,
  invalidatedBy: string,
  reason: string
): Promise<void> {
  const signature = signatureStore.get(signatureId);
  
  if (!signature) {
    throw new Error('Signature not found');
  }

  signature.isValid = false;
  signature.invalidatedAt = new Date();
  signature.invalidatedBy = invalidatedBy;
  signature.invalidationReason = reason;

  signatureStore.set(signatureId, signature);

  // 21 CFR Part 11 audit entry — invalidation recorded in-process; flushed to DB at Phase 1.4
  signatureAuditLog.push({
    eventId: `SIGAUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType: 'SIGNATURE_INVALIDATED',
    signatureId,
    documentId: signature.documentId,
    userId: invalidatedBy,
    userName: invalidatedBy,
    meaning: signature.meaning,
    reason,
    timestamp: new Date().toISOString(),
    signatureHash: signature.signatureHash,
  });
  logger.debug('E-Signature', ` Signature invalidated: ${signatureId} by ${invalidatedBy} - ${reason}`);
}

/**
 * Get all signatures for a document
 */
export async function getDocumentSignatures(documentId: string): Promise<SignatureRecord[]> {
  const signatures: SignatureRecord[] = [];

  signatureStore.forEach((sig) => {
    if (sig.documentId === documentId) {
      const user = MOCK_USERS.find(u => u.id === sig.userId);
      signatures.push({
        id: sig.id,
        documentId: sig.documentId,
        userId: sig.userId,
        userName: user?.name || 'Unknown',
        meaning: sig.meaning as SignatureMeaning,
        reason: sig.reason,
        signedAt: sig.signedAt,
        ipAddress: sig.ipAddress,
        isValid: sig.isValid,
      });
    }
  });

  return signatures.sort((a, b) => a.signedAt.getTime() - b.signedAt.getTime());
}

/**
 * Get signature status for a document
 */
export async function getDocumentSignatureStatus(
  documentId: string,
  documentType?: string
): Promise<DocumentSignatureStatus> {
  const signatures = await getDocumentSignatures(documentId);
  
  // Get required meanings from workflow
  const workflow = documentType && SIGNATURE_WORKFLOWS[documentType] 
    ? SIGNATURE_WORKFLOWS[documentType] 
    : SIGNATURE_WORKFLOWS.DEFAULT;

  const validSignatures = signatures.filter(s => s.isValid);
  const signedMeanings = new Set(validSignatures.map(s => s.meaning));
  const missingMeanings = workflow.filter(m => !signedMeanings.has(m));

  return {
    documentId,
    totalSignatures: signatures.length,
    validSignatures: validSignatures.length,
    invalidSignatures: signatures.length - validSignatures.length,
    signatures,
    isFullySigned: missingMeanings.length === 0,
    requiredMeanings: workflow,
    missingMeanings,
  };
}

/**
 * Check if user can sign with a specific meaning
 */
export async function canUserSign(
  userId: string,
  documentId: string,
  meaning: SignatureMeaning
): Promise<{ canSign: boolean; reason?: string }> {
  const user = MOCK_USERS.find(u => u.id === userId);

  if (!user) {
    return { canSign: false, reason: 'User not found' };
  }

  if (!user.isActive) {
    return { canSign: false, reason: 'User account is not active' };
  }

  // Check if user already signed with this meaning
  let hasExistingSignature = false;
  signatureStore.forEach((sig) => {
    if (sig.documentId === documentId && sig.userId === userId && 
        sig.meaning === meaning && sig.isValid) {
      hasExistingSignature = true;
    }
  });

  if (hasExistingSignature) {
    return { canSign: false, reason: 'User has already signed with this meaning' };
  }

  // Role-based signing restrictions
  const roleCanSign: Record<string, SignatureMeaning[]> = {
    ADMIN: ['Authored', 'Reviewed', 'Approved', 'Witnessed', 'Verified', 'Certified', 'Released'],
    REGULATORY_AFFAIRS: ['Authored', 'Reviewed', 'Approved', 'Verified', 'Released'],
    CLINICAL: ['Authored', 'Reviewed', 'Approved', 'Witnessed'],
    QA: ['Reviewed', 'Approved', 'Verified', 'Certified'],
    MEDICAL_WRITER: ['Authored', 'Reviewed'],
    SAFETY: ['Authored', 'Reviewed', 'Approved'],
    CMC: ['Authored', 'Reviewed', 'Approved'],
    USER: ['Authored'],
  };

  const allowedMeanings = roleCanSign[user.role] || [];
  if (!allowedMeanings.includes(meaning)) {
    return { canSign: false, reason: `User role ${user.role} cannot sign as ${meaning}` };
  }

  return { canSign: true };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const ElectronicSignatureService = {
  applySignature,
  verifySignature,
  invalidateSignature,
  getDocumentSignatures,
  getDocumentSignatureStatus,
  canUserSign,
  SIGNATURE_WORKFLOWS,
};
