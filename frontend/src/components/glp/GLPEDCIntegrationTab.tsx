/**
 * GLPEDCIntegrationTab
 *
 * Full EDC/LIMS integration management for GLP studies.
 * Features:
 *   - Connection registry with health indicators
 *   - Per-endpoint data completeness breakdown
 *   - Integrity flag list with 21 CFR Part 58 citations
 *   - Manual sync trigger with animated progress
 *   - AI-powered ALCOA+ assessment (analyze-integrity)
 *   - AI endpoint deep-dive (assess-endpoint)
 *   - AI CAPA plan generator (generate-capa)
 *   - Add/remove connector modal (stubbed)
 *
 * @version 0.94.0
 */


import React, { useState, useCallback } from 'react';
import {
  Activity, Database, RefreshCw, CheckCircle, AlertTriangle, AlertCircle,
  XCircle, Clock, Zap, Link2, Plus, Eye, Trash2, ChevronDown, ChevronRight,
  Shield, FileText, BarChart3, Cpu, Lock, Unlock, X, ExternalLink, Download,
  ArrowRight, Loader2, Sparkles, ClipboardList,
} from 'lucide-react';
import { useGLPEDCPersistence } from '@/hooks/useGLPEDCPersistence';
import type { GLPEDCLink, GLPEDCEndpoint, IntegrityFlag, GLPEDCSyncResult } from '@/hooks/useGLPEDCPersistence';
import type { GLPStudy } from '@/store/glpTypes';

// =============================================================================
// HELPERS
// =============================================================================

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatNextSync(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return 'due now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  return `in ${Math.floor(mins / 60)}h`;
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-status-success', bg: 'bg-status-success/10', icon: CheckCircle },
  'pending-validation': { label: 'Pending Validation', color: 'text-status-warning', bg: 'bg-status-warning/10', icon: Clock },
  suspended: { label: 'Suspended', color: 'text-status-error', bg: 'bg-status-error/10', icon: XCircle },
  disconnected: { label: 'Disconnected', color: 'text-text-muted', bg: 'bg-surface-hover', icon: XCircle },
};

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-status-error', bg: 'bg-status-error/10', border: 'border-status-error/30' },
  major: { label: 'Major', color: 'text-status-warning', bg: 'bg-status-warning/10', border: 'border-status-warning/30' },
  minor: { label: 'Minor', color: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/30' },
};

const VENDOR_DISPLAY: Record<string, string> = {
  'medidata-rave': 'Medidata Rave',
  'oracle-inform': 'Oracle InForm',
  'oracle-clinical-one': 'Oracle Clinical One',
  'labware-lims': 'LabWare LIMS',
  'labvantage': 'LabVantage',
  'dotmatics': 'Dotmatics',
  'veeva-edc': 'Veeva EDC',
  'custom-lims': 'Custom LIMS',
};

// =============================================================================
// ALCOA+ RADAR MINI-CHART (pure SVG)
// =============================================================================

function AlcoaPlusRadar({ scores }: { scores: Record<string, number> }) {
  const items = Object.entries(scores);
  const n = items.length;
  const cx = 90; const cy = 90; const r = 65;

  const points = items.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const score = items[i][1] / 100;
    return {
      x: cx + r * score * Math.cos(angle),
      y: cy + r * score * Math.sin(angle),
      lx: cx + (r + 18) * Math.cos(angle),
      ly: cy + (r + 18) * Math.sin(angle),
      label: items[i][0].charAt(0).toUpperCase() + items[i][0].slice(1),
      score: items[i][1],
    };
  });

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Grid lines at 25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44">
      {/* Grid */}
      {gridLevels.map((level, gi) => {
        const gPts = items.map((_, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          return `${cx + r * level * Math.cos(angle)},${cy + r * level * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={gi} points={gPts} fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.6" />;
      })}
      {/* Axis lines */}
      {items.map((_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="var(--border)" strokeWidth="0.5" opacity="0.5"
          />
        );
      })}
      {/* Score polygon */}
      <polygon points={polyPoints} fill="var(--accent-teal)" fillOpacity="0.2" stroke="var(--accent-teal)" strokeWidth="1.5" />
      {/* Dots */}
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent-teal)" />)}
      {/* Labels */}
      {points.map((p, i) => (
        <text key={i} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle"
          fontSize="7" fill="var(--text-secondary)" fontFamily="system-ui">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// =============================================================================
// COMPLETENESS BAR
// =============================================================================

function CompletenessBar({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const color = value >= 95 ? 'bg-status-success' : value >= 80 ? 'bg-status-warning' : 'bg-status-error';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-surface-hover rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      {showLabel && <span className="text-xs text-text-muted tabular-nums w-8 text-right">{value}%</span>}
    </div>
  );
}

// =============================================================================
// SYNC RESULT PANEL
// =============================================================================

function SyncResultPanel({ result, onClose }: { result: GLPEDCSyncResult; onClose: () => void }) {
  const isOk = result.status === 'success';
  const isPartial = result.status === 'partial';

  return (
    <div className={`rounded-xl border p-4 mb-4 ${isOk ? 'border-status-success/30 bg-status-success/5' : isPartial ? 'border-status-warning/30 bg-status-warning/5' : 'border-status-error/30 bg-status-error/5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {isOk ? <CheckCircle className="w-4 h-4 text-status-success shrink-0" /> : isPartial ? <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" /> : <XCircle className="w-4 h-4 text-status-error shrink-0" />}
          <div>
            <p className="text-sm font-medium text-text-primary">Sync {result.status === 'success' ? 'Completed' : result.status === 'partial' ? 'Completed with Issues' : 'Failed'}</p>
            <p className="text-xs text-text-muted mt-0.5">{result.message}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mt-3">
        {[
          { label: 'Retrieved', value: result.recordsRetrieved },
          { label: 'Created', value: result.recordsCreated },
          { label: 'Updated', value: result.recordsUpdated },
          { label: 'New Flags', value: result.newIntegrityFlags.length, accent: result.newIntegrityFlags.length > 0 },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-card rounded-lg p-2 text-center">
            <p className={`text-lg font-bold ${stat.accent ? 'text-status-warning' : 'text-text-primary'}`}>{stat.value}</p>
            <p className="text-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {result.newIntegrityFlags.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-text-secondary">New Integrity Flags</p>
          {result.newIntegrityFlags.map(flag => (
            <div key={flag.id} className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${SEVERITY_CONFIG[flag.severity].bg} ${SEVERITY_CONFIG[flag.severity].border}`}>
              <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${SEVERITY_CONFIG[flag.severity].color}`} />
              <div className="min-w-0">
                <span className={`font-medium ${SEVERITY_CONFIG[flag.severity].color}`}>[{flag.severity.toUpperCase()}]</span>
                <span className="text-text-secondary ml-1">{flag.endpoint}:</span>
                <span className="text-text-muted ml-1">{flag.description}</span>
                <span className="text-text-muted ml-1 opacity-60">— {flag.regulatoryRef}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AI INTEGRITY PANEL
// =============================================================================

interface AIIntegrityResult {
  alcoaScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  submissionReady: boolean;
  alcoaPlusEvaluation: Record<string, number>;
  criticalFindings: string[];
  regulatoryRisk: string;
  remediationPlan: string[];
  executiveSummary: string;
}

function AIIntegrityPanel({ result, source, onClose }: { result: AIIntegrityResult; source: string; onClose: () => void }) {
  const riskColor = {
    low: 'text-status-success', medium: 'text-status-warning',
    high: 'text-status-error', critical: 'text-status-error',
  }[result.riskLevel];

  const riskBg = {
    low: 'bg-status-success/10 border-status-success/30',
    medium: 'bg-status-warning/10 border-status-warning/30',
    high: 'bg-status-error/10 border-status-error/30',
    critical: 'bg-status-error/10 border-status-error/30',
  }[result.riskLevel];

  return (
    <div className="rounded-xl border border-accent-teal/30 bg-accent-teal/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-teal shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">AI Data Integrity Assessment</p>
            <p className="text-xs text-text-muted">{source === 'ai' ? 'Powered by Claude' : 'Rule-based analysis'}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scores row */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-accent-teal">{result.alcoaScore}</p>
          <p className="text-xs text-text-muted mt-0.5">ALCOA+ Score</p>
        </div>
        <div className={`rounded-lg border px-3 py-2 text-center ${riskBg}`}>
          <p className={`text-sm font-semibold uppercase tracking-wide ${riskColor}`}>{result.riskLevel} risk</p>
          <p className="text-xs text-text-muted mt-0.5">{result.submissionReady ? '✓ Submission ready' : '✗ Not submission ready'}</p>
        </div>
        {result.alcoaPlusEvaluation && (
          <div className="ml-auto">
            <AlcoaPlusRadar scores={result.alcoaPlusEvaluation} />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-text-secondary leading-relaxed">{result.executiveSummary}</div>

      {/* Critical findings */}
      {result.criticalFindings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-status-error uppercase tracking-wide">Critical Findings</p>
          {result.criticalFindings.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-text-secondary">
              <AlertCircle className="w-3.5 h-3.5 text-status-error shrink-0 mt-0.5" />
              {f}
            </div>
          ))}
        </div>
      )}

      {/* Regulatory risk */}
      <div className="rounded-lg bg-surface-card border border-border p-3">
        <p className="text-xs font-medium text-text-secondary mb-1">Regulatory Risk</p>
        <p className="text-xs text-text-muted leading-relaxed">{result.regulatoryRisk}</p>
      </div>

      {/* Remediation plan */}
      {result.remediationPlan.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Remediation Plan</p>
          {result.remediationPlan.map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-text-muted">
              <span className="shrink-0 w-4 h-4 rounded-full bg-accent-teal/20 text-accent-teal text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
              {step}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AI CAPA PANEL
// =============================================================================

interface CAPAResult {
  capaTitle: string;
  rootCauseAnalysis: string;
  immediateActions: string[];
  correctiveActions: string[];
  preventiveActions: string[];
  timeline: { week: number; action: string }[];
  regulatoryBasis: string;
}

function AICAPAPanel({ result, source, onClose }: { result: CAPAResult; source: string; onClose: () => void }) {
  return (
    <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-accent-blue shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{result.capaTitle}</p>
            <p className="text-xs text-text-muted">{source === 'ai' ? 'AI-generated CAPA' : 'Rule-based CAPA'} · Draft for QA review</p>
          </div>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-lg bg-surface-card border border-border p-3">
        <p className="text-xs font-medium text-text-secondary mb-1">Root Cause Analysis</p>
        <p className="text-xs text-text-muted leading-relaxed">{result.rootCauseAnalysis}</p>
      </div>

      {[
        { label: 'Immediate Actions', items: result.immediateActions, color: 'text-status-error', bullet: '!' },
        { label: 'Corrective Actions', items: result.correctiveActions, color: 'text-status-warning', bullet: '→' },
        { label: 'Preventive Actions', items: result.preventiveActions, color: 'text-status-success', bullet: '✓' },
      ].map(section => (
        <div key={section.label}>
          <p className={`text-xs font-semibold ${section?.color ?? ''} uppercase tracking-wide mb-1.5`}>{section.label}</p>
          <div className="space-y-1">
            {section.items.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-text-muted">
                <span className="shrink-0 font-bold text-text-muted">{section.bullet}</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Implementation Timeline</p>
        <div className="space-y-2">
          {result.timeline.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-14 text-xs font-medium text-accent-blue shrink-0">Week {t.week}</div>
              <div className="flex-1 text-xs text-text-muted">{t.action}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-text-muted border-t border-border pt-3">
        <span className="font-medium">Regulatory basis: </span>{result.regulatoryBasis}
      </div>
    </div>
  );
}

// =============================================================================
// CONNECTOR CARD
// =============================================================================

interface ConnectorCardProps {
  link: GLPEDCLink;
  isSelected: boolean;
  onSelect: () => void;
  onSync: () => void;
  isSyncing: boolean;
  syncResult?: GLPEDCSyncResult;
  onDismissSyncResult: () => void;
}

function ConnectorCard({ link, isSelected, onSelect, onSync, isSyncing, syncResult, onDismissSyncResult }: ConnectorCardProps) {
  const [expandedEndpoints, setExpandedEndpoints] = useState(false);
  const statusCfg = STATUS_CONFIG[link.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className={`rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-accent-teal/60 bg-accent-teal/5 shadow-card' : 'border-border bg-surface-card hover:border-accent-teal/30'}`}>
      {/* Card header */}
      <div className="p-4" onClick={onSelect}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-accent-blue" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{link.vendorDisplayName}</p>
              <p className="text-xs text-text-muted truncate">Study: {link.studyNumber} · {link.vendorStudyId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg?.bg ?? ''} ${statusCfg?.color ?? ''}`}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </span>
            {link.environment !== 'production' && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-text-muted">{link.environment}</span>
            )}
          </div>
        </div>

        {/* Completeness + integrity row */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-muted">Data Completeness</p>
              <p className={`text-xs font-bold ${link.overallCompleteness >= 95 ? 'text-status-success' : link.overallCompleteness >= 80 ? 'text-status-warning' : 'text-status-error'}`}>
                {link.overallCompleteness}%
              </p>
            </div>
            <CompletenessBar value={link.overallCompleteness} showLabel={false} />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-text-muted mb-0.5">Integrity Flags</p>
              <p className={`text-sm font-bold ${link.integrityFlagCount > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                {link.integrityFlagCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Last Sync</p>
              <p className="text-xs text-text-secondary">{formatTimeAgo(link.lastSyncAt)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Next Sync</p>
              <p className="text-xs text-text-secondary">{formatNextSync(link.nextSyncAt)}</p>
            </div>
          </div>
        </div>

        {/* Compliance badges */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${link.computerSystemValidated ? 'border-status-success/30 bg-status-success/10 text-status-success' : 'border-status-error/30 bg-status-error/10 text-status-error'}`}>
            {link.computerSystemValidated ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            CSV {link.computerSystemValidated ? link.validationDocRef || 'Validated' : 'Not Validated'}
          </span>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${link.auditTrailEnabled ? 'border-status-success/30 bg-status-success/10 text-status-success' : 'border-status-error/30 bg-status-error/10 text-status-error'}`}>
            <Shield className="w-3 h-3" />
            Audit Trail {link.auditTrailEnabled ? 'On' : 'Off'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-text-muted">
            {link.dataFlowDirection === 'bidirectional' ? '⇄' : '↓'} {link.syncFrequencyHours}h sync
          </span>
        </div>
      </div>

      {/* Sync button row */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2 border-t border-border/50">
        <button
          onClick={(e) => { e.stopPropagation(); setExpandedEndpoints(v => !v); }}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          {expandedEndpoints ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          {link.endpoints.length} endpoint{link.endpoints.length !== 1 ? 's' : ''}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSync(); }}
          disabled={isSyncing}
          className="flex items-center gap-1.5 text-xs font-medium text-accent-teal hover:text-accent-teal/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>

      {/* Endpoint breakdown */}
      {expandedEndpoints && (
        <div className="border-t border-border px-4 pb-4 space-y-2 pt-3">
          {link.endpoints.map(ep => (
            <div key={ep.id} className="flex items-center gap-3">
              <div className="w-36 shrink-0">
                <p className="text-xs text-text-secondary truncate">{ep.name}</p>
                <p className="text-[10px] text-text-muted">{ep.totalReceived}/{ep.totalExpected}</p>
              </div>
              <div className="flex-1">
                <CompletenessBar value={ep.completionPercent} />
              </div>
              {ep.hasIntegrityFlags && (
                <AlertTriangle className="w-3.5 h-3.5 text-status-warning shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sync result inline */}
      {syncResult && (
        <div className="border-t border-border p-4">
          <SyncResultPanel result={syncResult} onClose={onDismissSyncResult} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN TAB COMPONENT
// =============================================================================

interface GLPEDCIntegrationTabProps {
  studies: GLPStudy[];
}

export function GLPEDCIntegrationTab({ studies }: GLPEDCIntegrationTabProps) {
  const { links, isLoading, isSyncing, lastSyncResult, triggerSync } = useGLPEDCPersistence();

  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [syncResultsByLink, setSyncResultsByLink] = useState<Record<string, GLPEDCSyncResult>>({});
  const [syncingLinkId, setSyncingLinkId] = useState<string | null>(null);

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIntegrityResult, setAiIntegrityResult] = useState<{ result: AIIntegrityResult; source: string } | null>(null);
  const [aiCapaResult, setAiCapaResult] = useState<{ result: CAPAResult; source: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const selectedLink = selectedLinkId ? links.find(l => l.id === selectedLinkId) : links[0];

  // ---- Sync handler -------------------------------------------------------
  const handleSync = useCallback(async (link: GLPEDCLink) => {
    setSyncingLinkId(link.id);
    const result = await triggerSync(link.id, link.studyId);
    if (result) {
      setSyncResultsByLink(prev => ({ ...prev, [link.id]: result }));
    }
    setSyncingLinkId(null);
  }, [triggerSync]);

  // ---- AI: Analyze Integrity -----------------------------------------------
  const handleAnalyzeIntegrity = useCallback(async () => {
    if (!selectedLink) return;
    setAiLoading(true);
    setAiError(null);
    setAiIntegrityResult(null);
    setAiCapaResult(null);

    const study = studies.find(s => s.id === selectedLink.studyId) || {
      studyNumber: selectedLink.studyNumber,
      title: 'GLP Study',
      studyType: 'toxicology',
      status: 'in-progress',
      regulatorySubmissionType: 'IND',
      testArticleName: 'Test Article',
    };

    try {
      const res = await fetch('/api/ai/glp-data-integrity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze-integrity',
          study: {
            studyNumber: selectedLink.studyNumber,
            title: (study as GLPStudy).title || 'GLP Study',
            studyType: (study as GLPStudy).studyType || 'toxicology',
            status: (study as GLPStudy).status || 'in-progress',
            regulatorySubmissionType: (study as GLPStudy).regulatorySubmissionType || 'IND',
            testArticleName: (study as GLPStudy).testArticleName || 'Test Article',
          },
          link: {
            vendor: selectedLink.vendor,
            vendorDisplayName: selectedLink.vendorDisplayName,
            overallCompleteness: selectedLink.overallCompleteness,
            integrityFlagCount: selectedLink.integrityFlagCount,
            computerSystemValidated: selectedLink.computerSystemValidated,
            auditTrailEnabled: selectedLink.auditTrailEnabled,
            endpoints: selectedLink.endpoints,
          },
          integrityFlags: (syncResultsByLink[selectedLink.id]?.newIntegrityFlags || []),
        }),
      });
      const data = await res.json();
      if (data.result) setAiIntegrityResult({ result: data.result, source: data.source });
      else setAiError('Analysis returned no result');
    } catch {
      setAiError('Failed to connect to AI service');
    } finally {
      setAiLoading(false);
    }
  }, [selectedLink, studies, syncResultsByLink]);

  // ---- AI: Generate CAPA --------------------------------------------------
  const handleGenerateCapa = useCallback(async () => {
    if (!selectedLink) return;
    const flags = syncResultsByLink[selectedLink.id]?.newIntegrityFlags || [];
    if (flags.length === 0) {
      setAiError('No integrity flags to generate CAPA for. Run a sync first or select a connection with flags.');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiIntegrityResult(null);
    setAiCapaResult(null);

    try {
      const res = await fetch('/api/ai/glp-data-integrity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-capa',
          study: {
            studyNumber: selectedLink.studyNumber,
            title: 'GLP Study',
            studyType: 'toxicology',
            status: 'in-progress',
            regulatorySubmissionType: 'IND',
            testArticleName: 'Test Article',
          },
          flags,
        }),
      });
      const data = await res.json();
      if (data.result) setAiCapaResult({ result: data.result, source: data.source });
      else setAiError('CAPA generation returned no result');
    } catch {
      setAiError('Failed to connect to AI service');
    } finally {
      setAiLoading(false);
    }
  }, [selectedLink, syncResultsByLink]);

  // ---- Stats across all links ----------------------------------------------
  const totalFlags = links.reduce((sum, l) => sum + l.integrityFlagCount, 0);
  const avgCompleteness = links.length > 0 ? Math.round(links.reduce((sum, l) => sum + l.overallCompleteness, 0) / links.length) : 0;
  const activeLinks = links.filter(l => l.status === 'active').length;
  const unvalidatedCSV = links.filter(l => !l.computerSystemValidated).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
        <span className="ml-3 text-text-muted text-sm">Loading EDC connections…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">EDC & LIMS Integration</h2>
          <p className="text-sm text-text-muted mt-0.5">21 CFR Part 58 Subpart D — Computer System Validation & Data Integrity</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-surface-card px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent-teal/40 transition-all">
          <Plus className="w-4 h-4" />
          Add Connection
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Connections', value: activeLinks, total: links.length, color: 'text-status-success', Icon: Link2 },
          { label: 'Avg. Completeness', value: `${avgCompleteness}%`, color: avgCompleteness >= 90 ? 'text-status-success' : 'text-status-warning', Icon: BarChart3 },
          { label: 'Integrity Flags', value: totalFlags, color: totalFlags > 0 ? 'text-status-warning' : 'text-status-success', Icon: AlertTriangle },
          { label: 'CSV Validation Gaps', value: unvalidatedCSV, color: unvalidatedCSV > 0 ? 'text-status-error' : 'text-status-success', Icon: Shield },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.Icon className={`w-4 h-4 ${stat?.color ?? ''}`} />
              <p className="text-xs text-text-muted">{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold ${stat?.color ?? ''}`}>{stat.value}</p>
            {stat.total !== undefined && (
              <p className="text-xs text-text-muted mt-0.5">of {stat.total} total</p>
            )}
          </div>
        ))}
      </div>

      {/* Two-column layout: connector list + AI panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

        {/* Left: Connector cards */}
        <div className="space-y-4">
          {links.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-card p-8 text-center">
              <Database className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">No EDC Connections</p>
              <p className="text-xs text-text-muted">Add an EDC or LIMS connection to start receiving study data.</p>
            </div>
          ) : (
            links.map(link => (
              <ConnectorCard
                key={link.id}
                link={link}
                isSelected={selectedLink?.id === link.id}
                onSelect={() => setSelectedLinkId(link.id)}
                onSync={() => handleSync(link)}
                isSyncing={syncingLinkId === link.id}
                syncResult={syncResultsByLink[link.id]}
                onDismissSyncResult={() => setSyncResultsByLink(prev => { const n = { ...prev }; delete n[link.id]; return n; })}
              />
            ))
          )}
        </div>

        {/* Right: AI panel */}
        <div className="space-y-4">
          {/* AI actions */}
          {selectedLink && (
            <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-teal" />
                <p className="text-sm font-semibold text-text-primary">AI Analysis</p>
              </div>
              <p className="text-xs text-text-muted">
                ALCOA+ assessment and CAPA generation for <span className="font-medium text-text-secondary">{selectedLink.vendorDisplayName}</span>
              </p>

              <div className="space-y-2">
                <button
                  onClick={handleAnalyzeIntegrity}
                  disabled={aiLoading}
                  className="w-full flex items-center gap-2 rounded-lg border border-accent-teal/30 bg-accent-teal/10 px-3 py-2.5 text-sm font-medium text-accent-teal hover:bg-accent-teal/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  Analyze Data Integrity (ALCOA+)
                </button>
                <button
                  onClick={handleGenerateCapa}
                  disabled={aiLoading}
                  className="w-full flex items-center gap-2 rounded-lg border border-accent-blue/30 bg-accent-blue/10 px-3 py-2.5 text-sm font-medium text-accent-blue hover:bg-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                  Generate CAPA Plan
                </button>
              </div>

              {aiError && (
                <div className="flex items-start gap-2 rounded-lg bg-status-error/10 border border-status-error/20 p-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-status-error shrink-0 mt-0.5" />
                  <p className="text-xs text-status-error">{aiError}</p>
                  <button onClick={() => setAiError(null)} className="ml-auto shrink-0"><X className="w-3 h-3 text-status-error" /></button>
                </div>
              )}
            </div>
          )}

          {/* AI results */}
          {aiIntegrityResult && (
            <AIIntegrityPanel
              result={aiIntegrityResult.result}
              source={aiIntegrityResult.source}
              onClose={() => setAiIntegrityResult(null)}
            />
          )}

          {aiCapaResult && (
            <AICAPAPanel
              result={aiCapaResult.result}
              source={aiCapaResult.source}
              onClose={() => setAiCapaResult(null)}
            />
          )}

          {/* Regulatory reference panel */}
          {!aiIntegrityResult && !aiCapaResult && (
            <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-text-muted" />
                <p className="text-sm font-semibold text-text-primary">Regulatory References</p>
              </div>
              <div className="space-y-2">
                {[
                  { ref: '21 CFR 58.63', title: 'Apparatus, Material, Reagents', desc: 'Equipment validation and maintenance requirements' },
                  { ref: '21 CFR 58.130', title: 'Conduct of a Study', desc: 'Data recording, verification, and audit trail' },
                  { ref: '21 CFR 58.185', title: 'Reporting of Study Results', desc: 'Final study report requirements' },
                  { ref: '21 CFR 58.195', title: 'Retention of Records', desc: 'Archive and retrieval obligations' },
                  { ref: 'FDA DI Guidance 2018', title: 'Data Integrity & CGMP', desc: 'ALCOA+ framework for electronic records' },
                  { ref: 'OECD GLP CN No. 17', title: 'GLP & Computer Systems', desc: 'Validation and audit trail best practices' },
                ].map(item => (
                  <div key={item.ref} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 font-mono text-accent-teal font-medium">{item.ref}</span>
                    <div>
                      <span className="text-text-secondary font-medium">{item.title}</span>
                      <span className="text-text-muted ml-1">— {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GLPEDCIntegrationTab;
