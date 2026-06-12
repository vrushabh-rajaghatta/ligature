
/**
 * TaskSection - v0.12.1
 * 
 * Groups tasks into collapsible sections by type, priority, or module.
 * Features:
 * - Collapsible header with task count
 * - Configurable grouping (type, priority, module, dueDate)
 * - Empty state handling
 * - Batch actions (mark all complete, etc.)
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { TaskCard, type TaskCardProps } from './TaskCard';
import { 
  TASK_TYPE_CONFIG,
  type AggregatedTask,
  type TaskType,
  type TaskPriority 
} from '@/store/useTaskAggregationStore';
import type { ModuleId } from '@/types/core';

export type GroupBy = 'type' | 'priority' | 'module' | 'dueDate';

export interface TaskGroup {
  key: string;
  label: string;
  color?: string;
  tasks: AggregatedTask[];
}

export interface TaskSectionProps {
  /** Section title */
  title: string;
  /** Tasks in this section */
  tasks: AggregatedTask[];
  /** Color accent for the section */
  color?: string;
  /** Initially collapsed */
  defaultCollapsed?: boolean;
  /** Show task count badge */
  showCount?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Task card event handlers */
  onTaskAction?: TaskCardProps['onAction'];
  onTaskNavigate?: TaskCardProps['onNavigate'];
  onTaskComplete?: TaskCardProps['onComplete'];
  /** Use compact task cards */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Group tasks by a specified property
 */
export function groupTasks(tasks: AggregatedTask[], groupBy: GroupBy): TaskGroup[] {
  const groups: Record<string, AggregatedTask[]> = {};

  tasks.forEach(task => {
    let key: string;
    
    switch (groupBy) {
      case 'type':
        key = task.type;
        break;
      case 'priority':
        key = task.priority;
        break;
      case 'module':
        key = task.sourceModule;
        break;
      case 'dueDate':
        if (task.daysUntilDue === null) {
          key = 'no-date';
        } else if (task.daysUntilDue < 0) {
          key = 'overdue';
        } else if (task.daysUntilDue === 0) {
          key = 'today';
        } else if (task.daysUntilDue <= 7) {
          key = 'this-week';
        } else {
          key = 'later';
        }
        break;
      default:
        key = 'default';
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  });

  // Convert to array with labels
  const result: TaskGroup[] = [];
  
  if (groupBy === 'type') {
    Object.entries(groups).forEach(([key, tasks]) => {
      const config = TASK_TYPE_CONFIG[key as TaskType];
      result.push({
        key,
        label: config?.label || key,
        color: config?.color,
        tasks,
      });
    });
  } else if (groupBy === 'priority') {
    const priorityOrder: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
    const priorityLabels: Record<TaskPriority, { label: string; color: string }> = {
      critical: { label: 'Critical', color: '#EF4444' },
      high: { label: 'High Priority', color: '#F97316' },
      medium: { label: 'Medium Priority', color: '#EAB308' },
      low: { label: 'Low Priority', color: '#64748B' },
    };
    priorityOrder.forEach(priority => {
      if (groups[priority]) {
        const config = priorityLabels[priority];
        result.push({
          key: priority,
          label: config.label,
          color: config.color,
          tasks: groups[priority],
        });
      }
    });
  } else if (groupBy === 'dueDate') {
    const dateOrder = ['overdue', 'today', 'this-week', 'later', 'no-date'];
    const dateLabels: Record<string, { label: string; color: string }> = {
      overdue: { label: 'Overdue', color: '#EF4444' },
      today: { label: 'Due Today', color: '#F97316' },
      'this-week': { label: 'Due This Week', color: '#3B82F6' },
      later: { label: 'Upcoming', color: '#64748B' },
      'no-date': { label: 'No Due Date', color: '#64748B' },
    };
    dateOrder.forEach(dateKey => {
      if (groups[dateKey]) {
        const config = dateLabels[dateKey];
        result.push({
          key: dateKey,
          label: config.label,
          color: config.color,
          tasks: groups[dateKey],
        });
      }
    });
  } else {
    // Module grouping - just use keys as labels
    Object.entries(groups).forEach(([key, tasks]) => {
      result.push({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' '),
        tasks,
      });
    });
  }

  return result;
}

/**
 * TaskSection Component
 */
export function TaskSection({
  title,
  tasks,
  color,
  defaultCollapsed = false,
  showCount = true,
  emptyMessage = 'No tasks in this section',
  onTaskAction,
  onTaskNavigate,
  onTaskComplete,
  compact = false,
  className = '',
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (tasks.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center gap-3 py-2 text-left group"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
        
        {color && (
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        
        <span className="font-medium text-text-primary group-hover:text-accent-blue transition-colors">
          {title}
        </span>
        
        {showCount && (
          <span className="px-2 py-0.5 bg-surface-elevated text-text-muted text-xs rounded-full">
            {tasks.length}
          </span>
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="mt-2 space-y-3 pl-7">
          {tasks.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-accent-green mx-auto mb-2" />
              <p className="text-sm text-text-muted">{emptyMessage}</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onAction={onTaskAction}
                onNavigate={onTaskNavigate}
                onComplete={onTaskComplete}
                compact={compact}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Grouped task list - renders multiple sections based on grouping
 */
export interface GroupedTaskListProps {
  tasks: AggregatedTask[];
  groupBy: GroupBy;
  onTaskAction?: TaskCardProps['onAction'];
  onTaskNavigate?: TaskCardProps['onNavigate'];
  onTaskComplete?: TaskCardProps['onComplete'];
  compact?: boolean;
  className?: string;
}

export function GroupedTaskList({
  tasks,
  groupBy,
  onTaskAction,
  onTaskNavigate,
  onTaskComplete,
  compact = false,
  className = '',
}: GroupedTaskListProps) {
  const groups = groupTasks(tasks, groupBy);

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <CheckCircle2 className="w-16 h-16 text-accent-green mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary">All caught up!</h3>
        <p className="text-text-muted mt-2">You have no pending tasks.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {groups.map(group => (
        <TaskSection
          key={group.key}
          title={group.label}
          tasks={group.tasks}
          color={group.color}
          onTaskAction={onTaskAction}
          onTaskNavigate={onTaskNavigate}
          onTaskComplete={onTaskComplete}
          compact={compact}
        />
      ))}
    </div>
  );
}

export default TaskSection;
