

// Master Data Store - Enterprise Master Data Management (v60)
import { create } from 'zustand';
import { useMemo } from 'react';
import type {
  MasterDataState, MasterDataActions, Organization, OrganizationRelationship,
  Contact, ContactRole, Site, Product, ProductIndication, ProductRegulatoryStatus,
  Substance, ReferenceDataSet, ReferenceDataValue, ReferenceDataMapping,
  DataGovernancePolicy, DataStewardAssignment, DataQualityRule, DataQualityResult,
  DataQualityScore, MasterDataChangeRequest, MatchingProfile, MatchCandidate,
  MergeRecord, FieldResolution, MasterDataLink, MasterDataAnalytics, MasterDataFilters,
  MasterDataView, MasterDataDomain, SearchResult
} from './masterDataTypes';

const generateId = () => `mdm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateOrgId = (counter: number) => `ORG-${String(counter).padStart(6, '0')}`;
const generateContactId = (counter: number) => `CON-${String(counter).padStart(6, '0')}`;
const generateSiteId = (counter: number) => `SITE-${String(counter).padStart(6, '0')}`;
const generateProductId = (counter: number) => `PROD-${String(counter).padStart(6, '0')}`;
const generateSubstanceId = (counter: number) => `SUB-${String(counter).padStart(6, '0')}`;
const generateRefId = (counter: number) => `REF-${String(counter).padStart(6, '0')}`;
const generateCRId = (counter: number) => `CR-${String(counter).padStart(6, '0')}`;
const now = () => new Date().toISOString();

const initialFilters: MasterDataFilters = { domains: [], statuses: [], qualityLevels: [], regions: [] };

const initialState: MasterDataState = {
  organizations: {}, organizationsByOrgId: {}, contacts: {}, contactsByContactId: {},
  sites: {}, sitesBySiteId: {}, products: {}, productsByProductId: {},
  substances: {}, substancesBySubstanceId: {}, referenceSets: {}, referenceValues: {},
  policies: {}, stewardAssignments: {}, qualityRules: {}, qualityResults: {}, qualityScores: {},
  changeRequests: {}, changeRequestsByEntity: {}, matchingProfiles: {}, matchCandidates: {},
  mergeRecords: {}, masterDataLinks: {}, linksByEntity: {}, syncConflicts: {}, analytics: null,
  selectedOrganizationId: null, selectedContactId: null, selectedSiteId: null,
  selectedProductId: null, selectedSubstanceId: null, selectedChangeRequestId: null,
  activeView: 'dashboard', filters: initialFilters, isLoading: false, error: null
};

export const useMasterDataStore = create<MasterDataState & MasterDataActions>((set, get) => ({
  ...initialState,

  // ===== ORGANIZATION CRUD =====
  createOrganization: (data) => {
    const id = generateId();
    const orgId = generateOrgId(Object.keys(get().organizations).length + 1);
    const org: Organization = {
      id, organizationId: data.organizationId || orgId, name: data.name || 'New Organization',
      legalName: data.legalName || data.name || 'New Organization', tradingNames: data.tradingNames || [],
      abbreviations: data.abbreviations || [], organizationType: data.organizationType || 'other',
      industryClassification: data.industryClassification || 'pharmaceutical', companySize: data.companySize || 'medium',
      isPublicCompany: data.isPublicCompany ?? false, childOrganizationIds: [], affiliateIds: [],
      headquarters: data.headquarters || { id: generateId(), addressType: 'headquarters', line1: '', city: '', countryCode: 'US', countryName: 'United States', isVerified: false },
      relationships: data.relationships || [], therapeuticAreas: data.therapeuticAreas || [],
      specializations: data.specializations || [], certifications: data.certifications || [],
      licenses: data.licenses || [], status: 'active', qualityLevel: data.qualityLevel || 'bronze',
      linkedEntities: data.linkedEntities || [], createdAt: now(), createdBy: data.createdBy || 'system',
      updatedAt: now(), lastModifiedBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ organizations: { ...s.organizations, [id]: org }, organizationsByOrgId: { ...s.organizationsByOrgId, [org.organizationId]: id } }));
    return org;
  },

  updateOrganization: (id, updates) => {
    const org = get().organizations[id];
    if (org) set((s) => ({ organizations: { ...s.organizations, [id]: { ...org, ...updates, updatedAt: now() } } }));
  },

  archiveOrganization: (id) => {
    const org = get().organizations[id];
    if (org) set((s) => ({ organizations: { ...s.organizations, [id]: { ...org, status: 'archived', updatedAt: now() } } }));
  },

  addOrganizationRelationship: (orgId, relationship) => {
    const org = get().organizations[orgId];
    if (!org) return null as unknown as OrganizationRelationship;
    const rel: OrganizationRelationship = { id: generateId(), relatedOrganizationId: relationship.relatedOrganizationId || '', relatedOrganizationName: relationship.relatedOrganizationName || '', relationshipType: relationship.relationshipType || 'partner', startDate: relationship.startDate || now(), isActive: true, ...relationship };
    set((s) => ({ organizations: { ...s.organizations, [orgId]: { ...org, relationships: [...org.relationships, rel], updatedAt: now() } } }));
    return rel;
  },

  removeOrganizationRelationship: (orgId, relationshipId) => {
    const org = get().organizations[orgId];
    if (org) set((s) => ({ organizations: { ...s.organizations, [orgId]: { ...org, relationships: org.relationships.filter(r => r.id !== relationshipId), updatedAt: now() } } }));
  },

  // ===== CONTACT CRUD =====
  createContact: (data) => {
    const id = generateId();
    const contactId = generateContactId(Object.keys(get().contacts).length + 1);
    const contact: Contact = {
      id, contactId: data.contactId || contactId, firstName: data.firstName || 'New', lastName: data.lastName || 'Contact',
      displayName: data.displayName || `${data.firstName || 'New'} ${data.lastName || 'Contact'}`,
      roles: data.roles || [], expertiseAreas: data.expertiseAreas || [], languages: data.languages || ['English'],
      preferredContactMethod: data.preferredContactMethod || 'email', preferredLanguage: data.preferredLanguage || 'en',
      timezone: data.timezone || 'UTC', doNotContact: false, relationships: data.relationships || [],
      status: 'active', qualityLevel: data.qualityLevel || 'bronze', linkedEntities: data.linkedEntities || [],
      createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ contacts: { ...s.contacts, [id]: contact }, contactsByContactId: { ...s.contactsByContactId, [contact.contactId]: id } }));
    return contact;
  },

  updateContact: (id, updates) => { const c = get().contacts[id]; if (c) set((s) => ({ contacts: { ...s.contacts, [id]: { ...c, ...updates, updatedAt: now() } } })); },
  archiveContact: (id) => { const c = get().contacts[id]; if (c) set((s) => ({ contacts: { ...s.contacts, [id]: { ...c, status: 'archived', updatedAt: now() } } })); },

  addContactRole: (contactId, role) => {
    const c = get().contacts[contactId];
    if (!c) return null as unknown as ContactRole;
    const newRole: ContactRole = { id: generateId(), roleType: role.roleType || 'other', startDate: role.startDate || now(), isActive: true, isPrimary: role.isPrimary ?? false, ...role };
    set((s) => ({ contacts: { ...s.contacts, [contactId]: { ...c, roles: [...c.roles, newRole], updatedAt: now() } } }));
    return newRole;
  },

  removeContactRole: (contactId, roleId) => { const c = get().contacts[contactId]; if (c) set((s) => ({ contacts: { ...s.contacts, [contactId]: { ...c, roles: c.roles.filter(r => r.id !== roleId), updatedAt: now() } } })); },

  // ===== SITE CRUD =====
  createSite: (data) => {
    const id = generateId();
    const siteId = generateSiteId(Object.keys(get().sites).length + 1);
    const site: Site = {
      id, siteId: data.siteId || siteId, name: data.name || 'New Site', siteType: data.siteType || 'clinical-site',
      siteCategory: data.siteCategory || 'hospital', organizationId: data.organizationId || '', organizationName: data.organizationName || '',
      address: data.address || { id: generateId(), addressType: 'site', line1: '', city: '', countryCode: 'US', countryName: 'United States', isVerified: false },
      timezone: data.timezone || 'UTC', contacts: data.contacts || [], regulatoryIdentifiers: data.regulatoryIdentifiers || [],
      certifications: data.certifications || [], licenses: data.licenses || [], capabilities: data.capabilities || [],
      equipment: data.equipment || [], specializations: data.specializations || [], studyParticipation: data.studyParticipation || [],
      status: 'active', qualityLevel: data.qualityLevel || 'bronze', qualificationStatus: data.qualificationStatus || 'not-qualified',
      linkedEntities: data.linkedEntities || [], createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ sites: { ...s.sites, [id]: site }, sitesBySiteId: { ...s.sitesBySiteId, [site.siteId]: id } }));
    return site;
  },

  updateSite: (id, updates) => { const site = get().sites[id]; if (site) set((s) => ({ sites: { ...s.sites, [id]: { ...site, ...updates, updatedAt: now() } } })); },
  archiveSite: (id) => { const site = get().sites[id]; if (site) set((s) => ({ sites: { ...s.sites, [id]: { ...site, status: 'archived', updatedAt: now() } } })); },
  qualifySite: (siteId, qualifiedBy) => { const site = get().sites[siteId]; if (site) set((s) => ({ sites: { ...s.sites, [siteId]: { ...site, qualificationStatus: 'qualified', qualificationDate: now(), updatedAt: now() } } })); },
  disqualifySite: (siteId, reason, disqualifiedBy) => { const site = get().sites[siteId]; if (site) set((s) => ({ sites: { ...s.sites, [siteId]: { ...site, qualificationStatus: 'disqualified', updatedAt: now() } } })); },

  // ===== PRODUCT CRUD =====
  createProduct: (data) => {
    const id = generateId();
    const productId = generateProductId(Object.keys(get().products).length + 1);
    const product: Product = {
      id, productId: data.productId || productId, productName: data.productName || 'New Product', brandNames: data.brandNames || [],
      synonyms: data.synonyms || [], productType: data.productType || 'drug', productCategory: data.productCategory || 'innovative',
      therapeuticClass: data.therapeuticClass || [], pharmacologicClass: data.pharmacologicClass || [],
      activeSubstances: data.activeSubstances || [], routeOfAdministration: data.routeOfAdministration || [],
      regulatoryStatus: data.regulatoryStatus || [], atcCodes: data.atcCodes || [], manufacturerIds: data.manufacturerIds || [],
      marketingAuthorizationHolderIds: data.marketingAuthorizationHolderIds || [], developmentPhase: data.developmentPhase || 'discovery',
      approvedIndications: data.approvedIndications || [], investigationalIndications: data.investigationalIndications || [],
      childProductIds: [], relatedProducts: data.relatedProducts || [], status: 'active', qualityLevel: data.qualityLevel || 'bronze',
      linkedEntities: data.linkedEntities || [], createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ products: { ...s.products, [id]: product }, productsByProductId: { ...s.productsByProductId, [product.productId]: id } }));
    return product;
  },

  updateProduct: (id, updates) => { const p = get().products[id]; if (p) set((s) => ({ products: { ...s.products, [id]: { ...p, ...updates, updatedAt: now() } } })); },
  archiveProduct: (id) => { const p = get().products[id]; if (p) set((s) => ({ products: { ...s.products, [id]: { ...p, status: 'archived', updatedAt: now() } } })); },

  addProductIndication: (productId, indication) => {
    const p = get().products[productId];
    if (!p) return null as unknown as ProductIndication;
    const ind: ProductIndication = { id: generateId(), indicationId: indication.indicationId || generateId(), indicationName: indication.indicationName || '', icdCodes: indication.icdCodes || [], populationType: indication.populationType || 'adult', isApproved: indication.isApproved ?? false, regions: indication.regions || [], ...indication };
    const key = indication.isApproved ? 'approvedIndications' : 'investigationalIndications';
    set((s) => ({ products: { ...s.products, [productId]: { ...p, [key]: [...p[key], ind], updatedAt: now() } } }));
    return ind;
  },

  updateRegulatoryStatus: (productId, status) => {
    const p = get().products[productId];
    if (!p) return;
    const newStatus: ProductRegulatoryStatus = { id: generateId(), region: status.region || 'US', authority: status.authority || 'FDA', status: status.status || 'not-submitted', ...status };
    const existing = p.regulatoryStatus.findIndex(s => s.region === newStatus.region);
    const regulatoryStatus = existing >= 0 ? p.regulatoryStatus.map((s, i) => i === existing ? newStatus : s) : [...p.regulatoryStatus, newStatus];
    set((s) => ({ products: { ...s.products, [productId]: { ...p, regulatoryStatus, updatedAt: now() } } }));
  },

  // ===== SUBSTANCE CRUD =====
  createSubstance: (data) => {
    const id = generateId();
    const substanceId = generateSubstanceId(Object.keys(get().substances).length + 1);
    const substance: Substance = {
      id, substanceId: data.substanceId || substanceId, preferredName: data.preferredName || 'New Substance',
      synonyms: data.synonyms || [], substanceClass: data.substanceClass || 'small-molecule', origin: data.origin || 'synthetic',
      atcCodes: data.atcCodes || [], meshTerms: data.meshTerms || [], physicalProperties: data.physicalProperties || [],
      relatedSubstances: data.relatedSubstances || [], status: 'active', qualityLevel: data.qualityLevel || 'bronze',
      linkedEntities: data.linkedEntities || [], createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ substances: { ...s.substances, [id]: substance }, substancesBySubstanceId: { ...s.substancesBySubstanceId, [substance.substanceId]: id } }));
    return substance;
  },

  updateSubstance: (id, updates) => { const sub = get().substances[id]; if (sub) set((s) => ({ substances: { ...s.substances, [id]: { ...sub, ...updates, updatedAt: now() } } })); },
  archiveSubstance: (id) => { const sub = get().substances[id]; if (sub) set((s) => ({ substances: { ...s.substances, [id]: { ...sub, status: 'archived', updatedAt: now() } } })); },

  // ===== REFERENCE DATA =====
  createReferenceDataSet: (data) => {
    const id = generateId();
    const dataSetId = generateRefId(Object.keys(get().referenceSets).length + 1);
    const refSet: ReferenceDataSet = {
      id, dataSetId: data.dataSetId || dataSetId, name: data.name || 'New Reference Set', description: data.description || '',
      dataType: data.dataType || 'code-list', domain: data.domain || 'terminology', sourceSystem: data.sourceSystem || 'internal',
      sourceVersion: data.sourceVersion || '1.0', version: data.version || '1.0', effectiveDate: data.effectiveDate || now(),
      values: data.values || [], totalValues: data.values?.length || 0, isHierarchical: data.isHierarchical ?? false,
      mappings: data.mappings || [], dataOwnerId: data.dataOwnerId || 'system', dataStewardId: data.dataStewardId || 'system',
      status: 'active', createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ referenceSets: { ...s.referenceSets, [id]: refSet }, referenceValues: { ...s.referenceValues, [id]: refSet.values } }));
    return refSet;
  },

  updateReferenceDataSet: (id, updates) => { const rs = get().referenceSets[id]; if (rs) set((s) => ({ referenceSets: { ...s.referenceSets, [id]: { ...rs, ...updates, updatedAt: now() } } })); },

  addReferenceValue: (dataSetId, value) => {
    const rs = get().referenceSets[dataSetId];
    if (!rs) return null as unknown as ReferenceDataValue;
    const newVal: ReferenceDataValue = { id: generateId(), code: value.code || '', displayValue: value.displayValue || '', sortOrder: value.sortOrder ?? rs.values.length, isActive: true, effectiveDate: value.effectiveDate || now(), attributes: value.attributes || {}, externalMappings: value.externalMappings || [], ...value };
    const values = [...rs.values, newVal];
    set((s) => ({ referenceSets: { ...s.referenceSets, [dataSetId]: { ...rs, values, totalValues: values.length, updatedAt: now() } }, referenceValues: { ...s.referenceValues, [dataSetId]: values } }));
    return newVal;
  },

  updateReferenceValue: (dataSetId, valueId, updates) => {
    const rs = get().referenceSets[dataSetId];
    if (!rs) return;
    const values = rs.values.map(v => v.id === valueId ? { ...v, ...updates } : v);
    set((s) => ({ referenceSets: { ...s.referenceSets, [dataSetId]: { ...rs, values, updatedAt: now() } }, referenceValues: { ...s.referenceValues, [dataSetId]: values } }));
  },

  deprecateReferenceValue: (dataSetId, valueId) => { get().updateReferenceValue(dataSetId, valueId, { isActive: false, expirationDate: now() }); },

  createReferenceMapping: (sourceId, targetId) => {
    const src = get().referenceSets[sourceId]; const tgt = get().referenceSets[targetId];
    if (!src || !tgt) return null as unknown as ReferenceDataMapping;
    const mapping: ReferenceDataMapping = { id: generateId(), sourceDataSetId: sourceId, targetDataSetId: targetId, mappingName: `${src.name} to ${tgt.name}`, mappingRules: [], totalMappings: 0, unmappedSourceCount: src.totalValues, unmappedTargetCount: tgt.totalValues, lastSyncAt: now(), status: 'draft' };
    set((s) => ({ referenceSets: { ...s.referenceSets, [sourceId]: { ...src, mappings: [...src.mappings, mapping], updatedAt: now() } } }));
    return mapping;
  },

  // ===== GOVERNANCE =====
  createPolicy: (data) => {
    const id = generateId();
    const policy: DataGovernancePolicy = {
      id, policyId: data.policyId || `POL-${Date.now()}`, name: data.name || 'New Policy', description: data.description || '',
      policyType: data.policyType || 'data-quality', domain: data.domain || 'organization', rules: data.rules || [],
      applicableEntityTypes: data.applicableEntityTypes || [], applicableRegions: data.applicableRegions || [],
      dataOwnerId: data.dataOwnerId || 'system', dataOwnerName: data.dataOwnerName || 'System', approvedBy: data.approvedBy || 'system',
      approvalDate: data.approvalDate || now(), version: data.version || '1.0', effectiveDate: data.effectiveDate || now(),
      reviewDate: data.reviewDate || now(), status: 'draft', createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ policies: { ...s.policies, [id]: policy } }));
    return policy;
  },

  updatePolicy: (id, updates) => { const p = get().policies[id]; if (p) set((s) => ({ policies: { ...s.policies, [id]: { ...p, ...updates, updatedAt: now() } } })); },

  assignSteward: (assignment) => {
    const id = generateId();
    const steward: DataStewardAssignment = {
      id, userId: assignment.userId || '', userName: assignment.userName || '', role: assignment.role || 'data-steward',
      domain: assignment.domain || 'organization', entityTypes: assignment.entityTypes || [], regions: assignment.regions || [],
      assignedDate: now(), assignedBy: assignment.assignedBy || 'system', isActive: true, entitiesManaged: 0, pendingReviews: 0, lastActivityDate: now(), ...assignment
    };
    set((s) => ({ stewardAssignments: { ...s.stewardAssignments, [id]: steward } }));
    return steward;
  },

  removeStewardAssignment: (id) => { set((s) => { const { [id]: _, ...rest } = s.stewardAssignments; return { stewardAssignments: rest }; }); },

  // ===== QUALITY =====
  createQualityRule: (data) => {
    const id = generateId();
    const rule: DataQualityRule = {
      id, ruleId: data.ruleId || `QR-${Date.now()}`, name: data.name || 'New Rule', description: data.description || '',
      ruleType: data.ruleType || 'completeness', domain: data.domain || 'organization', entityType: data.entityType || '',
      expression: data.expression || '', parameters: data.parameters || {}, severity: data.severity || 'warning',
      autoCorrect: data.autoCorrect ?? false, isActive: true, createdAt: now(), createdBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ qualityRules: { ...s.qualityRules, [id]: rule } }));
    return rule;
  },

  updateQualityRule: (id, updates) => { const r = get().qualityRules[id]; if (r) set((s) => ({ qualityRules: { ...s.qualityRules, [id]: { ...r, ...updates } } })); },

  executeQualityRules: (domain, entityId) => {
    const rules = Object.values(get().qualityRules).filter(r => r.domain === domain && r.isActive);
    const results: DataQualityResult[] = rules.map(rule => ({ id: generateId(), ruleId: rule.id, ruleName: rule.name, executionDate: now(), domain, entityType: rule.entityType, entityId, status: Math.random() > 0.2 ? 'passed' : 'failed', message: Math.random() > 0.2 ? 'Validation passed' : 'Missing required field', isResolved: false }));
    const key = entityId || domain;
    set((s) => ({ qualityResults: { ...s.qualityResults, [key]: [...(s.qualityResults[key] || []), ...results] } }));
    return results;
  },

  resolveQualityIssue: (resultId, resolvedBy, notes) => {
    const all = get().qualityResults;
    for (const key of Object.keys(all)) {
      const idx = all[key].findIndex(r => r.id === resultId);
      if (idx >= 0) { set((s) => ({ qualityResults: { ...s.qualityResults, [key]: all[key].map((r, i) => i === idx ? { ...r, isResolved: true, resolvedBy, resolvedAt: now(), resolutionNotes: notes } : r) } })); break; }
    }
  },

  calculateQualityScore: (domain, entityId) => {
    const results = get().qualityResults[entityId || domain] || [];
    const passed = results.filter(r => r.status === 'passed').length;
    const total = results.length || 1;
    const score: DataQualityScore = {
      id: generateId(), domain, entityType: entityId ? 'single' : 'domain', entityId,
      overallScore: Math.round((passed / total) * 100), completenessScore: 85 + Math.floor(Math.random() * 15),
      accuracyScore: 80 + Math.floor(Math.random() * 20), consistencyScore: 75 + Math.floor(Math.random() * 25),
      uniquenessScore: 90 + Math.floor(Math.random() * 10), timelinessScore: 70 + Math.floor(Math.random() * 30),
      previousScore: 75, scoreTrend: 'improving', totalRecords: total, passedRules: passed,
      failedRules: results.filter(r => r.status === 'failed').length, warningRules: results.filter(r => r.status === 'warning').length, calculatedAt: now()
    };
    set((s) => ({ qualityScores: { ...s.qualityScores, [entityId || domain]: score } }));
    return score;
  },

  // ===== CHANGE REQUESTS =====
  createChangeRequest: (data) => {
    const id = generateId();
    const crId = generateCRId(Object.keys(get().changeRequests).length + 1);
    const cr: MasterDataChangeRequest = {
      id, changeRequestId: data.changeRequestId || crId, title: data.title || 'New Change Request', description: data.description || '',
      changeType: data.changeType || 'update', priority: data.priority || 'medium', domain: data.domain || 'organization',
      entityType: data.entityType || '', proposedChanges: data.proposedChanges || [], affectedModules: data.affectedModules || [],
      affectedRecords: data.affectedRecords || 0, status: 'draft', requesterId: data.requesterId || 'system',
      requesterName: data.requesterName || 'System', approvers: data.approvers || [], approvalHistory: [], requestedDate: now(),
      createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system', ...data
    };
    set((s) => ({
      changeRequests: { ...s.changeRequests, [id]: cr },
      changeRequestsByEntity: data.entityId ? { ...s.changeRequestsByEntity, [data.entityId]: [...(s.changeRequestsByEntity[data.entityId] || []), id] } : s.changeRequestsByEntity
    }));
    return cr;
  },

  updateChangeRequest: (id, updates) => { const cr = get().changeRequests[id]; if (cr) set((s) => ({ changeRequests: { ...s.changeRequests, [id]: { ...cr, ...updates, updatedAt: now() } } })); },

  submitChangeRequest: (id) => {
    const cr = get().changeRequests[id];
    if (cr) set((s) => ({ changeRequests: { ...s.changeRequests, [id]: { ...cr, status: 'submitted', approvalHistory: [...cr.approvalHistory, { id: generateId(), action: 'submitted' as const, actionBy: cr.requesterId, actionByName: cr.requesterName, actionDate: now() }], updatedAt: now() } } }));
  },

  approveChangeRequest: (id, approverId, comments) => {
    const cr = get().changeRequests[id];
    if (cr) {
      const approvers = cr.approvers.map(a => a.approverId === approverId ? { ...a, status: 'approved' as const, comments, decisionDate: now() } : a);
      const allApproved = approvers.length === 0 || approvers.every(a => a.status === 'approved');
      set((s) => ({ changeRequests: { ...s.changeRequests, [id]: { ...cr, status: allApproved ? 'approved' : 'under-review', approvers, approvalHistory: [...cr.approvalHistory, { id: generateId(), action: 'approved' as const, actionBy: approverId, actionByName: approverId, actionDate: now(), comments }], updatedAt: now() } } }));
    }
  },

  rejectChangeRequest: (id, approverId, reason) => {
    const cr = get().changeRequests[id];
    if (cr) set((s) => ({ changeRequests: { ...s.changeRequests, [id]: { ...cr, status: 'rejected', approvers: cr.approvers.map(a => a.approverId === approverId ? { ...a, status: 'rejected' as const, comments: reason, decisionDate: now() } : a), approvalHistory: [...cr.approvalHistory, { id: generateId(), action: 'rejected' as const, actionBy: approverId, actionByName: approverId, actionDate: now(), comments: reason }], updatedAt: now() } } }));
  },

  implementChangeRequest: (id, implementedBy) => {
    const cr = get().changeRequests[id];
    if (cr && cr.status === 'approved') set((s) => ({ changeRequests: { ...s.changeRequests, [id]: { ...cr, status: 'implemented', implementedDate: now(), updatedAt: now() } } }));
  },

  // ===== MATCHING =====
  createMatchingProfile: (data) => {
    const id = generateId();
    const profile: MatchingProfile = {
      id, profileId: data.profileId || `MP-${Date.now()}`, name: data.name || 'New Profile', description: data.description || '',
      entityType: data.entityType || 'organization', matchRules: data.matchRules || [], blockingRules: data.blockingRules || [],
      autoMergeThreshold: data.autoMergeThreshold ?? 95, reviewThreshold: data.reviewThreshold ?? 70, isActive: true, createdAt: now(), createdBy: data.createdBy || 'system', ...data
    };
    set((s) => ({ matchingProfiles: { ...s.matchingProfiles, [id]: profile } }));
    return profile;
  },

  findMatches: (entityType, entityId) => {
    const candidates: MatchCandidate[] = [{ id: generateId(), sourceEntityId: entityId, sourceEntityType: entityType, sourceEntityName: 'Source Entity', targetEntityId: generateId(), targetEntityType: entityType, targetEntityName: 'Potential Match', overallScore: 75 + Math.floor(Math.random() * 25), confidence: 'medium', matchedFields: [{ fieldPath: 'name', fieldName: 'Name', sourceValue: 'Acme Corp', targetValue: 'ACME Corporation', matchScore: 85, matchType: 'fuzzy' }], status: 'pending-review', createdAt: now(), profileId: 'default' }];
    candidates.forEach(c => set((s) => ({ matchCandidates: { ...s.matchCandidates, [c.id]: c } })));
    return candidates;
  },

  reviewMatchCandidate: (candidateId, decision, reviewedBy, notes) => {
    const c = get().matchCandidates[candidateId];
    if (c) set((s) => ({ matchCandidates: { ...s.matchCandidates, [candidateId]: { ...c, status: decision, reviewedBy, reviewedAt: now(), reviewNotes: notes } } }));
  },

  mergeEntities: (survivorId, mergedIds, resolutions, mergedBy) => {
    const id = generateId();
    const record: MergeRecord = { id, mergeType: 'manual', survivorEntityId: survivorId, mergedEntityIds: mergedIds, preMergeSnapshot: {}, fieldResolutions: resolutions, status: 'completed', mergedAt: now(), mergedBy };
    set((s) => ({ mergeRecords: { ...s.mergeRecords, [id]: record } }));
    return record;
  },

  undoMerge: (mergeRecordId, undoneBy) => {
    const r = get().mergeRecords[mergeRecordId];
    if (r) set((s) => ({ mergeRecords: { ...s.mergeRecords, [mergeRecordId]: { ...r, status: 'undone', undoneAt: now(), undoneBy } } }));
  },

  // ===== CROSS-MODULE INTEGRATION =====
  linkToModule: (masterEntityId, moduleType, moduleEntityId) => {
    const id = generateId();
    const link: MasterDataLink = { id, masterDomain: 'organization', masterEntityId, masterEntityType: 'organization', masterEntityName: 'Entity', moduleType, moduleEntityId, moduleEntityType: 'entity', moduleEntityName: 'Module Entity', linkType: 'primary', isAutoSync: true, syncStatus: 'synced', createdAt: now(), createdBy: 'system' };
    set((s) => ({ masterDataLinks: { ...s.masterDataLinks, [id]: link }, linksByEntity: { ...s.linksByEntity, [masterEntityId]: [...(s.linksByEntity[masterEntityId] || []), id] } }));
    return link;
  },

  unlinkFromModule: (linkId) => {
    const link = get().masterDataLinks[linkId];
    if (!link) return;
    set((s) => {
      const { [linkId]: _, ...links } = s.masterDataLinks;
      const byEntity = { ...s.linksByEntity };
      if (byEntity[link.masterEntityId]) byEntity[link.masterEntityId] = byEntity[link.masterEntityId].filter(i => i !== linkId);
      return { masterDataLinks: links, linksByEntity: byEntity };
    });
  },

  syncWithModule: (linkId) => { const link = get().masterDataLinks[linkId]; if (link) set((s) => ({ masterDataLinks: { ...s.masterDataLinks, [linkId]: { ...link, lastSyncAt: now(), syncStatus: 'synced' } } })); },

  resolveConflict: (conflictId, resolution, customValue, resolvedBy) => {
    const c = get().syncConflicts[conflictId];
    if (c) {
      const resolvedValue = resolution === 'custom' ? customValue as string | number | boolean | null : resolution === 'use-master' ? c.masterValue : c.moduleValue;
      set((s) => ({ syncConflicts: { ...s.syncConflicts, [conflictId]: { ...c, status: `resolved-${resolution}` as any, resolvedValue, resolvedBy, resolvedAt: now() } } }));
    }
  },

  // ===== ANALYTICS =====
  calculateAnalytics: () => {
    const s = get();
    const analytics: MasterDataAnalytics = {
      totalEntities: Object.keys(s.organizations).length + Object.keys(s.contacts).length + Object.keys(s.sites).length + Object.keys(s.products).length + Object.keys(s.substances).length,
      entitiesByDomain: { organization: Object.keys(s.organizations).length, product: Object.keys(s.products).length, substance: Object.keys(s.substances).length, indication: 0, study: 0, site: Object.keys(s.sites).length, person: Object.keys(s.contacts).length, geography: 0, regulatory: 0, terminology: Object.keys(s.referenceSets).length },
      entitiesByStatus: { draft: 0, 'pending-review': 0, active: 0, inactive: 0, deprecated: 0, merged: 0, archived: 0 },
      overallQualityScore: 82,
      qualityByDomain: { organization: 85, product: 80, substance: 78, indication: 75, study: 82, site: 79, person: 81, geography: 90, regulatory: 88, terminology: 92 },
      qualityTrend: [{ date: '2024-10-01', overallScore: 75, completeness: 78, accuracy: 72, consistency: 74 }, { date: '2024-11-01', overallScore: 79, completeness: 82, accuracy: 76, consistency: 78 }, { date: '2024-12-01', overallScore: 82, completeness: 85, accuracy: 80, consistency: 81 }],
      pendingChangeRequests: Object.values(s.changeRequests).filter(cr => ['submitted', 'under-review'].includes(cr.status)).length,
      pendingReviews: Object.values(s.matchCandidates).filter(mc => mc.status === 'pending-review').length, overdueReviews: 0,
      potentialDuplicates: Object.keys(s.matchCandidates).length, pendingMerges: Object.values(s.mergeRecords).filter(mr => mr.status === 'pending').length,
      recentMerges: Object.values(s.mergeRecords).filter(mr => mr.status === 'completed').length, recentCreates: 5, recentUpdates: 12, recentArchives: 1,
      totalLinks: Object.keys(s.masterDataLinks).length, syncConflicts: Object.values(s.syncConflicts).filter(sc => sc.status === 'unresolved').length, generatedAt: now()
    };
    set({ analytics });
    return analytics;
  },

  // ===== SEARCH =====
  searchEntities: (query, domains) => {
    const s = get();
    const results: SearchResult[] = [];
    const q = query.toLowerCase();
    if (!domains || domains.includes('organization')) Object.values(s.organizations).forEach(org => { if (org.name.toLowerCase().includes(q) || org.legalName.toLowerCase().includes(q)) results.push({ entityId: org.id, entityType: 'organization', domain: 'organization', name: org.name, status: org.status, qualityLevel: org.qualityLevel, matchScore: 90, matchedFields: ['name'] }); });
    if (!domains || domains.includes('person')) Object.values(s.contacts).forEach(c => { if (c.displayName.toLowerCase().includes(q)) results.push({ entityId: c.id, entityType: 'contact', domain: 'person', name: c.displayName, status: c.status, qualityLevel: c.qualityLevel, matchScore: 85, matchedFields: ['displayName'] }); });
    if (!domains || domains.includes('site')) Object.values(s.sites).forEach(site => { if (site.name.toLowerCase().includes(q)) results.push({ entityId: site.id, entityType: 'site', domain: 'site', name: site.name, status: site.status, qualityLevel: site.qualityLevel, matchScore: 88, matchedFields: ['name'] }); });
    if (!domains || domains.includes('product')) Object.values(s.products).forEach(p => { if (p.productName.toLowerCase().includes(q)) results.push({ entityId: p.id, entityType: 'product', domain: 'product', name: p.productName, status: p.status, qualityLevel: p.qualityLevel, matchScore: 92, matchedFields: ['productName'] }); });
    if (!domains || domains.includes('substance')) Object.values(s.substances).forEach(sub => { if (sub.preferredName.toLowerCase().includes(q)) results.push({ entityId: sub.id, entityType: 'substance', domain: 'substance', name: sub.preferredName, status: sub.status, qualityLevel: sub.qualityLevel, matchScore: 87, matchedFields: ['preferredName'] }); });
    return results.sort((a, b) => b.matchScore - a.matchScore);
  },

  // ===== UI ACTIONS =====
  setSelectedOrganizationId: (id) => set({ selectedOrganizationId: id }),
  setSelectedContactId: (id) => set({ selectedContactId: id }),
  setSelectedSiteId: (id) => set({ selectedSiteId: id }),
  setSelectedProductId: (id) => set({ selectedProductId: id }),
  setSelectedSubstanceId: (id) => set({ selectedSubstanceId: id }),
  setSelectedChangeRequestId: (id) => set({ selectedChangeRequestId: id }),
  setActiveView: (view) => set({ activeView: view }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  clearFilters: () => set({ filters: initialFilters }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // ===== DATA MANAGEMENT =====
  loadMockData: () => {
    const store = get();
    const pharmaOrg = store.createOrganization({ name: 'PharmaCorp International', legalName: 'PharmaCorp International Inc.', organizationType: 'sponsor', industryClassification: 'pharmaceutical', companySize: 'large', isPublicCompany: true, stockSymbol: 'PHRM', therapeuticAreas: ['Oncology', 'Immunology', 'Neurology'], qualityLevel: 'gold' });
    const cro = store.createOrganization({ name: 'GlobalTrials CRO', legalName: 'GlobalTrials Contract Research Organization LLC', organizationType: 'cro', industryClassification: 'pharmaceutical', companySize: 'medium', therapeuticAreas: ['Oncology', 'Rare Disease'], qualityLevel: 'silver' });
    const lab = store.createOrganization({ name: 'BioAnalytics Laboratory', legalName: 'BioAnalytics Laboratory Services Inc.', organizationType: 'laboratory', industryClassification: 'diagnostics', companySize: 'small', qualityLevel: 'gold' });
    store.addOrganizationRelationship(pharmaOrg.id, { relatedOrganizationId: cro.id, relatedOrganizationName: cro.name, relationshipType: 'vendor', startDate: '2023-01-15' });
    const pi = store.createContact({ firstName: 'Dr. Sarah', lastName: 'Chen', displayName: 'Dr. Sarah Chen', title: 'Principal Investigator', jobTitle: 'Professor of Oncology', organizationId: pharmaOrg.id, organizationName: pharmaOrg.name, primaryEmail: 'sarah.chen@university.edu', expertiseAreas: ['Oncology', 'Clinical Trials'], qualityLevel: 'gold' });
    store.addContactRole(pi.id, { roleType: 'investigator', isPrimary: true });
    store.createContact({ firstName: 'Michael', lastName: 'Johnson', displayName: 'Michael Johnson', title: 'Director', jobTitle: 'Director of Regulatory Affairs', organizationId: pharmaOrg.id, organizationName: pharmaOrg.name, primaryEmail: 'mjohnson@pharmacorp.com', expertiseAreas: ['Regulatory Strategy', 'FDA Submissions'], qualityLevel: 'silver' });
    store.createSite({ name: 'University Medical Center - Oncology', siteType: 'clinical-site', siteCategory: 'academic-medical-center', organizationId: pharmaOrg.id, organizationName: pharmaOrg.name, address: { id: generateId(), addressType: 'site', line1: '100 Medical Drive', city: 'Boston', stateProvince: 'MA', postalCode: '02115', countryCode: 'US', countryName: 'United States', isVerified: true }, qualificationStatus: 'qualified', qualificationDate: '2024-06-01', qualityLevel: 'gold' });
    store.createSite({ name: 'Central Research Hospital', siteType: 'clinical-site', siteCategory: 'hospital', organizationId: cro.id, organizationName: cro.name, address: { id: generateId(), addressType: 'site', line1: '500 Research Blvd', city: 'San Francisco', stateProvince: 'CA', postalCode: '94102', countryCode: 'US', countryName: 'United States', isVerified: true }, qualificationStatus: 'qualified', qualityLevel: 'silver' });
    const product1 = store.createProduct({ productName: 'Oncovir-X', genericName: 'oncovirmab', productType: 'biologic', productCategory: 'innovative', therapeuticClass: ['Antineoplastic agents'], pharmacologicClass: ['Monoclonal antibodies'], developmentPhase: 'phase-3', routeOfAdministration: ['intravenous'], qualityLevel: 'gold' });
    store.addProductIndication(product1.id, { indicationName: 'Non-Small Cell Lung Cancer', icdCodes: ['C34.90'], populationType: 'adult', isApproved: false, regions: ['US', 'EU'] });
    store.updateRegulatoryStatus(product1.id, { region: 'US', authority: 'FDA', status: 'under-review' });
    store.createProduct({ productName: 'NeuroCalm', genericName: 'neurocalamine', productType: 'drug', productCategory: 'innovative', therapeuticClass: ['Psycholeptics'], pharmacologicClass: ['Anxiolytics'], developmentPhase: 'approved', routeOfAdministration: ['oral'], qualityLevel: 'silver' });
    store.createSubstance({ preferredName: 'Oncovirmab', substanceClass: 'antibody', origin: 'recombinant', casNumber: '1234567-89-0', uniiCode: 'ABC123DEF', qualityLevel: 'gold' });
    store.createSubstance({ preferredName: 'Neurocalamine Hydrochloride', substanceClass: 'small-molecule', origin: 'synthetic', molecularFormula: 'C18H22N2O3·HCl', molecularWeight: 350.84, casNumber: '9876543-21-0', qualityLevel: 'silver' });
    const countryList = store.createReferenceDataSet({ name: 'ISO Country Codes', description: 'Standard country code list', dataType: 'code-list', domain: 'geography', sourceSystem: 'ISO', sourceVersion: '3166-1' });
    store.addReferenceValue(countryList.id, { code: 'US', displayValue: 'United States' });
    store.addReferenceValue(countryList.id, { code: 'GB', displayValue: 'United Kingdom' });
    store.addReferenceValue(countryList.id, { code: 'DE', displayValue: 'Germany' });
    const therapeuticAreas = store.createReferenceDataSet({ name: 'Therapeutic Areas', description: 'Standard therapeutic area classification', dataType: 'controlled-vocabulary', domain: 'terminology' });
    store.addReferenceValue(therapeuticAreas.id, { code: 'ONC', displayValue: 'Oncology' });
    store.addReferenceValue(therapeuticAreas.id, { code: 'CNS', displayValue: 'Central Nervous System' });
    store.createPolicy({ name: 'Organization Data Quality Policy', description: 'Standards for organization master data', policyType: 'data-quality', domain: 'organization', rules: [{ id: generateId(), name: 'Required Legal Name', description: 'Legal name must be provided', ruleType: 'validation', condition: 'legalName != null', action: 'reject', severity: 'error', isActive: true }], status: 'active' });
    store.createQualityRule({ name: 'Organization Name Required', ruleType: 'completeness', domain: 'organization', entityType: 'organization', fieldPath: 'name', expression: 'name != null && name.length > 0', severity: 'error' });
    store.createMatchingProfile({ name: 'Organization Matching', entityType: 'organization', matchRules: [{ id: generateId(), fieldPath: 'name', fieldName: 'Name', matchType: 'fuzzy', weight: 40, isRequired: true }], blockingRules: [{ id: generateId(), fieldPath: 'name', blockingType: 'soundex' }] });
    store.calculateAnalytics();
  },

  clearAll: () => set(initialState)
}));

// ===== SELECTOR HOOKS (with useMemo for stable references) =====
const EMPTY_ARRAY: readonly unknown[] = [];
const EMPTY_REF_VALUES: readonly unknown[] = [];

export const useOrganizations = () => {
  const organizations = useMasterDataStore((s) => s.organizations);
  return useMemo(() => Object.values(organizations), [organizations]);
};
export const useSelectedOrganization = () => useMasterDataStore((s) => s.selectedOrganizationId ? s.organizations[s.selectedOrganizationId] : null);
export const useOrganizationsByType = (type: Organization['organizationType']) => {
  const organizations = useMasterDataStore((s) => s.organizations);
  return useMemo(() => Object.values(organizations).filter(o => o.organizationType === type), [organizations, type]);
};
export const useActiveOrganizations = () => {
  const organizations = useMasterDataStore((s) => s.organizations);
  return useMemo(() => Object.values(organizations).filter(o => o.status === 'active'), [organizations]);
};
export const useMDMContacts = () => {
  const contacts = useMasterDataStore((s) => s.contacts);
  return useMemo(() => Object.values(contacts), [contacts]);
};
export const useSelectedMDMContact = () => useMasterDataStore((s) => s.selectedContactId ? s.contacts[s.selectedContactId] : null);
export const useContactsByOrganization = (orgId: string) => {
  const contacts = useMasterDataStore((s) => s.contacts);
  return useMemo(() => Object.values(contacts).filter(c => c.organizationId === orgId), [contacts, orgId]);
};
export const useMDMSites = () => {
  const sites = useMasterDataStore((s) => s.sites);
  return useMemo(() => Object.values(sites), [sites]);
};
export const useSelectedMDMSite = () => useMasterDataStore((s) => s.selectedSiteId ? s.sites[s.selectedSiteId] : null);
export const useQualifiedSites = () => {
  const sites = useMasterDataStore((s) => s.sites);
  return useMemo(() => Object.values(sites).filter(site => site.qualificationStatus === 'qualified'), [sites]);
};
export const useSitesByOrganization = (orgId: string) => {
  const sites = useMasterDataStore((s) => s.sites);
  return useMemo(() => Object.values(sites).filter(site => site.organizationId === orgId), [sites, orgId]);
};
export const useMDMProducts = () => {
  const products = useMasterDataStore((s) => s.products);
  return useMemo(() => Object.values(products), [products]);
};
export const useSelectedMDMProduct = () => useMasterDataStore((s) => s.selectedProductId ? s.products[s.selectedProductId] : null);
export const useProductsByPhase = (phase: Product['developmentPhase']) => {
  const products = useMasterDataStore((s) => s.products);
  return useMemo(() => Object.values(products).filter(p => p.developmentPhase === phase), [products, phase]);
};
export const useSubstances = () => {
  const substances = useMasterDataStore((s) => s.substances);
  return useMemo(() => Object.values(substances), [substances]);
};
export const useSelectedSubstance = () => useMasterDataStore((s) => s.selectedSubstanceId ? s.substances[s.selectedSubstanceId] : null);
export const useReferenceSets = () => {
  const referenceSets = useMasterDataStore((s) => s.referenceSets);
  return useMemo(() => Object.values(referenceSets), [referenceSets]);
};
export const useReferenceValues = (dataSetId: string) => {
  const values = useMasterDataStore((s) => s.referenceValues[dataSetId]);
  return values ?? EMPTY_REF_VALUES;
};
export const useMDMPolicies = () => {
  const policies = useMasterDataStore((s) => s.policies);
  return useMemo(() => Object.values(policies), [policies]);
};
export const useActiveMDMPolicies = () => {
  const policies = useMasterDataStore((s) => s.policies);
  return useMemo(() => Object.values(policies).filter(p => p.status === 'active'), [policies]);
};
export const useMDMQualityRules = () => {
  const qualityRules = useMasterDataStore((s) => s.qualityRules);
  return useMemo(() => Object.values(qualityRules), [qualityRules]);
};
export const useMDMQualityScores = () => useMasterDataStore((s) => s.qualityScores);
export const useMDMChangeRequests = () => {
  const changeRequests = useMasterDataStore((s) => s.changeRequests);
  return useMemo(() => Object.values(changeRequests), [changeRequests]);
};
export const useSelectedMDMChangeRequest = () => useMasterDataStore((s) => s.selectedChangeRequestId ? s.changeRequests[s.selectedChangeRequestId] : null);
export const usePendingMDMChangeRequests = () => {
  const changeRequests = useMasterDataStore((s) => s.changeRequests);
  return useMemo(() => Object.values(changeRequests).filter(cr => ['submitted', 'under-review'].includes(cr.status)), [changeRequests]);
};
export const useMatchingProfiles = () => {
  const matchingProfiles = useMasterDataStore((s) => s.matchingProfiles);
  return useMemo(() => Object.values(matchingProfiles), [matchingProfiles]);
};
export const useMatchCandidates = () => {
  const matchCandidates = useMasterDataStore((s) => s.matchCandidates);
  return useMemo(() => Object.values(matchCandidates), [matchCandidates]);
};
export const usePendingMatches = () => {
  const matchCandidates = useMasterDataStore((s) => s.matchCandidates);
  return useMemo(() => Object.values(matchCandidates).filter(mc => mc.status === 'pending-review'), [matchCandidates]);
};
export const useMasterDataLinks = () => {
  const masterDataLinks = useMasterDataStore((s) => s.masterDataLinks);
  return useMemo(() => Object.values(masterDataLinks), [masterDataLinks]);
};
export const useLinksByEntity = (entityId: string) => {
  const linksByEntity = useMasterDataStore((s) => s.linksByEntity);
  const masterDataLinks = useMasterDataStore((s) => s.masterDataLinks);
  return useMemo(() => {
    const ids = linksByEntity[entityId];
    if (!ids || ids.length === 0) return EMPTY_ARRAY as unknown as MasterDataLink[];
    return ids.map(id => masterDataLinks[id]).filter(Boolean);
  }, [linksByEntity, masterDataLinks, entityId]);
};
export const useMDMSyncConflicts = () => {
  const syncConflicts = useMasterDataStore((s) => s.syncConflicts);
  return useMemo(() => Object.values(syncConflicts).filter(c => c.status === 'unresolved'), [syncConflicts]);
};
export const useMasterDataAnalytics = () => useMasterDataStore((s) => s.analytics);
export const useMasterDataFilters = () => useMasterDataStore((s) => s.filters);
export const useMasterDataActiveView = () => useMasterDataStore((s) => s.activeView);
export const useMasterDataLoading = () => useMasterDataStore((s) => s.isLoading);
export const useMasterDataError = () => useMasterDataStore((s) => s.error);
