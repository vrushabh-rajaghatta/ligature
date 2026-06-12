
/**
 * Component Repository
 * 
 * CRUD operations for content components in the native structured content system.
 * Provides data access layer for NativeContentComponent entities.
 * 
 * @version 0.18.7
 */

import type {
  NativeContentComponent,
  ComponentVersion,
  CreateComponentInput,
  UpdateComponentInput,
  ComponentSearchInput,
  SearchResult,
  ContentFormat,
  ComponentType,
} from '@/types/structured-content';

import type { ComponentStatus, ComponentReuseType } from '@/lib/integrations/docuvera/types';

import { computeContentHash, generateComponentId } from './migrations';

// =============================================================================
// TYPES
// =============================================================================

export interface ComponentRepositoryConfig {
  tenantId: string;
  currentUser: string;
}

export interface ComponentFilter {
  productId?: string;
  section?: string;
  status?: ComponentStatus[];
  componentType?: ComponentType[];
  language?: string;
  markets?: string[];
  tags?: string[];
  isLatest?: boolean;
}

// =============================================================================
// COMPONENT REPOSITORY
// =============================================================================

export class ComponentRepository {
  private components: Map<string, NativeContentComponent> = new Map();
  private versions: Map<string, ComponentVersion[]> = new Map();
  private config: ComponentRepositoryConfig;

  constructor(config: ComponentRepositoryConfig) {
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Create a new content component
   */
  async create(input: CreateComponentInput): Promise<NativeContentComponent> {
    const now = new Date();
    const id = generateComponentId();
    const contentHash = computeContentHash(input.contentBody);

    const component: NativeContentComponent = {
      id,
      tenantId: this.config.tenantId,
      title: input.title,
      section: input.section,
      contentFormat: input.contentFormat,
      contentBody: input.contentBody,
      contentHash,
      status: 'draft' as ComponentStatus,
      version: '1.0',
      versionNumber: 1,
      isLatest: true,
      reuseType: input.reuseType || ('source' as ComponentReuseType),
      sourceComponentId: input.sourceComponentId,
      productId: input.productId,
      markets: input.markets,
      language: input.language,
      componentType: input.componentType,
      tags: input.tags || [],
      createdAt: now,
      createdBy: this.config.currentUser,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    this.components.set(id, component);

    // Create initial version record
    const initialVersion: ComponentVersion = {
      id: `ver-${id}-1`,
      componentId: id,
      version: '1.0',
      versionNumber: 1,
      contentFormat: input.contentFormat,
      contentBody: input.contentBody,
      contentHash,
      changeReason: 'Initial creation',
      changeType: 'initial',
      status: 'draft' as ComponentStatus,
      createdAt: now,
      createdBy: this.config.currentUser,
    };

    this.versions.set(id, [initialVersion]);

    return component;
  }

  /**
   * Update an existing component
   */
  async update(id: string, input: UpdateComponentInput): Promise<NativeContentComponent> {
    const component = this.components.get(id);
    if (!component) {
      throw new Error(`Component not found: ${id}`);
    }

    if (component.tenantId !== this.config.tenantId) {
      throw new Error(`Access denied to component: ${id}`);
    }

    const now = new Date();
    const contentChanged = input.contentBody !== undefined && input.contentBody !== component.contentBody;
    const newContentHash = contentChanged ? computeContentHash(input.contentBody!) : component.contentHash;

    const updated: NativeContentComponent = {
      ...component,
      title: input.title ?? component.title,
      contentBody: input.contentBody ?? component.contentBody,
      contentHash: newContentHash,
      status: input.status ?? component.status,
      markets: input.markets ?? component.markets,
      tags: input.tags ?? component.tags,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    // Bump version if content changed
    if (contentChanged) {
      updated.versionNumber = component.versionNumber + 1;
      updated.version = `${updated.versionNumber}.0`;

      // Create version record
      const versionRecord: ComponentVersion = {
        id: `ver-${id}-${updated.versionNumber}`,
        componentId: id,
        version: updated.version,
        versionNumber: updated.versionNumber,
        contentFormat: component.contentFormat,
        contentBody: input.contentBody!,
        contentHash: newContentHash,
        changeReason: input.changeReason,
        changeType: 'content_edit',
        previousVersionId: this.getLatestVersionId(id),
        status: updated.status,
        createdAt: now,
        createdBy: this.config.currentUser,
      };

      const existingVersions = this.versions.get(id) || [];
      existingVersions.push(versionRecord);
      this.versions.set(id, existingVersions);
    }

    this.components.set(id, updated);
    return updated;
  }

  /**
   * Get a component by ID
   */
  async getById(id: string): Promise<NativeContentComponent | null> {
    const component = this.components.get(id);
    if (!component) return null;

    // Tenant isolation
    if (component.tenantId !== this.config.tenantId) {
      return null;
    }

    return component;
  }

  /**
   * Get all versions of a component
   */
  async getVersions(componentId: string): Promise<ComponentVersion[]> {
    const component = await this.getById(componentId);
    if (!component) return [];

    return this.versions.get(componentId) || [];
  }

  /**
   * Get a specific version of a component
   */
  async getVersion(componentId: string, versionNumber: number): Promise<ComponentVersion | null> {
    const versions = await this.getVersions(componentId);
    return versions.find(v => v.versionNumber === versionNumber) || null;
  }

  /**
   * Delete a component (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const component = await this.getById(id);
    if (!component) return false;

    const now = new Date();
    const updated: NativeContentComponent = {
      ...component,
      deletedAt: now,
      deletedBy: this.config.currentUser,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    this.components.set(id, updated);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Search Operations
  // ---------------------------------------------------------------------------

  /**
   * Search components with filters
   */
  async search(params: ComponentSearchInput): Promise<SearchResult<NativeContentComponent>> {
    let results = Array.from(this.components.values())
      .filter(c => c.tenantId === this.config.tenantId)
      .filter(c => !c.deletedAt);

    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.contentBody.toLowerCase().includes(query) ||
        c.section.toLowerCase().includes(query)
      );
    }

    if (params.productId) {
      results = results.filter(c => c.productId === params.productId);
    }

    if (params.section) {
      results = results.filter(c => c.section.startsWith(params.section!));
    }

    if (params.status?.length) {
      results = results.filter(c => params.status!.includes(c.status));
    }

    if (params.componentType?.length) {
      results = results.filter(c => params.componentType!.includes(c.componentType));
    }

    if (params.language) {
      results = results.filter(c => c.language === params.language);
    }

    if (params.markets?.length) {
      results = results.filter(c =>
        params.markets!.some(m => c.markets.includes(m))
      );
    }

    if (params.tags?.length) {
      results = results.filter(c =>
        params.tags!.some(t => c.tags.includes(t))
      );
    }

    // Sort by section, then by title
    results.sort((a, b) => {
      const sectionCompare = a.section.localeCompare(b.section);
      if (sectionCompare !== 0) return sectionCompare;
      return a.title.localeCompare(b.title);
    });

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
   * Find components by product
   */
  async findByProduct(productId: string): Promise<NativeContentComponent[]> {
    return Array.from(this.components.values())
      .filter(c => c.tenantId === this.config.tenantId)
      .filter(c => !c.deletedAt)
      .filter(c => c.productId === productId);
  }

  /**
   * Find components by section prefix
   */
  async findBySection(sectionPrefix: string): Promise<NativeContentComponent[]> {
    return Array.from(this.components.values())
      .filter(c => c.tenantId === this.config.tenantId)
      .filter(c => !c.deletedAt)
      .filter(c => c.section.startsWith(sectionPrefix));
  }

  /**
   * Find linked/derived components from a source
   */
  async findDerived(sourceComponentId: string): Promise<NativeContentComponent[]> {
    return Array.from(this.components.values())
      .filter(c => c.tenantId === this.config.tenantId)
      .filter(c => !c.deletedAt)
      .filter(c => c.sourceComponentId === sourceComponentId);
  }

  // ---------------------------------------------------------------------------
  // Status Operations
  // ---------------------------------------------------------------------------

  /**
   * Change component status (with validation)
   */
  async setStatus(id: string, status: ComponentStatus, reason: string): Promise<NativeContentComponent> {
    const component = await this.getById(id);
    if (!component) {
      throw new Error(`Component not found: ${id}`);
    }

    // Validate status transition
    this.validateStatusTransition(component.status, status);

    const now = new Date();
    const updated: NativeContentComponent = {
      ...component,
      status,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    // Set approval info if transitioning to approved
    if (status === 'approved') {
      updated.approvedAt = now;
      updated.approvedBy = this.config.currentUser;
    }

    // Set lock info if transitioning to locked
    if (status === 'locked') {
      updated.lockedAt = now;
      updated.lockedBy = this.config.currentUser;
    }

    this.components.set(id, updated);
    return updated;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(from: ComponentStatus, to: ComponentStatus): void {
    const validTransitions: Record<ComponentStatus, ComponentStatus[]> = {
      'draft': ['in_review', 'deprecated'],
      'in_review': ['draft', 'approved', 'deprecated'],
      'approved': ['locked', 'deprecated'],
      'locked': ['deprecated'],
      'deprecated': [],
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
   * Get the latest version ID for a component
   */
  private getLatestVersionId(componentId: string): string | undefined {
    const versions = this.versions.get(componentId) || [];
    if (versions.length === 0) return undefined;
    return versions[versions.length - 1].id;
  }

  /**
   * Check if content hash matches
   */
  async verifyContentHash(id: string): Promise<boolean> {
    const component = await this.getById(id);
    if (!component) return false;

    const computedHash = computeContentHash(component.contentBody);
    return computedHash === component.contentHash;
  }

  /**
   * Bulk load components (for initialization/migration)
   */
  async bulkLoad(components: NativeContentComponent[]): Promise<void> {
    for (const component of components) {
      if (component.tenantId === this.config.tenantId) {
        this.components.set(component.id, component);
      }
    }
  }

  /**
   * Get component count
   */
  getCount(): number {
    return Array.from(this.components.values())
      .filter(c => c.tenantId === this.config.tenantId)
      .filter(c => !c.deletedAt)
      .length;
  }

  /**
   * Clear all components (for testing)
   */
  clear(): void {
    this.components.clear();
    this.versions.clear();
  }

  /**
   * Get all components (for debugging)
   */
  getAll(): NativeContentComponent[] {
    return Array.from(this.components.values())
      .filter(c => c.tenantId === this.config.tenantId)
      .filter(c => !c.deletedAt);
  }
}
