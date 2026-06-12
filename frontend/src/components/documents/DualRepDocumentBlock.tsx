
/**
 * DualRepDocumentBlock — v0.125.75
 *
 * Standardised eCTD dual-representation block for any regulatory slide-over.
 * Renders:
 *   1. Study/Report Document Package (clickable cards → real regulatory PDFs)
 *   2. eCTD Placement metadata
 *   3. Footer explaining the dual-rep model
 *
 * Copy this pattern verbatim into every module that generates regulatory docs:
 *   Research (preclinical) ← already implemented in ResearchScreen
 *   Clinical   ← HandoffTab (CSR), ProtocolTab (Protocol + ICF)
 *   CMC        ← StabilityScreen, CMCScreen analytical / drug sub/product
 *   Safety     ← DSUR, ICSRs, periodic safety reports  (future)
 *   Nonclinical ← all non-preclinical regulatory-grade study reports (future)
 *
 * The document is the master; structured data is derived. Footer copy is
 * replicated verbatim from the preclinical slide-over per roadmap spec.
 */

import { FileText, Database } from 'lucide-react';

export interface DualRepDoc {
  label: string;
  ectdPath: string;
  type: 'report' | 'protocol' | 'icf' | 'summary' | 'raw-data' | 'method' | 'stability';
  sampleUrl?: string;
}

export interface DualRepEctdMeta {
  module: string;         // e.g. 'Module 5.3'
  section: string;        // e.g. '5.3.5.1 — Reports of Controlled Clinical Studies'
  ichReference?: string;  // e.g. 'ICH E3 §11.4'
}

interface DualRepDocumentBlockProps {
  /** Section heading above the document cards */
  packageTitle?: string;
  docs: DualRepDoc[];
  ectdMeta: DualRepEctdMeta;
  /** Module-specific structured data callout — what IS stored as structured data */
  structuredDataNote?: string;
}

const TYPE_STYLES: Record<DualRepDoc['type'], { bg: string; text: string; border: string }> = {
  report:    { bg: 'bg-accent-blue/10',   text: 'text-accent-blue',   border: 'border-accent-blue/30' },
  protocol:  { bg: 'bg-purple-500/10',    text: 'text-purple-400',    border: 'border-purple-500/30' },
  icf:       { bg: 'bg-teal-500/10',      text: 'text-teal-400',      border: 'border-teal-500/30' },
  summary:   { bg: 'bg-emerald-500/10',   text: 'text-emerald-400',   border: 'border-emerald-500/30' },
  'raw-data':{ bg: 'bg-amber-500/10',     text: 'text-amber-400',     border: 'border-amber-500/30' },
  method:    { bg: 'bg-violet-500/10',    text: 'text-violet-400',    border: 'border-violet-500/30' },
  stability: { bg: 'bg-orange-500/10',    text: 'text-orange-400',    border: 'border-orange-500/30' },
};

export function DualRepDocumentBlock({
  packageTitle = 'Regulatory Document Package',
  docs,
  ectdMeta,
  structuredDataNote,
}: DualRepDocumentBlockProps) {
  return (
    <div className="space-y-4">

      {/* 1. Document cards */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          {packageTitle}
        </h3>
        <div className="space-y-2">
          {docs.map((doc, i) => {
            const s = TYPE_STYLES[doc.type];
            return (
              <a
                key={i}
                href={doc.sampleUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-card hover:bg-surface hover:border-accent-blue/40 group cursor-pointer transition-colors no-underline"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg} ${s.text}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{doc.label}</div>
                  <div className="text-[10px] text-text-muted font-mono truncate mt-0.5">{doc.ectdPath}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${s.border} ${s.text} ${s.bg}`}>
                  {doc.type}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* 2. Structured data callout */}
      {structuredDataNote && (
        <div className="rounded-lg border border-accent-blue/25 bg-accent-blue/5 p-4">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-accent-blue mb-1">Structured Data — Not Just Documents</div>
              <p className="text-xs text-text-secondary leading-relaxed">{structuredDataNote}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. eCTD Placement */}
      <div className="rounded-lg border border-border bg-surface-card p-4">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">eCTD Placement</div>
        <div className="space-y-1">
          {[
            { label: 'Module',    value: ectdMeta.module },
            { label: 'Section',   value: ectdMeta.section },
            ...(ectdMeta.ichReference ? [{ label: 'ICH Reference', value: ectdMeta.ichReference }] : []),
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span className="text-text-muted">{row.label}</span>
              <span className="font-mono text-text-primary text-right max-w-[60%] truncate">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Dual-rep footer — verbatim from preclinical slide-over per roadmap spec */}
      <div className="text-xs text-text-muted italic border-l-2 border-border pl-3">
        Documents are stored in the eCTD hierarchy and are the regulatory master record.
        Structured data extracted from these reports is available in the Structured Data tab.
        Ligature maintains dual representation: the document for regulatory submission, the data for operational intelligence.
      </div>

    </div>
  );
}
