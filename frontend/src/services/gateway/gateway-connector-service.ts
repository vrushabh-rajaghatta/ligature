
// =============================================================================
// GATEWAY CONNECTOR SERVICE - v0.9.16
// =============================================================================
// Implementation of gateway connectors for FDA ESG and EMA CESP.
// Provides mock layer for demo/development with realistic response simulation.
// Production-ready structure awaiting only credentials for live operation.
// =============================================================================

import { logger } from '@/lib/logger';
import {
  type GatewayId,
  type GatewayEnvironment,
  type ConnectionStatus,
  type TransmissionStatus,
  type AnyGatewayCredentials,
  type FDAESGCredentials,
  type EMACESPCredentials,
  type ConnectionState,
  type ConnectionError,
  type HealthCheckResult,
  type HealthCheckItem,
  type TransmissionRequest,
  type TransmissionResult,
  type TransmissionProgress,
  type TransmissionPhase,
  type TransmissionError,
  type GatewayAcknowledgement,
  type NormalizedAckType,
  type AckMessage,
  type IGatewayConnector,
  type ServiceStatus,
  type ServiceHealth,
  type PackageValidationResult,
  type ValidationIssue,
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
  generateGatewayId,
  GATEWAY_REGISTRY,
} from './gateway-connector-types';
import type { RegulatoryRegion } from '../../store/ectd-regional-types';

// =============================================================================
// BASE GATEWAY CONNECTOR (Abstract)
// =============================================================================

export abstract class BaseGatewayConnector implements IGatewayConnector {
  abstract readonly gatewayId: GatewayId;
  abstract readonly displayName: string;
  abstract readonly region: RegulatoryRegion;
  
  protected credentials: AnyGatewayCredentials | null = null;
  protected connectionState: ConnectionState;
  protected useMockMode: boolean = true; // Enable mock mode until real credentials
  
  constructor() {
    this.connectionState = this.createInitialConnectionState();
  }
  
  protected abstract createInitialConnectionState(): ConnectionState;
  
  // Connection management
  abstract connect(credentials: AnyGatewayCredentials): Promise<ConnectionState>;
  abstract disconnect(): Promise<void>;
  
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }
  
  isConnected(): boolean {
    return this.connectionState.status === 'connected' || 
           this.connectionState.status === 'authenticated';
  }
  
  // Health & status
  abstract checkHealth(): Promise<HealthCheckResult>;
  abstract getServiceStatus(): Promise<ServiceStatus>;
  
  // Transmission
  abstract transmit(request: TransmissionRequest): Promise<TransmissionResult>;
  
  async cancelTransmission(transmissionId: string): Promise<boolean> {
    // Base implementation - override in subclasses if gateway supports cancellation
    /* Cancel requested */
    return false;
  }
  
  async getTransmissionStatus(transmissionId: string): Promise<TransmissionProgress> {
    // Return mock progress - override for real implementations
    return {
      transmissionId,
      status: 'queued',
      phase: 'initializing',
      progressPercent: 0,
      bytesTransmitted: 0,
      totalBytes: 0,
      currentStep: 'Queued for transmission',
      startedAt: new Date().toISOString(),
    };
  }
  
  // Acknowledgements
  abstract fetchAcknowledgements(trackingNumber: string): Promise<GatewayAcknowledgement[]>;
  abstract pollForAcknowledgement(transmissionId: string, timeoutMs?: number): Promise<GatewayAcknowledgement>;
  
  // Validation
  async validatePackage(packagePath: string): Promise<PackageValidationResult> {
    // Base validation - subclasses can add gateway-specific checks
    const now = new Date().toISOString();
    
    // Simulate validation
    await this.simulateDelay(500, 1500);
    
    return {
      isValid: true,
      packagePath,
      validatedAt: now,
      structureValid: true,
      checksumValid: true,
      xmlValid: true,
      pdfChecks: {
        passed: 25,
        failed: 0,
        warnings: 2,
      },
      errors: [],
      warnings: [
        {
          code: 'PDF-W001',
          severity: 'warning',
          message: 'Bookmark depth exceeds recommended 4 levels',
          location: 'm2/25-clin-overview.pdf',
        },
        {
          code: 'PDF-W002',
          severity: 'warning',
          message: 'Document contains form fields that may not render in all viewers',
          location: 'm1/us/form-356h.pdf',
        },
      ],
      readyForSubmission: true,
    };
  }
  
  // Utility methods
  protected async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  protected generateTrackingNumber(): string {
    const prefix = this.gatewayId === 'fda-esg' ? 'ESG' : 
                   this.gatewayId === 'ema-cesp' ? 'CESP' : 'TRK';
    return `${prefix}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  
  protected updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = {
      ...this.connectionState,
      ...updates,
      lastActivityAt: new Date().toISOString(),
    };
  }
}

// =============================================================================
// FDA ESG CONNECTOR
// =============================================================================

export class FDAESGConnector extends BaseGatewayConnector {
  readonly gatewayId: GatewayId = 'fda-esg';
  readonly displayName = 'FDA Electronic Submissions Gateway';
  readonly region: RegulatoryRegion = 'US';
  
  private activeTransmissions: Map<string, TransmissionProgress> = new Map();
  
  protected createInitialConnectionState(): ConnectionState {
    return {
      gatewayId: 'fda-esg',
      environment: 'test',
      status: 'disconnected',
      isAuthenticated: false,
      consecutiveFailures: 0,
    };
  }
  
  async connect(credentials: AnyGatewayCredentials): Promise<ConnectionState> {
    if (credentials.gatewayId !== 'fda-esg') {
      throw new Error('Invalid credentials type for FDA ESG');
    }
    
    const fdaCredentials = credentials as FDAESGCredentials;
    this.credentials = fdaCredentials;
    
    this.updateConnectionState({
      status: 'connecting',
      environment: fdaCredentials.environment,
    });
    
    // Simulate connection process
    await this.simulateDelay(1000, 2000);
    
    if (this.useMockMode || !fdaCredentials.as2Id) {
      // Mock connection success
      this.updateConnectionState({
        status: 'authenticated',
        isAuthenticated: true,
        authMethod: 'certificate',
        connectedAt: new Date().toISOString(),
        sessionId: `fda-session-${Date.now()}`,
        consecutiveFailures: 0,
      });
    } else {
      // Real connection would happen here
      // For now, treat as mock
      this.updateConnectionState({
        status: 'authenticated',
        isAuthenticated: true,
        authMethod: 'certificate',
        connectedAt: new Date().toISOString(),
      });
    }
    
    return this.getConnectionState();
  }
  
  async disconnect(): Promise<void> {
    await this.simulateDelay(200, 500);
    
    this.updateConnectionState({
      status: 'disconnected',
      isAuthenticated: false,
      sessionId: undefined,
      connectedAt: undefined,
    });
    
    this.credentials = null;
  }
  
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: HealthCheckItem[] = [];
    
    // Simulate health checks
    await this.simulateDelay(500, 1500);
    
    const checkEndpoint = async (name: string): Promise<HealthCheckItem> => {
      const checkStart = Date.now();
      await this.simulateDelay(100, 300);
      return {
        name,
        status: 'pass',
        message: `${name} responding normally`,
        durationMs: Date.now() - checkStart,
        timestamp: new Date().toISOString(),
      };
    };
    
    checks.push(await checkEndpoint('AS2 Endpoint'));
    checks.push(await checkEndpoint('Acknowledgement Service'));
    checks.push(await checkEndpoint('Status Query Service'));
    checks.push(await checkEndpoint('Certificate Validation'));
    
    const totalLatency = Date.now() - startTime;
    const isHealthy = checks.every(c => c.status === 'pass');
    
    const result: HealthCheckResult = {
      gatewayId: 'fda-esg',
      environment: this.connectionState.environment,
      timestamp: new Date().toISOString(),
      isHealthy,
      latencyMs: totalLatency,
      status: isHealthy ? 'connected' : 'error',
      checks,
      serviceAvailability: {
        submission: true,
        acknowledgement: true,
        status: true,
      },
    };
    
    this.updateConnectionState({
      lastHealthCheck: result,
      nextHealthCheckAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    });
    
    return result;
  }
  
  async getServiceStatus(): Promise<ServiceStatus> {
    await this.simulateDelay(200, 500);
    
    return {
      gatewayId: 'fda-esg',
      timestamp: new Date().toISOString(),
      overallStatus: 'operational',
      services: {
        submission: {
          name: 'AS2 Submission Endpoint',
          status: 'operational',
          latencyMs: 150,
          lastChecked: new Date().toISOString(),
        },
        acknowledgement: {
          name: 'Acknowledgement Processing',
          status: 'operational',
          latencyMs: 200,
          lastChecked: new Date().toISOString(),
        },
        validation: {
          name: 'Technical Validation Service',
          status: 'operational',
          latencyMs: 180,
          lastChecked: new Date().toISOString(),
        },
        statusQuery: {
          name: 'Status Query API',
          status: 'operational',
          latencyMs: 120,
          lastChecked: new Date().toISOString(),
        },
      },
      announcements: [
        {
          id: 'ann-1',
          type: 'info',
          title: 'Planned Maintenance',
          message: 'Scheduled maintenance window: Saturday 2am-6am EST',
          startTime: this.getNextSaturday(),
          affectedServices: ['submission', 'acknowledgement'],
        },
      ],
    };
  }
  
  async transmit(request: TransmissionRequest): Promise<TransmissionResult> {
    const transmissionId = request.id || generateGatewayId.transmission();
    const startedAt = new Date().toISOString();
    
    // Initialize progress tracking
    const progress: TransmissionProgress = {
      transmissionId,
      status: 'preparing',
      phase: 'initializing',
      progressPercent: 0,
      bytesTransmitted: 0,
      totalBytes: request.package.fileSizeBytes,
      currentStep: 'Initializing transmission...',
      startedAt,
    };
    
    this.activeTransmissions.set(transmissionId, progress);
    
    try {
      // Phase 1: Authentication
      await this.updateProgress(transmissionId, {
        phase: 'authenticating',
        progressPercent: 10,
        currentStep: 'Validating AS2 certificate...',
      });
      await this.simulateDelay(500, 1000);
      
      // Phase 2: Prepare package
      await this.updateProgress(transmissionId, {
        phase: 'preparing-package',
        progressPercent: 25,
        currentStep: 'Preparing AS2 message envelope...',
      });
      await this.simulateDelay(1000, 2000);
      
      // Phase 3: Upload
      await this.updateProgress(transmissionId, {
        status: 'uploading',
        phase: 'uploading',
        progressPercent: 40,
        currentStep: 'Transmitting to FDA ESG...',
      });
      
      // Simulate upload progress
      for (let pct = 40; pct <= 80; pct += 10) {
        await this.simulateDelay(500, 1000);
        await this.updateProgress(transmissionId, {
          progressPercent: pct,
          bytesTransmitted: Math.floor((pct / 100) * request.package.fileSizeBytes),
          currentStep: `Uploading... ${pct}%`,
        });
        request.onProgress?.(this.activeTransmissions.get(transmissionId)!);
      }
      
      // Phase 4: Wait for TA1 (immediate acknowledgement)
      await this.updateProgress(transmissionId, {
        status: 'transmitted',
        phase: 'waiting-acknowledgement',
        progressPercent: 85,
        currentStep: 'Waiting for Technical Acknowledgement 1 (TA1)...',
      });
      await this.simulateDelay(1000, 2000);
      
      // Generate mock TA1 acknowledgement
      const trackingNumber = this.generateTrackingNumber();
      const ta1Ack = this.generateTA1Acknowledgement(transmissionId, trackingNumber, request);
      
      // Phase 5: Complete
      await this.updateProgress(transmissionId, {
        status: 'acknowledged',
        phase: 'complete',
        progressPercent: 100,
        currentStep: 'TA1 received - transmission complete',
      });
      
      const result: TransmissionResult = {
        transmissionId,
        packageId: request.package.id,
        gatewayId: 'fda-esg',
        success: true,
        status: 'acknowledged',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        gatewayTransactionId: `FDA-TXN-${Date.now()}`,
        gatewayTrackingNumber: trackingNumber,
        gatewayTimestamp: new Date().toISOString(),
        acknowledgement: ta1Ack,
        attemptNumber: 1,
        retriesRemaining: request.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts - 1,
      };
      
      request.onComplete?.(result);
      this.activeTransmissions.delete(transmissionId);
      
      return result;
      
    } catch (error) {
      const transmissionError: TransmissionError = {
        code: 'TRANSMISSION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        category: 'network',
        isRetryable: true,
      };
      
      const result: TransmissionResult = {
        transmissionId,
        packageId: request.package.id,
        gatewayId: 'fda-esg',
        success: false,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        error: transmissionError,
        attemptNumber: 1,
        retriesRemaining: request.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts - 1,
      };
      
      this.activeTransmissions.delete(transmissionId);
      return result;
    }
  }
  
  async getTransmissionStatus(transmissionId: string): Promise<TransmissionProgress> {
    const progress = this.activeTransmissions.get(transmissionId);
    if (progress) {
      return { ...progress };
    }
    
    // Return completed status for past transmissions
    return {
      transmissionId,
      status: 'acknowledged',
      phase: 'complete',
      progressPercent: 100,
      bytesTransmitted: 0,
      totalBytes: 0,
      currentStep: 'Transmission complete',
      startedAt: new Date().toISOString(),
    };
  }
  
  async fetchAcknowledgements(trackingNumber: string): Promise<GatewayAcknowledgement[]> {
    await this.simulateDelay(500, 1000);
    
    // Generate mock acknowledgement chain for FDA
    const now = new Date();
    const acks: GatewayAcknowledgement[] = [];
    
    // TA1 - always present if tracking number exists
    acks.push({
      id: generateGatewayId.acknowledgement(),
      transmissionId: '',
      gatewayId: 'fda-esg',
      type: 'receipt',
      originalType: 'TA1',
      status: 'success',
      receivedAt: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
      gatewayTimestamp: new Date(now.getTime() - 3600000).toISOString(),
      trackingNumber,
      messages: [
        {
          severity: 'info',
          code: 'TA1-001',
          message: 'Submission received successfully by FDA ESG',
        },
      ],
      nextExpectedAck: {
        type: 'TA2',
        expectedWithin: '24 hours',
      },
    });
    
    // TA2 - add if enough time has passed (simulated)
    if (Math.random() > 0.3) {
      acks.push({
        id: generateGatewayId.acknowledgement(),
        transmissionId: '',
        gatewayId: 'fda-esg',
        type: 'technical',
        originalType: 'TA2',
        status: 'success',
        receivedAt: new Date(now.getTime() - 1800000).toISOString(), // 30 min ago
        gatewayTimestamp: new Date(now.getTime() - 1800000).toISOString(),
        trackingNumber,
        validationPassed: true,
        technicalValidation: {
          passed: true,
          completedAt: new Date(now.getTime() - 1800000).toISOString(),
          checksPerformed: 15,
          checksPassed: 15,
          checksFailed: 0,
        },
        messages: [
          {
            severity: 'info',
            code: 'TA2-001',
            message: 'Technical validation complete - no errors found',
          },
        ],
        nextExpectedAck: {
          type: 'ACK1',
          expectedWithin: '48 hours',
        },
      });
    }
    
    return acks;
  }
  
  async pollForAcknowledgement(
    transmissionId: string, 
    timeoutMs: number = 60000
  ): Promise<GatewayAcknowledgement> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      await this.simulateDelay(2000, 5000);
      
      // Return mock acknowledgement
      return {
        id: generateGatewayId.acknowledgement(),
        transmissionId,
        gatewayId: 'fda-esg',
        type: 'receipt',
        originalType: 'TA1',
        status: 'success',
        receivedAt: new Date().toISOString(),
        gatewayTimestamp: new Date().toISOString(),
        trackingNumber: this.generateTrackingNumber(),
        messages: [
          {
            severity: 'info',
            code: 'TA1-001',
            message: 'Submission received successfully',
          },
        ],
        nextExpectedAck: {
          type: 'TA2',
          expectedWithin: '24 hours',
        },
      };
    }
    
    throw new Error('Timeout waiting for acknowledgement');
  }
  
  // Private helper methods
  private async updateProgress(
    transmissionId: string, 
    updates: Partial<TransmissionProgress>
  ): Promise<void> {
    const current = this.activeTransmissions.get(transmissionId);
    if (current) {
      this.activeTransmissions.set(transmissionId, {
        ...current,
        ...updates,
      });
    }
  }
  
  private generateTA1Acknowledgement(
    transmissionId: string,
    trackingNumber: string,
    request: TransmissionRequest
  ): GatewayAcknowledgement {
    return {
      id: generateGatewayId.acknowledgement(),
      transmissionId,
      gatewayId: 'fda-esg',
      type: 'receipt',
      originalType: 'TA1',
      status: 'success',
      receivedAt: new Date().toISOString(),
      gatewayTimestamp: new Date().toISOString(),
      trackingNumber,
      acknowledgementNumber: `ACK-${trackingNumber}`,
      applicationNumber: request.package.applicationNumber,
      sequenceNumber: request.package.sequenceNumber,
      messages: [
        {
          severity: 'info',
          code: 'TA1-001',
          message: 'Submission received successfully by FDA Electronic Submissions Gateway',
        },
        {
          severity: 'info',
          code: 'TA1-002',
          message: `Tracking number assigned: ${trackingNumber}`,
        },
      ],
      nextExpectedAck: {
        type: 'TA2',
        expectedWithin: '24 hours',
      },
    };
  }
  
  private getNextSaturday(): string {
    const now = new Date();
    const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
    const nextSat = new Date(now);
    nextSat.setDate(now.getDate() + daysUntilSat);
    nextSat.setHours(2, 0, 0, 0);
    return nextSat.toISOString();
  }
}

// =============================================================================
// EMA CESP CONNECTOR
// =============================================================================

export class EMACESPConnector extends BaseGatewayConnector {
  readonly gatewayId: GatewayId = 'ema-cesp';
  readonly displayName = 'EMA Common European Submission Portal';
  readonly region: RegulatoryRegion = 'EU';
  
  private activeTransmissions: Map<string, TransmissionProgress> = new Map();
  
  protected createInitialConnectionState(): ConnectionState {
    return {
      gatewayId: 'ema-cesp',
      environment: 'test',
      status: 'disconnected',
      isAuthenticated: false,
      consecutiveFailures: 0,
    };
  }
  
  async connect(credentials: AnyGatewayCredentials): Promise<ConnectionState> {
    if (credentials.gatewayId !== 'ema-cesp') {
      throw new Error('Invalid credentials type for EMA CESP');
    }
    
    const emaCredentials = credentials as EMACESPCredentials;
    this.credentials = emaCredentials;
    
    this.updateConnectionState({
      status: 'connecting',
      environment: emaCredentials.environment,
    });
    
    // Simulate OAuth2 flow
    await this.simulateDelay(1500, 2500);
    
    if (this.useMockMode || !emaCredentials.oauthClientId) {
      // Mock connection success
      const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      
      this.updateConnectionState({
        status: 'authenticated',
        isAuthenticated: true,
        authMethod: 'oauth',
        connectedAt: new Date().toISOString(),
        sessionId: `cesp-session-${Date.now()}`,
        tokenExpiry: tokenExpiry.toISOString(),
        consecutiveFailures: 0,
      });
    } else {
      // Real OAuth2 would happen here
      this.updateConnectionState({
        status: 'authenticated',
        isAuthenticated: true,
        authMethod: 'oauth',
        connectedAt: new Date().toISOString(),
      });
    }
    
    return this.getConnectionState();
  }
  
  async disconnect(): Promise<void> {
    await this.simulateDelay(200, 500);
    
    this.updateConnectionState({
      status: 'disconnected',
      isAuthenticated: false,
      sessionId: undefined,
      connectedAt: undefined,
      tokenExpiry: undefined,
    });
    
    this.credentials = null;
  }
  
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: HealthCheckItem[] = [];
    
    await this.simulateDelay(500, 1500);
    
    const checkEndpoint = async (name: string): Promise<HealthCheckItem> => {
      const checkStart = Date.now();
      await this.simulateDelay(100, 300);
      return {
        name,
        status: 'pass',
        message: `${name} responding normally`,
        durationMs: Date.now() - checkStart,
        timestamp: new Date().toISOString(),
      };
    };
    
    checks.push(await checkEndpoint('REST API Endpoint'));
    checks.push(await checkEndpoint('OAuth2 Token Service'));
    checks.push(await checkEndpoint('File Upload Service'));
    checks.push(await checkEndpoint('Notification Service'));
    
    const totalLatency = Date.now() - startTime;
    const isHealthy = checks.every(c => c.status === 'pass');
    
    const result: HealthCheckResult = {
      gatewayId: 'ema-cesp',
      environment: this.connectionState.environment,
      timestamp: new Date().toISOString(),
      isHealthy,
      latencyMs: totalLatency,
      status: isHealthy ? 'connected' : 'error',
      checks,
      serviceAvailability: {
        submission: true,
        acknowledgement: true,
        status: true,
      },
    };
    
    this.updateConnectionState({
      lastHealthCheck: result,
      nextHealthCheckAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    
    return result;
  }
  
  async getServiceStatus(): Promise<ServiceStatus> {
    await this.simulateDelay(200, 500);
    
    return {
      gatewayId: 'ema-cesp',
      timestamp: new Date().toISOString(),
      overallStatus: 'operational',
      services: {
        submission: {
          name: 'CESP Submission API',
          status: 'operational',
          latencyMs: 180,
          lastChecked: new Date().toISOString(),
        },
        acknowledgement: {
          name: 'Acknowledgement Service',
          status: 'operational',
          latencyMs: 150,
          lastChecked: new Date().toISOString(),
        },
        validation: {
          name: 'eCTD Validation Service',
          status: 'operational',
          latencyMs: 220,
          lastChecked: new Date().toISOString(),
        },
        statusQuery: {
          name: 'Status API',
          status: 'operational',
          latencyMs: 100,
          lastChecked: new Date().toISOString(),
        },
      },
    };
  }
  
  async transmit(request: TransmissionRequest): Promise<TransmissionResult> {
    const transmissionId = request.id || generateGatewayId.transmission();
    const startedAt = new Date().toISOString();
    
    const progress: TransmissionProgress = {
      transmissionId,
      status: 'preparing',
      phase: 'initializing',
      progressPercent: 0,
      bytesTransmitted: 0,
      totalBytes: request.package.fileSizeBytes,
      currentStep: 'Initializing CESP submission...',
      startedAt,
    };
    
    this.activeTransmissions.set(transmissionId, progress);
    
    try {
      // Phase 1: Authentication
      await this.updateProgress(transmissionId, {
        phase: 'authenticating',
        progressPercent: 10,
        currentStep: 'Validating OAuth2 token...',
      });
      await this.simulateDelay(500, 1000);
      
      // Phase 2: Prepare submission
      await this.updateProgress(transmissionId, {
        phase: 'preparing-package',
        progressPercent: 20,
        currentStep: 'Creating submission request...',
      });
      await this.simulateDelay(800, 1500);
      
      // Phase 3: Upload to CESP
      await this.updateProgress(transmissionId, {
        status: 'uploading',
        phase: 'uploading',
        progressPercent: 35,
        currentStep: 'Uploading to CESP...',
      });
      
      // Simulate chunked upload
      for (let pct = 35; pct <= 85; pct += 10) {
        await this.simulateDelay(400, 800);
        await this.updateProgress(transmissionId, {
          progressPercent: pct,
          bytesTransmitted: Math.floor((pct / 100) * request.package.fileSizeBytes),
          currentStep: `Uploading package... ${pct}%`,
        });
        request.onProgress?.(this.activeTransmissions.get(transmissionId)!);
      }
      
      // Phase 4: Wait for CESP-RECEIPT
      await this.updateProgress(transmissionId, {
        status: 'transmitted',
        phase: 'waiting-acknowledgement',
        progressPercent: 90,
        currentStep: 'Waiting for CESP receipt confirmation...',
      });
      await this.simulateDelay(1000, 2000);
      
      // Generate CESP-RECEIPT acknowledgement
      const trackingNumber = this.generateTrackingNumber();
      const receiptAck = this.generateCESPReceiptAcknowledgement(transmissionId, trackingNumber, request);
      
      // Phase 5: Complete
      await this.updateProgress(transmissionId, {
        status: 'acknowledged',
        phase: 'complete',
        progressPercent: 100,
        currentStep: 'CESP-RECEIPT received - submission confirmed',
      });
      
      const result: TransmissionResult = {
        transmissionId,
        packageId: request.package.id,
        gatewayId: 'ema-cesp',
        success: true,
        status: 'acknowledged',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        gatewayTransactionId: `CESP-TXN-${Date.now()}`,
        gatewayTrackingNumber: trackingNumber,
        gatewayTimestamp: new Date().toISOString(),
        acknowledgement: receiptAck,
        attemptNumber: 1,
        retriesRemaining: request.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts - 1,
      };
      
      request.onComplete?.(result);
      this.activeTransmissions.delete(transmissionId);
      
      return result;
      
    } catch (error) {
      const transmissionError: TransmissionError = {
        code: 'TRANSMISSION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        category: 'network',
        isRetryable: true,
      };
      
      const result: TransmissionResult = {
        transmissionId,
        packageId: request.package.id,
        gatewayId: 'ema-cesp',
        success: false,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
        error: transmissionError,
        attemptNumber: 1,
        retriesRemaining: request.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts - 1,
      };
      
      this.activeTransmissions.delete(transmissionId);
      return result;
    }
  }
  
  async getTransmissionStatus(transmissionId: string): Promise<TransmissionProgress> {
    const progress = this.activeTransmissions.get(transmissionId);
    if (progress) {
      return { ...progress };
    }
    
    return {
      transmissionId,
      status: 'acknowledged',
      phase: 'complete',
      progressPercent: 100,
      bytesTransmitted: 0,
      totalBytes: 0,
      currentStep: 'Transmission complete',
      startedAt: new Date().toISOString(),
    };
  }
  
  async fetchAcknowledgements(trackingNumber: string): Promise<GatewayAcknowledgement[]> {
    await this.simulateDelay(500, 1000);
    
    const now = new Date();
    const acks: GatewayAcknowledgement[] = [];
    
    // CESP-RECEIPT
    acks.push({
      id: generateGatewayId.acknowledgement(),
      transmissionId: '',
      gatewayId: 'ema-cesp',
      type: 'receipt',
      originalType: 'CESP-RECEIPT',
      status: 'success',
      receivedAt: new Date(now.getTime() - 3600000).toISOString(),
      gatewayTimestamp: new Date(now.getTime() - 3600000).toISOString(),
      trackingNumber,
      messages: [
        {
          severity: 'info',
          code: 'CESP-001',
          message: 'Submission received and queued for validation',
        },
      ],
      nextExpectedAck: {
        type: 'CESP-ACCEPT',
        expectedWithin: '48 hours',
      },
    });
    
    // CESP-ACCEPT (if validation passed)
    if (Math.random() > 0.3) {
      acks.push({
        id: generateGatewayId.acknowledgement(),
        transmissionId: '',
        gatewayId: 'ema-cesp',
        type: 'accepted',
        originalType: 'CESP-ACCEPT',
        status: 'success',
        receivedAt: new Date(now.getTime() - 1800000).toISOString(),
        gatewayTimestamp: new Date(now.getTime() - 1800000).toISOString(),
        trackingNumber,
        validationPassed: true,
        technicalValidation: {
          passed: true,
          completedAt: new Date(now.getTime() - 1800000).toISOString(),
          checksPerformed: 20,
          checksPassed: 20,
          checksFailed: 0,
        },
        businessValidation: {
          passed: true,
          completedAt: new Date(now.getTime() - 1800000).toISOString(),
          checksPerformed: 10,
          checksPassed: 10,
          checksFailed: 0,
        },
        messages: [
          {
            severity: 'info',
            code: 'CESP-002',
            message: 'Submission validated and forwarded to National Competent Authority',
          },
        ],
      });
    }
    
    return acks;
  }
  
  async pollForAcknowledgement(
    transmissionId: string, 
    timeoutMs: number = 60000
  ): Promise<GatewayAcknowledgement> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      await this.simulateDelay(2000, 5000);
      
      return {
        id: generateGatewayId.acknowledgement(),
        transmissionId,
        gatewayId: 'ema-cesp',
        type: 'receipt',
        originalType: 'CESP-RECEIPT',
        status: 'success',
        receivedAt: new Date().toISOString(),
        gatewayTimestamp: new Date().toISOString(),
        trackingNumber: this.generateTrackingNumber(),
        messages: [
          {
            severity: 'info',
            code: 'CESP-001',
            message: 'Submission received by CESP',
          },
        ],
        nextExpectedAck: {
          type: 'CESP-ACCEPT',
          expectedWithin: '48 hours',
        },
      };
    }
    
    throw new Error('Timeout waiting for acknowledgement');
  }
  
  // Private helper methods
  private async updateProgress(
    transmissionId: string, 
    updates: Partial<TransmissionProgress>
  ): Promise<void> {
    const current = this.activeTransmissions.get(transmissionId);
    if (current) {
      this.activeTransmissions.set(transmissionId, {
        ...current,
        ...updates,
      });
    }
  }
  
  private generateCESPReceiptAcknowledgement(
    transmissionId: string,
    trackingNumber: string,
    request: TransmissionRequest
  ): GatewayAcknowledgement {
    return {
      id: generateGatewayId.acknowledgement(),
      transmissionId,
      gatewayId: 'ema-cesp',
      type: 'receipt',
      originalType: 'CESP-RECEIPT',
      status: 'success',
      receivedAt: new Date().toISOString(),
      gatewayTimestamp: new Date().toISOString(),
      trackingNumber,
      acknowledgementNumber: `CESP-ACK-${trackingNumber}`,
      applicationNumber: request.package.applicationNumber,
      sequenceNumber: request.package.sequenceNumber,
      messages: [
        {
          severity: 'info',
          code: 'CESP-001',
          message: 'Submission received by Common European Submission Portal',
        },
        {
          severity: 'info',
          code: 'CESP-002',
          message: `Tracking number: ${trackingNumber}`,
        },
        {
          severity: 'info',
          code: 'CESP-003',
          message: 'Submission queued for eCTD validation',
        },
      ],
      nextExpectedAck: {
        type: 'CESP-ACCEPT',
        expectedWithin: '48 hours',
      },
    };
  }
}

// =============================================================================
// GATEWAY CONNECTOR FACTORY
// =============================================================================

/** Factory for creating gateway connectors */
export class GatewayConnectorFactory {
  private static connectors: Map<GatewayId, IGatewayConnector> = new Map();
  
  /** Get or create connector for gateway */
  static getConnector(gatewayId: GatewayId): IGatewayConnector {
    let connector = this.connectors.get(gatewayId);
    
    if (!connector) {
      connector = this.createConnector(gatewayId);
      this.connectors.set(gatewayId, connector);
    }
    
    return connector;
  }
  
  /** Create new connector instance */
  static createConnector(gatewayId: GatewayId): IGatewayConnector {
    switch (gatewayId) {
      case 'fda-esg':
        return new FDAESGConnector();
      case 'ema-cesp':
        return new EMACESPConnector();
      default:
        // For unimplemented gateways, return FDA ESG as placeholder
        /* Gateway not implemented */
        return new FDAESGConnector();
    }
  }
  
  /** Get all connector instances */
  static getAllConnectors(): IGatewayConnector[] {
    return Array.from(this.connectors.values());
  }
  
  /** Clear all connectors (for testing) */
  static clearAll(): void {
    this.connectors.clear();
  }
}

// Exports already declared via export keyword on classes
