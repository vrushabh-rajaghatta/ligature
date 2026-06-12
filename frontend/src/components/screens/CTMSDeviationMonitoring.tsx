

import { useState, useMemo } from 'react';
import {
  AlertOctagon,
  Plus,
  CircleAlert,
  FileWarning,
  Shield,
  ListChecks,
  CircleCheck,
  CircleX,
  FlaskConical,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  UserCircle,
  FilePenLine,
  FileSearch,
  Clipboard,
  FileText,
  Play,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import type {
  CTMSStudy,
  ClinicalSite,
  ProtocolDeviation,
  DeviationCategory,
  DeviationSeverity,
  DeviationStatus,
  MonitoringVisit,
  MonitoringVisitType,
  MonitoringVisitStatus,
  MonitoringFinding,
} from '@/domains/ctms/contracts';
import { Card } from '@/components/ui/Card';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { useDeadClick } from '@/hooks/useDeadClick';

// =============================================================================
// COLOR MAPS
// =============================================================================

const deviationCategoryColorMap: Record<DeviationCategory, 'blue' | 'amber' | 'red' | 'purple' | 'teal' | 'gray'> = {
  'eligibility': 'red',
  'informed-consent': 'red',
  'study-procedures': 'amber',
  'safety-reporting': 'red',
  'ip-management': 'purple',
  'visit-schedule': 'blue',
  'prohibited-medication': 'amber',
  'data-collection': 'teal',
  'other': 'gray',
};

const deviationSeverityColorMap: Record<DeviationSeverity, 'gray' | 'amber' | 'red'> = {
  'minor': 'gray',
  'major': 'amber',
  'critical': 'red',
};

const deviationStatusColorMap: Record<DeviationStatus, 'blue' | 'amber' | 'purple' | 'green' | 'gray'> = {
  'identified': 'blue',
  'under-review': 'amber',
  'confirmed': 'purple',
  'resolved': 'green',
  'closed': 'gray',
};

const monitoringVisitTypeColorMap: Record<MonitoringVisitType, 'gray' | 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'red'> = {
  'site-selection': 'gray',
  'site-initiation': 'blue',
  'routine': 'green',
  'interim': 'purple',
  'for-cause': 'red',
  'closeout': 'amber',
  'remote': 'teal',
};

const monitoringVisitStatusColorMap: Record<MonitoringVisitStatus, 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'purple'> = {
  'planned': 'gray',
  'scheduled': 'blue',
  'in-progress': 'amber',
  'completed': 'green',
  'cancelled': 'red',
  'report-pending': 'purple',
};

// =============================================================================
// PROTOCOL DEVIATION DASHBOARD
// =============================================================================

interface ProtocolDeviationDashboardProps {
  studies: CTMSStudy[];
  sites: ClinicalSite[];
  deviations: ProtocolDeviation[];
  deviationsByStudy: Record<string, string[]>;
  onReportDeviation: (data: Partial<ProtocolDeviation>) => ProtocolDeviation;
  onUpdateDeviation: (id: string, updates: Partial<ProtocolDeviation>) => void;
  onCloseDeviation: (id: string, resolution: string) => void;
}

export function ProtocolDeviationDashboard({
  studies,
  sites,
  deviations,
  onCloseDeviation,
}: ProtocolDeviationDashboardProps) {
    const { deadClick } = useDeadClick();
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [selectedDeviation, setSelectedDeviation] = useState<ProtocolDeviation | null>(null);
  const [showNewDeviationModal, setShowNewDeviationModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DeviationStatus | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<DeviationSeverity | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<DeviationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const getSiteName = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    return site ? `${site.siteNumber} - ${site.name}` : siteId;
  };

  const getStudyName = (studyId: string) => {
    const study = studies.find(s => s.id === studyId);
    return study ? `${study.protocolNumber} - ${study.shortTitle}` : studyId;
  };

  const filteredDeviations = useMemo(() => {
    let filtered = deviations;
    if (selectedStudyId) filtered = filtered.filter(d => d.studyId === selectedStudyId);
    if (filterStatus !== 'all') filtered = filtered.filter(d => d.status === filterStatus);
    if (filterSeverity !== 'all') filtered = filtered.filter(d => d.severity === filterSeverity);
    if (filterCategory !== 'all') filtered = filtered.filter(d => d.category === filterCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => new Date(b.identifiedDate).getTime() - new Date(a.identifiedDate).getTime());
  }, [deviations, selectedStudyId, filterStatus, filterSeverity, filterCategory, searchQuery]);

  const stats = useMemo(() => {
    const byStatus: Record<DeviationStatus, number> = { 'identified': 0, 'under-review': 0, 'confirmed': 0, 'resolved': 0, 'closed': 0 };
    const bySeverity: Record<DeviationSeverity, number> = { 'minor': 0, 'major': 0, 'critical': 0 };
    let importantCount = 0;
    let requiresCapaCount = 0;
    deviations.forEach(d => {
      byStatus[d.status]++;
      bySeverity[d.severity]++;
      if (d.isImportant) importantCount++;
      if (d.requiresCapa) requiresCapaCount++;
    });
    const openCount = byStatus.identified + byStatus['under-review'] + byStatus.confirmed;
    return { byStatus, bySeverity, importantCount, requiresCapaCount, openCount, total: deviations.length };
  }, [deviations]);

  const categoryLabels: Record<DeviationCategory, string> = {
    'eligibility': 'Eligibility',
    'informed-consent': 'Informed Consent',
    'study-procedures': 'Study Procedures',
    'safety-reporting': 'Safety Reporting',
    'ip-management': 'IP Management',
    'visit-schedule': 'Visit Schedule',
    'prohibited-medication': 'Prohibited Medication',
    'data-collection': 'Data Collection',
    'other': 'Other',
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="ctms"
        title="Site Monitoring"
        subtitle="Schedule, track, and document monitoring visits across all clinical sites"
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <ButtonGroup>
              <Button variant={viewMode === 'list' ? 'primary' : 'outline'} onClick={() => setViewMode('list')}><Clipboard className="w-4 h-4" />List</Button>
              <Button variant={viewMode === 'calendar' ? 'primary' : 'outline'} onClick={() => setViewMode('calendar')}><Calendar className="w-4 h-4" />Calendar</Button>
            </ButtonGroup>
            <CapabilityGate moduleId="ctms" capability="author" inline>
              <Button variant="primary" size="sm" onClick={() => setShowScheduleModal(true)}>
                <Plus className="w-4 h-4" />Schedule Visit
              </Button>
            </CapabilityGate>
          </div>
        }
      />
      {/* Dashboard Header - legacy stats */}
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <AlertOctagon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Protocol Deviations</h2>
              <p className="text-sm text-text-muted">Track, categorize, and resolve protocol deviations across studies</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowNewDeviationModal(true)}>
            <Plus className="w-4 h-4" />Report Deviation
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><AlertOctagon className="w-4 h-4 text-amber-400" /><span className="text-xs text-text-muted">Open</span></div>
            <div className="text-xl font-semibold text-text-primary">{stats.openCount}</div>
            <div className="text-xs text-text-muted">of {stats.total} total</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><CircleAlert className="w-4 h-4 text-red-400" /><span className="text-xs text-text-muted">Critical</span></div>
            <div className="text-xl font-semibold text-red-400">{stats.bySeverity.critical}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><FileWarning className="w-4 h-4 text-amber-400" /><span className="text-xs text-text-muted">Major</span></div>
            <div className="text-xl font-semibold text-amber-400">{stats.bySeverity.major}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-purple-400" /><span className="text-xs text-text-muted">Important (GCP)</span></div>
            <div className="text-xl font-semibold text-purple-400">{stats.importantCount}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><ListChecks className="w-4 h-4 text-blue-400" /><span className="text-xs text-text-muted">Requires CAPA</span></div>
            <div className="text-xl font-semibold text-blue-400">{stats.requiresCapaCount}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><CircleCheck className="w-4 h-4 text-green-400" /><span className="text-xs text-text-muted">Resolved</span></div>
            <div className="text-xl font-semibold text-green-400">{stats.byStatus.resolved + stats.byStatus.closed}</div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-elevated border-b border-border px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <SearchInput placeholder="Search deviations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedStudyId || ''} onChange={(e) => setSelectedStudyId(e.target.value || null)} className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm">
            <option value="">All Studies</option>
            {studies.map(s => <option key={s.id} value={s.id}>{s.protocolNumber}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as DeviationStatus | 'all')} className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm">
            <option value="all">All Status</option>
            <option value="identified">Identified</option>
            <option value="under-review">Under Review</option>
            <option value="confirmed">Confirmed</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as DeviationSeverity | 'all')} className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm">
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as DeviationCategory | 'all')} className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm">
            <option value="all">All Categories</option>
            {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Deviations List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredDeviations.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <AlertOctagon className="w-16 h-16 mx-auto mb-4 opacity-30 text-text-muted" />
              <p className="text-lg font-medium text-text-muted mb-2">No Deviations Found</p>
              <p className="text-sm text-text-muted">Click &quot;Report Deviation&quot; to log a new protocol deviation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeviations.map(dev => (
              <Card key={dev.id} className={`p-4 cursor-pointer hover:border-accent-purple/50 transition-colors ${selectedDeviation?.id === dev.id ? 'border-accent-purple' : ''}`} onClick={() => setSelectedDeviation(dev)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-text-muted">{dev.id}</span>
                      <Badge color={deviationSeverityColorMap[dev.severity]} size="xs">{dev.severity}</Badge>
                      <Badge color={deviationStatusColorMap[dev.status]} size="xs">{dev.status.replace(/-/g, ' ')}</Badge>
                      <Badge color={deviationCategoryColorMap[dev.category]} size="xs">{categoryLabels[dev.category]}</Badge>
                      {dev.isImportant && <Badge color="purple" size="xs">Important</Badge>}
                      {dev.requiresCapa && <Badge color="blue" size="xs">CAPA</Badge>}
                    </div>
                    <h4 className="font-medium text-text-primary mb-1">{dev.title}</h4>
                    <p className="text-sm text-text-muted line-clamp-2">{dev.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><FlaskConical className="w-3 h-3" />{getStudyName(dev.studyId)}</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{getSiteName(dev.siteId)}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Occurred: {dev.occurredDate}</span>
                      <span className="flex items-center gap-1"><CalendarCheck className="w-3 h-3" />Identified: {dev.identifiedDate}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Deviation Detail Modal */}
      {selectedDeviation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[800px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Protocol Deviation Details</h2>
                  <p className="text-sm text-text-muted">{selectedDeviation.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDeviation(null)} className="p-2 hover:bg-surface-card rounded-lg">
                <CircleX className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Classification</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Severity</span>
                      <Badge color={deviationSeverityColorMap[selectedDeviation.severity]} size="sm">{selectedDeviation.severity}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Category</span>
                      <Badge color={deviationCategoryColorMap[selectedDeviation.category]} size="sm">{categoryLabels[selectedDeviation.category]}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Status</span>
                      <Badge color={deviationStatusColorMap[selectedDeviation.status]} size="sm">{selectedDeviation.status.replace(/-/g, ' ')}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">GCP Important</span>
                      <Badge color={selectedDeviation.isImportant ? 'purple' : 'gray'} size="sm">{selectedDeviation.isImportant ? 'Yes' : 'No'}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Requires CAPA</span>
                      <Badge color={selectedDeviation.requiresCapa ? 'blue' : 'gray'} size="sm">{selectedDeviation.requiresCapa ? 'Yes' : 'No'}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Occurred</span>
                      <span className="text-sm text-text-primary">{selectedDeviation.occurredDate}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Identified</span>
                      <span className="text-sm text-text-primary">{selectedDeviation.identifiedDate}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Reported</span>
                      <span className="text-sm text-text-primary">{selectedDeviation.reportedDate}</span>
                    </div>
                    {selectedDeviation.closedDate && (
                      <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                        <span className="text-sm text-text-muted">Closed</span>
                        <span className="text-sm text-text-primary">{selectedDeviation.closedDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Description</h3>
                <div className="p-4 bg-surface-card rounded-lg">
                  <h4 className="font-medium text-text-primary mb-2">{selectedDeviation.title}</h4>
                  <p className="text-sm text-text-secondary">{selectedDeviation.description}</p>
                </div>
              </div>

              {selectedDeviation.rootCause && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Root Cause</h3>
                  <p className="text-sm text-text-secondary p-4 bg-surface-card rounded-lg">{selectedDeviation.rootCause}</p>
                </div>
              )}

              {(selectedDeviation.correctiveAction || selectedDeviation.preventiveAction) && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">CAPA</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {selectedDeviation.correctiveAction && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-400 mb-2">Corrective Action</h4>
                        <p className="text-sm text-text-secondary">{selectedDeviation.correctiveAction}</p>
                      </div>
                    )}
                    {selectedDeviation.preventiveAction && (
                      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <h4 className="text-sm font-medium text-purple-400 mb-2">Preventive Action</h4>
                        <p className="text-sm text-text-secondary">{selectedDeviation.preventiveAction}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Reporting Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${selectedDeviation.reportedToIrb ? 'bg-green-500/10 border border-green-500/20' : 'bg-surface-card'}`}>
                    {selectedDeviation.reportedToIrb ? <CircleCheck className="w-4 h-4 text-green-400" /> : <CircleX className="w-4 h-4 text-text-muted" />}
                    <span className="text-sm">IRB/EC {selectedDeviation.irbReportDate && `(${selectedDeviation.irbReportDate})`}</span>
                  </div>
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${selectedDeviation.reportedToSponsor ? 'bg-green-500/10 border border-green-500/20' : 'bg-surface-card'}`}>
                    {selectedDeviation.reportedToSponsor ? <CircleCheck className="w-4 h-4 text-green-400" /> : <CircleX className="w-4 h-4 text-text-muted" />}
                    <span className="text-sm">Sponsor {selectedDeviation.sponsorReportDate && `(${selectedDeviation.sponsorReportDate})`}</span>
                  </div>
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${selectedDeviation.reportedToAuthority ? 'bg-green-500/10 border border-green-500/20' : 'bg-surface-card'}`}>
                    {selectedDeviation.reportedToAuthority ? <CircleCheck className="w-4 h-4 text-green-400" /> : <CircleX className="w-4 h-4 text-text-muted" />}
                    <span className="text-sm">Authority {selectedDeviation.authorityReportDate && `(${selectedDeviation.authorityReportDate})`}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-xs text-text-muted">
                Identified by: {selectedDeviation.identifiedBy} {selectedDeviation.reviewedBy && `• Reviewed by: ${selectedDeviation.reviewedBy}`}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedDeviation(null)}>Close</Button>
                {selectedDeviation.status !== 'closed' && (
                  <Button variant="primary" size="sm" onClick={() => { onCloseDeviation(selectedDeviation.id, 'Resolved per corrective actions'); setSelectedDeviation(null); }}>
                    <CircleCheck className="w-4 h-4" />Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Deviation Modal */}
      {showNewDeviationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[600px] shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <FilePenLine className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Report Protocol Deviation</h2>
                  <p className="text-sm text-text-muted">Document a new protocol deviation</p>
                </div>
              </div>
              <button onClick={() => setShowNewDeviationModal(false)} className="p-2 hover:bg-surface-card rounded-lg">
                <CircleX className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Study *</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option value="">Select Study...</option>
                  {studies.map(s => <option key={s.id} value={s.id}>{s.protocolNumber} - {s.shortTitle}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Site *</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option value="">Select Site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.siteNumber} - {s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">Category *</label>
                  <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                    {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">Severity *</label>
                  <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Title *</label>
                <input type="text" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" placeholder="Brief description of the deviation" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Description *</label>
                <textarea className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm h-24" placeholder="Detailed description..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">Date Occurred *</label>
                  <input type="date" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">Date Identified *</label>
                  <input type="date" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-sm text-text-primary">GCP Important Deviation</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowNewDeviationModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => setShowNewDeviationModal(false)}>
                <Plus className="w-4 h-4" />Report Deviation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MONITORING DASHBOARD
// =============================================================================

interface MonitoringDashboardProps {
  studies: CTMSStudy[];
  sites: ClinicalSite[];
  monitoringVisits: MonitoringVisit[];
  monitoringBySite: Record<string, string[]>;
  onScheduleVisit: (data: Partial<MonitoringVisit>) => MonitoringVisit;
  onUpdateVisit: (id: string, updates: Partial<MonitoringVisit>) => void;
  onCompleteVisit: (id: string, findings: MonitoringFinding[]) => void;
}

export function MonitoringDashboard({
  studies,
  sites,
  monitoringVisits,
}: MonitoringDashboardProps) {
  const { deadClick } = useDeadClick();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<MonitoringVisit | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [filterType, setFilterType] = useState<MonitoringVisitType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MonitoringVisitStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  const getSiteName = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    return site ? `${site.siteNumber} - ${site.name}` : siteId;
  };

  const getStudyName = (studyId: string) => {
    const study = studies.find(s => s.id === studyId);
    return study ? `${study.protocolNumber} - ${study.shortTitle}` : studyId;
  };

  const filteredVisits = useMemo(() => {
    let filtered = monitoringVisits;
    if (selectedSiteId) filtered = filtered.filter(v => v.siteId === selectedSiteId);
    if (filterType !== 'all') filtered = filtered.filter(v => v.visitType === filterType);
    if (filterStatus !== 'all') filtered = filtered.filter(v => v.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(v => v.monitorName.toLowerCase().includes(q) || getSiteName(v.siteId).toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
  }, [monitoringVisits, selectedSiteId, filterType, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const byStatus: Record<MonitoringVisitStatus, number> = { 'planned': 0, 'scheduled': 0, 'in-progress': 0, 'completed': 0, 'cancelled': 0, 'report-pending': 0 };
    let totalFindings = 0;
    let criticalFindings = 0;
    let overdueVisits = 0;
    const now = new Date();
    monitoringVisits.forEach(v => {
      byStatus[v.status]++;
      totalFindings += v.findingsCount;
      criticalFindings += v.criticalFindings;
      if ((v.status === 'planned' || v.status === 'scheduled') && new Date(v.plannedDate) < now) {
        overdueVisits++;
      }
    });
    const upcomingCount = byStatus.planned + byStatus.scheduled;
    return { byStatus, totalFindings, criticalFindings, overdueVisits, upcomingCount, total: monitoringVisits.length };
  }, [monitoringVisits]);

  const typeLabels: Record<MonitoringVisitType, string> = {
    'site-selection': 'Site Selection',
    'site-initiation': 'Site Initiation',
    'routine': 'Routine',
    'interim': 'Interim',
    'for-cause': 'For Cause',
    'closeout': 'Closeout',
    'remote': 'Remote',
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Dashboard Header */}
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Site Monitoring</h2>
              <p className="text-sm text-text-muted">Schedule, track, and document monitoring visits across all sites</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ButtonGroup>
              <Button variant={viewMode === 'list' ? 'primary' : 'outline'} onClick={() => setViewMode('list')}><Clipboard className="w-4 h-4" />List</Button>
              <Button variant={viewMode === 'calendar' ? 'primary' : 'outline'} onClick={() => setViewMode('calendar')}><Calendar className="w-4 h-4" />Calendar</Button>
            </ButtonGroup>
            <Button variant="primary" size="sm" onClick={() => setShowScheduleModal(true)}>
              <Plus className="w-4 h-4" />Schedule Visit
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><CalendarClock className="w-4 h-4 text-blue-400" /><span className="text-xs text-text-muted">Upcoming</span></div>
            <div className="text-xl font-semibold text-text-primary">{stats.upcomingCount}</div>
            <div className="text-xs text-text-muted">visits scheduled</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><CircleAlert className="w-4 h-4 text-red-400" /><span className="text-xs text-text-muted">Overdue</span></div>
            <div className="text-xl font-semibold text-red-400">{stats.overdueVisits}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><ClipboardCheck className="w-4 h-4 text-green-400" /><span className="text-xs text-text-muted">Completed</span></div>
            <div className="text-xl font-semibold text-green-400">{stats.byStatus.completed}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><FileSearch className="w-4 h-4 text-amber-400" /><span className="text-xs text-text-muted">Total Findings</span></div>
            <div className="text-xl font-semibold text-amber-400">{stats.totalFindings}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><CircleAlert className="w-4 h-4 text-red-400" /><span className="text-xs text-text-muted">Critical Findings</span></div>
            <div className="text-xl font-semibold text-red-400">{stats.criticalFindings}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-purple-400" /><span className="text-xs text-text-muted">Reports Pending</span></div>
            <div className="text-xl font-semibold text-purple-400">{stats.byStatus['report-pending']}</div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-elevated border-b border-border px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <SearchInput placeholder="Search visits, monitors, sites..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedSiteId || ''} onChange={(e) => setSelectedSiteId(e.target.value || null)} className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm">
            <option value="">All Sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.siteNumber} - {s.name}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as MonitoringVisitType | 'all')} className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm">
            <option value="all">All Types</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MonitoringVisitStatus | 'all')} className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm">
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="report-pending">Report Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Visits List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredVisits.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <ClipboardCheck className="w-16 h-16 mx-auto mb-4 opacity-30 text-text-muted" />
              <p className="text-lg font-medium text-text-muted mb-2">No Monitoring Visits Found</p>
              <p className="text-sm text-text-muted">Click &quot;Schedule Visit&quot; to plan a new monitoring visit</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVisits.map(visit => {
              const isOverdue = (visit.status === 'planned' || visit.status === 'scheduled') && new Date(visit.plannedDate) < new Date();
              return (
                <Card key={visit.id} className={`p-4 cursor-pointer hover:border-accent-teal/50 transition-colors ${selectedVisit?.id === visit.id ? 'border-accent-teal' : ''} ${isOverdue ? 'border-red-500/50' : ''}`} onClick={() => setSelectedVisit(visit)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge color={monitoringVisitTypeColorMap[visit.visitType]} size="xs">{typeLabels[visit.visitType]}</Badge>
                        <Badge color={monitoringVisitStatusColorMap[visit.status]} size="xs">{visit.status.replace(/-/g, ' ')}</Badge>
                        {isOverdue && <Badge color="red" size="xs">Overdue</Badge>}
                        {visit.criticalFindings > 0 && <Badge color="red" size="xs">{visit.criticalFindings} Critical</Badge>}
                      </div>
                      <h4 className="font-medium text-text-primary mb-1">{getSiteName(visit.siteId)}</h4>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><FlaskConical className="w-3 h-3" />{getStudyName(visit.studyId)}</span>
                        <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" />{visit.monitorName}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Planned: {visit.plannedDate}</span>
                        {visit.actualStartDate && <span className="flex items-center gap-1"><CalendarCheck className="w-3 h-3" />Actual: {visit.actualStartDate}</span>}
                      </div>
                      {visit.status === 'completed' && (
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-text-muted">SDV: <span className="text-text-secondary">{visit.sdvPercentage}%</span></span>
                          <span className="text-text-muted">Subjects: <span className="text-text-secondary">{visit.subjectsReviewed}/{visit.totalActiveSubjects}</span></span>
                          <span className="text-text-muted">Findings: <span className={visit.findingsCount > 0 ? 'text-amber-400' : 'text-green-400'}>{visit.findingsCount}</span></span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Visit Detail Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[800px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Monitoring Visit Details</h2>
                  <p className="text-sm text-text-muted">{getSiteName(selectedVisit.siteId)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedVisit(null)} className="p-2 hover:bg-surface-card rounded-lg">
                <CircleX className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Visit Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Type</span>
                      <Badge color={monitoringVisitTypeColorMap[selectedVisit.visitType]} size="sm">{typeLabels[selectedVisit.visitType]}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Status</span>
                      <Badge color={monitoringVisitStatusColorMap[selectedVisit.status]} size="sm">{selectedVisit.status.replace(/-/g, ' ')}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Monitor</span>
                      <span className="text-sm text-text-primary">{selectedVisit.monitorName}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Report Status</span>
                      <Badge color={selectedVisit.reportStatus === 'finalized' ? 'green' : selectedVisit.reportStatus === 'distributed' ? 'blue' : 'gray'} size="sm">{selectedVisit.reportStatus}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <span className="text-sm text-text-muted">Planned Date</span>
                      <span className="text-sm text-text-primary">{selectedVisit.plannedDate}</span>
                    </div>
                    {selectedVisit.actualStartDate && (
                      <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                        <span className="text-sm text-text-muted">Actual Start</span>
                        <span className="text-sm text-text-primary">{selectedVisit.actualStartDate}</span>
                      </div>
                    )}
                    {selectedVisit.actualEndDate && (
                      <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                        <span className="text-sm text-text-muted">Actual End</span>
                        <span className="text-sm text-text-primary">{selectedVisit.actualEndDate}</span>
                      </div>
                    )}
                    {selectedVisit.nextVisitRecommendedDate && (
                      <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                        <span className="text-sm text-text-muted">Next Visit Recommended</span>
                        <span className="text-sm text-accent-teal">{selectedVisit.nextVisitRecommendedDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedVisit.status === 'completed' && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Coverage Metrics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <Card className="p-4">
                      <div className="text-xs text-text-muted mb-1">Subjects Reviewed</div>
                      <div className="text-2xl font-semibold text-text-primary">{selectedVisit.subjectsReviewed}</div>
                      <div className="text-xs text-text-muted">of {selectedVisit.totalActiveSubjects} active</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-xs text-text-muted mb-1">SDV Percentage</div>
                      <div className="text-2xl font-semibold text-teal-400">{selectedVisit.sdvPercentage}%</div>
                      <ProgressBar value={selectedVisit.sdvPercentage} max={100} color="teal" size="sm" className="mt-2" />
                    </Card>
                    <Card className="p-4">
                      <div className="text-xs text-text-muted mb-1">Total Findings</div>
                      <div className="text-2xl font-semibold text-amber-400">{selectedVisit.findingsCount}</div>
                      <div className="text-xs">
                        <span className="text-red-400">{selectedVisit.criticalFindings} critical</span>
                        <span className="text-text-muted"> • </span>
                        <span className="text-amber-400">{selectedVisit.majorFindings} major</span>
                        <span className="text-text-muted"> • </span>
                        <span className="text-text-muted">{selectedVisit.minorFindings} minor</span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {selectedVisit.findings.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Findings ({selectedVisit.findings.length})</h3>
                  <div className="space-y-2">
                    {selectedVisit.findings.map(finding => (
                      <div key={finding.id} className={`p-3 rounded-lg border-l-4 ${finding.severity === 'critical' ? 'bg-red-500/10 border-red-500' : finding.severity === 'major' ? 'bg-amber-500/10 border-amber-500' : 'bg-surface-card border-border'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge color={finding.severity === 'critical' ? 'red' : finding.severity === 'major' ? 'amber' : 'gray'} size="xs">{finding.severity}</Badge>
                              <Badge color={finding.status === 'resolved' ? 'green' : finding.status === 'closed' ? 'gray' : 'blue'} size="xs">{finding.status}</Badge>
                              <span className="text-xs text-text-muted">{finding.category}</span>
                            </div>
                            <p className="text-sm text-text-primary">{finding.description}</p>
                          </div>
                          {finding.responseRequired && !finding.responseDate && (
                            <Badge color="red" size="xs">Response Required</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVisit.followUpItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">Follow-up Items ({selectedVisit.followUpItems.length})</h3>
                  <div className="space-y-2">
                    {selectedVisit.followUpItems.map(item => (
                      <div key={item.id} className={`p-3 bg-surface-card rounded-lg flex items-center justify-between ${item.status === 'overdue' ? 'border border-red-500/50' : ''}`}>
                        <div className="flex items-center gap-3">
                          {item.status === 'completed' ? <CircleCheck className="w-4 h-4 text-green-400" /> : item.status === 'overdue' ? <CircleAlert className="w-4 h-4 text-red-400" /> : <Clipboard className="w-4 h-4 text-text-muted" />}
                          <div>
                            <p className="text-sm text-text-primary">{item.description}</p>
                            <p className="text-xs text-text-muted">Assigned to: {item.assignedTo} • Due: {item.dueDate}</p>
                          </div>
                        </div>
                        <Badge color={item.status === 'completed' ? 'green' : item.status === 'overdue' ? 'red' : item.status === 'in-progress' ? 'amber' : 'gray'} size="xs">{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-xs text-text-muted">
                {selectedVisit.reportDate && `Report: ${selectedVisit.reportDate}`}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedVisit(null)}>Close</Button>
                {selectedVisit.status === 'scheduled' && (
                  <Button variant="primary" size="sm" onClick={() => toast.success('Deviation action recorded — CTMS updated')}><Play className="w-4 h-4" />Start Visit</Button>
                )}
                {selectedVisit.status === 'in-progress' && (
                  <Button variant="success" size="sm" onClick={() => toast.success('Deviation action recorded — CTMS updated')}><CircleCheck className="w-4 h-4" />Complete Visit</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[600px] shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Schedule Monitoring Visit</h2>
                  <p className="text-sm text-text-muted">Plan a new site monitoring visit</p>
                </div>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-surface-card rounded-lg">
                <CircleX className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Study *</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option value="">Select Study...</option>
                  {studies.map(s => <option key={s.id} value={s.id}>{s.protocolNumber} - {s.shortTitle}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Site *</label>
                <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                  <option value="">Select Site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.siteNumber} - {s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">Visit Type *</label>
                  <select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm">
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">Planned Date *</label>
                  <input type="date" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">Monitor *</label>
                <input type="text" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm" placeholder="Monitor name" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => setShowScheduleModal(false)}>
                <Plus className="w-4 h-4" />Schedule Visit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
