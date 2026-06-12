

import { useState, useMemo } from 'react';
import {
  MessageSquare, FileText, ChevronRight, ChevronDown, Check, X, Plus,
  ArrowRight, AlertCircle, Package, Eye, Clock, Send, Calendar,
  Link2, BookOpen, RefreshCw, Sparkles, Download, ExternalLink
} from 'lucide-react';
import { 
  useHAQCorrespondenceBridge, 
  usePendingCorrespondence,
  CorrespondencePackage,
  CorrespondenceStatus,
  HAQResponseDocument,
  processHAQHandoffToCorrespondence
} from '@/store/useHAQCorrespondenceBridge';
import { usePendingHandoffs, PendingHandoff } from '@/store/useCrossModuleStore';
import { useToast } from '@/components/ui/Toast';

interface CorrespondenceIntegrationPanelProps {
  applicationId?: string;
  sequenceId?: string;
  onPackageSelect?: (pkg: CorrespondencePackage) => void;
  onAddToSequence?: (pkg: CorrespondencePackage) => void;
  compact?: boolean;
}

const disciplineColors: Record<string, string> = {
  'CMC': 'bg-accent-green/20 text-accent-green',
  'Clinical': 'bg-accent-blue/20 text-accent-blue',
  'Nonclinical': 'bg-accent-amber/20 text-accent-amber',
  'Biometrics': 'bg-accent-purple/20 text-accent-purple',
  'Pharmacology': 'bg-accent-teal/20 text-accent-teal',
  'Labeling': 'bg-accent-pink/20 text-accent-pink',
  'Administrative': 'bg-slate-500/20 text-slate-400',
  'Safety': 'bg-accent-red/20 text-accent-red',
};

const statusConfig: Record<CorrespondenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'draft': { label: 'Draft', color: 'bg-slate-500/20 text-slate-400', icon: <FileText className="w-3 h-3" /> },
  'in-preparation': { label: 'In Prep', color: 'bg-accent-amber/20 text-accent-amber', icon: <Clock className="w-3 h-3" /> },
  'under-review': { label: 'Review', color: 'bg-accent-blue/20 text-accent-blue', icon: <Eye className="w-3 h-3" /> },
  'qc-pending': { label: 'QC', color: 'bg-accent-purple/20 text-accent-purple', icon: <AlertCircle className="w-3 h-3" /> },
  'ready-for-submission': { label: 'Ready', color: 'bg-accent-green/20 text-accent-green', icon: <Check className="w-3 h-3" /> },
  'submitted': { label: 'Submitted', color: 'bg-accent-green/20 text-accent-green', icon: <Send className="w-3 h-3" /> },
};

export function CorrespondenceIntegrationPanel({
  applicationId,
  sequenceId,
  onPackageSelect,
  onAddToSequence,
  compact = false,
}: CorrespondenceIntegrationPanelProps) {
  const toast = useToast();
  const pendingPackages = usePendingCorrespondence();
  const pendingHandoffs = usePendingHandoffs('submissions');
  const { 
    correspondencePackages, 
    linkPackageToSequence, 
    updatePackageStatus,
    generateDocuments,
  } = useHAQCorrespondenceBridge();
  
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showConversionPanel, setShowConversionPanel] = useState(false);
  
  // Filter packages based on props
  const relevantPackages = useMemo(() => {
    let pkgs = correspondencePackages;
    if (applicationId) {
      pkgs = pkgs.filter(p => p.applicationId === applicationId);
    }
    if (sequenceId) {
      // Show packages linked to this sequence OR pending packages
      pkgs = pkgs.filter(p => p.linkedSequenceId === sequenceId || !p.linkedSequenceId);
    }
    return pkgs;
  }, [correspondencePackages, applicationId, sequenceId]);
  
  // HAQ handoffs that haven't been converted yet
  const unconvertedHandoffs = useMemo(() => {
    return pendingHandoffs.filter(h => 
      h.type === 'haq-response-to-m1' && 
      h.status === 'pending'
    );
  }, [pendingHandoffs]);
  
  const handleConvertHandoff = async (handoff: PendingHandoff) => {
    setProcessingId(handoff.id);
    try {
      const result = processHAQHandoffToCorrespondence(handoff.id, 'current-user');
      
      if (result.success) {
        toast.success(`Converted ${result.package?.questionCount || 0} HAQ responses to correspondence`);
        if (result.warnings.length > 0) {
          toast.warning(result.warnings[0]);
        }
      } else {
        toast.error(result.errors[0] || 'Failed to convert HAQ responses');
      }
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleAddToSequence = (pkg: CorrespondencePackage) => {
    if (!sequenceId) {
      toast.error('No sequence selected');
      return;
    }
    
    linkPackageToSequence(pkg.id, sequenceId);
    updatePackageStatus(pkg.id, 'in-preparation');
    
    // Generate documents
    const docs = generateDocuments(pkg.id);
    if (docs) {
      toast.success(`Added ${pkg.title} to sequence with ${docs.coverLetter ? 2 : 1} document(s)`);
    }
    
    onAddToSequence?.(pkg);
  };
  
  if (compact && relevantPackages.length === 0 && unconvertedHandoffs.length === 0) {
    return null;
  }
  
  // Compact mode - just show count
  if (compact) {
    const totalItems = relevantPackages.length + unconvertedHandoffs.length;
    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 bg-accent-purple/10 border border-accent-purple/30 rounded-lg cursor-pointer hover:bg-accent-purple/20 transition-colors"
        onClick={() => setShowConversionPanel(true)}
      >
        <MessageSquare className="w-4 h-4 text-accent-purple" />
        <span className="text-sm text-text-primary">
          {totalItems} correspondence item{totalItems !== 1 ? 's' : ''}
        </span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>
    );
  }
  
  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-gradient-to-r from-accent-purple/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-accent-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">HAQ Correspondence</h3>
            <p className="text-xs text-text-muted">
              {relevantPackages.length} package{relevantPackages.length !== 1 ? 's' : ''} • {unconvertedHandoffs.length} pending conversion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unconvertedHandoffs.length > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-accent-amber/20 text-accent-amber rounded-full">
              {unconvertedHandoffs.length} to convert
            </span>
          )}
        </div>
      </div>
      
      {/* Unconverted Handoffs Section */}
      {unconvertedHandoffs.length > 0 && (
        <div className="p-4 border-b border-border bg-accent-amber/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent-amber" />
            <span className="text-xs font-medium text-text-primary">Pending HAQ Conversions</span>
          </div>
          <div className="space-y-2">
            {unconvertedHandoffs.map(handoff => {
              const metadata = handoff.metadata as {
                questionCount?: number;
                disciplines?: string[];
                applicationNumber?: string;
              };
              const isProcessing = processingId === handoff.id;
              
              return (
                <div 
                  key={handoff.id}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isProcessing ? 'bg-accent-blue/20' : 'bg-surface-card'
                    }`}>
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 text-accent-blue animate-spin" />
                      ) : (
                        <Package className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{handoff.sourceTitle}</div>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span>{metadata?.applicationNumber}</span>
                        <span>•</span>
                        <span>{metadata?.questionCount || 0} questions</span>
                        {metadata?.disciplines && (
                          <>
                            <span>•</span>
                            <span>{metadata.disciplines.slice(0, 2).join(', ')}{metadata.disciplines.length > 2 ? '...' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConvertHandoff(handoff)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Convert
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Packages List */}
      {relevantPackages.length === 0 && unconvertedHandoffs.length === 0 ? (
        <div className="p-8 text-center">
          <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-text-secondary mb-1">No correspondence packages</p>
          <p className="text-xs text-text-muted">
            Package HAQ responses in the HAQ module to create correspondence documents
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {relevantPackages.map(pkg => {
            const isExpanded = expandedPackage === pkg.id;
            const status = statusConfig[pkg.status];
            const isLinked = !!pkg.linkedSequenceId;
            
            return (
              <div key={pkg.id}>
                {/* Package Summary Row */}
                <div 
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface-card transition-colors"
                  onClick={() => setExpandedPackage(isExpanded ? null : pkg.id)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isLinked ? 'bg-accent-green/20' : 'bg-surface-card'
                  }`}>
                    {isLinked ? (
                      <Link2 className="w-4 h-4 text-accent-green" />
                    ) : (
                      <FileText className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {pkg.title}
                      </span>
                      <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                      <span className="text-xs text-text-muted flex-shrink-0">
                        {pkg.targetSection}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-muted">
                        {pkg.questionCount} response{pkg.questionCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-text-muted">•</span>
                      <div className="flex items-center gap-1">
                        {pkg.disciplines.slice(0, 3).map(d => (
                          <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded ${disciplineColors[d] || 'bg-slate-500/20 text-slate-400'}`}>
                            {d}
                          </span>
                        ))}
                        {pkg.disciplines.length > 3 && (
                          <span className="text-[10px] text-text-muted">+{pkg.disciplines.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${status?.color ?? ''}`}>
                      {status.icon}
                      {status.label}
                    </span>
                    {!isLinked && sequenceId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToSequence(pkg); }}
                        className="p-2 bg-accent-green/10 text-accent-green rounded-lg hover:bg-accent-green/20 transition-colors"
                        title="Add to sequence"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-surface-card/50">
                    <div className="pl-11 space-y-3">
                      {/* Metadata */}
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-text-muted">Application</span>
                          <div className="text-text-primary font-medium">{pkg.applicationNumber}</div>
                        </div>
                        <div>
                          <span className="text-text-muted">Type</span>
                          <div className="text-text-primary font-medium capitalize">
                            {pkg.correspondenceType.replace(/-/g, ' ')}
                          </div>
                        </div>
                        <div>
                          <span className="text-text-muted">File</span>
                          <div className="text-text-primary font-medium truncate">{pkg.suggestedFileName}</div>
                        </div>
                      </div>
                      
                      {/* Due date if present */}
                      {pkg.dueDate && (
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="w-3 h-3 text-text-muted" />
                          <span className="text-text-muted">Due:</span>
                          <span className="text-text-primary">{pkg.dueDate}</span>
                        </div>
                      )}
                      
                      {/* Responses preview */}
                      <div className="space-y-2">
                        <div className="text-xs text-text-muted">Responses included:</div>
                        <div className="max-h-40 overflow-auto space-y-2">
                          {pkg.responses.slice(0, 5).map((resp) => (
                            <div 
                              key={resp.id}
                              className="p-2 bg-surface rounded-lg border border-border"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-text-primary">{resp.questionNumber}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${disciplineColors[resp.discipline] || 'bg-slate-500/20 text-slate-400'}`}>
                                  {resp.discipline}
                                </span>
                                {resp.ctdReferences.length > 0 && (
                                  <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                                    <BookOpen className="w-3 h-3" />
                                    {resp.ctdReferences.length} ref{resp.ctdReferences.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary line-clamp-2">
                                {resp.responseText || <span className="italic text-text-muted">No response text</span>}
                              </p>
                              {resp.attachments.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-text-muted">
                                  <FileText className="w-3 h-3" />
                                  {resp.attachments.length} attachment{resp.attachments.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          ))}
                          {pkg.responses.length > 5 && (
                            <p className="text-xs text-text-muted text-center py-2">
                              + {pkg.responses.length - 5} more response{pkg.responses.length - 5 !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <button 
                          onClick={() => onPackageSelect?.(pkg)}
                          className="flex-1 py-2 text-xs bg-surface-card border border-border text-text-primary rounded-lg hover:bg-surface flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3 h-3" />
                          View Details
                        </button>
                        <button className="flex-1 py-2 text-xs bg-surface-card border border-border text-text-primary rounded-lg hover:bg-surface flex items-center justify-center gap-1.5">
                          <Download className="w-3 h-3" />
                          Export
                        </button>
                        {!isLinked && sequenceId && (
                          <button 
                            onClick={() => handleAddToSequence(pkg)}
                            className="flex-1 py-2 text-xs bg-accent-green text-white rounded-lg hover:bg-accent-green/90 flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3 h-3" />
                            Add to Sequence
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Badge for nav showing pending correspondence items
export function CorrespondenceBadge() {
  const pendingPackages = usePendingCorrespondence();
  const pendingHandoffs = usePendingHandoffs('submissions');
  
  const unconvertedCount = pendingHandoffs.filter(h => 
    h.type === 'haq-response-to-m1' && h.status === 'pending'
  ).length;
  
  const totalCount = pendingPackages.length + unconvertedCount;
  
  if (totalCount === 0) return null;
  
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent-purple text-white rounded-full">
      {totalCount}
    </span>
  );
}
