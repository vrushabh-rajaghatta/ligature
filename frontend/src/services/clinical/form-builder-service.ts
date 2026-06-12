
/**
 * Form Builder Service
 * CRF definition creation, editing, and version control
 * @version 0.20.4.2
 */

import {
  CRFDefinition,
  CRFSection,
  CRFField,
  Codelist,
  CodelistItem,
  ValidationRule,
  FormDefinitionStatus,
  FieldDataType,
  createCRFDefinition,
  createCRFSection,
  createCRFField,
  createCodelist,
  createCodelistItem,
  isOIDFormat,
} from '@/types/clinical-form';

import {
  EditCheckDefinition,
  FieldControlType,
} from '@/types/clinical-edit-check';

// ============================================================================
// Service Configuration
// ============================================================================

export interface FormBuilderServiceConfig {
  tenantId: string;
}

// ============================================================================
// Form Templates
// ============================================================================

export type FormTemplateCategory = 
  | 'DEMOGRAPHICS'
  | 'VITAL_SIGNS'
  | 'ADVERSE_EVENTS'
  | 'CONCOMITANT_MEDS'
  | 'MEDICAL_HISTORY'
  | 'PHYSICAL_EXAM'
  | 'LABORATORY'
  | 'ECG'
  | 'ELIGIBILITY'
  | 'DISPOSITION'
  | 'INFORMED_CONSENT'
  | 'EXPOSURE'
  | 'EFFICACY'
  | 'PHARMACOKINETICS'
  | 'QUALITY_OF_LIFE'
  | 'CUSTOM';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: FormTemplateCategory;
  formOID: string;
  sections: CRFSection[];
  codelists: Codelist[];
  editChecks: string[]; // Check OIDs
  isStandard: boolean; // CDASH standard
  version: string;
}

// ============================================================================
// Version History
// ============================================================================

export interface FormVersion {
  version: string;
  versionDate: Date;
  status: FormDefinitionStatus;
  createdBy: string;
  changeDescription?: string;
  formSnapshot: CRFDefinition;
}

export interface FormVersionHistory {
  formId: string;
  currentVersion: string;
  versions: FormVersion[];
}

// ============================================================================
// Validation Results
// ============================================================================

export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
  warnings: FormValidationWarning[];
}

export interface FormValidationError {
  code: string;
  message: string;
  location: {
    sectionId?: string;
    fieldId?: string;
    fieldOID?: string;
  };
}

export interface FormValidationWarning {
  code: string;
  message: string;
  location: {
    sectionId?: string;
    fieldId?: string;
    fieldOID?: string;
  };
}

// ============================================================================
// Statistics
// ============================================================================

export interface FormBuilderStats {
  totalForms: number;
  draftForms: number;
  approvedForms: number;
  retiredForms: number;
  totalFields: number;
  totalSections: number;
  formsWithEditChecks: number;
  averageFieldsPerForm: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IFormBuilderService {
  // Form CRUD
  createForm(params: CreateFormParams): Promise<CRFDefinition>;
  getForm(formId: string): CRFDefinition | undefined;
  getFormByOID(studyId: string, formOID: string): CRFDefinition | undefined;
  updateForm(formId: string, updates: Partial<CRFDefinition>, userId: string): Promise<CRFDefinition>;
  deleteForm(formId: string): Promise<void>;
  listForms(studyId: string): CRFDefinition[];
  
  // Section Management
  addSection(formId: string, section: Partial<CRFSection>, userId: string): Promise<CRFSection>;
  updateSection(formId: string, sectionId: string, updates: Partial<CRFSection>, userId: string): Promise<CRFSection>;
  removeSection(formId: string, sectionId: string, userId: string): Promise<void>;
  reorderSections(formId: string, sectionIds: string[], userId: string): Promise<void>;
  
  // Field Management
  addField(formId: string, sectionId: string, field: Partial<CRFField>, userId: string): Promise<CRFField>;
  updateField(formId: string, sectionId: string, fieldId: string, updates: Partial<CRFField>, userId: string): Promise<CRFField>;
  removeField(formId: string, sectionId: string, fieldId: string, userId: string): Promise<void>;
  reorderFields(formId: string, sectionId: string, fieldIds: string[], userId: string): Promise<void>;
  moveField(formId: string, fieldId: string, fromSectionId: string, toSectionId: string, userId: string): Promise<void>;
  
  // Codelist Management
  createCodelist(params: CreateCodelistParams): Promise<Codelist>;
  getCodelist(codelistId: string): Codelist | undefined;
  updateCodelist(codelistId: string, updates: Partial<Codelist>): Promise<Codelist>;
  deleteCodelist(codelistId: string): Promise<void>;
  listCodelists(studyId: string): Codelist[];
  addCodelistItem(codelistId: string, item: Partial<CodelistItem>): Promise<CodelistItem>;
  removeCodelistItem(codelistId: string, codedValue: string): Promise<void>;
  
  // Edit Check Assignment
  assignEditCheck(formId: string, checkId: string, userId: string): Promise<void>;
  unassignEditCheck(formId: string, checkId: string, userId: string): Promise<void>;
  getAssignedEditChecks(formId: string): string[];
  
  // Validation Rules (form-level)
  addValidationRule(formId: string, rule: Partial<ValidationRule>, userId: string): Promise<ValidationRule>;
  updateValidationRule(formId: string, ruleId: string, updates: Partial<ValidationRule>, userId: string): Promise<ValidationRule>;
  removeValidationRule(formId: string, ruleId: string, userId: string): Promise<void>;
  
  // Version Control
  createVersion(formId: string, changeDescription: string, userId: string): Promise<FormVersion>;
  getVersionHistory(formId: string): FormVersionHistory | undefined;
  revertToVersion(formId: string, version: string, userId: string): Promise<CRFDefinition>;
  compareVersions(formId: string, version1: string, version2: string): FormVersionComparison;
  
  // Lifecycle
  approveForm(formId: string, userId: string): Promise<CRFDefinition>;
  retireForm(formId: string, userId: string): Promise<CRFDefinition>;
  reactivateForm(formId: string, userId: string): Promise<CRFDefinition>;
  
  // Cloning & Templates
  cloneForm(formId: string, newFormOID: string, newFormName: string, userId: string): Promise<CRFDefinition>;
  createFromTemplate(studyId: string, templateId: string, formOID: string, formName: string, userId: string): Promise<CRFDefinition>;
  saveAsTemplate(formId: string, templateName: string, category: FormTemplateCategory): Promise<FormTemplate>;
  listTemplates(category?: FormTemplateCategory): FormTemplate[];
  
  // Validation
  validateForm(formId: string): FormValidationResult;
  validateOID(oid: string): boolean;
  checkOIDUniqueness(studyId: string, formOID: string, excludeFormId?: string): boolean;
  
  // Import/Export
  exportFormDefinition(formId: string): FormExportData;
  importFormDefinition(studyId: string, data: FormExportData, userId: string): Promise<CRFDefinition>;
  
  // Statistics
  getStats(studyId: string): FormBuilderStats;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface CreateFormParams {
  studyId: string;
  formName: string;
  formOID: string;
  version?: string;
  instructions?: string;
  completionGuidelines?: string;
  requiresSignature?: boolean;
  sdvPercentage?: number;
  createdBy: string;
}

export interface CreateCodelistParams {
  studyId: string;
  name: string;
  description?: string;
  dataType?: 'TEXT' | 'INTEGER';
  extensible?: boolean;
  source?: Codelist['source'];
  items?: Partial<CodelistItem>[];
}

export interface FormExportData {
  exportVersion: string;
  exportDate: Date;
  form: CRFDefinition;
  codelists: Codelist[];
  editCheckOIDs: string[];
}

export interface FormVersionComparison {
  version1: string;
  version2: string;
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsModified: string[];
  fieldsAdded: { sectionId: string; fieldOID: string }[];
  fieldsRemoved: { sectionId: string; fieldOID: string }[];
  fieldsModified: { sectionId: string; fieldOID: string; changes: string[] }[];
}

// ============================================================================
// Service Implementation
// ============================================================================

export class FormBuilderService implements IFormBuilderService {
  private config: FormBuilderServiceConfig;
  private forms: Map<string, CRFDefinition> = new Map();
  private codelists: Map<string, Codelist> = new Map();
  private codelistsByStudy: Map<string, Set<string>> = new Map();
  private versionHistories: Map<string, FormVersionHistory> = new Map();
  private formEditChecks: Map<string, Set<string>> = new Map();
  private templates: Map<string, FormTemplate> = new Map();

  constructor(config: FormBuilderServiceConfig) {
    this.config = config;
    this.initializeStandardTemplates();
  }

  // ==========================================================================
  // Form CRUD
  // ==========================================================================

  async createForm(params: CreateFormParams): Promise<CRFDefinition> {
    // Validate OID format
    if (!isOIDFormat(params.formOID)) {
      throw new Error(`Invalid OID format: ${params.formOID}`);
    }

    // Check OID uniqueness
    if (!this.checkOIDUniqueness(params.studyId, params.formOID)) {
      throw new Error(`Form OID already exists: ${params.formOID}`);
    }

    const form = createCRFDefinition({
      studyId: params.studyId,
      tenantId: this.config.tenantId,
      formName: params.formName,
      formOID: params.formOID,
      version: params.version,
      createdBy: params.createdBy,
    });

    if (params.instructions) form.instructions = params.instructions;
    if (params.completionGuidelines) form.completionGuidelines = params.completionGuidelines;
    if (params.requiresSignature !== undefined) form.requiresSignature = params.requiresSignature;
    if (params.sdvPercentage !== undefined) form.sdvPercentage = params.sdvPercentage;

    this.forms.set(form.id, form);
    this.formEditChecks.set(form.id, new Set());

    // Initialize version history
    this.versionHistories.set(form.id, {
      formId: form.id,
      currentVersion: form.version,
      versions: [{
        version: form.version,
        versionDate: form.versionDate,
        status: form.status,
        createdBy: params.createdBy,
        changeDescription: 'Initial version',
        formSnapshot: { ...form },
      }],
    });

    return form;
  }

  getForm(formId: string): CRFDefinition | undefined {
    return this.forms.get(formId);
  }

  getFormByOID(studyId: string, formOID: string): CRFDefinition | undefined {
    for (const form of Array.from(Array.from(this.forms.values()))) {
      if (form.studyId === studyId && form.formOID === formOID) {
        return form;
      }
    }
    return undefined;
  }

  async updateForm(formId: string, updates: Partial<CRFDefinition>, userId: string): Promise<CRFDefinition> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only update forms in DRAFT status');
    }

    // Don't allow changing critical identifiers
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.studyId;
    delete safeUpdates.tenantId;
    delete safeUpdates.formOID;
    delete safeUpdates.createdAt;
    delete safeUpdates.createdBy;

    Object.assign(form, safeUpdates, {
      updatedAt: new Date(),
      updatedBy: userId,
    });

    return form;
  }

  async deleteForm(formId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status === 'APPROVED') {
      throw new Error('Cannot delete approved forms. Retire them instead.');
    }

    this.forms.delete(formId);
    this.versionHistories.delete(formId);
    this.formEditChecks.delete(formId);
  }

  listForms(studyId: string): CRFDefinition[] {
    const forms: CRFDefinition[] = [];
    for (const form of Array.from(Array.from(this.forms.values()))) {
      if (form.studyId === studyId) {
        forms.push(form);
      }
    }
    return forms.sort((a, b) => a.formName.localeCompare(b.formName));
  }

  // ==========================================================================
  // Section Management
  // ==========================================================================

  async addSection(formId: string, section: Partial<CRFSection>, userId: string): Promise<CRFSection> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const newSection = createCRFSection({
      id: section.id,
      name: section.name ?? 'New Section',
      order: section.order ?? form.sections.length,
      fields: section.fields,
      repeating: section.repeating,
    });

    if (section.description) newSection.description = section.description;
    if (section.maxRepeats) newSection.maxRepeats = section.maxRepeats;
    if (section.collapsible !== undefined) newSection.collapsible = section.collapsible;
    if (section.collapsed !== undefined) newSection.collapsed = section.collapsed;
    if (section.displayCondition) newSection.displayCondition = section.displayCondition;

    form.sections.push(newSection);
    form.updatedAt = new Date();
    form.updatedBy = userId;

    return newSection;
  }

  async updateSection(formId: string, sectionId: string, updates: Partial<CRFSection>, userId: string): Promise<CRFSection> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const section = form.sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    // Don't allow changing ID
    const safeUpdates = { ...updates };
    delete safeUpdates.id;

    Object.assign(section, safeUpdates);
    form.updatedAt = new Date();
    form.updatedBy = userId;

    return section;
  }

  async removeSection(formId: string, sectionId: string, userId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const index = form.sections.findIndex(s => s.id === sectionId);
    if (index === -1) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    form.sections.splice(index, 1);
    
    // Reorder remaining sections
    form.sections.forEach((s, i) => { s.order = i; });
    
    form.updatedAt = new Date();
    form.updatedBy = userId;
  }

  async reorderSections(formId: string, sectionIds: string[], userId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const sectionMap = new Map(form.sections.map(s => [s.id, s]));
    const reordered: CRFSection[] = [];

    for (const id of Array.from(sectionIds)) {
      const section = sectionMap.get(id);
      if (section) {
        section.order = reordered.length;
        reordered.push(section);
      }
    }

    form.sections = reordered;
    form.updatedAt = new Date();
    form.updatedBy = userId;
  }

  // ==========================================================================
  // Field Management
  // ==========================================================================

  async addField(formId: string, sectionId: string, field: Partial<CRFField>, userId: string): Promise<CRFField> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const section = form.sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    if (!field.fieldOID || !isOIDFormat(field.fieldOID)) {
      throw new Error(`Invalid field OID: ${field.fieldOID}`);
    }

    // Check OID uniqueness within form
    for (const sec of Array.from(form.sections)) {
      if (sec.fields.some(f => f.fieldOID === field.fieldOID)) {
        throw new Error(`Field OID already exists in form: ${field.fieldOID}`);
      }
    }

    const newField = createCRFField({
      id: field.id,
      fieldOID: field.fieldOID,
      label: field.label ?? 'New Field',
      dataType: field.dataType ?? 'TEXT',
      required: field.required,
      sdvRequired: field.sdvRequired,
      order: field.order ?? section.fields.length,
      validation: field.validation,
      codelistId: field.codelistId,
    });

    if (field.shortLabel) newField.shortLabel = field.shortLabel;
    if (field.helpText) newField.helpText = field.helpText;
    if (field.placeholder) newField.placeholder = field.placeholder;
    if (field.isHidden !== undefined) newField.isHidden = field.isHidden;
    if (field.isReadOnly !== undefined) newField.isReadOnly = field.isReadOnly;
    if (field.isKey !== undefined) newField.isKey = field.isKey;
    if (field.defaultValue !== undefined) newField.defaultValue = field.defaultValue;

    section.fields.push(newField);
    form.updatedAt = new Date();
    form.updatedBy = userId;

    return newField;
  }

  async updateField(formId: string, sectionId: string, fieldId: string, updates: Partial<CRFField>, userId: string): Promise<CRFField> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const section = form.sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    const field = section.fields.find(f => f.id === fieldId);
    if (!field) {
      throw new Error(`Field not found: ${fieldId}`);
    }

    // Don't allow changing ID or OID (OID changes require versioning)
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.fieldOID;

    Object.assign(field, safeUpdates);
    form.updatedAt = new Date();
    form.updatedBy = userId;

    return field;
  }

  async removeField(formId: string, sectionId: string, fieldId: string, userId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const section = form.sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    const index = section.fields.findIndex(f => f.id === fieldId);
    if (index === -1) {
      throw new Error(`Field not found: ${fieldId}`);
    }

    section.fields.splice(index, 1);
    
    // Reorder remaining fields
    section.fields.forEach((f, i) => { f.order = i; });
    
    form.updatedAt = new Date();
    form.updatedBy = userId;
  }

  async reorderFields(formId: string, sectionId: string, fieldIds: string[], userId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const section = form.sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    const fieldMap = new Map(section.fields.map(f => [f.id, f]));
    const reordered: CRFField[] = [];

    for (const id of Array.from(fieldIds)) {
      const field = fieldMap.get(id);
      if (field) {
        field.order = reordered.length;
        reordered.push(field);
      }
    }

    section.fields = reordered;
    form.updatedAt = new Date();
    form.updatedBy = userId;
  }

  async moveField(formId: string, fieldId: string, fromSectionId: string, toSectionId: string, userId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const fromSection = form.sections.find(s => s.id === fromSectionId);
    const toSection = form.sections.find(s => s.id === toSectionId);
    
    if (!fromSection) throw new Error(`Source section not found: ${fromSectionId}`);
    if (!toSection) throw new Error(`Target section not found: ${toSectionId}`);

    const fieldIndex = fromSection.fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) {
      throw new Error(`Field not found: ${fieldId}`);
    }

    const [field] = fromSection.fields.splice(fieldIndex, 1);
    field.order = toSection.fields.length;
    toSection.fields.push(field);

    // Reorder source section
    fromSection.fields.forEach((f, i) => { f.order = i; });

    form.updatedAt = new Date();
    form.updatedBy = userId;
  }

  // ==========================================================================
  // Codelist Management
  // ==========================================================================

  async createCodelist(params: CreateCodelistParams): Promise<Codelist> {
    const items: CodelistItem[] = (params.items ?? []).map((item, index) => 
      createCodelistItem({
        codedValue: item.codedValue ?? `${index + 1}`,
        displayText: item.displayText ?? `Item ${index + 1}`,
        orderNumber: item.orderNumber ?? index,
        isDefault: item.isDefault,
      })
    );

    const codelist = createCodelist({
      name: params.name,
      description: params.description,
      items,
      source: params.source,
    });

    if (params.dataType) codelist.dataType = params.dataType;
    if (params.extensible !== undefined) codelist.extensible = params.extensible;

    this.codelists.set(codelist.id, codelist);

    // Track by study
    if (!this.codelistsByStudy.has(params.studyId)) {
      this.codelistsByStudy.set(params.studyId, new Set());
    }
    this.codelistsByStudy.get(params.studyId)!.add(codelist.id);

    return codelist;
  }

  getCodelist(codelistId: string): Codelist | undefined {
    return this.codelists.get(codelistId);
  }

  async updateCodelist(codelistId: string, updates: Partial<Codelist>): Promise<Codelist> {
    const codelist = this.codelists.get(codelistId);
    if (!codelist) {
      throw new Error(`Codelist not found: ${codelistId}`);
    }

    const safeUpdates = { ...updates };
    delete safeUpdates.id;

    Object.assign(codelist, safeUpdates);
    return codelist;
  }

  async deleteCodelist(codelistId: string): Promise<void> {
    const codelist = this.codelists.get(codelistId);
    if (!codelist) {
      throw new Error(`Codelist not found: ${codelistId}`);
    }

    // Check if codelist is in use
    for (const form of Array.from(Array.from(this.forms.values()))) {
      for (const section of Array.from(form.sections)) {
        for (const field of Array.from(section.fields)) {
          if (field.codelistId === codelistId) {
            throw new Error(`Codelist is in use by field ${field.fieldOID} in form ${form.formName}`);
          }
        }
      }
    }

    this.codelists.delete(codelistId);
    
    // Remove from study tracking
    for (const studyCodelists of Array.from(Array.from(this.codelistsByStudy.values()))) {
      studyCodelists.delete(codelistId);
    }
  }

  listCodelists(studyId: string): Codelist[] {
    const codelistIds = this.codelistsByStudy.get(studyId);
    if (!codelistIds) return [];

    return Array.from(codelistIds)
      .map(id => this.codelists.get(id))
      .filter((cl): cl is Codelist => cl !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async addCodelistItem(codelistId: string, item: Partial<CodelistItem>): Promise<CodelistItem> {
    const codelist = this.codelists.get(codelistId);
    if (!codelist) {
      throw new Error(`Codelist not found: ${codelistId}`);
    }

    if (codelist.items.some(i => i.codedValue === item.codedValue)) {
      throw new Error(`Coded value already exists: ${item.codedValue}`);
    }

    const newItem = createCodelistItem({
      codedValue: item.codedValue ?? `${codelist.items.length + 1}`,
      displayText: item.displayText ?? 'New Item',
      orderNumber: item.orderNumber ?? codelist.items.length,
      isDefault: item.isDefault,
    });

    codelist.items.push(newItem);
    codelist.items.sort((a, b) => a.orderNumber - b.orderNumber);

    return newItem;
  }

  async removeCodelistItem(codelistId: string, codedValue: string): Promise<void> {
    const codelist = this.codelists.get(codelistId);
    if (!codelist) {
      throw new Error(`Codelist not found: ${codelistId}`);
    }

    const index = codelist.items.findIndex(i => i.codedValue === codedValue);
    if (index === -1) {
      throw new Error(`Codelist item not found: ${codedValue}`);
    }

    codelist.items.splice(index, 1);
    
    // Reorder
    codelist.items.forEach((item, i) => { item.orderNumber = i; });
  }

  // ==========================================================================
  // Edit Check Assignment
  // ==========================================================================

  async assignEditCheck(formId: string, checkId: string, userId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    let checks = this.formEditChecks.get(formId);
    if (!checks) {
      checks = new Set();
      this.formEditChecks.set(formId, checks);
    }

    checks.add(checkId);
    form.updatedAt = new Date();
    form.updatedBy = userId;
  }

  async unassignEditCheck(formId: string, checkId: string, userId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    const checks = this.formEditChecks.get(formId);
    if (checks) {
      checks.delete(checkId);
    }

    form.updatedAt = new Date();
    form.updatedBy = userId;
  }

  getAssignedEditChecks(formId: string): string[] {
    const checks = this.formEditChecks.get(formId);
    return checks ? Array.from(checks) : [];
  }

  // ==========================================================================
  // Validation Rules
  // ==========================================================================

  async addValidationRule(formId: string, rule: Partial<ValidationRule>, userId: string): Promise<ValidationRule> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const newRule: ValidationRule = {
      id: rule.id ?? crypto.randomUUID(),
      name: rule.name ?? 'New Rule',
      description: rule.description,
      expression: rule.expression ?? 'true',
      errorMessage: rule.errorMessage ?? 'Validation failed',
      severity: rule.severity ?? 'ERROR',
      fieldOIDs: rule.fieldOIDs,
      sectionIds: rule.sectionIds,
      fireOnChange: rule.fireOnChange ?? false,
      fireOnSave: rule.fireOnSave ?? true,
      fireOnSubmit: rule.fireOnSubmit ?? true,
      isActive: rule.isActive ?? true,
    };

    form.validationRules.push(newRule);
    form.updatedAt = new Date();
    form.updatedBy = userId;

    return newRule;
  }

  async updateValidationRule(formId: string, ruleId: string, updates: Partial<ValidationRule>, userId: string): Promise<ValidationRule> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const rule = form.validationRules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`Validation rule not found: ${ruleId}`);
    }

    const safeUpdates = { ...updates };
    delete safeUpdates.id;

    Object.assign(rule, safeUpdates);
    form.updatedAt = new Date();
    form.updatedBy = userId;

    return rule;
  }

  async removeValidationRule(formId: string, ruleId: string, userId: string): Promise<void> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only modify forms in DRAFT status');
    }

    const index = form.validationRules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      throw new Error(`Validation rule not found: ${ruleId}`);
    }

    form.validationRules.splice(index, 1);
    form.updatedAt = new Date();
    form.updatedBy = userId;
  }

  // ==========================================================================
  // Version Control
  // ==========================================================================

  async createVersion(formId: string, changeDescription: string, userId: string): Promise<FormVersion> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    const history = this.versionHistories.get(formId);
    if (!history) {
      throw new Error(`Version history not found for form: ${formId}`);
    }

    // Increment version
    const [major, minor] = form.version.split('.').map(Number);
    const newVersion = `${major}.${minor + 1}`;

    const newVersionEntry: FormVersion = {
      version: newVersion,
      versionDate: new Date(),
      status: form.status,
      createdBy: userId,
      changeDescription,
      formSnapshot: JSON.parse(JSON.stringify(form)),
    };

    form.version = newVersion;
    form.versionDate = new Date();
    form.updatedAt = new Date();
    form.updatedBy = userId;

    history.versions.push(newVersionEntry);
    history.currentVersion = newVersion;

    return newVersionEntry;
  }

  getVersionHistory(formId: string): FormVersionHistory | undefined {
    return this.versionHistories.get(formId);
  }

  async revertToVersion(formId: string, version: string, userId: string): Promise<CRFDefinition> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only revert forms in DRAFT status');
    }

    const history = this.versionHistories.get(formId);
    if (!history) {
      throw new Error(`Version history not found for form: ${formId}`);
    }

    const versionEntry = history.versions.find(v => v.version === version);
    if (!versionEntry) {
      throw new Error(`Version not found: ${version}`);
    }

    // Restore form from snapshot
    const snapshot = versionEntry.formSnapshot;
    form.sections = JSON.parse(JSON.stringify(snapshot.sections));
    form.validationRules = JSON.parse(JSON.stringify(snapshot.validationRules));
    form.instructions = snapshot.instructions;
    form.completionGuidelines = snapshot.completionGuidelines;
    form.requiresSignature = snapshot.requiresSignature;
    form.sdvPercentage = snapshot.sdvPercentage;
    
    // Create new version
    await this.createVersion(formId, `Reverted to version ${version}`, userId);

    return form;
  }

  compareVersions(formId: string, version1: string, version2: string): FormVersionComparison {
    const history = this.versionHistories.get(formId);
    if (!history) {
      throw new Error(`Version history not found for form: ${formId}`);
    }

    const v1 = history.versions.find(v => v.version === version1)?.formSnapshot;
    const v2 = history.versions.find(v => v.version === version2)?.formSnapshot;

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const v1Sections = new Map(v1.sections.map(s => [s.id, s]));
    const v2Sections = new Map(v2.sections.map(s => [s.id, s]));

    const sectionsAdded: string[] = [];
    const sectionsRemoved: string[] = [];
    const sectionsModified: string[] = [];
    const fieldsAdded: { sectionId: string; fieldOID: string }[] = [];
    const fieldsRemoved: { sectionId: string; fieldOID: string }[] = [];
    const fieldsModified: { sectionId: string; fieldOID: string; changes: string[] }[] = [];

    // Check for added/modified sections
    for (const [id, section] of Array.from(v2Sections)) {
      if (!v1Sections.has(id)) {
        sectionsAdded.push(id);
        for (const field of Array.from(section.fields)) {
          fieldsAdded.push({ sectionId: id, fieldOID: field.fieldOID });
        }
      } else {
        const oldSection = v1Sections.get(id)!;
        if (section.name !== oldSection.name || section.order !== oldSection.order) {
          sectionsModified.push(id);
        }

        // Compare fields
        const oldFields = new Map(oldSection.fields.map(f => [f.fieldOID, f]));
        const newFields = new Map(section.fields.map(f => [f.fieldOID, f]));

        for (const [oid, field] of Array.from(newFields)) {
          if (!oldFields.has(oid)) {
            fieldsAdded.push({ sectionId: id, fieldOID: oid });
          } else {
            const oldField = oldFields.get(oid)!;
            const changes: string[] = [];
            if (field.label !== oldField.label) changes.push('label');
            if (field.dataType !== oldField.dataType) changes.push('dataType');
            if (field.required !== oldField.required) changes.push('required');
            if (changes.length > 0) {
              fieldsModified.push({ sectionId: id, fieldOID: oid, changes });
            }
          }
        }

        for (const oid of Array.from(Array.from(oldFields.keys()))) {
          if (!newFields.has(oid)) {
            fieldsRemoved.push({ sectionId: id, fieldOID: oid });
          }
        }
      }
    }

    // Check for removed sections
    for (const [id, section] of Array.from(v1Sections)) {
      if (!v2Sections.has(id)) {
        sectionsRemoved.push(id);
        for (const field of Array.from(section.fields)) {
          fieldsRemoved.push({ sectionId: id, fieldOID: field.fieldOID });
        }
      }
    }

    return {
      version1,
      version2,
      sectionsAdded,
      sectionsRemoved,
      sectionsModified,
      fieldsAdded,
      fieldsRemoved,
      fieldsModified,
    };
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  async approveForm(formId: string, userId: string): Promise<CRFDefinition> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'DRAFT') {
      throw new Error('Can only approve forms in DRAFT status');
    }

    // Validate before approval
    const validation = this.validateForm(formId);
    if (!validation.isValid) {
      throw new Error(`Form has validation errors: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    form.status = 'APPROVED';
    form.updatedAt = new Date();
    form.updatedBy = userId;

    // Create version snapshot
    await this.createVersion(formId, 'Form approved', userId);

    return form;
  }

  async retireForm(formId: string, userId: string): Promise<CRFDefinition> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'APPROVED') {
      throw new Error('Can only retire approved forms');
    }

    form.status = 'RETIRED';
    form.updatedAt = new Date();
    form.updatedBy = userId;

    return form;
  }

  async reactivateForm(formId: string, userId: string): Promise<CRFDefinition> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (form.status !== 'RETIRED') {
      throw new Error('Can only reactivate retired forms');
    }

    // Reactivate as draft for further editing
    form.status = 'DRAFT';
    form.updatedAt = new Date();
    form.updatedBy = userId;

    return form;
  }

  // ==========================================================================
  // Cloning & Templates
  // ==========================================================================

  async cloneForm(formId: string, newFormOID: string, newFormName: string, userId: string): Promise<CRFDefinition> {
    const original = this.forms.get(formId);
    if (!original) {
      throw new Error(`Form not found: ${formId}`);
    }

    if (!isOIDFormat(newFormOID)) {
      throw new Error(`Invalid OID format: ${newFormOID}`);
    }

    if (!this.checkOIDUniqueness(original.studyId, newFormOID)) {
      throw new Error(`Form OID already exists: ${newFormOID}`);
    }

    const cloned = await this.createForm({
      studyId: original.studyId,
      formName: newFormName,
      formOID: newFormOID,
      version: '1.0',
      instructions: original.instructions,
      completionGuidelines: original.completionGuidelines,
      requiresSignature: original.requiresSignature,
      sdvPercentage: original.sdvPercentage,
      createdBy: userId,
    });

    // Clone sections and fields
    for (const section of Array.from(original.sections)) {
      const clonedSection = await this.addSection(cloned.id, {
        name: section.name,
        description: section.description,
        order: section.order,
        repeating: section.repeating,
        maxRepeats: section.maxRepeats,
        collapsible: section.collapsible,
        collapsed: section.collapsed,
        displayCondition: section.displayCondition,
      }, userId);

      for (const field of Array.from(section.fields)) {
        await this.addField(cloned.id, clonedSection.id, {
          fieldOID: field.fieldOID,
          label: field.label,
          shortLabel: field.shortLabel,
          dataType: field.dataType,
          required: field.required,
          sdvRequired: field.sdvRequired,
          validation: field.validation ? { ...field.validation } : undefined,
          codelistId: field.codelistId,
          order: field.order,
          helpText: field.helpText,
          placeholder: field.placeholder,
          isHidden: field.isHidden,
          isReadOnly: field.isReadOnly,
          isKey: field.isKey,
          defaultValue: field.defaultValue,
        }, userId);
      }
    }

    // Clone validation rules
    for (const rule of Array.from(original.validationRules)) {
      await this.addValidationRule(cloned.id, {
        name: rule.name,
        description: rule.description,
        expression: rule.expression,
        errorMessage: rule.errorMessage,
        severity: rule.severity,
        fieldOIDs: rule.fieldOIDs,
        sectionIds: rule.sectionIds,
        fireOnChange: rule.fireOnChange,
        fireOnSave: rule.fireOnSave,
        fireOnSubmit: rule.fireOnSubmit,
        isActive: rule.isActive,
      }, userId);
    }

    // Clone edit check assignments
    const editChecks = this.getAssignedEditChecks(formId);
    for (const checkId of Array.from(editChecks)) {
      await this.assignEditCheck(cloned.id, checkId, userId);
    }

    return cloned;
  }

  async createFromTemplate(studyId: string, templateId: string, formOID: string, formName: string, userId: string): Promise<CRFDefinition> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (!isOIDFormat(formOID)) {
      throw new Error(`Invalid OID format: ${formOID}`);
    }

    if (!this.checkOIDUniqueness(studyId, formOID)) {
      throw new Error(`Form OID already exists: ${formOID}`);
    }

    const form = await this.createForm({
      studyId,
      formName,
      formOID,
      version: '1.0',
      createdBy: userId,
    });

    // Copy sections and fields from template
    for (const section of Array.from(template.sections)) {
      const newSection = await this.addSection(form.id, {
        name: section.name,
        description: section.description,
        order: section.order,
        repeating: section.repeating,
        maxRepeats: section.maxRepeats,
        collapsible: section.collapsible,
        displayCondition: section.displayCondition,
      }, userId);

      for (const field of Array.from(section.fields)) {
        await this.addField(form.id, newSection.id, {
          fieldOID: field.fieldOID,
          label: field.label,
          shortLabel: field.shortLabel,
          dataType: field.dataType,
          required: field.required,
          sdvRequired: field.sdvRequired,
          validation: field.validation,
          codelistId: field.codelistId,
          order: field.order,
          helpText: field.helpText,
          placeholder: field.placeholder,
          isHidden: field.isHidden,
          isReadOnly: field.isReadOnly,
          isKey: field.isKey,
          defaultValue: field.defaultValue,
        }, userId);
      }
    }

    // Copy codelists if they don't already exist
    for (const codelist of Array.from(template.codelists)) {
      const existing = this.listCodelists(studyId).find(c => c.name === codelist.name);
      if (!existing) {
        await this.createCodelist({
          studyId,
          name: codelist.name,
          description: codelist.description,
          dataType: codelist.dataType,
          extensible: codelist.extensible,
          source: codelist.source,
          items: codelist.items,
        });
      }
    }

    return form;
  }

  async saveAsTemplate(formId: string, templateName: string, category: FormTemplateCategory): Promise<FormTemplate> {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    // Collect referenced codelists
    const codelistIds = new Set<string>();
    for (const section of Array.from(form.sections)) {
      for (const field of Array.from(section.fields)) {
        if (field.codelistId) {
          codelistIds.add(field.codelistId);
        }
      }
    }

    const codelists = Array.from(codelistIds)
      .map(id => this.codelists.get(id))
      .filter((cl): cl is Codelist => cl !== undefined);

    const template: FormTemplate = {
      id: crypto.randomUUID(),
      name: templateName,
      description: `Template created from ${form.formName}`,
      category,
      formOID: form.formOID,
      sections: JSON.parse(JSON.stringify(form.sections)),
      codelists: JSON.parse(JSON.stringify(codelists)),
      editChecks: this.getAssignedEditChecks(formId),
      isStandard: false,
      version: '1.0',
    };

    this.templates.set(template.id, template);
    return template;
  }

  listTemplates(category?: FormTemplateCategory): FormTemplate[] {
    const templates = Array.from(this.templates.values());
    if (category) {
      return templates.filter(t => t.category === category);
    }
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  validateForm(formId: string): FormValidationResult {
    const form = this.forms.get(formId);
    if (!form) {
      return {
        isValid: false,
        errors: [{ code: 'FORM_NOT_FOUND', message: 'Form not found', location: {} }],
        warnings: [],
      };
    }

    const errors: FormValidationError[] = [];
    const warnings: FormValidationWarning[] = [];

    // Check form has at least one section
    if (form.sections.length === 0) {
      errors.push({
        code: 'NO_SECTIONS',
        message: 'Form must have at least one section',
        location: {},
      });
    }

    // Check each section has at least one field
    for (const section of Array.from(form.sections)) {
      if (section.fields.length === 0) {
        warnings.push({
          code: 'EMPTY_SECTION',
          message: `Section "${section.name}" has no fields`,
          location: { sectionId: section.id },
        });
      }

      // Check for unique field OIDs
      const fieldOIDs = new Set<string>();
      for (const field of Array.from(section.fields)) {
        if (fieldOIDs.has(field.fieldOID)) {
          errors.push({
            code: 'DUPLICATE_FIELD_OID',
            message: `Duplicate field OID: ${field.fieldOID}`,
            location: { sectionId: section.id, fieldId: field.id, fieldOID: field.fieldOID },
          });
        }
        fieldOIDs.add(field.fieldOID);

        // Check codelist reference
        if (field.dataType === 'CODELIST' && field.codelistId) {
          if (!this.codelists.has(field.codelistId)) {
            errors.push({
              code: 'INVALID_CODELIST_REF',
              message: `Field "${field?.label ?? ''}" references non-existent codelist`,
              location: { sectionId: section.id, fieldId: field.id, fieldOID: field.fieldOID },
            });
          }
        }

        // Warn about codelist fields without codelist
        if (field.dataType === 'CODELIST' && !field.codelistId) {
          warnings.push({
            code: 'MISSING_CODELIST',
            message: `Field "${field?.label ?? ''}" is CODELIST type but has no codelist assigned`,
            location: { sectionId: section.id, fieldId: field.id, fieldOID: field.fieldOID },
          });
        }
      }

      // Check repeating section has key field
      if (section.repeating) {
        const hasKey = section.fields.some(f => f.isKey);
        if (!hasKey) {
          warnings.push({
            code: 'REPEATING_NO_KEY',
            message: `Repeating section "${section.name}" has no key field defined`,
            location: { sectionId: section.id },
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateOID(oid: string): boolean {
    return isOIDFormat(oid);
  }

  checkOIDUniqueness(studyId: string, formOID: string, excludeFormId?: string): boolean {
    for (const form of Array.from(Array.from(this.forms.values()))) {
      if (form.studyId === studyId && form.formOID === formOID) {
        if (excludeFormId && form.id === excludeFormId) {
          continue;
        }
        return false;
      }
    }
    return true;
  }

  // ==========================================================================
  // Import/Export
  // ==========================================================================

  exportFormDefinition(formId: string): FormExportData {
    const form = this.forms.get(formId);
    if (!form) {
      throw new Error(`Form not found: ${formId}`);
    }

    // Collect referenced codelists
    const codelistIds = new Set<string>();
    for (const section of Array.from(form.sections)) {
      for (const field of Array.from(section.fields)) {
        if (field.codelistId) {
          codelistIds.add(field.codelistId);
        }
      }
    }

    const codelists = Array.from(codelistIds)
      .map(id => this.codelists.get(id))
      .filter((cl): cl is Codelist => cl !== undefined);

    return {
      exportVersion: '1.0',
      exportDate: new Date(),
      form: JSON.parse(JSON.stringify(form)),
      codelists: JSON.parse(JSON.stringify(codelists)),
      editCheckOIDs: this.getAssignedEditChecks(formId),
    };
  }

  async importFormDefinition(studyId: string, data: FormExportData, userId: string): Promise<CRFDefinition> {
    // Create new form with unique OID if needed
    let formOID = data.form.formOID;
    let suffix = 1;
    while (!this.checkOIDUniqueness(studyId, formOID)) {
      formOID = `${data.form.formOID}_${suffix}`;
      suffix++;
    }

    const form = await this.createForm({
      studyId,
      formName: data.form.formName,
      formOID,
      version: '1.0',
      instructions: data.form.instructions,
      completionGuidelines: data.form.completionGuidelines,
      requiresSignature: data.form.requiresSignature,
      sdvPercentage: data.form.sdvPercentage,
      createdBy: userId,
    });

    // Import codelists first
    const codelistIdMap = new Map<string, string>(); // old ID -> new ID
    for (const codelist of Array.from(data.codelists)) {
      const existing = this.listCodelists(studyId).find(c => c.name === codelist.name);
      if (existing) {
        codelistIdMap.set(codelist.id, existing.id);
      } else {
        const newCodelist = await this.createCodelist({
          studyId,
          name: codelist.name,
          description: codelist.description,
          dataType: codelist.dataType,
          extensible: codelist.extensible,
          source: codelist.source,
          items: codelist.items,
        });
        codelistIdMap.set(codelist.id, newCodelist.id);
      }
    }

    // Import sections and fields
    for (const section of Array.from(data.form.sections)) {
      const newSection = await this.addSection(form.id, {
        name: section.name,
        description: section.description,
        order: section.order,
        repeating: section.repeating,
        maxRepeats: section.maxRepeats,
        collapsible: section.collapsible,
        displayCondition: section.displayCondition,
      }, userId);

      for (const field of Array.from(section.fields)) {
        await this.addField(form.id, newSection.id, {
          fieldOID: field.fieldOID,
          label: field.label,
          shortLabel: field.shortLabel,
          dataType: field.dataType,
          required: field.required,
          sdvRequired: field.sdvRequired,
          validation: field.validation,
          codelistId: field.codelistId ? codelistIdMap.get(field.codelistId) : undefined,
          order: field.order,
          helpText: field.helpText,
          placeholder: field.placeholder,
          isHidden: field.isHidden,
          isReadOnly: field.isReadOnly,
          isKey: field.isKey,
          defaultValue: field.defaultValue,
        }, userId);
      }
    }

    // Import validation rules
    for (const rule of Array.from(data.form.validationRules)) {
      await this.addValidationRule(form.id, rule, userId);
    }

    return form;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  getStats(studyId: string): FormBuilderStats {
    const forms = this.listForms(studyId);
    
    let totalFields = 0;
    let totalSections = 0;
    let formsWithEditChecks = 0;

    for (const form of Array.from(forms)) {
      totalSections += form.sections.length;
      for (const section of Array.from(form.sections)) {
        totalFields += section.fields.length;
      }
      if (this.getAssignedEditChecks(form.id).length > 0) {
        formsWithEditChecks++;
      }
    }

    return {
      totalForms: forms.length,
      draftForms: forms.filter(f => f.status === 'DRAFT').length,
      approvedForms: forms.filter(f => f.status === 'APPROVED').length,
      retiredForms: forms.filter(f => f.status === 'RETIRED').length,
      totalFields,
      totalSections,
      formsWithEditChecks,
      averageFieldsPerForm: forms.length > 0 ? Math.round(totalFields / forms.length) : 0,
    };
  }

  // ==========================================================================
  // Standard Templates Initialization
  // ==========================================================================

  private initializeStandardTemplates(): void {
    // Demographics (CDASH-aligned)
    this.templates.set('tpl-demographics', {
      id: 'tpl-demographics',
      name: 'Demographics (CDASH)',
      description: 'Standard demographics form based on CDASH',
      category: 'DEMOGRAPHICS',
      formOID: 'DM',
      sections: [
        createCRFSection({
          id: 'dm-section',
          name: 'Demographics',
          order: 0,
          fields: [
            createCRFField({ fieldOID: 'DM.BRTHDTC', label: 'Date of Birth', dataType: 'DATE', required: true, sdvRequired: true, order: 0 }),
            createCRFField({ fieldOID: 'DM.SEX', label: 'Sex', dataType: 'CODELIST', required: true, sdvRequired: true, order: 1 }),
            createCRFField({ fieldOID: 'DM.RACE', label: 'Race', dataType: 'CODELIST', required: true, order: 2 }),
            createCRFField({ fieldOID: 'DM.ETHNIC', label: 'Ethnicity', dataType: 'CODELIST', required: true, order: 3 }),
            createCRFField({ fieldOID: 'DM.COUNTRY', label: 'Country', dataType: 'CODELIST', required: true, order: 4 }),
          ],
        }),
      ],
      codelists: [],
      editChecks: [],
      isStandard: true,
      version: '1.0',
    });

    // Vital Signs
    this.templates.set('tpl-vital-signs', {
      id: 'tpl-vital-signs',
      name: 'Vital Signs (CDASH)',
      description: 'Standard vital signs form based on CDASH',
      category: 'VITAL_SIGNS',
      formOID: 'VS',
      sections: [
        createCRFSection({
          id: 'vs-section',
          name: 'Vital Signs',
          order: 0,
          repeating: true,
          fields: [
            { ...createCRFField({ fieldOID: 'VS.VSDAT', label: 'Date of Assessment', dataType: 'DATE', required: true, order: 0 }), isKey: true },
            createCRFField({ fieldOID: 'VS.VSTIM', label: 'Time of Assessment', dataType: 'TIME', order: 1 }),
            createCRFField({ fieldOID: 'VS.SYSBP', label: 'Systolic Blood Pressure (mmHg)', dataType: 'INTEGER', required: true, order: 2 }),
            createCRFField({ fieldOID: 'VS.DIABP', label: 'Diastolic Blood Pressure (mmHg)', dataType: 'INTEGER', required: true, order: 3 }),
            createCRFField({ fieldOID: 'VS.PULSE', label: 'Pulse Rate (bpm)', dataType: 'INTEGER', required: true, order: 4 }),
            createCRFField({ fieldOID: 'VS.TEMP', label: 'Temperature', dataType: 'FLOAT', required: true, order: 5 }),
            createCRFField({ fieldOID: 'VS.RESP', label: 'Respiratory Rate (breaths/min)', dataType: 'INTEGER', order: 6 }),
            createCRFField({ fieldOID: 'VS.WEIGHT', label: 'Weight (kg)', dataType: 'FLOAT', order: 7 }),
            createCRFField({ fieldOID: 'VS.HEIGHT', label: 'Height (cm)', dataType: 'FLOAT', order: 8 }),
          ],
        }),
      ],
      codelists: [],
      editChecks: [],
      isStandard: true,
      version: '1.0',
    });

    // Adverse Events
    this.templates.set('tpl-adverse-events', {
      id: 'tpl-adverse-events',
      name: 'Adverse Events (CDASH)',
      description: 'Standard adverse events form based on CDASH',
      category: 'ADVERSE_EVENTS',
      formOID: 'AE',
      sections: [
        createCRFSection({
          id: 'ae-section',
          name: 'Adverse Event',
          order: 0,
          repeating: true,
          fields: [
            { ...createCRFField({ fieldOID: 'AE.AETERM', label: 'Adverse Event Term', dataType: 'TEXT', required: true, sdvRequired: true, order: 0 }), isKey: true },
            createCRFField({ fieldOID: 'AE.AESTDAT', label: 'Start Date', dataType: 'DATE', required: true, sdvRequired: true, order: 1 }),
            createCRFField({ fieldOID: 'AE.AEENDAT', label: 'End Date', dataType: 'DATE', order: 2 }),
            createCRFField({ fieldOID: 'AE.AESEV', label: 'Severity', dataType: 'CODELIST', required: true, order: 3 }),
            createCRFField({ fieldOID: 'AE.AESER', label: 'Serious?', dataType: 'CODELIST', required: true, order: 4 }),
            createCRFField({ fieldOID: 'AE.AEREL', label: 'Relationship to Study Drug', dataType: 'CODELIST', required: true, order: 5 }),
            createCRFField({ fieldOID: 'AE.AEACN', label: 'Action Taken with Study Drug', dataType: 'CODELIST', order: 6 }),
            createCRFField({ fieldOID: 'AE.AEOUT', label: 'Outcome', dataType: 'CODELIST', order: 7 }),
          ],
        }),
      ],
      codelists: [],
      editChecks: [],
      isStandard: true,
      version: '1.0',
    });

    // Concomitant Medications
    this.templates.set('tpl-conmeds', {
      id: 'tpl-conmeds',
      name: 'Concomitant Medications (CDASH)',
      description: 'Standard concomitant medications form',
      category: 'CONCOMITANT_MEDS',
      formOID: 'CM',
      sections: [
        createCRFSection({
          id: 'cm-section',
          name: 'Concomitant Medication',
          order: 0,
          repeating: true,
          fields: [
            { ...createCRFField({ fieldOID: 'CM.CMTRT', label: 'Medication Name', dataType: 'TEXT', required: true, order: 0 }), isKey: true },
            createCRFField({ fieldOID: 'CM.CMDOSE', label: 'Dose', dataType: 'FLOAT', order: 1 }),
            createCRFField({ fieldOID: 'CM.CMDOSU', label: 'Dose Unit', dataType: 'CODELIST', order: 2 }),
            createCRFField({ fieldOID: 'CM.CMDOSFRQ', label: 'Frequency', dataType: 'CODELIST', order: 3 }),
            createCRFField({ fieldOID: 'CM.CMROUTE', label: 'Route', dataType: 'CODELIST', order: 4 }),
            createCRFField({ fieldOID: 'CM.CMSTDAT', label: 'Start Date', dataType: 'PARTIAL_DATE', required: true, order: 5 }),
            createCRFField({ fieldOID: 'CM.CMENDAT', label: 'End Date', dataType: 'PARTIAL_DATE', order: 6 }),
            createCRFField({ fieldOID: 'CM.CMINDC', label: 'Indication', dataType: 'TEXT', order: 7 }),
          ],
        }),
      ],
      codelists: [],
      editChecks: [],
      isStandard: true,
      version: '1.0',
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFormBuilderService(config: FormBuilderServiceConfig): FormBuilderService {
  return new FormBuilderService(config);
}
