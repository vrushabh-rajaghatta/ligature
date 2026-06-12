

// ============================================================================
// IDMP Store - ISO 11615/11616/11238 Compliant Data Management (v199)
// Zustand store for IDMP entities with Master Data sync, FHIR generation, SPL rendering
// ============================================================================

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import type {
  IDMPState, IDMPActions, IDMPMedicinalProduct, IDMPPharmaceuticalProduct,
  IDMPSubstance, IDMPPackagedMedicinalProduct, IDMPOrganization,
  IDMPValidationResult, IDMPValidationError, IDMPValidationWarning, IDMPView,
  MarketingAuthorization, TherapeuticIndication, PharmaceuticalIngredient,
  PharmaceuticalDoseForm, RouteOfAdministration, LegalStatusOfSupply,
  DevelopmentStatus, SubstanceType, SubstanceClass, AuthorizationStatus,
  IDMPOrganizationType, OrganizationRole, PackageItem
} from './idmpTypes';

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = () => `idmp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateMpId = (counter: number) => `MPID-${String(counter).padStart(8, '0')}`;
const generatePhpId = (counter: number) => `PhPID-${String(counter).padStart(8, '0')}`;
const generateGsid = (counter: number) => `GSID-${String(counter).padStart(8, '0')}`;
const generateOrgId = (counter: number) => `ORG-IDMP-${String(counter).padStart(6, '0')}`;
const generatePcId = (counter: number) => `PCID-${String(counter).padStart(8, '0')}`;
const now = () => new Date().toISOString();

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: IDMPState = {
  // Core entities
  medicinalProducts: {},
  pharmaceuticalProducts: {},
  substances: {},
  packagedProducts: {},
  organizations: {},
  
  // Lookup indices
  mpByMpId: {},
  phpByPhpId: {},
  substanceByGsid: {},
  orgByOrgId: {},
  
  // Cross-references to Ligature entities
  mpByProductId: {},
  substanceByMasterDataId: {},
  orgByMasterDataId: {},
  
  // UI State
  selectedMedicinalProductId: null,
  selectedSubstanceId: null,
  selectedOrganizationId: null,
  activeView: 'dashboard',
  isLoading: false,
  error: null,
  
  // Validation state
  validationResults: {},
  
  // Sync status
  lastSyncedAt: null,
  syncStatus: 'idle',
};

// ============================================================================
// FHIR R5 RESOURCE GENERATORS
// ============================================================================

interface FHIRMedicinalProductDefinition {
  resourceType: 'MedicinalProductDefinition';
  id: string;
  identifier: { system: string; value: string }[];
  type?: { coding: { system: string; code: string; display: string }[] };
  domain?: { coding: { system: string; code: string; display: string }[] };
  status: { coding: { system: string; code: string }[] };
  statusDate?: string;
  description?: string;
  combinedPharmaceuticalDoseForm?: { coding: { system: string; code: string; display: string }[] };
  route?: { coding: { system: string; code: string; display: string }[] }[];
  indication?: string;
  legalStatusOfSupply?: { coding: { system: string; code: string; display: string }[] };
  additionalMonitoringIndicator?: { coding: { system: string; code: string }[] };
  pediatricUseIndicator?: { coding: { system: string; code: string }[] };
  name: {
    productName: string;
    type?: { coding: { system: string; code: string; display: string }[] };
    part?: { part: string; type: { coding: { system: string; code: string }[] } }[];
  }[];
  crossReference?: { product: { reference: string } }[];
  operation?: { type: { concept: { coding: { system: string; code: string }[] } } }[];
  characteristic?: { type: { coding: { system: string; code: string }[] }; valueCodeableConcept?: { coding: { system: string; code: string }[] } }[];
}

interface FHIRSubstanceDefinition {
  resourceType: 'SubstanceDefinition';
  id: string;
  identifier: { system: string; value: string }[];
  status: { coding: { system: string; code: string }[] };
  classification?: { coding: { system: string; code: string; display: string }[] }[];
  domain?: { coding: { system: string; code: string }[] };
  description?: string;
  name: {
    name: string;
    type?: { coding: { system: string; code: string; display: string }[] };
    status?: { coding: { system: string; code: string }[] };
    preferred?: boolean;
    language?: { coding: { system: string; code: string }[] }[];
    domain?: { coding: { system: string; code: string }[] }[];
  }[];
  molecularWeight?: { amount: { value: number; unit: string } }[];
  structure?: {
    molecularFormula?: string;
    molecularFormulaByMoiety?: string;
    stereochemistry?: { coding: { system: string; code: string }[] };
  };
  code?: { code: { coding: { system: string; code: string }[] } }[];
}

interface FHIROrganization {
  resourceType: 'Organization';
  id: string;
  identifier: { system: string; value: string }[];
  active: boolean;
  type?: { coding: { system: string; code: string; display: string }[] }[];
  name: string;
  alias?: string[];
  telecom?: { system: string; value: string; use: string }[];
  address?: {
    use: string;
    type: string;
    line: string[];
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  }[];
  contact?: { purpose: { coding: { system: string; code: string }[] }; name?: { text: string } }[];
}

function generateFHIRMedicinalProduct(mp: IDMPMedicinalProduct): FHIRMedicinalProductDefinition {
  const resource: FHIRMedicinalProductDefinition = {
    resourceType: 'MedicinalProductDefinition',
    id: mp.id,
    identifier: [
      { system: 'http://hl7.org/fhir/sid/mpid', value: mp.mpId },
    ],
    status: {
      coding: [{
        system: 'http://hl7.org/fhir/publication-status',
        code: mp.developmentStatus === 'approved' || mp.developmentStatus === 'marketed' ? 'active' : 'draft'
      }]
    },
    description: mp.fullName,
    combinedPharmaceuticalDoseForm: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: mapDoseFormToSNOMED(mp.combinedPharmaceuticalDoseForm),
        display: mp.combinedPharmaceuticalDoseForm
      }]
    },
    legalStatusOfSupply: {
      coding: [{
        system: 'http://hl7.org/fhir/legal-status-of-supply',
        code: mp.legalStatusOfSupply,
        display: mp.legalStatusOfSupply.replace(/-/g, ' ')
      }]
    },
    name: [
      {
        productName: mp.fullName,
        type: {
          coding: [{
            system: 'http://hl7.org/fhir/medicinal-product-name-type',
            code: 'full',
            display: 'Full Name'
          }]
        }
      }
    ]
  };

  // Add invented name if different
  if (mp.inventedName && mp.inventedName !== mp.fullName) {
    resource.name.push({
      productName: mp.inventedName,
      type: {
        coding: [{
          system: 'http://hl7.org/fhir/medicinal-product-name-type',
          code: 'invented',
          display: 'Invented Name'
        }]
      }
    });
  }

  // Add scientific name if available
  if (mp.scientificName) {
    resource.name.push({
      productName: mp.scientificName,
      type: {
        coding: [{
          system: 'http://hl7.org/fhir/medicinal-product-name-type',
          code: 'scientific',
          display: 'Scientific Name'
        }]
      }
    });
  }

  // Add pediatric indicator
  if (mp.pediatricUseIndicator) {
    resource.pediatricUseIndicator = {
      coding: [{ system: 'http://hl7.org/fhir/medicinal-product-pediatric-use', code: 'true' }]
    };
  }

  // Add additional monitoring indicator
  if (mp.additionalMonitoringIndicator) {
    resource.additionalMonitoringIndicator = {
      coding: [{ system: 'http://hl7.org/fhir/medicinal-product-additional-monitoring', code: 'true' }]
    };
  }

  return resource;
}

function generateFHIRSubstance(substance: IDMPSubstance): FHIRSubstanceDefinition {
  const resource: FHIRSubstanceDefinition = {
    resourceType: 'SubstanceDefinition',
    id: substance.id,
    identifier: [
      { system: 'http://hl7.org/fhir/sid/gsid', value: substance.substanceId }
    ],
    status: {
      coding: [{
        system: 'http://hl7.org/fhir/publication-status',
        code: 'active'
      }]
    },
    name: [
      {
        name: substance.preferredName,
        type: {
          coding: [{
            system: 'http://hl7.org/fhir/substance-name-type',
            code: 'preferred',
            display: 'Preferred Name'
          }]
        },
        preferred: true
      }
    ]
  };

  // Add INN name
  if (substance.innName) {
    resource.name.push({
      name: substance.innName,
      type: {
        coding: [{
          system: 'http://hl7.org/fhir/substance-name-type',
          code: 'inn',
          display: 'International Nonproprietary Name'
        }]
      }
    });
  }

  // Add USAN
  if (substance.usan) {
    resource.name.push({
      name: substance.usan,
      type: {
        coding: [{
          system: 'http://hl7.org/fhir/substance-name-type',
          code: 'usan',
          display: 'United States Adopted Name'
        }]
      }
    });
  }

  // Add classification
  if (substance.substanceClass.length > 0) {
    resource.classification = substance.substanceClass.map(cls => ({
      coding: [{
        system: 'http://hl7.org/fhir/substance-class',
        code: cls,
        display: cls.replace(/-/g, ' ')
      }]
    }));
  }

  // Add molecular weight
  if (substance.molecularWeight) {
    resource.molecularWeight = [{
      amount: {
        value: substance.molecularWeight,
        unit: 'g/mol'
      }
    }];
  }

  // Add structure
  if (substance.molecularFormula || substance.smilesNotation) {
    resource.structure = {};
    if (substance.molecularFormula) {
      resource.structure.molecularFormula = substance.molecularFormula;
    }
  }

  // Add codes (UNII, CAS, InChIKey)
  resource.code = [];
  if (substance.unii) {
    resource.code.push({
      code: { coding: [{ system: 'http://fdasis.nlm.nih.gov', code: substance.unii }] }
    });
  }
  if (substance.casNumber) {
    resource.code.push({
      code: { coding: [{ system: 'http://hl7.org/fhir/sid/cas', code: substance.casNumber }] }
    });
  }
  if (substance.inchiKey) {
    resource.code.push({
      code: { coding: [{ system: 'http://hl7.org/fhir/sid/inchi', code: substance.inchiKey }] }
    });
  }

  return resource;
}

function generateFHIROrganization(org: IDMPOrganization): FHIROrganization {
  const resource: FHIROrganization = {
    resourceType: 'Organization',
    id: org.id,
    identifier: [
      { system: 'http://hl7.org/fhir/sid/idmp-org', value: org.orgId }
    ],
    active: true,
    name: org.name,
    address: [{
      use: 'work',
      type: 'physical',
      line: org.address.streetAddress,
      city: org.address.city,
      state: org.address.stateProvince,
      postalCode: org.address.postalCode,
      country: org.address.countryCode
    }]
  };

  // Add DUNS number
  if (org.dunsNumber) {
    resource.identifier.push({ system: 'http://hl7.org/fhir/sid/duns', value: org.dunsNumber });
  }

  // Add FEI number
  if (org.feiNumber) {
    resource.identifier.push({ system: 'http://hl7.org/fhir/sid/fei', value: org.feiNumber });
  }

  // Add alias (legal name if different)
  if (org.legalName !== org.name) {
    resource.alias = [org.legalName];
  }

  // Add organization type
  resource.type = [{
    coding: [{
      system: 'http://hl7.org/fhir/organization-type',
      code: org.organizationType,
      display: org.organizationType.replace(/-/g, ' ')
    }]
  }];

  // Add telecom
  if (org.contactPoint) {
    resource.telecom = [];
    if (org.contactPoint.telephone) {
      resource.telecom.push({ system: 'phone', value: org.contactPoint.telephone, use: 'work' });
    }
    if (org.contactPoint.email) {
      resource.telecom.push({ system: 'email', value: org.contactPoint.email, use: 'work' });
    }
    if (org.contactPoint.website) {
      resource.telecom.push({ system: 'url', value: org.contactPoint.website, use: 'work' });
    }
  }

  return resource;
}

function mapDoseFormToSNOMED(doseForm: PharmaceuticalDoseForm): string {
  const mappings: Record<PharmaceuticalDoseForm, string> = {
    'tablet': '385055001',
    'capsule': '385049006',
    'solution': '385219001',
    'suspension': '385220007',
    'powder': '385201005',
    'injection': '385219001',
    'infusion': '385229008',
    'cream': '385099005',
    'ointment': '385101003',
    'gel': '385100002',
    'patch': '385114002',
    'inhaler': '385207006',
    'spray': '385194003',
    'drops': '385018003',
    'suppository': '385194003',
    'implant': '385286003',
    'film': '385111005',
    'lozenge': '385087003',
    'granules': '385043007',
    'other': '385049006'
  };
  return mappings[doseForm] || '385049006';
}

// ============================================================================
// SPL XML GENERATOR
// ============================================================================

function generateSPLXML(mp: IDMPMedicinalProduct, substances: Record<string, IDMPSubstance>, organizations: Record<string, IDMPOrganization>): string {
  const mah = mp.marketingAuthorizationHolder;
  const effectiveTime = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  const ingredientXML = mp.pharmaceuticalProducts
    .flatMap(php => {
      const phpData = mp.pharmaceuticalProducts.find(p => p === php);
      if (!phpData) return [];
      return (phpData as unknown as { ingredients?: PharmaceuticalIngredient[] }).ingredients?.map((ing: PharmaceuticalIngredient) => {
        const substance = substances[ing.substanceId];
        return `
      <ingredient classCode="${ing.ingredientRole === 'active' ? 'ACTIB' : 'IACT'}">
        <ingredientSubstance>
          <code code="${substance?.unii || 'UNKNOWN'}" codeSystem="2.16.840.1.113883.4.9" displayName="${ing.substanceName}"/>
          <name>${ing.substanceName}</name>
          ${ing.presentationStrength ? `
          <quantity>
            <numerator value="${ing.presentationStrength.value}" unit="${ing.presentationStrength.unit}"/>
            <denominator value="1" unit="1"/>
          </quantity>` : ''}
        </ingredientSubstance>
      </ingredient>`;
      }) || [];
    })
    .join('\n');

  const indicationsXML = mp.therapeuticIndications
    .map(ind => `
      <indication>
        <indicationText>${escapeXML(ind.indication)}</indicationText>
        ${ind.indicationCode ? `<indicationCode code="${ind.indicationCode}" codeSystem="${ind.codingSystem === 'meddra' ? '2.16.840.1.113883.6.163' : '2.16.840.1.113883.6.3'}"/>` : ''}
      </indication>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="spl.xsl"?>
<document xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <id root="${mp.id}"/>
  <code code="34391-3" codeSystem="2.16.840.1.113883.6.1" displayName="HUMAN PRESCRIPTION DRUG LABEL"/>
  <title>${escapeXML(mp.fullName)}</title>
  <effectiveTime value="${effectiveTime}"/>
  
  <setId root="${mp.mpId}"/>
  <versionNumber value="${mp.version}"/>
  
  <author>
    <time/>
    <assignedEntity>
      <representedOrganization>
        <id extension="${mah.dunsNumber || ''}" root="1.3.6.1.4.1.519.1"/>
        <name>${escapeXML(mah.name)}</name>
        <assignedEntity>
          <assignedOrganization>
            <name>${escapeXML(mah.legalName)}</name>
            <addr>
              <streetAddressLine>${escapeXML(mah.address.streetAddress.join(', '))}</streetAddressLine>
              <city>${escapeXML(mah.address.city)}</city>
              ${mah.address.stateProvince ? `<state>${mah.address.stateProvince}</state>` : ''}
              <postalCode>${mah.address.postalCode}</postalCode>
              <country>${mah.address.countryCode}</country>
            </addr>
          </assignedOrganization>
        </assignedEntity>
      </representedOrganization>
    </assignedEntity>
  </author>
  
  <component>
    <structuredBody>
      <component>
        <section>
          <id root="${generateId()}"/>
          <code code="48780-1" codeSystem="2.16.840.1.113883.6.1" displayName="SPL PRODUCT DATA ELEMENTS SECTION"/>
          <effectiveTime value="${effectiveTime}"/>
          
          <subject>
            <manufacturedProduct>
              <manufacturedProduct>
                <code code="${mp.mpId}" codeSystem="2.16.840.1.113883.6.69"/>
                <name>${escapeXML(mp.inventedName)}</name>
                <formCode code="${mapDoseFormToSPL(mp.combinedPharmaceuticalDoseForm)}" 
                          codeSystem="2.16.840.1.113883.3.26.1.1" 
                          displayName="${mp.combinedPharmaceuticalDoseForm}"/>
                ${mp.pharmaceuticalProducts[0] ? `
                <asEntityWithGeneric>
                  <genericMedicine>
                    <name>${escapeXML(mp.scientificName || mp.fullName)}</name>
                  </genericMedicine>
                </asEntityWithGeneric>` : ''}
              </manufacturedProduct>
              
              <subjectOf>
                <approval>
                  <id extension="${mp.authorizations[0]?.maNumber || ''}" root="2.16.840.1.113883.3.150"/>
                  <code code="${mapAuthorizationTypeToSPL(mp.authorizations[0]?.authorizationType)}" 
                        codeSystem="2.16.840.1.113883.3.26.1.1" 
                        displayName="${mp.authorizations[0]?.authorizationType || 'NDA'}"/>
                  <author>
                    <territorialAuthority>
                      <territory>
                        <code code="${mp.authorizations[0]?.countryCode || 'US'}" 
                              codeSystem="1.0.3166.1.2.2"/>
                      </territory>
                    </territorialAuthority>
                  </author>
                </approval>
              </subjectOf>
              
              ${ingredientXML}
            </manufacturedProduct>
          </subject>
          
          ${indicationsXML}
          
        </section>
      </component>
    </structuredBody>
  </component>
</document>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mapDoseFormToSPL(doseForm: PharmaceuticalDoseForm): string {
  const mappings: Record<PharmaceuticalDoseForm, string> = {
    'tablet': 'C42998',
    'capsule': 'C25158',
    'solution': 'C42986',
    'suspension': 'C42993',
    'powder': 'C42957',
    'injection': 'C42945',
    'infusion': 'C42942',
    'cream': 'C28944',
    'ointment': 'C42966',
    'gel': 'C42934',
    'patch': 'C42968',
    'inhaler': 'C42944',
    'spray': 'C42988',
    'drops': 'C42903',
    'suppository': 'C42994',
    'implant': 'C42940',
    'film': 'C42931',
    'lozenge': 'C42949',
    'granules': 'C42938',
    'other': 'C42998'
  };
  return mappings[doseForm] || 'C42998';
}

function mapAuthorizationTypeToSPL(authType?: string): string {
  const mappings: Record<string, string> = {
    'full': 'C73584',
    'conditional': 'C73585',
    'exceptional': 'C73586',
    'accelerated': 'C73587',
    'priority': 'C73588',
    'breakthrough': 'C73589',
    'orphan': 'C73590',
    'pediatric': 'C73591'
  };
  return mappings[authType || ''] || 'C73584';
}

// ============================================================================
// MASTER DATA SYNC UTILITIES
// ============================================================================

interface MasterDataProduct {
  id: string;
  productId: string;
  productName: string;
  genericName?: string;
  proprietaryName?: string;
  productType: string;
  productCategory: string;
  activeSubstances: { substanceId: string; substanceName: string; strength?: string; strengthUnit?: string }[];
  dosageForm?: string;
  routeOfAdministration: string[];
  developmentPhase: string;
  regulatoryStatus: { region: string; status: string; approvalNumber?: string; approvalDate?: string }[];
  approvedIndications: { indicationName: string; regions: string[] }[];
  manufacturerIds: string[];
}

interface MasterDataSubstance {
  id: string;
  substanceId: string;
  preferredName: string;
  substanceClass: string;
  molecularFormula?: string;
  molecularWeight?: number;
  casNumber?: string;
  uniiCode?: string;
  innName?: string;
  usanName?: string;
}

interface MasterDataOrganization {
  id: string;
  organizationId: string;
  name: string;
  legalName: string;
  organizationType: string;
  dunsNumber?: string;
  fdaEstablishmentId?: string;
  headquarters: {
    line1: string;
    line2?: string;
    city: string;
    stateProvince?: string;
    postalCode?: string;
    countryCode: string;
    countryName: string;
  };
  primaryPhone?: string;
  primaryEmail?: string;
  website?: string;
}

function mapMasterDataProductToIDMP(
  mdProduct: MasterDataProduct,
  existingMp?: IDMPMedicinalProduct
): Partial<IDMPMedicinalProduct> {
  return {
    fullName: mdProduct.productName + (mdProduct.genericName ? ` (${mdProduct.genericName})` : ''),
    inventedName: mdProduct.proprietaryName || mdProduct.productName,
    scientificName: mdProduct.genericName,
    combinedPharmaceuticalDoseForm: mapMasterDataDoseForm(mdProduct.dosageForm),
    developmentStatus: mapMasterDataPhaseToIDMP(mdProduct.developmentPhase),
    therapeuticIndications: mdProduct.approvedIndications.map((ind, idx) => ({
      id: existingMp?.therapeuticIndications[idx]?.id || generateId(),
      indication: ind.indicationName,
      approvalStatus: 'approved' as const,
      countryCode: ind.regions[0]
    })),
    linkedProductId: mdProduct.id,
    updatedAt: now()
  };
}

function mapMasterDataSubstanceToIDMP(
  mdSubstance: MasterDataSubstance,
  existingSubstance?: IDMPSubstance
): Partial<IDMPSubstance> {
  return {
    preferredName: mdSubstance.preferredName,
    substanceType: 'chemical',
    innName: mdSubstance.innName,
    usan: mdSubstance.usanName,
    casNumber: mdSubstance.casNumber,
    unii: mdSubstance.uniiCode,
    molecularFormula: mdSubstance.molecularFormula,
    molecularWeight: mdSubstance.molecularWeight,
    substanceClass: [mapMasterDataSubstanceClass(mdSubstance.substanceClass)],
    linkedSubstanceId: mdSubstance.id,
    updatedAt: now()
  };
}

function mapMasterDataOrganizationToIDMP(
  mdOrg: MasterDataOrganization,
  existingOrg?: IDMPOrganization
): Partial<IDMPOrganization> {
  return {
    name: mdOrg.name,
    legalName: mdOrg.legalName,
    organizationType: mapMasterDataOrgType(mdOrg.organizationType),
    dunsNumber: mdOrg.dunsNumber,
    feiNumber: mdOrg.fdaEstablishmentId,
    address: {
      streetAddress: [mdOrg.headquarters.line1, mdOrg.headquarters.line2].filter(Boolean) as string[],
      city: mdOrg.headquarters.city,
      stateProvince: mdOrg.headquarters.stateProvince,
      postalCode: mdOrg.headquarters.postalCode || '',
      countryCode: mdOrg.headquarters.countryCode,
      countryName: mdOrg.headquarters.countryName
    },
    contactPoint: {
      telephone: mdOrg.primaryPhone,
      email: mdOrg.primaryEmail,
      website: mdOrg.website
    },
    linkedOrganizationId: mdOrg.id,
    updatedAt: now()
  };
}

function mapMasterDataDoseForm(doseForm?: string): PharmaceuticalDoseForm {
  if (!doseForm) return 'other';
  const lower = doseForm.toLowerCase();
  const forms: PharmaceuticalDoseForm[] = [
    'tablet', 'capsule', 'solution', 'suspension', 'powder', 'injection',
    'infusion', 'cream', 'ointment', 'gel', 'patch', 'inhaler', 'spray',
    'drops', 'suppository', 'implant', 'film', 'lozenge', 'granules'
  ];
  return forms.find(f => lower.includes(f)) || 'other';
}

function mapMasterDataPhaseToIDMP(phase: string): DevelopmentStatus {
  const mapping: Record<string, DevelopmentStatus> = {
    'discovery': 'discovery',
    'preclinical': 'preclinical',
    'phase-1': 'phase-1',
    'phase-2': 'phase-2',
    'phase-3': 'phase-3',
    'registration': 'filed',
    'approved': 'approved',
    'post-marketing': 'marketed',
    'discontinued': 'discontinued'
  };
  return mapping[phase] || 'discovery';
}

function mapMasterDataSubstanceClass(substanceClass: string): SubstanceClass {
  const mapping: Record<string, SubstanceClass> = {
    'small-molecule': 'small-molecule',
    'protein': 'monoclonal-antibody',
    'peptide': 'peptide',
    'antibody': 'monoclonal-antibody',
    'enzyme': 'enzyme',
    'vaccine-antigen': 'vaccine',
    'cell-based': 'cell-therapy',
    'gene-based': 'gene-therapy'
  };
  return mapping[substanceClass] || 'small-molecule';
}

function mapMasterDataOrgType(orgType: string): IDMPOrganizationType {
  const mapping: Record<string, IDMPOrganizationType> = {
    'sponsor': 'sponsor',
    'cro': 'cro',
    'vendor': 'cmo',
    'laboratory': 'laboratory',
    'manufacturing-site': 'manufacturer',
    'regulatory-authority': 'regulatory-authority'
  };
  return mapping[orgType] || 'other';
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

function validateMedicinalProduct(mp: IDMPMedicinalProduct): IDMPValidationResult {
  const errors: IDMPValidationError[] = [];
  const warnings: IDMPValidationWarning[] = [];

  // Required field validations
  if (!mp.fullName || mp.fullName.trim() === '') {
    errors.push({ field: 'fullName', code: 'REQUIRED', message: 'Full name is required', severity: 'error' });
  }
  if (!mp.inventedName || mp.inventedName.trim() === '') {
    errors.push({ field: 'inventedName', code: 'REQUIRED', message: 'Invented name is required', severity: 'error' });
  }
  if (!mp.mpId || mp.mpId.trim() === '') {
    errors.push({ field: 'mpId', code: 'REQUIRED', message: 'Medicinal Product ID is required', severity: 'error' });
  }

  // Business rule validations
  if (mp.authorizations.length === 0 && (mp.developmentStatus === 'approved' || mp.developmentStatus === 'marketed')) {
    errors.push({ field: 'authorizations', code: 'BUSINESS_RULE', message: 'Approved products must have at least one authorization', severity: 'error' });
  }

  if (mp.therapeuticIndications.length === 0 && mp.developmentStatus !== 'discovery' && mp.developmentStatus !== 'preclinical') {
    warnings.push({ field: 'therapeuticIndications', code: 'COMPLETENESS', message: 'No therapeutic indications defined', severity: 'warning' });
  }

  if (mp.pharmaceuticalProducts.length === 0) {
    warnings.push({ field: 'pharmaceuticalProducts', code: 'COMPLETENESS', message: 'No pharmaceutical products linked', severity: 'warning' });
  }

  // MAH validation
  if (!mp.marketingAuthorizationHolder?.name) {
    errors.push({ field: 'marketingAuthorizationHolder', code: 'REQUIRED', message: 'Marketing Authorization Holder is required', severity: 'error' });
  }

  return {
    entityId: mp.id,
    entityType: 'medicinal-product',
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedAt: now()
  };
}

function validateSubstance(substance: IDMPSubstance): IDMPValidationResult {
  const errors: IDMPValidationError[] = [];
  const warnings: IDMPValidationWarning[] = [];

  if (!substance.preferredName || substance.preferredName.trim() === '') {
    errors.push({ field: 'preferredName', code: 'REQUIRED', message: 'Preferred name is required', severity: 'error' });
  }
  if (!substance.substanceId || substance.substanceId.trim() === '') {
    errors.push({ field: 'substanceId', code: 'REQUIRED', message: 'Substance ID is required', severity: 'error' });
  }

  // Identifier recommendations
  if (!substance.unii) {
    warnings.push({ field: 'unii', code: 'RECOMMENDED', message: 'UNII code recommended for regulatory submissions', severity: 'warning' });
  }
  if (!substance.casNumber) {
    warnings.push({ field: 'casNumber', code: 'RECOMMENDED', message: 'CAS number recommended for identification', severity: 'warning' });
  }

  // Chemical-specific validations
  if (substance.substanceType === 'chemical' && !substance.molecularFormula) {
    warnings.push({ field: 'molecularFormula', code: 'COMPLETENESS', message: 'Molecular formula recommended for chemical substances', severity: 'warning' });
  }

  return {
    entityId: substance.id,
    entityType: 'substance',
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedAt: now()
  };
}

function validateOrganization(org: IDMPOrganization): IDMPValidationResult {
  const errors: IDMPValidationError[] = [];
  const warnings: IDMPValidationWarning[] = [];

  if (!org.name || org.name.trim() === '') {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'Organization name is required', severity: 'error' });
  }
  if (!org.legalName || org.legalName.trim() === '') {
    errors.push({ field: 'legalName', code: 'REQUIRED', message: 'Legal name is required', severity: 'error' });
  }

  // Address validation
  if (!org.address?.city || !org.address?.countryCode) {
    errors.push({ field: 'address', code: 'REQUIRED', message: 'Complete address with city and country is required', severity: 'error' });
  }

  // Identifier recommendations
  if (!org.dunsNumber) {
    warnings.push({ field: 'dunsNumber', code: 'RECOMMENDED', message: 'DUNS number recommended for regulatory submissions', severity: 'warning' });
  }

  // MAH-specific validation
  if (org.roles.includes('marketing-authorization-holder') && !org.feiNumber) {
    warnings.push({ field: 'feiNumber', code: 'RECOMMENDED', message: 'FEI number recommended for MAH organizations', severity: 'warning' });
  }

  return {
    entityId: org.id,
    entityType: 'organization',
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedAt: now()
  };
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useIDMPStore = create<IDMPState & IDMPActions>((set, get) => ({
  ...initialState,

  // =========================================================================
  // MEDICINAL PRODUCT CRUD
  // =========================================================================
  
  createMedicinalProduct: (data) => {
    const id = generateId();
    const mpId = data.mpId || generateMpId(Object.keys(get().medicinalProducts).length + 1);
    
    const mp: IDMPMedicinalProduct = {
      id,
      mpId,
      fullName: data.fullName || 'New Medicinal Product',
      inventedName: data.inventedName || 'New Product',
      scientificName: data.scientificName,
      combinedPharmaceuticalDoseForm: data.combinedPharmaceuticalDoseForm || 'tablet',
      legalStatusOfSupply: data.legalStatusOfSupply || 'prescription-only',
      additionalMonitoringIndicator: data.additionalMonitoringIndicator ?? false,
      orphanDrugDesignation: data.orphanDrugDesignation ?? false,
      pediatricUseIndicator: data.pediatricUseIndicator ?? false,
      authorizations: data.authorizations || [],
      marketingAuthorizationHolder: data.marketingAuthorizationHolder || {
        id: generateId(),
        orgId: '',
        name: 'Unknown MAH',
        legalName: 'Unknown MAH',
        organizationType: 'mah',
        address: { streetAddress: [], city: '', postalCode: '', countryCode: 'US', countryName: 'United States' },
        affiliatedOrganizations: [],
        roles: ['marketing-authorization-holder'],
        createdAt: now(),
        updatedAt: now()
      },
      pharmaceuticalProducts: data.pharmaceuticalProducts || [],
      packagedMedicinalProducts: data.packagedMedicinalProducts || [],
      therapeuticIndications: data.therapeuticIndications || [],
      contraindications: data.contraindications || [],
      developmentStatus: data.developmentStatus || 'discovery',
      firstAuthorizationDate: data.firstAuthorizationDate,
      linkedProductId: data.linkedProductId,
      linkedSubmissionIds: data.linkedSubmissionIds || [],
      linkedDocumentIds: data.linkedDocumentIds || [],
      createdAt: now(),
      createdBy: data.createdBy || 'system',
      updatedAt: now(),
      version: 1
    };

    set((state) => ({
      medicinalProducts: { ...state.medicinalProducts, [id]: mp },
      mpByMpId: { ...state.mpByMpId, [mpId]: id },
      ...(mp.linkedProductId ? {
        mpByProductId: {
          ...state.mpByProductId,
          [mp.linkedProductId]: [...(state.mpByProductId[mp.linkedProductId] || []), id]
        }
      } : {})
    }));

    return mp;
  },

  updateMedicinalProduct: (id, updates) => {
    const mp = get().medicinalProducts[id];
    if (!mp) return;

    const updated = { ...mp, ...updates, updatedAt: now(), version: mp.version + 1 };
    set((state) => ({
      medicinalProducts: { ...state.medicinalProducts, [id]: updated }
    }));
  },

  deleteMedicinalProduct: (id) => {
    const mp = get().medicinalProducts[id];
    if (!mp) return;

    set((state) => {
      const { [id]: _, ...remainingProducts } = state.medicinalProducts;
      const { [mp.mpId]: __, ...remainingMpIds } = state.mpByMpId;
      const { [id]: ___, ...remainingValidations } = state.validationResults;
      
      // Clean up product links
      const newMpByProductId = { ...state.mpByProductId };
      if (mp.linkedProductId && newMpByProductId[mp.linkedProductId]) {
        newMpByProductId[mp.linkedProductId] = newMpByProductId[mp.linkedProductId].filter(mpId => mpId !== id);
      }

      return {
        medicinalProducts: remainingProducts,
        mpByMpId: remainingMpIds,
        mpByProductId: newMpByProductId,
        validationResults: remainingValidations,
        selectedMedicinalProductId: state.selectedMedicinalProductId === id ? null : state.selectedMedicinalProductId
      };
    });
  },

  // =========================================================================
  // PHARMACEUTICAL PRODUCT CRUD
  // =========================================================================
  
  createPharmaceuticalProduct: (data) => {
    const id = generateId();
    const phpId = data.phpId || generatePhpId(Object.keys(get().pharmaceuticalProducts).length + 1);

    const php: IDMPPharmaceuticalProduct = {
      id,
      phpId,
      administrableDoseForm: data.administrableDoseForm || 'tablet',
      unitOfPresentation: data.unitOfPresentation || 'tablet',
      routeOfAdministration: data.routeOfAdministration || ['oral'],
      ingredients: data.ingredients || [],
      medicinalProductId: data.medicinalProductId || '',
      characteristics: data.characteristics || [],
      createdAt: now(),
      updatedAt: now()
    };

    set((state) => ({
      pharmaceuticalProducts: { ...state.pharmaceuticalProducts, [id]: php },
      phpByPhpId: { ...state.phpByPhpId, [phpId]: id }
    }));

    return php;
  },

  updatePharmaceuticalProduct: (id, updates) => {
    const php = get().pharmaceuticalProducts[id];
    if (!php) return;

    set((state) => ({
      pharmaceuticalProducts: {
        ...state.pharmaceuticalProducts,
        [id]: { ...php, ...updates, updatedAt: now() }
      }
    }));
  },

  deletePharmaceuticalProduct: (id) => {
    const php = get().pharmaceuticalProducts[id];
    if (!php) return;

    set((state) => {
      const { [id]: _, ...remaining } = state.pharmaceuticalProducts;
      const { [php.phpId]: __, ...remainingIds } = state.phpByPhpId;
      return { pharmaceuticalProducts: remaining, phpByPhpId: remainingIds };
    });
  },

  // =========================================================================
  // SUBSTANCE CRUD
  // =========================================================================
  
  createSubstance: (data) => {
    const id = generateId();
    const substanceId = data.substanceId || generateGsid(Object.keys(get().substances).length + 1);

    const substance: IDMPSubstance = {
      id,
      substanceId,
      preferredName: data.preferredName || 'New Substance',
      substanceType: data.substanceType || 'chemical',
      innName: data.innName,
      usan: data.usan,
      casNumber: data.casNumber,
      unii: data.unii,
      inchiKey: data.inchiKey,
      substanceClass: data.substanceClass || ['small-molecule'],
      pharmacologicClass: data.pharmacologicClass,
      molecularFormula: data.molecularFormula,
      molecularWeight: data.molecularWeight,
      smilesNotation: data.smilesNotation,
      proteinSequence: data.proteinSequence,
      glycosylationPattern: data.glycosylationPattern,
      parentSubstanceId: data.parentSubstanceId,
      saltForms: data.saltForms || [],
      metabolites: data.metabolites || [],
      scheduledSubstance: data.scheduledSubstance ?? false,
      controlledSubstanceSchedule: data.controlledSubstanceSchedule,
      linkedSubstanceId: data.linkedSubstanceId,
      createdAt: now(),
      updatedAt: now()
    };

    set((state) => ({
      substances: { ...state.substances, [id]: substance },
      substanceByGsid: { ...state.substanceByGsid, [substanceId]: id },
      ...(substance.linkedSubstanceId ? {
        substanceByMasterDataId: {
          ...state.substanceByMasterDataId,
          [substance.linkedSubstanceId]: id
        }
      } : {})
    }));

    return substance;
  },

  updateSubstance: (id, updates) => {
    const substance = get().substances[id];
    if (!substance) return;

    set((state) => ({
      substances: {
        ...state.substances,
        [id]: { ...substance, ...updates, updatedAt: now() }
      }
    }));
  },

  deleteSubstance: (id) => {
    const substance = get().substances[id];
    if (!substance) return;

    set((state) => {
      const { [id]: _, ...remaining } = state.substances;
      const { [substance.substanceId]: __, ...remainingIds } = state.substanceByGsid;
      const { [id]: ___, ...remainingValidations } = state.validationResults;
      
      const newSubstanceByMasterDataId = { ...state.substanceByMasterDataId };
      if (substance.linkedSubstanceId) {
        delete newSubstanceByMasterDataId[substance.linkedSubstanceId];
      }

      return {
        substances: remaining,
        substanceByGsid: remainingIds,
        substanceByMasterDataId: newSubstanceByMasterDataId,
        validationResults: remainingValidations,
        selectedSubstanceId: state.selectedSubstanceId === id ? null : state.selectedSubstanceId
      };
    });
  },

  // =========================================================================
  // ORGANIZATION CRUD
  // =========================================================================
  
  createOrganization: (data) => {
    const id = generateId();
    const orgId = data.orgId || generateOrgId(Object.keys(get().organizations).length + 1);

    const org: IDMPOrganization = {
      id,
      orgId,
      name: data.name || 'New Organization',
      legalName: data.legalName || data.name || 'New Organization',
      organizationType: data.organizationType || 'other',
      dunsNumber: data.dunsNumber,
      feiNumber: data.feiNumber,
      eudraVigilanceId: data.eudraVigilanceId,
      healthCanadaCompanyId: data.healthCanadaCompanyId,
      pmdaNumber: data.pmdaNumber,
      address: data.address || {
        streetAddress: [],
        city: '',
        postalCode: '',
        countryCode: 'US',
        countryName: 'United States'
      },
      contactPoint: data.contactPoint,
      parentOrganizationId: data.parentOrganizationId,
      affiliatedOrganizations: data.affiliatedOrganizations || [],
      roles: data.roles || [],
      linkedOrganizationId: data.linkedOrganizationId,
      createdAt: now(),
      updatedAt: now()
    };

    set((state) => ({
      organizations: { ...state.organizations, [id]: org },
      orgByOrgId: { ...state.orgByOrgId, [orgId]: id },
      ...(org.linkedOrganizationId ? {
        orgByMasterDataId: {
          ...state.orgByMasterDataId,
          [org.linkedOrganizationId]: id
        }
      } : {})
    }));

    return org;
  },

  updateOrganization: (id, updates) => {
    const org = get().organizations[id];
    if (!org) return;

    set((state) => ({
      organizations: {
        ...state.organizations,
        [id]: { ...org, ...updates, updatedAt: now() }
      }
    }));
  },

  deleteOrganization: (id) => {
    const org = get().organizations[id];
    if (!org) return;

    set((state) => {
      const { [id]: _, ...remaining } = state.organizations;
      const { [org.orgId]: __, ...remainingIds } = state.orgByOrgId;
      const { [id]: ___, ...remainingValidations } = state.validationResults;

      const newOrgByMasterDataId = { ...state.orgByMasterDataId };
      if (org.linkedOrganizationId) {
        delete newOrgByMasterDataId[org.linkedOrganizationId];
      }

      return {
        organizations: remaining,
        orgByOrgId: remainingIds,
        orgByMasterDataId: newOrgByMasterDataId,
        validationResults: remainingValidations,
        selectedOrganizationId: state.selectedOrganizationId === id ? null : state.selectedOrganizationId
      };
    });
  },

  // =========================================================================
  // PACKAGED PRODUCT CRUD
  // =========================================================================
  
  createPackagedProduct: (data) => {
    const id = generateId();
    const pcId = data.pcId || generatePcId(Object.keys(get().packagedProducts).length + 1);

    const pkg: IDMPPackagedMedicinalProduct = {
      id,
      pcId,
      packageDescription: data.packageDescription || 'New Package',
      marketingStatus: data.marketingStatus || 'authorized-not-marketed',
      packaging: data.packaging || [],
      medicinalProductId: data.medicinalProductId || '',
      marketingAuthorizationId: data.marketingAuthorizationId || '',
      countryCode: data.countryCode || 'US',
      createdAt: now(),
      updatedAt: now()
    };

    set((state) => ({
      packagedProducts: { ...state.packagedProducts, [id]: pkg }
    }));

    return pkg;
  },

  updatePackagedProduct: (id, updates) => {
    const pkg = get().packagedProducts[id];
    if (!pkg) return;

    set((state) => ({
      packagedProducts: {
        ...state.packagedProducts,
        [id]: { ...pkg, ...updates, updatedAt: now() }
      }
    }));
  },

  deletePackagedProduct: (id) => {
    set((state) => {
      const { [id]: _, ...remaining } = state.packagedProducts;
      return { packagedProducts: remaining };
    });
  },

  // =========================================================================
  // CROSS-REFERENCING
  // =========================================================================
  
  linkToLigatureProduct: (mpId, productId) => {
    const mp = get().medicinalProducts[mpId];
    if (!mp) return;

    set((state) => ({
      medicinalProducts: {
        ...state.medicinalProducts,
        [mpId]: { ...mp, linkedProductId: productId, updatedAt: now() }
      },
      mpByProductId: {
        ...state.mpByProductId,
        [productId]: [...(state.mpByProductId[productId] || []), mpId]
      }
    }));
  },

  linkToMasterDataSubstance: (idmpSubstanceId, masterDataSubstanceId) => {
    const substance = get().substances[idmpSubstanceId];
    if (!substance) return;

    set((state) => ({
      substances: {
        ...state.substances,
        [idmpSubstanceId]: { ...substance, linkedSubstanceId: masterDataSubstanceId, updatedAt: now() }
      },
      substanceByMasterDataId: {
        ...state.substanceByMasterDataId,
        [masterDataSubstanceId]: idmpSubstanceId
      }
    }));
  },

  linkToMasterDataOrganization: (idmpOrgId, masterDataOrgId) => {
    const org = get().organizations[idmpOrgId];
    if (!org) return;

    set((state) => ({
      organizations: {
        ...state.organizations,
        [idmpOrgId]: { ...org, linkedOrganizationId: masterDataOrgId, updatedAt: now() }
      },
      orgByMasterDataId: {
        ...state.orgByMasterDataId,
        [masterDataOrgId]: idmpOrgId
      }
    }));
  },

  // =========================================================================
  // VALIDATION
  // =========================================================================
  
  validateEntity: (entityId, entityType) => {
    let result: IDMPValidationResult;

    switch (entityType) {
      case 'medicinal-product':
        const mp = get().medicinalProducts[entityId];
        result = mp ? validateMedicinalProduct(mp) : {
          entityId, entityType, isValid: false,
          errors: [{ field: '', code: 'NOT_FOUND', message: 'Entity not found', severity: 'error' }],
          warnings: [], validatedAt: now()
        };
        break;
      case 'substance':
        const substance = get().substances[entityId];
        result = substance ? validateSubstance(substance) : {
          entityId, entityType, isValid: false,
          errors: [{ field: '', code: 'NOT_FOUND', message: 'Entity not found', severity: 'error' }],
          warnings: [], validatedAt: now()
        };
        break;
      case 'organization':
        const org = get().organizations[entityId];
        result = org ? validateOrganization(org) : {
          entityId, entityType, isValid: false,
          errors: [{ field: '', code: 'NOT_FOUND', message: 'Entity not found', severity: 'error' }],
          warnings: [], validatedAt: now()
        };
        break;
      default:
        result = {
          entityId, entityType, isValid: true, errors: [], warnings: [], validatedAt: now()
        };
    }

    set((state) => ({
      validationResults: { ...state.validationResults, [entityId]: result }
    }));

    return result;
  },

  validateAll: () => {
    const state = get();
    const results = new Map<string, IDMPValidationResult>();

    // Validate all medicinal products
    Object.values(state.medicinalProducts).forEach(mp => {
      const result = validateMedicinalProduct(mp);
      results.set(mp.id, result);
    });

    // Validate all substances
    Object.values(state.substances).forEach(substance => {
      const result = validateSubstance(substance);
      results.set(substance.id, result);
    });

    // Validate all organizations
    Object.values(state.organizations).forEach(org => {
      const result = validateOrganization(org);
      results.set(org.id, result);
    });

    const validationResults: Record<string, IDMPValidationResult> = {};
    results.forEach((value, key) => {
      validationResults[key] = value;
    });

    set({ validationResults });

    return results;
  },

  // =========================================================================
  // SYNC WITH MASTER DATA
  // =========================================================================
  
  syncWithMasterData: async () => {
    set({ syncStatus: 'syncing', isLoading: true, error: null });

    try {
      // In a real implementation, this would:
      // 1. Fetch all Master Data products, substances, organizations
      // 2. Compare with existing IDMP entities
      // 3. Create/update IDMP entities based on Master Data
      // 4. Handle conflicts and track changes
      
      // For now, we simulate the sync process
      await new Promise(resolve => setTimeout(resolve, 500));

      set({
        syncStatus: 'idle',
        isLoading: false,
        lastSyncedAt: now()
      });
    } catch (error) {
      set({
        syncStatus: 'error',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      });
    }
  },

  // =========================================================================
  // EXPORT FUNCTIONS
  // =========================================================================
  
  exportToSPL: (mpId) => {
    const state = get();
    const mp = state.medicinalProducts[mpId];
    if (!mp) return '';

    return generateSPLXML(mp, state.substances, state.organizations);
  },

  exportToFHIR: (mpId) => {
    const mp = get().medicinalProducts[mpId];
    if (!mp) return {};

    return generateFHIRMedicinalProduct(mp);
  },

  // =========================================================================
  // UI ACTIONS
  // =========================================================================
  
  setSelectedMedicinalProduct: (id) => set({ selectedMedicinalProductId: id }),
  setSelectedSubstance: (id) => set({ selectedSubstanceId: id }),
  setSelectedOrganization: (id) => set({ selectedOrganizationId: id }),
  setActiveView: (view) => set({ activeView: view }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // =========================================================================
  // DATA MANAGEMENT
  // =========================================================================
  
  loadMockData: () => {
    const state = get();

    // Create Ligature Therapeutics organization (MAH)
    const ligatureOrg = state.createOrganization({
      name: 'Ligature Therapeutics, Inc.',
      legalName: 'Ligature Therapeutics, Inc.',
      organizationType: 'mah',
      dunsNumber: '123456789',
      feiNumber: '3012345678',
      address: {
        streetAddress: ['100 Innovation Way', 'Suite 500'],
        city: 'Cambridge',
        stateProvince: 'MA',
        postalCode: '02142',
        countryCode: 'US',
        countryName: 'United States'
      },
      contactPoint: {
        telephone: '+1-617-555-0100',
        email: 'regulatory@ligature-therapeutics.com',
        website: 'https://www.ligature-therapeutics.com'
      },
      roles: ['marketing-authorization-holder', 'sponsor']
    });

    // Create ligrastinib substance
    const ligrastinib = state.createSubstance({
      preferredName: 'ligrastinib',
      substanceType: 'chemical',
      innName: 'ligrastinib',
      usan: 'ligrastinib',
      casNumber: '1234567-89-0',
      unii: 'ABC123DEF456',
      inchiKey: 'ABCDEFGHIJKLMN-OPQRSTUVWX',
      substanceClass: ['small-molecule'],
      pharmacologicClass: ['Tyrosine Kinase Inhibitor'],
      molecularFormula: 'C₂₄H₂₃N₅O₂',
      molecularWeight: 413.47,
      smilesNotation: 'CC1=CC(=C(C=C1)NC2=NC=NC3=CC=C(C=C32)OC)NC(=O)C4=CC=C(C=C4)CN5CCOCC5',
      scheduledSubstance: false
    });

    // Create pharmaceutical product
    const pharmaProduct = state.createPharmaceuticalProduct({
      administrableDoseForm: 'tablet',
      unitOfPresentation: 'tablet',
      routeOfAdministration: ['oral'],
      ingredients: [{
        id: generateId(),
        substanceId: ligrastinib.id,
        substanceName: 'ligrastinib',
        ingredientRole: 'active',
        presentationStrength: { value: 100, unit: 'mg' },
        basisOfStrength: 'active-substance'
      }],
      characteristics: [
        { type: 'color', value: 'White to off-white' },
        { type: 'shape', value: 'Round' },
        { type: 'imprint', value: 'LIG 100' }
      ]
    });

    // Create Nexavant (ligrastinib) medicinal product
    const nexavant = state.createMedicinalProduct({
      fullName: 'Nexavant (ligrastinib) tablets, 100 mg',
      inventedName: 'Nexavant',
      scientificName: 'ligrastinib',
      combinedPharmaceuticalDoseForm: 'tablet',
      legalStatusOfSupply: 'prescription-only',
      additionalMonitoringIndicator: true,
      orphanDrugDesignation: false,
      pediatricUseIndicator: false,
      marketingAuthorizationHolder: ligatureOrg,
      pharmaceuticalProducts: [pharmaProduct],
      authorizations: [{
        id: generateId(),
        maNumber: 'NDA 214567',
        regulatoryAuthority: 'FDA',
        countryCode: 'US',
        jurisdiction: 'United States',
        authorizationStatus: 'valid',
        authorizationType: 'full',
        authorizationDate: '2024-06-15',
        marketingAuthorizationHolderId: ligatureOrg.id,
        procedureType: 'nda'
      }],
      therapeuticIndications: [{
        id: generateId(),
        indication: 'Treatment of adult patients with locally advanced or metastatic non-small cell lung cancer (NSCLC) with EGFR exon 19 deletions or exon 21 L858R substitution mutations',
        indicationCode: '10029514',
        codingSystem: 'meddra',
        targetPopulation: 'Adults',
        approvalStatus: 'approved',
        approvalDate: '2024-06-15',
        countryCode: 'US'
      }],
      developmentStatus: 'marketed',
      firstAuthorizationDate: '2024-06-15',
      linkedProductId: 'prod-lig-2847'
    });

    // Update pharmaceutical product with medicinal product ID
    state.updatePharmaceuticalProduct(pharmaProduct.id, {
      medicinalProductId: nexavant.id
    });

    // Create packaged product
    state.createPackagedProduct({
      packageDescription: 'Bottle of 30 tablets',
      marketingStatus: 'marketed',
      packaging: [{
        id: generateId(),
        packageItemType: 'bottle',
        quantity: 1,
        material: ['HDPE'],
        manufacturedItems: [{
          id: generateId(),
          manufacturedDoseForm: 'tablet',
          unitOfPresentation: 'tablet',
          quantity: 30
        }]
      }],
      medicinalProductId: nexavant.id,
      marketingAuthorizationId: nexavant.authorizations[0].id,
      countryCode: 'US'
    });

    // Create a second product in development
    const ligraceptSubstance = state.createSubstance({
      preferredName: 'ligracept',
      substanceType: 'protein',
      innName: 'ligracept',
      substanceClass: ['monoclonal-antibody'],
      pharmacologicClass: ['PD-1 Inhibitor'],
      scheduledSubstance: false
    });

    const ligraceptPharma = state.createPharmaceuticalProduct({
      administrableDoseForm: 'injection',
      unitOfPresentation: 'vial',
      routeOfAdministration: ['intravenous'],
      ingredients: [{
        id: generateId(),
        substanceId: ligraceptSubstance.id,
        substanceName: 'ligracept',
        ingredientRole: 'active',
        presentationStrength: { value: 200, unit: 'mg' },
        basisOfStrength: 'active-substance'
      }]
    });

    const ligraceptMp = state.createMedicinalProduct({
      fullName: 'LIG-3021 (ligracept) injection, 200 mg/10 mL',
      inventedName: 'LIG-3021',
      scientificName: 'ligracept',
      combinedPharmaceuticalDoseForm: 'injection',
      legalStatusOfSupply: 'prescription-only',
      additionalMonitoringIndicator: false,
      orphanDrugDesignation: true,
      pediatricUseIndicator: false,
      marketingAuthorizationHolder: ligatureOrg,
      pharmaceuticalProducts: [ligraceptPharma],
      authorizations: [],
      therapeuticIndications: [{
        id: generateId(),
        indication: 'Treatment of adult patients with unresectable or metastatic melanoma',
        indicationCode: '10053571',
        codingSystem: 'meddra',
        targetPopulation: 'Adults',
        approvalStatus: 'pending'
      }],
      developmentStatus: 'phase-3',
      linkedProductId: 'prod-lig-3021'
    });

    state.updatePharmaceuticalProduct(ligraceptPharma.id, {
      medicinalProductId: ligraceptMp.id
    });
  },

  clearAll: () => set(initialState)
}));

// ============================================================================
// SELECTOR HOOKS (v0.2.5 - Fixed infinite loop with useMemo)
// ============================================================================

export const useIDMPMedicinalProducts = () => {
  const medicinalProducts = useIDMPStore(state => state.medicinalProducts);
  return useMemo(() => Object.values(medicinalProducts), [medicinalProducts]);
};

export const useIDMPSubstances = () => {
  const substances = useIDMPStore(state => state.substances);
  return useMemo(() => Object.values(substances), [substances]);
};

export const useIDMPOrganizations = () => {
  const organizations = useIDMPStore(state => state.organizations);
  return useMemo(() => Object.values(organizations), [organizations]);
};

export const useIDMPPackagedProducts = () => {
  const packagedProducts = useIDMPStore(state => state.packagedProducts);
  return useMemo(() => Object.values(packagedProducts), [packagedProducts]);
};

export const useIDMPMedicinalProduct = (id: string) => useIDMPStore(state => state.medicinalProducts[id]);
export const useIDMPSubstance = (id: string) => useIDMPStore(state => state.substances[id]);
export const useIDMPOrganization = (id: string) => useIDMPStore(state => state.organizations[id]);

export const useIDMPValidationResult = (entityId: string) => useIDMPStore(state => state.validationResults[entityId]);
export const useIDMPSyncStatus = () => useIDMPStore(useShallow(state => ({ status: state.syncStatus, lastSyncedAt: state.lastSyncedAt })));

// ============================================================================
// COMPUTED SELECTORS (v0.2.5 - Fixed infinite loop with useMemo)
// ============================================================================

export const useIDMPDashboardStats = () => {
  const medicinalProducts = useIDMPStore(state => state.medicinalProducts);
  const substances = useIDMPStore(state => state.substances);
  const organizations = useIDMPStore(state => state.organizations);
  const packagedProducts = useIDMPStore(state => state.packagedProducts);
  const validationResults = useIDMPStore(state => state.validationResults);
  const lastSyncedAt = useIDMPStore(state => state.lastSyncedAt);

  return useMemo(() => {
    const mps = Object.values(medicinalProducts);
    const subs = Object.values(substances);
    const orgs = Object.values(organizations);
    const validations = Object.values(validationResults);

    const validCount = validations.filter(v => v.isValid).length;
    const errorCount = validations.reduce((acc, v) => acc + v.errors.length, 0);
    const warningCount = validations.reduce((acc, v) => acc + v.warnings.length, 0);

    return {
      totalProducts: mps.length,
      totalSubstances: subs.length,
      totalOrganizations: orgs.length,
      totalPackages: Object.keys(packagedProducts).length,
      approvedProducts: mps.filter(mp => mp.developmentStatus === 'approved' || mp.developmentStatus === 'marketed').length,
      inDevelopment: mps.filter(mp => ['phase-1', 'phase-2', 'phase-3', 'filed'].includes(mp.developmentStatus)).length,
      validationScore: validations.length > 0 ? Math.round((validCount / validations.length) * 100) : 100,
      totalErrors: errorCount,
      totalWarnings: warningCount,
      lastSyncedAt
    };
  }, [medicinalProducts, substances, organizations, packagedProducts, validationResults, lastSyncedAt]);
};

export const useIDMPProductsByStatus = () => {
  const medicinalProducts = useIDMPStore(state => state.medicinalProducts);
  
  return useMemo(() => {
    const mps = Object.values(medicinalProducts);
    return {
      discovery: mps.filter(mp => mp.developmentStatus === 'discovery'),
      preclinical: mps.filter(mp => mp.developmentStatus === 'preclinical'),
      phase1: mps.filter(mp => mp.developmentStatus === 'phase-1'),
      phase2: mps.filter(mp => mp.developmentStatus === 'phase-2'),
      phase3: mps.filter(mp => mp.developmentStatus === 'phase-3'),
      filed: mps.filter(mp => mp.developmentStatus === 'filed'),
      approved: mps.filter(mp => mp.developmentStatus === 'approved'),
      marketed: mps.filter(mp => mp.developmentStatus === 'marketed'),
      discontinued: mps.filter(mp => mp.developmentStatus === 'discontinued' || mp.developmentStatus === 'withdrawn')
    };
  }, [medicinalProducts]);
};
