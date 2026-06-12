

import { useMemo } from 'react';
import { 
  useCurrentRole, 
  useRoleConfig,
  ROLE_PRESETS,
  type UserRole 
} from '@/store/useUserRoleStore';
import { useHAQStore } from '@/store/useHAQStore';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import { useQMSStore } from '@/store/useQMSStore';
import { ModuleQuickAccessCard } from '@/components/ui/ModuleQuickAccessCard';
import type { ModuleId } from '@/types/core';
import { Sparkles } from 'lucide-react';

interface RoleAwareDashboardProps {
  onNavigate: (moduleId: ModuleId) => void;
}

// v0.42.26: Store item interfaces for stats calculation
interface HAQItem {
  status: string;
  dueDate?: string;
}

interface SignalItem {
  status: string;
}

interface DeviationItem {
  status: string;
}

// Helper to get live stats for a module - extracted to avoid hook in loop
function getModuleStats(
  moduleId: ModuleId,
  haqs: HAQItem[],
  signals: Record<string, SignalItem>,
  deviations: Record<string, DeviationItem>
): Array<{ value: number; label: string; type: 'alert' | 'warning' | 'info' | 'success' }> {
  const stats: Array<{ value: number; label: string; type: 'alert' | 'warning' | 'info' | 'success' }> = [];
  
  switch (moduleId) {
    case 'haq': {
      const open = haqs.filter(h => h.status === 'open' || h.status === 'new' || h.status === 'in-progress').length;
      const overdue = haqs.filter(h => {
        if (!h.dueDate) return false;
        return new Date(h.dueDate) < new Date();
      }).length;
      if (overdue > 0) stats.push({ value: overdue, label: 'overdue', type: 'alert' });
      else if (open > 0) stats.push({ value: open, label: 'open', type: 'info' });
      break;
    }
    case 'safety': {
      const signalList = Object.values(signals);
      const newSignals = signalList.filter((s: SignalItem) => s.status === 'new').length;
      const underReview = signalList.filter((s: SignalItem) => s.status === 'under_review').length;
      if (newSignals > 0) stats.push({ value: newSignals, label: 'new signals', type: 'alert' });
      else if (underReview > 0) stats.push({ value: underReview, label: 'reviewing', type: 'warning' });
      break;
    }
    case 'qms': {
      const devList = Object.values(deviations);
      const open = devList.filter((d: DeviationItem) => d.status === 'open' || d.status === 'investigating').length;
      if (open > 0) stats.push({ value: open, label: 'open deviations', type: 'warning' });
      break;
    }
    case 'submissions-hub': {
      stats.push({ value: 3, label: 'active', type: 'info' });
      break;
    }
    case 'authoring': {
      stats.push({ value: 2, label: 'in review', type: 'info' });
      break;
    }
    case 'ctms': {
      stats.push({ value: 5, label: 'active trials', type: 'success' });
      break;
    }
    case 'cmc-manufacturing': {
      stats.push({ value: 1, label: 'pending batch', type: 'warning' });
      break;
    }
  }
  
  return stats;
}

export function RoleAwareDashboard({ onNavigate }: RoleAwareDashboardProps) {
  const currentRole = useCurrentRole();
  const roleConfig = useRoleConfig();
  
  // Get store data once at top level (not in a loop)
  const haqs = useHAQStore(s => s.haqs) || [];
  const signals = usePharmacovigilanceStore(s => s.signals) || {};
  const deviations = useQMSStore(s => s.deviations) || {};
  
  // Compute primary/secondary modules from role config
  const { primaryModules, secondaryModules, roleLabel } = useMemo(() => {
    if (!roleConfig) {
      const fallback = ROLE_PRESETS['executive'];
      return {
        primaryModules: fallback.primaryModules,
        secondaryModules: fallback.secondaryModules,
        roleLabel: fallback.label
      };
    }
    return {
      primaryModules: roleConfig.primaryModules,
      secondaryModules: roleConfig.secondaryModules,
      roleLabel: roleConfig.label
    };
  }, [roleConfig]);
  
  // Pre-compute all stats to avoid hooks in render loop
  const moduleStats = useMemo(() => {
    const allModules = [...primaryModules, ...secondaryModules];
    const statsMap: Record<string, ReturnType<typeof getModuleStats>> = {};
    for (const moduleId of allModules) {
      statsMap[moduleId] = getModuleStats(moduleId as ModuleId, haqs, signals, deviations);
    }
    return statsMap;
  }, [primaryModules, secondaryModules, haqs, signals, deviations]);
  
  // Don't render if no role selected
  if (!currentRole) {
    return null;
  }
  
  return (
    <div className="mb-6">
      {/* Role-specific header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue text-sm">
          <Sparkles className="w-4 h-4" />
          <span>{roleLabel} Dashboard</span>
        </div>
      </div>
      
      {/* Primary Modules - 4-column grid */}
      <div className="mb-4">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          Primary Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryModules.slice(0, 4).map(moduleId => (
            <ModuleQuickAccessCard
              key={moduleId}
              moduleId={moduleId as ModuleId}
              onClick={() => onNavigate(moduleId as ModuleId)}
              showMetrics={true}
              stats={moduleStats[moduleId] || []}
            />
          ))}
        </div>
      </div>
      
      {/* Secondary Modules - 6-column compact grid */}
      {secondaryModules.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
            Quick Access
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {secondaryModules.slice(0, 6).map(moduleId => (
              <ModuleQuickAccessCard
                key={moduleId}
                moduleId={moduleId as ModuleId}
                onClick={() => onNavigate(moduleId as ModuleId)}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
