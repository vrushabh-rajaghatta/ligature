

import { useState } from 'react';
import {
  X,
  GripVertical,
  Plus,
  Settings,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  TrendingUp,
  Zap,
  Bell,
  Target,
  Activity
} from 'lucide-react';

export type WidgetType = 
  | 'pipeline-summary'
  | 'upcoming-milestones'
  | 'alerts'
  | 'team-workload'
  | 'haq-summary'
  | 'submission-calendar'
  | 'metrics'
  | 'recent-activity'
  | 'intel-feed'
  | 'approvals-pending';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'small' | 'medium' | 'large';
  position: number;
}

interface WidgetConfig {
  type: WidgetType;
  title: string;
  description: string;
  icon: React.ReactNode;
  defaultSize: Widget['size'];
}

const widgetConfigs: WidgetConfig[] = [
  { type: 'pipeline-summary', title: 'Pipeline Summary', description: 'Programs by phase', icon: <BarChart3 className="w-5 h-5" />, defaultSize: 'medium' },
  { type: 'upcoming-milestones', title: 'Upcoming Milestones', description: 'Next critical dates', icon: <Calendar className="w-5 h-5" />, defaultSize: 'medium' },
  { type: 'alerts', title: 'Executive Alerts', description: 'Critical notifications', icon: <AlertTriangle className="w-5 h-5" />, defaultSize: 'small' },
  { type: 'team-workload', title: 'Team Workload', description: 'Resource utilization', icon: <Users className="w-5 h-5" />, defaultSize: 'medium' },
  { type: 'haq-summary', title: 'HAQ Summary', description: 'Questions overview', icon: <FileText className="w-5 h-5" />, defaultSize: 'small' },
  { type: 'submission-calendar', title: 'Submission Calendar', description: 'Timeline view', icon: <Calendar className="w-5 h-5" />, defaultSize: 'large' },
  { type: 'metrics', title: 'Performance Metrics', description: 'KPIs and trends', icon: <TrendingUp className="w-5 h-5" />, defaultSize: 'medium' },
  { type: 'recent-activity', title: 'Recent Activity', description: 'Latest updates', icon: <Activity className="w-5 h-5" />, defaultSize: 'medium' },
  { type: 'intel-feed', title: 'Reg Intel Feed', description: 'Latest intelligence', icon: <Zap className="w-5 h-5" />, defaultSize: 'medium' },
  { type: 'approvals-pending', title: 'Pending Approvals', description: 'Awaiting your action', icon: <CheckCircle className="w-5 h-5" />, defaultSize: 'small' },
];

const defaultWidgets: Widget[] = [
  { id: 'w1', type: 'pipeline-summary', title: 'Pipeline Summary', size: 'medium', position: 0 },
  { id: 'w2', type: 'upcoming-milestones', title: 'Upcoming Milestones', size: 'medium', position: 1 },
  { id: 'w3', type: 'alerts', title: 'Executive Alerts', size: 'small', position: 2 },
  { id: 'w4', type: 'metrics', title: 'Performance Metrics', size: 'medium', position: 3 },
  { id: 'w5', type: 'recent-activity', title: 'Recent Activity', size: 'large', position: 4 },
];

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: Widget[];
  onWidgetsChange: (widgets: Widget[]) => void;
}

export function DashboardCustomizer({ isOpen, onClose, widgets, onWidgetsChange }: DashboardCustomizerProps) {
  const [localWidgets, setLocalWidgets] = useState<Widget[]>(widgets);

  if (!isOpen) return null;

  const addWidget = (type: WidgetType) => {
    const config = widgetConfigs.find(c => c.type === type);
    if (!config) return;
    
    const newWidget: Widget = {
      id: `w${Date.now()}`,
      type,
      title: config.title,
      size: config.defaultSize,
      position: localWidgets.length,
    };
    setLocalWidgets([...localWidgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    setLocalWidgets(localWidgets.filter(w => w.id !== id));
  };

  const updateWidgetSize = (id: string, size: Widget['size']) => {
    setLocalWidgets(localWidgets.map(w => w.id === id ? { ...w, size } : w));
  };

  const handleSave = () => {
    onWidgetsChange(localWidgets);
    onClose();
  };

  const availableWidgets = widgetConfigs.filter(
    config => !localWidgets.some(w => w.type === config.type)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface w-full max-w-3xl max-h-[80vh] rounded-xl shadow-xl flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Customize Dashboard</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Current Widgets */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Your Widgets</h3>
              <div className="space-y-2">
                {localWidgets.map(widget => {
                  const config = widgetConfigs.find(c => c.type === widget.type);
                  return (
                    <div 
                      key={widget.id}
                      className="bg-surface-card rounded-lg p-3 flex items-center gap-3"
                    >
                      <GripVertical className="w-4 h-4 text-text-muted cursor-grab" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{widget.title}</div>
                        <select
                          value={widget.size}
                          onChange={(e) => updateWidgetSize(widget.id, e.target.value as Widget['size'])}
                          className="text-xs text-text-muted bg-transparent border-none focus:outline-none cursor-pointer"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => removeWidget(widget.id)}
                        className="p-1 hover:bg-surface-elevated rounded text-text-muted hover:text-accent-red"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {localWidgets.length === 0 && (
                  <div className="text-sm text-text-muted text-center py-8">
                    No widgets added yet
                  </div>
                )}
              </div>
            </div>

            {/* Available Widgets */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Add Widgets</h3>
              <div className="space-y-2">
                {availableWidgets.map(config => (
                  <button
                    key={config.type}
                    onClick={() => addWidget(config.type)}
                    className="w-full bg-surface-elevated rounded-lg p-3 flex items-center gap-3 hover:bg-surface-card transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center text-accent-blue">
                      {config.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{config.title}</div>
                      <div className="text-xs text-text-muted">{config.description}</div>
                    </div>
                    <Plus className="w-4 h-4 text-accent-blue" />
                  </button>
                ))}
                {availableWidgets.length === 0 && (
                  <div className="text-sm text-text-muted text-center py-8">
                    All widgets added
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
          <button
            onClick={() => setLocalWidgets(defaultWidgets)}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Reset to Default
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Widget renderer component
interface WidgetRendererProps {
  widget: Widget;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-2',
    large: 'col-span-3',
  };

  const renderContent = () => {
    switch (widget.type) {
      case 'pipeline-summary':
        return (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Preclinical', count: 2, color: 'text-indigo-500' },
              { label: 'Clinical', count: 3, color: 'text-accent-teal' },
              { label: 'Filed', count: 2, color: 'text-accent-amber' },
              { label: 'Approved', count: 1, color: 'text-accent-green' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className={`text-2xl font-bold ${item?.color ?? ''}`}>{item.count}</div>
                <div className="text-xs text-text-muted">{item.label}</div>
              </div>
            ))}
          </div>
        );
      
      case 'upcoming-milestones':
        return (
          <div className="space-y-2">
            {[
              { event: 'Advisory Committee', days: 33, product: 'LIG-2847' },
              { event: 'PDUFA Date', days: 64, product: 'LIG-2847' },
              { event: 'CHMP Opinion', days: 92, product: 'LIG-5567' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-surface-card rounded">
                <div>
                  <div className="text-sm text-text-primary">{item.event}</div>
                  <div className="text-xs text-text-muted">{item.product}</div>
                </div>
                <div className={`text-sm font-bold ${item.days <= 30 ? 'text-accent-red' : item.days <= 60 ? 'text-accent-amber' : 'text-text-primary'}`}>
                  {item.days}d
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'alerts':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-accent-red/10 rounded text-accent-red">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">PMDA response overdue</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-accent-amber/10 rounded text-accent-amber">
              <Clock className="w-4 h-4" />
              <span className="text-xs">2 HAQs due this week</span>
            </div>
          </div>
        );
      
      case 'team-workload':
        return (
          <div className="space-y-2">
            {[
              { name: 'Regulatory', load: 85 },
              { name: 'Med Writing', load: 95 },
              { name: 'CMC', load: 70 },
            ].map(item => (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">{item.name}</span>
                  <span className={item.load >= 90 ? 'text-accent-red' : item.load >= 70 ? 'text-accent-amber' : 'text-accent-green'}>
                    {item.load}%
                  </span>
                </div>
                <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.load >= 90 ? 'bg-accent-red' : item.load >= 70 ? 'bg-accent-amber' : 'bg-accent-green'}`}
                    style={{ width: `${item.load}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 'haq-summary':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-surface-card rounded">
              <div className="text-xl font-bold text-accent-amber">4</div>
              <div className="text-xs text-text-muted">Active</div>
            </div>
            <div className="text-center p-2 bg-surface-card rounded">
              <div className="text-xl font-bold text-accent-red">1</div>
              <div className="text-xs text-text-muted">Overdue</div>
            </div>
          </div>
        );

      case 'metrics':
        return (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Approval Cycle', value: '11.2mo', trend: '-8%' },
              { label: 'First-Cycle', value: '85%', trend: '+5%' },
              { label: 'HAQ Response', value: '4.2d', trend: '-15%' },
              { label: 'Doc Cycle', value: '18d', trend: '-12%' },
            ].map(item => (
              <div key={item.label} className="p-2 bg-surface-card rounded">
                <div className="text-lg font-bold text-text-primary">{item.value}</div>
                <div className="text-xs text-text-muted">{item.label}</div>
                <div className="text-xs text-accent-green">{item.trend}</div>
              </div>
            ))}
          </div>
        );

      case 'recent-activity':
        return (
          <div className="space-y-2">
            {[
              { action: 'Clinical Overview approved', time: '2h ago', icon: <CheckCircle className="w-3 h-3 text-accent-green" /> },
              { action: 'HAQ response submitted', time: '4h ago', icon: <FileText className="w-3 h-3 text-accent-blue" /> },
              { action: 'IND amendment accepted', time: '1d ago', icon: <CheckCircle className="w-3 h-3 text-accent-green" /> },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-surface-card rounded">
                {item.icon}
                <span className="text-xs text-text-primary flex-1">{item.action}</span>
                <span className="text-xs text-text-muted">{item.time}</span>
              </div>
            ))}
          </div>
        );

      case 'intel-feed':
        return (
          <div className="space-y-2">
            <div className="p-2 bg-accent-red/10 border border-accent-red/30 rounded">
              <div className="text-xs font-medium text-accent-red">Critical</div>
              <div className="text-xs text-text-primary">FDA KRAS G12C Guidance</div>
            </div>
            <div className="p-2 bg-accent-amber/10 border border-accent-amber/30 rounded">
              <div className="text-xs font-medium text-accent-amber">High</div>
              <div className="text-xs text-text-primary">Competitor sNDA Filed</div>
            </div>
          </div>
        );

      case 'approvals-pending':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-surface-card rounded">
              <span className="text-xs text-text-primary">Module 2.5 v2.3</span>
              <button className="text-xs text-accent-blue">Review</button>
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-card rounded">
              <span className="text-xs text-text-primary">3.2.P v2.8</span>
              <button className="text-xs text-accent-blue">Review</button>
            </div>
          </div>
        );

      default:
        return <div className="text-sm text-text-muted">Widget content</div>;
    }
  };

  return (
    <div className={`bg-surface-elevated rounded-lg p-4 ${sizeClasses[widget.size]}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{widget.title}</h3>
        <button className="p-1 hover:bg-surface-card rounded text-text-muted">
          <Settings className="w-3 h-3" />
        </button>
      </div>
      {renderContent()}
    </div>
  );
}

export { defaultWidgets };
