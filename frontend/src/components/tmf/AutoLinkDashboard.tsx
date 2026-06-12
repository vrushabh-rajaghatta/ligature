/**
 * TMF Auto-Link Dashboard
 * Dedicated management UI for auto-link rules and events
 * 
 * v0.40.9 - Auto-Link Dashboard
 */


import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Filter,
  ChevronRight,
  FileText,
  Shield,
  Zap,
  Activity,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface AutoLinkRule {
  id: string;
  name: string;
  description: string;
  sourceModule: string;
  sourceEventType: string;
  sourceConditions: Array<{ field: string; operator: string; value: string }>;
  targetZone: string;
  targetSectionId: string;
  targetArtifactId: string;
  targetLevel: string;
  isActive: boolean;
  autoFile: boolean;
  priority: number;
}

interface AutoLinkEvent {
  id: string;
  studyId: string;
  ruleId: string | null;
  ruleName: string | null;
  sourceModule: string;
  sourceEventType: string;
  sourceRecordId: string;
  sourceData: Record<string, any>;
  status: 'pending' | 'processed' | 'failed' | 'skipped';
  artifactId: string | null;
  errorMessage: string | null;
  eventTime: string;
  processedAt: string | null;
}

// =============================================================================
// MODULE ICONS & COLORS
// =============================================================================

const MODULE_ICONS: Record<string, React.ReactNode> = {
  ctms: <Activity className="w-4 h-4" />,
  safety: <AlertTriangle className="w-4 h-4" />,
  authoring: <FileText className="w-4 h-4" />,
  submissions: <Shield className="w-4 h-4" />,
  publishing: <ExternalLink className="w-4 h-4" />,
  edc: <Activity className="w-4 h-4" />,
  manual: <Settings className="w-4 h-4" />,
};

const MODULE_COLORS: Record<string, string> = {
  ctms: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  safety: 'bg-red-500/20 text-red-400 border-red-500/30',
  authoring: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  submissions: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  publishing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  edc: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  manual: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const ZONE_NAMES: Record<string, string> = {
  'zone-01': 'Trial Management',
  'zone-02': 'Central Trial Documents',
  'zone-03': 'Regulatory',
  'zone-04': 'IRB/IEC Approvals',
  'zone-05': 'Site Management',
  'zone-06': 'IP and Trial Supplies',
  'zone-07': 'Safety Reporting',
  'zone-08': 'Central/Local Testing',
  'zone-09': 'Third Parties',
  'zone-10': 'Data Management',
};

// =============================================================================
// COMPONENT
// =============================================================================

interface AutoLinkDashboardProps {
  studyId?: string;
}

export function AutoLinkDashboard({ studyId }: AutoLinkDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'events'>('overview');
  const [rules, setRules] = useState<AutoLinkRule[]>([]);
  const [events, setEvents] = useState<AutoLinkEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [rulesRes, eventsRes] = await Promise.all([
          fetch('/api/tmf/auto-link?type=rules'),
          fetch(`/api/tmf/auto-link?type=events${studyId ? `&studyId=${studyId}` : ''}`),
        ]);
        
        const rulesData = await rulesRes.json();
        const eventsData = await eventsRes.json();
        
        setRules(rulesData.data || []);
        setEvents(eventsData.data || []);
      } catch (error) {
        console.error('Failed to fetch auto-link data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [studyId]);

  // Stats
  const stats = useMemo(() => {
    const processed = events.filter(e => e.status === 'processed').length;
    const failed = events.filter(e => e.status === 'failed').length;
    const skipped = events.filter(e => e.status === 'skipped').length;
    const pending = events.filter(e => e.status === 'pending').length;
    const activeRules = rules.filter(r => r.isActive).length;
    
    const byModule = events.reduce((acc, e) => {
      acc[e.sourceModule] = (acc[e.sourceModule] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { processed, failed, skipped, pending, activeRules, totalRules: rules.length, byModule };
  }, [events, rules]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    if (selectedModule) filtered = filtered.filter(e => e.sourceModule === selectedModule);
    if (selectedStatus) filtered = filtered.filter(e => e.status === selectedStatus);
    return filtered;
  }, [events, selectedModule, selectedStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Link2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Auto-Link Management</h2>
            <p className="text-sm text-text-muted">Cross-module document linking to TMF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg hover:border-cyan-500/50 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-card rounded-lg border border-border w-fit">
        {(['overview', 'rules', 'events'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Processed</p>
                  <p className="text-2xl font-bold text-emerald-400">{stats.processed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-500/30" />
              </div>
            </div>
            <div className="bg-surface-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Failed</p>
                  <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500/30" />
              </div>
            </div>
            <div className="bg-surface-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Skipped</p>
                  <p className="text-2xl font-bold text-amber-400">{stats.skipped}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500/30" />
              </div>
            </div>
            <div className="bg-surface-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Active Rules</p>
                  <p className="text-2xl font-bold text-cyan-400">{stats.activeRules}/{stats.totalRules}</p>
                </div>
                <Zap className="w-8 h-8 text-cyan-500/30" />
              </div>
            </div>
          </div>

          {/* Module Breakdown */}
          <div className="bg-surface-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-text-primary">Events by Source Module</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.byModule).map(([module, count]) => (
                <button
                  key={module}
                  onClick={() => { setSelectedModule(module); setActiveTab('events'); }}
                  className={`p-3 rounded-lg border ${MODULE_COLORS[module]} hover:opacity-80 transition-opacity`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {MODULE_ICONS[module]}
                    <span className="text-sm font-medium capitalize">{module}</span>
                  </div>
                  <p className="text-xl font-bold">{count}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-surface-card rounded-lg border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-text-primary">Recent Events</h3>
              <button
                onClick={() => setActiveTab('events')}
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="p-3 flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${
                    event.status === 'processed' ? 'bg-emerald-500/20' :
                    event.status === 'failed' ? 'bg-red-500/20' :
                    event.status === 'skipped' ? 'bg-amber-500/20' : 'bg-gray-500/20'
                  }`}>
                    {event.status === 'processed' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                     event.status === 'failed' ? <XCircle className="w-4 h-4 text-red-400" /> :
                     event.status === 'skipped' ? <Clock className="w-4 h-4 text-amber-400" /> :
                     <Clock className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {event.ruleName || event.sourceEventType}
                    </p>
                    <p className="text-xs text-text-muted">
                      {event.sourceModule} • {new Date(event.eventTime).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    event.status === 'processed' ? 'bg-emerald-500/20 text-emerald-400' :
                    event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    event.status === 'skipped' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="bg-surface-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-text-primary">Auto-Link Rules (DIA Reference Model)</h3>
            <p className="text-sm text-text-muted mt-1">Rules that map source events to TMF zones</p>
          </div>
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <div key={rule.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded border ${MODULE_COLORS[rule.sourceModule]}`}>
                        {rule.sourceModule}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${rule.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {rule.autoFile && (
                        <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">
                          Auto-File
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-text-primary">{rule.name}</h4>
                    <p className="text-sm text-text-muted mt-1">{rule.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {rule.sourceEventType}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {ZONE_NAMES[rule.targetZone] || rule.targetZone} ({rule.targetSectionId})
                      </span>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
                    {rule.isActive ? <Pause className="w-4 h-4 text-text-muted" /> : <Play className="w-4 h-4 text-text-muted" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-muted">Filter:</span>
            </div>
            <select
              value={selectedModule || ''}
              onChange={(e) => setSelectedModule(e.target.value || null)}
              className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg"
            >
              <option value="">All Modules</option>
              <option value="ctms">CTMS</option>
              <option value="safety">Safety</option>
              <option value="authoring">Authoring</option>
              <option value="submissions">Submissions</option>
            </select>
            <select
              value={selectedStatus || ''}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
              <option value="pending">Pending</option>
            </select>
            {(selectedModule || selectedStatus) && (
              <button
                onClick={() => { setSelectedModule(null); setSelectedStatus(null); }}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Events Table */}
          <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Rule/Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Record ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Artifact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                        event.status === 'processed' ? 'bg-emerald-500/20 text-emerald-400' :
                        event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        event.status === 'skipped' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {event.status === 'processed' ? <CheckCircle className="w-3 h-3" /> :
                         event.status === 'failed' ? <XCircle className="w-3 h-3" /> :
                         <Clock className="w-3 h-3" />}
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${MODULE_COLORS[event.sourceModule]}`}>
                        {MODULE_ICONS[event.sourceModule]}
                        {event.sourceModule}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-text-primary">{event.ruleName || event.sourceEventType}</p>
                      {event.errorMessage && (
                        <p className="text-xs text-red-400 mt-0.5">{event.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted font-mono">{event.sourceRecordId}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{new Date(event.eventTime).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {event.artifactId ? (
                        <span className="text-sm text-cyan-400 font-mono">{event.artifactId.slice(0, 12)}...</span>
                      ) : (
                        <span className="text-sm text-text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEvents.length === 0 && (
              <div className="p-8 text-center text-text-muted">
                <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No events found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AutoLinkDashboard;
