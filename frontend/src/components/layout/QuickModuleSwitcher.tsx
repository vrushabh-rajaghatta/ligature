

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  X,
  Clock,
  Star,
  Beaker,
  FileText,
  Shield,
  Database,
  ClipboardCheck,
  FlaskConical,
  TestTube,
  Activity,
  Heart,
  FileCheck,
  Send,
  MessageSquare,
  BookOpen,
  Tag,
  CheckSquare,
  FolderTree,
  Server,
  Cloud,
  Brain,
  BarChart3,
  Users,
  Building,
  Rocket,
  Factory,
  Settings,
  Microscope,
  Inbox,
  Calendar,
  FileCode,
} from 'lucide-react';
import { ModuleId } from '@/types/core';
import { useRecentModules } from '@/hooks/useRecentModules';

// ============================================================================
// TYPES
// ============================================================================

interface QuickModuleSwitcherProps {
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId) => void;
}

interface ModuleDefinition {
  id: ModuleId;
  label: string;
  description: string;
  keywords: string[];
  group: string;
  groupColor: string;
  icon: React.ElementType;
}

// ============================================================================
// MODULE DEFINITIONS
// ============================================================================

const MODULES: ModuleDefinition[] = [
  // Research
  { id: 'research', label: 'Research', description: 'Discovery & preclinical research', keywords: ['discovery', 'preclinical', 'early'], group: 'Research', groupColor: '#06B6D4', icon: TestTube },
  { id: 'eln', label: 'Lab Notebook', description: 'Electronic lab notebook & experiments', keywords: ['eln', 'experiments', 'lab', 'notebook'], group: 'Research', groupColor: '#06B6D4', icon: BookOpen },
  
  // Development
  { id: 'portfolio', label: 'Portfolio', description: 'Product portfolio & lifecycle', keywords: ['products', 'lifecycle', 'pipeline'], group: 'Development', groupColor: '#10B981', icon: Beaker },
  { id: 'study-design', label: 'Study Design', description: 'USDM protocol builder', keywords: ['protocol', 'usdm', 'design'], group: 'Development', groupColor: '#10B981', icon: FileText },
  { id: 'ctms', label: 'Clinical Trials', description: 'Trial management & sites', keywords: ['clinical', 'trials', 'sites', 'ctms'], group: 'Development', groupColor: '#10B981', icon: Users },
  { id: 'tmf', label: 'Trial Master File', description: 'eTMF management', keywords: ['tmf', 'etmf', 'master', 'file'], group: 'Development', groupColor: '#10B981', icon: FolderTree },
  { id: 'study-intel', label: 'Study Intelligence', description: 'ML-powered analytics', keywords: ['intelligence', 'ml', 'analytics', 'study'], group: 'Development', groupColor: '#10B981', icon: BarChart3 },
  { id: 'safety', label: 'Safety & PV', description: 'Pharmacovigilance', keywords: ['safety', 'pv', 'pharmacovigilance', 'adverse'], group: 'Development', groupColor: '#10B981', icon: Heart },
  { id: 'psmf', label: 'PSMF', description: 'PV System Master File', keywords: ['psmf', 'pv', 'system', 'master'], group: 'Development', groupColor: '#10B981', icon: ClipboardCheck },
  { id: 'cmc-manufacturing', label: 'CMC & Manufacturing', description: 'Chemistry, Manufacturing, Controls', keywords: ['cmc', 'manufacturing', 'chemistry', 'controls'], group: 'Development', groupColor: '#10B981', icon: Factory },
  { id: 'development', label: 'Development', description: 'Clinical development dashboard', keywords: ['clinical', 'development'], group: 'Development', groupColor: '#10B981', icon: FlaskConical },
  
  // Regulatory
  { id: 'authoring', label: 'Authoring', description: 'Document authoring', keywords: ['authoring', 'documents', 'writing', 'csr'], group: 'Regulatory', groupColor: '#F59E0B', icon: FileText },
  { id: 'submission-command', label: 'Command Center', description: 'Publisher mission control', keywords: ['command', 'center', 'publisher', 'dashboard', 'mission'], group: 'Regulatory', groupColor: '#F59E0B', icon: Rocket },
  { id: 'submissions-hub', label: 'Submissions Hub', description: 'Submission management', keywords: ['submissions', 'hub', 'filings'], group: 'Regulatory', groupColor: '#F59E0B', icon: Send },
  { id: 'publishing', label: 'Publishing', description: 'eCTD workspace & gateway submissions', keywords: ['publishing', 'ectd', 'gateway', 'ese'], group: 'Regulatory', groupColor: '#F59E0B', icon: FileCheck },
  { id: 'haq', label: 'HAQ', description: 'Health authority questions', keywords: ['haq', 'health', 'authority', 'questions', 'deficiency'], group: 'Regulatory', groupColor: '#F59E0B', icon: MessageSquare },
  { id: 'labeling', label: 'Labeling', description: 'Label management', keywords: ['labeling', 'labels', 'pi', 'uspi', 'smpc'], group: 'Regulatory', groupColor: '#F59E0B', icon: Tag },
  { id: 'spl', label: 'SPL', description: 'FDA Structured Product Labeling', keywords: ['spl', 'structured', 'product', 'labeling', 'fda', 'dailymed', 'plr'], group: 'Regulatory', groupColor: '#F59E0B', icon: FileCode },
  { id: 'strategy', label: 'Strategy', description: 'Regulatory intelligence', keywords: ['strategy', 'intelligence', 'regulatory'], group: 'Regulatory', groupColor: '#F59E0B', icon: Brain },
  { id: 'master-data', label: 'Master Data', description: 'MDM & golden records', keywords: ['mdm', 'master', 'data', 'golden'], group: 'Regulatory', groupColor: '#F59E0B', icon: Database },
  
  // Quality
  { id: 'qms', label: 'QMS', description: 'Quality management system', keywords: ['qms', 'quality', 'management', 'capa'], group: 'Quality', groupColor: '#EF4444', icon: CheckSquare },
  { id: 'document-control', label: 'Documents', description: 'Enterprise documents', keywords: ['documents', 'control', 'dms'], group: 'Quality', groupColor: '#EF4444', icon: FolderTree },
  { id: 'glp', label: 'GLP Compliance', description: '21 CFR Part 58 nonclinical', keywords: ['glp', 'compliance', 'nonclinical', 'part 58'], group: 'Quality', groupColor: '#EF4444', icon: Shield },
  { id: 'archives', label: 'R&D Archives', description: 'Long-term document & data archives', keywords: ['archives', 'storage', 'retention'], group: 'Quality', groupColor: '#EF4444', icon: Server },
  { id: 'inspector-readiness', label: 'Inspector Readiness', description: 'GxP inspection prep', keywords: ['inspector', 'inspection', 'audit', 'gxp'], group: 'Quality', groupColor: '#EF4444', icon: ClipboardCheck },
  
  // Commercial
  { id: 'commercial', label: 'Commercial', description: 'Launch, MLR & claims', keywords: ['commercial', 'launch', 'mlr', 'claims'], group: 'Commercial', groupColor: '#8B5CF6', icon: Rocket },
  { id: 'supply-chain', label: 'Supply Chain', description: 'Suppliability & inventory', keywords: ['supply', 'chain', 'inventory'], group: 'Commercial', groupColor: '#8B5CF6', icon: Building },
  { id: 'medical-affairs', label: 'Medical Affairs', description: 'KOL, MSL & publications', keywords: ['medical', 'affairs', 'kol', 'msl', 'publications'], group: 'Commercial', groupColor: '#8B5CF6', icon: Heart },
  
  // Operations
  { id: 'ai-generation', label: 'AI Generation', description: 'AI document generation', keywords: ['ai', 'generation', 'claude', 'llm'], group: 'Operations', groupColor: '#14B8A6', icon: Brain },
  { id: 'ai-consistency', label: 'AI Consistency', description: 'Cross-document AI analysis', keywords: ['ai', 'consistency', 'cross', 'analysis'], group: 'Operations', groupColor: '#14B8A6', icon: Brain },
  { id: 'idmp', label: 'IDMP', description: 'ISO medicinal product data', keywords: ['idmp', 'iso', 'spor', 'medicinal'], group: 'Operations', groupColor: '#14B8A6', icon: Database },
  { id: 'analytics', label: 'Analytics', description: 'Platform-wide analytics', keywords: ['analytics', 'reports', 'dashboards'], group: 'Operations', groupColor: '#14B8A6', icon: BarChart3 },
  { id: 'reg-calendar', label: 'Reg Calendar', description: 'Regulatory milestones', keywords: ['calendar', 'milestones', 'deadlines'], group: 'Operations', groupColor: '#14B8A6', icon: Calendar },
  { id: 'continuous-submission', label: 'Continuous Submit', description: 'IDMP/Accumulus pipeline', keywords: ['continuous', 'submit', 'accumulus'], group: 'Operations', groupColor: '#14B8A6', icon: Cloud },
  
  // Core
  { id: 'action-center', label: 'My Tasks', description: 'Unified task inbox', keywords: ['tasks', 'inbox', 'action', 'todo'], group: 'Core', groupColor: '#3B82F6', icon: Inbox },
  { id: 'activity', label: 'Activity', description: 'Recent activity feed', keywords: ['activity', 'feed', 'recent'], group: 'Core', groupColor: '#3B82F6', icon: Activity },
  { id: 'admin', label: 'Administration', description: 'Platform settings', keywords: ['admin', 'settings', 'configuration'], group: 'System', groupColor: '#6B7280', icon: Settings },
];

// ============================================================================
// FUZZY SEARCH
// ============================================================================

function fuzzyMatch(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower === queryLower) return 100;
  
  // Starts with
  if (textLower.startsWith(queryLower)) return 90;
  
  // Contains
  if (textLower.includes(queryLower)) return 70;
  
  // Fuzzy character matching
  let queryIdx = 0;
  let score = 0;
  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      score += 10;
      queryIdx++;
    }
  }
  
  return queryIdx === queryLower.length ? score : 0;
}

function searchModules(query: string, modules: ModuleDefinition[]): ModuleDefinition[] {
  if (!query.trim()) return modules;
  
  const results = modules.map(module => {
    const labelScore = fuzzyMatch(module.label, query);
    const descScore = fuzzyMatch(module.description, query) * 0.5;
    const keywordScores = module.keywords.map(k => fuzzyMatch(k, query) * 0.7);
    const maxKeywordScore = Math.max(0, ...keywordScores);
    const groupScore = fuzzyMatch(module.group, query) * 0.3;
    
    const totalScore = Math.max(labelScore, descScore, maxKeywordScore, groupScore);
    
    return { module, score: totalScore };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.module);
  
  return results;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickModuleSwitcher({ activeModule, onModuleChange }: QuickModuleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const { recentModules, addRecentModule } = useRecentModules();
  
  // Filter modules based on search
  const filteredModules = useMemo(() => {
    const results = searchModules(query, MODULES);
    
    // If no query, show recent modules first
    if (!query.trim() && recentModules.length > 0) {
      const recentDefs = recentModules
        .map(id => MODULES.find(m => m.id === id))
        .filter(Boolean) as ModuleDefinition[];
      
      const others = results.filter(m => !recentModules.includes(m.id));
      return [...recentDefs, ...others];
    }
    
    return results;
  }, [query, recentModules]);
  
  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredModules.length]);
  
  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Handle keyboard navigation in list
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredModules.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredModules[selectedIndex]) {
          handleSelect(filteredModules[selectedIndex].id);
        }
        break;
    }
  }, [filteredModules, selectedIndex]);
  
  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    
    const selectedEl = list.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);
  
  const handleSelect = useCallback((moduleId: ModuleId) => {
    addRecentModule(moduleId);
    onModuleChange(moduleId);
    setIsOpen(false);
    setQuery('');
  }, [addRecentModule, onModuleChange]);
  
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg bg-surface-elevated rounded-xl shadow-2xl border border-border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search modules..."
            className="flex-1 bg-transparent text-text-primary text-base placeholder:text-text-muted focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            onClick={handleClose}
            className="p-1 hover:bg-surface-card rounded text-text-muted hover:text-text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Results */}
        <div 
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {/* Recent indicator */}
          {!query.trim() && recentModules.length > 0 && (
            <div className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recent
            </div>
          )}
          
          {filteredModules.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted">
              <p>No modules found for "{query}"</p>
            </div>
          ) : (
            filteredModules.map((module, index) => {
              const Icon = module.icon;
              const isSelected = index === selectedIndex;
              const isRecent = !query.trim() && recentModules.includes(module.id) && index < recentModules.length;
              const showGroupHeader = !query.trim() && index === recentModules.length && recentModules.length > 0;
              
              return (
                <React.Fragment key={module.id}>
                  {showGroupHeader && (
                    <div className="px-3 py-1.5 mt-2 text-xs font-medium text-text-muted uppercase tracking-wider">
                      All Modules
                    </div>
                  )}
                  <button
                    onClick={() => handleSelect(module.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                      isSelected 
                        ? 'bg-accent-blue/10 text-text-primary' 
                        : 'text-text-secondary hover:bg-surface-card'
                    }`}
                  >
                    <div 
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${module.groupColor}20` }}
                    >
                      <Icon 
                        className="w-4 h-4" 
                        style={{ color: module.groupColor }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{module.label}</span>
                        {module.id === activeModule && (
                          <span className="text-xs px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue rounded">
                            Current
                          </span>
                        )}
                        {isRecent && (
                          <Clock className="w-3 h-3 text-text-muted" />
                        )}
                      </div>
                      <p className="text-sm text-text-muted truncate">{module.description}</p>
                    </div>
                    <span 
                      className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
                      style={{ 
                        backgroundColor: `${module.groupColor}15`,
                        color: module.groupColor 
                      }}
                    >
                      {module.group}
                    </span>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>
        
        {/* Footer with hints */}
        <div className="px-4 py-2.5 border-t border-border bg-surface-card/50 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              Select
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1 py-0.5 bg-surface-card rounded text-[10px]">Esc</span>
              Close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />K to open
          </span>
        </div>
      </div>
    </div>
  );
}

export default QuickModuleSwitcher;
