
import { useState } from 'react';
import { 
  Calendar,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Flag,
  Users,
  FileText,
  Send,
  UserCircle,
  PenTool,
  Eye,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { FilterState } from '@/components/layout/FilterBar';
import { SubmissionsFilterBar, EMPTY_SUBMISSIONS_FILTER } from '@/components/submissions/SubmissionsFilterBar'; // v0.125.77
import type { SubmissionsFilter } from '@/components/submissions/SubmissionsFilterBar';

interface PlanningViewProps {
  filters?: FilterState;
}

type RACIRole = 'R' | 'A' | 'C' | 'I';
type ApprovalStatus = 'pending' | 'in-review' | 'approved' | 'rejected';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  workload: number;
  tasksAssigned: number;
  tasksDue: number;
}

const teamMembers: TeamMember[] = [
  { id: 'tm-1', name: 'Sarah Chen', role: 'Regulatory Director', department: 'Regulatory Affairs', email: 'schen@ligature.com', workload: 85, tasksAssigned: 12, tasksDue: 3 },
  { id: 'tm-2', name: 'Michael Roberts', role: 'CMC Lead', department: 'CMC', email: 'mroberts@ligature.com', workload: 72, tasksAssigned: 8, tasksDue: 2 },
  { id: 'tm-3', name: 'Jennifer Walsh', role: 'Medical Writer', department: 'Medical Writing', email: 'jwalsh@ligature.com', workload: 95, tasksAssigned: 15, tasksDue: 5 },
  { id: 'tm-4', name: 'David Kim', role: 'Clinical Lead', department: 'Clinical Operations', email: 'dkim@ligature.com', workload: 60, tasksAssigned: 6, tasksDue: 1 },
  { id: 'tm-5', name: 'Emily Thompson', role: 'Publishing Specialist', department: 'Regulatory Publishing', email: 'ethompson@ligature.com', workload: 45, tasksAssigned: 4, tasksDue: 0 },
  { id: 'tm-6', name: 'James Martinez', role: 'QA Manager', department: 'Quality Assurance', email: 'jmartinez@ligature.com', workload: 55, tasksAssigned: 5, tasksDue: 1 },
];

const raciMatrix = [
  { 
    document: '2.5 Clinical Overview', 
    section: 'Module 2',
    assignments: [
      { memberId: 'tm-3', role: 'R' as RACIRole },
      { memberId: 'tm-4', role: 'A' as RACIRole },
      { memberId: 'tm-1', role: 'C' as RACIRole },
    ]
  },
  { 
    document: '2.7 Clinical Summary', 
    section: 'Module 2',
    assignments: [
      { memberId: 'tm-3', role: 'R' as RACIRole },
      { memberId: 'tm-4', role: 'A' as RACIRole },
      { memberId: 'tm-1', role: 'I' as RACIRole },
    ]
  },
  { 
    document: '3.2.S Drug Substance', 
    section: 'Module 3',
    assignments: [
      { memberId: 'tm-2', role: 'R' as RACIRole },
      { memberId: 'tm-6', role: 'A' as RACIRole },
      { memberId: 'tm-1', role: 'I' as RACIRole },
    ]
  },
  { 
    document: '3.2.P Drug Product', 
    section: 'Module 3',
    assignments: [
      { memberId: 'tm-2', role: 'R' as RACIRole },
      { memberId: 'tm-6', role: 'A' as RACIRole },
    ]
  },
];

const raciColors: Record<RACIRole, string> = {
  'R': 'bg-accent-blue text-white',
  'A': 'bg-accent-green text-white',
  'C': 'bg-accent-amber text-white',
  'I': 'bg-slate-500 text-white',
};

const raciLabels: Record<RACIRole, string> = {
  'R': 'Responsible',
  'A': 'Accountable',
  'C': 'Consulted',
  'I': 'Informed',
};

export function PlanningView({ filters }: PlanningViewProps) {
  const [activeTab, setActiveTab] = useState<'team' | 'raci' | 'approvals'>('team');
  const [subFilter, setSubFilter] = useState<SubmissionsFilter>(EMPTY_SUBMISSIONS_FILTER); // v0.125.77
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Sub-tabs */}
      <div className="px-6 py-3 border-b border-border bg-surface-elevated flex items-center gap-4">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'team' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Users className="w-4 h-4" />
          Team Workload
        </button>
        <button
          onClick={() => setActiveTab('raci')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'raci' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText className="w-4 h-4" />
          RACI Matrix
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'approvals' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Approval Workflows
        </button>
      </div>

      {/* v0.125.77: Filter bar — parity with Submissions Hub */}
      <SubmissionsFilterBar value={subFilter} onChange={setSubFilter} />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={`bg-surface-elevated rounded-xl p-5 border cursor-pointer transition-colors ${
                    selectedMember?.id === member.id 
                      ? 'border-accent-blue' 
                      : 'border-border hover:border-accent-blue/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent-blue/20 flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-accent-blue" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-text-primary">{member.name}</div>
                      <div className="text-sm text-text-secondary">{member.role}</div>
                      <div className="text-xs text-text-muted">{member.department}</div>
                    </div>
                  </div>
                  
                  {/* Workload bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-muted">Workload</span>
                      <span className={`font-medium ${
                        member.workload >= 90 ? 'text-accent-red' :
                        member.workload >= 70 ? 'text-accent-amber' :
                        'text-accent-green'
                      }`}>
                        {member.workload}%
                      </span>
                    </div>
                    <div className="h-2 bg-surface-card rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          member.workload >= 90 ? 'bg-accent-red' :
                          member.workload >= 70 ? 'bg-accent-amber' :
                          'bg-accent-green'
                        }`}
                        style={{ width: `${member.workload}%` }}
                      />
                    </div>
                  </div>

                  {/* Task stats */}
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-text-muted" />
                      <span className="text-text-secondary">{member.tasksAssigned} tasks</span>
                    </div>
                    {member.tasksDue > 0 && (
                      <div className="flex items-center gap-1.5 text-accent-amber">
                        <Clock className="w-4 h-4" />
                        <span>{member.tasksDue} due soon</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'raci' && (
          <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">RACI Matrix</h3>
              <p className="text-sm text-text-muted mt-1">Responsibility assignment for key submission documents</p>
            </div>
            
            {/* RACI Legend */}
            <div className="px-4 py-3 border-b border-border bg-surface-card flex items-center gap-6">
              {Object.entries(raciLabels).map(([role, label]) => (
                <div key={role} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded text-xs flex items-center justify-center font-medium ${raciColors[role as RACIRole]}`}>
                    {role}
                  </span>
                  <span className="text-sm text-text-secondary">{label}</span>
                </div>
              ))}
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-text-muted">Document</th>
                    <th className="text-left p-4 text-sm font-medium text-text-muted">Section</th>
                    {teamMembers.slice(0, 6).map(member => (
                      <th key={member.id} className="text-center p-4 text-sm font-medium text-text-muted w-24">
                        <div className="truncate">{member.name.split(' ')[0]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {raciMatrix.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-surface-card/50">
                      <td className="p-4 text-sm text-text-primary font-medium">{row.document}</td>
                      <td className="p-4 text-sm text-text-secondary">{row.section}</td>
                      {teamMembers.slice(0, 6).map(member => {
                        const assignment = row.assignments.find(a => a.memberId === member.id);
                        return (
                          <td key={member.id} className="p-4 text-center">
                            {assignment && (
                              <span className={`inline-flex w-6 h-6 rounded text-xs items-center justify-center font-medium ${raciColors[assignment.role]}`}>
                                {assignment.role}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="bg-surface-elevated rounded-xl border border-border p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-amber/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent-amber" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">2.5 Clinical Overview</h3>
                  <p className="text-sm text-text-muted">Pending approval from Clinical Lead</p>
                </div>
              </div>
              
              {/* Approval Steps */}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 text-accent-green rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Author</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 text-accent-green rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Medical Review</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-amber/20 text-accent-amber rounded-lg text-sm animate-pulse">
                  <Clock className="w-4 h-4" />
                  <span>Clinical Lead</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 text-slate-400 rounded-lg text-sm">
                  <span>Reg Director</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-elevated rounded-xl border border-border p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-green/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-accent-green" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">3.2.S Drug Substance</h3>
                  <p className="text-sm text-text-muted">Approved - Ready for submission</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 text-accent-green rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Author</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 text-accent-green rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>CMC Review</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-green/20 text-accent-green rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>QA</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
