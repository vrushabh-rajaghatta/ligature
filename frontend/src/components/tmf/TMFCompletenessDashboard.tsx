/**
 * TMF Completeness Dashboard
 * Real-time zone completeness visualization
 * 
 * v0.40.7 - TMF Completeness Dashboard
 */


import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Shield,
  TrendingUp,
  BarChart3,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Search,
  Filter,
  Download,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ZoneStats {
  zone: string;
  name: string;
  description: string;
  isCritical: boolean;
  totalArtifacts: number;
  expectedArtifacts: number;
  receivedArtifacts: number;
  approvedArtifacts: number;
  rejectedArtifacts: number;
  pendingQcArtifacts: number;
  completenessPercent: number;
  criticalMissing: number;
  lastUpdated: string | null;
}

interface OverallStats {
  totalArtifacts: number;
  approvedArtifacts: number;
  receivedArtifacts: number;
  expectedArtifacts: number;
  criticalMissing: number;
  overallCompleteness: number;
  criticalCompleteness: number;
}

interface AutoLinkEvent {
  id: string;
  ruleName: string | null;
  sourceModule: string;
  sourceEventType: string;
  status: string;
  eventTime: string;
}

// =============================================================================
// ZONE ICONS
// =============================================================================

const ZONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'zone-01': FolderOpen,
  'zone-02': FileText,
  'zone-03': Shield,
  'zone-04': CheckCircle,
  'zone-05': BarChart3,
  'zone-06': FolderOpen,
  'zone-07': AlertTriangle,
  'zone-08': FileText,
  'zone-09': FolderOpen,
  'zone-10': FileText,
};

// =============================================================================
// COMPONENT
// =============================================================================

interface TMFCompletenessDashboardProps {
  studyId?: string;
  onZoneClick?: (zone: string) => void;
}

export function TMFCompletenessDashboard({ studyId, onZoneClick }: TMFCompletenessDashboardProps) {
  const [zones, setZones] = useState<ZoneStats[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AutoLinkEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch zone stats
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const params = studyId ? `?studyId=${studyId}` : '';
        const [zonesRes, eventsRes] = await Promise.all([
          fetch(`/api/tmf/zones${params}`),
          fetch(`/api/tmf/auto-link?type=events${studyId ? `&studyId=${studyId}` : ''}`),
        ]);
        
        const zonesData = await zonesRes.json();
        const eventsData = await eventsRes.json();
        
        setZones(zonesData.data || []);
        setStats(zonesData.stats || null);
        setRecentEvents((eventsData.data || []).slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch TMF data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [studyId]);

  // Calculate inspection readiness
  const inspectionReadiness = useMemo(() => {
    if (!stats) return 0;
    // Weighted: 60% critical completeness, 30% overall, 10% pending QC
    const pendingQcPenalty = zones.reduce((sum, z) => sum + z.pendingQcArtifacts, 0) > 10 ? 10 : 0;
    return Math.round(stats.criticalCompleteness * 0.6 + stats.overallCompleteness * 0.3 - pendingQcPenalty);
  }, [stats, zones]);

  // Color for completeness percentage
  const getCompletenessColor = (percent: number) => {
    if (percent >= 90) return 'text-green-600 bg-green-50';
    if (percent >= 70) return 'text-yellow-600 bg-yellow-50';
    if (percent >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 70) return 'bg-yellow-500';
    if (percent >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Completeness */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overall Completeness</p>
              <p className={`text-3xl font-bold ${stats?.overallCompleteness && stats.overallCompleteness >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                {stats?.overallCompleteness || 0}%
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${getProgressColor(stats?.overallCompleteness || 0)}`}
              style={{ width: `${stats?.overallCompleteness || 0}%` }}
            />
          </div>
        </div>

        {/* Critical Completeness */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Critical Zones</p>
              <p className={`text-3xl font-bold ${stats?.criticalCompleteness && stats.criticalCompleteness >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                {stats?.criticalCompleteness || 0}%
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {stats?.criticalMissing || 0} critical artifacts missing
          </p>
        </div>

        {/* Inspection Readiness */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inspection Readiness</p>
              <p className={`text-3xl font-bold ${inspectionReadiness >= 80 ? 'text-green-600' : inspectionReadiness >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {inspectionReadiness}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${inspectionReadiness >= 80 ? 'bg-green-50' : inspectionReadiness >= 60 ? 'bg-yellow-50' : 'bg-red-50'}`}>
              <CheckCircle className={`w-6 h-6 ${inspectionReadiness >= 80 ? 'text-green-600' : inspectionReadiness >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {inspectionReadiness >= 80 ? 'Inspection Ready' : inspectionReadiness >= 60 ? 'Needs Attention' : 'Critical Gaps'}
          </p>
        </div>

        {/* Total Artifacts */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Artifacts</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.totalArtifacts || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-green-600">{stats?.approvedArtifacts || 0} approved</span>
            <span className="text-gray-300">|</span>
            <span className="text-yellow-600">{stats?.receivedArtifacts || 0} pending</span>
            <span className="text-gray-300">|</span>
            <span className="text-red-600">{stats?.expectedArtifacts || 0} expected</span>
          </div>
        </div>
      </div>

      {/* Zone Grid */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Zone Completeness (DIA Reference Model)</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            {zones.map((zone) => {
              const Icon = ZONE_ICONS[zone.zone] || FolderOpen;
              return (
                <button
                  key={zone.zone}
                  onClick={() => {
                    setSelectedZone(zone.zone);
                    onZoneClick?.(zone.zone);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                    selectedZone === zone.zone ? 'ring-2 ring-blue-500' : ''
                  } ${zone.isCritical ? 'border-red-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${zone.isCritical ? 'text-red-500' : 'text-gray-500'}`} />
                    <span className="text-xs font-medium text-gray-500">{zone.zone.toUpperCase().replace('-', ' ')}</span>
                    {zone.isCritical && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate" title={zone.name}>
                    {zone.name}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-lg font-bold ${getCompletenessColor(zone.completenessPercent).split(' ')[0]}`}>
                      {zone.completenessPercent}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {zone.approvedArtifacts}/{zone.totalArtifacts}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${getProgressColor(zone.completenessPercent)}`}
                      style={{ width: `${zone.completenessPercent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="divide-y">
            {zones.map((zone) => {
              const Icon = ZONE_ICONS[zone.zone] || FolderOpen;
              return (
                <button
                  key={zone.zone}
                  onClick={() => {
                    setSelectedZone(zone.zone);
                    onZoneClick?.(zone.zone);
                  }}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${zone.isCritical ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <Icon className={`w-5 h-5 ${zone.isCritical ? 'text-red-500' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{zone.zone.toUpperCase().replace('-', ' ')}</span>
                      {zone.isCritical && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Critical</span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{zone.name}</p>
                    <p className="text-xs text-gray-500">{zone.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${getCompletenessColor(zone.completenessPercent).split(' ')[0]}`}>
                      {zone.completenessPercent}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {zone.approvedArtifacts} approved / {zone.totalArtifacts} total
                    </p>
                  </div>
                  <div className="w-32">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${getProgressColor(zone.completenessPercent)}`}
                        style={{ width: `${zone.completenessPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-400">
                      <span>{zone.pendingQcArtifacts} pending QC</span>
                      <span>{zone.criticalMissing} missing</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Auto-Link Events */}
      {recentEvents.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Auto-Link Events</h3>
            <span className="text-xs text-gray-500">Last 5 events</span>
          </div>
          <div className="divide-y">
            {recentEvents.map((event) => (
              <div key={event.id} className="p-3 flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${
                  event.status === 'processed' ? 'bg-green-100' : 
                  event.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  {event.status === 'processed' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : event.status === 'failed' ? (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{event.ruleName || event.sourceEventType}</p>
                  <p className="text-xs text-gray-500">
                    From {event.sourceModule} • {new Date(event.eventTime).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded ${
                  event.status === 'processed' ? 'bg-green-100 text-green-700' :
                  event.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TMFCompletenessDashboard;
