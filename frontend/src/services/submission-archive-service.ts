
// =============================================================================
// SUBMISSION ARCHIVE SERVICE
// =============================================================================
// Service for managing the archival of acknowledged regulatory submissions.
// Handles state transitions, certificate generation, and permanent archival.
// =============================================================================

import {
  SubmissionLifecycleState,
  SubmissionSubState,
  SubmissionLifecycleRecord,
  LifecycleEvent,
  LifecycleEventType,
  ArchiveCertificate,
  AcknowledgmentRecord,
  FilingRecord,
  ArchiveRequest,
  ArchiveResult,
  ArchiveError,
  ArchiveWarning,
  StateTransition,
  VALID_TRANSITIONS,
  isValidTransition,
  getAvailableTransitions,
  generateCertificateNumber,
} from '@/types/submission-lifecycle';

// ============================================================================
// In-Memory Storage (Production would use database)
// ============================================================================

const lifecycleRecords = new Map<string, SubmissionLifecycleRecord>();
const archivedPackages = new Map<string, {
  checksum: string;
  location: string;
  size: number;
  archivedAt: Date;
}>();

// ============================================================================
// Service Interface
// ============================================================================

export interface ISubmissionArchiveService {
  // Lifecycle management
  createLifecycleRecord(submissionId: string, sequenceNumber: string, applicationNumber: string): Promise<SubmissionLifecycleRecord>;
  getLifecycleRecord(submissionId: string, sequenceNumber: string): Promise<SubmissionLifecycleRecord | null>;
  updateState(submissionId: string, sequenceNumber: string, newState: SubmissionLifecycleState, actor: LifecycleEvent['actor'], details?: Record<string, unknown>): Promise<SubmissionLifecycleRecord>;
  
  // Compilation tracking
  recordCompilation(submissionId: string, sequenceNumber: string, packageId: string, packageChecksum: string, packageSize: number, documentCount: number): Promise<void>;
  
  // Submission tracking
  recordSubmission(submissionId: string, sequenceNumber: string, gatewayId: string, transmissionId: string): Promise<void>;
  
  // Acknowledgment tracking
  recordAcknowledgment(submissionId: string, sequenceNumber: string, ack: AcknowledgmentRecord): Promise<void>;
  
  // Archive operations
  canArchive(submissionId: string, sequenceNumber: string): Promise<{ canArchive: boolean; reason?: string }>;
  archive(request: ArchiveRequest, actor: LifecycleEvent['actor']): Promise<ArchiveResult>;
  
  // Certificate operations
  getCertificate(submissionId: string, sequenceNumber: string): Promise<ArchiveCertificate | null>;
  exportCertificate(submissionId: string, sequenceNumber: string, format: 'pdf' | 'json' | 'text'): Promise<Blob>;
  
  // Event history
  getEvents(submissionId: string, sequenceNumber: string): Promise<LifecycleEvent[]>;
  
  // Query operations
  listByState(state: SubmissionLifecycleState): Promise<SubmissionLifecycleRecord[]>;
  listReadyToArchive(): Promise<SubmissionLifecycleRecord[]>;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class SubmissionArchiveService implements ISubmissionArchiveService {
  
  // --------------------------------------------------------------------------
  // Lifecycle Management
  // --------------------------------------------------------------------------
  
  async createLifecycleRecord(
    submissionId: string,
    sequenceNumber: string,
    applicationNumber: string,
  ): Promise<SubmissionLifecycleRecord> {
    const key = `${submissionId}-${sequenceNumber}`;
    const now = new Date();
    
    const record: SubmissionLifecycleRecord = {
      submissionId,
      sequenceNumber,
      applicationNumber,
      currentState: 'draft',
      currentSubState: 'draft_new',
      createdAt: now,
      lastModifiedAt: now,
      acknowledgments: [],
      isArchived: false,
      isReadOnly: false,
      events: [{
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        submissionId,
        sequenceNumber,
        timestamp: now,
        eventType: 'state_change',
        fromState: 'draft',
        toState: 'draft',
        actor: {
          id: 'system',
          name: 'System',
          role: 'system',
        },
        details: { action: 'created' },
      }],
    };
    
    lifecycleRecords.set(key, record);
    return record;
  }
  
  async getLifecycleRecord(
    submissionId: string,
    sequenceNumber: string,
  ): Promise<SubmissionLifecycleRecord | null> {
    const key = `${submissionId}-${sequenceNumber}`;
    return lifecycleRecords.get(key) || null;
  }
  
  async updateState(
    submissionId: string,
    sequenceNumber: string,
    newState: SubmissionLifecycleState,
    actor: LifecycleEvent['actor'],
    details?: Record<string, unknown>,
  ): Promise<SubmissionLifecycleRecord> {
    const key = `${submissionId}-${sequenceNumber}`;
    const record = lifecycleRecords.get(key);
    
    if (!record) {
      throw new Error(`Lifecycle record not found: ${key}`);
    }
    
    if (!isValidTransition(record.currentState, newState)) {
      throw new Error(`Invalid state transition: ${record.currentState} → ${newState}`);
    }
    
    const now = new Date();
    const event: LifecycleEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submissionId,
      sequenceNumber,
      timestamp: now,
      eventType: 'state_change',
      fromState: record.currentState,
      toState: newState,
      fromSubState: record.currentSubState,
      actor,
      details,
    };
    
    // Update state-specific timestamps
    const updates: Partial<SubmissionLifecycleRecord> = {
      currentState: newState,
      lastModifiedAt: now,
    };
    
    switch (newState) {
      case 'compiled':
        updates.compiledAt = now;
        updates.currentSubState = 'compiled_pending_validation';
        break;
      case 'submitted':
        updates.submittedAt = now;
        updates.currentSubState = 'submitted_awaiting_ta1';
        break;
      case 'acknowledged':
        updates.acknowledgedAt = now;
        updates.currentSubState = 'acknowledged_pending_review';
        break;
      case 'archived':
        updates.archivedAt = now;
        updates.isArchived = true;
        updates.isReadOnly = true;
        updates.currentSubState = 'archived_final';
        break;
    }
    
    // Update read-only flag for any state past draft
    if (newState !== 'draft') {
      updates.isReadOnly = true;
    }
    
    const updatedRecord: SubmissionLifecycleRecord = {
      ...record,
      ...updates,
      events: [...record.events, event],
    };
    
    lifecycleRecords.set(key, updatedRecord);
    return updatedRecord;
  }
  
  // --------------------------------------------------------------------------
  // Compilation Tracking
  // --------------------------------------------------------------------------
  
  async recordCompilation(
    submissionId: string,
    sequenceNumber: string,
    packageId: string,
    packageChecksum: string,
    packageSize: number,
    documentCount: number,
  ): Promise<void> {
    const key = `${submissionId}-${sequenceNumber}`;
    const record = lifecycleRecords.get(key);
    
    if (!record) {
      throw new Error(`Lifecycle record not found: ${key}`);
    }
    
    const now = new Date();
    const event: LifecycleEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submissionId,
      sequenceNumber,
      timestamp: now,
      eventType: 'compilation_completed',
      fromState: record.currentState,
      toState: record.currentState,
      actor: { id: 'system', name: 'System', role: 'system' },
      details: { packageId, packageChecksum, packageSize, documentCount },
    };
    
    const updatedRecord: SubmissionLifecycleRecord = {
      ...record,
      packageId,
      packageChecksum,
      packageSize,
      documentCount,
      compiledAt: now,
      currentSubState: 'compiled_validated',
      lastModifiedAt: now,
      events: [...record.events, event],
    };
    
    lifecycleRecords.set(key, updatedRecord);
  }
  
  // --------------------------------------------------------------------------
  // Submission Tracking
  // --------------------------------------------------------------------------
  
  async recordSubmission(
    submissionId: string,
    sequenceNumber: string,
    gatewayId: string,
    transmissionId: string,
  ): Promise<void> {
    const key = `${submissionId}-${sequenceNumber}`;
    const record = lifecycleRecords.get(key);
    
    if (!record) {
      throw new Error(`Lifecycle record not found: ${key}`);
    }
    
    const now = new Date();
    const event: LifecycleEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submissionId,
      sequenceNumber,
      timestamp: now,
      eventType: 'submission_initiated',
      fromState: record.currentState,
      toState: record.currentState,
      actor: { id: 'system', name: 'System', role: 'system' },
      details: { gatewayId, transmissionId },
    };
    
    const updatedRecord: SubmissionLifecycleRecord = {
      ...record,
      gatewayId,
      transmissionId,
      submittedAt: now,
      currentSubState: 'submitted_awaiting_ta1',
      lastModifiedAt: now,
      events: [...record.events, event],
    };
    
    lifecycleRecords.set(key, updatedRecord);
  }
  
  // --------------------------------------------------------------------------
  // Acknowledgment Tracking
  // --------------------------------------------------------------------------
  
  async recordAcknowledgment(
    submissionId: string,
    sequenceNumber: string,
    ack: AcknowledgmentRecord,
  ): Promise<void> {
    const key = `${submissionId}-${sequenceNumber}`;
    const record = lifecycleRecords.get(key);
    
    if (!record) {
      throw new Error(`Lifecycle record not found: ${key}`);
    }
    
    const now = new Date();
    const event: LifecycleEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submissionId,
      sequenceNumber,
      timestamp: now,
      eventType: 'ack_received',
      fromState: record.currentState,
      toState: record.currentState,
      actor: { id: 'system', name: 'Gateway', role: 'system' },
      details: { ackType: ack.type, status: ack.status, gatewayId: ack.gatewayId },
    };
    
    // Determine new sub-state based on ACK type
    let newSubState: SubmissionSubState = record.currentSubState || 'submitted_awaiting_ta1';
    switch (ack.type) {
      case 'TA1':
        newSubState = 'submitted_ta1_received';
        break;
      case 'TA2':
        newSubState = 'submitted_ta2_received';
        break;
      case 'ACK1':
        newSubState = 'submitted_ack1_received';
        break;
      case 'ACK2':
        newSubState = 'submitted_ack2_received';
        break;
      case 'ACK3':
        newSubState = 'acknowledged_pending_review';
        break;
    }
    
    const updatedRecord: SubmissionLifecycleRecord = {
      ...record,
      acknowledgments: [...record.acknowledgments, ack],
      currentSubState: newSubState,
      lastModifiedAt: now,
      events: [...record.events, event],
    };
    
    // Auto-transition to acknowledged state after ACK3
    if (ack.type === 'ACK3' && ack.status === 'success') {
      updatedRecord.currentState = 'acknowledged';
      updatedRecord.acknowledgedAt = now;
    }
    
    lifecycleRecords.set(key, updatedRecord);
  }
  
  // --------------------------------------------------------------------------
  // Archive Operations
  // --------------------------------------------------------------------------
  
  async canArchive(
    submissionId: string,
    sequenceNumber: string,
  ): Promise<{ canArchive: boolean; reason?: string }> {
    const key = `${submissionId}-${sequenceNumber}`;
    const record = lifecycleRecords.get(key);
    
    if (!record) {
      return { canArchive: false, reason: 'Lifecycle record not found' };
    }
    
    if (record.isArchived) {
      return { canArchive: false, reason: 'Already archived' };
    }
    
    if (record.currentState !== 'acknowledged') {
      return { 
        canArchive: false, 
        reason: `Cannot archive from state '${record.currentState}'. Must be in 'acknowledged' state.` 
      };
    }
    
    // Check for ACK3
    const hasAck3 = record.acknowledgments.some(a => a.type === 'ACK3' && a.status === 'success');
    if (!hasAck3) {
      return { canArchive: false, reason: 'Missing successful ACK3 acknowledgment' };
    }
    
    return { canArchive: true };
  }
  
  async archive(
    request: ArchiveRequest,
    actor: LifecycleEvent['actor'],
  ): Promise<ArchiveResult> {
    const { submissionId, sequenceNumber, filingRecord, verifyChecksums, generateCertificate = true } = request;
    const key = `${submissionId}-${sequenceNumber}`;
    const record = lifecycleRecords.get(key);
    
    const errors: ArchiveError[] = [];
    const warnings: ArchiveWarning[] = [];
    
    // Validate
    if (!record) {
      errors.push({ code: 'NOT_FOUND', message: 'Lifecycle record not found' });
      return { success: false, submissionId, sequenceNumber, errors };
    }
    
    const canArchiveResult = await this.canArchive(submissionId, sequenceNumber);
    if (!canArchiveResult.canArchive) {
      errors.push({ code: 'CANNOT_ARCHIVE', message: canArchiveResult.reason || 'Cannot archive' });
      return { success: false, submissionId, sequenceNumber, errors };
    }
    
    // Verify checksums if requested
    if (verifyChecksums && record.packageChecksum) {
      // In production, would verify actual file checksums
      // For demo, we'll simulate success
      const checksumValid = true;
      if (!checksumValid) {
        errors.push({ code: 'CHECKSUM_MISMATCH', message: 'Package checksum verification failed' });
        return { success: false, submissionId, sequenceNumber, errors };
      }
    }
    
    const now = new Date();
    
    // Generate archive location
    const archiveLocation = this.generateArchiveLocation(record.applicationNumber, sequenceNumber);
    const archiveChecksum = this.generateChecksum(`archive-${key}-${now.getTime()}`);
    const archiveSize = record.packageSize || 0;
    
    // Store archive reference
    archivedPackages.set(key, {
      checksum: archiveChecksum,
      location: archiveLocation,
      size: archiveSize,
      archivedAt: now,
    });
    
    // Generate certificate if requested
    let certificate: ArchiveCertificate | undefined;
    if (generateCertificate) {
      certificate = this.generateCertificate(record, archiveLocation, archiveChecksum, archiveSize, filingRecord, actor);
    }
    
    // Create archive event
    const archiveEvent: LifecycleEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submissionId,
      sequenceNumber,
      timestamp: now,
      eventType: 'archive_completed',
      fromState: record.currentState,
      toState: 'archived',
      actor,
      details: {
        archiveLocation,
        archiveChecksum,
        certificateNumber: certificate?.certificateNumber,
        filingRecordNumber: filingRecord?.recordNumber,
      },
    };
    
    // Update record
    const updatedRecord: SubmissionLifecycleRecord = {
      ...record,
      currentState: 'archived',
      currentSubState: 'archived_final',
      archivedAt: now,
      isArchived: true,
      isReadOnly: true,
      archiveLocation,
      certificate,
      lastModifiedAt: now,
      events: [...record.events, archiveEvent],
    };
    
    lifecycleRecords.set(key, updatedRecord);
    
    return {
      success: true,
      submissionId,
      sequenceNumber,
      archivedAt: now,
      archiveLocation,
      certificate,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
  
  // --------------------------------------------------------------------------
  // Certificate Operations
  // --------------------------------------------------------------------------
  
  async getCertificate(
    submissionId: string,
    sequenceNumber: string,
  ): Promise<ArchiveCertificate | null> {
    const key = `${submissionId}-${sequenceNumber}`;
    const record = lifecycleRecords.get(key);
    return record?.certificate || null;
  }
  
  async exportCertificate(
    submissionId: string,
    sequenceNumber: string,
    format: 'pdf' | 'json' | 'text',
  ): Promise<Blob> {
    const certificate = await this.getCertificate(submissionId, sequenceNumber);
    
    if (!certificate) {
      throw new Error('Certificate not found');
    }
    
    switch (format) {
      case 'json':
        return new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
        
      case 'text': {
        const text = this.formatCertificateAsText(certificate);
        return new Blob([text], { type: 'text/plain' });
      }
      
      case 'pdf':
        // In production, would generate actual PDF
        // For demo, return JSON with PDF mime type
        return new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/pdf' });
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
  
  // --------------------------------------------------------------------------
  // Event History
  // --------------------------------------------------------------------------
  
  async getEvents(
    submissionId: string,
    sequenceNumber: string,
  ): Promise<LifecycleEvent[]> {
    const key = `${submissionId}-${sequenceNumber}`;
    const record = lifecycleRecords.get(key);
    return record?.events || [];
  }
  
  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------
  
  async listByState(state: SubmissionLifecycleState): Promise<SubmissionLifecycleRecord[]> {
    const records: SubmissionLifecycleRecord[] = [];
    lifecycleRecords.forEach(record => {
      if (record.currentState === state) {
        records.push(record);
      }
    });
    return records;
  }
  
  async listReadyToArchive(): Promise<SubmissionLifecycleRecord[]> {
    const records: SubmissionLifecycleRecord[] = [];
    lifecycleRecords.forEach(record => {
      if (record.currentState === 'acknowledged' && !record.isArchived) {
        records.push(record);
      }
    });
    return records;
  }
  
  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------
  
  private generateArchiveLocation(applicationNumber: string, sequenceNumber: string): string {
    const year = new Date().getFullYear();
    const cleanApp = applicationNumber.replace(/[^A-Z0-9]/gi, '');
    const seq = sequenceNumber.padStart(4, '0');
    return `/archives/${year}/${cleanApp}/${seq}/`;
  }
  
  private generateChecksum(content: string): string {
    // Simple hash for demo - production would use real crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
  }
  
  private generateCertificate(
    record: SubmissionLifecycleRecord,
    archiveLocation: string,
    archiveChecksum: string,
    archiveSize: number,
    filingRecord?: FilingRecord,
    actor?: LifecycleEvent['actor'],
  ): ArchiveCertificate {
    const now = new Date();
    
    return {
      id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      certificateNumber: generateCertificateNumber(record.applicationNumber, record.sequenceNumber),
      submissionId: record.submissionId,
      sequenceNumber: record.sequenceNumber,
      applicationNumber: record.applicationNumber,
      applicationType: 'NDA', // Would come from submission data
      submissionType: 'Original', // Would come from submission data
      region: 'US', // Would come from submission data
      compiledAt: record.compiledAt || now,
      submittedAt: record.submittedAt || now,
      acknowledgedAt: record.acknowledgedAt || now,
      archivedAt: now,
      archiveLocation,
      archiveChecksum,
      archiveSize,
      packageChecksum: record.packageChecksum || archiveChecksum,
      documentCount: record.documentCount || 0,
      totalPages: Math.floor((record.documentCount || 0) * 25), // Estimate
      acknowledgments: record.acknowledgments,
      filingRecord,
      generatedBy: actor || { id: 'system', name: 'System' },
      signedAt: now,
      signatureHash: this.generateChecksum(`signature-${record.submissionId}-${now.getTime()}`),
      verificationUrl: `https://ligature.io/verify/${record.submissionId}/${record.sequenceNumber}`,
    };
  }
  
  private formatCertificateAsText(cert: ArchiveCertificate): string {
    return `
================================================================================
                         ARCHIVE CERTIFICATE
================================================================================

Certificate Number: ${cert.certificateNumber}
Generated: ${cert.archivedAt.toISOString()}

--------------------------------------------------------------------------------
SUBMISSION DETAILS
--------------------------------------------------------------------------------
Application Number: ${cert.applicationNumber}
Sequence Number: ${cert.sequenceNumber}
Application Type: ${cert.applicationType}
Submission Type: ${cert.submissionType}
Region: ${cert.region}

--------------------------------------------------------------------------------
TIMELINE
--------------------------------------------------------------------------------
Compiled:     ${cert.compiledAt.toISOString()}
Submitted:    ${cert.submittedAt.toISOString()}
Acknowledged: ${cert.acknowledgedAt.toISOString()}
Archived:     ${cert.archivedAt.toISOString()}

--------------------------------------------------------------------------------
PACKAGE DETAILS
--------------------------------------------------------------------------------
Package Checksum: ${cert.packageChecksum}
Document Count:   ${cert.documentCount}
Total Pages:      ${cert.totalPages}

--------------------------------------------------------------------------------
ARCHIVE DETAILS
--------------------------------------------------------------------------------
Archive Location: ${cert.archiveLocation}
Archive Checksum: ${cert.archiveChecksum}
Archive Size:     ${(cert.archiveSize / 1024 / 1024).toFixed(2)} MB

--------------------------------------------------------------------------------
ACKNOWLEDGMENT CHAIN
--------------------------------------------------------------------------------
${cert.acknowledgments.map(a => 
  `${a.type.padEnd(5)} | ${a.status.padEnd(10)} | ${a.receivedAt.toISOString()}`
).join('\n')}

${cert.filingRecord ? `
--------------------------------------------------------------------------------
FILING RECORD
--------------------------------------------------------------------------------
Record Number:  ${cert.filingRecord.recordNumber}
Record Date:    ${cert.filingRecord.recordDate.toISOString()}
Agency:         ${cert.filingRecord.agency}
Filing Type:    ${cert.filingRecord.filingType}
${cert.filingRecord.receiptNumber ? `Receipt Number: ${cert.filingRecord.receiptNumber}` : ''}
${cert.filingRecord.trackingUrl ? `Tracking URL:   ${cert.filingRecord.trackingUrl}` : ''}
` : ''}

--------------------------------------------------------------------------------
VERIFICATION
--------------------------------------------------------------------------------
Generated By:    ${cert.generatedBy.name}
Signature Hash:  ${cert.signatureHash}
Verification:    ${cert.verificationUrl}

================================================================================
                     END OF ARCHIVE CERTIFICATE
================================================================================
`.trim();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let serviceInstance: SubmissionArchiveService | null = null;

export function getSubmissionArchiveService(): SubmissionArchiveService {
  if (!serviceInstance) {
    serviceInstance = new SubmissionArchiveService();
  }
  return serviceInstance;
}

export function resetSubmissionArchiveService(): void {
  serviceInstance = null;
  lifecycleRecords.clear();
  archivedPackages.clear();
}

// ============================================================================
// Default Export
// ============================================================================

export default SubmissionArchiveService;
