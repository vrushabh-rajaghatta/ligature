
/**
 * Site Management Service
 * Clinical site lifecycle management, staff, regulatory, and enrollment tracking
 * @version 0.20.2.1
 */

import type {
  ClinicalSite,
  CreateSiteConfig,
  SiteFilters,
  SiteStatus,
  ContractStatus,
  IRBInfo,
  IRBStatus,
  Investigator,
  SiteStaffMember,
  SiteRole,
  SiteMetrics,
  EnrollmentBySite,
} from '@/types/clinical-site';
import {
  createClinicalSite,
  createSiteStaffMember,
  isValidSiteStatusTransition,
  isIRBApproved,
  isSiteReady,
  SITE_STATUS_TRANSITIONS,
} from '@/types/clinical-site';

// ============================================================================
// Service Configuration
// ============================================================================

export interface SiteManagementServiceConfig {
  tenantId: string;
  requireIRBForActivation?: boolean;
  requireContractForActivation?: boolean;
  requireTrainedCoordinatorForActivation?: boolean;
  maxStaffPerSite?: number;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface SiteValidationResult {
  isValid: boolean;
  errors: SiteValidationError[];
  warnings: SiteValidationWarning[];
  readinessChecklist: ReadinessCheckItem[];
}

export interface SiteValidationError {
  code: string;
  field: string;
  message: string;
}

export interface SiteValidationWarning {
  code: string;
  field: string;
  message: string;
  recommendation?: string;
}

export interface ReadinessCheckItem {
  item: string;
  category: 'REGULATORY' | 'CONTRACT' | 'PERSONNEL' | 'TRAINING' | 'LOGISTICS';
  status: 'COMPLETE' | 'PENDING' | 'NOT_STARTED' | 'BLOCKED';
  blockedReason?: string;
  requiredForActivation: boolean;
}

// ============================================================================
// Service Statistics
// ============================================================================

export interface SiteManagementStats {
  totalSites: number;
  byStatus: Record<SiteStatus, number>;
  byCountry: Record<string, number>;
  totalTargetEnrollment: number;
  totalActualEnrollment: number;
  enrollmentProgress: number;
  sitesWithIRBApproval: number;
  sitesWithExecutedContract: number;
  activeSites: number;
  enrollingSites: number;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface ISiteManagementService {
  // Site CRUD
  createSite(config: CreateSiteConfig): Promise<ClinicalSite>;
  getSite(siteId: string): Promise<ClinicalSite | null>;
  updateSite(siteId: string, updates: Partial<ClinicalSite>, updatedBy: string): Promise<ClinicalSite>;
  listSites(filters?: SiteFilters): Promise<ClinicalSite[]>;
  deleteSite(siteId: string): Promise<void>;
  
  // Status Transitions
  selectSite(siteId: string, updatedBy: string): Promise<ClinicalSite>;
  startSiteStartup(siteId: string, updatedBy: string): Promise<ClinicalSite>;
  activateSite(siteId: string, updatedBy: string): Promise<ClinicalSite>;
  startEnrollment(siteId: string, updatedBy: string): Promise<ClinicalSite>;
  closeSite(siteId: string, reason: string, updatedBy: string): Promise<ClinicalSite>;
  terminateSite(siteId: string, reason: string, updatedBy: string): Promise<ClinicalSite>;
  
  // Staff Management
  addStaffMember(siteId: string, staff: Omit<SiteStaffMember, 'id' | 'isActive' | 'trainingCompleted' | 'trainingDocumentIds'>): Promise<SiteStaffMember>;
  updateStaffMember(siteId: string, staffId: string, updates: Partial<SiteStaffMember>): Promise<SiteStaffMember>;
  removeStaffMember(siteId: string, staffId: string, reason?: string): Promise<void>;
  completeStaffTraining(siteId: string, staffId: string, documentIds: string[]): Promise<SiteStaffMember>;
  
  // Regulatory
  updateIRB(siteId: string, irb: Partial<IRBInfo>, updatedBy: string): Promise<ClinicalSite>;
  approveIRB(siteId: string, approvalInfo: { approvalDate: Date; expirationDate: Date; approvalNumber: string; documentIds: string[] }, updatedBy: string): Promise<ClinicalSite>;
  updateContractStatus(siteId: string, status: ContractStatus, executionDate?: Date, updatedBy?: string): Promise<ClinicalSite>;
  
  // Investigator
  updateInvestigator(siteId: string, updates: Partial<Investigator>, updatedBy: string): Promise<ClinicalSite>;
  
  // Enrollment
  recordEnrollment(siteId: string, count: number, updatedBy: string): Promise<ClinicalSite>;
  recordScreenFailure(siteId: string, count: number, updatedBy: string): Promise<ClinicalSite>;
  
  // Validation & Metrics
  validateSiteReadiness(siteId: string): Promise<SiteValidationResult>;
  getSiteMetrics(siteId: string): Promise<SiteMetrics>;
  getEnrollmentBySite(studyId: string): Promise<EnrollmentBySite[]>;
  getStatistics(studyId?: string): SiteManagementStats;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class SiteManagementService implements ISiteManagementService {
  private config: Required<SiteManagementServiceConfig>;
  private sites: Map<string, ClinicalSite> = new Map();
  
  constructor(config: SiteManagementServiceConfig) {
    this.config = {
      tenantId: config.tenantId,
      requireIRBForActivation: config.requireIRBForActivation ?? true,
      requireContractForActivation: config.requireContractForActivation ?? true,
      requireTrainedCoordinatorForActivation: config.requireTrainedCoordinatorForActivation ?? true,
      maxStaffPerSite: config.maxStaffPerSite ?? 50,
    };
  }
  
  // ===========================================================================
  // Site CRUD
  // ===========================================================================
  
  async createSite(config: CreateSiteConfig): Promise<ClinicalSite> {
    // Validate tenant
    if (config.tenantId !== this.config.tenantId) {
      throw new Error('Tenant ID mismatch');
    }
    
    // Validate required fields
    if (!config.siteNumber?.trim()) {
      throw new Error('Site number is required');
    }
    if (!config.facilityName?.trim()) {
      throw new Error('Facility name is required');
    }
    if (!config.studyId?.trim()) {
      throw new Error('Study ID is required');
    }
    if (!config.address?.country?.trim()) {
      throw new Error('Country is required');
    }
    
    // Check for duplicate site number within study
    for (const site of Array.from(Array.from(this.sites.values()))) {
      if (site.studyId === config.studyId && site.siteNumber === config.siteNumber) {
        throw new Error(`Site number ${config.siteNumber} already exists in this study`);
      }
    }
    
    // Create site
    const site = createClinicalSite(config);
    this.sites.set(site.id, site);
    
    return site;
  }
  
  async getSite(siteId: string): Promise<ClinicalSite | null> {
    return this.sites.get(siteId) ?? null;
  }
  
  async updateSite(
    siteId: string,
    updates: Partial<ClinicalSite>,
    updatedBy: string
  ): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    // Prevent updating immutable fields
    const immutableFields = ['id', 'studyId', 'tenantId', 'createdAt', 'createdBy'];
    for (const field of immutableFields) {
      if (field in updates) {
        throw new Error(`Cannot update immutable field: ${field}`);
      }
    }
    
    // Prevent direct status updates (use transition methods)
    if ('status' in updates && updates.status !== site.status) {
      throw new Error('Use status transition methods to change site status');
    }
    
    const updatedSite: ClinicalSite = {
      ...site,
      ...updates,
      id: site.id,
      studyId: site.studyId,
      tenantId: site.tenantId,
      createdAt: site.createdAt,
      createdBy: site.createdBy,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  async listSites(filters?: SiteFilters): Promise<ClinicalSite[]> {
    let sites = Array.from(this.sites.values());
    
    // Apply tenant filter (always)
    sites = sites.filter(s => s.tenantId === this.config.tenantId);
    
    if (!filters) return sites;
    
    if (filters.studyId) {
      sites = sites.filter(s => s.studyId === filters.studyId);
    }
    
    if (filters.status?.length) {
      sites = sites.filter(s => filters.status!.includes(s.status));
    }
    
    if (filters.country) {
      sites = sites.filter(s => s.country === filters.country);
    }
    
    if (filters.region) {
      sites = sites.filter(s => s.region === filters.region);
    }
    
    if (filters.hasIRBApproval !== undefined) {
      sites = sites.filter(s => isIRBApproved(s.irb) === filters.hasIRBApproval);
    }
    
    if (filters.hasExecutedContract !== undefined) {
      const executed = filters.hasExecutedContract;
      sites = sites.filter(s => (s.contractStatus === 'EXECUTED') === executed);
    }
    
    if (filters.isEnrolling !== undefined) {
      sites = sites.filter(s => (s.status === 'ENROLLING') === filters.isEnrolling);
    }
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      sites = sites.filter(s =>
        s.siteNumber.toLowerCase().includes(term) ||
        s.facilityName.toLowerCase().includes(term) ||
        s.principalInvestigator.name.toLowerCase().includes(term) ||
        s.address.city.toLowerCase().includes(term)
      );
    }
    
    return sites;
  }
  
  async deleteSite(siteId: string): Promise<void> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    // Only allow deletion of IDENTIFIED sites
    if (site.status !== 'IDENTIFIED') {
      throw new Error('Can only delete sites in IDENTIFIED status');
    }
    
    this.sites.delete(siteId);
  }
  
  // ===========================================================================
  // Status Transitions
  // ===========================================================================
  
  async selectSite(siteId: string, updatedBy: string): Promise<ClinicalSite> {
    return this.transitionStatus(siteId, 'SELECTED', updatedBy);
  }
  
  async startSiteStartup(siteId: string, updatedBy: string): Promise<ClinicalSite> {
    const site = await this.transitionStatus(siteId, 'IN_STARTUP', updatedBy);
    return {
      ...site,
      selectionDate: site.selectionDate ?? new Date(),
    };
  }
  
  async activateSite(siteId: string, updatedBy: string): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    // Validate readiness
    const validation = await this.validateSiteReadiness(siteId);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join('; ');
      throw new Error(`Site not ready for activation: ${errorMessages}`);
    }
    
    const activated = await this.transitionStatus(siteId, 'ACTIVE', updatedBy);
    
    // Set activation date
    const updatedSite: ClinicalSite = {
      ...activated,
      activationDate: new Date(),
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  async startEnrollment(siteId: string, updatedBy: string): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    // Must be ready
    if (!isSiteReady(site)) {
      throw new Error('Site must be ready before starting enrollment');
    }
    
    const enrolling = await this.transitionStatus(siteId, 'ENROLLING', updatedBy);
    
    // Set first patient date if not set
    if (!enrolling.firstPatientDate) {
      const updated: ClinicalSite = {
        ...enrolling,
        updatedAt: new Date(),
        updatedBy,
      };
      this.sites.set(siteId, updated);
      return updated;
    }
    
    return enrolling;
  }
  
  async closeSite(siteId: string, reason: string, updatedBy: string): Promise<ClinicalSite> {
    if (!reason?.trim()) {
      throw new Error('Reason is required for closing a site');
    }
    
    const site = await this.transitionStatus(siteId, 'CLOSED', updatedBy, reason);
    
    // Set closeout date
    const updatedSite: ClinicalSite = {
      ...site,
      closeoutDate: new Date(),
      lastPatientDate: site.lastPatientDate ?? new Date(),
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  async terminateSite(siteId: string, reason: string, updatedBy: string): Promise<ClinicalSite> {
    if (!reason?.trim()) {
      throw new Error('Reason is required for terminating a site');
    }
    
    return this.transitionStatus(siteId, 'TERMINATED', updatedBy, reason);
  }
  
  private async transitionStatus(
    siteId: string,
    newStatus: SiteStatus,
    updatedBy: string,
    reason?: string
  ): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    if (!isValidSiteStatusTransition(site.status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${site.status} to ${newStatus}. ` +
        `Valid transitions: ${SITE_STATUS_TRANSITIONS[site.status].join(', ') || 'none'}`
      );
    }
    
    const updatedSite: ClinicalSite = {
      ...site,
      status: newStatus,
      statusReason: reason,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  // ===========================================================================
  // Staff Management
  // ===========================================================================
  
  async addStaffMember(
    siteId: string,
    staffInput: Omit<SiteStaffMember, 'id' | 'isActive' | 'trainingCompleted' | 'trainingDocumentIds'>
  ): Promise<SiteStaffMember> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    // Check max staff
    if (site.siteStaff.length >= this.config.maxStaffPerSite) {
      throw new Error(`Maximum staff limit (${this.config.maxStaffPerSite}) reached`);
    }
    
    // Validate required fields
    if (!staffInput.name?.trim()) {
      throw new Error('Staff name is required');
    }
    if (!staffInput.email?.trim()) {
      throw new Error('Staff email is required');
    }
    
    // Check for duplicate email
    if (site.siteStaff.some(s => s.email.toLowerCase() === staffInput.email.toLowerCase())) {
      throw new Error('Staff member with this email already exists at this site');
    }
    
    const staff = createSiteStaffMember({
      name: staffInput.name,
      role: staffInput.role,
      email: staffInput.email,
      phone: staffInput.phone,
      delegatedTasks: staffInput.delegatedTasks,
    });
    
    // Set delegation dates if provided
    if (staffInput.delegationStartDate) {
      staff.delegationStartDate = staffInput.delegationStartDate;
    }
    if (staffInput.delegationEndDate) {
      staff.delegationEndDate = staffInput.delegationEndDate;
    }
    if (staffInput.delegationLogId) {
      staff.delegationLogId = staffInput.delegationLogId;
    }
    
    const updatedSite: ClinicalSite = {
      ...site,
      siteStaff: [...site.siteStaff, staff],
      updatedAt: new Date(),
    };
    
    this.sites.set(siteId, updatedSite);
    return staff;
  }
  
  async updateStaffMember(
    siteId: string,
    staffId: string,
    updates: Partial<SiteStaffMember>
  ): Promise<SiteStaffMember> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    const staffIndex = site.siteStaff.findIndex(s => s.id === staffId);
    if (staffIndex === -1) {
      throw new Error(`Staff member not found: ${staffId}`);
    }
    
    // Prevent changing ID
    if ('id' in updates) {
      delete updates.id;
    }
    
    const updatedStaff: SiteStaffMember = {
      ...site.siteStaff[staffIndex],
      ...updates,
      id: staffId,
    };
    
    const updatedSiteStaff = [...site.siteStaff];
    updatedSiteStaff[staffIndex] = updatedStaff;
    
    const updatedSite: ClinicalSite = {
      ...site,
      siteStaff: updatedSiteStaff,
      updatedAt: new Date(),
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedStaff;
  }
  
  async removeStaffMember(siteId: string, staffId: string, reason?: string): Promise<void> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    const staffIndex = site.siteStaff.findIndex(s => s.id === staffId);
    if (staffIndex === -1) {
      throw new Error(`Staff member not found: ${staffId}`);
    }
    
    // Soft delete - mark as inactive
    const updatedStaff = [...site.siteStaff];
    updatedStaff[staffIndex] = {
      ...updatedStaff[staffIndex],
      isActive: false,
      delegationEndDate: new Date(),
    };
    
    const updatedSite: ClinicalSite = {
      ...site,
      siteStaff: updatedStaff,
      updatedAt: new Date(),
    };
    
    this.sites.set(siteId, updatedSite);
  }
  
  async completeStaffTraining(
    siteId: string,
    staffId: string,
    documentIds: string[]
  ): Promise<SiteStaffMember> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    const staffIndex = site.siteStaff.findIndex(s => s.id === staffId);
    if (staffIndex === -1) {
      throw new Error(`Staff member not found: ${staffId}`);
    }
    
    const updatedStaff: SiteStaffMember = {
      ...site.siteStaff[staffIndex],
      trainingCompleted: true,
      trainingCompletionDate: new Date(),
      trainingDocumentIds: documentIds,
    };
    
    const updatedSiteStaff = [...site.siteStaff];
    updatedSiteStaff[staffIndex] = updatedStaff;
    
    const updatedSite: ClinicalSite = {
      ...site,
      siteStaff: updatedSiteStaff,
      updatedAt: new Date(),
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedStaff;
  }
  
  // ===========================================================================
  // Regulatory
  // ===========================================================================
  
  async updateIRB(
    siteId: string,
    irbUpdates: Partial<IRBInfo>,
    updatedBy: string
  ): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    const updatedIRB: IRBInfo = {
      ...site.irb,
      ...irbUpdates,
    };
    
    const updatedSite: ClinicalSite = {
      ...site,
      irb: updatedIRB,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  async approveIRB(
    siteId: string,
    approvalInfo: {
      approvalDate: Date;
      expirationDate: Date;
      approvalNumber: string;
      documentIds: string[];
    },
    updatedBy: string
  ): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    // Validate expiration is after approval
    if (approvalInfo.expirationDate <= approvalInfo.approvalDate) {
      throw new Error('Expiration date must be after approval date');
    }
    
    const updatedIRB: IRBInfo = {
      ...site.irb,
      status: 'APPROVED',
      approvalDate: approvalInfo.approvalDate,
      expirationDate: approvalInfo.expirationDate,
      approvalNumber: approvalInfo.approvalNumber,
      documentIds: [...site.irb.documentIds, ...approvalInfo.documentIds],
    };
    
    const updatedSite: ClinicalSite = {
      ...site,
      irb: updatedIRB,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  async updateContractStatus(
    siteId: string,
    status: ContractStatus,
    executionDate?: Date,
    updatedBy?: string
  ): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    const updatedSite: ClinicalSite = {
      ...site,
      contractStatus: status,
      contractExecutionDate: status === 'EXECUTED' ? (executionDate ?? new Date()) : site.contractExecutionDate,
      updatedAt: new Date(),
      updatedBy: updatedBy ?? site.updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  // ===========================================================================
  // Investigator
  // ===========================================================================
  
  async updateInvestigator(
    siteId: string,
    updates: Partial<Investigator>,
    updatedBy: string
  ): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    // Prevent changing PI ID
    if ('id' in updates) {
      delete updates.id;
    }
    
    const updatedPI: Investigator = {
      ...site.principalInvestigator,
      ...updates,
      id: site.principalInvestigator.id,
    };
    
    const updatedSite: ClinicalSite = {
      ...site,
      principalInvestigator: updatedPI,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  // ===========================================================================
  // Enrollment
  // ===========================================================================
  
  async recordEnrollment(
    siteId: string,
    count: number,
    updatedBy: string
  ): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    if (count < 0) {
      throw new Error('Enrollment count cannot be negative');
    }
    
    const newEnrollment = site.actualEnrollment + count;
    
    // Set first patient date if this is first enrollment
    const firstPatientDate = site.firstPatientDate ?? (count > 0 ? new Date() : undefined);
    
    const updatedSite: ClinicalSite = {
      ...site,
      actualEnrollment: newEnrollment,
      firstPatientDate,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  async recordScreenFailure(
    siteId: string,
    count: number,
    updatedBy: string
  ): Promise<ClinicalSite> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    if (count < 0) {
      throw new Error('Screen failure count cannot be negative');
    }
    
    const updatedSite: ClinicalSite = {
      ...site,
      screenFailures: site.screenFailures + count,
      updatedAt: new Date(),
      updatedBy,
    };
    
    this.sites.set(siteId, updatedSite);
    return updatedSite;
  }
  
  // ===========================================================================
  // Validation & Metrics
  // ===========================================================================
  
  async validateSiteReadiness(siteId: string): Promise<SiteValidationResult> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    const errors: SiteValidationError[] = [];
    const warnings: SiteValidationWarning[] = [];
    const checklist: ReadinessCheckItem[] = [];
    
    // IRB Check
    const irbApproved = isIRBApproved(site.irb);
    checklist.push({
      item: 'IRB/Ethics Approval',
      category: 'REGULATORY',
      status: irbApproved ? 'COMPLETE' : (site.irb.status === 'PENDING' ? 'PENDING' : 'NOT_STARTED'),
      requiredForActivation: this.config.requireIRBForActivation,
    });
    
    if (this.config.requireIRBForActivation && !irbApproved) {
      errors.push({
        code: 'IRB_NOT_APPROVED',
        field: 'irb',
        message: 'IRB approval is required for site activation',
      });
    }
    
    // Check IRB expiration warning
    if (irbApproved && site.irb.expirationDate) {
      const daysUntilExpiry = Math.ceil(
        (site.irb.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry < 30) {
        warnings.push({
          code: 'IRB_EXPIRING_SOON',
          field: 'irb.expirationDate',
          message: `IRB approval expires in ${daysUntilExpiry} days`,
          recommendation: 'Initiate IRB renewal process',
        });
      }
    }
    
    // Contract Check
    const contractExecuted = site.contractStatus === 'EXECUTED';
    checklist.push({
      item: 'Contract Execution',
      category: 'CONTRACT',
      status: contractExecuted ? 'COMPLETE' : 
        (site.contractStatus === 'NOT_STARTED' ? 'NOT_STARTED' : 'PENDING'),
      requiredForActivation: this.config.requireContractForActivation,
    });
    
    if (this.config.requireContractForActivation && !contractExecuted) {
      errors.push({
        code: 'CONTRACT_NOT_EXECUTED',
        field: 'contractStatus',
        message: 'Contract must be executed for site activation',
      });
    }
    
    // PI Check
    const piActive = site.principalInvestigator.isActive;
    checklist.push({
      item: 'Principal Investigator Active',
      category: 'PERSONNEL',
      status: piActive ? 'COMPLETE' : 'BLOCKED',
      blockedReason: piActive ? undefined : 'PI is inactive',
      requiredForActivation: true,
    });
    
    if (!piActive) {
      errors.push({
        code: 'PI_INACTIVE',
        field: 'principalInvestigator',
        message: 'Principal investigator must be active',
      });
    }
    
    // PI GCP Check
    const piGCPValid = site.principalInvestigator.gcpCertificationDate && 
      new Date(site.principalInvestigator.gcpCertificationDate).getTime() > 
      Date.now() - (3 * 365 * 24 * 60 * 60 * 1000); // Within 3 years
    
    checklist.push({
      item: 'PI GCP Certification',
      category: 'TRAINING',
      status: piGCPValid ? 'COMPLETE' : 'PENDING',
      requiredForActivation: true,
    });
    
    if (!piGCPValid) {
      warnings.push({
        code: 'PI_GCP_MISSING_OR_EXPIRED',
        field: 'principalInvestigator.gcpCertificationDate',
        message: 'PI GCP certification is missing or expired',
        recommendation: 'Upload current GCP certification',
      });
    }
    
    // Coordinator Check
    const hasTrainedCoordinator = site.siteStaff.some(
      s => s.role === 'STUDY_COORDINATOR' && s.isActive && s.trainingCompleted
    );
    
    checklist.push({
      item: 'Trained Study Coordinator',
      category: 'PERSONNEL',
      status: hasTrainedCoordinator ? 'COMPLETE' : 
        (site.siteStaff.some(s => s.role === 'STUDY_COORDINATOR') ? 'PENDING' : 'NOT_STARTED'),
      requiredForActivation: this.config.requireTrainedCoordinatorForActivation,
    });
    
    if (this.config.requireTrainedCoordinatorForActivation && !hasTrainedCoordinator) {
      errors.push({
        code: 'NO_TRAINED_COORDINATOR',
        field: 'siteStaff',
        message: 'At least one trained study coordinator is required',
      });
    }
    
    // Target enrollment check
    if (site.targetEnrollment === 0) {
      warnings.push({
        code: 'NO_TARGET_ENROLLMENT',
        field: 'targetEnrollment',
        message: 'Target enrollment is not set',
        recommendation: 'Set target enrollment for site metrics tracking',
      });
    }
    
    checklist.push({
      item: 'Target Enrollment Set',
      category: 'LOGISTICS',
      status: site.targetEnrollment > 0 ? 'COMPLETE' : 'PENDING',
      requiredForActivation: false,
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      readinessChecklist: checklist,
    };
  }
  
  async getSiteMetrics(siteId: string): Promise<SiteMetrics> {
    const site = this.sites.get(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    
    const screenedCount = site.actualEnrollment + site.screenFailures;
    const screenFailureRate = screenedCount > 0 
      ? (site.screenFailures / screenedCount) * 100 
      : 0;
    
    // Calculate enrollment rate (per month)
    let enrollmentRate = 0;
    if (site.firstPatientDate && site.actualEnrollment > 0) {
      const monthsActive = Math.max(1, 
        (Date.now() - site.firstPatientDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      enrollmentRate = site.actualEnrollment / monthsActive;
    }
    
    const enrollmentProgress = site.targetEnrollment > 0
      ? (site.actualEnrollment / site.targetEnrollment) * 100
      : 0;
    
    return {
      siteId,
      studyId: site.studyId,
      enrollmentTarget: site.targetEnrollment,
      enrollmentActual: site.actualEnrollment,
      enrollmentRate: Math.round(enrollmentRate * 10) / 10,
      enrollmentProgress: Math.round(enrollmentProgress * 10) / 10,
      screenedCount,
      screenFailureCount: site.screenFailures,
      screenFailureRate: Math.round(screenFailureRate * 10) / 10,
      queryRate: 0, // Would be populated from EDC integration
      queryResolutionTime: 0,
      protocolDeviationCount: 0, // Would be populated from deviation tracking
      protocolDeviationRate: 0,
      dataEntryLag: 0, // Would be populated from EDC integration
      lastUpdated: new Date(),
    };
  }
  
  async getEnrollmentBySite(studyId: string): Promise<EnrollmentBySite[]> {
    const sites = await this.listSites({ studyId });
    
    return sites.map(site => {
      const progress = site.targetEnrollment > 0
        ? (site.actualEnrollment / site.targetEnrollment) * 100
        : 0;
      
      // Calculate rate
      let rate = 0;
      if (site.firstPatientDate && site.actualEnrollment > 0) {
        const monthsActive = Math.max(1, 
          (Date.now() - site.firstPatientDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        rate = site.actualEnrollment / monthsActive;
      }
      
      // Project completion
      let projectedCompletion: Date | undefined;
      if (rate > 0 && site.actualEnrollment < site.targetEnrollment) {
        const remaining = site.targetEnrollment - site.actualEnrollment;
        const monthsToComplete = remaining / rate;
        projectedCompletion = new Date(Date.now() + monthsToComplete * 30 * 24 * 60 * 60 * 1000);
      }
      
      return {
        siteId: site.id,
        siteNumber: site.siteNumber,
        facilityName: site.facilityName,
        target: site.targetEnrollment,
        actual: site.actualEnrollment,
        progress: Math.round(progress * 10) / 10,
        rate: Math.round(rate * 10) / 10,
        projectedCompletion,
      };
    });
  }
  
  getStatistics(studyId?: string): SiteManagementStats {
    let sites = Array.from(this.sites.values())
      .filter(s => s.tenantId === this.config.tenantId);
    
    if (studyId) {
      sites = sites.filter(s => s.studyId === studyId);
    }
    
    const byStatus: Record<SiteStatus, number> = {
      IDENTIFIED: 0,
      SELECTED: 0,
      IN_STARTUP: 0,
      ACTIVE: 0,
      ENROLLING: 0,
      CLOSED: 0,
      TERMINATED: 0,
    };
    
    const byCountry: Record<string, number> = {};
    
    let totalTargetEnrollment = 0;
    let totalActualEnrollment = 0;
    let sitesWithIRBApproval = 0;
    let sitesWithExecutedContract = 0;
    
    for (const site of sites) {
      byStatus[site.status]++;
      byCountry[site.country] = (byCountry[site.country] || 0) + 1;
      totalTargetEnrollment += site.targetEnrollment;
      totalActualEnrollment += site.actualEnrollment;
      
      if (isIRBApproved(site.irb)) sitesWithIRBApproval++;
      if (site.contractStatus === 'EXECUTED') sitesWithExecutedContract++;
    }
    
    const enrollmentProgress = totalTargetEnrollment > 0
      ? (totalActualEnrollment / totalTargetEnrollment) * 100
      : 0;
    
    return {
      totalSites: sites.length,
      byStatus,
      byCountry,
      totalTargetEnrollment,
      totalActualEnrollment,
      enrollmentProgress: Math.round(enrollmentProgress * 10) / 10,
      sitesWithIRBApproval,
      sitesWithExecutedContract,
      activeSites: byStatus.ACTIVE + byStatus.ENROLLING,
      enrollingSites: byStatus.ENROLLING,
    };
  }
  
  // ===========================================================================
  // Utility Methods
  // ===========================================================================
  
  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.sites.clear();
  }
  
  /**
   * Get sites needing attention (approaching deadlines, etc.)
   */
  getSitesNeedingAttention(studyId: string): {
    expiringIRB: ClinicalSite[];
    lowEnrollment: ClinicalSite[];
    pendingActivation: ClinicalSite[];
  } {
    const sites = Array.from(this.sites.values())
      .filter(s => s.tenantId === this.config.tenantId && s.studyId === studyId);
    
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const expiringIRB = sites.filter(s => 
      s.irb.status === 'APPROVED' && 
      s.irb.expirationDate && 
      s.irb.expirationDate <= thirtyDaysFromNow
    );
    
    const lowEnrollment = sites.filter(s =>
      s.status === 'ENROLLING' &&
      s.targetEnrollment > 0 &&
      (s.actualEnrollment / s.targetEnrollment) < 0.5 &&
      s.firstPatientDate &&
      (Date.now() - s.firstPatientDate.getTime()) > 90 * 24 * 60 * 60 * 1000 // Active for 90+ days
    );
    
    const pendingActivation = sites.filter(s => s.status === 'IN_STARTUP');
    
    return {
      expiringIRB,
      lowEnrollment,
      pendingActivation,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSiteManagementService(
  config: SiteManagementServiceConfig
): SiteManagementService {
  return new SiteManagementService(config);
}
