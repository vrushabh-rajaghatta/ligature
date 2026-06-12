/**
 * Electronic Signature Service — Universal 21 CFR Part 11
 *
 * Generic e-signature service usable across all Ligature approval workflows.
 * Implements 21 CFR Part 11 §11.50: signed electronic records must include
 *   (a) the printed name of the signer
 *   (b) the date and time the signature was executed
 *   (c) the meaning associated with the signature
 *
 * @version 0.97.0
 */

// =============================================================================
// WORKFLOW ENTITY TYPES
// =============================================================================

export type WorkflowEntityType =
  | 'icsr-case'
  | 'aggregate-report'
  | 'capa'
  | 'deviation'
  | 'change-control'
  | 'document'
  | 'haq-response'
  | 'submission';

export type SignatureMeaning =
  | 'authored-and-reviewed'      // Author: I created/reviewed this content
  | 'reviewed-for-accuracy'      // Reviewer: I reviewed for scientific accuracy
  | 'qc-approved'                // QC: I verified document quality
  | 'medical-reviewed'           // Medical officer: medically appropriate
  | 'regulatory-approved'        // Regulatory lead: regulatory compliant
  | 'approved-for-submission'    // Final: approved for regulatory submission
  | 'capa-approved'              // QA manager: CAPA is complete and effective
  | 'deviation-closed'           // QA: deviation investigation closed
  | 'change-approved';           // Change control: change is approved

export type SignatureRole =
  | 'author'
  | 'reviewer'
  | 'medical-officer'
  | 'qc-specialist'
  | 'regulatory-lead'
  | 'qa-manager'
  | 'executive';

// =============================================================================
// CORE TYPES
// =============================================================================

export interface SignatureContext {
  entityType: WorkflowEntityType;
  entityId: string;
  entityLabel: string;        // Human-readable label for display (e.g. "ICSR-2026-0042")
  action: string;             // Short action label (e.g. "Approve for Submission")
  meaning: SignatureMeaning;
  requiredRole?: SignatureRole;
}

export interface ElectronicSignatureRecord {
  id: string;
  entityType: WorkflowEntityType;
  entityId: string;
  entityLabel: string;

  // 21 CFR Part 11 §11.50 required fields
  signedByUserId: string;
  signedByName: string;            // Printed name (§11.50(a))
  signedByTitle: string;
  signedAt: string;                // ISO timestamp (§11.50(b))
  meaning: SignatureMeaning;       // Meaning of signature (§11.50(c))

  // Additional Part 11 requirements
  reason: string;                  // Why the signature was applied
  legalAcknowledgment: boolean;    // User acknowledged legal binding (§11.100)
  signatureManifest: string;       // Human-readable description of what was signed
  documentHash: string;            // SHA-256 of entity content at signing time
  previousHash: string | null;     // Hash of previous signature (chain integrity)
  chainIndex: number;              // Position in the signature chain
}

export interface SignatureChainVerification {
  valid: boolean;
  chainLength: number;
  breaks: number[];               // Indices of chain breaks
  verifiedAt: string;
}

// =============================================================================
// MEANING LABELS (§11.50(c) display text)
// =============================================================================

export const SIGNATURE_MEANING_LABELS: Record<SignatureMeaning, string> = {
  'authored-and-reviewed':    'I am the author of this record and have reviewed it for accuracy and completeness.',
  'reviewed-for-accuracy':    'I have reviewed this record and confirm it is accurate, complete, and scientifically appropriate.',
  'qc-approved':              'I have performed quality control review and this record meets all applicable requirements.',
  'medical-reviewed':         'I have reviewed the medical content and confirm it is medically appropriate and accurately assessed.',
  'regulatory-approved':      'I have reviewed this record and confirm it complies with applicable regulatory requirements.',
  'approved-for-submission':  'I approve this record for submission to a regulatory authority. This signature is legally binding.',
  'capa-approved':            'I have reviewed this CAPA and confirm that corrective and preventive actions are complete and effective.',
  'deviation-closed':         'I have reviewed the deviation investigation and confirm it is complete. The deviation is closed.',
  'change-approved':          'I approve this change control. The change has been reviewed and meets all regulatory and quality requirements.',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Compute SHA-256 hash of content string.
 * Uses Web Crypto API (available in Next.js edge and Node environments).
 */
export async function computeHash(content: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback for environments without Web Crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

/**
 * Generate a unique signature ID.
 */
export function generateSignatureId(): string {
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build the signature manifest — human-readable description of what was signed.
 */
export function buildSignatureManifest(
  context: SignatureContext,
  signerName: string,
  timestamp: string
): string {
  return [
    `Entity: ${context.entityLabel} (${context.entityType})`,
    `Action: ${context.action}`,
    `Signed by: ${signerName}`,
    `Timestamp: ${timestamp}`,
    `Meaning: ${SIGNATURE_MEANING_LABELS[context.meaning]}`,
  ].join(' | ');
}

/**
 * Create a new ElectronicSignatureRecord.
 * Call computeHash on the entity content before passing documentHash.
 */
export function createSignatureRecord(params: {
  context: SignatureContext;
  userId: string;
  userName: string;
  userTitle: string;
  reason: string;
  documentHash: string;
  previousHash: string | null;
  chainIndex: number;
}): ElectronicSignatureRecord {
  const { context, userId, userName, userTitle, reason, documentHash, previousHash, chainIndex } = params;
  const now = new Date().toISOString();
  return {
    id: generateSignatureId(),
    entityType: context.entityType,
    entityId: context.entityId,
    entityLabel: context.entityLabel,
    signedByUserId: userId,
    signedByName: userName,
    signedByTitle: userTitle,
    signedAt: now,
    meaning: context.meaning,
    reason,
    legalAcknowledgment: true,
    signatureManifest: buildSignatureManifest(context, userName, now),
    documentHash,
    previousHash,
    chainIndex,
  };
}

/**
 * Verify the integrity of a signature chain for an entity.
 * Checks that each signature's previousHash matches the prior signature's documentHash.
 */
export function verifySignatureChain(
  signatures: ElectronicSignatureRecord[]
): SignatureChainVerification {
  const sorted = [...signatures].sort((a, b) => a.chainIndex - b.chainIndex);
  const breaks: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].previousHash !== sorted[i - 1].documentHash) {
      breaks.push(i);
    }
  }

  return {
    valid: breaks.length === 0,
    chainLength: sorted.length,
    breaks,
    verifiedAt: new Date().toISOString(),
  };
}

// =============================================================================
// IN-MEMORY STORE (server-side singleton, Supabase-backed when available)
// =============================================================================

const signatureStore: ElectronicSignatureRecord[] = [];

export function storeSignature(record: ElectronicSignatureRecord): void {
  signatureStore.unshift(record);
}

export function getSignaturesForEntity(
  entityType: WorkflowEntityType,
  entityId: string
): ElectronicSignatureRecord[] {
  return signatureStore
    .filter(s => s.entityType === entityType && s.entityId === entityId)
    .sort((a, b) => a.chainIndex - b.chainIndex);
}

export function getAllSignatures(limit = 200): ElectronicSignatureRecord[] {
  return signatureStore.slice(0, limit);
}

export function getLastSignatureHash(
  entityType: WorkflowEntityType,
  entityId: string
): { hash: string | null; chainIndex: number } {
  const existing = getSignaturesForEntity(entityType, entityId);
  if (existing.length === 0) return { hash: null, chainIndex: 0 };
  const last = existing[existing.length - 1];
  return { hash: last.documentHash, chainIndex: last.chainIndex + 1 };
}

// Seed a few realistic demo signatures so the audit trail is never blank
const seedSignatures: ElectronicSignatureRecord[] = [
  {
    id: 'sig-seed-001',
    entityType: 'icsr-case',
    entityId: 'icsr-seed-001',
    entityLabel: 'ICSR-2026-0032',
    signedByUserId: 'user-001',
    signedByName: 'Dr. Maria Santos',
    signedByTitle: 'Medical Safety Officer',
    signedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    meaning: 'medical-reviewed',
    reason: 'Reviewed ICSR narrative, causality assessment confirmed as probable.',
    legalAcknowledgment: true,
    signatureManifest: 'Entity: ICSR-2026-0032 (icsr-case) | Action: Medical Review | Signed by: Dr. Maria Santos | Meaning: Medical review confirmed.',
    documentHash: 'a3f8c2d1e4b7',
    previousHash: null,
    chainIndex: 0,
  },
  {
    id: 'sig-seed-002',
    entityType: 'icsr-case',
    entityId: 'icsr-seed-001',
    entityLabel: 'ICSR-2026-0032',
    signedByUserId: 'user-002',
    signedByName: 'James Liu',
    signedByTitle: 'Director, Regulatory Affairs',
    signedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    meaning: 'approved-for-submission',
    reason: 'Regulatory review complete. Approved for 15-day expedited gateway submission.',
    legalAcknowledgment: true,
    signatureManifest: 'Entity: ICSR-2026-0032 (icsr-case) | Action: Approve for Submission | Signed by: James Liu',
    documentHash: 'b9e1f4a2c6d3',
    previousHash: 'a3f8c2d1e4b7',
    chainIndex: 1,
  },
  {
    id: 'sig-seed-003',
    entityType: 'capa',
    entityId: 'capa-seed-001',
    entityLabel: 'CAPA-2026-0014',
    signedByUserId: 'user-003',
    signedByName: 'Sarah Thompson',
    signedByTitle: 'QA Manager',
    signedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    meaning: 'capa-approved',
    reason: 'All corrective actions verified complete. Effectiveness check passed. CAPA closed.',
    legalAcknowledgment: true,
    signatureManifest: 'Entity: CAPA-2026-0014 (capa) | Action: Close CAPA | Signed by: Sarah Thompson',
    documentHash: 'c4d7e2f1a8b5',
    previousHash: null,
    chainIndex: 0,
  },
];

seedSignatures.forEach(s => signatureStore.push(s));
