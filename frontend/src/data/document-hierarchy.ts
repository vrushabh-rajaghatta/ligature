// Document Hierarchy Configuration - v145
// Supports both eCTD Module Structure and DIA EDM (Reference Model) views

export type HierarchyView = 'ectd' | 'edm';

// eCTD Module Structure (ICH M4)
export interface ECTDNode {
  id: string;
  module: string;
  title: string;
  description?: string;
  children?: ECTDNode[];
  documentTypes?: string[]; // Document categories that map here
}

// DIA EDM Reference Model
export interface EDMNode {
  id: string;
  zone: string;
  title: string;
  description?: string;
  children?: EDMNode[];
  documentTypes?: string[];
}

// eCTD Structure for regulatory submissions
export const ectdHierarchy: ECTDNode[] = [
  {
    id: 'module-1',
    module: '1',
    title: 'Administrative Information',
    description: 'Regional administrative information',
    children: [
      { id: 'm1-1', module: '1.1', title: 'Forms', documentTypes: ['administrative'] },
      { id: 'm1-2', module: '1.2', title: 'Cover Letters', documentTypes: ['correspondence'] },
      { id: 'm1-3', module: '1.3', title: 'Administrative Information', children: [
        { id: 'm1-3-1', module: '1.3.1', title: 'Contact/Sponsor Information' },
        { id: 'm1-3-2', module: '1.3.2', title: 'Field Copy Certification' },
        { id: 'm1-3-3', module: '1.3.3', title: 'Debarment Certification' },
        { id: 'm1-3-4', module: '1.3.4', title: 'Financial Certification' },
        { id: 'm1-3-5', module: '1.3.5', title: 'Patent Information' },
      ]},
      { id: 'm1-4', module: '1.4', title: 'References', documentTypes: ['reference'] },
      { id: 'm1-12', module: '1.12', title: 'Risk Evaluation', children: [
        { id: 'm1-12-1', module: '1.12.1', title: 'Risk Evaluation & Mitigation Strategy (REMS)' },
      ]},
      { id: 'm1-14', module: '1.14', title: 'Labeling', documentTypes: ['labeling'], children: [
        { id: 'm1-14-1', module: '1.14.1', title: 'Draft Labeling' },
        { id: 'm1-14-2', module: '1.14.2', title: 'Final Printed Labeling' },
        { id: 'm1-14-3', module: '1.14.3', title: 'Carton/Container Labeling' },
      ]},
    ]
  },
  {
    id: 'module-2',
    module: '2',
    title: 'Common Technical Document Summaries',
    description: 'CTD summaries and overviews',
    children: [
      { id: 'm2-2', module: '2.2', title: 'Introduction', documentTypes: ['regulatory'] },
      { id: 'm2-3', module: '2.3', title: 'Quality Overall Summary', documentTypes: ['quality', 'cmc'] },
      { id: 'm2-4', module: '2.4', title: 'Nonclinical Overview', documentTypes: ['nonclinical'] },
      { id: 'm2-5', module: '2.5', title: 'Clinical Overview', documentTypes: ['clinical', 'regulatory'] },
      { id: 'm2-6', module: '2.6', title: 'Nonclinical Written and Tabulated Summaries', documentTypes: ['nonclinical'], children: [
        { id: 'm2-6-1', module: '2.6.1', title: 'Introduction' },
        { id: 'm2-6-2', module: '2.6.2', title: 'Pharmacology Written Summary' },
        { id: 'm2-6-3', module: '2.6.3', title: 'Pharmacology Tabulated Summary' },
        { id: 'm2-6-4', module: '2.6.4', title: 'Pharmacokinetics Written Summary' },
        { id: 'm2-6-5', module: '2.6.5', title: 'Pharmacokinetics Tabulated Summary' },
        { id: 'm2-6-6', module: '2.6.6', title: 'Toxicology Written Summary' },
        { id: 'm2-6-7', module: '2.6.7', title: 'Toxicology Tabulated Summary' },
      ]},
      { id: 'm2-7', module: '2.7', title: 'Clinical Summary', documentTypes: ['clinical'], children: [
        { id: 'm2-7-1', module: '2.7.1', title: 'Summary of Biopharmaceutics and Pharmacokinetics' },
        { id: 'm2-7-2', module: '2.7.2', title: 'Summary of Clinical Pharmacology' },
        { id: 'm2-7-3', module: '2.7.3', title: 'Summary of Clinical Efficacy' },
        { id: 'm2-7-4', module: '2.7.4', title: 'Summary of Clinical Safety' },
        { id: 'm2-7-5', module: '2.7.5', title: 'Literature References' },
        { id: 'm2-7-6', module: '2.7.6', title: 'Synopses of Individual Studies' },
      ]},
    ]
  },
  {
    id: 'module-3',
    module: '3',
    title: 'Quality',
    description: 'Chemistry, Manufacturing and Controls (CMC)',
    documentTypes: ['quality', 'cmc', 'manufacturing'],
    children: [
      { id: 'm3-2', module: '3.2', title: 'Body of Data', children: [
        { id: 'm3-2-s', module: '3.2.S', title: 'Drug Substance', children: [
          { id: 'm3-2-s-1', module: '3.2.S.1', title: 'General Information' },
          { id: 'm3-2-s-2', module: '3.2.S.2', title: 'Manufacture' },
          { id: 'm3-2-s-3', module: '3.2.S.3', title: 'Characterization' },
          { id: 'm3-2-s-4', module: '3.2.S.4', title: 'Control of Drug Substance' },
          { id: 'm3-2-s-5', module: '3.2.S.5', title: 'Reference Standards' },
          { id: 'm3-2-s-6', module: '3.2.S.6', title: 'Container Closure System' },
          { id: 'm3-2-s-7', module: '3.2.S.7', title: 'Stability' },
        ]},
        { id: 'm3-2-p', module: '3.2.P', title: 'Drug Product', children: [
          { id: 'm3-2-p-1', module: '3.2.P.1', title: 'Description and Composition' },
          { id: 'm3-2-p-2', module: '3.2.P.2', title: 'Pharmaceutical Development' },
          { id: 'm3-2-p-3', module: '3.2.P.3', title: 'Manufacture' },
          { id: 'm3-2-p-4', module: '3.2.P.4', title: 'Control of Excipients' },
          { id: 'm3-2-p-5', module: '3.2.P.5', title: 'Control of Drug Product' },
          { id: 'm3-2-p-6', module: '3.2.P.6', title: 'Reference Standards' },
          { id: 'm3-2-p-7', module: '3.2.P.7', title: 'Container Closure System' },
          { id: 'm3-2-p-8', module: '3.2.P.8', title: 'Stability' },
        ]},
        { id: 'm3-2-a', module: '3.2.A', title: 'Appendices', children: [
          { id: 'm3-2-a-1', module: '3.2.A.1', title: 'Facilities and Equipment' },
          { id: 'm3-2-a-2', module: '3.2.A.2', title: 'Adventitious Agents' },
          { id: 'm3-2-a-3', module: '3.2.A.3', title: 'Novel Excipients' },
        ]},
        { id: 'm3-2-r', module: '3.2.R', title: 'Regional Information' },
      ]},
      { id: 'm3-3', module: '3.3', title: 'Literature References' },
    ]
  },
  {
    id: 'module-4',
    module: '4',
    title: 'Nonclinical Study Reports',
    description: 'Pharmacology, pharmacokinetics, and toxicology studies',
    documentTypes: ['nonclinical'],
    children: [
      { id: 'm4-2', module: '4.2', title: 'Study Reports', children: [
        { id: 'm4-2-1', module: '4.2.1', title: 'Pharmacology', children: [
          { id: 'm4-2-1-1', module: '4.2.1.1', title: 'Primary Pharmacodynamics' },
          { id: 'm4-2-1-2', module: '4.2.1.2', title: 'Secondary Pharmacodynamics' },
          { id: 'm4-2-1-3', module: '4.2.1.3', title: 'Safety Pharmacology' },
          { id: 'm4-2-1-4', module: '4.2.1.4', title: 'Pharmacodynamic Drug Interactions' },
        ]},
        { id: 'm4-2-2', module: '4.2.2', title: 'Pharmacokinetics', children: [
          { id: 'm4-2-2-1', module: '4.2.2.1', title: 'Analytical Methods and Validation Reports' },
          { id: 'm4-2-2-2', module: '4.2.2.2', title: 'Absorption' },
          { id: 'm4-2-2-3', module: '4.2.2.3', title: 'Distribution' },
          { id: 'm4-2-2-4', module: '4.2.2.4', title: 'Metabolism' },
          { id: 'm4-2-2-5', module: '4.2.2.5', title: 'Excretion' },
          { id: 'm4-2-2-6', module: '4.2.2.6', title: 'PK Drug Interactions' },
        ]},
        { id: 'm4-2-3', module: '4.2.3', title: 'Toxicology', children: [
          { id: 'm4-2-3-1', module: '4.2.3.1', title: 'Single-Dose Toxicity' },
          { id: 'm4-2-3-2', module: '4.2.3.2', title: 'Repeat-Dose Toxicity' },
          { id: 'm4-2-3-3', module: '4.2.3.3', title: 'Genotoxicity' },
          { id: 'm4-2-3-4', module: '4.2.3.4', title: 'Carcinogenicity', children: [
            { id: 'm4-2-3-4-1', module: '4.2.3.4.1', title: 'Long-term Studies' },
            { id: 'm4-2-3-4-2', module: '4.2.3.4.2', title: 'Short/Medium-term Studies' },
          ]},
          { id: 'm4-2-3-5', module: '4.2.3.5', title: 'Reproductive and Developmental Toxicity', children: [
            { id: 'm4-2-3-5-1', module: '4.2.3.5.1', title: 'Fertility and Early Embryonic Development' },
            { id: 'm4-2-3-5-2', module: '4.2.3.5.2', title: 'Embryo-Fetal Development' },
            { id: 'm4-2-3-5-3', module: '4.2.3.5.3', title: 'Pre- and Postnatal Development' },
          ]},
          { id: 'm4-2-3-6', module: '4.2.3.6', title: 'Local Tolerance' },
          { id: 'm4-2-3-7', module: '4.2.3.7', title: 'Other Toxicity Studies' },
        ]},
      ]},
      { id: 'm4-3', module: '4.3', title: 'Literature References' },
    ]
  },
  {
    id: 'module-5',
    module: '5',
    title: 'Clinical Study Reports',
    description: 'Clinical trial reports and analyses',
    documentTypes: ['clinical'],
    children: [
      { id: 'm5-2', module: '5.2', title: 'Tabular Listing of Clinical Studies' },
      { id: 'm5-3', module: '5.3', title: 'Clinical Study Reports', children: [
        { id: 'm5-3-1', module: '5.3.1', title: 'Reports of Biopharmaceutic Studies', children: [
          { id: 'm5-3-1-1', module: '5.3.1.1', title: 'Bioavailability (BA) Study Reports' },
          { id: 'm5-3-1-2', module: '5.3.1.2', title: 'Comparative BA and BE Study Reports' },
          { id: 'm5-3-1-3', module: '5.3.1.3', title: 'In Vitro-In Vivo Correlation Study Reports' },
          { id: 'm5-3-1-4', module: '5.3.1.4', title: 'Bioanalytical and Analytical Methods' },
        ]},
        { id: 'm5-3-2', module: '5.3.2', title: 'Reports of Studies Pertinent to PK Using Human Biomaterials' },
        { id: 'm5-3-3', module: '5.3.3', title: 'Reports of Human PK Studies', children: [
          { id: 'm5-3-3-1', module: '5.3.3.1', title: 'Healthy Subject PK and Initial Tolerability' },
          { id: 'm5-3-3-2', module: '5.3.3.2', title: 'Patient PK and Initial Tolerability' },
          { id: 'm5-3-3-3', module: '5.3.3.3', title: 'Intrinsic Factor PK' },
          { id: 'm5-3-3-4', module: '5.3.3.4', title: 'Extrinsic Factor PK' },
          { id: 'm5-3-3-5', module: '5.3.3.5', title: 'Population PK' },
        ]},
        { id: 'm5-3-4', module: '5.3.4', title: 'Reports of Human PD Studies', children: [
          { id: 'm5-3-4-1', module: '5.3.4.1', title: 'Healthy Subject PD and PK/PD' },
          { id: 'm5-3-4-2', module: '5.3.4.2', title: 'Patient PD and PK/PD' },
        ]},
        { id: 'm5-3-5', module: '5.3.5', title: 'Reports of Efficacy and Safety Studies', children: [
          { id: 'm5-3-5-1', module: '5.3.5.1', title: 'Study Reports of Controlled Clinical Studies' },
          { id: 'm5-3-5-2', module: '5.3.5.2', title: 'Study Reports of Uncontrolled Clinical Studies' },
          { id: 'm5-3-5-3', module: '5.3.5.3', title: 'Reports of Analyses of Data from >1 Study' },
          { id: 'm5-3-5-4', module: '5.3.5.4', title: 'Other Clinical Study Reports' },
        ]},
        { id: 'm5-3-6', module: '5.3.6', title: 'Reports of Post-Marketing Experience' },
        { id: 'm5-3-7', module: '5.3.7', title: 'Case Report Forms and Individual Patient Listings' },
      ]},
      { id: 'm5-4', module: '5.4', title: 'Literature References' },
    ]
  },
];

// DIA EDM Reference Model (functional organization)
export const edmHierarchy: EDMNode[] = [
  {
    id: 'edm-clinical',
    zone: 'Clinical',
    title: 'Clinical Documents',
    description: 'All clinical development and trial documents',
    children: [
      { 
        id: 'edm-clinical-protocols', 
        zone: 'Clinical', 
        title: 'Protocols', 
        documentTypes: ['clinical'],
        children: [
          { id: 'edm-protocols-phase1', zone: 'Clinical', title: 'Phase 1 Protocols' },
          { id: 'edm-protocols-phase2', zone: 'Clinical', title: 'Phase 2 Protocols' },
          { id: 'edm-protocols-phase3', zone: 'Clinical', title: 'Phase 3 Protocols' },
          { id: 'edm-protocols-amendments', zone: 'Clinical', title: 'Protocol Amendments' },
        ]
      },
      { 
        id: 'edm-clinical-reports', 
        zone: 'Clinical', 
        title: 'Study Reports',
        documentTypes: ['clinical'],
        children: [
          { id: 'edm-reports-csr', zone: 'Clinical', title: 'Clinical Study Reports (CSR)' },
          { id: 'edm-reports-interim', zone: 'Clinical', title: 'Interim Reports' },
          { id: 'edm-reports-synopses', zone: 'Clinical', title: 'Study Synopses' },
        ]
      },
      { 
        id: 'edm-clinical-ib', 
        zone: 'Clinical', 
        title: "Investigator's Brochure",
        documentTypes: ['clinical'],
      },
      { 
        id: 'edm-clinical-icf', 
        zone: 'Clinical', 
        title: 'Informed Consent Forms',
        documentTypes: ['clinical'],
      },
    ]
  },
  {
    id: 'edm-safety',
    zone: 'Safety',
    title: 'Safety Documents',
    description: 'Pharmacovigilance and safety reports',
    children: [
      { 
        id: 'edm-safety-dsur', 
        zone: 'Safety', 
        title: 'Development Safety Update Reports',
        documentTypes: ['safety'],
      },
      { 
        id: 'edm-safety-rmp', 
        zone: 'Safety', 
        title: 'Risk Management Plans',
        documentTypes: ['safety'],
      },
      { 
        id: 'edm-safety-pbrer', 
        zone: 'Safety', 
        title: 'Periodic Benefit-Risk Evaluation Reports',
        documentTypes: ['safety'],
      },
      { 
        id: 'edm-safety-signal', 
        zone: 'Safety', 
        title: 'Signal Detection & Evaluation',
        documentTypes: ['safety'],
      },
      {
        id: 'edm-safety-aggregate',
        zone: 'Safety',
        title: 'Aggregate Reports',
        documentTypes: ['safety'],
        children: [
          { id: 'edm-safety-psur', zone: 'Safety', title: 'PSURs/PSBRERs' },
          { id: 'edm-safety-adesum', zone: 'Safety', title: 'ADE Summaries' },
        ]
      }
    ]
  },
  {
    id: 'edm-regulatory',
    zone: 'Regulatory',
    title: 'Regulatory Documents',
    description: 'Submissions and health authority correspondence',
    children: [
      { 
        id: 'edm-reg-submissions', 
        zone: 'Regulatory', 
        title: 'Submissions',
        documentTypes: ['regulatory'],
        children: [
          { id: 'edm-sub-ind', zone: 'Regulatory', title: 'INDs / IMPDs / CTAs' },
          { id: 'edm-sub-nda', zone: 'Regulatory', title: 'NDAs / MAAs / BLAs' },
          { id: 'edm-sub-supplements', zone: 'Regulatory', title: 'Supplements / Variations' },
          { id: 'edm-sub-annual', zone: 'Regulatory', title: 'Annual Reports' },
        ]
      },
      { 
        id: 'edm-reg-correspondence', 
        zone: 'Regulatory', 
        title: 'Health Authority Correspondence',
        documentTypes: ['correspondence'],
        children: [
          { id: 'edm-corr-meetings', zone: 'Regulatory', title: 'Meeting Requests & Minutes' },
          { id: 'edm-corr-questions', zone: 'Regulatory', title: 'Information Requests & HAQs' },
          { id: 'edm-corr-responses', zone: 'Regulatory', title: 'Response Documents' },
        ]
      },
      { 
        id: 'edm-reg-labeling', 
        zone: 'Regulatory', 
        title: 'Labeling',
        documentTypes: ['labeling'],
        children: [
          { id: 'edm-label-uspi', zone: 'Regulatory', title: 'US Prescribing Information' },
          { id: 'edm-label-smpc', zone: 'Regulatory', title: 'EU SmPC' },
          { id: 'edm-label-pil', zone: 'Regulatory', title: 'Patient Information Leaflets' },
          { id: 'edm-label-ccds', zone: 'Regulatory', title: 'Company Core Data Sheet' },
        ]
      },
      {
        id: 'edm-reg-ctd',
        zone: 'Regulatory',
        title: 'CTD Summaries',
        documentTypes: ['regulatory'],
        children: [
          { id: 'edm-ctd-m25', zone: 'Regulatory', title: 'Module 2.5 Clinical Overview' },
          { id: 'edm-ctd-m27', zone: 'Regulatory', title: 'Module 2.7 Clinical Summary' },
        ]
      }
    ]
  },
  {
    id: 'edm-quality',
    zone: 'Quality/CMC',
    title: 'Quality & CMC Documents',
    description: 'Chemistry, Manufacturing and Controls',
    children: [
      { 
        id: 'edm-cmc-ds', 
        zone: 'Quality/CMC', 
        title: 'Drug Substance',
        documentTypes: ['cmc', 'manufacturing'],
      },
      { 
        id: 'edm-cmc-dp', 
        zone: 'Quality/CMC', 
        title: 'Drug Product',
        documentTypes: ['cmc', 'manufacturing'],
      },
      { 
        id: 'edm-cmc-stability', 
        zone: 'Quality/CMC', 
        title: 'Stability Data',
        documentTypes: ['quality'],
      },
      { 
        id: 'edm-cmc-specs', 
        zone: 'Quality/CMC', 
        title: 'Specifications & Methods',
        documentTypes: ['quality'],
      },
      {
        id: 'edm-cmc-batch',
        zone: 'Quality/CMC',
        title: 'Batch Records',
        documentTypes: ['manufacturing'],
      }
    ]
  },
  {
    id: 'edm-nonclinical',
    zone: 'Nonclinical',
    title: 'Nonclinical Documents',
    description: 'Preclinical and toxicology studies',
    children: [
      { 
        id: 'edm-nc-pharm', 
        zone: 'Nonclinical', 
        title: 'Pharmacology',
        documentTypes: ['nonclinical'],
      },
      { 
        id: 'edm-nc-pk', 
        zone: 'Nonclinical', 
        title: 'Pharmacokinetics',
        documentTypes: ['nonclinical'],
      },
      { 
        id: 'edm-nc-tox', 
        zone: 'Nonclinical', 
        title: 'Toxicology',
        documentTypes: ['nonclinical'],
        children: [
          { id: 'edm-tox-acute', zone: 'Nonclinical', title: 'Acute Toxicity' },
          { id: 'edm-tox-repeat', zone: 'Nonclinical', title: 'Repeat-Dose Toxicity' },
          { id: 'edm-tox-geno', zone: 'Nonclinical', title: 'Genotoxicity' },
          { id: 'edm-tox-repro', zone: 'Nonclinical', title: 'Reproductive Toxicity' },
          { id: 'edm-tox-carc', zone: 'Nonclinical', title: 'Carcinogenicity' },
        ]
      },
    ]
  },
  {
    id: 'edm-admin',
    zone: 'Administrative',
    title: 'Administrative Documents',
    description: 'Training, SOPs, and reference materials',
    children: [
      { 
        id: 'edm-admin-sops', 
        zone: 'Administrative', 
        title: 'Standard Operating Procedures',
        documentTypes: ['administrative'],
      },
      { 
        id: 'edm-admin-training', 
        zone: 'Administrative', 
        title: 'Training Materials',
        documentTypes: ['training'],
      },
      { 
        id: 'edm-admin-reference', 
        zone: 'Administrative', 
        title: 'Reference Documents',
        documentTypes: ['reference'],
      },
    ]
  },
];

// Product hierarchy wrapper
export interface ProductHierarchy {
  productId: string;
  productName: string;
  productCode: string;
  therapeuticArea: string;
  modality: string;
  hierarchy: ECTDNode[] | EDMNode[];
}

// Default product for demo
export const defaultProduct: Omit<ProductHierarchy, 'hierarchy'> = {
  productId: 'prod-lig2847',
  productName: 'Nexavant (LIG-2847)',
  productCode: 'LIG-2847',
  therapeuticArea: 'Oncology',
  modality: 'Small Molecule',
};

// Document type to hierarchy node mapping helpers
export function mapDocumentToECTD(category: string, title: string): string[] {
  // Returns array of possible eCTD module IDs for a document
  const mappings: Record<string, string[]> = {
    'regulatory': ['m2-2', 'm2-5'],
    'clinical': ['m2-5', 'm2-7', 'm5-3-5-1'],
    'safety': ['m2-7-4'],
    'quality': ['m2-3', 'm3-2-s', 'm3-2-p'],
    'cmc': ['m2-3', 'm3-2-s', 'm3-2-p'],
    'manufacturing': ['m3-2-s-2', 'm3-2-p-3'],
    'nonclinical': ['m2-4', 'm2-6', 'm4-2'],
    'labeling': ['m1-14'],
    'correspondence': ['m1-2'],
    'administrative': ['m1-1', 'm1-3'],
  };
  
  // Additional title-based mapping
  if (title.toLowerCase().includes('dsur')) return ['m2-7-4', 'm5-3-6'];
  if (title.toLowerCase().includes('investigator') && title.toLowerCase().includes('brochure')) return ['m5-3-5-1'];
  if (title.toLowerCase().includes('protocol')) return ['m5-3-5-1'];
  if (title.toLowerCase().includes('clinical study report') || title.toLowerCase().includes('csr')) return ['m5-3-5-1'];
  if (title.toLowerCase().includes('module 2.5') || title.toLowerCase().includes('clinical overview')) return ['m2-5'];
  if (title.toLowerCase().includes('uspi') || title.toLowerCase().includes('prescribing information')) return ['m1-14-2'];
  if (title.toLowerCase().includes('risk management')) return ['m1-12-1'];
  
  return mappings[category] || ['m1-4'];
}

export function mapDocumentToEDM(category: string, title: string): string[] {
  // Returns array of possible EDM zone IDs for a document
  const mappings: Record<string, string[]> = {
    'regulatory': ['edm-reg-submissions', 'edm-reg-ctd'],
    'clinical': ['edm-clinical-reports', 'edm-clinical-protocols'],
    'safety': ['edm-safety-dsur', 'edm-safety-rmp'],
    'quality': ['edm-cmc-specs', 'edm-cmc-stability'],
    'cmc': ['edm-cmc-ds', 'edm-cmc-dp'],
    'manufacturing': ['edm-cmc-batch'],
    'nonclinical': ['edm-nc-pharm', 'edm-nc-pk', 'edm-nc-tox'],
    'labeling': ['edm-reg-labeling'],
    'correspondence': ['edm-reg-correspondence'],
    'administrative': ['edm-admin-sops'],
    'training': ['edm-admin-training'],
    'reference': ['edm-admin-reference'],
  };
  
  // Additional title-based mapping
  if (title.toLowerCase().includes('dsur')) return ['edm-safety-dsur'];
  if (title.toLowerCase().includes('investigator') && title.toLowerCase().includes('brochure')) return ['edm-clinical-ib'];
  if (title.toLowerCase().includes('protocol')) return ['edm-clinical-protocols'];
  if (title.toLowerCase().includes('clinical study report') || title.toLowerCase().includes('csr')) return ['edm-clinical-reports'];
  if (title.toLowerCase().includes('module 2.5') || title.toLowerCase().includes('clinical overview')) return ['edm-reg-ctd'];
  if (title.toLowerCase().includes('uspi') || title.toLowerCase().includes('prescribing information')) return ['edm-label-uspi'];
  if (title.toLowerCase().includes('risk management')) return ['edm-safety-rmp'];
  
  return mappings[category] || ['edm-admin-reference'];
}
