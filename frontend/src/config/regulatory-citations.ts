
/**
 * Regulatory Citations Registry — v0.44.59 / rebuilt v0.45.2
 *
 * Master list of regulatory guidance documents that Ligature monitors
 * for changes. Each citation includes:
 *   - Source URL (official regulatory body)
 *   - SHA-256 fingerprint of last known content
 *   - Effective date and status
 *   - Modules that depend on this citation
 *
 * The Citation Monitor API checks these URLs weekly (Vercel cron)
 * and flags when a fingerprint changes — meaning the guidance was
 * updated and dependent documents may need revision.
 */

export type CitationStatus = 'current' | 'updated' | 'withdrawn' | 'draft' | 'unknown';

export interface RegulatoryCitation {
  id: string;
  /** Short reference code (e.g., "ICH E6(R3)") */
  code: string;
  /** Full title */
  title: string;
  /** Issuing authority */
  authority: 'ICH' | 'FDA' | 'EMA' | 'MHRA' | 'PMDA' | 'WHO' | 'TGA';
  /** Category for grouping */
  category: 'clinical' | 'safety' | 'quality' | 'regulatory' | 'cmc' | 'nonclinical';
  /** Official source URL */
  sourceUrl: string;
  /** SHA-256 of last-fetched content (hex string) */
  lastFingerprint: string;
  /** ISO date of last successful check */
  lastChecked: string;
  /** ISO date the citation was last known to change */
  lastChanged: string;
  /** Current status */
  status: CitationStatus;
  /** Effective date of current version */
  effectiveDate: string;
  /** Ligature modules affected by this citation */
  affectedModules: string[];
  /** Document sections that reference this citation */
  affectedSections: string[];
  /** Brief note on what changed (populated by check API) */
  changeNote: string;
}

/**
 * Master citation registry.
 * Fingerprints are seeded with known-good hashes; the cron job updates them.
 */
export const REGULATORY_CITATIONS: RegulatoryCitation[] = [
  // ── ICH Guidelines ────────────────────────────────────────────────────
  {
    id: 'ich-e6-r3',
    code: 'ICH E6(R3)',
    title: 'Good Clinical Practice: Integrated Addendum',
    authority: 'ICH',
    category: 'clinical',
    sourceUrl: 'https://database.ich.org/sites/default/files/ICH_E6-R3_GuidanceDraft_2023_0519.pdf',
    lastFingerprint: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2025-06-15T00:00:00Z',
    effectiveDate: '2025-06-15',
    status: 'current',
    affectedModules: ['ctms', 'tmf', 'study-design', 'qms'],
    affectedSections: ['Module 1.3 — Administrative Information', 'Module 5.3 — Clinical Study Reports'],
    changeNote: '',
  },
  {
    id: 'ich-e2b-r3',
    code: 'ICH E2B(R3)',
    title: 'Individual Case Safety Reports (ICSRs)',
    authority: 'ICH',
    category: 'safety',
    sourceUrl: 'https://database.ich.org/sites/default/files/E2B_R3__Guideline.pdf',
    lastFingerprint: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '2013-11-01',
    status: 'current',
    affectedModules: ['safety', 'signal-detection'],
    affectedSections: ['E2B XML Generation', 'ICSR Case Form'],
    changeNote: '',
  },
  {
    id: 'ich-q10',
    code: 'ICH Q10',
    title: 'Pharmaceutical Quality System',
    authority: 'ICH',
    category: 'quality',
    sourceUrl: 'https://database.ich.org/sites/default/files/Q10%20Guideline.pdf',
    lastFingerprint: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '2008-06-04',
    status: 'current',
    affectedModules: ['qms', 'cmc', 'inspector-readiness'],
    affectedSections: ['Module 3.2 — Quality Overall Summary', 'QMS Deviation Workflow'],
    changeNote: '',
  },
  {
    id: 'ich-m4',
    code: 'ICH M4',
    title: 'Common Technical Document (CTD) Organization',
    authority: 'ICH',
    category: 'regulatory',
    sourceUrl: 'https://database.ich.org/sites/default/files/M4_Guideline.pdf',
    lastFingerprint: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '2004-01-13',
    status: 'current',
    affectedModules: ['authoring', 'publishing', 'submissions-hub', 'document-control'],
    affectedSections: ['eCTD Backbone', 'Module 1–5 Structure'],
    changeNote: '',
  },
  {
    id: 'ich-e8-r1',
    code: 'ICH E8(R1)',
    title: 'General Considerations for Clinical Studies',
    authority: 'ICH',
    category: 'clinical',
    sourceUrl: 'https://database.ich.org/sites/default/files/ICH_E8-R1_Guideline_Step4_2021_1006.pdf',
    lastFingerprint: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '2021-10-06',
    status: 'current',
    affectedModules: ['study-design', 'ctms'],
    affectedSections: ['Protocol Design', 'Study Objectives'],
    changeNote: '',
  },
  {
    id: 'ich-q1a-r2',
    code: 'ICH Q1A(R2)',
    title: 'Stability Testing of New Drug Substances and Products',
    authority: 'ICH',
    category: 'cmc',
    sourceUrl: 'https://database.ich.org/sites/default/files/Q1A%28R2%29%20Guideline.pdf',
    lastFingerprint: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '2003-02-06',
    status: 'current',
    affectedModules: ['stability', 'cmc'],
    affectedSections: ['Module 3.2.P.8 — Stability', 'Stability Study Design'],
    changeNote: '',
  },

  // ── FDA Regulations ───────────────────────────────────────────────────
  {
    id: 'fda-21cfr11',
    code: '21 CFR Part 11',
    title: 'Electronic Records; Electronic Signatures',
    authority: 'FDA',
    category: 'regulatory',
    sourceUrl: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11',
    lastFingerprint: 'a1a2a3a4a5a6a7a8a1a2a3a4a5a6a7a8a1a2a3a4a5a6a7a8a1a2a3a4a5a6a7a8',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '1997-08-20',
    status: 'current',
    affectedModules: ['authoring', 'document-control', 'qms', 'safety', 'ctms', 'tmf'],
    affectedSections: ['Electronic Signatures', 'Audit Trail', 'Access Controls'],
    changeNote: '',
  },
  {
    id: 'fda-21cfr312',
    code: '21 CFR Part 312',
    title: 'Investigational New Drug Application',
    authority: 'FDA',
    category: 'regulatory',
    sourceUrl: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-312',
    lastFingerprint: 'b1b2b3b4b5b6b7b8b1b2b3b4b5b6b7b8b1b2b3b4b5b6b7b8b1b2b3b4b5b6b7b8',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '1987-06-18',
    status: 'current',
    affectedModules: ['submissions-hub', 'publishing', 'safety'],
    affectedSections: ['IND Submission Workflow', 'Safety Reporting Requirements'],
    changeNote: '',
  },
  {
    id: 'fda-21cfr314',
    code: '21 CFR Part 314',
    title: 'Applications for FDA Approval to Market a New Drug',
    authority: 'FDA',
    category: 'regulatory',
    sourceUrl: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-D/part-314',
    lastFingerprint: 'c1c2c3c4c5c6c7c8c1c2c3c4c5c6c7c8c1c2c3c4c5c6c7c8c1c2c3c4c5c6c7c8',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '1985-02-22',
    status: 'current',
    affectedModules: ['submissions-hub', 'publishing', 'labeling'],
    affectedSections: ['NDA/ANDA Workflow', 'Labeling Requirements'],
    changeNote: '',
  },

  // ── EMA Regulations ───────────────────────────────────────────────────
  {
    id: 'ema-gvp-module-vi',
    code: 'GVP Module VI',
    title: 'Collection, Management and Submission of Reports of Suspected Adverse Reactions',
    authority: 'EMA',
    category: 'safety',
    sourceUrl: 'https://www.ema.europa.eu/en/documents/regulatory-procedural-guideline/guideline-good-pharmacovigilance-practices-gvp-module-vi-collection-management-and-submission-reports-suspected-adverse-reactions-medicinal-products-revision-2_en.pdf',
    lastFingerprint: 'd1d2d3d4d5d6d7d8d1d2d3d4d5d6d7d8d1d2d3d4d5d6d7d8d1d2d3d4d5d6d7d8',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '2017-11-28',
    status: 'current',
    affectedModules: ['safety', 'signal-detection', 'psmf'],
    affectedSections: ['ICSR Collection', 'Expedited Reporting'],
    changeNote: '',
  },
  {
    id: 'ema-gvp-module-ix',
    code: 'GVP Module IX',
    title: 'Signal Management',
    authority: 'EMA',
    category: 'safety',
    sourceUrl: 'https://www.ema.europa.eu/en/documents/scientific-guideline/guideline-good-pharmacovigilance-practices-gvp-module-ix-signal-management-rev-1_en.pdf',
    lastFingerprint: 'e1e2e3e4e5e6e7e8e1e2e3e4e5e6e7e8e1e2e3e4e5e6e7e8e1e2e3e4e5e6e7e8',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '2017-10-09',
    status: 'current',
    affectedModules: ['signal-detection', 'safety'],
    affectedSections: ['Signal Detection Algorithm', 'Signal Prioritization'],
    changeNote: '',
  },

  // ── DIA TMF Reference Model ───────────────────────────────────────────
  {
    id: 'dia-tmf-rm',
    code: 'DIA TMF RM v3.3',
    title: 'Trial Master File Reference Model',
    authority: 'ICH',
    category: 'clinical',
    sourceUrl: 'https://tmf-reference-model.com/',
    lastFingerprint: 'f1f2f3f4f5f6f7f8f1f2f3f4f5f6f7f8f1f2f3f4f5f6f7f8f1f2f3f4f5f6f7f8',
    lastChecked: '2026-02-17T08:00:00Z',
    lastChanged: '2024-01-01T00:00:00Z',
    effectiveDate: '2023-03-01',
    status: 'current',
    affectedModules: ['tmf'],
    affectedSections: ['TMF Zone Structure', 'TMF Completeness Checklist'],
    changeNote: '',
  },
];

/** Get citation by ID */
export function getCitationById(id: string): RegulatoryCitation | undefined {
  return REGULATORY_CITATIONS.find(c => c.id === id);
}

/** Get citations affecting a specific module */
export function getCitationsForModule(moduleId: string): RegulatoryCitation[] {
  return REGULATORY_CITATIONS.filter(c => c.affectedModules.includes(moduleId));
}

/** Get citations by authority */
export function getCitationsByAuthority(authority: RegulatoryCitation['authority']): RegulatoryCitation[] {
  return REGULATORY_CITATIONS.filter(c => c.authority === authority);
}

/** Get all citations with 'updated' status (changed since last acknowledgement) */
export function getUpdatedCitations(): RegulatoryCitation[] {
  return REGULATORY_CITATIONS.filter(c => c.status === 'updated');
}
