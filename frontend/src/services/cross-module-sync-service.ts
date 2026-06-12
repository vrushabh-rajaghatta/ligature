

/**
 * Cross-Module Sync Service
 * 
 * Bridges Zustand stores with Supabase for real-time cross-module event
 * synchronization and workflow execution.
 * 
 * Features:
 * - Bidirectional sync between local Zustand stores and Supabase
 * - Real-time subscriptions for event notifications
 * - Workflow trigger automation
 * - Offline support with queue reconciliation
 * 
 * @module services/cross-module-sync-service
 * @version 0.27.79
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { useCrossModuleStore } from '@/store/useCrossModuleStore';
import { useCrossModuleEventStore, type CrossModuleEvent as StoreEvent } from '@/store/useCrossModuleEventStore';
import { useToastStore } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';
import type {
  ModuleType,
  CrossModuleEventType,
  CrossModuleEvent,
  DataFlowPipeline,
} from '@/domains/cross-module/contracts';

// =============================================================================
// TYPES
// =============================================================================

export interface SupabaseEvent {
  id: string;
  organization_id: string;
  event_type: string;
  source_module: string;
  target_modules: string[];
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  description: string;
  payload: Record<string, unknown>;
  correlation_id?: string;
  triggered_by?: string;
  priority: string;
  is_automated: boolean;
  requires_review: boolean;
  acknowledged_by: string[];
  fully_acknowledged: boolean;
  created_at: string;
}

export interface SupabasePipelineExecution {
  id: string;
  organization_id: string;
  template_id: string;
  pipeline_name: string;
  pipeline_description?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  current_step_index: number;
  total_steps: number;
  step_results: Record<string, unknown>;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface CascadeAction {
  id: string;
  event_id: string;
  action_type: 'create' | 'update' | 'notify' | 'link' | 'archive' | 'trigger-workflow';
  target_module: string;
  entity_type: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  is_automated: boolean;
  result_entity_id?: string;
  result_data?: Record<string, unknown>;
  error_message?: string;
}

// Supabase realtime payload type
interface RealtimePostgresChangesPayload<T> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T | Record<string, never>;
  errors: string[] | null;
}

// Pipeline template row from database
interface PipelineTemplateRow {
  id: string;
  name: string;
  description?: string;
  steps: unknown;
  trigger_config: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SyncState {
  isConnected: boolean;
  lastSyncAt: string | null;
  pendingEvents: CrossModuleEvent[];
  subscriptionChannels: Map<string, ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']>>;
}

// =============================================================================
// SYNC SERVICE SINGLETON
// =============================================================================

class CrossModuleSyncService {
  private state: SyncState = {
    isConnected: false,
    lastSyncAt: null,
    pendingEvents: [],
    subscriptionChannels: new Map(),
  };
  
  private organizationId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  
  /**
   * Initialize the sync service
   */
  async initialize(organizationId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      logger.debug('CrossModuleSync', 'Supabase not configured, running in local-only mode');
      return false;
    }
    
    this.organizationId = organizationId;
    
    try {
      // Set up real-time subscriptions
      await this.setupSubscriptions();
      
      // Sync any pending local events
      await this.syncPendingEvents();
      
      // Load recent events from database
      await this.loadRecentEvents();
      
      this.state.isConnected = true;
      this.state.lastSyncAt = new Date().toISOString();
      this.reconnectAttempts = 0;
      
      logger.debug('CrossModuleSync', 'Initialized successfully');
      return true;
    } catch (error) {
      logger.error('CrossModuleSync', 'Initialization failed', error);
      return false;
    }
  }
  
  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    
    // Unsubscribe from all channels
    for (const [name, channel] of Array.from(this.state.subscriptionChannels)) {
      await supabase.removeChannel(channel);
    }
    
    this.state.subscriptionChannels.clear();
    this.state.isConnected = false;
    
    logger.debug('CrossModuleSync', 'Disconnected');
  }
  
  // =============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =============================================================================
  
  /**
   * Set up real-time subscriptions for cross-module events
   */
  private async setupSubscriptions(): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !this.organizationId) return;
    
    // Subscribe to cross-module events
    const eventsChannel = supabase
      .channel('cross-module-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cross_module_events',
          filter: `organization_id=eq.${this.organizationId}`,
        },
        (payload: RealtimePostgresChangesPayload<SupabaseEvent>) => this.handleEventInsert(payload.new as SupabaseEvent)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cross_module_events',
          filter: `organization_id=eq.${this.organizationId}`,
        },
        (payload: RealtimePostgresChangesPayload<SupabaseEvent>) => this.handleEventUpdate(payload.new as SupabaseEvent)
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('CrossModuleSync', 'Events subscription active');
        }
      });
    
    this.state.subscriptionChannels.set('events', eventsChannel);
    
    // Subscribe to cascade actions
    const actionsChannel = supabase
      .channel('cascade-actions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cascade_actions',
          filter: `organization_id=eq.${this.organizationId}`,
        },
        (payload: RealtimePostgresChangesPayload<CascadeAction>) => this.handleCascadeActionChange(payload)
      )
      .subscribe();
    
    this.state.subscriptionChannels.set('actions', actionsChannel);
    
    // Subscribe to pipeline executions
    const pipelinesChannel = supabase
      .channel('pipeline-executions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_executions',
          filter: `organization_id=eq.${this.organizationId}`,
        },
        (payload: RealtimePostgresChangesPayload<SupabasePipelineExecution>) => this.handlePipelineChange(payload)
      )
      .subscribe();
    
    this.state.subscriptionChannels.set('pipelines', pipelinesChannel);
  }
  
  /**
   * Handle new event from Supabase
   */
  private handleEventInsert(event: SupabaseEvent): void {
    const eventStore = useCrossModuleEventStore.getState();
    
    // Check if we already have this event locally (we created it)
    const existingEvent = eventStore.events.find((e) => e.id === event.id);
    if (existingEvent) return;
    
    // Convert Supabase event to local format and add to store via setState
    const localEvent = this.convertToLocalEvent(event);
    useCrossModuleEventStore.setState({
      events: [localEvent, ...eventStore.events].slice(0, 500)
    });
    
    // Show toast notification for high-priority events
    if (event.priority === 'critical' || event.priority === 'high') {
      this.showEventToast(event);
    }
    
    logger.debug('CrossModuleSync', `New event received: ${event.id}`);
  }
  
  /**
   * Handle event update from Supabase
   */
  private handleEventUpdate(event: SupabaseEvent): void {
    // Update acknowledgment status - use setState since we don't have the moduleId
    if (event.fully_acknowledged) {
      const eventStore = useCrossModuleEventStore.getState();
      useCrossModuleEventStore.setState({
        events: eventStore.events.map((e) =>
          e.id === event.id ? { ...e, acknowledged: true } : e
        )
      });
    }
  }
  
  /**
   * Handle cascade action changes
   */
  private handleCascadeActionChange(payload: RealtimePostgresChangesPayload<CascadeAction>): void {
    const store = useCrossModuleEventStore.getState();
    const action = payload.new || payload.old;
    
    if (!action || !('id' in action)) return;
    
    if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
      // Complete cascade action in local store
      store.completeCascadeAction(action.event_id, action.id, action.result_entity_id);
    } else if (payload.new?.status === 'failed') {
      store.failCascadeAction(action.event_id, action.id, action.error_message);
    }
  }
  
  /**
   * Handle pipeline execution changes
   */
  private handlePipelineChange(payload: RealtimePostgresChangesPayload<SupabasePipelineExecution>): void {
    const execution = payload.new;
    if (!execution) return;
    
    if (payload.eventType === 'INSERT') {
      // New pipeline started - update local state
      logger.debug('CrossModuleSync', `Pipeline started: ${execution.id}`);
    } else if (payload.eventType === 'UPDATE') {
      if (execution.status === 'completed') {
        logger.debug('CrossModuleSync', `Pipeline completed: ${execution.id}`);
        this.showPipelineCompletedToast(execution);
      } else if (execution.status === 'failed') {
        logger.debug('CrossModuleSync', `Pipeline failed: ${execution.id}`);
      }
    }
  }
  
  // =============================================================================
  // EVENT PERSISTENCE
  // =============================================================================
  
  /**
   * Persist an event to Supabase
   */
  async persistEvent(event: Omit<CrossModuleEvent, 'id' | 'timestamp'>): Promise<string | null> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !this.organizationId) {
      // Queue for later sync
      this.queueEvent(event);
      return null;
    }
    
    try {
      const { data, error } = await supabase.rpc('emit_cross_module_event', {
        p_org_id: this.organizationId,
        p_event_type: event.eventType,
        p_source_module: event.sourceModule,
        p_target_modules: event.targetModules,
        p_entity_type: event.entityType,
        p_entity_id: event.entityId,
        p_description: event.description,
        p_payload: event.payload,
        p_triggered_by: event.triggeredBy || null,
        p_correlation_id: event.correlationId || null,
        p_priority: 'medium',
      });
      
      if (error) {
        logger.error('CrossModuleSync', 'Failed to persist event', error);
        this.queueEvent(event);
        return null;
      }
      
      return data as string;
    } catch (error) {
      logger.error('CrossModuleSync', 'Event persistence error', error);
      this.queueEvent(event);
      return null;
    }
  }
  
  /**
   * Queue an event for later sync
   */
  private queueEvent(event: Omit<CrossModuleEvent, 'id' | 'timestamp'>): void {
    // Create a temporary local event
    const localEvent: CrossModuleEvent = {
      ...event,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    } as CrossModuleEvent;
    
    this.state.pendingEvents.push(localEvent);
  }
  
  /**
   * Sync pending events to Supabase
   */
  private async syncPendingEvents(): Promise<void> {
    if (this.state.pendingEvents.length === 0) return;
    
    const events = [...this.state.pendingEvents];
    this.state.pendingEvents = [];
    
    for (const event of Array.from(events)) {
      await this.persistEvent(event);
    }
    
    logger.debug('CrossModuleSync', `Synced ${events.length} pending events`);
  }
  
  // =============================================================================
  // LOAD DATA
  // =============================================================================
  
  /**
   * Load recent events from database
   */
  private async loadRecentEvents(): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !this.organizationId) return;
    
    try {
      const { data: events, error } = await supabase
        .from('cross_module_events')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        logger.error('CrossModuleSync', 'Failed to load events', error);
        return;
      }
      
      // Hydrate local store with database events
      const localEvents = (events || []).map((event: unknown) => 
        this.convertToLocalEvent(event as SupabaseEvent)
      );
      const currentEvents = useCrossModuleEventStore.getState().events;
      useCrossModuleEventStore.setState({
        events: [...localEvents, ...currentEvents].slice(0, 500)
      });
      
      logger.debug('CrossModuleSync', `Loaded ${events?.length || 0} events`);
    } catch (error) {
      logger.error('CrossModuleSync', 'Load events error', error);
    }
  }
  
  /**
   * Load active pipelines
   */
  async loadActivePipelines(): Promise<SupabasePipelineExecution[]> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !this.organizationId) return [];
    
    try {
      const { data, error } = await supabase
        .from('pipeline_executions')
        .select('*')
        .eq('organization_id', this.organizationId)
        .in('status', ['running', 'paused'])
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('CrossModuleSync', 'Failed to load pipelines', error);
        return [];
      }
      
      return (data || []) as SupabasePipelineExecution[];
    } catch (error) {
      logger.error('CrossModuleSync', 'Load pipelines error', error);
      return [];
    }
  }
  
  /**
   * Load pipeline templates
   */
  async loadPipelineTemplates(): Promise<DataFlowPipeline[]> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('pipeline_templates')
        .select('*')
        .or(`organization_id.eq.${this.organizationId},is_system.eq.true`)
        .eq('is_active', true);
      
      if (error) {
        logger.error('CrossModuleSync', 'Failed to load templates', error);
        return [];
      }
      
      return (data || []).map((t: PipelineTemplateRow) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        steps: t.steps as DataFlowPipeline['steps'],
        trigger: t.trigger_config as DataFlowPipeline['trigger'],
        active: t.is_active,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    } catch (error) {
      logger.error('CrossModuleSync', 'Load templates error', error);
      return [];
    }
  }
  
  // =============================================================================
  // PIPELINE EXECUTION
  // =============================================================================
  
  /**
   * Start a pipeline execution in Supabase
   */
  async startPipeline(
    templateId: string,
    triggeredBy?: string,
    triggerEventId?: string
  ): Promise<string | null> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !this.organizationId) {
      logger.warn('CrossModuleSync', 'Cannot start pipeline - not connected');
      return null;
    }
    
    try {
      const { data, error } = await supabase.rpc('start_pipeline_execution', {
        p_org_id: this.organizationId,
        p_template_id: templateId,
        p_triggered_by: triggeredBy || null,
        p_trigger_type: triggerEventId ? 'event' : 'manual',
        p_trigger_event_id: triggerEventId || null,
      });
      
      if (error) {
        logger.error('CrossModuleSync', 'Failed to start pipeline', error);
        return null;
      }
      
      return data as string;
    } catch (error) {
      logger.error('CrossModuleSync', 'Start pipeline error', error);
      return null;
    }
  }
  
  /**
   * Complete a pipeline step
   */
  async completeStep(
    executionId: string,
    stepIndex: number,
    outputData: Record<string, unknown> = {}
  ): Promise<boolean> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return false;
    
    try {
      const { data, error } = await supabase.rpc('complete_pipeline_step', {
        p_execution_id: executionId,
        p_step_index: stepIndex,
        p_output_data: outputData,
      });
      
      if (error) {
        logger.error('CrossModuleSync', 'Failed to complete step', error);
        return false;
      }
      
      return data as boolean;
    } catch (error) {
      logger.error('CrossModuleSync', 'Complete step error', error);
      return false;
    }
  }
  
  /**
   * Fail a pipeline step
   */
  async failStep(
    executionId: string,
    stepIndex: number,
    errorMessage: string,
    onError: 'stop' | 'skip' | 'retry' = 'stop'
  ): Promise<boolean> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return false;
    
    try {
      const { data, error } = await supabase.rpc('fail_pipeline_step', {
        p_execution_id: executionId,
        p_step_index: stepIndex,
        p_error_message: errorMessage,
        p_on_error: onError,
      });
      
      if (error) {
        logger.error('CrossModuleSync', 'Failed to fail step', error);
        return false;
      }
      
      return data as boolean;
    } catch (error) {
      logger.error('CrossModuleSync', 'Fail step error', error);
      return false;
    }
  }
  
  // =============================================================================
  // ACKNOWLEDGE EVENTS
  // =============================================================================
  
  /**
   * Acknowledge an event from a module
   */
  async acknowledgeEvent(eventId: string, module: ModuleType): Promise<boolean> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return false;
    
    try {
      const { data, error } = await supabase.rpc('acknowledge_event', {
        p_event_id: eventId,
        p_module: module,
      });
      
      if (error) {
        logger.error('CrossModuleSync', 'Failed to acknowledge event', error);
        return false;
      }
      
      return data as boolean;
    } catch (error) {
      logger.error('CrossModuleSync', 'Acknowledge error', error);
      return false;
    }
  }
  
  // =============================================================================
  // UTILITIES
  // =============================================================================
  
  /**
   * Convert Supabase event to local store format
   */
  private convertToLocalEvent(event: SupabaseEvent): StoreEvent {
    return {
      id: event.id,
      type: event.event_type as StoreEvent['type'],
      sourceModule: event.source_module as StoreEvent['sourceModule'],
      targetModules: event.target_modules as StoreEvent['targetModules'],
      payload: event.payload,
      timestamp: event.created_at,
      acknowledged: event.fully_acknowledged,
      acknowledgedBy: (event.acknowledged_by || []) as StoreEvent['acknowledgedBy'],
      cascadeActions: [], // Will be populated separately if needed
      metadata: {
        priority: event.priority as 'critical' | 'high' | 'medium' | 'low',
        automated: event.is_automated,
        requiresReview: event.requires_review,
      },
    };
  }
  
  /**
   * Show toast for incoming event
   */
  private showEventToast(event: SupabaseEvent): void {
    const toastStore = useToastStore.getState();
    
    toastStore.addToast({
      type: 'cross-module',
      message: event.description,
      sourceModule: this.mapModule(event.source_module),
      targetModule: event.target_modules[0] ? this.mapModule(event.target_modules[0]) : 'system',
      duration: 5000,
    });
  }
  
  /**
   * Show toast for completed pipeline
   */
  private showPipelineCompletedToast(execution: SupabasePipelineExecution): void {
    const toastStore = useToastStore.getState();
    
    toastStore.addToast({
      type: 'cross-module',
      message: `Pipeline completed: ${execution.pipeline_name}`,
      sourceModule: 'pipeline',
      targetModule: 'system',
      duration: 4000,
    });
  }
  
  /**
   * Map module type to toast module
   */
  private mapModule(module: string): 'safety' | 'haq' | 'tmf' | 'ctms' | 'authoring' | 'submissions' | 'documents' | 'qms' | 'labeling' | 'pipeline' | 'ai' | 'system' {
    const map: Record<string, 'safety' | 'haq' | 'tmf' | 'ctms' | 'authoring' | 'submissions' | 'documents' | 'qms' | 'labeling' | 'pipeline' | 'ai' | 'system'> = {
      safety: 'safety',
      haq: 'haq',
      tmf: 'tmf',
      ctms: 'ctms',
      authoring: 'authoring',
      submissions: 'submissions',
      labeling: 'labeling',
      quality: 'qms',
      psmf: 'qms',
      regulatory: 'documents',
    };
    return map[module] || 'system';
  }
  
  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.state.isConnected;
  }
  
  /**
   * Get last sync timestamp
   */
  get lastSyncAt(): string | null {
    return this.state.lastSyncAt;
  }
  
  /**
   * Get pending event count
   */
  get pendingEventCount(): number {
    return this.state.pendingEvents.length;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const crossModuleSyncService = new CrossModuleSyncService();

// =============================================================================
// REACT HOOK
// =============================================================================

import { useEffect, useState, useCallback } from 'react';

/**
 * React hook for cross-module sync
 */
export function useCrossModuleSync(organizationId?: string) {
  const [isConnected, setIsConnected] = useState(crossModuleSyncService.isConnected);
  const [isInitializing, setIsInitializing] = useState(false);
  
  useEffect(() => {
    if (!organizationId) return;
    
    const init = async () => {
      setIsInitializing(true);
      const success = await crossModuleSyncService.initialize(organizationId);
      setIsConnected(success);
      setIsInitializing(false);
    };
    
    init();
    
    return () => {
      crossModuleSyncService.disconnect();
    };
  }, [organizationId]);
  
  const persistEvent = useCallback(async (event: Omit<CrossModuleEvent, 'id' | 'timestamp'>) => {
    return crossModuleSyncService.persistEvent(event);
  }, []);
  
  const startPipeline = useCallback(async (templateId: string, triggeredBy?: string, triggerEventId?: string) => {
    return crossModuleSyncService.startPipeline(templateId, triggeredBy, triggerEventId);
  }, []);
  
  const acknowledgeEvent = useCallback(async (eventId: string, module: ModuleType) => {
    return crossModuleSyncService.acknowledgeEvent(eventId, module);
  }, []);
  
  return {
    isConnected,
    isInitializing,
    persistEvent,
    startPipeline,
    acknowledgeEvent,
    loadPipelines: () => crossModuleSyncService.loadActivePipelines(),
    loadTemplates: () => crossModuleSyncService.loadPipelineTemplates(),
    pendingEventCount: crossModuleSyncService.pendingEventCount,
    lastSyncAt: crossModuleSyncService.lastSyncAt,
  };
}
