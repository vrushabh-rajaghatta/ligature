

/**
 * eCTD Adapter - Transforms Portfolio Store data into ECTDApplication format
 * 
 * This adapter bridges the gap between Ligature's persistent Zustand stores
 * and the eCTD data structures used by SubmissionsScreen. It allows the
 * Submissions module to read from the same source of truth as Portfolio
 * and ProgramDetailScreen without rewriting existing components.
 */

import { useMemo } from 'react';
import { 
  usePortfolioStore, 
  usePrograms, 
  useApplications, 
  useSequences,
  Program, 
  Application, 
  Sequence,
  ApplicationType,
  ApplicationStatus,
  SequenceStatus,
  SequenceType,
  Region
} from './portfolio-store';
import { 
  useDocumentStore,
  CTDDocument,
  CTDModule
} from './document-store';
import { 
  ECTDApplication, 
  ECTDSequence, 
  ECTDDocument, 
  CorrespondenceThread 
} from '@/types/ectd';

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

/**
 * Map Portfolio Application type to eCTD Application type
 */
function mapApplicationType(type: ApplicationType): ECTDApplication['type'] {
  const typeMap: Record<ApplicationType, ECTDApplication['type']> = {
    'IND': 'IND',
    'NDA': 'NDA',
    'BLA': 'BLA',
    'sNDA': 'sNDA',
    'sBLA': 'sBLA',
    'ANDA': 'ANDA',
    'MAA': 'MAA',
    'JNDA': 'JNDA',
    'CTA': 'IND', // Map CTA to IND for eCTD purposes
    'NDS': 'NDA', // Map NDS (Canada) to NDA
    'IMPD': 'IND', // Map IMPD to IND
  };
  return typeMap[type] || 'NDA';
}

/**
 * Map Portfolio Sequence status to eCTD Sequence status
 */
function mapSequenceStatus(status: SequenceStatus): ECTDSequence['status'] {
  const statusMap: Record<SequenceStatus, ECTDSequence['status']> = {
    'draft': 'draft',
    'in-qc': 'validated',
    'qc-complete': 'validated',
    'submitted': 'submitted',
    'acknowledged': 'acknowledged',
    'under-review': 'under-review',
    'approved': 'approved',
    'rejected': 'draft', // Rejected goes back to draft-like state
  };
  return statusMap[status] || 'draft';
}

/**
 * Map Portfolio Sequence type to submission type string
 */
function mapSequenceTypeToSubmissionType(type: SequenceType): string {
  const typeMap: Record<SequenceType, string> = {
    'original': 'Original Submission',
    'amendment': 'Amendment',
    'supplement': 'Supplement',
    'ir-response': 'Information Request Response',
    'safety-report': 'Safety Report',
    'annual-report': 'Annual Report',
    'psur': 'PSUR',
    'dsur': 'DSUR',
    'rmp': 'Risk Management Plan',
    'labeling': 'Labeling Supplement',
    'cbe': 'CBE-0/CBE-30',
    'prior-approval': 'Prior Approval Supplement',
  };
  return typeMap[type] || 'Amendment';
}

/**
 * Map CTD Module from document-store format to eCTD format
 */
function mapDocumentModule(module: CTDModule): string {
  const moduleMap: Record<CTDModule, string> = {
    'm1': '1',
    'm2': '2',
    'm3': '3',
    'm4': '4',
    'm5': '5',
  };
  return moduleMap[module] || '1';
}

/**
 * Map document operation from document-store to eCTD format
 */
function mapDocumentOperation(operation?: CTDDocument['operation']): ECTDDocument['operation'] {
  if (!operation) return 'new';
  return operation;
}

// ============================================================================
// DOCUMENT TRANSFORMATION
// ============================================================================

/**
 * Transform a CTDDocument from document-store into an ECTDDocument
 */
function transformDocument(doc: CTDDocument): ECTDDocument {
  return {
    id: doc.id,
    title: doc.title,
    filePath: `m${mapDocumentModule(doc.module)}/${doc.section}/${doc.fileName}`,
    operation: mapDocumentOperation(doc.operation),
    checksum: `md5-${doc.id.slice(-12)}`, // Generate placeholder checksum
    checksumType: 'md5',
    module: mapDocumentModule(doc.module),
    section: doc.section,
    fileType: doc.fileFormat === 'pdf' ? 'pdf' : doc.fileFormat === 'xml' ? 'xml' : 'other',
    fileSize: doc.fileSize,
  };
}

/**
 * Generate placeholder documents for a sequence that has no documents yet
 */
function generatePlaceholderDocuments(sequenceNumber: string, sequenceType: SequenceType): ECTDDocument[] {
  const baseDocuments: ECTDDocument[] = [
    {
      id: `${sequenceNumber}-356h`,
      title: 'Form FDA 356h',
      filePath: 'm1/us/356h.pdf',
      operation: 'new',
      checksum: '8c86ab1fd22646050d0429d05ad0b609',
      checksumType: 'md5',
      module: '1',
      section: '1.1',
      fileType: 'pdf',
    },
    {
      id: `${sequenceNumber}-cover`,
      title: 'Cover Letter',
      filePath: 'm1/us/cover-letter.pdf',
      operation: 'new',
      checksum: '28efb3535868c482c7dab1911fd6f35d',
      checksumType: 'md5',
      module: '1',
      section: '1.2',
      fileType: 'pdf',
    },
  ];

  // Add type-specific documents
  if (sequenceType === 'original') {
    return [
      ...baseDocuments,
      {
        id: `${sequenceNumber}-m2intro`,
        title: 'CTD Introduction',
        filePath: 'm2/22-intro/introduction.pdf',
        operation: 'new',
        checksum: 'e3384ebfd92c7b3ef425a4d0ee42e3d8',
        checksumType: 'md5',
        module: '2',
        section: '2.2',
        fileType: 'pdf',
      },
      {
        id: `${sequenceNumber}-m2qos`,
        title: 'Quality Overall Summary',
        filePath: 'm2/23-qos/qos.pdf',
        operation: 'new',
        checksum: 'f3384ebfd92c7b3ef425a4d0ee42e3d8',
        checksumType: 'md5',
        module: '2',
        section: '2.3',
        fileType: 'pdf',
      },
      {
        id: `${sequenceNumber}-m3ds`,
        title: 'Drug Substance',
        filePath: 'm3/32s-drug-substance/drug-substance.pdf',
        operation: 'new',
        checksum: '07268c4cf3e4a932eb47450f8da2b030',
        checksumType: 'md5',
        module: '3',
        section: '3.2.S',
        fileType: 'pdf',
      },
      {
        id: `${sequenceNumber}-m3dp`,
        title: 'Drug Product',
        filePath: 'm3/32p-drug-product/drug-product.pdf',
        operation: 'new',
        checksum: '07268c4cf3e4a932eb47450f8da2b031',
        checksumType: 'md5',
        module: '3',
        section: '3.2.P',
        fileType: 'pdf',
      },
      {
        id: `${sequenceNumber}-m5csr`,
        title: 'Pivotal Clinical Study Report',
        filePath: 'm5/53-clin-stud-reports/csr-pivotal.pdf',
        operation: 'new',
        checksum: '95c2b3ead37cb289017585e32d8eeedb',
        checksumType: 'md5',
        module: '5',
        section: '5.3.5.1',
        fileType: 'pdf',
      },
    ];
  } else if (sequenceType === 'ir-response') {
    return [
      ...baseDocuments,
      {
        id: `${sequenceNumber}-resp`,
        title: 'IR Response Document',
        filePath: 'm1/us/ir-response.pdf',
        operation: 'new',
        checksum: 'a1234567890abcdef',
        checksumType: 'md5',
        module: '1',
        section: '1.12',
        fileType: 'pdf',
      },
    ];
  }

  return baseDocuments;
}

// ============================================================================
// SEQUENCE TRANSFORMATION
// ============================================================================

/**
 * Transform a Portfolio Sequence into an ECTDSequence
 */
function transformSequence(
  sequence: Sequence, 
  documents: CTDDocument[]
): ECTDSequence {
  // Get documents for this sequence
  const sequenceDocuments = documents.filter(d => d.sequenceId === sequence.id);
  
  // Transform documents or generate placeholders
  const ectdDocuments = sequenceDocuments.length > 0
    ? sequenceDocuments.map(transformDocument)
    : generatePlaceholderDocuments(sequence.sequenceNumber, sequence.type);

  return {
    sequenceNumber: sequence.sequenceNumber,
    submissionType: mapSequenceTypeToSubmissionType(sequence.type),
    submissionDate: sequence.submissionDate || new Date().toISOString().split('T')[0],
    description: sequence.description,
    status: mapSequenceStatus(sequence.status),
    documents: ectdDocuments,
    modules: [], // Module structure is derived from documents
  };
}

// ============================================================================
// APPLICATION TRANSFORMATION
// ============================================================================

/**
 * Transform a Portfolio Application into an ECTDApplication
 */
function transformApplication(
  application: Application,
  program: Program | undefined,
  sequences: Sequence[],
  documents: CTDDocument[]
): ECTDApplication {
  // Get sequences for this application
  const appSequences = sequences
    .filter(s => s.applicationId === application.id)
    .sort((a, b) => a.sequenceNumber.localeCompare(b.sequenceNumber));

  // Transform sequences
  const ectdSequences: ECTDSequence[] = appSequences.length > 0
    ? appSequences.map(s => transformSequence(s, documents))
    : [{
        sequenceNumber: '0000',
        submissionType: 'Original Submission',
        submissionDate: application.submissionDate || new Date().toISOString().split('T')[0],
        description: `Original ${application.type} submission`,
        status: mapSequenceStatus('draft'),
        documents: generatePlaceholderDocuments('0000', 'original'),
        modules: [],
      }];

  // Determine archive path
  const archivePath = `/archive/${application.type.toLowerCase()}${application.applicationNumber.replace(/\s+/g, '')}`;

  return {
    id: application.id,
    type: mapApplicationType(application.type),
    number: application.applicationNumber,
    sponsor: 'Ligature Therapeutics', // Company name
    productName: program?.name || 'Unknown Product',
    substanceName: program?.genericName || program?.name || 'Unknown Substance',
    indication: program?.indication || 'Unknown Indication',
    ectdVersion: '4.0',
    archivePath,
    sequences: ectdSequences,
    correspondence: [], // TODO: Add correspondence from HAQ module
    // Extended fields
    productId: program?.id,
    region: application.region,
    agency: application.agency,
    status: application.status,
    pdfuaDate: application.pdfuaDate,
  };
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to get all applications in eCTD format from the Portfolio Store
 */
export function useECTDApplications(): ECTDApplication[] {
  const programs = usePrograms();
  const applications = useApplications();
  const sequences = useSequences();
  const documents = useDocumentStore(s => s.documents);

  return useMemo(() => {
    // Only include submittable application types
    const submittableTypes: ApplicationType[] = ['NDA', 'BLA', 'sNDA', 'sBLA', 'MAA', 'JNDA', 'ANDA', 'IND'];
    
    return applications
      .filter(app => submittableTypes.includes(app.type))
      .map(app => {
        const program = programs.find(p => p.id === app.programId);
        return transformApplication(app, program, sequences, documents);
      });
  }, [programs, applications, sequences, documents]);
}

/**
 * Hook to get a single eCTD application by ID
 */
export function useECTDApplication(applicationId: string | null): ECTDApplication | null {
  const ectdApplications = useECTDApplications();
  
  return useMemo(() => {
    if (!applicationId) return null;
    return ectdApplications.find(app => app.id === applicationId) || null;
  }, [ectdApplications, applicationId]);
}

/**
 * Hook to get filtered eCTD applications
 */
export function useFilteredECTDApplications(filters?: {
  product?: string;
  region?: string;
  applicationType?: string;
}): ECTDApplication[] {
  const ectdApplications = useECTDApplications();

  return useMemo(() => {
    let result = ectdApplications;

    if (filters?.product && filters.product !== 'all') {
      result = result.filter(app => app.productId === filters.product);
    }

    if (filters?.region && filters.region !== 'all') {
      result = result.filter(app => app.region === filters.region);
    }

    if (filters?.applicationType && filters.applicationType !== 'all') {
      result = result.filter(app => app.type === filters.applicationType);
    }

    return result;
  }, [ectdApplications, filters]);
}

/**
 * Hook to get the currently selected eCTD application
 */
export function useSelectedECTDApplication(): ECTDApplication | null {
  const selectedApplicationId = usePortfolioStore(s => s.selectedApplicationId);
  return useECTDApplication(selectedApplicationId);
}

/**
 * Get eCTD applications synchronously (for non-hook contexts)
 */
export function getECTDApplicationsSync(): ECTDApplication[] {
  const portfolioState = usePortfolioStore.getState();
  const documentState = useDocumentStore.getState();
  
  const submittableTypes: ApplicationType[] = ['NDA', 'BLA', 'sNDA', 'sBLA', 'MAA', 'JNDA', 'ANDA', 'IND'];
  
  return portfolioState.applications
    .filter(app => submittableTypes.includes(app.type))
    .map(app => {
      const program = portfolioState.programs.find(p => p.id === app.programId);
      return transformApplication(
        app, 
        program, 
        portfolioState.sequences, 
        documentState.documents
      );
    });
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { 
  mapApplicationType, 
  mapSequenceStatus, 
  mapSequenceTypeToSubmissionType,
  transformDocument,
  transformSequence,
  transformApplication,
};
