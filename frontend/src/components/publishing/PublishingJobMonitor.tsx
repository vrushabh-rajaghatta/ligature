
// =============================================================================
// PUBLISHING JOB MONITOR - v0.9.13
// =============================================================================
// Real-time progress tracking for eCTD publishing jobs.
// =============================================================================

import React from 'react';
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Send,
  FileCheck,
  Package,
  Upload,
  Shield,
  AlertCircle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  useECTDPublishingStore,
  useActivePublishingJob,
  usePublishingJobList,
} from '@/store/useECTDPublishingStore';
import type { PublishingJob, PublishingJobStatus } from '@/store/ectd-publishing-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface PublishingJobMonitorProps {
  jobId?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onViewSequence?: (sequenceId: string) => void;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

interface StepConfig {
  label: string;
  icon: React.ReactNode;
}

const JOB_STEPS: StepConfig[] = [
  { label: 'Validating submission...', icon: <Shield className="w-5 h-5" /> },
  { label: 'Generating eCTD backbone...', icon: <FileCheck className="w-5 h-5" /> },
  { label: 'Packaging submission files...', icon: <Package className="w-5 h-5" /> },
  { label: 'Transmitting to gateway...', icon: <Upload className="w-5 h-5" /> },
  { label: 'Awaiting acknowledgement...', icon: <Clock className="w-5 h-5" /> },
];

const STATUS_TO_STEP: Record<PublishingJobStatus, number> = {
  'queued': -1,
  'validating': 0,
  'generating': 1,
  'packaging': 2,
  'transmitting': 3,
  'completed': 5,
  'failed': -1,
  'cancelled': -1,
};

function formatDuration(startTime: string, endTime?: string): string {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------

function ProgressStep({
  step,
  index,
  currentStep,
  isComplete,
}: {
  step: StepConfig;
  index: number;
  currentStep: number;
  isComplete: boolean;
}) {
  const isActive = index === currentStep;
  const isPast = index < currentStep || isComplete;
  
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-shrink-0 ${
        isPast ? 'text-green-500' : isActive ? 'text-accent-blue' : 'text-content-tertiary'
      }`}>
        {isPast ? (
          <CheckCircle className="w-5 h-5" />
        ) : isActive ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-current opacity-30" />
        )}
      </div>
      <span className={`text-sm ${
        isPast ? 'text-content-secondary' : isActive ? 'text-content-primary font-medium' : 'text-content-tertiary'
      }`}>
        {step.label}
      </span>
    </div>
  );
}

function JobHistoryItem({ job }: { job: PublishingJob }) {
  const isSuccess = job.status === 'completed';
  const isFailed = job.status === 'failed' || job.status === 'cancelled';
  
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-surface-secondary rounded-lg">
      {isSuccess ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : isFailed ? (
        <XCircle className="w-4 h-4 text-red-500" />
      ) : (
        <Clock className="w-4 h-4 text-amber-500" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-content-primary truncate">
          {job.targetGateway || 'Unknown Gateway'}
        </div>
        <div className="text-xs text-content-tertiary">
          {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Unknown date'}
        </div>
      </div>
      {job.gatewayResponse?.acknowledgementNumber && (
        <span className="text-xs font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded">
          {job.gatewayResponse.acknowledgementNumber}
        </span>
      )}
    </div>
  );
}

function CompletedJobView({ 
  job,
  onViewSequence,
  onNewJob,
}: { 
  job: PublishingJob;
  onViewSequence?: () => void;
  onNewJob?: () => void;
}) {
  const response = job.gatewayResponse;
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      
      <h2 className="text-xl font-semibold text-content-primary mb-2">
        Publishing Complete
      </h2>
      
      {response?.acknowledgementNumber && (
        <div className="my-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
          <div className="text-xs text-green-600 mb-1">Acknowledgement Number</div>
          <div className="text-2xl font-mono font-bold text-green-700">
            {response.acknowledgementNumber}
          </div>
        </div>
      )}
      
      <div className="w-full max-w-md space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b border-subtle">
          <span className="text-content-secondary">Gateway</span>
          <span className="text-content-primary font-medium">{response?.gateway || job.targetGateway}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-subtle">
          <span className="text-content-secondary">Transaction ID</span>
          <span className="text-content-primary font-mono text-xs">{response?.transactionId}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-subtle">
          <span className="text-content-secondary">Received</span>
          <span className="text-content-primary">
            {response?.receivedAt ? new Date(response.receivedAt).toLocaleString() : '-'}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-subtle">
          <span className="text-content-secondary">Status</span>
          <span className="text-green-600 font-medium capitalize">{response?.status}</span>
        </div>
      </div>
      
      {response?.messages && response.messages.length > 0 && (
        <div className="w-full max-w-md mt-6">
          <h4 className="text-sm font-medium text-content-secondary mb-2">Messages</h4>
          <div className="space-y-2">
            {response.messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-surface-secondary rounded text-sm">
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono text-xs text-content-tertiary">{msg.code}</span>
                  <p className="text-content-primary">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={onViewSequence}
          className="px-4 py-2 text-sm text-content-secondary hover:bg-surface-secondary rounded-lg transition-colors"
        >
          View Sequence
        </button>
        <button
          onClick={onNewJob}
          className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          New Publishing Job
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function PublishingJobMonitor({
  jobId,
  onCancel,
  onRetry,
  onViewSequence,
}: PublishingJobMonitorProps) {
  const activeJob = useActivePublishingJob();
  const allJobs = usePublishingJobList();
  const { cancelPublishingJob } = useECTDPublishingStore();
  
  const job = jobId 
    ? allJobs.find(j => j.id === jobId) 
    : activeJob;
  
  const completedJobs = allJobs
    .filter(j => j.status === 'completed' || j.status === 'failed')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);
  
  const handleCancel = () => {
    if (job) {
      cancelPublishingJob(job.id);
      onCancel?.();
    }
  };
  
  // Show completed view
  if (job?.status === 'completed') {
    return (
      <div className="h-full flex flex-col">
        <CompletedJobView 
          job={job}
          onViewSequence={() => onViewSequence?.(job.sequenceId)}
          onNewJob={() => {}}
        />
        
        {completedJobs.length > 1 && (
          <div className="border-t border-subtle p-4">
            <h3 className="text-sm font-medium text-content-secondary mb-2">Recent Jobs</h3>
            <div className="space-y-1">
              {completedJobs.filter(j => j.id !== job.id).map(j => (
                <JobHistoryItem key={j.id} job={j} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Show active job progress
  if (job) {
    const currentStep = STATUS_TO_STEP[job.status] ?? -1;
    
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div>
            <h2 className="font-semibold text-content-primary">
              Publishing Job - {job.targetGateway}
            </h2>
            <p className="text-sm text-content-secondary">
              Started: {job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : 'Pending'}
            </p>
          </div>
          {job.startedAt && (
            <div className="text-sm text-content-tertiary">
              Elapsed: {formatDuration(job.startedAt, job.completedAt)}
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Progress Bar */}
          <div className="w-full max-w-md mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-content-secondary">{job.currentStep}</span>
              <span className="text-sm font-medium text-content-primary">{job.progress}%</span>
            </div>
            <div className="h-3 bg-surface-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent-blue rounded-full transition-all duration-500"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
          
          {/* Steps */}
          <div className="w-full max-w-md space-y-4">
            {JOB_STEPS.map((step, i) => (
              <ProgressStep
                key={i}
                step={step}
                index={i}
                currentStep={currentStep}
                isComplete={job.status === 'completed'}
              />
            ))}
          </div>
          
          {/* Cancel Button */}
          {job.status !== 'failed' && job.status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              className="mt-8 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Cancel Job
            </button>
          )}
        </div>
        
        {completedJobs.length > 0 && (
          <div className="border-t border-subtle p-4">
            <h3 className="text-sm font-medium text-content-secondary mb-2">Recent Jobs</h3>
            <div className="space-y-1">
              {completedJobs.slice(0, 3).map(j => (
                <JobHistoryItem key={j.id} job={j} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // No active job
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <Send className="w-12 h-12 text-content-tertiary opacity-50 mb-4" />
      <h2 className="text-lg font-medium text-content-primary mb-2">No Active Publishing Job</h2>
      <p className="text-sm text-content-secondary mb-6">
        Select a sequence and start a publishing job to monitor progress
      </p>
      
      {completedJobs.length > 0 && (
        <div className="w-full max-w-md">
          <h3 className="text-sm font-medium text-content-secondary mb-2">Recent Jobs</h3>
          <div className="space-y-1 bg-surface-secondary rounded-lg p-2">
            {completedJobs.map(j => (
              <JobHistoryItem key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
