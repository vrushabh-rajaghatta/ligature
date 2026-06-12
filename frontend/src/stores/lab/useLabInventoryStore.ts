

/**
 * Lab Inventory Store
 * Zustand store for inventory transactions and alerts
 * @version 0.21.1
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  InventoryTransaction,
  InventoryAlert,
} from '@/types/lab-discovery';
import type {
  LabInventoryStoreState,
  LabInventoryStoreActions,
  InventoryTransactionInput,
  InventoryAlertInput,
} from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: LabInventoryStoreState = {
  transactions: new Map(),
  transactionsBySample: new Map(),
  alerts: new Map(),
  alertsBySeverity: new Map(),
  isLoading: false,
  error: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useLabInventoryStore = create<LabInventoryStoreState & LabInventoryStoreActions>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // ========================================================================
      // Transactions
      // ========================================================================

      loadTransactions: async (sampleId?: string, limit: number = 100) => {
        set({ isLoading: true, error: null }, false, 'loadTransactions/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          set({ isLoading: false }, false, 'loadTransactions/success');
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load transactions',
          }, false, 'loadTransactions/error');
        }
      },

      recordTransaction: async (input: InventoryTransactionInput) => {
        set({ isLoading: true, error: null }, false, 'recordTransaction/start');
        
        try {
          const id = crypto.randomUUID();
          const now = new Date();
          
          const transaction: InventoryTransaction = {
            id,
            transactionType: input.transactionType,
            sampleId: input.sampleId,
            quantityBefore: input.quantityBefore,
            quantityChange: input.quantityChange,
            quantityAfter: input.quantityBefore + input.quantityChange,
            quantityUnit: input.quantityUnit,
            referenceType: input.referenceType,
            referenceId: input.referenceId,
            reason: input.reason,
            notes: input.notes,
            performedBy: input.performedBy,
            performedAt: now,
            approvedBy: input.approvedBy,
            approvedAt: input.approvedBy ? now : undefined,
          };
          
          set(state => {
            const newTransactions = new Map(state.transactions);
            newTransactions.set(id, transaction);
            
            // Update sample index
            const newBySample = new Map(state.transactionsBySample);
            const sampleTransactions = [...(newBySample.get(input.sampleId) || []), id];
            newBySample.set(input.sampleId, sampleTransactions);
            
            return {
              transactions: newTransactions,
              transactionsBySample: newBySample,
              isLoading: false,
            };
          }, false, 'recordTransaction/success');
          
          return id;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to record transaction',
          }, false, 'recordTransaction/error');
          throw error;
        }
      },

      // ========================================================================
      // Alerts
      // ========================================================================

      loadAlerts: async (includeResolved: boolean = false) => {
        set({ isLoading: true, error: null }, false, 'loadAlerts/start');
        
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          set({ isLoading: false }, false, 'loadAlerts/success');
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load alerts',
          }, false, 'loadAlerts/error');
        }
      },

      createAlert: async (input: InventoryAlertInput) => {
        try {
          const id = crypto.randomUUID();
          const now = new Date();
          
          const alert: InventoryAlert = {
            id,
            type: input.type,
            severity: input.severity,
            sampleId: input.sampleId,
            batchId: input.batchId,
            compoundId: input.compoundId,
            message: input.message,
            threshold: input.threshold,
            currentValue: input.currentValue,
            status: 'ACTIVE',
            createdAt: now,
            expiresAt: input.expiresAt,
          };
          
          set(state => {
            const newAlerts = new Map(state.alerts);
            newAlerts.set(id, alert);
            
            // Update severity index
            const newBySeverity = new Map(state.alertsBySeverity);
            const severityAlerts = new Set(newBySeverity.get(input.severity) || []);
            severityAlerts.add(id);
            newBySeverity.set(input.severity, severityAlerts);
            
            return {
              alerts: newAlerts,
              alertsBySeverity: newBySeverity,
            };
          }, false, 'createAlert/success');
          
          return id;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create alert',
          }, false, 'createAlert/error');
          throw error;
        }
      },

      acknowledgeAlert: async (alertId: string, acknowledgedBy: string) => {
        const existingAlert = get().alerts.get(alertId);
        if (!existingAlert) {
          set({ error: `Alert ${alertId} not found` }, false, 'acknowledgeAlert/notFound');
          return;
        }
        
        if (existingAlert.status !== 'ACTIVE') {
          return; // Already acknowledged or resolved
        }
        
        try {
          const updatedAlert: InventoryAlert = {
            ...existingAlert,
            status: 'ACKNOWLEDGED',
            acknowledgedAt: new Date(),
            acknowledgedBy,
          };
          
          set(state => {
            const newAlerts = new Map(state.alerts);
            newAlerts.set(alertId, updatedAlert);
            return { alerts: newAlerts };
          }, false, 'acknowledgeAlert/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to acknowledge alert',
          }, false, 'acknowledgeAlert/error');
        }
      },

      resolveAlert: async (alertId: string, resolvedBy: string, resolution?: string) => {
        const existingAlert = get().alerts.get(alertId);
        if (!existingAlert) {
          set({ error: `Alert ${alertId} not found` }, false, 'resolveAlert/notFound');
          return;
        }
        
        if (existingAlert.status === 'RESOLVED' || existingAlert.status === 'DISMISSED') {
          return; // Already in terminal state
        }
        
        try {
          const updatedAlert: InventoryAlert = {
            ...existingAlert,
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy,
          };
          
          set(state => {
            const newAlerts = new Map(state.alerts);
            newAlerts.set(alertId, updatedAlert);
            return { alerts: newAlerts };
          }, false, 'resolveAlert/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to resolve alert',
          }, false, 'resolveAlert/error');
        }
      },

      dismissAlert: async (alertId: string, dismissedBy: string, reason?: string) => {
        const existingAlert = get().alerts.get(alertId);
        if (!existingAlert) {
          set({ error: `Alert ${alertId} not found` }, false, 'dismissAlert/notFound');
          return;
        }
        
        if (existingAlert.status === 'RESOLVED' || existingAlert.status === 'DISMISSED') {
          return; // Already in terminal state
        }
        
        try {
          const updatedAlert: InventoryAlert = {
            ...existingAlert,
            status: 'DISMISSED',
            resolvedAt: new Date(),
            resolvedBy: dismissedBy,
          };
          
          set(state => {
            const newAlerts = new Map(state.alerts);
            newAlerts.set(alertId, updatedAlert);
            return { alerts: newAlerts };
          }, false, 'dismissAlert/success');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to dismiss alert',
          }, false, 'dismissAlert/error');
        }
      },

      // ========================================================================
      // Inventory Checks
      // ========================================================================

      checkLowStock: async (thresholds: Map<string, number>) => {
        // In production, this would query the sample store or database
        // For now, it's a placeholder for integration with useSampleStore
        try {
          // This would typically be called on a schedule or after inventory changes
          set({ isLoading: false }, false, 'checkLowStock/complete');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to check low stock',
          }, false, 'checkLowStock/error');
        }
      },

      checkExpiring: async (daysAhead: number) => {
        // In production, this would query the sample store or database
        // For now, it's a placeholder for integration with useSampleStore
        try {
          // This would typically be called on a schedule
          set({ isLoading: false }, false, 'checkExpiring/complete');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to check expiring samples',
          }, false, 'checkExpiring/error');
        }
      },

      // ========================================================================
      // Utilities
      // ========================================================================

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'lab-inventory-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectAllTransactions = (state: LabInventoryStoreState): InventoryTransaction[] => {
  return Array.from(state.transactions.values());
};

export const selectTransactionsBySample = (state: LabInventoryStoreState, sampleId: string): InventoryTransaction[] => {
  const transactionIds = state.transactionsBySample.get(sampleId) || [];
  return transactionIds
    .map(id => state.transactions.get(id))
    .filter(Boolean) as InventoryTransaction[];
};

export const selectRecentTransactions = (state: LabInventoryStoreState, limit: number = 50): InventoryTransaction[] => {
  return Array.from(state.transactions.values())
    .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
    .slice(0, limit);
};

export const selectAllAlerts = (state: LabInventoryStoreState): InventoryAlert[] => {
  return Array.from(state.alerts.values());
};

export const selectActiveAlerts = (state: LabInventoryStoreState): InventoryAlert[] => {
  return Array.from(state.alerts.values()).filter(a => a.status === 'ACTIVE');
};

export const selectAlertsBySeverity = (state: LabInventoryStoreState, severity: 'INFO' | 'WARNING' | 'CRITICAL'): InventoryAlert[] => {
  const alertIds = state.alertsBySeverity.get(severity);
  if (!alertIds) return [];
  return Array.from(alertIds)
    .map(id => state.alerts.get(id))
    .filter(Boolean) as InventoryAlert[];
};

export const selectCriticalAlerts = (state: LabInventoryStoreState): InventoryAlert[] => {
  return Array.from(state.alerts.values()).filter(
    a => a.severity === 'CRITICAL' && a.status === 'ACTIVE'
  );
};

export const selectUnacknowledgedAlerts = (state: LabInventoryStoreState): InventoryAlert[] => {
  return Array.from(state.alerts.values()).filter(a => a.status === 'ACTIVE');
};

export const selectAlertMetrics = (state: LabInventoryStoreState) => {
  const alerts = Array.from(state.alerts.values());
  
  return {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'ACTIVE').length,
    acknowledged: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
    resolved: alerts.filter(a => a.status === 'RESOLVED').length,
    dismissed: alerts.filter(a => a.status === 'DISMISSED').length,
    bySeverity: {
      critical: alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length,
      warning: alerts.filter(a => a.severity === 'WARNING' && a.status === 'ACTIVE').length,
      info: alerts.filter(a => a.severity === 'INFO' && a.status === 'ACTIVE').length,
    },
    byType: alerts.filter(a => a.status === 'ACTIVE').reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
};

export const selectTransactionSummary = (state: LabInventoryStoreState, sampleId: string) => {
  const transactions = selectTransactionsBySample(state, sampleId);
  
  return {
    totalTransactions: transactions.length,
    byType: transactions.reduce((acc, t) => {
      acc[t.transactionType] = (acc[t.transactionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    lastTransaction: transactions.length > 0
      ? transactions.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())[0]
      : null,
    totalIssued: transactions
      .filter(t => t.transactionType === 'ISSUE')
      .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0),
    totalReceived: transactions
      .filter(t => t.transactionType === 'RECEIPT')
      .reduce((sum, t) => sum + t.quantityChange, 0),
  };
};

// ============================================================================
// Hooks
// ============================================================================

export const useAllTransactions = () =>
  useLabInventoryStore(state => selectAllTransactions(state));

export const useTransactionsBySample = (sampleId: string) =>
  useLabInventoryStore(state => selectTransactionsBySample(state, sampleId));

export const useRecentTransactions = (limit?: number) =>
  useLabInventoryStore(state => selectRecentTransactions(state, limit));

export const useAllAlerts = () =>
  useLabInventoryStore(state => selectAllAlerts(state));

export const useActiveAlerts = () =>
  useLabInventoryStore(state => selectActiveAlerts(state));

export const useAlertsBySeverity = (severity: 'INFO' | 'WARNING' | 'CRITICAL') =>
  useLabInventoryStore(state => selectAlertsBySeverity(state, severity));

export const useCriticalAlerts = () =>
  useLabInventoryStore(state => selectCriticalAlerts(state));

export const useUnacknowledgedAlerts = () =>
  useLabInventoryStore(state => selectUnacknowledgedAlerts(state));

export const useAlertMetrics = () =>
  useLabInventoryStore(state => selectAlertMetrics(state));

export const useTransactionSummary = (sampleId: string) =>
  useLabInventoryStore(state => selectTransactionSummary(state, sampleId));

export const useInventoryLoading = () =>
  useLabInventoryStore(state => state.isLoading);

export const useInventoryError = () =>
  useLabInventoryStore(state => state.error);
