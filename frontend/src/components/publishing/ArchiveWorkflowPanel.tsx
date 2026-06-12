

import React, { useState, useEffect, useCallback } from 'react';
import {
  Archive,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Lock,
  Shield,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2,
  Package,
  Send,
  FileCheck,
  Calendar,
  User,
  Building,
  Hash,
  Link2,
} from 'lucide-react';
import {
  SubmissionLifecycleState,
  SubmissionLifecycleRecord,
  ArchiveCertificate,
  AcknowledgmentRecord,
  FilingRecord,
  LifecycleEvent,
  getStateInfo,
  getLifecyclePermissions,
  getAvailableTransitions,
} from '@/types/submission-lifecycle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

// ============================================================================
// Types
// ============================================================================

export interface ArchiveWorkflowPanelProps {
  /** Submission ID */
  submissionId: string;
  /** Sequence number */
  sequenceNumber: string;
  /** Application number for display */
  applicationNumber: string;
  /** Current lifecycle record (if available) */
  lifecycleRecord?: SubmissionLifecycleRecord;
  /** Current user role */
  userRole?: string;
  /** Callback when archive action is triggered */
  onArchive?: (filingRecord?: FilingRecord) => Promise<void>;
  /** Callback when certificate export is triggered */
  onExportCertificate?: (format: 'pdf' | 'json' | 'text') => Promise<void>;
  /** Callback when view certificate is triggered */
  onViewCertificate?: () => void;
  /** Whether component is in loading state */
  loading?: boolean;
  /** Custom class names */
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

const StateIcon: React.FC<{ state: SubmissionLifecycleState; className?: string }> = ({ state, className = 'w-5 h-5' }) => {
  switch (state) {
    case 'draft':
      return <FileText className={className} />;
    case 'compiled':
      return <Package className={className} />;
    case 'submitted':
      return <Send className={className} />;
    case 'acknowledged':
      return <CheckCircle className={className} />;
    case 'archived':
      return <Archive className={className} />;
    default:
      return <FileText className={className} />;
  }
};

const stateColorClasses: Record<SubmissionLifecycleState, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  compiled: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  submitted: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  acknowledged: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  archived: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700',
};

const AckBadge: React.FC<{ ack: AcknowledgmentRecord }> = ({ ack }) => {
  const colorClass = ack.status === 'success' 
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : ack.status === 'warning'
    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {ack.status === 'success' && <CheckCircle className="w-3 h-3" />}
      {ack.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
      {ack.status === 'error' && <X className="w-3 h-3" />}
      {ack.type}
    </span>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function ArchiveWorkflowPanel({
  submissionId,
  sequenceNumber,
  applicationNumber,
  lifecycleRecord,
  userRole = 'viewer',
  onArchive,
  onExportCertificate,
  onViewCertificate,
  loading = false,
  className = '',
}: ArchiveWorkflowPanelProps) {
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Filing record form state
  const [filingRecord, setFilingRecord] = useState<Partial<FilingRecord>>({
    agency: 'FDA',
    filingType: 'eCTD',
  });
  
  // Derive state info
  const currentState = lifecycleRecord?.currentState || 'draft';
  const stateInfo = getStateInfo(currentState);
  const permissions = getLifecyclePermissions(currentState, userRole);
  const certificate = lifecycleRecord?.certificate;
  
  // Calculate progress
  const getProgressPercentage = (): number => {
    switch (currentState) {
      case 'draft': return 0;
      case 'compiled': return 25;
      case 'submitted': return 50;
      case 'acknowledged': return 75;
      case 'archived': return 100;
      default: return 0;
    }
  };
  
  // Handle archive
  const handleArchive = async () => {
    if (!onArchive) return;
    
    setArchiving(true);
    try {
      await onArchive(filingRecord as FilingRecord);
      setShowArchiveModal(false);
    } catch (error) {
      console.error('Archive failed:', error);
    } finally {
      setArchiving(false);
    }
  };
  
  // Handle export
  const handleExport = async (format: 'pdf' | 'json' | 'text') => {
    if (!onExportCertificate) return;
    
    setExporting(true);
    try {
      await onExportCertificate(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };
  
  // Copy to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };
  
  // Format date
  const formatDate = (date?: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Card - Current State */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${stateColorClasses[currentState]}`}>
              <StateIcon state={currentState} className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Archive Workflow
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {applicationNumber} • Sequence {sequenceNumber}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge color={stateInfo.color as any}>{stateInfo.label}</Badge>
            {lifecycleRecord?.isReadOnly && (
              <Badge color="gray">
                <Lock className="w-3 h-3 mr-1" />
                Read-Only
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Draft</span>
              <span>Compiled</span>
              <span>Submitted</span>
              <span>Acknowledged</span>
              <span>Archived</span>
            </div>
            <ProgressBar 
              value={getProgressPercentage()} 
              max={100}
              size="md"
              color={currentState === 'archived' ? 'purple' : 'blue'}
            />
          </div>
          
          {/* State Description */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {stateInfo.description}
            </p>
            {permissions.reason && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {permissions.reason}
              </p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          {permissions.canArchive && (
            <Button
              onClick={() => setShowArchiveModal(true)}
              disabled={loading || archiving}
            >
              {archiving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Archive Submission
            </Button>
          )}
          
          {permissions.canViewCertificate && certificate && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCertificateModal(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Certificate
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
      
      {/* Timeline Section */}
      <CollapsibleSection
        title="Submission Timeline"
        icon={<Calendar className="w-4 h-4" />}
        defaultExpanded={true}
        variant="card"
        count={lifecycleRecord?.events?.length}
      >
        <div className="space-y-3">
          {/* Key Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(lifecycleRecord?.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Compiled</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(lifecycleRecord?.compiledAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(lifecycleRecord?.submittedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Acknowledged</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(lifecycleRecord?.acknowledgedAt)}
              </p>
            </div>
          </div>
          
          {/* Acknowledgment Chain */}
          {lifecycleRecord?.acknowledgments && lifecycleRecord.acknowledgments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Acknowledgment Chain
              </p>
              <div className="flex flex-wrap gap-2">
                {lifecycleRecord.acknowledgments.map((ack, idx) => (
                  <AckBadge key={idx} ack={ack} />
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>
      
      {/* Package Details Section */}
      {lifecycleRecord?.packageId && (
        <CollapsibleSection
          title="Package Details"
          icon={<Package className="w-4 h-4" />}
          defaultExpanded={false}
          variant="card"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Package ID</span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {lifecycleRecord.packageId}
                </code>
                <button
                  onClick={() => copyToClipboard(lifecycleRecord.packageId!, 'packageId')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  {copiedField === 'packageId' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            {lifecycleRecord.packageChecksum && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Checksum</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {lifecycleRecord.packageChecksum.substring(0, 16)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(lifecycleRecord.packageChecksum!, 'checksum')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    {copiedField === 'checksum' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Documents</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {lifecycleRecord.documentCount || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Size</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {lifecycleRecord.packageSize 
                  ? `${(lifecycleRecord.packageSize / 1024 / 1024).toFixed(2)} MB`
                  : '-'
                }
              </span>
            </div>
          </div>
        </CollapsibleSection>
      )}
      
      {/* Certificate Section (if archived) */}
      {certificate && (
        <CollapsibleSection
          title="Archive Certificate"
          icon={<Shield className="w-4 h-4" />}
          badge={{ text: 'Verified', color: 'green' }}
          defaultExpanded={true}
          variant="card"
        >
          <div className="space-y-4">
            {/* Certificate Number */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Certificate Number</p>
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono font-semibold text-purple-900 dark:text-purple-100">
                  {certificate.certificateNumber}
                </code>
                <button
                  onClick={() => copyToClipboard(certificate.certificateNumber, 'certNumber')}
                  className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded"
                >
                  {copiedField === 'certNumber' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-purple-400" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Archive Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Archived At</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(certificate.archivedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Archive Location</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {certificate.archiveLocation}
                </p>
              </div>
            </div>
            
            {/* Filing Record */}
            {certificate.filingRecord && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Filing Record
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Record Number</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {certificate.filingRecord.recordNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Agency</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {certificate.filingRecord.agency}
                    </p>
                  </div>
                </div>
                {certificate.filingRecord.trackingUrl && (
                  <a
                    href={certificate.filingRecord.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View at Agency
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
            
            {/* Verification Link */}
            {certificate.verificationUrl && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <a
                  href={certificate.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Shield className="w-4 h-4" />
                  Verify Certificate
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
      
      {/* Archive Modal */}
      <Modal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive Submission"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  This action is permanent
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Once archived, this submission will be permanently read-only and cannot be modified.
                  An archive certificate will be generated.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filing Record (Optional)
            </h4>
            
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                Record Number
              </label>
              <input
                type="text"
                value={filingRecord.recordNumber || ''}
                onChange={(e) => setFilingRecord({ ...filingRecord, recordNumber: e.target.value })}
                placeholder="e.g., FDA-2026-N-0001"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Agency
                </label>
                <select
                  value={filingRecord.agency || 'FDA'}
                  onChange={(e) => setFilingRecord({ ...filingRecord, agency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="FDA">FDA</option>
                  <option value="EMA">EMA</option>
                  <option value="PMDA">PMDA</option>
                  <option value="Health Canada">Health Canada</option>
                  <option value="NMPA">NMPA</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Filing Type
                </label>
                <select
                  value={filingRecord.filingType || 'eCTD'}
                  onChange={(e) => setFilingRecord({ ...filingRecord, filingType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="eCTD">eCTD</option>
                  <option value="NeeS">NeeS</option>
                  <option value="Paper">Paper</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                Receipt Number
              </label>
              <input
                type="text"
                value={filingRecord.receiptNumber || ''}
                onChange={(e) => setFilingRecord({ ...filingRecord, receiptNumber: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                Tracking URL
              </label>
              <input
                type="url"
                value={filingRecord.trackingUrl || ''}
                onChange={(e) => setFilingRecord({ ...filingRecord, trackingUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowArchiveModal(false)}
              disabled={archiving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={archiving}
            >
              {archiving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Archive & Generate Certificate
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Certificate View Modal */}
      <Modal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        title="Archive Certificate"
        size="lg"
      >
        {certificate && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-x-auto max-h-96">
              {`Certificate Number: ${certificate.certificateNumber}
Application: ${certificate.applicationNumber}
Sequence: ${certificate.sequenceNumber}
Type: ${certificate.applicationType} - ${certificate.submissionType}
Region: ${certificate.region}

Timeline:
  Compiled: ${formatDate(certificate.compiledAt)}
  Submitted: ${formatDate(certificate.submittedAt)}
  Acknowledged: ${formatDate(certificate.acknowledgedAt)}
  Archived: ${formatDate(certificate.archivedAt)}

Package:
  Checksum: ${certificate.packageChecksum}
  Documents: ${certificate.documentCount}
  Pages: ${certificate.totalPages}

Archive:
  Location: ${certificate.archiveLocation}
  Checksum: ${certificate.archiveChecksum}
  Size: ${(certificate.archiveSize / 1024 / 1024).toFixed(2)} MB

Acknowledgments:
${certificate.acknowledgments.map(a => `  ${a.type}: ${a.status} at ${formatDate(a.receivedAt)}`).join('\n')}

Generated by: ${certificate.generatedBy.name}
Signature: ${certificate.signatureHash}
Verification: ${certificate.verificationUrl}`}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => handleExport('json')}
                disabled={exporting}
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('text')}
                disabled={exporting}
              >
                <Download className="w-4 h-4 mr-2" />
                Text
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ArchiveWorkflowPanel;
