
/**
 * Define-XML v2.1 Generator
 * 
 * Generates CDISC Define-XML v2.1 metadata documents that describe
 * SDTM and ADaM datasets for regulatory submission packages.
 * 
 * Required with every SDTM/ADaM submission to FDA and PMDA.
 * 
 * Standards: CDISC Define-XML v2.1 (based on ODM v1.3.2)
 * Schema: define2-1-0.xsd
 * 
 * @module lib/define-xml-generator
 * @version 0.42.36
 */

import type {
  SDTMDomainCode,
  SDTMDomainClass,
  SDTMVariableDefinition,
  SDTMVariableRole,
  SDTMDataType,
  SDTMCoreStatus,
  SDTMVariableOrigin,
  SDTMCodeList,
  SDTMCodeListItem,
} from '@/store/sdtm-types';

// =============================================================================
// TYPES
// =============================================================================

/** Study metadata for Define-XML header */
export interface DefineStudyMetadata {
  studyOID: string;
  studyName: string;
  studyDescription: string;
  protocolName: string;
  
  // Study identifiers
  sponsorName: string;
  
  // Standard reference
  standardName: 'SDTM-IG' | 'ADaM-IG' | 'SEND-IG';
  standardVersion: string; // e.g., "3.4" for SDTM IG 3.4
}

/** Dataset definition for a domain */
export interface DefineDatasetDefinition {
  /** Dataset OID (e.g., "IG.DM") */
  oid: string;
  /** Domain code (e.g., "DM") */
  domain: SDTMDomainCode;
  /** Dataset name / file name (e.g., "dm.xpt") */
  name: string;
  /** Human-readable label */
  label: string;
  /** Domain class */
  domainClass: SDTMDomainClass;
  /** Dataset structure (e.g., "One record per subject") */
  structure: string;
  /** Keys that define record uniqueness */
  keySequence: string[];
  /** Variables in this dataset */
  variables: SDTMVariableDefinition[];
  /** Comment / documentation */
  comment?: string;
  /** Is this a supplemental qualifier dataset? */
  isSupplementary?: boolean;
  /** Location (file path in submission package) */
  location?: string;
  /** Dataset purpose */
  purpose?: 'Tabulation' | 'Analysis';
}

/** Complete Define-XML generation request */
export interface DefineXMLRequest {
  study: DefineStudyMetadata;
  datasets: DefineDatasetDefinition[];
  codeLists: SDTMCodeList[];
  /** Define-XML file creation datetime */
  creationDateTime?: string;
  /** Define-XML stylesheet location */
  stylesheetLocation?: string;
}

export interface DefineXMLOptions {
  /** Include XML declaration */
  includeDeclaration?: boolean;
  /** Pretty print */
  prettyPrint?: boolean;
  /** Indent string */
  indent?: string;
  /** Include stylesheet PI */
  includeStylesheet?: boolean;
  /** Stylesheet href */
  stylesheetHref?: string;
}

export interface DefineXMLResult {
  xml: string;
  studyOID: string;
  generatedAt: string;
  sizeBytes: number;
  datasetCount: number;
  variableCount: number;
  codeListCount: number;
  warnings: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFINE_NS = 'http://www.cdisc.org/ns/odm/v1.3';
const DEFINE_NS_DEF = 'http://www.cdisc.org/ns/def/v2.1';
const DEFINE_NS_ARM = 'http://www.cdisc.org/ns/arm/v1.0';
const DEFINE_NS_XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const DEFINE_NS_XLINK = 'http://www.w3.org/1999/xlink';
const DEFINE_SCHEMA = `${DEFINE_NS} define2-1-0.xsd`;

/** Map SDTM data types to Define-XML data types */
const DATA_TYPE_MAP: Record<SDTMDataType, string> = {
  text: 'text',
  integer: 'integer',
  float: 'float',
  date: 'date',
  datetime: 'datetime',
  time: 'time',
  durationDatetime: 'durationDatetime',
  partialDate: 'partialDate',
  partialDatetime: 'partialDatetime',
};

/** Map SDTM variable roles to Define-XML roles */
const ROLE_MAP: Record<SDTMVariableRole, string> = {
  Identifier: 'Identifier',
  Topic: 'Topic',
  Timing: 'Timing',
  Qualifier: 'Qualifier',
  Rule: 'Rule',
};

/** Map origin types */
const ORIGIN_TYPE_MAP: Record<SDTMVariableOrigin, string> = {
  CRF: 'CRF',
  Derived: 'Derived',
  Assigned: 'Assigned',
  Protocol: 'Protocol',
  eDT: 'eDT',
  Predecessor: 'Predecessor',
};

// =============================================================================
// XML HELPERS
// =============================================================================

function escXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function oid(prefix: string, id: string): string {
  return `${prefix}.${id}`;
}

// =============================================================================
// GENERATOR
// =============================================================================

/**
 * Generate a CDISC Define-XML v2.1 document
 */
export function generateDefineXML(
  request: DefineXMLRequest,
  options: DefineXMLOptions = {}
): DefineXMLResult {
  const {
    includeDeclaration = true,
    prettyPrint = true,
    indent = '  ',
    includeStylesheet = true,
    stylesheetHref = 'define2-1-0.xsl',
  } = options;

  const warnings: string[] = [];
  const ind = prettyPrint ? indent : '';
  const nl = prettyPrint ? '\n' : '';
  const lines: string[] = [];
  const creationDateTime = request.creationDateTime || new Date().toISOString();

  // Pre-validation
  if (!request.datasets.length) {
    warnings.push('No datasets defined');
  }

  // --- XML Declaration ---
  if (includeDeclaration) {
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  }

  // --- Stylesheet PI ---
  if (includeStylesheet) {
    lines.push(`<?xml-stylesheet type="text/xsl" href="${stylesheetHref}"?>`);
  }

  // --- ODM Root Element ---
  lines.push(`<ODM xmlns="${DEFINE_NS}"`);
  lines.push(`${ind}xmlns:def="${DEFINE_NS_DEF}"`);
  lines.push(`${ind}xmlns:arm="${DEFINE_NS_ARM}"`);
  lines.push(`${ind}xmlns:xsi="${DEFINE_NS_XSI}"`);
  lines.push(`${ind}xmlns:xlink="${DEFINE_NS_XLINK}"`);
  lines.push(`${ind}xsi:schemaLocation="${DEFINE_SCHEMA}"`);
  lines.push(`${ind}FileOID="${escXml(request.study.studyOID)}-Define"`);
  lines.push(`${ind}FileType="Snapshot"`);
  lines.push(`${ind}Granularity="Metadata"`);
  lines.push(`${ind}CreationDateTime="${creationDateTime}"`);
  lines.push(`${ind}ODMVersion="1.3.2"`);
  lines.push(`${ind}def:Context="Submission">`);

  // --- Study ---
  lines.push(`${ind}<Study OID="${escXml(request.study.studyOID)}">`);
  lines.push(`${ind}${ind}<GlobalVariables>`);
  lines.push(`${ind}${ind}${ind}<StudyName>${escXml(request.study.studyName)}</StudyName>`);
  lines.push(`${ind}${ind}${ind}<StudyDescription>${escXml(request.study.studyDescription)}</StudyDescription>`);
  lines.push(`${ind}${ind}${ind}<ProtocolName>${escXml(request.study.protocolName)}</ProtocolName>`);
  lines.push(`${ind}${ind}</GlobalVariables>`);

  // --- MetaDataVersion ---
  const mdvOID = `MDV.${request.study.studyOID}`;
  lines.push(`${ind}${ind}<MetaDataVersion OID="${escXml(mdvOID)}"`);
  lines.push(`${ind}${ind}${ind}Name="Study ${escXml(request.study.studyName)}, Data Definitions"`);
  lines.push(`${ind}${ind}${ind}Description="Define-XML v2.1 for ${escXml(request.study.standardName)} ${escXml(request.study.standardVersion)}">`);

  // --- def:Standards ---
  lines.push(`${ind}${ind}${ind}<def:Standards>`);
  lines.push(`${ind}${ind}${ind}${ind}<def:Standard OID="STD.1" Name="${escXml(request.study.standardName)}" Type="IG" Version="${escXml(request.study.standardVersion)}" Status="Final"/>`);
  if (request.codeLists.length) {
    lines.push(`${ind}${ind}${ind}${ind}<def:Standard OID="STD.CT.1" Name="CDISC/NCI CT" Type="CT" PublishingSet="SDTM" Version="2024-06-28" Status="Final"/>`);
  }
  lines.push(`${ind}${ind}${ind}</def:Standards>`);

  // --- ItemGroupDef (Datasets) ---
  for (const dataset of request.datasets) {
    lines.push(...generateItemGroupDef(dataset, ind, nl, request.study));
  }

  // --- ItemDef (Variables) ---
  const allVariables = collectAllVariables(request.datasets);
  for (const { variable, dataset } of allVariables) {
    lines.push(...generateItemDef(variable, dataset, ind, nl));
  }

  // --- CodeList definitions ---
  for (const codeList of request.codeLists) {
    lines.push(...generateCodeListDef(codeList, ind, nl));
  }

  // --- MethodDef (derivations) ---
  const derivedVars = allVariables.filter(v => v.variable.origin === 'Derived' && v.variable.derivationMethod);
  for (const { variable, dataset } of derivedVars) {
    const methodOID = `MT.${dataset.domain}.${variable.name}`;
    lines.push(`${ind}${ind}${ind}<MethodDef OID="${escXml(methodOID)}" Name="Algorithm for ${escXml(variable.name)}" Type="Computation">`);
    lines.push(`${ind}${ind}${ind}${ind}<Description>`);
    lines.push(`${ind}${ind}${ind}${ind}${ind}<TranslatedText xml:lang="en">${escXml(variable.derivationMethod || '')}</TranslatedText>`);
    lines.push(`${ind}${ind}${ind}${ind}</Description>`);
    lines.push(`${ind}${ind}${ind}</MethodDef>`);
  }

  // --- CommentDef (dataset comments) ---
  for (const dataset of request.datasets) {
    if (dataset.comment) {
      lines.push(`${ind}${ind}${ind}<def:CommentDef OID="COM.${escXml(dataset.domain)}">`);
      lines.push(`${ind}${ind}${ind}${ind}<Description>`);
      lines.push(`${ind}${ind}${ind}${ind}${ind}<TranslatedText xml:lang="en">${escXml(dataset.comment)}</TranslatedText>`);
      lines.push(`${ind}${ind}${ind}${ind}</Description>`);
      lines.push(`${ind}${ind}${ind}</def:CommentDef>`);
    }
  }

  // --- def:leaf (external document references) ---
  for (const dataset of request.datasets) {
    const location = dataset.location || `${dataset.domain.toLowerCase()}.xpt`;
    lines.push(`${ind}${ind}${ind}<def:leaf ID="LF.${escXml(dataset.domain)}" xlink:href="${escXml(location)}">`);
    lines.push(`${ind}${ind}${ind}${ind}<def:title>${escXml(dataset.label)}</def:title>`);
    lines.push(`${ind}${ind}${ind}</def:leaf>`);
  }

  lines.push(`${ind}${ind}</MetaDataVersion>`);
  lines.push(`${ind}</Study>`);
  lines.push('</ODM>');

  const xml = lines.join(nl);
  const totalVarCount = allVariables.length;

  return {
    xml,
    studyOID: request.study.studyOID,
    generatedAt: creationDateTime,
    sizeBytes: new TextEncoder().encode(xml).length,
    datasetCount: request.datasets.length,
    variableCount: totalVarCount,
    codeListCount: request.codeLists.length,
    warnings,
  };
}

// =============================================================================
// ELEMENT GENERATORS
// =============================================================================

function generateItemGroupDef(
  dataset: DefineDatasetDefinition,
  ind: string,
  nl: string,
  study: DefineStudyMetadata
): string[] {
  const lines: string[] = [];
  const p = ind.repeat(3);
  const p2 = p + ind;
  const p3 = p2 + ind;

  const datasetOID = dataset.oid || `IG.${dataset.domain}`;
  const purpose = dataset.purpose || (study.standardName === 'ADaM-IG' ? 'Analysis' : 'Tabulation');

  lines.push(`${p}<ItemGroupDef OID="${escXml(datasetOID)}"`);
  lines.push(`${p}${ind}Name="${escXml(dataset.name || dataset.domain)}"`);
  lines.push(`${p}${ind}Repeating="Yes"`);
  lines.push(`${p}${ind}IsReferenceData="${dataset.domainClass === 'Trial Design' ? 'Yes' : 'No'}"`);
  lines.push(`${p}${ind}SASDatasetName="${escXml(dataset.domain)}"`);
  lines.push(`${p}${ind}Purpose="${purpose}"`);
  lines.push(`${p}${ind}def:Structure="${escXml(dataset.structure)}"`);
  lines.push(`${p}${ind}def:Class="${escXml(dataset.domainClass)}"`);
  if (dataset.comment) {
    lines.push(`${p}${ind}def:CommentOID="COM.${escXml(dataset.domain)}"`);
  }
  lines.push(`${p}${ind}def:ArchiveLocationID="LF.${escXml(dataset.domain)}"`);
  lines.push(`${p}${ind}def:StandardOID="STD.1">`);

  // Description
  lines.push(`${p2}<Description>`);
  lines.push(`${p3}<TranslatedText xml:lang="en">${escXml(dataset.label)}</TranslatedText>`);
  lines.push(`${p2}</Description>`);

  // Variable references
  dataset.variables.forEach((variable, idx) => {
    const varOID = `IT.${dataset.domain}.${variable.name}`;
    const isKey = dataset.keySequence.includes(variable.name);
    const keySeqNum = isKey ? dataset.keySequence.indexOf(variable.name) + 1 : undefined;
    const mandatory = variable.core === 'Req' ? 'Yes' : 'No';

    let itemRefLine = `${p2}<ItemRef ItemOID="${escXml(varOID)}" OrderNumber="${idx + 1}" Mandatory="${mandatory}"`;
    if (keySeqNum !== undefined) {
      itemRefLine += ` KeySequence="${keySeqNum}"`;
    }
    itemRefLine += ` Role="${ROLE_MAP[variable.role] || 'Qualifier'}"`;
    if (variable.origin === 'Derived' && variable.derivationMethod) {
      itemRefLine += ` MethodOID="MT.${escXml(dataset.domain)}.${escXml(variable.name)}"`;
    }
    itemRefLine += '/>';
    lines.push(itemRefLine);
  });

  lines.push(`${p}</ItemGroupDef>`);
  return lines;
}

function generateItemDef(
  variable: SDTMVariableDefinition,
  dataset: DefineDatasetDefinition,
  ind: string,
  nl: string
): string[] {
  const lines: string[] = [];
  const p = ind.repeat(3);
  const p2 = p + ind;
  const p3 = p2 + ind;

  const varOID = `IT.${dataset.domain}.${variable.name}`;
  const dataType = DATA_TYPE_MAP[variable.dataType] || 'text';

  let itemDefLine = `${p}<ItemDef OID="${escXml(varOID)}"`;
  itemDefLine += ` Name="${escXml(variable.name)}"`;
  itemDefLine += ` SASFieldName="${escXml(variable.name)}"`;
  itemDefLine += ` DataType="${dataType}"`;
  if (variable.length) {
    itemDefLine += ` Length="${variable.length}"`;
  }
  if (variable.significantDigits) {
    itemDefLine += ` SignificantDigits="${variable.significantDigits}"`;
  }
  itemDefLine += '>';

  lines.push(itemDefLine);

  // Description
  lines.push(`${p2}<Description>`);
  lines.push(`${p3}<TranslatedText xml:lang="en">${escXml(variable.label)}</TranslatedText>`);
  lines.push(`${p2}</Description>`);

  // Code list reference
  if (variable.codeListOID) {
    lines.push(`${p2}<CodeListRef CodeListOID="${escXml(variable.codeListOID)}"/>`);
  }

  // Origin
  const originType = ORIGIN_TYPE_MAP[variable.origin] || 'Assigned';
  lines.push(`${p2}<def:Origin Type="${originType}">`);
  if (variable.originDescription) {
    lines.push(`${p3}<Description>`);
    lines.push(`${p3}${ind}<TranslatedText xml:lang="en">${escXml(variable.originDescription)}</TranslatedText>`);
    lines.push(`${p3}</Description>`);
  }
  lines.push(`${p2}</def:Origin>`);

  lines.push(`${p}</ItemDef>`);
  return lines;
}

function generateCodeListDef(
  codeList: SDTMCodeList,
  ind: string,
  nl: string
): string[] {
  const lines: string[] = [];
  const p = ind.repeat(3);
  const p2 = p + ind;
  const p3 = p2 + ind;

  const clOID = codeList.oid || `CL.${codeList.name}`;

  lines.push(`${p}<CodeList OID="${escXml(clOID)}" Name="${escXml(codeList.name)}" DataType="${codeList.dataType}">`);

  if (codeList.nciCodeListCode) {
    lines.push(`${p2}<Alias Context="nci:ExtCodeID" Name="${escXml(codeList.nciCodeListCode)}"/>`);
  }

  for (const item of codeList.items) {
    let itemLine = `${p2}<CodeListItem CodedValue="${escXml(item.codedValue)}"`;
    if (item.nciTermCode) {
      itemLine += ` def:ExtendedValue="${item.isExtension ? 'Yes' : 'No'}"`;
    }
    itemLine += '>';
    lines.push(itemLine);

    lines.push(`${p3}<Decode>`);
    lines.push(`${p3}${ind}<TranslatedText xml:lang="en">${escXml(item.decodedValue)}</TranslatedText>`);
    lines.push(`${p3}</Decode>`);

    if (item.nciTermCode) {
      lines.push(`${p3}<Alias Context="nci:ExtCodeID" Name="${escXml(item.nciTermCode)}"/>`);
    }

    lines.push(`${p2}</CodeListItem>`);
  }

  lines.push(`${p}</CodeList>`);
  return lines;
}

// =============================================================================
// HELPERS
// =============================================================================

interface VariableWithDataset {
  variable: SDTMVariableDefinition;
  dataset: DefineDatasetDefinition;
}

function collectAllVariables(datasets: DefineDatasetDefinition[]): VariableWithDataset[] {
  const seen = new Set<string>();
  const result: VariableWithDataset[] = [];

  for (const dataset of datasets) {
    for (const variable of dataset.variables) {
      const key = `${dataset.domain}.${variable.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ variable, dataset });
      }
    }
  }

  return result;
}

/**
 * Validate a Define-XML request before generation
 */
export function validateDefineXMLRequest(
  request: DefineXMLRequest
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Study metadata
  if (!request.study.studyOID) errors.push('Study OID is required');
  if (!request.study.studyName) errors.push('Study name is required');
  if (!request.study.protocolName) errors.push('Protocol name is required');

  // Datasets
  if (!request.datasets.length) {
    errors.push('At least one dataset definition is required');
  }

  for (const ds of request.datasets) {
    if (!ds.domain) errors.push(`Dataset "${ds.name}": Domain code is required`);
    if (!ds.variables.length) warnings.push(`Dataset "${ds.domain}": No variables defined`);
    if (!ds.keySequence.length) warnings.push(`Dataset "${ds.domain}": No key sequence defined`);
    if (!ds.structure) warnings.push(`Dataset "${ds.domain}": Structure description recommended`);

    // Check key variables exist
    for (const key of ds.keySequence) {
      if (!ds.variables.find(v => v.name === key)) {
        errors.push(`Dataset "${ds.domain}": Key variable "${key}" not found in variable list`);
      }
    }

    // Check required variables present
    const reqVars = ds.variables.filter(v => v.core === 'Req');
    if (!reqVars.length) {
      warnings.push(`Dataset "${ds.domain}": No required (Req) variables defined`);
    }

    // Check code list references exist
    for (const v of ds.variables) {
      if (v.codeListOID) {
        const found = request.codeLists.find(cl => cl.oid === v.codeListOID || `CL.${cl.name}` === v.codeListOID);
        if (!found) {
          warnings.push(`Variable "${ds.domain}.${v.name}": CodeList "${v.codeListOID}" not found in provided code lists`);
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Build a standard DM (Demographics) dataset definition with common variables
 */
export function buildDemographicsDataset(
  studyId: string,
  additionalVars: SDTMVariableDefinition[] = []
): DefineDatasetDefinition {
  const now = new Date().toISOString();
  const baseVars: SDTMVariableDefinition[] = [
    { id: 'dm-studyid', name: 'STUDYID', label: 'Study Identifier', domainCode: 'DM', role: 'Identifier', dataType: 'text', core: 'Req', origin: 'Assigned', length: 40, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-domain', name: 'DOMAIN', label: 'Domain Abbreviation', domainCode: 'DM', role: 'Identifier', dataType: 'text', core: 'Req', origin: 'Assigned', length: 2, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-usubjid', name: 'USUBJID', label: 'Unique Subject Identifier', domainCode: 'DM', role: 'Identifier', dataType: 'text', core: 'Req', origin: 'Derived', derivationMethod: 'Concatenation of STUDYID, "-", SITEID, "-", SUBJID', length: 40, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-subjid', name: 'SUBJID', label: 'Subject Identifier for the Study', domainCode: 'DM', role: 'Topic', dataType: 'text', core: 'Req', origin: 'CRF', length: 20, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-rfstdtc', name: 'RFSTDTC', label: 'Subject Reference Start Date/Time', domainCode: 'DM', role: 'Timing', dataType: 'datetime', core: 'Exp', origin: 'Derived', derivationMethod: 'Date of first dose of study drug', length: 19, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-rfendtc', name: 'RFENDTC', label: 'Subject Reference End Date/Time', domainCode: 'DM', role: 'Timing', dataType: 'datetime', core: 'Exp', origin: 'Derived', derivationMethod: 'Date of last dose of study drug', length: 19, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-siteid', name: 'SITEID', label: 'Study Site Identifier', domainCode: 'DM', role: 'Identifier', dataType: 'text', core: 'Req', origin: 'CRF', length: 20, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-brthdtc', name: 'BRTHDTC', label: 'Date/Time of Birth', domainCode: 'DM', role: 'Qualifier', dataType: 'date', core: 'Perm', origin: 'CRF', length: 10, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-age', name: 'AGE', label: 'Age', domainCode: 'DM', role: 'Qualifier', dataType: 'integer', core: 'Exp', origin: 'Derived', derivationMethod: 'Derived from BRTHDTC and RFSTDTC', length: 8, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-ageu', name: 'AGEU', label: 'Age Units', domainCode: 'DM', role: 'Qualifier', dataType: 'text', core: 'Exp', origin: 'Assigned', codeListOID: 'CL.AGEU', length: 10, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-sex', name: 'SEX', label: 'Sex', domainCode: 'DM', role: 'Qualifier', dataType: 'text', core: 'Req', origin: 'CRF', codeListOID: 'CL.SEX', length: 2, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-race', name: 'RACE', label: 'Race', domainCode: 'DM', role: 'Qualifier', dataType: 'text', core: 'Exp', origin: 'CRF', codeListOID: 'CL.RACE', length: 60, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-ethnic', name: 'ETHNIC', label: 'Ethnicity', domainCode: 'DM', role: 'Qualifier', dataType: 'text', core: 'Exp', origin: 'CRF', codeListOID: 'CL.ETHNIC', length: 40, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-armcd', name: 'ARMCD', label: 'Planned Arm Code', domainCode: 'DM', role: 'Qualifier', dataType: 'text', core: 'Req', origin: 'Assigned', length: 20, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-arm', name: 'ARM', label: 'Description of Planned Arm', domainCode: 'DM', role: 'Qualifier', dataType: 'text', core: 'Req', origin: 'Assigned', length: 200, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
    { id: 'dm-country', name: 'COUNTRY', label: 'Country', domainCode: 'DM', role: 'Qualifier', dataType: 'text', core: 'Req', origin: 'CRF', codeListOID: 'CL.COUNTRY', length: 3, isStandard: true, isCustom: false, sdtmigVersion: '3.4', createdAt: now, updatedAt: now },
  ];

  return {
    oid: 'IG.DM',
    domain: 'DM',
    name: 'dm',
    label: 'Demographics',
    domainClass: 'Special Purpose',
    structure: 'One record per subject',
    keySequence: ['STUDYID', 'USUBJID'],
    variables: [...baseVars, ...additionalVars],
    purpose: 'Tabulation',
  };
}
