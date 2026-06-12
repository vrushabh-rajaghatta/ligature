
/**
 * GMP Screen - v0.35.1
 * cGMP (21 CFR 210/211) Good Manufacturing Practice Compliance Dashboard
 * 
 * Manages manufacturing compliance across:
 * - Batch record review
 * - Deviations & CAPAs
 * - Environmental monitoring
 * - Equipment qualification
 * - Personnel training
 */

import { useState, useMemo } from 'react';
import {
  Shield, FileText, Users, Building2, ClipboardCheck, Archive,
  Search, Plus, ChevronRight, CheckCircle, AlertTriangle, Clock, X,
  User, Calendar, Eye, AlertCircle, TrendingUp, Thermometer,
  BarChart3, Activity, Gauge, Target, Package, Factory, GraduationCap,
  AlertOctagon, FileWarning, RefreshCw, Wrench, Droplets, Wind, Beaker,
} from 'lucide-react';import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// TYPES
// ============================================================================

type GMPTab = 'dashboard' | 'batches' | 'deviations' | 'environmental' | 'equipment' | 'training';

interface BatchRecord {
  id: string;
  productName: string;
  batchNumber: string;
  status: 'in-progress' | 'pending-review' | 'approved' | 'rejected' | 'quarantine';
  startDate: string;
  completionDate?: string;
  yield: number;
  targetYield: number;
  deviations: number;
  reviewer?: string;
}

interface GMPDeviation {
  id: string;
  type: 'process' | 'equipment' | 'documentation' | 'material' | 'environmental';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  batchNumber?: string;
  area: string;
  reportedDate: string;
  status: 'open' | 'investigation' | 'capa-required' | 'closed';
  capaId?: string;
}

interface EnvironmentalReading {
  id: string;
  area: string;
  classification: 'grade-a' | 'grade-b' | 'grade-c' | 'grade-d';
  parameter: 'viable' | 'non-viable' | 'temperature' | 'humidity' | 'pressure';
  value: number;
  limit: number;
  unit: string;
  status: 'pass' | 'alert' | 'action' | 'excursion';
  timestamp: string;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
  area: string;
  status: 'qualified' | 'due-requalification' | 'out-of-service' | 'pending-qualification';
  lastCalibration: string;
  nextCalibration: string;
  lastPM: string;
  nextPM: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockBatches: BatchRecord[] = [
  { id: 'BR-001', productName: 'LIG-2847 Tablets 50mg', batchNumber: 'LIG2847-2025-001', status: 'pending-review', startDate: '2025-01-10', completionDate: '2025-01-18', yield: 98.2, targetYield: 98, deviations: 0, reviewer: 'QA Team' },
  { id: 'BR-002', productName: 'LIG-2847 Tablets 100mg', batchNumber: 'LIG2847-2025-002', status: 'in-progress', startDate: '2025-01-15', yield: 45, targetYield: 98, deviations: 1 },
  { id: 'BR-003', productName: 'LIG-3021 Capsules 25mg', batchNumber: 'LIG3021-2025-001', status: 'quarantine', startDate: '2025-01-05', completionDate: '2025-01-12', yield: 96.8, targetYield: 98, deviations: 2 },
  { id: 'BR-004', productName: 'LIG-2847 Tablets 50mg', batchNumber: 'LIG2847-2025-003', status: 'approved', startDate: '2025-01-02', completionDate: '2025-01-08', yield: 99.1, targetYield: 98, deviations: 0, reviewer: 'J. Martinez' },
];

const mockDeviations: GMPDeviation[] = [
  { id: 'DEV-001', type: 'process', severity: 'major', description: 'Granulation endpoint reached 15 min early', batchNumber: 'LIG2847-2025-002', area: 'Granulation Suite', reportedDate: '2025-01-16', status: 'investigation' },
  { id: 'DEV-002', type: 'environmental', severity: 'minor', description: 'Humidity excursion in packaging area (72% vs 65% limit)', area: 'Packaging Line 2', reportedDate: '2025-01-15', status: 'capa-required', capaId: 'CAPA-2025-008' },
  { id: 'DEV-003', type: 'documentation', severity: 'minor', description: 'Batch record entry made in pencil', batchNumber: 'LIG3021-2025-001', area: 'Compression', reportedDate: '2025-01-12', status: 'closed' },
  { id: 'DEV-004', type: 'equipment', severity: 'critical', description: 'Tablet press force out of specification mid-run', batchNumber: 'LIG3021-2025-001', area: 'Compression Suite', reportedDate: '2025-01-11', status: 'capa-required', capaId: 'CAPA-2025-007' },
];

const mockEnvironmental: EnvironmentalReading[] = [
  { id: 'ENV-001', area: 'Aseptic Fill Suite', classification: 'grade-a', parameter: 'viable', value: 0, limit: 1, unit: 'CFU/m³', status: 'pass', timestamp: '2025-01-20 08:00' },
  { id: 'ENV-002', area: 'Aseptic Fill Suite', classification: 'grade-a', parameter: 'non-viable', value: 2800, limit: 3520, unit: '≥0.5µm/m³', status: 'pass', timestamp: '2025-01-20 08:00' },
  { id: 'ENV-003', area: 'Granulation Suite', classification: 'grade-d', parameter: 'temperature', value: 22.5, limit: 25, unit: '°C', status: 'pass', timestamp: '2025-01-20 08:00' },
  { id: 'ENV-004', area: 'Packaging Line 2', classification: 'grade-d', parameter: 'humidity', value: 68, limit: 65, unit: '%RH', status: 'alert', timestamp: '2025-01-20 08:00' },
  { id: 'ENV-005', area: 'Compression Suite', classification: 'grade-d', parameter: 'pressure', value: -12, limit: -15, unit: 'Pa', status: 'pass', timestamp: '2025-01-20 08:00' },
];

const mockEquipment: Equipment[] = [
  { id: 'EQ-001', name: 'Tablet Press #1', type: 'Compression', area: 'Compression Suite', status: 'qualified', lastCalibration: '2024-12-15', nextCalibration: '2025-03-15', lastPM: '2024-11-20', nextPM: '2025-02-20' },
  { id: 'EQ-002', name: 'Fluid Bed Dryer', type: 'Drying', area: 'Granulation Suite', status: 'due-requalification', lastCalibration: '2024-06-10', nextCalibration: '2025-01-10', lastPM: '2024-10-15', nextPM: '2025-01-15' },
  { id: 'EQ-003', name: 'Filling Line #2', type: 'Filling', area: 'Aseptic Fill Suite', status: 'qualified', lastCalibration: '2024-11-30', nextCalibration: '2025-05-30', lastPM: '2024-12-20', nextPM: '2025-03-20' },
];

const metrics = {
  overallCompliance: 91,
  batchesInProgress: 2,
  pendingReview: 1,
  quarantined: 1,
  openDeviations: 3,
  criticalDeviations: 1,
  capasOpen: 2,
  environmentalAlerts: 1,
  equipmentDue: 1,
  trainingCompliance: 94,
};

// ============================================================================
// COMPONENTS
// ============================================================================

const ComplianceGauge = ({ score }: { score: number }) => {
  const color = score >= 90 ? 'text-green-400' : score >= 75 ? 'text-amber-400' : 'text-red-400';
  const bgColor = score >= 90 ? 'stroke-green-500/20' : score >= 75 ? 'stroke-amber-500/20' : 'stroke-red-500/20';
  const fgColor = score >= 90 ? 'stroke-green-500' : score >= 75 ? 'stroke-amber-500' : 'stroke-red-500';
  
  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r="56" fill="none" className={bgColor} strokeWidth="12" />
        <circle cx="64" cy="64" r="56" fill="none" className={fgColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(score / 100) * 352} 352`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{score}%</span>
        <span className="text-xs text-text-muted">Compliant</span>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon, color = 'blue' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
}) => {
  const colors = {
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`p-2 rounded-lg ${colors[color]} w-fit`}>{icon}</div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-text-primary">{value}</div>
          <div className="text-sm text-text-secondary">{title}</div>
          {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

const BatchRow = ({ batch }: { batch: BatchRecord }) => {
  const statusColors = {
    'in-progress': 'blue',
    'pending-review': 'amber',
    'approved': 'green',
    'rejected': 'red',
    'quarantine': 'red',
  } as const;
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-surface-card rounded-lg hover:bg-surface-card/80 cursor-pointer">
      <div className="flex items-center gap-4">
        <Package className="w-5 h-5 text-text-muted" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{batch.batchNumber}</span>
            <Badge color={statusColors[batch.status]} size="xs">{batch.status.replace('-', ' ')}</Badge>
          </div>
          <div className="text-sm text-text-muted">{batch.productName}</div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <div className={`font-medium ${batch.yield >= batch.targetYield ? 'text-green-400' : 'text-amber-400'}`}>{batch.yield}%</div>
          <div className="text-xs text-text-muted">Yield</div>
        </div>
        <div className="text-center">
          <div className={`font-medium ${batch.deviations > 0 ? 'text-amber-400' : 'text-text-primary'}`}>{batch.deviations}</div>
          <div className="text-xs text-text-muted">Deviations</div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </div>
    </div>
  );
};

const DeviationRow = ({ deviation }: { deviation: GMPDeviation }) => {
  const severityColors = { minor: 'blue', major: 'amber', critical: 'red' } as const;
  const statusColors = { open: 'amber', investigation: 'blue', 'capa-required': 'purple', closed: 'green' } as const;
  
  return (
    <div className="flex items-center justify-between p-4 bg-surface-card rounded-lg">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${deviation.severity === 'critical' ? 'bg-red-500' : deviation.severity === 'major' ? 'bg-amber-500' : 'bg-blue-500'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{deviation.id}</span>
            <Badge color={severityColors[deviation.severity]} size="xs">{deviation.severity}</Badge>
            <Badge color={statusColors[deviation.status]} size="xs">{deviation.status.replace('-', ' ')}</Badge>
          </div>
          <div className="text-sm text-text-secondary mt-1">{deviation.description}</div>
          <div className="text-xs text-text-muted mt-1">{deviation.area} {deviation.batchNumber && `• Batch ${deviation.batchNumber}`}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-text-secondary">{deviation.reportedDate}</div>
        {deviation.capaId && <Badge color="purple" size="xs" className="mt-1">{deviation.capaId}</Badge>}
      </div>
    </div>
  );
};

const EnvironmentalCard = ({ reading }: { reading: EnvironmentalReading }) => {
  const statusColors = { pass: 'green', alert: 'amber', action: 'red', excursion: 'red' } as const;
  const icons: Record<string, React.ReactNode> = {
    viable: <Droplets className="w-4 h-4" />,
    'non-viable': <Wind className="w-4 h-4" />,
    temperature: <Thermometer className="w-4 h-4" />,
    humidity: <Droplets className="w-4 h-4" />,
    pressure: <Gauge className="w-4 h-4" />,
  };
  
  return (
    <div className={`p-3 bg-surface-card rounded-lg border ${reading.status !== 'pass' ? 'border-amber-500/30' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-text-muted">
          {icons[reading.parameter]}
          <span className="text-xs">{reading.parameter}</span>
        </div>
        <Badge color={statusColors[reading.status]} size="xs">{reading.status}</Badge>
      </div>
      <div className="text-lg font-bold text-text-primary">{reading.value} {reading.unit}</div>
      <div className="text-xs text-text-muted">Limit: {reading.limit} {reading.unit}</div>
      <div className="text-xs text-text-muted mt-1">{reading.area}</div>
    </div>
  );
};

// ============================================================================
// EQUIPMENT TAB
// ============================================================================

type EquipmentStatus = 'qualified' | 'due-requalification' | 'out-of-service' | 'pending-qualification';
type QualStatus = 'complete' | 'in-progress' | 'scheduled' | 'not-started';

interface EquipmentRecord {
  id: string;
  name: string;
  equipmentId: string;
  type: string;
  area: string;
  status: EquipmentStatus;
  lastCalibration: string;
  nextCalibration: string;
  lastPM: string;
  nextPM: string;
  iqStatus: QualStatus;
  oqStatus: QualStatus;
  pqStatus: QualStatus;
  criticality: 'critical' | 'major' | 'minor';
}

const mockEquipmentList: EquipmentRecord[] = [
  { id: 'EQ-001', name: 'Tablet Press #1', equipmentId: 'TP-001-MFG', type: 'Compression', area: 'Compression Suite', status: 'qualified', lastCalibration: '2024-12-15', nextCalibration: '2025-03-15', lastPM: '2024-11-20', nextPM: '2025-02-20', iqStatus: 'complete', oqStatus: 'complete', pqStatus: 'complete', criticality: 'critical' },
  { id: 'EQ-002', name: 'Fluid Bed Dryer', equipmentId: 'FBD-002-GRAN', type: 'Drying', area: 'Granulation Suite', status: 'due-requalification', lastCalibration: '2024-06-10', nextCalibration: '2025-01-10', lastPM: '2024-10-15', nextPM: '2025-01-15', iqStatus: 'complete', oqStatus: 'complete', pqStatus: 'in-progress', criticality: 'critical' },
  { id: 'EQ-003', name: 'Filling Line #2', equipmentId: 'FL-002-ASP', type: 'Filling', area: 'Aseptic Fill Suite', status: 'qualified', lastCalibration: '2024-11-30', nextCalibration: '2025-05-30', lastPM: '2024-12-20', nextPM: '2025-03-20', iqStatus: 'complete', oqStatus: 'complete', pqStatus: 'complete', criticality: 'critical' },
  { id: 'EQ-004', name: 'High Shear Granulator', equipmentId: 'HSG-001-GRAN', type: 'Granulation', area: 'Granulation Suite', status: 'qualified', lastCalibration: '2025-01-05', nextCalibration: '2025-07-05', lastPM: '2024-12-01', nextPM: '2025-03-01', iqStatus: 'complete', oqStatus: 'complete', pqStatus: 'complete', criticality: 'major' },
  { id: 'EQ-005', name: 'Tablet Press #2', equipmentId: 'TP-002-MFG', type: 'Compression', area: 'Compression Suite', status: 'out-of-service', lastCalibration: '2024-10-20', nextCalibration: '2025-04-20', lastPM: '2024-10-20', nextPM: '2025-01-20', iqStatus: 'complete', oqStatus: 'complete', pqStatus: 'complete', criticality: 'critical' },
  { id: 'EQ-006', name: 'Coating Pan #1', equipmentId: 'CP-001-COAT', type: 'Coating', area: 'Coating Suite', status: 'qualified', lastCalibration: '2025-01-10', nextCalibration: '2025-07-10', lastPM: '2024-11-15', nextPM: '2025-02-15', iqStatus: 'complete', oqStatus: 'complete', pqStatus: 'complete', criticality: 'major' },
  { id: 'EQ-007', name: 'Autoclave #1', equipmentId: 'AC-001-ASP', type: 'Sterilization', area: 'Aseptic Fill Suite', status: 'qualified', lastCalibration: '2024-12-01', nextCalibration: '2025-06-01', lastPM: '2024-12-01', nextPM: '2025-03-01', iqStatus: 'complete', oqStatus: 'complete', pqStatus: 'complete', criticality: 'critical' },
  { id: 'EQ-008', name: 'Blister Packager #3', equipmentId: 'BP-003-PKG', type: 'Packaging', area: 'Packaging Line 3', status: 'pending-qualification', lastCalibration: '-', nextCalibration: '2025-02-20', lastPM: '-', nextPM: '2025-02-20', iqStatus: 'complete', oqStatus: 'in-progress', pqStatus: 'not-started', criticality: 'major' },
];

const equipStatusConfig: Record<EquipmentStatus, { color: 'green' | 'amber' | 'red' | 'blue'; label: string }> = {
  'qualified':            { color: 'green', label: 'Qualified'         },
  'due-requalification':  { color: 'amber', label: 'Due Requalify'     },
  'out-of-service':       { color: 'red',   label: 'Out of Service'    },
  'pending-qualification':{ color: 'blue',  label: 'Pending Qual'      },
};

const qualStatusConfig: Record<QualStatus, { color: string; icon: string }> = {
  'complete':    { color: 'text-green-400', icon: '✓' },
  'in-progress': { color: 'text-amber-400', icon: '⟳' },
  'scheduled':   { color: 'text-blue-400',  icon: '◷' },
  'not-started': { color: 'text-text-muted', icon: '○' },
};

const criticalityColors = { critical: 'text-red-400', major: 'text-amber-400', minor: 'text-text-muted' };

function isDue(dateStr: string): boolean {
  if (dateStr === '-') return false;
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  return d <= cutoff;
}

function GMPEquipmentTab({ searchQuery }: { searchQuery: string }) {
    const { deadClick } = useDeadClick();
  const [filterStatus, setFilterStatus] = useState<EquipmentStatus | 'all'>('all');

  const filtered = useMemo(() => {
    let list = mockEquipmentList;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.area.toLowerCase().includes(q) || e.equipmentId.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') list = list.filter(e => e.status === filterStatus);
    return list;
  }, [searchQuery, filterStatus]);

  const dueCalibration = mockEquipmentList.filter(e => isDue(e.nextCalibration)).length;
  const duePM = mockEquipmentList.filter(e => isDue(e.nextPM)).length;
  const outOfService = mockEquipmentList.filter(e => e.status === 'out-of-service').length;
  const qualified = mockEquipmentList.filter(e => e.status === 'qualified').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-green-400">{qualified}</span></div><div className="text-sm text-text-secondary">Fully Qualified</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="text-2xl font-bold text-amber-400">{dueCalibration}</span></div><div className="text-sm text-text-secondary">Calibration Due</div><div className="text-xs text-text-muted mt-0.5">Within 30 days</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Wrench className="w-5 h-5 text-amber-400" /><span className="text-2xl font-bold text-amber-400">{duePM}</span></div><div className="text-sm text-text-secondary">PM Due</div><div className="text-xs text-text-muted mt-0.5">Within 30 days</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><AlertOctagon className="w-5 h-5 text-red-400" /><span className="text-2xl font-bold text-red-400">{outOfService}</span></div><div className="text-sm text-text-secondary">Out of Service</div></CardContent></Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'qualified', 'due-requalification', 'out-of-service', 'pending-qualification'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-xs rounded-full transition-colors ${filterStatus === s ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted hover:text-text-secondary'}`}>
            {s === 'all' ? 'All' : equipStatusConfig[s as EquipmentStatus]?.label || s}
          </button>
        ))}
      </div>

      {/* Equipment Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs text-text-muted font-medium">Equipment</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Area</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Status</th>
                <th className="text-center p-4 text-xs text-text-muted font-medium">IQ/OQ/PQ</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Next Calibration</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Next PM</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Criticality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(eq => {
                const calDue = isDue(eq.nextCalibration);
                const pmDue = isDue(eq.nextPM);
                return (
                  <tr key={eq.id} className={`hover:bg-surface-card/50 ${eq.status === 'out-of-service' ? 'opacity-60' : ''}`}>
                    <td className="p-4">
                      <div className="font-medium text-text-primary">{eq.name}</div>
                      <div className="text-xs text-text-muted font-mono">{eq.equipmentId}</div>
                    </td>
                    <td className="p-4 text-text-secondary text-sm">{eq.area}</td>
                    <td className="p-4"><Badge color={equipStatusConfig[eq.status]?.color} size="xs">{equipStatusConfig[eq.status]?.label}</Badge></td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-mono">
                        <span className={qualStatusConfig[eq.iqStatus]?.color} title={`IQ: ${eq.iqStatus}`}>{qualStatusConfig[eq.iqStatus]?.icon}IQ</span>
                        <span className="text-text-muted">/</span>
                        <span className={qualStatusConfig[eq.oqStatus]?.color} title={`OQ: ${eq.oqStatus}`}>{qualStatusConfig[eq.oqStatus]?.icon}OQ</span>
                        <span className="text-text-muted">/</span>
                        <span className={qualStatusConfig[eq.pqStatus]?.color} title={`PQ: ${eq.pqStatus}`}>{qualStatusConfig[eq.pqStatus]?.icon}PQ</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`text-sm ${calDue ? 'text-amber-400 font-medium' : 'text-text-secondary'}`}>{eq.nextCalibration}</div>
                      {calDue && <div className="text-xs text-amber-400">Action required</div>}
                    </td>
                    <td className="p-4">
                      <div className={`text-sm ${pmDue ? 'text-amber-400 font-medium' : 'text-text-secondary'}`}>{eq.nextPM}</div>
                      {pmDue && <div className="text-xs text-amber-400">Schedule PM</div>}
                    </td>
                    <td className="p-4"><span className={`text-xs font-medium capitalize ${criticalityColors[eq.criticality]}`}>{eq.criticality}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// GMP TRAINING TAB
// ============================================================================

interface GMPTrainingRecord {
  id: string;
  personName: string;
  role: 'production' | 'qa' | 'qc' | 'engineering' | 'warehouse';
  area: string;
  training: string;
  type: 'sop' | 'gmp-foundation' | 'equipment' | 'regulatory' | 'hygiene';
  completedDate: string | null;
  dueDate: string;
  status: 'completed' | 'overdue' | 'due-soon' | 'not-started';
}

const mockGMPTraining: GMPTrainingRecord[] = [
  { id: 'GT-001', personName: 'Carlos Reyes', role: 'production', area: 'Granulation Suite', training: 'SOP-GMP-045: High Shear Granulation', type: 'sop', completedDate: '2025-01-10', dueDate: '2025-01-15', status: 'completed' },
  { id: 'GT-002', personName: 'Sarah Kim', role: 'qa', area: 'QA Department', training: 'cGMP Foundation (21 CFR 211)', type: 'gmp-foundation', completedDate: '2025-01-05', dueDate: '2025-01-10', status: 'completed' },
  { id: 'GT-003', personName: 'Miguel Santos', role: 'production', area: 'Compression Suite', training: 'SOP-GMP-023: Tablet Press Operation', type: 'equipment', completedDate: null, dueDate: '2025-01-22', status: 'overdue' },
  { id: 'GT-004', personName: 'Lisa Zhang', role: 'qc', area: 'QC Laboratory', training: 'SOP-QC-012: HPLC Method Execution', type: 'sop', completedDate: null, dueDate: '2025-01-28', status: 'due-soon' },
  { id: 'GT-005', personName: 'James Okafor', role: 'warehouse', area: 'Warehouse', training: 'Controlled Substance Handling', type: 'regulatory', completedDate: '2024-12-20', dueDate: '2024-12-30', status: 'completed' },
  { id: 'GT-006', personName: 'Anna Petrov', role: 'production', area: 'Aseptic Fill Suite', training: 'Gowning & Aseptic Technique', type: 'hygiene', completedDate: '2025-01-12', dueDate: '2025-01-20', status: 'completed' },
  { id: 'GT-007', personName: 'Tom Nakamura', role: 'engineering', area: 'Utilities', training: 'SOP-ENG-007: HVAC System Monitoring', type: 'sop', completedDate: null, dueDate: '2025-02-05', status: 'not-started' },
  { id: 'GT-008', personName: 'Maria Costa', role: 'production', area: 'Coating Suite', training: 'SOP-GMP-031: Film Coating Operation', type: 'equipment', completedDate: '2025-01-08', dueDate: '2025-01-15', status: 'completed' },
  { id: 'GT-009', personName: 'Derek Williams', role: 'qa', area: 'QA Department', training: 'Deviation & CAPA Management', type: 'gmp-foundation', completedDate: null, dueDate: '2025-02-01', status: 'not-started' },
  { id: 'GT-010', personName: 'Priya Sharma', role: 'qc', area: 'QC Laboratory', training: 'Data Integrity (ALCOA+)', type: 'regulatory', completedDate: '2025-01-03', dueDate: '2025-01-10', status: 'completed' },
];

const areaTrainingStats = [
  { area: 'Granulation Suite', total: 12, completed: 11, overdue: 0 },
  { area: 'Compression Suite', total: 10, completed: 8, overdue: 1 },
  { area: 'Aseptic Fill Suite', total: 16, completed: 15, overdue: 0 },
  { area: 'QA Department', total: 14, completed: 13, overdue: 0 },
  { area: 'QC Laboratory', total: 12, completed: 10, overdue: 0 },
  { area: 'Packaging Lines', total: 8, completed: 7, overdue: 0 },
];

const gmpRoleColors: Record<string, string> = {
  production: 'text-blue-400',
  qa:         'text-green-400',
  qc:         'text-purple-400',
  engineering:'text-orange-400',
  warehouse:  'text-teal-400',
};

const gmpTrainingTypeColors: Record<string, 'blue' | 'green' | 'amber' | 'purple' | 'slate'> = {
  'sop':           'blue',
  'gmp-foundation':'green',
  'equipment':     'amber',
  'regulatory':    'purple',
  'hygiene':       'slate',
};

function GMPTrainingTab({ searchQuery }: { searchQuery: string }) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due-soon' | 'not-started'>('all');

  const filtered = useMemo(() => {
    let list = mockGMPTraining;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.personName.toLowerCase().includes(q) || r.training.toLowerCase().includes(q) || r.area.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    return list;
  }, [searchQuery, filterStatus]);

  const overallPct = Math.round((mockGMPTraining.filter(t => t.status === 'completed').length / mockGMPTraining.length) * 100);
  const overdueCount = mockGMPTraining.filter(t => t.status === 'overdue').length;
  const dueSoonCount = mockGMPTraining.filter(t => t.status === 'due-soon').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><GraduationCap className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-green-400">{overallPct}%</span></div><div className="text-sm text-text-secondary">Overall Compliance</div><ProgressBar value={overallPct} color="green" size="sm" className="mt-2" /></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-2xl font-bold text-red-400">{overdueCount}</span></div><div className="text-sm text-text-secondary">Overdue</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Clock className="w-5 h-5 text-amber-400" /><span className="text-2xl font-bold text-amber-400">{dueSoonCount}</span></div><div className="text-sm text-text-secondary">Due Within 14 Days</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Users className="w-5 h-5 text-blue-400" /><span className="text-2xl font-bold text-text-primary">{mockGMPTraining.length}</span></div><div className="text-sm text-text-secondary">Total Records</div></CardContent></Card>
      </div>

      {/* Area Compliance */}
      <Card>
        <CardHeader><div className="flex items-center gap-2"><Factory className="w-5 h-5 text-text-muted" /><span className="font-medium text-text-primary">Compliance by Area</span></div></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {areaTrainingStats.map(area => {
              const pct = Math.round((area.completed / area.total) * 100);
              return (
                <div key={area.area} className="flex items-center gap-4">
                  <div className="w-44 shrink-0 text-sm font-medium text-text-primary">{area.area}</div>
                  <div className="flex-1"><ProgressBar value={pct} color={area.overdue > 0 ? 'red' : pct >= 90 ? 'green' : 'amber'} size="sm" /></div>
                  <div className="w-10 text-right text-sm font-semibold text-text-primary">{pct}%</div>
                  <div className="w-20 text-xs text-text-muted">{area.completed}/{area.total}</div>
                  {area.overdue > 0 && <Badge color="red" size="xs">{area.overdue} overdue</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter + Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-text-muted" />
              <span className="font-medium text-text-primary">Training Records</span>
              <Badge color="slate" size="xs">{filtered.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'overdue', 'due-soon', 'not-started'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-xs rounded-full transition-colors ${filterStatus === s ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted hover:text-text-secondary'}`}>
                  {s === 'all' ? 'All' : s === 'overdue' ? 'Overdue' : s === 'due-soon' ? 'Due Soon' : 'Pending'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-text-muted">No records match the selected filter</div>
            ) : filtered.map(record => (
              <div key={record.id} className="flex items-center justify-between px-6 py-4 hover:bg-surface-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${record.status === 'completed' ? 'bg-green-500' : record.status === 'overdue' ? 'bg-red-500' : record.status === 'due-soon' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary text-sm">{record.personName}</span>
                      <span className={`text-xs font-medium ${gmpRoleColors[record.role]}`}>{record.role}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{record.training}</div>
                    <div className="text-xs text-text-muted">{record.area}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge color={gmpTrainingTypeColors[record.type]} size="xs">{record.type.replace('-', ' ')}</Badge>
                  {record.completedDate ? (
                    <div className="text-right"><div className="text-xs text-text-muted">Completed</div><div className="text-text-secondary">{record.completedDate}</div></div>
                  ) : (
                    <div className="text-right"><div className="text-xs text-text-muted">Due</div><div className={record.status === 'overdue' ? 'text-red-400 font-medium' : 'text-text-secondary'}>{record.dueDate}</div></div>
                  )}
                  <Badge color={record.status === 'completed' ? 'green' : record.status === 'overdue' ? 'red' : record.status === 'due-soon' ? 'amber' : 'slate'} size="xs">
                    {record.status === 'completed' ? 'Done' : record.status === 'overdue' ? 'Overdue' : record.status === 'due-soon' ? 'Due Soon' : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GMPScreen() {
  const { deadClick } = useDeadClick();
  const [activeTab, setActiveTab] = useState<GMPTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const { isCollapsed, setCollapsed } = useCollapsedSections('gmp');
  
  const tabs: { id: GMPTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Gauge className="w-4 h-4" /> },
    { id: 'batches', label: 'Batch Records', icon: <Package className="w-4 h-4" /> },
    { id: 'deviations', label: 'Deviations', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'environmental', label: 'Environmental', icon: <Thermometer className="w-4 h-4" /> },
    { id: 'equipment', label: 'Equipment', icon: <Wrench className="w-4 h-4" /> },
    { id: 'training', label: 'Training', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <ScreenHeader
        moduleId="gmp"
        title="GMP Compliance"
        subtitle="21 CFR 210/211 Current Good Manufacturing Practice — batch control, deviations, and CAPA"
        icon={<Factory className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="hidden sm:block w-48 lg:w-64" />
            <CapabilityGate moduleId="gmp" capability="author" inline>
              <Button variant="primary" size="sm" onClick={deadClick}>
                <Plus className="w-4 h-4 mr-1" />
                Report Deviation
              </Button>
            </CapabilityGate>
          </div>
        }
      >
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mb-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                activeTab === tab.id ? 'bg-surface-card text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary hover:bg-surface-card/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </ScreenHeader>
      
      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-4 md:space-y-6">
            {/* Compliance Score + Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Card className="lg:row-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <span className="font-medium">GMP Compliance</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-4">
                  <ComplianceGauge score={metrics.overallCompliance} />
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-400">{metrics.batchesInProgress}</div>
                      <div className="text-xs text-text-muted">In Progress</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-400">{metrics.pendingReview}</div>
                      <div className="text-xs text-text-muted">Pending Review</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <MetricCard title="Open Deviations" value={metrics.openDeviations} subtitle={`${metrics.criticalDeviations} critical`} icon={<AlertTriangle className="w-5 h-5" />} color={metrics.criticalDeviations > 0 ? 'red' : 'amber'} />
              <MetricCard title="Open CAPAs" value={metrics.capasOpen} subtitle="Corrective actions" icon={<Target className="w-5 h-5" />} color="purple" />
              <MetricCard title="Environmental Alerts" value={metrics.environmentalAlerts} subtitle="Requiring attention" icon={<Thermometer className="w-5 h-5" />} color={metrics.environmentalAlerts > 0 ? 'amber' : 'green'} />
              <MetricCard title="Equipment Due" value={metrics.equipmentDue} subtitle="Calibration/PM" icon={<Wrench className="w-5 h-5" />} color={metrics.equipmentDue > 0 ? 'amber' : 'green'} />
            </div>
            
            {/* Batches Requiring Attention */}
            <CollapsibleSection
              title="Batches Requiring Attention"
              icon={<Package className="w-5 h-5 text-amber-400" />}
              count={mockBatches.filter(b => b.status === 'pending-review' || b.status === 'quarantine').length}
              defaultExpanded={!isCollapsed('batches-attention')}
              onToggle={(expanded) => setCollapsed('batches-attention', !expanded)}
              variant="card"
              size="sm"
              headerActions={<Button variant="ghost" size="sm" onClick={() => setActiveTab('batches')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>}
            >
              <div className="space-y-3">
                {mockBatches.filter(b => b.status === 'pending-review' || b.status === 'quarantine').map(batch => (
                  <BatchRow key={batch.id} batch={batch} />
                ))}
              </div>
            </CollapsibleSection>
            
            {/* Environmental Monitoring */}
            <CollapsibleSection
              title="Environmental Monitoring"
              icon={<Thermometer className="w-5 h-5 text-blue-400" />}
              count={mockEnvironmental.filter(e => e.status !== 'pass').length}
              badge={mockEnvironmental.some(e => e.status !== 'pass') ? { text: 'Alert', color: 'amber' as const } : undefined}
              defaultExpanded={!isCollapsed('environmental')}
              onToggle={(expanded) => setCollapsed('environmental', !expanded)}
              variant="card"
              size="sm"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {mockEnvironmental.map(reading => (
                  <EnvironmentalCard key={reading.id} reading={reading} />
                ))}
              </div>
            </CollapsibleSection>
            
            {/* Recent Deviations */}
            <CollapsibleSection
              title="Recent Deviations"
              icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
              count={mockDeviations.filter(d => d.status !== 'closed').length}
              defaultExpanded={!isCollapsed('recent-deviations')}
              onToggle={(expanded) => setCollapsed('recent-deviations', !expanded)}
              variant="card"
              size="sm"
              headerActions={<Button variant="ghost" size="sm" onClick={() => setActiveTab('deviations')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>}
            >
              <div className="space-y-3">
                {mockDeviations.filter(d => d.status !== 'closed').map(deviation => (
                  <DeviationRow key={deviation.id} deviation={deviation} />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}
        
        {activeTab === 'batches' && (
          <div className="space-y-4">
            {mockBatches.map(batch => <BatchRow key={batch.id} batch={batch} />)}
          </div>
        )}
        
        {activeTab === 'deviations' && (
          <div className="space-y-4">
            {mockDeviations.map(deviation => <DeviationRow key={deviation.id} deviation={deviation} />)}
          </div>
        )}
        
        {activeTab === 'environmental' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mockEnvironmental.map(reading => <EnvironmentalCard key={reading.id} reading={reading} />)}
          </div>
        )}
        
        {activeTab === 'equipment' && <GMPEquipmentTab searchQuery={searchQuery} />}
        {activeTab === 'training' && <GMPTrainingTab searchQuery={searchQuery} />}
      </div>
    </div>
  );
}

export default GMPScreen;
