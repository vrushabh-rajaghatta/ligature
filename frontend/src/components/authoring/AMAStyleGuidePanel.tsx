

import { useState, useMemo } from 'react';
import {
  BookOpen, CheckCircle, AlertTriangle, AlertCircle, Info,
  ChevronDown, ChevronRight, Search, X, ExternalLink, 
  FileText, Hash, Pill, Clock, BarChart3, Edit3, RefreshCw
} from 'lucide-react';
import { 
  useAMAWritingStore, 
  AMA_CATEGORIES,
  type AMAStyleRule,
  type AMAViolation,
  type AMASeverity,
} from '@/store/amaWritingStore';

// ============================================================================
// AMA COMPLIANCE INDICATOR
// ============================================================================

interface AMAComplianceIndicatorProps {
  score: number;
  errors: number;
  warnings: number;
  suggestions: number;
  onClick?: () => void;
}

export function AMAComplianceIndicator({ score, errors, warnings, suggestions, onClick }: AMAComplianceIndicatorProps) {
  const getScoreColor = () => {
    if (score >= 90) return 'text-accent-green';
    if (score >= 70) return 'text-accent-amber';
    return 'text-red-400';
  };

  const getScoreBg = () => {
    if (score >= 90) return 'bg-accent-green/20';
    if (score >= 70) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border border-border hover:border-accent-blue/50 transition-colors ${getScoreBg()}`}
    >
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-text-muted" />
        <span className="text-xs text-text-muted">AMA Style</span>
      </div>
      <div className={`text-lg font-bold ${getScoreColor()}`}>{score}%</div>
      {(errors > 0 || warnings > 0) && (
        <div className="flex items-center gap-1.5 text-xs">
          {errors > 0 && (
            <span className="flex items-center gap-0.5 text-red-400">
              <AlertCircle className="w-3 h-3" />
              {errors}
            </span>
          )}
          {warnings > 0 && (
            <span className="flex items-center gap-0.5 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {warnings}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ============================================================================
// AMA STYLE GUIDE PANEL
// ============================================================================

interface AMAStyleGuidePanelProps {
  onClose: () => void;
  onCheckDocument?: (text: string) => void;
  documentText?: string;
}

export function AMAStyleGuidePanel({ onClose, onCheckDocument, documentText }: AMAStyleGuidePanelProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'checker' | 'violations'>('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Abbreviations');
  
  const styleRules = useAMAWritingStore(s => s.styleRules);
  const currentCompliance = useAMAWritingStore(s => s.currentCompliance);
  const checkDocument = useAMAWritingStore(s => s.checkDocument);
  const autoCheckEnabled = useAMAWritingStore(s => s.autoCheckEnabled);
  const setAutoCheck = useAMAWritingStore(s => s.setAutoCheck);

  // Filter rules by search
  const filteredRules = useMemo(() => {
    if (!searchQuery) return styleRules;
    const q = searchQuery.toLowerCase();
    return styleRules.filter(rule => 
      rule.title.toLowerCase().includes(q) ||
      rule.description.toLowerCase().includes(q) ||
      rule.category.toLowerCase().includes(q)
    );
  }, [styleRules, searchQuery]);

  // Group rules by category
  const rulesByCategory = useMemo(() => {
    const grouped = new Map<string, AMAStyleRule[]>();
    for (const rule of filteredRules) {
      const existing = grouped.get(rule.category) || [];
      grouped.set(rule.category, [...existing, rule]);
    }
    return grouped;
  }, [filteredRules]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Abbreviations': return <FileText className="w-4 h-4" />;
      case 'Numbers': return <Hash className="w-4 h-4" />;
      case 'Drug Names': return <Pill className="w-4 h-4" />;
      case 'Units of Measure': return <BarChart3 className="w-4 h-4" />;
      case 'Dates and Time': return <Clock className="w-4 h-4" />;
      case 'Statistics': return <BarChart3 className="w-4 h-4" />;
      case 'Writing Style': return <Edit3 className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getSeverityIcon = (severity: AMASeverity) => {
    switch (severity) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'suggestion': return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleRunCheck = () => {
    if (documentText) {
      checkDocument(documentText);
      setActiveTab('violations');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">AMA Writing Standards</h2>
              <p className="text-xs text-text-muted">American Medical Association Manual of Style, 11th Edition</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-border">
          {[
            { id: 'guide', label: 'Style Guide', icon: BookOpen },
            { id: 'checker', label: 'Compliance Checker', icon: CheckCircle },
            { id: 'violations', label: 'Issues', icon: AlertTriangle, count: currentCompliance?.violations.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-accent-blue border-accent-blue bg-surface-card'
                  : 'text-text-muted border-transparent hover:text-text-primary hover:bg-surface-card/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'guide' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search style rules..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                />
              </div>

              {/* Categories */}
              <div className="space-y-2">
                {AMA_CATEGORIES.map(category => {
                  const rules = rulesByCategory.get(category) || [];
                  const isExpanded = expandedCategory === category;
                  
                  return (
                    <div key={category} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : category)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-surface-card hover:bg-surface-card/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(category)}
                          <span className="font-medium text-text-primary">{category}</span>
                          <span className="text-xs text-text-muted">({rules.length} rules)</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-text-muted" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        )}
                      </button>
                      
                      {isExpanded && rules.length > 0 && (
                        <div className="p-4 space-y-4 bg-surface">
                          {rules.map(rule => (
                            <div key={rule.id} className="space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-text-primary text-sm">{rule.title}</h4>
                                <span className="text-xs text-text-muted bg-surface-card px-2 py-0.5 rounded">
                                  {rule.reference}
                                </span>
                              </div>
                              <p className="text-sm text-text-secondary">{rule.description}</p>
                              
                              {rule.examples.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {rule.examples.map((example, idx) => (
                                    <div key={idx} className="grid grid-cols-2 gap-3 text-xs">
                                      <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                                        <span className="text-red-400 font-medium">✗ Incorrect: </span>
                                        <span className="text-text-secondary">{example.incorrect}</span>
                                      </div>
                                      <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                                        <span className="text-green-400 font-medium">✓ Correct: </span>
                                        <span className="text-text-secondary">{example.correct}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'checker' && (
            <div className="space-y-6">
              {/* Settings */}
              <div className="p-4 bg-surface-card border border-border rounded-lg">
                <h3 className="font-medium text-text-primary mb-4">Compliance Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Auto-check on edit</span>
                    <button
                      onClick={() => setAutoCheck(!autoCheckEnabled)}
                      className={`w-11 h-6 rounded-full transition-colors ${
                        autoCheckEnabled ? 'bg-accent-blue' : 'bg-surface-elevated border border-border'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        autoCheckEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </label>
                </div>
              </div>

              {/* Run Check */}
              <div className="p-4 bg-surface-card border border-border rounded-lg">
                <h3 className="font-medium text-text-primary mb-2">Manual Check</h3>
                <p className="text-sm text-text-muted mb-4">
                  Run a compliance check against your document content.
                </p>
                <button
                  onClick={handleRunCheck}
                  disabled={!documentText}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Check Document
                </button>
              </div>

              {/* Current Score */}
              {currentCompliance && (
                <div className="p-4 bg-surface-card border border-border rounded-lg">
                  <h3 className="font-medium text-text-primary mb-4">Compliance Score</h3>
                  <div className="flex items-center gap-6">
                    <div className={`text-4xl font-bold ${
                      currentCompliance.score >= 90 ? 'text-accent-green' :
                      currentCompliance.score >= 70 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {currentCompliance.score}%
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-text-secondary">{currentCompliance.errors} errors</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-text-secondary">{currentCompliance.warnings} warnings</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Info className="w-4 h-4 text-blue-400" />
                        <span className="text-text-secondary">{currentCompliance.suggestions} suggestions</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'violations' && (
            <div className="space-y-4">
              {!currentCompliance ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-muted">No compliance check has been run yet.</p>
                  <button
                    onClick={handleRunCheck}
                    disabled={!documentText}
                    className="mt-4 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50"
                  >
                    Run Check Now
                  </button>
                </div>
              ) : currentCompliance.violations.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-accent-green mx-auto mb-4" />
                  <p className="text-text-primary font-medium">All Clear!</p>
                  <p className="text-text-muted text-sm">Your document follows AMA style guidelines.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCompliance.violations.map(violation => (
                    <div 
                      key={violation.id}
                      className={`p-4 rounded-lg border ${
                        violation.severity === 'error' ? 'bg-red-500/5 border-red-500/30' :
                        violation.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/30' :
                        'bg-blue-500/5 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(violation.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary text-sm">{violation.message}</span>
                            <span className="text-xs text-text-muted bg-surface-card px-2 py-0.5 rounded">
                              {violation.rule}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary mt-1">{violation.suggestion}</p>
                          {violation.location.text && (
                            <div className="mt-2 px-3 py-1.5 bg-surface-card rounded text-xs font-mono text-text-muted">
                              "{violation.location.text}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-surface-card">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <BookOpen className="w-3 h-3" />
            <span>Based on AMA Manual of Style, 11th Edition</span>
            <a 
              href="https://academic.oup.com/amamanualofstyle" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent-blue hover:underline"
            >
              Reference <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// QUICK AMA TIPS SIDEBAR
// ============================================================================

interface AMAQuickTipsProps {
  className?: string;
}

export function AMAQuickTips({ className = '' }: AMAQuickTipsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const quickTips = [
    { icon: FileText, title: 'Abbreviations', tip: 'Define at first use: "Food and Drug Administration (FDA)"' },
    { icon: Hash, title: 'Numbers', tip: 'Spell out 0-9, use numerals for 10+ (except with units: 5 mg)' },
    { icon: Pill, title: 'Drug Names', tip: 'Lowercase generics: "ligrastinib", capitalize brands: "Gleevec"' },
    { icon: BarChart3, title: 'Units', tip: 'Space between number and unit: "100 mg" not "100mg"' },
    { icon: Clock, title: 'Dates', tip: 'Write out: "December 18, 2024" not "12/18/2024"' },
  ];

  return (
    <div className={`bg-surface-card border border-border rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-elevated transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-text-primary">AMA Quick Tips</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {quickTips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <tip.icon className="w-3.5 h-3.5 text-text-muted mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-medium text-text-primary">{tip.title}: </span>
                <span className="text-xs text-text-secondary">{tip.tip}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
