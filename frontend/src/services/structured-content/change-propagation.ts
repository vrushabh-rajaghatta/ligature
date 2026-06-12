
/**
 * Change Propagation Service
 * 
 * Tracks content changes and propagates them to linked/derived documents.
 * Manages change events, notifications, and conflict resolution.
 * 
 * @version 0.18.7
 */

import type {
  ChangeEvent,
  NativeContentComponent,
  NativeStructuredDocument,
  DocumentComponentAssembly,
  PropagationOptions,
  PropagationResult,
  ChangePropagationConfig,
  ChangeType,
  ChangeEventStatus,
  ImpactedDocument,
} from '@/types/structured-content';

import type { ComponentStatus, DocumentType } from '@/lib/integrations/docuvera/types';

import { computeContentHash } from './migrations';

// =============================================================================
// TYPES
// =============================================================================

export interface ChangePropagationServiceConfig {
  tenantId: string;
  currentUser: string;
  propagationConfig?: Partial<ChangePropagationConfig>;
}

export interface AffectedDocument {
  documentId: string;
  documentTitle: string;
  componentId: string;
  section: string;
  reuseType: 'linked' | 'derived' | 'snapshot';
  requiresReview: boolean;
}

export interface PropagationAction {
  type: 'auto_update' | 'create_review' | 'notify' | 'skip';
  documentId: string;
  componentId: string;
  reason: string;
}

export interface ChangeEventInput {
  sourceType: 'component' | 'document';
  sourceId: string;
  changeType: ChangeType;
  previousVersion?: string;
  newVersion?: string;
  previousHash?: string;
  newHash?: string;
  changeReason?: string;
  changedFields?: string[];
}

// =============================================================================
// CHANGE PROPAGATION SERVICE
// =============================================================================

export class ChangePropagationService {
  private changeEvents: Map<string, ChangeEvent[]> = new Map();
  private config: ChangePropagationServiceConfig;
  private propagationConfig: ChangePropagationConfig;
  private eventCounter = 0;

  // Callbacks for external operations
  private findAffectedDocumentsCallback?: (componentId: string) => Promise<AffectedDocument[]>;
  private updateComponentInDocumentCallback?: (
    documentId: string,
    componentId: string,
    newHash: string,
    newVersion: string
  ) => Promise<void>;
  private createReviewCallback?: (
    documentId: string,
    componentIds: string[],
    reason: string
  ) => Promise<string>;
  private sendNotificationCallback?: (
    userId: string,
    message: string,
    metadata: Record<string, unknown>
  ) => Promise<void>;

  constructor(config: ChangePropagationServiceConfig) {
    this.config = config;
    this.propagationConfig = {
      tenantId: config.tenantId,
      autoPropagate: config.propagationConfig?.autoPropagate ?? false,
      autoPropagateForLinked: config.propagationConfig?.autoPropagateForLinked ?? true,
      autoPropagateForDerived: config.propagationConfig?.autoPropagateForDerived ?? false,
      notifyOnChange: config.propagationConfig?.notifyOnChange ?? true,
      notifyOnConflict: config.propagationConfig?.notifyOnConflict ?? true,
      notificationRecipients: config.propagationConfig?.notificationRecipients ?? [],
      requireReviewForSafety: config.propagationConfig?.requireReviewForSafety ?? true,
      requireReviewForRegulatory: config.propagationConfig?.requireReviewForRegulatory ?? true,
      conflictResolution: config.propagationConfig?.conflictResolution ?? 'manual',
    };
  }

  // ---------------------------------------------------------------------------
  // Callback Registration
  // ---------------------------------------------------------------------------

  onFindAffectedDocuments(callback: typeof this.findAffectedDocumentsCallback): void {
    this.findAffectedDocumentsCallback = callback;
  }

  onUpdateComponentInDocument(callback: typeof this.updateComponentInDocumentCallback): void {
    this.updateComponentInDocumentCallback = callback;
  }

  onCreateReview(callback: typeof this.createReviewCallback): void {
    this.createReviewCallback = callback;
  }

  onSendNotification(callback: typeof this.sendNotificationCallback): void {
    this.sendNotificationCallback = callback;
  }

  // ---------------------------------------------------------------------------
  // Change Event Operations
  // ---------------------------------------------------------------------------

  /**
   * Record a change event
   */
  async recordChange(input: ChangeEventInput): Promise<ChangeEvent> {
    const now = new Date();
    this.eventCounter++;

    const event: ChangeEvent = {
      id: `evt-${this.config.tenantId}-${now.getTime()}-${this.eventCounter}`,
      tenantId: this.config.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceVersion: input.newVersion || '1.0',
      changeType: input.changeType,
      changedFields: input.changedFields || [],
      changeSummary: input.changeReason || `${input.changeType} on ${input.sourceId}`,
      previousHash: input.previousHash,
      newHash: input.newHash || '',
      impactedDocuments: [],
      impactedComponents: [],
      status: 'pending',
      triggeredAt: now,
      triggeredBy: this.config.currentUser,
    };

    // Store event
    const existing = this.changeEvents.get(input.sourceId) || [];
    existing.push(event);
    this.changeEvents.set(input.sourceId, existing);

    // Find affected documents if callback is set
    if (this.findAffectedDocumentsCallback && input.sourceType === 'component') {
      const affected = await this.findAffectedDocumentsCallback(input.sourceId);
      event.impactedDocuments = affected.map(a => ({
        documentId: a.documentId,
        documentTitle: a.documentTitle,
        documentType: 'ccds' as DocumentType, // Default type, enriched by document lookup
        section: a.section,
        reuseType: a.reuseType as 'linked' | 'derived' | 'snapshot',
        requiresReview: a.requiresReview,
        autoUpdate: !a.requiresReview && a.reuseType === 'linked',
      } as ImpactedDocument));
    }

    return event;
  }

  /**
   * Get change events for a source
   */
  async getChangeEvents(sourceId: string): Promise<ChangeEvent[]> {
    return this.changeEvents.get(sourceId) || [];
  }

  /**
   * Get pending change events
   */
  async getPendingEvents(): Promise<ChangeEvent[]> {
    const pending: ChangeEvent[] = [];
    
    for (const events of Array.from(Array.from(this.changeEvents.values()))) {
      for (const event of Array.from(events)) {
        if (event.status === 'pending') {
          pending.push(event);
        }
      }
    }
    
    return pending.sort((a, b) => a.triggeredAt.getTime() - b.triggeredAt.getTime());
  }

  /**
   * Get recent change events
   */
  async getRecentEvents(limit: number = 50): Promise<ChangeEvent[]> {
    const all: ChangeEvent[] = [];
    
    for (const events of Array.from(Array.from(this.changeEvents.values()))) {
      all.push(...events);
    }
    
    return all
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Propagation Operations
  // ---------------------------------------------------------------------------

  /**
   * Propagate a change event
   */
  async propagateChange(
    eventId: string,
    options: PropagationOptions
  ): Promise<PropagationResult> {
    // Find the event
    let targetEvent: ChangeEvent | undefined;
    let sourceId: string | undefined;

    for (const [sid, events] of Array.from(this.changeEvents)) {
      const found = events.find(e => e.id === eventId);
      if (found) {
        targetEvent = found;
        sourceId = sid;
        break;
      }
    }

    if (!targetEvent || !sourceId) {
      return {
        success: false,
        documentsUpdated: 0,
        componentsUpdated: 0,
        reviewsCreated: 0,
        errors: ['Change event not found'],
      };
    }

    // Get affected documents
    let affected: AffectedDocument[] = [];
    if (this.findAffectedDocumentsCallback) {
      affected = await this.findAffectedDocumentsCallback(sourceId);
    }

    const result: PropagationResult = {
      success: true,
      documentsUpdated: 0,
      componentsUpdated: 0,
      reviewsCreated: 0,
      errors: [],
    };

    // Determine actions for each affected document
    const actions = this.determineActions(affected, targetEvent, options);

    // Execute actions
    for (const action of Array.from(actions)) {
      try {
        await this.executeAction(action, targetEvent, result);
      } catch (error) {
        result.errors.push(`Failed to process ${action.documentId}: ${error}`);
      }
    }

    // Update event status
    const updatedEvent: ChangeEvent = {
      ...targetEvent,
      status: result.errors.length === 0 ? 'completed' : 'failed',
      processedAt: new Date(),
    };

    const events = this.changeEvents.get(sourceId) || [];
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex >= 0) {
      events[eventIndex] = updatedEvent;
      this.changeEvents.set(sourceId, events);
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Determine propagation actions for affected documents
   */
  private determineActions(
    affected: AffectedDocument[],
    event: ChangeEvent,
    options: PropagationOptions
  ): PropagationAction[] {
    const actions: PropagationAction[] = [];

    for (const doc of Array.from(affected)) {
      // Determine if auto-update is allowed
      const canAutoUpdate = this.canAutoUpdate(doc, event);
      
      // Skip review check
      if (options.skipReview && canAutoUpdate) {
        actions.push({
          type: 'auto_update',
          documentId: doc.documentId,
          componentId: doc.componentId,
          reason: 'Auto-update (review skipped)',
        });
        continue;
      }

      // Check if requires review
      if (doc.requiresReview || !canAutoUpdate) {
        actions.push({
          type: 'create_review',
          documentId: doc.documentId,
          componentId: doc.componentId,
          reason: doc.requiresReview ? 'Safety/regulatory change' : 'Manual review required',
        });
      } else if (options.autoApply && canAutoUpdate) {
        actions.push({
          type: 'auto_update',
          documentId: doc.documentId,
          componentId: doc.componentId,
          reason: 'Auto-update (linked content)',
        });
      } else {
        actions.push({
          type: 'notify',
          documentId: doc.documentId,
          componentId: doc.componentId,
          reason: 'Change notification',
        });
      }

      // Add notification if enabled
      if (options.notifyOwners) {
        actions.push({
          type: 'notify',
          documentId: doc.documentId,
          componentId: doc.componentId,
          reason: 'Owner notification',
        });
      }
    }

    return actions;
  }

  /**
   * Check if auto-update is allowed for a document
   */
  private canAutoUpdate(doc: AffectedDocument, event: ChangeEvent): boolean {
    // Linked content can auto-update if configured
    if (doc.reuseType === 'linked' && this.propagationConfig.autoPropagateForLinked) {
      return true;
    }

    // Derived content typically needs review
    if (doc.reuseType === 'derived') {
      return this.propagationConfig.autoPropagateForDerived;
    }

    // Copied content never auto-updates
    if (doc.reuseType === 'snapshot') {
      return false;
    }

    return this.propagationConfig.autoPropagate;
  }

  /**
   * Execute a propagation action
   */
  private async executeAction(
    action: PropagationAction,
    event: ChangeEvent,
    result: PropagationResult
  ): Promise<void> {
    switch (action.type) {
      case 'auto_update':
        if (this.updateComponentInDocumentCallback && event.newHash && event.sourceVersion) {
          await this.updateComponentInDocumentCallback(
            action.documentId,
            action.componentId,
            event.newHash,
            event.sourceVersion
          );
          result.documentsUpdated++;
          result.componentsUpdated++;
        }
        break;

      case 'create_review':
        if (this.createReviewCallback) {
          await this.createReviewCallback(
            action.documentId,
            [action.componentId],
            `Change propagation: ${event.changeType}`
          );
          result.reviewsCreated++;
        }
        break;

      case 'notify':
        if (this.sendNotificationCallback) {
          for (const recipient of Array.from(this.propagationConfig.notificationRecipients)) {
            await this.sendNotificationCallback(
              recipient,
              `Content change in document ${action.documentId}`,
              {
                documentId: action.documentId,
                componentId: action.componentId,
                changeType: event.changeType,
                changeSummary: event.changeSummary,
              }
            );
          }
        }
        break;

      case 'skip':
        // No action needed
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Analysis Operations
  // ---------------------------------------------------------------------------

  /**
   * Analyze impact of a potential change
   */
  async analyzeChangeImpact(
    componentId: string,
    changeType: ChangeType
  ): Promise<{
    totalAffected: number;
    byReuseType: Record<string, number>;
    requiresReview: number;
    canAutoUpdate: number;
  }> {
    let affected: AffectedDocument[] = [];
    
    if (this.findAffectedDocumentsCallback) {
      affected = await this.findAffectedDocumentsCallback(componentId);
    }

    const byReuseType: Record<string, number> = {};
    let requiresReview = 0;
    let canAutoUpdate = 0;

    for (const doc of Array.from(affected)) {
      byReuseType[doc.reuseType] = (byReuseType[doc.reuseType] || 0) + 1;
      
      if (doc.requiresReview) {
        requiresReview++;
      }
      
      const dummyEvent: ChangeEvent = {
        id: 'analysis',
        tenantId: this.config.tenantId,
        sourceType: 'component',
        sourceId: componentId,
        sourceVersion: '1.0',
        changeType,
        changedFields: [],
        changeSummary: 'Impact analysis',
        newHash: '',
        impactedDocuments: [],
        impactedComponents: [],
        status: 'pending',
        triggeredAt: new Date(),
        triggeredBy: this.config.currentUser,
      };
      
      if (this.canAutoUpdate(doc, dummyEvent)) {
        canAutoUpdate++;
      }
    }

    return {
      totalAffected: affected.length,
      byReuseType,
      requiresReview,
      canAutoUpdate,
    };
  }

  /**
   * Get change history summary
   */
  async getChangeHistory(
    sourceId: string,
    options?: { limit?: number; since?: Date }
  ): Promise<{
    events: ChangeEvent[];
    totalChanges: number;
    byType: Record<ChangeType, number>;
    lastChange?: Date;
  }> {
    let events = this.changeEvents.get(sourceId) || [];

    if (options?.since) {
      events = events.filter(e => e.triggeredAt >= options.since!);
    }

    const byType: Record<string, number> = {};
    for (const event of Array.from(events)) {
      byType[event.changeType] = (byType[event.changeType] || 0) + 1;
    }

    const sorted = events.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
    const limited = options?.limit ? sorted.slice(0, options.limit) : sorted;

    return {
      events: limited,
      totalChanges: events.length,
      byType: byType as Record<ChangeType, number>,
      lastChange: sorted[0]?.triggeredAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Update propagation configuration
   */
  updateConfig(config: Partial<ChangePropagationConfig>): void {
    this.propagationConfig = {
      ...this.propagationConfig,
      ...config,
    };
  }

  /**
   * Get current propagation configuration
   */
  getConfig(): ChangePropagationConfig {
    return { ...this.propagationConfig };
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Mark event as completed
   */
  async markEventCompleted(eventId: string): Promise<void> {
    for (const [sourceId, events] of Array.from(this.changeEvents)) {
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex >= 0) {
        events[eventIndex] = {
          ...events[eventIndex],
          status: 'completed',
          processedAt: new Date(),
        };
        this.changeEvents.set(sourceId, events);
        return;
      }
    }
  }

  /**
   * Mark event as failed
   */
  async markEventFailed(eventId: string, _error: string): Promise<void> {
    for (const [sourceId, events] of Array.from(this.changeEvents)) {
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex >= 0) {
        events[eventIndex] = {
          ...events[eventIndex],
          status: 'failed',
          processedAt: new Date(),
        };
        this.changeEvents.set(sourceId, events);
        return;
      }
    }
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.changeEvents.clear();
    this.eventCounter = 0;
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    let count = 0;
    for (const events of Array.from(Array.from(this.changeEvents.values()))) {
      count += events.length;
    }
    return count;
  }
}
