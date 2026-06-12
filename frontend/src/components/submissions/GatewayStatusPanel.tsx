

import { useState, useEffect, useMemo } from 'react';
import {
  Send, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw,
  ChevronRight, ChevronDown, ExternalLink, Globe, Shield,
  FileText, Activity, Zap, Info, ArrowRight, RotateCw
} from 'lucide-react';
import {
  GatewayService,
  GatewayType,
  GatewayAcknowledgment,
  SubmissionPackage,
  SubmissionTimeline,
  TimelineEvent,
  AcknowledgmentType,
  FDA_ESG_ACKNOWLEDGMENTS,
  EMA_CESP_ACKNOWLEDGMENTS,
  gatewayService,
} from '@/services/gateway-service';
import { SubmissionStatus } from '@/types/publishing';
import { useSimplePublishingSync } from '@/store/usePublishingSync';

interface GatewayStatusPanelProps {
  projectId: string;
  applicationNumber: string;
  sequenceNumber: string;
  submissionType: string;
  /** v39: Portfolio sequence ID for status sync */
  portfolioSequenceId?: string;
  /** v39: Draft ID for submissions store sync */
  draftId?: string;
  onStatusChange?: (status: SubmissionStatus) => void;
}

const gatewayOptions: { value: GatewayType; label: string; region: string }[] = [
  { value: 'fda-esg', label: 'FDA ESG', region: 'United States' },
  { value: 'ema-cesp', label: 'EMA CESP', region: 'European Union' },
  { value: 'hc-ctr', label: 'Health Canada CTR', region: 'Canada' },
  { value: 'pmda-gateway', label: 'PMDA Gateway', region: 'Japan' },
];

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  success: { color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: <CheckCircle className="w-4 h-4" /> },
  warning: { color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: <AlertTriangle className="w-4 h-4" /> },
  error: { color: 'text-red-400', bgColor: 'bg-red-500/20', icon: <XCircle className="w-4 h-4" /> },
  pending: { color: 'text-text-muted', bgColor: 'bg-surface-card', icon: <Clock className="w-4 h-4" /> },
};

const ackSteps: Record<GatewayType, AcknowledgmentType[]> = {
  'fda-esg': ['TA1', 'TA2', 'ACK1', 'ACK2', 'ACK3'],
  'ema-cesp': ['CESP-RECEIPT', 'CESP-ACCEPT'],
  'hc-ctr': ['RECEIVED', 'VALIDATED', 'ACCEPTED'],
  'pmda-gateway': ['RECEIVED', 'VALIDATED', 'ACCEPTED'],
};

export function GatewayStatusPanel({
  projectId,
  applicationNumber,
  sequenceNumber,
  submissionType,
  portfolioSequenceId,
  draftId,
  onStatusChange,
}: GatewayStatusPanelProps) {
  const [selectedGateway, setSelectedGateway] = useState<GatewayType>('fda-esg');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [acknowledgments, setAcknowledgments] = useState<GatewayAcknowledgment[]>([]);
  const [timeline, setTimeline] = useState<SubmissionTimeline | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [expandedAck, setExpandedAck] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  // v39: Publishing sync hook for automatic status updates
  const { onPublishingComplete, onAcknowledged } = useSimplePublishingSync(
    portfolioSequenceId || null,
    sequenceNumber
  );

  // Current status
  const currentStatus = useMemo(() => {
    if (!submissionId) return 'draft';
    return gatewayService.getSubmissionStatus(submissionId);
  }, [submissionId, acknowledgments]);

  // Which acknowledgments we have
  const receivedAckTypes = useMemo(() => {
    return new Set(acknowledgments.map(a => a.type));
  }, [acknowledgments]);

  // Simulate submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const pkg: SubmissionPackage = {
      id: `sub-${Date.now()}`,
      projectId,
      sequenceNumber,
      applicationNumber,
      submissionType,
      gateway: selectedGateway,
      fileName: `${sequenceNumber}.zip`,
      fileSize: 150 * 1024 * 1024,
      checksum: 'abc123def456',
      checksumType: 'md5',
      submittedAt: new Date().toISOString(),
      submittedBy: 'Current User',
    };

    try {
      const result = await gatewayService.submitToGateway(pkg, {
        gateway: selectedGateway,
        environment: 'test',
      });

      setSubmissionId(result.submissionId);
      setAcknowledgments(result.acknowledgments);
      setTimeline(gatewayService.getTimeline(result.submissionId) || null);
      
      const newStatus = gatewayService.getSubmissionStatus(result.submissionId);
      onStatusChange?.(newStatus);
      
      // v39: Sync to portfolio sequence
      if (result.success && portfolioSequenceId) {
        const trackingNumber = result.acknowledgments[0]?.parsedData.trackingNumber || result.trackingNumber;
        const gatewayLabel = gatewayOptions.find(g => g.value === selectedGateway)?.label || selectedGateway;
        onPublishingComplete(trackingNumber, gatewayLabel);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll for new acknowledgments
  const pollForAcknowledgments = async () => {
    if (!submissionId || isPolling) return;
    
    setIsPolling(true);
    try {
      const newAcks = await gatewayService.pollAcknowledgments(submissionId);
      if (newAcks.length > 0) {
        const allAcks = gatewayService.getAcknowledgments(submissionId);
        setAcknowledgments(allAcks);
        setTimeline(gatewayService.getTimeline(submissionId) || null);
        
        const newStatus = gatewayService.getSubmissionStatus(submissionId);
        onStatusChange?.(newStatus);
        
        // v39: Check if we received final acknowledgment (ACK3 or CESP-ACCEPT)
        if (portfolioSequenceId) {
          const hasFinalAck = newAcks.some(ack => 
            ack.type === 'ACK3' || 
            ack.type === 'CESP-ACCEPT' ||
            ack.type === 'ACCEPTED'
          );
          if (hasFinalAck) {
            const finalAck = newAcks.find(ack => 
              ack.type === 'ACK3' || 
              ack.type === 'CESP-ACCEPT' ||
              ack.type === 'ACCEPTED'
            );
            onAcknowledged(finalAck?.receivedAt?.split('T')[0]);
          }
        }
      }
    } finally {
      setIsPolling(false);
    }
  };

  // Get acknowledgment info
  const getAckInfo = (type: AcknowledgmentType) => {
    if (selectedGateway === 'fda-esg' && type in FDA_ESG_ACKNOWLEDGMENTS) {
      return FDA_ESG_ACKNOWLEDGMENTS[type as keyof typeof FDA_ESG_ACKNOWLEDGMENTS];
    }
    if (selectedGateway === 'ema-cesp' && type in EMA_CESP_ACKNOWLEDGMENTS) {
      return EMA_CESP_ACKNOWLEDGMENTS[type as keyof typeof EMA_CESP_ACKNOWLEDGMENTS];
    }
    return { name: type, description: '', expectedWithin: 'Unknown' };
  };

  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Gateway Submission</h3>
            <p className="text-xs text-text-muted">
              {applicationNumber} • Sequence {sequenceNumber}
            </p>
          </div>
        </div>
        
        {submissionId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Tracking:</span>
            <code className="text-xs bg-surface-card px-2 py-1 rounded font-mono">
              {acknowledgments[0]?.parsedData.trackingNumber || submissionId}
            </code>
          </div>
        )}
      </div>

      {/* Gateway Selection (only if not submitted) */}
      {!submissionId && (
        <div className="p-4 border-b border-border">
          <label className="text-xs text-text-muted mb-2 block">Select Gateway</label>
          <div className="grid grid-cols-2 gap-2">
            {gatewayOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedGateway(option.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedGateway === option.value
                    ? 'border-accent-purple bg-accent-purple/10'
                    : 'border-border hover:border-border-hover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${
                    selectedGateway === option.value ? 'text-accent-purple' : 'text-text-muted'
                  }`} />
                  <span className="text-sm font-medium text-text-primary">{option.label}</span>
                </div>
                <span className="text-xs text-text-muted">{option.region}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-4 w-full py-3 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit to Gateway'}
          </button>
        </div>
      )}

      {/* Acknowledgment Progress */}
      {submissionId && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-primary">Acknowledgment Progress</span>
            <button
              onClick={pollForAcknowledgments}
              disabled={isPolling}
              className="text-xs text-accent-blue hover:text-accent-blue/80 flex items-center gap-1"
            >
              <RotateCw className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`} />
              Check for updates
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-1">
            {ackSteps[selectedGateway].map((step, idx) => {
              const ack = acknowledgments.find(a => a.type === step);
              const isReceived = receivedAckTypes.has(step);
              const isError = ack?.status === 'error';
              const config = isError ? statusConfig.error : 
                           isReceived ? statusConfig.success : 
                           statusConfig.pending;
              
              return (
                <div key={step} className="flex-1 flex items-center">
                  <div className={`flex-1 flex flex-col items-center p-2 rounded-lg ${config.bgColor}`}>
                    <span className={config.color}>{config.icon}</span>
                    <span className="text-xs font-medium mt-1">{step}</span>
                    {ack && (
                      <span className="text-[10px] text-text-muted">
                        {new Date(ack.receivedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {idx < ackSteps[selectedGateway].length - 1 && (
                    <ArrowRight className="w-4 h-4 text-text-muted mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Next Expected */}
          {acknowledgments.length > 0 && currentStatus !== 'acknowledged' && currentStatus !== 'rejected' && (
            <div className="mt-3 p-2 bg-surface-card rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-muted" />
              <span className="text-xs text-text-muted">
                Next: <span className="text-text-secondary">
                  {acknowledgments[acknowledgments.length - 1]?.parsedData.nextExpectedAck || 'Awaiting response'}
                </span>
                {acknowledgments[acknowledgments.length - 1]?.parsedData.estimatedResponseTime && (
                  <span className="text-text-muted">
                    {' '}• Expected within {acknowledgments[acknowledgments.length - 1]?.parsedData.estimatedResponseTime}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Acknowledgment Details */}
      {acknowledgments.length > 0 && (
        <div className="divide-y divide-border">
          {acknowledgments.map(ack => {
            const config = statusConfig[ack.status];
            const info = getAckInfo(ack.type);
            const isExpanded = expandedAck === ack.id;
            
            return (
              <div key={ack.id} className="bg-surface">
                <div 
                  className="p-3 flex items-center gap-3 cursor-pointer hover:bg-surface-card transition-colors"
                  onClick={() => setExpandedAck(isExpanded ? null : ack.id)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                    <span className={config.color}>{config.icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{info.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config?.color ?? ''}`}>
                        {ack.status}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted">
                      {new Date(ack.receivedAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-surface-card/50">
                    <div className="text-xs text-text-secondary mb-2">{info.description}</div>
                    
                    {/* Errors */}
                    {ack.errors.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <span className="text-xs font-medium text-red-400">Errors ({ack.errors.length})</span>
                        {ack.errors.map((err, idx) => (
                          <div key={idx} className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-red-400">{err.code}</span>
                              <span className={`text-xs px-1 py-0.5 rounded ${
                                err.severity === 'fatal' ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {err.severity}
                              </span>
                            </div>
                            <p className="text-sm text-text-primary mt-1">{err.message}</p>
                            {err.location && (
                              <p className="text-xs text-text-muted mt-1">Location: {err.location}</p>
                            )}
                            {err.rule && (
                              <p className="text-xs text-text-muted">Rule: {err.rule}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Parsed Data */}
                    {Object.keys(ack.parsedData).length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs font-medium text-text-muted">Details</span>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          {Object.entries(ack.parsedData).map(([key, value]) => (
                            value && (
                              <div key={key} className="text-xs">
                                <span className="text-text-muted">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                <span className="text-text-secondary">{String(value)}</span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline Toggle */}
      {timeline && timeline.events.length > 0 && (
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full flex items-center justify-between text-sm text-text-secondary hover:text-text-primary"
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Submission Timeline
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showTimeline ? 'rotate-180' : ''}`} />
          </button>
          
          {showTimeline && (
            <div className="mt-3 space-y-3">
              {timeline.events.map((event, idx) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${
                      event.type === 'error' ? 'bg-red-400' :
                      event.type === 'submitted' ? 'bg-accent-blue' :
                      'bg-accent-green'
                    }`} />
                    {idx < timeline.events.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="text-sm text-text-primary">{event.title}</div>
                    <div className="text-xs text-text-muted">{event.description}</div>
                    <div className="text-xs text-text-muted mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!submissionId && !isSubmitting && (
        <div className="p-6 text-center border-t border-border">
          <Info className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs text-text-muted">
            Select a gateway and submit when ready
          </p>
        </div>
      )}
    </div>
  );
}
