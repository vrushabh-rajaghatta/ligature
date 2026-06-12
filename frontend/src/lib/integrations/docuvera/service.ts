// =============================================================================
// DOCUVERA INTEGRATION SERVICE
// =============================================================================
// Orchestrates integration between Ligature and Docuvera.
// Provides high-level operations for submission assembly, safety updates,
// HAQ responses, and content synchronization.
// =============================================================================

import { DocuveraClient, getDocuveraClient, ApiResponse } from './client';
import {
  ContentComponent,
  StructuredDocument,
  DocumentType,
  DocumentStatus,
  OutputFormat,
  ReviewRequest,
  ReviewTrigger,
  ComponentSearchParams,
  DocumentSearchParams,
  SearchResult,
  EctdMapping,
  SubmissionContentRequirements,
  RequiredSection,
  SyncConfig,
} from './types';
import { registerWebhookHandler, WebhookAction } from './webhooks';
import { audit, generateCorrelationId } from '../../security/audit';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Content item for sequence building */
export interface SequenceContentItem {
  ectdSection: string;
  ectdModule: string;
  leafTitle: string;
  documentId: string;
  documentTitle: string;
  componentIds: string[];
  outputFormat: OutputFormat;
  outputUrl?: string;
  checksum?: string;
  status: 'pending' | 'ready' | 'missing' | 'error';
  error?: string;
}

/** Safety-triggered label update request */
export interface SafetyLabelUpdateRequest {
  signalId: string;
  signalType: string;
  productId: string;
  affectedSections: string[];
  severity: 'routine' | 'urgent' | 'critical';
  safetyData: {
    eventType: string;
    eventDescription: string;
    frequency?: string;
    recommendation?: string;
    supportingData?: Record<string, unknown>;
  };
  requestedBy: string;
  dueDate: string;
}

/** HAQ content search request */
export interface HaqContentSearchRequest {
  haqId: string;
  productId: string;
  query: string;
  documentTypes?: DocumentType[];
  sections?: string[];
  maxResults?: number;
}

/** HAQ content search result */
export interface HaqContentSearchResult {
  haqId: string;
  matches: {
    componentId: string;
    documentId: string;
    documentTitle: string;
    section: string;
    title: string;
    excerpt: string;
    relevanceScore: number;
    version: string;
    approvedAt?: string;
  }[];
  totalMatches: number;
}

/** Sync status */
export interface SyncStatus {
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  status: 'idle' | 'syncing' | 'error';
  stats: {
    componentsAdded: number;
    componentsUpdated: number;
    documentsAdded: number;
    documentsUpdated: number;
  };
  errors: string[];
}

// -----------------------------------------------------------------------------
// Integration Service Class
// -----------------------------------------------------------------------------

export class DocuveraIntegrationService {
  private client: DocuveraClient;
  private syncConfig: SyncConfig;
  private syncStatus: SyncStatus = {
    lastSyncAt: null,
    nextSyncAt: null,
    status: 'idle',
    stats: { componentsAdded: 0, componentsUpdated: 0, documentsAdded: 0, documentsUpdated: 0 },
    errors: [],
  };
  private syncInterval: NodeJS.Timeout | null = null;

  // In-memory cache (would be database in production)
  private componentCache = new Map<string, ContentComponent>();
  private documentCache = new Map<string, StructuredDocument>();
  private mappingCache = new Map<string, EctdMapping>();

  constructor(client?: DocuveraClient, syncConfig?: Partial<SyncConfig>) {
    this.client = client || getDocuveraClient();
    this.syncConfig = {
      autoSyncApproved: true,
      autoSyncComponents: true,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      documentTypes: ['smpc', 'uspi', 'pil', 'csr', 'ib', 'protocol'],
      markets: ['US', 'EU', 'GB'],
      ...syncConfig,
    };

    // Register webhook handlers
    this.registerWebhookHandlers();
  }

  // ---------------------------------------------------------------------------
  // Submission Assembly
  // ---------------------------------------------------------------------------

  /**
   * Get content requirements for a submission
   */
  async getSubmissionContentRequirements(
    submissionType: string,
    healthAuthority: string
  ): Promise<SubmissionContentRequirements> {
    // This would typically come from a database or configuration
    // Simplified example for common submission types
    const requirements: SubmissionContentRequirements = {
      submissionType,
      healthAuthority,
      requiredSections: [],
      optionalSections: [],
    };

    // Add sections based on submission type
    if (submissionType === 'nda' || submissionType === 'bla') {
      requirements.requiredSections = [
        { ectdSection: '1.3', title: 'Product Information', documentTypes: ['uspi', 'smpc', 'pil'], mandatory: true },
        { ectdSection: '2.5', title: 'Clinical Overview', documentTypes: ['csr'], mandatory: true },
        { ectdSection: '2.7', title: 'Clinical Summary', documentTypes: ['csr'], mandatory: true },
      ];
    } else if (submissionType === 'variation') {
      requirements.requiredSections = [
        { ectdSection: '1.3', title: 'Product Information', documentTypes: ['smpc', 'pil'], mandatory: true },
      ];
    }

    return requirements;
  }

  /**
   * Get available content for sequence building
   */
  async getAvailableContentForSequence(
    productId: string,
    requirements: SubmissionContentRequirements
  ): Promise<SequenceContentItem[]> {
    const correlationId = generateCorrelationId();
    const items: SequenceContentItem[] = [];

    for (const section of [...requirements.requiredSections, ...requirements.optionalSections]) {
      const item = await this.findContentForSection(productId, section);
      items.push(item);
    }

    // Audit
    await audit({
      category: 'data_access',
      action: 'get_sequence_content',
      outcome: 'success',
      actor: { userId: null, serviceName: 'docuvera-integration' },
      resource: { type: 'submission', id: productId },
      metadata: { 
        itemCount: items.length,
        readyCount: items.filter(i => i.status === 'ready').length,
      },
      correlationId,
    });

    return items;
  }

  /**
   * Find content for a specific eCTD section
   */
  private async findContentForSection(
    productId: string,
    section: RequiredSection
  ): Promise<SequenceContentItem> {
    // Search for matching documents
    const searchResult = await this.client.searchDocuments({
      productId,
      type: section.documentTypes,
      status: ['approved'],
      limit: 1,
    });

    if (!searchResult.success || !searchResult.data?.items.length) {
      return {
        ectdSection: section.ectdSection,
        ectdModule: section.ectdSection.split('.')[0],
        leafTitle: section.title,
        documentId: '',
        documentTitle: '',
        componentIds: [],
        outputFormat: 'pdf',
        status: 'missing',
      };
    }

    const doc = searchResult.data.items[0];

    // Get outputs
    const outputsResult = await this.client.getDocumentOutputs(doc.id);
    const pdfOutput = outputsResult.data?.find(o => o.format === 'pdf');

    return {
      ectdSection: section.ectdSection,
      ectdModule: section.ectdSection.split('.')[0],
      leafTitle: section.title,
      documentId: doc.id,
      documentTitle: doc.title,
      componentIds: doc.components.map(c => c.componentId),
      outputFormat: 'pdf',
      outputUrl: pdfOutput?.url,
      checksum: pdfOutput?.checksum,
      status: pdfOutput ? 'ready' : 'pending',
    };
  }

  /**
   * Download content for sequence inclusion
   */
  async downloadContentForSequence(
    documentId: string,
    format: OutputFormat = 'pdf'
  ): Promise<ApiResponse<{ content: Buffer; checksum: string; filename: string }>> {
    const downloadResult = await this.client.downloadDocumentOutput(documentId, format);
    
    if (!downloadResult.success || !downloadResult.data?.url) {
      return {
        success: false,
        error: downloadResult.error || { code: 'NOT_FOUND', message: 'Output not available' },
      };
    }

    // In production, would actually fetch the content
    // For now, return placeholder
    return {
      success: true,
      data: {
        content: Buffer.from(''),
        checksum: '',
        filename: `${documentId}.${format}`,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Safety-Triggered Label Updates
  // ---------------------------------------------------------------------------

  /**
   * Trigger label review based on safety signal
   */
  async triggerSafetyLabelUpdate(
    request: SafetyLabelUpdateRequest
  ): Promise<ApiResponse<ReviewRequest>> {
    const correlationId = generateCorrelationId();

    // Find affected components
    const affectedComponents: string[] = [];
    for (const section of request.affectedSections) {
      const component = await this.findComponentBySection(request.productId, section);
      if (component) {
        affectedComponents.push(component.id);
      }
    }

    if (affectedComponents.length === 0) {
      return {
        success: false,
        error: { 
          code: 'NO_COMPONENTS', 
          message: 'No components found for affected sections' 
        },
      };
    }

    // Create review trigger
    const trigger: ReviewTrigger = {
      type: 'safety_signal',
      sourceSystem: 'ligature',
      sourceId: request.signalId,
      description: `Safety signal: ${request.safetyData.eventType}`,
      data: {
        signalType: request.signalType,
        severity: request.severity,
        ...request.safetyData,
      },
    };

    // Determine priority based on severity
    const priorityMap = {
      routine: 'normal' as const,
      urgent: 'high' as const,
      critical: 'urgent' as const,
    };

    // Create review request
    const result = await this.client.createReview({
      componentIds: affectedComponents,
      type: 'safety_update',
      priority: priorityMap[request.severity],
      dueDate: request.dueDate,
      reviewers: [], // Would be populated from configuration
      trigger,
    });

    // Audit
    await audit({
      category: 'data_modification',
      action: 'trigger_label_review',
      outcome: result.success ? 'success' : 'failure',
      severity: request.severity === 'critical' ? 'critical' : 'high',
      actor: { userId: request.requestedBy, serviceName: 'docuvera-integration' },
      resource: { type: 'document', id: request.productId },
      metadata: {
        signalId: request.signalId,
        affectedSections: request.affectedSections,
        severity: request.severity,
        reviewId: result.data?.id,
      },
      correlationId,
    });

    return result;
  }

  /**
   * Find component by section identifier
   */
  private async findComponentBySection(
    productId: string,
    section: string
  ): Promise<ContentComponent | null> {
    // Check cache first
    const cacheKey = `${productId}:${section}`;
    if (this.componentCache.has(cacheKey)) {
      return this.componentCache.get(cacheKey)!;
    }

    const result = await this.client.getComponentBySection(productId, section);
    if (result.success && result.data) {
      this.componentCache.set(cacheKey, result.data);
      return result.data;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // HAQ Response Support
  // ---------------------------------------------------------------------------

  /**
   * Search content for HAQ response
   */
  async searchContentForHaq(
    request: HaqContentSearchRequest
  ): Promise<HaqContentSearchResult> {
    const correlationId = generateCorrelationId();
    const matches: HaqContentSearchResult['matches'] = [];

    // Search components
    const componentSearch = await this.client.searchComponents({
      query: request.query,
      productId: request.productId,
      status: ['approved'],
      limit: request.maxResults || 20,
    });

    if (componentSearch.success && componentSearch.data) {
      for (const comp of componentSearch.data.items) {
        // Get parent document
        const deps = await this.client.getComponentDependencies(comp.id);
        const parentDoc = deps.data?.usedIn[0];

        matches.push({
          componentId: comp.id,
          documentId: parentDoc?.documentId || '',
          documentTitle: parentDoc?.documentTitle || '',
          section: comp.section,
          title: comp.title,
          excerpt: this.extractExcerpt(comp.content.body, request.query),
          relevanceScore: this.calculateRelevance(comp, request.query),
          version: comp.version,
          approvedAt: comp.approvedAt,
        });
      }
    }

    // Sort by relevance
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Audit
    await audit({
      category: 'data_access',
      action: 'search_content_for_haq',
      outcome: 'success',
      actor: { userId: null, serviceName: 'docuvera-integration' },
      resource: { type: 'document', id: request.haqId },
      metadata: {
        productId: request.productId,
        query: request.query,
        matchCount: matches.length,
      },
      correlationId,
    });

    return {
      haqId: request.haqId,
      matches,
      totalMatches: matches.length,
    };
  }

  /**
   * Extract relevant excerpt from content
   */
  private extractExcerpt(content: string, query: string): string {
    const words = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Find first occurrence of any query word
    let startIndex = content.length;
    for (const word of words) {
      const index = contentLower.indexOf(word);
      if (index !== -1 && index < startIndex) {
        startIndex = index;
      }
    }

    if (startIndex >= content.length) {
      return content.substring(0, 200) + '...';
    }

    // Extract context around match
    const contextStart = Math.max(0, startIndex - 50);
    const contextEnd = Math.min(content.length, startIndex + 150);
    let excerpt = content.substring(contextStart, contextEnd);

    if (contextStart > 0) excerpt = '...' + excerpt;
    if (contextEnd < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  /**
   * Calculate relevance score (simplified)
   */
  private calculateRelevance(component: ContentComponent, query: string): number {
    const words = query.toLowerCase().split(/\s+/);
    const content = component.content.body.toLowerCase();
    const title = component.title.toLowerCase();
    
    let score = 0;
    for (const word of words) {
      // Title match is worth more
      if (title.includes(word)) score += 10;
      // Content matches
      const matches = (content.match(new RegExp(word, 'g')) || []).length;
      score += Math.min(matches, 5); // Cap at 5 per word
    }

    // Boost approved content
    if (component.status === 'approved') score *= 1.5;

    return score;
  }

  // ---------------------------------------------------------------------------
  // Content Synchronization
  // ---------------------------------------------------------------------------

  /**
   * Start periodic sync
   */
  startSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(
      () => this.performSync(),
      this.syncConfig.syncInterval
    );

    // Initial sync
    this.performSync();
  }

  /**
   * Stop periodic sync
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Perform sync
   */
  async performSync(): Promise<void> {
    if (this.syncStatus.status === 'syncing') return;

    this.syncStatus.status = 'syncing';
    this.syncStatus.errors = [];

    const stats = {
      componentsAdded: 0,
      componentsUpdated: 0,
      documentsAdded: 0,
      documentsUpdated: 0,
    };

    try {
      const since = this.syncStatus.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const changes = await this.client.getChangesSince(since, {
        types: this.syncConfig.documentTypes,
        markets: this.syncConfig.markets,
      });

      if (changes.success && changes.data) {
        // Process components
        for (const comp of changes.data.components) {
          const isNew = !this.componentCache.has(comp.id);
          this.componentCache.set(comp.id, comp);
          if (isNew) stats.componentsAdded++;
          else stats.componentsUpdated++;
        }

        // Process documents
        for (const doc of changes.data.documents) {
          const isNew = !this.documentCache.has(doc.id);
          this.documentCache.set(doc.id, doc);
          if (isNew) stats.documentsAdded++;
          else stats.documentsUpdated++;
        }
      }

      this.syncStatus.lastSyncAt = new Date().toISOString();
      this.syncStatus.stats = stats;
      this.syncStatus.status = 'idle';
    } catch (error) {
      this.syncStatus.status = 'error';
      this.syncStatus.errors.push((error as Error).message);
    }

    this.syncStatus.nextSyncAt = new Date(Date.now() + this.syncConfig.syncInterval).toISOString();
  }

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  /**
   * Get cached component
   */
  getCachedComponent(componentId: string): ContentComponent | undefined {
    return this.componentCache.get(componentId);
  }

  /**
   * Get cached document
   */
  getCachedDocument(documentId: string): StructuredDocument | undefined {
    return this.documentCache.get(documentId);
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.componentCache.clear();
    this.documentCache.clear();
    this.mappingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { components: number; documents: number; mappings: number } {
    return {
      components: this.componentCache.size,
      documents: this.documentCache.size,
      mappings: this.mappingCache.size,
    };
  }

  // ---------------------------------------------------------------------------
  // Webhook Handler Registration
  // ---------------------------------------------------------------------------

  private registerWebhookHandlers(): void {
    // Handle document approval
    registerWebhookHandler('document.approved', async (event, context) => {
      const actions: WebhookAction[] = [];
      const doc = (event.payload as any).document as StructuredDocument;

      // Update cache
      this.documentCache.set(doc.id, doc);
      actions.push({
        type: 'cache_update',
        target: doc.id,
        status: 'success',
        details: 'Document cached for sequence building',
      });

      return actions;
    });

    // Handle component approval
    registerWebhookHandler('component.approved', async (event, context) => {
      const actions: WebhookAction[] = [];
      const comp = (event.payload as any).component as ContentComponent;

      // Update cache
      this.componentCache.set(comp.id, comp);
      actions.push({
        type: 'cache_update',
        target: comp.id,
        status: 'success',
        details: 'Component cached',
      });

      return actions;
    });
  }
}

// -----------------------------------------------------------------------------
// Singleton Instance
// -----------------------------------------------------------------------------

let serviceInstance: DocuveraIntegrationService | null = null;

/**
 * Get or create integration service instance
 */
export function getDocuveraIntegrationService(
  client?: DocuveraClient,
  syncConfig?: Partial<SyncConfig>
): DocuveraIntegrationService {
  if (!serviceInstance) {
    serviceInstance = new DocuveraIntegrationService(client, syncConfig);
  }
  return serviceInstance;
}

/**
 * Reset service instance (for testing)
 */
export function resetDocuveraIntegrationService(): void {
  if (serviceInstance) {
    serviceInstance.stopSync();
    serviceInstance.clearCaches();
  }
  serviceInstance = null;
}
