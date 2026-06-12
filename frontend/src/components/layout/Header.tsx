

import { useState, useRef, useEffect } from 'react';
import { 
  Search, Bell, Settings, Menu, X, Filter,
  Beaker, FileText, Shield, Database, ClipboardCheck,
  FlaskConical, TestTube, Activity, Heart,
  FileCheck, FileCode, Send, MessageSquare, BookOpen, Tag,
  CheckSquare, FolderTree, Server, Cloud,
  Brain, BarChart3, Users, Building, Rocket, Factory,
  Globe, Target, LogOut, ChevronDown, User, Star
} from 'lucide-react';
import { ModuleId, ModuleGroup } from '@/types/core';
import { useAppStore, useActiveFilterCount } from '@/store/useAppStore';
import { useFavoritesStore, useFavoriteCount } from '@/store/useFavoritesStore';
import { useToast } from '@/components/ui/Toast';
// v0.44.1: Demo controls stripped from header (guided overlay is sufficient)
import { ThemeModeToggle } from '@/components/layout/ThemeModeToggle';
// v133: User Switching
// v0.44.2: UserSwitcherWidget removed (demo personas stripped)
// v141: Responsive utilities
import { useIsMobile, useIsTablet, useResponsive } from '@/hooks/useResponsive';
// v0.9.11: Centralized version - for mobile menu
import { APP_VERSION_DISPLAY } from '@/config/version';
// v0.12.7: NotificationBell component
import { NotificationBell } from '@/components/notifications/NotificationSystem';
// v0.44.1: Removed DemoButton & AIStatusIndicator (demo controls stripped)
// v0.27.0: Global Search
import { SearchTrigger } from '@/components/search/GlobalSearch';
// v0.27.74: Enhanced Global Search with cross-module integration
import { EnhancedGlobalSearch } from '@/components/search/EnhancedGlobalSearch';
// v0.33.18: Sync Status Indicator
import { SyncStatusIndicator } from '@/components/layout/SyncStatusIndicator';
// v0.44.62: Persona Switcher
import { PersonaSwitcher } from '@/components/layout/PersonaSwitcher';
// v0.125.31: Scope Selector
import { ScopeSelector } from '@/components/layout/ScopeSelector';

interface HeaderProps {
  activeModule: ModuleId;
  moduleName: string;
  onModuleChange: (module: ModuleId) => void;
  sidebarCollapsed?: boolean; // v0.25.3: Show logo when sidebar is collapsed
  onMobileNavOpen?: () => void;
}


const MODULE_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  // Development
  'portfolio': { label: 'Portfolio', icon: <Beaker className="w-4 h-4" />, description: 'Programs, milestones, dashboards' },
  'study-design': { label: 'Study Design', icon: <FileText className="w-4 h-4" />, description: 'USDM protocol builder, TPP' },
  'ctms': { label: 'Clinical Trials', icon: <Users className="w-4 h-4" />, description: 'Sites, subjects, visits, EDC' },
  'tmf': { label: 'Trial Master File', icon: <FolderTree className="w-4 h-4" />, description: 'DIA compliance, gap analysis' },
  'study-intel': { label: 'Study Intelligence', icon: <BarChart3 className="w-4 h-4" />, description: 'Enrollment, deviations, risk' },
  
  // Safety
  'safety': { label: 'Pharmacovigilance', icon: <Heart className="w-4 h-4" />, description: 'Cases, MedDRA, E2B(R3)' },
  'signal-detection': { label: 'Signal Detection', icon: <Activity className="w-4 h-4" />, description: 'Signal detection & aggregate reports' },
  'psmf': { label: 'PSMF', icon: <ClipboardCheck className="w-4 h-4" />, description: 'PV System Master File' },
  
  // CMC
  'cmc': { label: 'Chemistry & Mfg', icon: <Factory className="w-4 h-4" />, description: 'Specs, methods, supply chain' },
  'stability': { label: 'Stability', icon: <TestTube className="w-4 h-4" />, description: 'Stability studies & shelf life' },
  'batch-records': { label: 'Batch Records', icon: <FileCheck className="w-4 h-4" />, description: 'Production & release' },
  
  // Regulatory
  'authoring': { label: 'Authoring', icon: <FileText className="w-4 h-4" />, description: 'AI section generation, QC' },
  'document-control': { label: 'Document Control', icon: <FolderTree className="w-4 h-4" />, description: 'Version control, lineage' },
  'submission-command': { label: 'Command Center', icon: <Rocket className="w-4 h-4" />, description: 'Publisher mission control' },
  'submissions-hub': { label: 'Submissions Hub', icon: <Send className="w-4 h-4" />, description: 'Planning, lifecycle, pipeline' },
  'publishing': { label: 'Publishing', icon: <FileCheck className="w-4 h-4" />, description: 'eCTD builder, gateway' },
  'haq': { label: 'HAQ Management', icon: <MessageSquare className="w-4 h-4" />, description: 'AI-assisted responses' },
  'labeling': { label: 'Labeling', icon: <Tag className="w-4 h-4" />, description: 'SPL, label content' },
  'spl': { label: 'SPL', icon: <FileCode className="w-4 h-4" />, description: 'FDA structured labeling' },
  'strategy': { label: 'Strategy & Planning', icon: <Brain className="w-4 h-4" />, description: 'Regulatory strategy' },
  'reg-calendar': { label: 'Reg Calendar', icon: <Activity className="w-4 h-4" />, description: 'Deadlines & commitments' },
  'master-data': { label: 'Master Data & IDMP', icon: <Database className="w-4 h-4" />, description: 'Products, substances, orgs' },
  'continuous-submission': { label: 'Continuous Submit', icon: <Cloud className="w-4 h-4" />, description: 'Rolling/real-time submissions' },
  
  // Quality
  'qms': { label: 'QMS', icon: <CheckSquare className="w-4 h-4" />, description: 'Deviations, CAPAs, SOPs' },
  'glp': { label: 'GLP Compliance', icon: <Shield className="w-4 h-4" />, description: 'Study conduct, QA audits' },
  'inspector-readiness': { label: 'Inspector Readiness', icon: <ClipboardCheck className="w-4 h-4" />, description: 'Inspection prep & findings' },
  'archives': { label: 'R&D Archives', icon: <Server className="w-4 h-4" />, description: 'Long-term retention' },
  
  // Commercial
  'commercial': { label: 'Launch & Market Access', icon: <Rocket className="w-4 h-4" />, description: 'Launch readiness' },
  'supply-chain': { label: 'Supply Chain', icon: <Building className="w-4 h-4" />, description: 'Inventory, serialization' },
  'medical-affairs': { label: 'Medical Affairs', icon: <Heart className="w-4 h-4" />, description: 'MSL, KOL, sci comms' },
  
  // Intelligence
  'ai-authoring': { label: 'AI Authoring', icon: <Brain className="w-4 h-4" />, description: 'Document generation with Claude' },
  'ai-consistency': { label: 'Consistency Engine', icon: <Brain className="w-4 h-4" />, description: 'Cross-document checking' },
  'analytics': { label: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, description: 'Platform-wide metrics' },
  
  // Legacy aliases (for backwards compatibility)
  'ai-generation': { label: 'AI Authoring', icon: <Brain className="w-4 h-4" />, description: 'Document generation with Claude' },
  'cmc-manufacturing': { label: 'Chemistry & Mfg', icon: <Factory className="w-4 h-4" />, description: 'Specs, methods, supply chain' },
  'idmp': { label: 'Master Data & IDMP', icon: <Database className="w-4 h-4" />, description: 'Products, substances, orgs' },
  'research': { label: 'Portfolio', icon: <Beaker className="w-4 h-4" />, description: 'Programs, milestones, dashboards' },
  'eln': { label: 'Study Design', icon: <BookOpen className="w-4 h-4" />, description: 'USDM protocol builder' },
};

// v0.25.2: MegaMenu removed - sidebar now handles navigation
// getModuleGroup helper removed - not used

// v0.80.5: User menu with logout
function UserMenu() {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get user info from session
    fetch('/api/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.name) {
          setUserName(data.user.name);
          setUserInitials(data.user.name.split(' ').map((p: string) => p[0] || '').join('').slice(0, 2).toUpperCase());
        } else if (data?.user?.email) {
          setUserName(data.user.email.split('@')[0]);
          setUserInitials(data.user.email.slice(0, 2).toUpperCase());
        }
      })
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    window.location.href = '/';
  }

  if (!userName) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-card transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-accent-blue flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          {userInitials}
        </div>
        <span className="hidden sm:block text-sm text-text-primary font-medium max-w-[100px] truncate">{userName.split(' ')[0]}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-elevated border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-sm font-medium text-text-primary truncate">{userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function FilterBadge() {
  const activeFilterCount = useActiveFilterCount();
  const clearFilters = useAppStore((s) => s.clearFilters);
  const { info } = useToast();
  
  if (activeFilterCount === 0) return null;
  
  return (
    <button
      onClick={() => { clearFilters(); info('Filters cleared'); }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent-blue/10 border border-accent-blue/30 rounded-lg text-accent-blue hover:bg-accent-blue/20 transition-colors"
      title="Click to clear all filters"
    >
      <Filter className="w-4 h-4" />
      <span className="text-sm font-medium">{activeFilterCount}</span>
      <X className="w-3 h-3" />
    </button>
  );
}

export function Header({ activeModule, moduleName, onModuleChange, sidebarCollapsed = false, onMobileNavOpen }: HeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  
  // v141: Responsive state
  const isMobile = useIsMobile();
  const openFavoritesPanel = useFavoritesStore((s) => s.openPanel);
  const favCount = useFavoriteCount();
  const isTablet = useIsTablet();
  const { compactMode } = useResponsive();

  const handleModuleChange = (module: ModuleId) => {
    onModuleChange(module);
  };
  
  // v0.27.74: Handle search navigation
  const handleSearchNavigate = (module: string, id: string, path?: string) => {
    setGlobalSearchOpen(false);
    // Map module paths to ModuleId
    const moduleMap: Record<string, ModuleId> = {
      'authoring': 'authoring',
      'document-control': 'document-control',
      'submissions': 'submissions-hub',
      'submissions-hub': 'submissions-hub',
      'haq': 'haq',
      'safety': 'safety',
      'tmf': 'tmf',
      'qms': 'qms',
      'ctms': 'ctms',
      'portfolio': 'portfolio',
      'master-data': 'master-data',
    };
    const targetModule = moduleMap[module.toLowerCase()] || 'portfolio';
    onModuleChange(targetModule);
  };

  return (
    <>
      <header className="bg-surface-elevated border-b border-border">
        {/* Top row - utility bar */}
        <div className="h-14 flex items-center px-2 sm:px-4 gap-2 sm:gap-3">
          {/* Mobile hamburger menu - only show when sidebar is hidden */}
          <button className="lg:hidden p-2 hover:bg-surface-card rounded-lg touch-target flex-shrink-0" onClick={() => onMobileNavOpen?.()}>
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
          
          {/* Logo/Brand - show on mobile always, show on desktop when sidebar collapsed */}
          <div className={`flex items-center gap-2 sm:gap-3 flex-shrink-0 ${!isMobile && !sidebarCollapsed ? 'lg:hidden' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/ligature-logo.png" 
              alt="Ligature" 
              width={28} 
              height={28}
              className="rounded sm:w-8 sm:h-8"
            />
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-text-primary font-semibold text-base sm:text-lg">Ligature</span>
              <span className="text-xs text-text-muted font-medium">R&D Connected</span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0" />

          {/* v0.125.31: Scope selector pill */}
          <ScopeSelector activeModule={activeModule} />
          
          {/* Search - hidden on mobile, opens global search */}
          <div className="hidden md:block flex-shrink-0">
            <SearchTrigger onOpen={() => setGlobalSearchOpen(true)} />
          </div>
          
          {/* Mobile search button */}
          <button 
            className="md:hidden p-2 hover:bg-surface-card rounded-lg touch-target flex-shrink-0" 
            onClick={() => setGlobalSearchOpen(true)}
          >
            <Search className="w-5 h-5 text-text-secondary" />
          </button>
          
          {/* Utility icons - all flex-shrink-0 to prevent squishing */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <FilterBadge />
            
            {/* v0.44.62: Persona Switcher */}
            <PersonaSwitcher />
            
            {/* v0.33.18: Sync Status Indicator */}
            <SyncStatusIndicator />
            
            {/* v0.125.73: Favorites / Bookmarks */}
            <button
              onClick={openFavoritesPanel}
              title={`My Favorites${favCount > 0 ? ` (${favCount})` : ''}`}
              className="relative p-2 hover:bg-surface-card rounded-lg flex items-center justify-center flex-shrink-0 text-text-secondary hover:text-amber-400 transition-colors"
            >
              <Star className={`w-5 h-5 transition-colors ${favCount > 0 ? 'fill-amber-400 text-amber-400' : ''}`} />
              {favCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
            
                        <ThemeModeToggle />
            <NotificationBell />
            
            <button onClick={() => handleModuleChange('admin')} className={`p-2 hover:bg-surface-card rounded-lg hidden sm:flex flex-shrink-0 ${activeModule === 'admin' ? 'bg-surface-card' : ''}`}>
              <Settings className="w-5 h-5 text-text-secondary" />
            </button>

            {/* v0.80.5: User menu with logout */}
            <UserMenu />
          </div>
        </div>

      </header>

      {/* v0.27.74: Enhanced Global Search Modal */}
      <EnhancedGlobalSearch
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        onNavigate={handleSearchNavigate}
      />
    </>
  );
}
