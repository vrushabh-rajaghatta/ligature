

import { useState } from 'react';
import {
  MessageSquare, ChevronRight, Check, X, FileText, Clock,
  ArrowRight, AlertCircle, Package, Eye, Plus
} from 'lucide-react';
import { useCrossModuleStore, usePendingHandoffs, PendingHandoff } from '@/store/useCrossModuleStore';
import { useSequenceBuilderStore } from '@/store/useSequenceBuilderStore';

interface HAQHandoffPanelProps {
  onAcceptHandoff?: (handoff: PendingHandoff) => void;
  compact?: boolean;
}

interface HAQResponsePackage {
  id: string;
  correspondenceType: string;
  applicationNumber: string;
  productName: string;
  questionCount: number;
  disciplines: string[];
  createdAt: string;
  createdBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  responses: {
    questionNumber: string;
    discipline: string;
    responseText: string;
    attachments?: string[];
  }[];
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

export function HAQHandoffPanel({ onAcceptHandoff, compact = false }: HAQHandoffPanelProps) {
  const pendingHandoffs = usePendingHandoffs('submissions');
  const acceptHandoff = useCrossModuleStore(s => s.acceptHandoff);
  const rejectHandoff = useCrossModuleStore(s => s.rejectHandoff);
  const currentDraft = useSequenceBuilderStore(s => s.currentDraft);
  const assignDocument = useSequenceBuilderStore(s => s.assignDocument);
  const [expandedHandoff, setExpandedHandoff] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Filter for HAQ-related handoffs
  const haqHandoffs = pendingHandoffs.filter(h => 
    h.type === 'haq-response-to-m1' || h.sourceModule === 'haq'
  );
  
  if (haqHandoffs.length === 0 && compact) {
    return null;
  }
  
  const handleAccept = async (handoff: PendingHandoff) => {
    setProcessingId(handoff.id);
    
    try {
      // Accept the handoff in cross-module store
      acceptHandoff(handoff.id);
      
      // If we have an active draft, assign the document to 1.12.1
      if (currentDraft) {
        const slot = currentDraft.documentSlots.find(s => s.sectionNumber === '1.12.1');
        if (slot) {
          assignDocument(slot.id, {
            id: handoff.sourceId,
            title: handoff.sourceTitle,
            sourceType: 'authoring',
            sourceId: handoff.sourceId,
          });
        }
      }
      
      // Callback for parent component
      onAcceptHandoff?.(handoff);
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleReject = (handoffId: string) => {
    rejectHandoff(handoffId);
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-accent-purple/10 border border-accent-purple/30 rounded-lg">
        <MessageSquare className="w-4 h-4 text-accent-purple" />
        <span className="text-sm text-text-primary">
          {haqHandoffs.length} HAQ response{haqHandoffs.length !== 1 ? 's' : ''} ready
        </span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>
    );
  }
  
  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-accent-purple/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-accent-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">HAQ Responses Ready</h3>
            <p className="text-xs text-text-muted">
              {haqHandoffs.length} package{haqHandoffs.length !== 1 ? 's' : ''} awaiting assignment to Module 1.12.1
            </p>
          </div>
        </div>
        {haqHandoffs.length > 0 && (
          <span className="px-2 py-1 text-xs font-medium bg-accent-purple/20 text-accent-purple rounded-full">
            {haqHandoffs.length} pending
          </span>
        )}
      </div>
      
      {/* Empty state */}
      {haqHandoffs.length === 0 && (
        <div className="p-8 text-center">
          <Package className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm text-text-secondary mb-1">No pending HAQ responses</p>
          <p className="text-xs text-text-muted">
            Package HAQ responses in the HAQ Intelligence module to send them here
          </p>
        </div>
      )}
      
      {/* Handoff list */}
      <div className="divide-y divide-border">
        {haqHandoffs.map(handoff => {
          const isExpanded = expandedHandoff === handoff.id;
          const isProcessing = processingId === handoff.id;
          const metadata = handoff.metadata as HAQResponsePackage | undefined;
          
          return (
            <div key={handoff.id} className="bg-surface">
              {/* Summary row */}
              <div 
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface-card transition-colors"
                onClick={() => setExpandedHandoff(isExpanded ? null : handoff.id)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isProcessing ? 'bg-accent-blue/20' : 'bg-surface-card'
                }`}>
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 text-text-muted" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {handoff.sourceTitle}
                    </span>
                    <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {handoff.targetSection || '1.12.1'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">
                      {metadata?.applicationNumber || 'Application'} • {metadata?.questionCount || 0} responses
                    </span>
                    {metadata?.disciplines && (
                      <div className="flex items-center gap-1">
                        {metadata.disciplines.slice(0, 3).map(d => (
                          <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded ${disciplineColors[d] || 'bg-slate-500/20 text-slate-400'}`}>
                            {d}
                          </span>
                        ))}
                        {metadata.disciplines.length > 3 && (
                          <span className="text-[10px] text-text-muted">+{metadata.disciplines.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAccept(handoff); }}
                    disabled={isProcessing}
                    className="p-2 bg-accent-green/10 text-accent-green rounded-lg hover:bg-accent-green/20 transition-colors disabled:opacity-50"
                    title="Accept and assign to 1.12.1"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReject(handoff.id); }}
                    disabled={isProcessing}
                    className="p-2 bg-surface-card text-text-muted rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>
              
              {/* Expanded details */}
              {isExpanded && metadata && (
                <div className="px-4 pb-4 bg-surface-card/50">
                  <div className="pl-11 space-y-3">
                    {/* Response preview */}
                    <div className="text-xs text-text-muted">
                      Preview of included responses:
                    </div>
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {metadata.responses?.slice(0, 5).map((resp, i) => (
                        <div key={i} className="p-2 bg-surface rounded-lg border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-text-primary">{resp.questionNumber}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${disciplineColors[resp.discipline] || 'bg-slate-500/20 text-slate-400'}`}>
                              {resp.discipline}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary line-clamp-2">{resp.responseText}</p>
                        </div>
                      ))}
                      {metadata.responses && metadata.responses.length > 5 && (
                        <p className="text-xs text-text-muted text-center py-2">
                          + {metadata.responses.length - 5} more responses
                        </p>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <button className="flex-1 py-2 text-xs bg-surface-card border border-border text-text-primary rounded-lg hover:bg-surface flex items-center justify-center gap-1.5">
                        <Eye className="w-3 h-3" />
                        Preview Full Package
                      </button>
                      <button 
                        onClick={() => handleAccept(handoff)}
                        disabled={isProcessing}
                        className="flex-1 py-2 text-xs bg-accent-green text-white rounded-lg hover:bg-accent-green/90 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        Add to Sequence
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Badge for showing count in nav
export function HAQHandoffBadge() {
  const pendingHandoffs = usePendingHandoffs('submissions');
  const haqCount = pendingHandoffs.filter(h => 
    h.type === 'haq-response-to-m1' || h.sourceModule === 'haq'
  ).length;
  
  if (haqCount === 0) return null;
  
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent-purple text-white rounded-full">
      {haqCount}
    </span>
  );
}
