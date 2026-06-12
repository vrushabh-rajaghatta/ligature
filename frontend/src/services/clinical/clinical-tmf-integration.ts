
/**
 * Clinical → TMF Integration Service
 * Auto-filing of clinical documents to Trial Master File
 * @version 0.20.10.6
 */

import type { SourceModule } from '@/domains/tmf/contracts';

// ============================================================================
// Types
// ============================================================================

export type ClinicalDocumentType =
  | 'SITE_1572'
  | 'INVESTIGATOR_CV'
  | 'MEDICAL_LICENSE'
  | 'SITE_CONTRACT'
  | 'IRB_APPROVAL'
  | 'INFORMED_CONSENT'
  | 'MONITORING_REPORT'
  | 'FOLLOW_UP_LETTER'
  | 'PROTOCOL_DEVIATION'
  | 'SERIOUS_BREACH'
  | 'SITE_CLOSURE'
  | 'DELEGATION_LOG'
  | 'TRAINING_LOG'
  | 'SITE_INITIATION_REPORT'
  | 'SCREENING_LOG'
  | 'ENROLLMENT_LOG';

export interface TMFZoneMapping {
  zone: number;
  section: string;
  artifact: string;
  artifactName: string;
  level: 'trial' | 'country' | 'site';
  isRequired: boolean;
  isCritical: boolean;
}

export interface ClinicalDocument {
  id: string;
  documentType: ClinicalDocumentType;
  studyId: string;
  siteId?: string;
  siteName?: string;
  countryCode?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  title: string;
  documentDate: Date;
  version: string;
  uploadedBy: string;
  uploadedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TMFFilingEvent {
  id: string;
  sourceModule: 'CLINICAL';
  documentType: ClinicalDocumentType;
  documentId: string;
  documentTitle: string;
  studyId: string;
  siteId?: string;
  siteName?: string;
  countryCode?: string;
  tmfZone: number;
  tmfSection: string;
  tmfArtifact: string;
  tmfArtifactName: string;
  level: 'trial' | 'country' | 'site';
  filedAt: Date;
  filedBy: string;
  status: TMFFilingStatus;
  errorMessage?: string;
  retryCount: number;
  autoFiled: boolean;
  auditTrail: TMFFilingAuditEntry[];
}

export type TMFFilingStatus = 'PENDING' | 'FILED' | 'FAILED' | 'SUPERSEDED' | 'CANCELLED';

export interface TMFFilingAuditEntry {
  id: string;
  action: 'CREATED' | 'FILED' | 'FAILED' | 'RETRIED' | 'SUPERSEDED' | 'CANCELLED';
  timestamp: Date;
  performedBy: string;
  details: string;
}

export interface FilingResult {
  success: boolean;
  filingEvent: TMFFilingEvent;
  tmfArtifactId?: string;
  errorMessage?: string;
}

export interface FilingBatchResult {
  total: number;
  successful: number;
  failed: number;
  results: FilingResult[];
}

// ============================================================================
// TMF Zone Mapping Configuration
// Based on DIA Reference Model v3.0
// ============================================================================

export const TMF_ZONE_MAPPING: Record<ClinicalDocumentType, TMFZoneMapping> = {
  // Zone 3: Site/Investigator Management
  SITE_1572: {
    zone: 3,
    section: '03.01',
    artifact: '03.01.01',
    artifactName: 'FDA Form 1572',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  INVESTIGATOR_CV: {
    zone: 3,
    section: '03.02',
    artifact: '03.02.01',
    artifactName: 'Investigator CV',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  MEDICAL_LICENSE: {
    zone: 3,
    section: '03.02',
    artifact: '03.02.02',
    artifactName: 'Medical License',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  SITE_CONTRACT: {
    zone: 3,
    section: '03.03',
    artifact: '03.03.01',
    artifactName: 'Site Contract/Agreement',
    level: 'site',
    isRequired: true,
    isCritical: false,
  },
  IRB_APPROVAL: {
    zone: 3,
    section: '03.04',
    artifact: '03.04.01',
    artifactName: 'IRB/EC Approval',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  INFORMED_CONSENT: {
    zone: 3,
    section: '03.04',
    artifact: '03.04.02',
    artifactName: 'Approved Informed Consent Form',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  DELEGATION_LOG: {
    zone: 3,
    section: '03.05',
    artifact: '03.05.01',
    artifactName: 'Delegation of Authority Log',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  TRAINING_LOG: {
    zone: 3,
    section: '03.05',
    artifact: '03.05.02',
    artifactName: 'Site Training Documentation',
    level: 'site',
    isRequired: true,
    isCritical: false,
  },
  
  // Zone 5: Protocol Deviations/Violations
  PROTOCOL_DEVIATION: {
    zone: 5,
    section: '05.05',
    artifact: '05.05.02',
    artifactName: 'Protocol Deviation Report',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  SERIOUS_BREACH: {
    zone: 5,
    section: '05.05',
    artifact: '05.05.03',
    artifactName: 'Serious Breach Report',
    level: 'trial',
    isRequired: true,
    isCritical: true,
  },
  
  // Zone 8: Monitoring
  MONITORING_REPORT: {
    zone: 8,
    section: '08.01',
    artifact: '08.01.03',
    artifactName: 'Monitoring Visit Report',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  FOLLOW_UP_LETTER: {
    zone: 8,
    section: '08.01',
    artifact: '08.01.04',
    artifactName: 'Monitoring Follow-up Letter',
    level: 'site',
    isRequired: false,
    isCritical: false,
  },
  SITE_INITIATION_REPORT: {
    zone: 8,
    section: '08.01',
    artifact: '08.01.01',
    artifactName: 'Site Initiation Visit Report',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  SITE_CLOSURE: {
    zone: 8,
    section: '08.01',
    artifact: '08.01.05',
    artifactName: 'Site Close-out Visit Report',
    level: 'site',
    isRequired: true,
    isCritical: true,
  },
  
  // Zone 9: Subject Records (Logs)
  SCREENING_LOG: {
    zone: 9,
    section: '09.01',
    artifact: '09.01.01',
    artifactName: 'Subject Screening Log',
    level: 'site',
    isRequired: true,
    isCritical: false,
  },
  ENROLLMENT_LOG: {
    zone: 9,
    section: '09.01',
    artifact: '09.01.02',
    artifactName: 'Subject Enrollment Log',
    level: 'site',
    isRequired: true,
    isCritical: false,
  },
};

// ============================================================================
// Service Class
// ============================================================================

export class ClinicalTMFIntegrationService {
  private filingEvents: Map<string, TMFFilingEvent> = new Map();

  // -------------------------------------------------------------------------
  // Document Classification
  // -------------------------------------------------------------------------

  /**
   * Classify a document based on filename and metadata
   */
  classifyDocument(
    fileName: string,
    metadata?: Record<string, unknown>
  ): ClinicalDocumentType | null {
    const lowerFileName = fileName.toLowerCase();
    
    // Check metadata first for explicit type
    if (metadata?.documentType) {
      return metadata.documentType as ClinicalDocumentType;
    }
    
    // Pattern matching on filename
    if (lowerFileName.includes('1572') || lowerFileName.includes('form1572')) {
      return 'SITE_1572';
    }
    if (lowerFileName.includes('cv') || lowerFileName.includes('curriculum')) {
      return 'INVESTIGATOR_CV';
    }
    if (lowerFileName.includes('license') || lowerFileName.includes('licence')) {
      return 'MEDICAL_LICENSE';
    }
    if (lowerFileName.includes('contract') || lowerFileName.includes('agreement')) {
      return 'SITE_CONTRACT';
    }
    if (lowerFileName.includes('irb') || lowerFileName.includes('ethics')) {
      return 'IRB_APPROVAL';
    }
    if (lowerFileName.includes('consent') || lowerFileName.includes('icf')) {
      return 'INFORMED_CONSENT';
    }
    if (lowerFileName.includes('monitoring') && lowerFileName.includes('report')) {
      return 'MONITORING_REPORT';
    }
    if (lowerFileName.includes('follow') && lowerFileName.includes('letter')) {
      return 'FOLLOW_UP_LETTER';
    }
    if (lowerFileName.includes('deviation')) {
      return 'PROTOCOL_DEVIATION';
    }
    if (lowerFileName.includes('breach')) {
      return 'SERIOUS_BREACH';
    }
    if (lowerFileName.includes('delegation')) {
      return 'DELEGATION_LOG';
    }
    if (lowerFileName.includes('training')) {
      return 'TRAINING_LOG';
    }
    if (lowerFileName.includes('initiation') || lowerFileName.includes('siv')) {
      return 'SITE_INITIATION_REPORT';
    }
    if (lowerFileName.includes('closure') || lowerFileName.includes('close-out')) {
      return 'SITE_CLOSURE';
    }
    if (lowerFileName.includes('screening')) {
      return 'SCREENING_LOG';
    }
    if (lowerFileName.includes('enrollment') || lowerFileName.includes('enrolment')) {
      return 'ENROLLMENT_LOG';
    }
    
    return null;
  }

  /**
   * Get TMF zone mapping for a document type
   */
  getZoneMapping(documentType: ClinicalDocumentType): TMFZoneMapping {
    return TMF_ZONE_MAPPING[documentType];
  }

  // -------------------------------------------------------------------------
  // Filing Operations
  // -------------------------------------------------------------------------

  /**
   * File a clinical document to TMF
   */
  async fileDocument(document: ClinicalDocument): Promise<FilingResult> {
    const mapping = this.getZoneMapping(document.documentType);
    const now = new Date();
    
    const filingEvent: TMFFilingEvent = {
      id: `filing-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sourceModule: 'CLINICAL',
      documentType: document.documentType,
      documentId: document.id,
      documentTitle: document.title,
      studyId: document.studyId,
      siteId: document.siteId,
      siteName: document.siteName,
      countryCode: document.countryCode,
      tmfZone: mapping.zone,
      tmfSection: mapping.section,
      tmfArtifact: mapping.artifact,
      tmfArtifactName: mapping.artifactName,
      level: mapping.level,
      filedAt: now,
      filedBy: document.uploadedBy,
      status: 'PENDING',
      retryCount: 0,
      autoFiled: true,
      auditTrail: [{
        id: `audit-${Date.now()}`,
        action: 'CREATED',
        timestamp: now,
        performedBy: document.uploadedBy,
        details: `Filing initiated for ${document.documentType} to TMF Zone ${mapping.zone}`,
      }],
    };

    try {
      // Simulate TMF API call
      await this.simulateTMFApiCall(filingEvent);
      
      filingEvent.status = 'FILED';
      filingEvent.auditTrail.push({
        id: `audit-${Date.now()}`,
        action: 'FILED',
        timestamp: new Date(),
        performedBy: 'system',
        details: `Successfully filed to TMF artifact ${mapping.artifact} (${mapping.artifactName})`,
      });
      
      this.filingEvents.set(filingEvent.id, filingEvent);
      
      return {
        success: true,
        filingEvent,
        tmfArtifactId: `tmf-artifact-${filingEvent.id}`,
      };
    } catch (error) {
      filingEvent.status = 'FAILED';
      filingEvent.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      filingEvent.auditTrail.push({
        id: `audit-${Date.now()}`,
        action: 'FAILED',
        timestamp: new Date(),
        performedBy: 'system',
        details: `Filing failed: ${filingEvent.errorMessage}`,
      });
      
      this.filingEvents.set(filingEvent.id, filingEvent);
      
      return {
        success: false,
        filingEvent,
        errorMessage: filingEvent.errorMessage,
      };
    }
  }

  /**
   * File multiple documents in batch
   */
  async fileDocumentBatch(documents: ClinicalDocument[]): Promise<FilingBatchResult> {
    const results: FilingResult[] = [];
    
    for (const document of documents) {
      const result = await this.fileDocument(document);
      results.push(result);
    }
    
    return {
      total: documents.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Retry a failed filing
   */
  async retryFiling(filingEventId: string): Promise<FilingResult> {
    const filingEvent = this.filingEvents.get(filingEventId);
    
    if (!filingEvent) {
      throw new Error(`Filing event ${filingEventId} not found`);
    }
    
    if (filingEvent.status !== 'FAILED') {
      throw new Error(`Filing event ${filingEventId} is not in FAILED status`);
    }
    
    filingEvent.retryCount++;
    filingEvent.auditTrail.push({
      id: `audit-${Date.now()}`,
      action: 'RETRIED',
      timestamp: new Date(),
      performedBy: 'system',
      details: `Retry attempt ${filingEvent.retryCount}`,
    });
    
    try {
      await this.simulateTMFApiCall(filingEvent);
      
      filingEvent.status = 'FILED';
      filingEvent.filedAt = new Date();
      filingEvent.errorMessage = undefined;
      filingEvent.auditTrail.push({
        id: `audit-${Date.now()}`,
        action: 'FILED',
        timestamp: new Date(),
        performedBy: 'system',
        details: `Successfully filed on retry attempt ${filingEvent.retryCount}`,
      });
      
      return {
        success: true,
        filingEvent,
        tmfArtifactId: `tmf-artifact-${filingEvent.id}`,
      };
    } catch (error) {
      filingEvent.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      filingEvent.auditTrail.push({
        id: `audit-${Date.now()}`,
        action: 'FAILED',
        timestamp: new Date(),
        performedBy: 'system',
        details: `Retry failed: ${filingEvent.errorMessage}`,
      });
      
      return {
        success: false,
        filingEvent,
        errorMessage: filingEvent.errorMessage,
      };
    }
  }

  /**
   * Supersede a filing with a new version
   */
  async supersedeFiling(
    filingEventId: string,
    newDocument: ClinicalDocument
  ): Promise<FilingResult> {
    const oldFiling = this.filingEvents.get(filingEventId);
    
    if (!oldFiling) {
      throw new Error(`Filing event ${filingEventId} not found`);
    }
    
    // Mark old filing as superseded
    oldFiling.status = 'SUPERSEDED';
    oldFiling.auditTrail.push({
      id: `audit-${Date.now()}`,
      action: 'SUPERSEDED',
      timestamp: new Date(),
      performedBy: newDocument.uploadedBy,
      details: `Superseded by new document version`,
    });
    
    // File the new version
    return this.fileDocument(newDocument);
  }

  /**
   * Cancel a pending filing
   */
  cancelFiling(filingEventId: string, reason: string): boolean {
    const filingEvent = this.filingEvents.get(filingEventId);
    
    if (!filingEvent) {
      return false;
    }
    
    if (filingEvent.status !== 'PENDING') {
      return false;
    }
    
    filingEvent.status = 'CANCELLED';
    filingEvent.auditTrail.push({
      id: `audit-${Date.now()}`,
      action: 'CANCELLED',
      timestamp: new Date(),
      performedBy: 'user',
      details: `Filing cancelled: ${reason}`,
    });
    
    return true;
  }

  // -------------------------------------------------------------------------
  // Query Operations
  // -------------------------------------------------------------------------

  /**
   * Get filing events by study
   */
  getFilingsByStudy(studyId: string): TMFFilingEvent[] {
    return Array.from(this.filingEvents.values())
      .filter(fe => fe.studyId === studyId);
  }

  /**
   * Get filing events by site
   */
  getFilingsBySite(siteId: string): TMFFilingEvent[] {
    return Array.from(this.filingEvents.values())
      .filter(fe => fe.siteId === siteId);
  }

  /**
   * Get filing events by status
   */
  getFilingsByStatus(status: TMFFilingStatus): TMFFilingEvent[] {
    return Array.from(this.filingEvents.values())
      .filter(fe => fe.status === status);
  }

  /**
   * Get filing events by TMF zone
   */
  getFilingsByZone(zone: number): TMFFilingEvent[] {
    return Array.from(this.filingEvents.values())
      .filter(fe => fe.tmfZone === zone);
  }

  /**
   * Get filing event by ID
   */
  getFilingById(filingEventId: string): TMFFilingEvent | undefined {
    return this.filingEvents.get(filingEventId);
  }

  /**
   * Get all filing events
   */
  getAllFilings(): TMFFilingEvent[] {
    return Array.from(this.filingEvents.values());
  }

  /**
   * Get pending filings count
   */
  getPendingCount(): number {
    return Array.from(this.filingEvents.values())
      .filter(fe => fe.status === 'PENDING').length;
  }

  /**
   * Get failed filings count
   */
  getFailedCount(): number {
    return Array.from(this.filingEvents.values())
      .filter(fe => fe.status === 'FAILED').length;
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  /**
   * Get filing metrics for a study
   */
  getFilingMetrics(studyId: string): FilingMetrics {
    const filings = this.getFilingsByStudy(studyId);
    
    const byStatus: Record<TMFFilingStatus, number> = {
      PENDING: 0,
      FILED: 0,
      FAILED: 0,
      SUPERSEDED: 0,
      CANCELLED: 0,
    };
    
    const byZone: Record<number, number> = {};
    const byDocType: Record<string, number> = {};
    
    filings.forEach(fe => {
      byStatus[fe.status]++;
      byZone[fe.tmfZone] = (byZone[fe.tmfZone] || 0) + 1;
      byDocType[fe.documentType] = (byDocType[fe.documentType] || 0) + 1;
    });
    
    const activeFilings = filings.filter(f => f.status === 'FILED').length;
    const criticalFilings = filings.filter(f => {
      const mapping = TMF_ZONE_MAPPING[f.documentType];
      return mapping?.isCritical && f.status === 'FILED';
    }).length;
    
    return {
      totalFilings: filings.length,
      byStatus,
      byZone,
      byDocumentType: byDocType,
      successRate: filings.length > 0 
        ? (byStatus.FILED / (byStatus.FILED + byStatus.FAILED)) * 100 
        : 100,
      criticalFilingsComplete: criticalFilings,
      autoFiledPercentage: filings.length > 0
        ? (filings.filter(f => f.autoFiled).length / filings.length) * 100
        : 0,
    };
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private async simulateTMFApiCall(filingEvent: TMFFilingEvent): Promise<void> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error('TMF API temporarily unavailable');
    }
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface FilingMetrics {
  totalFilings: number;
  byStatus: Record<TMFFilingStatus, number>;
  byZone: Record<number, number>;
  byDocumentType: Record<string, number>;
  successRate: number;
  criticalFilingsComplete: number;
  autoFiledPercentage: number;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: ClinicalTMFIntegrationService | null = null;

export function getClinicalTMFIntegrationService(): ClinicalTMFIntegrationService {
  if (!serviceInstance) {
    serviceInstance = new ClinicalTMFIntegrationService();
  }
  return serviceInstance;
}

export function resetClinicalTMFIntegrationService(): void {
  serviceInstance = null;
}
