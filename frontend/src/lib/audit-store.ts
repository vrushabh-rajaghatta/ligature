
// =============================================================================
// SERVER-SIDE AUDIT LOG STORE — v0.98.0
// =============================================================================
// SHA-256 hash chain: every entry links to its predecessor via chainHash.
// chainHash = SHA-256( prevHash + canonicalized entry payload )
// This makes the log tamper-evident: any edit breaks all subsequent hashes.
// =============================================================================

import crypto from 'crypto';

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO string
  user: string;
  email: string;
  action: string;
  module: string;
  details: string;
  type: 'login' | 'invite' | 'accept' | 'permission' | 'system' | 'document';
  // Chain integrity fields (Part 11 §11.10(e))
  prevHash: string;    // chainHash of the previous entry (GENESIS_HASH for first)
  chainHash: string;   // SHA-256( prevHash + canonical payload )
  chainIndex: number;  // 0-based position in insertion order
}

export interface ChainVerifyResult {
  valid: boolean;
  totalEntries: number;
  verifiedAt: string;
  breakAt?: string; // id of the first entry that fails verification
  breakIndex?: number;
}

// The genesis constant — prepended to the very first entry's hash input
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const MAX_ENTRIES = 500;

// ---------------------------------------------------------------------------
// Chain state — tracks the hash of the most recently INSERTED entry
// ---------------------------------------------------------------------------
let headHash = GENESIS_HASH;
let chainCounter = 0;

// ---------------------------------------------------------------------------
// Deterministic hash over the invariant fields of an entry
// ---------------------------------------------------------------------------
function computeChainHash(prevHash: string, entry: {
  id: string;
  timestamp: string;
  user: string;
  email: string;
  action: string;
  module: string;
  details: string;
  type: string;
}): string {
  const canonical = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    user: entry.user,
    email: entry.email,
    action: entry.action,
    module: entry.module,
    details: entry.details,
    type: entry.type,
  });
  return crypto.createHash('sha256').update(prevHash + canonical).digest('hex');
}

// ---------------------------------------------------------------------------
// Seed helpers — build chain-linked seed entries oldest→newest
// ---------------------------------------------------------------------------
function buildSeedEntry(
  base: Omit<AuditEntry, 'prevHash' | 'chainHash' | 'chainIndex'>,
  prevHashIn: string,
  index: number,
): AuditEntry {
  const chainHash = computeChainHash(prevHashIn, base);
  return { ...base, prevHash: prevHashIn, chainHash, chainIndex: index };
}

// Pre-seed with realistic demo entries — inserted oldest-first so chain is valid
const seed1Base = {
  id: 'seed-1',
  timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  user: 'Marcus Webb',
  email: 'm.webb@ligaturerd.io',
  action: 'User Login',
  module: 'Auth',
  details: 'Authenticated via SSO — session opened',
  type: 'login' as const,
};
const seed2Base = {
  id: 'seed-2',
  timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  user: 'Sarah Chen',
  email: 'sarah.chen@ligaturerd.io',
  action: 'Document Approved',
  module: 'Submissions',
  details: 'Approved CSR for LIG-2847 — three-stage review complete',
  type: 'document' as const,
};
const seed3Base = {
  id: 'seed-3',
  timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  user: 'James Liu',
  email: 'j.liu@ligaturerd.io',
  action: 'Status Changed',
  module: 'Safety',
  details: 'ICSR-2025-0088 status → Submitted (transmitted to EMA gateway)',
  type: 'document' as const,
};
const seed4Base = {
  id: 'seed-4',
  timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  user: 'Priya Anand',
  email: 'p.anand@ligaturerd.io',
  action: 'CAPA Created',
  module: 'QMS',
  details: 'CAPA-2026-0042 opened — deviation source: batch documentation gap',
  type: 'document' as const,
};

const s1 = buildSeedEntry(seed1Base, GENESIS_HASH, 0);
const s2 = buildSeedEntry(seed2Base, s1.chainHash, 1);
const s3 = buildSeedEntry(seed3Base, s2.chainHash, 2);
const s4 = buildSeedEntry(seed4Base, s3.chainHash, 3);

// Store is maintained newest-first for display; chain is built oldest-first
const auditStore: AuditEntry[] = [s4, s3, s2, s1];
headHash = s4.chainHash;
chainCounter = 4;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function addAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'prevHash' | 'chainHash' | 'chainIndex'>): AuditEntry {
  const id = 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const timestamp = new Date().toISOString();
  const index = chainCounter;
  const chainHash = computeChainHash(headHash, { id, timestamp, ...entry });

  const newEntry: AuditEntry = {
    ...entry,
    id,
    timestamp,
    prevHash: headHash,
    chainHash,
    chainIndex: index,
  };

  headHash = chainHash;
  chainCounter += 1;

  auditStore.unshift(newEntry); // newest first for display
  if (auditStore.length > MAX_ENTRIES) auditStore.splice(MAX_ENTRIES);
  return newEntry;
}

export function getAuditEntries(limit = 50): AuditEntry[] {
  return auditStore.slice(0, limit);
}

export function getAuditCount(): number {
  return auditStore.length;
}

/**
 * Walk every stored entry oldest→newest, recompute each chainHash, verify
 * it matches the stored value AND that prevHash matches predecessor.
 */
export function verifyAuditChain(): ChainVerifyResult {
  const ordered = [...auditStore].sort((a, b) => a.chainIndex - b.chainIndex);
  let runningHash = GENESIS_HASH;

  for (const entry of ordered) {
    // Check prevHash linkage
    if (entry.prevHash !== runningHash) {
      return {
        valid: false,
        totalEntries: auditStore.length,
        verifiedAt: new Date().toISOString(),
        breakAt: entry.id,
        breakIndex: entry.chainIndex,
      };
    }
    // Recompute this entry's chainHash
    const expected = computeChainHash(runningHash, entry);
    if (entry.chainHash !== expected) {
      return {
        valid: false,
        totalEntries: auditStore.length,
        verifiedAt: new Date().toISOString(),
        breakAt: entry.id,
        breakIndex: entry.chainIndex,
      };
    }
    runningHash = entry.chainHash;
  }

  return {
    valid: true,
    totalEntries: auditStore.length,
    verifiedAt: new Date().toISOString(),
  };
}
