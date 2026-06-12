
// =============================================================================
// TRANSMISSION HISTORY PANEL - v0.9.16
// =============================================================================
// UI component for displaying transmission queue, active transmissions, and
// transmission history with acknowledgement tracking.
// =============================================================================


import React, { useState, useMemo } from 'react';
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronRight,
  Package,
  Activity,
  Loader2,
  ExternalLink,
  Filter,
  Search,
  MoreVertical,
  Play,
  StopCircle,
  RotateCcw,
  Eye,
} from 'lucide-react';

import {
  useGatewayStore,
  useTransmissionList,
  useActiveTransmission,
  useQueuedTransmissions,
  useTransmission,
  type TransmissionRecord,
} from '@/services/gateway/useGatewayStore';

import {
  TransmissionStatus,
  GatewayAcknowledgement,
  GATEWAY_REGISTRY,
} from '@/services/gateway/gateway-connector-types';

// =============================================================================
// TYPES
// =============================================================================

interface TransmissionHistoryPanelProps {
  className?: string;
  maxItems?: number;
  showQueue?: boolean;
  showFilters?: boolean;
  onTransmissionSelect?: (transmissionId: string) => void;
}

type FilterStatus = 'all' | 'queued' | 'active' | 'completed' | 'failed';

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_CONFIG: Record<TransmissionStatus, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  queued: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Queued',
  },
  preparing: {
    icon: <Package className="w-4 h-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    label: 'Preparing',
  },
  uploading: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Uploading',
  },
  transmitted: {
    icon: <Send className="w-4 h-4" />,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100',
    label: 'Transmitted',
  },
  acknowledged: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    label: 'Acknowledged',
  },
  accepted: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Accepted',
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    label: 'Rejected',
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Failed',
  },
  timeout: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Timeout',
  },
  cancelled: {
    icon: <StopCircle className="w-4 h-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Cancelled',
  },
};

const REGION_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  EU: '🇪🇺',
  JP: '🇯🇵',
  CA: '🇨🇦',
  AU: '🇦🇺',
  CH: '🇨🇭',
};

// =============================================================================
// PROGRESS BAR COMPONENT
// =============================================================================

interface ProgressBarProps {
  progress: number;
  status: TransmissionStatus;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
  const isActive = ['preparing', 'uploading', 'transmitted'].includes(status);
  
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${
          status === 'failed' || status === 'rejected' ? 'bg-red-500' :
          status === 'acknowledged' || status === 'accepted' ? 'bg-green-500' :
          'bg-blue-500'
        } ${isActive ? 'animate-pulse' : ''}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// =============================================================================
// ACKNOWLEDGEMENT LIST COMPONENT
// =============================================================================

interface AcknowledgementListProps {
  acknowledgements: GatewayAcknowledgement[];
}

const AcknowledgementList: React.FC<AcknowledgementListProps> = ({ acknowledgements }) => {
  if (acknowledgements.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No acknowledgements received yet</p>
    );
  }
  
  return (
    <div className="space-y-2">
      {acknowledgements.map((ack) => (
        <div
          key={ack.id}
          className={`flex items-start gap-3 p-2 rounded text-sm ${
            ack.status === 'success' ? 'bg-green-50' :
            ack.status === 'error' ? 'bg-red-50' :
            ack.status === 'warning' ? 'bg-yellow-50' :
            'bg-gray-50'
          }`}
        >
          <div className={`mt-0.5 ${
            ack.status === 'success' ? 'text-green-500' :
            ack.status === 'error' ? 'text-red-500' :
            ack.status === 'warning' ? 'text-yellow-500' :
            'text-gray-500'
          }`}>
            {ack.status === 'success' && <CheckCircle className="w-4 h-4" />}
            {ack.status === 'error' && <XCircle className="w-4 h-4" />}
            {ack.status === 'warning' && <AlertTriangle className="w-4 h-4" />}
            {ack.status === 'pending' && <Clock className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{ack.originalType}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 text-xs">
                {new Date(ack.receivedAt).toLocaleString()}
              </span>
            </div>
            {ack.trackingNumber && (
              <p className="text-xs text-gray-600 mt-0.5">
                Tracking: <span className="font-mono">{ack.trackingNumber}</span>
              </p>
            )}
            {ack.messages.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {ack.messages.slice(0, 3).map((msg, i) => (
                  <p key={i} className="text-xs text-gray-600">{msg.message}</p>
                ))}
              </div>
            )}
            {ack.nextExpectedAck && (
              <p className="text-xs text-blue-600 mt-1">
                Next: {ack.nextExpectedAck.type} (expected within {ack.nextExpectedAck.expectedWithin})
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// TRANSMISSION ROW COMPONENT
// =============================================================================

interface TransmissionRowProps {
  transmission: TransmissionRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onViewDetails: () => void;
}

const TransmissionRow: React.FC<TransmissionRowProps> = ({
  transmission,
  isExpanded,
  onToggle,
  onRetry,
  onCancel,
  onViewDetails,
}) => {
  const statusConfig = STATUS_CONFIG[transmission.status];
  const gatewayMeta = GATEWAY_REGISTRY[transmission.gatewayId];
  const isActive = ['preparing', 'uploading', 'transmitted'].includes(transmission.status);
  const canRetry = ['failed', 'timeout', 'rejected'].includes(transmission.status);
  const canCancel = ['queued', 'preparing'].includes(transmission.status);
  
  return (
    <div className="border rounded-lg bg-white">
      {/* Main Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        {/* Expand Icon */}
        <button className="text-gray-400">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
        
        {/* Status */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusConfig.bgColor}`}>
          <span className={statusConfig.color}>{statusConfig.icon}</span>
          <span className={`text-xs font-medium ${statusConfig?.color ?? ''}`}>
            {statusConfig.label}
          </span>
        </div>
        
        {/* Application Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{REGION_FLAGS[gatewayMeta.region]}</span>
            <span className="font-medium text-gray-900">
              {transmission.applicationNumber}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">Seq {transmission.sequenceNumber}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <span>{gatewayMeta.displayName}</span>
            <span>•</span>
            <span>{transmission.submissionType}</span>
            <span>•</span>
            <span>{(transmission.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
          </div>
        </div>
        
        {/* Progress (if active) */}
        {isActive && transmission.progress && (
          <div className="w-32">
            <ProgressBar
              progress={transmission.progress.progressPercent}
              status={transmission.status}
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              {transmission.progress.progressPercent}%
            </p>
          </div>
        )}
        
        {/* Timestamp */}
        <div className="text-right text-xs text-gray-500">
          <p>{new Date(transmission.createdAt).toLocaleDateString()}</p>
          <p>{new Date(transmission.createdAt).toLocaleTimeString()}</p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
              title="Retry"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {canCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
              title="Cancel"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onViewDetails}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Details */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Transmission Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <span className="ml-2 font-mono text-xs">{transmission.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Environment:</span>
                    <span className="ml-2">{transmission.environment}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Initiated By:</span>
                    <span className="ml-2">{transmission.initiatedBy}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Attempts:</span>
                    <span className="ml-2">{transmission.attemptCount}</span>
                  </div>
                  {transmission.startedAt && (
                    <div>
                      <span className="text-gray-500">Started:</span>
                      <span className="ml-2">{new Date(transmission.startedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {transmission.completedAt && (
                    <div>
                      <span className="text-gray-500">Completed:</span>
                      <span className="ml-2">{new Date(transmission.completedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Details */}
              {transmission.progress && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Progress</h4>
                  <div className="text-sm">
                    <p className="text-gray-600">{transmission.progress.currentStep}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {(transmission.progress.bytesTransmitted / 1024 / 1024).toFixed(2)} MB of{' '}
                      {(transmission.progress.totalBytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
              
              {/* Result Details */}
              {transmission.result && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Result</h4>
                  <div className="text-sm space-y-1">
                    {transmission.result.gatewayTrackingNumber && (
                      <p>
                        <span className="text-gray-500">Tracking:</span>
                        <span className="ml-2 font-mono">{transmission.result.gatewayTrackingNumber}</span>
                      </p>
                    )}
                    {transmission.result.durationMs && (
                      <p>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2">{(transmission.result.durationMs / 1000).toFixed(1)}s</span>
                      </p>
                    )}
                    {transmission.result.error && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                        <p className="font-medium">{transmission.result.error.code}</p>
                        <p>{transmission.result.error.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Column - Acknowledgements */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Acknowledgements ({transmission.acknowledgements.length})
              </h4>
              <AcknowledgementList acknowledgements={transmission.acknowledgements} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// QUEUE SUMMARY COMPONENT
// =============================================================================

interface QueueSummaryProps {
  queuedCount: number;
  activeCount: number;
  completedToday: number;
  failedToday: number;
}

const QueueSummary: React.FC<QueueSummaryProps> = ({
  queuedCount,
  activeCount,
  completedToday,
  failedToday,
}) => (
  <div className="grid grid-cols-4 gap-4 mb-6">
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-gray-600 mb-1">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">Queued</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{queuedCount}</p>
    </div>
    <div className="bg-blue-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-blue-600 mb-1">
        <Activity className="w-4 h-4" />
        <span className="text-sm font-medium">Active</span>
      </div>
      <p className="text-2xl font-semibold text-blue-900">{activeCount}</p>
    </div>
    <div className="bg-green-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-green-600 mb-1">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Completed Today</span>
      </div>
      <p className="text-2xl font-semibold text-green-900">{completedToday}</p>
    </div>
    <div className="bg-red-50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-600 mb-1">
        <XCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Failed Today</span>
      </div>
      <p className="text-2xl font-semibold text-red-900">{failedToday}</p>
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TransmissionHistoryPanel: React.FC<TransmissionHistoryPanelProps> = ({
  className = '',
  maxItems = 50,
  showQueue = true,
  showFilters = true,
  onTransmissionSelect,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const transmissions = useTransmissionList();
  const activeTransmission = useActiveTransmission();
  const queuedTransmissions = useQueuedTransmissions();
  const { retryTransmission, cancelTransmission } = useGatewayStore();
  
  // Filter transmissions
  const filteredTransmissions = useMemo(() => {
    let filtered = transmissions;
    
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'queued') {
        filtered = filtered.filter(t => t.status === 'queued');
      } else if (filterStatus === 'active') {
        filtered = filtered.filter(t => ['preparing', 'uploading', 'transmitted'].includes(t.status));
      } else if (filterStatus === 'completed') {
        filtered = filtered.filter(t => ['acknowledged', 'accepted'].includes(t.status));
      } else if (filterStatus === 'failed') {
        filtered = filtered.filter(t => ['failed', 'rejected', 'timeout', 'cancelled'].includes(t.status));
      }
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.applicationNumber.toLowerCase().includes(query) ||
        t.sequenceNumber.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        t.submissionType.toLowerCase().includes(query)
      );
    }
    
    return filtered.slice(0, maxItems);
  }, [transmissions, filterStatus, searchQuery, maxItems]);
  
  // Calculate summary stats
  const today = new Date().toDateString();
  const stats = useMemo(() => ({
    queuedCount: queuedTransmissions.length,
    activeCount: activeTransmission ? 1 : 0,
    completedToday: transmissions.filter(t => 
      ['acknowledged', 'accepted'].includes(t.status) &&
      t.completedAt && new Date(t.completedAt).toDateString() === today
    ).length,
    failedToday: transmissions.filter(t =>
      ['failed', 'rejected', 'timeout'].includes(t.status) &&
      t.completedAt && new Date(t.completedAt).toDateString() === today
    ).length,
  }), [transmissions, queuedTransmissions, activeTransmission, today]);
  
  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  const handleRetry = async (id: string) => {
    try {
      await retryTransmission(id);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };
  
  const handleCancel = async (id: string) => {
    try {
      await cancelTransmission(id);
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };
  
  const handleViewDetails = (id: string) => {
    onTransmissionSelect?.(id);
  };
  
  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Transmission History</h2>
          <p className="text-sm text-gray-500">
            {filteredTransmissions.length} of {transmissions.length} transmissions
          </p>
        </div>
      </div>
      
      {/* Queue Summary */}
      {showQueue && (
        <QueueSummary
          queuedCount={stats.queuedCount}
          activeCount={stats.activeCount}
          completedToday={stats.completedToday}
          failedToday={stats.failedToday}
        />
      )}
      
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by application, sequence, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'queued', 'active', 'completed', 'failed'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Transmission List */}
      <div className="space-y-3">
        {filteredTransmissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No transmissions found</p>
            <p className="text-sm">Transmissions will appear here when you submit to gateways</p>
          </div>
        ) : (
          filteredTransmissions.map((transmission) => (
            <TransmissionRow
              key={transmission.id}
              transmission={transmission}
              isExpanded={expandedId === transmission.id}
              onToggle={() => handleToggle(transmission.id)}
              onRetry={() => handleRetry(transmission.id)}
              onCancel={() => handleCancel(transmission.id)}
              onViewDetails={() => handleViewDetails(transmission.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TransmissionHistoryPanel;
