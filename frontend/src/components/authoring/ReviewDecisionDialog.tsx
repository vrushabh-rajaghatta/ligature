
/**
 * ReviewDecisionDialog — v0.125.98
 * Full-screen split layout: document content (left) + review decision form (right).
 * Replaces the old modal-only approach where reviewers had no visibility into the document.
 * 21 CFR Part 11 compliant — decision is recorded with reviewer identity and timestamp.
 */

import { useState } from 'react';
import {
  Check, X, MessageSquare, CheckCircle, XCircle,
  FileText, Edit3, ThumbsUp, Send, ChevronRight, ChevronDown,
  Shield, Clock, User, AlertTriangle,
} from 'lucide-react';
import { ReviewAction, AuthoringDocument } from '@/types/authoring';

interface ReviewDecisionDialogProps {
  document: AuthoringDocument;
  reviewerName: string;
  stageName: string;
  onClose: () => void;
  onSubmit: (decision: ReviewAction, comments: string) => void;
}

// ── Document section tree renderer ───────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  content?: string;
  wordCount?: number;
  children?: Section[];
  status?: string;
}

function SectionBlock({ section, depth = 0 }: { section: Section; depth?: number }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = section.children && section.children.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-border pl-4' : ''} mb-4`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-start gap-2 group mb-2"
      >
        {hasChildren && (
          <span className="mt-0.5 text-text-muted flex-shrink-0">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        )}
        {!hasChildren && <span className="w-3.5 flex-shrink-0" />}
        <span className={`font-semibold text-text-primary ${depth === 0 ? 'text-base' : depth === 1 ? 'text-sm' : 'text-xs'}`}>
          {section.title}
        </span>
        {section.wordCount && (
          <span className="ml-auto text-[10px] text-text-muted flex-shrink-0">{section.wordCount} words</span>
        )}
      </button>
      {open && (
        <>
          {section.content && (
            <div className="mb-3 px-1">
              <p className="text-sm text-text-secondary leading-relaxed">{section.content}</p>
            </div>
          )}
          {hasChildren && section.children!.map(child => (
            <SectionBlock key={child.id} section={child} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  );
}

// ── Build section tree from AuthoringDocument ────────────────────────────────

function buildSections(doc: AuthoringDocument): Section[] {
  if (doc.sections && doc.sections.length > 0) {
    return doc.sections.map((s: any) => ({
      id: s.id,
      title: s.title || s.name || 'Untitled Section',
      content: s.content || s.draftContent || s.latestDraftContent || s.body || '',
      wordCount: s.wordCount || (s.content ? Math.round(s.content.split(' ').length) : undefined),
      status: s.status,
      children: s.subsections?.map((sub: any) => ({
        id: sub.id,
        title: sub.title || sub.name || 'Subsection',
        content: sub.content || sub.draftContent || sub.body || '',
        wordCount: sub.wordCount,
      })) || [],
    }));
  }

  // Fallback: synthesise from document metadata
  return [
    {
      id: 'overview',
      title: 'Document Overview',
      content: `${doc.shortTitle} — ${doc.documentType || doc.type || 'Regulatory Document'}. Version ${doc.version}. Prepared by ${doc.authorName || 'the authoring team'} for ${doc.stageName || 'regulatory review'}.`,
    },
    {
      id: 'content',
      title: 'Document Content',
      content: doc.synopsis || doc.description || `This document is pending content authoring. The structured sections have been defined and are ready for review in this stage (${doc.stageName || 'Cross-Functional Review'}).`,
    },
    ...(doc.ctdSection ? [{
      id: 'ctd',
      title: `CTD Placement: ${doc.ctdSection}`,
      content: `This document maps to CTD section ${doc.ctdSection} of the regulatory submission package.`,
    }] : []),
  ];
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReviewDecisionDialog({
  document,
  reviewerName,
  stageName,
  onClose,
  onSubmit,
}: ReviewDecisionDialogProps) {
  const [selectedDecision, setSelectedDecision] = useState<ReviewAction | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sections = buildSections(document);

  const decisions: {
    action: ReviewAction;
    label: string;
    description: string;
    icon: React.ReactNode;
    activeClass: string;
    iconClass: string;
  }[] = [
    {
      action: 'approve',
      label: 'Approve',
      description: 'Document meets all requirements and is ready for next stage',
      icon: <CheckCircle className="w-5 h-5" />,
      activeClass: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5',
      iconClass: 'text-emerald-400',
    },
    {
      action: 'approve-with-comments',
      label: 'Approve with Comments',
      description: 'Acceptable — minor suggestions for improvement',
      icon: <ThumbsUp className="w-5 h-5" />,
      activeClass: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5',
      iconClass: 'text-blue-400',
    },
    {
      action: 'request-revision',
      label: 'Request Revision',
      description: 'Document requires changes before it can be approved',
      icon: <Edit3 className="w-5 h-5" />,
      activeClass: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5',
      iconClass: 'text-amber-400',
    },
    {
      action: 'reject',
      label: 'Reject',
      description: 'Significant issues — cannot proceed in current form',
      icon: <XCircle className="w-5 h-5" />,
      activeClass: 'border-red-500 ring-2 ring-red-500/20 bg-red-500/5',
      iconClass: 'text-red-400',
    },
  ];

  const requiresComments = selectedDecision === 'request-revision' || selectedDecision === 'reject';
  const canSubmit = selectedDecision && (!requiresComments || comments.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    onSubmit(selectedDecision!, comments);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-surface-elevated z-50 flex flex-col">

      {/* ── Top bar ── */}
      <div className="flex-none h-12 border-b border-border bg-surface px-4 flex items-center gap-3">
        <div className="p-1.5 bg-amber-500/15 rounded">
          <Shield className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Review Mode</span>
          <span className="text-text-muted mx-2">·</span>
          <span className="text-sm font-medium text-text-primary truncate">{document.shortTitle}</span>
          <span className="text-text-muted mx-2">·</span>
          <span className="text-xs text-text-muted">{stageName}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {reviewerName}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleTimeString()}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-card text-text-muted hover:text-text-primary">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Body: split ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT — Document content */}
        <div className="flex-1 min-w-0 overflow-y-auto border-r border-border bg-white dark:bg-surface-elevated">
          <div className="max-w-3xl mx-auto p-10">

            {/* Document title page */}
            <div className="text-center mb-10 pb-8 border-b border-slate-200 dark:border-border">
              <div className="text-xs text-slate-500 dark:text-text-muted mb-2 uppercase tracking-widest">
                {document.documentType || document.type || 'Regulatory Document'} · v{document.version}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-text-primary mb-3 leading-tight">
                {document.shortTitle}
              </h1>
              <div className="text-sm text-slate-600 dark:text-text-secondary space-y-1">
                {document.authorName && <p>Prepared by: {document.authorName}</p>}
                {document.ctdSection && <p>CTD Section: {document.ctdSection}</p>}
                <p>Status: <span className="font-medium">{document.status}</span></p>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-2">
              {sections.map(s => (
                <SectionBlock key={s.id} section={s} depth={0} />
              ))}
            </div>

            {/* Footer watermark */}
            <div className="mt-12 pt-6 border-t border-slate-200 dark:border-border text-center">
              <p className="text-[10px] text-slate-400 dark:text-text-muted tracking-wider uppercase">
                CONFIDENTIAL · FOR REVIEW ONLY · Ligature IDOP · {document.documentId}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — Decision panel */}
        <div className="w-[400px] flex-shrink-0 flex flex-col bg-surface overflow-hidden">

          {/* Reviewer info */}
          <div className="flex-none p-4 border-b border-border">
            <div className="flex items-center gap-3 p-3 bg-surface-card rounded-lg">
              <div className="w-9 h-9 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-accent-blue">
                  {reviewerName.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">{reviewerName}</div>
                <div className="text-xs text-text-muted">{stageName} · Reviewer</div>
              </div>
            </div>
          </div>

          {/* Decision options */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Your Decision *
              </div>
              <div className="space-y-2">
                {decisions.map(d => (
                  <button
                    key={d.action}
                    onClick={() => setSelectedDecision(d.action)}
                    className={`w-full p-3.5 border rounded-xl text-left transition-all ${
                      selectedDecision === d.action ? d.activeClass : 'border-border bg-surface-card hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex-shrink-0 ${selectedDecision === d.action ? d.iconClass : 'text-text-muted'}`}>
                        {d.icon}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-text-primary">{d.label}</span>
                          {selectedDecision === d.action && (
                            <Check className={`w-4 h-4 ${d.iconClass}`} />
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{d.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                Comments {requiresComments ? <span className="text-red-400 ml-1">* required</span> : <span className="text-text-muted/60">(optional)</span>}
              </label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder={requiresComments
                  ? 'Please explain what needs to be changed or why this is being rejected…'
                  : 'Add any comments or feedback for the author…'}
                rows={5}
                className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue resize-none"
              />
              {requiresComments && !comments.trim() && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Required for this decision type
                </p>
              )}
            </div>

            {/* Part 11 notice */}
            <div className="p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-accent-blue mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Your decision will be recorded with your identity, timestamp, and document version under 21 CFR Part 11. The author and workflow coordinator will be notified immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Submit footer */}
          <div className="flex-none border-t border-border p-4 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-accent-blue text-white rounded-lg text-sm font-semibold hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Decision
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
