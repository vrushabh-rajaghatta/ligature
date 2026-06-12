
// eCTD Data Model - Supports both v3.2.2 and v4.0

export type ECTDVersion = '3.2.2' | '4.0';

export interface ECTDApplication {
  id: string;
  type: 'NDA' | 'BLA' | 'ANDA' | 'IND' | 'sNDA' | 'sBLA' | 'MAA' | 'JNDA';
  number: string;
  sponsor: string;
  productName: string;
  substanceName: string;
  indication: string;
  ectdVersion: ECTDVersion;
  archivePath: string;
  sequences: ECTDSequence[];
  correspondence: CorrespondenceThread[];
  // Extended fields for filtering
  productId?: string;
  region?: string;
  agency?: string;
  status?: string;
  pdfuaDate?: string;
}

export interface ECTDSequence {
  sequenceNumber: string;
  submissionType: string;
  submissionDate: string;
  description: string;
  status: 'draft' | 'validated' | 'submitted' | 'acknowledged' | 'under-review' | 'approved';
  documents: ECTDDocument[];
  modules: ECTDModule[];
}

export interface ECTDModule {
  number: string; // '1', '2', '3', '4', '5'
  name: string;
  sections: ECTDSection[];
}

export interface ECTDSection {
  id: string;
  number: string; // e.g., '2.2', '3.2.P', '5.3'
  name: string;
  documents: ECTDDocument[];
  subsections?: ECTDSection[];
}

export interface ECTDDocument {
  id: string;
  title: string;
  filePath: string;
  operation: 'new' | 'replace' | 'append' | 'delete';
  checksum: string;
  checksumType: 'md5' | 'sha256';
  module: string;
  section?: string;
  fileType: 'pdf' | 'xml' | 'xpt' | 'other';
  fileSize?: number;
}

export interface CorrespondenceThread {
  id: string;
  type: 'IR' | 'RTF' | 'CRL' | 'acknowledgment' | 'other';
  subject: string;
  relatedSequence?: string;
  relatedModule?: string;
  relatedSection?: string;
  status: 'open' | 'responded' | 'closed';
  messages: CorrespondenceMessage[];
}

export interface CorrespondenceMessage {
  id: string;
  from: 'FDA' | 'EMA' | 'PMDA' | 'Sponsor';
  date: string;
  subject: string;
  documentPath: string;
  summary?: string;
}

// CTD Module definitions
export const CTD_MODULES: Record<string, { name: string; color: string }> = {
  '1': { name: 'Regional Administrative Information', color: '#EF4444' }, // red
  '2': { name: 'Common Technical Document Summaries', color: '#F59E0B' }, // amber
  '3': { name: 'Quality', color: '#10B981' }, // green
  '4': { name: 'Nonclinical Study Reports', color: '#7C3AED' }, // purple
  '5': { name: 'Clinical Study Reports', color: '#1E90FF' }, // blue
};

// Complete ICH CTD Structure
export interface CTDNode {
  id: string;
  name: string;
  children?: CTDNode[];
}

export const CTD_STRUCTURE: Record<string, CTDNode> = {
  '1': {
    id: '1',
    name: 'Regional Administrative Information',
    children: [
      { id: '1.1', name: 'Forms', children: [
        { id: '1.1.1', name: 'Form FDA 356h' },
        { id: '1.1.2', name: 'Form FDA 1571' },
        { id: '1.1.3', name: 'Form FDA 1572' },
      ]},
      { id: '1.2', name: 'Cover Letter' },
      { id: '1.3', name: 'Administrative Information', children: [
        { id: '1.3.1', name: 'Contact/Sponsor Information' },
        { id: '1.3.2', name: 'Field Copy Certification' },
        { id: '1.3.3', name: 'Debarment Certification' },
        { id: '1.3.4', name: 'Financial Certification' },
        { id: '1.3.5', name: 'Patent and Exclusivity' },
      ]},
      { id: '1.4', name: 'References' },
      { id: '1.5', name: 'Application Status' },
      { id: '1.12', name: "Reviewer's Guide" },
      { id: '1.14', name: 'Labeling', children: [
        { id: '1.14.1', name: 'Prescribing Information' },
        { id: '1.14.2', name: 'Patient Labeling' },
        { id: '1.14.3', name: 'Container/Carton Labels' },
      ]},
    ]
  },
  '2': {
    id: '2',
    name: 'Common Technical Document Summaries',
    children: [
      { id: '2.1', name: 'CTD Table of Contents' },
      { id: '2.2', name: 'CTD Introduction' },
      { id: '2.3', name: 'Quality Overall Summary' },
      { id: '2.4', name: 'Nonclinical Overview' },
      { id: '2.5', name: 'Clinical Overview' },
      { id: '2.6', name: 'Nonclinical Written and Tabulated Summaries', children: [
        { id: '2.6.1', name: 'Introduction' },
        { id: '2.6.2', name: 'Pharmacology Written Summary' },
        { id: '2.6.3', name: 'Pharmacology Tabulated Summary' },
        { id: '2.6.4', name: 'Pharmacokinetics Written Summary' },
        { id: '2.6.5', name: 'Pharmacokinetics Tabulated Summary' },
        { id: '2.6.6', name: 'Toxicology Written Summary' },
        { id: '2.6.7', name: 'Toxicology Tabulated Summary' },
      ]},
      { id: '2.7', name: 'Clinical Summary', children: [
        { id: '2.7.1', name: 'Summary of Biopharmaceutic Studies' },
        { id: '2.7.2', name: 'Summary of Clinical Pharmacology Studies' },
        { id: '2.7.3', name: 'Summary of Clinical Efficacy' },
        { id: '2.7.4', name: 'Summary of Clinical Safety' },
        { id: '2.7.5', name: 'Literature References' },
        { id: '2.7.6', name: 'Synopses of Individual Studies' },
      ]},
    ]
  },
  '3': {
    id: '3',
    name: 'Quality',
    children: [
      { id: '3.1', name: 'Table of Contents' },
      { id: '3.2', name: 'Body of Data', children: [
        { id: '3.2.S', name: 'Drug Substance', children: [
          { id: '3.2.S.1', name: 'General Information', children: [
            { id: '3.2.S.1.1', name: 'Nomenclature' },
            { id: '3.2.S.1.2', name: 'Structure' },
            { id: '3.2.S.1.3', name: 'General Properties' },
          ]},
          { id: '3.2.S.2', name: 'Manufacture', children: [
            { id: '3.2.S.2.1', name: 'Manufacturer(s)' },
            { id: '3.2.S.2.2', name: 'Description of Manufacturing Process' },
            { id: '3.2.S.2.3', name: 'Control of Materials' },
            { id: '3.2.S.2.4', name: 'Controls of Critical Steps' },
            { id: '3.2.S.2.5', name: 'Process Validation' },
            { id: '3.2.S.2.6', name: 'Manufacturing Process Development' },
          ]},
          { id: '3.2.S.3', name: 'Characterisation', children: [
            { id: '3.2.S.3.1', name: 'Elucidation of Structure' },
            { id: '3.2.S.3.2', name: 'Impurities' },
          ]},
          { id: '3.2.S.4', name: 'Control of Drug Substance', children: [
            { id: '3.2.S.4.1', name: 'Specification' },
            { id: '3.2.S.4.2', name: 'Analytical Procedures' },
            { id: '3.2.S.4.3', name: 'Validation of Analytical Procedures' },
            { id: '3.2.S.4.4', name: 'Batch Analyses' },
            { id: '3.2.S.4.5', name: 'Justification of Specification' },
          ]},
          { id: '3.2.S.5', name: 'Reference Standards' },
          { id: '3.2.S.6', name: 'Container Closure System' },
          { id: '3.2.S.7', name: 'Stability', children: [
            { id: '3.2.S.7.1', name: 'Stability Summary' },
            { id: '3.2.S.7.2', name: 'Post-Approval Stability Protocol' },
            { id: '3.2.S.7.3', name: 'Stability Data' },
          ]},
        ]},
        { id: '3.2.P', name: 'Drug Product', children: [
          { id: '3.2.P.1', name: 'Description and Composition' },
          { id: '3.2.P.2', name: 'Pharmaceutical Development', children: [
            { id: '3.2.P.2.1', name: 'Components of Drug Product' },
            { id: '3.2.P.2.2', name: 'Drug Product' },
            { id: '3.2.P.2.3', name: 'Manufacturing Process Development' },
            { id: '3.2.P.2.4', name: 'Container Closure System' },
            { id: '3.2.P.2.5', name: 'Microbiological Attributes' },
            { id: '3.2.P.2.6', name: 'Compatibility' },
          ]},
          { id: '3.2.P.3', name: 'Manufacture', children: [
            { id: '3.2.P.3.1', name: 'Manufacturer(s)' },
            { id: '3.2.P.3.2', name: 'Batch Formula' },
            { id: '3.2.P.3.3', name: 'Description of Manufacturing Process' },
            { id: '3.2.P.3.4', name: 'Controls of Critical Steps' },
            { id: '3.2.P.3.5', name: 'Process Validation' },
          ]},
          { id: '3.2.P.4', name: 'Control of Excipients', children: [
            { id: '3.2.P.4.1', name: 'Specifications' },
            { id: '3.2.P.4.2', name: 'Analytical Procedures' },
            { id: '3.2.P.4.3', name: 'Validation of Analytical Procedures' },
            { id: '3.2.P.4.4', name: 'Justification of Specifications' },
            { id: '3.2.P.4.5', name: 'Excipients of Human or Animal Origin' },
            { id: '3.2.P.4.6', name: 'Novel Excipients' },
          ]},
          { id: '3.2.P.5', name: 'Control of Drug Product', children: [
            { id: '3.2.P.5.1', name: 'Specification' },
            { id: '3.2.P.5.2', name: 'Analytical Procedures' },
            { id: '3.2.P.5.3', name: 'Validation of Analytical Procedures' },
            { id: '3.2.P.5.4', name: 'Batch Analyses' },
            { id: '3.2.P.5.5', name: 'Characterisation of Impurities' },
            { id: '3.2.P.5.6', name: 'Justification of Specification' },
          ]},
          { id: '3.2.P.6', name: 'Reference Standards' },
          { id: '3.2.P.7', name: 'Container Closure System' },
          { id: '3.2.P.8', name: 'Stability', children: [
            { id: '3.2.P.8.1', name: 'Stability Summary' },
            { id: '3.2.P.8.2', name: 'Post-Approval Stability Protocol' },
            { id: '3.2.P.8.3', name: 'Stability Data' },
          ]},
        ]},
        { id: '3.2.A', name: 'Appendices', children: [
          { id: '3.2.A.1', name: 'Facilities and Equipment' },
          { id: '3.2.A.2', name: 'Adventitious Agents Safety Evaluation' },
          { id: '3.2.A.3', name: 'Excipients' },
        ]},
        { id: '3.2.R', name: 'Regional Information' },
      ]},
      { id: '3.3', name: 'Literature References' },
    ]
  },
  '4': {
    id: '4',
    name: 'Nonclinical Study Reports',
    children: [
      { id: '4.1', name: 'Table of Contents' },
      { id: '4.2', name: 'Study Reports', children: [
        { id: '4.2.1', name: 'Pharmacology', children: [
          { id: '4.2.1.1', name: 'Primary Pharmacodynamics' },
          { id: '4.2.1.2', name: 'Secondary Pharmacodynamics' },
          { id: '4.2.1.3', name: 'Safety Pharmacology' },
          { id: '4.2.1.4', name: 'Pharmacodynamic Drug Interactions' },
        ]},
        { id: '4.2.2', name: 'Pharmacokinetics', children: [
          { id: '4.2.2.1', name: 'Analytical Methods and Validation' },
          { id: '4.2.2.2', name: 'Absorption' },
          { id: '4.2.2.3', name: 'Distribution' },
          { id: '4.2.2.4', name: 'Metabolism' },
          { id: '4.2.2.5', name: 'Excretion' },
          { id: '4.2.2.6', name: 'PK Drug Interactions' },
          { id: '4.2.2.7', name: 'Other PK Studies' },
        ]},
        { id: '4.2.3', name: 'Toxicology', children: [
          { id: '4.2.3.1', name: 'Single-Dose Toxicity' },
          { id: '4.2.3.2', name: 'Repeat-Dose Toxicity' },
          { id: '4.2.3.3', name: 'Genotoxicity', children: [
            { id: '4.2.3.3.1', name: 'In Vitro' },
            { id: '4.2.3.3.2', name: 'In Vivo' },
          ]},
          { id: '4.2.3.4', name: 'Carcinogenicity', children: [
            { id: '4.2.3.4.1', name: 'Long-Term Studies' },
            { id: '4.2.3.4.2', name: 'Short/Medium-Term Studies' },
            { id: '4.2.3.4.3', name: 'Other Studies' },
          ]},
          { id: '4.2.3.5', name: 'Reproductive and Developmental Toxicity', children: [
            { id: '4.2.3.5.1', name: 'Fertility and Early Embryonic Development' },
            { id: '4.2.3.5.2', name: 'Embryo-Fetal Development' },
            { id: '4.2.3.5.3', name: 'Prenatal and Postnatal Development' },
            { id: '4.2.3.5.4', name: 'Studies in Juveniles' },
          ]},
          { id: '4.2.3.6', name: 'Local Tolerance' },
          { id: '4.2.3.7', name: 'Other Toxicity Studies', children: [
            { id: '4.2.3.7.1', name: 'Antigenicity' },
            { id: '4.2.3.7.2', name: 'Immunotoxicity' },
            { id: '4.2.3.7.3', name: 'Mechanistic Studies' },
            { id: '4.2.3.7.4', name: 'Dependence' },
            { id: '4.2.3.7.5', name: 'Metabolites' },
            { id: '4.2.3.7.6', name: 'Impurities' },
            { id: '4.2.3.7.7', name: 'Other' },
          ]},
        ]},
      ]},
      { id: '4.3', name: 'Literature References' },
    ]
  },
  '5': {
    id: '5',
    name: 'Clinical Study Reports',
    children: [
      { id: '5.1', name: 'Table of Contents' },
      { id: '5.2', name: 'Tabular Listing of All Clinical Studies' },
      { id: '5.3', name: 'Clinical Study Reports', children: [
        { id: '5.3.1', name: 'Reports of Biopharmaceutic Studies', children: [
          { id: '5.3.1.1', name: 'Bioavailability (BA) Studies' },
          { id: '5.3.1.2', name: 'Comparative BA and Bioequivalence Studies' },
          { id: '5.3.1.3', name: 'In Vitro-In Vivo Correlation Studies' },
          { id: '5.3.1.4', name: 'Bioanalytical and Analytical Methods' },
        ]},
        { id: '5.3.2', name: 'Reports of Studies Pertinent to PK Using Human Biomaterials', children: [
          { id: '5.3.2.1', name: 'Plasma Protein Binding Studies' },
          { id: '5.3.2.2', name: 'Hepatic Metabolism and Drug Interaction Studies' },
          { id: '5.3.2.3', name: 'Studies Using Other Human Biomaterials' },
        ]},
        { id: '5.3.3', name: 'Reports of Human PK Studies', children: [
          { id: '5.3.3.1', name: 'Healthy Subject PK and Initial Tolerability Studies' },
          { id: '5.3.3.2', name: 'Patient PK and Initial Tolerability Studies' },
          { id: '5.3.3.3', name: 'Intrinsic Factor PK Studies' },
          { id: '5.3.3.4', name: 'Extrinsic Factor PK Studies' },
          { id: '5.3.3.5', name: 'Population PK Studies' },
        ]},
        { id: '5.3.4', name: 'Reports of Human PD Studies', children: [
          { id: '5.3.4.1', name: 'Healthy Subject PD and PK/PD Studies' },
          { id: '5.3.4.2', name: 'Patient PD and PK/PD Studies' },
        ]},
        { id: '5.3.5', name: 'Reports of Efficacy and Safety Studies', children: [
          { id: '5.3.5.1', name: 'Study Reports of Controlled Clinical Studies' },
          { id: '5.3.5.2', name: 'Study Reports of Uncontrolled Clinical Studies' },
          { id: '5.3.5.3', name: 'Reports of Analyses of Data from More than One Study' },
          { id: '5.3.5.4', name: 'Other Clinical Study Reports' },
        ]},
        { id: '5.3.6', name: 'Reports of Postmarketing Experience' },
        { id: '5.3.7', name: 'Case Report Forms and Individual Patient Listings' },
      ]},
      { id: '5.4', name: 'Literature References' },
    ]
  }
};

// Helper to find section by path (e.g., "3.2.S.4.2")
export function findCTDSection(path: string): CTDNode | undefined {
  const parts = path.split('.');
  const moduleNum = parts[0];
  let current: CTDNode | undefined = CTD_STRUCTURE[moduleNum];
  
  if (!current) return undefined;
  
  for (let i = 1; i < parts.length && current; i++) {
    const searchId = parts.slice(0, i + 1).join('.');
    current = current.children?.find(c => c.id === searchId || c.id.endsWith(parts[i]));
  }
  
  return current;
}

// Section name mappings for v3.2.2 (legacy support)
export const SECTION_NAMES_V32: Record<string, string> = {
  'm1-1-forms': 'Forms',
  'm1-2-cover-letters': 'Cover Letters',
  'm1-2-1-reviewers-guide': "Reviewer's Guide",
  'm2-2-introduction': 'Introduction',
  'm2-3-quality-overall-summary': 'Quality Overall Summary',
  'm2-4-nonclinical-overview': 'Nonclinical Overview',
  'm2-5-clinical-overview': 'Clinical Overview',
  'm2-6-nonclinical-written-summaries': 'Nonclinical Written Summaries',
  'm2-7-clinical-summary': 'Clinical Summary',
  'm3-2-body-of-data': 'Body of Data',
  'm3-2-p-drug-product': 'Drug Product',
  'm3-2-s-drug-substance': 'Drug Substance',
  'm5-3-clinical-study-reports': 'Clinical Study Reports',
};
