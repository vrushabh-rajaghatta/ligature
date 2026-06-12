
/**
 * BDScreen — Business Development / Ligature Transact
 * v0.125.81
 *
 * Hub for BD operations: deal pipeline overview, asset due diligence agent,
 * and virtual data room management. Part of the Ligature Transact capability.
 */

import { useState } from 'react';
import {
  Handshake, ScanSearch, FolderLock, TrendingUp, Clock, Package,
  CheckCircle, AlertTriangle, ChevronRight, DollarSign,
  Building2, Target, Activity, ArrowUpRight, Zap, Users,
  FileText, Shield, BarChart3, Globe, Link2, UserCheck, Milestone, Layers, Share2,
  MessageSquare, Hash,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { AssetDueDiligencePanel } from '@/components/agents/AssetDueDiligencePanel';
import { useAppStore } from '@/store/useAppStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type BDView = 'overview' | 'due-diligence' | 'data-room' | 'divestiture' | 'partnership';

interface Deal {
  id:        string;
  name:      string;
  type:      'In-license' | 'Out-license' | 'Acquisition' | 'Partnership' | 'Divestiture';
  stage:     'Screening' | 'DD Active' | 'Term Sheet' | 'Negotiation' | 'Closed' | 'Declined';
  asset:     string;
  ta:        string;
  phase:     string;
  partner:   string;
  value:     string;
  updatedAt: string;
  risk:      'Low' | 'Medium' | 'High';
  lead:      string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const DEALS: Deal[] = [
  {
    id: 'BD-001', name: 'LIG-2847 Out-licensing — Phase 2 co-develop',
    type: 'Out-license', stage: 'DD Active', asset: 'LIG-2847 (Ligrastinib)',
    ta: 'Oncology', phase: 'Phase 2', partner: 'Confidential — Tier 1 Pharma',
    value: '$180M upfront + $820M milestones', updatedAt: '2026-04-05',
    risk: 'Low', lead: 'Sean McNiff',
  },
  {
    id: 'BD-002', name: 'KRAS G12D platform in-licensing',
    type: 'In-license', stage: 'Screening', asset: 'External KRAS G12D covalent series',
    ta: 'Oncology', phase: 'Pre-IND', partner: 'Academic spin-out (under NDA)',
    value: 'TBD — target <$25M upfront', updatedAt: '2026-04-03',
    risk: 'Medium', lead: 'BD Team',
  },
  {
    id: 'BD-003', name: 'LIG-5521 TYK2 partnership — Asia-Pacific rights',
    type: 'Partnership', stage: 'Term Sheet', asset: 'LIG-5521 (TYK2 allosteric)',
    ta: 'Immunology', phase: 'Phase 1', partner: 'Confidential — APAC Partner',
    value: '$40M upfront + royalty tier 8–14%', updatedAt: '2026-04-01',
    risk: 'Medium', lead: 'Sean McNiff',
  },
  {
    id: 'BD-004', name: 'LIG-0312 PCSK9 — strategic options review',
    type: 'Out-license', stage: 'Screening', asset: 'LIG-0312 (PCSK9 oral PPI)',
    ta: 'Cardiometabolic', phase: 'Pre-IND', partner: 'Multiple parties — process ongoing',
    value: 'Not yet valued', updatedAt: '2026-03-28',
    risk: 'Low', lead: 'BD Team',
  },
  {
    id: 'BD-005', name: 'CNS capability acquisition — LRRK2 platform',
    type: 'Acquisition', stage: 'Declined', asset: 'External LRRK2 program',
    ta: 'Neurology', phase: 'Discovery', partner: 'Biotech (confidential)',
    value: '—', updatedAt: '2026-03-15',
    risk: 'High', lead: 'Sean McNiff',
  },
];

const DATA_ROOMS: { id: string; asset: string; partner: string; expiresIn: string; docs: number; status: 'Active' | 'Expired' | 'Pending' }[] = [
  { id: 'DR-A1B2', asset: 'LIG-2847 (Phase 2 package)', partner: 'Tier 1 Pharma',      expiresIn: '18 days', docs: 41, status: 'Active' },
  { id: 'DR-C3D4', asset: 'LIG-5521 (Phase 1 package)', partner: 'APAC Partner',        expiresIn: '4 days',  docs: 28, status: 'Active' },
  { id: 'DR-E5F6', asset: 'LIG-2847 (preclinical only)', partner: 'Biotech A (NDA)',    expiresIn: 'Expired', docs: 19, status: 'Expired' },
];

// ── Stage badge ───────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: Deal['stage'] }) {
  const map: Record<Deal['stage'], string> = {
    'Screening':   'text-text-muted bg-surface-elevated border-border',
    'DD Active':   'text-violet-400 bg-violet-500/10 border-violet-500/20',
    'Term Sheet':  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Negotiation': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'Closed':      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'Declined':    'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${map[stage]}`}>{stage}</span>
  );
}

// ── KPI strip ─────────────────────────────────────────────────────────────────

function KPIStrip() {
  const kpis = [
    { label: 'Active deals',       value: '3',      sub: '2 in DD',            icon: <Handshake className="w-4 h-4" />,   color: 'text-violet-400' },
    { label: 'Pipeline value',     value: '$1.04B', sub: 'upfront + milestones',icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-400' },
    { label: 'Active data rooms',  value: '2',      sub: '1 expiring in 4d',    icon: <FolderLock className="w-4 h-4" />, color: 'text-amber-400' },
    { label: 'Assets in BD',       value: '3',      sub: 'LIG-2847, 5521, 0312',icon: <Target className="w-4 h-4" />,     color: 'text-blue-400' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-border">
      {kpis.map((k, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface-card p-3 flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${k.color}`}>{k.icon}</div>
          <div>
            <div className="text-xl font-bold text-text-primary leading-none">{k.value}</div>
            <div className="text-[10px] text-text-muted mt-0.5">{k.label}</div>
            <div className="text-[10px] text-text-muted/60 mt-0.5">{k.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Overview view ─────────────────────────────────────────────────────────────

function OverviewView({ onNavigate }: { onNavigate: (v: BDView) => void }) {
  const setActiveModule = useAppStore(s => s.setActiveModule);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Deal pipeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Deal Pipeline</div>
          <span className="text-[10px] text-text-muted">{DEALS.length} deals</span>
        </div>
        <div className="space-y-2">
          {DEALS.map(deal => (
            <div key={deal.id} className="rounded-xl border border-border bg-surface-card p-4 hover:bg-surface-elevated/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <StageBadge stage={deal.stage} />
                    <span className="text-[10px] text-text-muted border border-border px-1.5 py-0.5 rounded">{deal.type}</span>
                    <span className="text-[10px] text-text-muted">{deal.ta} · {deal.phase}</span>
                  </div>
                  <div className="text-sm font-semibold text-text-primary mb-0.5">{deal.name}</div>
                  <div className="text-xs text-text-muted">{deal.partner}</div>
                  {deal.value !== '—' && deal.value !== 'Not yet valued' && (
                    <div className="text-xs text-emerald-400 font-medium mt-1">{deal.value}</div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[10px] text-text-muted">{deal.lead}</div>
                  <div className="text-[10px] text-text-muted/60 mt-1">{new Date(deal.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  {deal.stage === 'DD Active' && (
                    <button
                      onClick={() => onNavigate('due-diligence')}
                      className="mt-2 flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <ScanSearch className="w-3 h-3" /> Open DD
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data rooms summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Data Rooms</div>
          <button onClick={() => onNavigate('data-room')} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {DATA_ROOMS.map(room => (
            <div key={room.id} className="rounded-xl border border-border bg-surface-card p-3 flex items-center gap-4">
              <FolderLock className={`w-4 h-4 flex-shrink-0 ${room.status === 'Active' ? 'text-violet-400' : 'text-text-muted/30'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary truncate">{room.asset}</div>
                <div className="text-[10px] text-text-muted">{room.partner} · {room.docs} docs</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className={`text-[10px] font-semibold ${room.status === 'Active' ? room.expiresIn.includes('4d') ? 'text-amber-400' : 'text-emerald-400' : 'text-red-400'}`}>
                  {room.status === 'Expired' ? 'Expired' : `Expires in ${room.expiresIn}`}
                </div>
                <div className="text-[10px] font-mono text-text-muted/60 mt-0.5">{room.id}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Quick Actions</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: <ScanSearch className="w-4 h-4 text-violet-400" />, label: 'Start DD Package', sub: 'Assemble asset data for counterparty', action: () => onNavigate('due-diligence'), color: 'border-violet-500/20 hover:border-violet-500/40' },
            { icon: <FolderLock className="w-4 h-4 text-blue-400" />,  label: 'New Data Room',   sub: 'Provision secure time-limited access',  action: () => onNavigate('data-room'),     color: 'border-blue-500/20 hover:border-blue-500/40' },
            { icon: <Shield className="w-4 h-4 text-emerald-400" />,   label: 'Verify Integrity', sub: 'Re-validate SHA-256 manifest seals',    action: () => onNavigate('due-diligence'), color: 'border-emerald-500/20 hover:border-emerald-500/40' },
          ].map((a, i) => (
            <button key={i} onClick={a.action} className={`rounded-xl border bg-surface-card p-4 text-left hover:bg-surface-elevated/40 transition-all ${a.color}`}>
              <div className="mb-2">{a.icon}</div>
              <div className="text-xs font-semibold text-text-primary">{a.label}</div>
              <div className="text-[10px] text-text-muted mt-0.5">{a.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Ligature Transact callout */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-violet-400" />
          <div className="text-xs font-semibold text-violet-400">Ligature Transact — Platform capability</div>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Ligature Transact connects your live R&D data to every BD transaction. Due diligence packages are assembled directly from Ligature records — no manual compilation. SHA-256 integrity seals are applied automatically. Data rooms expire on schedule, revoke on breach, and log every access event to the immutable audit trail.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> Live data — no exports</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> Field-level redaction</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> SHA-256 integrity seals</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> Immutable audit log</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> Time-limited access control</span>
        </div>
      </div>
    </div>
  );
}

// ── Data Room management view ─────────────────────────────────────────────────

function DataRoomView({ onNavigate }: { onNavigate: (v: BDView) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FolderLock className="w-4 h-4 text-violet-400" />
          <div className="text-sm font-semibold text-text-primary">Virtual Data Rooms</div>
        </div>
        {DATA_ROOMS.map(room => (
          <div key={room.id} className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${room.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                    {room.status}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">{room.id}</span>
                </div>
                <div className="text-xs font-semibold text-text-primary">{room.asset}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{room.partner} · {room.docs} documents</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-xs font-medium ${room.status === 'Active' ? room.expiresIn.includes('4d') ? 'text-amber-400' : 'text-emerald-400' : 'text-red-400'}`}>
                  {room.status === 'Expired' ? 'Expired' : `${room.expiresIn} remaining`}
                </div>
                {room.status === 'Active' && (
                  <div className="flex gap-2 mt-2 justify-end">
                    <button className="text-[10px] text-text-muted hover:text-text-secondary border border-border px-2 py-1 rounded transition-colors">Extend</button>
                    <button className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/20 px-2 py-1 rounded transition-colors">Revoke</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => onNavigate('due-diligence')}
          className="w-full mt-2 rounded-xl border border-dashed border-violet-500/30 p-3 text-xs text-violet-400 hover:bg-violet-500/5 transition-colors flex items-center justify-center gap-2"
        >
          <FolderLock className="w-3.5 h-3.5" /> Provision new data room via Due Diligence Agent
        </button>
      </div>

      {/* Room activity log */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">Recent Access Log</div>
        <div className="space-y-2">
          {[
            { room: 'DR-A1B2', user: 'partner.user@*****.com', action: 'Viewed Module 4.2.1 (GLP tox report)', time: '2h ago', ip: '203.0.1x.xxx' },
            { room: 'DR-A1B2', user: 'partner.user@*****.com', action: 'Viewed Investigator Brochure v4.2',    time: '2h ago', ip: '203.0.1x.xxx' },
            { room: 'DR-C3D4', user: 'apac.bd@*****.com',      action: 'Viewed Phase 1 protocol v2.1',        time: '6h ago', ip: '198.51.xxx.xxx' },
            { room: 'DR-A1B2', user: 'partner.cmo@*****.com',  action: 'Viewed CMC specification (redacted)', time: '1d ago', ip: '203.0.1x.xxx' },
          ].map((entry, i) => (
            <div key={i} className="flex items-start gap-3 py-1.5 border-b border-border/30 last:border-0">
              <Activity className="w-3 h-3 text-text-muted/60 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text-secondary">{entry.action}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{entry.user} · {entry.ip}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-[10px] text-text-muted">{entry.time}</div>
                <div className="text-[9px] font-mono text-text-muted/60">{entry.room}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


const DIVESTITURE_ASSETS: { id: string; name: string; ta: string; phase: string; reason: string }[] = [
  { id: 'LIG-0091', name: 'LIG-0091 — MAPK Inhibitor', ta: 'Oncology', phase: 'Phase 1', reason: 'Non-core to PSMA focus; strong external interest' },
  { id: 'LIG-0044', name: 'LIG-0044 — PDE4 Modulator', ta: 'Inflammation', phase: 'Preclinical', reason: 'Platform mismatch; partnered asset candidate' },
  { id: 'LIG-0112', name: 'LIG-0112 — HDAC6i', ta: 'Neurodegeneration', phase: 'Lead Opt.', reason: 'Prioritisation; strong IP estate for licensing' },
];

const DIVESTITURE_PACKAGE_SECTIONS: { id: string; label: string; docs: number; status: 'Ready' | 'Redacted' | 'Pending' }[] = [
  { id: 'chem', label: 'Chemistry & Synthesis Routes', docs: 12, status: 'Ready' },
  { id: 'bio', label: 'Biology & Pharmacology Data', docs: 18, status: 'Ready' },
  { id: 'tox', label: 'GLP Toxicology Studies', docs: 8, status: 'Redacted' },
  { id: 'ip', label: 'IP Landscape & Patent Estate', docs: 6, status: 'Ready' },
  { id: 'cmc', label: 'CMC & Manufacturing', docs: 9, status: 'Redacted' },
  { id: 'fin', label: 'Financial & Deal History', docs: 4, status: 'Pending' },
  { id: 'cda', label: 'CDA Template', docs: 1, status: 'Ready' },
];

function DivestitureView({ onNavigate }: { onNavigate: (v: BDView) => void }) {
  const [selectedAsset, setSelectedAsset] = useState(DIVESTITURE_ASSETS[0].id);
  const [assembled, setAssembled] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const asset = DIVESTITURE_ASSETS.find(a => a.id === selectedAsset)!;

  const handleAssemble = async () => {
    setAssembling(true);
    await new Promise(r => setTimeout(r, 2200));
    setAssembling(false);
    setAssembled(true);
  };

  const statusColor = (s: string) => s === 'Ready' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : s === 'Redacted' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-text-muted bg-surface-elevated border-border';

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
        <Package className="w-5 h-5 text-orange-400 flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold text-orange-400">Divestiture Package Builder — Ligature Transact</div>
          <div className="text-xs text-text-muted mt-0.5">One-click assembly of a buyer-ready divestiture data package. Field-level redaction. SHA-256 sealed. Includes CDA template and IP landscape.</div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Asset for Divestiture</label>
        <div className="space-y-2">
          {DIVESTITURE_ASSETS.map(a => (
            <button key={a.id} onClick={() => { setSelectedAsset(a.id); setAssembled(false); }}
              className={`w-full text-left rounded-xl border p-3 transition-all ${selectedAsset === a.id ? 'border-orange-500/40 bg-orange-500/8' : 'border-border bg-surface-card hover:bg-surface-elevated/40'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-text-primary">{a.name}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{a.ta} · {a.phase}</div>
                </div>
                <div className="text-[10px] text-text-muted/70 max-w-[160px] text-right leading-tight">{a.reason}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">Package Sections</div>
        <div className="space-y-2">
          {DIVESTITURE_PACKAGE_SECTIONS.map(sec => (
            <div key={sec.id} className="flex items-center gap-3 text-xs py-1">
              <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${sec.status === 'Ready' ? 'text-emerald-400' : sec.status === 'Redacted' ? 'text-amber-400' : 'text-text-muted/40'}`} />
              <span className="flex-1 text-text-secondary">{sec.label}</span>
              <span className="text-[10px] text-text-muted">{sec.docs} docs</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${statusColor(sec.status)}`}>{sec.status}</span>
            </div>
          ))}
        </div>
      </div>

      {!assembled ? (
        <button
          onClick={handleAssemble}
          disabled={assembling}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-orange-500/30 bg-orange-500/5 text-sm font-semibold text-orange-400 hover:bg-orange-500/10 transition-all disabled:opacity-60"
        >
          {assembling ? <><Activity className="w-4 h-4 animate-pulse" /> Assembling package…</> : <><Package className="w-4 h-4" /> Assemble Divestiture Package</>}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <div className="text-sm font-semibold text-emerald-400">Package Ready — {asset.id} Divestiture</div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-center">
              <div className="bg-surface rounded-lg p-2"><div className="font-bold text-text-primary">36</div><div className="text-[10px] text-text-muted">Documents</div></div>
              <div className="bg-surface rounded-lg p-2"><div className="font-bold text-amber-400">8</div><div className="text-[10px] text-text-muted">Redacted</div></div>
              <div className="bg-surface rounded-lg p-2"><div className="font-bold text-text-primary">30d</div><div className="text-[10px] text-text-muted">Room expiry</div></div>
            </div>
            <div className="mt-3 flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
              <Hash className="w-3 h-3 text-text-muted/60" />
              <span className="text-[10px] font-mono text-text-muted/60 truncate">a3f29e1b{asset.id.replace('-','').toLowerCase()}c4d8e7f2b1a9d3c5e6</span>
            </div>
          </div>
          <button onClick={() => onNavigate('data-room')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-500/30 text-xs text-violet-400 hover:bg-violet-500/5 transition-colors">
            <FolderLock className="w-3.5 h-3.5" /> Provision Data Room for Buyers →
          </button>
        </div>
      )}
    </div>
  );
}


// ── Partnership Workspace ─────────────────────────────────────────────────────

const MILESTONES = [
  { id: 'M1', label: 'NDA signed',              date: '2026-02-14', status: 'Done',       owner: 'Legal' },
  { id: 'M2', label: 'Data room access granted', date: '2026-02-21', status: 'Done',       owner: 'BD Team' },
  { id: 'M3', label: 'DD review complete',       date: '2026-03-28', status: 'Done',       owner: 'Partner' },
  { id: 'M4', label: 'Term sheet signed',        date: '2026-04-15', status: 'In Progress',owner: 'Sean McNiff' },
  { id: 'M5', label: 'LOI / heads of terms',     date: '2026-05-01', status: 'Upcoming',   owner: 'Legal' },
  { id: 'M6', label: 'Full agreement signed',    date: '2026-07-01', status: 'Upcoming',   owner: 'Legal' },
];

const SHARED_DOCS = [
  { title: 'LIG-2847 — Phase 2 Clinical Data Package', sharedAt: '2026-02-21', views: 14, status: 'Active' },
  { title: 'CMC Summary — Drug Substance (redacted)',   sharedAt: '2026-02-21', views: 8,  status: 'Active' },
  { title: 'Investigator Brochure v4.2',                sharedAt: '2026-03-01', views: 22, status: 'Active' },
  { title: 'J-NDA Strategy Memo',                       sharedAt: '2026-03-15', views: 5,  status: 'Confidential' },
];

const MESSAGES = [
  { from: 'Partner (CMO)',   time: '2d ago', text: `We've completed initial DD review of the CMC package. One question on the process validation batch size — can you confirm scale-up data goes to 200kg?` },
  { from: 'Sean McNiff',     time: '2d ago', text: `Confirmed — batch scale-up to 200kg was completed at Lonza Visp in Q4 2025. I'll share the batch records via the data room.` },
  { from: 'Partner (Legal)', time: '5h ago', text: 'Term sheet redlines sent to your counsel. Two open points on milestone definitions and IP ownership for combination studies.' },
];

function PartnershipView() {
  const [message, setMessage] = useState('');

  const milestoneColor = (s: string) =>
    s === 'Done' ? 'text-emerald-400' : s === 'In Progress' ? 'text-amber-400' : 'text-text-muted/50';

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <Share2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold text-blue-400">Partnership Workspace — LIG-2847 Out-licensing</div>
          <div className="text-xs text-text-muted mt-0.5">Confidential — Tier 1 Pharma Partner · Term Sheet Stage · Ligature Transact</div>
        </div>
        <div className="ml-auto flex-shrink-0">
          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-semibold">Term Sheet</span>
        </div>
      </div>

      {/* Milestone tracker */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Milestone className="w-3.5 h-3.5" /> Deal Milestones
        </div>
        <div className="space-y-2">
          {MILESTONES.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 text-xs">
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${m.status === 'Done' ? 'bg-emerald-400 border-emerald-400' : m.status === 'In Progress' ? 'border-amber-400' : 'border-border'}`}>
                {m.status === 'Done' && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                {m.status === 'In Progress' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </div>
              <span className={`flex-1 ${m.status === 'Done' ? 'text-text-muted line-through' : m.status === 'In Progress' ? 'text-text-primary font-medium' : 'text-text-muted'}`}>{m.label}</span>
              <span className="text-text-muted/60">{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span className={`text-[9px] font-semibold ${milestoneColor(m.status)}`}>{m.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shared documents */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Shared Documents
        </div>
        <div className="space-y-2">
          {SHARED_DOCS.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/30 last:border-0">
              <FileText className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              <span className="flex-1 text-text-secondary">{doc.title}</span>
              <span className="text-text-muted/60 text-[10px]">{doc.views} views</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${doc.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>{doc.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Secure messaging */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Secure Deal Channel
        </div>
        <div className="space-y-3 mb-3">
          {MESSAGES.map((msg, i) => (
            <div key={i} className={`rounded-lg p-3 text-xs ${msg.from === 'Sean McNiff' ? 'bg-violet-500/10 border border-violet-500/20 ml-6' : 'bg-surface-elevated border border-border mr-6'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-text-primary text-[11px]">{msg.from}</span>
                <span className="text-text-muted/60 text-[10px]">{msg.time}</span>
              </div>
              <p className="text-text-secondary leading-relaxed">{msg.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Send a secure message to the partner team…"
            className="flex-1 px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500/40" />
          <button className="px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors" onClick={() => setMessage('')}>
            Send
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface-elevated border border-border text-[10px] text-text-muted">
        <Shield className="w-3 h-3 flex-shrink-0 mt-0.5" />
        All communications and shared documents are end-to-end encrypted and logged to the immutable Ligature audit trail. Partner access is governed by the active NDA and data room access controls.
      </div>
    </div>
  );
}

export function BDScreen({ initialView }: { initialView?: BDView } = {}) {
  const [activeView, setActiveView] = useState<BDView>(initialView ?? 'overview');

  const viewTabs: { id: BDView; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',      label: 'BD Overview',   icon: <Handshake className="w-4 h-4" /> },
    { id: 'due-diligence', label: 'Due Diligence', icon: <ScanSearch className="w-4 h-4" /> },
    { id: 'data-room',     label: 'Data Rooms',    icon: <FolderLock className="w-4 h-4" /> },
    { id: 'divestiture',   label: 'Divestiture',   icon: <Package className="w-4 h-4" /> },
    { id: 'partnership',   label: 'Partnership',   icon: <Share2 className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Business Development"
        subtitle="Ligature Transact — deal pipeline, asset due diligence, and secure data room management"
        icon={<Handshake className="w-5 h-5" />}
      />

      {/* KPI strip — always visible */}
      <KPIStrip />

      {/* Tab bar */}
      <div className="border-b border-border bg-surface-elevated px-4 sm:px-6 py-2 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {viewTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeView === tab.id
                  ? 'bg-surface-card text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-card/50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'due-diligence' && (
                <span className="text-[9px] bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded font-semibold">AGENT</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      {activeView === 'overview' && <OverviewView onNavigate={setActiveView} />}
      {activeView === 'due-diligence' && (
        <div className="flex-1 overflow-hidden">
          <AssetDueDiligencePanel />
        </div>
      )}
      {activeView === 'data-room'    && <DataRoomView    onNavigate={setActiveView} />}
      {activeView === 'divestiture'  && <DivestitureView  onNavigate={setActiveView} />}
      {activeView === 'partnership'  && <PartnershipView  />}
    </div>
  );
}
