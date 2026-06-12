

import { useMemo } from 'react';
import { 
  FileText, Activity, Factory, ShieldAlert, Stethoscope, 
  LayoutDashboard, Send, MessageSquare, Book, Tag, Calendar,
  Folder, Database, Truck, BookOpen, Building2, ChevronRight,
  AlertTriangle, CheckCircle, Clock, TrendingUp, Microscope,
  FlaskConical, Pill, ClipboardList, FileSearch, Zap
} from 'lucide-react';
import type { ModuleId } from '@/types/core';

// Module metadata - icons, colors, labels
const MODULE_META: Record<string, { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
  description: string;
}> = {
  'submissions-hub': { 
    icon: <Send className="w-5 h-5" />, 
    color: '#3B82F6', 
    label: 'Submissions Hub',
    description: 'Manage regulatory submissions across regions'
  },
  'haq': { 
    icon: <MessageSquare className="w-5 h-5" />, 
    color: '#8B5CF6', 
    label: 'HAQ Intelligence',
    description: 'Health Authority questions & responses'
  },
  'publishing': { 
    icon: <Book className="w-5 h-5" />, 
    color: '#06B6D4', 
    label: 'Publishing',
    description: 'eCTD compilation & gateway submission'
  },
  'authoring': { 
    icon: <FileText className="w-5 h-5" />, 
    color: '#10B981', 
    label: 'Document Authoring',
    description: 'AI-assisted regulatory document creation'
  },
  'labeling': { 
    icon: <Tag className="w-5 h-5" />, 
    color: '#F59E0B', 
    label: 'Labeling',
    description: 'Product labeling & artwork management'
  },
  'strategy': { 
    icon: <TrendingUp className="w-5 h-5" />, 
    color: '#EC4899', 
    label: 'Reg Strategy',
    description: 'Regulatory strategy & planning'
  },
  'master-data': { 
    icon: <Database className="w-5 h-5" />, 
    color: '#64748B', 
    label: 'Master Data',
    description: 'Products, substances, organizations'
  },
  'reg-calendar': { 
    icon: <Calendar className="w-5 h-5" />, 
    color: '#EF4444', 
    label: 'Reg Calendar',
    description: 'Submission deadlines & milestones'
  },
  'ctms': { 
    icon: <ClipboardList className="w-5 h-5" />, 
    color: '#10B981', 
    label: 'Clinical Trials',
    description: 'Trial management & site operations'
  },
  'tmf': { 
    icon: <Folder className="w-5 h-5" />, 
    color: '#6366F1', 
    label: 'Trial Master File',
    description: 'Essential documents & inspection readiness'
  },
  'safety': { 
    icon: <ShieldAlert className="w-5 h-5" />, 
    color: '#EF4444', 
    label: 'Safety & PV',
    description: 'Signal detection & case management'
  },
  'study-intel': { 
    icon: <FileSearch className="w-5 h-5" />, 
    color: '#0EA5E9', 
    label: 'Study Intelligence',
    description: 'Protocol analysis & competitive intel'
  },
  'cmc-manufacturing': { 
    icon: <Factory className="w-5 h-5" />, 
    color: '#F59E0B', 
    label: 'CMC & Manufacturing',
    description: 'Drug substance, product & manufacturing'
  },
  'quality': { 
    icon: <CheckCircle className="w-5 h-5" />, 
    color: '#10B981', 
    label: 'Quality',
    description: 'Quality assurance & control'
  },
  'qms': { 
    icon: <ClipboardList className="w-5 h-5" />, 
    color: '#8B5CF6', 
    label: 'Quality Management',
    description: 'Deviations, CAPAs & change control'
  },
  'supply-chain': { 
    icon: <Truck className="w-5 h-5" />, 
    color: '#F97316', 
    label: 'Supply Chain',
    description: 'Manufacturing sites & distribution'
  },
  'medical-affairs': { 
    icon: <Stethoscope className="w-5 h-5" />, 
    color: '#8B5CF6', 
    label: 'Medical Affairs',
    description: 'MSL activities & medical communications'
  },
  'publications': { 
    icon: <BookOpen className="w-5 h-5" />, 
    color: '#06B6D4', 
    label: 'Publications',
    description: 'Scientific publications & congress planning'
  },
  'portfolio': { 
    icon: <LayoutDashboard className="w-5 h-5" />, 
    color: '#3B82F6', 
    label: 'Portfolio',
    description: 'Cross-program visibility & metrics'
  },
  'activity': { 
    icon: <Activity className="w-5 h-5" />, 
    color: '#10B981', 
    label: 'Activity',
    description: 'Platform-wide activity feed'
  },
  'analytics': { 
    icon: <TrendingUp className="w-5 h-5" />, 
    color: '#6366F1', 
    label: 'Analytics',
    description: 'Operational metrics & insights'
  },
  'research': { 
    icon: <Microscope className="w-5 h-5" />, 
    color: '#8B5CF6', 
    label: 'Research',
    description: 'Discovery & early development'
  },
  'development': { 
    icon: <FlaskConical className="w-5 h-5" />, 
    color: '#10B981', 
    label: 'Development',
    description: 'Clinical development programs'
  },
  'nonclinical': { 
    icon: <Pill className="w-5 h-5" />, 
    color: '#EC4899', 
    label: 'Nonclinical',
    description: 'Toxicology & pharmacology studies'
  },
  'commercial': { 
    icon: <Building2 className="w-5 h-5" />, 
    color: '#0EA5E9', 
    label: 'Commercial',
    description: 'Market access & commercial ops'
  },
};

// Stat badge configuration
interface StatBadge {
  value: number;
  label: string;
  type: 'alert' | 'warning' | 'info' | 'success';
}

interface ModuleQuickAccessCardProps {
  moduleId: ModuleId;
  onClick?: () => void;
  compact?: boolean;
  showMetrics?: boolean;
  stats?: StatBadge[];
  /** Quick action buttons */
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

export function ModuleQuickAccessCard({ 
  moduleId, 
  onClick,
  compact = false,
  showMetrics = false,
  stats = [],
  actions = []
}: ModuleQuickAccessCardProps) {
  const meta = MODULE_META[moduleId] || {
    icon: <Folder className="w-5 h-5" />,
    color: '#64748B',
    label: moduleId,
    description: 'Module'
  };
  
  // Badge type styles
  const badgeStyles = {
    alert: 'bg-red-500/10 text-red-500 border-red-500/30',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    success: 'bg-green-500/10 text-green-500 border-green-500/30',
  };
  
  if (compact) {
    // Compact version - smaller card for secondary modules
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-card hover:bg-surface-elevated hover:border-border-focus transition-all group text-left"
      >
        <div 
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: `${meta?.color ?? ''}15` }}
        >
          <span style={{ color: meta.color }}>{meta.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-text-primary truncate">
            {meta.label}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }
  
  // Full version - larger card with stats and actions
  return (
    <button
      onClick={onClick}
      className="flex flex-col p-5 rounded-xl border border-border bg-surface-card hover:bg-surface-elevated hover:border-border-focus transition-all group text-left h-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div 
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${meta?.color ?? ''}15` }}
        >
          <span style={{ color: meta.color }}>{meta.icon}</span>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
      </div>
      
      {/* Title & Description */}
      <div className="mb-3">
        <h3 className="font-semibold text-text-primary mb-1">{meta.label}</h3>
        <p className="text-xs text-text-muted line-clamp-2">{meta.description}</p>
      </div>
      
      {/* Stats Badges */}
      {showMetrics && stats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {stats.map((stat, idx) => (
            <span 
              key={idx}
              className={`text-xs px-2 py-1 rounded-lg border ${badgeStyles[stat.type]}`}
            >
              {stat.value} {stat.label}
            </span>
          ))}
        </div>
      )}
      
      {/* Spacer to push actions to bottom */}
      <div className="flex-1" />
      
      {/* Quick Actions */}
      {actions.length > 0 && (
        <div className="flex gap-2 pt-3 border-t border-border/50">
          {actions.slice(0, 2).map((action, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-accent-blue/10 hover:text-accent-blue text-text-muted transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </button>
  );
}

// Export metadata for use elsewhere
export { MODULE_META };
