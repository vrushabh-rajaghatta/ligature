
/**
 * CoDisplayBanner — v0.125.32
 *
 * Shown at the top of a document detail view to communicate its artifact role:
 *
 *   MASTER   → "Shared across N applications — changes propagate everywhere"
 *              Lists which applications reference this document.
 *
 *   DERIVED  → "Local variant of [master title] — N sections differ"
 *              Expandable delta list showing what changed locally.
 *              "View master" link.
 *
 *   ARCHIVE  → "As submitted — Seq N — frozen, immutable"
 *              Submission timestamp, eSig hash, eCTD path.
 *              SHA-256 integrity badge.
 */

import { useState } from 'react';
import {
  Share2, GitBranch, Archive, ChevronDown, ChevronUp,
  ShieldCheck, ExternalLink, AlertTriangle, Info,
} from 'lucide-react';
import type { AuthoringDocument } from '@/types/authoring';

interface CoDisplayBannerProps {
  document: AuthoringDocument;
  onViewMaster?: () => void;
}

// ─── Master banner ─────────────────────────────────────────────────────────────

function MasterBanner({ document }: { document: AuthoringDocument }) {
  const apps = document.sharedAcrossApplications ?? [];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/6 px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Share2 className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-violet-400">Master Document</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400">
              Shared across {apps.length} application{apps.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            This is the single source of truth. Changes here propagate to all referencing applications.
            Country-specific variants are derived from this document.
          </p>

          {apps.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'Hide' : 'Show'} referencing applications
              </button>

              {expanded && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {apps.map(app => (
                    <span
                      key={app.applicationId}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-surface-card border border-border text-text-secondary"
                    >
                      <span>{app.regionFlag}</span>
                      <span>{app.applicationNumber}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Derived banner ────────────────────────────────────────────────────────────

function DerivedBanner({
  document, onViewMaster,
}: {
  document: AuthoringDocument;
  onViewMaster?: () => void;
}) {
  const deltas = document.derivationDeltas ?? [];
  const [expanded, setExpanded] = useState(false);

  const deltaTypeLabel: Record<string, string> = {
    'language':          'Language translation',
    'content':           'Content deviation',
    'local-requirement': 'Local regulatory requirement',
  };

  const deltaTypeColor: Record<string, string> = {
    'language':          'text-blue-400 bg-blue-500/10',
    'content':           'text-amber-400 bg-amber-500/10',
    'local-requirement': 'text-red-400 bg-red-500/10',
  };

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/6 px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <GitBranch className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-blue-400">Derived Document</span>
            {deltas.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                {deltas.length} section{deltas.length !== 1 ? 's' : ''} differ from master
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Local variant of{' '}
            <button
              onClick={onViewMaster}
              className="text-blue-400 hover:underline font-medium"
            >
              {document.masterDocumentTitle ?? 'master document'}
            </button>
            . Common sections co-display from the master. Deviations are shown below.
          </p>

          {deltas.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'Hide' : 'Show'} deviations from master
              </button>

              {expanded && (
                <div className="mt-2 space-y-1.5">
                  {deltas.map((delta, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-3 py-2 rounded-md bg-surface-card border border-border"
                    >
                      <span className="text-xs text-text-muted w-8 flex-shrink-0 font-mono">
                        §{delta.sectionNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-text-primary">{delta.sectionTitle}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${deltaTypeColor[delta.deltaType] ?? 'text-gray-400 bg-gray-500/10'}`}>
                            {deltaTypeLabel[delta.deltaType] ?? delta.deltaType}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">{delta.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Archive banner ────────────────────────────────────────────────────────────

function ArchiveBanner({ document }: { document: AuthoringDocument }) {
  const meta = document.archiveMetadata;
  const [showHash, setShowHash] = useState(false);

  if (!meta) return null;

  const archivedDate = new Date(meta.archivedAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/6 px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Archive className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-amber-400">Submission Archive</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
              {meta.applicationNumber} · Seq {meta.sequenceNumber}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              Immutable
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Frozen as submitted on <span className="text-text-secondary font-medium">{archivedDate}</span> by {meta.archivedBy}.
            This document cannot be edited. It represents exactly what was submitted to the agency.
          </p>

          <div className="mt-2 flex items-center gap-4 flex-wrap">
            {/* eCTD path */}
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Info className="w-3 h-3 flex-shrink-0" />
              <span className="font-mono">{meta.ectdPath}</span>
            </div>

            {/* SHA-256 integrity */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowHash(v => !v)}
                className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 transition-colors"
              >
                <ShieldCheck className="w-3 h-3" />
                SHA-256 verified
                {showHash ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
              {showHash && (
                <span className="text-[10px] font-mono text-text-muted bg-surface-card border border-border px-2 py-0.5 rounded">
                  {meta.esigHash}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function CoDisplayBanner({ document, onViewMaster }: CoDisplayBannerProps) {
  if (!document.artifactType) return null;

  switch (document.artifactType) {
    case 'master':
      return <MasterBanner document={document} />;
    case 'derived':
      return <DerivedBanner document={document} onViewMaster={onViewMaster} />;
    case 'archive':
      return <ArchiveBanner document={document} />;
    default:
      return null;
  }
}
