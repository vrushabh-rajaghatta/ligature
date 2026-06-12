
// ============================================================================
// PortfolioStrategyView - v0.33.0
// Cross-product regulatory timeline and milestone planning
// ============================================================================


import React, { useState, useMemo, useRef } from 'react';
import {
  Briefcase, Calendar, Target, Flag, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, AlertCircle, Rocket,
  FileText, Users, Filter, Download, Plus, ZoomIn, ZoomOut,
  ArrowRight, Building2, Globe, XCircle
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PortfolioMilestone } from '@/types/core';
import { useDeadClick } from '@/hooks/useDeadClick';
import {
  portfolioMilestones,
  productNames,
  productColors,
  getMilestonesByProduct,
} from '@/data/regulatory-data';

// ============================================================================
// TYPES
// ============================================================================

type TimeScale = 'month' | 'quarter' | 'year';
type FilterProduct = 'all' | string;
type FilterType = 'all' | 'submission' | 'approval' | 'launch' | 'commitment' | 'review-meeting';

// ============================================================================
// CONSTANTS
// ============================================================================

const MILESTONE_CONFIG = {
  submission: { 
    icon: FileText, 
    color: 'bg-blue-500', 
    textColor: 'text-blue-400',
    label: 'Submission'
  },
  approval: { 
    icon: CheckCircle2, 
    color: 'bg-green-500', 
    textColor: 'text-green-400',
    label: 'Approval'
  },
  launch: { 
    icon: Rocket, 
    color: 'bg-purple-500', 
    textColor: 'text-purple-400',
    label: 'Launch'
  },
  commitment: { 
    icon: Flag, 
    color: 'bg-amber-500', 
    textColor: 'text-amber-400',
    label: 'Commitment'
  },
  'review-meeting': { 
    icon: Users, 
    color: 'bg-cyan-500', 
    textColor: 'text-cyan-400',
    label: 'Meeting'
  },
  other: { 
    icon: Target, 
    color: 'bg-slate-500', 
    textColor: 'text-slate-400',
    label: 'Other'
  },
};

const STATUS_CONFIG = {
  planned: { color: 'border-slate-500', bg: 'bg-slate-500/20', label: 'Planned' },
  'on-track': { color: 'border-green-500', bg: 'bg-green-500/20', label: 'On Track' },
  'at-risk': { color: 'border-amber-500', bg: 'bg-amber-500/20', label: 'At Risk' },
  delayed: { color: 'border-red-500', bg: 'bg-red-500/20', label: 'Delayed' },
  complete: { color: 'border-emerald-500', bg: 'bg-emerald-500/20', label: 'Complete' },
};

const PRODUCTS = Object.keys(productNames);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMonthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

function getQuartersBetween(start: Date, end: Date): { label: string; start: Date; end: Date }[] {
  const quarters: { label: string; start: Date; end: Date }[] = [];
  const current = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
  
  while (current <= end) {
    const qNum = Math.floor(current.getMonth() / 3) + 1;
    const qStart = new Date(current);
    const qEnd = new Date(current.getFullYear(), current.getMonth() + 3, 0);
    
    quarters.push({
      label: `Q${qNum} ${current.getFullYear()}`,
      start: qStart,
      end: qEnd,
    });
    
    current.setMonth(current.getMonth() + 3);
  }
  
  return quarters;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MilestoneMarker({ 
  milestone,
  onClick,
}: { 
  milestone: PortfolioMilestone;
  onClick?: () => void;
}) {
  const typeConfig = MILESTONE_CONFIG[milestone.type] || MILESTONE_CONFIG.other;
  const statusConfig = STATUS_CONFIG[milestone.status];
  const Icon = typeConfig.icon;
  
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-1 px-2 py-1 rounded-full border-2 ${statusConfig?.color ?? ''} ${statusConfig?.bg ?? ''} hover:scale-105 transition-transform cursor-pointer`}
      title={milestone.title}
    >
      <div className={`w-5 h-5 rounded-full ${typeConfig?.color ?? ''} flex items-center justify-center`}>
        <Icon className="w-3 h-3 text-white" />
      </div>
      <span className="text-xs font-medium text-text-primary max-w-[100px] truncate">
        {milestone.region || milestone.title.split(' ')[0]}
      </span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap">
        <p className="text-sm font-medium text-text-primary">{milestone.title}</p>
        <p className="text-xs text-text-muted">{new Date(milestone.date).toLocaleDateString()}</p>
        {milestone.notes && (
          <p className="text-xs text-text-muted mt-1 max-w-[200px] whitespace-normal">{milestone.notes}</p>
        )}
      </div>
    </button>
  );
}

function TimelineRow({ 
  productId,
  milestones,
  months,
  timelineStart,
  monthWidth,
  onMilestoneClick,
}: { 
  productId: string;
  milestones: PortfolioMilestone[];
  months: Date[];
  timelineStart: Date;
  monthWidth: number;
  onMilestoneClick: (m: PortfolioMilestone) => void;
}) {
  const productName = productNames[productId];
  const color = productColors[productId] || 'blue';
  
  return (
    <div className="flex border-b border-border">
      {/* Product Label */}
      <div className="w-48 flex-shrink-0 p-3 border-r border-border bg-surface sticky left-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-${color}-400`} />
          <span className="font-medium text-text-primary text-sm truncate">{productName}</span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          {milestones.length} milestones
        </p>
      </div>
      
      {/* Timeline */}
      <div className="flex-1 relative h-16" style={{ minWidth: months.length * monthWidth }}>
        {/* Milestone markers */}
        {milestones.map(milestone => {
          const milestoneDate = new Date(milestone.date);
          const monthsDiff = (milestoneDate.getFullYear() - timelineStart.getFullYear()) * 12 
            + (milestoneDate.getMonth() - timelineStart.getMonth());
          const dayOffset = milestoneDate.getDate() / 30;
          const left = (monthsDiff + dayOffset) * monthWidth;
          
          return (
            <div 
              key={milestone.id}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${left}px` }}
            >
              <MilestoneMarker 
                milestone={milestone} 
                onClick={() => onMilestoneClick(milestone)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryStats() {
    const { deadClick } = useDeadClick();
  const stats = useMemo(() => {
    const total = portfolioMilestones.length;
    const onTrack = portfolioMilestones.filter(m => m.status === 'on-track').length;
    const atRisk = portfolioMilestones.filter(m => m.status === 'at-risk').length;
    const delayed = portfolioMilestones.filter(m => m.status === 'delayed').length;
    const complete = portfolioMilestones.filter(m => m.status === 'complete').length;
    
    // Count upcoming in next 90 days
    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const upcoming = portfolioMilestones.filter(m => {
      const d = new Date(m.date);
      return d >= now && d <= ninetyDays && m.status !== 'complete';
    }).length;
    
    return { total, onTrack, atRisk, delayed, complete, upcoming };
  }, []);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
      <div className="bg-surface-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-muted">Total</span>
        </div>
        <p className="text-xl font-semibold text-text-primary">{stats.total}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-text-muted">Next 90 Days</span>
        </div>
        <p className="text-xl font-semibold text-blue-400">{stats.upcoming}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs text-text-muted">On Track</span>
        </div>
        <p className="text-xl font-semibold text-green-400">{stats.onTrack}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-text-muted">At Risk</span>
        </div>
        <p className="text-xl font-semibold text-amber-400">{stats.atRisk}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-text-muted">Delayed</span>
        </div>
        <p className="text-xl font-semibold text-red-400">{stats.delayed}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-text-muted">Complete</span>
        </div>
        <p className="text-xl font-semibold text-emerald-400">{stats.complete}</p>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-surface-card border border-border rounded-lg mb-4">
      <span className="text-xs text-text-muted font-medium">Milestone Types:</span>
      {Object.entries(MILESTONE_CONFIG).map(([type, config]) => {
        const Icon = config.icon;
        return (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full ${config?.color ?? ''} flex items-center justify-center`}>
              <Icon className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs text-text-muted">{config.label}</span>
          </div>
        );
      })}
      
      <div className="w-px h-4 bg-border mx-2" />
      
      <span className="text-xs text-text-muted font-medium">Status:</span>
      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
        <div key={status} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-full border-2 ${config?.color ?? ''}`} />
          <span className="text-xs text-text-muted">{config.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PortfolioStrategyView() {
  const { deadClick } = useDeadClick();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('month');
  const [productFilter, setProductFilter] = useState<FilterProduct>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [selectedMilestone, setSelectedMilestone] = useState<PortfolioMilestone | null>(null);
  const [monthWidth, setMonthWidth] = useState(80);
  
  // Calculate timeline range (1 year back to 2 years forward)
  const timelineRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const end = new Date(now.getFullYear() + 2, now.getMonth(), 1);
    return { start, end };
  }, []);
  
  const months = useMemo(() => {
    return getMonthsBetween(timelineRange.start, timelineRange.end);
  }, [timelineRange]);
  
  // Filter milestones
  const filteredMilestones = useMemo(() => {
    return portfolioMilestones.filter(m => {
      if (productFilter !== 'all' && m.productId !== productFilter) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      return true;
    });
  }, [productFilter, typeFilter]);
  
  // Group by product
  const milestonesByProduct = useMemo(() => {
    const groups: Record<string, PortfolioMilestone[]> = {};
    
    const productsToShow = productFilter === 'all' ? PRODUCTS : [productFilter];
    
    productsToShow.forEach(productId => {
      groups[productId] = filteredMilestones.filter(m => m.productId === productId);
    });
    
    return groups;
  }, [filteredMilestones, productFilter]);
  
  // Scroll to today
  const scrollToToday = () => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const monthsDiff = (now.getFullYear() - timelineRange.start.getFullYear()) * 12 
        + (now.getMonth() - timelineRange.start.getMonth());
      const scrollPos = monthsDiff * monthWidth - scrollContainerRef.current.clientWidth / 2;
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPos);
    }
  };
  
  // Scroll to today on mount
  React.useEffect(() => {
    scrollToToday();
  }, []);
  
  return (
    <div className="h-full flex flex-col bg-surface">
      <ScreenHeader
        title="Portfolio Strategy"
        subtitle="Cross-product regulatory timeline visualization and strategic milestone tracking"
        icon={<Briefcase className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={scrollToToday} className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg hover:bg-surface flex items-center gap-2">
              <Calendar className="w-4 h-4" />Today
            </button>
            <button className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg hover:bg-surface flex items-center gap-2" onClick={() => toast.info('Portfolio strategy action — configure in portfolio settings')}>
              <Download className="w-4 h-4" />Export
            </button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-surface-elevated border-b border-border px-6 py-3 flex items-center gap-3 flex-wrap flex-shrink-0">
        <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />

        {/* Product filter */}
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Products</option>
          {PRODUCTS.map(pid => (
            <option key={pid} value={pid}>{productNames[pid]}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FilterType)}
          className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Types</option>
          <option value="submission">Submissions</option>
          <option value="approval">Approvals</option>
          <option value="launch">Launches</option>
          <option value="commitment">Commitments</option>
          <option value="review-meeting">Review Meetings</option>
        </select>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-text-muted mr-1">Zoom</span>
          <button
            onClick={() => setMonthWidth(w => Math.max(40, w - 20))}
            className="p-1.5 bg-surface-card border border-border rounded-lg hover:bg-surface transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-text-muted" />
          </button>
          <button
            onClick={() => setMonthWidth(w => Math.min(160, w + 20))}
            className="p-1.5 bg-surface-card border border-border rounded-lg hover:bg-surface transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden p-6 flex gap-6">
        {/* Main timeline column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
        <SummaryStats />
        <Legend />
        
        {/* Timeline */}
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="flex border-b border-border sticky top-0 z-20 bg-surface-elevated">
            <div className="w-48 flex-shrink-0 p-3 border-r border-border font-medium text-text-primary text-sm">
              Product
            </div>
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto"
            >
              <div className="flex" style={{ minWidth: months.length * monthWidth }}>
                {months.map((month, idx) => {
                  const isCurrentMonth = month.getMonth() === new Date().getMonth() 
                    && month.getFullYear() === new Date().getFullYear();
                  
                  return (
                    <div 
                      key={idx}
                      className={`flex-shrink-0 p-2 border-r border-border text-center ${
                        isCurrentMonth ? 'bg-accent-blue/10' : ''
                      }`}
                      style={{ width: monthWidth }}
                    >
                      <p className={`text-xs font-medium ${isCurrentMonth ? 'text-accent-blue' : 'text-text-primary'}`}>
                        {month.toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {month.getFullYear()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Product Rows */}
          <div className="overflow-y-auto max-h-[400px]">
            {Object.entries(milestonesByProduct).map(([productId, milestones]) => (
              <TimelineRow
                key={productId}
                productId={productId}
                milestones={milestones}
                months={months}
                timelineStart={timelineRange.start}
                monthWidth={monthWidth}
                onMilestoneClick={setSelectedMilestone}
              />
            ))}
          </div>
          
          {/* Today Indicator Line - would need sync with scroll */}
        </div>
        </div>{/* end main timeline column */}

        {/* Upcoming Milestones Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* At-Risk / Delayed alerts */}
          {(() => {
            const atRisk = portfolioMilestones.filter(m => m.status === 'at-risk' || m.status === 'delayed');
            if (atRisk.length === 0) return null;
            return (
              <div className="bg-red-500/10 rounded-xl border border-red-500/30 p-4">
                <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Needs Attention ({atRisk.length})
                </h3>
                <div className="space-y-2">
                  {atRisk.slice(0, 4).map(m => {
                    const config = MILESTONE_CONFIG[m.type] || MILESTONE_CONFIG.other;
                    const Icon = config.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMilestone(m)}
                        className="w-full text-left bg-surface-card border border-border rounded-lg p-3 hover:border-red-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-5 h-5 rounded-full ${config?.color ?? ''} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-medium text-text-primary truncate">{m.title}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className={m.status === 'delayed' ? 'text-red-400 font-medium' : 'text-amber-400 font-medium'}>
                            {m.status === 'delayed' ? 'Delayed' : 'At Risk'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Upcoming 90 days */}
          <div className="bg-surface-elevated rounded-xl border border-border flex-1">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-text-primary">Next 90 Days</h3>
            </div>
            <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
              {(() => {
                const now = new Date();
                const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
                const upcoming = portfolioMilestones
                  .filter(m => {
                    const d = new Date(m.date);
                    return d >= now && d <= ninetyDays && m.status !== 'complete';
                  })
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (upcoming.length === 0) {
                  return <p className="text-center text-text-muted text-xs py-8">No milestones in next 90 days</p>;
                }

                return upcoming.map(m => {
                  const config = MILESTONE_CONFIG[m.type] || MILESTONE_CONFIG.other;
                  const statusConfig = STATUS_CONFIG[m.status];
                  const Icon = config.icon;
                  const daysUntil = Math.ceil((new Date(m.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMilestone(m)}
                      className="w-full text-left px-4 py-3 hover:bg-surface-card transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${config?.color ?? ''} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{m.title}</p>
                          <p className="text-xs text-text-muted mt-0.5">{productNames[m.productId]}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-text-muted">
                              {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className={`text-xs font-medium ${
                              daysUntil <= 14 ? 'text-amber-400' : 'text-text-muted'
                            }`}>
                              {daysUntil}d
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>{/* end flex gap-6 */}
      {/* Milestone Details Drawer */}
      {selectedMilestone && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedMilestone(null)}>
          <div 
            className="w-full max-w-md bg-surface-elevated h-full overflow-auto border-l border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Milestone Details</h2>
                <button 
                  onClick={() => setSelectedMilestone(null)}
                  className="p-1 hover:bg-surface-card rounded"
                >
                  <XCircle className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                {(() => {
                  const config = MILESTONE_CONFIG[selectedMilestone.type] || MILESTONE_CONFIG.other;
                  const Icon = config.icon;
                  return (
                    <div className={`p-2 ${config?.color ?? ''} rounded-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-medium text-text-primary">{selectedMilestone.title}</h3>
                  <p className="text-sm text-text-muted">{productNames[selectedMilestone.productId]}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Type</label>
                  <p className={`mt-1 font-medium ${MILESTONE_CONFIG[selectedMilestone.type]?.textColor || 'text-text-primary'}`}>
                    {MILESTONE_CONFIG[selectedMilestone.type]?.label || selectedMilestone.type}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Status</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 ${STATUS_CONFIG[selectedMilestone.status]?.color}`} />
                    <span className="text-text-primary capitalize">{selectedMilestone.status.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wide">Target Date</label>
                <p className="mt-1 text-text-primary text-lg">
                  {new Date(selectedMilestone.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              {selectedMilestone.region && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Region</label>
                  <p className="mt-1 text-text-primary flex items-center gap-2">
                    <Globe className="w-4 h-4 text-text-muted" />
                    {selectedMilestone.region}
                  </p>
                </div>
              )}
              
              {selectedMilestone.notes && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Notes</label>
                  <p className="mt-1 text-text-secondary text-sm">{selectedMilestone.notes}</p>
                </div>
              )}
              
              {selectedMilestone.dependencies && selectedMilestone.dependencies.length > 0 && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Dependencies</label>
                  <div className="mt-2 space-y-2">
                    {selectedMilestone.dependencies.map(depId => {
                      const dep = portfolioMilestones.find(m => m.id === depId);
                      if (!dep) return null;
                      return (
                        <div key={depId} className="flex items-center gap-2 text-sm text-text-secondary">
                          <ArrowRight className="w-4 h-4 text-text-muted" />
                          {dep.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-border space-y-2">
                <button className="w-full px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center justify-center gap-2" onClick={() => toast.info('Portfolio strategy action — configure in portfolio settings')}>
                  Edit Milestone
                </button>
                {selectedMilestone.submissionId && (
                  <button className="w-full px-4 py-2 text-sm bg-surface-card border border-border rounded-lg hover:bg-surface flex items-center justify-center gap-2" onClick={() => toast.info('Portfolio strategy action — configure in portfolio settings')}>
                    <FileText className="w-4 h-4" />
                    View Submission
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortfolioStrategyView;
