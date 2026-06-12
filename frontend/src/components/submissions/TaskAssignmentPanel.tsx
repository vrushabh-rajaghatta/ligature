// ============================================================================
// TaskAssignmentPanel - v0.38.4
// Interactive panel for assigning content tasks to team members
// ============================================================================
// Features:
// - RACI role selection
// - Team member picker with workload visibility
// - Due date setting
// - Bulk assignment
// - Notification preview
// ============================================================================


import React, { useState, useMemo, useCallback } from 'react';
import {
  User, Users, Calendar, Clock, AlertTriangle, CheckCircle,
  ChevronRight, ChevronDown, Search, X, Bell, Send, FileText,
  Loader2, Target, Flag, Plus, Minus
} from 'lucide-react';
import { useSubmissionTaskStore, TaskAssignee, RACIRole, TaskPriority } from '@/store/useSubmissionTaskStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  workload: number;
  tasksAssigned: number;
  avatar?: string;
}

interface ContentSlot {
  id: string;
  section: string;
  sectionTitle: string;
  documentTitle: string;
  documentType: string;
  required: boolean;
  status: 'not-started' | 'in-progress' | 'complete';
  currentAssignees?: TaskAssignee[];
}

interface TaskAssignmentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  applicationNumber: string;
  sequenceNumber: string;
  productId: string;
  productName: string;
  contentSlots: ContentSlot[];
  onAssignmentComplete?: (assignedTasks: string[]) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RACI_ROLES: { value: RACIRole; label: string; description: string; color: string }[] = [
  { value: 'R', label: 'Responsible', description: 'Does the work', color: 'bg-blue-500 text-white' },
  { value: 'A', label: 'Accountable', description: 'Final approver', color: 'bg-green-500 text-white' },
  { value: 'C', label: 'Consulted', description: 'Provides input', color: 'bg-amber-500 text-white' },
  { value: 'I', label: 'Informed', description: 'Kept updated', color: 'bg-slate-500 text-white' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
  { value: 'high', label: 'High', color: 'text-amber-400' },
  { value: 'medium', label: 'Medium', color: 'text-blue-400' },
  { value: 'low', label: 'Low', color: 'text-slate-400' },
];

// Mock team members - in production, would come from user store
const MOCK_TEAM: TeamMember[] = [
  { id: 'u-1', name: 'Sarah Chen', email: 'schen@ligature.com', role: 'Regulatory Director', department: 'Regulatory Affairs', workload: 75, tasksAssigned: 8 },
  { id: 'u-2', name: 'Michael Roberts', email: 'mroberts@ligature.com', role: 'CMC Lead', department: 'CMC', workload: 60, tasksAssigned: 5 },
  { id: 'u-3', name: 'Jennifer Walsh', email: 'jwalsh@ligature.com', role: 'Medical Writer', department: 'Medical Writing', workload: 85, tasksAssigned: 12 },
  { id: 'u-4', name: 'David Kim', email: 'dkim@ligature.com', role: 'Clinical Lead', department: 'Clinical Operations', workload: 55, tasksAssigned: 4 },
  { id: 'u-5', name: 'Emily Thompson', email: 'ethompson@ligature.com', role: 'Publishing Specialist', department: 'Regulatory Publishing', workload: 40, tasksAssigned: 3 },
  { id: 'u-6', name: 'James Martinez', email: 'jmartinez@ligature.com', role: 'QA Manager', department: 'Quality Assurance', workload: 50, tasksAssigned: 4 },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function WorkloadIndicator({ workload }: { workload: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-card rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            workload >= 80 ? 'bg-red-500' :
            workload >= 60 ? 'bg-amber-500' :
            'bg-green-500'
          }`}
          style={{ width: `${workload}%` }}
        />
      </div>
      <span className={`text-xs ${
        workload >= 80 ? 'text-red-400' :
        workload >= 60 ? 'text-amber-400' :
        'text-green-400'
      }`}>
        {workload}%
      </span>
    </div>
  );
}

function TeamMemberCard({
  member,
  isSelected,
  selectedRole,
  onSelect,
  onRoleChange,
}: {
  member: TeamMember;
  isSelected: boolean;
  selectedRole?: RACIRole;
  onSelect: () => void;
  onRoleChange: (role: RACIRole) => void;
}) {
  return (
    <div
      className={`
        p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'border-accent-blue bg-accent-blue/10' 
          : 'border-border hover:border-accent-blue/50 bg-surface-card'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-medium">
          {member.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary text-sm">{member.name}</div>
          <div className="text-xs text-text-muted">{member.role}</div>
          <div className="mt-1">
            <WorkloadIndicator workload={member.workload} />
          </div>
        </div>
        {isSelected && (
          <div className="flex items-center gap-1">
            {RACI_ROLES.map(role => (
              <button
                key={role.value}
                onClick={(e) => { e.stopPropagation(); onRoleChange(role.value); }}
                className={`
                  w-6 h-6 rounded text-xs font-medium flex items-center justify-center transition-all
                  ${selectedRole === role.value 
                    ? role.color 
                    : 'bg-surface-elevated text-text-muted hover:text-text-primary'
                  }
                `}
                title={role.label}
              >
                {role.value}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentSlotRow({
  slot,
  isSelected,
  assignments,
  onToggle,
}: {
  slot: ContentSlot;
  isSelected: boolean;
  assignments: { userId: string; userName: string; role: RACIRole }[];
  onToggle: () => void;
}) {
  return (
    <div
      className={`
        p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'border-accent-blue bg-accent-blue/10' 
          : 'border-border hover:border-accent-blue/50'
        }
      `}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="w-4 h-4 rounded border-border text-accent-blue"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted bg-surface-card px-1.5 py-0.5 rounded">
              {slot.section}
            </span>
            <span className="text-sm text-text-primary font-medium truncate">
              {slot.documentTitle}
            </span>
            {slot.required && (
              <span className="text-xs text-red-400">Required</span>
            )}
          </div>
          <div className="text-xs text-text-muted mt-0.5">{slot.sectionTitle}</div>
        </div>
        
        {/* Current/New Assignments */}
        <div className="flex items-center gap-1">
          {assignments.map((a, idx) => (
            <span
              key={idx}
              className={`
                text-xs px-2 py-0.5 rounded
                ${RACI_ROLES.find(r => r.value === a.role)?.color || 'bg-slate-500 text-white'}
              `}
              title={`${a.userName} (${RACI_ROLES.find(r => r.value === a.role)?.label})`}
            >
              {a.userName.split(' ')[0]} ({a.role})
            </span>
          ))}
          {assignments.length === 0 && (
            <span className="text-xs text-text-muted">No assignment</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TaskAssignmentPanel({
  isOpen,
  onClose,
  submissionId,
  applicationNumber,
  sequenceNumber,
  productId,
  productName,
  contentSlots,
  onAssignmentComplete,
}: TaskAssignmentPanelProps) {
  const toast = useToast();
  const { createTask, assignTask } = useSubmissionTaskStore();
  
  // State
  const [step, setStep] = useState<'select-content' | 'assign-team' | 'set-dates' | 'review'>('select-content');
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, { userId: string; userName: string; email: string; role: RACIRole }[]>>({});
  const [dueDates, setDueDates] = useState<Record<string, string>>({});
  const [priorities, setPriorities] = useState<Record<string, TaskPriority>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendNotifications, setSendNotifications] = useState(true);
  
  // Filtered team members
  const filteredTeam = useMemo(() => {
    if (!searchQuery) return MOCK_TEAM;
    const query = searchQuery.toLowerCase();
    return MOCK_TEAM.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query) ||
      m.department.toLowerCase().includes(query)
    );
  }, [searchQuery]);
  
  // Toggle slot selection
  const toggleSlot = useCallback((slotId: string) => {
    setSelectedSlotIds(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  }, []);
  
  // Select all slots
  const selectAllSlots = useCallback(() => {
    setSelectedSlotIds(new Set(contentSlots.map(s => s.id)));
  }, [contentSlots]);
  
  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedSlotIds(new Set());
  }, []);
  
  // Add/update assignment for selected slots
  const addAssignment = useCallback((member: TeamMember, role: RACIRole) => {
    setAssignments(prev => {
      const next = { ...prev };
      selectedSlotIds.forEach(slotId => {
        if (!next[slotId]) next[slotId] = [];
        // Remove existing assignment for this user
        next[slotId] = next[slotId].filter(a => a.userId !== member.id);
        // Add new assignment
        next[slotId].push({
          userId: member.id,
          userName: member.name,
          email: member.email,
          role,
        });
      });
      return next;
    });
  }, [selectedSlotIds]);
  
  // Remove assignment
  const removeAssignment = useCallback((slotId: string, userId: string) => {
    setAssignments(prev => ({
      ...prev,
      [slotId]: (prev[slotId] || []).filter(a => a.userId !== userId),
    }));
  }, []);
  
  // Set due date for selected slots
  const setDueDateForSelected = useCallback((date: string) => {
    setDueDates(prev => {
      const next = { ...prev };
      selectedSlotIds.forEach(slotId => {
        next[slotId] = date;
      });
      return next;
    });
  }, [selectedSlotIds]);
  
  // Set priority for selected slots
  const setPriorityForSelected = useCallback((priority: TaskPriority) => {
    setPriorities(prev => {
      const next = { ...prev };
      selectedSlotIds.forEach(slotId => {
        next[slotId] = priority;
      });
      return next;
    });
  }, [selectedSlotIds]);
  
  // Submit assignments
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      const createdTaskIds: string[] = [];
      
      for (const slotId of Array.from(selectedSlotIds)) {
        const slot = contentSlots.find(s => s.id === slotId);
        if (!slot) continue;
        
        const slotAssignments = assignments[slotId] || [];
        const dueDate = dueDates[slotId] || '';
        const priority = priorities[slotId] || 'medium';
        
        // Create task
        const taskId = createTask({
          submissionId,
          applicationNumber,
          sequenceNumber,
          productId,
          productName,
          ctdSection: slot.section,
          ctdSectionTitle: slot.sectionTitle,
          documentType: slot.documentType as any,
          documentTitle: slot.documentTitle,
          title: `Prepare ${slot.documentTitle}`,
          description: `Prepare ${slot.documentTitle} for ${slot.section} ${slot.sectionTitle}`,
          status: 'not-started',
          priority,
          dueDate,
          percentComplete: 0,
          blockers: [],
          assignees: [],
        });
        
        createdTaskIds.push(taskId);
        
        // Add assignments
        for (const assignment of slotAssignments) {
          assignTask(taskId, assignment, sendNotifications);
        }
      }
      
      toast.success(`Created ${createdTaskIds.length} tasks${sendNotifications ? ' and sent notifications' : ''}`);
      onAssignmentComplete?.(createdTaskIds);
      onClose();
      
    } catch (error) {
      toast.error('Failed to create tasks');
      console.error('Task creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedSlotIds, contentSlots, assignments, dueDates, priorities,
    submissionId, applicationNumber, sequenceNumber, productId, productName,
    createTask, assignTask, sendNotifications, toast, onAssignmentComplete, onClose
  ]);
  
  // Calculate summary stats
  const summary = useMemo(() => {
    let totalAssignments = 0;
    const uniqueUsers = new Set<string>();
    
    selectedSlotIds.forEach(slotId => {
      const slotAssignments = assignments[slotId] || [];
      totalAssignments += slotAssignments.length;
      slotAssignments.forEach(a => uniqueUsers.add(a.userId));
    });
    
    return {
      slotsSelected: selectedSlotIds.size,
      totalAssignments,
      uniqueUsers: uniqueUsers.size,
    };
  }, [selectedSlotIds, assignments]);
  
  if (!isOpen) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Content Tasks"
      size="xl"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-border bg-surface-card">
          <div className="flex items-center gap-4">
            {(['select-content', 'assign-team', 'set-dates', 'review'] as const).map((s, idx) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => setStep(s)}
                  className={`flex items-center gap-2 text-sm ${
                    step === s 
                      ? 'text-accent-blue font-medium' 
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${step === s 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-surface-elevated text-text-muted'
                    }
                  `}>
                    {idx + 1}
                  </span>
                  {s === 'select-content' && 'Select Content'}
                  {s === 'assign-team' && 'Assign Team'}
                  {s === 'set-dates' && 'Set Dates'}
                  {s === 'review' && 'Review'}
                </button>
                {idx < 3 && <ChevronRight className="w-4 h-4 text-text-muted" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Select Content */}
          {step === 'select-content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">Select Content to Assign</h3>
                  <p className="text-sm text-text-muted">Choose the documents that need task assignments</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllSlots}>Select All</Button>
                  <Button variant="ghost" size="sm" onClick={clearSelections}>Clear</Button>
                </div>
              </div>
              
              <div className="space-y-2">
                {contentSlots.map(slot => (
                  <ContentSlotRow
                    key={slot.id}
                    slot={slot}
                    isSelected={selectedSlotIds.has(slot.id)}
                    assignments={assignments[slot.id] || []}
                    onToggle={() => toggleSlot(slot.id)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Step 2: Assign Team */}
          {step === 'assign-team' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-text-primary">Assign Team Members</h3>
                <p className="text-sm text-text-muted">
                  Select team members and their RACI roles for {selectedSlotIds.size} selected items
                </p>
              </div>
              
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members..."
              />
              
              <div className="grid grid-cols-2 gap-3">
                {filteredTeam.map(member => {
                  // Check if this member is assigned to any selected slot
                  const existingRole = Array.from(selectedSlotIds)
                    .map(slotId => assignments[slotId]?.find(a => a.userId === member.id))
                    .find(a => a)?.role;
                  
                  return (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      isSelected={!!existingRole}
                      selectedRole={existingRole}
                      onSelect={() => {
                        if (!existingRole) {
                          addAssignment(member, 'R');
                        }
                      }}
                      onRoleChange={(role) => addAssignment(member, role)}
                    />
                  );
                })}
              </div>
              
              {/* RACI Legend */}
              <div className="p-3 bg-surface-card rounded-lg border border-border">
                <div className="text-xs font-medium text-text-muted mb-2">RACI Roles</div>
                <div className="flex items-center gap-4">
                  {RACI_ROLES.map(role => (
                    <div key={role.value} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded text-xs flex items-center justify-center ${role?.color ?? ''}`}>
                        {role.value}
                      </span>
                      <span className="text-xs text-text-secondary">{role.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Set Dates */}
          {step === 'set-dates' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-text-primary">Set Due Dates & Priority</h3>
                <p className="text-sm text-text-muted">Configure deadlines for selected tasks</p>
              </div>
              
              {/* Bulk date setter */}
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-sm font-medium text-text-primary mb-3">
                  Set for all {selectedSlotIds.size} selected items:
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-text-muted block mb-1">Due Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm"
                      onChange={(e) => setDueDateForSelected(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-text-muted block mb-1">Priority</label>
                    <select
                      className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm"
                      onChange={(e) => setPriorityForSelected(e.target.value as TaskPriority)}
                    >
                      {PRIORITY_OPTIONS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Individual overrides */}
              <div className="space-y-2">
                {Array.from(selectedSlotIds).map(slotId => {
                  const slot = contentSlots.find(s => s.id === slotId);
                  if (!slot) return null;
                  
                  return (
                    <div key={slotId} className="p-3 bg-surface-elevated rounded-lg flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-text-primary">{slot.documentTitle}</span>
                        <span className="text-xs text-text-muted ml-2">{slot.section}</span>
                      </div>
                      <input
                        type="date"
                        value={dueDates[slotId] || ''}
                        onChange={(e) => setDueDates(prev => ({ ...prev, [slotId]: e.target.value }))}
                        className="px-2 py-1 bg-surface-card border border-border rounded text-sm text-text-primary w-36"
                      />
                      <select
                        value={priorities[slotId] || 'medium'}
                        onChange={(e) => setPriorities(prev => ({ ...prev, [slotId]: e.target.value as TaskPriority }))}
                        className="px-2 py-1 bg-surface-card border border-border rounded text-sm text-text-primary w-24"
                      >
                        {PRIORITY_OPTIONS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-text-primary">Review & Confirm</h3>
                <p className="text-sm text-text-muted">Review task assignments before creating</p>
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-surface-card rounded-lg border border-border text-center">
                  <div className="text-3xl font-bold text-accent-blue">{summary.slotsSelected}</div>
                  <div className="text-sm text-text-muted">Tasks to Create</div>
                </div>
                <div className="p-4 bg-surface-card rounded-lg border border-border text-center">
                  <div className="text-3xl font-bold text-accent-green">{summary.totalAssignments}</div>
                  <div className="text-sm text-text-muted">Total Assignments</div>
                </div>
                <div className="p-4 bg-surface-card rounded-lg border border-border text-center">
                  <div className="text-3xl font-bold text-accent-purple">{summary.uniqueUsers}</div>
                  <div className="text-sm text-text-muted">Team Members</div>
                </div>
              </div>
              
              {/* Notification Toggle */}
              <div className="p-4 bg-surface-card rounded-lg border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-accent-blue" />
                  <div>
                    <div className="text-sm font-medium text-text-primary">Send Notifications</div>
                    <div className="text-xs text-text-muted">Email assigned team members about their new tasks</div>
                  </div>
                </div>
                <button
                  onClick={() => setSendNotifications(!sendNotifications)}
                  className={`
                    w-12 h-6 rounded-full transition-colors relative
                    ${sendNotifications ? 'bg-accent-blue' : 'bg-surface-elevated border border-border'}
                  `}
                >
                  <span className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                    ${sendNotifications ? 'left-7' : 'left-1'}
                  `} />
                </button>
              </div>
              
              {/* Task Preview List */}
              <div className="space-y-2 max-h-64 overflow-auto">
                {Array.from(selectedSlotIds).map(slotId => {
                  const slot = contentSlots.find(s => s.id === slotId);
                  const slotAssignments = assignments[slotId] || [];
                  const dueDate = dueDates[slotId];
                  const priority = priorities[slotId] || 'medium';
                  
                  if (!slot) return null;
                  
                  return (
                    <div key={slotId} className="p-3 bg-surface-elevated rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-surface-card px-1.5 py-0.5 rounded text-text-muted">
                            {slot.section}
                          </span>
                          <span className="text-sm font-medium text-text-primary">{slot.documentTitle}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                          priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {slotAssignments.length > 0 
                            ? slotAssignments.map(a => `${a.userName} (${a.role})`).join(', ')
                            : 'No assignment'
                          }
                        </span>
                        {dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-card flex items-center justify-between">
          <div className="text-sm text-text-muted">
            {step === 'select-content' && `${selectedSlotIds.size} items selected`}
            {step === 'assign-team' && `${summary.totalAssignments} assignments configured`}
            {step === 'set-dates' && `${Object.keys(dueDates).length} dates set`}
            {step === 'review' && 'Ready to create tasks'}
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            
            {step !== 'select-content' && (
              <Button
                variant="secondary"
                onClick={() => {
                  const steps = ['select-content', 'assign-team', 'set-dates', 'review'] as const;
                  const currentIdx = steps.indexOf(step);
                  if (currentIdx > 0) setStep(steps[currentIdx - 1]);
                }}
              >
                Back
              </Button>
            )}
            
            {step !== 'review' ? (
              <Button
                variant="primary"
                disabled={step === 'select-content' && selectedSlotIds.size === 0}
                onClick={() => {
                  const steps = ['select-content', 'assign-team', 'set-dates', 'review'] as const;
                  const currentIdx = steps.indexOf(step);
                  if (currentIdx < steps.length - 1) setStep(steps[currentIdx + 1]);
                }}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedSlotIds.size === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Create {summary.slotsSelected} Tasks
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TaskAssignmentPanel;
