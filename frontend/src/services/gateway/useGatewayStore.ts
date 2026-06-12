

// =============================================================================
// GATEWAY STORE - v0.9.16
// =============================================================================
// Zustand store for managing gateway connections, transmissions, and
// acknowledgements. Integrates with gateway connectors and audit service.
// =============================================================================

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';

import {
  type GatewayId,
  type GatewayEnvironment,
  type ConnectionState,
  type ConnectionStatus,
  type HealthCheckResult,
  type TransmissionPackage,
  type TransmissionRequest,
  type TransmissionResult,
  type TransmissionProgress,
  type TransmissionStatus,
  type GatewayAcknowledgement,
  type AnyGatewayCredentials,
  type FDAESGCredentials,
  type EMACESPCredentials,
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
  type GatewayMetadata,
  GATEWAY_REGISTRY,
  getGatewayForRegion,
} from './gateway-connector-types';

import {
  GatewayConnectorFactory,
} from './gateway-connector-service';

import {
  gatewayAuditService,
  type AuditUserContext,
} from './gateway-audit-service';

import type { RegulatoryRegion } from '../../store/ectd-regional-types';

// =============================================================================
// STATE TYPES
// =============================================================================

/** Gateway store state */
export interface GatewayState {
  // Connection state per gateway
  connections: Record<GatewayId, ConnectionState>;
  
  // Credentials (stored securely)
  credentials: Record<GatewayId, AnyGatewayCredentials | null>;
  
  // Active transmissions
  transmissions: Record<string, TransmissionRecord>;
  transmissionQueue: string[];
  activeTransmissionId: string | null;
  
  // Acknowledgements
  acknowledgements: Record<string, GatewayAcknowledgement[]>;
  
  // Health checks
  healthChecks: Record<GatewayId, HealthCheckResult>;
  
  // UI state
  selectedGatewayId: GatewayId | null;
  selectedTransmissionId: string | null;
  isHealthCheckRunning: boolean;
  
  // Settings
  defaultEnvironment: GatewayEnvironment;
  autoHealthCheck: boolean;
  healthCheckIntervalMs: number;
  
  // Errors
  lastError: string | null;
}

/** Transmission record with full history */
export interface TransmissionRecord {
  id: string;
  packageId: string;
  gatewayId: GatewayId;
  environment: GatewayEnvironment;
  
  // Package info
  applicationNumber: string;
  sequenceNumber: string;
  submissionType: string;
  fileName: string;
  fileSizeBytes: number;
  
  // Status
  status: TransmissionStatus;
  progress: TransmissionProgress | null;
  
  // Results
  result: TransmissionResult | null;
  acknowledgements: GatewayAcknowledgement[];
  
  // Timing
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  
  // Retry info
  attemptCount: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  retryPolicy: RetryPolicy;
  
  // User
  initiatedBy: string;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const createInitialConnectionState = (gatewayId: GatewayId): ConnectionState => ({
  gatewayId,
  environment: 'test',
  status: 'disconnected',
  isAuthenticated: false,
  consecutiveFailures: 0,
});

const initialState: GatewayState = {
  connections: {
    'fda-esg': createInitialConnectionState('fda-esg'),
    'ema-cesp': createInitialConnectionState('ema-cesp'),
    'pmda-gateway': createInitialConnectionState('pmda-gateway'),
    'hc-cta': createInitialConnectionState('hc-cta'),
    'tga-portal': createInitialConnectionState('tga-portal'),
    'sm-portal': createInitialConnectionState('sm-portal'),
  },
  credentials: {
    'fda-esg': null,
    'ema-cesp': null,
    'pmda-gateway': null,
    'hc-cta': null,
    'tga-portal': null,
    'sm-portal': null,
  },
  transmissions: {},
  transmissionQueue: [],
  activeTransmissionId: null,
  acknowledgements: {},
  healthChecks: {} as Record<GatewayId, HealthCheckResult>,
  selectedGatewayId: null,
  selectedTransmissionId: null,
  isHealthCheckRunning: false,
  defaultEnvironment: 'test',
  autoHealthCheck: true,
  healthCheckIntervalMs: 300000, // 5 minutes
  lastError: null,
};

// =============================================================================
// ACTIONS INTERFACE
// =============================================================================

interface GatewayActions {
  // Connection management
  connect: (gatewayId: GatewayId, credentials: AnyGatewayCredentials) => Promise<ConnectionState>;
  disconnect: (gatewayId: GatewayId) => Promise<void>;
  reconnect: (gatewayId: GatewayId) => Promise<ConnectionState>;
  
  // Credential management
  setCredentials: (gatewayId: GatewayId, credentials: AnyGatewayCredentials) => void;
  clearCredentials: (gatewayId: GatewayId) => void;
  validateCredentials: (gatewayId: GatewayId) => Promise<boolean>;
  
  // Health checks
  runHealthCheck: (gatewayId: GatewayId) => Promise<HealthCheckResult>;
  runAllHealthChecks: () => Promise<Record<GatewayId, HealthCheckResult>>;
  
  // Transmission management
  createTransmission: (package_: TransmissionPackage, options?: Partial<TransmissionRequest>) => string;
  startTransmission: (transmissionId: string) => Promise<TransmissionResult>;
  cancelTransmission: (transmissionId: string) => Promise<boolean>;
  retryTransmission: (transmissionId: string) => Promise<TransmissionResult>;
  
  // Acknowledgements
  fetchAcknowledgements: (trackingNumber: string, gatewayId: GatewayId) => Promise<GatewayAcknowledgement[]>;
  pollForAcknowledgement: (transmissionId: string) => Promise<GatewayAcknowledgement>;
  
  // Selection
  selectGateway: (gatewayId: GatewayId | null) => void;
  selectTransmission: (transmissionId: string | null) => void;
  
  // Settings
  setDefaultEnvironment: (env: GatewayEnvironment) => void;
  setAutoHealthCheck: (enabled: boolean) => void;
  
  // Audit context
  setAuditUserContext: (context: AuditUserContext) => void;
  
  // Utilities
  getGatewayForRegion: (region: RegulatoryRegion) => GatewayId;
  getConnectionStatus: (gatewayId: GatewayId) => ConnectionStatus;
  isGatewayConnected: (gatewayId: GatewayId) => boolean;
  
  // Reset
  reset: () => void;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useGatewayStore = create<GatewayState & GatewayActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // =========================================================================
      // CONNECTION MANAGEMENT
      // =========================================================================
      
      connect: async (gatewayId, credentials) => {
        const connector = GatewayConnectorFactory.getConnector(gatewayId);
        
        set(state => ({
          connections: {
            ...state.connections,
            [gatewayId]: {
              ...state.connections[gatewayId],
              status: 'connecting',
            },
          },
          credentials: {
            ...state.credentials,
            [gatewayId]: credentials,
          },
        }));
        
        try {
          const connectionState = await connector.connect(credentials);
          
          // Log to audit
          await gatewayAuditService.logConnect(
            gatewayId,
            credentials.environment,
            true
          );
          
          set(state => ({
            connections: {
              ...state.connections,
              [gatewayId]: connectionState,
            },
          }));
          
          return connectionState;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Connection failed';
          
          // Log failure to audit
          await gatewayAuditService.logConnect(
            gatewayId,
            credentials.environment,
            false,
            { code: 'CONNECTION_ERROR', message: errorMessage }
          );
          
          set(state => ({
            connections: {
              ...state.connections,
              [gatewayId]: {
                ...state.connections[gatewayId],
                status: 'error',
                lastError: {
                  code: 'CONNECTION_ERROR',
                  message: errorMessage,
                  timestamp: new Date().toISOString(),
                  isRetryable: true,
                },
                consecutiveFailures: state.connections[gatewayId].consecutiveFailures + 1,
              },
            },
            lastError: errorMessage,
          }));
          
          throw error;
        }
      },
      
      disconnect: async (gatewayId) => {
        const connector = GatewayConnectorFactory.getConnector(gatewayId);
        await connector.disconnect();
        
        const currentEnv = get().connections[gatewayId].environment;
        await gatewayAuditService.logDisconnect(gatewayId, currentEnv);
        
        set(state => ({
          connections: {
            ...state.connections,
            [gatewayId]: createInitialConnectionState(gatewayId),
          },
        }));
      },
      
      reconnect: async (gatewayId) => {
        const credentials = get().credentials[gatewayId];
        if (!credentials) {
          throw new Error('No credentials available for reconnection');
        }
        
        await get().disconnect(gatewayId);
        return get().connect(gatewayId, credentials);
      },
      
      // =========================================================================
      // CREDENTIAL MANAGEMENT
      // =========================================================================
      
      setCredentials: (gatewayId, credentials) => {
        set(state => ({
          credentials: {
            ...state.credentials,
            [gatewayId]: credentials,
          },
        }));
        
        gatewayAuditService.logCredentialConfigure(gatewayId, credentials.environment);
      },
      
      clearCredentials: (gatewayId) => {
        set(state => ({
          credentials: {
            ...state.credentials,
            [gatewayId]: null,
          },
        }));
      },
      
      validateCredentials: async (gatewayId) => {
        const credentials = get().credentials[gatewayId];
        if (!credentials) return false;
        
        try {
          const connector = GatewayConnectorFactory.getConnector(gatewayId);
          await connector.connect(credentials);
          await connector.disconnect();
          
          await gatewayAuditService.logCredentialValidate(
            gatewayId,
            credentials.environment,
            true
          );
          
          return true;
        } catch {
          await gatewayAuditService.logCredentialValidate(
            gatewayId,
            credentials.environment,
            false
          );
          return false;
        }
      },
      
      // =========================================================================
      // HEALTH CHECKS
      // =========================================================================
      
      runHealthCheck: async (gatewayId) => {
        set({ isHealthCheckRunning: true });
        
        try {
          const connector = GatewayConnectorFactory.getConnector(gatewayId);
          const result = await connector.checkHealth();
          
          await gatewayAuditService.logHealthCheck(result);
          
          set(state => ({
            healthChecks: {
              ...state.healthChecks,
              [gatewayId]: result,
            },
            isHealthCheckRunning: false,
          }));
          
          return result;
        } catch (error) {
          set({ isHealthCheckRunning: false });
          throw error;
        }
      },
      
      runAllHealthChecks: async () => {
        const results: Record<string, HealthCheckResult> = {};
        const gatewayIds: GatewayId[] = ['fda-esg', 'ema-cesp', 'pmda-gateway', 'hc-cta', 'tga-portal', 'sm-portal'];
        
        for (const gatewayId of gatewayIds) {
          try {
            results[gatewayId] = await get().runHealthCheck(gatewayId);
          } catch {
            // Continue with other gateways
          }
        }
        
        return results as Record<GatewayId, HealthCheckResult>;
      },
      
      // =========================================================================
      // TRANSMISSION MANAGEMENT
      // =========================================================================
      
      createTransmission: (package_, options) => {
        const id = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const now = new Date().toISOString();
        
        const record: TransmissionRecord = {
          id,
          packageId: package_.id,
          gatewayId: package_.gatewayId,
          environment: package_.environment,
          applicationNumber: package_.applicationNumber,
          sequenceNumber: package_.sequenceNumber,
          submissionType: package_.submissionType,
          fileName: package_.fileName,
          fileSizeBytes: package_.fileSizeBytes,
          status: 'queued',
          progress: null,
          result: null,
          acknowledgements: [],
          createdAt: now,
          startedAt: null,
          completedAt: null,
          attemptCount: 0,
          lastAttemptAt: null,
          nextRetryAt: null,
          retryPolicy: options?.retryPolicy || DEFAULT_RETRY_POLICY,
          initiatedBy: gatewayAuditService.getUserContext()?.userName || 'Unknown',
        };
        
        set(state => ({
          transmissions: {
            ...state.transmissions,
            [id]: record,
          },
          transmissionQueue: [...state.transmissionQueue, id],
        }));
        
        return id;
      },
      
      startTransmission: async (transmissionId) => {
        const transmission = get().transmissions[transmissionId];
        if (!transmission) {
          throw new Error('Transmission not found');
        }
        
        const connector = GatewayConnectorFactory.getConnector(transmission.gatewayId);
        const now = new Date().toISOString();
        
        // Update status
        set(state => ({
          transmissions: {
            ...state.transmissions,
            [transmissionId]: {
              ...state.transmissions[transmissionId],
              status: 'preparing',
              startedAt: now,
              attemptCount: state.transmissions[transmissionId].attemptCount + 1,
              lastAttemptAt: now,
            },
          },
          activeTransmissionId: transmissionId,
        }));
        
        // Log to audit
        await gatewayAuditService.logTransmissionInitiate(
          transmission.gatewayId,
          transmission.environment,
          transmissionId,
          transmission.packageId,
          transmission.applicationNumber,
          transmission.sequenceNumber
        );
        
        // Create request
        const request: TransmissionRequest = {
          id: transmissionId,
          package: {
            id: transmission.packageId,
            gatewayId: transmission.gatewayId,
            environment: transmission.environment,
            applicationId: '',
            sequenceId: '',
            applicationNumber: transmission.applicationNumber,
            sequenceNumber: transmission.sequenceNumber,
            submissionType: transmission.submissionType,
            packagePath: '',
            fileName: transmission.fileName,
            fileSizeBytes: transmission.fileSizeBytes,
            checksum: '',
            checksumAlgorithm: 'sha256',
            preparedBy: transmission.initiatedBy,
            preparedAt: transmission.createdAt,
          },
          priority: 'normal',
          retryPolicy: transmission.retryPolicy,
          onProgress: (progress) => {
            set(state => ({
              transmissions: {
                ...state.transmissions,
                [transmissionId]: {
                  ...state.transmissions[transmissionId],
                  status: progress.status,
                  progress,
                },
              },
            }));
          },
        };
        
        try {
          const result = await connector.transmit(request);
          
          // Log upload completion
          await gatewayAuditService.logUploadComplete(result);
          
          // Update transmission
          set(state => ({
            transmissions: {
              ...state.transmissions,
              [transmissionId]: {
                ...state.transmissions[transmissionId],
                status: result.status,
                result,
                completedAt: result.completedAt,
                acknowledgements: result.acknowledgement 
                  ? [...state.transmissions[transmissionId].acknowledgements, result.acknowledgement]
                  : state.transmissions[transmissionId].acknowledgements,
              },
            },
            transmissionQueue: state.transmissionQueue.filter(id => id !== transmissionId),
            activeTransmissionId: null,
          }));
          
          // Log acknowledgement if received
          if (result.acknowledgement) {
            await gatewayAuditService.logAcknowledgementReceived(result.acknowledgement);
          }
          
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Transmission failed';
          
          set(state => ({
            transmissions: {
              ...state.transmissions,
              [transmissionId]: {
                ...state.transmissions[transmissionId],
                status: 'failed',
                completedAt: new Date().toISOString(),
              },
            },
            activeTransmissionId: null,
            lastError: errorMessage,
          }));
          
          throw error;
        }
      },
      
      cancelTransmission: async (transmissionId) => {
        const transmission = get().transmissions[transmissionId];
        if (!transmission) return false;
        
        const connector = GatewayConnectorFactory.getConnector(transmission.gatewayId);
        const cancelled = await connector.cancelTransmission(transmissionId);
        
        if (cancelled) {
          await gatewayAuditService.logTransmissionCancel(
            transmission.gatewayId,
            transmission.environment,
            transmissionId,
            'User requested cancellation'
          );
          
          set(state => ({
            transmissions: {
              ...state.transmissions,
              [transmissionId]: {
                ...state.transmissions[transmissionId],
                status: 'cancelled',
                completedAt: new Date().toISOString(),
              },
            },
            transmissionQueue: state.transmissionQueue.filter(id => id !== transmissionId),
            activeTransmissionId: state.activeTransmissionId === transmissionId 
              ? null 
              : state.activeTransmissionId,
          }));
        }
        
        return cancelled;
      },
      
      retryTransmission: async (transmissionId) => {
        const transmission = get().transmissions[transmissionId];
        if (!transmission) {
          throw new Error('Transmission not found');
        }
        
        if (transmission.attemptCount >= transmission.retryPolicy.maxAttempts) {
          throw new Error('Max retry attempts reached');
        }
        
        await gatewayAuditService.logTransmissionRetry(
          transmission.gatewayId,
          transmission.environment,
          transmissionId,
          transmission.attemptCount + 1,
          'Manual retry'
        );
        
        return get().startTransmission(transmissionId);
      },
      
      // =========================================================================
      // ACKNOWLEDGEMENTS
      // =========================================================================
      
      fetchAcknowledgements: async (trackingNumber, gatewayId) => {
        const connector = GatewayConnectorFactory.getConnector(gatewayId);
        const acks = await connector.fetchAcknowledgements(trackingNumber);
        
        set(state => ({
          acknowledgements: {
            ...state.acknowledgements,
            [trackingNumber]: acks,
          },
        }));
        
        return acks;
      },
      
      pollForAcknowledgement: async (transmissionId) => {
        const transmission = get().transmissions[transmissionId];
        if (!transmission) {
          throw new Error('Transmission not found');
        }
        
        const connector = GatewayConnectorFactory.getConnector(transmission.gatewayId);
        const ack = await connector.pollForAcknowledgement(transmissionId);
        
        // Add to transmission acknowledgements
        set(state => ({
          transmissions: {
            ...state.transmissions,
            [transmissionId]: {
              ...state.transmissions[transmissionId],
              acknowledgements: [
                ...state.transmissions[transmissionId].acknowledgements,
                ack,
              ],
            },
          },
        }));
        
        await gatewayAuditService.logAcknowledgementReceived(ack);
        
        return ack;
      },
      
      // =========================================================================
      // SELECTION
      // =========================================================================
      
      selectGateway: (gatewayId) => set({ selectedGatewayId: gatewayId }),
      selectTransmission: (transmissionId) => set({ selectedTransmissionId: transmissionId }),
      
      // =========================================================================
      // SETTINGS
      // =========================================================================
      
      setDefaultEnvironment: (env) => set({ defaultEnvironment: env }),
      setAutoHealthCheck: (enabled) => set({ autoHealthCheck: enabled }),
      
      // =========================================================================
      // AUDIT
      // =========================================================================
      
      setAuditUserContext: (context) => {
        gatewayAuditService.setUserContext(context);
      },
      
      // =========================================================================
      // UTILITIES
      // =========================================================================
      
      getGatewayForRegion: (region) => getGatewayForRegion(region),
      
      getConnectionStatus: (gatewayId) => get().connections[gatewayId]?.status || 'disconnected',
      
      isGatewayConnected: (gatewayId) => {
        const status = get().connections[gatewayId]?.status;
        return status === 'connected' || status === 'authenticated';
      },
      
      // =========================================================================
      // RESET
      // =========================================================================
      
      reset: () => set(initialState),
    })),
    { name: 'gateway-store' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/** Get connection state for gateway */
export const useGatewayConnection = (gatewayId: GatewayId) => {
  return useGatewayStore(s => s.connections[gatewayId]);
};

/** Get credentials for gateway */
export const useGatewayCredentials = (gatewayId: GatewayId) => {
  return useGatewayStore(s => s.credentials[gatewayId]);
};

/** Get health check result for gateway */
export const useGatewayHealth = (gatewayId: GatewayId) => {
  return useGatewayStore(s => s.healthChecks[gatewayId]);
};

/** Get selected gateway */
export const useSelectedGateway = () => {
  const selectedId = useGatewayStore(s => s.selectedGatewayId);
  const connections = useGatewayStore(s => s.connections);
  return selectedId ? { id: selectedId, connection: connections[selectedId] } : null;
};

/** Get all transmissions */
export const useTransmissionList = () => {
  const transmissions = useGatewayStore(s => s.transmissions);
  return useMemo(() => 
    Object.values(transmissions).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ), 
    [transmissions]
  );
};

/** Get transmission by ID */
export const useTransmission = (transmissionId: string | null) => {
  return useGatewayStore(s => transmissionId ? s.transmissions[transmissionId] : null);
};

/** Get active transmission */
export const useActiveTransmission = () => {
  const activeId = useGatewayStore(s => s.activeTransmissionId);
  const transmissions = useGatewayStore(s => s.transmissions);
  return activeId ? transmissions[activeId] : null;
};

/** Get queued transmissions */
export const useQueuedTransmissions = () => {
  const queue = useGatewayStore(s => s.transmissionQueue);
  const transmissions = useGatewayStore(s => s.transmissions);
  return useMemo(() => 
    queue.map(id => transmissions[id]).filter(Boolean),
    [queue, transmissions]
  );
};

/** Get transmissions by gateway */
export const useTransmissionsByGateway = (gatewayId: GatewayId) => {
  const transmissions = useGatewayStore(s => s.transmissions);
  return useMemo(() => 
    Object.values(transmissions)
      .filter(t => t.gatewayId === gatewayId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transmissions, gatewayId]
  );
};

/** Get acknowledgements for tracking number */
export const useAcknowledgements = (trackingNumber: string) => {
  return useGatewayStore(s => s.acknowledgements[trackingNumber] || []);
};

/** Get connected gateway count */
export const useConnectedGatewayCount = () => {
  const connections = useGatewayStore(s => s.connections);
  return useMemo(() => 
    Object.values(connections).filter(c => 
      c.status === 'connected' || c.status === 'authenticated'
    ).length,
    [connections]
  );
};

/** Get all gateway metadata with connection status */
export const useGatewayList = () => {
  const connections = useGatewayStore(s => s.connections);
  const healthChecks = useGatewayStore(s => s.healthChecks);
  
  return useMemo(() => 
    Object.entries(GATEWAY_REGISTRY).map(([id, metadata]) => ({
      ...metadata,
      connection: connections[id as GatewayId],
      healthCheck: healthChecks[id as GatewayId],
    })),
    [connections, healthChecks]
  );
};

// =============================================================================
// END OF FILE
// =============================================================================
