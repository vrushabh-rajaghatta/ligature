
/**
 * SPL XML Generator
 * 
 * Generates FDA-compliant HL7 CDA R2 Structured Product Labeling XML
 * from Ligature SPLDocument types. Produces DailyMed-compatible output.
 * 
 * Standards: HL7 SPL R7, CDA R2, FDA SPL Implementation Guide
 * OIDs: FDA SPL OID registry (2.16.840.1.113883)
 * 
 * @module lib/spl-xml-generator
 * @version 0.42.36
 */

import type {
  SPLDocument,
  SPLComponent,
  SPLSubject,
  SPLIngredient,
  SPLManufacturedProduct,
  SPLCode,
  SPLQuantity,
  SPLText,
  SPLTable,
  SPLList,
  SPLContainerPackagedProduct,
  SPLSectionCode,
  SPLValidationResult,
  SPLValidationError,
  SPLValidationWarning,
} from '@/store/splTypes';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** FDA SPL OID constants */
const SPL_OID = {
  ROOT: '2.16.840.1.113883.1.3',
  TEMPLATE: '2.16.840.1.113883.10.20.1',
  FDA_PRODUCT_CODE: '2.16.840.1.113883.6.69',
  FDA_ROUTE_CODE: '2.16.840.1.113883.3.26.1.1',
  FDA_FORM_CODE: '2.16.840.1.113883.3.26.1.1',
  FDA_DEA_SCHEDULE: '2.16.840.1.113883.3.26.1.1',
  UNII: '2.16.840.1.113883.4.9',
  NUI: '2.16.840.1.113883.3.26.1.1',
  LOINC: '2.16.840.1.113883.6.1',
  SNOMED: '2.16.840.1.113883.6.96',
  SPL_DOCUMENT_TYPE: '2.16.840.1.113883.6.1',
  DUNS: '1.3.6.1.4.1.519.1',
} as const;

/** LOINC codes for SPL section types */
const SECTION_LOINC_CODES: Record<SPLSectionCode, string> = {
  BOXED_WARNING: '34066-1',
  HIGHLIGHTS: '69719-3',
  RECENT_MAJOR_CHANGES: '43685-7',
  INDICATIONS_USAGE: '34067-9',
  DOSAGE_ADMINISTRATION: '34068-7',
  DOSAGE_FORMS_STRENGTHS: '43678-2',
  CONTRAINDICATIONS: '34070-3',
  WARNINGS_PRECAUTIONS: '43685-7',
  ADVERSE_REACTIONS: '34084-4',
  DRUG_INTERACTIONS: '34073-7',
  USE_SPECIFIC_POPULATIONS: '43684-0',
  OVERDOSAGE: '34088-5',
  DESCRIPTION: '34089-3',
  CLINICAL_PHARMACOLOGY: '34090-1',
  NONCLINICAL_TOXICOLOGY: '43680-8',
  CLINICAL_STUDIES: '34092-7',
  REFERENCES: '34093-5',
  HOW_SUPPLIED: '34069-5',
  STORAGE_HANDLING: '44425-7',
  PATIENT_COUNSELING: '34076-0',
  MEDICATION_GUIDE: '42230-3',
  ACTIVE_INGREDIENT: '55106-9',
  PURPOSE: '55105-1',
  USE: '34067-9',
  WARNINGS: '34071-1',
  DO_NOT_USE: '50570-2',
  ASK_DOCTOR: '50569-4',
  ASK_PHARMACIST: '50568-6',
  STOP_USE: '50567-8',
  PREGNANCY_BREASTFEEDING: '53414-9',
  KEEP_OUT_OF_REACH: '50565-2',
  DIRECTIONS: '34068-7',
  OTHER_INFORMATION: '44425-7',
  INACTIVE_INGREDIENT: '51727-6',
  QUESTIONS: '53413-1',
  PACKAGE_LABEL: '51945-4',
  SPL_UNCLASSIFIED: '42229-5',
};

/** Document type LOINC codes */
const DOCUMENT_TYPE_LOINC: Record<string, string> = {
  'prescription-drug-label': '34391-3',
  'otc-drug-label': '53404-0',
  'generic-drug-label': '34391-3',
  'biological-product-label': '34391-3',
  'vaccine-label': '34391-3',
  'medical-device-label': '53406-5',
  'animal-drug-label': '53408-1',
  'bulk-ingredient': '34391-3',
  'establishment-registration': '51725-0',
  'drug-listing': '44425-7',
  'indexing': '74587-8',
};

// =============================================================================
// TYPES
// =============================================================================

export interface SPLXMLOptions {
  /** Include XML declaration */
  includeDeclaration?: boolean;
  /** Pretty print with indentation */
  prettyPrint?: boolean;
  /** Indent string */
  indent?: string;
  /** Include stylesheet processing instruction */
  includeStylesheet?: boolean;
  /** Stylesheet URL */
  stylesheetUrl?: string;
  /** Validate before generating */
  validateFirst?: boolean;
}

export interface SPLXMLResult {
  xml: string;
  documentId: string;
  setId: string;
  versionNumber: number;
  generatedAt: string;
  sizeBytes: number;
  sectionCount: number;
  validationWarnings: string[];
}

// =============================================================================
// XML HELPERS
// =============================================================================

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr: string): string {
  // Convert ISO date to HL7 V3 date format (YYYYMMDD)
  return dateStr.replace(/-/g, '').substring(0, 8);
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// SPL XML GENERATOR
// =============================================================================

/**
 * Generate FDA-compliant SPL XML from an SPLDocument
 */
export function generateSPLXML(
  doc: SPLDocument,
  options: SPLXMLOptions = {}
): SPLXMLResult {
  const {
    includeDeclaration = true,
    prettyPrint = true,
    indent = '  ',
    includeStylesheet = false,
    stylesheetUrl = 'https://www.accessdata.fda.gov/spl/stylesheet/spl.xsl',
    validateFirst = true,
  } = options;

  const warnings: string[] = [];

  // Optional pre-validation
  if (validateFirst) {
    const validation = validateSPLDocument(doc);
    if (!validation.isValid) {
      warnings.push(...validation.schemaErrors.map(e => `ERROR: ${e.message}`));
    }
    warnings.push(...validation.warnings.map(w => w.message));
  }

  const lines: string[] = [];
  const ind = prettyPrint ? indent : '';
  const nl = prettyPrint ? '\n' : '';

  // XML Declaration
  if (includeDeclaration) {
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  }

  // Stylesheet PI
  if (includeStylesheet) {
    lines.push(`<?xml-stylesheet type="text/xsl" href="${stylesheetUrl}"?>`);
  }

  // Root document element
  lines.push('<document xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  lines.push(`${ind}xsi:schemaLocation="urn:hl7-org:v3 https://www.accessdata.fda.gov/spl/schema/spl.xsd">`);

  // Document identity
  lines.push(`${ind}<id root="${doc.id}"/>`);
  lines.push(`${ind}<code code="${DOCUMENT_TYPE_LOINC[doc.documentType] || '34391-3'}" codeSystem="${SPL_OID.LOINC}" displayName="${escapeXml(doc.title)}"/>`);
  lines.push(`${ind}<title>${escapeXml(doc.title)}</title>`);
  lines.push(`${ind}<effectiveTime value="${formatDate(doc.effectiveTime)}"/>`);

  // Set ID and version
  lines.push(`${ind}<setId root="${doc.setId}"/>`);
  lines.push(`${ind}<versionNumber value="${doc.versionNumber}"/>`);

  // Author (labeler organization)
  lines.push(...generateAuthorXML(doc.author, ind, nl));

  // Component: structured body
  lines.push(`${ind}<component>`);
  lines.push(`${ind}${ind}<structuredBody>`);

  // Content sections
  const sortedComponents = [...doc.components].sort((a, b) => a.displayOrder - b.displayOrder);
  for (const component of sortedComponents) {
    lines.push(...generateComponentXML(component, ind, nl, 2));
  }

  // Subject (product) sections
  for (const subject of doc.subjects) {
    lines.push(...generateSubjectXML(subject, ind, nl));
  }

  lines.push(`${ind}${ind}</structuredBody>`);
  lines.push(`${ind}</component>`);
  lines.push('</document>');

  const xml = lines.join(nl);
  const generatedAt = new Date().toISOString();

  return {
    xml,
    documentId: doc.id,
    setId: doc.setId,
    versionNumber: doc.versionNumber,
    generatedAt,
    sizeBytes: new TextEncoder().encode(xml).length,
    sectionCount: countSections(doc.components),
    validationWarnings: warnings,
  };
}

// =============================================================================
// SECTION GENERATORS
// =============================================================================

function generateAuthorXML(author: SPLDocument['author'], ind: string, nl: string): string[] {
  const lines: string[] = [];
  lines.push(`${ind}<author>`);
  lines.push(`${ind}${ind}<assignedEntity>`);
  lines.push(`${ind}${ind}${ind}<representedOrganization>`);
  lines.push(`${ind}${ind}${ind}${ind}<id extension="${escapeXml(author.dunsNumber)}" root="${SPL_OID.DUNS}"/>`);
  lines.push(`${ind}${ind}${ind}${ind}<name>${escapeXml(author.name)}</name>`);

  // Address
  const addr = author.addr;
  lines.push(`${ind}${ind}${ind}${ind}<addr>`);
  for (const line of addr.streetAddressLine) {
    lines.push(`${ind}${ind}${ind}${ind}${ind}<streetAddressLine>${escapeXml(line)}</streetAddressLine>`);
  }
  lines.push(`${ind}${ind}${ind}${ind}${ind}<city>${escapeXml(addr.city)}</city>`);
  if (addr.state) {
    lines.push(`${ind}${ind}${ind}${ind}${ind}<state>${escapeXml(addr.state)}</state>`);
  }
  lines.push(`${ind}${ind}${ind}${ind}${ind}<postalCode>${escapeXml(addr.postalCode)}</postalCode>`);
  lines.push(`${ind}${ind}${ind}${ind}${ind}<country code="${escapeXml(addr.countryCode)}"/>`);
  lines.push(`${ind}${ind}${ind}${ind}</addr>`);

  // Telecom
  if (author.telecom?.length) {
    for (const tel of author.telecom) {
      lines.push(`${ind}${ind}${ind}${ind}<telecom value="${tel.type}:${escapeXml(tel.value)}" use="${tel.use}"/>`);
    }
  }

  // Assigned organization
  if (author.assignedOrganization) {
    const org = author.assignedOrganization;
    lines.push(`${ind}${ind}${ind}${ind}<assignedOrganization>`);
    lines.push(`${ind}${ind}${ind}${ind}${ind}<id extension="${escapeXml(org.dunsNumber || '')}" root="${SPL_OID.DUNS}"/>`);
    lines.push(`${ind}${ind}${ind}${ind}${ind}<name>${escapeXml(org.name)}</name>`);
    lines.push(`${ind}${ind}${ind}${ind}</assignedOrganization>`);
  }

  lines.push(`${ind}${ind}${ind}</representedOrganization>`);
  lines.push(`${ind}${ind}</assignedEntity>`);
  lines.push(`${ind}</author>`);
  return lines;
}

function generateComponentXML(
  component: SPLComponent,
  ind: string,
  nl: string,
  depth: number
): string[] {
  const prefix = ind.repeat(depth);
  const lines: string[] = [];
  const loincCode = SECTION_LOINC_CODES[component.sectionCode] || '42229-5';

  lines.push(`${prefix}<component>`);
  lines.push(`${prefix}${ind}<section>`);
  lines.push(`${prefix}${ind}${ind}<id root="${component.id}"/>`);
  lines.push(`${prefix}${ind}${ind}<code code="${loincCode}" codeSystem="${SPL_OID.LOINC}" displayName="${escapeXml(component.title)}"/>`);
  lines.push(`${prefix}${ind}${ind}<title>${escapeXml(component.title)}</title>`);

  // Section text (narrative block)
  lines.push(...generateTextXML(component.text, ind, nl, depth + 2));

  // Effective time
  if (component.effectiveTime) {
    lines.push(`${prefix}${ind}${ind}<effectiveTime>`);
    if (component.effectiveTime.low) {
      lines.push(`${prefix}${ind}${ind}${ind}<low value="${formatDate(component.effectiveTime.low)}"/>`);
    }
    if (component.effectiveTime.high) {
      lines.push(`${prefix}${ind}${ind}${ind}<high value="${formatDate(component.effectiveTime.high)}"/>`);
    }
    lines.push(`${prefix}${ind}${ind}</effectiveTime>`);
  }

  // Nested sub-sections
  if (component.components?.length) {
    for (const sub of component.components) {
      lines.push(...generateComponentXML(sub, ind, nl, depth + 2));
    }
  }

  lines.push(`${prefix}${ind}</section>`);
  lines.push(`${prefix}</component>`);
  return lines;
}

function generateTextXML(
  text: SPLText,
  ind: string,
  nl: string,
  depth: number
): string[] {
  const prefix = ind.repeat(depth);
  const lines: string[] = [];

  lines.push(`${prefix}<text>`);

  // Main narrative content (XHTML)
  if (text.content) {
    lines.push(`${prefix}${ind}<paragraph>${escapeXml(text.content)}</paragraph>`);
  }

  // Tables
  if (text.tables?.length) {
    for (const table of text.tables) {
      lines.push(...generateTableXML(table, ind, depth + 1));
    }
  }

  // Lists
  if (text.lists?.length) {
    for (const list of text.lists) {
      lines.push(...generateListXML(list, ind, depth + 1));
    }
  }

  lines.push(`${prefix}</text>`);
  return lines;
}

function generateTableXML(table: SPLTable, ind: string, depth: number): string[] {
  const prefix = ind.repeat(depth);
  const lines: string[] = [];

  lines.push(`${prefix}<table width="100%">`);

  if (table.caption) {
    lines.push(`${prefix}${ind}<caption>${escapeXml(table.caption)}</caption>`);
  }

  // Header
  if (table.headers.length) {
    lines.push(`${prefix}${ind}<thead>`);
    lines.push(`${prefix}${ind}${ind}<tr>`);
    for (const header of table.headers) {
      lines.push(`${prefix}${ind}${ind}${ind}<th>${escapeXml(header)}</th>`);
    }
    lines.push(`${prefix}${ind}${ind}</tr>`);
    lines.push(`${prefix}${ind}</thead>`);
  }

  // Body
  if (table.rows.length) {
    lines.push(`${prefix}${ind}<tbody>`);
    for (const row of table.rows) {
      lines.push(`${prefix}${ind}${ind}<tr>`);
      for (const cell of row) {
        lines.push(`${prefix}${ind}${ind}${ind}<td>${escapeXml(cell)}</td>`);
      }
      lines.push(`${prefix}${ind}${ind}</tr>`);
    }
    lines.push(`${prefix}${ind}</tbody>`);
  }

  // Footnotes
  if (table.footnotes?.length) {
    lines.push(`${prefix}${ind}<tfoot>`);
    for (const fn of table.footnotes) {
      lines.push(`${prefix}${ind}${ind}<tr><td colspan="${table.headers.length}">${escapeXml(fn)}</td></tr>`);
    }
    lines.push(`${prefix}${ind}</tfoot>`);
  }

  lines.push(`${prefix}</table>`);
  return lines;
}

function generateListXML(list: SPLList, ind: string, depth: number): string[] {
  const prefix = ind.repeat(depth);
  const lines: string[] = [];
  const tag = list.listType === 'ordered' ? 'list listType="ordered"' : 'list';

  lines.push(`${prefix}<${tag}>`);
  for (const item of list.items) {
    lines.push(`${prefix}${ind}<item>${escapeXml(item)}</item>`);
  }
  lines.push(`${prefix}</list>`);
  return lines;
}

function generateSubjectXML(
  subject: SPLSubject,
  ind: string,
  nl: string
): string[] {
  const lines: string[] = [];
  const mp = subject.manufacturedProduct;
  const d2 = ind.repeat(2);
  const d3 = ind.repeat(3);
  const d4 = ind.repeat(4);
  const d5 = ind.repeat(5);
  const d6 = ind.repeat(6);

  lines.push(`${d2}<component>`);
  lines.push(`${d3}<section>`);
  lines.push(`${d3}${ind}<subject>`);
  lines.push(`${d4}${ind}<manufacturedProduct>`);

  // Product code
  lines.push(`${d5}${ind}<manufacturedProduct>`);
  lines.push(`${d6}${ind}<code code="${escapeXml(mp.manufacturedProductCode.code)}" codeSystem="${SPL_OID.FDA_PRODUCT_CODE}" displayName="${escapeXml(mp.name)}"/>`);
  lines.push(`${d6}${ind}<name>${escapeXml(mp.name)}</name>`);

  // Dosage form
  lines.push(`${d6}${ind}<formCode code="${escapeXml(mp.formCode.code)}" codeSystem="${SPL_OID.FDA_FORM_CODE}" displayName="${escapeXml(mp.formCode.displayName)}"/>`);

  // Physical characteristics
  if (mp.characteristics?.length) {
    for (const char of mp.characteristics) {
      if (char.valueCode) {
        lines.push(`${d6}${ind}<asSpecializedKind>`);
        lines.push(`${d6}${ind}${ind}<generalizedMaterialKind>`);
        lines.push(`${d6}${ind}${ind}${ind}<code code="${escapeXml(char.valueCode.code)}" codeSystem="${escapeXml(char.valueCode.codeSystem)}" displayName="${escapeXml(char.value)}"/>`);
        lines.push(`${d6}${ind}${ind}</generalizedMaterialKind>`);
        lines.push(`${d6}${ind}</asSpecializedKind>`);
      }
    }
  }

  lines.push(`${d5}${ind}</manufacturedProduct>`);

  // Labeler / manufacturer
  lines.push(`${d5}${ind}<manufacturerOrganization>`);
  lines.push(`${d6}${ind}<name>${escapeXml(mp.labelerName)}</name>`);
  lines.push(`${d6}${ind}<id extension="${escapeXml(mp.labelerDunsNumber)}" root="${SPL_OID.DUNS}"/>`);
  lines.push(`${d5}${ind}</manufacturerOrganization>`);

  lines.push(`${d4}${ind}</manufacturedProduct>`);

  // Ingredients
  for (const ingredient of subject.ingredients) {
    lines.push(...generateIngredientXML(ingredient, ind, d4));
  }

  // Routes of administration
  for (const route of mp.routeCode) {
    lines.push(`${d4}${ind}<consumedIn>`);
    lines.push(`${d5}${ind}<substanceAdministration>`);
    lines.push(`${d6}${ind}<routeCode code="${escapeXml(route.code)}" codeSystem="${SPL_OID.FDA_ROUTE_CODE}" displayName="${escapeXml(route.displayName)}"/>`);
    lines.push(`${d5}${ind}</substanceAdministration>`);
    lines.push(`${d4}${ind}</consumedIn>`);
  }

  // Marketing approval
  if (subject.approval) {
    lines.push(`${d4}${ind}<subjectOf>`);
    lines.push(`${d5}${ind}<approval>`);
    lines.push(`${d6}${ind}<id extension="${escapeXml(subject.approval.id)}" root="${SPL_OID.FDA_PRODUCT_CODE}"/>`);
    lines.push(`${d6}${ind}<code code="${escapeXml(subject.approval.code.code)}" codeSystem="${escapeXml(subject.approval.code.codeSystem)}" displayName="${escapeXml(subject.approval.code.displayName)}"/>`);
    lines.push(`${d5}${ind}</approval>`);
    lines.push(`${d4}${ind}</subjectOf>`);
  }

  // Marketing act
  if (subject.marketingAct) {
    lines.push(`${d4}${ind}<subjectOf>`);
    lines.push(`${d5}${ind}<marketingAct>`);
    lines.push(`${d6}${ind}<code code="${escapeXml(subject.marketingAct.code.code)}" codeSystem="${escapeXml(subject.marketingAct.code.codeSystem)}" displayName="${escapeXml(subject.marketingAct.code.displayName)}"/>`);
    lines.push(`${d6}${ind}<effectiveTime>`);
    lines.push(`${d6}${ind}${ind}<low value="${formatDate(subject.marketingAct.effectiveTime.low)}"/>`);
    if (subject.marketingAct.effectiveTime.high) {
      lines.push(`${d6}${ind}${ind}<high value="${formatDate(subject.marketingAct.effectiveTime.high)}"/>`);
    }
    lines.push(`${d6}${ind}</effectiveTime>`);
    lines.push(`${d5}${ind}</marketingAct>`);
    lines.push(`${d4}${ind}</subjectOf>`);
  }

  // Packaging
  if (subject.containerPackagedProduct) {
    lines.push(...generatePackagingXML(subject.containerPackagedProduct, ind, d4));
  }

  lines.push(`${d3}${ind}</subject>`);
  lines.push(`${d3}</section>`);
  lines.push(`${d2}</component>`);
  return lines;
}

function generateIngredientXML(
  ingredient: SPLIngredient,
  ind: string,
  basePrefix: string
): string[] {
  const lines: string[] = [];
  const p = basePrefix + ind;
  const p2 = p + ind;
  const p3 = p2 + ind;
  const p4 = p3 + ind;

  const roleTag = ingredient.classCode === 'IACT' ? 'inactiveIngredient' : 'activeIngredient';

  lines.push(`${p}<${roleTag}>`);
  lines.push(`${p2}<ingredientSubstance>`);
  lines.push(`${p3}<code code="${escapeXml(ingredient.substanceCode.code)}" codeSystem="${SPL_OID.UNII}" displayName="${escapeXml(ingredient.substanceName)}"/>`);
  lines.push(`${p3}<name>${escapeXml(ingredient.substanceName)}</name>`);

  // Active moiety
  if (ingredient.activeMoiety) {
    lines.push(`${p3}<activeMoiety>`);
    lines.push(`${p4}<activeMoiety>`);
    lines.push(`${p4}${ind}<code code="${escapeXml(ingredient.activeMoiety.code.code)}" codeSystem="${SPL_OID.UNII}" displayName="${escapeXml(ingredient.activeMoiety.name)}"/>`);
    lines.push(`${p4}${ind}<name>${escapeXml(ingredient.activeMoiety.name)}</name>`);
    lines.push(`${p4}</activeMoiety>`);
    lines.push(`${p3}</activeMoiety>`);
  }

  lines.push(`${p2}</ingredientSubstance>`);

  // Strength / quantity
  if (ingredient.quantity) {
    lines.push(`${p2}<quantity>`);
    lines.push(`${p3}<numerator value="${ingredient.quantity.numerator.value}" unit="${escapeXml(ingredient.quantity.numerator.unit)}"/>`);
    lines.push(`${p3}<denominator value="${ingredient.quantity.denominator.value}" unit="${escapeXml(ingredient.quantity.denominator.unit)}"/>`);
    lines.push(`${p2}</quantity>`);
  }

  lines.push(`${p}</${roleTag}>`);
  return lines;
}

function generatePackagingXML(
  pkg: SPLContainerPackagedProduct,
  ind: string,
  basePrefix: string
): string[] {
  const lines: string[] = [];
  const p = basePrefix + ind;
  const p2 = p + ind;
  const p3 = p2 + ind;

  lines.push(`${p}<asContent>`);
  lines.push(`${p2}<containerPackagedProduct>`);
  lines.push(`${p3}<code code="${escapeXml(pkg.code.code)}" codeSystem="${SPL_OID.FDA_PRODUCT_CODE}" displayName="${escapeXml(pkg.code.displayName)}"/>`);

  if (pkg.quantity) {
    lines.push(`${p3}<quantity>`);
    lines.push(`${p3}${ind}<numerator value="${pkg.quantity.numerator.value}" unit="${escapeXml(pkg.quantity.numerator.unit)}"/>`);
    lines.push(`${p3}${ind}<denominator value="${pkg.quantity.denominator.value}" unit="${escapeXml(pkg.quantity.denominator.unit)}"/>`);
    lines.push(`${p3}</quantity>`);
  }

  // Nested packaging
  if (pkg.containedPackagedProduct?.length) {
    for (const nested of pkg.containedPackagedProduct) {
      lines.push(...generatePackagingXML(nested, ind, p2));
    }
  }

  // Marketing act on package
  if (pkg.subjectOf) {
    lines.push(`${p3}<subjectOf>`);
    lines.push(`${p3}${ind}<marketingAct>`);
    lines.push(`${p3}${ind}${ind}<code code="${escapeXml(pkg.subjectOf.code.code)}" codeSystem="${escapeXml(pkg.subjectOf.code.codeSystem)}"/>`);
    lines.push(`${p3}${ind}${ind}<effectiveTime>`);
    lines.push(`${p3}${ind}${ind}${ind}<low value="${formatDate(pkg.subjectOf.effectiveTime.low)}"/>`);
    if (pkg.subjectOf.effectiveTime.high) {
      lines.push(`${p3}${ind}${ind}${ind}<high value="${formatDate(pkg.subjectOf.effectiveTime.high)}"/>`);
    }
    lines.push(`${p3}${ind}${ind}</effectiveTime>`);
    lines.push(`${p3}${ind}</marketingAct>`);
    lines.push(`${p3}</subjectOf>`);
  }

  lines.push(`${p2}</containerPackagedProduct>`);
  lines.push(`${p}</asContent>`);
  return lines;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate an SPL document structure before XML generation
 */
export function validateSPLDocument(doc: SPLDocument): SPLValidationResult {
  const errors: SPLValidationError[] = [];
  const warnings: SPLValidationWarning[] = [];

  // Required fields
  if (!doc.id) {
    errors.push({ severity: 'error', path: 'document.id', code: 'SPL-001', message: 'Document ID is required' });
  }
  if (!doc.setId) {
    errors.push({ severity: 'error', path: 'document.setId', code: 'SPL-002', message: 'Set ID is required for version tracking' });
  }
  if (!doc.effectiveTime) {
    errors.push({ severity: 'error', path: 'document.effectiveTime', code: 'SPL-003', message: 'Effective time is required' });
  }
  if (!doc.title) {
    errors.push({ severity: 'error', path: 'document.title', code: 'SPL-004', message: 'Document title is required' });
  }

  // Author validation
  if (!doc.author?.name) {
    errors.push({ severity: 'error', path: 'document.author.name', code: 'SPL-010', message: 'Author organization name is required' });
  }
  if (!doc.author?.dunsNumber) {
    errors.push({ severity: 'error', path: 'document.author.dunsNumber', code: 'SPL-011', message: 'Author DUNS number is required for FDA submissions' });
  }

  // Subject validation
  if (!doc.subjects?.length) {
    errors.push({ severity: 'error', path: 'document.subjects', code: 'SPL-020', message: 'At least one product subject is required' });
  }

  (doc.subjects || []).forEach((subject, i) => {
    const mp = subject.manufacturedProduct;
    if (!mp?.name) {
      errors.push({ severity: 'error', path: `subjects[${i}].manufacturedProduct.name`, code: 'SPL-021', message: `Subject ${i + 1}: Product name is required` });
    }
    if (!mp?.formCode?.code) {
      errors.push({ severity: 'error', path: `subjects[${i}].manufacturedProduct.formCode`, code: 'SPL-022', message: `Subject ${i + 1}: Dosage form code is required` });
    }
    if (!mp?.routeCode?.length) {
      warnings.push({ severity: 'warning', path: `subjects[${i}].manufacturedProduct.routeCode`, code: 'SPL-W001', message: `Subject ${i + 1}: Route of administration recommended` });
    }

    // Ingredient validation
    const activeIngredients = (subject.ingredients || []).filter(ing => ing.classCode !== 'IACT');
    if (!activeIngredients.length) {
      warnings.push({ severity: 'warning', path: `subjects[${i}].ingredients`, code: 'SPL-W002', message: `Subject ${i + 1}: No active ingredients defined` });
    }

    ( subject.ingredients || []).forEach((ing, j) =>  {
      if (!ing.substanceCode?.code) {
        errors.push({ severity: 'error', path: `subjects[${i}].ingredients[${j}].substanceCode`, code: 'SPL-023', message: `Ingredient "${ing.substanceName}": UNII code is required` });
      }
      if (ing.classCode !== 'IACT' && !ing.quantity) {
        warnings.push({ severity: 'warning', path: `subjects[${i}].ingredients[${j}].quantity`, code: 'SPL-W003', message: `Active ingredient "${ing.substanceName}": Strength quantity recommended` });
      }
    });
  });

  // Section validation
  if (!doc.components?.length) {
    warnings.push({ severity: 'warning', path: 'document.components', code: 'SPL-W010', message: 'No labeling content sections defined' });
  }

  // Check required PLR sections for prescription drugs
  if (doc.documentType === 'prescription-drug-label') {
    const presentCodes = new Set((doc.components || []).map(c => c.sectionCode));
    const requiredPLR: SPLSectionCode[] = [
      'HIGHLIGHTS', 'INDICATIONS_USAGE', 'DOSAGE_ADMINISTRATION',
      'DOSAGE_FORMS_STRENGTHS', 'CONTRAINDICATIONS', 'WARNINGS_PRECAUTIONS',
      'ADVERSE_REACTIONS', 'DRUG_INTERACTIONS', 'USE_SPECIFIC_POPULATIONS',
      'OVERDOSAGE', 'DESCRIPTION', 'CLINICAL_PHARMACOLOGY',
      'HOW_SUPPLIED', 'PATIENT_COUNSELING',
    ];
    for (const code of requiredPLR) {
      if (!presentCodes.has(code)) {
        warnings.push({ severity: 'warning', path: `document.components.${code}`, code: 'SPL-W011', message: `Required PLR section missing: ${code}` });
      }
    }
  }

  return {
    documentId: doc.id,
    isValid: errors.length === 0,
    schemaErrors: errors,
    businessRuleErrors: [],
    warnings,
    validatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function countSections(components: SPLComponent[]): number {
  let count = components.length;
  for (const c of components) {
    if (c.components?.length) {
      count += countSections(c.components);
    }
  }
  return count;
}

/**
 * Generate an SPL package directory structure descriptor
 * (for DailyMed submission packaging)
 */
export function generateSPLPackageManifest(doc: SPLDocument): {
  files: Array<{ path: string; type: string; description: string }>;
} {
  const files = [
    { path: `${doc.setId}.xml`, type: 'application/xml', description: 'SPL XML document' },
    { path: `${doc.setId}.xsl`, type: 'text/xsl', description: 'SPL stylesheet (optional)' },
  ];

  // Add image files from figures
  for (const comp of doc.components) {
    const figures = comp.text.figures || [];
    for (const fig of figures) {
      files.push({ path: `media/${fig.id}.${fig.mediaType.split('/')[1] || 'png'}`, type: fig.mediaType, description: fig.altText || fig.caption || 'Image' });
    }
  }

  return { files };
}
