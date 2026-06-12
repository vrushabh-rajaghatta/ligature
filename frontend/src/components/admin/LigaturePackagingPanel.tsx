
/**
 * LigaturePackagingPanel — Ligature Product Tier Definitions
 * v0.125.83
 *
 * Admin panel defining and displaying the three Ligature capability packages:
 *   Ligature Originate — Discovery & BD intelligence layer
 *   Ligature Transact  — Asset transactions, due diligence, data rooms
 *   Ligature Comply    — Regulatory, quality, and compliance layer
 *
 * Used for investor demos, tier configuration, and feature-flag gating.
 */

import { useState } from 'react';
import {
  Target, Handshake, Shield, CheckCircle, Lock, Sparkles,
  ChevronDown, ChevronUp, Zap, Globe, Users, BarChart3,
  FlaskConical, ScanSearch, FileText, Award, Brain,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type PackageTier = 'originate' | 'transact' | 'comply';

interface CapabilityItem {
  label:    string;
  included: boolean;
  note?:    string;
}

interface Package {
  id:          PackageTier;
  name:        string;
  tagline:     string;
  description: string;
  icon:        React.ReactNode;
  accentColor: string;
  accentBg:    string;
  accentBorder:string;
  pricing:     string;
  targetBuyer: string;
  capabilities: CapabilityItem[];
  agents:       string[];
  modules:      string[];
}

// ── Package definitions ────────────────────────────────────────────────────────

const PACKAGES: Package[] = [
  {
    id: 'originate',
    name: 'Ligature Originate',
    tagline: 'Intelligence-led discovery and pipeline origination',
    description: 'Ligature Originate gives R&D leaders the AI-powered tools to find the right targets, design the right experiments, and build the right pipeline — before capital is deployed. Candidate targeting, experiment sequencing, and organizational capability profiling in one integrated workflow.',
    icon: <Target className="w-6 h-6" />,
    accentColor: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/20',
    pricing: 'Included in Ligature Platform — Originate tier',
    targetBuyer: 'CSO · Head of Research · VP Discovery · BD (in-licensing)',
    capabilities: [
      { label: 'Candidate Targeting Agent — 5-dimension scoring across TAs',          included: true },
      { label: 'Experiment Design Agent — ICH M3(R2) IND-enabling study sequencer',  included: true },
      { label: 'Organizational Capability Profile — self-reported + platform-inferred', included: true },
      { label: 'Research module — lead opt, translational, preclinical, IND readiness', included: true },
      { label: 'ELN integration — compound registration, assay data, target biology', included: true },
      { label: 'Literature Intelligence — PubMed, patent landscape, competitive intel', included: true },
      { label: 'R&D Timeline — cradle-to-grave Gantt, Ligature AI benchmark overlay', included: true },
      { label: 'ADMET radar charts, stability trend, batch yield analytics',          included: true },
      { label: 'Ligature Transact — due diligence and data rooms',                    included: false, note: 'Transact add-on' },
      { label: 'Ligature Comply — regulatory and quality layer',                      included: false, note: 'Comply add-on' },
    ],
    agents: ['Candidate Targeting', 'Experiment Design', 'HA Predictive HAQ (read)', 'R&D Intelligence'],
    modules: ['Research', 'ELN', 'CMC (read)', 'R&D Timeline', 'Analytics'],
  },
  {
    id: 'transact',
    name: 'Ligature Transact',
    tagline: 'Asset transactions, due diligence, and secure data rooms',
    description: 'Ligature Transact connects live R&D data to every BD transaction. One-click due diligence packages assembled from Ligature records — no manual compilation. SHA-256 integrity seals applied automatically. Time-limited data rooms expire on schedule, revoke on breach, and log every access event to the immutable audit trail.',
    icon: <Handshake className="w-6 h-6" />,
    accentColor: 'text-violet-400',
    accentBg: 'bg-violet-500/10',
    accentBorder: 'border-violet-500/20',
    pricing: 'Add-on to Originate or Comply — Transact tier',
    targetBuyer: 'CEO · CFO · Head of BD · General Counsel',
    capabilities: [
      { label: 'Asset Due Diligence Agent — one-click Ligature data assembly',         included: true },
      { label: 'Field-level redaction rules — per data class, Include/Redacted/Exclude', included: true },
      { label: 'SHA-256 integrity verification — tamper-evident manifest seal',        included: true },
      { label: 'Time-limited Virtual Data Rooms — expiry, max users, IP whitelist',    included: true },
      { label: 'NDA gate + PDF watermarking on data room entry',                       included: true },
      { label: 'Immutable access audit log — SHA-256 chained, user + IP + doc',       included: true },
      { label: 'Divestiture Package Builder — asset carve-out with carve-in rules',   included: true },
      { label: 'Partnership Workspace — milestone tracking, shared document exchange', included: true },
      { label: 'BD deal pipeline overview with stage tracking',                        included: true },
      { label: 'PMDA J-NDA Advisory agent for Japan BD transactions',                 included: true },
    ],
    agents: ['Asset Due Diligence', 'PMDA Advisory (J-NDA)', 'Integrity Verifier'],
    modules: ['BD / Transact', 'Data Room Manager', 'Divestiture Builder', 'Partnership Workspace'],
  },
  {
    id: 'comply',
    name: 'Ligature Comply',
    tagline: 'Regulatory excellence, quality, and compliance — end-to-end',
    description: 'Ligature Comply is the full regulatory and quality operating system. From IND to NDA: authoring, submissions, HAQ management, PMDA intelligence, eCTD publishing, GxP compliance, safety surveillance, and SOC 2 Type II certified data infrastructure. The only platform purpose-built for pharma regulatory operations.',
    icon: <Shield className="w-6 h-6" />,
    accentColor: 'text-blue-400',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/20',
    pricing: 'Core Ligature Platform — Comply tier (full platform)',
    targetBuyer: 'CMO · Head of Regulatory · QA Director · CRO/CMO · eCTD Publisher',
    capabilities: [
      { label: 'HA Intelligence Agents — FDA, EMA, PMDA inspection + dossier + predictive HAQ', included: true },
      { label: 'PMDA Agents — inspection, J-NDA dossier review, J-NDA strategy advisory',       included: true },
      { label: 'Submissions Hub — IND/NDA/MAA/CTA eCTD publishing to FDA/EMA/PMDA/HC',         included: true },
      { label: 'HAQ Management — 21 CFR Part 11 e-sig responses, precedent, timeline',          included: true },
      { label: 'Document Control — co-display, DualRep, SHA-256 archive integrity',             included: true },
      { label: 'Authoring — AI-assisted, track changes, Docuvera integration',                  included: true },
      { label: 'GxP Suite — GLP, GCP, GMP compliance modules',                                  included: true },
      { label: 'QMS — CAPA, change control, audit management',                                  included: true },
      { label: 'Pharmacovigilance — E2B(R3), signal detection, PSMF, PSUR',                    included: true },
      { label: 'SOC 2 Type II certified · 21 CFR Part 11 · ICH E6(R3) · GDPR ready',          included: true },
    ],
    agents: ['HA Inspection (FDA/EMA/PMDA)', 'HA Dossier Review', 'Predictive HAQ', 'PMDA Inspection', 'PMDA J-NDA Dossier', 'PMDA Advisory', 'Safety Signal Detection', 'Reg Intelligence'],
    modules: ['Regulatory (all)', 'Quality (all)', 'PV/Safety (all)', 'Clinical Development (all)', 'CMC (all)', 'Document Control', 'Submissions', 'eCTD Publishing'],
  },
];

// ── Package card ───────────────────────────────────────────────────────────────

function PackageCard({ pkg, isActive, onClick }: { pkg: Package; isActive: boolean; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${isActive ? pkg.accentBorder + ' ' + pkg.accentBg : 'border-border'} overflow-hidden`}>
      {/* Header */}
      <button onClick={onClick} className="w-full flex items-start gap-4 p-5 text-left">
        <div className={`w-12 h-12 rounded-xl ${pkg.accentBg} flex items-center justify-center ${pkg.accentColor} flex-shrink-0`}>
          {pkg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-base font-bold ${isActive ? pkg.accentColor : 'text-text-primary'}`}>{pkg.name}</div>
          <div className="text-xs text-text-muted mt-0.5">{pkg.tagline}</div>
          <div className="text-[10px] text-text-muted/60 mt-1">{pkg.targetBuyer}</div>
        </div>
        <div className={`flex-shrink-0 text-[10px] px-2 py-1 rounded border font-medium ${isActive ? pkg.accentBorder + ' ' + pkg.accentColor : 'border-border text-text-muted'}`}>
          {isActive ? '● Active' : 'View'}
        </div>
      </button>

      {isActive && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/40 pt-4">
          <p className="text-xs text-text-secondary leading-relaxed">{pkg.description}</p>

          {/* Pricing */}
          <div className={`rounded-lg ${pkg.accentBg} border ${pkg.accentBorder} px-3 py-2`}>
            <div className={`text-[10px] uppercase tracking-wider font-semibold ${pkg.accentColor} mb-0.5`}>Packaging</div>
            <div className="text-xs text-text-secondary">{pkg.pricing}</div>
          </div>

          {/* Capabilities */}
          <div>
            <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 w-full text-left">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex-1">Capabilities ({pkg.capabilities.length})</div>
              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {pkg.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {cap.included
                      ? <CheckCircle className={`w-3.5 h-3.5 ${pkg.accentColor} flex-shrink-0 mt-0.5`} />
                      : <Lock className="w-3.5 h-3.5 text-text-muted/40 flex-shrink-0 mt-0.5" />
                    }
                    <span className={cap.included ? 'text-text-secondary' : 'text-text-muted/50'}>{cap.label}</span>
                    {cap.note && <span className="text-[9px] text-text-muted/60 ml-auto flex-shrink-0">{cap.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agents + modules grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-elevated p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Brain className="w-3 h-3" />AI Agents</div>
              <div className="space-y-1">
                {pkg.agents.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Sparkles className={`w-2.5 h-2.5 ${pkg.accentColor} flex-shrink-0`} />
                    {a}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-surface-elevated p-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><BarChart3 className="w-3 h-3" />Modules</div>
              <div className="space-y-1">
                {pkg.modules.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <div className={`w-1.5 h-1.5 rounded-full ${pkg.accentBg.replace('/10', '/60')} flex-shrink-0`} />
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LigaturePackagingPanel() {
  const [activePackage, setActivePackage] = useState<PackageTier>('comply');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface-elevated">
        <Zap className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-text-primary mb-0.5">Ligature Product Packaging</div>
          <div className="text-xs text-text-muted leading-relaxed">
            Three modular capability tiers that compose into the full Ligature platform. Each tier can be licensed independently or combined. Used for investor demos, commercial pricing, and feature-flag configuration.
          </div>
        </div>
      </div>

      {/* Tier comparison strip */}
      <div className="grid grid-cols-3 gap-3">
        {PACKAGES.map(pkg => (
          <button
            key={pkg.id}
            onClick={() => setActivePackage(pkg.id)}
            className={`rounded-xl border p-3 text-left transition-all ${activePackage === pkg.id ? pkg.accentBorder + ' ' + pkg.accentBg : 'border-border hover:bg-surface-elevated/40'}`}
          >
            <div className={`text-xs font-bold mb-0.5 ${activePackage === pkg.id ? pkg.accentColor : 'text-text-primary'}`}>{pkg.name.split(' ')[1]}</div>
            <div className="text-[10px] text-text-muted leading-tight">{pkg.tagline.split(' ').slice(0, 4).join(' ')}…</div>
            <div className="mt-2 text-[9px] font-medium text-text-muted/60">{pkg.capabilities.filter(c => c.included).length} capabilities · {pkg.agents.length} agents</div>
          </button>
        ))}
      </div>

      {/* Package cards */}
      <div className="space-y-3">
        {PACKAGES.map(pkg => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            isActive={activePackage === pkg.id}
            onClick={() => setActivePackage(pkg.id === activePackage ? activePackage : pkg.id)}
          />
        ))}
      </div>

      {/* Combination note */}
      <div className="rounded-xl border border-border bg-surface-elevated p-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Common Configurations</div>
        <div className="space-y-2 text-xs text-text-secondary">
          {[
            { combo: 'Originate + Comply',           label: 'Full R&D platform — most common for biotech' },
            { combo: 'Originate + Transact',          label: 'Discovery + BD — asset deal-making focus' },
            { combo: 'Comply only',                   label: 'Regulatory/quality ops — CRO or established pharma' },
            { combo: 'Originate + Transact + Comply', label: 'Full Ligature — complete pharma operating system' },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="font-semibold text-text-primary w-48 flex-shrink-0">{row.combo}</span>
              <span className="text-text-muted">{row.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
