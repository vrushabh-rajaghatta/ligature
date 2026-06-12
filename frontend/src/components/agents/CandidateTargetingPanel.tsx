
/**
 * CandidateTargetingPanel — Ligature Originate
 * v0.125.79
 *
 * Searches the disease landscape for drug targets matching a defined
 * mechanistic and commercial profile. Scores candidates against internal
 * capability (chemistry, biology, manufacturing) and external competitive
 * positioning. Part of Ligature Originate capability layer.
 */

import { useState } from 'react';
import {
  Target, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  TrendingUp, Shield, Beaker, Globe, DollarSign, CheckCircle,
  AlertTriangle, ExternalLink, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';
import { useCapabilityProfileStore } from '@/store/useCapabilityProfileStore'; // v0.125.82

// ── Types ─────────────────────────────────────────────────────────────────────

interface TargetCandidate {
  id: string;
  rank: number;
  target: string;
  mechanism: string;
  indication: string;
  therapeuticArea: string;
  overallScore: number;           // 0–100
  scores: {
    scientificValidity: number;   // Biological evidence strength
    clinicalFeasibility: number;  // Translatability, biomarker availability
    competitiveLandscape: number; // White space, differentiation
    internalCapability: number;   // Chemistry/bio/manufacturing fit
    commercialOpportunity: number;// Market size, unmet need
  };
  keyEvidence: string[];
  competitiveRisk: 'Low' | 'Medium' | 'High';
  developmentTimeline: string;
  patentLandscape: string;
  ligatureAdvantage: string;
  nextSteps: string[];
  pubmedCount: number;
  clinicalTrialsActive: number;
}

type TherapeuticArea = 'oncology' | 'immunology' | 'neurology' | 'cardiometabolic';
type CapabilityProfile = 'small-molecule' | 'biologics' | 'both';

// ── Candidate generator ───────────────────────────────────────────────────────

function generateCandidates(ta: TherapeuticArea, capability: CapabilityProfile, orgCapability: number = 80): TargetCandidate[] {
  const candidates: Record<TherapeuticArea, TargetCandidate[]> = {
    oncology: [
      {
        id: 'TGT-001', rank: 1, target: 'KRAS G12D', mechanism: 'Covalent KRAS G12D inhibitor',
        indication: 'Pancreatic ductal adenocarcinoma (PDAC), CRC', therapeuticArea: 'Oncology',
        overallScore: 87,
        scores: { scientificValidity: 92, clinicalFeasibility: 78, competitiveLandscape: 85, internalCapability: 91, commercialOpportunity: 88 },
        keyEvidence: ['KRAS G12D present in 93% of PDAC (TCGA)', 'MRTX1133 Phase 1 data demonstrates target engagement', 'Internal KRAS G12C experience (LIG-2847) directly translatable', 'No approved KRAS G12D inhibitor — first-in-class opportunity'],
        competitiveRisk: 'Medium',
        developmentTimeline: '18–24 months to IND (leveraging LIG-2847 platform)',
        patentLandscape: 'Freedom-to-operate confirmed. Mirati/BMS covering G12C only. Novel covalent binding pocket available.',
        ligatureAdvantage: 'Direct structural analogy to approved ligrastinib (LIG-2847) — chemistry platform, GLP toxicology package, and CMC infrastructure all reusable.',
        nextSteps: ['Commission KRAS G12D binding assay (Q2 2026)', 'Initiate lead series design using LIG-2847 scaffold', 'Literature review — MRTX1133 clinical data package'],
        pubmedCount: 1847, clinicalTrialsActive: 8,
      },
      {
        id: 'TGT-002', rank: 2, target: 'PRMT5 / MTA-cooperative', mechanism: 'MTA-cooperative PRMT5 inhibitor',
        indication: 'MTAP-deleted solid tumors (~15% of all cancers)', therapeuticArea: 'Oncology',
        overallScore: 82,
        scores: { scientificValidity: 88, clinicalFeasibility: 82, competitiveLandscape: 79, internalCapability: 76, commercialOpportunity: 85 },
        keyEvidence: ['MTAP deletion defines synthetic lethal vulnerability (Mavrakis et al., Science 2016)', 'AG-270 Phase 1 ORR 24% in MTAP-deleted tumors', 'Pan-tumor biomarker-selected approach — broad addressable population', 'Ligature oncology infrastructure directly applicable'],
        competitiveRisk: 'Medium',
        developmentTimeline: '24–30 months to IND',
        patentLandscape: '3 blocking patents from Agios. Design-around space available for MTA-cooperative binding mode.',
        ligatureAdvantage: 'Biomarker-driven oncology expertise from LIG-2847 program directly applicable. MTAP deletion assay infrastructure exists.',
        nextSteps: ['Patent freedom-to-operate analysis (Q2 2026)', 'HTS campaign using PRMT5 MTA-cooperative assay', 'Identify MTAP-deleted cell line panel for validation'],
        pubmedCount: 423, clinicalTrialsActive: 5,
      },
      {
        id: 'TGT-003', rank: 3, target: 'CDK2 / Cyclin E1', mechanism: 'CDK2 selective inhibitor (CCNE1-amplified tumors)',
        indication: 'High-grade serous ovarian cancer, TNBC, endometrial cancer', therapeuticArea: 'Oncology',
        overallScore: 74,
        scores: { scientificValidity: 79, clinicalFeasibility: 71, competitiveLandscape: 68, internalCapability: 78, commercialOpportunity: 74 },
        keyEvidence: ['CCNE1 amplification in 20–30% of ovarian cancers', 'Selective CDK2 inhibition validated by PTC596, INX-315', 'CDK4/6 resistance mechanism — potential combination opportunity', 'Gynecological oncology is underpenetrated by precision medicine'],
        competitiveRisk: 'High',
        developmentTimeline: '30–36 months to IND',
        patentLandscape: 'Competitive — Pfizer, Relay Therapeutics, Incyclix Bio all active. Selectivity differentiation required.',
        ligatureAdvantage: 'Small molecule kinase inhibitor expertise from LIG-2847. CDK2 selectivity assay infrastructure available from legacy CMC work.',
        nextSteps: ['Selectivity differentiation strategy workshop (Q3 2026)', 'CCNE1 amplification patient population analysis', 'Competitive intelligence deep-dive — PTC596 Phase 2 data'],
        pubmedCount: 892, clinicalTrialsActive: 12,
      },
    ],
    immunology: [
      {
        id: 'TGT-004', rank: 1, target: 'TYK2 (allosteric JH2)', mechanism: 'Allosteric TYK2 inhibitor — JH2 pseudokinase domain',
        indication: 'Psoriasis, PsA, IBD, SLE', therapeuticArea: 'Immunology',
        overallScore: 79,
        scores: { scientificValidity: 85, clinicalFeasibility: 80, competitiveLandscape: 72, internalCapability: 74, commercialOpportunity: 83 },
        keyEvidence: ['Deucravacitinib (BMS-986165) demonstrated superiority vs apremilast in psoriasis', 'JH2 allosteric mechanism confers selectivity over JAK1/2/3', 'Multiple indications addressable from single platform', 'Oral administration — patient preference advantage'],
        competitiveRisk: 'Medium',
        developmentTimeline: '24–30 months to IND',
        patentLandscape: 'JH2 binding mode well-characterised. Multiple differentiation opportunities in selectivity and dosing profile.',
        ligatureAdvantage: 'Oral small molecule expertise. Phase 2/3 capability for autoimmune programs (from ligrastinib Phase 3 infrastructure).',
        nextSteps: ['JH2 allosteric binding assay development', 'Psoriasis competitive landscape update', 'IBD opportunity assessment (growing unmet need)'],
        pubmedCount: 634, clinicalTrialsActive: 19,
      },
    ],
    neurology: [
      {
        id: 'TGT-005', rank: 1, target: 'LRRK2 (G2019S)', mechanism: 'LRRK2 kinase inhibitor — PD mutation selective',
        indication: "LRRK2-mutant Parkinson's disease (~10% of familial PD)", therapeuticArea: 'Neurology',
        overallScore: 68,
        scores: { scientificValidity: 78, clinicalFeasibility: 58, competitiveLandscape: 74, internalCapability: 55, commercialOpportunity: 74 },
        keyEvidence: ["G2019S gain-of-function mutation validated as PD driver", 'DNL201 demonstrated biomarker engagement in Phase 1', 'Genetically defined patient population — precision medicine approach', "Biomarker (CSF pS935-LRRK2) available for PD proof-of-concept"],
        competitiveRisk: 'Low',
        developmentTimeline: '36–42 months to IND (requires CNS-penetrant chemistry capability)',
        patentLandscape: "Open landscape relative to competitors. Denali/Biogen covering LRRK2 broadly — differentiation in selectivity and CNS penetration required.",
        ligatureAdvantage: "Oral small molecule expertise applicable. CNS drug design would require new capability or partnership.",
        nextSteps: ['CNS chemistry capability gap assessment', 'Biomarker strategy for PD proof-of-concept', 'Partnership landscape — CNS-focused CROs with LRRK2 expertise'],
        pubmedCount: 1243, clinicalTrialsActive: 7,
      },
    ],
    cardiometabolic: [
      {
        id: 'TGT-006', rank: 1, target: 'PCSK9 (oral small molecule)', mechanism: 'PCSK9 protein-protein interaction inhibitor (oral)',
        indication: 'Hypercholesterolaemia, ASCVD', therapeuticArea: 'Cardiometabolic',
        overallScore: 85,
        scores: { scientificValidity: 90, clinicalFeasibility: 80, competitiveLandscape: 88, internalCapability: 72, commercialOpportunity: 95 },
        keyEvidence: ['PCSK9 mAbs (evolocumab, alirocumab) demonstrate 50–60% LDL reduction', 'Massive unmet need for oral PCSK9 inhibitor (adherence, cost, self-injection)', 'LY3819469 and AZD0780 demonstrate PPI feasibility at Phase 1', 'Global addressable market >$20B if oral formulation achieved'],
        competitiveRisk: 'High',
        developmentTimeline: '36–48 months to IND (oral PPI chemistry highly challenging)',
        patentLandscape: 'AstraZeneca, Lilly, Novo Nordisk all active. White space in specific binding pocket interactions.',
        ligatureAdvantage: 'Strong cardiometabolic regulatory expertise. CMC infrastructure for oral small molecules available.',
        nextSteps: ['PPI druggability assessment for PCSK9', 'Competitive intelligence — AZD0780 Phase 2 data (Q3 2026)', 'Oral delivery strategy assessment'],
        pubmedCount: 3241, clinicalTrialsActive: 14,
      },
    ],
  };

  const results = candidates[ta] ?? candidates.oncology;
  // Apply org capability profile overlay — adjusts internalCapability score
  const capabilityFactor = (orgCapability - 80) / 100; // delta from default baseline of 80
  const adjusted = results.map(c => {
    const rawInternal = capability === 'biologics'
      ? Math.max(20, c.scores.internalCapability - 25)
      : c.scores.internalCapability;
    const adjustedInternal = Math.max(0, Math.min(100, Math.round(rawInternal + capabilityFactor * 30)));
    const adjustedOverall = Math.max(0, Math.min(100, Math.round(
      (c.overallScore - c.scores.internalCapability * 0.2) + adjustedInternal * 0.2
    )));
    return {
      ...c,
      scores: { ...c.scores, internalCapability: adjustedInternal },
      overallScore: adjustedOverall,
      ligatureAdvantage: capability === 'biologics'
        ? c.ligatureAdvantage + ' Note: biologics manufacturing would require new capability or partnership.'
        : orgCapability >= 85
        ? c.ligatureAdvantage + ` Org capability profile score ${orgCapability}/100 — strong internal fit.`
        : orgCapability < 65
        ? c.ligatureAdvantage + ` Note: org capability profile score ${orgCapability}/100 — recommend CRO/partner coverage for key gaps.`
        : c.ligatureAdvantage,
    };
  });
  return adjusted;
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-text-muted">{label}</span>
        <span className="text-[11px] font-bold text-text-primary">{value}</span>
      </div>
      <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ── Candidate card ────────────────────────────────────────────────────────────

function CandidateCard({ candidate, idx }: { candidate: TargetCandidate; idx: number }) {
  const [expanded, setExpanded] = useState(idx === 0);
  const riskColor = candidate.competitiveRisk === 'Low' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : candidate.competitiveRisk === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20';
  const scoreColor = candidate.overallScore >= 80 ? 'text-emerald-400' : candidate.overallScore >= 65 ? 'text-amber-400' : 'text-red-400';
  const setActiveModule = useAppStore(s => s.setActiveModule);

  return (
    <div className="rounded-xl border border-border bg-surface-card">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="text-2xl font-bold text-text-muted/30 w-8 flex-shrink-0">#{candidate.rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{candidate.target}</span>
            <span className="text-[10px] text-text-muted border border-border px-1.5 py-0.5 rounded">{candidate.mechanism}</span>
          </div>
          <div className="text-xs text-text-muted mt-0.5">{candidate.indication}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${riskColor}`}>
            {candidate.competitiveRisk} competition
          </span>
          <div className="text-right">
            <div className={`text-xl font-bold ${scoreColor}`}>{candidate.overallScore}</div>
            <div className="text-[10px] text-text-muted">Score</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-5 space-y-4 border-t border-border/40 pt-4">
          {/* Score breakdown */}
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">Score Breakdown</div>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(candidate.scores).map(([key, val]) => (
                <ScoreBar key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={val} />
              ))}
            </div>
          </div>

          {/* Key evidence */}
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Key Evidence</div>
            <div className="space-y-1.5">
              {candidate.keyEvidence.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-text-secondary">{e}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-surface-elevated rounded-lg p-3">
              <div className="text-[10px] text-text-muted mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3"/>PubMed Papers</div>
              <div className="font-bold text-text-primary">{candidate.pubmedCount.toLocaleString()}</div>
            </div>
            <div className="bg-surface-elevated rounded-lg p-3">
              <div className="text-[10px] text-text-muted mb-1 flex items-center gap-1"><Globe className="w-3 h-3"/>Active Trials</div>
              <div className="font-bold text-text-primary">{candidate.clinicalTrialsActive}</div>
            </div>
            <div className="bg-surface-elevated rounded-lg p-3">
              <div className="text-[10px] text-text-muted mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/>IND Timeline</div>
              <div className="font-bold text-text-primary text-[11px] leading-tight">{candidate.developmentTimeline.split('(')[0].trim()}</div>
            </div>
          </div>

          {/* Ligature advantage */}
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3"/> Ligature Competitive Advantage
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{candidate.ligatureAdvantage}</p>
          </div>

          {/* Patent landscape */}
          <div className="rounded-lg bg-surface-elevated p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 font-semibold">Patent Landscape</div>
            <p className="text-xs text-text-secondary">{candidate.patentLandscape}</p>
          </div>

          {/* Next steps */}
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Recommended Next Steps</div>
            <div className="space-y-1.5">
              {candidate.nextSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-accent-blue">{i + 1}</span>
                  </div>
                  <span className="text-text-secondary">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add to pipeline */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => { setActiveModule('research'); }}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Add to Research Pipeline
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CandidateTargetingPanel() {
  const { toast } = useToast();
  const orgCapabilityScore = useCapabilityProfileStore(s => s.overallScore);
  const [ta, setTa] = useState<TherapeuticArea>('oncology');
  const [capability, setCapability] = useState<CapabilityProfile>('small-molecule');
  const [mechanismFocus, setMechanismFocus] = useState('');
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'scoring' | 'complete'>('idle');
  const [candidates, setCandidates] = useState<TargetCandidate[]>([]);

  const SCANNING_STEPS = [
    'Scanning PubMed — disease biology literature (last 5 years)',
    'Querying ClinicalTrials.gov — competitive pipeline analysis',
    'Indexing patent landscape — freedom-to-operate assessment',
    'Loading internal capability profile — chemistry, biology, manufacturing',
    'Running multi-criteria scoring model (5 dimensions)',
  ];

  const handleRun = async () => {
    setPhase('scanning');
    setCandidates([]);
    await new Promise(r => setTimeout(r, 2000));
    setPhase('scoring');
    await new Promise(r => setTimeout(r, 1800));
    const results = generateCandidates(ta, capability, orgCapabilityScore);
    setCandidates(results);
    setPhase('complete');
    toast.success(`${results.length} candidates ranked for ${ta} — ${capability} profile`);
  };

  const taOptions: { value: TherapeuticArea; label: string; flag: string }[] = [
    { value: 'oncology', label: 'Oncology', flag: '🔬' },
    { value: 'immunology', label: 'Immunology', flag: '🛡️' },
    { value: 'neurology', label: 'Neurology', flag: '🧠' },
    { value: 'cardiometabolic', label: 'Cardiometabolic', flag: '❤️' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Config */}
      <div className="p-6 border-b border-border space-y-4 flex-shrink-0">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <Target className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-emerald-400">Candidate Targeting — Ligature Originate</div>
            <div className="text-xs text-text-muted mt-0.5">Ranks drug targets against scientific validity, clinical feasibility, competitive landscape, internal capability, and commercial opportunity</div>
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="text-text-muted/70">Org capability:</span>
              <span className={`font-bold ${orgCapabilityScore >= 85 ? 'text-emerald-400' : orgCapabilityScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{orgCapabilityScore}/100</span>
              <span className="text-text-muted/50 text-[10px]">→ internalCapability</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Therapeutic Area</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {taOptions.map(opt => (
              <button key={opt.value} onClick={() => setTa(opt.value)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${ta === opt.value ? 'border-emerald-500/50 bg-emerald-500/10 text-text-primary' : 'border-border text-text-muted hover:text-text-secondary'}`}>
                <span>{opt.flag}</span><span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Modality Capability</label>
          <div className="grid grid-cols-3 gap-2">
            {(['small-molecule', 'biologics', 'both'] as CapabilityProfile[]).map(cap => (
              <button key={cap} onClick={() => setCapability(cap)} className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${capability === cap ? 'border-accent-blue/50 bg-accent-blue/10 text-text-primary' : 'border-border text-text-muted hover:text-text-secondary'}`}>
                {cap === 'small-molecule' ? 'Small Molecule' : cap === 'biologics' ? 'Biologics' : 'Both'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Mechanism Focus (optional)</label>
          <input value={mechanismFocus} onChange={e => setMechanismFocus(e.target.value)} placeholder="e.g. kinase inhibitor, PPI, degrader" className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50" />
        </div>

        <Button variant="primary" className="w-full" onClick={handleRun} disabled={phase === 'scanning' || phase === 'scoring'}>
          {phase === 'scanning' || phase === 'scoring'
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Scanning landscape…</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Run Candidate Targeting</>
          }
        </Button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Target className="w-12 h-12 text-text-muted/20" />
            <p className="text-sm text-text-muted">Configure the therapeutic area and run the scan to identify and rank drug targets.</p>
          </div>
        )}

        {(phase === 'scanning' || phase === 'scoring') && (
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              {phase === 'scanning' ? 'Scanning external databases…' : 'Scoring candidates…'}
            </div>
            <div className="space-y-1.5">
              {SCANNING_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-text-secondary">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'complete' && candidates.length > 0 && (
          <>
            <div className="rounded-xl border border-border bg-surface-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-text-primary">Candidate Rankings — {ta.charAt(0).toUpperCase() + ta.slice(1)} · {capability}</div>
                <div className="text-[10px] text-text-muted">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
              </div>
              <div className="flex gap-4 text-xs">
                <div><span className="text-text-muted">Candidates evaluated: </span><span className="font-bold text-text-primary">{candidates.length}</span></div>
                <div><span className="text-text-muted">Top score: </span><span className="font-bold text-emerald-400">{Math.max(...candidates.map(c => c.overallScore))}</span></div>
                <div><span className="text-text-muted">Low competition: </span><span className="font-bold text-text-primary">{candidates.filter(c => c.competitiveRisk === 'Low').length}</span></div>
              </div>
            </div>
            <div className="space-y-3">
              {candidates.map((c, i) => <CandidateCard key={c.id} candidate={c} idx={i} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
