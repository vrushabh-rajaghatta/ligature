

import { useState, useMemo, useCallback } from 'react';
import {
  MessageSquare, Check, X, ChevronDown, ChevronUp, FileText, Clock,
  Package, ShieldCheck, User, Calendar, AlertCircle, Eye, 
  Link2, ArrowRight, Fingerprint, CheckCircle, Users, Building2,
  Info, ExternalLink
} from 'lucide-react';
import { useCrossModuleStore, PendingHandoff } from '@/store/useCrossModuleStore';
import { useHAQCorrespondenceBridge, processHAQHandoffToCorrespondence } from '@/store/useHAQCorrespondenceBridge';
import { useSequenceBuilderStore } from '@/store/useSequenceBuilderStore';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

interface HAQHandoffReceiverProps {
  applicationId?: string;
  sequenceId?: string;
  targetSection?: string; // Filter to specific section (e.g., '1.12.1')
  onAccept?: (handoffId: string, packageId: string) => void;
}

interface SignatureInfo {
  type: string;
  signedBy: string;
  signedAt: string;
}

// ============================================================================
// COLOR MAPS
// ============================================================================

const handoffStatusColorMap: Record<string, BadgeColor> = {
  pending: 'amber',
  accepted: 'green',
  rejected: 'red',
  expired: 'slate',
};

const disciplineColorMap: Record<string, BadgeColor> = {
  CMC: 'green',
  Clinical: 'blue',
  Nonclinical: 'purple',
  Biometrics: 'teal',
  Pharmacology: 'amber',
  Labeling: 'pink',
  Administrative: 'slate',
  Safety: 'red',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function HAQHandoffReceiver({
  applicationId,
  sequenceId,
  targetSection = '1.12.1',
  onAccept,
}: HAQHandoffReceiverProps) {
  const toast = useToast();
  
  // Stores
  const pendingHandoffs = useCrossModuleStore(s => s.pendingHandoffs);
  const acceptHandoff = useCrossModuleStore(s => s.acceptHandoff);
  const rejectHandoff = useCrossModuleStore(s => s.rejectHandoff);
  const markNotificationRead = useCrossModuleStore(s => s.markNotificationRead);
  const notifications = useCrossModuleStore(s => s.notifications);
  // Local state
  const [expandedHandoffs, setExpandedHandoffs] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectionReason, setShowRejectionReason] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Filter handoffs for HAQ responses targeting submissions module
  const haqHandoffs = useMemo(() => {
    return pendingHandoffs.filter(h => 
      h.type === 'haq-response-to-m1' &&
      h.targetModule === 'submissions' &&
      h.status === 'pending' &&
      (!targetSection || h.targetSection === targetSection)
    );
  }, [pendingHandoffs, targetSection]);
  
  // Toggle expansion
  const toggleExpand = useCallback((id: string) => {
    setExpandedHandoffs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  // Accept handoff and integrate into sequence
  const handleAccept = useCallback(async (handoff: PendingHandoff) => {
    setProcessingId(handoff.id);
    
    try {
      // Convert handoff to correspondence package
      const result = processHAQHandoffToCorrespondence(handoff.id, 'current-user');
      
      if (result.success && result.packageId) {
        // Mark any related notifications as read
        const relatedNotifications = notifications.filter(
          n => n.sourceModule === 'haq'
        );
        relatedNotifications.forEach(n => markNotificationRead(n.id));
        
        toast.success('HAQ response package integrated successfully');
        
        if (onAccept) {
          onAccept(handoff.id, result.packageId);
        }
      } else {
        toast.error(result.errors?.[0] || 'Failed to process handoff');
      }
    } catch (error) {
      toast.error('Error processing handoff');
      console.error(error);
    }
    
    setProcessingId(null);
  }, [notifications, markNotificationRead, onAccept, toast]);
  
  // Reject handoff
  const handleReject = useCallback(async (handoffId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setProcessingId(handoffId);
    
    try {
      rejectHandoff(handoffId);
      toast.warning('HAQ response package rejected');
      setShowRejectionReason(null);
      setRejectionReason('');
    } catch (error) {
      toast.error('Error rejecting handoff');
    }
    
    setProcessingId(null);
  }, [rejectionReason, rejectHandoff, toast]);
  
  if (haqHandoffs.length === 0) {
    return null; // Don't render if no pending handoffs
  }
  
  return (
    <div className="bg-accent-amber/5 border border-accent-amber/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-accent-amber/10 border-b border-accent-amber/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent-amber" />
          <span className="text-sm font-medium text-text-primary">
            Incoming HAQ Responses
          </span>
          <Badge color="amber" size="xs">{haqHandoffs.length}</Badge>
        </div>
        <span className="text-xs text-text-muted">
          Ready for integration into Module 1.12.1
        </span>
      </div>
      
      {/* Handoff List */}
      <div className="divide-y divide-border">
        {haqHandoffs.map(handoff => {
          const isExpanded = expandedHandoffs.has(handoff.id);
          const isProcessing = processingId === handoff.id;
          const metadata = handoff.metadata || {};
          const signatures: SignatureInfo[] = metadata.signatureChain || [];
          const responses = metadata.responses || [];
          
          return (
            <div key={handoff.id} className="bg-surface">
              {/* Handoff Header */}
              <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface-card transition-colors"
                onClick={() => toggleExpand(handoff.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-accent-blue" />
                    <span className="text-sm font-medium text-text-primary truncate">
                      {handoff.sourceTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span>{metadata.applicationNumber || 'Unknown'}</span>
                    <span>•</span>
                    <span>{metadata.questionCount || 0} question(s)</span>
                    <span>•</span>
                    <span>{new Date(handoff.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Discipline Tags */}
                <div className="flex items-center gap-1">
                  {(metadata.disciplines || []).slice(0, 3).map((d: string) => (
                    <Badge key={d} color={disciplineColorMap[d] || 'slate'} size="xs">
                      {d}
                    </Badge>
                  ))}
                  {(metadata.disciplines?.length || 0) > 3 && (
                    <Badge color="slate" size="xs">
                      +{(metadata.disciplines?.length || 0) - 3}
                    </Badge>
                  )}
                </div>
                
                {/* Signature Status */}
                {signatures.length > 0 && (
                  <div className="flex items-center gap-1 text-accent-green">
                    <Fingerprint className="w-4 h-4" />
                    <span className="text-xs">{signatures.length}</span>
                  </div>
                )}
                
                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </div>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Package Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-surface-card rounded-lg">
                      <div className="flex items-center gap-2 text-text-muted mb-1">
                        <Building2 className="w-3 h-3" />
                        <span className="text-xs">Application</span>
                      </div>
                      <div className="text-sm font-medium text-text-primary">
                        {metadata.applicationNumber || 'Unknown'}
                      </div>
                      <div className="text-xs text-text-muted">
                        {metadata.productName || 'Unknown Product'}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-surface-card rounded-lg">
                      <div className="flex items-center gap-2 text-text-muted mb-1">
                        <MessageSquare className="w-3 h-3" />
                        <span className="text-xs">Correspondence</span>
                      </div>
                      <div className="text-sm font-medium text-text-primary">
                        {(metadata.correspondenceType || 'IR Response').replace(/-/g, ' ')}
                      </div>
                      <div className="text-xs text-text-muted">
                        {metadata.questionCount || 0} question(s)
                      </div>
                    </div>
                    
                    <div className="p-3 bg-surface-card rounded-lg">
                      <div className="flex items-center gap-2 text-text-muted mb-1">
                        <FileText className="w-3 h-3" />
                        <span className="text-xs">Target Section</span>
                      </div>
                      <div className="text-sm font-medium text-text-primary">
                        Module 1.12.1
                      </div>
                      <div className="text-xs text-text-muted">
                        Response to Questions
                      </div>
                    </div>
                  </div>
                  
                  {/* Responses Preview */}
                  {responses.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-2">
                        Response Summary
                      </div>
                      <div className="space-y-2 max-h-40 overflow-auto">
                        {responses.slice(0, 5).map((r: Record<string, unknown>, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-surface-card rounded text-xs">
                            <span className="font-medium text-text-primary shrink-0">
                              {r.questionNumber as React.ReactNode}
                            </span>
                            <Badge color={disciplineColorMap[r.discipline as string] || 'slate'} size="xs">
                              {r.discipline as React.ReactNode}
                            </Badge>
                            <span className="text-text-muted truncate flex-1">
                              {r.responseText?.toString().substring(0, 100)}...
                            </span>
                          </div>
                        ))}
                        {responses.length > 5 && (
                          <div className="text-xs text-text-muted text-center py-1">
                            + {responses.length - 5} more response(s)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Signature Chain */}
                  {signatures.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-accent-green" />
                        21 CFR Part 11 Signatures
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {signatures.map((sig: SignatureInfo, i: number) => (
                          <div 
                            key={i} 
                            className="flex items-center gap-2 px-2 py-1 bg-accent-green/10 border border-accent-green/20 rounded text-xs"
                          >
                            <CheckCircle className="w-3 h-3 text-accent-green" />
                            <span className="text-text-secondary">{sig.type}:</span>
                            <span className="text-text-primary font-medium">{sig.signedBy}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* QC Status */}
                  {metadata.qcResult && (
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldCheck className={`w-4 h-4 ${
                        metadata.qcResult === 'passed' ? 'text-accent-green' :
                        metadata.qcResult === 'passed-with-warnings' ? 'text-accent-amber' :
                        'text-red-500'
                      }`} />
                      <span className="text-text-secondary">QC Validation:</span>
                      <Badge 
                        color={
                          metadata.qcResult === 'passed' ? 'green' :
                          metadata.qcResult === 'passed-with-warnings' ? 'amber' : 'red'
                        } 
                        size="xs"
                      >
                        {metadata.qcResult.replace(/-/g, ' ')}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Rejection Reason Input */}
                  {showRejectionReason === handoff.id && (
                    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg space-y-2">
                      <div className="text-xs font-medium text-red-400">Rejection Reason</div>
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Please provide a reason for rejecting this package..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-red-500"
                        rows={2}
                      />
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                      onClick={e => {
                        e.stopPropagation();
                        // Would open HAQ module to view source
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View in HAQ Module
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {showRejectionReason === handoff.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowRejectionReason(null);
                              setRejectionReason('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReject(handoff.id)}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          >
                            <X className="w-4 h-4" />
                            Confirm Rejection
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRejectionReason(handoff.id);
                            }}
                            disabled={isProcessing}
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(handoff);
                            }}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <>Processing...</>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Accept & Integrate
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Info Footer */}
      <div className="px-4 py-2 bg-surface-card border-t border-border flex items-center gap-2 text-xs text-text-muted">
        <Info className="w-3 h-3" />
        <span>Accepting will integrate the response package into Section 1.12.1 of the current sequence</span>
      </div>
    </div>
  );
}

export default HAQHandoffReceiver;
