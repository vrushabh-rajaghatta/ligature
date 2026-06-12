
// v0.118.0 — Portfolio R&D Timeline (enhanced)
// Cradle-to-grave lifecycle · benchmark profiles · portfolio overlay
// Per-phase duration sliders · bottleneck highlights · savings analysis · export

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  usePrograms,
  DevelopmentStage,
  ProgramStatus,
} from '@/stores/portfolio-store';
import {
  Microscope,
  FlaskConical,
  Activity,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight,
  Download,
  Target,
  RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Profile = 'median' | 'uq' | 'ligature';
type FxArea = 'Research' | 'Preclinical' | 'Clinical' | 'Regulatory' | 'Post-Market';
type Lever =
  | 'ctms'
  | 'safety'
  | 'authoring'
  | 'haq'
  | 'tmf'
  | 'qms'
  | 'submissions'
  | 'regintel'
  | 'edc'
  | 'ai';

interface PhaseData {
  id: string;
  name: string;
  area: FxArea;
  dur: Record<Profile, number>;
  levers: Lever[];
  desc: string;
  saving: string;
  ongoing?: true;
}

interface TooltipState {
  phaseId: string;
  x: number;
  y: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static metadata
// ─────────────────────────────────────────────────────────────────────────────

const LEVER_META: Record<Lever, { label: string; clr: string }> = {
  ctms:        { label: 'CTMS',            clr: '#60a5fa' },
  safety:      { label: 'Safety / PV',     clr: '#f87171' },
  authoring:   { label: 'AI Authoring',    clr: '#a78bfa' },
  haq:         { label: 'HAQ Intel',       clr: '#c4b5fd' },
  tmf:         { label: 'TMF',             clr: '#2dd4bf' },
  qms:         { label: 'QMS',             clr: '#34d399' },
  submissions: { label: 'Submissions Hub', clr: '#fbbf24' },
  regintel:    { label: 'RegIntel',        clr: '#10b981' },
  edc:         { label: 'EDC / Data',      clr: '#94a3b8' },
  ai:          { label: 'AI Core',         clr: '#f59e0b' },
};

const PHASES: PhaseData[] = [
  {
    id: 'target-id',
    name: 'Target Identification & Validation',
    area: 'Research',
    dur: { median: 30, uq: 22, ligature: 14 },
    levers: ['regintel', 'ai'],
    desc: 'Target ID using genomics, proteomics, and phenotypic screens. Validation via genetic knockdown, structural biology, and disease-relevance models. Target tractability scoring against predefined criteria.',
    saving: 'AI literature synthesis and hypothesis ranking compresses target selection from months to weeks. RegIntel surfaces competitive landscape and FTO. AI Core drives target scoring across multi-omic datasets in parallel.',
  },
  {
    id: 'hit-lead',
    name: 'Hit-to-Lead & Lead Optimisation',
    area: 'Research',
    dur: { median: 30, uq: 22, ligature: 14 },
    levers: ['ai', 'edc'],
    desc: 'HTS or FBDD to identify chemical hits. Iterative SAR-guided lead optimisation covering potency, selectivity, and ADME. Candidate selection gate against predefined TPP criteria.',
    saving: 'Generative AI for de novo molecule design and ADMET prediction reduces wet-lab synthesis cycles by ~35%. Integrated EDC eliminates manual SAR notebooks and data re-entry errors.',
  },
  {
    id: 'preclinical',
    name: 'Preclinical Safety, Toxicology & PK/PD',
    area: 'Preclinical',
    dur: { median: 30, uq: 24, ligature: 18 },
    levers: ['safety', 'authoring', 'qms'],
    desc: 'GLP-compliant toxicology (repeat-dose, genotox, reproductive), safety pharmacology, ADME, and PK/PD modelling in relevant species. GLP compliance management and study documentation.',
    saving: 'QMS-integrated GLP compliance tracking. Automated safety data aggregation across studies. AI-drafted nonclinical written summaries shorten IND package preparation by ~40%.',
  },
  {
    id: 'ind',
    name: 'IND-Enabling Studies & CTA / IND Filing',
    area: 'Regulatory',
    dur: { median: 9, uq: 6, ligature: 3.5 },
    levers: ['authoring', 'submissions', 'regintel', 'haq'],
    desc: 'Assembly of IND (FDA) or CTA (EMA): nonclinical overview, CMC, investigator brochure, clinical protocol. Pre-IND meeting management and 30-day review clock tracking.',
    saving: 'AI-drafted IND/CTA sections from structured study data cut authoring time by 50%+. HAQ module tracks pre-IND correspondence. Submissions Hub manages 30-day clock and agency interactions.',
  },
  {
    id: 'phase1',
    name: 'Phase 1 — First-in-Human / SAD / MAD',
    area: 'Clinical',
    dur: { median: 24, uq: 18, ligature: 13 },
    levers: ['ctms', 'safety', 'edc', 'tmf'],
    desc: 'Dose escalation to establish safety, tolerability, PK, and early PD. SAD/MAD design with sentinel dosing and real-time DSMC review. DRF and MAD PK/PD characterisation.',
    saving: 'CTMS real-time site activation, enrolment dashboards, and protocol deviation flags. Integrated safety signal detection with continuous AE monitoring. TMF completeness tracking from Day 1.',
  },
  {
    id: 'phase2',
    name: 'Phase 2 — Proof of Concept & Dose-finding',
    area: 'Clinical',
    dur: { median: 36, uq: 29, ligature: 22 },
    levers: ['ctms', 'safety', 'edc', 'tmf', 'authoring'],
    desc: 'PoC and dose-finding in target patient population. Adaptive designs with prespecified interim analyses. Biomarker-enriched populations. Phase 2b dose confirmation before Phase 3.',
    saving: 'Adaptive design execution via CTMS + EDC integration. Interim analysis data packages auto-generated. Safety signal surveillance across all sites with integrated PV.',
  },
  {
    id: 'phase3',
    name: 'Phase 3 — Pivotal Registration Trials',
    area: 'Clinical',
    dur: { median: 54, uq: 44, ligature: 36 },
    levers: ['ctms', 'safety', 'edc', 'tmf', 'qms', 'authoring'],
    desc: 'Randomised controlled trials (MRCTs) to demonstrate efficacy and safety for registration. Concurrent Phase 3b for label expansion. CMC scale-up and manufacturing validation.',
    saving: 'Global CTMS with multi-regional site management, real-time enrolment projections, and TMF oversight. Continuous PV integration. Protocol deviation and CAPA management via QMS.',
  },
  {
    id: 'dbl',
    name: 'DB Lock, Statistical Analysis & CSR',
    area: 'Clinical',
    dur: { median: 7, uq: 3.5, ligature: 1.5 },
    levers: ['edc', 'safety', 'authoring', 'ai'],
    desc: 'Final data cleaning, reconciliation, database lock, unblinding, and statistical analysis (TLFs). CSR authoring per ICH E3. 120-day safety update. ISS/ISE preparation.',
    saving: 'Continuous data quality monitoring compresses DBL from weeks to days. Pre-built SAP macros generate TLFs post-lock. AI-drafted CSR from TLF outputs with single review cycle.',
  },
  {
    id: 'nda',
    name: 'NDA / BLA / MAA Assembly & Filing',
    area: 'Regulatory',
    dur: { median: 14, uq: 9, ligature: 5 },
    levers: ['authoring', 'submissions', 'haq', 'qms', 'regintel'],
    desc: 'Module 2.5/2.7, ISS/ISE, eCTD compilation, CMC Module 3. Rolling submissions where permitted. Pre-NDA Type B meeting. Concurrent MAA for EMA. Global submissions strategy.',
    saving: 'AI-drafted CTD summaries (M2.5, M2.7) from structured data. Parallel authoring eliminates sequential dependencies. Submissions Hub manages eCTD compilation, QC, and gateway submission.',
  },
  {
    id: 'review',
    name: 'Health Authority Review — PDUFA / CHMP',
    area: 'Regulatory',
    dur: { median: 12, uq: 11, ligature: 10 },
    levers: ['haq', 'submissions', 'authoring', 'regintel'],
    desc: '12-month PDUFA review (FDA) or 210-day CHMP procedure (EMA). AdCom preparation, IR management, label negotiations, pre-approval inspection readiness.',
    saving: 'HAQ Intelligence: real-time IR tracking with deadline management, precedent-based response drafting, and gap analysis. RegIntel anticipates likely HA questions from historical review patterns.',
  },
  {
    id: 'approval',
    name: 'Approval & Commercial Launch Preparation',
    area: 'Post-Market',
    dur: { median: 6, uq: 4, ligature: 3 },
    levers: ['submissions', 'authoring', 'qms'],
    desc: 'Label finalisation, post-approval commitments, REMS/RMP, PSUR scheduling, commercial launch readiness across markets.',
    saving: 'Post-approval commitment tracking automated in Submissions Hub. Label management for multi-market version control. PSUR calendar configured and live.',
  },
  {
    id: 'lcm',
    name: 'Post-Marketing, PV & Lifecycle Management',
    area: 'Post-Market',
    dur: { median: 0, uq: 0, ligature: 0 },
    levers: ['safety', 'submissions', 'authoring', 'qms', 'regintel'],
    desc: 'Continuous pharmacovigilance (PBRER/PSUR), post-marketing studies, sNDA/sBLA for line extensions, CMC changes, label updates, and global market access maintenance.',
    saving: 'Continuous signal detection via Safety/PV module. Automated PBRER generation from live safety database. Line extension submissions via Submissions Hub. RegIntel for variation strategies.',
    ongoing: true,
  },
];

const AREA_META: Record<FxArea, { icon: React.ReactNode; clr: string }> = {
  Research:      { icon: <Microscope className="w-3.5 h-3.5" />,   clr: '#818cf8' },
  Preclinical:   { icon: <FlaskConical className="w-3.5 h-3.5" />, clr: '#a78bfa' },
  Clinical:      { icon: <Activity className="w-3.5 h-3.5" />,     clr: '#60a5fa' },
  Regulatory:    { icon: <FileText className="w-3.5 h-3.5" />,     clr: '#34d399' },
  'Post-Market': { icon: <Shield className="w-3.5 h-3.5" />,       clr: '#4ade80' },
};

const PHASE_CLR: Record<FxArea, string> = {
  Research:      '#818cf8',
  Preclinical:   '#a78bfa',
  Clinical:      '#60a5fa',
  Regulatory:    '#34d399',
  'Post-Market': '#4ade80',
};

const STATUS_CLR: Record<ProgramStatus, string> = {
  'on-track':  '#34d399',
  'ahead':     '#60a5fa',
  'at-risk':   '#fbbf24',
  'delayed':   '#f87171',
  'on-hold':   '#94a3b8',
  'terminated':'#475569',
};

const PROFILE_CLR: Record<Profile, string> = {
  median:   '#f87171',
  uq:       '#fbbf24',
  ligature: '#34d399',
};

const PROFILE_LABEL: Record<Profile, string> = {
  median:   'Industry Median',
  uq:       'Upper Quartile',
  ligature: 'Ligature AI-enabled',
};

// Stage → approximate month on UQ sequential critical path
const STAGE_MONTH: Partial<Record<DevelopmentStage, number>> = {
  Discovery:        42,
  Preclinical:      72,
  'IND-Enabling':   78,
  'Phase 1':        96,
  'Phase 1/2':      107,
  'Phase 2':        130,
  'Phase 2/3':      145,
  'Phase 3':        174,
  'NDA/BLA Filed':  183,
  Approved:         194,
  'Post-Marketing': 200,
};

// ─────────────────────────────────────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────────────────────────────────────

const PX = 4.2;       // pixels per month
const LEFT = 228;     // name column width
const CTRL_W = 92;    // slider column width
const LCM_DISP = 44;  // months displayed for LCM ongoing bar

const UQ_TOTAL = PHASES
  .filter(p => !p.ongoing)
  .reduce((s, p) => s + p.dur.uq, 0);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function RdTimelineScreen() {
  const programs = usePrograms();

  const [profile,     setProfile]     = useState<Profile>('uq');
  const [sliders,     setSliders]     = useState<Record<string, number>>({});
  const [collapsed,   setCollapsed]   = useState<Set<FxArea>>(new Set());
  const [tooltip,     setTooltip]     = useState<TooltipState | null>(null);
  const [showSavings, setShowSavings] = useState(false);
  const [showBottle,  setShowBottle]  = useState(false);
  const [copied,      setCopied]      = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Core helpers ──────────────────────────────────────────────────────────

  const getF = (id: string) => sliders[id] ?? 1.0;

  const adjDur = useCallback((phase: PhaseData): number => {
    if (phase.ongoing) return LCM_DISP;
    return Math.max(0.5, Math.round(phase.dur[profile] * (sliders[phase.id] ?? 1.0) * 2) / 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, sliders]);

  // Cumulative positions (recalculates whenever sliders or profile change)
  const cumulative = useMemo(() => {
    const out: Record<string, { s: number; e: number }> = {};
    let cursor = 0;
    for (const p of PHASES) {
      const d = adjDur(p);
      out[p.id] = { s: cursor, e: cursor + d };
      if (!p.ongoing) cursor += d;
    }
    return out;
  }, [adjDur]);

  // Median baseline (fixed — no sliders affect it)
  const medianCum = useMemo(() => {
    const out: Record<string, { s: number; e: number }> = {};
    let cursor = 0;
    for (const p of PHASES) {
      const d = p.ongoing ? LCM_DISP : p.dur.median;
      out[p.id] = { s: cursor, e: cursor + d };
      if (!p.ongoing) cursor += d;
    }
    return out;
  }, []);

  const total = useMemo(
    () => PHASES.filter(p => !p.ongoing).reduce((s, p) => s + adjDur(p), 0),
    [adjDur],
  );

  const medianTotal = PHASES.filter(p => !p.ongoing).reduce((s, p) => s + p.dur.median, 0);
  const savedMonths = Math.max(0, medianTotal - total);
  const savedYears  = Math.round(savedMonths / 12 * 10) / 10;

  // Unslid baseline values for the summary cards
  const baseYrs = {
    median:   Math.round(medianTotal / 12 * 10) / 10,
    uq:       Math.round(PHASES.filter(p => !p.ongoing).reduce((s, p) => s + p.dur.uq, 0) / 12 * 10) / 10,
    ligature: Math.round(PHASES.filter(p => !p.ongoing).reduce((s, p) => s + p.dur.ligature, 0) / 12 * 10) / 10,
  };

  // Bottleneck = top-3 longest phases at current slider values
  const bottleneckIds = useMemo(() => {
    if (!showBottle) return new Set<string>();
    return new Set(
      [...PHASES]
        .filter(p => !p.ongoing)
        .sort((a, b) => adjDur(b) - adjDur(a))
        .slice(0, 3)
        .map(p => p.id),
    );
  }, [showBottle, adjDur]);

  const areaOrder: FxArea[] = ['Research', 'Preclinical', 'Clinical', 'Regulatory', 'Post-Market'];

  const phasesByArea = useMemo<Record<FxArea, PhaseData[]>>(() => {
    const m: Record<FxArea, PhaseData[]> = {
      Research: [], Preclinical: [], Clinical: [], Regulatory: [], 'Post-Market': [],
    };
    PHASES.forEach(p => m[p.area].push(p));
    return m;
  }, []);

  const totalWidth = (total + LCM_DISP) * PX;
  const yearTicks  = Array.from({ length: Math.ceil((total + LCM_DISP) / 12) + 1 }, (_, i) => i);

  const toggleArea = (area: FxArea) =>
    setCollapsed(prev => { const n = new Set(prev); n.has(area) ? n.delete(area) : n.add(area); return n; });

  const resetSliders = () => setSliders({});

  // ── Tooltip ───────────────────────────────────────────────────────────────

  const handleBarEnter = useCallback((e: React.MouseEvent, phaseId: string) => {
    const r = containerRef.current?.getBoundingClientRect();
    setTooltip({ phaseId, x: e.clientX - (r?.left ?? 0) + 18, y: e.clientY - (r?.top ?? 0) - 10 });
  }, []);

  const handleBarMove = useCallback((e: React.MouseEvent) => {
    const r = containerRef.current?.getBoundingClientRect();
    setTooltip(prev =>
      prev ? { ...prev, x: e.clientX - (r?.left ?? 0) + 18, y: e.clientY - (r?.top ?? 0) - 10 } : null,
    );
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────

  const doExport = () => {
    let txt = 'LIGATURE — E2E R&D TIMELINE ANALYSIS\n';
    txt += `Profile: ${PROFILE_LABEL[profile]}\n${'='.repeat(72)}\n\n`;
    txt += `Adjusted total (excl. LCM): ${Math.round(total / 12 * 10) / 10} years (${total} months)\n`;
    txt += `Industry median:            ${baseYrs.median} years\n`;
    txt += `Time reclaimed vs. median:  ${savedYears} years\n\n`;
    txt += `${'Phase'.padEnd(52)} ${'Adj'.padEnd(6)} ${'Base'.padEnd(6)} Factor\n${'-'.repeat(72)}\n`;
    PHASES.forEach(p => {
      if (p.ongoing) return;
      const d = adjDur(p);
      const f = getF(p.id);
      txt += `${p.name.substring(0, 51).padEnd(51)} ${(d + 'mo').padEnd(6)} ${(p.dur[profile] + 'mo').padEnd(6)} ${f.toFixed(1)}x\n`;
    });
    txt += `\nGenerated: ${new Date().toISOString().slice(0, 10)} · Tufts CSDD / McKinsey Life Sciences 2025\n`;
    navigator.clipboard.writeText(txt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tooltipPhase = tooltip ? PHASES.find(p => p.id === tooltip.phaseId) : null;
  const activePrograms = programs.filter(p => p.status !== 'terminated');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ position: 'relative' }} className="flex flex-col gap-0">

      {/* Range thumb styling */}
      <style>{`
        .rd-sl{-webkit-appearance:none;appearance:none;background:var(--border,#334155);
          border-radius:2px;outline:none;cursor:pointer;height:3px;width:52px}
        .rd-sl::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;
          border-radius:50%;background:#94a3b8;border:2px solid #0f172a;cursor:pointer}
        .rd-sl:hover::-webkit-slider-thumb{background:#cbd5e1}
      `}</style>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4">
        {(['median', 'uq', 'ligature'] as Profile[]).map(p => (
          <SummaryCard key={p}
            label={PROFILE_LABEL[p]}
            value={`${baseYrs[p]} yrs`}
            sub={p === 'median' ? 'Typical programme' : p === 'uq' ? 'Leading organisations' : 'Fully connected R&D'}
            clr={PROFILE_CLR[p]}
            active={profile === p}
            onClick={() => { setProfile(p); resetSliders(); }}
          />
        ))}
        {/* Time reclaimed */}
        <div className="rounded-xl border flex flex-col items-center justify-center gap-1 px-4 py-3 text-center"
          style={{ borderColor: 'rgba(251,191,36,.3)', background: 'rgba(251,191,36,.06)' }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Time Reclaimed</div>
          <div className="font-bold" style={{ fontSize: '1.85rem', color: '#fbbf24', lineHeight: 1.1 }}>
            {savedYears}
            <span style={{ fontSize: '0.82rem', fontWeight: 400, color: '#94a3b8', marginLeft: 3 }}>yrs</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {profile === 'median' ? 'Select UQ or Ligature to compare' : `vs. median · ${savedMonths}mo`}
          </div>
        </div>
      </div>

      {/* ── Lever legend ── */}
      <div className="flex flex-wrap items-center gap-2 pb-3 pt-1"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[10px] uppercase tracking-widest mr-1" style={{ color: 'var(--text-muted)' }}>
          Ligature modules →
        </span>
        {(Object.entries(LEVER_META) as [Lever, { label: string; clr: string }][]).map(([k, v]) => (
          <span key={k} className="text-[11px] px-2 py-0.5 rounded font-medium"
            style={{ background: `${v.clr}22`, color: v.clr, border: `1px solid ${v.clr}44` }}>
            {v.label}
          </span>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-2 py-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        {(['uq', 'ligature', 'median'] as Profile[]).map(p => (
          <button key={p}
            onClick={() => { setProfile(p); resetSliders(); }}
            className="text-[11px] px-3 py-1 rounded transition-all"
            style={{
              background: profile === p ? `${PROFILE_CLR[p]}18` : 'var(--surface-card)',
              color: profile === p ? PROFILE_CLR[p] : 'var(--text-muted)',
              border: `1px solid ${profile === p ? `${PROFILE_CLR[p]}66` : 'var(--border)'}`,
            }}>
            {PROFILE_LABEL[p]}
          </button>
        ))}

        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />

        <button onClick={() => setShowBottle(s => !s)}
          className="text-[11px] px-3 py-1 rounded transition-all"
          style={{
            background: showBottle ? 'rgba(251,191,36,.12)' : 'var(--surface-card)',
            color: showBottle ? '#fbbf24' : 'var(--text-muted)',
            border: `1px solid ${showBottle ? 'rgba(251,191,36,.4)' : 'var(--border)'}`,
          }}>
          Bottleneck phases
        </button>

        <button onClick={() => setShowSavings(s => !s)}
          className="text-[11px] px-3 py-1 rounded transition-all"
          style={{
            background: showSavings ? 'rgba(52,211,153,.12)' : 'var(--surface-card)',
            color: showSavings ? '#34d399' : 'var(--text-muted)',
            border: `1px solid ${showSavings ? 'rgba(52,211,153,.4)' : 'var(--border)'}`,
          }}>
          {showSavings ? '✓ Savings visible' : 'Show savings'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={resetSliders}
            className="text-[11px] px-3 py-1 rounded flex items-center gap-1.5 transition-all"
            style={{ background: 'var(--surface-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
          <button onClick={doExport}
            className="text-[11px] px-3 py-1 rounded flex items-center gap-1.5 transition-all"
            style={{
              background: copied ? 'rgba(52,211,153,.12)' : 'var(--surface-card)',
              color: copied ? '#34d399' : 'var(--text-muted)',
              border: `1px solid ${copied ? 'rgba(52,211,153,.4)' : 'var(--border)'}`,
            }}>
            <Download className="w-3 h-3" /> {copied ? 'Copied!' : 'Export'}
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ minWidth: LEFT + totalWidth + CTRL_W + 56, position: 'relative' }}>

          {/* Year axis — sticky top */}
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            paddingLeft: LEFT, paddingTop: 10, paddingBottom: 5,
            borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10,
          }}>
            {yearTicks.map(yr => (
              <div key={yr} style={{
                width: 12 * PX, flexShrink: 0,
                fontSize: 10, color: 'var(--text-muted)',
                fontFamily: 'monospace', textAlign: 'center',
                borderLeft: '1px solid var(--border)', paddingLeft: 2,
              }}>
                {yr === 0 ? 'Yr 0' : `Y${yr}`}
              </div>
            ))}
          </div>

          {/* Phase rows grouped by functional area */}
          {areaOrder.map(area => {
            const phases = phasesByArea[area];
            if (!phases.length) return null;
            const meta   = AREA_META[area];
            const isOpen = !collapsed.has(area);

            return (
              <div key={area} style={{ borderBottom: '1px solid rgba(51,65,85,.4)' }}>

                {/* Area header */}
                <div onClick={() => toggleArea(area)}
                  className="flex items-center gap-2 cursor-pointer select-none transition-colors hover:opacity-80"
                  style={{
                    padding: '6px 10px', background: `${meta.clr}12`,
                    position: 'sticky', left: 0, width: LEFT,
                  }}>
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: `${meta.clr}25`, color: meta.clr }}>
                    {meta.icon}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: meta.clr }}>
                    {area}
                  </span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 10 }}>
                    {phases.length}
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
                </div>

                {isOpen && phases.map(phase => {
                  const cur      = cumulative[phase.id];
                  const med      = medianCum[phase.id];
                  const dur      = adjDur(phase);
                  const barLeft  = cur.s * PX;
                  const barW     = Math.max(dur * PX, 6);
                  const medLeft  = med.s * PX;
                  const medW     = Math.max((med.e - med.s) * PX, 6);
                  const clr      = PHASE_CLR[phase.area];
                  const isCrit   = bottleneckIds.has(phase.id);
                  const f        = getF(phase.id);

                  return (
                    <div key={phase.id} className="flex items-center"
                      style={{
                        minHeight: 42, borderBottom: '1px solid rgba(51,65,85,.2)',
                        background: isCrit ? 'rgba(251,191,36,.03)' : undefined,
                      }}>

                      {/* Name column — sticky left */}
                      <div style={{
                        width: LEFT, minWidth: LEFT, padding: '4px 10px',
                        position: 'sticky', left: 0,
                        background: isCrit ? 'rgba(251,191,36,.05)' : 'var(--surface)',
                        zIndex: 5, display: 'flex', flexDirection: 'column', gap: 3,
                      }}>
                        <span className="truncate" title={phase.name}
                          style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {phase.name}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {phase.levers.slice(0, 3).map(l => (
                            <span key={l} style={{
                              fontSize: 9, padding: '1px 4px', borderRadius: 3,
                              background: `${LEVER_META[l].clr}22`, color: LEVER_META[l].clr,
                              border: `1px solid ${LEVER_META[l].clr}33`, whiteSpace: 'nowrap',
                            }}>{LEVER_META[l].label}</span>
                          ))}
                          {phase.levers.length > 3 && (
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{phase.levers.length - 3}</span>
                          )}
                        </div>
                      </div>

                      {/* Bar area */}
                      <div style={{ flex: 1, position: 'relative', height: 42, paddingLeft: 4, paddingRight: 4 }}>

                        {/* Ghost — median bar when on non-median profile */}
                        {profile !== 'median' && (
                          <div style={{
                            position: 'absolute',
                            left: medLeft + 4, top: '50%', transform: 'translateY(-50%)',
                            width: Math.max(medW, 4), height: 6, borderRadius: 3,
                            background: 'rgba(248,113,113,.10)',
                            border: '1px dashed rgba(248,113,113,.22)',
                            pointerEvents: 'none',
                          }} />
                        )}

                        {/* Primary bar */}
                        <div
                          onMouseEnter={e => handleBarEnter(e, phase.id)}
                          onMouseMove={handleBarMove}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            position: 'absolute',
                            left: barLeft + 4, top: '50%', transform: 'translateY(-50%)',
                            width: barW, height: phase.ongoing ? 10 : 20,
                            borderRadius: phase.ongoing ? '4px 0 0 4px' : 4,
                            background: `${clr}bb`, border: `1.5px solid ${clr}`,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'left .25s ease, width .25s ease',
                            boxShadow: isCrit
                              ? `0 0 12px rgba(251,191,36,.35), inset 0 0 0 1.5px rgba(251,191,36,.55)`
                              : `0 0 7px ${clr}33`,
                          }}>
                          {phase.ongoing && (
                            <div style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', color: clr, fontSize: 14 }}>
                              →
                            </div>
                          )}
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.92)', fontWeight: 600, userSelect: 'none' }}>
                            {phase.ongoing ? 'ongoing' : `${dur}m`}
                          </span>
                        </div>

                        {/* Savings badge */}
                        {showSavings && !phase.ongoing && profile !== 'median' && (() => {
                          const saved = phase.dur.median - dur;
                          if (saved <= 0) return null;
                          return (
                            <div style={{
                              position: 'absolute', left: barLeft + barW + 10,
                              top: '50%', transform: 'translateY(-50%)',
                              fontSize: 9, padding: '2px 5px', borderRadius: 3,
                              background: 'rgba(52,211,153,.12)', color: '#34d399',
                              border: '1px solid rgba(52,211,153,.25)',
                              whiteSpace: 'nowrap', fontWeight: 600, pointerEvents: 'none',
                            }}>−{saved}mo</div>
                          );
                        })()}
                      </div>

                      {/* Slider + factor display */}
                      <div style={{
                        width: CTRL_W, minWidth: CTRL_W,
                        display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px',
                      }}>
                        {!phase.ongoing ? (
                          <>
                            <input type="range" min={50} max={150} step={5}
                              value={Math.round(f * 100)}
                              onChange={e => setSliders(prev => ({ ...prev, [phase.id]: +e.target.value / 100 }))}
                              className="rd-sl"
                            />
                            <span style={{
                              fontFamily: 'monospace', fontSize: 10,
                              color: f !== 1.0 ? '#fbbf24' : 'var(--text-muted)',
                              minWidth: 28, textAlign: 'right',
                              fontWeight: f !== 1.0 ? 600 : 400,
                            }}>{f.toFixed(1)}×</span>
                          </>
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>∞</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ── Portfolio asset overlay ── */}
          {activePrograms.length > 0 && (
            <PortfolioOverlay programs={activePrograms} adjustedTotal={total} />
          )}

        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && tooltipPhase && (
        <PhaseTooltip
          phase={tooltipPhase} profile={profile}
          dur={adjDur(tooltipPhase)}
          x={tooltip.x} y={tooltip.y}
        />
      )}

      {/* ── Footer ── */}
      <div className="mt-4 text-[11px] leading-relaxed"
        style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Benchmark:</strong>{' '}
        Tufts CSDD, McKinsey Life Sciences Benchmark 2025. Median reflects programmes reaching approval.
        Ligature AI-enabled timeline based on integrated CTMS, Safety/PV, AI Authoring, HAQ Intel, and Submissions Hub.{' '}
        <strong style={{ color: 'var(--text-secondary)' }}>Sliders</strong>{' '}(0.5×–1.5×) adjust phase duration assumptions against the selected profile baseline.{' '}
        <strong style={{ color: 'var(--text-secondary)' }}>Ghost bars</strong>{' '}show industry median when an alternate profile is active.{' '}
        <strong style={{ color: 'var(--text-secondary)' }}>Bottleneck phases</strong>{' '}highlight the three longest phases by adjusted duration.
        Portfolio asset positions are mapped to the UQ critical path and scaled proportionally to the current profile.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryCard
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, clr, active, onClick,
}: {
  label: string; value: string; sub: string;
  clr: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="rounded-xl border flex flex-col gap-1 px-4 py-3 text-left transition-all w-full"
      style={{
        borderColor: active ? `${clr}66` : 'var(--border)',
        background: active ? `${clr}10` : 'var(--surface-card)',
        outline: active ? `2px solid ${clr}33` : 'none', outlineOffset: 2,
      }}>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="font-bold" style={{ fontSize: '1.5rem', color: active ? clr : 'var(--text-primary)', lineHeight: 1.15 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhaseTooltip
// ─────────────────────────────────────────────────────────────────────────────

function PhaseTooltip({
  phase, profile, dur, x, y,
}: {
  phase: PhaseData; profile: Profile; dur: number; x: number; y: number;
}) {
  const saved = phase.dur.median - dur;
  return (
    <div style={{
      position: 'absolute',
      left: Math.min(x, 580), top: Math.max(y, 8),
      zIndex: 100, pointerEvents: 'none',
      background: 'var(--surface-elevated)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 16px', maxWidth: 320, minWidth: 260,
      boxShadow: '0 14px 44px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.04)',
    }}>
      <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        {phase.name}
      </div>
      <div className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
        {phase.desc}
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {phase.levers.map(l => (
          <span key={l} style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: `${LEVER_META[l].clr}20`, color: LEVER_META[l].clr,
            border: `1px solid ${LEVER_META[l].clr}33`,
          }}>{LEVER_META[l].label}</span>
        ))}
      </div>
      {/* Three-way duration comparison */}
      <div className="grid gap-1 mb-2 pt-2"
        style={{ borderTop: '1px solid var(--border)', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {(['median', 'uq', 'ligature'] as Profile[]).map(p => (
          <div key={p} className="text-center">
            <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
              {p === 'median' ? 'Median' : p === 'uq' ? 'Upper Q' : 'Ligature'}
            </div>
            <div className="font-bold" style={{
              fontSize: '0.82rem', color: PROFILE_CLR[p],
              opacity: p === profile ? 1 : 0.38, transition: 'opacity .15s',
            }}>
              {phase.ongoing ? '∞' : `${phase.dur[p]}mo`}
            </div>
          </div>
        ))}
      </div>
      {!phase.ongoing && profile !== 'median' && saved > 0 && (
        <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {phase.saving}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioOverlay — portfolio assets positioned on the benchmark timeline
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioOverlay({
  programs, adjustedTotal,
}: {
  programs: ReturnType<typeof usePrograms>;
  adjustedTotal: number;
}) {
  return (
    <div style={{ borderTop: '2px solid var(--border)', marginTop: 8 }}>

      <div className="flex items-center gap-2 px-3 py-2" style={{
        position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 8, width: LEFT + 320,
      }}>
        <Target className="w-4 h-4" style={{ color: '#60a5fa' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Portfolio Assets</span>
        <span className="text-[10px] px-2 py-0.5 rounded"
          style={{ background: 'rgba(96,165,250,.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,.25)' }}>
          {programs.length} active programs
        </span>
        <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Current stage · solid bar = journey to date · dashed = remaining
        </span>
      </div>

      {programs.map(program => {
        const stageM  = STAGE_MONTH[program.stage] ?? 50;
        // Scale stage position proportionally to the current adjusted total
        const scaledM = Math.round((stageM / UQ_TOTAL) * adjustedTotal);
        const markerX = scaledM * PX;
        const remainW = Math.max((adjustedTotal - scaledM) * PX, 4);
        const clr     = STATUS_CLR[program.status];

        return (
          <div key={program.id} className="flex items-center"
            style={{ minHeight: 36, borderBottom: '1px solid rgba(51,65,85,.2)' }}>

            {/* Name column */}
            <div style={{
              width: LEFT, minWidth: LEFT, padding: '4px 10px',
              position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 5,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: clr }} />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{program.code}</span>
                <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{program.name}</span>
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{program.indication}</div>
            </div>

            {/* Timeline */}
            <div style={{ flex: 1, position: 'relative', height: 36, paddingLeft: 4 }}>
              {/* Track */}
              <div style={{
                position: 'absolute', left: 4, right: 4,
                top: '50%', transform: 'translateY(-50%)',
                height: 2, background: 'var(--border)', borderRadius: 1,
              }} />
              {/* Journey to date */}
              {markerX > 0 && (
                <div style={{
                  position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
                  width: markerX, height: 9, borderRadius: '3px 0 0 3px',
                  background: `${clr}44`, border: `1px solid ${clr}66`,
                  transition: 'width .3s ease',
                }} />
              )}
              {/* Remaining journey (forward-look) */}
              <div style={{
                position: 'absolute', left: 4 + markerX, top: '50%', transform: 'translateY(-50%)',
                width: remainW, height: 5, borderRadius: '0 2px 2px 0',
                background: `${clr}14`, border: `1px dashed ${clr}30`,
                transition: 'width .3s ease',
              }} />
              {/* Stage marker dot */}
              <div style={{
                position: 'absolute', left: 4 + markerX, top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 12, height: 12, borderRadius: '50%',
                background: clr, border: '2px solid var(--surface)',
                boxShadow: `0 0 7px ${clr}70`, zIndex: 2,
                transition: 'left .3s ease',
              }} />
              {/* Stage label */}
              <div style={{
                position: 'absolute', left: 4 + markerX + 10,
                top: '50%', transform: 'translateY(-50%)',
                fontSize: 10, color: clr, fontWeight: 600, whiteSpace: 'nowrap',
              }}>{program.stage}</div>
            </div>

            {/* Status */}
            <div style={{ width: 78, minWidth: 78, paddingRight: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
                style={{ background: `${clr}18`, color: clr, border: `1px solid ${clr}30`, whiteSpace: 'nowrap' }}>
                {program.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
