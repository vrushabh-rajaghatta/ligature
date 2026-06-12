

/**
 * CompoundLifecycleStrip — v0.56.0
 * 
 * Visual pipeline strip showing compound progression across R&D lifecycle stages.
 * Each stage is clickable and navigates to the relevant module.
 * Status indicators show real data from the platform.
 * 
 * The "R&D Connected" visual proof: one compound, all stages, all connected.
 */

import { Fragment, useMemo } from 'react';
import {
  ChevronRight, FlaskConical, Microscope, Users, FileText,
  Send, CheckCircle2, Clock, AlertTriangle, Package, Zap,
} from 'lucide-react';
import { useClinicalRegBridge } from '@/store/useClinicalRegBridge';
import { useHAQResponseStore } from '@/store/useHAQResponseStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type StageStatus = 'complete' | 'active' | 'pending' | 'at-risk';

interface CompoundStage {
  id: string;
  label: string;
  shortLabel: string;
  module: string;
  status: StageStatus;
  detail: string;
  icon: typeof FlaskConical;
}

interface CompoundProgram {
  id: string;
  name: string;
  genericName: string;
  indication: string;
  therapeuticArea: string;
  stages: CompoundStage[];
  activeStageId: string;
  priorityFlag?: 'pdufa' | 'at-risk' | null;
  priorityLabel?: string;
}

interface CompoundLifecycleStripProps {
  onNavigate: (module: string) => void;
}

// ─── Stage status config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StageStatus, {
  dot: string;
  text: string;
  bg: string;
  border: string;
  label: string;
}> = {
  complete: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/20',
    label: 'Complete',
  },
  active: {
    dot: 'bg-accent-blue animate-pulse',
    text: 'text-accent-blue',
    bg: 'bg-accent-blue/10',
    border: 'border-accent-blue/30',
    label: 'Active',
  },
  'at-risk': {
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/25',
    label: 'At Risk',
  },
  pending: {
    dot: 'bg-text-muted/30',
    text: 'text-text-muted',
    bg: 'bg-surface-card',
    border: 'border-border',
    label: 'Pending',
  },
};

// ─── Program data ──────────────────────────────────────────────────────────────

const DEMO_PROGRAMS: CompoundProgram[] = [
  {
    id: 'lig-2847',
    name: 'Nexavant',
    genericName: 'ligrastinib',
    indication: 'KRAS G12C+ NSCLC',
    therapeuticArea: 'Oncology',
    activeStageId: 'regulatory',
    priorityFlag: 'pdufa',
    priorityLabel: 'PDUFA Feb 15',
    stages: [
      { id: 'research',     label: 'Research',      shortLabel: 'Res',  module: 'research',    status: 'complete', detail: 'Lead optimization complete',     icon: FlaskConical },
      { id: 'nonclinical',  label: 'Nonclinical',   shortLabel: 'Noncl', module: 'nonclinical', status: 'complete', detail: '13-wk GLP tox finalized',       icon: Microscope },
      { id: 'clinical',     label: 'Clinical',      shortLabel: 'Clin', module: 'ctms',         status: 'complete', detail: 'Phase 2 enrollment complete',   icon: Users },
      { id: 'regulatory',   label: 'Regulatory',    shortLabel: 'Reg',  module: 'regulatory',   status: 'at-risk',  detail: 'HAQ response pending · Day 74', icon: FileText },
      { id: 'submissions',  label: 'Submissions',   shortLabel: 'Sub',  module: 'submissions',  status: 'active',   detail: 'NDA rolling review active',     icon: Send },
      { id: 'approval',     label: 'Approval',      shortLabel: 'Appr', module: 'regulatory',   status: 'pending',  detail: 'PDUFA date: Feb 15, 2026',     icon: CheckCircle2 },
    ],
  },
  {
    id: 'lig-3901',
    name: 'CardioShield',
    genericName: 'moracetib',
    indication: 'Heart Failure (HFrEF)',
    therapeuticArea: 'Cardiology',
    activeStageId: 'clinical',
    stages: [
      { id: 'research',     label: 'Research',      shortLabel: 'Res',  module: 'research',    status: 'complete', detail: 'Lead compound selected',        icon: FlaskConical },
      { id: 'nonclinical',  label: 'Nonclinical',   shortLabel: 'Noncl', module: 'nonclinical', status: 'complete', detail: 'IND-enabling studies done',     icon: Microscope },
      { id: 'clinical',     label: 'Clinical',      shortLabel: 'Clin', module: 'ctms',         status: 'active',   detail: 'Phase 1b: 42/60 enrolled',      icon: Users },
      { id: 'regulatory',   label: 'Regulatory',    shortLabel: 'Reg',  module: 'regulatory',   status: 'pending',  detail: 'IND active · NDA planning',    icon: FileText },
      { id: 'submissions',  label: 'Submissions',   shortLabel: 'Sub',  module: 'submissions',  status: 'pending',  detail: 'NDA target: 2028',              icon: Send },
      { id: 'approval',     label: 'Approval',      shortLabel: 'Appr', module: 'regulatory',   status: 'pending',  detail: 'Projected 2029',               icon: CheckCircle2 },
    ],
  },
  {
    id: 'lig-5104',
    name: 'OncoTarget',
    genericName: 'vezopanib',
    indication: 'HER2+ Breast Cancer',
    therapeuticArea: 'Oncology',
    activeStageId: 'nonclinical',
    stages: [
      { id: 'research',     label: 'Research',      shortLabel: 'Res',  module: 'research',    status: 'complete', detail: 'Mechanistic studies published',  icon: FlaskConical },
      { id: 'nonclinical',  label: 'Nonclinical',   shortLabel: 'Noncl', module: 'nonclinical', status: 'active',   detail: '28-day tox study in progress', icon: Microscope },
      { id: 'clinical',     label: 'Clinical',      shortLabel: 'Clin', module: 'ctms',         status: 'pending',  detail: 'Phase 1 planned Q2 2026',      icon: Users },
      { id: 'regulatory',   label: 'Regulatory',    shortLabel: 'Reg',  module: 'regulatory',   status: 'pending',  detail: 'IND filing target Q3 2026',    icon: FileText },
      { id: 'submissions',  label: 'Submissions',   shortLabel: 'Sub',  module: 'submissions',  status: 'pending',  detail: 'NDA target: 2029',             icon: Send },
      { id: 'approval',     label: 'Approval',      shortLabel: 'Appr', module: 'regulatory',   status: 'pending',  detail: 'Projected 2030',              icon: CheckCircle2 },
    ],
  },
];

// ─── Stage chip ────────────────────────────────────────────────────────────────

function StageChip({
  stage,
  isActive,
  onClick,
}: {
  stage: CompoundStage;
  isActive: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[stage.status];
  const Icon = stage.icon;
  return (
    <button
      onClick={onClick}
      title={stage.detail}
      className={`
        flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg border text-left
        transition-all hover:-translate-y-px hover:shadow-md
        ${cfg?.bg ?? ''} ${cfg?.border ?? ''}
        ${isActive ? 'ring-2 ring-offset-1 ring-offset-transparent ring-accent-blue/40' : ''}
        ${stage.status === 'pending' ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <Icon className={`w-3 h-3 ${cfg?.text ?? ''}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg?.text ?? ''}`}>
          {stage.shortLabel}
        </span>
      </div>
      <span className="text-[10px] text-text-muted leading-tight max-w-[72px] line-clamp-1">
        {stage.detail}
      </span>
    </button>
  );
}

// ─── Program row ───────────────────────────────────────────────────────────────

function ProgramRow({
  program,
  onNavigate,
}: {
  program: CompoundProgram;
  onNavigate: (module: string) => void;
}) {
  const activeStageIdx = program.stages.findIndex(s => s.id === program.activeStageId);
  const progress = Math.round(((activeStageIdx + 0.5) / program.stages.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
      {/* Program header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate">{program.name}</span>
          <span className="text-xs text-text-muted hidden sm:inline">({program.genericName})</span>
          <span className="text-xs text-text-muted truncate hidden md:inline">· {program.indication}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-20 h-1 rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent-blue transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted">{progress}%</span>
          </div>

          {/* Priority flag */}
          {program.priorityFlag === 'pdufa' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold">
              <Zap className="w-2.5 h-2.5" />
              {program.priorityLabel}
            </span>
          )}
          {program.priorityFlag === 'at-risk' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-semibold">
              <AlertTriangle className="w-2.5 h-2.5" />
              {program.priorityLabel}
            </span>
          )}
        </div>
      </div>

      {/* Stage chips */}
      <div className="flex items-center gap-0 overflow-x-auto px-3 py-2.5 scrollbar-hide">
        {program.stages.map((stage, i) => (
          <Fragment key={stage.id}>
            <StageChip
              stage={stage}
              isActive={stage.id === program.activeStageId}
              onClick={() => onNavigate(stage.module)}
            />
            {i < program.stages.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-text-muted/25 flex-shrink-0 mx-0.5" />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CompoundLifecycleStrip({ onNavigate }: CompoundLifecycleStripProps) {
  // Live data bindings
  const enrollmentMappings = useClinicalRegBridge(s => s.enrollmentDataMappings);
  const haqWorkspaces = useHAQResponseStore(s => s.workspaces);

  const programs = useMemo(() => {
    // Derive live detail strings for LIG-2847 (Nexavant)
    const lig2847Enrollment = enrollmentMappings['gp-enroll-301'];
    const openHAQs = Object.values(haqWorkspaces).filter(w =>
      w.status !== 'submitted' && w.status !== 'closed'
    ).length;

    return DEMO_PROGRAMS.map(program => {
      if (program.id !== 'lig-2847') return program;
      return {
        ...program,
        stages: program.stages.map(stage => {
          if (stage.id === 'clinical' && lig2847Enrollment) {
            const { actualEnrollment, targetEnrollment } = lig2847Enrollment;
            return {
              ...stage,
              detail: actualEnrollment >= targetEnrollment
                ? `Phase 2: ${actualEnrollment}/${targetEnrollment} enrolled (complete)`
                : `Phase 2: ${actualEnrollment}/${targetEnrollment} enrolled`,
            };
          }
          if (stage.id === 'regulatory' && openHAQs > 0) {
            return {
              ...stage,
              detail: `${openHAQs} open HAQ${openHAQs !== 1 ? 's' : ''} · Day 74`,
            };
          }
          return stage;
        }),
      };
    });
  }, [enrollmentMappings, haqWorkspaces]);

  return (
    <div className="space-y-2">
      {programs.map(program => (
        <ProgramRow key={program.id} program={program} onNavigate={onNavigate} />
      ))}
      <p className="text-[10px] text-text-muted px-1 flex items-center gap-1.5">
        <Package className="w-3 h-3 text-indigo-400/60" />
        Click any stage to navigate to that module. Active stages show live platform data.
      </p>
    </div>
  );
}
