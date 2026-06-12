
// ApproverPicker Component - Phase 2.3e.2
// Modal for searching and selecting approvers


import { useState, useMemo, useCallback } from 'react';
import { 
  X, Search, Users, User, Filter, ChevronDown, 
  CheckCircle, Clock, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ApproverCard } from './ApproverCard';
import type { ApproverCandidate, ApproverGroup, ApproverRole } from '@/types/approval';
import { APPROVER_ROLE_INFO } from '@/types/approval';
import {
  mockApproverCandidates,
  mockApproverGroups,
  searchApprovers,
  getApproversByRole,
} from '@/data/mockApprovers';

// ============================================================================
// TYPES
// ============================================================================

type SelectionMode = 'user' | 'role' | 'group';

interface ApproverPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (approver: ApproverCandidate) => void;
  onSelectRole: (role: ApproverRole) => void;
  onSelectGroup: (group: ApproverGroup) => void;
  suggestedRoles?: ApproverRole[];
  title?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ApproverPicker({
  isOpen,
  onClose,
  onSelectUser,
  onSelectRole,
  onSelectGroup,
  suggestedRoles = [],
  title = 'Select Approver',
}: ApproverPickerProps) {
  // State
  const [mode, setMode] = useState<SelectionMode>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<ApproverRole | 'all'>('all');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Filtered results
  const filteredApprovers = useMemo(() => {
    let results = searchQuery
      ? searchApprovers(searchQuery)
      : mockApproverCandidates;

    if (roleFilter !== 'all') {
      results = results.filter(a => a.role === roleFilter);
    }

    if (showAvailableOnly) {
      results = results.filter(a => a.isAvailable);
    }

    // Sort: available first, then by workload
    return results.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) {
        return a.isAvailable ? -1 : 1;
      }
      return a.pendingApprovals - b.pendingApprovals;
    });
  }, [searchQuery, roleFilter, showAvailableOnly]);

  // Group roles for display
  const roleGroups = useMemo(() => {
    const suggested = suggestedRoles.map(role => ({
      role,
      info: APPROVER_ROLE_INFO[role],
      count: getApproversByRole(role).length,
      isSuggested: true,
    }));

    const others = (Object.keys(APPROVER_ROLE_INFO) as ApproverRole[])
      .filter(role => !suggestedRoles.includes(role))
      .map(role => ({
        role,
        info: APPROVER_ROLE_INFO[role],
        count: getApproversByRole(role).length,
        isSuggested: false,
      }));

    return { suggested, others };
  }, [suggestedRoles]);

  // Handlers
  const handleSelectUser = useCallback((approver: ApproverCandidate) => {
    onSelectUser(approver);
    onClose();
  }, [onSelectUser, onClose]);

  const handleSelectRole = useCallback((role: ApproverRole) => {
    onSelectRole(role);
    onClose();
  }, [onSelectRole, onClose]);

  const handleSelectGroup = useCallback((group: ApproverGroup) => {
    onSelectGroup(group);
    onClose();
  }, [onSelectGroup, onClose]);

  const handleSelectDelegate = useCallback((delegate: ApproverCandidate) => {
    onSelectUser(delegate);
    onClose();
  }, [onSelectUser, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-elevated rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-border">
          <ModeTab
            active={mode === 'user'}
            onClick={() => setMode('user')}
            icon={<User className="w-4 h-4" />}
            label="Specific User"
          />
          <ModeTab
            active={mode === 'role'}
            onClick={() => setMode('role')}
            icon={<Users className="w-4 h-4" />}
            label="By Role"
          />
          <ModeTab
            active={mode === 'group'}
            onClick={() => setMode('group')}
            icon={<Users className="w-4 h-4" />}
            label="Group"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {mode === 'user' && (
            <>
              {/* Search & Filters */}
              <div className="p-4 border-b border-border space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, title, or department..."
                    className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    autoFocus
                  />
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-3">
                  {/* Role Filter */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as ApproverRole | 'all')}
                    className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  >
                    <option value="all">All Roles</option>
                    {(Object.keys(APPROVER_ROLE_INFO) as ApproverRole[]).map(role => (
                      <option key={role} value={role}>
                        {APPROVER_ROLE_INFO[role].label}
                      </option>
                    ))}
                  </select>

                  {/* Available Only Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAvailableOnly}
                      onChange={(e) => setShowAvailableOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-accent-primary focus:ring-accent-primary/50"
                    />
                    <span className="text-sm text-text-secondary">Available only</span>
                  </label>

                  {/* Result count */}
                  <span className="ml-auto text-sm text-text-muted">
                    {filteredApprovers.length} approver{filteredApprovers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Approver List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid gap-3">
                  {filteredApprovers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
                      <p className="text-text-muted">No approvers found</p>
                      <p className="text-sm text-text-muted mt-1">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  ) : (
                    filteredApprovers.map(approver => (
                      <ApproverCard
                        key={approver.id}
                        approver={approver}
                        onClick={() => handleSelectUser(approver)}
                        onSelectDelegate={handleSelectDelegate}
                        showDelegation={true}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {mode === 'role' && (
            <div className="flex-1 overflow-y-auto p-4">
              {/* Suggested Roles */}
              {roleGroups.suggested.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-status-success" />
                    Suggested for this approval type
                  </h3>
                  <div className="grid gap-2">
                    {roleGroups.suggested.map(({ role, info, count }) => (
                      <RoleCard
                        key={role}
                        role={role}
                        label={info.label}
                        description={info.description}
                        memberCount={count}
                        highlighted
                        onClick={() => handleSelectRole(role)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Roles */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-3">
                  All Roles
                </h3>
                <div className="grid gap-2">
                  {roleGroups.others.map(({ role, info, count }) => (
                    <RoleCard
                      key={role}
                      role={role}
                      label={info.label}
                      description={info.description}
                      memberCount={count}
                      onClick={() => handleSelectRole(role)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'group' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-3">
                {mockApproverGroups.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={() => handleSelectGroup(group)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-card rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {mode === 'user' && 'Select a specific person to review'}
              {mode === 'role' && 'Assigned dynamically to current role holder'}
              {mode === 'group' && 'Assigned to team for collaborative review'}
            </p>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ModeTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ModeTab({ active, onClick, icon, label }: ModeTabProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
        border-b-2 -mb-px
        ${active
          ? 'text-accent-primary border-accent-primary'
          : 'text-text-muted border-transparent hover:text-text-secondary hover:border-border'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}

interface RoleCardProps {
  role: ApproverRole;
  label: string;
  description: string;
  memberCount: number;
  highlighted?: boolean;
  onClick: () => void;
}

function RoleCard({ role, label, description, memberCount, highlighted, onClick }: RoleCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 rounded-lg border transition-all
        hover:border-accent-primary/50 hover:shadow-sm
        ${highlighted
          ? 'border-accent-primary/30 bg-accent-primary/5'
          : 'border-border bg-surface-card'}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-text-primary">{label}</h4>
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        </div>
        <Badge variant="soft" color="blue" size="sm">
          {memberCount} available
        </Badge>
      </div>
    </button>
  );
}

interface GroupCardProps {
  group: ApproverGroup;
  onClick: () => void;
}

function GroupCard({ group, onClick }: GroupCardProps) {
  const routingLabel = {
    sequential: 'Sequential',
    parallel: 'Parallel',
    'any-of': 'Any one',
    quorum: `${group.quorumSize} of ${group.memberCount}`,
  }[group.defaultRoutingMode];

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border border-border bg-surface-card hover:border-accent-primary/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-text-primary">{group.name}</h4>
            <p className="text-xs text-text-muted mt-0.5">{group.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">{group.memberCount} members</span>
        </div>
        <Badge variant="soft" color="purple" size="sm">{routingLabel}</Badge>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">
            {group.activePendingApprovals} pending
          </span>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { ApproverPickerProps };
