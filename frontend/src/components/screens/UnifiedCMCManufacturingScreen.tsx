
// =============================================================================
// UNIFIED CMC & MANUFACTURING SCREEN - v0.10.0
// =============================================================================
// Combines CMC (Chemistry, Manufacturing, Controls) screens with Manufacturing 
// operations screens into a single unified module. CMC handles product development
// (drug substance, drug product, stability, analytical methods) while Manufacturing
// handles production operations (batch management, process validation, equipment).
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  Beaker,
  Factory,
  Package,
  FlaskConical,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Layers,
  Settings,
  ClipboardCheck,
  Thermometer,
  TestTube2,
  GitBranch,
  ArrowRightLeft,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { FilterState } from '@/components/layout/FilterBar';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge, BadgeColor } from '@/components/ui/Badge';

// Import sub-screens to render within modes
import { CMCScreen } from './CMCScreen';
import ManufacturingScreen from './ManufacturingScreen';

// =============================================================================
// Types
// =============================================================================

interface UnifiedCMCManufacturingScreenProps {
  filters?: FilterState;
  initialMode?: 'cmc' | 'operations';
}

type PrimaryMode = 'cmc' | 'operations';

// =============================================================================
// Component
// =============================================================================

export function UnifiedCMCManufacturingScreen({ filters, initialMode = 'cmc' }: UnifiedCMCManufacturingScreenProps) {
  const [primaryMode, setPrimaryMode] = useState<PrimaryMode>(initialMode);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Primary mode tabs
  const primaryTabs = [
    {
      id: 'cmc' as PrimaryMode,
      label: 'CMC Development',
      icon: <Beaker className="w-4 h-4" />,
      description: 'Drug substance, drug product, stability, analytical methods, process development',
    },
    {
      id: 'operations' as PrimaryMode,
      label: 'Manufacturing Ops',
      icon: <Factory className="w-4 h-4" />,
      description: 'Batch management, process validation, equipment & facilities',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <span className="text-sm text-text-muted">Loading CMC & Manufacturing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="cmc-manufacturing"
        title="CMC & Manufacturing"
        subtitle={primaryMode === 'cmc' ? 'Chemistry, Manufacturing, and Controls development activities' : 'Production operations, batch management, and equipment'}
        icon={<FlaskConical className="w-5 h-5" />}
      >
        <div className="flex items-center gap-6 text-sm -mb-3">
          <div className="flex items-center gap-2"><Package className="w-4 h-4 text-text-muted" /><span className="text-text-muted">Products:</span><span className="font-semibold text-text-primary">4</span></div>
          <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-accent-blue" /><span className="text-text-muted">Batches:</span><span className="font-semibold text-accent-blue">23</span></div>
          <div className="flex items-center gap-2"><Thermometer className="w-4 h-4 text-accent-purple" /><span className="text-text-muted">Stability:</span><span className="font-semibold text-accent-purple">8</span></div>
        </div>
      </ScreenHeader>
      <div className="border-b border-border bg-surface">
        {/* Primary Mode Tabs */}
        <div className="px-6 flex items-center gap-1">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPrimaryMode(tab.id)}
              className={`px-4 py-2.5 text-sm rounded-t-lg transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                primaryMode === tab.id
                  ? 'bg-surface-elevated text-accent-blue border-accent-blue font-medium'
                  : 'text-text-secondary hover:text-text-primary border-transparent hover:bg-surface-card'
              }`}
              title={tab.description}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>


      {/* Content - Render appropriate sub-screen */}
      <div className="flex-1 overflow-hidden">
        {primaryMode === 'cmc' ? (
          <CMCContent filters={filters} />
        ) : (
          <ManufacturingContent filters={filters} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CMC Content - Wraps CMCScreen without its header
// =============================================================================

function CMCContent({ filters }: { filters?: FilterState }) {
  // CMCScreen has its own internal tabs, we just embed it
  return <CMCScreen filters={filters} />;
}

// =============================================================================
// Manufacturing Content - Wraps ManufacturingScreen
// =============================================================================

function ManufacturingContent({ filters }: { filters?: FilterState }) {
  // ManufacturingScreen doesn't currently use filters
  return <ManufacturingScreen />;
}

// =============================================================================
// Export as default
// =============================================================================

export default UnifiedCMCManufacturingScreen;
