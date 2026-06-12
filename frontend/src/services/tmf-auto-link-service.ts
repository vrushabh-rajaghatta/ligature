
/**
 * TMF Auto-Link Service
 * Service to trigger TMF auto-linking from source modules
 * 
 * v0.41.5 - Auto-Link → QC Queue Integration
 */

// =============================================================================
// TYPES
// =============================================================================

type SourceModule = 'ctms' | 'safety' | 'authoring' | 'submissions' | 'publishing' | 'edc' | 'manual';
type QCPriority = 'critical' | 'high' | 'medium' | 'low';

interface AutoLinkRequest {
  sourceModule: SourceModule;
  eventType: string;
  studyId: string;
  siteId?: string;
  sourceRecordId: string;
  sourceData?: Record<string, any>;
  documentTitle?: string;
  documentPath?: string;
  documentId?: string;
  skipQC?: boolean; // Skip QC queue for trusted sources
}

interface AutoLinkResult {
  success: boolean;
  artifact?: {
    id: string;
    artifactNumber: string;
    title: string;
    zone: string;
    zoneName: string;
  };
  rule?: {
    id: string;
    name: string;
    targetZone: string;
    targetSection: string;
  };
  autoFiled: boolean;
  qcQueued?: boolean;
  qcItemId?: string;
  error?: string;
}

interface QCQueueRequest {
  artifactId: string;
  artifactTitle: string;
  artifactNumber?: string;
  zoneId: string;
  zoneName: string;
  sectionId?: string;
  sectionName?: string;
  studyId: string;
  studyName?: string;
  priority: QCPriority;
  source: 'auto-link' | 'manual-upload' | 'cross-module' | 'migration';
  dueDate?: string;
}

// =============================================================================
// QC PRIORITY MAPPING
// =============================================================================

const SOURCE_PRIORITY_MAP: Record<SourceModule, QCPriority> = {
  safety: 'critical',      // Safety docs are critical
  submissions: 'high',     // Regulatory submissions high priority
  authoring: 'medium',     // Finalized docs medium
  ctms: 'medium',          // Monitoring reports medium
  publishing: 'high',      // Published packages high
  edc: 'medium',           // EDC data medium
  manual: 'low',           // Manual uploads low
};

const EVENT_PRIORITY_OVERRIDE: Record<string, QCPriority> = {
  'sae-report-finalized': 'critical',
  'dsur-finalized': 'critical',
  'submission-published': 'high',
  'ha-response-received': 'high',
  'document-finalized': 'medium',
  'monitoring-visit-complete': 'medium',
  'investigator-document-uploaded': 'low',
};

// =============================================================================
// SERVICE
// =============================================================================

class TMFAutoLinkService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : import.meta.env.VITE_APP_URL || 'http://localhost:3000';
  }

  /**
   * Determine QC priority based on source module and event type
   */
  private getQCPriority(sourceModule: SourceModule, eventType: string): QCPriority {
    // Event type override takes precedence
    if (EVENT_PRIORITY_OVERRIDE[eventType]) {
      return EVENT_PRIORITY_OVERRIDE[eventType];
    }
    // Fall back to source module default
    return SOURCE_PRIORITY_MAP[sourceModule] || 'medium';
  }

  /**
   * Add artifact to QC queue
   */
  private async addToQCQueue(request: QCQueueRequest): Promise<{ success: boolean; qcItemId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tmf/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to add to QC queue',
        };
      }

      return {
        success: true,
        qcItemId: data.data?.id,
      };
    } catch (error) {
      console.error('QC queue submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Trigger auto-linking for a source event
   */
  async triggerAutoLink(request: AutoLinkRequest): Promise<AutoLinkResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tmf/auto-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          autoFiled: false,
          error: data.error || 'Auto-link request failed',
        };
      }

      const result: AutoLinkResult = {
        success: data.success,
        artifact: data.artifact ? {
          id: data.artifact.id,
          artifactNumber: data.artifact.artifactNumber,
          title: data.artifact.title,
          zone: data.artifact.zone,
          zoneName: data.artifact.zoneName,
        } : undefined,
        rule: data.rule,
        autoFiled: data.autoFiled || false,
        error: data.message,
      };

      // Add to QC queue if artifact was created and QC not skipped
      if (result.success && result.artifact && !request.skipQC) {
        const qcPriority = this.getQCPriority(request.sourceModule, request.eventType);
        
        const qcResult = await this.addToQCQueue({
          artifactId: result.artifact.id,
          artifactTitle: result.artifact.title,
          artifactNumber: result.artifact.artifactNumber,
          zoneId: result.artifact.zone,
          zoneName: result.artifact.zoneName,
          sectionId: result.rule?.targetSection,
          sectionName: result.rule?.name,
          studyId: request.studyId,
          priority: qcPriority,
          source: 'auto-link',
        });

        result.qcQueued = qcResult.success;
        result.qcItemId = qcResult.qcItemId;
        
        if (!qcResult.success) {
          console.warn('Auto-linked but QC queue failed:', qcResult.error);
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        autoFiled: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // CTMS INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Called when a monitoring visit is completed in CTMS
   */
  async onMonitoringVisitComplete(params: {
    visitId: string;
    studyId: string;
    siteId: string;
    visitType: 'site-selection' | 'site-initiation' | 'routine' | 'interim' | 'for-cause' | 'closeout' | 'remote';
    reportPath?: string;
    reportTitle?: string;
    monitorName?: string;
    visitDate?: string;
  }): Promise<AutoLinkResult> {
    return this.triggerAutoLink({
      sourceModule: 'ctms',
      eventType: 'monitoring-visit-complete',
      studyId: params.studyId,
      siteId: params.siteId,
      sourceRecordId: params.visitId,
      sourceData: {
        visitType: params.visitType,
        monitorName: params.monitorName,
        visitDate: params.visitDate,
      },
      documentTitle: params.reportTitle || `${params.visitType} Visit Report - ${params.siteId}`,
      documentPath: params.reportPath,
    });
  }

  /**
   * Called when an investigator document is uploaded in CTMS
   */
  async onInvestigatorDocumentUploaded(params: {
    documentId: string;
    studyId: string;
    siteId: string;
    documentType: 'cv' | '1572' | 'medical-license' | 'financial-disclosure' | 'training-certificate';
    investigatorName?: string;
    documentPath?: string;
    documentTitle?: string;
  }): Promise<AutoLinkResult> {
    return this.triggerAutoLink({
      sourceModule: 'ctms',
      eventType: 'investigator-document-uploaded',
      studyId: params.studyId,
      siteId: params.siteId,
      sourceRecordId: params.documentId,
      sourceData: {
        documentType: params.documentType,
        investigatorName: params.investigatorName,
      },
      documentTitle: params.documentTitle || `${params.documentType} - ${params.investigatorName || params.siteId}`,
      documentPath: params.documentPath,
      documentId: params.documentId,
    });
  }

  // ---------------------------------------------------------------------------
  // SAFETY INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Called when an SAE report is finalized in Safety module
   */
  async onSAEReportFinalized(params: {
    reportId: string;
    studyId: string;
    siteId: string;
    caseNumber: string;
    reportPath?: string;
    seriousness?: string;
  }): Promise<AutoLinkResult> {
    return this.triggerAutoLink({
      sourceModule: 'safety',
      eventType: 'sae-report-finalized',
      studyId: params.studyId,
      siteId: params.siteId,
      sourceRecordId: params.reportId,
      sourceData: {
        caseNumber: params.caseNumber,
        seriousness: params.seriousness,
      },
      documentTitle: `SAE Report - ${params.caseNumber}`,
      documentPath: params.reportPath,
    });
  }

  /**
   * Called when a DSUR is finalized
   */
  async onDSURFinalized(params: {
    reportId: string;
    studyId: string;
    reportingPeriod: string;
    reportPath?: string;
  }): Promise<AutoLinkResult> {
    return this.triggerAutoLink({
      sourceModule: 'safety',
      eventType: 'dsur-finalized',
      studyId: params.studyId,
      sourceRecordId: params.reportId,
      sourceData: {
        reportingPeriod: params.reportingPeriod,
      },
      documentTitle: `DSUR - ${params.reportingPeriod}`,
      documentPath: params.reportPath,
    });
  }

  // ---------------------------------------------------------------------------
  // AUTHORING INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Called when a document is finalized in Authoring
   */
  async onDocumentFinalized(params: {
    documentId: string;
    studyId: string;
    documentType: 'protocol' | 'ib' | 'icf' | 'csr' | 'amendment' | 'other';
    documentTitle: string;
    documentPath?: string;
    version?: string;
  }): Promise<AutoLinkResult> {
    return this.triggerAutoLink({
      sourceModule: 'authoring',
      eventType: 'document-finalized',
      studyId: params.studyId,
      sourceRecordId: params.documentId,
      sourceData: {
        documentType: params.documentType,
        version: params.version,
      },
      documentTitle: params.documentTitle,
      documentPath: params.documentPath,
      documentId: params.documentId,
    });
  }

  // ---------------------------------------------------------------------------
  // SUBMISSIONS INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Called when a submission is published
   */
  async onSubmissionPublished(params: {
    submissionId: string;
    studyId: string;
    submissionType: 'ind' | 'cta' | 'nda' | 'bla' | 'maa' | 'amendment';
    country?: string;
    sequenceNumber?: string;
    submissionPath?: string;
  }): Promise<AutoLinkResult> {
    return this.triggerAutoLink({
      sourceModule: 'submissions',
      eventType: 'submission-published',
      studyId: params.studyId,
      sourceRecordId: params.submissionId,
      sourceData: {
        submissionType: params.submissionType,
        country: params.country,
        sequenceNumber: params.sequenceNumber,
      },
      documentTitle: `${params.submissionType.toUpperCase()} Submission - ${params.sequenceNumber || params.submissionId}`,
      documentPath: params.submissionPath,
    });
  }

  /**
   * Called when HA response is received
   */
  async onHAResponseReceived(params: {
    responseId: string;
    studyId: string;
    responseType: 'approval' | 'crl' | 'rfi' | 'acknowledgment';
    country?: string;
    documentPath?: string;
    agencyName?: string;
  }): Promise<AutoLinkResult> {
    return this.triggerAutoLink({
      sourceModule: 'submissions',
      eventType: 'ha-response-received',
      studyId: params.studyId,
      sourceRecordId: params.responseId,
      sourceData: {
        responseType: params.responseType,
        country: params.country,
        agencyName: params.agencyName,
      },
      documentTitle: `${params.agencyName || 'HA'} ${params.responseType} Letter`,
      documentPath: params.documentPath,
    });
  }

  // ---------------------------------------------------------------------------
  // UTILITY METHODS
  // ---------------------------------------------------------------------------

  /**
   * Get all available auto-link rules
   */
  async getRules(sourceModule?: SourceModule): Promise<any[]> {
    try {
      const params = sourceModule ? `?type=rules&sourceModule=${sourceModule}` : '?type=rules';
      const response = await fetch(`${this.baseUrl}/api/tmf/auto-link${params}`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch auto-link rules:', error);
      return [];
    }
  }

  /**
   * Get recent auto-link events
   */
  async getRecentEvents(studyId?: string, limit: number = 10): Promise<any[]> {
    try {
      const params = studyId 
        ? `?type=events&studyId=${studyId}` 
        : '?type=events';
      const response = await fetch(`${this.baseUrl}/api/tmf/auto-link${params}`);
      const data = await response.json();
      return (data.data || []).slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch auto-link events:', error);
      return [];
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const tmfAutoLinkService = new TMFAutoLinkService();
export default tmfAutoLinkService;
