
// =============================================================================
// GATEWAY AUDIT TRAIL PANEL - v0.9.16
// =============================================================================
// UI component for viewing, filtering, and exporting 21 CFR Part 11 compliant
// gateway audit trail entries. Supports chain verification and multiple export
// formats.
// =============================================================================


import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Link2,
  User,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Hash,
  Activity,
  Lock,
  Unlock,
} from 'lucide-react';

import {
  gatewayAuditService,
  type AuditQueryFilters,
  type AuditQueryResult,
  type AuditExportFormat,
  type ChainVerificationResult,
} from '@/services/gateway/gateway-audit-service';

import {
  type GatewayAuditEntry,
  type GatewayAuditAction,
  type GatewayId,
  type GatewayEnvironment,
  GATEWAY_REGISTRY,
} from '@/services/gateway/gateway-connector-types';

// =============================================================================
// TYPES
// =============================================================================

interface GatewayAuditTrailPanelProps {
  className?: string;
  transmissionId?: string;
  applicationNumber?: string;
  showExport?: boolean;
  showVerification?: boolean;
  pageSize?: number;
}

// =============================================================================
// ACTION CATEGORIES
// =============================================================================

const ACTION_CATEGORIES: Record<string, GatewayAuditAction[]> = {
  'Connection': ['GATEWAY_CONNECT', 'GATEWAY_DISCONNECT', 'GATEWAY_AUTHENTICATE', 'GATEWAY_AUTH_FAILURE', 'GATEWAY_HEALTH_CHECK'],
  'Credentials': ['CREDENTIAL_CONFIGURE', 'CREDENTIAL_UPDATE', 'CREDENTIAL_VALIDATE', 'CREDENTIAL_EXPIRE', 'ENVIRONMENT_SWITCH'],
  'Transmission': ['TRANSMISSION_INITIATE', 'TRANSMISSION_UPLOAD_START', 'TRANSMISSION_UPLOAD_COMPLETE', 'TRANSMISSION_UPLOAD_FAIL', 'TRANSMISSION_RETRY', 'TRANSMISSION_CANCEL', 'TRANSMISSION_TIMEOUT'],
  'Acknowledgement': ['ACK_RECEIVED', 'ACK_PROCESSED', 'ACK_ERROR'],
  'Administrative': ['AUDIT_EXPORT', 'AUDIT_QUERY'],
};

const ACTION_ICONS: Partial<Record<GatewayAuditAction, React.ReactNode>> = {
  'GATEWAY_CONNECT': <Link2 className="w-4 h-4" />,
  'GATEWAY_DISCONNECT': <Link2 className="w-4 h-4" />,
  'GATEWAY_AUTHENTICATE': <Shield className="w-4 h-4" />,
  'GATEWAY_AUTH_FAILURE': <Shield className="w-4 h-4" />,
  'GATEWAY_HEALTH_CHECK': <Activity className="w-4 h-4" />,
  'CREDENTIAL_CONFIGURE': <Lock className="w-4 h-4" />,
  'CREDENTIAL_UPDATE': <Lock className="w-4 h-4" />,
  'TRANSMISSION_INITIATE': <FileText className="w-4 h-4" />,
  'TRANSMISSION_UPLOAD_START': <FileText className="w-4 h-4" />,
  'TRANSMISSION_UPLOAD_COMPLETE': <CheckCircle className="w-4 h-4" />,
  'TRANSMISSION_UPLOAD_FAIL': <XCircle className="w-4 h-4" />,
  'ACK_RECEIVED': <CheckCircle className="w-4 h-4" />,
  'ACK_ERROR': <XCircle className="w-4 h-4" />,
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
// AUDIT ENTRY ROW COMPONENT
// =============================================================================

interface AuditEntryRowProps {
  entry: GatewayAuditEntry;
  isExpanded: boolean;
  onToggle: () => void;
  showChainInfo?: boolean;
}

const AuditEntryRow: React.FC<AuditEntryRowProps> = ({
  entry,
  isExpanded,
  onToggle,
  showChainInfo = false,
}) => {
  const gatewayMeta = GATEWAY_REGISTRY[entry.gatewayId];
  const icon = ACTION_ICONS[entry.action] || <FileText className="w-4 h-4" />;
  
  return (
    <div className={`border rounded-lg ${entry.success ? 'border-gray-200' : 'border-red-200'}`}>
      {/* Main Row */}
      <div
        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
          !entry.success ? 'bg-red-50/50' : ''
        }`}
        onClick={onToggle}
      >
        {/* Expand Icon */}
        <button className="text-gray-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        
        {/* Status Icon */}
        <div className={`${entry.success ? 'text-green-500' : 'text-red-500'}`}>
          {entry.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        </div>
        
        {/* Action Icon */}
        <div className="text-gray-500">{icon}</div>
        
        {/* Gateway */}
        <div className="flex items-center gap-1.5 min-w-[100px]">
          <span className="text-sm">{REGION_FLAGS[gatewayMeta?.region || 'US']}</span>
          <span className="text-xs text-gray-600">{entry.gatewayId}</span>
        </div>
        
        {/* Action & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{entry.action}</span>
          </div>
          <p className="text-xs text-gray-600 truncate">{entry.actionDescription}</p>
        </div>
        
        {/* User */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-[120px]">
          <User className="w-3.5 h-3.5" />
          <span className="truncate">{entry.userName}</span>
        </div>
        
        {/* Timestamp */}
        <div className="text-xs text-gray-500 min-w-[140px] text-right">
          {new Date(entry.timestamp).toLocaleString()}
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-gray-50 text-sm">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-2">
              <div>
                <span className="text-gray-500">Entry ID:</span>
                <span className="ml-2 font-mono text-xs">{entry.id}</span>
              </div>
              <div>
                <span className="text-gray-500">Environment:</span>
                <span className="ml-2">{entry.environment}</span>
              </div>
              {entry.transmissionId && (
                <div>
                  <span className="text-gray-500">Transmission ID:</span>
                  <span className="ml-2 font-mono text-xs">{entry.transmissionId}</span>
                </div>
              )}
              {entry.applicationNumber && (
                <div>
                  <span className="text-gray-500">Application:</span>
                  <span className="ml-2">{entry.applicationNumber}</span>
                </div>
              )}
              {entry.sequenceNumber && (
                <div>
                  <span className="text-gray-500">Sequence:</span>
                  <span className="ml-2">{entry.sequenceNumber}</span>
                </div>
              )}
            </div>
            
            {/* Right Column */}
            <div className="space-y-2">
              <div>
                <span className="text-gray-500">User ID:</span>
                <span className="ml-2">{entry.userId}</span>
              </div>
              <div>
                <span className="text-gray-500">Role:</span>
                <span className="ml-2">{entry.userRole}</span>
              </div>
              {entry.ipAddress && (
                <div>
                  <span className="text-gray-500">IP Address:</span>
                  <span className="ml-2 font-mono text-xs">{entry.ipAddress}</span>
                </div>
              )}
              {entry.errorCode && (
                <div className="text-red-600">
                  <span className="text-red-500">Error:</span>
                  <span className="ml-2">{entry.errorCode} - {entry.errorMessage}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Value Changes */}
          {(entry.previousValue || entry.newValue) && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-gray-500 mb-1">Value Change:</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono">
                  {entry.previousValue || '(empty)'}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono">
                  {entry.newValue || '(empty)'}
                </span>
              </div>
            </div>
          )}
          
          {/* Chain Info */}
          {showChainInfo && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-gray-500 mb-1">Chain Integrity:</p>
              <div className="space-y-1 text-xs font-mono">
                <div>
                  <span className="text-gray-500">Checksum:</span>
                  <span className="ml-2 break-all">{entry.checksum}</span>
                </div>
                {entry.previousEntryChecksum && (
                  <div>
                    <span className="text-gray-500">Previous:</span>
                    <span className="ml-2 break-all">{entry.previousEntryChecksum}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// FILTER PANEL COMPONENT
// =============================================================================

interface FilterPanelProps {
  filters: AuditQueryFilters;
  onFiltersChange: (filters: AuditQueryFilters) => void;
  onClear: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClear,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.gatewayId) count++;
    if (filters.environment) count++;
    if (filters.action && filters.action.length > 0) count++;
    if (filters.success !== undefined) count++;
    if (filters.dateRange) count++;
    if (filters.searchText) count++;
    return count;
  }, [filters]);
  
  return (
    <div className="border rounded-lg bg-gray-50 mb-4">
      {/* Filter Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
              {activeFilterCount} active
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {/* Expanded Filters */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t pt-3">
          <div className="grid grid-cols-4 gap-4">
            {/* Gateway */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gateway</label>
              <select
                value={filters.gatewayId || ''}
                onChange={(e) => onFiltersChange({ ...filters, gatewayId: e.target.value as GatewayId || undefined })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
              >
                <option value="">All Gateways</option>
                {Object.keys(GATEWAY_REGISTRY).map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            
            {/* Environment */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Environment</label>
              <select
                value={filters.environment || ''}
                onChange={(e) => onFiltersChange({ ...filters, environment: e.target.value as GatewayEnvironment || undefined })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
              >
                <option value="">All Environments</option>
                <option value="production">Production</option>
                <option value="test">Test</option>
                <option value="validation">Validation</option>
              </select>
            </div>
            
            {/* Success */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={filters.success === undefined ? '' : filters.success.toString()}
                onChange={(e) => onFiltersChange({ 
                  ...filters, 
                  success: e.target.value === '' ? undefined : e.target.value === 'true' 
                })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
              >
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </select>
            </div>
            
            {/* Action Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value=""
                onChange={(e) => {
                  const category = e.target.value;
                  if (category && ACTION_CATEGORIES[category]) {
                    onFiltersChange({ ...filters, action: ACTION_CATEGORIES[category] });
                  } else {
                    onFiltersChange({ ...filters, action: undefined });
                  }
                }}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
              >
                <option value="">All Actions</option>
                {Object.keys(ACTION_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Clear Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={onClear}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// EXPORT PANEL COMPONENT
// =============================================================================

interface ExportPanelProps {
  filters: AuditQueryFilters;
  entryCount: number;
  onExport: (format: AuditExportFormat) => void;
  isExporting: boolean;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  filters,
  entryCount,
  onExport,
  isExporting,
}) => {
  const formats: { id: AuditExportFormat; label: string; icon: React.ReactNode }[] = [
    { id: 'json', label: 'JSON', icon: <FileText className="w-4 h-4" /> },
    { id: 'csv', label: 'CSV', icon: <FileText className="w-4 h-4" /> },
    { id: 'xml', label: 'XML', icon: <FileText className="w-4 h-4" /> },
    { id: 'pdf', label: 'PDF', icon: <FileText className="w-4 h-4" /> },
  ];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Export {entryCount} entries:</span>
      {formats.map((format) => (
        <button
          key={format.id}
          onClick={() => onExport(format.id)}
          disabled={isExporting || entryCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {format.icon}
          {format.label}
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// CHAIN VERIFICATION COMPONENT
// =============================================================================

interface ChainVerificationProps {
  onVerify: () => void;
  result: ChainVerificationResult | null;
  isVerifying: boolean;
}

const ChainVerification: React.FC<ChainVerificationProps> = ({
  onVerify,
  result,
  isVerifying,
}) => (
  <div className="border rounded-lg p-4 bg-gray-50">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-gray-600" />
        <div>
          <h3 className="font-medium text-gray-900">Chain Integrity Verification</h3>
          <p className="text-xs text-gray-500">Verify audit trail has not been tampered with</p>
        </div>
      </div>
      <button
        onClick={onVerify}
        disabled={isVerifying}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isVerifying ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Shield className="w-4 h-4" />
        )}
        {isVerifying ? 'Verifying...' : 'Verify Chain'}
      </button>
    </div>
    
    {result && (
      <div className={`mt-4 p-3 rounded ${result.isValid ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex items-center gap-2">
          {result.isValid ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`font-medium ${result.isValid ? 'text-green-700' : 'text-red-700'}`}>
            {result.isValid ? 'Chain integrity verified' : 'Chain integrity compromised!'}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {result.entriesChecked} entries checked at {new Date(result.verifiedAt).toLocaleString()}
        </p>
        {result.firstBrokenLink && (
          <div className="mt-2 text-sm text-red-700">
            <p>First broken link at position {result.firstBrokenLink.position}</p>
            <p className="font-mono text-xs">Entry: {result.firstBrokenLink.entryId}</p>
          </div>
        )}
      </div>
    )}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const GatewayAuditTrailPanel: React.FC<GatewayAuditTrailPanelProps> = ({
  className = '',
  transmissionId,
  applicationNumber,
  showExport = true,
  showVerification = true,
  pageSize = 25,
}) => {
  const [entries, setEntries] = useState<GatewayAuditEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AuditQueryFilters>({
    transmissionId,
    applicationNumber,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ChainVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Fetch entries
  useEffect(() => {
    const fetchEntries = async () => {
      setIsLoading(true);
      try {
        const result = await gatewayAuditService.query(
          { ...filters, searchText: searchQuery },
          currentPage,
          pageSize
        );
        setEntries(result.entries);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error('Failed to fetch audit entries:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEntries();
  }, [filters, searchQuery, currentPage, pageSize]);
  
  const handleExport = async (format: AuditExportFormat) => {
    setIsExporting(true);
    try {
      const result = await gatewayAuditService.export(
        { ...filters, searchText: searchQuery },
        format
      );
      
      // Trigger download
      const blob = new Blob([result.content], { 
        type: format === 'json' ? 'application/json' : 
              format === 'csv' ? 'text/csv' :
              format === 'xml' ? 'application/xml' : 'text/plain'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const result = await gatewayAuditService.verifyChain();
      setVerificationResult(result);
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleClearFilters = () => {
    setFilters({ transmissionId, applicationNumber });
    setSearchQuery('');
    setCurrentPage(1);
  };
  
  const totalPages = Math.ceil(totalCount / pageSize);
  
  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Gateway Audit Trail</h2>
          <p className="text-sm text-gray-500">
            21 CFR Part 11 compliant audit log • {totalCount} entries
          </p>
        </div>
        
        {showExport && (
          <ExportPanel
            filters={filters}
            entryCount={totalCount}
            onExport={handleExport}
            isExporting={isExporting}
          />
        )}
      </div>
      
      {/* Chain Verification */}
      {showVerification && (
        <div className="mb-4">
          <ChainVerification
            onVerify={handleVerifyChain}
            result={verificationResult}
            isVerifying={isVerifying}
          />
        </div>
      )}
      
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search audit entries..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {/* Filters */}
      <FilterPanel
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        onClear={handleClearFilters}
      />
      
      {/* Entries List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
            <p className="text-gray-500">Loading audit entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No audit entries found</p>
            <p className="text-sm">Audit entries will appear here as gateway operations occur</p>
          </div>
        ) : (
          entries.map((entry) => (
            <AuditEntryRow
              key={entry.id}
              entry={entry}
              isExpanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              showChainInfo={showVerification}
            />
          ))
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatewayAuditTrailPanel;
