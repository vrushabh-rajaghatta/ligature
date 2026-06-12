
/**
 * Derivation Engine
 * 
 * Handles document derivation workflows: CCDS → SmPC/USPI/PIL.
 * Manages transformation rules, section mappings, and sync operations.
 * 
 * @version 0.18.7
 */

import type {
  NativeStructuredDocument,
  NativeContentComponent,
  DocumentComponentAssembly,
  DocumentDerivation,
  DerivationType,
  DerivationSyncStatus,
  DerivationOptions,
  DerivationSyncResult,
  DerivationTransformRule,
  SectionMapping,
  ContentTransform,
  DocumentWithComponents,
} from '@/types/structured-content';

import type { DocumentType, ComponentReuseType } from '@/lib/integrations/docuvera/types';

import { generateDocumentId, generateAssemblyId, computeContentHash } from './migrations';

// =============================================================================
// TYPES
// =============================================================================

export interface DerivationEngineConfig {
  tenantId: string;
  currentUser: string;
}

export interface DerivationResult {
  document: NativeStructuredDocument;
  assemblies: DocumentComponentAssembly[];
  derivation: DocumentDerivation;
}

export interface SectionDiff {
  section: string;
  sourceContent: string;
  targetContent: string;
  hasChanges: boolean;
  isCustomized: boolean;
}

// =============================================================================
// DEFAULT TRANSFORMATION RULES
// =============================================================================

const DEFAULT_SECTION_MAPPINGS: Record<DerivationType, SectionMapping[]> = {
  ccds_to_smpc: [
    { sourceSection: '4.1', targetSection: '4.1', transformType: 'copy' },
    { sourceSection: '4.2', targetSection: '4.2', transformType: 'copy' },
    { sourceSection: '4.3', targetSection: '4.3', transformType: 'copy' },
    { sourceSection: '4.4', targetSection: '4.4', transformType: 'adapt' },
    { sourceSection: '4.5', targetSection: '4.5', transformType: 'copy' },
    { sourceSection: '4.6', targetSection: '4.6', transformType: 'copy' },
    { sourceSection: '4.7', targetSection: '4.7', transformType: 'copy' },
    { sourceSection: '4.8', targetSection: '4.8', transformType: 'adapt' },
    { sourceSection: '4.9', targetSection: '4.9', transformType: 'copy' },
    { sourceSection: '5.1', targetSection: '5.1', transformType: 'copy' },
    { sourceSection: '5.2', targetSection: '5.2', transformType: 'copy' },
    { sourceSection: '6.1', targetSection: '6.1', transformType: 'copy' },
  ],
  ccds_to_uspi: [
    { sourceSection: '4.1', targetSection: '1', transformType: 'adapt' },
    { sourceSection: '4.2', targetSection: '2', transformType: 'adapt' },
    { sourceSection: '4.3', targetSection: '4', transformType: 'copy' },
    { sourceSection: '4.4', targetSection: '5', transformType: 'adapt' },
    { sourceSection: '4.5', targetSection: '7', transformType: 'copy' },
    { sourceSection: '4.8', targetSection: '6', transformType: 'adapt' },
    { sourceSection: '5.1', targetSection: '12', transformType: 'copy' },
    { sourceSection: '5.2', targetSection: '12', transformType: 'merge' },
  ],
  ccds_to_pil: [
    { sourceSection: '4.1', targetSection: '1', transformType: 'adapt' },
    { sourceSection: '4.2', targetSection: '3', transformType: 'adapt' },
    { sourceSection: '4.3', targetSection: '2', transformType: 'adapt' },
    { sourceSection: '4.4', targetSection: '2', transformType: 'merge' },
    { sourceSection: '4.8', targetSection: '4', transformType: 'adapt' },
    { sourceSection: '6.1', targetSection: '5', transformType: 'adapt' },
  ],
  smpc_to_pil: [
    { sourceSection: '4.1', targetSection: '1', transformType: 'adapt' },
    { sourceSection: '4.2', targetSection: '3', transformType: 'adapt' },
    { sourceSection: '4.3', targetSection: '2', transformType: 'adapt' },
    { sourceSection: '4.4', targetSection: '2', transformType: 'merge' },
    { sourceSection: '4.8', targetSection: '4', transformType: 'adapt' },
    { sourceSection: '6.1', targetSection: '5', transformType: 'adapt' },
  ],
  translation: [],
  regional: [],
  custom: [],
};

const TARGET_TYPE_MAP: Record<DerivationType, DocumentType> = {
  ccds_to_smpc: 'smpc',
  ccds_to_uspi: 'uspi',
  ccds_to_pil: 'pil',
  smpc_to_pil: 'pil',
  translation: 'response_document',
  regional: 'response_document',
  custom: 'response_document',
};

// =============================================================================
// DERIVATION ENGINE
// =============================================================================

export class DerivationEngine {
  private transformRules: Map<string, DerivationTransformRule> = new Map();
  private config: DerivationEngineConfig;

  constructor(config: DerivationEngineConfig) {
    this.config = config;
    this.initializeDefaultRules();
  }

  /**
   * Initialize default transformation rules
   */
  private initializeDefaultRules(): void {
    const derivationTypes: DerivationType[] = [
      'ccds_to_smpc',
      'ccds_to_uspi',
      'ccds_to_pil',
      'smpc_to_pil',
    ];

    for (const derivationType of Array.from(derivationTypes)) {
      const [sourceType, targetType] = derivationType.split('_to_') as [DocumentType, DocumentType];
      
      const rule: DerivationTransformRule = {
        id: `rule-${derivationType}`,
        name: `${sourceType.toUpperCase()} to ${targetType.toUpperCase()}`,
        sourceType,
        targetType: TARGET_TYPE_MAP[derivationType],
        sectionMappings: DEFAULT_SECTION_MAPPINGS[derivationType],
        contentTransforms: this.getDefaultTransforms(derivationType),
        isActive: true,
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.transformRules.set(derivationType, rule);
    }
  }

  /**
   * Get default content transforms for a derivation type
   */
  private getDefaultTransforms(derivationType: DerivationType): ContentTransform[] {
    switch (derivationType) {
      case 'ccds_to_pil':
      case 'smpc_to_pil':
        return [
          { type: 'simplify', config: { readingLevel: 8 } },
          { type: 'remove_technical', config: { preserveSafety: true } },
          { type: 'add_context', config: { patientFriendly: true } },
        ];
      case 'ccds_to_uspi':
        return [
          { type: 'add_regional', config: { region: 'US', format: 'PLR' } },
        ];
      case 'ccds_to_smpc':
        return [
          { type: 'add_regional', config: { region: 'EU', format: 'QRD' } },
        ];
      default:
        return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Derivation Operations
  // ---------------------------------------------------------------------------

  /**
   * Derive a new document from a source document
   */
  async deriveDocument(
    sourceDocument: DocumentWithComponents,
    targetType: DocumentType,
    options: DerivationOptions
  ): Promise<DerivationResult> {
    const derivationType = this.determineDerivationType(sourceDocument.document.type, targetType);
    const rule = this.transformRules.get(derivationType);
    
    if (!rule) {
      throw new Error(`No transformation rule found for ${derivationType}`);
    }

    const now = new Date();
    const documentId = generateDocumentId();

    // Create derived document
    const derivedDocument: NativeStructuredDocument = {
      id: documentId,
      tenantId: this.config.tenantId,
      title: this.generateDerivedTitle(sourceDocument.document.title, targetType, options),
      type: targetType,
      category: sourceDocument.document.category,
      productId: sourceDocument.document.productId,
      status: 'draft',
      version: '1.0',
      versionNumber: 1,
      isLatest: true,
      markets: options.targetMarkets,
      language: options.targetLanguage,
      templateId: rule.id,
      templateVersion: rule.version,
      regulatoryRefs: [],
      createdAt: now,
      createdBy: this.config.currentUser,
      updatedAt: now,
      updatedBy: this.config.currentUser,
    };

    // Create derivation tracking
    const derivation: DocumentDerivation = {
      sourceDocumentId: sourceDocument.document.id,
      sourceDocumentType: sourceDocument.document.type,
      sourceVersion: sourceDocument.document.version,
      derivationType,
      derivedAt: now,
      derivedBy: this.config.currentUser,
      transformationRuleId: rule.id,
      customizedSections: [],
      lastSyncedAt: now,
      syncStatus: 'synced',
      pendingChanges: 0,
    };

    derivedDocument.derivedFrom = derivation;

    // Transform components
    const assemblies = await this.transformComponents(
      sourceDocument,
      documentId,
      rule.sectionMappings,
      rule.contentTransforms
    );

    return {
      document: derivedDocument,
      assemblies,
      derivation,
    };
  }

  /**
   * Transform components based on section mappings
   */
  private async transformComponents(
    source: DocumentWithComponents,
    targetDocumentId: string,
    mappings: SectionMapping[],
    transforms: ContentTransform[]
  ): Promise<DocumentComponentAssembly[]> {
    const assemblies: DocumentComponentAssembly[] = [];
    const now = new Date();
    let displayOrder = 0;

    for (const mapping of Array.from(mappings)) {
      // Find source components for this section
      const sourceComponents = source.components.filter(
        c => c.assembly.section === mapping.sourceSection && c.assembly.isActive
      );

      for (const { assembly: sourceAssembly, component: sourceComponent } of Array.from(sourceComponents)) {
        displayOrder++;

        // Apply content transformation
        const transformedContent = this.applyTransforms(
          sourceComponent.contentBody,
          mapping.transformType,
          transforms
        );

        const newAssembly: DocumentComponentAssembly = {
          id: generateAssemblyId(),
          documentId: targetDocumentId,
          componentId: sourceComponent.id,
          section: mapping.targetSection,
          displayOrder,
          reuseType: this.determineReuseType(mapping.transformType),
          componentVersion: sourceComponent.version,
          componentHash: sourceComponent.contentHash,
          hasOverride: mapping.transformType !== 'copy',
          overrideContent: mapping.transformType !== 'copy' ? transformedContent : undefined,
          isActive: true,
          addedAt: now,
          addedBy: this.config.currentUser,
        };

        assemblies.push(newAssembly);
      }
    }

    return assemblies;
  }

  /**
   * Apply content transforms
   */
  private applyTransforms(
    content: string,
    transformType: SectionMapping['transformType'],
    transforms: ContentTransform[]
  ): string {
    if (transformType === 'copy' || transformType === 'exclude') {
      return content;
    }

    let result = content;

    for (const transform of Array.from(transforms)) {
      switch (transform.type) {
        case 'simplify':
          result = this.simplifyContent(result, transform.config);
          break;
        case 'remove_technical':
          result = this.removeTechnicalTerms(result, transform.config);
          break;
        case 'add_context':
          result = this.addContext(result, transform.config);
          break;
        case 'add_regional':
          result = this.addRegionalInfo(result, transform.config);
          break;
        // translate would require external API
        default:
          break;
      }
    }

    return result;
  }

  /**
   * Simplify content for patient readability
   */
  private simplifyContent(content: string, config: Record<string, unknown>): string {
    // Placeholder: Real implementation would use NLP/AI
    // For now, just mark as simplified
    return `<!-- Simplified for patient readability -->\n${content}`;
  }

  /**
   * Remove technical terminology
   */
  private removeTechnicalTerms(content: string, config: Record<string, unknown>): string {
    // Placeholder: Real implementation would use NLP
    return content;
  }

  /**
   * Add contextual information
   */
  private addContext(content: string, config: Record<string, unknown>): string {
    if (config.patientFriendly) {
      return `<!-- Patient-friendly context added -->\n${content}`;
    }
    return content;
  }

  /**
   * Add regional regulatory information
   */
  private addRegionalInfo(content: string, config: Record<string, unknown>): string {
    const region = config.region as string;
    const format = config.format as string;
    return `<!-- Regional format: ${region} ${format} -->\n${content}`;
  }

  /**
   * Determine reuse type based on transform type
   */
  private determineReuseType(transformType: SectionMapping['transformType']): ComponentReuseType {
    switch (transformType) {
      case 'copy':
        return 'linked';
      case 'adapt':
      case 'merge':
      case 'split':
        return 'derived';
      default:
        return 'source';
    }
  }

  // ---------------------------------------------------------------------------
  // Sync Operations
  // ---------------------------------------------------------------------------

  /**
   * Sync a derived document with its source
   */
  async syncDerivedDocument(
    derivedDocument: DocumentWithComponents,
    sourceDocument: DocumentWithComponents
  ): Promise<DerivationSyncResult> {
    if (!derivedDocument.document.derivedFrom) {
      return {
        success: false,
        updatedSections: [],
        conflicts: [],
        requiresReview: false,
      };
    }

    const derivation = derivedDocument.document.derivedFrom;
    const rule = this.transformRules.get(derivation.derivationType);
    
    if (!rule) {
      return {
        success: false,
        updatedSections: [],
        conflicts: ['No transformation rule found'],
        requiresReview: false,
      };
    }

    const updatedSections: string[] = [];
    const conflicts: string[] = [];

    // Check each mapped section for changes
    for (const mapping of Array.from(rule.sectionMappings)) {
      // Find source component
      const sourceComponent = sourceDocument.components.find(
        c => c.assembly.section === mapping.sourceSection && c.assembly.isActive
      );

      // Find derived component
      const derivedComponent = derivedDocument.components.find(
        c => c.assembly.section === mapping.targetSection && c.assembly.isActive
      );

      if (!sourceComponent || !derivedComponent) continue;

      // Check if source has changed
      const sourceChanged = sourceComponent.component.contentHash !== derivedComponent.assembly.componentHash;

      if (sourceChanged) {
        // Check if section was customized
        if (derivation.customizedSections.includes(mapping.targetSection)) {
          conflicts.push(mapping.targetSection);
        } else {
          updatedSections.push(mapping.targetSection);
        }
      }
    }

    const requiresReview = conflicts.length > 0 || updatedSections.length > 3;

    return {
      success: conflicts.length === 0,
      updatedSections,
      conflicts,
      requiresReview,
    };
  }

  /**
   * Get pending changes for a derived document
   */
  async getPendingChanges(
    derivedDocument: DocumentWithComponents,
    sourceDocument: DocumentWithComponents
  ): Promise<SectionDiff[]> {
    if (!derivedDocument.document.derivedFrom) {
      return [];
    }

    const diffs: SectionDiff[] = [];
    const derivation = derivedDocument.document.derivedFrom;
    const rule = this.transformRules.get(derivation.derivationType);

    if (!rule) return [];

    for (const mapping of Array.from(rule.sectionMappings)) {
      const sourceComponent = sourceDocument.components.find(
        c => c.assembly.section === mapping.sourceSection && c.assembly.isActive
      );

      const derivedComponent = derivedDocument.components.find(
        c => c.assembly.section === mapping.targetSection && c.assembly.isActive
      );

      if (!sourceComponent || !derivedComponent) continue;

      const hasChanges = sourceComponent.component.contentHash !== derivedComponent.assembly.componentHash;
      const isCustomized = derivation.customizedSections.includes(mapping.targetSection);

      if (hasChanges || isCustomized) {
        diffs.push({
          section: mapping.targetSection,
          sourceContent: sourceComponent.component.contentBody,
          targetContent: derivedComponent.assembly.overrideContent || derivedComponent.component.contentBody,
          hasChanges,
          isCustomized,
        });
      }
    }

    return diffs;
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Determine derivation type from source and target document types
   */
  determineDerivationType(sourceType: DocumentType, targetType: DocumentType): DerivationType {
    const key = `${sourceType}_to_${targetType}` as DerivationType;
    if (this.transformRules.has(key)) {
      return key;
    }
    return 'custom';
  }

  /**
   * Generate title for derived document
   */
  private generateDerivedTitle(
    sourceTitle: string,
    targetType: DocumentType,
    options: DerivationOptions
  ): string {
    const typeLabels: Record<DocumentType, string> = {
      ccds: 'CCDS',
      smpc: 'SmPC',
      uspi: 'USPI',
      pil: 'PIL',
      epi: 'EPI',
      protocol: 'Protocol',
      csr: 'CSR',
      ib: 'IB',
      dsur: 'DSUR',
      psur: 'PSUR',
      sop: 'SOP',
      wi: 'WI',
      form: 'Form',
      specification: 'Specification',
      ctd_module: 'CTD Module',
      cover_letter: 'Cover Letter',
      response_document: 'Response Document',
    };

    const baseTitle = sourceTitle.replace(/\s*(CCDS|SmPC|USPI|PIL)\s*/gi, '').trim();
    const markets = options.targetMarkets.join('/');
    
    return `${baseTitle} ${typeLabels[targetType]} (${markets})`;
  }

  /**
   * Get transformation rule
   */
  getTransformRule(derivationType: DerivationType): DerivationTransformRule | undefined {
    return this.transformRules.get(derivationType);
  }

  /**
   * Get all transformation rules
   */
  getAllTransformRules(): DerivationTransformRule[] {
    return Array.from(this.transformRules.values());
  }

  /**
   * Add custom transformation rule
   */
  addTransformRule(rule: DerivationTransformRule): void {
    this.transformRules.set(rule.id, rule);
  }

  /**
   * Check if derivation is supported
   */
  isDerivationSupported(sourceType: DocumentType, targetType: DocumentType): boolean {
    const derivationType = this.determineDerivationType(sourceType, targetType);
    return this.transformRules.has(derivationType);
  }

  /**
   * Get supported target types for a source document type
   */
  getSupportedTargetTypes(sourceType: DocumentType): DocumentType[] {
    const targets: DocumentType[] = [];
    
    for (const [key, rule] of Array.from(this.transformRules)) {
      if (rule.sourceType === sourceType) {
        targets.push(rule.targetType);
      }
    }
    
    return targets;
  }
}
