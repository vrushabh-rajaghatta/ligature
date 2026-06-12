// ============================================================================
// Sample Management Mock Data - v0.13.63
// ============================================================================
// Demo data linking to CTMS studies for investor presentations
// ============================================================================

import type {
  StorageSite, Freezer, StorageRack, StorageBox,
  Sample, ChainOfCustodyEvent, SampleRequest,
} from '@/store/sampleManagementTypes';

// ============================================================================
// STORAGE SITES
// ============================================================================

export const storageSites: Record<string, StorageSite> = {
  'site-boston': {
    id: 'site-boston',
    name: 'Boston Central Biorepository',
    code: 'BOS-REPO-01',
    address: '150 Cambridge Park Drive',
    city: 'Cambridge, MA',
    country: 'USA',
    contactName: 'Dr. Sarah Mitchell',
    contactEmail: 'smitchell@ligature.com',
    contactPhone: '+1 617-555-0101',
    isActive: true,
    certifications: ['CAP', 'CLIA', 'GLP', 'ISO 15189'],
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  'site-eu': {
    id: 'site-eu',
    name: 'EU Sample Repository',
    code: 'EU-REPO-01',
    address: 'Friedrichstraße 191',
    city: 'Berlin',
    country: 'Germany',
    contactName: 'Dr. Hans Mueller',
    contactEmail: 'hmueller@ligature.eu',
    contactPhone: '+49 30 555 0102',
    isActive: true,
    certifications: ['GLP', 'ISO 15189', 'BFARM'],
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
  },
};

// ============================================================================
// FREEZERS
// ============================================================================

export const freezers: Record<string, Freezer> = {
  'fzr-bos-ult-001': {
    id: 'fzr-bos-ult-001',
    siteId: 'site-boston',
    name: 'Ultra-Low Freezer 1',
    code: 'BOS-ULT-001',
    type: 'ultra-low-80',
    targetTemp: -80,
    tempTolerance: 5,
    status: 'operational',
    totalRacks: 12,
    usedRacks: 8,
    room: 'B-102',
    building: 'Building B',
    lastTempCheck: '2026-01-07T08:00:00Z',
    lastTempValue: -79.2,
    createdAt: '2023-01-20T00:00:00Z',
    updatedAt: '2026-01-07T08:00:00Z',
  },
  'fzr-bos-ult-002': {
    id: 'fzr-bos-ult-002',
    siteId: 'site-boston',
    name: 'Ultra-Low Freezer 2',
    code: 'BOS-ULT-002',
    type: 'ultra-low-80',
    targetTemp: -80,
    tempTolerance: 5,
    status: 'operational',
    totalRacks: 12,
    usedRacks: 5,
    room: 'B-102',
    building: 'Building B',
    lastTempCheck: '2026-01-07T08:00:00Z',
    lastTempValue: -80.1,
    createdAt: '2023-01-20T00:00:00Z',
    updatedAt: '2026-01-07T08:00:00Z',
  },
  'fzr-bos-ln2-001': {
    id: 'fzr-bos-ln2-001',
    siteId: 'site-boston',
    name: 'LN2 Cryogenic Tank 1',
    code: 'BOS-LN2-001',
    type: 'liquid-nitrogen',
    targetTemp: -196,
    tempTolerance: 10,
    status: 'operational',
    totalRacks: 6,
    usedRacks: 4,
    room: 'B-104',
    building: 'Building B',
    lastTempCheck: '2026-01-07T08:00:00Z',
    lastTempValue: -195.8,
    createdAt: '2023-03-15T00:00:00Z',
    updatedAt: '2026-01-07T08:00:00Z',
  },
  'fzr-bos-ref-001': {
    id: 'fzr-bos-ref-001',
    siteId: 'site-boston',
    name: 'Refrigerator 1',
    code: 'BOS-REF-001',
    type: 'refrigerator-4',
    targetTemp: 4,
    tempTolerance: 2,
    status: 'operational',
    totalRacks: 8,
    usedRacks: 3,
    room: 'B-101',
    building: 'Building B',
    lastTempCheck: '2026-01-07T08:00:00Z',
    lastTempValue: 4.1,
    createdAt: '2023-01-20T00:00:00Z',
    updatedAt: '2026-01-07T08:00:00Z',
  },
  'fzr-eu-ult-001': {
    id: 'fzr-eu-ult-001',
    siteId: 'site-eu',
    name: 'EU Ultra-Low Freezer 1',
    code: 'EU-ULT-001',
    type: 'ultra-low-80',
    targetTemp: -80,
    tempTolerance: 5,
    status: 'operational',
    totalRacks: 10,
    usedRacks: 6,
    room: 'Lab-A',
    lastTempCheck: '2026-01-07T07:00:00Z',
    lastTempValue: -79.8,
    createdAt: '2023-06-15T00:00:00Z',
    updatedAt: '2026-01-07T07:00:00Z',
  },
};

// ============================================================================
// RACKS
// ============================================================================

export const racks: Record<string, StorageRack> = {
  'rack-bos-ult1-a': {
    id: 'rack-bos-ult1-a',
    freezerId: 'fzr-bos-ult-001',
    name: 'Rack A',
    code: 'BOS-ULT1-RACK-A',
    position: 1,
    rows: 5,
    columns: 4,
    totalBoxes: 20,
    usedBoxes: 16,
    createdAt: '2023-01-20T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  'rack-bos-ult1-b': {
    id: 'rack-bos-ult1-b',
    freezerId: 'fzr-bos-ult-001',
    name: 'Rack B',
    code: 'BOS-ULT1-RACK-B',
    position: 2,
    rows: 5,
    columns: 4,
    totalBoxes: 20,
    usedBoxes: 12,
    createdAt: '2023-01-20T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  'rack-bos-ln2-a': {
    id: 'rack-bos-ln2-a',
    freezerId: 'fzr-bos-ln2-001',
    name: 'Cryo Rack A',
    code: 'BOS-LN2-RACK-A',
    position: 1,
    rows: 4,
    columns: 4,
    totalBoxes: 16,
    usedBoxes: 10,
    createdAt: '2023-03-15T00:00:00Z',
    updatedAt: '2024-11-01T00:00:00Z',
  },
};

// ============================================================================
// BOXES
// ============================================================================

export const boxes: Record<string, StorageBox> = {
  'box-001': {
    id: 'box-001',
    rackId: 'rack-bos-ult1-a',
    name: 'LIGATURE-1 Serum Box 1',
    code: 'LIG1-SER-001',
    position: 'A1',
    boxType: '81-well',
    rows: 9,
    columns: 9,
    totalPositions: 81,
    usedPositions: 72,
    sampleType: 'serum',
    studyId: 'ctms-study-001',
    createdAt: '2023-03-20T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },
  'box-002': {
    id: 'box-002',
    rackId: 'rack-bos-ult1-a',
    name: 'LIGATURE-1 Serum Box 2',
    code: 'LIG1-SER-002',
    position: 'A2',
    boxType: '81-well',
    rows: 9,
    columns: 9,
    totalPositions: 81,
    usedPositions: 81,
    sampleType: 'serum',
    studyId: 'ctms-study-001',
    createdAt: '2023-04-15T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },
  'box-003': {
    id: 'box-003',
    rackId: 'rack-bos-ult1-a',
    name: 'LIGATURE-1 Plasma Box 1',
    code: 'LIG1-PLS-001',
    position: 'A3',
    boxType: '81-well',
    rows: 9,
    columns: 9,
    totalPositions: 81,
    usedPositions: 65,
    sampleType: 'plasma',
    studyId: 'ctms-study-001',
    createdAt: '2023-03-20T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },
  'box-004': {
    id: 'box-004',
    rackId: 'rack-bos-ln2-a',
    name: 'LIGATURE-1 PBMC Box 1',
    code: 'LIG1-PBMC-001',
    position: 'A1',
    boxType: '81-well',
    rows: 9,
    columns: 9,
    totalPositions: 81,
    usedPositions: 54,
    sampleType: 'pbmc',
    studyId: 'ctms-study-001',
    createdAt: '2023-03-20T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },
  'box-005': {
    id: 'box-005',
    rackId: 'rack-bos-ult1-b',
    name: 'LIGATURE-2 Serum Box 1',
    code: 'LIG2-SER-001',
    position: 'A1',
    boxType: '81-well',
    rows: 9,
    columns: 9,
    totalPositions: 81,
    usedPositions: 45,
    sampleType: 'serum',
    studyId: 'ctms-study-002',
    createdAt: '2023-09-10T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },
};

// ============================================================================
// SAMPLES (Linked to CTMS Studies)
// ============================================================================

const generateSamples = (): Record<string, Sample> => {
  const samples: Record<string, Sample> = {};
  
  // LIGATURE-1 (ctms-study-001) Samples
  const lig1Subjects = [
    { id: 'LIG1-001-001', site: 'MGH Boston', siteId: 'site-001' },
    { id: 'LIG1-001-002', site: 'MGH Boston', siteId: 'site-001' },
    { id: 'LIG1-002-001', site: 'MD Anderson', siteId: 'site-002' },
    { id: 'LIG1-003-001', site: 'Charité Berlin', siteId: 'site-003' },
    { id: 'LIG1-003-002', site: 'Charité Berlin', siteId: 'site-003' },
  ];

  const timepoints = [
    { code: 'SCR', name: 'Screening' },
    { code: 'D1', name: 'Day 1 (Baseline)' },
    { code: 'W4', name: 'Week 4' },
    { code: 'W8', name: 'Week 8' },
    { code: 'W12', name: 'Week 12' },
  ];

  let sampleIdx = 1;

  lig1Subjects.forEach((subject) => {
    timepoints.forEach((tp) => {
      // Serum sample
      const serumId = `smp-lig1-${sampleIdx.toString().padStart(4, '0')}`;
      samples[serumId] = {
        id: serumId,
        sampleId: `LIG-2024-${sampleIdx.toString().padStart(5, '0')}`,
        barcode: `SER${sampleIdx.toString().padStart(8, '0')}`,
        type: 'serum',
        status: 'in-storage',
        quality: 'acceptable',
        initialVolume: 2.0,
        currentVolume: 1.5,
        volumeUnit: 'mL',
        parentSampleId: null,
        childSampleIds: [],
        collectionDate: '2024-06-15',
        collectionTime: '09:30',
        collectedBy: 'Lab Tech A',
        processingDate: '2024-06-15',
        processingProtocol: 'SOP-SER-001',
        processedBy: 'Lab Tech A',
        storageLocationId: 'box-001',
        storagePosition: `${String.fromCharCode(65 + Math.floor((sampleIdx - 1) / 9))}${((sampleIdx - 1) % 9) + 1}`,
        storedAt: '2024-06-15T14:00:00Z',
        studyId: 'ctms-study-001',
        studyName: 'LIGATURE-1',
        siteId: subject.siteId,
        siteName: subject.site,
        subjectId: subject.id,
        visitId: `visit-${tp.code.toLowerCase()}`,
        visitName: tp.name,
        timepointCode: tp.code,
        createdAt: '2024-06-15T14:00:00Z',
        updatedAt: '2024-12-15T00:00:00Z',
      };
      sampleIdx++;

      // Plasma sample
      const plasmaId = `smp-lig1-${sampleIdx.toString().padStart(4, '0')}`;
      samples[plasmaId] = {
        id: plasmaId,
        sampleId: `LIG-2024-${sampleIdx.toString().padStart(5, '0')}`,
        barcode: `PLS${sampleIdx.toString().padStart(8, '0')}`,
        type: 'plasma',
        status: 'in-storage',
        quality: 'acceptable',
        initialVolume: 3.0,
        currentVolume: 2.5,
        volumeUnit: 'mL',
        parentSampleId: null,
        childSampleIds: [],
        collectionDate: '2024-06-15',
        collectionTime: '09:30',
        collectedBy: 'Lab Tech A',
        processingDate: '2024-06-15',
        processingProtocol: 'SOP-PLS-001',
        processedBy: 'Lab Tech A',
        storageLocationId: 'box-003',
        storagePosition: `${String.fromCharCode(65 + Math.floor((sampleIdx - 1) / 9))}${((sampleIdx - 1) % 9) + 1}`,
        storedAt: '2024-06-15T14:30:00Z',
        studyId: 'ctms-study-001',
        studyName: 'LIGATURE-1',
        siteId: subject.siteId,
        siteName: subject.site,
        subjectId: subject.id,
        visitId: `visit-${tp.code.toLowerCase()}`,
        visitName: tp.name,
        timepointCode: tp.code,
        createdAt: '2024-06-15T14:30:00Z',
        updatedAt: '2024-12-15T00:00:00Z',
      };
      sampleIdx++;
    });
  });

  // Add some LIGATURE-2 samples
  const lig2Samples = [
    { subjectId: 'LIG2-001-001', site: 'Cleveland Clinic', siteId: 'site-010' },
    { subjectId: 'LIG2-002-001', site: 'Johns Hopkins', siteId: 'site-011' },
  ];

  lig2Samples.forEach((subj) => {
    const id = `smp-lig2-${sampleIdx.toString().padStart(4, '0')}`;
    samples[id] = {
      id,
      sampleId: `LIG-2025-${sampleIdx.toString().padStart(5, '0')}`,
      barcode: `SER${sampleIdx.toString().padStart(8, '0')}`,
      type: 'serum',
      status: 'in-storage',
      quality: 'acceptable',
      initialVolume: 2.0,
      currentVolume: 2.0,
      volumeUnit: 'mL',
      parentSampleId: null,
      childSampleIds: [],
      collectionDate: '2025-01-05',
      collectedBy: 'Lab Tech B',
      storageLocationId: 'box-005',
      storagePosition: `A${sampleIdx % 9 + 1}`,
      storedAt: '2025-01-06T10:00:00Z',
      studyId: 'ctms-study-002',
      studyName: 'LIGATURE-2',
      siteId: subj.siteId,
      siteName: subj.site,
      subjectId: subj.subjectId,
      visitId: 'visit-scr',
      visitName: 'Screening',
      timepointCode: 'SCR',
      createdAt: '2025-01-06T10:00:00Z',
      updatedAt: '2025-01-06T10:00:00Z',
    };
    sampleIdx++;
  });

  // Add some samples with different statuses for demo
  const disposedSample: Sample = {
    id: 'smp-disposed-001',
    sampleId: 'LIG-2024-99001',
    barcode: 'DISPOSED001',
    type: 'serum',
    status: 'disposed',
    quality: 'compromised',
    initialVolume: 2.0,
    currentVolume: 0,
    volumeUnit: 'mL',
    parentSampleId: null,
    childSampleIds: [],
    collectionDate: '2024-03-10',
    collectedBy: 'Lab Tech C',
    storageLocationId: 'box-001',
    storagePosition: 'H9',
    storedAt: '2024-03-10T12:00:00Z',
    studyId: 'ctms-study-001',
    studyName: 'LIGATURE-1',
    siteId: 'site-001',
    siteName: 'MGH Boston',
    subjectId: 'LIG1-099-001',
    timepointCode: 'D1',
    disposedAt: '2024-09-15T14:00:00Z',
    disposalReason: 'Sample compromised during transport - temperature excursion',
    disposedBy: 'Dr. Sarah Mitchell',
    createdAt: '2024-03-10T12:00:00Z',
    updatedAt: '2024-09-15T14:00:00Z',
  };
  samples[disposedSample.id] = disposedSample;

  const quarantineSample: Sample = {
    id: 'smp-quarantine-001',
    sampleId: 'LIG-2025-99002',
    barcode: 'QUAR000001',
    type: 'plasma',
    status: 'quarantine',
    quality: 'pending',
    initialVolume: 3.0,
    currentVolume: 3.0,
    volumeUnit: 'mL',
    parentSampleId: null,
    childSampleIds: [],
    collectionDate: '2025-01-03',
    collectedBy: 'Lab Tech D',
    storageLocationId: 'box-003',
    storagePosition: 'I1',
    storedAt: '2025-01-04T10:00:00Z',
    studyId: 'ctms-study-002',
    studyName: 'LIGATURE-2',
    siteId: 'site-011',
    siteName: 'Johns Hopkins',
    subjectId: 'LIG2-005-001',
    timepointCode: 'SCR',
    comments: 'Awaiting QC review - hemolysis suspected',
    createdAt: '2025-01-04T10:00:00Z',
    updatedAt: '2025-01-04T10:00:00Z',
  };
  samples[quarantineSample.id] = quarantineSample;

  return samples;
};

// ============================================================================
// CHAIN OF CUSTODY EVENTS
// ============================================================================

const generateCustodyEvents = (samples: Record<string, Sample>): Record<string, ChainOfCustodyEvent[]> => {
  const events: Record<string, ChainOfCustodyEvent[]> = {};

  Object.values(samples).forEach((sample) => {
    events[sample.id] = [
      {
        id: `coc-${sample.id}-001`,
        sampleId: sample.id,
        eventType: 'received',
        performedBy: 'lab-tech-001',
        performedByName: sample.collectedBy,
        performedAt: sample.createdAt,
        toStatus: 'received',
        notes: `Sample received from ${sample.siteName}`,
        createdAt: sample.createdAt,
      },
      {
        id: `coc-${sample.id}-002`,
        sampleId: sample.id,
        eventType: 'stored',
        performedBy: 'lab-tech-001',
        performedByName: sample.collectedBy,
        performedAt: sample.storedAt,
        toLocation: `Box ${sample.storageLocationId} / Position ${sample.storagePosition}`,
        toStatus: 'in-storage',
        notes: 'Sample placed in long-term storage',
        createdAt: sample.storedAt,
      },
    ];

    // Add disposal event for disposed samples
    if (sample.status === 'disposed' && sample.disposedAt) {
      events[sample.id].push({
        id: `coc-${sample.id}-003`,
        sampleId: sample.id,
        eventType: 'disposed',
        performedBy: 'dr-mitchell',
        performedByName: sample.disposedBy || 'Unknown',
        performedAt: sample.disposedAt,
        fromStatus: 'in-storage',
        toStatus: 'disposed',
        reason: sample.disposalReason,
        notes: 'Sample disposed per SOP-DISP-001',
        createdAt: sample.disposedAt,
      });
    }
  });

  return events;
};

// ============================================================================
// SAMPLE REQUESTS
// ============================================================================

export const sampleRequests: Record<string, SampleRequest> = {
  'req-001': {
    id: 'req-001',
    requestNumber: 'REQ-2025-0001',
    requestedBy: 'researcher-001',
    requestedByName: 'Dr. Emily Rodriguez',
    requestedAt: '2025-01-02T09:00:00Z',
    purpose: 'Biomarker analysis for interim efficacy review',
    studyId: 'ctms-study-001',
    protocol: 'LIG-2847-301',
    analysisType: 'KRAS mutation analysis',
    sampleIds: ['smp-lig1-0001', 'smp-lig1-0002', 'smp-lig1-0003'],
    sampleType: 'plasma',
    quantityRequested: 10,
    status: 'pending',
    priority: 'urgent',
    dueDate: '2025-01-15',
    notes: 'Samples needed for DMC meeting presentation',
    createdAt: '2025-01-02T09:00:00Z',
    updatedAt: '2025-01-02T09:00:00Z',
  },
  'req-002': {
    id: 'req-002',
    requestNumber: 'REQ-2025-0002',
    requestedBy: 'researcher-002',
    requestedByName: 'Dr. James Chen',
    requestedAt: '2025-01-03T14:30:00Z',
    purpose: 'PK analysis - Week 8 timepoint samples',
    studyId: 'ctms-study-001',
    protocol: 'LIG-2847-301',
    analysisType: 'Pharmacokinetic analysis',
    sampleIds: [],
    sampleType: 'serum',
    quantityRequested: 25,
    status: 'approved',
    approvedBy: 'manager-001',
    approvedByName: 'Dr. Sarah Mitchell',
    approvedAt: '2025-01-04T10:00:00Z',
    priority: 'routine',
    dueDate: '2025-01-20',
    createdAt: '2025-01-03T14:30:00Z',
    updatedAt: '2025-01-04T10:00:00Z',
  },
  'req-003': {
    id: 'req-003',
    requestNumber: 'REQ-2024-0089',
    requestedBy: 'researcher-003',
    requestedByName: 'Dr. Lisa Park',
    requestedAt: '2024-12-01T11:00:00Z',
    purpose: 'Exploratory ctDNA analysis',
    studyId: 'ctms-study-001',
    protocol: 'LIG-2847-301',
    analysisType: 'ctDNA sequencing',
    sampleIds: ['smp-lig1-0010', 'smp-lig1-0011'],
    sampleType: 'plasma',
    quantityRequested: 5,
    status: 'fulfilled',
    approvedBy: 'manager-001',
    approvedByName: 'Dr. Sarah Mitchell',
    approvedAt: '2024-12-02T09:00:00Z',
    fulfilledAt: '2024-12-05T15:00:00Z',
    fulfilledBy: 'Lab Tech A',
    priority: 'routine',
    createdAt: '2024-12-01T11:00:00Z',
    updatedAt: '2024-12-05T15:00:00Z',
  },
};

// ============================================================================
// EXPORT COMBINED MOCK DATA
// ============================================================================

const samples = generateSamples();
const custodyEvents = generateCustodyEvents(samples);

export const mockSampleManagementData = {
  sites: storageSites,
  freezers,
  racks,
  boxes,
  samples,
  custodyEvents,
  requests: sampleRequests,
};

// ============================================================================
// HELPER FUNCTIONS FOR COMPONENTS
// ============================================================================

export const getSampleTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'whole-blood': 'Whole Blood',
    'serum': 'Serum',
    'plasma': 'Plasma',
    'urine': 'Urine',
    'csf': 'CSF',
    'tissue': 'Tissue',
    'dna': 'DNA',
    'rna': 'RNA',
    'pbmc': 'PBMC',
    'saliva': 'Saliva',
    'stool': 'Stool',
    'bone-marrow': 'Bone Marrow',
    'other': 'Other',
  };
  return labels[type] || type;
};

export const getSampleStatusColor = (status: string): 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'purple' => {
  const colors: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'purple'> = {
    'received': 'blue',
    'in-storage': 'green',
    'aliquoted': 'purple',
    'in-use': 'amber',
    'reserved': 'amber',
    'shipped': 'blue',
    'depleted': 'slate',
    'disposed': 'slate',
    'quarantine': 'red',
    'qc-failed': 'red',
  };
  return colors[status] || 'slate';
};

export const getFreezerTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'ultra-low-80': '-80°C Ultra-Low',
    'low-temp-20': '-20°C Freezer',
    'refrigerator-4': '+4°C Refrigerator',
    'ambient': 'Ambient',
    'liquid-nitrogen': 'Liquid Nitrogen (-196°C)',
    'cryogenic': 'Cryogenic',
  };
  return labels[type] || type;
};
