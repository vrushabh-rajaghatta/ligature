

/**
 * CommandPalette - v0.12.4
 * 
 * Cmd+K command palette for power user navigation.
 * Features:
 * - Keyboard-first navigation (↑↓ arrows, Enter to select)
 * - Fuzzy search across modules, actions, and recent items
 * - Grouped results by category
 * - Recent navigation history
 * - Quick actions (create, search, settings)
 * - v0.12.4: Natural language commands ("draft response to HAQ-123")
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, Command, ArrowUp, ArrowDown, CornerDownLeft,
  Beaker, FileText, Shield, Database, ClipboardCheck,
  FlaskConical, TestTube, Activity, Heart,
  FileCheck, Send, MessageSquare, BookOpen, Tag,
  CheckSquare, FolderTree, Server, Settings,
  Brain, BarChart3, Users, Building, Clock, Zap,
  Plus, X, ExternalLink,
  Wand2, GitCompare, Eye, CheckCircle  // v0.12.4: Command verb icons
} from 'lucide-react';
import { parseCommand, startsWithVerb, type ParsedCommand, type CommandVerb } from '@/data/command-grammar';
import { useCommandExecution, getCommandLabel } from '@/hooks/useCommandExecution';
import { ModuleId } from '@/types/core';
import { useAppStore } from '@/store/useAppStore';
import { useHAQStore } from '@/store/useHAQStore';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import { useECTDPublishingStore } from '@/store/useECTDPublishingStore';

// Command types - v0.12.4: Added 'parsed' for natural language commands
type CommandCategory = 'parsed' | 'navigation' | 'action' | 'recent';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  icon: React.ReactNode;
  keywords?: string[];
  action: () => void;
  shortcut?: string;
}

// Module icons and metadata
const MODULE_COMMANDS: Array<{
  id: ModuleId;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
  group: string;
}> = [
  { id: 'portfolio', label: 'Portfolio', description: 'Product portfolio & lifecycle', icon: <Beaker className="w-4 h-4" />, keywords: ['products', 'pipeline', 'lifecycle'], group: 'Development' },
  { id: 'ctms', label: 'Clinical Trials', description: 'Trial management & sites', icon: <Users className="w-4 h-4" />, keywords: ['ctms', 'trials', 'sites', 'enrollment'], group: 'Development' },
  { id: 'tmf', label: 'Trial Master File', description: 'eTMF management', icon: <FolderTree className="w-4 h-4" />, keywords: ['tmf', 'documents', 'trial'], group: 'Development' },
  { id: 'study-intel', label: 'Study Intelligence', description: 'ML-powered analytics', icon: <BarChart3 className="w-4 h-4" />, keywords: ['analytics', 'ml', 'intelligence'], group: 'Development' },
  { id: 'safety', label: 'Safety & PV', description: 'Pharmacovigilance', icon: <Heart className="w-4 h-4" />, keywords: ['safety', 'pv', 'pharmacovigilance', 'icsr', 'signals'], group: 'Development' },
  { id: 'cmc', label: 'CMC', description: 'Chemistry, Manufacturing, Controls', icon: <FlaskConical className="w-4 h-4" />, keywords: ['cmc', 'manufacturing', 'chemistry'], group: 'Development' },
  { id: 'authoring', label: 'Authoring', description: 'Document authoring', icon: <FileText className="w-4 h-4" />, keywords: ['authoring', 'documents', 'writing'], group: 'Regulatory' },
  { id: 'submissions-hub', label: 'Submissions Hub', description: 'Submission management', icon: <Send className="w-4 h-4" />, keywords: ['submissions', 'nda', 'bla', 'ectd'], group: 'Regulatory' },
  { id: 'ectd-workspace', label: 'eCTD Workspace', description: 'eCTD building', icon: <FileCheck className="w-4 h-4" />, keywords: ['ectd', 'ctd', 'building'], group: 'Regulatory' },
  { id: 'publishing-center', label: 'Publishing Center', description: 'Gateway submissions', icon: <Send className="w-4 h-4" />, keywords: ['publishing', 'gateway', 'esg'], group: 'Regulatory' },
  { id: 'haq', label: 'HAQ', description: 'Health authority questions', icon: <MessageSquare className="w-4 h-4" />, keywords: ['haq', 'questions', 'fda', 'ema', 'response'], group: 'Regulatory' },
  { id: 'labeling', label: 'Labeling', description: 'Label management', icon: <Tag className="w-4 h-4" />, keywords: ['labeling', 'labels', 'artwork'], group: 'Regulatory' },
  { id: 'strategy', label: 'Regulatory Strategy', description: 'Regulatory intelligence', icon: <Brain className="w-4 h-4" />, keywords: ['strategy', 'intelligence', 'regulatory'], group: 'Regulatory' },
  { id: 'master-data', label: 'Master Data', description: 'MDM & golden records', icon: <Database className="w-4 h-4" />, keywords: ['master', 'data', 'mdm'], group: 'Regulatory' },
  { id: 'qms', label: 'QMS', description: 'Quality management', icon: <CheckSquare className="w-4 h-4" />, keywords: ['qms', 'quality', 'capa', 'deviations'], group: 'Quality' },
  { id: 'document-control', label: 'Document Control', description: 'Enterprise documents', icon: <FolderTree className="w-4 h-4" />, keywords: ['documents', 'control', 'sop'], group: 'Quality' },
  { id: 'inspector-readiness', label: 'Inspector Readiness', description: 'GxP inspection prep', icon: <ClipboardCheck className="w-4 h-4" />, keywords: ['inspection', 'gxp', 'audit', 'readiness'], group: 'Quality' },
  { id: 'research', label: 'Research', description: 'Discovery & preclinical research', icon: <TestTube className="w-4 h-4" />, keywords: ['research', 'discovery', 'preclinical'], group: 'Research' },
  { id: 'admin', label: 'Administration', description: 'System settings', icon: <Settings className="w-4 h-4" />, keywords: ['admin', 'settings', 'configuration'], group: 'Admin' },
];

// Quick actions - v117: Expanded with product-specific actions
const QUICK_ACTIONS: Array<{
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
  action: () => void;
  shortcut?: string;
}> = [
  // Creation actions
  { id: 'new-document', label: 'New Document', description: 'Create a new document', icon: <Plus className="w-4 h-4" />, keywords: ['new', 'create', 'document'], action: () => {}, shortcut: 'Ctrl+N' },
  { id: 'new-haq-response', label: 'New HAQ Response', description: 'Draft response to health authority question', icon: <Plus className="w-4 h-4" />, keywords: ['new', 'create', 'haq', 'response', 'question'], action: () => {} },
  { id: 'new-submission', label: 'New Submission', description: 'Start a new regulatory submission', icon: <Plus className="w-4 h-4" />, keywords: ['new', 'create', 'submission', 'nda', 'bla', 'ind'], action: () => {} },
  { id: 'new-deviation', label: 'New Deviation', description: 'Report a quality deviation', icon: <Plus className="w-4 h-4" />, keywords: ['new', 'create', 'deviation', 'quality', 'qms'], action: () => {} },
  { id: 'new-capa', label: 'New CAPA', description: 'Initiate corrective action', icon: <Plus className="w-4 h-4" />, keywords: ['new', 'create', 'capa', 'corrective', 'action'], action: () => {} },
  
  // Search and navigation
  { id: 'quick-search', label: 'Search Everything', description: 'Global search across all modules', icon: <Search className="w-4 h-4" />, keywords: ['search', 'find', 'query'], action: () => {}, shortcut: 'Ctrl+Shift+F' },
  { id: 'jump-to-product', label: 'Jump to LIG-2847', description: 'Navigate to Nexavant/ligrastinib', icon: <ExternalLink className="w-4 h-4" />, keywords: ['jump', 'product', 'lig', 'nexavant', 'ligrastinib', '2847'], action: () => {} },
  { id: 'recent-documents', label: 'Recent Documents', description: 'View recently accessed documents', icon: <Clock className="w-4 h-4" />, keywords: ['recent', 'documents', 'history'], action: () => {} },
  
  // View actions
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', description: 'Show/hide navigation sidebar', icon: <Zap className="w-4 h-4" />, keywords: ['sidebar', 'toggle', 'navigation'], action: () => {}, shortcut: 'Ctrl+B' },
  { id: 'toggle-dark-mode', label: 'Toggle Dark Mode', description: 'Switch between light and dark themes', icon: <Zap className="w-4 h-4" />, keywords: ['dark', 'light', 'theme', 'mode'], action: () => {} },
  
  // Quick filters
  { id: 'filter-overdue', label: 'Show Overdue Items', description: 'Filter to overdue tasks and documents', icon: <Clock className="w-4 h-4" />, keywords: ['filter', 'overdue', 'late', 'due'], action: () => {} },
  { id: 'filter-my-items', label: 'Show My Items', description: 'Filter to items assigned to me', icon: <Users className="w-4 h-4" />, keywords: ['filter', 'my', 'mine', 'assigned'], action: () => {} },
];

// Storage key for recent commands
const RECENT_COMMANDS_KEY = 'ligature-recent-commands';
const MAX_RECENT = 5;

function getRecentCommands(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentCommand(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentCommands().filter(r => r !== id);
    recent.unshift(id);
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore storage errors
  }
}

interface CommandPaletteProps {
  /** Controlled open state */
  open?: boolean;
  /** Callback when palette closes */
  onClose?: () => void;
}

export function CommandPalette({ open: controlledOpen, onClose }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  
  // v0.12.4: Command execution for parsed commands
  const { execute: executeCommand } = useCommandExecution();
  
  // v0.12.4: Access HAQ data for contextual suggestions
  const haqs = useHAQStore((s) => s.haqs);
  const selectHAQ = useHAQStore((s) => s.selectHAQ);
  
  // v0.12.4: Access Safety signals for contextual suggestions
  const signals = usePharmacovigilanceStore((s) => s.signals);
  const selectSignal = usePharmacovigilanceStore((s) => s.selectSignal);
  
  // v0.12.4: Access eCTD sequences for compare suggestions
  const sequences = useECTDPublishingStore((s) => s.sequences);
  const selectSequence = useECTDPublishingStore((s) => s.selectSequence);
  
  // Use controlled state if provided
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (open: boolean) => {
    if (controlledOpen !== undefined) {
      if (!open && onClose) onClose();
    } else {
      setInternalOpen(open);
    }
  };
  
  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    
    // Navigation commands
    MODULE_COMMANDS.forEach(mod => {
      items.push({
        id: `nav-${mod.id}`,
        label: mod.label,
        description: mod.description,
        category: 'navigation',
        icon: mod.icon,
        keywords: [mod.id, mod.label.toLowerCase(), ...mod.keywords, mod.group.toLowerCase()],
        action: () => {
          setActiveModule(mod.id);
          saveRecentCommand(`nav-${mod.id}`);
          setOpen(false);
        },
      });
    });
    
    // Quick actions
    QUICK_ACTIONS.forEach(action => {
      items.push({
        id: action.id,
        label: action.label,
        description: action.description,
        category: 'action',
        icon: action.icon,
        keywords: action.keywords,
        shortcut: action.shortcut,
        action: () => {
          action.action();
          saveRecentCommand(action.id);
          setOpen(false);
        },
      });
    });
    
    return items;
  }, [setActiveModule]);
  
  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    // v0.12.4: Helper to get icon for command verb
    const getVerbIcon = (verb: CommandVerb): React.ReactNode => {
      const icons: Record<CommandVerb, React.ReactNode> = {
        draft: <Wand2 className="w-4 h-4" />,
        compare: <GitCompare className="w-4 h-4" />,
        show: <Eye className="w-4 h-4" />,
        find: <Search className="w-4 h-4" />,
        approve: <CheckCircle className="w-4 h-4" />,
        submit: <Send className="w-4 h-4" />,
      };
      return icons[verb] || <Command className="w-4 h-4" />;
    };
    
    if (!query.trim()) {
      // Show recent + all navigation when no query
      const recentIds = getRecentCommands();
      const recent = recentIds
        .map(id => commands.find(c => c.id === id))
        .filter((c): c is CommandItem => c !== undefined)
        .map(c => ({ ...c, category: 'recent' as CommandCategory }));
      
      // Group by category
      const grouped: Record<CommandCategory, CommandItem[]> = {
        parsed: [],  // v0.12.4: No parsed commands when no query
        recent: recent,
        navigation: commands.filter(c => c.category === 'navigation').slice(0, 8),
        action: commands.filter(c => c.category === 'action'),
      };
      
      return grouped;
    }
    
    // v0.12.4: Try to parse as natural language command
    const parsedCommand = parseCommand(query);
    const parsedItems: CommandItem[] = [];
    
    if (parsedCommand && parsedCommand.confidence >= 0.5) {
      parsedItems.push({
        id: `parsed-${parsedCommand.id}`,
        label: getCommandLabel(parsedCommand),
        description: `Go to ${parsedCommand.targetModule}${parsedCommand.objectId ? ` → ${parsedCommand.objectId}` : ''}`,
        category: 'parsed',
        icon: getVerbIcon(parsedCommand.verb),
        action: () => {
          executeCommand(parsedCommand);
          saveRecentCommand(`parsed-${parsedCommand.id}`);
          setOpen(false);
        },
      });
    }
    
    // v0.12.4: Contextual suggestions based on verb
    const detectedVerb = startsWithVerb(query);
    
    if (detectedVerb === 'draft') {
      // Show open HAQs awaiting response
      const openHAQs = haqs
        .filter(h => ['open', 'in-progress', 'new'].includes(h.status))
        .sort((a, b) => {
          // Overdue first, then by due date
          const now = new Date();
          const aOverdue = new Date(a.dueDate) < now;
          const bOverdue = new Date(b.dueDate) < now;
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
        .slice(0, 5);
      
      openHAQs.forEach(haq => {
        const isOverdue = new Date(haq.dueDate) < new Date();
        const dueLabel = isOverdue 
          ? `Overdue` 
          : `Due ${new Date(haq.dueDate).toLocaleDateString()}`;
        
        parsedItems.push({
          id: `draft-haq-${haq.id}`,
          label: `Draft response to ${haq.id}`,
          description: `${haq.source} • ${haq.discipline} • ${dueLabel}`,
          category: 'parsed',
          icon: <Wand2 className="w-4 h-4" />,
          action: () => {
            setActiveModule('haq');
            selectHAQ(haq.id);
            saveRecentCommand(`draft-haq-${haq.id}`);
            setOpen(false);
          },
        });
      });
    }
    
    // v0.12.4: Contextual suggestions for "compare" verb
    if (detectedVerb === 'compare') {
      const sequenceList = Object.values(sequences)
        .sort((a, b) => parseInt(b.sequenceNumber) - parseInt(a.sequenceNumber))
        .slice(0, 6);
      
      // Suggest comparing recent pairs
      if (sequenceList.length >= 2) {
        for (let i = 0; i < Math.min(sequenceList.length - 1, 3); i++) {
          const seq1 = sequenceList[i];
          const seq2 = sequenceList[i + 1];
          parsedItems.push({
            id: `compare-seq-${seq1.sequenceNumber}-${seq2.sequenceNumber}`,
            label: `Compare sequence ${seq1.sequenceNumber} vs ${seq2.sequenceNumber}`,
            description: `${seq1.submissionType || 'Sequence'} • ${seq1.sequenceType || 'original'}`,
            category: 'parsed',
            icon: <GitCompare className="w-4 h-4" />,
            action: () => {
              setActiveModule('ectd-workspace');
              if (selectSequence) selectSequence(seq1.id);
              saveRecentCommand(`compare-seq-${seq1.sequenceNumber}-${seq2.sequenceNumber}`);
              setOpen(false);
            },
          });
        }
      }
    }
    
    // v0.12.4: Contextual suggestions for "show" verb
    if (detectedVerb === 'show') {
      // Show active safety signals (new or under-evaluation)
      const activeSignals = Object.values(signals)
        .filter(s => s.status === 'new' || s.status === 'under-evaluation')
        .slice(0, 3);
      
      activeSignals.forEach(signal => {
        parsedItems.push({
          id: `show-signal-${signal.id}`,
          label: `Show signal ${signal.signalNumber || signal.id}`,
          description: `${signal.title || 'Safety Signal'} • ${signal.caseCount || 0} cases`,
          category: 'parsed',
          icon: <Eye className="w-4 h-4" />,
          action: () => {
            setActiveModule('safety');
            if (selectSignal) selectSignal(signal.id);
            saveRecentCommand(`show-signal-${signal.id}`);
            setOpen(false);
          },
        });
      });
      
      // Also suggest common "show" destinations
      parsedItems.push({
        id: 'show-all-signals',
        label: 'Show all safety signals',
        description: 'Navigate to Safety & PV module',
        category: 'parsed',
        icon: <Eye className="w-4 h-4" />,
        action: () => {
          setActiveModule('safety');
          saveRecentCommand('show-all-signals');
          setOpen(false);
        },
      });
      
      parsedItems.push({
        id: 'show-submissions',
        label: 'Show active submissions',
        description: 'Navigate to Submissions Hub',
        category: 'parsed',
        icon: <Eye className="w-4 h-4" />,
        action: () => {
          setActiveModule('submissions-hub');
          saveRecentCommand('show-submissions');
          setOpen(false);
        },
      });
    }
    
    // v0.12.4: Contextual suggestions for "find" verb
    if (detectedVerb === 'find') {
      // Suggest common search destinations
      parsedItems.push({
        id: 'find-documents',
        label: 'Find documents',
        description: 'Search in Document Authoring',
        category: 'parsed',
        icon: <Search className="w-4 h-4" />,
        action: () => {
          setActiveModule('authoring');
          saveRecentCommand('find-documents');
          setOpen(false);
        },
      });
      
      parsedItems.push({
        id: 'find-haqs',
        label: 'Find HAQs',
        description: 'Search in HAQ Intelligence',
        category: 'parsed',
        icon: <Search className="w-4 h-4" />,
        action: () => {
          setActiveModule('haq');
          saveRecentCommand('find-haqs');
          setOpen(false);
        },
      });
      
      parsedItems.push({
        id: 'find-submissions',
        label: 'Find submissions',
        description: 'Search in Submissions Hub',
        category: 'parsed',
        icon: <Search className="w-4 h-4" />,
        action: () => {
          setActiveModule('submissions-hub');
          saveRecentCommand('find-submissions');
          setOpen(false);
        },
      });
    }
    
    // Fuzzy search
    const q = query.toLowerCase();
    const matches = commands.filter(cmd => {
      const searchText = [cmd.label, cmd.description, ...(cmd.keywords || [])].join(' ').toLowerCase();
      return searchText.includes(q) || cmd.keywords?.some(k => k.startsWith(q));
    });
    
    return {
      parsed: parsedItems,  // v0.12.4: Parsed commands first
      recent: [] as CommandItem[],
      navigation: matches.filter(c => c.category === 'navigation'),
      action: matches.filter(c => c.category === 'action'),
    };
  }, [query, commands, executeCommand, haqs, setActiveModule, selectHAQ, signals, selectSignal, sequences, selectSequence]);
  
  // Flatten for keyboard navigation - v0.12.4: parsed first
  const flatList = useMemo(() => {
    return [
      ...filteredCommands.parsed,
      ...filteredCommands.recent,
      ...filteredCommands.navigation,
      ...filteredCommands.action,
    ];
  }, [filteredCommands]);
  
  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
        return;
      }
      
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Handle list navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatList[selectedIndex]) {
          flatList[selectedIndex].action();
        }
        break;
    }
  }, [flatList, selectedIndex]);
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatList.length > 0) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatList.length]);
  
  if (!isOpen) return null;
  
  const categoryLabels: Record<CommandCategory, string> = {
    parsed: 'Run Command',  // v0.12.4
    recent: 'Recent',
    navigation: 'Navigate to...',
    action: 'Actions',
  };
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setOpen(false)}
      />
      
      {/* Palette */}
      <div className="fixed inset-x-4 top-[15%] mx-auto max-w-xl bg-surface-elevated border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command... (e.g., draft response to HAQ-123)"
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-base focus:outline-none"
          />
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <kbd className="px-1.5 py-0.5 bg-surface-card border border-border rounded">↑↓</kbd>
            <span>navigate</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-surface-card rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        
        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {flatList.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results for &quot;{query}&quot;</p>
            </div>
          ) : (
            <>
              {(['parsed', 'recent', 'navigation', 'action'] as CommandCategory[]).map(category => {
                const items = filteredCommands[category];
                if (items.length === 0) return null;
                
                // Calculate start index for this category - v0.12.4: added parsed
                let startIndex = 0;
                if (category === 'recent') startIndex = filteredCommands.parsed.length;
                if (category === 'navigation') startIndex = filteredCommands.parsed.length + filteredCommands.recent.length;
                if (category === 'action') startIndex = filteredCommands.parsed.length + filteredCommands.recent.length + filteredCommands.navigation.length;
                
                return (
                  <div key={category} className="mb-2">
                    <div className="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
                      {categoryLabels[category]}
                    </div>
                    {items.map((cmd, idx) => {
                      const globalIdx = startIndex + idx;
                      const isSelected = globalIdx === selectedIndex;
                      
                      return (
                        <button
                          key={cmd.id}
                          data-index={globalIdx}
                          onClick={() => cmd.action()}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected 
                              ? 'bg-accent-blue/10 text-text-primary' 
                              : 'text-text-secondary hover:bg-surface-card'
                          }`}
                        >
                          <div className={`p-1.5 rounded-md ${isSelected ? 'bg-accent-blue/20' : 'bg-surface-card'}`}>
                            {cmd.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{cmd.label}</div>
                            {cmd.description && (
                              <div className="text-xs text-text-muted truncate">{cmd.description}</div>
                            )}
                          </div>
                          {cmd.shortcut && (
                            <kbd className="px-1.5 py-0.5 bg-surface-card border border-border rounded text-xs text-text-muted">
                              {cmd.shortcut}
                            </kbd>
                          )}
                          {category === 'recent' && (
                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-card/50 text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded">⏎</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-elevated border border-border rounded">esc</kbd>
              close
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to programmatically control the command palette
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  
  const toggle = useCallback(() => setOpen(o => !o), []);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  
  return { open, setOpen, toggle, show, hide };
}

export default CommandPalette;
