
/**
 * Document Repository
 * 
 * CRUD operations for structured documents in the native structured content system.
 * Manages document entities and their component assemblies.
 * 
 * @version 0.18.7
 */

import type {
  NativeStructuredDocument,
  DocumentComponentAssembly,
  DocumentWithComponents,
  NativeContentComponent,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentSearchInput,
  SearchResult,
  DocumentDerivation,
  DerivationSyncStatus,
} from '@/types/structured-content';

import type {
  DocumentType,
  DocumentCategory,
  DocumentStatus,
  ComponentReuseType,
} from '@/lib/integrations/docuvera/types';

import { generateDocumentId, generateAssemblyId, computeContentHash } from './migrations';

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentRepositoryConfig {
  tenantId: string;
  currentUser: string;
}

export interface AddComponentInput {
  componentId: string;
  section: string;
  displayOrder: number;
  reuseType: ComponentReuseType;
  componentVersion: string;
  componentHash: string;
}

// =============================================================================
// DOCUMENT REPOSITORY
// =============================================================================

export class DocumentRepository {
  private documents: Map<string, NativeStructuredDocument> = new Map();
  private assemblies: Map<string, DocumentComponentAssembly[]> = new Map();
  private componentResolver?: (id: string) => Promise<NativeContentComponent | null>;
  private config: DocumentRepositoryConfig;

  constructor(config: DocumentRepositoryConfig) {
    this.config = config;
  }

  /**
   * Set component resolver for fetching component details
   */
  setComponentResolver(resolver: (id: string) => Promise<NativeContentComponent | null>): void {
    this.componentResolver = resolver;
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Create a new document
   */
  async create(input: CreateDocumentInput): Promise<NativeStructuredDocument> {
    const now = new Date();
    const id = generateDocumentId();

    // Determine category from type
    const category = this.determineCategory(input.type);

    const document: NativeStructuredDocument = {
      id,
      tenantId: this.config.tenantId,
      title: input.title,
      type: input.type,
      category,
      productId: input.productId,
      status: 'draft' as DocumentStatus,
      version: '1.0',
      versionNumber: 1,
      isLatest: true,
      markets: input.markets,
      language: input.language,
      templateId: input.templateId,
      regulatoryRefs: [],
      createdAt: now,
      createdBy: this.config.currentUser,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    this.documents.set(id, document);
    this.assemblies.set(id, []);

    return document;
  }

  /**
   * Update an existing document
   */
  async update(id: string, input: UpdateDocumentInput): Promise<NativeStructuredDocument> {
    const document = this.documents.get(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }

    if (document.tenantId !== this.config.tenantId) {
      throw new Error(`Access denied to document: ${id}`);
    }

    const now = new Date();

    const updated: NativeStructuredDocument = {
      ...document,
      title: input.title ?? document.title,
      status: input.status ?? document.status,
      markets: input.markets ?? document.markets,
      effectiveDate: input.effectiveDate ?? document.effectiveDate,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    this.documents.set(id, updated);
    return updated;
  }

  /**
   * Get a document by ID
   */
  async getById(id: string): Promise<NativeStructuredDocument | null> {
    const document = this.documents.get(id);
    if (!document) return null;

    if (document.tenantId !== this.config.tenantId) {
      return null;
    }

    return document;
  }

  /**
   * Get document with all its components
   */
  async getWithComponents(id: string): Promise<DocumentWithComponents | null> {
    const document = await this.getById(id);
    if (!document) return null;

    const assemblies = this.assemblies.get(id) || [];
    const components: DocumentWithComponents['components'] = [];

    for (const assembly of assemblies) {
      if (!assembly.isActive) continue;

      let component: NativeContentComponent | null = null;
      if (this.componentResolver) {
        component = await this.componentResolver(assembly.componentId);
      }

      if (component) {
        components.push({ assembly, component });
      }
    }

    // Sort by displayOrder
    components.sort((a, b) => a.assembly.displayOrder - b.assembly.displayOrder);

    return { document, components };
  }

  /**
   * Delete a document (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const document = await this.getById(id);
    if (!document) return false;

    const now = new Date();
    const updated: NativeStructuredDocument = {
      ...document,
      deletedAt: now,
      deletedBy: this.config.currentUser,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    this.documents.set(id, updated);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Search Operations
  // ---------------------------------------------------------------------------

  /**
   * Search documents with filters
   */
  async search(params: DocumentSearchInput): Promise<SearchResult<NativeStructuredDocument>> {
    let results = Array.from(this.documents.values())
      .filter(d => d.tenantId === this.config.tenantId)
      .filter(d => !d.deletedAt);

    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter(d =>
        d.title.toLowerCase().includes(query)
      );
    }

    if (params.productId) {
      results = results.filter(d => d.productId === params.productId);
    }

    if (params.type?.length) {
      results = results.filter(d => params.type!.includes(d.type));
    }

    if (params.category) {
      results = results.filter(d => d.category === params.category);
    }

    if (params.status?.length) {
      results = results.filter(d => params.status!.includes(d.status));
    }

    if (params.markets?.length) {
      results = results.filter(d =>
        params.markets!.some(m => d.markets.includes(m))
      );
    }

    // Sort by updated date (newest first)
    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const total = results.length;
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    return {
      items: results.slice(offset, offset + limit),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Find documents by product
   */
  async findByProduct(productId: string): Promise<NativeStructuredDocument[]> {
    return Array.from(this.documents.values())
      .filter(d => d.tenantId === this.config.tenantId)
      .filter(d => !d.deletedAt)
      .filter(d => d.productId === productId);
  }

  /**
   * Find documents by type
   */
  async findByType(type: DocumentType): Promise<NativeStructuredDocument[]> {
    return Array.from(this.documents.values())
      .filter(d => d.tenantId === this.config.tenantId)
      .filter(d => !d.deletedAt)
      .filter(d => d.type === type);
  }

  /**
   * Find derived documents from a source
   */
  async findDerived(sourceDocumentId: string): Promise<NativeStructuredDocument[]> {
    return Array.from(this.documents.values())
      .filter(d => d.tenantId === this.config.tenantId)
      .filter(d => !d.deletedAt)
      .filter(d => d.derivedFrom?.sourceDocumentId === sourceDocumentId);
  }

  // ---------------------------------------------------------------------------
  // Assembly Operations
  // ---------------------------------------------------------------------------

  /**
   * Add a component to a document
   */
  async addComponent(documentId: string, input: AddComponentInput): Promise<DocumentComponentAssembly> {
    const document = await this.getById(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const now = new Date();
    const assembly: DocumentComponentAssembly = {
      id: generateAssemblyId(),
      documentId,
      componentId: input.componentId,
      section: input.section,
      displayOrder: input.displayOrder,
      reuseType: input.reuseType,
      componentVersion: input.componentVersion,
      componentHash: input.componentHash,
      hasOverride: false,
      isActive: true,
      addedAt: now,
      addedBy: this.config.currentUser,
    };

    const existing = this.assemblies.get(documentId) || [];
    existing.push(assembly);
    this.assemblies.set(documentId, existing);

    return assembly;
  }

  /**
   * Remove a component from a document
   */
  async removeComponent(documentId: string, componentId: string): Promise<boolean> {
    const assemblies = this.assemblies.get(documentId);
    if (!assemblies) return false;

    const now = new Date();
    const updated = assemblies.map(a => {
      if (a.componentId === componentId && a.isActive) {
        return {
          ...a,
          isActive: false,
          updatedAt: now,
          updatedBy: this.config.currentUser,
        };
      }
      return a;
    });

    this.assemblies.set(documentId, updated);
    return true;
  }

  /**
   * Update component order in a document
   */
  async reorderComponents(documentId: string, componentOrder: string[]): Promise<void> {
    const assemblies = this.assemblies.get(documentId);
    if (!assemblies) return;

    const now = new Date();
    const updated = assemblies.map(a => {
      const newOrder = componentOrder.indexOf(a.componentId);
      if (newOrder !== -1 && a.isActive) {
        return {
          ...a,
          displayOrder: newOrder,
          updatedAt: now,
          updatedBy: this.config.currentUser,
        };
      }
      return a;
    });

    this.assemblies.set(documentId, updated);
  }

  /**
   * Get assemblies for a document
   */
  async getAssemblies(documentId: string): Promise<DocumentComponentAssembly[]> {
    return (this.assemblies.get(documentId) || []).filter(a => a.isActive);
  }

  /**
   * Update assembly with override content
   */
  async setOverride(
    documentId: string,
    componentId: string,
    overrideContent: string
  ): Promise<DocumentComponentAssembly | null> {
    const assemblies = this.assemblies.get(documentId);
    if (!assemblies) return null;

    const now = new Date();
    let result: DocumentComponentAssembly | null = null;

    const updated = assemblies.map(a => {
      if (a.componentId === componentId && a.isActive) {
        result = {
          ...a,
          hasOverride: true,
          overrideContent,
          updatedAt: now,
          updatedBy: this.config.currentUser,
        };
        return result;
      }
      return a;
    });

    this.assemblies.set(documentId, updated);
    return result;
  }

  /**
   * Clear override content
   */
  async clearOverride(documentId: string, componentId: string): Promise<boolean> {
    const assemblies = this.assemblies.get(documentId);
    if (!assemblies) return false;

    const now = new Date();
    const updated = assemblies.map(a => {
      if (a.componentId === componentId && a.isActive && a.hasOverride) {
        return {
          ...a,
          hasOverride: false,
          overrideContent: undefined,
          updatedAt: now,
          updatedBy: this.config.currentUser,
        };
      }
      return a;
    });

    this.assemblies.set(documentId, updated);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Derivation Operations
  // ---------------------------------------------------------------------------

  /**
   * Set derivation info on a document
   */
  async setDerivation(documentId: string, derivation: DocumentDerivation): Promise<void> {
    const document = await this.getById(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const now = new Date();
    const updated: NativeStructuredDocument = {
      ...document,
      derivedFrom: derivation,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    this.documents.set(documentId, updated);
  }

  /**
   * Update derivation sync status
   */
  async updateDerivationStatus(
    documentId: string,
    syncStatus: DerivationSyncStatus,
    pendingChanges: number
  ): Promise<void> {
    const document = await this.getById(documentId);
    if (!document || !document.derivedFrom) {
      return;
    }

    const now = new Date();
    const updated: NativeStructuredDocument = {
      ...document,
      derivedFrom: {
        ...document.derivedFrom,
        syncStatus,
        pendingChanges,
        lastSyncedAt: now,
      },
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    this.documents.set(documentId, updated);
  }

  // ---------------------------------------------------------------------------
  // Status Operations
  // ---------------------------------------------------------------------------

  /**
   * Change document status
   */
  async setStatus(id: string, status: DocumentStatus, reason: string): Promise<NativeStructuredDocument> {
    const document = await this.getById(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }

    this.validateStatusTransition(document.status, status);

    const now = new Date();
    const updated: NativeStructuredDocument = {
      ...document,
      status,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    if (status === 'approved') {
      updated.approvedAt = now;
      updated.approvedBy = this.config.currentUser;
      updated.publishedAt = now;
      updated.publishedBy = this.config.currentUser;
    }

    this.documents.set(id, updated);
    return updated;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(from: DocumentStatus, to: DocumentStatus): void {
    const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
      'draft': ['in_review', 'withdrawn'],
      'in_review': ['draft', 'pending_approval', 'withdrawn'],
      'pending_approval': ['in_review', 'approved', 'withdrawn'],
      'approved': ['superseded', 'withdrawn'],
      'superseded': ['withdrawn'],
      'withdrawn': [],
    };

    const allowed = validTransitions[from] || [];
    if (!allowed.includes(to)) {
      throw new Error(`Invalid status transition: ${from} → ${to}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Determine category from document type
   */
  private determineCategory(type: DocumentType): DocumentCategory {
    const categoryMap: Record<string, DocumentCategory> = {
      'ccds': 'labeling',
      'smpc': 'labeling',
      'uspi': 'labeling',
      'pil': 'labeling',
      'epi': 'labeling',
      'protocol': 'clinical',
      'csr': 'clinical',
      'ib': 'clinical',
      'dsur': 'clinical',
      'psur': 'clinical',
      'sop': 'quality',
      'wi': 'quality',
      'form': 'quality',
      'specification': 'quality',
      'ctd_module': 'regulatory',
      'cover_letter': 'regulatory',
      'response_document': 'regulatory',
    };
    return categoryMap[type] || 'regulatory';
  }

  /**
   * Bump document version
   */
  async bumpVersion(id: string, reason: string): Promise<NativeStructuredDocument> {
    const document = await this.getById(id);
    if (!document) {
      throw new Error(`Document not found: ${id}`);
    }

    const now = new Date();
    const newVersionNumber = document.versionNumber + 1;

    const updated: NativeStructuredDocument = {
      ...document,
      versionNumber: newVersionNumber,
      version: `${newVersionNumber}.0`,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    this.documents.set(id, updated);
    return updated;
  }

  /**
   * Bulk load documents (for initialization/migration)
   */
  async bulkLoad(documents: NativeStructuredDocument[]): Promise<void> {
    for (const document of documents) {
      if (document.tenantId === this.config.tenantId) {
        this.documents.set(document.id, document);
      }
    }
  }

  /**
   * Bulk load assemblies
   */
  async bulkLoadAssemblies(documentId: string, assemblies: DocumentComponentAssembly[]): Promise<void> {
    this.assemblies.set(documentId, assemblies);
  }

  /**
   * Get document count
   */
  getCount(): number {
    return Array.from(this.documents.values())
      .filter(d => d.tenantId === this.config.tenantId)
      .filter(d => !d.deletedAt)
      .length;
  }

  /**
   * Clear all documents (for testing)
   */
  clear(): void {
    this.documents.clear();
    this.assemblies.clear();
  }

  /**
   * Get all documents (for debugging)
   */
  getAll(): NativeStructuredDocument[] {
    return Array.from(this.documents.values())
      .filter(d => d.tenantId === this.config.tenantId)
      .filter(d => !d.deletedAt);
  }
}
