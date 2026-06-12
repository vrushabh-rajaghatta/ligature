
/**
 * HomeScreen — v0.125.9
 * Three zones: My Day → Platform Snapshot → R&D Connected
 * Overdue dates clamped at 30d — no "469d overdue" in demos.
 */

import { useMemo, useCallback } from 'react';
import {
  AlertTriangle, Clock, CheckCircle, Activity, Zap,
  ChevronRight, ArrowRight, Send, Edit3,
  Workflow, Sparkles, MessageSquare, Heart,
} from 'lucide-react';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import { usePersonaStore } from '@/store/usePersonaStore';
import { DEFAULT_PERSONA_ID } from '@/config/personas';
import { useAuthStore } from '@/stores/auth-store';
import { CascadeConfirmationModal } from '@/components/demo/CascadeConfirmationModal';
import { safetySignals, icsrCases } from '@/data/safety-data';
import { useModuleNavigation } from '@/hooks/useModuleNavigation';
import { authoringDocuments, documentTypeNames } from '@/data/authoring-data';

interface HomeScreenProps {
  onNavigate: (module: string) => void;
}

const TRIGGER_LABELS: Record<string, string> = {
  'safety-signal-confirmed': 'Safety Signal Confirmed',
  'db-lock-completed':       'Clinical Database Locked',
  'protocol-approved':       'Protocol Approved',
  'haq-received':            'HAQ Received',
  'haq-response-submitted':  'HAQ Response Submitted',
};

const STEP_COLOR: Record<string, string> = {
  safety:      'bg-red-500/15 text-red-300 border-red-500/20',
  ctms:        'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  haq:         'bg-amber-500/15 text-amber-300 border-amber-500/20',
  submissions: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  authoring:   'bg-purple-500/15 text-purple-300 border-purple-500/20',
  qms:         'bg-sky-500/15 text-sky-300 border-sky-500/20',
  tmf:         'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
};

const MOD_LABEL: Record<string, string> = {
  safety: 'Safety & PV', ctms: 'Clinical Trials', haq: 'HAQ',
  submissions: 'Submissions', authoring: 'Authoring', qms: 'QMS',
  tmf: 'Trial Master File',
};

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const chains        = useCascadeEngine(s => s.chains);
  const confirmChain  = useCascadeEngine(s => s.confirmChain);
  const dismissChain  = useCascadeEngine(s => s.dismissChain);
  const persona       = usePersonaStore(s => s.getActivePersona());
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const isNonDefaultPersona = activePersonaId !== DEFAULT_PERSONA_ID;
  const authUser      = useAuthStore(s => s.user);
  const { navigateTo } = useModuleNavigation();

  // v0.125.71: Normalise legacy demo names persisted in localStorage → always show correct owner name
  const LEGACY_DEMO_NAMES = new Set(['Marcus Johnson', 'Sarah Chen', 'David', 'demo-sarah']);
  const rawDisplayName = authUser?.name ? authUser.name.split(' ')[0] : persona.firstName;
  const displayName = LEGACY_DEMO_NAMES.has(authUser?.name ?? '') ? 'Sean' : rawDisplayName;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const activeChains = useMemo(() =>
    chains.filter(c => c.status !== 'dismissed' && c.status !== 'complete' &&
      c.steps.some(s => s.status === 'pending' || s.status === 'spawned')), [chains]);

  const previewChains = useMemo(() => chains.filter(c => c.status === 'preview'), [chains]);

  // Zone 1: My Day — overdue clamped at 30d
  type UrgencyType = 'overdue' | 'critical' | 'due-soon';
  const myDayItems = useMemo(() => {
    const items: Array<{
      id: string; module: string; urgency: UrgencyType;
      headline: string; detail: string; action: string; icon: React.ReactNode;
    }> = [];

    authoringDocuments
      .filter(d => {
        const days = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
        return days < 0 && !['approved', 'submission-ready', 'superseded'].includes(d.status);
      })
      .slice(0, 2)
      .forEach(d => {
        const raw = Math.abs(Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000));
        const display = Math.min(raw, 30);
        items.push({
          id: d.id, module: 'authoring', urgency: 'overdue',
          headline: d.shortTitle || d.title,
          detail: `${documentTypeNames[d.type] ?? d.type} · ${display === 30 ? '30+' : display}d overdue`,
          action: 'Open Editor', icon: <Edit3 className="w-5 h-5" />,
        });
      });

    safetySignals
      .filter(s => s.priority === 'critical' && s.status === 'confirmed').slice(0, 1)
      .forEach(s => items.push({
        id: s.id, module: 'safety', urgency: 'critical',
        headline: s.signal,
        detail: 'Critical signal · confirmed · requires medical assessment',
        action: 'View Signal', icon: <AlertTriangle className="w-5 h-5" />,
      }));

    icsrCases
      .filter(c => {
        const d = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / 86400000);
        return d >= 0 && d <= 5 && c.status !== 'submitted';
      }).slice(0, 1)
      .forEach(c => {
        const d = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / 86400000);
        items.push({
          id: c.id, module: 'safety', urgency: 'due-soon',
          headline: `Case ${c.caseNumber}`,
          detail: `${c.event} · due in ${d}d`,
          action: 'Review Case', icon: <Heart className="w-5 h-5" />,
        });
      });

    const order: Record<UrgencyType, number> = { overdue: 0, critical: 0, 'due-soon': 1 };
    return items.sort((a, b) => order[a.urgency] - order[b.urgency]).slice(0, 3);
  }, []);

  const handleItemClick = useCallback((item: typeof myDayItems[0]) => {
    if (item.module === 'authoring') {
      navigateTo({ module: 'authoring', viewMode: 'document-detail', selection: { documentId: item.id } });
    } else if (item.action === 'View Signal') {
      navigateTo({ module: 'safety', viewMode: 'signals', selection: { signalId: item.id } });
    } else if (item.module === 'safety') {
      navigateTo({ module: 'safety', viewMode: 'icsr', selection: { signalId: item.id } });
    } else {
      onNavigate(item.module);
    }
  }, [navigateTo, onNavigate]);

  const urgencyStyle = {
    overdue:    { bar: 'bg-red-500',   pill: 'bg-red-500/15 text-red-400 border border-red-500/25',     iconBg: 'bg-red-500/10',   iconColor: 'text-red-400',   label: 'OVERDUE' },
    critical:   { bar: 'bg-red-500',   pill: 'bg-red-500/15 text-red-400 border border-red-500/25',     iconBg: 'bg-red-500/10',   iconColor: 'text-red-400',   label: 'CRITICAL' },
    'due-soon': { bar: 'bg-amber-500', pill: 'bg-amber-500/15 text-amber-400 border border-amber-500/25', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', label: 'DUE SOON' },
  };

  // Zone 2: Snapshot tiles
  const overdueAuthoring = useMemo(() => authoringDocuments.filter(d => {
    const days = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
    return days < 0 && !['approved', 'submission-ready', 'superseded'].includes(d.status);
  }).length, []);

  const critSignals = safetySignals.filter(s => s.priority === 'critical' && s.status !== 'closed').length;

  const snapshotTiles = [
    { module: 'haq', label: 'HAQ Intelligence', desc: 'Health authority questions & AI-assisted responses',
      icon: <MessageSquare className="w-5 h-5" />, value: 8, sub: '2 overdue', urgent: true, color: 'amber' },
    { module: 'safety', label: 'Safety & PV', desc: 'Signal detection and ICSR case management',
      icon: <AlertTriangle className="w-5 h-5" />, value: critSignals, sub: 'critical signals', urgent: critSignals > 0, color: 'red' },
    { module: 'submissions-hub', label: 'Submissions', desc: 'Regulatory submissions across FDA, EMA, PMDA',
      icon: <Send className="w-5 h-5" />, value: 4, sub: '2 in progress', urgent: false, color: 'blue' },
    { module: 'authoring', label: 'Authoring', desc: 'AI-assisted regulatory document authoring',
      icon: <Edit3 className="w-5 h-5" />, value: overdueAuthoring, sub: 'docs need attention', urgent: overdueAuthoring > 0, color: 'purple' },
  ] as const;

  const tc = {
    amber:  { icon: 'text-amber-400',  bg: 'bg-amber-500/8',  border: 'border-amber-500/25',  val: 'text-amber-400' },
    red:    { icon: 'text-red-400',    bg: 'bg-red-500/8',    border: 'border-red-500/25',    val: 'text-red-400' },
    blue:   { icon: 'text-blue-400',   bg: 'bg-blue-500/8',   border: 'border-blue-500/25',   val: 'text-blue-400' },
    purple: { icon: 'text-purple-400', bg: 'bg-purple-500/8', border: 'border-purple-500/25', val: 'text-purple-400' },
  };

  return (
    <div className="flex-1 overflow-auto bg-surface">

      {/* Persona banner */}
      {isNonDefaultPersona && (
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2 text-sm border-b bg-surface/95 backdrop-blur-sm"
          style={{ borderColor: `${persona.avatarColor}40` }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ backgroundColor: persona.avatarColor }}>{persona.avatarInitials}</div>
          <span className="text-text-secondary font-medium truncate">
            Viewing as <span className="text-text-primary font-semibold">{persona.firstName} {persona.lastName}</span>
            <span className="text-text-muted font-normal"> · {persona.title}</span>
          </span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">

        {/* Greeting */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-text-primary">{greeting}, {displayName}.</h1>
            <p className="text-sm text-text-muted mt-1">{persona.title} · {persona.department}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 px-2.5 py-1.5 rounded-full border border-emerald-500/20 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            R&D Connected
          </div>
        </div>

        {/* ── Zone 1: Needs attention ───────────────────────────── */}
        {myDayItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-text-muted" />
              <h2 className="text-sm font-semibold text-text-primary">Needs your attention</h2>
              <span className="text-xs text-text-muted">— {myDayItems.length} item{myDayItems.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2.5">
              {myDayItems.map(item => {
                const u = urgencyStyle[item.urgency];
                return (
                  <button key={item.id} onClick={() => handleItemClick(item)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-surface-elevated hover:border-accent-blue/30 hover:shadow-md transition-all text-left group">
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${u.bar}`} />
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${u.iconBg} ${u.iconColor}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${u.pill}`}>{u.label}</span>
                        <span className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{MOD_LABEL[item.module] ?? item.module}</span>
                      </div>
                      <p className="text-sm font-semibold text-text-primary truncate">{item.headline}</p>
                      <p className="text-xs text-text-muted mt-0.5">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-accent-blue group-hover:gap-2 transition-all flex-shrink-0">
                      {item.action} <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Zone 2: Platform snapshot ─────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">Platform snapshot</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {snapshotTiles.map(tile => {
              const c = tc[tile.color];
              return (
                <button key={tile.module} onClick={() => onNavigate(tile.module)}
                  className={`flex flex-col gap-3 p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg
                    ${tile.urgent ? `${c?.bg ?? ''} ${c?.border ?? ''}` : 'bg-surface-card border-border hover:border-border/60'}`}>
                  <div className={tile.urgent ? c.icon : 'text-text-muted'}>{tile.icon}</div>
                  <div>
                    <div className={`text-2xl font-bold tabular-nums ${tile.urgent ? c.val : 'text-text-primary'}`}>{tile.value}</div>
                    <div className="text-xs font-semibold text-text-primary mt-1">{tile.label}</div>
                    <div className={`text-xs mt-0.5 ${tile.urgent ? c.icon : 'text-text-muted'}`}>{tile.sub}</div>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">{tile.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Zone 3: R&D Connected ─────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Workflow className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-text-primary">R&D Connected</h2>
            <span className="text-xs text-text-muted">— active cross-module chains</span>
            {activeChains.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-semibold">{activeChains.length} active</span>
            )}
          </div>

          {activeChains.length === 0 ? (
            <div className="flex items-center gap-4 p-5 rounded-xl border border-dashed border-border bg-surface-card">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Workflow className="w-5 h-5 text-violet-400/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">No active cascade chains</p>
                <p className="text-xs text-text-muted mt-0.5">
                  When a safety signal is confirmed or a database locked, Ligature automatically coordinates the downstream workflow across Safety, HAQ, Authoring, and Submissions — eliminating manual handoffs.
                </p>
              </div>
              <button onClick={() => onNavigate('safety')}
                className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-all">
                Try it <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeChains.map(chain => {
                const mins = Math.floor((Date.now() - new Date(chain.trigger.triggeredAt).getTime()) / 60000);
                const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
                const done = chain.steps.filter(s => s.status === 'completed');
                const pct = Math.round((done.length / chain.steps.length) * 100);
                return (
                  <div key={chain.id} className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-500/15">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-violet-400 uppercase tracking-wide">{TRIGGER_LABELS[chain.trigger.type] ?? chain.trigger.type}</span>
                          <span className="text-xs text-text-muted">· {ago}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 rounded-full bg-violet-500/15 max-w-32">
                            <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-text-muted">{done.length}/{chain.steps.length} steps</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center overflow-x-auto px-4 py-3 scrollbar-hide gap-0">
                      {chain.steps.map((step, i) => (
                        <div key={step.id} className="flex items-center flex-shrink-0">
                          <button onClick={() => onNavigate(step.targetModule)}
                            className={`flex flex-col items-start gap-1 px-3 py-2 rounded-lg border text-left transition-all hover:-translate-y-px hover:shadow-md
                              ${step.status === 'completed' ? 'opacity-50' : step.status === 'skipped' ? 'opacity-30' : ''}
                              ${STEP_COLOR[step.targetModule] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                            <div className="flex items-center gap-1.5">
                              {step.status === 'completed'
                                ? <CheckCircle className="w-3 h-3 opacity-60" />
                                : <span className="w-2 h-2 rounded-full bg-current opacity-70 animate-pulse" />}
                              <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{MOD_LABEL[step.targetModule] ?? step.targetModule}</span>
                            </div>
                            <span className="text-xs font-medium leading-tight max-w-32 line-clamp-2">{step.title}</span>
                          </button>
                          {i < chain.steps.length - 1 && <ChevronRight className="w-4 h-4 text-text-muted/30 flex-shrink-0 mx-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-text-muted px-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-violet-400/60" />
                Each step is a live task — click to navigate directly to that module.
              </p>
            </div>
          )}
        </section>

      </div>

      {previewChains.length > 0 && (
        <CascadeConfirmationModal
          chain={previewChains[0]}
          onConfirm={() => confirmChain(previewChains[0].id)}
          onDismiss={() => dismissChain(previewChains[0].id)}
        />
      )}
    </div>
  );
}
