
/**
 * Gateway Submission Panel
 * Simulates regulatory gateway submission workflow with ACK flow
 * 
 * Phase 2.1f: Gateway Submission Simulation
 * Version: 0.13.32
 */


import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Send, CheckCircle, AlertTriangle, Clock, X, Check, 
  Loader2, RefreshCw, Globe, Server, FileCode, Download,
  ChevronDown, ChevronUp, Wifi, WifiOff, AlertCircle,
  ArrowRight, Building, Shield, History, Copy, ExternalLink,
  ToggleLeft, ToggleRight, Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { E2BFormState } from '@/lib/safety-api';
import type { SubmissionType } from '@/types/publishing';

// =============================================================================
// TYPES
// =============================================================================

interface Gateway {
  id: string;
  name: string;
  fullName: string;
  flag: string;
  region: string;
  endpoint: string;
  protocol: string;
  ackFlow: string[];
}

interface SubmissionStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  timestamp?: string;
  message?: string;
}

interface AckMessage {
  type: string;
  status: 'success' | 'warning' | 'error';
  code: string;
  message: string;
  timestamp: string;
  details?: string[];
}

interface GatewaySubmission {
  id: string;
  gateway: Gateway;
  safetyReportId: string;
  messageId: string;
  status: 'queued' | 'transmitting' | 'awaiting-ack' | 'complete' | 'failed';
  steps: SubmissionStep[];
  ackMessages: AckMessage[];
  startTime: string;
  endTime?: string;
  xmlSize: number;
}

interface GatewaySubmissionPanelProps {
  // E2B submission mode (safety case submission)
  formState?: E2BFormState;
  selectedGatewayIds?: string[];
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  caseNumber?: string;
  // eCTD submission mode (publishing view)
  projectId?: string;
  applicationNumber?: string;
  sequenceNumber?: string;
  submissionType?: SubmissionType;
  productName?: string;
  region?: 'US' | 'EU' | 'Japan' | 'Canada' | 'China';
  onStatusChange?: (status: string) => void;
  onGatewaySelect?: (gateway: string) => void;
}

// =============================================================================
// GATEWAY CONFIGURATIONS
// =============================================================================

const GATEWAY_CONFIG: Record<string, Gateway> = {
  fda: {
    id: 'fda',
    name: 'FDA ESG',
    fullName: 'FDA Electronic Submissions Gateway',
    flag: '🇺🇸',
    region: 'US',
    endpoint: 'https://esg.fda.gov/receive',
    protocol: 'AS2',
    ackFlow: ['ACK1', 'ACK2', 'ACK3'],
  },
  ema: {
    id: 'ema',
    name: 'EudraVigilance',
    fullName: 'EMA EudraVigilance Gateway (EVWEB)',
    flag: '🇪🇺',
    region: 'EU',
    endpoint: 'https://eudravigilance.ema.europa.eu/gateway',
    protocol: 'ESTRI',
    ackFlow: ['ACK', 'MDN'],
  },
  pmda: {
    id: 'pmda',
    name: 'PMDA',
    fullName: 'Pharmaceuticals and Medical Devices Agency',
    flag: '🇯🇵',
    region: 'JP',
    endpoint: 'https://www.pmda.go.jp/gateway',
    protocol: 'AS2',
    ackFlow: ['ACK1', 'ACK2'],
  },
  hc: {
    id: 'hc',
    name: 'Health Canada',
    fullName: 'Canada Vigilance Program Gateway',
    flag: '🇨🇦',
    region: 'CA',
    endpoint: 'https://cvp-pcv.hc-sc.gc.ca/gateway',
    protocol: 'AS2',
    ackFlow: ['ACK1', 'ACK2'],
  },
  tga: {
    id: 'tga',
    name: 'TGA',
    fullName: 'Therapeutic Goods Administration',
    flag: '🇦🇺',
    region: 'AU',
    endpoint: 'https://www.tga.gov.au/gateway',
    protocol: 'AS2',
    ackFlow: ['ACK1', 'ACK2'],
  },
};

// ACK message templates
const ACK_TEMPLATES: Record<string, Record<string, { success: AckMessage; error: AckMessage }>> = {
  fda: {
    ACK1: {
      success: {
        type: 'ACK1',
        status: 'success',
        code: 'MA',
        message: 'Message received and queued for processing',
        timestamp: '',
        details: ['File integrity verified', 'Digital signature validated', 'Message queued successfully'],
      },
      error: {
        type: 'ACK1',
        status: 'error',
        code: 'MR',
        message: 'Message rejected - transmission error',
        timestamp: '',
        details: ['Invalid AS2 headers', 'Connection timeout after 3 retries'],
      },
    },
    ACK2: {
      success: {
        type: 'ACK2',
        status: 'success',
        code: 'CA',
        message: 'Content accepted - XML validates against E2B(R3) schema',
        timestamp: '',
        details: ['Schema validation passed', 'Business rules validated', 'Case number assigned'],
      },
      error: {
        type: 'ACK2',
        status: 'error',
        code: 'CR',
        message: 'Content rejected - validation errors',
        timestamp: '',
        details: ['Invalid MedDRA version', 'Missing required element: primarysourcecountry'],
      },
    },
    ACK3: {
      success: {
        type: 'ACK3',
        status: 'success',
        code: 'PA',
        message: 'Processing complete - case loaded into FAERS',
        timestamp: '',
        details: ['FAERS Case ID: USA-FAERS-2025-001234', 'Processing time: 2.3 seconds'],
      },
      error: {
        type: 'ACK3',
        status: 'warning',
        code: 'PW',
        message: 'Processing complete with warnings',
        timestamp: '',
        details: ['Duplicate case detected - merged with existing record', 'Case assigned for manual review'],
      },
    },
  },
  ema: {
    ACK: {
      success: {
        type: 'ACK',
        status: 'success',
        code: 'EVA',
        message: 'Message accepted by EudraVigilance',
        timestamp: '',
        details: ['E2B(R3) validation passed', 'Case registered in EVDAS'],
      },
      error: {
        type: 'ACK',
        status: 'error',
        code: 'EVR',
        message: 'Message rejected by EudraVigilance',
        timestamp: '',
        details: ['Organisation ID not registered', 'Certificate validation failed'],
      },
    },
    MDN: {
      success: {
        type: 'MDN',
        status: 'success',
        code: 'MDN-OK',
        message: 'Disposition notification received',
        timestamp: '',
        details: ['ICSR successfully processed', 'EU Reference: EU-EC-2025-001234'],
      },
      error: {
        type: 'MDN',
        status: 'error',
        code: 'MDN-ERR',
        message: 'Processing error in EudraVigilance',
        timestamp: '',
        details: ['Database write error', 'Case held in pending queue'],
      },
    },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function GatewaySubmissionPanel({
  formState,
  selectedGatewayIds = [],
  isOpen = true,
  onClose = () => {},
  onComplete = () => {},
  caseNumber,
  // eCTD mode props (unused in this component for now)
  projectId,
  applicationNumber,
  sequenceNumber,
  submissionType,
  productName,
  region,
  onStatusChange,
  onGatewaySelect,
}: GatewaySubmissionPanelProps) {
  // State
  const [submissions, setSubmissions] = useState<GatewaySubmission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'preview' | 'submitting' | 'complete'>('preview');
  const [simulateError, setSimulateError] = useState(false);
  const [errorGateway, setErrorGateway] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  // Get selected gateways - use region-based default for eCTD mode
  const effectiveGatewayIds = selectedGatewayIds.length > 0 
    ? selectedGatewayIds 
    : (region === 'EU' ? ['ema'] : region === 'Japan' ? ['pmda'] : ['fda']);
  const selectedGateways = effectiveGatewayIds
    .map(id => GATEWAY_CONFIG[id])
    .filter(Boolean);

  // Generate IDs
  const generateMessageId = () => `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const generateSafetyReportId = () => `SR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // Initialize submissions
  const initializeSubmissions = useCallback(() => {
    const messageId = generateMessageId();
    const safetyReportId = generateSafetyReportId();
    
    const newSubmissions: GatewaySubmission[] = selectedGateways.map(gateway => ({
      id: `${gateway.id}-${Date.now()}`,
      gateway,
      safetyReportId,
      messageId,
      status: 'queued',
      steps: [
        { id: 'validate', name: 'Validate XML', status: 'pending' },
        { id: 'queue', name: 'Queue for Transmission', status: 'pending' },
        { id: 'transmit', name: 'Transmit to Gateway', status: 'pending' },
        { id: 'ack', name: 'Receive Acknowledgments', status: 'pending' },
      ],
      ackMessages: [],
      startTime: new Date().toISOString(),
      xmlSize: Math.floor(Math.random() * 5000) + 8000, // 8-13KB typical
    }));
    
    setSubmissions(newSubmissions);
    return newSubmissions;
  }, [selectedGateways]);

  // Simulate submission workflow
  const simulateSubmission = useCallback(async () => {
    setIsSubmitting(true);
    setCurrentPhase('submitting');
    
    const subs = initializeSubmissions();
    
    // Process each gateway sequentially for visual effect
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      const isErrorTarget = simulateError && (errorGateway === sub.gateway.id || (!errorGateway && i === 0));
      
      // Step 1: Validate
      await new Promise(resolve => setTimeout(resolve, 800));
      setSubmissions(prev => prev.map(s => 
        s.id === sub.id 
          ? { ...s, steps: s.steps.map(step => 
              step.id === 'validate' 
                ? { ...step, status: 'complete', timestamp: new Date().toISOString(), message: 'XML schema validation passed' }
                : step.id === 'queue' 
                  ? { ...step, status: 'active' }
                  : step
            )}
          : s
      ));

      // Step 2: Queue
      await new Promise(resolve => setTimeout(resolve, 600));
      setSubmissions(prev => prev.map(s => 
        s.id === sub.id 
          ? { ...s, status: 'transmitting', steps: s.steps.map(step => 
              step.id === 'queue' 
                ? { ...step, status: 'complete', timestamp: new Date().toISOString(), message: 'Added to transmission queue' }
                : step.id === 'transmit' 
                  ? { ...step, status: 'active' }
                  : step
            )}
          : s
      ));

      // Step 3: Transmit
      await new Promise(resolve => setTimeout(resolve, 1200));
      setSubmissions(prev => prev.map(s => 
        s.id === sub.id 
          ? { ...s, status: 'awaiting-ack', steps: s.steps.map(step => 
              step.id === 'transmit' 
                ? { ...step, status: 'complete', timestamp: new Date().toISOString(), message: `Transmitted via ${sub.gateway.protocol}` }
                : step.id === 'ack' 
                  ? { ...step, status: 'active' }
                  : step
            )}
          : s
      ));

      // Step 4: ACK Flow
      const ackFlow = sub.gateway.ackFlow;
      const templates = ACK_TEMPLATES[sub.gateway.id] || ACK_TEMPLATES.fda;
      
      for (let j = 0; j < ackFlow.length; j++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const ackType = ackFlow[j];
        const template = templates[ackType] || templates.ACK1;
        const shouldError = isErrorTarget && j === ackFlow.length - 1;
        
        const ack: AckMessage = {
          ...(shouldError ? template.error : template.success),
          timestamp: new Date().toISOString(),
        };
        
        setSubmissions(prev => prev.map(s => 
          s.id === sub.id 
            ? { 
                ...s, 
                ackMessages: [...s.ackMessages, ack],
                status: shouldError && ack.status === 'error' ? 'failed' : s.status,
              }
            : s
        ));
        
        if (shouldError && ack.status === 'error') {
          break;
        }
      }

      // Complete
      setSubmissions(prev => prev.map(s => 
        s.id === sub.id 
          ? { 
              ...s, 
              status: s.status === 'failed' ? 'failed' : 'complete',
              endTime: new Date().toISOString(),
              steps: s.steps.map(step => 
                step.id === 'ack' 
                  ? { 
                      ...step, 
                      status: s.status === 'failed' ? 'error' : 'complete', 
                      timestamp: new Date().toISOString(),
                      message: s.status === 'failed' ? 'Acknowledgment failed' : 'All acknowledgments received'
                    }
                  : step
              )
            }
          : s
      ));
    }
    
    setIsSubmitting(false);
    setCurrentPhase('complete');
  }, [initializeSubmissions, simulateError, errorGateway]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSubmissions([]);
      setCurrentPhase('preview');
      setIsSubmitting(false);
      setSimulateError(false);
      setErrorGateway(null);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearTimeout(simulationRef.current);
      }
    };
  }, []);

  // Calculate totals
  const successCount = submissions.filter(s => s.status === 'complete').length;
  const failedCount = submissions.filter(s => s.status === 'failed').length;
  const pendingCount = submissions.filter(s => !['complete', 'failed'].includes(s.status)).length;

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      title="Gateway Submission" 
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header with status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              currentPhase === 'complete' 
                ? failedCount > 0 
                  ? 'bg-accent-amber/20' 
                  : 'bg-accent-green/20'
                : 'bg-accent-purple/20'
            }`}>
              {currentPhase === 'submitting' ? (
                <Loader2 className="w-6 h-6 text-accent-purple animate-spin" />
              ) : currentPhase === 'complete' ? (
                failedCount > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-accent-amber" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-accent-green" />
                )
              ) : (
                <Send className="w-6 h-6 text-accent-purple" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">
                {currentPhase === 'preview' && 'Ready to Submit'}
                {currentPhase === 'submitting' && 'Submitting to Gateways...'}
                {currentPhase === 'complete' && (failedCount > 0 ? 'Submission Complete with Errors' : 'Submission Successful')}
              </h3>
              <p className="text-sm text-text-muted">
                {currentPhase === 'preview' && `${selectedGateways.length} gateway${selectedGateways.length > 1 ? 's' : ''} selected`}
                {currentPhase === 'submitting' && `Processing ${pendingCount} of ${submissions.length}...`}
                {currentPhase === 'complete' && `${successCount} succeeded, ${failedCount} failed`}
              </p>
            </div>
          </div>
          
          {/* Demo toggle */}
          {currentPhase === 'preview' && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSimulateError(!simulateError)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  simulateError 
                    ? 'bg-accent-red/10 text-accent-red border border-accent-red/30' 
                    : 'bg-surface-card text-text-muted border border-border hover:border-accent-red/30'
                }`}
              >
                {simulateError ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                Simulate Error
              </button>
            </div>
          )}
        </div>

        {/* Preview Phase - Gateway Selection Summary */}
        {currentPhase === 'preview' && (
          <>
            {/* Selected Gateways */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text-secondary">Selected Gateways</h4>
              <div className="grid grid-cols-1 gap-3">
                {selectedGateways.map(gateway => (
                  <div 
                    key={gateway.id}
                    className={`p-4 rounded-lg border ${
                      simulateError && (errorGateway === gateway.id || (!errorGateway && gateway.id === selectedGateways[0]?.id))
                        ? 'bg-accent-red/5 border-accent-red/30'
                        : 'bg-surface-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{gateway.flag}</span>
                        <div>
                          <div className="font-medium text-text-primary">{gateway.name}</div>
                          <div className="text-xs text-text-muted">{gateway.fullName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge color="blue" size="sm">{gateway.protocol}</Badge>
                        <div className="text-xs text-text-muted mt-1">
                          {gateway.ackFlow.join(' → ')}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Globe className="w-3 h-3" />
                        <code className="bg-surface-elevated px-2 py-0.5 rounded">{gateway.endpoint}</code>
                      </div>
                    </div>
                    {simulateError && (
                      <div className="mt-2">
                        <button
                          onClick={() => setErrorGateway(errorGateway === gateway.id ? null : gateway.id)}
                          className={`text-xs px-2 py-1 rounded ${
                            errorGateway === gateway.id || (!errorGateway && gateway.id === selectedGateways[0]?.id)
                              ? 'bg-accent-red/20 text-accent-red'
                              : 'bg-surface-elevated text-text-muted hover:bg-surface-card'
                          }`}
                        >
                          {errorGateway === gateway.id || (!errorGateway && gateway.id === selectedGateways[0]?.id) 
                            ? '⚠️ Will simulate error' 
                            : 'Click to simulate error here'
                          }
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submission Info */}
            <div className="bg-surface-elevated rounded-lg p-4 border border-border">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Case Number</div>
                  <div className="font-medium text-text-primary">{caseNumber || formState?.senderReportId || applicationNumber || 'Not assigned'}</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Report Type</div>
                  <div className="font-medium text-text-primary">{formState?.reportType || submissionType || 'Initial'}</div>
                </div>
                <div>
                  <div className="text-text-muted text-xs uppercase tracking-wide mb-1">Seriousness</div>
                  <Badge color={formState?.seriousness === 'serious' ? 'red' : 'green'} size="sm">
                    {formState?.seriousness || 'Non-serious'}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Submitting/Complete Phase - Progress View */}
        {(currentPhase === 'submitting' || currentPhase === 'complete') && (
          <div className="space-y-4">
            {submissions.map(sub => (
              <div 
                key={sub.id}
                className={`rounded-lg border overflow-hidden ${
                  sub.status === 'complete' 
                    ? 'border-accent-green/30 bg-accent-green/5'
                    : sub.status === 'failed'
                      ? 'border-accent-red/30 bg-accent-red/5'
                      : 'border-border bg-surface-card'
                }`}
              >
                {/* Gateway Header */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-elevated/50 transition-colors"
                  onClick={() => setExpandedSubmission(expandedSubmission === sub.id ? null : sub.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{sub.gateway.flag}</span>
                    <div>
                      <div className="font-medium text-text-primary flex items-center gap-2">
                        {sub.gateway.name}
                        {sub.status === 'complete' && <CheckCircle className="w-4 h-4 text-accent-green" />}
                        {sub.status === 'failed' && <X className="w-4 h-4 text-accent-red" />}
                        {sub.status === 'transmitting' && <Loader2 className="w-4 h-4 text-accent-purple animate-spin" />}
                        {sub.status === 'awaiting-ack' && <Clock className="w-4 h-4 text-accent-amber animate-pulse" />}
                      </div>
                      <div className="text-xs text-text-muted">
                        {sub.status === 'complete' && `Completed in ${Math.round((new Date(sub.endTime!).getTime() - new Date(sub.startTime).getTime()) / 1000)}s`}
                        {sub.status === 'failed' && 'Submission failed'}
                        {sub.status === 'transmitting' && 'Transmitting...'}
                        {sub.status === 'awaiting-ack' && 'Awaiting acknowledgment...'}
                        {sub.status === 'queued' && 'Queued'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      color={
                        sub.status === 'complete' ? 'green' :
                        sub.status === 'failed' ? 'red' :
                        'amber'
                      } 
                      size="sm"
                    >
                      {sub.status}
                    </Badge>
                    {expandedSubmission === sub.id ? (
                      <ChevronUp className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedSubmission === sub.id && (
                  <div className="border-t border-border">
                    {/* Progress Steps */}
                    <div className="p-4 bg-surface-elevated/30">
                      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        <Zap className="w-3 h-3" />
                        Workflow Progress
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.steps.map((step, idx) => (
                          <div key={step.id} className="flex items-center">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                              step.status === 'complete' 
                                ? 'bg-accent-green/10 text-accent-green' 
                                : step.status === 'active'
                                  ? 'bg-accent-purple/10 text-accent-purple'
                                  : step.status === 'error'
                                    ? 'bg-accent-red/10 text-accent-red'
                                    : 'bg-surface-card text-text-muted'
                            }`}>
                              {step.status === 'complete' && <Check className="w-3 h-3" />}
                              {step.status === 'active' && <Loader2 className="w-3 h-3 animate-spin" />}
                              {step.status === 'error' && <X className="w-3 h-3" />}
                              {step.status === 'pending' && <Clock className="w-3 h-3" />}
                              {step.name}
                            </div>
                            {idx < sub.steps.length - 1 && (
                              <ArrowRight className={`w-4 h-4 mx-1 ${
                                step.status === 'complete' ? 'text-accent-green' : 'text-border'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ACK Messages */}
                    {sub.ackMessages.length > 0 && (
                      <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                          <Server className="w-3 h-3" />
                          Acknowledgment Flow
                        </div>
                        <div className="space-y-2">
                          {sub.ackMessages.map((ack, idx) => (
                            <div 
                              key={idx}
                              className={`p-3 rounded-lg border ${
                                ack.status === 'success' 
                                  ? 'bg-accent-green/5 border-accent-green/20'
                                  : ack.status === 'warning'
                                    ? 'bg-accent-amber/5 border-accent-amber/20'
                                    : 'bg-accent-red/5 border-accent-red/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    color={ack.status === 'success' ? 'green' : ack.status === 'warning' ? 'amber' : 'red'} 
                                    size="sm"
                                  >
                                    {ack.type}
                                  </Badge>
                                  <span className="text-xs font-mono text-text-muted">{ack.code}</span>
                                </div>
                                <span className="text-xs text-text-muted">
                                  {new Date(ack.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-text-primary">{ack.message}</p>
                              {ack.details && ack.details.length > 0 && (
                                <ul className="mt-2 space-y-0.5">
                                  {ack.details.map((detail, dIdx) => (
                                    <li key={dIdx} className="text-xs text-text-muted flex items-start gap-1">
                                      <span className={
                                        ack.status === 'success' ? 'text-accent-green' : 
                                        ack.status === 'warning' ? 'text-accent-amber' : 
                                        'text-accent-red'
                                      }>•</span>
                                      {detail}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="p-4 border-t border-border bg-surface-elevated/30">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-text-muted uppercase tracking-wide mb-1">Message ID</div>
                          <div className="font-mono text-text-primary">{sub.messageId}</div>
                        </div>
                        <div>
                          <div className="text-text-muted uppercase tracking-wide mb-1">Safety Report ID</div>
                          <div className="font-mono text-text-primary">{sub.safetyReportId}</div>
                        </div>
                        <div>
                          <div className="text-text-muted uppercase tracking-wide mb-1">XML Size</div>
                          <div className="text-text-primary">{(sub.xmlSize / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-text-muted">
            {currentPhase === 'complete' && (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Submission logged to audit trail
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentPhase === 'preview' && (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={simulateSubmission}
                  className="bg-accent-green hover:bg-accent-green/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit to Gateway{selectedGateways.length > 1 ? 's' : ''}
                </Button>
              </>
            )}
            {currentPhase === 'submitting' && (
              <Button variant="secondary" disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </Button>
            )}
            {currentPhase === 'complete' && (
              <>
                <Button variant="secondary" onClick={() => {
                  setCurrentPhase('preview');
                  setSubmissions([]);
                }}>
                  Submit Again
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    onComplete();
                    onClose();
                  }}
                >
                  Done
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default GatewaySubmissionPanel;
