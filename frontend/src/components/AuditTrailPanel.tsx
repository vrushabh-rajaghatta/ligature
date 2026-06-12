

/**
 * AuditTrailPanel - Stub Component
 * 
 * Simple audit trail display for backward compatibility.
 * For full audit trail functionality, see:
 * - /components/screens/AuditTrailDashboard.tsx (Part 11 compliant dashboard)
 * - /components/publishing/GatewayAuditTrailPanel.tsx (Gateway-specific)
 */

import { useState } from 'react';
import { History, Clock, User, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface AuditTrailPanelProps {
  targetType?: 'submission' | 'document' | 'workflow';
  targetId?: string;
  className?: string;
}

// Mock audit entries for display
const mockAuditEntries = [
  { id: '1', action: 'Document uploaded', user: 'John Smith', timestamp: '2026-01-26 14:30:00', status: 'success' },
  { id: '2', action: 'Validation completed', user: 'System', timestamp: '2026-01-26 14:28:00', status: 'success' },
  { id: '3', action: 'Review assigned', user: 'Sarah Chen', timestamp: '2026-01-26 14:25:00', status: 'success' },
  { id: '4', action: 'Sequence created', user: 'John Smith', timestamp: '2026-01-26 14:20:00', status: 'success' },
  { id: '5', action: 'Application selected', user: 'John Smith', timestamp: '2026-01-26 14:15:00', status: 'success' },
];

export function AuditTrailPanel({ targetType, targetId, className = '' }: AuditTrailPanelProps) {
  return (
    <div className={`h-full flex flex-col bg-surface ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-accent-purple" />
          <h3 className="text-sm font-semibold text-text-primary">Audit Trail</h3>
        </div>
        {targetType && targetId && (
          <p className="text-xs text-text-muted mt-1">
            {targetType}: {targetId}
          </p>
        )}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {mockAuditEntries.map((entry) => (
          <div
            key={entry.id}
            className="p-3 bg-surface-card rounded-lg border border-border"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {entry.status === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-accent-green" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-accent-amber" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{entry.action}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.user}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.timestamp}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-surface-card/50">
        <p className="text-xs text-text-muted text-center">
          21 CFR Part 11 Compliant
        </p>
      </div>
    </div>
  );
}

export default AuditTrailPanel;
