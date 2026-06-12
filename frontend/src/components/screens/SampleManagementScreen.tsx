

import { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Thermometer, Box, MapPin, Search, Filter, Plus, ChevronRight,
  Barcode, Clock, User, FileText, AlertTriangle, CheckCircle, Archive,
  Snowflake, RefreshCw, Download, Upload, Trash2, ArrowRightLeft, Eye,
  Package, Building2, History, ClipboardList, XCircle, Activity, TrendingUp,
  AlertCircle, ChevronDown, ExternalLink, Layers, Grid3X3, Beaker,
} from 'lucide-react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useSampleManagementStore, useFilteredSamples } from '@/store/useSampleManagementStore';
import { useDeadClick } from '@/hooks/useDeadClick';
import {
  getSampleTypeLabel,
  getSampleStatusColor,
  getFreezerTypeLabel,
  mockSampleManagementData,
} from '@/data/sample-management-data';
import type {
  Sample, SampleStatus, SampleType, ChainOfCustodyEvent,
  StorageSite, Freezer, StorageBox, SampleRequest,
} from '@/store/sampleManagementTypes';

// ============================================================================
// COLOR MAPS
// ============================================================================

const statusColorMap: Record<SampleStatus, BadgeColor> = {
  'received': 'blue',
  'in-storage': 'green',
  'aliquoted': 'purple',
  'in-use': 'amber',
  'reserved': 'amber',
  'shipped': 'blue',
  'depleted': 'slate',
  'disposed': 'slate',
  'quarantine': 'red',
  'qc-failed': 'red',
};

const requestStatusColorMap: Record<string, BadgeColor> = {
  'pending': 'amber',
  'approved': 'blue',
  'rejected': 'red',
  'fulfilled': 'green',
  'cancelled': 'slate',
};

const freezerStatusColorMap: Record<string, BadgeColor> = {
  'operational': 'green',
  'maintenance': 'amber',
  'alarm': 'red',
  'offline': 'slate',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

const TabButton = ({ active, onClick, icon, label, count }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
    }`}
  >
    {icon}
    {label}
    {count !== undefined && (
      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
        active ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-700'
      }`}>
        {count}
      </span>
    )}
  </button>
);

// ============================================================================
// INVENTORY VIEW
// ============================================================================

interface InventoryViewProps {
  samples: Sample[];
  onSelectSample: (id: string) => void;
  selectedId: string | null;
}

const InventoryView = ({ samples, onSelectSample, selectedId }: InventoryViewProps) => {
    const { deadClick } = useDeadClick();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<SampleType | 'all'>('all');

  const filteredSamples = useMemo(() => {
    return samples.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.sampleId.toLowerCase().includes(q) ||
          s.barcode.toLowerCase().includes(q) ||
          s.subjectId.toLowerCase().includes(q) ||
          s.studyName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [samples, statusFilter, typeFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search samples, barcodes, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SampleStatus | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="all">All Statuses</option>
          <option value="in-storage">In Storage</option>
          <option value="received">Received</option>
          <option value="aliquoted">Aliquoted</option>
          <option value="in-use">In Use</option>
          <option value="reserved">Reserved</option>
          <option value="quarantine">Quarantine</option>
          <option value="disposed">Disposed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as SampleType | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="all">All Types</option>
          <option value="serum">Serum</option>
          <option value="plasma">Plasma</option>
          <option value="whole-blood">Whole Blood</option>
          <option value="pbmc">PBMC</option>
          <option value="dna">DNA</option>
          <option value="urine">Urine</option>
        </select>
      </div>

      {/* Sample Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Sample ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Study</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Timepoint</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Volume</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Location</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredSamples.slice(0, 50).map((sample) => (
                <tr
                  key={sample.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    selectedId === sample.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => onSelectSample(sample.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Barcode className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-xs">{sample.sampleId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={sample.type === 'serum' ? 'amber' : sample.type === 'plasma' ? 'blue' : 'slate'}>
                      {getSampleTypeLabel(sample.type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={statusColorMap[sample.status]}>
                      {sample.status.replace('-', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{sample.studyName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{sample.subjectId}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sample.timepointCode}</td>
                  <td className="px-4 py-3">
                    <span className={sample.currentVolume < sample.initialVolume * 0.3 ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}>
                      {sample.currentVolume} {sample.volumeUnit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{sample.storagePosition}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onClick={() => toast.success('Sample record updated — chain of custody logged')}>
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSamples.length > 50 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 text-center">
            Showing 50 of {filteredSamples.length} samples
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// STORAGE VIEW
// ============================================================================

interface StorageViewProps {
  sites: Record<string, StorageSite>;
  freezers: Record<string, Freezer>;
  boxes: Record<string, StorageBox>;
}

const StorageView = ({ sites, freezers, boxes }: StorageViewProps) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const siteList = Object.values(sites);
  const selectedSite = selectedSiteId ? sites[selectedSiteId] : null;
  const siteFreezerList = selectedSiteId
    ? Object.values(freezers).filter((f) => f.siteId === selectedSiteId)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Site List */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Storage Sites</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {siteList.map((site) => {
                const siteFreezerCount = Object.values(freezers).filter((f) => f.siteId === site.id).length;
                return (
                  <button
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedSiteId === site.id
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700'
                        : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                    } border`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{site.name}</p>
                        <p className="text-xs text-gray-500">{site.city}, {site.country}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{siteFreezerCount}</p>
                        <p className="text-xs text-gray-500">freezers</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {site.certifications.slice(0, 3).map((cert) => (
                        <span key={cert} className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Freezer Grid */}
      <div className="lg:col-span-2">
        {selectedSite ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-5 h-5 text-cyan-600" />
                  <h3 className="font-semibold">{selectedSite.name} - Freezers</h3>
                </div>
                <Badge color={selectedSite.isActive ? 'green' : 'slate'}>
                  {selectedSite.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {siteFreezerList.map((freezer) => (
                  <div
                    key={freezer.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{freezer.name}</h4>
                        <p className="text-xs text-gray-500">{freezer.code}</p>
                      </div>
                      <Badge color={freezerStatusColorMap[freezer.status]}>
                        {freezer.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {freezer.lastTempValue}°C
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {freezer.usedRacks}/{freezer.totalRacks} racks
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Capacity</span>
                        <span>{Math.round((freezer.usedRacks / freezer.totalRacks) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            freezer.usedRacks / freezer.totalRacks > 0.9
                              ? 'bg-red-500'
                              : freezer.usedRacks / freezer.totalRacks > 0.7
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${(freezer.usedRacks / freezer.totalRacks) * 100}%` }}
                        />
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      {getFreezerTypeLabel(freezer.type)} • Room {freezer.room}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Select a storage site to view freezers</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// CHAIN OF CUSTODY VIEW
// ============================================================================

interface ChainOfCustodyViewProps {
  sample: Sample | null;
  events: ChainOfCustodyEvent[];
}

const ChainOfCustodyView = ({ sample, events }: ChainOfCustodyViewProps) => {
  if (!sample) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select a sample from the Inventory tab to view its chain of custody</p>
        </CardContent>
      </Card>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Sample Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FlaskConical className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{sample.sampleId}</h3>
                <p className="text-sm text-gray-500">
                  {getSampleTypeLabel(sample.type)} • {sample.studyName} • Subject {sample.subjectId}
                </p>
              </div>
            </div>
            <Badge color={statusColorMap[sample.status]} className="text-sm">
              {sample.status.replace('-', ' ')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Chain of Custody Timeline</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <div className="space-y-4 md:space-y-6">
              {sortedEvents.map((event, idx) => {
                const eventIconMap: Record<string, React.ReactNode> = {
                  received: <Download className="w-4 h-4" />,
                  stored: <Archive className="w-4 h-4" />,
                  aliquoted: <Grid3X3 className="w-4 h-4" />,
                  transferred: <ArrowRightLeft className="w-4 h-4" />,
                  shipped: <Package className="w-4 h-4" />,
                  disposed: <Trash2 className="w-4 h-4" />,
                  'status-change': <RefreshCw className="w-4 h-4" />,
                  'location-change': <MapPin className="w-4 h-4" />,
                  retrieved: <Upload className="w-4 h-4" />,
                  returned: <Download className="w-4 h-4" />,
                  'qc-performed': <CheckCircle className="w-4 h-4" />,
                  'temp-excursion': <AlertTriangle className="w-4 h-4" />,
                  annotation: <FileText className="w-4 h-4" />,
                };
                const eventIcon = eventIconMap[event.eventType] || <Activity className="w-4 h-4" />;

                const eventColorMap: Record<string, string> = {
                  received: 'bg-blue-500',
                  stored: 'bg-green-500',
                  aliquoted: 'bg-purple-500',
                  disposed: 'bg-red-500',
                  'status-change': 'bg-amber-500',
                  shipped: 'bg-indigo-500',
                  transferred: 'bg-cyan-500',
                  'location-change': 'bg-teal-500',
                  'qc-performed': 'bg-emerald-500',
                  'temp-excursion': 'bg-orange-500',
                  annotation: 'bg-slate-500',
                };
                const eventColor = eventColorMap[event.eventType] || 'bg-gray-500';

                return (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div className={`relative z-10 w-10 h-10 rounded-full ${eventColor} flex items-center justify-center text-white`}>
                      {eventIcon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {event.eventType.replace('-', ' ')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {event.performedByName} • {new Date(event.performedAt).toLocaleString()}
                          </p>
                        </div>
                        {event.electronicSignatureId && (
                          <Badge color="green" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Signed
                          </Badge>
                        )}
                      </div>

                      {event.notes && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{event.notes}</p>
                      )}

                      {(event.fromLocation || event.toLocation) && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          {event.fromLocation && (
                            <span className="text-gray-500">{event.fromLocation}</span>
                          )}
                          {event.fromLocation && event.toLocation && (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          {event.toLocation && (
                            <span className="font-medium text-gray-700 dark:text-gray-300">{event.toLocation}</span>
                          )}
                        </div>
                      )}

                      {event.reason && (
                        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                          Reason: {event.reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// REQUESTS VIEW
// ============================================================================

interface RequestsViewProps {
  requests: Record<string, SampleRequest>;
}

const RequestsView = ({ requests }: RequestsViewProps) => {
  const { deadClick } = useDeadClick();
  const requestList = Object.values(requests).sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sample Requests</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onClick={() => toast.success('Sample record updated — chain of custody logged')}>
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      <div className="space-y-3">
        {requestList.map((request) => (
          <Card key={request.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    request.priority === 'stat' ? 'bg-red-100 dark:bg-red-900/30' :
                    request.priority === 'urgent' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <ClipboardList className={`w-5 h-5 ${
                      request.priority === 'stat' ? 'text-red-600' :
                      request.priority === 'urgent' ? 'text-amber-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{request.requestNumber}</h4>
                      <Badge color={requestStatusColorMap[request.status]}>
                        {request.status}
                      </Badge>
                      {request.priority !== 'routine' && (
                        <Badge color={request.priority === 'stat' ? 'red' : 'amber'}>
                          {request.priority.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{request.purpose}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {request.requestedByName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </span>
                      {request.dueDate && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Due: {new Date(request.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{request.analysisType}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {request.sampleIds.length > 0 ? `${request.sampleIds.length} samples` : `${request.quantityRequested} requested`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

type TabType = 'inventory' | 'storage' | 'custody' | 'requests';

export const SampleManagementScreen = () => {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  
  const {
    sites,
    freezers,
    racks,
    boxes,
    samples,
    custodyEvents,
    requests,
    selectedSampleId,
    selectSample,
    loadMockData,
    getInventorySummary,
  } = useSampleManagementStore();

  // Load mock data on mount
  useEffect(() => {
    if (Object.keys(samples).length === 0) {
      loadMockData();
    }
  }, []);

  const sampleList = Object.values(samples);
  const summary = getInventorySummary();
  const selectedSample = selectedSampleId ? samples[selectedSampleId] : null;
  const selectedEvents = selectedSampleId ? custodyEvents[selectedSampleId] || [] : [];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-blue-600" />
            Sample Management
          </h1>
          <p className="text-gray-500 mt-1">
            Biorepository inventory, storage, and chain of custody tracking
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4 md:mb-6">
          <StatCard
            title="Total Samples"
            value={summary.totalSamples.toLocaleString()}
            icon={<FlaskConical className="w-5 h-5 text-blue-600" />}
            variant="blue"
          />
          <StatCard
            title="In Storage"
            value={(summary.byStatus['in-storage'] || 0).toLocaleString()}
            icon={<Archive className="w-5 h-5 text-green-600" />}
            variant="green"
          />
          <StatCard
            title="Quarantine"
            value={(summary.byStatus['quarantine'] || 0).toString()}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            variant="red"
          />
          <StatCard
            title="Pending Requests"
            value={summary.requestsPending.toString()}
            icon={<ClipboardList className="w-5 h-5 text-amber-600" />}
            variant="amber"
          />
          <StatCard
            title="Received (7d)"
            value={summary.receivedLast7Days.toString()}
            icon={<Download className="w-5 h-5 text-purple-600" />}
            variant="purple"
          />
          <StatCard
            title="Storage Utilization"
            value={`${Math.round(summary.utilizationPercentage)}%`}
            icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
            variant="teal"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
          <TabButton
            active={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
            icon={<Beaker className="w-4 h-4" />}
            label="Inventory"
            count={sampleList.length}
          />
          <TabButton
            active={activeTab === 'storage'}
            onClick={() => setActiveTab('storage')}
            icon={<Snowflake className="w-4 h-4" />}
            label="Storage"
            count={Object.keys(freezers).length}
          />
          <TabButton
            active={activeTab === 'custody'}
            onClick={() => setActiveTab('custody')}
            icon={<History className="w-4 h-4" />}
            label="Chain of Custody"
          />
          <TabButton
            active={activeTab === 'requests'}
            onClick={() => setActiveTab('requests')}
            icon={<ClipboardList className="w-4 h-4" />}
            label="Requests"
            count={Object.keys(requests).length}
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' && (
          <InventoryView
            samples={sampleList}
            onSelectSample={(id) => {
              selectSample(id);
              setActiveTab('custody');
            }}
            selectedId={selectedSampleId}
          />
        )}
        {activeTab === 'storage' && (
          <StorageView sites={sites} freezers={freezers} boxes={boxes} />
        )}
        {activeTab === 'custody' && (
          <ChainOfCustodyView sample={selectedSample} events={selectedEvents} />
        )}
        {activeTab === 'requests' && <RequestsView requests={requests} />}
      </div>
    </div>
  );
};

export default SampleManagementScreen;
