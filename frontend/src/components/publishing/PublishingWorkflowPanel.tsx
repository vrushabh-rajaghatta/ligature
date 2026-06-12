

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
  Send,
  FileCheck,
  Link2,
  Code,
  Package,
  Globe,
  Settings,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Timer,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { ECTDDocument } from '@/types/ectd';
import { RegionalSpec } from '@/services/ectd-pdf-validator';
import { GatewayType } from '@/services/gateway-service';
import {
  publishingOrchestrator,
  PublishingWorkflowState,
  PublishingWorkflowConfig,
  WorkflowStep,
  WorkflowStepId,
  WorkflowEvent,
  SubmissionEnvelope,
} from '@/services/publishing-orchestrator';

interface PublishingWorkflowPanelProps {
  documents: ECTDDocument[];
  applicationNumber: string;
  sequenceNumber: string;
  submissionType: string;
  companyName?: string;
  region?: RegionalSpec;
  onComplete?: (workflow: PublishingWorkflowState) => void;
  onCancel?: () => void;
}

// Step icons mapping
const STEP_ICONS: Record<WorkflowStepId, React.ReactNode> = {
  'pdf-validation': <FileCheck className="w-4 h-4" />,
  'hyperlink-detection': <Link2 className="w-4 h-4" />,
  'hyperlink-linking': <Link2 className="w-4 h-4" />,
  'hyperlink-validation': <Check className="w-4 h-4" />,
  'backbone-generation': <Code className="w-4 h-4" />,
  'backbone-validation': <FileCheck className="w-4 h-4" />,
  'package-creation': <Package className="w-4 h-4" />,
  'gateway-submission': <Globe className="w-4 h-4" />,
};

export function PublishingWorkflowPanel({
  documents,
  applicationNumber,
  sequenceNumber,
  submissionType,
  companyName = 'Sponsor Company',
  region = 'FDA',
  onComplete,
  onCancel,
}: PublishingWorkflowPanelProps) {
  // State
  const [workflow, setWorkflow] = useState<PublishingWorkflowState | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<WorkflowEvent[]>([]);
  const [showConfig, setShowConfig] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  // Configuration state
  const [selectedRegions, setSelectedRegions] = useState<RegionalSpec[]>([region]);
  const [autoLinkConfidence, setAutoLinkConfidence] = useState(70);
  const [submitToGateway, setSubmitToGateway] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<GatewayType>('fda-esg');
  const [stopOnError, setStopOnError] = useState(true);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Create workflow configuration
  const createConfig = useCallback((): PublishingWorkflowConfig => {
    const envelope: SubmissionEnvelope = {
      submissionId: `sub-${Date.now()}`,
      sequenceNumber,
      submissionType,
      submissionSubType: undefined,
      applicationType: applicationNumber.startsWith('NDA') ? 'NDA' : 
                       applicationNumber.startsWith('BLA') ? 'BLA' : 'IND',
      applicationNumber,
      companyName,
    };

    return {
      regions: selectedRegions,
      autoLinkMinConfidence: autoLinkConfidence,
      envelope,
      regionalInfo: selectedRegions.includes('FDA') ? {
        region: 'us',
        productName: 'Product Name',
        manufacturerName: companyName,
      } : undefined,
      submitToGateway,
      gateway: submitToGateway ? selectedGateway : undefined,
      stopOnError,
      skipOptionalOnWarning: false,
      parallelValidation: false,
    };
  }, [selectedRegions, autoLinkConfidence, submitToGateway, selectedGateway, stopOnError, 
      applicationNumber, sequenceNumber, submissionType, companyName]);

  // Start workflow
  const startWorkflow = useCallback(async () => {
    const config = createConfig();
    const newWorkflow = publishingOrchestrator.createWorkflow(
      `Publish ${applicationNumber} Seq ${sequenceNumber}`,
      config
    );

    setWorkflow(newWorkflow);
    setShowConfig(false);
    setLogs([]);

    // Subscribe to events
    const unsubscribe = publishingOrchestrator.subscribe(newWorkflow.id, (event) => {
      setLogs(prev => [...prev, event]);
      
      // Update workflow state
      const updated = publishingOrchestrator.getWorkflow(newWorkflow.id);
      if (updated) {
        setWorkflow({ ...updated });
      }
    });

    try {
      const result = await publishingOrchestrator.executeWorkflow(newWorkflow.id, documents);
      setWorkflow({ ...result });
      
      if (result.status === 'completed' && onComplete) {
        onComplete(result);
      }
    } finally {
      unsubscribe();
    }
  }, [createConfig, applicationNumber, sequenceNumber, documents, onComplete]);

  // Cancel workflow
  const cancelWorkflow = useCallback(() => {
    if (workflow) {
      publishingOrchestrator.cancelWorkflow(workflow.id);
      onCancel?.();
    }
  }, [workflow, onCancel]);

  // Retry step
  const retryStep = useCallback(async (stepId: WorkflowStepId) => {
    if (!workflow) return;
    
    const result = await publishingOrchestrator.retryStep(workflow.id, stepId, documents);
    if (result) {
      const updated = publishingOrchestrator.getWorkflow(workflow.id);
      if (updated) {
        setWorkflow({ ...updated });
      }
    }
  }, [workflow, documents]);

  // Toggle step expansion
  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  // Get status color
  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return 'text-accent-green';
      case 'running': return 'text-accent-blue';
      case 'failed': return 'text-accent-red';
      case 'warning': return 'text-accent-amber';
      case 'skipped': return 'text-text-muted';
      default: return 'text-text-muted';
    }
  };

  // Get status icon
  const getStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
      case 'running': return <Loader2 className="w-4 h-4 text-accent-blue animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4 text-accent-red" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-accent-amber" />;
      case 'skipped': return <X className="w-4 h-4 text-text-muted" />;
      default: return <Clock className="w-4 h-4 text-text-muted" />;
    }
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  // Render configuration panel
  const renderConfig = () => (
    <div className="space-y-6">
      {/* Regions */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Target Regions
        </label>
        <div className="flex flex-wrap gap-2">
          {(['FDA', 'EMA', 'HC', 'PMDA', 'ICH'] as RegionalSpec[]).map(reg => (
            <button
              key={reg}
              onClick={() => {
                setSelectedRegions(prev => 
                  prev.includes(reg) 
                    ? prev.filter(r => r !== reg)
                    : [...prev, reg]
                );
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedRegions.includes(reg)
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-card text-text-secondary hover:text-text-primary'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>

      {/* Hyperlink Confidence */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Auto-Link Confidence Threshold: {autoLinkConfidence}%
        </label>
        <input
          type="range"
          min={50}
          max={95}
          value={autoLinkConfidence}
          onChange={(e) => setAutoLinkConfidence(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>More links (lower accuracy)</span>
          <span>Fewer links (higher accuracy)</span>
        </div>
      </div>

      {/* Gateway Submission */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={submitToGateway}
            onChange={(e) => setSubmitToGateway(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-sm font-medium text-text-primary">
            Submit to Gateway after completion
          </span>
        </label>
        
        {submitToGateway && (
          <div className="mt-3 ml-7">
            <select
              value={selectedGateway}
              onChange={(e) => setSelectedGateway(e.target.value as GatewayType)}
              className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
            >
              <option value="fda-esg">FDA ESG (Electronic Submissions Gateway)</option>
              <option value="ema-cesp">EMA CESP (Common European Submission Portal)</option>
              <option value="hc-ctr">Health Canada CTR</option>
              <option value="pmda-gateway">PMDA Gateway</option>
            </select>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="border-t border-border pt-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={stopOnError}
            onChange={(e) => setStopOnError(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-sm text-text-secondary">
            Stop workflow on critical errors
          </span>
        </label>
      </div>

      {/* Summary */}
      <div className="bg-surface-card rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
          <Info className="w-4 h-4 text-accent-blue" />
          Workflow Summary
        </div>
        <div className="space-y-1 text-sm text-text-secondary">
          <p>• {documents.length} documents to process</p>
          <p>• {documents.filter(d => d.fileType === 'pdf').length} PDFs to validate</p>
          <p>• Target: {selectedRegions.join(', ')}</p>
          {submitToGateway && <p>• Will submit to {selectedGateway}</p>}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={startWorkflow}
        disabled={documents.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Zap className="w-5 h-5" />
        Start Publishing Workflow
      </button>
    </div>
  );

  // Render workflow progress
  const renderProgress = () => {
    if (!workflow) return null;

    const completedSteps = workflow.steps.filter(s => s.status === 'completed').length;
    const totalSteps = workflow.steps.filter(s => s.status !== 'skipped').length;
    const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Overall Progress */}
        <div className="bg-surface-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {workflow.status === 'running' ? (
                <Loader2 className="w-5 h-5 text-accent-blue animate-spin" />
              ) : workflow.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-accent-green" />
              ) : workflow.status === 'failed' ? (
                <XCircle className="w-5 h-5 text-accent-red" />
              ) : (
                <Clock className="w-5 h-5 text-text-muted" />
              )}
              <span className="font-medium text-text-primary">
                {workflow.status === 'running' ? 'Processing...' :
                 workflow.status === 'completed' ? 'Complete' :
                 workflow.status === 'failed' ? 'Failed' :
                 workflow.status === 'cancelled' ? 'Cancelled' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-text-secondary">
                <Timer className="w-4 h-4" />
                {formatDuration(workflow.totalDuration)}
              </span>
              <span className="text-text-primary font-medium">
                {overallProgress}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                workflow.status === 'failed' ? 'bg-accent-red' :
                workflow.status === 'completed' ? 'bg-accent-green' :
                'bg-accent-blue'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-text-secondary">
              <FileText className="w-4 h-4" />
              {workflow.documentsProcessed}/{workflow.totalDocuments} docs
            </span>
            {workflow.errorsFound > 0 && (
              <span className="flex items-center gap-1 text-accent-red">
                <XCircle className="w-4 h-4" />
                {workflow.errorsFound} errors
              </span>
            )}
            {workflow.warningsFound > 0 && (
              <span className="flex items-center gap-1 text-accent-amber">
                <AlertCircle className="w-4 h-4" />
                {workflow.warningsFound} warnings
              </span>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {workflow.steps.map((step, index) => (
            <div 
              key={step.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                step.status === 'running' ? 'border-accent-blue bg-accent-blue/5' :
                step.status === 'failed' ? 'border-accent-red/30 bg-accent-red/5' :
                'border-border bg-surface-card'
              }`}
            >
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface text-text-muted text-xs font-medium">
                  {index + 1}
                </span>
                
                <span className={`${getStatusColor(step.status)}`}>
                  {STEP_ICONS[step.id]}
                </span>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary text-sm">
                      {step.name}
                    </span>
                    {step.isOptional && (
                      <span className="text-xs text-text-muted">(optional)</span>
                    )}
                  </div>
                  {step.status === 'running' && step.progress !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent-blue transition-all"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted">{step.progress}%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {step.duration && (
                    <span className="text-xs text-text-muted">
                      {formatDuration(step.duration)}
                    </span>
                  )}
                  {getStatusIcon(step.status)}
                  {expandedSteps.has(step.id) ? (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  )}
                </div>
              </button>

              {/* Step Details */}
              {expandedSteps.has(step.id) && (
                <div className="px-3 pb-3 pt-0 border-t border-border">
                  <p className="text-sm text-text-secondary mb-2">
                    {step.description}
                  </p>
                  
                  {step.result && (
                    <div className="space-y-2">
                      <div className={`text-sm ${
                        step.result.success ? 'text-text-primary' : 'text-accent-red'
                      }`}>
                        {step.result.summary}
                      </div>
                      
                      {step.result.warnings && step.result.warnings.length > 0 && (
                        <div className="text-xs text-accent-amber">
                          {step.result.warnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {w}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {step.result.errors && step.result.errors.length > 0 && (
                        <div className="text-xs text-accent-red">
                          {step.result.errors.map((e, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {e}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {step.status === 'failed' && step.canRetry && workflow.status !== 'running' && (
                    <button
                      onClick={() => retryStep(step.id)}
                      className="mt-2 flex items-center gap-1 text-xs text-accent-blue hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry this step
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {workflow.status === 'running' && (
            <button
              onClick={cancelWorkflow}
              className="flex items-center gap-2 px-4 py-2 bg-surface-card text-text-secondary rounded-lg text-sm hover:text-text-primary transition-colors"
            >
              <Square className="w-4 h-4" />
              Cancel
            </button>
          )}
          
          {workflow.status === 'completed' && workflow.backboneFiles && (
            <button
              onClick={() => {
                // In real impl, would download the package
                /* Download package action */
              }}
              className="flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg text-sm hover:bg-accent-green/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Package
            </button>
          )}

          {(workflow.status === 'completed' || workflow.status === 'failed') && (
            <button
              onClick={() => {
                setWorkflow(null);
                setShowConfig(true);
                setLogs([]);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-surface-card text-text-secondary rounded-lg text-sm hover:text-text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Start New Workflow
            </button>
          )}
        </div>

        {/* Logs Toggle */}
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          {showLogs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {showLogs ? 'Hide' : 'Show'} Activity Log ({logs.length})
        </button>

        {/* Logs */}
        {showLogs && (
          <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto text-xs font-mono">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-slate-500 flex-shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className={`${
                  log.type.includes('failed') ? 'text-red-400' :
                  log.type.includes('completed') ? 'text-green-400' :
                  log.type.includes('progress') ? 'text-blue-400' :
                  'text-slate-300'
                }`}>
                  [{log.type}] {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Publishing Workflow
          </h2>
          <p className="text-sm text-text-secondary">
            {applicationNumber} • Sequence {sequenceNumber}
          </p>
        </div>
        
        {workflow && workflow.status === 'idle' && (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg hover:bg-surface-card transition-colors"
          >
            <Settings className="w-5 h-5 text-text-muted" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {showConfig && !workflow ? renderConfig() : renderProgress()}
      </div>
    </div>
  );
}
