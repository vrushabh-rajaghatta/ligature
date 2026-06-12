

import { useState, useMemo } from 'react';
import {
  Sparkles, Brain, BarChart3, Activity, Clock, CheckCircle, AlertCircle,
  AlertTriangle, TrendingUp, TrendingDown, FileText, MessageSquare, Shield,
  Eye, Settings, Play, Pause, RefreshCw, ChevronRight, ChevronDown,
  Filter, Search, Download, Zap, Cpu, Users, DollarSign
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';

// Mock data for models
const mockModels = [
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    model: 'claude-sonnet-4-6',
    status: 'active' as const,
    usageToday: 2847,
    usageLimit: 10000,
    avgLatency: 1.2,
    successRate: 99.2,
    modules: ['Document Authoring', 'HAQ Response', 'Safety Narratives'],
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 4',
    provider: 'Anthropic',
    model: 'claude-haiku-4-20250514',
    status: 'active' as const,
    usageToday: 8234,
    usageLimit: 50000,
    avgLatency: 0.4,
    successRate: 99.8,
    modules: ['Document Review', 'QA Checks', 'Summarization'],
  },
];

const mockUsageData = [
  { timestamp: '00:00', requests: 45, tokens: 125000, latency: 1.1, errors: 0 },
  { timestamp: '04:00', requests: 12, tokens: 35000, latency: 1.0, errors: 0 },
  { timestamp: '08:00', requests: 89, tokens: 245000, latency: 1.3, errors: 1 },
  { timestamp: '12:00', requests: 156, tokens: 420000, latency: 1.4, errors: 0 },
  { timestamp: '16:00', requests: 203, tokens: 580000, latency: 1.2, errors: 2 },
  { timestamp: '20:00', requests: 78, tokens: 210000, latency: 1.1, errors: 0 },
];

const moduleUsage = [
  { module: 'HAQ Response', percentage: 35, requests: 3847, color: 'bg-accent-blue' },
  { module: 'Document Authoring', percentage: 28, requests: 3078, color: 'bg-accent-purple' },
  { module: 'Safety Narratives', percentage: 18, requests: 1978, color: 'bg-accent-amber' },
  { module: 'Document Review', percentage: 12, requests: 1318, color: 'bg-accent-green' },
  { module: 'Other', percentage: 7, requests: 769, color: 'bg-slate-500' },
];

// Recent AI activity mock
const recentActivity = [
  { id: 1, type: 'generation', module: 'HAQ', document: 'PK Analysis Response', user: 'Dr. Sarah Chen', time: '2 min ago', status: 'accepted' },
  { id: 2, type: 'generation', module: 'Authoring', document: 'Module 2.5 Section 3.2', user: 'James Miller', time: '5 min ago', status: 'pending' },
  { id: 3, type: 'review', module: 'Safety', document: 'PBRER Section 6', user: 'Dr. Robert Kim', time: '12 min ago', status: 'accepted' },
  { id: 4, type: 'generation', module: 'HAQ', document: 'Efficacy Clarification', user: 'Maria Santos', time: '18 min ago', status: 'rejected' },
  { id: 5, type: 'generation', module: 'Authoring', document: 'Module 2.7 Summary', user: 'Amanda Foster', time: '25 min ago', status: 'accepted' },
];

function StatCard({ icon, label, value, change, invertChange }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number;
  invertChange?: boolean;
}) {
  const isPositive = invertChange ? change < 0 : change > 0;
  return (
    <div className="bg-surface-elevated rounded-xl border border-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-surface-card rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm text-text-muted">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-text-primary">{value}</span>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      </div>
    </div>
  );
}

export function AIAdminPanel() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'generated' | 'accepted' | 'rejected'>('all');

  const entries = useAuditStore(s => s.entries);
  const aiAuditEntries = useMemo(() => {
    return entries.filter(e =>
      e.action === 'ai-generation' ||
      e.action === 'ai-regeneration' ||
      e.action === 'draft-accepted' ||
      e.action === 'draft-discarded'
    ).slice(0, 50);
  }, [entries]);

  const totalRequests = mockUsageData.reduce((acc, d) => acc + d.requests, 0);
  const totalTokens = mockUsageData.reduce((acc, d) => acc + d.tokens, 0);
  const avgLatency = mockUsageData.reduce((acc, d) => acc + d.latency, 0) / mockUsageData.length;
  const totalErrors = mockUsageData.reduce((acc, d) => acc + d.errors, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent-purple" />
            AI Oversight
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Monitor and configure AI model usage across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 text-sm bg-surface-card text-text-secondary rounded-lg hover:text-text-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button className="px-3 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Zap className="w-5 h-5 text-accent-blue" />} label="Requests Today" value={totalRequests.toLocaleString()} change={12.5} />
        <StatCard icon={<Cpu className="w-5 h-5 text-accent-purple" />} label="Tokens Used" value={`${(totalTokens / 1000000).toFixed(2)}M`} change={8.3} />
        <StatCard icon={<Clock className="w-5 h-5 text-accent-amber" />} label="Avg Latency" value={`${avgLatency.toFixed(2)}s`} change={-5.2} invertChange />
        <StatCard icon={<AlertCircle className="w-5 h-5 text-accent-red" />} label="Error Rate" value={`${((totalErrors / totalRequests) * 100).toFixed(2)}%`} change={-15.0} invertChange />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Model Status */}
        <div className="col-span-2 bg-surface-elevated rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Active Models</h3>
            <button className="p-1.5 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {mockModels.map((model) => (
              <div
                key={model.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedModel === model.id
                    ? 'border-accent-blue bg-accent-blue/5'
                    : 'border-border hover:border-border/80 bg-surface-card'
                }`}
                onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      model.status === 'active' ? 'bg-accent-green/20' : 'bg-slate-500/20'
                    }`}>
                      <Brain className={`w-5 h-5 ${model.status === 'active' ? 'text-accent-green' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{model.name}</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-accent-green/20 text-accent-green">
                          {model.status}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">{model.provider} • {model.model}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">{model.usageToday.toLocaleString()}</div>
                      <div className="text-xs text-text-muted">of {model.usageLimit.toLocaleString()}</div>
                    </div>
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text-muted">Usage</span>
                        <span className="text-text-primary">{Math.round((model.usageToday / model.usageLimit) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-blue rounded-full"
                          style={{ width: `${(model.usageToday / model.usageLimit) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">{model.avgLatency}s</div>
                      <div className="text-xs text-text-muted">latency</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-accent-green">{model.successRate}%</div>
                      <div className="text-xs text-text-muted">success</div>
                    </div>
                  </div>
                </div>
                {selectedModel === model.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-text-muted mb-2">Active Modules</div>
                    <div className="flex flex-wrap gap-2">
                      {model.modules.map((module) => (
                        <span key={module} className="px-2 py-1 bg-surface rounded-lg text-xs text-text-secondary">
                          {module}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Usage by Module */}
        <div className="bg-surface-elevated rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Usage by Module</h3>
          <div className="space-y-4">
            {moduleUsage.map((item) => (
              <div key={item.module}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">{item.module}</span>
                  <span className="text-text-primary font-medium">{item.percentage}%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className={`h-full ${item?.color ?? ''} rounded-full`} style={{ width: `${item.percentage}%` }} />
                </div>
                <div className="text-xs text-text-muted mt-1">{item.requests.toLocaleString()} requests</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent AI Activity */}
      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Recent AI Activity</h3>
          <div className="flex items-center gap-2">
            <select
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value as typeof auditFilter)}
              className="text-sm bg-surface-card border border-border rounded-lg px-3 py-1.5 text-text-secondary"
            >
              <option value="all">All Activity</option>
              <option value="generated">Generations</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="px-3 py-1.5 text-sm text-accent-blue hover:underline"
            >
              {showAuditLog ? 'Show Recent' : 'View Full Audit Log'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-card">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Activity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Module</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Document</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentActivity.map((item) => (
                <tr key={item.id} className="hover:bg-surface-card/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.type === 'generation' ? (
                        <Sparkles className="w-4 h-4 text-accent-purple" />
                      ) : (
                        <Eye className="w-4 h-4 text-accent-blue" />
                      )}
                      <span className="text-sm text-text-primary capitalize">{item.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{item.module}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{item.document}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{item.user}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.time}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      item.status === 'accepted' ? 'bg-accent-green/20 text-accent-green' :
                      item.status === 'rejected' ? 'bg-accent-red/20 text-accent-red' :
                      'bg-accent-amber/20 text-accent-amber'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance & Safety */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface-elevated rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-green" />
            21 CFR Part 11 Compliance
          </h3>
          <div className="space-y-3">
            <ComplianceItem label="AI Content Tracking" status="enabled" />
            <ComplianceItem label="Human Review Required" status="enabled" />
            <ComplianceItem label="Source Provenance Logged" status="enabled" />
            <ComplianceItem label="Audit Trail Complete" status="enabled" />
            <ComplianceItem label="Electronic Signatures" status="enabled" />
          </div>
        </div>

        <div className="bg-surface-elevated rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-blue" />
            AI Content Review Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-card rounded-lg">
              <div className="text-2xl font-bold text-accent-green">94.2%</div>
              <div className="text-sm text-text-muted">Acceptance Rate</div>
            </div>
            <div className="p-4 bg-surface-card rounded-lg">
              <div className="text-2xl font-bold text-text-primary">2.1</div>
              <div className="text-sm text-text-muted">Avg Revisions</div>
            </div>
            <div className="p-4 bg-surface-card rounded-lg">
              <div className="text-2xl font-bold text-accent-blue">847</div>
              <div className="text-sm text-text-muted">Docs This Week</div>
            </div>
            <div className="p-4 bg-surface-card rounded-lg">
              <div className="text-2xl font-bold text-accent-purple">12.4h</div>
              <div className="text-sm text-text-muted">Time Saved</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceItem({ label, status }: { label: string; status: 'enabled' | 'disabled' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
      <span className="text-sm text-text-primary">{label}</span>
      <span className="flex items-center gap-1 text-xs text-accent-green">
        <CheckCircle className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}
