
/**
 * EmptyState - v128
 * 
 * Enhanced empty states with module-specific pharma/regulatory types.
 * Provides consistent empty state messaging across all modules.
 */

import { ReactNode, ComponentType } from 'react';
import { 
  FileText, Inbox, Search, Filter, AlertCircle, 
  FolderOpen, MessageSquare, Bell, Calendar, Users, CheckCircle,
  LucideProps, Beaker, FlaskConical, FileCheck, Shield, Activity,
  ClipboardList, Send, Database, Microscope, Package, AlertTriangle,
  Clock, Building2, Pill
} from 'lucide-react';
import { Button } from './Button';

// Common empty state types - expanded for pharma/regulatory context
export type EmptyStateType = 
  // Generic types
  | 'no-data' 
  | 'no-results' 
  | 'no-search-results' 
  | 'no-filters' 
  | 'error'
  | 'success'
  | 'empty-folder'
  | 'no-messages'
  | 'no-notifications'
  | 'no-events'
  | 'no-members'
  // v128: Pharma/regulatory specific types
  | 'no-programs'
  | 'no-documents'
  | 'no-submissions'
  | 'no-haqs'
  | 'no-safety-cases'
  | 'no-studies'
  | 'no-sequences'
  | 'no-deviations'
  | 'no-artifacts'
  | 'no-milestones'
  | 'no-activity'
  | 'offline'
  | 'access-denied'
  | 'coming-soon';

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: ReactNode | ComponentType<LucideProps>;
  title?: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const typeConfig: Record<EmptyStateType, { icon: ReactNode; title: string; description: string }> = {
  'no-data': {
    icon: <Inbox className="w-full h-full" />,
    title: 'No data yet',
    description: 'Get started by adding your first item.',
  },
  'no-results': {
    icon: <FileText className="w-full h-full" />,
    title: 'No results found',
    description: 'Try adjusting your filters or search terms.',
  },
  'no-search-results': {
    icon: <Search className="w-full h-full" />,
    title: 'No search results',
    description: 'We couldn\'t find anything matching your search.',
  },
  'no-filters': {
    icon: <Filter className="w-full h-full" />,
    title: 'No matches',
    description: 'No items match the current filters.',
  },
  'error': {
    icon: <AlertCircle className="w-full h-full" />,
    title: 'Something went wrong',
    description: 'We encountered an error loading this content.',
  },
  'success': {
    icon: <CheckCircle className="w-full h-full" />,
    title: 'All done!',
    description: 'Everything is up to date.',
  },
  'empty-folder': {
    icon: <FolderOpen className="w-full h-full" />,
    title: 'This folder is empty',
    description: 'Upload or create files to get started.',
  },
  'no-messages': {
    icon: <MessageSquare className="w-full h-full" />,
    title: 'No messages',
    description: 'You\'re all caught up!',
  },
  'no-notifications': {
    icon: <Bell className="w-full h-full" />,
    title: 'No notifications',
    description: 'You don\'t have any notifications right now.',
  },
  'no-events': {
    icon: <Calendar className="w-full h-full" />,
    title: 'No upcoming events',
    description: 'Your calendar is clear.',
  },
  'no-members': {
    icon: <Users className="w-full h-full" />,
    title: 'No team members',
    description: 'Invite people to collaborate.',
  },
  // v128: Pharma/regulatory specific types
  'no-programs': {
    icon: <Pill className="w-full h-full" />,
    title: 'No programs',
    description: 'Create a development program to get started.',
  },
  'no-documents': {
    icon: <FileCheck className="w-full h-full" />,
    title: 'No documents',
    description: 'Start authoring or upload documents to this module.',
  },
  'no-submissions': {
    icon: <Send className="w-full h-full" />,
    title: 'No submissions',
    description: 'Build your first regulatory submission sequence.',
  },
  'no-haqs': {
    icon: <MessageSquare className="w-full h-full" />,
    title: 'No HAQs',
    description: 'No health authority questions to display. All caught up!',
  },
  'no-safety-cases': {
    icon: <Shield className="w-full h-full" />,
    title: 'No safety cases',
    description: 'No adverse event reports in this timeframe.',
  },
  'no-studies': {
    icon: <FlaskConical className="w-full h-full" />,
    title: 'No studies',
    description: 'Create or import clinical studies to begin.',
  },
  'no-sequences': {
    icon: <Package className="w-full h-full" />,
    title: 'No sequences',
    description: 'Build your first eCTD sequence to get started.',
  },
  'no-deviations': {
    icon: <AlertTriangle className="w-full h-full" />,
    title: 'No deviations',
    description: 'No quality deviations recorded. Quality looks good!',
  },
  'no-artifacts': {
    icon: <Database className="w-full h-full" />,
    title: 'No artifacts',
    description: 'TMF artifacts will appear here as documents are filed.',
  },
  'no-milestones': {
    icon: <Clock className="w-full h-full" />,
    title: 'No milestones',
    description: 'Add milestones to track development progress.',
  },
  'no-activity': {
    icon: <Activity className="w-full h-full" />,
    title: 'No recent activity',
    description: 'Activity will appear here as work progresses.',
  },
  'offline': {
    icon: <AlertCircle className="w-full h-full" />,
    title: 'You\'re offline',
    description: 'Check your connection and try again.',
  },
  'access-denied': {
    icon: <Shield className="w-full h-full" />,
    title: 'Access denied',
    description: 'You don\'t have permission to view this content.',
  },
  'coming-soon': {
    icon: <Beaker className="w-full h-full" />,
    title: 'Coming soon',
    description: 'This feature is under development.',
  },
};

const sizeStyles = {
  sm: {
    container: 'py-8',
    icon: 'w-8 h-8',
    title: 'text-sm',
    description: 'text-xs',
    iconBg: 'w-12 h-12',
  },
  md: {
    container: 'py-12',
    icon: 'w-10 h-10',
    title: 'text-base',
    description: 'text-sm',
    iconBg: 'w-16 h-16',
  },
  lg: {
    container: 'py-16',
    icon: 'w-12 h-12',
    title: 'text-lg',
    description: 'text-sm',
    iconBg: 'w-20 h-20',
  },
};

export function EmptyState({
  type = 'no-data',
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const config = typeConfig[type];
  const styles = sizeStyles[size];
  
  // Handle both ReactNode and Component types for icon
  let displayIcon: ReactNode;
  if (icon) {
    if (typeof icon === 'function') {
      // It's a component - render it
      const IconComponent = icon as ComponentType<LucideProps>;
      displayIcon = <IconComponent className="w-full h-full" />;
    } else {
      // It's already a ReactNode
      displayIcon = icon;
    }
  } else {
    displayIcon = config.icon;
  }
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  
  return (
    <div className={`flex flex-col items-center justify-center text-center ${styles.container} ${className}`}>
      {/* Icon container */}
      <div className={`
        ${styles.iconBg} 
        rounded-full 
        bg-surface-card 
        flex items-center justify-center 
        mb-4
      `}>
        <span className={`${styles?.icon ?? ''} text-text-muted`}>
          {displayIcon}
        </span>
      </div>
      
      {/* Title */}
      <h3 className={`font-semibold text-text-primary mb-1 ${styles.title}`}>
        {displayTitle}
      </h3>
      
      {/* Description */}
      <p className={`text-text-muted max-w-sm ${styles.description}`}>
        {displayDescription}
      </p>
      
      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-4">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

// Quick empty states with common patterns
interface QuickEmptyStateProps {
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function NoDataEmptyState({ 
  onAction, 
  actionLabel = 'Add Item',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="no-data"
      action={onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

export function NoSearchResultsEmptyState({ 
  onAction, 
  actionLabel = 'Clear Search',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="no-search-results"
      action={onAction && <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

export function NoFilterResultsEmptyState({ 
  onAction, 
  actionLabel = 'Clear Filters',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="no-filters"
      action={onAction && <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

export function ErrorEmptyState({ 
  onAction, 
  actionLabel = 'Try Again',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="error"
      action={onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

// v128: Module-specific empty states
export function NoProgramsEmptyState({ 
  onAction, 
  actionLabel = 'Create Program',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="no-programs"
      action={onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

export function NoDocumentsEmptyState({ 
  onAction, 
  actionLabel = 'Create Document',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="no-documents"
      action={onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

export function NoSubmissionsEmptyState({ 
  onAction, 
  actionLabel = 'Build Sequence',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="no-submissions"
      action={onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

export function NoHAQsEmptyState({ 
  className = '' 
}: { className?: string }) {
  return (
    <EmptyState
      type="no-haqs"
      className={className}
    />
  );
}

export function NoSafetyCasesEmptyState({ 
  className = '' 
}: { className?: string }) {
  return (
    <EmptyState
      type="no-safety-cases"
      className={className}
    />
  );
}

export function NoStudiesEmptyState({ 
  onAction, 
  actionLabel = 'Add Study',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="no-studies"
      action={onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

export function ComingSoonEmptyState({ 
  className = '' 
}: { className?: string }) {
  return (
    <EmptyState
      type="coming-soon"
      className={className}
    />
  );
}

export function OfflineEmptyState({ 
  onAction, 
  actionLabel = 'Retry',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="offline"
      action={onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}

export function AccessDeniedEmptyState({ 
  onAction, 
  actionLabel = 'Request Access',
  className = '' 
}: QuickEmptyStateProps) {
  return (
    <EmptyState
      type="access-denied"
      action={onAction && <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>}
      className={className}
    />
  );
}
