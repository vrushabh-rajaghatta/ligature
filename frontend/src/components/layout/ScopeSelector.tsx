
/**
 * ScopeSelector — v0.125.31
 *
 * A compact pill in the Header that shows the user's current working scope.
 * Clicking opens a three-column panel:
 *   Col 1: Therapeutic Area + Program
 *   Col 2: Development or Marketed branch selector
 *   Col 3: Studies / Applications / Countries (context-dependent)
 *
 * Only renders on modules where scope is meaningful.
 * Replaces the ContextBar strip entirely.
 */


import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, FlaskConical, FileText,
  Layers, Globe, MapPin, X,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { useActiveScopeStore, MODULE_SCOPE_LEVEL } from '@/store/useActiveScopeStore';
import {
  PROGRAMS,
  CLINICAL_STUDIES,
  REGULATORY_APPLICATIONS,
  getApplicationsForProgram,
  getStudiesForProgram,
  getProgramsByTA,
} from '@/data/scopeData';
import { THERAPEUTIC_AREAS } from '@/data/referenceData';
import { getStudyById, getApplicationById } from '@/data/scopeData';
import type { ModuleId } from '@/types/core';

// ─── Modules where ScopeSelector renders ──────────────────────────────────────

const SCOPED_MODULES = new Set(Object.keys(MODULE_SCOPE_LEVEL).filter(
  m => !['home', 'agent-hub', 'rd-connected', 'portfolio', 'analytics', 'portfolio-strategy'].includes(m)
));

// ─── Status badge helper ───────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === 'approved' || s === 'launched'    ? 'bg-green-500' :
    s === 'under review' || s === 'active'  ? 'bg-amber-500' :
    s === 'enrolling'                        ? 'bg-blue-500'  :
    s === 'completed'                        ? 'bg-emerald-500' :
    s === 'planning'                         ? 'bg-gray-400'  :
    'bg-gray-400';
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cls}`} />;
}

// ─── Column 1: TA + Program ────────────────────────────────────────────────────

function Col1({
  taId, programId,
  onTA, onProgram,
}: {
  taId: string | null; programId: string | null;
  onTA: (id: string) => void; onProgram: (id: string) => void;
}) {
  return (
    <div className="flex flex-col min-w-0">
      {/* Therapeutic Areas */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Therapeutic Area
        </p>
        <div className="space-y-0.5">
          {THERAPEUTIC_AREAS.filter(ta =>
            PROGRAMS.some(p => p.therapeuticAreaId === ta.id)
          ).map(ta => (
            <button
              key={ta.id}
              onClick={() => onTA(ta.id)}
              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                taId === ta.id
                  ? 'bg-violet-500/15 text-violet-400 font-medium'
                  : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
              }`}
            >
              <span>{ta.icon}</span>
              <span className="truncate">{ta.name}</span>
              {taId === ta.id && <CheckCircle2 className="w-3 h-3 ml-auto flex-shrink-0 text-violet-400" />}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50 mx-3 my-1" />

      {/* Programs under selected TA */}
      <div className="px-3 pb-3 flex-1 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Program
        </p>
        <div className="space-y-0.5">
          {(taId ? getProgramsByTA(taId) : PROGRAMS).map(prog => (
            <button
              key={prog.id}
              onClick={() => onProgram(prog.id)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                programId === prog.id
                  ? 'bg-violet-500/15 text-violet-400 font-medium'
                  : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{prog.name}</span>
                {prog.hasMarketedStatus && (
                  <span className="text-[9px] px-1 py-0.5 bg-green-500/15 text-green-400 rounded flex-shrink-0">
                    MKT
                  </span>
                )}
                {programId === prog.id && <CheckCircle2 className="w-3 h-3 ml-auto flex-shrink-0 text-violet-400" />}
              </div>
              {prog.brandName && (
                <div className="text-[10px] text-text-muted truncate">{prog.brandName} · {prog.genericName}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Column 2: Portfolio type + branch overview ────────────────────────────────

function Col2({
  programId, portfolioType,
  onPortfolioType,
}: {
  programId: string | null;
  portfolioType: 'development' | 'marketed' | null;
  onPortfolioType: (t: 'development' | 'marketed') => void;
}) {
  if (!programId) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-text-muted px-4">
        Select a program
      </div>
    );
  }

  const devStudies  = getStudiesForProgram(programId, 'development');
  const devApps     = getApplicationsForProgram(programId, 'development');
  const mktApps     = getApplicationsForProgram(programId, 'marketed');

  return (
    <div className="px-3 py-3 flex flex-col gap-2">
      {/* Development branch */}
      <button
        onClick={() => onPortfolioType('development')}
        className={`w-full text-left p-3 rounded-lg border transition-colors ${
          portfolioType === 'development'
            ? 'border-blue-500/40 bg-blue-500/8'
            : 'border-border hover:border-border/80 hover:bg-surface-card'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <FlaskConical className={`w-3.5 h-3.5 ${portfolioType === 'development' ? 'text-blue-400' : 'text-text-muted'}`} />
          <span className={`text-xs font-semibold ${portfolioType === 'development' ? 'text-blue-400' : 'text-text-secondary'}`}>
            Development
          </span>
          {portfolioType === 'development' && <CheckCircle2 className="w-3 h-3 ml-auto text-blue-400" />}
        </div>
        <div className="space-y-0.5 text-[10px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <span>{devStudies.length} stud{devStudies.length !== 1 ? 'ies' : 'y'}</span>
            <span className="text-border">·</span>
            <span>{devApps.length} application{devApps.length !== 1 ? 's' : ''}</span>
          </div>
          {devStudies.slice(0, 2).map(s => (
            <div key={s.id} className="flex items-center gap-1">
              <StatusDot status={s.status} />
              <span className="truncate">{s.protocolNumber} · {s.phase}</span>
            </div>
          ))}
          {devStudies.length > 2 && (
            <div className="text-text-muted">+{devStudies.length - 2} more</div>
          )}
        </div>
      </button>

      {/* Marketed branch */}
      <button
        onClick={() => onPortfolioType('marketed')}
        disabled={mktApps.length === 0}
        className={`w-full text-left p-3 rounded-lg border transition-colors ${
          mktApps.length === 0
            ? 'border-border opacity-40 cursor-not-allowed'
            : portfolioType === 'marketed'
            ? 'border-green-500/40 bg-green-500/8'
            : 'border-border hover:border-border/80 hover:bg-surface-card'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Globe className={`w-3.5 h-3.5 ${portfolioType === 'marketed' ? 'text-green-400' : 'text-text-muted'}`} />
          <span className={`text-xs font-semibold ${portfolioType === 'marketed' ? 'text-green-400' : 'text-text-secondary'}`}>
            Marketed
          </span>
          {portfolioType === 'marketed' && <CheckCircle2 className="w-3 h-3 ml-auto text-green-400" />}
          {mktApps.length === 0 && (
            <span className="text-[9px] text-text-muted ml-auto">No MAs</span>
          )}
        </div>
        {mktApps.length > 0 && (
          <div className="space-y-0.5 text-[10px] text-text-muted">
            {mktApps.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center gap-1">
                <span>{a.regionFlag}</span>
                <span className="truncate">{a.applicationNumber}</span>
                <StatusDot status={a.status} />
              </div>
            ))}
            {mktApps.length > 3 && (
              <div>+{mktApps.length - 3} more</div>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

// ─── Column 3: Studies / Applications / Countries ─────────────────────────────

function Col3({
  programId, portfolioType,
  studyId, devApplicationId, marketingAuthId, countryCode,
  onStudy, onDevApp, onMarketingAuth, onCountry,
}: {
  programId: string | null;
  portfolioType: 'development' | 'marketed' | null;
  studyId: string | null;
  devApplicationId: string | null;
  marketingAuthId: string | null;
  countryCode: string | null;
  onStudy: (id: string) => void;
  onDevApp: (id: string) => void;
  onMarketingAuth: (id: string) => void;
  onCountry: (appId: string, code: string) => void;
}) {
  if (!programId) return (
    <div className="flex items-center justify-center h-full text-xs text-text-muted px-4">
      Select a program
    </div>
  );

  if (portfolioType === 'development') {
    const studies = getStudiesForProgram(programId, 'development');
    const devApps = getApplicationsForProgram(programId, 'development');

    return (
      <div className="py-3 flex flex-col min-h-0">
        {/* Studies */}
        <div className="px-3 mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Studies
          </p>
          <div className="space-y-0.5">
            {studies.map(s => (
              <button
                key={s.id}
                onClick={() => onStudy(s.id)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                  studyId === s.id
                    ? 'bg-blue-500/15 text-blue-400 font-medium'
                    : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <StatusDot status={s.status} />
                  <span className="font-semibold truncate">{s.protocolNumber}</span>
                  {studyId === s.id && <CheckCircle2 className="w-3 h-3 ml-auto flex-shrink-0 text-blue-400" />}
                </div>
                <div className="text-[10px] text-text-muted truncate ml-3">
                  {s.phase} · {s.status}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 mx-3 my-2" />

        {/* Investigational Applications */}
        <div className="px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Investigational Applications
          </p>
          <div className="space-y-0.5">
            {devApps.map(a => (
              <button
                key={a.id}
                onClick={() => onDevApp(a.id)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                  devApplicationId === a.id
                    ? 'bg-blue-500/15 text-blue-400 font-medium'
                    : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm leading-none">{a.regionFlag}</span>
                  <span className="font-semibold truncate">{a.applicationNumber}</span>
                  {devApplicationId === a.id && <CheckCircle2 className="w-3 h-3 ml-auto flex-shrink-0 text-blue-400" />}
                </div>
                <div className="text-[10px] text-text-muted ml-5">
                  {a.type} · Seq {a.currentSequence}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Marketed branch
  const mktApps = getApplicationsForProgram(programId, 'marketed');

  return (
    <div className="py-3 flex flex-col min-h-0 overflow-y-auto">
      {mktApps.map(app => {
        const isSelectedApp = marketingAuthId === app.id;
        return (
          <div key={app.id} className="px-3 mb-2">
            {/* Application header */}
            <button
              onClick={() => onMarketingAuth(app.id)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors mb-1 ${
                isSelectedApp && !countryCode
                  ? 'bg-green-500/15 text-green-400 font-medium'
                  : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">{app.regionFlag}</span>
                <span className="font-semibold truncate">{app.applicationNumber}</span>
                <StatusDot status={app.status} />
                {isSelectedApp && !countryCode && <CheckCircle2 className="w-3 h-3 ml-auto flex-shrink-0 text-green-400" />}
              </div>
              <div className="text-[10px] text-text-muted ml-5">
                {app.type} · {app.status}
              </div>
            </button>

            {/* Country-level market authorisations */}
            {app.marketAuthorisations && app.marketAuthorisations.length > 0 && (
              <div className="ml-4 space-y-0.5 border-l border-border/40 pl-2">
                {app.marketAuthorisations.map(ma => {
                  const isSelected = marketingAuthId === app.id && countryCode === ma.countryCode;
                  return (
                    <button
                      key={ma.id}
                      onClick={() => onCountry(app.id, ma.countryCode)}
                      className={`w-full text-left px-2 py-1 rounded text-[10px] transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-green-500/12 text-green-400 font-medium'
                          : 'text-text-muted hover:bg-surface-card hover:text-text-secondary'
                      }`}
                    >
                      <span className="leading-none">{ma.flag}</span>
                      <span className="truncate">{ma.countryName}</span>
                      <StatusDot status={ma.status} />
                      {isSelected && <CheckCircle2 className="w-2.5 h-2.5 ml-auto flex-shrink-0 text-green-400" />}
                      {ma.status === 'Launched' && (
                        <span className="text-[9px] px-1 py-0.5 bg-green-500/15 text-green-400 rounded ml-auto">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ScopeSelector ─────────────────────────────────────────────────────────────

interface ScopeSelectorProps {
  activeModule: ModuleId | string;
}

export function ScopeSelector({ activeModule }: ScopeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Read raw state fields — never call store actions during render
  const therapeuticAreaId = useActiveScopeStore(s => s.therapeuticAreaId);
  const programId         = useActiveScopeStore(s => s.programId);
  const portfolioType     = useActiveScopeStore(s => s.portfolioType);
  const studyId           = useActiveScopeStore(s => s.studyId);
  const devApplicationId  = useActiveScopeStore(s => s.devApplicationId);
  const marketingAuthId   = useActiveScopeStore(s => s.marketingAuthId);
  const countryCode       = useActiveScopeStore(s => s.countryCode);
  const scopeLevel        = useActiveScopeStore(s => s.scopeLevel);

  // Setters (stable references — fine to destructure)
  const setTherapeuticArea = useActiveScopeStore(s => s.setTherapeuticArea);
  const setPortfolioType   = useActiveScopeStore(s => s.setPortfolioType);
  const selectStudy        = useActiveScopeStore(s => s.selectStudy);
  const setDevApplication  = useActiveScopeStore(s => s.setDevApplication);
  const setMarketingAuth   = useActiveScopeStore(s => s.setMarketingAuth);
  const selectCountry      = useActiveScopeStore(s => s.selectCountry);
  const selectProgram      = useActiveScopeStore(s => s.selectProgram);

  // Derive pill label from raw state — no action calls
  let pillLabel = '—';
  let pillFlag  = '🔬';
  if (scopeLevel === 'study' && studyId) {
    const study = getStudyById(studyId);
    pillLabel = study ? `${study.protocolNumber} · ${study.phase}` : studyId;
    pillFlag  = '🔬';
  } else if ((scopeLevel === 'auth' || scopeLevel === 'dev-app') && (marketingAuthId || devApplicationId)) {
    const app = getApplicationById(marketingAuthId ?? devApplicationId ?? '');
    pillLabel = app ? `${app.applicationNumber} · ${app.type}` : '—';
    pillFlag  = app?.regionFlag ?? '📄';
  } else if (scopeLevel === 'country' && countryCode) {
    pillLabel = countryCode;
    pillFlag  = '📍';
  } else if (programId) {
    pillLabel = programId.toUpperCase();
    pillFlag  = '💊';
  }

  // Close on outside click — must be before conditional return
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Listen for programmatic open requests (e.g. from ScopeContextBanner)
  useEffect(() => {
    const h = () => setOpen(true);
    document.addEventListener('ligature:open-scope', h);
    return () => document.removeEventListener('ligature:open-scope', h);
  }, []);

  // Gate rendering — after all hooks
  const naturalLevel = MODULE_SCOPE_LEVEL[activeModule as ModuleId];
  const PILL_LEVELS   = new Set<string>(['auth', 'dev-app', 'region', 'country']); // study modules use ScopeContextBanner instead
  const PANEL_LEVELS  = new Set<string>(['study', 'auth', 'dev-app', 'region', 'country']);

  // Module not scoped at all — render nothing
  if (!naturalLevel || !PANEL_LEVELS.has(naturalLevel)) return null;

  // For pill label, use the module's natural level (not the stale store scopeLevel)
  // so navigating from Labeling (FR) to Biostats doesn't bleed the region label.
  let modulePillLabel = pillLabel;
  let modulePillFlag  = pillFlag;
  if (naturalLevel === 'study') {
    modulePillLabel = studyId ?? '—';
    modulePillFlag  = '🔬';
  } else if (naturalLevel === 'auth' || naturalLevel === 'dev-app') {
    modulePillLabel = (marketingAuthId ?? devApplicationId) ?? '—';
    modulePillFlag  = '📄';
  } else if (naturalLevel === 'region' || naturalLevel === 'country') {
    modulePillLabel = countryCode ?? '—';
    modulePillFlag  = '📍';
  }

  // Study-level modules: pill is hidden — ScopeContextBanner owns the study context UI.
  // Panel still opens via the `ligature:open-scope` custom event from the banner.
  const showPill = PILL_LEVELS.has(naturalLevel);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      {/* Pill trigger — only for auth / region modules */}
      {showPill && (
        <button
          onClick={() => setOpen(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            open
              ? 'bg-surface-card border-accent-blue/40 text-text-primary'
              : 'bg-surface-card border-border text-text-secondary hover:text-text-primary hover:border-border/80'
          }`}
        >
          <span className="text-sm leading-none">{modulePillFlag}</span>
          <span className="max-w-[160px] truncate hidden sm:inline">{modulePillLabel}</span>
          <ChevronDown className={`w-3 h-3 text-text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Panel — fixed when pill is hidden (banner-triggered), absolute when pill is visible */}
      {open && (
        <div className={`${showPill ? 'absolute top-full right-0 mt-2' : 'fixed top-[104px] left-1/2 -translate-x-1/2'} z-50 bg-surface-elevated border border-border rounded-xl shadow-2xl shadow-black/30 flex overflow-hidden`}
          style={{ width: 'min(680px, 95vw)', maxHeight: '70vh' }}
        >
          {/* Col 1 — TA + Program  ~200px */}
          <div className="w-48 flex-shrink-0 border-r border-border overflow-y-auto bg-surface">
            <Col1
              taId={therapeuticAreaId}
              programId={programId}
              onTA={(id) => { setTherapeuticArea(id); }}
              onProgram={(id) => { selectProgram(id); }}
            />
          </div>

          {/* Col 2 — Development / Marketed  ~200px */}
          <div className="w-52 flex-shrink-0 border-r border-border overflow-y-auto">
            <Col2
              programId={programId}
              portfolioType={portfolioType}
              onPortfolioType={(t) => setPortfolioType(t)}
            />
          </div>

          {/* Col 3 — Studies / Applications / Countries */}
          <div className="flex-1 overflow-y-auto">
            <Col3
              programId={programId}
              portfolioType={portfolioType}
              studyId={studyId}
              devApplicationId={devApplicationId}
              marketingAuthId={marketingAuthId}
              countryCode={countryCode}
              onStudy={(id) => { selectStudy(id); setOpen(false); }}
              onDevApp={(id) => { setDevApplication(id); setOpen(false); }}
              onMarketingAuth={(id) => { setMarketingAuth(id); setOpen(false); }}
              onCountry={(appId, code) => { selectCountry(appId, code); setOpen(false); }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-surface-card text-text-muted hover:text-text-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
