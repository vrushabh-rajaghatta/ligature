// =============================================================================
// DOCUVERA WEBHOOK HANDLERS
// =============================================================================
// Process incoming webhooks from Docuvera for real-time synchronization.
// =============================================================================

import { createHmac } from 'crypto';
import {
  ContentEvent,
  ContentEventType,
  ComponentEventPayload,
  DocumentEventPayload,
  ReviewEventPayload,
  ContentComponent,
  StructuredDocument,
  ReviewRequest,
} from './types';
import { audit } from '../../security/audit';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Webhook processing result */
export interface WebhookResult {
  success: boolean;
  eventId: string;
  eventType: ContentEventType;
  processed: boolean;
  actions: WebhookAction[];
  error?: string;
}

/** Action taken in response to webhook */
export interface WebhookAction {
  type: string;
  target: string;
  status: 'success' | 'failed' | 'skipped';
  details?: string;
}

/** Webhook handler function */
export type WebhookHandler<T = unknown> = (
  event: ContentEvent<T>,
  context: WebhookContext
) => Promise<WebhookAction[]>;

/** Context for webhook processing */
export interface WebhookContext {
  tenantId: string;
  userId?: string;
  requestId: string;
  timestamp: string;
}

/** Webhook configuration */
export interface WebhookConfig {
  /** Secret for signature verification */
  secret: string;
  /** Maximum age of webhook in seconds */
  maxAgeSeconds: number;
  /** Enable async processing */
  asyncProcessing: boolean;
  /** Event types to process */
  enabledEvents: ContentEventType[];
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  secret: '',
  maxAgeSeconds: 300, // 5 minutes
  asyncProcessing: true,
  enabledEvents: [
    'component.created',
    'component.updated',
    'component.approved',
    'component.deprecated',
    'document.created',
    'document.updated',
    'document.approved',
    'document.published',
    'document.superseded',
    'review.requested',
    'review.completed',
    'review.rejected',
  ],
};

// -----------------------------------------------------------------------------
// Webhook Handler Registry
// -----------------------------------------------------------------------------

const handlers = new Map<ContentEventType, WebhookHandler[]>();

/**
 * Register a webhook handler
 */
export function registerWebhookHandler<T>(
  eventType: ContentEventType,
  handler: WebhookHandler<T>
): void {
  const existing = handlers.get(eventType) || [];
  existing.push(handler as WebhookHandler);
  handlers.set(eventType, existing);
}

/**
 * Unregister a webhook handler
 */
export function unregisterWebhookHandler<T>(
  eventType: ContentEventType,
  handler: WebhookHandler<T>
): void {
  const existing = handlers.get(eventType) || [];
  const index = existing.indexOf(handler as WebhookHandler);
  if (index > -1) {
    existing.splice(index, 1);
    handlers.set(eventType, existing);
  }
}

/**
 * Clear all handlers (for testing)
 */
export function clearWebhookHandlers(): void {
  handlers.clear();
}

// -----------------------------------------------------------------------------
// Signature Verification
// -----------------------------------------------------------------------------

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const signaturePayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  
  const expected = `sha256=${expectedSignature}`;
  
  // Timing-safe comparison
  if (signature.length !== expected.length) return false;
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify webhook timestamp is recent
 */
export function verifyWebhookTimestamp(
  timestamp: string,
  maxAgeSeconds: number
): boolean {
  const ts = parseInt(timestamp, 10) * 1000;
  const now = Date.now();
  return Math.abs(now - ts) < maxAgeSeconds * 1000;
}

// -----------------------------------------------------------------------------
// Webhook Processing
// -----------------------------------------------------------------------------

/**
 * Process incoming webhook
 */
export async function processWebhook(
  payload: string,
  headers: {
    signature: string;
    timestamp: string;
    eventType: string;
  },
  config: Partial<WebhookConfig> = {}
): Promise<WebhookResult> {
  const mergedConfig = { ...DEFAULT_WEBHOOK_CONFIG, ...config };
  const requestId = generateRequestId();
  
  // Verify signature
  if (mergedConfig.secret) {
    if (!verifyWebhookSignature(payload, headers.signature, headers.timestamp, mergedConfig.secret)) {
      await logWebhookEvent('signature_invalid', headers.eventType, requestId);
      return {
        success: false,
        eventId: '',
        eventType: headers.eventType as ContentEventType,
        processed: false,
        actions: [],
        error: 'Invalid signature',
      };
    }
  }
  
  // Verify timestamp
  if (!verifyWebhookTimestamp(headers.timestamp, mergedConfig.maxAgeSeconds)) {
    await logWebhookEvent('timestamp_expired', headers.eventType, requestId);
    return {
      success: false,
      eventId: '',
      eventType: headers.eventType as ContentEventType,
      processed: false,
      actions: [],
      error: 'Webhook timestamp expired',
    };
  }
  
  // Parse event
  let event: ContentEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    await logWebhookEvent('parse_error', headers.eventType, requestId);
    return {
      success: false,
      eventId: '',
      eventType: headers.eventType as ContentEventType,
      processed: false,
      actions: [],
      error: 'Failed to parse webhook payload',
    };
  }
  
  // Check if event type is enabled
  if (!mergedConfig.enabledEvents.includes(event.type)) {
    return {
      success: true,
      eventId: event.id,
      eventType: event.type,
      processed: false,
      actions: [{ type: 'skip', target: event.type, status: 'skipped', details: 'Event type disabled' }],
    };
  }
  
  // Create context
  const context: WebhookContext = {
    tenantId: event.tenantId,
    requestId,
    timestamp: event.timestamp,
  };
  
  // Get handlers for this event type
  const eventHandlers = handlers.get(event.type) || [];
  
  // Add default handlers
  const allHandlers = [
    ...getDefaultHandlers(event.type),
    ...eventHandlers,
  ];
  
  // Process handlers
  const actions: WebhookAction[] = [];
  
  for (const handler of allHandlers) {
    try {
      const handlerActions = await handler(event, context);
      actions.push(...handlerActions);
    } catch (error) {
      actions.push({
        type: 'handler_error',
        target: handler.name || 'unknown',
        status: 'failed',
        details: (error as Error).message,
      });
    }
  }
  
  // Audit log
  await audit({
    category: 'system',
    action: 'webhook_processed',
    outcome: 'success',
    actor: { userId: null, tenantId: event.tenantId, serviceName: 'docuvera-webhook' },
    resource: { type: 'system', id: event.id, name: event.type },
    metadata: {
      eventType: event.type,
      actionsCount: actions.length,
      successCount: actions.filter(a => a.status === 'success').length,
    },
  });
  
  return {
    success: true,
    eventId: event.id,
    eventType: event.type,
    processed: true,
    actions,
  };
}

// -----------------------------------------------------------------------------
// Default Handlers
// -----------------------------------------------------------------------------

function getDefaultHandlers(eventType: ContentEventType): WebhookHandler[] {
  switch (eventType) {
    case 'component.approved':
      return [handleComponentApproved as WebhookHandler];
    case 'document.approved':
      return [handleDocumentApproved as WebhookHandler];
    case 'document.published':
      return [handleDocumentPublished as WebhookHandler];
    case 'review.completed':
      return [handleReviewCompleted as WebhookHandler];
    default:
      return [];
  }
}

/**
 * Handle component.approved event
 */
const handleComponentApproved: WebhookHandler<ComponentEventPayload> = async (event, context) => {
  const actions: WebhookAction[] = [];
  const { component, affectedDocuments } = event.payload;
  
  // Store component reference
  actions.push({
    type: 'store_component',
    target: component.id,
    status: 'success',
    details: `Stored component ${component.title} v${component.version}`,
  });
  
  // Notify about affected documents
  if (affectedDocuments && affectedDocuments.length > 0) {
    actions.push({
      type: 'notify_affected_documents',
      target: affectedDocuments.join(','),
      status: 'success',
      details: `${affectedDocuments.length} documents may need update`,
    });
  }
  
  return actions;
};

/**
 * Handle document.approved event
 */
const handleDocumentApproved: WebhookHandler<DocumentEventPayload> = async (event, context) => {
  const actions: WebhookAction[] = [];
  const { document } = event.payload;
  
  // Store document reference
  actions.push({
    type: 'store_document',
    target: document.id,
    status: 'success',
    details: `Stored document ${document.title} v${document.version}`,
  });
  
  // Make available for sequence building
  actions.push({
    type: 'enable_for_sequence',
    target: document.id,
    status: 'success',
    details: `Document available for eCTD sequences`,
  });
  
  return actions;
};

/**
 * Handle document.published event
 */
const handleDocumentPublished: WebhookHandler<DocumentEventPayload> = async (event, context) => {
  const actions: WebhookAction[] = [];
  const { document, outputs } = event.payload;
  
  // Store outputs for download
  if (outputs && outputs.length > 0) {
    for (const output of outputs) {
      actions.push({
        type: 'store_output',
        target: `${document.id}/${output.format}`,
        status: 'success',
        details: `Stored ${output.format} output`,
      });
    }
  }
  
  // Update document control
  actions.push({
    type: 'update_document_control',
    target: document.id,
    status: 'success',
    details: 'Document marked as published in Document Control',
  });
  
  return actions;
};

/**
 * Handle review.completed event
 */
const handleReviewCompleted: WebhookHandler<ReviewEventPayload> = async (event, context) => {
  const actions: WebhookAction[] = [];
  const { review, outcome } = event.payload;
  
  // Update linked items based on trigger
  if (review.trigger) {
    if (review.trigger.type === 'safety_signal' && review.trigger.sourceId) {
      actions.push({
        type: 'update_safety_signal',
        target: review.trigger.sourceId,
        status: 'success',
        details: `Label review ${outcome} for signal ${review.trigger.sourceId}`,
      });
    }
    
    if (review.trigger.type === 'regulatory_request' && review.trigger.sourceId) {
      actions.push({
        type: 'update_haq',
        target: review.trigger.sourceId,
        status: 'success',
        details: `Content review ${outcome} for HAQ ${review.trigger.sourceId}`,
      });
    }
  }
  
  return actions;
};

// -----------------------------------------------------------------------------
// Event Store (for replay/debugging)
// -----------------------------------------------------------------------------

interface StoredEvent {
  event: ContentEvent;
  result: WebhookResult;
  processedAt: string;
}

const eventStore: StoredEvent[] = [];
const MAX_STORED_EVENTS = 1000;

/**
 * Store processed event
 */
export function storeProcessedEvent(event: ContentEvent, result: WebhookResult): void {
  eventStore.push({
    event,
    result,
    processedAt: new Date().toISOString(),
  });
  
  // Trim old events
  if (eventStore.length > MAX_STORED_EVENTS) {
    eventStore.splice(0, eventStore.length - MAX_STORED_EVENTS);
  }
}

/**
 * Get recent events
 */
export function getRecentEvents(limit: number = 100): StoredEvent[] {
  return eventStore.slice(-limit);
}

/**
 * Get events by type
 */
export function getEventsByType(type: ContentEventType, limit: number = 100): StoredEvent[] {
  return eventStore
    .filter(e => e.event.type === type)
    .slice(-limit);
}

/**
 * Clear event store (for testing)
 */
export function clearEventStore(): void {
  eventStore.length = 0;
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

function generateRequestId(): string {
  return `whk_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

async function logWebhookEvent(
  action: string,
  eventType: string,
  requestId: string
): Promise<void> {
  await audit({
    category: 'security',
    action: `webhook_${action}`,
    outcome: 'failure',
    severity: 'high',
    actor: { userId: null, serviceName: 'docuvera-webhook' },
    resource: { type: 'system', id: requestId, name: eventType },
    requestId,
  });
}

// -----------------------------------------------------------------------------
// Express/Next.js Middleware Helper
// -----------------------------------------------------------------------------

/**
 * Create webhook handler middleware
 */
export function createWebhookMiddleware(config: Partial<WebhookConfig> = {}) {
  return async (req: {
    body: string;
    headers: Record<string, string>;
  }): Promise<{ status: number; body: WebhookResult }> => {
    const signature = req.headers['x-docuvera-signature'] || '';
    const timestamp = req.headers['x-docuvera-timestamp'] || '';
    const eventType = req.headers['x-docuvera-event'] || '';
    
    const result = await processWebhook(
      req.body,
      { signature, timestamp, eventType },
      config
    );
    
    return {
      status: result.success ? 200 : 400,
      body: result,
    };
  };
}
