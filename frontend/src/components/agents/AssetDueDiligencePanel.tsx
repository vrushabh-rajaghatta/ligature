
/**
 * AssetDueDiligencePanel — Ligature Transact
 * v0.125.81
 *
 * One-click assembly of all Ligature-held data for an inbound or outbound
 * asset. Configurable redaction rules per data class. SHA-256 integrity
 * verification block. Time-limited data room provisioning with access controls.
 */

import { useState, useCallback } from 'react';
import {
  ScanSearch, RefreshCw, Sparkles, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Shield, Lock, Clock, Eye, EyeOff,
  FolderLock, Hash, Download, Users, Calendar, Zap, FileText,
  Database, FlaskConical, Stethoscope, Globe, Activity,
  Copy, CheckCheck, X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type DDDirection = 'inbound' | 'outbound';
type RedactLevel = 'none' | 'partial' | 'full';

interface DataClass {
  id:          string;
  label:       string;
  module:      string;
  icon:        React.ReactNode;
  description: string;
  docCount:    number;
  redactLevel: RedactLevel;
  sensitivity: 'Public' | 'Confidential' | 'Highly Confidential';
  examples:    string[];
}

interface AssembledDocument {
  id:           string;
  title:        string;
  module:       string;
  ctdRef:       string;
  sha256:       string;
  sizeKb:       number;
  redacted:     boolean;
  redactFields: string[];
  addedAt:      string;
}

interface DataRoomConfig {
  expiryDays:   number;
  maxUsers:     number;
  watermark:    boolean;
  nda:          boolean;
  downloadable: boolean;
  ipWhitelist:  string;
}

interface DDPackage {
  id:           string;
  assetId:      string;
  assetName:    string;
  direction:    DDDirection;
  documents:    AssembledDocument[];
  integrityHash: string;          // SHA-256 of the full manifest
  assembledAt:  string;
  dataRoomUrl:  string;
  dataRoomToken: string;
  expiresAt:    string;
}

// ── Static data ───────────────────────────────────────────────────────────────

const DEFAULT_DATA_CLASSES: DataClass[] = [
  {
    id: 'research',
    label: 'Non-Clinical / Research',
    module: 'Research',
    icon: <FlaskConical className="w-3.5 h-3.5" />,
    description: 'Preclinical studies, target validation, pharmacology, ADMET data, IND-enabling package',
    docCount: 34,
    redactLevel: 'none',
    sensitivity: 'Highly Confidential',
    examples: ['ICH M3(R2) study reports', 'In vitro pharmacology', 'ADMET/PK data', 'Genotox battery results', 'Safety pharmacology'],
  },
  {
    id: 'cmc',
    label: 'CMC / Manufacturing',
    module: 'CMC',
    icon: <Activity className="w-3.5 h-3.5" />,
    description: 'Drug substance/product specs, batch records, stability data, analytical methods',
    docCount: 28,
    redactLevel: 'partial',
    sensitivity: 'Highly Confidential',
    examples: ['Drug substance specification', 'Batch release records', 'Stability trend data', 'Analytical method validations', 'Process descriptions (redacted)'],
  },
  {
    id: 'clinical',
    label: 'Clinical Development',
    module: 'Clinical',
    icon: <Stethoscope className="w-3.5 h-3.5" />,
    description: 'Clinical protocols, CSRs, investigator brochure, safety data summaries',
    docCount: 41,
    redactLevel: 'none',
    sensitivity: 'Highly Confidential',
    examples: ['Phase 1/2 protocols', 'Clinical study reports (CSRs)', 'Investigator brochure (IB)', 'DSMB charters', 'Interim safety summaries'],
  },
  {
    id: 'regulatory',
    label: 'Regulatory Filings',
    module: 'Regulatory',
    icon: <Globe className="w-3.5 h-3.5" />,
    description: 'IND/CTA submissions, agency correspondence, HAQ responses, eCTD packages',
    docCount: 19,
    redactLevel: 'none',
    sensitivity: 'Confidential',
    examples: ['IND/CTA application modules', 'FDA/EMA correspondence', 'HAQ responses', 'Meeting briefing documents', 'Approval letters'],
  },
  {
    id: 'ip',
    label: 'IP & Patent Landscape',
    module: 'Research',
    icon: <Shield className="w-3.5 h-3.5" />,
    description: 'Patent filings, FTO analysis, competitor landscape, claim summaries',
    docCount: 8,
    redactLevel: 'partial',
    sensitivity: 'Highly Confidential',
    examples: ['Filed patent applications', 'FTO opinion (external counsel)', 'Claim mapping', 'Competitor patent landscape'],
  },
  {
    id: 'quality',
    label: 'Quality & Compliance',
    module: 'Quality',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    description: 'GLP/GCP/GMP compliance records, audit outcomes, CAPA logs, SOPs',
    docCount: 22,
    redactLevel: 'partial',
    sensitivity: 'Confidential',
    examples: ['GLP compliance certificate', 'Audit reports (redacted)', 'CAPA summary log', 'SOC 2 summary'],
  },
];

const ASSETS = [
  { id: 'LIG-2847', name: 'LIG-2847 — Ligrastinib (KRAS G12D inhibitor)',         ta: 'Oncology',       phase: 'Phase 2' },
  { id: 'LIG-5521', name: 'LIG-5521 — TYK2 allosteric inhibitor',                 ta: 'Immunology',     phase: 'Phase 1' },
  { id: 'LIG-0312', name: 'LIG-0312 — PCSK9 oral PPI',                            ta: 'Cardiometabolic', phase: 'Pre-IND' },
  { id: 'LIG-7734', name: 'LIG-7734 — LRRK2 G2019S kinase inhibitor',             ta: 'Neurology',      phase: 'Discovery' },
];

const EXPIRY_OPTIONS = [7, 14, 30, 60, 90];

// ── SHA-256 mock generator ────────────────────────────────────────────────────

function mockSha256(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(31, h) + seed.charCodeAt(i) | 0; }
  const hex = (Math.abs(h) >>> 0).toString(16).padStart(8, '0');
  return `${hex}a3f2${hex}b7e1${hex}c4d9${hex}e8f0${hex}1a2b3c4d`;
}

// ── Assemble package ──────────────────────────────────────────────────────────

function assemblePackage(
  assetId:     string,
  direction:   DDDirection,
  classes:     DataClass[],
  roomConfig:  DataRoomConfig,
): DDPackage {
  const asset = ASSETS.find(a => a.id === assetId) ?? ASSETS[0];
  const now   = new Date();

  const docs: AssembledDocument[] = classes
    .filter(c => c.redactLevel !== 'full')
    .flatMap(cls => {
      const count = Math.min(cls.docCount, 5);
      return Array.from({ length: count }, (_, i) => {
        const title = cls.examples[i % cls.examples.length];
        const sha   = mockSha256(`${assetId}-${cls.id}-${i}-${now.toISOString()}`);
        const redacted = cls.redactLevel === 'partial';
        return {
          id:           `${cls.id}-DOC-${String(i + 1).padStart(3, '0')}`,
          title,
          module:       cls.module,
          ctdRef:       cls.id === 'research'    ? `Module 4.2.${i + 1}` :
                        cls.id === 'cmc'         ? `Module 3.2.S.${i + 1}` :
                        cls.id === 'clinical'    ? `Module 5.3.${i + 1}` :
                        cls.id === 'regulatory'  ? `Module 1.${i + 2}` : '—',
          sha256:       sha,
          sizeKb:       120 + (i * 347 % 2800),
          redacted,
          redactFields: redacted ? ['Proprietary process parameters', 'Specific yield data', 'CRO identity'] : [],
          addedAt:      now.toISOString(),
        } satisfies AssembledDocument;
      });
    });

  const manifestSeed  = docs.map(d => d.sha256).join('|');
  const integrityHash = mockSha256(manifestSeed + assetId + now.toISOString());
  const token         = mockSha256(assetId + 'token' + now.toISOString()).substring(0, 16).toUpperCase();
  const expiry        = new Date(now.getTime() + roomConfig.expiryDays * 86_400_000);

  return {
    id:            `DD-${now.getTime().toString(36).toUpperCase()}`,
    assetId,
    assetName:     asset.name,
    direction,
    documents:     docs,
    integrityHash,
    assembledAt:   now.toISOString(),
    dataRoomUrl:   `https://transact.ligature.io/room/${token}`,
    dataRoomToken: token,
    expiresAt:     expiry.toISOString(),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RedactToggle({ level, onChange }: { level: RedactLevel; onChange: (l: RedactLevel) => void }) {
  const opts: { value: RedactLevel; label: string; color: string }[] = [
    { value: 'none',    label: 'Include',   color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' },
    { value: 'partial', label: 'Redacted',  color: 'border-amber-500/50 bg-amber-500/10 text-amber-400' },
    { value: 'full',    label: 'Exclude',   color: 'border-red-500/50 bg-red-500/10 text-red-400' },
  ];
  return (
    <div className="flex gap-1">
      {opts.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-all ${level === o.value ? o.color : 'border-border text-text-muted hover:text-text-secondary'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DataClassRow({ cls, onChange }: { cls: DataClass; onChange: (id: string, level: RedactLevel) => void }) {
  const [open, setOpen] = useState(false);
  const sensBadge = cls.sensitivity === 'Highly Confidential' ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : cls.sensitivity === 'Confidential' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted flex-shrink-0">
          {cls.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-text-primary">{cls.label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${sensBadge}`}>{cls.sensitivity}</span>
            <span className="text-[10px] text-text-muted">{cls.docCount} docs</span>
          </div>
          <div className="text-[11px] text-text-muted mt-0.5 truncate">{cls.description}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <RedactToggle level={cls.redactLevel} onChange={l => onChange(cls.id, l)} />
          <button onClick={() => setOpen(o => !o)} className="text-text-muted hover:text-text-secondary">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border/40 px-4 py-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Included documents</div>
          <div className="space-y-1">
            {cls.examples.map((ex, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {cls.redactLevel === 'full' ? (
                  <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                ) : cls.redactLevel === 'partial' && i >= 2 ? (
                  <EyeOff className="w-3 h-3 text-amber-400 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                )}
                <span className={`${cls.redactLevel === 'full' ? 'line-through text-text-muted' : 'text-text-secondary'}`}>{ex}</span>
                {cls.redactLevel === 'partial' && i >= 2 && <span className="text-[9px] text-amber-400 ml-auto">[redacted]</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({ doc }: { doc: AssembledDocument }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(doc.sha256).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [doc.sha256]);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-text-primary truncate">{doc.title}</span>
          {doc.redacted && (
            <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
              <EyeOff className="w-2.5 h-2.5 inline mr-0.5" />Redacted
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-muted">
          <span>{doc.module}</span>
          {doc.ctdRef !== '—' && <span>{doc.ctdRef}</span>}
          <span>{(doc.sizeKb / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Hash className="w-2.5 h-2.5 text-text-muted/60 flex-shrink-0" />
          <span className="text-[9px] font-mono text-text-muted/60 truncate">{doc.sha256}</span>
          <button onClick={handleCopy} className="flex-shrink-0 text-text-muted/60 hover:text-text-muted transition-colors">
            {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AssetDueDiligencePanel() {
  const { toast } = useToast();

  const [direction, setDirection]       = useState<DDDirection>('outbound');
  const [assetId, setAssetId]           = useState(ASSETS[0].id);
  const [classes, setClasses]           = useState<DataClass[]>(DEFAULT_DATA_CLASSES);
  const [roomConfig, setRoomConfig]     = useState<DataRoomConfig>({
    expiryDays: 30, maxUsers: 5, watermark: true, nda: true, downloadable: false, ipWhitelist: '',
  });
  const [runPhase, setRunPhase]         = useState<'idle' | 'assembling' | 'verifying' | 'complete'>('idle');
  const [result, setResult]             = useState<DDPackage | null>(null);
  const [activeTab, setActiveTab]       = useState<'config' | 'manifest' | 'room'>('config');
  const [copiedRoom, setCopiedRoom]     = useState(false);

  const ASSEMBLE_STEPS = [
    'Querying Research module — preclinical, non-clinical, IND package',
    'Querying CMC — drug substance/product specs, batch records, stability',
    'Querying Clinical Development — protocols, CSRs, safety data',
    'Querying Regulatory — IND/CTA filings, HA correspondence',
    'Applying redaction rules — field-level suppression',
    'Computing SHA-256 integrity signatures per document',
    'Generating manifest hash — tamper-evident package seal',
  ];

  const handleRedactChange = useCallback((id: string, level: RedactLevel) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, redactLevel: level } : c));
  }, []);

  const handleRun = async () => {
    setRunPhase('assembling');
    setResult(null);
    await new Promise(r => setTimeout(r, 2800));
    setRunPhase('verifying');
    await new Promise(r => setTimeout(r, 1400));
    const pkg = assemblePackage(assetId, direction, classes, roomConfig);
    setResult(pkg);
    setRunPhase('complete');
    setActiveTab('manifest');
    toast.success(`Due diligence package assembled — ${pkg.documents.length} documents · SHA-256 verified`);
  };

  const handleCopyRoom = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.dataRoomUrl).catch(() => {});
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  }, [result]);

  const includedCount  = classes.filter(c => c.redactLevel !== 'full').length;
  const redactedCount  = classes.filter(c => c.redactLevel === 'partial').length;
  const excludedCount  = classes.filter(c => c.redactLevel === 'full').length;
  const totalDocs      = classes.filter(c => c.redactLevel !== 'full').reduce((s, c) => s + Math.min(c.docCount, 5), 0);

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'config',   label: 'Configuration' },
    { id: 'manifest', label: `Manifest${result ? ` (${result.documents.length})` : ''}` },
    { id: 'room',     label: 'Data Room' },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ── Identity banner ─────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0 space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
          <ScanSearch className="w-5 h-5 text-violet-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-violet-400">Asset Due Diligence Agent — Ligature Transact</div>
            <div className="text-xs text-text-muted mt-0.5">
              One-click assembly of all Ligature-held data for an asset. Configurable redaction. SHA-256 integrity verification. Time-limited data room provisioning.
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-elevated rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === t.id ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ─ Config tab ─ */}
        {activeTab === 'config' && (
          <div className="p-6 space-y-5">

            {/* Direction */}
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Transaction Direction</label>
              <div className="grid grid-cols-2 gap-2">
                {(['outbound', 'inbound'] as DDDirection[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`px-4 py-2.5 rounded-lg border text-xs font-medium transition-all text-left ${direction === d ? 'border-violet-500/50 bg-violet-500/10 text-text-primary' : 'border-border text-text-muted hover:text-text-secondary'}`}
                  >
                    <div className="font-semibold">{d === 'outbound' ? '↗ Outbound' : '↙ Inbound'}</div>
                    <div className="text-[10px] text-text-muted mt-0.5 font-normal">
                      {d === 'outbound' ? 'Sharing our asset data with a partner / acquirer' : 'Reviewing a target asset from external party'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Asset */}
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Asset</label>
              <select
                value={assetId}
                onChange={e => setAssetId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              >
                {ASSETS.map(a => (
                  <option key={a.id} value={a.id}>{a.name} [{a.phase}]</option>
                ))}
              </select>
            </div>

            {/* Data classes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Data Classes</label>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-emerald-400">{includedCount} include</span>
                  <span className="text-amber-400">{redactedCount} redacted</span>
                  <span className="text-red-400">{excludedCount} exclude</span>
                </div>
              </div>
              <div className="space-y-2">
                {classes.map(cls => (
                  <DataClassRow key={cls.id} cls={cls} onChange={handleRedactChange} />
                ))}
              </div>
            </div>

            {/* Data room config */}
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-3">Data Room Settings</label>
              <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-text-muted block mb-1.5">Expiry</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {EXPIRY_OPTIONS.map(d => (
                        <button
                          key={d}
                          onClick={() => setRoomConfig(c => ({ ...c, expiryDays: d }))}
                          className={`px-2 py-1 text-[10px] rounded border transition-all ${roomConfig.expiryDays === d ? 'border-violet-500/50 bg-violet-500/10 text-violet-400' : 'border-border text-text-muted hover:text-text-secondary'}`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-1.5">Max users</label>
                    <div className="flex gap-1.5">
                      {[2, 5, 10, 25].map(n => (
                        <button
                          key={n}
                          onClick={() => setRoomConfig(c => ({ ...c, maxUsers: n }))}
                          className={`px-2 py-1 text-[10px] rounded border transition-all ${roomConfig.maxUsers === n ? 'border-violet-500/50 bg-violet-500/10 text-violet-400' : 'border-border text-text-muted hover:text-text-secondary'}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {([
                    { key: 'watermark',    label: 'Watermark PDFs' },
                    { key: 'nda',         label: 'NDA gate on entry' },
                    { key: 'downloadable', label: 'Allow download' },
                  ] as { key: keyof DataRoomConfig; label: string }[]).map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setRoomConfig(c => ({ ...c, [opt.key]: !c[opt.key] }))}
                        className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${roomConfig[opt.key] ? 'bg-violet-500' : 'bg-surface-elevated border border-border'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${roomConfig[opt.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-xs text-text-secondary">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1.5">IP Whitelist (optional — CIDR ranges, comma-separated)</label>
                  <input
                    value={roomConfig.ipWhitelist}
                    onChange={e => setRoomConfig(c => ({ ...c, ipWhitelist: e.target.value }))}
                    placeholder="e.g. 203.0.113.0/24, 198.51.100.0/24"
                    className="w-full px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Summary + run */}
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-text-muted font-semibold uppercase tracking-wider text-[10px]">Package summary</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-text-primary">{totalDocs}</div>
                  <div className="text-[10px] text-text-muted">Documents</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-400">{redactedCount}</div>
                  <div className="text-[10px] text-text-muted">Classes redacted</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-text-primary">{roomConfig.expiryDays}d</div>
                  <div className="text-[10px] text-text-muted">Room expiry</div>
                </div>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={handleRun}
                disabled={runPhase === 'assembling' || runPhase === 'verifying'}
              >
                {runPhase === 'assembling' || runPhase === 'verifying'
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> {runPhase === 'assembling' ? 'Assembling…' : 'Verifying integrity…'}</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Assemble Due Diligence Package</>
                }
              </Button>
            </div>

            {/* Assembly progress */}
            {(runPhase === 'assembling' || runPhase === 'verifying') && (
              <div className="rounded-xl border border-border bg-surface-elevated p-4">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
                  {runPhase === 'assembling' ? 'Assembling package…' : 'Verifying SHA-256 integrity…'}
                </div>
                <div className="space-y-1.5">
                  {ASSEMBLE_STEPS.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                      <span className="text-text-secondary">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─ Manifest tab ─ */}
        {activeTab === 'manifest' && (
          <div className="p-6 space-y-4">
            {!result ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Database className="w-12 h-12 text-text-muted/20" />
                <p className="text-sm text-text-muted">Run the assembly to generate the document manifest.</p>
              </div>
            ) : (
              <>
                {/* Package header */}
                <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-text-primary">{result.id}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{result.assetName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-text-muted">Assembled</div>
                      <div className="text-xs font-medium text-text-primary">
                        {new Date(result.assembledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-surface rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-text-muted mb-0.5">Documents</div>
                      <div className="font-bold text-text-primary">{result.documents.length}</div>
                    </div>
                    <div className="bg-surface rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-text-muted mb-0.5">Redacted</div>
                      <div className="font-bold text-amber-400">{result.documents.filter(d => d.redacted).length}</div>
                    </div>
                    <div className="bg-surface rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-text-muted mb-0.5">Direction</div>
                      <div className="font-bold text-text-primary capitalize">{result.direction}</div>
                    </div>
                  </div>
                </div>

                {/* Integrity block */}
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="text-xs font-semibold text-emerald-400">SHA-256 Manifest Integrity Seal</div>
                    <div className="ml-auto">
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">✓ VERIFIED</span>
                    </div>
                  </div>
                  <div className="bg-surface rounded-lg px-3 py-2 flex items-center gap-2">
                    <Hash className="w-3 h-3 text-text-muted/60 flex-shrink-0" />
                    <span className="text-[11px] font-mono text-text-muted break-all">{result.integrityHash}</span>
                  </div>
                  <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                    Manifest hash computed over all {result.documents.length} document SHA-256 signatures. Any post-assembly modification will invalidate this seal. Computed at assembly time — immutable.
                  </p>
                </div>

                {/* Document list */}
                <div className="rounded-xl border border-border bg-surface-card p-4">
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Document manifest
                  </div>
                  <div>
                    {result.documents.map(doc => <DocRow key={doc.id} doc={doc} />)}
                  </div>
                </div>

                <Button variant="secondary" size="sm" className="w-full" onClick={() => setActiveTab('room')}>
                  <FolderLock className="w-3.5 h-3.5 mr-1.5" /> Proceed to Data Room →
                </Button>
              </>
            )}
          </div>
        )}

        {/* ─ Data Room tab ─ */}
        {activeTab === 'room' && (
          <div className="p-6 space-y-4">
            {!result ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <FolderLock className="w-12 h-12 text-text-muted/20" />
                <p className="text-sm text-text-muted">Assemble a package first to provision the data room.</p>
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('config')}>
                  Go to Configuration
                </Button>
              </div>
            ) : (
              <>
                {/* Room URL */}
                <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FolderLock className="w-4 h-4 text-violet-400" />
                    <div className="text-sm font-semibold text-violet-400">Secure Data Room</div>
                    <div className="ml-auto">
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">● LIVE</span>
                    </div>
                  </div>

                  <div className="bg-surface rounded-lg px-3 py-2.5 flex items-center gap-2">
                    <span className="text-xs text-text-secondary font-mono flex-1 truncate">{result.dataRoomUrl}</span>
                    <button onClick={handleCopyRoom} className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors">
                      {copiedRoom ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-surface rounded-lg p-3">
                      <div className="text-[10px] text-text-muted mb-1 flex items-center gap-1"><Lock className="w-3 h-3" />Access Token</div>
                      <div className="font-mono font-bold text-text-primary tracking-widest">{result.dataRoomToken}</div>
                    </div>
                    <div className="bg-surface rounded-lg p-3">
                      <div className="text-[10px] text-text-muted mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Expires</div>
                      <div className="font-bold text-text-primary">
                        {new Date(result.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Room config summary */}
                <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3">
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Access Controls</div>
                  <div className="space-y-2">
                    {[
                      { icon: <Users className="w-3.5 h-3.5" />,    label: 'Max concurrent users',    value: `${roomConfig.maxUsers} users` },
                      { icon: <Calendar className="w-3.5 h-3.5" />,  label: 'Room expiry',             value: `${roomConfig.expiryDays} days` },
                      { icon: <Eye className="w-3.5 h-3.5" />,       label: 'PDF watermarking',        value: roomConfig.watermark ? 'Enabled' : 'Disabled', good: roomConfig.watermark },
                      { icon: <FileText className="w-3.5 h-3.5" />,  label: 'NDA gate on entry',       value: roomConfig.nda ? 'Enabled' : 'Disabled',      good: roomConfig.nda },
                      { icon: <Download className="w-3.5 h-3.5" />,  label: 'Document download',       value: roomConfig.downloadable ? 'Allowed' : 'View-only', good: !roomConfig.downloadable },
                      { icon: <Zap className="w-3.5 h-3.5" />,       label: 'IP whitelist',            value: roomConfig.ipWhitelist || 'None (all IPs)' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs">
                        <span className="text-text-muted w-4 flex-shrink-0">{row.icon}</span>
                        <span className="text-text-muted flex-1">{row.label}</span>
                        <span className={`font-medium ${row.good === true ? 'text-emerald-400' : row.good === false ? 'text-amber-400' : 'text-text-primary'}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invite */}
                <div className="rounded-xl border border-border bg-surface-card p-4">
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Invite Users
                  </div>
                  <input
                    placeholder="email@counterparty.com, email2@partner.com"
                    className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500/50 mb-2"
                  />
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => toast.success('Invitations queued — recipients will receive a secure access link')}>
                    <Users className="w-3.5 h-3.5 mr-1.5" /> Send Invitations
                  </Button>
                </div>

                {/* Audit trail notice */}
                <div className="rounded-xl border border-border bg-surface-elevated p-3">
                  <div className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-text-muted leading-relaxed">
                      All data room activity is logged with timestamp, user identity, IP address, and document accessed. Audit log is immutable and SHA-256 chained. Accessible in <span className="text-text-secondary font-medium">Quality → R&D Archives</span>.
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
