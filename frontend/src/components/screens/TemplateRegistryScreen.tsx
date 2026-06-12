// ============================================================================
// TemplateRegistryScreen — v0.63.0
// LIG-006 COMPLETE: Multi-Template Ingestion and Self-Service Template Registration
// LIG-019 COMPLETE: Holiday Calendar Administration (embedded panel)
// ============================================================================


import React, { useState, useMemo } from 'react';
import {
  BookTemplate, Plus, Upload, RefreshCw, Check, Clock,
  Trash2, Edit3, AlertTriangle, X, ChevronDown, ChevronRight,
  BookOpen, Layers, Zap, Globe, FileText, Calendar,
  ToggleLeft, ToggleRight, Info, Search, Filter, Download,
  Lock, Unlock, Eye, ShieldCheck, History,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { useToast } from '@/components/ui/Toast';
import {
  SUBMISSION_TEMPLATES, SubmissionTemplate, TemplateType,
} from '@/data/global-submission-plan-data';
import { holidayCalendars, HolidayCalendar, HolidayEntry } from '@/data/holiday-calendar-data';

// ============================================================================
// EXTENDED TEMPLATE REGISTRY MODEL
// In production these come from a backend registry. For demo we extend the
// shared SUBMISSION_TEMPLATES with registry-specific metadata.
// ============================================================================

interface RegistryTemplate {
  id: string;
  baseId: TemplateType | string;
  name: string;
  version: string;
  description: string;
  taskCount: number;
  modules: string[];
  source: 'built-in' | 'imported' | 'connected-source';
  sourceLabel?: string;
  status: 'active' | 'retired' | 'draft';
  isUQ: boolean;
  importedAt?: string;
  importedBy?: string;
  retiredAt?: string;
  retiredBy?: string;
  usedByPlanCount: number;
  color: string;
  badge: string;
  changelog?: string[];
}

const INITIAL_TEMPLATES: RegistryTemplate[] = [
  {
    id: 'tpl-001',
    baseId: '8-week',
    name: '8-Week Fast-Track',
    version: '3.1',
    description: 'Streamlined template for priority review submissions. Parallelised authoring and review tracks. Covers M1, M2, M3, M5.',
    taskCount: 42,
    modules: ['M1', 'M2', 'M3', 'M5'],
    source: 'built-in',
    status: 'active',
    isUQ: true,
    importedAt: '2025-06-01',
    importedBy: 'System',
    usedByPlanCount: 4,
    color: 'text-red-400',
    badge: 'bg-red-500/15',
    changelog: ['v3.1 (2025-11-01): Added REMS checklist to M1', 'v3.0 (2025-06-01): Initial import from GSK URS'],
  },
  {
    id: 'tpl-002',
    baseId: '16-week',
    name: '16-Week Standard',
    version: '5.2',
    description: 'Standard NDA/MAA/J-NDA template covering all five CTD modules with sequential and parallel authoring phases.',
    taskCount: 78,
    modules: ['M1', 'M2', 'M3', 'M4', 'M5'],
    source: 'built-in',
    status: 'active',
    isUQ: false,
    importedAt: '2025-06-01',
    importedBy: 'System',
    usedByPlanCount: 12,
    color: 'text-blue-400',
    badge: 'bg-blue-500/15',
    changelog: ['v5.2 (2026-01-15): Updated MAA cover letter tasks per EMA Q&A', 'v5.1 (2025-09-01): JP labeling tasks added', 'v5.0 (2025-06-01): Initial import'],
  },
  {
    id: 'tpl-003',
    baseId: '40-market',
    name: '40-Market Global Expansion',
    version: '2.0',
    description: 'Comprehensive GSP template for simultaneous multi-market filings. Lead + satellite delta task sets for up to 40 markets.',
    taskCount: 156,
    modules: ['M1', 'M2', 'M3', 'M4', 'M5'],
    source: 'built-in',
    status: 'active',
    isUQ: false,
    importedAt: '2025-08-15',
    importedBy: 'Sarah Mitchell',
    usedByPlanCount: 2,
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/15',
    changelog: ['v2.0 (2025-08-15): Extended to 40 markets from 25-market v1.x', 'v1.2 (2025-03-01): CCP references added to M3 rows'],
  },
  {
    id: 'tpl-004',
    baseId: 'biologic-rolling',
    name: 'BLA Rolling Review',
    version: '1.1',
    description: 'Template designed for BLA submissions under FDA Rolling Review designation. Modular with independent module lock-in milestones.',
    taskCount: 95,
    modules: ['M1', 'M2', 'M3', 'M4', 'M5'],
    source: 'imported',
    sourceLabel: 'CSV Import — 2026-01-10',
    status: 'active',
    isUQ: false,
    importedAt: '2026-01-10',
    importedBy: 'Dr. Aisha Okonkwo',
    usedByPlanCount: 1,
    color: 'text-violet-400',
    badge: 'bg-violet-500/15',
    changelog: ['v1.1 (2026-01-10): Import from external CSV via self-service registration', 'v1.0 (2025-12-01): Draft from URS workshop'],
  },
  {
    id: 'tpl-005',
    baseId: 'type2-variation',
    name: 'Type II Variation — EU',
    version: '2.3',
    description: 'EU-specific template for Type II variations to an existing MA. Covers M1/M2 update sections and M5 clinical variation data.',
    taskCount: 34,
    modules: ['M1', 'M2', 'M5'],
    source: 'connected-source',
    sourceLabel: 'EMA Template Repository',
    status: 'active',
    isUQ: false,
    importedAt: '2026-02-01',
    importedBy: 'Katrina Müller',
    usedByPlanCount: 3,
    color: 'text-cyan-400',
    badge: 'bg-cyan-500/15',
    changelog: ['v2.3 (2026-02-01): Synced from EMA Template Repository', 'v2.2 (2025-08-01): Updated for IVDR transition period'],
  },
  {
    id: 'tpl-006',
    baseId: 'legacy-v3',
    name: 'Legacy Standard v3 (Retired)',
    version: '3.9',
    description: 'Previous standard template — retired when 16-Week Standard v5.0 was adopted. Kept for audit trail of plans provisioned on this template.',
    taskCount: 62,
    modules: ['M1', 'M2', 'M3', 'M4', 'M5'],
    source: 'imported',
    status: 'retired',
    isUQ: false,
    importedAt: '2023-01-01',
    importedBy: 'System',
    retiredAt: '2025-06-01',
    retiredBy: 'Sarah Mitchell',
    usedByPlanCount: 28,
    color: 'text-text-muted',
    badge: 'bg-surface',
    changelog: ['v3.9 (2023-11-01): Final version before retirement'],
  },
];

const SOURCE_ICONS: Record<string, React.ElementType> = {
  'built-in': ShieldCheck,
  'imported': Upload,
  'connected-source': Globe,
};
const SOURCE_LABELS: Record<string, string> = {
  'built-in': 'Built-in',
  'imported': 'Imported',
  'connected-source': 'Connected Source',
};

// ============================================================================
// IMPORT TEMPLATE MODAL
// ============================================================================

function ImportTemplateModal({ onClose, onImport }: { onClose: () => void; onImport: (t: RegistryTemplate) => void }) {
  const [step, setStep] = useState<'method' | 'configure' | 'done'>('method');
  const [method, setMethod] = useState<'csv' | 'json' | 'source'>('csv');
  const [templateName, setTemplateName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');
  const [taskCount, setTaskCount] = useState('');
  const [isUQ, setIsUQ] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  function handleImport() {
    setIsImporting(true);
    setTimeout(() => {
      const newTemplate: RegistryTemplate = {
        id: `tpl-${Date.now()}`,
        baseId: templateName.toLowerCase().replace(/\s+/g, '-'),
        name: templateName,
        version,
        description,
        taskCount: parseInt(taskCount, 10) || 0,
        modules: ['M1', 'M2', 'M3', 'M4', 'M5'],
        source: method === 'source' ? 'connected-source' : 'imported',
        sourceLabel: method === 'csv' ? 'CSV Import' : method === 'json' ? 'JSON Import' : 'Connected Source',
        status: 'active',
        isUQ,
        importedAt: new Date().toISOString().split('T')[0],
        importedBy: 'Current User',
        usedByPlanCount: 0,
        color: 'text-violet-400',
        badge: 'bg-violet-500/15',
        changelog: [`v${version} (${new Date().toISOString().split('T')[0]}): Imported via self-service registration`],
      };
      setIsImporting(false);
      setStep('done');
      onImport(newTemplate);
    }, 1200);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface-elevated rounded-xl border border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent-blue" />
            Register New Template
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-card rounded-lg">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="p-5">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 mb-4">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-400">Template registered successfully</p>
                <p className="text-sm text-text-secondary mt-1">
                  "{templateName}" v{version} is now available in the template picker for new plan creation.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 font-medium"
            >
              Done
            </button>
          </div>
        ) : step === 'method' ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-text-secondary">
              Templates can be imported from a structured file or connected directly to a template source.
              No code deployment required.
            </p>
            <div className="space-y-2">
              {([
                { id: 'csv', label: 'CSV File', desc: 'Import from a structured CSV with task rows and metadata', icon: FileText },
                { id: 'json', label: 'JSON File', desc: 'Import from a machine-readable JSON template definition', icon: FileText },
                { id: 'source', label: 'Connected Template Source', desc: 'Pull from a defined source (CTMS, SharePoint, EMA repository)', icon: Globe },
              ] as const).map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-lg border transition-all ${
                    method === m.id
                      ? 'border-accent-blue bg-accent-blue/8'
                      : 'border-border bg-surface-card hover:border-border/60'
                  }`}
                >
                  <m.icon className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{m.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{m.desc}</p>
                  </div>
                  {method === m.id && <Check className="w-4 h-4 text-accent-blue ml-auto flex-shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg">Cancel</button>
              <button
                onClick={() => setStep('configure')}
                className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90"
              >
                Continue →
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Template Name *</label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. BLA Rolling Review v2"
                className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue text-text-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  placeholder="1.0"
                  className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue text-text-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Task Count</label>
                <input
                  type="number"
                  value={taskCount}
                  onChange={e => setTaskCount(e.target.value)}
                  placeholder="e.g. 65"
                  className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue text-text-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief description of template scope and use cases..."
                className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue text-text-primary resize-none"
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setIsUQ(!isUQ)}
                className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${isUQ ? 'bg-amber-500' : 'bg-surface-elevated border border-border'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isUQ ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">UQ Template</p>
                <p className="text-xs text-text-muted">Enables trigger-milestone auto-calculation (LIG-015)</p>
              </div>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setStep('method')} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg">Back</button>
              <button
                onClick={handleImport}
                disabled={!templateName || isImporting}
                className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Registering…</> : <><Plus className="w-3.5 h-3.5" />Register Template</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HOLIDAY CALENDAR PANEL (LIG-019 admin config)
// ============================================================================

function HolidayCalendarPanel() {
  const [calendars, setCalendars] = useState<HolidayCalendar[]>(holidayCalendars);
  const [expandedCal, setExpandedCal] = useState<string | null>('cal-us');
  const toast = useToast();

  function toggleCalendar(id: string) {
    setCalendars(prev => prev.map(c =>
      c.id === id ? { ...c, isActive: !c.isActive } : c
    ));
  }

  const HOLIDAY_TYPE_COLORS: Record<string, string> = {
    'public': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'agency-closure': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'custom': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-secondary">
          Active calendars are scanned at plan provisioning and when dates change. Holiday rows are auto-inserted and locked.
        </p>
        <button
          onClick={() => toast.info('Select a CSV file to import — format: date, name, region, type')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-card text-text-muted hover:text-text-primary"
        >
          <Plus className="w-3.5 h-3.5" />Add Calendar
        </button>
      </div>

      {calendars.map(cal => (
        <div key={cal.id} className={`rounded-lg border ${cal.isActive ? 'border-border' : 'border-border/40 opacity-60'} overflow-hidden`}>
          {/* Calendar header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-card">
            <button
              onClick={() => setExpandedCal(expandedCal === cal.id ? null : cal.id)}
              className="flex-1 flex items-center gap-3 text-left"
            >
              <span className="text-xl">{cal.flag}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">{cal.country}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-text-muted border border-border">{cal.market}</span>
                  <span className="text-[10px] text-text-muted">{cal.holidays.length} holidays</span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">{cal.source} · Updated {cal.lastUpdated}</p>
              </div>
              {expandedCal === cal.id
                ? <ChevronDown className="w-3.5 h-3.5 text-text-muted ml-auto flex-shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-text-muted ml-auto flex-shrink-0" />
              }
            </button>

            {/* Active toggle */}
            <button
              onClick={() => toggleCalendar(cal.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-all ${
                cal.isActive
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-border bg-surface text-text-muted'
              }`}
            >
              {cal.isActive ? <><ToggleRight className="w-3.5 h-3.5" />Active</> : <><ToggleLeft className="w-3.5 h-3.5" />Inactive</>}
            </button>
          </div>

          {/* Expanded holiday list */}
          {expandedCal === cal.id && (
            <div className="divide-y divide-border/40">
              {cal.holidays.map(h => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs font-mono text-text-muted w-24 flex-shrink-0">{h.date}</span>
                  <p className="text-xs text-text-secondary flex-1">{h.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${HOLIDAY_TYPE_COLORS[h.type] ?? ''}`}>
                    {h.type === 'agency-closure' ? 'Agency' : 'Public'}
                  </span>
                  {h.description && (
                    <div className="group relative">
                      <Info className="w-3 h-3 text-text-muted cursor-help" />
                      <div className="absolute right-0 bottom-5 w-48 p-2 rounded bg-surface-elevated border border-border text-xs text-text-secondary shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        {h.description}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

function TemplateCard({
  template,
  onRetire,
  onActivate,
  onViewChangelog,
}: {
  template: RegistryTemplate;
  onRetire: (id: string) => void;
  onActivate: (id: string) => void;
  onViewChangelog: (t: RegistryTemplate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const SourceIcon = SOURCE_ICONS[template.source];
  const isRetired = template.status === 'retired';
  const isDraft = template.status === 'draft';

  return (
    <div className={`rounded-lg border bg-surface-card transition-all ${
      isRetired ? 'border-border/40 opacity-60' : 'border-border'
    }`}>
      {/* Card header */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`p-2 rounded-lg flex-shrink-0 ${template.badge}`}>
          <BookOpen className={`w-4 h-4 ${template?.color ?? ''}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-semibold text-text-primary">{template.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">v{template.version}</span>
            {template.isUQ && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">UQ</span>
            )}
            {isRetired && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">Retired</span>
            )}
            {isDraft && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">Draft</span>
            )}
            {template.status === 'active' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">Active</span>
            )}
          </div>
          <p className="text-xs text-text-secondary line-clamp-2 mb-2">{template.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />{template.taskCount} tasks
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />{template.modules.join(', ')}
            </span>
            <span className="flex items-center gap-1">
              <SourceIcon className="w-3 h-3" />{SOURCE_LABELS[template.source]}
              {template.sourceLabel && ` · ${template.sourceLabel}`}
            </span>
            {template.usedByPlanCount > 0 && (
              <span className="flex items-center gap-1 text-accent-blue">
                <FileText className="w-3 h-3" />{template.usedByPlanCount} active plan{template.usedByPlanCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-text-muted" />
            : <ChevronRight className="w-4 h-4 text-text-muted" />
          }
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
            <div>
              <p className="text-text-muted mb-0.5">Registered By</p>
              <p className="text-text-secondary">{template.importedBy} · {template.importedAt}</p>
            </div>
            {isRetired && (
              <div>
                <p className="text-text-muted mb-0.5">Retired By</p>
                <p className="text-red-400">{template.retiredBy} · {template.retiredAt}</p>
              </div>
            )}
          </div>

          {template.changelog && template.changelog.length > 0 && (
            <div className="mb-4">
              <button
                onClick={(e) => { e.stopPropagation(); onViewChangelog(template); }}
                className="flex items-center gap-1.5 text-xs text-accent-blue hover:text-accent-blue/80"
              >
                <History className="w-3.5 h-3.5" />View changelog ({template.changelog.length} entries)
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isRetired ? (
              <CapabilityGate moduleId="template-registry" capability="configure" inline>
                <button
                  onClick={(e) => { e.stopPropagation(); onActivate(template.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                >
                  <Unlock className="w-3 h-3" />Re-activate
                </button>
              </CapabilityGate>
            ) : (
              <CapabilityGate moduleId="template-registry" capability="configure" inline>
                <button
                  onClick={(e) => { e.stopPropagation(); onRetire(template.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-500/30 bg-red-500/8 text-red-400 hover:bg-red-500/15 disabled:opacity-50"
                  disabled={template.usedByPlanCount > 0}
                  title={template.usedByPlanCount > 0 ? 'Cannot retire — active plans use this template' : ''}
                >
                  <Trash2 className="w-3 h-3" />Retire
                </button>
              </CapabilityGate>
            )}
            {template.usedByPlanCount > 0 && !isRetired && (
              <p className="text-[10px] text-text-muted flex items-center gap-1">
                <Lock className="w-3 h-3" />In use by {template.usedByPlanCount} plan{template.usedByPlanCount !== 1 ? 's' : ''} — retirement blocked
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHANGELOG MODAL
// ============================================================================

function ChangelogModal({ template, onClose }: { template: RegistryTemplate; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-elevated rounded-xl border border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {template.name} — Changelog
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-card rounded"><X className="w-4 h-4 text-text-muted" /></button>
        </div>
        <div className="p-4 space-y-2">
          {(template.changelog ?? []).map((entry, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-blue mt-1.5 flex-shrink-0" />
              <p className="text-text-secondary">{entry}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export function TemplateRegistryScreen() {
  const toast = useToast();
  const [templates, setTemplates] = useState<RegistryTemplate[]>(INITIAL_TEMPLATES);
  const [activeTab, setActiveTab] = useState<'templates' | 'calendars'>('templates');
  const [showImport, setShowImport] = useState(false);
  const [changelogTemplate, setChangelogTemplate] = useState<RegistryTemplate | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'retired'>('all');

  const filtered = useMemo(() => templates.filter(t => {
    if (statusFilter === 'active' && t.status !== 'active') return false;
    if (statusFilter === 'retired' && t.status !== 'retired') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [templates, search, statusFilter]);

  function handleRetire(id: string) {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'retired', retiredAt: new Date().toISOString().split('T')[0], retiredBy: 'Current User' } : t
    ));
    toast.success('Template retired. Existing plans are unaffected.');
  }

  function handleActivate(id: string) {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'active', retiredAt: undefined, retiredBy: undefined } : t
    ));
    toast.success('Template re-activated and available in plan creation.');
  }

  function handleImport(t: RegistryTemplate) {
    setTemplates(prev => [t, ...prev]);
    toast.success(`"${t.name}" registered. Now available in plan creation.`);
  }

  const activeCount = templates.filter(t => t.status === 'active').length;
  const retiredCount = templates.filter(t => t.status === 'retired').length;

  return (
    <div className="flex flex-col h-full bg-surface text-text-primary">
      <ScreenHeader
        title="Template Registry"
        subtitle="Manage plan templates and holiday calendars"
        moduleId="template-registry"
        actions={
          <CapabilityGate moduleId="template-registry" capability="configure" inline>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90"
            >
              <Plus className="w-3.5 h-3.5" />Register Template
            </button>
          </CapabilityGate>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-surface-card rounded-lg p-3.5 border border-border">
            <p className="text-xs text-text-muted mb-1">Active Templates</p>
            <p className="text-2xl font-semibold text-emerald-400">{activeCount}</p>
          </div>
          <div className="bg-surface-card rounded-lg p-3.5 border border-border">
            <p className="text-xs text-text-muted mb-1">Retired</p>
            <p className="text-2xl font-semibold text-text-muted">{retiredCount}</p>
          </div>
          <div className="bg-surface-card rounded-lg p-3.5 border border-border">
            <p className="text-xs text-text-muted mb-1">Holiday Calendars</p>
            <p className="text-2xl font-semibold text-text-primary">{holidayCalendars.length}</p>
            <p className="text-xs text-text-muted">{holidayCalendars.filter(c => c.isActive).length} active</p>
          </div>
          <div className="bg-surface-card rounded-lg p-3.5 border border-border">
            <p className="text-xs text-text-muted mb-1">Total Plan Usage</p>
            <p className="text-2xl font-semibold text-text-primary">
              {templates.reduce((sum, t) => sum + t.usedByPlanCount, 0)}
            </p>
            <p className="text-xs text-text-muted">across all templates</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-card border border-border rounded-lg p-1 w-fit mb-5">
          {([
            { id: 'templates', label: 'Templates', icon: BookOpen },
            { id: 'calendars', label: 'Holiday Calendars', icon: Calendar },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent-blue text-white font-medium'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'templates' ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search templates…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div className="flex bg-surface-card border border-border rounded-lg p-0.5">
                {(['all', 'active', 'retired'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1 text-xs capitalize rounded transition-colors ${
                      statusFilter === f ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {f === 'all' ? `All (${templates.length})` : f === 'active' ? `Active (${activeCount})` : `Retired (${retiredCount})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No templates match current filters</p>
                </div>
              ) : (
                filtered.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onRetire={handleRetire}
                    onActivate={handleActivate}
                    onViewChangelog={setChangelogTemplate}
                  />
                ))
              )}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-surface-card border border-border/50 flex items-start gap-2">
              <Info className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted">
                Retiring a template prevents its use in new plans. Existing plans provisioned from a retired template retain their provisioned version and are not affected.
                Templates in use by active plans cannot be retired.
              </p>
            </div>
          </>
        ) : (
          <HolidayCalendarPanel />
        )}
      </div>

      {showImport && (
        <ImportTemplateModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}

      {changelogTemplate && (
        <ChangelogModal
          template={changelogTemplate}
          onClose={() => setChangelogTemplate(null)}
        />
      )}
    </div>
  );
}

export default TemplateRegistryScreen;
