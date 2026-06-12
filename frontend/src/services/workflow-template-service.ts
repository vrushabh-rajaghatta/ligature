
/**
 * Workflow Template Service
 * 
 * Save, load, and manage reusable publishing workflow configurations.
 * Templates capture all workflow settings so teams can:
 * - Standardize publishing processes
 * - Share configurations across applications
 * - Version control workflow changes
 * - Quick-start common submission types
 */

import { PublishingWorkflowConfig, WorkflowStepId } from './publishing-orchestrator';
import { RegionalSpec } from './ectd-pdf-validator';
import { GatewayType } from './gateway-service';
import { currentUser } from '@/data/users-data';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // Classification
  category: TemplateCategory;
  tags: string[];
  
  // Workflow configuration
  config: WorkflowTemplateConfig;
  
  // Steps customization
  enabledSteps: WorkflowStepId[];
  stepOverrides?: Record<WorkflowStepId, StepOverride>;
  
  // Metadata
  createdAt: Date;
  createdBy: {
    userId: string;
    userName: string;
  };
  updatedAt: Date;
  updatedBy: {
    userId: string;
    userName: string;
  };
  
  // Usage tracking
  usageCount: number;
  lastUsedAt?: Date;
  
  // Sharing
  isShared: boolean;
  sharedWith?: string[]; // User IDs or 'all'
}

export type TemplateCategory = 
  | 'ind'           // IND submissions
  | 'nda'           // NDA submissions  
  | 'bla'           // BLA submissions
  | 'anda'          // ANDA submissions
  | 'amendment'     // Amendments
  | 'supplement'    // Supplements
  | 'annual-report' // Annual reports
  | 'response'      // HA responses
  | 'custom';       // User-defined

export interface WorkflowTemplateConfig {
  // Validation settings
  regions: RegionalSpec[];
  strictValidation: boolean;
  allowWarnings: boolean;
  
  // Hyperlink settings
  autoLinkMinConfidence: number;
  autoLinkTypes: Array<'study' | 'table' | 'figure' | 'section' | 'appendix' | 'reference' | 'module'>;
  preserveExistingLinks: boolean;
  
  // Backbone settings
  ectdVersion: '3.2.2' | '4.0';
  includeRegionalModule: boolean;
  
  // Gateway settings
  submitToGateway: boolean;
  defaultGateway?: GatewayType;
  requireAcknowledgment: boolean;
  
  // Workflow behavior
  stopOnError: boolean;
  skipOptionalOnWarning: boolean;
  parallelValidation: boolean;
  autoRetryCount: number;
  
  // Notifications
  notifyOnComplete: boolean;
  notifyOnError: boolean;
  notificationEmails?: string[];
}

export interface StepOverride {
  enabled?: boolean;
  timeout?: number;
  retryCount?: number;
  customParams?: Record<string, unknown>;
}

export interface TemplateFilter {
  categories?: TemplateCategory[];
  tags?: string[];
  createdBy?: string;
  searchText?: string;
  isShared?: boolean;
}

export interface TemplateSummary {
  totalTemplates: number;
  byCategory: Record<TemplateCategory, number>;
  mostUsed: Array<{ id: string; name: string; usageCount: number }>;
  recentlyUpdated: Array<{ id: string; name: string; updatedAt: Date }>;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'lastUsedAt'>[] = [
  {
    name: 'Standard IND Submission',
    description: 'Default workflow for Initial IND submissions with full validation and FDA ESG gateway submission.',
    version: '1.0.0',
    category: 'ind',
    tags: ['fda', 'initial', 'full-validation'],
    config: {
      regions: ['FDA'],
      strictValidation: true,
      allowWarnings: false,
      autoLinkMinConfidence: 80,
      autoLinkTypes: ['section', 'table', 'figure', 'reference'],
      preserveExistingLinks: true,
      ectdVersion: '4.0',
      includeRegionalModule: true,
      submitToGateway: true,
      defaultGateway: 'fda-esg',
      requireAcknowledgment: true,
      stopOnError: true,
      skipOptionalOnWarning: false,
      parallelValidation: true,
      autoRetryCount: 2,
      notifyOnComplete: true,
      notifyOnError: true,
    },
    enabledSteps: [
      'pdf-validation',
      'hyperlink-detection',
      'hyperlink-linking',
      'hyperlink-validation',
      'backbone-generation',
      'backbone-validation',
      'package-creation',
      'gateway-submission',
    ],
    createdBy: { userId: 'system', userName: 'System' },
    updatedBy: { userId: 'system', userName: 'System' },
    isShared: true,
    sharedWith: ['all'],
  },
  {
    name: 'IND Amendment (Expedited)',
    description: 'Streamlined workflow for IND amendments with parallel validation and auto-retry.',
    version: '1.0.0',
    category: 'amendment',
    tags: ['fda', 'amendment', 'expedited'],
    config: {
      regions: ['FDA'],
      strictValidation: true,
      allowWarnings: true,
      autoLinkMinConfidence: 70,
      autoLinkTypes: ['section', 'reference'],
      preserveExistingLinks: true,
      ectdVersion: '4.0',
      includeRegionalModule: true,
      submitToGateway: true,
      defaultGateway: 'fda-esg',
      requireAcknowledgment: true,
      stopOnError: false,
      skipOptionalOnWarning: true,
      parallelValidation: true,
      autoRetryCount: 3,
      notifyOnComplete: true,
      notifyOnError: true,
    },
    enabledSteps: [
      'pdf-validation',
      'hyperlink-detection',
      'hyperlink-linking',
      'backbone-generation',
      'package-creation',
      'gateway-submission',
    ],
    createdBy: { userId: 'system', userName: 'System' },
    updatedBy: { userId: 'system', userName: 'System' },
    isShared: true,
    sharedWith: ['all'],
  },
  {
    name: 'EU MAA Submission',
    description: 'Marketing Authorization Application workflow for EMA with EU-specific validation.',
    version: '1.0.0',
    category: 'nda',
    tags: ['ema', 'maa', 'eu'],
    config: {
      regions: ['EMA'],
      strictValidation: true,
      allowWarnings: false,
      autoLinkMinConfidence: 80,
      autoLinkTypes: ['section', 'reference', 'table', 'figure', 'appendix'],
      preserveExistingLinks: true,
      ectdVersion: '4.0',
      includeRegionalModule: true,
      submitToGateway: true,
      defaultGateway: 'ema-cesp',
      requireAcknowledgment: true,
      stopOnError: true,
      skipOptionalOnWarning: false,
      parallelValidation: true,
      autoRetryCount: 2,
      notifyOnComplete: true,
      notifyOnError: true,
    },
    enabledSteps: [
      'pdf-validation',
      'hyperlink-detection',
      'hyperlink-linking',
      'hyperlink-validation',
      'backbone-generation',
      'backbone-validation',
      'package-creation',
      'gateway-submission',
    ],
    createdBy: { userId: 'system', userName: 'System' },
    updatedBy: { userId: 'system', userName: 'System' },
    isShared: true,
    sharedWith: ['all'],
  },
  {
    name: 'Draft Review (No Gateway)',
    description: 'Internal review workflow without gateway submission. Perfect for QC cycles.',
    version: '1.0.0',
    category: 'custom',
    tags: ['internal', 'review', 'qc'],
    config: {
      regions: ['FDA', 'EMA'],
      strictValidation: false,
      allowWarnings: true,
      autoLinkMinConfidence: 60,
      autoLinkTypes: ['section', 'reference'],
      preserveExistingLinks: true,
      ectdVersion: '4.0',
      includeRegionalModule: false,
      submitToGateway: false,
      requireAcknowledgment: false,
      stopOnError: false,
      skipOptionalOnWarning: true,
      parallelValidation: true,
      autoRetryCount: 1,
      notifyOnComplete: false,
      notifyOnError: false,
    },
    enabledSteps: [
      'pdf-validation',
      'hyperlink-detection',
      'backbone-generation',
      'package-creation',
    ],
    createdBy: { userId: 'system', userName: 'System' },
    updatedBy: { userId: 'system', userName: 'System' },
    isShared: true,
    sharedWith: ['all'],
  },
  {
    name: 'Annual Report',
    description: 'Simplified workflow for annual reports with minimal validation overhead.',
    version: '1.0.0',
    category: 'annual-report',
    tags: ['fda', 'annual', 'routine'],
    config: {
      regions: ['FDA'],
      strictValidation: true,
      allowWarnings: true,
      autoLinkMinConfidence: 70,
      autoLinkTypes: ['section', 'reference'],
      preserveExistingLinks: true,
      ectdVersion: '4.0',
      includeRegionalModule: true,
      submitToGateway: true,
      defaultGateway: 'fda-esg',
      requireAcknowledgment: true,
      stopOnError: true,
      skipOptionalOnWarning: true,
      parallelValidation: true,
      autoRetryCount: 2,
      notifyOnComplete: true,
      notifyOnError: true,
    },
    enabledSteps: [
      'pdf-validation',
      'hyperlink-detection',
      'hyperlink-linking',
      'backbone-generation',
      'package-creation',
      'gateway-submission',
    ],
    createdBy: { userId: 'system', userName: 'System' },
    updatedBy: { userId: 'system', userName: 'System' },
    isShared: true,
    sharedWith: ['all'],
  },
];

// ============================================================================
// WORKFLOW TEMPLATE SERVICE
// ============================================================================

class WorkflowTemplateService {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private listeners: Set<(templates: WorkflowTemplate[]) => void> = new Set();

  constructor() {
    this.initializeDefaults();
  }

  /**
   * Initialize with default templates
   */
  private initializeDefaults(): void {
    const now = new Date();
    DEFAULT_TEMPLATES.forEach((template, index) => {
      const id = `tpl-default-${index + 1}`;
      this.templates.set(id, {
        ...template,
        id,
        createdAt: now,
        updatedAt: now,
        usageCount: Math.floor(Math.random() * 50) + 10, // Simulate usage
      });
    });
  }

  /**
   * Get all templates
   */
  getAll(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  get(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Filter templates
   */
  filter(filter: TemplateFilter): WorkflowTemplate[] {
    let templates = this.getAll();

    if (filter.categories && filter.categories.length > 0) {
      templates = templates.filter(t => filter.categories!.includes(t.category));
    }

    if (filter.tags && filter.tags.length > 0) {
      templates = templates.filter(t => 
        filter.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (filter.createdBy) {
      templates = templates.filter(t => t.createdBy.userId === filter.createdBy);
    }

    if (filter.isShared !== undefined) {
      templates = templates.filter(t => t.isShared === filter.isShared);
    }

    if (filter.searchText) {
      const search = filter.searchText.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return templates;
  }

  /**
   * Create a new template
   */
  create(params: {
    name: string;
    description: string;
    category: TemplateCategory;
    tags?: string[];
    config: WorkflowTemplateConfig;
    enabledSteps: WorkflowStepId[];
    stepOverrides?: Record<WorkflowStepId, StepOverride>;
    isShared?: boolean;
  }): WorkflowTemplate {
    const now = new Date();
    const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const template: WorkflowTemplate = {
      id,
      name: params.name,
      description: params.description,
      version: '1.0.0',
      category: params.category,
      tags: params.tags || [],
      config: params.config,
      enabledSteps: params.enabledSteps,
      stepOverrides: params.stepOverrides,
      createdAt: now,
      createdBy: {
        userId: currentUser.id,
        userName: currentUser.name,
      },
      updatedAt: now,
      updatedBy: {
        userId: currentUser.id,
        userName: currentUser.name,
      },
      usageCount: 0,
      isShared: params.isShared || false,
    };

    this.templates.set(id, template);
    this.notifyListeners();
    return template;
  }

  /**
   * Update an existing template
   */
  update(id: string, updates: Partial<Omit<WorkflowTemplate, 'id' | 'createdAt' | 'createdBy'>>): WorkflowTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    // Increment version if config changed
    let newVersion = template.version;
    if (updates.config || updates.enabledSteps || updates.stepOverrides) {
      const [major, minor, patch] = template.version.split('.').map(Number);
      newVersion = `${major}.${minor}.${patch + 1}`;
    }

    const updated: WorkflowTemplate = {
      ...template,
      ...updates,
      version: newVersion,
      updatedAt: new Date(),
      updatedBy: {
        userId: currentUser.id,
        userName: currentUser.name,
      },
    };

    this.templates.set(id, updated);
    this.notifyListeners();
    return updated;
  }

  /**
   * Delete a template
   */
  delete(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      this.notifyListeners();
    }
    return deleted;
  }

  /**
   * Duplicate a template
   */
  duplicate(id: string, newName?: string): WorkflowTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    return this.create({
      name: newName || `${template.name} (Copy)`,
      description: template.description,
      category: template.category,
      tags: [...template.tags],
      config: { ...template.config },
      enabledSteps: [...template.enabledSteps],
      stepOverrides: template.stepOverrides ? { ...template.stepOverrides } : undefined,
      isShared: false, // Duplicates start as private
    });
  }

  /**
   * Record template usage
   */
  recordUsage(id: string): void {
    const template = this.templates.get(id);
    if (template) {
      template.usageCount++;
      template.lastUsedAt = new Date();
      this.templates.set(id, template);
    }
  }

  /**
   * Convert template to PublishingWorkflowConfig
   */
  toWorkflowConfig(templateId: string, envelope: {
    applicationNumber: string;
    sequenceNumber: string;
    submissionType: string;
    companyName: string;
  }): PublishingWorkflowConfig | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Record usage
    this.recordUsage(templateId);

    return {
      regions: template.config.regions,
      autoLinkMinConfidence: template.config.autoLinkMinConfidence,
      autoLinkTypes: template.config.autoLinkTypes,
      envelope: {
        submissionId: `${envelope.applicationNumber}-${envelope.sequenceNumber}`,
        applicationNumber: envelope.applicationNumber,
        sequenceNumber: envelope.sequenceNumber,
        submissionType: envelope.submissionType as any,
        applicationType: 'ind',
        companyName: envelope.companyName,
      },
      submitToGateway: template.config.submitToGateway,
      gateway: template.config.defaultGateway,
      stopOnError: template.config.stopOnError,
      skipOptionalOnWarning: template.config.skipOptionalOnWarning,
      parallelValidation: template.config.parallelValidation,
    };
  }

  /**
   * Get template statistics
   */
  getStatistics(): TemplateSummary {
    const templates = this.getAll();
    
    const byCategory: Record<TemplateCategory, number> = {
      ind: 0,
      nda: 0,
      bla: 0,
      anda: 0,
      amendment: 0,
      supplement: 0,
      'annual-report': 0,
      response: 0,
      custom: 0,
    };

    templates.forEach(t => {
      byCategory[t.category]++;
    });

    const mostUsed = [...templates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(t => ({ id: t.id, name: t.name, usageCount: t.usageCount }));

    const recentlyUpdated = [...templates]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map(t => ({ id: t.id, name: t.name, updatedAt: t.updatedAt }));

    return {
      totalTemplates: templates.length,
      byCategory,
      mostUsed,
      recentlyUpdated,
    };
  }

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory): WorkflowTemplate[] {
    return this.filter({ categories: [category] });
  }

  /**
   * Get shared templates
   */
  getShared(): WorkflowTemplate[] {
    return this.filter({ isShared: true });
  }

  /**
   * Get user's templates
   */
  getUserTemplates(userId?: string): WorkflowTemplate[] {
    return this.filter({ createdBy: userId || currentUser.id });
  }

  /**
   * Export template as JSON
   */
  exportTemplate(id: string): string | null {
    const template = this.templates.get(id);
    if (!template) return null;

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
      template: {
        name: template.name,
        description: template.description,
        version: template.version,
        category: template.category,
        tags: template.tags,
        config: template.config,
        enabledSteps: template.enabledSteps,
        stepOverrides: template.stepOverrides,
      },
    }, null, 2);
  }

  /**
   * Import template from JSON
   */
  importTemplate(json: string): WorkflowTemplate | null {
    try {
      const data = JSON.parse(json);
      if (!data.template) return null;

      return this.create({
        name: `${data.template.name} (Imported)`,
        description: data.template.description,
        category: data.template.category,
        tags: data.template.tags || [],
        config: data.template.config,
        enabledSteps: data.template.enabledSteps,
        stepOverrides: data.template.stepOverrides,
      });
    } catch {
      return null;
    }
  }

  /**
   * Subscribe to template changes
   */
  subscribe(listener: (templates: WorkflowTemplate[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(): void {
    const templates = this.getAll();
    this.listeners.forEach(listener => {
      try {
        listener(templates);
      } catch (error) {
        console.error('Template listener error:', error);
      }
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const workflowTemplateService = new WorkflowTemplateService();
export { WorkflowTemplateService };
