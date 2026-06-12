import { ECTDApplication, CorrespondenceThread, ECTDSequence, ECTDDocument } from '@/types/ectd';
import { applications, sequences, correspondence, products } from '@/data/mock';

// Archive base paths
export const ARCHIVE_PATHS = {
  nda123456: '/archive/nda123456',
  bla765432: '/archive/bla765432',
  correspondence: '/archive/correspondence',
};

// Generate sample eCTD documents for a sequence
function generateDocuments(appType: string, seqNum: string, seqType: string): ECTDDocument[] {
  // Use sequence number in file paths to match actual archive structure
  // m1/us files have sequence suffix, m2/m3/m5 files don't
  const paddedSeq = seqNum.padStart(4, '0');
  const baseDocuments: ECTDDocument[] = [
    { id: `${seqNum}-356h`, title: 'Form FDA 356h', filePath: `m1/us/356h-${paddedSeq}.pdf`, operation: 'new', checksum: '8c86ab1fd22646050d0429d05ad0b609', checksumType: 'md5', module: '1', section: '1.1', fileType: 'pdf' },
    { id: `${seqNum}-cover`, title: 'Cover Letter', filePath: `m1/us/cover-letter-${paddedSeq}.pdf`, operation: 'new', checksum: '28efb3535868c482c7dab1911fd6f35d', checksumType: 'md5', module: '1', section: '1.2', fileType: 'pdf' },
  ];

  if (seqType === 'original') {
    return [
      ...baseDocuments,
      { id: `${seqNum}-m2intro`, title: 'CTD Introduction', filePath: 'm2/22-intro/introduction.pdf', operation: 'new', checksum: 'e3384ebfd92c7b3ef425a4d0ee42e3d8', checksumType: 'md5', module: '2', section: '2.2', fileType: 'pdf' },
      { id: `${seqNum}-m3dp`, title: 'Drug Product', filePath: 'm3/32p-drug-product/drug-product.pdf', operation: 'new', checksum: '07268c4cf3e4a932eb47450f8da2b031', checksumType: 'md5', module: '3', section: '3.2.P', fileType: 'pdf' },
      { id: `${seqNum}-m5csr`, title: 'Pivotal Clinical Study Report', filePath: 'm5/53-clin-stud-reports/csr.pdf', operation: 'new', checksum: '95c2b3ead37cb289017585e32d8eeedb', checksumType: 'md5', module: '5', section: '5.3.5.1', fileType: 'pdf' },
    ];
  } else if (seqType === 'ir-response') {
    return [
      ...baseDocuments,
      { id: `${seqNum}-resp`, title: 'IR Response Document', filePath: `m1/us/ir-response-${paddedSeq}.pdf`, operation: 'new', checksum: 'a1234567890abcdef', checksumType: 'md5', module: '1', section: '1.12', fileType: 'pdf' },
    ];
  } else if (seqType === 'psur' || seqType === 'rmp') {
    return [
      ...baseDocuments,
      { id: `${seqNum}-safety`, title: `${seqType.toUpperCase()} Document`, filePath: `m5/psur/psur-${paddedSeq}.pdf`, operation: 'new', checksum: 'b1234567890abcdef', checksumType: 'md5', module: '5', section: '5.3.6', fileType: 'pdf' },
    ];
  }
  
  return baseDocuments;
}

// Map mock application status to eCTD sequence status
function mapStatus(status: string): ECTDSequence['status'] {
  switch (status) {
    case 'Active': return 'acknowledged';
    case 'Submitted': return 'submitted';
    case 'Under Review': return 'under-review';
    case 'Approved': return 'approved';
    case 'CRL': return 'acknowledged';
    default: return 'draft';
  }
}

// Build eCTD applications from mock data
export function buildECTDApplications(): ECTDApplication[] {
  const ectdApps: ECTDApplication[] = [];

  // Get applications that have submission data (NDAs, BLAs, sNDAs, MAAs)
  const submittableApps = applications.filter(app => 
    ['NDA', 'BLA', 'sNDA', 'sBLA', 'MAA', 'JNDA'].includes(app.type)
  );

  for (const app of submittableApps) {
    const product = products.find(p => p.id === app.productId);
    if (!product) continue;

    // Get sequences for this application
    const appSequences = sequences.filter(s => s.applicationId === app.id);
    
    // Build eCTD sequences
    const ectdSequences: ECTDSequence[] = appSequences.length > 0 
      ? appSequences.map(seq => ({
          sequenceNumber: seq.sequenceNumber,
          submissionType: seq.description,
          submissionDate: seq.submissionDate,
          description: seq.description,
          status: seq.status === 'under-review' ? 'under-review' : 
                  seq.status === 'submitted' ? 'submitted' :
                  seq.status === 'acknowledged' ? 'acknowledged' : 'draft',
          documents: generateDocuments(app.type, seq.sequenceNumber, seq.type),
          modules: [],
        }))
      : [{
          sequenceNumber: '0000',
          submissionType: 'Original Submission',
          submissionDate: app.submissionDate || '2024-01-01',
          description: `Original ${app.type} submission`,
          status: mapStatus(app.status),
          documents: generateDocuments(app.type, '0000', 'original'),
          modules: [],
        }];

    // Get correspondence for this application
    const appCorrespondence = correspondence.filter(c => c.applicationId === app.id);
    
    const ectdCorrespondence: CorrespondenceThread[] = appCorrespondence.map(c => ({
      id: c.id,
      type: c.type === 'ir' ? 'IR' : c.type === 'crl' ? 'CRL' : c.type === 'approval' ? 'acknowledgment' : 'other',
      subject: c.subject,
      relatedSequence: '0000',
      relatedModule: '1',
      relatedSection: '1.12',
      status: c.status === 'closed' ? 'closed' : c.status === 'responded' ? 'responded' : 'open',
      messages: [{
        id: `${c.id}-msg`,
        from: (c.direction === 'incoming' ? 'FDA' : 'Sponsor') as 'FDA' | 'EMA' | 'PMDA' | 'Sponsor',
        date: c.date,
        subject: c.subject,
        documentPath: '',
        summary: c.subject,
      }],
    }));

    ectdApps.push({
      id: app.id,
      type: app.type as 'NDA' | 'BLA' | 'sNDA' | 'sBLA' | 'MAA' | 'IND' | 'ANDA',
      number: app.applicationNumber.split(' ')[1] || app.applicationNumber,
      sponsor: 'Ligature Therapeutics',
      productName: product.name,
      substanceName: product.genericName || product.name,
      indication: product.indication || '',
      ectdVersion: app.region === 'EU' ? '4.0' : '3.2.2',
      archivePath: ARCHIVE_PATHS.nda123456, // Use sample archive for demo
      sequences: ectdSequences,
      correspondence: ectdCorrespondence,
      // Extended fields for filtering
      productId: app.productId,
      region: app.region,
      agency: app.agency,
      status: app.status,
      pdfuaDate: app.pdfuaDate,
    });
  }

  return ectdApps;
}

// Export generated applications
export const ectdApplications = buildECTDApplications();

// Get filtered applications
export function getFilteredApplications(filters: {
  product?: string;
  region?: string;
  applicationType?: string;
}): ECTDApplication[] {
  let filtered = ectdApplications;

  if (filters.product && filters.product !== 'all') {
    const productFilter = (filters.product as string).toLowerCase();
    filtered = filtered.filter(app => {
      const a = app as any;
      const appProductId = (a.productId || '').toLowerCase();
      // Exact match (case-insensitive)
      if (appProductId === productFilter) return true;
      // Normalised match: strip hyphens and compare (lig2847 === lig2847)
      const normalise = (s: string) => s.replace(/[-_\s]/g, '');
      if (normalise(appProductId) === normalise(productFilter)) return true;
      // Partial containment either way
      if (appProductId.includes(productFilter) || productFilter.includes(appProductId)) return true;
      // Product name match
      if (a.productName && (a.productName as string).toLowerCase().includes(productFilter)) return true;
      return false;
    });
  }

  if (filters.region && filters.region !== 'all') {
    filtered = filtered.filter(app => (app as any).region === filters.region);
  }

  if (filters.applicationType && filters.applicationType !== 'all') {
    filtered = filtered.filter(app => app.type === filters.applicationType);
  }

  return filtered;
}

// Get all correspondence threads across applications
export function getAllCorrespondence(): (CorrespondenceThread & { applicationNumber: string; applicationType: string })[] {
  return ectdApplications.flatMap(app => 
    app.correspondence.map(corr => ({
      ...corr,
      applicationNumber: app.number,
      applicationType: app.type,
    }))
  );
}
