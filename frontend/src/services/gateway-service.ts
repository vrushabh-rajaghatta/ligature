
// Gateway Integration Service
// Handles FDA ESG and EMA CESP submission tracking and acknowledgment parsing

import { SubmissionStatus } from '@/types/publishing';

// ============================================================================
// TYPES
// ============================================================================

export type GatewayType = 'fda-esg' | 'ema-cesp' | 'hc-ctr' | 'pmda-gateway';

export type AcknowledgmentType = 
  // FDA ESG
  | 'TA1' | 'TA2' | 'ACK1' | 'ACK2' | 'ACK3'
  // EMA CESP
  | 'CESP-RECEIPT' | 'CESP-ACCEPT' | 'CESP-REJECT'
  // Generic
  | 'RECEIVED' | 'VALIDATED' | 'ACCEPTED' | 'REJECTED' | 'PROCESSING';

export type AcknowledgmentStatus = 'success' | 'warning' | 'error' | 'pending';

export interface GatewayCredentials {
  gateway: GatewayType;
  username?: string;
  certificate?: string;
  apiKey?: string;
  environment: 'production' | 'test' | 'validation';
}

export interface SubmissionPackage {
  id: string;
  projectId: string;
  sequenceNumber: string;
  applicationNumber: string;
  submissionType: string;
  gateway: GatewayType;
  fileName: string;
  fileSize: number;
  checksum: string;
  checksumType: 'md5' | 'sha256';
  submittedAt?: string;
  submittedBy?: string;
}

export interface GatewayAcknowledgment {
  id: string;
  submissionId: string;
  gateway: GatewayType;
  type: AcknowledgmentType;
  status: AcknowledgmentStatus;
  receivedAt: string;
  rawMessage?: string;
  parsedData: ParsedAcknowledgment;
  errors: AcknowledgmentError[];
  warnings: AcknowledgmentWarning[];
}

export interface ParsedAcknowledgment {
  trackingNumber?: string;
  receiptDate?: string;
  applicationNumber?: string;
  submissionType?: string;
  sequenceNumber?: string;
  centerAbbreviation?: string;
  reviewDivision?: string;
  validationStatus?: 'passed' | 'failed' | 'pending';
  technicalValidationComplete?: boolean;
  businessValidationComplete?: boolean;
  nextExpectedAck?: AcknowledgmentType;
  estimatedResponseTime?: string;
}

export interface AcknowledgmentError {
  code: string;
  severity: 'fatal' | 'error';
  message: string;
  location?: string;
  rule?: string;
  suggestedFix?: string;
}

export interface AcknowledgmentWarning {
  code: string;
  message: string;
  location?: string;
  rule?: string;
}

export interface GatewaySubmissionResult {
  success: boolean;
  submissionId: string;
  trackingNumber?: string;
  message: string;
  timestamp: string;
  acknowledgments: GatewayAcknowledgment[];
}

export interface SubmissionTimeline {
  submissionId: string;
  events: TimelineEvent[];
  currentStatus: SubmissionStatus;
  estimatedCompletion?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'submitted' | 'acknowledged' | 'validated' | 'accepted' | 'rejected' | 'error' | 'info';
  title: string;
  description: string;
  acknowledgmentId?: string;
  metadata?: Record<string, string>;
}

// ============================================================================
// FDA ESG ACKNOWLEDGMENT DEFINITIONS
// ============================================================================

export const FDA_ESG_ACKNOWLEDGMENTS = {
  TA1: {
    name: 'Technical Acknowledgment 1',
    description: 'Initial receipt confirmation from ESG',
    expectedWithin: '15 minutes',
    successIndicates: 'File received and queued for processing',
    failureIndicates: 'Transmission error or file corruption',
  },
  TA2: {
    name: 'Technical Acknowledgment 2', 
    description: 'Technical validation complete',
    expectedWithin: '24 hours',
    successIndicates: 'File structure and format validated',
    failureIndicates: 'Technical validation errors (DTD, checksums, etc.)',
  },
  ACK1: {
    name: 'Acknowledgment 1',
    description: 'Business validation initiated',
    expectedWithin: '48 hours',
    successIndicates: 'Submission accepted for business review',
    failureIndicates: 'Critical technical errors preventing review',
  },
  ACK2: {
    name: 'Acknowledgment 2',
    description: 'Business validation complete',
    expectedWithin: '5 business days',
    successIndicates: 'Business rules validated, submission accepted',
    failureIndicates: 'Business rule violations requiring correction',
  },
  ACK3: {
    name: 'Acknowledgment 3',
    description: 'Final acceptance confirmation',
    expectedWithin: '10 business days',
    successIndicates: 'Submission fully accepted into FDA systems',
    failureIndicates: 'Late-stage rejection (rare)',
  },
};

export const EMA_CESP_ACKNOWLEDGMENTS = {
  'CESP-RECEIPT': {
    name: 'Receipt Confirmation',
    description: 'Submission received by CESP gateway',
    expectedWithin: '1 hour',
    successIndicates: 'Package received and queued',
    failureIndicates: 'Upload or transmission failure',
  },
  'CESP-ACCEPT': {
    name: 'Acceptance Notification',
    description: 'Submission validated and accepted',
    expectedWithin: '48 hours',
    successIndicates: 'eCTD validated and forwarded to NCA',
    failureIndicates: 'N/A',
  },
  'CESP-REJECT': {
    name: 'Rejection Notification',
    description: 'Submission rejected due to errors',
    expectedWithin: '48 hours',
    successIndicates: 'N/A',
    failureIndicates: 'Validation errors requiring resubmission',
  },
};

// ============================================================================
// MOCK ACKNOWLEDGMENT MESSAGES
// ============================================================================

const MOCK_TA1_SUCCESS = `<?xml version="1.0" encoding="UTF-8"?>
<acknowledgment type="TA1" status="success">
  <tracking-number>ESG-2024-123456</tracking-number>
  <receipt-date>2024-12-15T10:30:00Z</receipt-date>
  <application-number>NDA-123456</application-number>
  <submission-type>original-application</submission-type>
  <sequence-number>0000</sequence-number>
  <message>Submission received successfully</message>
</acknowledgment>`;

const MOCK_TA2_SUCCESS = `<?xml version="1.0" encoding="UTF-8"?>
<acknowledgment type="TA2" status="success">
  <tracking-number>ESG-2024-123456</tracking-number>
  <validation-date>2024-12-15T14:45:00Z</validation-date>
  <technical-validation>passed</technical-validation>
  <dtd-validation>passed</dtd-validation>
  <checksum-validation>passed</checksum-validation>
  <pdf-validation>passed</pdf-validation>
  <message>Technical validation complete - no errors</message>
</acknowledgment>`;

const MOCK_TA2_ERROR = `<?xml version="1.0" encoding="UTF-8"?>
<acknowledgment type="TA2" status="error">
  <tracking-number>ESG-2024-123456</tracking-number>
  <validation-date>2024-12-15T14:45:00Z</validation-date>
  <technical-validation>failed</technical-validation>
  <errors>
    <error code="DTD-001" severity="fatal">
      <message>Invalid DTD reference in index.xml</message>
      <location>m1/us/index.xml line 3</location>
      <rule>ich-ectd-3-2.dtd required</rule>
    </error>
    <error code="PDF-003" severity="error">
      <message>PDF bookmark validation failed</message>
      <location>m2/25-clin-overview.pdf</location>
      <rule>Bookmarks required for documents >5 pages</rule>
    </error>
  </errors>
  <message>Technical validation failed with 2 errors</message>
</acknowledgment>`;

const MOCK_ACK1_SUCCESS = `<?xml version="1.0" encoding="UTF-8"?>
<acknowledgment type="ACK1" status="success">
  <tracking-number>ESG-2024-123456</tracking-number>
  <receipt-date>2024-12-15T16:00:00Z</receipt-date>
  <center>CDER</center>
  <application-number>NDA-123456</application-number>
  <message>Submission accepted by FDA CDER</message>
</acknowledgment>`;

const MOCK_ACK2_SUCCESS = `<?xml version="1.0" encoding="UTF-8"?>
<acknowledgment type="ACK2" status="success">
  <tracking-number>ESG-2024-123456</tracking-number>
  <validation-date>2024-12-16T09:00:00Z</validation-date>
  <business-validation>passed</business-validation>
  <application-number>NDA-123456</application-number>
  <message>Business validation complete - submission accepted</message>
</acknowledgment>`;

const MOCK_ACK3_SUCCESS = `<?xml version="1.0" encoding="UTF-8"?>
<acknowledgment type="ACK3" status="success">
  <tracking-number>ESG-2024-123456</tracking-number>
  <receipt-date>2024-12-18T10:00:00Z</receipt-date>
  <review-division>Division of Oncology Products 1</review-division>
  <reviewer-assigned>true</reviewer-assigned>
  <application-number>NDA-123456</application-number>
  <message>Review division assigned - submission under review</message>
</acknowledgment>`;

// ============================================================================
// GATEWAY SERVICE CLASS
// ============================================================================

export class GatewayService {
  private acknowledgments: Map<string, GatewayAcknowledgment[]> = new Map();
  private timelines: Map<string, SubmissionTimeline> = new Map();

  // Submit to gateway
  async submitToGateway(
    pkg: SubmissionPackage,
    credentials?: GatewayCredentials
  ): Promise<GatewaySubmissionResult> {
    const submissionId = pkg.id;
    const gateway = pkg.gateway;
    const timestamp = new Date().toISOString();

    // Initialize timeline
    this.timelines.set(submissionId, {
      submissionId,
      events: [{
        id: `evt-${Date.now()}`,
        timestamp,
        type: 'submitted',
        title: 'Submission Sent',
        description: `Package submitted to ${this.getGatewayName(gateway)}`,
        metadata: {
          gateway,
          fileSize: `${(pkg.fileSize / 1024 / 1024).toFixed(1)} MB`,
          checksum: pkg.checksum,
        },
      }],
      currentStatus: 'submitted',
    });

    // Simulate initial acknowledgment (TA1 for FDA, RECEIPT for EMA)
    const initialAck = this.generateInitialAcknowledgment(submissionId, gateway, pkg.applicationNumber);
    this.addAcknowledgment(submissionId, initialAck);

    return {
      success: true,
      submissionId,
      trackingNumber: initialAck.parsedData.trackingNumber,
      message: 'Submission received',
      timestamp,
      acknowledgments: [initialAck],
    };
  }

  // Poll for new acknowledgments
  async pollAcknowledgments(submissionId: string): Promise<GatewayAcknowledgment[]> {
    const existing = this.acknowledgments.get(submissionId) || [];
    const newAcks: GatewayAcknowledgment[] = [];

    if (existing.length === 0) return newAcks;

    const gateway = existing[0].gateway;

    if (gateway === 'fda-esg') {
      const hasTA1 = existing.some(a => a.type === 'TA1');
      const hasTA2 = existing.some(a => a.type === 'TA2');
      const hasACK1 = existing.some(a => a.type === 'ACK1');
      const hasACK2 = existing.some(a => a.type === 'ACK2');
      const hasACK3 = existing.some(a => a.type === 'ACK3');

      // Progress through acknowledgment chain with random delays
      if (hasTA1 && !hasTA2 && Math.random() > 0.3) {
        const ta2 = Math.random() > 0.2 
          ? this.parseTA2Response(MOCK_TA2_SUCCESS, submissionId)
          : this.parseTA2Response(MOCK_TA2_ERROR, submissionId);
        this.addAcknowledgment(submissionId, ta2);
        newAcks.push(ta2);
      }

      // Continue with ACK1, ACK2, ACK3 if TA2 passed
      if (hasTA2 && !hasACK1) {
        const ta2 = existing.find(a => a.type === 'TA2');
        if (ta2?.status === 'success' && Math.random() > 0.5) {
          const ack1 = this.generateACK1(submissionId);
          this.addAcknowledgment(submissionId, ack1);
          newAcks.push(ack1);
        }
      }

      if (hasACK1 && !hasACK2 && Math.random() > 0.6) {
        const ack2 = this.generateACK2(submissionId);
        this.addAcknowledgment(submissionId, ack2);
        newAcks.push(ack2);
      }

      if (hasACK2 && !hasACK3 && Math.random() > 0.7) {
        const ack3 = this.generateACK3(submissionId);
        this.addAcknowledgment(submissionId, ack3);
        newAcks.push(ack3);
      }
    }

    return newAcks;
  }

  // Get submission timeline
  getTimeline(submissionId: string): SubmissionTimeline | undefined {
    return this.timelines.get(submissionId);
  }

  // Get all acknowledgments for a submission
  getAcknowledgments(submissionId: string): GatewayAcknowledgment[] {
    return this.acknowledgments.get(submissionId) || [];
  }

  // Get current submission status based on acknowledgments
  getSubmissionStatus(submissionId: string): SubmissionStatus {
    const acks = this.acknowledgments.get(submissionId) || [];
    
    if (acks.length === 0) return 'draft';
    
    // Check for any fatal errors
    const hasError = acks.some(a => a.status === 'error');
    if (hasError) return 'rejected';

    // Check progress through acknowledgment chain
    const types = acks.map(a => a.type);
    
    if (types.includes('ACK3') || types.includes('CESP-ACCEPT')) return 'acknowledged';
    if (types.includes('ACK2')) return 'validated';
    if (types.includes('ACK1') || types.includes('TA2')) return 'validating';
    if (types.includes('TA1') || types.includes('CESP-RECEIPT')) return 'submitted';
    
    return 'submitted';
  }

  // Add acknowledgment and update timeline
  private addAcknowledgment(submissionId: string, ack: GatewayAcknowledgment): void {
    const existing = this.acknowledgments.get(submissionId) || [];
    existing.push(ack);
    this.acknowledgments.set(submissionId, existing);

    // Update timeline
    const timeline = this.timelines.get(submissionId);
    if (timeline) {
      timeline.events.push({
        id: `evt-${Date.now()}`,
        timestamp: ack.receivedAt,
        type: ack.status === 'error' ? 'error' : 'acknowledged',
        title: this.getAckTitle(ack.type),
        description: ack.status === 'error' 
          ? `Validation failed with ${ack.errors.length} error(s)`
          : `${this.getAckTitle(ack.type)} received successfully`,
        acknowledgmentId: ack.id,
      });
      timeline.currentStatus = this.getSubmissionStatus(submissionId);
    }
  }

  // Generate initial acknowledgment
  private generateInitialAcknowledgment(
    submissionId: string, 
    gateway: GatewayType,
    applicationNumber: string
  ): GatewayAcknowledgment {
    if (gateway === 'fda-esg') {
      return this.parseTA1Response(MOCK_TA1_SUCCESS, submissionId);
    } else if (gateway === 'ema-cesp') {
      return {
        id: `ack-${Date.now()}-cesp-receipt`,
        submissionId,
        gateway: 'ema-cesp',
        type: 'CESP-RECEIPT',
        status: 'success',
        receivedAt: new Date().toISOString(),
        parsedData: {
          trackingNumber: `CESP-${Date.now().toString(36).toUpperCase()}`,
          receiptDate: new Date().toISOString(),
          applicationNumber,
          nextExpectedAck: 'CESP-ACCEPT',
          estimatedResponseTime: '48 hours',
        },
        errors: [],
        warnings: [],
      };
    }
    
    // Generic gateway
    return {
      id: `ack-${Date.now()}-received`,
      submissionId,
      gateway,
      type: 'RECEIVED',
      status: 'success',
      receivedAt: new Date().toISOString(),
      parsedData: {
        trackingNumber: `TRK-${Date.now().toString(36).toUpperCase()}`,
        receiptDate: new Date().toISOString(),
        applicationNumber,
      },
      errors: [],
      warnings: [],
    };
  }

  // Parse TA1 response
  private parseTA1Response(xml: string, submissionId: string): GatewayAcknowledgment {
    const trackingMatch = xml.match(/<tracking-number>([^<]+)<\/tracking-number>/);
    const dateMatch = xml.match(/<receipt-date>([^<]+)<\/receipt-date>/);
    const appMatch = xml.match(/<application-number>([^<]+)<\/application-number>/);
    
    return {
      id: `ack-${Date.now()}-ta1`,
      submissionId,
      gateway: 'fda-esg',
      type: 'TA1',
      status: 'success',
      receivedAt: new Date().toISOString(),
      rawMessage: xml,
      parsedData: {
        trackingNumber: trackingMatch?.[1] || `ESG-${Date.now()}`,
        receiptDate: dateMatch?.[1] || new Date().toISOString(),
        applicationNumber: appMatch?.[1],
        nextExpectedAck: 'TA2',
        estimatedResponseTime: '24 hours',
      },
      errors: [],
      warnings: [],
    };
  }

  // Parse TA2 response
  private parseTA2Response(xml: string, submissionId: string): GatewayAcknowledgment {
    const isError = xml.includes('status="error"');
    const errors: AcknowledgmentError[] = [];
    
    if (isError) {
      // Parse errors from XML using Array.from for compatibility
      const errorRegex = /<error code="([^"]+)" severity="([^"]+)">\s*<message>([^<]+)<\/message>\s*<location>([^<]+)<\/location>\s*<rule>([^<]+)<\/rule>/g;
      const errorMatches = Array.from(xml.matchAll(errorRegex));
      for (const match of errorMatches) {
        errors.push({
          code: match[1],
          severity: match[2] as 'fatal' | 'error',
          message: match[3],
          location: match[4],
          rule: match[5],
        });
      }
    }

    return {
      id: `ack-${Date.now()}-ta2`,
      submissionId,
      gateway: 'fda-esg',
      type: 'TA2',
      status: isError ? 'error' : 'success',
      receivedAt: new Date().toISOString(),
      rawMessage: xml,
      parsedData: {
        validationStatus: isError ? 'failed' : 'passed',
        technicalValidationComplete: true,
        nextExpectedAck: isError ? undefined : 'ACK1',
        estimatedResponseTime: isError ? undefined : '48 hours',
      },
      errors,
      warnings: [],
    };
  }

  // Generate ACK1
  private generateACK1(submissionId: string): GatewayAcknowledgment {
    return {
      id: `ack-${Date.now()}-ack1`,
      submissionId,
      gateway: 'fda-esg',
      type: 'ACK1',
      status: 'success',
      receivedAt: new Date().toISOString(),
      rawMessage: MOCK_ACK1_SUCCESS,
      parsedData: {
        centerAbbreviation: 'CDER',
        nextExpectedAck: 'ACK2',
        estimatedResponseTime: '5 business days',
      },
      errors: [],
      warnings: [],
    };
  }

  // Generate ACK2
  private generateACK2(submissionId: string): GatewayAcknowledgment {
    return {
      id: `ack-${Date.now()}-ack2`,
      submissionId,
      gateway: 'fda-esg',
      type: 'ACK2',
      status: 'success',
      receivedAt: new Date().toISOString(),
      rawMessage: MOCK_ACK2_SUCCESS,
      parsedData: {
        businessValidationComplete: true,
        nextExpectedAck: 'ACK3',
        estimatedResponseTime: '10 business days',
      },
      errors: [],
      warnings: [],
    };
  }

  // Generate ACK3
  private generateACK3(submissionId: string): GatewayAcknowledgment {
    return {
      id: `ack-${Date.now()}-ack3`,
      submissionId,
      gateway: 'fda-esg',
      type: 'ACK3',
      status: 'success',
      receivedAt: new Date().toISOString(),
      rawMessage: MOCK_ACK3_SUCCESS,
      parsedData: {
        reviewDivision: 'Division of Oncology Products 1',
        nextExpectedAck: undefined,
      },
      errors: [],
      warnings: [],
    };
  }

  // Helper methods
  private getGatewayName(gateway: GatewayType): string {
    const names: Record<GatewayType, string> = {
      'fda-esg': 'FDA Electronic Submissions Gateway',
      'ema-cesp': 'EMA Common European Submission Portal',
      'hc-ctr': 'Health Canada CTR',
      'pmda-gateway': 'PMDA Gateway',
    };
    return names[gateway] || gateway;
  }

  private getAckTitle(type: AcknowledgmentType): string {
    const titles: Record<AcknowledgmentType, string> = {
      'TA1': 'Technical Acknowledgment 1 (TA1)',
      'TA2': 'Technical Acknowledgment 2 (TA2)',
      'ACK1': 'Acknowledgment 1 (ACK1)',
      'ACK2': 'Acknowledgment 2 (ACK2)',
      'ACK3': 'Acknowledgment 3 (ACK3)',
      'CESP-RECEIPT': 'CESP Receipt Confirmation',
      'CESP-ACCEPT': 'CESP Acceptance',
      'CESP-REJECT': 'CESP Rejection',
      'RECEIVED': 'Submission Received',
      'VALIDATED': 'Validation Complete',
      'ACCEPTED': 'Submission Accepted',
      'REJECTED': 'Submission Rejected',
      'PROCESSING': 'Processing',
    };
    return titles[type] || type;
  }
}

// Singleton instance for shared state
export const gatewayService = new GatewayService();
