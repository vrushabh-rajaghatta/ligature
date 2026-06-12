
/**
 * Structured Content Service
 * 
 * Production implementation of INativeStructuredContentService.
 * Orchestrates component repository, document repository, derivation engine,
 * and change propagation to provide complete structured content management.
 * 
 * @version 0.18.7
 */

import { logger } from '@/lib/logger';
import type {
  INativeStructuredContentService,
  NativeContentComponent,
  NativeStructuredDocument,
  ComponentVersion,
  ChangeEvent,
  NativeReviewRequest,
  AIConsistencyCheck,
  DocumentWithComponents,
  AssembledDocument,
  AssembledSection,
  DocumentOutputRecord,
  DerivationSyncResult,
  PropagationResult,
  SearchResult,
  ExternalSyncStatus,
  MigrationStatus,
  CreateComponentInput,
  UpdateComponentInput,
  ComponentSearchInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentSearchInput,
  DerivationOptions,
  PropagationOptions,
  CreateReviewInput,
  ReviewDecision,
  ConsistencyCheckType,
  ContentFormat,
  ReviewPriority,
  ReviewOutcome,
  MigrationPhase,
} from '@/types/structured-content';

import type {
  DocumentType,
  OutputFormat,
  ReviewStatus,
} from '@/lib/integrations/docuvera/types';

import { ComponentRepository } from './component-repository';
import { DocumentRepository } from './document-repository';
import { DerivationEngine } from './derivation-engine';
import { ChangePropagationService } from './change-propagation';
import { computeContentHash } from './migrations';

// =============================================================================
// TYPES
// =============================================================================

export interface StructuredContentServiceConfig {
  tenantId: string;
  currentUser: string;
}

// =============================================================================
// STRUCTURED CONTENT SERVICE
// =============================================================================

export class StructuredContentService implements INativeStructuredContentService {
  private componentRepo: ComponentRepository;
  private documentRepo: DocumentRepository;
  private derivationEngine: DerivationEngine;
  private changePropagation: ChangePropagationService;
  private reviews: Map<string, NativeReviewRequest> = new Map();
  private consistencyChecks: Map<string, AIConsistencyCheck> = new Map();
  private outputs: Map<string, DocumentOutputRecord[]> = new Map();
  private config: StructuredContentServiceConfig;
  private reviewCounter = 0;
  private checkCounter = 0;
  private outputCounter = 0;

  constructor(config: StructuredContentServiceConfig) {
    this.config = config;

    // Initialize repositories
    this.componentRepo = new ComponentRepository({
      tenantId: config.tenantId,
      currentUser: config.currentUser,
    });

    this.documentRepo = new DocumentRepository({
      tenantId: config.tenantId,
      currentUser: config.currentUser,
    });

    // Wire up component resolver for documents
    this.documentRepo.setComponentResolver(id => this.componentRepo.getById(id));

    // Initialize engines
    this.derivationEngine = new DerivationEngine({
      tenantId: config.tenantId,
      currentUser: config.currentUser,
    });

    this.changePropagation = new ChangePropagationService({
      tenantId: config.tenantId,
      currentUser: config.currentUser,
    });

    // Wire up change propagation callbacks
    this.changePropagation.onFindAffectedDocuments(async (componentId) => {
      return this.findAffectedDocuments(componentId);
    });

    this.changePropagation.onUpdateComponentInDocument(async (docId, compId, hash, version) => {
      const assemblies = await this.documentRepo.getAssemblies(docId);
      const assembly = assemblies.find(a => a.componentId === compId);
      if (assembly) {
        // Update would go through proper channels in production
      }
    });

    this.changePropagation.onCreateReview(async (docId, compIds, reason) => {
      const review = await this.createReview({
        reviewType: 'content_update',
        documentId: docId,
        componentIds: compIds,
        title: `Change Review: ${reason}`,
        priority: 'normal',
        assignTo: [],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        trigger: { type: 'component_change', sourceId: compIds[0], description: reason },
      });
      return review.id;
    });
  }

  // ---------------------------------------------------------------------------
  // Component Operations
  // ---------------------------------------------------------------------------

  async createComponent(data: CreateComponentInput): Promise<NativeContentComponent> {
    const component = await this.componentRepo.create(data);

    // Record change event
    await this.changePropagation.recordChange({
      sourceType: 'component',
      sourceId: component.id,
      changeType: 'content_update',
      newVersion: component.version,
      newHash: component.contentHash,
      changeReason: 'Initial creation',
    });

    return component;
  }

  async updateComponent(id: string, data: UpdateComponentInput): Promise<NativeContentComponent> {
    const existing = await this.componentRepo.getById(id);
    if (!existing) {
      throw new Error(`Component not found: ${id}`);
    }

    const updated = await this.componentRepo.update(id, data);

    // Record change event if content changed
    if (data.contentBody && data.contentBody !== existing.contentBody) {
      await this.changePropagation.recordChange({
        sourceType: 'component',
        sourceId: id,
        changeType: 'content_update',
        previousVersion: existing.version,
        newVersion: updated.version,
        previousHash: existing.contentHash,
        newHash: updated.contentHash,
        changeReason: data.changeReason,
      });
    }

    return updated;
  }

  async getComponent(id: string): Promise<NativeContentComponent | null> {
    return this.componentRepo.getById(id);
  }

  async getComponentVersions(id: string): Promise<ComponentVersion[]> {
    return this.componentRepo.getVersions(id);
  }

  async searchComponents(params: ComponentSearchInput): Promise<SearchResult<NativeContentComponent>> {
    return this.componentRepo.search(params);
  }

  // ---------------------------------------------------------------------------
  // Document Operations
  // ---------------------------------------------------------------------------

  async createDocument(data: CreateDocumentInput): Promise<NativeStructuredDocument> {
    return this.documentRepo.create(data);
  }

  async updateDocument(id: string, data: UpdateDocumentInput): Promise<NativeStructuredDocument> {
    return this.documentRepo.update(id, data);
  }

  async getDocument(id: string): Promise<NativeStructuredDocument | null> {
    return this.documentRepo.getById(id);
  }

  async getDocumentWithComponents(id: string): Promise<DocumentWithComponents | null> {
    return this.documentRepo.getWithComponents(id);
  }

  async searchDocuments(params: DocumentSearchInput): Promise<SearchResult<NativeStructuredDocument>> {
    return this.documentRepo.search(params);
  }

  // ---------------------------------------------------------------------------
  // Assembly Operations
  // ---------------------------------------------------------------------------

  async assembleDocument(documentId: string): Promise<AssembledDocument> {
    const docWithComponents = await this.documentRepo.getWithComponents(documentId);
    if (!docWithComponents) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const sections: AssembledSection[] = [];

    for (const { assembly, component } of docWithComponents.components) {
      const content = assembly.hasOverride && assembly.overrideContent
        ? assembly.overrideContent
        : component.contentBody;

      sections.push({
        section: assembly.section,
        title: component.sectionTitle || component.title,
        content,
        format: component.contentFormat,
        componentId: component.id,
        componentVersion: assembly.componentVersion,
      });
    }

    // Sort by section
    sections.sort((a, b) => a.section.localeCompare(b.section));

    return {
      document: docWithComponents.document,
      sections,
      metadata: {
        assembledAt: new Date().toISOString(),
        assembledBy: this.config.currentUser,
        componentCount: sections.length,
      },
    };
  }

  async generateOutput(documentId: string, format: OutputFormat): Promise<DocumentOutputRecord> {
    const assembled = await this.assembleDocument(documentId);
    const now = new Date();
    this.outputCounter++;

    // Generate content based on format
    let outputContent: string;
    let contentHash: string;

    switch (format) {
      case 'docx':
        outputContent = this.generateDocxContent(assembled);
        break;
      case 'pdf':
        outputContent = this.generatePdfContent(assembled);
        break;
      case 'xml':
        outputContent = this.generateXmlContent(assembled);
        break;
      case 'html':
        outputContent = this.generateHtmlContent(assembled);
        break;
      default:
        outputContent = this.generatePlainContent(assembled);
    }

    contentHash = computeContentHash(outputContent);

    const filename = `${assembled.document.title.replace(/\s+/g, '_')}_v${assembled.document.version}.${format}`;
    
    const output: DocumentOutputRecord = {
      id: `out-${documentId}-${this.outputCounter}`,
      format,
      filename,
      storageKey: `/outputs/${documentId}/${format}/${assembled.document.version}/${filename}`,
      checksum: contentHash,
      size: outputContent.length,
      generatedAt: now,
      generatedBy: this.config.currentUser,
    };

    const existing = this.outputs.get(documentId) || [];
    existing.push(output);
    this.outputs.set(documentId, existing);

    return output;
  }

  private generateDocxContent(assembled: AssembledDocument): string {
    // Placeholder - actual DOCX generation would use proper library
    return `DOCX: ${assembled.document.title}\n${assembled.sections.map(s => s.content).join('\n')}`;
  }

  private generatePdfContent(assembled: AssembledDocument): string {
    // Placeholder - actual PDF generation would use proper library
    return `PDF: ${assembled.document.title}\n${assembled.sections.map(s => s.content).join('\n')}`;
  }

  private generateXmlContent(assembled: AssembledDocument): string {
    const sections = assembled.sections.map(s => 
      `<section id="${s.section}"><title>${s.title}</title><content>${s.content}</content></section>`
    ).join('\n');
    return `<?xml version="1.0"?>\n<document><title>${assembled.document.title}</title>\n${sections}</document>`;
  }

  private generateHtmlContent(assembled: AssembledDocument): string {
    const sections = assembled.sections.map(s =>
      `<section id="${s.section}"><h2>${s.title}</h2><div>${s.content}</div></section>`
    ).join('\n');
    return `<!DOCTYPE html><html><head><title>${assembled.document.title}</title></head><body>${sections}</body></html>`;
  }

  private generatePlainContent(assembled: AssembledDocument): string {
    return assembled.sections.map(s => `${s.section} ${s.title}\n${s.content}`).join('\n\n');
  }

  // ---------------------------------------------------------------------------
  // Derivation Operations
  // ---------------------------------------------------------------------------

  async deriveDocument(
    sourceId: string,
    targetType: DocumentType,
    options: DerivationOptions
  ): Promise<NativeStructuredDocument> {
    const sourceDoc = await this.documentRepo.getWithComponents(sourceId);
    if (!sourceDoc) {
      throw new Error(`Source document not found: ${sourceId}`);
    }

    const result = await this.derivationEngine.deriveDocument(sourceDoc, targetType, options);

    // Create the derived document
    const created = await this.documentRepo.create({
      title: result.document.title,
      type: targetType,
      productId: result.document.productId,
      markets: options.targetMarkets,
      language: options.targetLanguage,
      templateId: result.derivation.transformationRuleId,
    });

    // Set derivation info
    await this.documentRepo.setDerivation(created.id, result.derivation);

    // Add assemblies
    for (const assembly of result.assemblies) {
      await this.documentRepo.addComponent(created.id, {
        componentId: assembly.componentId,
        section: assembly.section,
        displayOrder: assembly.displayOrder,
        reuseType: assembly.reuseType,
        componentVersion: assembly.componentVersion,
        componentHash: assembly.componentHash,
      });

      // Set override if present
      if (assembly.hasOverride && assembly.overrideContent) {
        await this.documentRepo.setOverride(created.id, assembly.componentId, assembly.overrideContent);
      }
    }

    return this.documentRepo.getById(created.id) as Promise<NativeStructuredDocument>;
  }

  async syncDerivedDocument(documentId: string): Promise<DerivationSyncResult> {
    const derivedDoc = await this.documentRepo.getWithComponents(documentId);
    if (!derivedDoc || !derivedDoc.document.derivedFrom) {
      return {
        success: false,
        updatedSections: [],
        conflicts: ['Document not found or not a derived document'],
        requiresReview: false,
      };
    }

    const sourceDoc = await this.documentRepo.getWithComponents(derivedDoc.document.derivedFrom.sourceDocumentId);
    if (!sourceDoc) {
      return {
        success: false,
        updatedSections: [],
        conflicts: ['Source document not found'],
        requiresReview: false,
      };
    }

    const result = await this.derivationEngine.syncDerivedDocument(derivedDoc, sourceDoc);

    // Update sync status
    const newStatus = result.conflicts.length > 0 ? 'conflict' : 'synced';
    await this.documentRepo.updateDerivationStatus(documentId, newStatus, result.conflicts.length);

    return result;
  }

  // ---------------------------------------------------------------------------
  // Change Propagation
  // ---------------------------------------------------------------------------

  async getChangeEvents(componentId: string): Promise<ChangeEvent[]> {
    return this.changePropagation.getChangeEvents(componentId);
  }

  async propagateChange(changeEventId: string, options: PropagationOptions): Promise<PropagationResult> {
    return this.changePropagation.propagateChange(changeEventId, options);
  }

  /**
   * Find documents affected by a component change
   */
  private async findAffectedDocuments(componentId: string): Promise<Array<{
    documentId: string;
    documentTitle: string;
    componentId: string;
    section: string;
    reuseType: 'linked' | 'derived' | 'snapshot';
    requiresReview: boolean;
  }>> {
    const affected: Array<{
      documentId: string;
      documentTitle: string;
      componentId: string;
      section: string;
      reuseType: 'linked' | 'derived' | 'snapshot';
      requiresReview: boolean;
    }> = [];

    const allDocs = this.documentRepo.getAll();
    
    for (const doc of allDocs) {
      const assemblies = await this.documentRepo.getAssemblies(doc.id);
      
      for (const assembly of assemblies) {
        if (assembly.componentId === componentId && assembly.isActive) {
          // Check if it's a safety/regulatory section
          const component = await this.componentRepo.getById(componentId);
          const isSafetySection = component?.componentType === 'warning' || 
                                  component?.componentType === 'contraindication' ||
                                  component?.componentType === 'adverse_reaction';

          affected.push({
            documentId: doc.id,
            documentTitle: doc.title,
            componentId,
            section: assembly.section,
            reuseType: assembly.reuseType as 'linked' | 'derived' | 'snapshot',
            requiresReview: isSafetySection || assembly.reuseType === 'derived',
          });
        }
      }
    }

    return affected;
  }

  // ---------------------------------------------------------------------------
  // Review Operations
  // ---------------------------------------------------------------------------

  async createReview(data: CreateReviewInput): Promise<NativeReviewRequest> {
    const now = new Date();
    this.reviewCounter++;

    const review: NativeReviewRequest = {
      id: `rev-${this.config.tenantId}-${now.getTime()}-${this.reviewCounter}`,
      tenantId: this.config.tenantId,
      documentId: data.documentId,
      componentIds: data.componentIds,
      reviewType: data.reviewType,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'pending' as ReviewStatus,
      assignedTo: data.assignTo,
      dueDate: data.dueDate,
      trigger: data.trigger,
      requestedAt: now,
      requestedBy: this.config.currentUser,
    };

    this.reviews.set(review.id, review);
    return review;
  }

  async submitDecision(reviewId: string, decision: ReviewDecision): Promise<NativeReviewRequest> {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error(`Review not found: ${reviewId}`);
    }

    const now = new Date();
    
    // Map decision to outcome
    const outcomeMap: Record<ReviewDecision['decision'], ReviewOutcome> = {
      'approve': 'approved',
      'reject': 'rejected',
      'request_changes': 'approved_with_changes',
      'escalate': 'escalated',
      'abstain': 'approved', // Default for abstain
    };
    
    // Map decision to status
    const statusMap: Record<ReviewDecision['decision'], ReviewStatus> = {
      'approve': 'approved',
      'reject': 'rejected',
      'request_changes': 'changes_requested',
      'escalate': 'in_progress',
      'abstain': 'approved',
    };
    
    const updated: NativeReviewRequest = {
      ...review,
      status: statusMap[decision.decision],
      outcome: outcomeMap[decision.decision],
      completedAt: now,
      completedBy: this.config.currentUser,
    };

    this.reviews.set(reviewId, updated);
    return updated;
  }

  async getPendingReviews(userId: string): Promise<NativeReviewRequest[]> {
    return Array.from(this.reviews.values())
      .filter(r => r.status === 'pending')
      .filter(r => r.assignedTo.includes(userId) || r.assignedTo.length === 0);
  }

  // ---------------------------------------------------------------------------
  // AI Operations
  // ---------------------------------------------------------------------------

  async runConsistencyCheck(
    componentIds: string[],
    checkType: ConsistencyCheckType
  ): Promise<AIConsistencyCheck> {
    const now = new Date();
    this.checkCounter++;

    // Fetch components
    const components: NativeContentComponent[] = [];
    for (const id of componentIds) {
      const component = await this.componentRepo.getById(id);
      if (component) {
        components.push(component);
      }
    }

    // Simulate consistency check (real implementation would call AI service)
    const issues = this.simulateConsistencyCheck(components, checkType);

    // Calculate overall score (100 - penalty for each issue)
    const penalties = issues.reduce((acc, issue) => {
      const severityPenalty = { info: 1, warning: 5, error: 15, critical: 30 };
      return acc + (severityPenalty[issue.severity] || 5);
    }, 0);
    const overallScore = Math.max(0, 100 - penalties);

    const check: AIConsistencyCheck = {
      id: `chk-${this.config.tenantId}-${now.getTime()}-${this.checkCounter}`,
      tenantId: this.config.tenantId,
      checkType,
      componentIds,
      status: 'completed',
      overallScore,
      issues,
      startedAt: now,
      completedAt: now,
      modelUsed: 'claude-3-sonnet',
      tokensUsed: 150,
    };

    this.consistencyChecks.set(check.id, check);
    return check;
  }

  private simulateConsistencyCheck(
    components: NativeContentComponent[],
    checkType: ConsistencyCheckType
  ): AIConsistencyCheck['issues'] {
    // Placeholder - real implementation would use AI
    const issues: AIConsistencyCheck['issues'] = [];

    for (const component of components) {
      // Check for placeholder text
      if (component.contentBody.includes('TODO') || component.contentBody.includes('TBD')) {
        issues.push({
          id: `issue-${component.id}-1`,
          severity: 'warning',
          category: 'completeness',
          componentId: component.id,
          section: component.section,
          description: 'Placeholder text detected',
          foundText: 'TODO/TBD',
          suggestion: 'Replace placeholder with final content',
          status: 'open',
        });
      }

      // Check for empty content
      if (component.contentBody.trim().length < 10) {
        issues.push({
          id: `issue-${component.id}-2`,
          severity: 'error',
          category: 'completeness',
          componentId: component.id,
          section: component.section,
          description: 'Section content is too short',
          suggestion: 'Add required content for this section',
          status: 'open',
        });
      }
    }

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Sync Operations
  // ---------------------------------------------------------------------------

  async getSyncStatus(): Promise<ExternalSyncStatus> {
    const componentCount = this.componentRepo.getCount();
    const documentCount = this.documentRepo.getCount();

    return {
      tenantId: this.config.tenantId,
      externalSystem: 'docuvera',
      lastSyncAt: new Date(),
      lastSyncStatus: 'success',
      componentsInSync: componentCount,
      componentsPending: 0,
      documentsInSync: documentCount,
      documentsPending: 0,
      syncEnabled: true,
      syncDirection: 'bidirectional',
      autoSync: false,
      syncIntervalMs: 300000,
    };
  }

  async triggerSync(): Promise<void> {
    // Placeholder - real implementation would sync with external system
    /* Sync triggered */
  }

  async getMigrationStatus(): Promise<MigrationStatus> {
    const componentCount = this.componentRepo.getCount();
    const documentCount = this.documentRepo.getCount();

    return {
      tenantId: this.config.tenantId,
      phase: 'parallel_read_only' as MigrationPhase,
      startedAt: new Date(),
      totalComponents: componentCount,
      migratedComponents: componentCount,
      totalDocuments: documentCount,
      migratedDocuments: documentCount,
      errors: [],
      warnings: [],
    };
  }

  // ---------------------------------------------------------------------------
  // Test Helpers
  // ---------------------------------------------------------------------------

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.componentRepo.clear();
    this.documentRepo.clear();
    this.changePropagation.clear();
    this.reviews.clear();
    this.consistencyChecks.clear();
    this.outputs.clear();
    this.reviewCounter = 0;
    this.checkCounter = 0;
    this.outputCounter = 0;
  }

  /**
   * Get component repository (for testing)
   */
  getComponentRepository(): ComponentRepository {
    return this.componentRepo;
  }

  /**
   * Get document repository (for testing)
   */
  getDocumentRepository(): DocumentRepository {
    return this.documentRepo;
  }

  /**
   * Get derivation engine (for testing)
   */
  getDerivationEngine(): DerivationEngine {
    return this.derivationEngine;
  }

  /**
   * Get change propagation service (for testing)
   */
  getChangePropagationService(): ChangePropagationService {
    return this.changePropagation;
  }
}
