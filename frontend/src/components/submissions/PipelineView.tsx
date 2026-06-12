

import { useState, useMemo } from 'react';
import {
  Calendar, ChevronRight, ChevronDown, ChevronLeft, CheckCircle, Clock, AlertTriangle,
  Flag, Users, FileText, Globe, BarChart3, Layers, User, UserCircle,
  GanttChart, CalendarDays, List, Filter, Plus, ExternalLink, RefreshCcw, Link2
} from 'lucide-react';
import { authoringDocuments } from '@/data/authoring-data';

type ViewType = 'gantt' | 'calendar' | 'plan';
type RACIRole = 'R' | 'A' | 'C' | 'I';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface Task {
  id: string;
  name: string;
  documentId?: string;
  documentType?: string;
  startDate: string;
  endDate: string;
  status: 'not-started' | 'in-progress' | 'complete' | 'at-risk' | 'blocked';
  progress: number;
  raci: {
    responsible?: TeamMember;
    accountable?: TeamMember;
    consulted?: TeamMember[];
    informed?: TeamMember[];
  };
  children?: Task[];
}

interface SubmissionPlan {
  id: string;
  title: string;
  product: string;
  type: string;
  region: string;
  targetDate: string;
  status: 'on-track' | 'at-risk' | 'delayed' | 'planning';
  progress: number;
  tasks: Task[];
}

// Mock team members
const teamMembers: TeamMember[] = [
  { id: 'tm-1', name: 'Jennifer Park', role: 'Medical Writer' },
  { id: 'tm-2', name: 'Dr. Sarah Chen', role: 'Clinical Lead' },
  { id: 'tm-3', name: 'David Kim', role: 'Regulatory Lead' },
  { id: 'tm-4', name: 'Amanda Foster', role: 'Project Manager' },
  { id: 'tm-5', name: 'Maria Santos', role: 'Biostatistician' },
  { id: 'tm-6', name: 'Dr. Robert Kim', role: 'Safety Physician' },
  { id: 'tm-7', name: 'James Wilson', role: 'QC Specialist' },
  { id: 'tm-8', name: 'Lisa Thompson', role: 'CMC Lead' },
];

// Mock submission plans with tasks linked to authoring documents
const submissionPlans: SubmissionPlan[] = [
  {
    id: 'plan-1',
    title: 'IND Submission - Ligrastinib',
    product: 'LIG-2847',
    type: 'IND',
    region: 'FDA',
    targetDate: '2025-06-15',
    status: 'on-track',
    progress: 65,
    tasks: [
      {
        id: 'task-1',
        name: 'Module 2 - CTD Summaries',
        startDate: '2025-01-01',
        endDate: '2025-04-15',
        status: 'in-progress',
        progress: 70,
        raci: {
          responsible: teamMembers[0],
          accountable: teamMembers[1],
          consulted: [teamMembers[4], teamMembers[5]],
          informed: [teamMembers[3]],
        },
        children: [
          {
            id: 'task-1-1',
            name: 'Clinical Overview (2.5)',
            documentId: 'doc-m25-draft',
            documentType: 'module-25',
            startDate: '2025-01-15',
            endDate: '2025-03-01',
            status: 'in-progress',
            progress: 80,
            raci: {
              responsible: teamMembers[0],
              accountable: teamMembers[1],
            },
          },
          {
            id: 'task-1-2',
            name: 'Clinical Summary (2.7)',
            documentId: 'doc-m27-draft',
            documentType: 'module-27',
            startDate: '2025-02-01',
            endDate: '2025-03-15',
            status: 'in-progress',
            progress: 60,
            raci: {
              responsible: teamMembers[0],
              accountable: teamMembers[1],
            },
          },
          {
            id: 'task-1-3',
            name: 'Nonclinical Overview (2.4)',
            documentId: 'doc-m24-draft',
            documentType: 'module-24',
            startDate: '2025-01-15',
            endDate: '2025-02-28',
            status: 'complete',
            progress: 100,
            raci: {
              responsible: teamMembers[5],
              accountable: teamMembers[1],
            },
          },
        ],
      },
      {
        id: 'task-2',
        name: 'Module 3 - Quality',
        startDate: '2025-01-01',
        endDate: '2025-05-01',
        status: 'in-progress',
        progress: 55,
        raci: {
          responsible: teamMembers[7],
          accountable: teamMembers[2],
          consulted: [teamMembers[6]],
          informed: [teamMembers[3]],
        },
        children: [
          {
            id: 'task-2-1',
            name: 'Drug Substance (3.2.S)',
            documentId: 'doc-32s-draft',
            documentType: 'module-32s',
            startDate: '2025-01-01',
            endDate: '2025-03-15',
            status: 'complete',
            progress: 100,
            raci: {
              responsible: teamMembers[7],
              accountable: teamMembers[2],
            },
          },
          {
            id: 'task-2-2',
            name: 'Drug Product (3.2.P)',
            documentId: 'doc-32p-draft',
            documentType: 'module-32p',
            startDate: '2025-02-01',
            endDate: '2025-04-30',
            status: 'in-progress',
            progress: 45,
            raci: {
              responsible: teamMembers[7],
              accountable: teamMembers[2],
            },
          },
        ],
      },
      {
        id: 'task-3',
        name: 'Module 5 - Clinical Study Reports',
        startDate: '2024-11-01',
        endDate: '2025-05-15',
        status: 'in-progress',
        progress: 75,
        raci: {
          responsible: teamMembers[0],
          accountable: teamMembers[1],
          consulted: [teamMembers[4]],
          informed: [teamMembers[2], teamMembers[3]],
        },
        children: [
          {
            id: 'task-3-1',
            name: 'CSR LIG-301',
            documentId: 'doc-csr-301',
            documentType: 'csr',
            startDate: '2024-11-01',
            endDate: '2025-03-30',
            status: 'in-progress',
            progress: 78,
            raci: {
              responsible: teamMembers[0],
              accountable: teamMembers[1],
            },
          },
          {
            id: 'task-3-2',
            name: 'CSR LIG-102 (Phase 1)',
            documentId: 'doc-csr-102',
            documentType: 'csr',
            startDate: '2024-11-01',
            endDate: '2025-02-15',
            status: 'complete',
            progress: 100,
            raci: {
              responsible: teamMembers[0],
              accountable: teamMembers[1],
            },
          },
        ],
      },
      {
        id: 'task-4',
        name: 'eCTD Compilation & QC',
        startDate: '2025-05-01',
        endDate: '2025-06-10',
        status: 'not-started',
        progress: 0,
        raci: {
          responsible: teamMembers[6],
          accountable: teamMembers[2],
          consulted: [teamMembers[3]],
          informed: [teamMembers[1]],
        },
      },
      {
        id: 'task-5',
        name: 'Gateway Submission',
        startDate: '2025-06-10',
        endDate: '2025-06-15',
        status: 'not-started',
        progress: 0,
        raci: {
          responsible: teamMembers[2],
          accountable: teamMembers[2],
          informed: [teamMembers[1], teamMembers[3]],
        },
      },
    ],
  },
  {
    id: 'plan-2',
    title: 'CTA Submission - EU',
    product: 'LIG-2847',
    type: 'CTA',
    region: 'EMA',
    targetDate: '2025-07-01',
    status: 'on-track',
    progress: 45,
    tasks: [
      {
        id: 'task-cta-1',
        name: 'IMPD Preparation',
        startDate: '2025-02-01',
        endDate: '2025-05-15',
        status: 'in-progress',
        progress: 50,
        raci: {
          responsible: teamMembers[7],
          accountable: teamMembers[2],
        },
      },
      {
        id: 'task-cta-2',
        name: 'Protocol Adaptation (EU)',
        startDate: '2025-03-01',
        endDate: '2025-05-01',
        status: 'in-progress',
        progress: 40,
        raci: {
          responsible: teamMembers[0],
          accountable: teamMembers[1],
        },
      },
    ],
  },
  {
    id: 'plan-3',
    title: 'NDA Submission - Cardivex',
    product: 'CDX-4521',
    type: 'NDA',
    region: 'FDA',
    targetDate: '2025-09-30',
    status: 'at-risk',
    progress: 30,
    tasks: [
      {
        id: 'task-nda-1',
        name: 'Integrated Summary of Safety',
        startDate: '2025-01-15',
        endDate: '2025-06-01',
        status: 'at-risk',
        progress: 25,
        raci: {
          responsible: teamMembers[5],
          accountable: teamMembers[1],
        },
      },
      {
        id: 'task-nda-2',
        name: 'Integrated Summary of Efficacy',
        startDate: '2025-02-01',
        endDate: '2025-06-15',
        status: 'in-progress',
        progress: 35,
        raci: {
          responsible: teamMembers[4],
          accountable: teamMembers[1],
        },
      },
    ],
  },
];

const statusColors = {
  'not-started': 'bg-slate-500',
  'in-progress': 'bg-accent-blue',
  'complete': 'bg-accent-green',
  'at-risk': 'bg-amber-500',
  'blocked': 'bg-accent-red',
};

const statusBgColors = {
  'not-started': 'bg-slate-500/20 text-slate-400',
  'in-progress': 'bg-accent-blue/20 text-accent-blue',
  'complete': 'bg-accent-green/20 text-accent-green',
  'at-risk': 'bg-amber-500/20 text-amber-400',
  'blocked': 'bg-accent-red/20 text-accent-red',
};

interface PipelineViewProps {
  onNavigateToAuthoring?: (documentId: string) => void;
}

export function PipelineView({ onNavigateToAuthoring }: PipelineViewProps) {
  const [viewType, setViewType] = useState<ViewType>('plan');
  const [selectedPlan, setSelectedPlan] = useState<SubmissionPlan | null>(submissionPlans[0]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set(['task-1', 'task-2', 'task-3']));
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0, 1)); // Jan 2025
  
  const toggleTask = (taskId: string) => {
    const next = new Set(expandedTasks);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    setExpandedTasks(next);
  };
  
  // Get authoring document status
  const getDocumentStatus = (documentId?: string) => {
    if (!documentId) return null;
    const doc = authoringDocuments.find(d => d.id === documentId);
    return doc?.status || null;
  };
  
  // Get sync status between task progress and authoring document progress
  const getSyncStatus = (task: Task): 'synced' | 'behind' | 'ahead' | 'no-link' => {
    if (!task.documentId) return 'no-link';
    const doc = authoringDocuments.find(d => d.id === task.documentId);
    if (!doc) return 'no-link';
    
    const docProgress = doc.progress;
    const taskProgress = task.progress;
    
    // Consider synced if within 5% tolerance
    if (Math.abs(docProgress - taskProgress) <= 5) return 'synced';
    if (docProgress > taskProgress) return 'behind'; // Task is behind the actual document
    return 'ahead'; // Task shows more progress than actual document
  };
  
  // Get derived status from authoring document
  const getDerivedTaskStatus = (task: Task): typeof task.status => {
    if (!task.documentId) return task.status;
    const doc = authoringDocuments.find(d => d.id === task.documentId);
    if (!doc) return task.status;
    
    switch (doc.status) {
      case 'approved':
      case 'submission-ready': return 'complete';
      case 'final-review':
      case 'qc-review':
      case 'cross-functional-review':
      case 'internal-review': return 'in-progress';
      case 'drafting': return task.progress > 20 ? 'in-progress' : 'not-started';
      default: return task.status;
    }
  };
  
  // Calculate Gantt bar position
  const getGanttPosition = (startDate: string, endDate: string) => {
    const planStart = new Date('2025-01-01');
    const planEnd = new Date('2025-07-31');
    const totalDays = (planEnd.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startOffset = Math.max(0, (start.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };
  
  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };
  
  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const tasks: { plan: SubmissionPlan; task: Task }[] = [];
    
    submissionPlans.forEach(plan => {
      const checkTasks = (taskList: Task[]) => {
        taskList.forEach(task => {
          if (task.endDate === dateStr) {
            tasks.push({ plan, task });
          }
          if (task.children) {
            checkTasks(task.children);
          }
        });
      };
      checkTasks(plan.tasks);
      
      // Check if this is the submission target date
      if (plan.targetDate === dateStr) {
        tasks.push({ 
          plan, 
          task: { 
            id: `target-${plan.id}`, 
            name: `${plan.type} Target`, 
            startDate: dateStr, 
            endDate: dateStr, 
            status: 'not-started', 
            progress: 0, 
            raci: {} 
          } 
        });
      }
    });
    
    return tasks;
  };
  
  const renderRACIBadge = (role: RACIRole, member?: TeamMember) => {
    if (!member) return null;
    const colors = {
      R: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
      A: 'bg-accent-purple/20 text-accent-purple border-accent-purple/30',
      C: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      I: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${colors[role]}`} title={`${role}: ${member.name}`}>
        <span className="text-[10px] font-bold">{role}</span>
        <span className="text-[10px]">{member.name.split(' ')[0]}</span>
      </div>
    );
  };
  
  const renderTaskRow = (task: Task, depth: number = 0) => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const docStatus = getDocumentStatus(task.documentId);
    const syncStatus = getSyncStatus(task);
    const derivedStatus = getDerivedTaskStatus(task);
    
    // Get authoring document for additional info
    const authoringDoc = task.documentId 
      ? authoringDocuments.find(d => d.id === task.documentId) 
      : null;
    
    return (
      <div key={task.id}>
        <div 
          className={`flex items-center border-b border-border hover:bg-surface transition-colors ${depth > 0 ? 'bg-surface/50' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {/* Expand/Collapse */}
          <div className="w-6 flex-shrink-0">
            {hasChildren && (
              <button 
                onClick={() => toggleTask(task.id)}
                className="p-0.5 hover:bg-surface-card rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                )}
              </button>
            )}
          </div>
          
          {/* Task Name */}
          <div className="flex-1 py-3 pr-4 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${depth === 0 ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                {task.name}
              </span>
              {task.documentId && (
                <button 
                  onClick={() => onNavigateToAuthoring?.(task.documentId!)}
                  className="text-accent-blue hover:underline"
                  title="Open in Authoring"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              {/* Sync Status Badge */}
              {syncStatus === 'synced' && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium bg-accent-green/20 text-accent-green rounded">
                  <Link2 className="w-2.5 h-2.5" />
                  Synced
                </span>
              )}
              {syncStatus === 'behind' && (
                <span 
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium bg-accent-amber/20 text-accent-amber rounded cursor-pointer hover:bg-accent-amber/30"
                  title={`Authoring shows ${authoringDoc?.progress}% — click to sync`}
                >
                  <RefreshCcw className="w-2.5 h-2.5" />
                  Update Available
                </span>
              )}
              {syncStatus === 'ahead' && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium bg-slate-500/20 text-slate-400 rounded">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Review
                </span>
              )}
            </div>
            {docStatus && (
              <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-2">
                <span>
                  Authoring: <span className={docStatus === 'approved' ? 'text-accent-green' : 'text-amber-400'}>{docStatus.replace(/-/g, ' ')}</span>
                </span>
                {authoringDoc && syncStatus !== 'synced' && (
                  <span className="text-text-muted">
                    ({authoringDoc.progress}% complete)
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Status */}
          <div className="w-24 flex-shrink-0 py-3">
            <span className={`text-[10px] px-2 py-0.5 rounded ${statusBgColors[task.status]}`}>
              {task.status.replace('-', ' ')}
            </span>
          </div>
          
          {/* Progress */}
          <div className="w-20 flex-shrink-0 py-3">
            <div className="flex items-center gap-2">
              <div className="w-12 h-1.5 bg-surface-card rounded-full overflow-hidden">
                <div className={`h-full ${statusColors[task.status]}`} style={{ width: `${task.progress}%` }} />
              </div>
              <span className="text-[10px] text-text-muted">{task.progress}%</span>
            </div>
          </div>
          
          {/* Dates */}
          <div className="w-32 flex-shrink-0 py-3 text-[10px] text-text-muted">
            {task.startDate.slice(5)} → {task.endDate.slice(5)}
          </div>
          
          {/* RACI */}
          <div className="w-64 flex-shrink-0 py-3 flex items-center gap-1 flex-wrap">
            {renderRACIBadge('R', task.raci.responsible)}
            {renderRACIBadge('A', task.raci.accountable)}
            {task.raci.consulted?.slice(0, 1).map(m => renderRACIBadge('C', m))}
            {task.raci.informed?.slice(0, 1).map(m => renderRACIBadge('I', m))}
          </div>
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && task.children!.map(child => renderTaskRow(child, depth + 1))}
      </div>
    );
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Submission Pipeline</h2>
            <p className="text-sm text-text-muted">Plan, track, and manage submission timelines</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggles */}
            <div className="flex items-center bg-surface-card rounded-lg p-1">
              <button
                onClick={() => setViewType('plan')}
                className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors ${
                  viewType === 'plan' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Plan
              </button>
              <button
                onClick={() => setViewType('gantt')}
                className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors ${
                  viewType === 'gantt' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Gantt
              </button>
              <button
                onClick={() => setViewType('calendar')}
                className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors ${
                  viewType === 'calendar' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Calendar
              </button>
            </div>
          </div>
        </div>
        
        {/* Submission Plan Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {submissionPlans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
                selectedPlan?.id === plan.id
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                  : 'bg-surface-card text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              {plan.type} - {plan.region}
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                plan.status === 'on-track' ? 'bg-accent-green/20 text-accent-green' :
                plan.status === 'at-risk' ? 'bg-amber-500/20 text-amber-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {plan.progress}%
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {viewType === 'plan' && selectedPlan && (
          /* Plan View - Collapsible Task List with RACI */
          <div className="min-w-[1000px]">
            {/* Column Headers */}
            <div className="flex items-center border-b border-border bg-surface-elevated sticky top-0 z-10 text-xs text-text-muted font-medium">
              <div className="w-6 flex-shrink-0 pl-3" />
              <div className="flex-1 py-2 pr-4">Task</div>
              <div className="w-24 flex-shrink-0 py-2">Status</div>
              <div className="w-20 flex-shrink-0 py-2">Progress</div>
              <div className="w-32 flex-shrink-0 py-2">Dates</div>
              <div className="w-64 flex-shrink-0 py-2">RACI Assignments</div>
            </div>
            
            {/* Task Rows */}
            <div className="divide-y divide-border/50">
              {selectedPlan.tasks.map(task => renderTaskRow(task))}
            </div>
          </div>
        )}
        
        {viewType === 'gantt' && selectedPlan && (
          /* Gantt View */
          <div className="min-w-[1200px]">
            {/* Timeline Header */}
            <div className="flex border-b border-border bg-surface-elevated sticky top-0 z-10">
              <div className="w-64 flex-shrink-0 p-3 border-r border-border">
                <span className="text-xs font-medium text-text-muted">Task</span>
              </div>
              <div className="flex-1 flex">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((month, i) => (
                  <div key={month} className="flex-1 p-2 text-center border-r border-border last:border-r-0">
                    <span className="text-xs text-text-muted">{month} 2025</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Gantt Rows */}
            <div>
              {selectedPlan.tasks.map(task => {
                const pos = getGanttPosition(task.startDate, task.endDate);
                return (
                  <div key={task.id}>
                    <div className="flex border-b border-border hover:bg-surface/50">
                      <div className="w-64 flex-shrink-0 p-3 border-r border-border">
                        <div className="text-sm text-text-primary truncate">{task.name}</div>
                      </div>
                      <div className="flex-1 relative h-12">
                        <div 
                          className={`absolute top-3 h-6 rounded ${statusColors[task.status]} opacity-80`}
                          style={{ left: pos.left, width: pos.width }}
                        >
                          <div className="h-full bg-white/20 rounded" style={{ width: `${task.progress}%` }} />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                            {task.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Child tasks */}
                    {task.children?.map(child => {
                      const childPos = getGanttPosition(child.startDate, child.endDate);
                      return (
                        <div key={child.id} className="flex border-b border-border/50 hover:bg-surface/30">
                          <div className="w-64 flex-shrink-0 p-2 pl-8 border-r border-border">
                            <div className="text-xs text-text-secondary truncate">{child.name}</div>
                          </div>
                          <div className="flex-1 relative h-8">
                            <div 
                              className={`absolute top-2 h-4 rounded ${statusColors[child.status]} opacity-60`}
                              style={{ left: childPos.left, width: childPos.width }}
                            >
                              <div className="h-full bg-white/20 rounded" style={{ width: `${child.progress}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              
              {/* Target Date Marker */}
              <div className="flex border-b border-border">
                <div className="w-64 flex-shrink-0 p-3 border-r border-border">
                  <div className="text-sm font-medium text-accent-green flex items-center gap-2">
                    <Flag className="w-4 h-4" />
                    Submission Target
                  </div>
                </div>
                <div className="flex-1 relative h-12">
                  {(() => {
                    const targetPos = getGanttPosition(selectedPlan.targetDate, selectedPlan.targetDate);
                    return (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-accent-green"
                        style={{ left: targetPos.left }}
                      >
                        <div className="absolute -top-1 -left-2 w-4 h-4 bg-accent-green rounded-full flex items-center justify-center">
                          <Flag className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {viewType === 'calendar' && (
          /* Calendar View */
          <div className="p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-2 hover:bg-surface-card rounded"
              >
                <ChevronLeft className="w-5 h-5 text-text-muted" />
              </button>
              <h3 className="text-lg font-semibold text-text-primary">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-2 hover:bg-surface-card rounded"
              >
                <ChevronRight className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium text-text-muted">
                  {day}
                </div>
              ))}
              
              {/* Day Cells */}
              {getCalendarDays().map((date, i) => {
                const tasks = date ? getTasksForDate(date) : [];
                const isToday = date && date.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={i} 
                    className={`min-h-[100px] p-2 border border-border rounded-lg ${
                      date ? 'bg-surface-elevated' : 'bg-surface/50'
                    } ${isToday ? 'ring-2 ring-accent-blue' : ''}`}
                  >
                    {date && (
                      <>
                        <div className={`text-sm mb-2 ${isToday ? 'font-bold text-accent-blue' : 'text-text-muted'}`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {tasks.slice(0, 3).map(({ plan, task }) => (
                            <div 
                              key={task.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                                task.id.startsWith('target') 
                                  ? 'bg-accent-green/20 text-accent-green font-medium' 
                                  : statusBgColors[task.status]
                              }`}
                              title={`${plan.type}: ${task.name}`}
                            >
                              {task.id.startsWith('target') ? `🎯 ${plan.type}` : task.name}
                            </div>
                          ))}
                          {tasks.length > 3 && (
                            <div className="text-[10px] text-text-muted">+{tasks.length - 3} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent-green" /> Target Date</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent-blue" /> In Progress</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> At Risk</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-500" /> Not Started</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
