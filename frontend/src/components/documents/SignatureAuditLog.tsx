
// SignatureAuditLog Component - Phase 2.3e.4
// Timeline view of signature and approval events for audit compliance


import { useState, useMemo } from 'react';
import {
  Clock, User, CheckCircle, XCircle, Shield, Lock, FileText,
  AlertTriangle, AlertCircle, Download, Filter, Search,
  ChevronDown, ChevronRight, PenTool, Eye, Key, Play,
  Send, Award, XOctagon, Edit3
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  SignatureAuditEvent,
  SignatureAuditEventType,
  ElectronicSignature,
} from '@/types/signature';

// ============================================================================
// PROPS & TYPES
// ============================================================================

export interface SignatureAuditLogProps {
  /** Events to display */
  events: SignatureAuditEvent[];
  /** Optional signatures to display in header */
  signatures?: ElectronicSignature[];
  /** Document context */
  documentTitle?: string;
  documentVersion?: string;
  /** Callbacks */
  onExport?: (format: 'csv' | 'pdf') => void;
  /** UI options */
  showFilters?: boolean;
  showSearch?: boolean;
  maxHeight?: string;
  compact?: boolean;
}

type SeverityFilter = 'all' | 'info' | 'warning' | 'error' | 'success';
type EventCategory = 'all' | 'signature' | 'authentication' | 'certificate' | 'system';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SignatureAuditLog({
  events,
  signatures,
  documentTitle,
  documentVersion,
  onExport,
  showFilters = true,
  showSearch = true,
  maxHeight = '500px',
  compact = false,
}: SignatureAuditLogProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          event.eventDescription.toLowerCase().includes(query) ||
          event.actorName.toLowerCase().includes(query) ||
          event.eventType.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Severity filter
      if (severityFilter !== 'all') {
        const eventInfo = getEventInfo(event.eventType);
        if (eventInfo.severity !== severityFilter) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const category = getEventCategory(event.eventType);
        if (category !== categoryFilter) return false;
      }

      return true;
    });
  }, [events, searchQuery, severityFilter, categoryFilter]);

  // Group by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, SignatureAuditEvent[]> = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    return groups;
  }, [filteredEvents]);

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  return (
    <div className="bg-surface-base rounded-lg border border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-surface-elevated">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Signature Audit Log
            </h3>
            {documentTitle && (
              <p className="text-xs text-text-muted mt-0.5">
                {documentTitle} {documentVersion && `v${documentVersion}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" size="sm">
              {events.length} events
            </Badge>
            {onExport && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExport('csv')}
                  title="Export as CSV"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Signature summary */}
        {signatures && signatures.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {signatures.map(sig => (
              <SignatureBadge key={sig.id} signature={sig} />
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      {(showFilters || showSearch) && (
        <div className="px-4 py-2 border-b border-border bg-surface-card">
          <div className="flex items-center gap-3 flex-wrap">
            {showSearch && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                />
              </div>
            )}
            
            {showFilters && (
              <>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                  className="px-2 py-1.5 text-sm rounded-md border border-border bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                >
                  <option value="all">All Severities</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as EventCategory)}
                  className="px-2 py-1.5 text-sm rounded-md border border-border bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                >
                  <option value="all">All Categories</option>
                  <option value="signature">Signatures</option>
                  <option value="authentication">Authentication</option>
                  <option value="certificate">Certificates</option>
                  <option value="system">System</option>
                </select>
              </>
            )}
          </div>
        </div>
      )}

      {/* Event timeline */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {filteredEvents.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Clock className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No audit events found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                {/* Date header */}
                <div className="px-4 py-2 bg-surface-elevated sticky top-0 z-10">
                  <span className="text-xs font-medium text-text-muted">{date}</span>
                </div>
                
                {/* Events for this date */}
                <div className="divide-y divide-border/50">
                  {dateEvents.map((event) => (
                    <AuditEventRow
                      key={event.id}
                      event={event}
                      compact={compact}
                      isExpanded={expandedEvents.has(event.id)}
                      onToggle={() => toggleExpanded(event.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AuditEventRowProps {
  event: SignatureAuditEvent;
  compact: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function AuditEventRow({ event, compact, isExpanded, onToggle }: AuditEventRowProps) {
  const eventInfo = getEventInfo(event.eventType);
  const Icon = eventInfo.icon;
  const hasDetails = Object.keys(event.details || {}).length > 0;
  const time = new Date(event.timestamp).toLocaleTimeString();

  return (
    <div className={`px-4 ${compact ? 'py-2' : 'py-3'}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          p-1.5 rounded-lg flex-none
          ${eventInfo.severity === 'success' ? 'bg-status-success/10' : ''}
          ${eventInfo.severity === 'error' ? 'bg-status-error/10' : ''}
          ${eventInfo.severity === 'warning' ? 'bg-status-warning/10' : ''}
          ${eventInfo.severity === 'info' ? 'bg-surface-elevated' : ''}
        `}>
          <Icon className={`w-4 h-4 ${getSeverityColor(eventInfo.severity)}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {eventInfo.label}
            </span>
            <Badge 
              color={getSeverityColor(eventInfo.severity)} 
              size="sm"
            >
              {eventInfo.severity}
            </Badge>
          </div>
          
          <p className="text-xs text-text-muted mt-0.5">
            {event.eventDescription}
          </p>

          {/* Actor and time */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {event.actorName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {time}
            </span>
            {event.ipAddress && (
              <span className="font-mono">{event.ipAddress}</span>
            )}
          </div>

          {/* Expandable details */}
          {hasDetails && isExpanded && (
            <div className="mt-2 p-2 bg-surface-elevated rounded text-xs">
              <pre className="text-text-muted whitespace-pre-wrap">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        {hasDetails && (
          <button
            onClick={onToggle}
            className="p-1 hover:bg-surface-elevated rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

interface SignatureBadgeProps {
  signature: ElectronicSignature;
}

function SignatureBadge({ signature }: SignatureBadgeProps) {
  const date = new Date(signature.signedAt).toLocaleDateString();
  
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-status-success/10 border border-status-success/30 rounded-md">
      <CheckCircle className="w-3.5 h-3.5 text-status-success" />
      <div className="text-xs">
        <span className="font-medium text-text-primary">{signature.signerName}</span>
        <span className="text-text-muted"> • {signature.meaningLabel} • {date}</span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT SIGNATURE BADGE (for inline display)
// ============================================================================

export interface SignatureStatusBadgeProps {
  signatures: ElectronicSignature[];
  onClick?: () => void;
}

export function SignatureStatusBadge({ signatures, onClick }: SignatureStatusBadgeProps) {
  if (signatures.length === 0) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted hover:text-text-secondary bg-surface-elevated rounded-md transition-colors"
      >
        <PenTool className="w-3.5 h-3.5" />
        No signatures
      </button>
    );
  }

  const latestSignature = signatures[0];
  
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-status-success/10 border border-status-success/30 text-status-success rounded-md hover:bg-status-success/20 transition-colors"
    >
      <CheckCircle className="w-3.5 h-3.5" />
      <span>
        Signed by {latestSignature.signerName}
        {signatures.length > 1 && ` +${signatures.length - 1}`}
      </span>
    </button>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface EventInfo {
  label: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  icon: typeof CheckCircle;
}

function getEventInfo(eventType: SignatureAuditEventType): EventInfo {
  const eventMap: Record<SignatureAuditEventType, EventInfo> = {
    'signature-requested': { label: 'Signature Requested', severity: 'info', icon: Send },
    'signature-initiated': { label: 'Signing Initiated', severity: 'info', icon: Play },
    'authentication-started': { label: 'Authentication Started', severity: 'info', icon: Lock },
    'authentication-success': { label: 'Authentication Successful', severity: 'success', icon: CheckCircle },
    'authentication-failed': { label: 'Authentication Failed', severity: 'error', icon: XCircle },
    'meaning-selected': { label: 'Meaning Selected', severity: 'info', icon: FileText },
    'signature-applied': { label: 'Signature Applied', severity: 'success', icon: PenTool },
    'signature-verified': { label: 'Signature Verified', severity: 'success', icon: Shield },
    'signature-rejected': { label: 'Signing Cancelled', severity: 'warning', icon: XOctagon },
    'certificate-used': { label: 'Certificate Used', severity: 'info', icon: Award },
    'certificate-expired': { label: 'Certificate Expired', severity: 'error', icon: AlertTriangle },
    'document-modified': { label: 'Document Modified', severity: 'warning', icon: AlertCircle },
    'audit-exported': { label: 'Audit Exported', severity: 'info', icon: Download },
  };

  return eventMap[eventType] || { label: eventType, severity: 'info', icon: FileText };
}

function getEventCategory(eventType: SignatureAuditEventType): EventCategory {
  if (eventType.startsWith('signature-')) return 'signature';
  if (eventType.startsWith('authentication-')) return 'authentication';
  if (eventType.startsWith('certificate-')) return 'certificate';
  return 'system';
}

function getSeverityColor(severity: 'info' | 'warning' | 'error' | 'success'): 'green' | 'red' | 'amber' | 'gray' {
  switch (severity) {
    case 'success': return 'green';
    case 'error': return 'red';
    case 'warning': return 'amber';
    case 'info': return 'gray';
  }
}

function getSeverityTextColor(severity: 'info' | 'warning' | 'error' | 'success'): string {
  switch (severity) {
    case 'success': return 'text-status-success';
    case 'error': return 'text-status-error';
    case 'warning': return 'text-status-warning';
    case 'info': return 'text-text-muted';
  }
}

function getSeverityVariant(severity: 'info' | 'warning' | 'error' | 'success'): 'success' | 'error' | 'warning' | 'default' {
  switch (severity) {
    case 'success': return 'success';
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'default';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Note: SignatureAuditLogProps and SignatureStatusBadgeProps are exported 
// inline with their interface definitions above
