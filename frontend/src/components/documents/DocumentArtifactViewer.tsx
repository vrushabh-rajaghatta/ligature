
/**
 * DocumentArtifactViewer — v0.125.32
 *
 * Co-display viewer for the three document artifact types:
 *
 *   master  — single source of truth; shared across all referencing applications.
 *             Banner lists every application that includes this document.
 *             Edits propagate everywhere via the approval workflow.
 *
 *   derived — region/country-specific variant derived from a master.
 *             Rendered side-by-side with the master (toggle on/off).
 *             Delta sections highlighted in amber.
 *
 *   archive — frozen "as-submitted" point-in-time snapshot.
 *             Immutable. SHA-256 integrity badge. Sequence + submission date.
 *             Always shows what was actually in the eCTD sequence.
 */

import { useState } from 'react';
import {
  Shield, GitBranch, Archive, Link2, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, Lock, FileText, Globe, Copy,
  Download, ExternalLink, Eye, Hash, Calendar, Clock, Users,
  SplitSquareHorizontal, Layers,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ArtifactType = 'master' | 'derived' | 'archive';

export interface ArtifactSection {
  id: string;
  number: string;        // e.g. '2.5.1'
  title: string;
  wordCount: number;
  status: 'complete' | 'in-progress' | 'not-started';
  hasDeviation?: boolean;  // derived only — differs from master
  deviationNote?: string;
  content?: string;        // truncated preview
}

export interface SubmissionArchiveRef {
  submissionId: string;
  applicationNumber: string;   // 'NDA 215847'
  regionFlag: string;
  sequenceNumber: number;
  submittedAt: string;         // ISO
  esigHash: string;            // SHA-256
  esigSignatory: string;
  esigTimestamp: string;
}

export interface ArtifactDocument {
  id: string;
  artifactType: ArtifactType;
  ctdSection: string;          // 'CTD 2.5' | 'CTD 5.3.5.1' etc.
  documentType: string;        // 'Clinical Overview' | 'CSR' | 'USPI' | 'SmPC'
  title: string;
  version: string;
  status: 'draft' | 'in-review' | 'approved' | 'locked' | 'archived';
  language: string;
  authorName: string;
  ownerName: string;
  updatedAt: string;
  wordCount: number;
  sections: ArtifactSection[];

  // master only
  sharedAcrossApplications?: { flag: string; appNumber: string; type: string }[];
  referencedByCount?: number;

  // derived only
  masterDocumentId?: string;
  masterDocumentTitle?: string;
  derivedForApplication?: string;   // 'NDA 215847'
  derivedForRegion?: string;        // 'US' | 'EU-DE' | 'JP'
  derivedForFlag?: string;
  deviationSummary?: string;
  deviatingCount?: number;          // sections that differ from master

  // archive only
  archive?: SubmissionArchiveRef;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const SHARED_SECTIONS_CLINICAL_OVERVIEW: ArtifactSection[] = [
  { id: 's1', number: '2.5.1', title: 'Product Development Rationale', wordCount: 2840, status: 'complete',
    content: 'Ligrastinib (LIG-2847) is a selective, irreversible covalent inhibitor of KRAS G12C designed to address the unmet need in previously treated KRAS G12C-mutant NSCLC...' },
  { id: 's2', number: '2.5.2', title: 'Overview of Biopharmaceutics', wordCount: 1920, status: 'complete',
    content: 'Ligrastinib is formulated as an immediate-release oral tablet at 200 mg and 400 mg strengths. Absolute bioavailability is approximately 67% under fasted conditions...' },
  { id: 's3', number: '2.5.3', title: 'Overview of Clinical Pharmacology', wordCount: 3140, status: 'complete',
    content: 'Population PK analysis of 847 patients across three studies demonstrated dose-proportional exposure with a terminal half-life of 11.4 hours...' },
  { id: 's4', number: '2.5.4', title: 'Overview of Efficacy', wordCount: 4820, status: 'complete',
    content: 'LIG-2847-301 (CLARITY-1): In 847 patients randomised 1:1 to ligrastinib 400mg QD vs docetaxel, median OS was 14.7 months vs 9.2 months (HR 0.61, 95% CI 0.51–0.74; p<0.0001)...' },
  { id: 's5', number: '2.5.5', title: 'Overview of Safety', wordCount: 3960, status: 'complete',
    content: 'Treatment-emergent adverse events of any grade occurred in 94.2% of patients. Grade ≥3 TEAEs were reported in 42.1% of patients. Hepatotoxicity (any grade) was observed in 18.3%...' },
  { id: 's6', number: '2.5.6', title: 'Benefits and Risks Conclusions', wordCount: 1240, status: 'complete',
    content: 'The benefit-risk profile of ligrastinib is considered favourable for the treatment of adult patients with previously treated, locally advanced or metastatic KRAS G12C+ NSCLC...' },
];

const DERIVED_SECTIONS_US: ArtifactSection[] = [
  { ...SHARED_SECTIONS_CLINICAL_OVERVIEW[0] },
  { ...SHARED_SECTIONS_CLINICAL_OVERVIEW[1] },
  { ...SHARED_SECTIONS_CLINICAL_OVERVIEW[2] },
  { ...SHARED_SECTIONS_CLINICAL_OVERVIEW[3] },
  {
    ...SHARED_SECTIONS_CLINICAL_OVERVIEW[4],
    hasDeviation: true,
    deviationNote: 'US REMS programme language added per FDA request (RTF Cycle 1). Hepatotoxicity monitoring frequency updated from every 4 weeks to every 2 weeks during the first 3 months.',
    content: 'Treatment-emergent adverse events of any grade occurred in 94.2% of patients... [REMS Programme: Ligrastinib is available only through a restricted programme under a REMS called the NEXAVANT REMS...]',
  },
  {
    ...SHARED_SECTIONS_CLINICAL_OVERVIEW[5],
    hasDeviation: true,
    deviationNote: 'US Prescribing Information cross-reference added. FDA-specific benefit-risk language aligned with Prescribing Information Highlights.',
    content: 'The benefit-risk profile of ligrastinib is considered favourable... [See Full Prescribing Information for complete Boxed Warning, Warnings and Precautions, and Adverse Reactions]',
  },
];

export const MOCK_ARTIFACT_DOCUMENTS: ArtifactDocument[] = [
  // ── Master: Clinical Overview CTD 2.5 ────────────────────────────────────────
  {
    id: 'art-master-co-lig2847',
    artifactType: 'master',
    ctdSection: 'CTD 2.5',
    documentType: 'Clinical Overview',
    title: 'Clinical Overview — Ligrastinib (LIG-2847) — KRAS G12C+ NSCLC',
    version: '3.1',
    status: 'approved',
    language: 'en',
    authorName: 'Dr. Sarah Chen',
    ownerName: 'Dr. James Liu',
    updatedAt: '2025-01-15T09:00:00Z',
    wordCount: 17920,
    sections: SHARED_SECTIONS_CLINICAL_OVERVIEW,
    sharedAcrossApplications: [
      { flag: '🇺🇸', appNumber: 'NDA 215847', type: 'NDA' },
      { flag: '🇪🇺', appNumber: 'EMEA/H/C/006123', type: 'MAA' },
      { flag: '🇯🇵', appNumber: 'JNDA 30100123', type: 'JNDA' },
      { flag: '🇨🇦', appNumber: 'NDS-CA-2024-0156', type: 'NDS' },
      { flag: '🇬🇧', appNumber: 'PLGB-2024-00891', type: 'MAA' },
    ],
    referencedByCount: 5,
  },

  // ── Derived: US-specific Clinical Overview ────────────────────────────────────
  {
    id: 'art-derived-co-us-lig2847',
    artifactType: 'derived',
    ctdSection: 'CTD 2.5',
    documentType: 'Clinical Overview (US)',
    title: 'Clinical Overview — Ligrastinib — NDA 215847 (US-specific)',
    version: '3.1-US',
    status: 'approved',
    language: 'en',
    authorName: 'Dr. Sarah Chen',
    ownerName: 'Dr. James Liu',
    updatedAt: '2025-01-22T14:30:00Z',
    wordCount: 18340,
    sections: DERIVED_SECTIONS_US,
    masterDocumentId: 'art-master-co-lig2847',
    masterDocumentTitle: 'Clinical Overview — Ligrastinib (LIG-2847) — KRAS G12C+ NSCLC',
    derivedForApplication: 'NDA 215847',
    derivedForRegion: 'US',
    derivedForFlag: '🇺🇸',
    deviationSummary: 'US REMS language added to §2.5.5. FDA Prescribing Information cross-reference added to §2.5.6. Hepatotoxicity monitoring updated from 4-weekly to 2-weekly in months 1–3.',
    deviatingCount: 2,
  },

  // ── Derived: EU/DE SmPC ───────────────────────────────────────────────────────
  {
    id: 'art-derived-smpc-de-lig2847',
    artifactType: 'derived',
    ctdSection: 'CTD Module 1 — Annex I',
    documentType: 'SmPC (Germany)',
    title: 'Zusammenfassung der Merkmale des Arzneimittels — Nexavant — Deutschland',
    version: '1.0-DE',
    status: 'in-review',
    language: 'de',
    authorName: 'Dr. Petra Müller',
    ownerName: 'Dr. James Liu',
    updatedAt: '2025-02-10T11:00:00Z',
    wordCount: 9840,
    sections: [
      { id: 'd1', number: '4.1', title: 'Anwendungsgebiete', wordCount: 280, status: 'complete' },
      { id: 'd2', number: '4.2', title: 'Dosierung und Art der Anwendung', wordCount: 640, status: 'complete' },
      { id: 'd3', number: '4.3', title: 'Gegenanzeigen', wordCount: 190, status: 'complete' },
      { id: 'd4', number: '4.4', title: 'Besondere Warnhinweise', wordCount: 1840, status: 'complete',
        hasDeviation: true, deviationNote: 'BfArM-specific hepatotoxicity warning language updated per DE national assessment report. Additional German post-marketing surveillance requirement noted.' },
      { id: 'd5', number: '4.5', title: 'Wechselwirkungen', wordCount: 920, status: 'complete' },
      { id: 'd6', number: '4.8', title: 'Nebenwirkungen', wordCount: 2140, status: 'complete' },
    ],
    masterDocumentId: 'art-master-smpc',
    masterDocumentTitle: 'Summary of Product Characteristics — Nexavant (MAA Core SmPC)',
    derivedForApplication: 'EMEA/H/C/006123',
    derivedForRegion: 'EU-DE',
    derivedForFlag: '🇩🇪',
    deviationSummary: 'Section 4.4 updated with BfArM hepatotoxicity language. German PMS requirement added.',
    deviatingCount: 1,
  },

  // ── Archive: NDA 215847 Seq 003 — CSR LIG-2847-301 ───────────────────────────
  {
    id: 'art-archive-csr-301-seq3',
    artifactType: 'archive',
    ctdSection: 'CTD 5.3.5.1',
    documentType: 'Clinical Study Report',
    title: 'Clinical Study Report — LIG-2847-301 (CLARITY-1) — As Submitted NDA 215847 Seq 003',
    version: '2.0',
    status: 'archived',
    language: 'en',
    authorName: 'Dr. Emily Watson',
    ownerName: 'Dr. Sarah Chen',
    updatedAt: '2024-11-28T16:00:00Z',
    wordCount: 124800,
    sections: [
      { id: 'a1', number: '1',   title: 'Title Page', wordCount: 120, status: 'complete' },
      { id: 'a2', number: '2',   title: 'Synopsis', wordCount: 1840, status: 'complete' },
      { id: 'a3', number: '9',   title: 'Rationale and Background', wordCount: 3200, status: 'complete' },
      { id: 'a4', number: '10',  title: 'Study Objectives', wordCount: 480, status: 'complete' },
      { id: 'a5', number: '11',  title: 'Investigational Plan', wordCount: 8400, status: 'complete' },
      { id: 'a6', number: '12',  title: 'Study Patients', wordCount: 4200, status: 'complete' },
      { id: 'a7', number: '14',  title: 'Efficacy Evaluation', wordCount: 18400, status: 'complete' },
      { id: 'a8', number: '15',  title: 'Safety Evaluation', wordCount: 22800, status: 'complete' },
      { id: 'a9', number: '16',  title: 'Discussion and Overall Conclusions', wordCount: 6400, status: 'complete' },
    ],
    archive: {
      submissionId: 'sub-nda-215847-seq003',
      applicationNumber: 'NDA 215847',
      regionFlag: '🇺🇸',
      sequenceNumber: 3,
      submittedAt: '2024-12-01T00:00:00Z',
      esigHash: 'a7f3c91e8d042b56f1e49c30d72b5a14e83f960c47d2891be5a374fc0d918e27',
      esigSignatory: 'Dr. Sarah Chen, VP Global Regulatory Affairs',
      esigTimestamp: '2024-11-28T16:47:32Z',
    },
  },

  // ── Archive: MAA EMEA Seq 002 — Clinical Overview ─────────────────────────────
  {
    id: 'art-archive-co-maa-seq2',
    artifactType: 'archive',
    ctdSection: 'CTD 2.5',
    documentType: 'Clinical Overview',
    title: 'Clinical Overview — Ligrastinib — As Submitted EMEA/H/C/006123 Seq 002',
    version: '2.2',
    status: 'archived',
    language: 'en',
    authorName: 'Dr. Sarah Chen',
    ownerName: 'Dr. James Liu',
    updatedAt: '2024-09-14T10:00:00Z',
    wordCount: 17640,
    sections: SHARED_SECTIONS_CLINICAL_OVERVIEW.map(s => ({ ...s })),
    archive: {
      submissionId: 'sub-maa-006123-seq002',
      applicationNumber: 'EMEA/H/C/006123',
      regionFlag: '🇪🇺',
      sequenceNumber: 2,
      submittedAt: '2024-09-15T00:00:00Z',
      esigHash: 'c4b2d87f3a10e95619d348ac72e1f06b3c8475d12ea09c7b546f283de1972a40',
      esigSignatory: 'Dr. James Liu, Head of EU Regulatory Affairs',
      esigTimestamp: '2024-09-14T22:15:08Z',
    },
  },
];

// ─── Sub-components ─────────────────────────────────────────────────────────────

function ArtifactTypeBadge({ type }: { type: ArtifactType }) {
  const cfg = {
    master:  { icon: <Layers className="w-3 h-3" />,   label: 'Master',  cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
    derived: { icon: <GitBranch className="w-3 h-3" />, label: 'Derived', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    archive: { icon: <Archive className="w-3 h-3" />,   label: 'Archive', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  }[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SectionStatusDot({ status }: { status: ArtifactSection['status'] }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
      status === 'complete' ? 'bg-green-500' :
      status === 'in-progress' ? 'bg-amber-500' : 'bg-gray-500'
    }`} />
  );
}

// ─── Master banner ─────────────────────────────────────────────────────────────

function MasterBanner({ doc }: { doc: ArtifactDocument }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 mb-4">
      <div className="flex items-start gap-2">
        <Layers className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-violet-400">Shared master document</span>
            <span className="text-xs text-text-muted">
              Referenced by {doc.referencedByCount} application{doc.referencedByCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            {doc.sharedAcrossApplications?.map(a => (
              <span key={a.appNumber}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-card border border-border text-xs text-text-secondary">
                {a.flag} {a.appNumber}
                <span className="text-text-muted">· {a.type}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2">
            Changes to this document propagate to all referencing applications and require approval workflow sign-off.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Derived banner + master toggle ───────────────────────────────────────────

function DerivedBanner({ doc, showMaster, onToggle }: { doc: ArtifactDocument; showMaster: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-4">
      <div className="flex items-start gap-2">
        <GitBranch className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-amber-400">
              {doc.derivedForFlag} Derived — {doc.derivedForApplication}
            </span>
            {doc.deviatingCount! > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                <AlertTriangle className="w-2.5 h-2.5" />
                {doc.deviatingCount} section{doc.deviatingCount !== 1 ? 's' : ''} deviate from master
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Based on: <span className="text-text-secondary">{doc.masterDocumentTitle}</span>
          </p>
          {doc.deviationSummary && (
            <p className="text-xs text-amber-400/80 mt-1">{doc.deviationSummary}</p>
          )}
          <button
            onClick={onToggle}
            className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-surface-card border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            <SplitSquareHorizontal className="w-3 h-3" />
            {showMaster ? 'Hide master' : 'Show master side-by-side'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Archive banner ────────────────────────────────────────────────────────────

function ArchiveBanner({ doc }: { doc: ArtifactDocument }) {
  const [hashVisible, setHashVisible] = useState(false);
  const arch = doc.archive!;
  return (
    <div className="rounded-lg border border-slate-500/40 bg-slate-500/5 p-3 mb-4">
      <div className="flex items-start gap-2">
        <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-300">
              {arch.regionFlag} As Submitted — {arch.applicationNumber} Seq {arch.sequenceNumber.toString().padStart(4, '0')}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400">
              Immutable
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 mt-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Calendar className="w-3 h-3" />
              Submitted: <span className="text-text-secondary">
                {new Date(arch.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <Users className="w-3 h-3" />
              Signatory: <span className="text-text-secondary truncate">{arch.esigSignatory.split(',')[0]}</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <Clock className="w-3 h-3" />
              e-Sig: <span className="text-text-secondary">
                {new Date(arch.esigTimestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          {/* SHA-256 integrity */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <Shield className="w-3 h-3" />
              SHA-256 integrity verified
            </div>
            <button
              onClick={() => setHashVisible(v => !v)}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              <Hash className="w-3 h-3" />
            </button>
          </div>
          {hashVisible && (
            <div className="mt-1 font-mono text-[10px] text-text-muted bg-surface-card rounded px-2 py-1 break-all border border-border">
              {arch.esigHash}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section list ──────────────────────────────────────────────────────────────

function SectionList({ sections, showDeviations }: { sections: ArtifactSection[]; showDeviations?: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  return (
    <div className="space-y-1">
      {sections.map(s => {
        const isOpen = expanded.has(s.id);
        return (
          <div key={s.id}
            className={`rounded-lg border transition-colors ${
              s.hasDeviation && showDeviations
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-border bg-surface-card'
            }`}
          >
            <button
              onClick={() => toggle(s.id)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5"
            >
              <SectionStatusDot status={s.status} />
              <span className="text-xs font-mono text-text-muted w-10 flex-shrink-0">{s.number}</span>
              <span className="text-sm text-text-primary flex-1 truncate">{s.title}</span>
              {s.hasDeviation && showDeviations && (
                <span className="flex items-center gap-1 text-xs text-amber-400 flex-shrink-0">
                  <AlertTriangle className="w-3 h-3" />
                  Modified
                </span>
              )}
              <span className="text-xs text-text-muted flex-shrink-0 hidden sm:inline">
                {s.wordCount.toLocaleString()} words
              </span>
              {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-3 border-t border-border/50">
                {s.content && (
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">{s.content}</p>
                )}
                {s.hasDeviation && showDeviations && s.deviationNote && (
                  <div className="mt-2 flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">{s.deviationNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main viewer ───────────────────────────────────────────────────────────────

interface DocumentArtifactViewerProps {
  doc: ArtifactDocument;
  className?: string;
}

export function DocumentArtifactViewer({ doc, className = '' }: DocumentArtifactViewerProps) {
  const [showMaster, setShowMaster] = useState(false);
  const masterDoc = doc.artifactType === 'derived'
    ? MOCK_ARTIFACT_DOCUMENTS.find(d => d.id === doc.masterDocumentId)
    : undefined;

  const isArchive = doc.artifactType === 'archive';
  const isDerived = doc.artifactType === 'derived';
  const isMaster  = doc.artifactType === 'master';

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Document header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <ArtifactTypeBadge type={doc.artifactType} />
              <span className="text-xs text-text-muted font-mono">{doc.ctdSection}</span>
              {doc.language !== 'en' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-card border border-border text-text-muted uppercase">
                  {doc.language}
                </span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                doc.status === 'approved' || doc.status === 'archived' ? 'text-green-400 bg-green-500/10' :
                doc.status === 'in-review' ? 'text-amber-400 bg-amber-500/10' :
                doc.status === 'locked'    ? 'text-blue-400 bg-blue-500/10' :
                'text-text-muted bg-surface-card'
              }`}>
                {doc.status}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-text-primary leading-snug">{doc.title}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              v{doc.version} · {doc.wordCount.toLocaleString()} words · Updated {new Date(doc.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {doc.authorName}
            </p>
          </div>
          {/* Actions — disabled for archive */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isArchive && (
              <div className="flex items-center gap-1 text-xs text-slate-400 px-2 py-1 rounded border border-slate-500/30 bg-slate-500/10">
                <Lock className="w-3 h-3" />
                Read only
              </div>
            )}
            <button className="p-1.5 rounded hover:bg-surface-card text-text-muted hover:text-text-secondary transition-colors" title="Download">
              <Download className="w-4 h-4" />
            </button>
            {!isArchive && (
              <button className="p-1.5 rounded hover:bg-surface-card text-text-muted hover:text-text-secondary transition-colors" title="Open in editor">
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`${showMaster && masterDoc ? 'grid grid-cols-2 divide-x divide-border' : ''}`}>
          {/* Main document pane */}
          <div className="p-5 min-w-0">
            {isMaster  && <MasterBanner doc={doc} />}
            {isDerived && <DerivedBanner doc={doc} showMaster={showMaster} onToggle={() => setShowMaster(v => !v)} />}
            {isArchive && <ArchiveBanner doc={doc} />}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {doc.sections.length} Sections
              </h3>
              {isDerived && doc.deviatingCount! > 0 && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {doc.deviatingCount} modified from master
                </span>
              )}
            </div>
            <SectionList sections={doc.sections} showDeviations={isDerived} />
          </div>

          {/* Master pane — side-by-side when derived + showMaster */}
          {showMaster && masterDoc && (
            <div className="p-5 min-w-0 bg-surface">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-400">Master document</span>
                <span className="text-xs text-text-muted">v{masterDoc.version}</span>
              </div>
              <SectionList sections={masterDoc.sections} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Document list sidebar ─────────────────────────────────────────────────────

interface ArtifactDocumentListProps {
  selected: ArtifactDocument;
  onSelect: (doc: ArtifactDocument) => void;
}

export function ArtifactDocumentList({ selected, onSelect }: ArtifactDocumentListProps) {
  const groups = [
    { label: 'Master Documents', type: 'master' as ArtifactType },
    { label: 'Derived (Region/Country)', type: 'derived' as ArtifactType },
    { label: 'Submission Archives', type: 'archive' as ArtifactType },
  ];

  return (
    <div className="flex flex-col h-full">
      {groups.map(g => {
        const docs = MOCK_ARTIFACT_DOCUMENTS.filter(d => d.artifactType === g.type);
        if (docs.length === 0) return null;
        return (
          <div key={g.type} className="mb-2">
            <div className="px-3 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{g.label}</p>
            </div>
            {docs.map(doc => (
              <button
                key={doc.id}
                onClick={() => onSelect(doc)}
                className={`w-full text-left px-3 py-2.5 transition-colors border-l-2 ${
                  selected.id === doc.id
                    ? 'bg-surface-card border-l-violet-500 text-text-primary'
                    : 'border-l-transparent hover:bg-surface-card/50 text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <ArtifactTypeBadge type={doc.artifactType} />
                  {doc.derivedForFlag && <span className="text-sm leading-none">{doc.derivedForFlag}</span>}
                  {doc.archive?.regionFlag && <span className="text-sm leading-none">{doc.archive.regionFlag}</span>}
                </div>
                <div className="text-xs font-medium text-text-primary truncate">{doc.documentType}</div>
                <div className="text-[10px] text-text-muted truncate">{doc.ctdSection} · v{doc.version}</div>
                {doc.archive && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    Seq {doc.archive.sequenceNumber.toString().padStart(4, '0')} · {new Date(doc.archive.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
