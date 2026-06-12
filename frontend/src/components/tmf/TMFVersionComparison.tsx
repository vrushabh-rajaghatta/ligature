

// ============================================================================
// TMF Version Comparison - v172: Document Version Diffs & Compliance Snapshots
// ============================================================================
// Provides side-by-side and unified diff views for TMF artifact versions,
// compliance snapshot comparisons across time points, and version history
// visualization.
// ============================================================================

import { useState, useMemo } from 'react';
import {
  GitCompare,
  FileText,
  Calendar,
  ChevronDown,
  Clock,
  User,
  Plus,
  Minus,
  RefreshCw,
  ArrowRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  Layers,
} from 'lucide-react';
import { useTMFStore } from '@/store/useTMFStore';
import type { TMFArtifact, TMFZone, AuditEntry } from '@/domains/tmf/contracts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';

// ============================================================================
// TYPES
// ============================================================================

interface TMFVersionComparisonProps {
  studyId: string;
}

type ComparisonMode = 'document' | 'compliance' | 'history';
type DiffViewMode = 'side-by-side' | 'unified' | 'summary';

interface ArtifactVersion {
  id: string;
  version: string;
  title: string;
  status: string;
  filedDate: string;
  modifiedBy: string;
  changeDescription?: string;
  auditTrail: AuditEntry[];
}

interface ComplianceSnapshot {
  id: string;
  date: string;
  overallScore: number;
  criticalScore: number;
  zoneScores: Record<TMFZone, number>;
  artifactsFiled: number;
  artifactsExpected: number;
  missingCritical: number;
}

interface VersionChange {
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  changeType: 'added' | 'removed' | 'modified';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ZONE_NAMES: Record<TMFZone, string> = {
  'zone-01': 'Trial Management',
  'zone-02': 'Central Trial Documents',
  'zone-03': 'Regulatory',
  'zone-04': 'IRB/IEC Approvals',
  'zone-05': 'Site Management',
  'zone-06': 'IP and Trial Supplies',
  'zone-07': 'Safety Reporting',
  'zone-08': 'Central and Local Testing',
  'zone-09': 'Third Parties',
  'zone-10': 'Data Management',
};

const DIFF_COLORS = {
  added: 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500',
  removed: 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500',
  modified: 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500',
  unchanged: 'bg-transparent',
};

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

function generateMockVersions(artifact: TMFArtifact): ArtifactVersion[] {
  const versions: ArtifactVersion[] = [];
  const currentVersion = parseFloat(artifact.version) || 1.0;
  
  for (let v = 1.0; v <= currentVersion; v += 1.0) {
    const versionDate = new Date(artifact.createdAt);
    versionDate.setDate(versionDate.getDate() + (v - 1) * 30);
    
    versions.push({
      id: `${artifact.id}-v${v.toFixed(1)}`,
      version: v.toFixed(1),
      title: artifact.title,
      status: v === currentVersion ? artifact.status : 'superseded',
      filedDate: versionDate.toISOString(),
      modifiedBy: artifact.lastModifiedBy,
      changeDescription: v === 1.0 
        ? 'Initial version' 
        : `Updates to ${artifact.title} - Version ${v.toFixed(1)}`,
      auditTrail: artifact.auditTrail.filter((_, idx) => idx < v * 2),
    });
  }
  
  return versions.reverse();
}

function generateMockComplianceSnapshots(studyId: string): ComplianceSnapshot[] {
  const snapshots: ComplianceSnapshot[] = [];
  const now = new Date();
  
  for (let weeksAgo = 0; weeksAgo <= 12; weeksAgo += 2) {
    const snapshotDate = new Date(now);
    snapshotDate.setDate(snapshotDate.getDate() - (weeksAgo * 7));
    
    const baseScore = 65 + (12 - weeksAgo) * 2.5;
    const variance = Math.random() * 5 - 2.5;
    const score = Math.min(100, Math.max(0, baseScore + variance));
    
    const zoneScores: Record<TMFZone, number> = {} as Record<TMFZone, number>;
    Object.keys(ZONE_NAMES).forEach((zone) => {
      const zoneVariance = Math.random() * 15 - 7.5;
      zoneScores[zone as TMFZone] = Math.min(100, Math.max(0, score + zoneVariance));
    });
    
    snapshots.push({
      id: `snapshot-${studyId}-${weeksAgo}`,
      date: snapshotDate.toISOString(),
      overallScore: Math.round(score),
      criticalScore: Math.round(score + 5),
      zoneScores,
      artifactsFiled: Math.round(150 + (12 - weeksAgo) * 8),
      artifactsExpected: 250,
      missingCritical: Math.max(0, Math.round(15 - (12 - weeksAgo) * 1.2)),
    });
  }
  
  return snapshots;
}

function generateVersionChanges(v1: ArtifactVersion, v2: ArtifactVersion): VersionChange[] {
  const changes: VersionChange[] = [];
  
  if (v1.status !== v2.status) {
    changes.push({
      field: 'Status',
      oldValue: v1.status,
      newValue: v2.status,
      changeType: 'modified',
    });
  }
  
  changes.push({
    field: 'Section 2.1 - Background',
    oldValue: 'Original background text with initial study rationale.',
    newValue: 'Updated background text with revised study rationale and additional context.',
    changeType: 'modified',
  });
  
  changes.push({
    field: 'Section 3.2 - Methodology',
    oldValue: null,
    newValue: 'New methodology section added based on protocol amendment.',
    changeType: 'added',
  });
  
  if (parseFloat(v2.version) > parseFloat(v1.version) + 1) {
    changes.push({
      field: 'Section 4.1 - Statistical Plan',
      oldValue: 'Previous statistical analysis plan',
      newValue: null,
      changeType: 'removed',
    });
  }
  
  return changes;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface VersionSelectorProps {
  versions: ArtifactVersion[];
  selectedVersion: string | null;
  onSelect: (versionId: string) => void;
  label: string;
  side: 'left' | 'right';
}

function VersionSelector({ versions, selectedVersion, onSelect, label, side }: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = versions.find(v => v.id === selectedVersion);
  
  return (
    <div className="relative">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
          side === 'left' 
            ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' 
            : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
        }`}
      >
        {selected ? (
          <div className="text-left">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Version {selected.version}
            </div>
            <div className="text-xs text-slate-500">
              {new Date(selected.filedDate).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-400">Select version...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {versions.map((version) => (
            <button
              key={version.id}
              onClick={() => {
                onSelect(version.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                version.id === selectedVersion ? 'bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  v{version.version}
                </span>
                <Badge 
                  color={version.status === 'filed' ? 'emerald' : version.status === 'superseded' ? 'purple' : 'slate'}
                  size="sm"
                >
                  {version.status}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {new Date(version.filedDate).toLocaleDateString()} • {version.modifiedBy}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DiffViewProps {
  changes: VersionChange[];
  mode: DiffViewMode;
  leftVersion: ArtifactVersion | null;
  rightVersion: ArtifactVersion | null;
}

function DiffView({ changes, mode, leftVersion, rightVersion }: DiffViewProps) {
  if (!leftVersion || !rightVersion) {
    return (
      <EmptyState
        icon={<GitCompare className="w-12 h-12" />}
        title="Select versions to compare"
        description="Choose a version on each side to see the differences."
      />
    );
  }
  
  if (mode === 'summary') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Plus className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {changes.filter(c => c.changeType === 'added').length}
              </div>
              <div className="text-xs text-slate-500">Additions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Minus className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {changes.filter(c => c.changeType === 'removed').length}
              </div>
              <div className="text-xs text-slate-500">Removals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {changes.filter(c => c.changeType === 'modified').length}
              </div>
              <div className="text-xs text-slate-500">Modifications</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-2">
          {changes.map((change, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-lg ${DIFF_COLORS[change.changeType]}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {change.changeType === 'added' && <Plus className="w-4 h-4 text-emerald-500" />}
                {change.changeType === 'removed' && <Minus className="w-4 h-4 text-red-500" />}
                {change.changeType === 'modified' && <RefreshCw className="w-4 h-4 text-amber-500" />}
                <span className="font-medium text-slate-700 dark:text-slate-200">{change.field}</span>
              </div>
              {change.oldValue && (
                <div className="text-sm text-red-600 dark:text-red-400 line-through mb-1">
                  {String(change.oldValue)}
                </div>
              )}
              {change.newValue && (
                <div className="text-sm text-emerald-600 dark:text-emerald-400">
                  {String(change.newValue)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (mode === 'side-by-side') {
    return (
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
          <div className="bg-red-50/50 dark:bg-red-900/10 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Version {leftVersion.version}
            </span>
            <span className="text-xs text-slate-500 ml-2">
              ({new Date(leftVersion.filedDate).toLocaleDateString()})
            </span>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Version {rightVersion.version}
            </span>
            <span className="text-xs text-slate-500 ml-2">
              ({new Date(rightVersion.filedDate).toLocaleDateString()})
            </span>
          </div>
        </div>
        
        {changes.map((change, idx) => (
          <div 
            key={idx} 
            className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
          >
            <div className={`p-3 ${change.changeType === 'removed' || change.changeType === 'modified' ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
              <div className="text-xs font-medium text-slate-500 mb-1">{change.field}</div>
              {change.oldValue ? (
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {String(change.oldValue)}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">Not present</div>
              )}
            </div>
            <div className={`p-3 ${change.changeType === 'added' || change.changeType === 'modified' ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}>
              <div className="text-xs font-medium text-slate-500 mb-1">{change.field}</div>
              {change.newValue ? (
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {String(change.newValue)}
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">Not present</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Unified view
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Comparing v{leftVersion.version}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          v{rightVersion.version}
        </span>
      </div>
      
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {changes.map((change, idx) => (
          <div key={idx} className={`p-3 ${DIFF_COLORS[change.changeType]}`}>
            <div className="flex items-center gap-2 mb-2">
              {change.changeType === 'added' && <Plus className="w-4 h-4 text-emerald-500" />}
              {change.changeType === 'removed' && <Minus className="w-4 h-4 text-red-500" />}
              {change.changeType === 'modified' && <RefreshCw className="w-4 h-4 text-amber-500" />}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {change.field}
              </span>
              <Badge 
                color={change.changeType === 'added' ? 'emerald' : change.changeType === 'removed' ? 'red' : 'amber'}
                size="sm"
              >
                {change.changeType}
              </Badge>
            </div>
            {change.oldValue && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded mb-1 line-through">
                - {String(change.oldValue)}
              </div>
            )}
            {change.newValue && (
              <div className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                + {String(change.newValue)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ComplianceComparisonProps {
  snapshots: ComplianceSnapshot[];
  leftSnapshot: string | null;
  rightSnapshot: string | null;
  onSelectLeft: (id: string) => void;
  onSelectRight: (id: string) => void;
}

function ComplianceComparison({ 
  snapshots, 
  leftSnapshot, 
  rightSnapshot,
  onSelectLeft,
  onSelectRight,
}: ComplianceComparisonProps) {
  const left = snapshots.find(s => s.id === leftSnapshot);
  const right = snapshots.find(s => s.id === rightSnapshot);
  
  const scoreDiff = left && right ? right.overallScore - left.overallScore : 0;
  const criticalDiff = left && right ? right.criticalScore - left.criticalScore : 0;
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
            Earlier Snapshot
          </label>
          <select
            value={leftSnapshot || ''}
            onChange={(e) => onSelectLeft(e.target.value)}
            className="w-full px-3 py-2 border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 rounded-lg text-sm"
          >
            <option value="">Select snapshot...</option>
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString()} - {s.overallScore}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
            Later Snapshot
          </label>
          <select
            value={rightSnapshot || ''}
            onChange={(e) => onSelectRight(e.target.value)}
            className="w-full px-3 py-2 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg text-sm"
          >
            <option value="">Select snapshot...</option>
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString()} - {s.overallScore}%
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {left && right ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 mb-1">Overall Compliance</div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {right.overallScore}%
                  </span>
                  <span className={`text-sm font-medium flex items-center ${
                    scoreDiff >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {scoreDiff >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {scoreDiff >= 0 ? '+' : ''}{scoreDiff.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  from {left.overallScore}%
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 mb-1">Critical Compliance</div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {right.criticalScore}%
                  </span>
                  <span className={`text-sm font-medium flex items-center ${
                    criticalDiff >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {criticalDiff >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {criticalDiff >= 0 ? '+' : ''}{criticalDiff.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  from {left.criticalScore}%
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 mb-1">Artifacts Filed</div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {right.artifactsFiled}
                  </span>
                  <span className="text-sm font-medium text-emerald-600 flex items-center">
                    <Plus className="w-4 h-4 mr-1" />
                    {right.artifactsFiled - left.artifactsFiled}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  of {right.artifactsExpected} expected
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-4">
                Zone-by-Zone Comparison
              </h4>
              <div className="space-y-3">
                {(Object.keys(ZONE_NAMES) as TMFZone[]).map((zone) => {
                  const leftScore = left.zoneScores[zone];
                  const rightScore = right.zoneScores[zone];
                  const zoneDiff = rightScore - leftScore;
                  
                  return (
                    <div key={zone} className="flex items-center gap-4">
                      <div className="w-40 text-sm text-slate-600 dark:text-slate-400 truncate">
                        {ZONE_NAMES[zone]}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="w-16 text-right text-sm text-slate-500">
                          {leftScore.toFixed(0)}%
                        </div>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                          <div 
                            className="absolute h-full bg-red-300 dark:bg-red-700 rounded-full"
                            style={{ width: `${leftScore}%` }}
                          />
                          <div 
                            className="absolute h-full bg-emerald-500 dark:bg-emerald-600 rounded-full"
                            style={{ width: `${rightScore}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-slate-700 dark:text-slate-200 font-medium">
                          {rightScore.toFixed(0)}%
                        </div>
                        <div className={`w-16 text-sm font-medium ${
                          zoneDiff >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {zoneDiff >= 0 ? '+' : ''}{zoneDiff.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-200">
                Missing Critical Documents
              </div>
              <div className="text-sm text-amber-600 dark:text-amber-400">
                {left.missingCritical} → {right.missingCritical}
                {right.missingCritical < left.missingCritical && (
                  <span className="text-emerald-600 ml-2">
                    ({left.missingCritical - right.missingCritical} resolved)
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<BarChart3 className="w-12 h-12" />}
          title="Select snapshots to compare"
          description="Choose a compliance snapshot from each time period to see how your TMF completeness has changed."
        />
      )}
    </div>
  );
}

interface VersionHistoryProps {
  versions: ArtifactVersion[];
  onSelectVersions: (v1: string, v2: string) => void;
}

function VersionHistory({ versions, onSelectVersions }: VersionHistoryProps) {
  return (
    <div className="space-y-2">
      {versions.map((version, idx) => (
        <div 
          key={version.id}
          className="flex items-start gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              idx === 0 ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <FileText className="w-4 h-4" />
            </div>
            {idx < versions.length - 1 && (
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 my-1" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Version {version.version}
              </span>
              <Badge 
                color={version.status === 'filed' ? 'emerald' : version.status === 'superseded' ? 'purple' : 'slate'}
                size="sm"
              >
                {version.status}
              </Badge>
              {idx === 0 && <Badge color="blue" size="sm">Current</Badge>}
            </div>
            <div className="text-sm text-slate-500 mb-2">
              {version.changeDescription}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(version.filedDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {version.modifiedBy}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {version.auditTrail.length} changes
              </span>
            </div>
          </div>
          
          {idx < versions.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectVersions(versions[idx + 1].id, version.id)}
            >
              <GitCompare className="w-4 h-4 mr-1" />
              Compare
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TMFVersionComparison({ studyId }: TMFVersionComparisonProps) {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('document');
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>('summary');
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [leftVersionId, setLeftVersionId] = useState<string | null>(null);
  const [rightVersionId, setRightVersionId] = useState<string | null>(null);
  const [leftSnapshotId, setLeftSnapshotId] = useState<string | null>(null);
  const [rightSnapshotId, setRightSnapshotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const artifacts = useTMFStore(state => state.artifacts);
  const artifactsByStudy = useTMFStore(state => state.artifactsByStudy);
  
  const studyArtifacts = useMemo(() => {
    const artifactIds = artifactsByStudy[studyId] || [];
    return artifactIds
      .map(id => artifacts[id])
      .filter(Boolean)
      .filter(a => 
        !searchQuery || 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [artifacts, artifactsByStudy, studyId, searchQuery]);
  
  const artifactVersions = useMemo(() => {
    if (!selectedArtifactId || !artifacts[selectedArtifactId]) return [];
    return generateMockVersions(artifacts[selectedArtifactId]);
  }, [selectedArtifactId, artifacts]);
  
  const complianceSnapshots = useMemo(() => {
    return generateMockComplianceSnapshots(studyId);
  }, [studyId]);
  
  const versionChanges = useMemo(() => {
    if (!leftVersionId || !rightVersionId) return [];
    const leftVersion = artifactVersions.find(v => v.id === leftVersionId);
    const rightVersion = artifactVersions.find(v => v.id === rightVersionId);
    if (!leftVersion || !rightVersion) return [];
    return generateVersionChanges(leftVersion, rightVersion);
  }, [leftVersionId, rightVersionId, artifactVersions]);
  
  const leftVersion = artifactVersions.find(v => v.id === leftVersionId) || null;
  const rightVersion = artifactVersions.find(v => v.id === rightVersionId) || null;
  
  const handleSelectArtifact = (artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setLeftVersionId(null);
    setRightVersionId(null);
  };
  
  const handleSelectVersionsFromHistory = (v1: string, v2: string) => {
    setLeftVersionId(v1);
    setRightVersionId(v2);
    setComparisonMode('document');
  };
  
  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={comparisonMode === 'document' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setComparisonMode('document')}
          >
            <GitCompare className="w-4 h-4 mr-1" />
            Document Versions
          </Button>
          <Button
            variant={comparisonMode === 'compliance' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setComparisonMode('compliance')}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Compliance Snapshots
          </Button>
          <Button
            variant={comparisonMode === 'history' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setComparisonMode('history')}
          >
            <History className="w-4 h-4 mr-1" />
            Version History
          </Button>
        </div>
        
        {comparisonMode === 'document' && (
          <div className="flex items-center gap-2">
            <Button
              variant={diffViewMode === 'summary' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDiffViewMode('summary')}
            >
              Summary
            </Button>
            <Button
              variant={diffViewMode === 'side-by-side' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDiffViewMode('side-by-side')}
            >
              Side-by-Side
            </Button>
            <Button
              variant={diffViewMode === 'unified' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDiffViewMode('unified')}
            >
              Unified
            </Button>
          </div>
        )}
      </div>
      
      {/* Document Version Comparison */}
      {comparisonMode === 'document' && (
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700 dark:text-slate-200">
                Select Document
              </h4>
              <Badge color="slate" size="sm">{studyArtifacts.length}</Badge>
            </div>
            
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
            />
            
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {studyArtifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => handleSelectArtifact(artifact.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedArtifactId === artifact.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {artifact.title}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>v{artifact.version}</span>
                    <span>•</span>
                    <span>{artifact.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="col-span-3 space-y-4">
            {selectedArtifactId && artifactVersions.length > 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <VersionSelector
                    versions={artifactVersions}
                    selectedVersion={leftVersionId}
                    onSelect={setLeftVersionId}
                    label="Compare From (Older)"
                    side="left"
                  />
                  <VersionSelector
                    versions={artifactVersions}
                    selectedVersion={rightVersionId}
                    onSelect={setRightVersionId}
                    label="Compare To (Newer)"
                    side="right"
                  />
                </div>
                
                <DiffView
                  changes={versionChanges}
                  mode={diffViewMode}
                  leftVersion={leftVersion}
                  rightVersion={rightVersion}
                />
              </>
            ) : selectedArtifactId ? (
              <EmptyState
                icon={<Layers className="w-12 h-12" />}
                title="Single version document"
                description="This document only has one version and cannot be compared."
              />
            ) : (
              <EmptyState
                icon={<FileText className="w-12 h-12" />}
                title="Select a document"
                description="Choose a document from the list to compare its versions."
              />
            )}
          </div>
        </div>
      )}
      
      {/* Compliance Snapshot Comparison */}
      {comparisonMode === 'compliance' && (
        <ComplianceComparison
          snapshots={complianceSnapshots}
          leftSnapshot={leftSnapshotId}
          rightSnapshot={rightSnapshotId}
          onSelectLeft={setLeftSnapshotId}
          onSelectRight={setRightSnapshotId}
        />
      )}
      
      {/* Version History */}
      {comparisonMode === 'history' && (
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700 dark:text-slate-200">
                Select Document
              </h4>
              <Badge color="slate" size="sm">{studyArtifacts.length}</Badge>
            </div>
            
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
            />
            
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {studyArtifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => handleSelectArtifact(artifact.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedArtifactId === artifact.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {artifact.title}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>v{artifact.version}</span>
                    <span>•</span>
                    <span>{artifact.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="col-span-3">
            {selectedArtifactId && artifactVersions.length > 0 ? (
              <VersionHistory
                versions={artifactVersions}
                onSelectVersions={handleSelectVersionsFromHistory}
              />
            ) : (
              <EmptyState
                icon={<History className="w-12 h-12" />}
                title="Select a document"
                description="Choose a document to view its version history."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
