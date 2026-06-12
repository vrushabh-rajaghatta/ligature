

import { 
  LayoutDashboard, 
  FlaskConical, 
  Stethoscope, 
  ShieldCheck,
  Shield, 
  Award,
  FileText,
  Tag,
  Send,
  HelpCircle,
  RefreshCw,
  Truck,
  BookOpen,
  Settings,
  FolderOpen,
  Database,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Calendar,
  Rocket,
  Factory,
  Microscope,
  Inbox,
  Beaker,
  ClipboardList,
  Brain,
  Sparkles,
  BarChart3,
  AlertTriangle,
  FlaskRound,
  Package,
  Search,
  Users,
  Briefcase,
  Thermometer,
  Megaphone,
  Zap,
  FileCode,
  Lock,
  Eye,
  Bell,
  Globe,
  Library,
  Bot,
  Workflow,
  ArrowLeft,
  Star,
  X,
  Handshake,
  FolderLock,
  ScanSearch,
} from 'lucide-react';
import { ModuleId } from '@/types/core';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useIsMobile, useIsTablet } from '@/hooks/useResponsive';
import { APP_VERSION_DISPLAY } from '@/config/version';
// v0.44.2: Role filtering removed — all modules visible
// v0.45.1: Feature flag gating — locked modules show lock icon

import { useTaskCounts } from '@/store/useTaskAggregationStore';
import { useCascadeCount } from '@/store/useCascadeEngine';
import { useFavoritesStore, useRecentFavorites } from '@/store/useFavoritesStore'; // v0.125.73
import { useFeatureFlags } from '@/store/useFeatureFlags';
import { BUNDLE_TIERS, getModuleTier, getAccessLevelLabel } from '@/config/module-registry';
import { TierSwitcher } from './TierSwitcher';
import { usePersonaStore } from '@/store/usePersonaStore';
import { useAppStore } from '@/store/useAppStore';
import { useNavigationStackStore } from '@/store/useNavigationStackStore';

// Persona → primary nav section mapping
// Default to 'regulatory' when no match
const PERSONA_SECTION_MAP: Record<string, string[]> = {
  'vp-regulatory':   ['regulatory'],
  'clinical-ops':    ['clinical-development'],
  'safety-pv':       ['pv-safety'],
  'quality':         ['quality'],
  'cmo-csuite':      ['regulatory', 'clinical-development'],
  'cmc':             ['cmc'],
};

interface SidebarProps {
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId, skipHistory?: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileDrawer?: boolean;
  onClose?: () => void;
}

interface NavSection {
  id: string;
  label: string;
  color: string;
  items: NavItem[];
  defaultExpanded?: boolean;
}

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
  count?: number;
  color?: string;
  badge?: string;
  highlight?: boolean;
  /** When present, renders a subtle inline group label before this item */
  groupLabel?: string;
}

// v0.110.0: Reorganized navigation structure
// - Regulatory section split into 5 sub-groups for scannability
// - CMC, Commercial, Intel, PV/Safety, Quality collapsed by default (specialist modules)
// - Research, Clinical Development, Regulatory expanded by default (core R&D workflow)
const navSections: NavSection[] = [
  {
    id: 'research',
    label: 'Research',
    color: 'bg-indigo-500',
    defaultExpanded: true,
    items: [
      { id: 'research', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'research-lead-opt', label: 'Lead Opt', icon: <FlaskRound className="w-4 h-4" /> },
      { id: 'research-translational', label: 'Translational', icon: <Activity className="w-4 h-4" /> },
      { id: 'research-targets', label: 'Targets', icon: <Microscope className="w-4 h-4" /> },
      { id: 'research-preclinical', label: 'Preclinical', icon: <FlaskConical className="w-4 h-4" /> },
      { id: 'research-ind', label: 'IND Readiness', icon: <Rocket className="w-4 h-4" /> },
      { id: 'research-literature', label: 'Literature', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'research-intelligence', label: 'Intelligence', icon: <Brain className="w-4 h-4" /> },
      { id: 'eln', label: 'ELN', icon: <Beaker className="w-4 h-4" />, badge: 'NEW' },
    ],
  },
  {
    id: 'clinical-development',
    label: 'Clinical Development',
    color: 'bg-purple-500',
    defaultExpanded: true,
    items: [
      { id: 'ctms', label: 'Clinical Development', icon: <Stethoscope className="w-4 h-4" /> },
      { id: 'study-design', label: 'Study Design', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'biostats', label: 'Biostatistics', icon: <BarChart3 className="w-4 h-4" />, badge: 'NEW' },
      { id: 'tmf', label: 'Trial Master File', icon: <FolderOpen className="w-4 h-4" /> },
    ],
  },
  {
    id: 'cmc',
    label: 'CMC',
    color: 'bg-amber-500',
    defaultExpanded: false,
    items: [
      { id: 'cmc', label: 'Chemistry & Mfg', icon: <FlaskRound className="w-4 h-4" /> },
      { id: 'stability', label: 'Stability', icon: <Thermometer className="w-4 h-4" /> },
      { id: 'batch-records', label: 'Batch Records', icon: <Package className="w-4 h-4" /> },
    ],
  },
  {
    id: 'regulatory',
    label: 'Regulatory',
    color: 'bg-emerald-500',
    defaultExpanded: true,
    // v0.110.0: 16 items grouped into 5 sub-groups via groupLabel for scannability
    items: [
      // ── Authoring & Docs ──
      { id: 'authoring', label: 'Authoring', icon: <FileText className="w-4 h-4" />, groupLabel: 'Authoring & Docs' },
      { id: 'document-control', label: 'Document Control', icon: <FileCheck className="w-4 h-4" /> },
      // ── Submissions ──
      { id: 'submission-command', label: 'Active Submissions', icon: <Rocket className="w-4 h-4" />, count: 4, highlight: true, groupLabel: 'Submissions' },
      { id: 'submissions-hub', label: 'Submissions Hub', icon: <Send className="w-4 h-4" />, count: 3 },
      { id: 'submission-planning', label: 'Submission Planning', icon: <Globe className="w-4 h-4" /> },
      { id: 'publishing', label: 'Publishing & Viewer', icon: <FolderOpen className="w-4 h-4" /> },
      { id: 'continuous-submission', label: 'Continuous Sub', icon: <Send className="w-4 h-4" /> },
      // ── Intelligence ──
      { id: 'haq', label: 'HAQ Management', icon: <HelpCircle className="w-4 h-4" />, count: 4, groupLabel: 'Intelligence' },
      { id: 'ectd-intelligence', label: 'eCTD Intelligence', icon: <Database className="w-4 h-4" /> },
      { id: 'reg-intel', label: 'Reg Intelligence', icon: <Bell className="w-4 h-4" />, count: 3 },
      // ── Labeling ──
      { id: 'labeling', label: 'Labeling', icon: <Tag className="w-4 h-4" />, groupLabel: 'Labeling' },
      { id: 'spl', label: 'SPL', icon: <FileCode className="w-4 h-4" /> },
      // ── Strategy ──
      { id: 'strategy', label: 'Strategy & Planning', icon: <RefreshCw className="w-4 h-4" />, groupLabel: 'Strategy' },
      { id: 'template-registry', label: 'Template Registry', icon: <Library className="w-4 h-4" /> },
      { id: 'reg-calendar', label: 'Reg Calendar', icon: <Calendar className="w-4 h-4" /> },
      { id: 'master-data', label: 'Master Data & IDMP', icon: <Database className="w-4 h-4" /> },
    ],
  },
  {
    id: 'pv-safety',
    label: 'PV/Safety',
    color: 'bg-red-500',
    defaultExpanded: false,
    items: [
      { id: 'safety', label: 'Pharmacovigilance', icon: <ShieldCheck className="w-4 h-4" /> },
      { id: 'signal-detection', label: 'Signal Detection', icon: <AlertTriangle className="w-4 h-4" /> },
      { id: 'psmf', label: 'PSMF', icon: <Shield className="w-4 h-4" /> },
    ],
  },
  {
    id: 'quality',
    label: 'Quality',
    color: 'bg-blue-500',
    defaultExpanded: false,
    items: [
      { id: 'qms', label: 'QMS', icon: <Award className="w-4 h-4" /> },
      { id: 'glp', label: 'GLP Compliance', icon: <Shield className="w-4 h-4" /> },
      { id: 'gcp', label: 'GCP Compliance', icon: <Shield className="w-4 h-4" /> },
      { id: 'gmp', label: 'GMP Compliance', icon: <Shield className="w-4 h-4" /> },
      { id: 'inspector-readiness', label: 'Inspector Readiness', icon: <Search className="w-4 h-4" /> },
      { id: 'archives', label: 'R&D Archives', icon: <Database className="w-4 h-4" /> },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    color: 'bg-orange-500',
    defaultExpanded: false,
    items: [
      { id: 'commercial', label: 'Launch & Market Access', icon: <Rocket className="w-4 h-4" /> },
      { id: 'adpromo', label: 'Ad/Promo Review', icon: <Megaphone className="w-4 h-4" /> },
      { id: 'supply-chain', label: 'Supply Chain', icon: <Truck className="w-4 h-4" /> },
      { id: 'medical-affairs', label: 'Medical Affairs', icon: <Briefcase className="w-4 h-4" /> },
    ],
  },
  {
    id: 'bd',
    label: 'BD / Transact',           // v0.125.81: Ligature Transact
    color: 'bg-violet-500',
    defaultExpanded: false,
    items: [
      { id: 'bd',               label: 'BD Overview',   icon: <Handshake className="w-4 h-4" />, badge: 'NEW' },
      { id: 'bd-due-diligence', label: 'Due Diligence', icon: <ScanSearch className="w-4 h-4" /> },
      { id: 'bd-data-room',     label: 'Data Room',     icon: <FolderLock className="w-4 h-4" /> },
    ],
  },
  {
    id: 'intel',
    label: 'Ligature Analytics',  // v0.125.77: renamed from 'Intel'
    color: 'bg-cyan-500',
    defaultExpanded: false,
    items: [
      { id: 'ai-authoring', label: 'AI Authoring', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'ai-consistency', label: 'Consistency Engine', icon: <Brain className="w-4 h-4" /> },
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
];

export function Sidebar({ activeModule, onModuleChange, isCollapsed = false, onToggleCollapse, mobileDrawer = false, onClose }: SidebarProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Back navigation
  const popModuleHistory = useAppStore(s => s.popModuleHistory);
  const moduleHistory = useAppStore(s => s.moduleHistory ?? []);
  const canGoBack = moduleHistory.length > 0;
  
  // Task counts for action center badge
  const taskCounts = useTaskCounts();
  // v0.44.46: Cascade count — pending chains needing attention
  const cascadeCount = useCascadeCount();

  // v0.125.73: Favorites
  const openFavoritesPanel = useFavoritesStore((s) => s.openPanel);
  const recentFavorites = useRecentFavorites(5);
  
  // v0.45.1: Feature flag gating
  const isModuleEnabled = useFeatureFlags(s => s.isModuleEnabled);
  // v0.47.0: Capability-level access
  const isViewOnly = useFeatureFlags(s => s.isViewOnly);
  const isRestricted = useFeatureFlags(s => s.isRestricted);
  const getModuleCaps = useFeatureFlags(s => s.getModuleCaps);

  // v0.124.0: Active persona — drives which section opens by default
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const activePersona = usePersonaStore(s => s.getActivePersona());

  /** Compute which sections to expand for a given persona */
  function getPersonaSections(personaId: string): Set<string> {
    const primarySections = PERSONA_SECTION_MAP[personaId] ?? ['regulatory'];
    return new Set(primarySections);
  }
  
  // v0.34.0: Collapsible section state — initialised from persona, not hardcoded defaultExpanded
  // v0.125.70: Start fully collapsed on login; sections open as user navigates
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());
  
  // Re-expand persona's primary sections when persona changes
  // v0.125.71: Skip first render so mount doesn't re-expand sections (start collapsed on login)
  const personaEffectRan = useRef(false);
  useEffect(() => {
    if (!personaEffectRan.current) { personaEffectRan.current = true; return; }
    setExpandedSections(getPersonaSections(activePersonaId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePersonaId]);

  // Auto-expand section containing active module
  useEffect(() => {
    const activeSection = navSections.find(section => 
      section.items.some(item => item.id === activeModule)
    );
    if (activeSection && !expandedSections.has(activeSection.id)) {
      setExpandedSections(prev => new Set(Array.from(prev).concat([activeSection.id])));
    }
  }, [activeModule]);
  
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);
  
  // v0.34.1: Keyboard shortcuts for section expand/collapse
  // Ctrl+1 through Ctrl+7 toggles sections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Ctrl+number when not in an input
      if (!e.ctrlKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const sectionIndex = parseInt(e.key) - 1;
      if (sectionIndex >= 0 && sectionIndex < navSections.length) {
        e.preventDefault();
        toggleSection(navSections[sectionIndex].id);
      }
      
      // Ctrl+0 expands all sections
      if (e.key === '0') {
        e.preventDefault();
        setExpandedSections(new Set(navSections.map(s => s.id)));
      }
      
      // Ctrl+9 collapses all sections
      if (e.key === '9') {
        e.preventDefault();
        setExpandedSections(new Set());
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSection]);
  
  // Map section colors to items
  const filteredSections = useMemo(() => {
    return navSections.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        color: section.color,
      })),
    }));
  }, []);
  
  // Auto-collapse on tablet; never collapse in mobile drawer
  const effectiveCollapsed = mobileDrawer ? false : (isTablet ? true : isCollapsed);
  
  // Width classes based on collapsed state
  const widthClass = mobileDrawer ? 'w-full' : (effectiveCollapsed ? 'w-16' : 'w-56');

  // handleNav: navigate then close drawer on mobile
  const handleNav = (moduleId: ModuleId, skipHistory?: boolean) => {
    // Direct sidebar navigation always clears the cross-module navigation stack.
    // The back breadcrumb should only appear for workflow-driven navigation
    // (e.g. opening TMF from a HAQ action), not after clicking the sidebar directly.
    useNavigationStackStore.getState().clear();
    onModuleChange(moduleId, skipHistory);
    if (mobileDrawer) onClose?.();
  };
  
  return (
    <aside className={`${widthClass} bg-surface-elevated border-r border-border flex flex-col ${mobileDrawer ? 'min-h-full' : 'overflow-hidden'} transition-all duration-300 ease-in-out`}>
      {/* Logo */}
      <div className="h-14 border-b border-border flex items-center px-4 justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/ligature-logo.png" 
            alt="Ligature" 
            width={32} 
            height={32}
            className="rounded flex-shrink-0"
            style={{ display: 'block' }}
          />
          {!effectiveCollapsed && (
            <div className="whitespace-nowrap">
              <span className="text-lg font-bold text-text-primary">Ligature</span>
              <span className="text-xs text-text-muted ml-1">R&D</span>
            </div>
          )}
        </div>
        {/* Collapse toggle button (desktop only) */}
        {!isMobile && !isTablet && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-surface-card text-text-muted hover:text-text-secondary transition-colors"
            title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {effectiveCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
        {/* Close button — mobile drawer only */}
        {mobileDrawer && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-card text-text-muted hover:text-text-secondary transition-colors"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* ── Back navigation ─────────────────────────────────── */}
      {canGoBack && (
        <div className="px-2 pt-2">
          <button
            onClick={() => {
              const prev = popModuleHistory();
              if (prev) handleNav(prev as ModuleId, true); // true = skipHistory
            }}
            title={effectiveCollapsed ? 'Go back' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-text-secondary hover:bg-surface-card hover:text-text-primary ${
              effectiveCollapsed ? 'justify-center' : ''
            }`}
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            {!effectiveCollapsed && <span className="flex-1 text-left">Back</span>}
          </button>
        </div>
      )}

      {/* ── Primary nav: Home only ─────────────────────────── */}
      {/* v0.121.0: R&D Connected + Agent Hub moved to bottom (platform-level utilities) */}
      <div className="px-2 pt-2 pb-1">
        <button
          onClick={() => handleNav('home')}
          title={effectiveCollapsed ? 'Home' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
            effectiveCollapsed ? 'justify-center' : ''
          } ${
            activeModule === 'home'
              ? 'bg-violet-500/15 text-violet-300 font-semibold ring-1 ring-violet-500/30'
              : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          {!effectiveCollapsed && <span className="flex-1 text-left font-medium">Home</span>}
        </button>
      </div>

      {/* ── My Tasks: personal inbox, separated from nav shortcuts ── */}
      <div className="px-2 pb-3 border-b border-border">
        <button
          onClick={() => handleNav('action-center')}
          title={effectiveCollapsed ? 'My Tasks' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
            effectiveCollapsed ? 'justify-center' : ''
          } ${
            activeModule === 'action-center'
              ? 'bg-surface-card text-text-primary font-medium ring-1 ring-border'
              : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
          }`}
        >
          <Inbox className="w-4 h-4 flex-shrink-0" />
          {!effectiveCollapsed && (
            <>
              <span className="flex-1 text-left font-medium">My Tasks</span>
              <div className="flex items-center gap-1.5">
                {cascadeCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 font-medium flex items-center gap-0.5">
                    ⚡{cascadeCount}
                  </span>
                )}
                {(taskCounts.overdue > 0 || taskCounts.total > 0) && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    taskCounts.overdue > 0 ? 'bg-red-500/20 text-red-400' : 'bg-surface text-text-muted'
                  }`}>
                    {taskCounts.overdue > 0 ? taskCounts.overdue : taskCounts.total}
                  </span>
                )}
              </div>
            </>
          )}
        </button>
      </div>
      
      <nav className="flex-1 min-h-0 py-2 overflow-y-auto">
        {/* ── My Favorites ─────────────────────────────────── */}
        {/* v0.125.73: Pinned bookmarks — top 5 recent */}
        {!effectiveCollapsed && recentFavorites.length > 0 && (
          <div className="mb-1">
            <button
              onClick={openFavoritesPanel}
              className="w-full px-4 py-2 flex items-center justify-between text-left text-xs font-medium uppercase tracking-wider transition-colors text-amber-400/80 hover:text-amber-300"
            >
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 fill-amber-400/80" />
                <span>My Favorites</span>
              </div>
              <span className="text-[10px] text-text-muted/60">{recentFavorites.length}</span>
            </button>
            <div className="space-y-0.5 px-2 pb-2">
              {recentFavorites.map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => {
                    if (fav.entityMeta?.moduleId) handleNav(fav.entityMeta.moduleId as ModuleId);
                    else openFavoritesPanel();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-text-secondary hover:bg-surface-card hover:text-text-primary text-left"
                >
                  <Star className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 fill-amber-400/60" />
                  <span className="flex-1 text-left truncate text-xs">{fav.entityLabel}</span>
                </button>
              ))}
              {/* "See all" if more than 5 */}
              <button
                onClick={openFavoritesPanel}
                className="w-full flex items-center gap-3 px-3 py-1.5 text-xs rounded-lg transition-colors text-text-muted/60 hover:text-text-muted hover:bg-surface-card/50 text-left"
              >
                <span className="flex-1 text-center">View all favorites →</span>
              </button>
            </div>
          </div>
        )}

        {filteredSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const hasActiveItem = section.items.some(item => item.id === activeModule);
          
          return (
            <div key={section.id} className="mb-1">
              {/* Section Header - Clickable to expand/collapse */}
              {!effectiveCollapsed ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full px-4 py-2 flex items-center justify-between text-left text-xs font-medium uppercase tracking-wider transition-colors ${
                    hasActiveItem ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                  }`}
                  title={`${section?.label ?? ''} (Ctrl+${navSections.findIndex(s => s.id === section.id) + 1})`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${section?.color ?? ''} ${hasActiveItem ? 'ring-2 ring-offset-1 ring-offset-surface-elevated' : ''}`} />
                    <span>{section.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                // Collapsed mode: show colored dot for each section
                <div className="flex justify-center py-2">
                  <div className={`w-2 h-2 rounded-full ${section?.color ?? ''}`} title={section.label} />
                </div>
              )}
              
              {/* Section Items */}
              {(effectiveCollapsed || isExpanded) && (
                <div className={`space-y-0.5 px-2 ${!effectiveCollapsed ? 'pb-2' : ''}`}>
                  {section.items.map((item) => {
                    const locked = !isModuleEnabled(item.id);
                    const viewOnly = !locked && isViewOnly(item.id);
                    const restricted = !locked && !viewOnly && isRestricted(item.id);
                    const tierInfo = locked ? BUNDLE_TIERS[getModuleTier(item.id)] : null;
                    const accessLabel = !locked ? getAccessLevelLabel(getModuleCaps(item.id)) : 'Locked';
                    
                    const isActive = activeModule === item.id;
                    return (
                    <div key={item.id}>
                      {/* v0.110.0: Inline sub-group label — only rendered in expanded, non-collapsed mode */}
                      {item.groupLabel && !effectiveCollapsed && (
                        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/50">
                            {item.groupLabel}
                          </span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>
                      )}
                    {/* v0.120.0: Active item gets section-colored left accent strip */}
                    <button
                      onClick={() => handleNav(item.id)}
                      data-testid={`nav-${item.id}`}
                      title={effectiveCollapsed ? `${item?.label ?? ''}${locked ? ' (locked)' : viewOnly ? ' (view only)' : restricted ? ` (${accessLabel})` : ''}` : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors relative ${
                        effectiveCollapsed ? 'justify-center' : ''
                      } ${
                        locked
                          ? 'text-text-muted/50 hover:bg-surface-card/50'
                          : viewOnly
                            ? isActive
                              ? 'bg-surface-card text-text-primary font-semibold ring-1 ring-amber-500/30'
                              : 'text-text-secondary/80 hover:bg-surface-card hover:text-text-primary'
                            : isActive
                              ? 'bg-surface-card text-text-primary font-semibold'
                              : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
                      }`}
                    >
                      {/* Section-colored left accent bar on active item */}
                      {!locked && isActive && !effectiveCollapsed && (
                        <span className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${item.color ?? 'bg-accent-blue'}`} />
                      )}
                      <span className={`flex-shrink-0 ${locked ? 'opacity-40' : viewOnly ? 'opacity-70' : isActive ? 'opacity-100' : 'opacity-75'}`}>{item.icon}</span>
                      {!effectiveCollapsed && (
                        <>
                          <span className={`flex-1 text-left truncate ${locked ? 'opacity-50' : viewOnly ? 'opacity-80' : ''}`}>{item.label}</span>
                          {locked ? (
                            <Lock className="w-3 h-3 text-text-muted/40 flex-shrink-0" />
                          ) : viewOnly ? (
                            <Eye className="w-3 h-3 text-amber-500/60 flex-shrink-0" />
                          ) : restricted ? (
                            <span className="px-1 py-0.5 text-[9px] rounded bg-blue-500/10 text-blue-400/70 font-medium flex-shrink-0">
                              {accessLabel}
                            </span>
                          ) : item.count ? (
                            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                              isActive ? 'bg-text-muted/20 text-text-primary' : 'bg-surface text-text-muted'
                            }`}>
                              {item.count}
                            </span>
                          ) : null}
                        </>
                      )}
                    </button>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section — platform-level utilities + admin */}
      <div className="border-t border-border p-3 space-y-0.5">
        {/* v0.124.0: Active persona indicator — shows who you're "viewing as" */}
        {!effectiveCollapsed && (
          <button
            onClick={() => handleNav('home')}
            className="w-full flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg border border-border/50 bg-surface-card/40 hover:bg-surface-card transition-colors text-left"
            title="Return to Home"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: activePersona.avatarColor }}
            >
              {activePersona.avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-text-primary truncate">{activePersona.firstName} {activePersona.lastName}</div>
              <div className="text-[10px] text-text-muted truncate">{activePersona.title}</div>
            </div>
          </button>
        )}
        {effectiveCollapsed && (
          <button
            onClick={() => handleNav('home')}
            className="w-full flex justify-center py-1.5 mb-1"
            title={`${activePersona.firstName} ${activePersona.lastName} — ${activePersona.title}`}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: activePersona.avatarColor }}
            >
              {activePersona.avatarInitials}
            </div>
          </button>
        )}
        {/* v0.121.0: R&D Connected + Agent Hub pinned here as platform-level utilities */}
        <button
          onClick={() => handleNav('rd-connected')}
          title={effectiveCollapsed ? 'R&D Connected' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
            effectiveCollapsed ? 'justify-center' : ''
          } ${
            activeModule === 'rd-connected'
              ? 'bg-teal-500/15 text-teal-300 font-semibold ring-1 ring-teal-500/30'
              : 'text-text-muted hover:bg-surface-card hover:text-text-secondary'
          }`}
        >
          <Workflow className={`w-4 h-4 flex-shrink-0 ${activeModule === 'rd-connected' ? 'text-teal-300' : 'text-teal-500'}`} />
          {!effectiveCollapsed && <span className="flex-1 text-left">R&D Connected</span>}
        </button>

        <button
          onClick={() => handleNav('agent-hub')}
          title={effectiveCollapsed ? 'Agent Hub' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
            effectiveCollapsed ? 'justify-center' : ''
          } ${
            activeModule === 'agent-hub'
              ? 'bg-purple-500/15 text-purple-300 font-semibold ring-1 ring-purple-500/30'
              : 'text-text-muted hover:bg-surface-card hover:text-text-secondary'
          }`}
        >
          <Bot className={`w-4 h-4 flex-shrink-0 ${activeModule === 'agent-hub' ? 'text-purple-300' : 'text-purple-400'}`} />
          {!effectiveCollapsed && (
            <>
              <span className="flex-1 text-left">Agent Hub</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                NEW
              </span>
            </>
          )}
        </button>

        <button 
          onClick={() => handleNav('admin')}
          title={effectiveCollapsed ? 'Administration' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
            effectiveCollapsed ? 'justify-center' : ''
          } ${
            activeModule === 'admin'
              ? 'bg-slate-500/20 text-slate-400'
              : 'text-text-muted hover:bg-surface-card hover:text-text-secondary'
          }`}
        >
          <Settings className="w-4 h-4" />
          {!effectiveCollapsed && <span>Administration</span>}
        </button>
        {!effectiveCollapsed && (
          <div className="mt-3 px-3">
            <TierSwitcher collapsed={false} />
            <div className="text-xs text-text-muted/60 mt-1.5">
              <span>{APP_VERSION_DISPLAY}</span>
              <span className="mx-1.5">·</span>
              <span className="text-amber-500/80">dev</span>
            </div>
          </div>
        )}
        {effectiveCollapsed && (
          <div className="mt-2 px-1">
            <TierSwitcher collapsed={true} />
          </div>
        )}
      </div>
    </aside>
  );
}
