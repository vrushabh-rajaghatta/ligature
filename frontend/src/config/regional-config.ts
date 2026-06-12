
// Regional Submission Configuration
// Defines requirements, formats, and validations per regulatory authority

export type Region = 'fda' | 'ema' | 'pmda' | 'hc' | 'nmpa';

export interface RegionalConfig {
  id: Region;
  name: string;
  fullName: string;
  gateway: {
    name: string;
    url: string;
    testUrl?: string;
    format: 'esg' | 'cesp' | 'gateway' | 'cta';
  };
  ectdVersion: '3.2.2' | '4.0';
  module1: {
    dtdVersion: string;
    requiredSections: string[];
    forms: {
      id: string;
      name: string;
      required: boolean;
      template?: string;
    }[];
  };
  fileNaming: {
    maxLength: number;
    allowedChars: RegExp;
    pattern: string;
  };
  validationRules: {
    maxPdfSize: number; // MB
    maxXmlSize: number; // MB
    requireDigitalSignature: boolean;
    checksumAlgorithm: 'md5' | 'sha256';
    requiresBookmarks: boolean;
    maxPageSize: { width: number; height: number }; // inches
  };
  submissionTypes: {
    id: string;
    name: string;
    code: string;
    description: string;
  }[];
  responseTimelines: {
    type: string;
    standardDays: number;
    priorityDays?: number;
  }[];
}

export const regionalConfigs: Record<Region, RegionalConfig> = {
  fda: {
    id: 'fda',
    name: 'FDA',
    fullName: 'U.S. Food and Drug Administration',
    gateway: {
      name: 'Electronic Submissions Gateway (ESG)',
      url: 'https://www.fda.gov/esg',
      testUrl: 'https://www.fda.gov/esg-test',
      format: 'esg',
    },
    ectdVersion: '4.0',
    module1: {
      dtdVersion: 'us-regional-v3-3',
      requiredSections: ['1.1', '1.2', '1.3.1'],
      forms: [
        { id: 'fda-356h', name: 'Form FDA 356h', required: true, template: '/templates/fda-356h.pdf' },
        { id: 'fda-1571', name: 'Form FDA 1571 (IND)', required: false },
        { id: 'fda-2252', name: 'Form FDA 2252', required: false },
        { id: 'fda-3674', name: 'Form FDA 3674 (ClinicalTrials.gov)', required: true },
      ],
    },
    fileNaming: {
      maxLength: 64,
      allowedChars: /^[a-z0-9\-]+$/,
      pattern: '{document-type}-{sequence}-{version}.pdf',
    },
    validationRules: {
      maxPdfSize: 100,
      maxXmlSize: 50,
      requireDigitalSignature: false,
      checksumAlgorithm: 'md5',
      requiresBookmarks: true,
      maxPageSize: { width: 8.5, height: 11 },
    },
    submissionTypes: [
      { id: 'orig', name: 'Original Application', code: 'orig', description: 'Initial NDA/BLA submission' },
      { id: 'amend', name: 'Amendment', code: 'amend', description: 'Amendment to pending application' },
      { id: 'suppl', name: 'Supplement', code: 'suppl', description: 'Supplement to approved application' },
      { id: 'ar', name: 'Annual Report', code: 'ar', description: 'Annual report submission' },
      { id: 'ir', name: 'Information Request Response', code: 'ir', description: 'Response to FDA IR/RTQ' },
      { id: 'fir', name: 'Final IR Response', code: 'fir', description: 'Final response to complete review' },
    ],
    responseTimelines: [
      { type: 'Standard NDA', standardDays: 180, priorityDays: 60 },
      { type: 'BLA', standardDays: 365 },
      { type: 'sNDA', standardDays: 180 },
      { type: 'IR Response', standardDays: 30 },
    ],
  },
  
  ema: {
    id: 'ema',
    name: 'EMA',
    fullName: 'European Medicines Agency',
    gateway: {
      name: 'Common European Submission Platform (CESP)',
      url: 'https://cesp.ema.europa.eu',
      format: 'cesp',
    },
    ectdVersion: '4.0',
    module1: {
      dtdVersion: 'eu-regional-v3-0',
      requiredSections: ['1.0', '1.2', '1.3.1'],
      forms: [
        { id: 'eu-form', name: 'EU Application Form', required: true },
        { id: 'eu-annex1', name: 'Annex 1 (SmPC)', required: true },
        { id: 'eu-mock-up', name: 'Mock-up', required: true },
        { id: 'eu-qp-declaration', name: 'QP Declaration', required: true },
      ],
    },
    fileNaming: {
      maxLength: 64,
      allowedChars: /^[a-z0-9\-]+$/,
      pattern: '{document-type}-{version}.pdf',
    },
    validationRules: {
      maxPdfSize: 100,
      maxXmlSize: 50,
      requireDigitalSignature: true,
      checksumAlgorithm: 'sha256',
      requiresBookmarks: true,
      maxPageSize: { width: 8.27, height: 11.69 }, // A4
    },
    submissionTypes: [
      { id: 'initial', name: 'Initial MAA', code: 'initial', description: 'Initial Marketing Authorization Application' },
      { id: 'var-ia', name: 'Variation Type IA', code: 'var-ia', description: 'Minor variation - notification' },
      { id: 'var-ib', name: 'Variation Type IB', code: 'var-ib', description: 'Minor variation - approval required' },
      { id: 'var-ii', name: 'Variation Type II', code: 'var-ii', description: 'Major variation' },
      { id: 'renewal', name: 'Renewal', code: 'renewal', description: '5-year renewal application' },
      { id: 'psur', name: 'PSUR', code: 'psur', description: 'Periodic Safety Update Report' },
    ],
    responseTimelines: [
      { type: 'Centralised Procedure', standardDays: 210 },
      { type: 'Type IA Variation', standardDays: 14 },
      { type: 'Type IB Variation', standardDays: 30 },
      { type: 'Type II Variation', standardDays: 90 },
      { type: 'Clock Stop Response', standardDays: 90 },
    ],
  },
  
  pmda: {
    id: 'pmda',
    name: 'PMDA',
    fullName: 'Pharmaceuticals and Medical Devices Agency (Japan)',
    gateway: {
      name: 'PMDA Gateway',
      url: 'https://gateway.pmda.go.jp',
      format: 'gateway',
    },
    ectdVersion: '4.0',
    module1: {
      dtdVersion: 'jp-regional-v2-0',
      requiredSections: ['1.1', '1.2', '1.5'],
      forms: [
        { id: 'jp-form-1', name: 'Application Form (様式)', required: true },
        { id: 'jp-certificate', name: 'GMP Certificate', required: true },
        { id: 'jp-sosei', name: 'Package Insert (添付文書)', required: true },
      ],
    },
    fileNaming: {
      maxLength: 64,
      allowedChars: /^[a-z0-9\-]+$/,
      pattern: '{document-type}-{version}.pdf',
    },
    validationRules: {
      maxPdfSize: 50,
      maxXmlSize: 30,
      requireDigitalSignature: true,
      checksumAlgorithm: 'sha256',
      requiresBookmarks: true,
      maxPageSize: { width: 8.27, height: 11.69 },
    },
    submissionTypes: [
      { id: 'new', name: 'New Drug Application', code: 'new', description: 'Initial J-NDA submission' },
      { id: 'partial', name: 'Partial Change', code: 'partial', description: 'Partial change application' },
      { id: 'minor', name: 'Minor Change', code: 'minor', description: 'Minor change notification' },
      { id: 'reexam', name: 'Re-examination', code: 'reexam', description: 'Re-examination application' },
    ],
    responseTimelines: [
      { type: 'Standard Review', standardDays: 365, priorityDays: 270 },
      { type: 'Partial Change', standardDays: 180 },
      { type: 'Query Response', standardDays: 90 },
    ],
  },
  
  hc: {
    id: 'hc',
    name: 'Health Canada',
    fullName: 'Health Canada',
    gateway: {
      name: 'Common Electronic Submissions Gateway',
      url: 'https://cta-dpe.hc-sc.gc.ca',
      format: 'cta',
    },
    ectdVersion: '3.2.2',
    module1: {
      dtdVersion: 'ca-regional-v2-0',
      requiredSections: ['1.1', '1.2', '1.3.1'],
      forms: [
        { id: 'hc-form', name: 'HC Form', required: true },
        { id: 'hc-fee', name: 'Fee Form', required: true },
      ],
    },
    fileNaming: {
      maxLength: 64,
      allowedChars: /^[a-z0-9\-]+$/,
      pattern: '{document-type}-{version}.pdf',
    },
    validationRules: {
      maxPdfSize: 100,
      maxXmlSize: 50,
      requireDigitalSignature: false,
      checksumAlgorithm: 'md5',
      requiresBookmarks: true,
      maxPageSize: { width: 8.5, height: 11 },
    },
    submissionTypes: [
      { id: 'nds', name: 'New Drug Submission', code: 'nds', description: 'Initial NDS submission' },
      { id: 'snds', name: 'Supplemental NDS', code: 'snds', description: 'Supplement to approved NDS' },
      { id: 'nc', name: 'Notifiable Change', code: 'nc', description: 'Notifiable change submission' },
      { id: 'din', name: 'DIN Application', code: 'din', description: 'Drug Identification Number application' },
    ],
    responseTimelines: [
      { type: 'Priority Review', standardDays: 180 },
      { type: 'Standard Review', standardDays: 300 },
      { type: 'NOC/c', standardDays: 200 },
    ],
  },
  
  nmpa: {
    id: 'nmpa',
    name: 'NMPA',
    fullName: 'National Medical Products Administration (China)',
    gateway: {
      name: 'NMPA eCTD Gateway',
      url: 'https://ectd.nmpa.gov.cn',
      format: 'gateway',
    },
    ectdVersion: '4.0',
    module1: {
      dtdVersion: 'cn-regional-v1-0',
      requiredSections: ['1.1', '1.2', '1.4'],
      forms: [
        { id: 'cn-form', name: 'Application Form (申请表)', required: true },
        { id: 'cn-cert', name: 'GMP Certificate', required: true },
        { id: 'cn-letter', name: 'Authorization Letter', required: true },
      ],
    },
    fileNaming: {
      maxLength: 64,
      allowedChars: /^[a-z0-9\-]+$/,
      pattern: '{document-type}-{version}.pdf',
    },
    validationRules: {
      maxPdfSize: 100,
      maxXmlSize: 50,
      requireDigitalSignature: true,
      checksumAlgorithm: 'sha256',
      requiresBookmarks: true,
      maxPageSize: { width: 8.27, height: 11.69 },
    },
    submissionTypes: [
      { id: 'nda', name: 'New Drug Application', code: 'nda', description: 'Initial NDA submission' },
      { id: 'anda', name: 'Generic Application', code: 'anda', description: 'Generic drug application' },
      { id: 'supplement', name: 'Supplement', code: 'supplement', description: 'Post-approval change' },
      { id: 'import', name: 'Import Registration', code: 'import', description: 'Imported drug registration' },
    ],
    responseTimelines: [
      { type: 'Priority Review', standardDays: 130 },
      { type: 'Standard Review', standardDays: 200 },
      { type: 'Supplement', standardDays: 120 },
    ],
  },
};

// Get config for a region
export function getRegionalConfig(region: Region): RegionalConfig {
  return regionalConfigs[region];
}

// Get all supported regions
export function getSupportedRegions(): Region[] {
  return Object.keys(regionalConfigs) as Region[];
}

// Check if a submission type is valid for a region
export function isValidSubmissionType(region: Region, typeId: string): boolean {
  return regionalConfigs[region].submissionTypes.some(t => t.id === typeId);
}

// Get required forms for a region
export function getRequiredForms(region: Region): RegionalConfig['module1']['forms'] {
  return regionalConfigs[region].module1.forms.filter(f => f.required);
}

// Get validation rules for a region
export function getValidationRules(region: Region): RegionalConfig['validationRules'] {
  return regionalConfigs[region].validationRules;
}
