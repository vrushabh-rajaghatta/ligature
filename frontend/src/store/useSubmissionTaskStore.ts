
// ============================================================================
// useSubmissionTaskStore - v0.38.4
// Task Assignment & Notification System for Regulatory Submissions
// ============================================================================
// Connects RACI assignments to actual tasks with:
// - Task creation from content requirements
// - Assignment with notifications
// - Due date tracking
// - Escalation rules
// - Integration with My Tasks
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export type TaskStatus = 'not-started' | 'in-progress' | 'in-review' | 'blocked' | 'complete';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskType = 'document-authoring' | 'document-review' | 'qc-check' | 'approval' | 'upload' | 'reference';
export type RACIRole = 'R' | 'A' | 'C' | 'I';

export interface TaskAssignee {
  userId: string;
  userName: string;
  email: string;
  role: RACIRole;
  assignedAt: string;
  notifiedAt?: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

export interface TaskEscalation {
  level: number;
  triggeredAt: string;
  escalatedTo: string;
  reason: string;
  resolved: boolean;
}

export interface SubmissionTask {
  id: string;
  
  // Submission context
  submissionId: string;
  applicationNumber: string;
  sequenceNumber: string;
  productId: string;
  productName: string;
  
  // Content reference
  ctdSection: string;
  ctdSectionTitle: string;
  documentType: TaskType;
  documentTitle: string;
  
  // Task details
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  
  // Assignments (RACI)
  assignees: TaskAssignee[];
  
  // Dates
  createdAt: string;
  dueDate: string;
  startedAt?: string;
  completedAt?: string;
  
  // Tracking
  percentComplete: number;
  blockers: string[];
  comments: TaskComment[];
  escalations: TaskEscalation[];
  
  // Source tracking
  sourceDocumentId?: string;
  sourceModule?: 'authoring' | 'tmf' | 'haq' | 'cmc';
  
  // Notifications
  lastNotificationSent?: string;
  remindersSent: number;
}

export interface TaskNotification {
  id: string;
  taskId: string;
  userId: string;
  type: 'assignment' | 'reminder' | 'escalation' | 'due-soon' | 'overdue' | 'comment' | 'status-change';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  submissionType: string;
  region: string;
  tasks: Omit<SubmissionTask, 'id' | 'submissionId' | 'applicationNumber' | 'sequenceNumber' | 'productId' | 'productName' | 'createdAt' | 'assignees' | 'comments' | 'escalations' | 'remindersSent'>[];
}

// ============================================================================
// STORE STATE
// ============================================================================

interface SubmissionTaskState {
  tasks: Record<string, SubmissionTask>;
  taskIndex: string[];
  notifications: Record<string, TaskNotification>;
  notificationIndex: string[];
  templates: Record<string, TaskTemplate>;
  
  // CRUD Operations
  createTask: (task: Omit<SubmissionTask, 'id' | 'createdAt' | 'comments' | 'escalations' | 'remindersSent'>) => string;
  updateTask: (taskId: string, updates: Partial<SubmissionTask>) => void;
  deleteTask: (taskId: string) => void;
  
  // Assignment
  assignTask: (taskId: string, assignee: Omit<TaskAssignee, 'assignedAt'>, sendNotification?: boolean) => void;
  unassignTask: (taskId: string, userId: string) => void;
  reassignTask: (taskId: string, fromUserId: string, toUserId: string, toUserName: string, toEmail: string) => void;
  
  // Status Management
  updateTaskStatus: (taskId: string, status: TaskStatus, userId?: string) => void;
  updateTaskProgress: (taskId: string, percentComplete: number) => void;
  addBlocker: (taskId: string, blocker: string) => void;
  removeBlocker: (taskId: string, blockerIndex: number) => void;
  
  // Comments
  addComment: (taskId: string, userId: string, userName: string, content: string) => void;
  
  // Escalation
  escalateTask: (taskId: string, escalatedTo: string, reason: string) => void;
  resolveEscalation: (taskId: string, escalationIndex: number) => void;
  
  // Notifications
  createNotification: (notification: Omit<TaskNotification, 'id' | 'createdAt' | 'read'>) => string;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  getUnreadNotifications: (userId: string) => TaskNotification[];
  
  // Bulk Operations
  createTasksFromTemplate: (templateId: string, submissionId: string, applicationNumber: string, sequenceNumber: string, productId: string, productName: string) => string[];
  assignTasksInBulk: (taskIds: string[], assignee: Omit<TaskAssignee, 'assignedAt'>) => void;
  
  // Queries
  getTask: (taskId: string) => SubmissionTask | undefined;
  getTasksForSubmission: (submissionId: string) => SubmissionTask[];
  getTasksForUser: (userId: string) => SubmissionTask[];
  getTasksByStatus: (status: TaskStatus) => SubmissionTask[];
  getOverdueTasks: () => SubmissionTask[];
  getDueSoonTasks: (daysAhead: number) => SubmissionTask[];
  getBlockedTasks: () => SubmissionTask[];
  
  // Content Readiness
  getContentReadiness: (submissionId: string) => { ready: number; total: number; bySection: Record<string, { ready: number; total: number }> };
  
  // Send Notifications (simulated)
  sendTaskNotifications: (taskId: string, type: TaskNotification['type']) => void;
  sendReminderNotifications: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

const daysUntil = (dateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl-ir-response',
    name: 'IR Response Package',
    submissionType: 'IR Response',
    region: 'US',
    tasks: [
      {
        ctdSection: '1.2',
        ctdSectionTitle: 'Cover Letter',
        documentType: 'document-authoring',
        documentTitle: 'Cover Letter',
        title: 'Draft Cover Letter',
        description: 'Prepare cover letter for IR response submission',
        status: 'not-started',
        priority: 'high',
        dueDate: '',
        percentComplete: 0,
        blockers: [],
      },
      {
        ctdSection: '1.3.1',
        ctdSectionTitle: 'Form FDA 356h',
        documentType: 'upload',
        documentTitle: 'FDA Form 356h',
        title: 'Complete Form FDA 356h',
        description: 'Fill out and sign FDA Form 356h',
        status: 'not-started',
        priority: 'high',
        dueDate: '',
        percentComplete: 0,
        blockers: [],
      },
      {
        ctdSection: '1.12.1',
        ctdSectionTitle: 'Response Document',
        documentType: 'document-authoring',
        documentTitle: 'IR Response',
        title: 'Author IR Response Document',
        description: 'Draft response to Information Request questions',
        status: 'not-started',
        priority: 'critical',
        dueDate: '',
        percentComplete: 0,
        blockers: [],
      },
      {
        ctdSection: '1.12.2',
        ctdSectionTitle: 'Supporting Documents',
        documentType: 'document-authoring',
        documentTitle: 'Supporting Tables',
        title: 'Prepare Supporting Tables',
        description: 'Create supporting tables and figures for IR response',
        status: 'not-started',
        priority: 'high',
        dueDate: '',
        percentComplete: 0,
        blockers: [],
      },
    ],
  },
  {
    id: 'tpl-annual-report',
    name: 'Annual Report',
    submissionType: 'Annual Report',
    region: 'US',
    tasks: [
      {
        ctdSection: '1.2',
        ctdSectionTitle: 'Cover Letter',
        documentType: 'document-authoring',
        documentTitle: 'Cover Letter',
        title: 'Draft Annual Report Cover Letter',
        description: 'Prepare cover letter for annual report',
        status: 'not-started',
        priority: 'medium',
        dueDate: '',
        percentComplete: 0,
        blockers: [],
      },
      {
        ctdSection: '1.3.1',
        ctdSectionTitle: 'Form FDA 356h',
        documentType: 'upload',
        documentTitle: 'FDA Form 356h',
        title: 'Complete Form FDA 356h',
        description: 'Fill out FDA Form 356h for annual report',
        status: 'not-started',
        priority: 'medium',
        dueDate: '',
        percentComplete: 0,
        blockers: [],
      },
      {
        ctdSection: '5.3.6',
        ctdSectionTitle: 'Safety Update',
        documentType: 'document-authoring',
        documentTitle: 'Safety Summary',
        title: 'Compile Safety Summary',
        description: 'Compile annual safety summary from ICSR data',
        status: 'not-started',
        priority: 'high',
        dueDate: '',
        percentComplete: 0,
        blockers: [],
      },
    ],
  },
];

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useSubmissionTaskStore = create<SubmissionTaskState>()(
  devtools(
    (set, get) => ({
      tasks: {},
      taskIndex: [],
      notifications: {},
      notificationIndex: [],
      templates: DEFAULT_TEMPLATES.reduce((acc, t) => ({ ...acc, [t.id]: t }), {}),
      
      // ========================================================================
      // CRUD Operations
      // ========================================================================
      
      createTask: (taskData) => {
        const id = generateId('task');
        const now = timestamp();
        
        const task: SubmissionTask = {
          ...taskData,
          id,
          createdAt: now,
          comments: [],
          escalations: [],
          remindersSent: 0,
        };
        
        set(state => ({
          tasks: { ...state.tasks, [id]: task },
          taskIndex: [...state.taskIndex, id],
        }));
        
        return id;
      },
      
      updateTask: (taskId, updates) => {
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: state.tasks[taskId] 
              ? { ...state.tasks[taskId], ...updates }
              : state.tasks[taskId],
          },
        }));
      },
      
      deleteTask: (taskId) => {
        set(state => {
          const { [taskId]: _, ...remainingTasks } = state.tasks;
          return {
            tasks: remainingTasks,
            taskIndex: state.taskIndex.filter(id => id !== taskId),
          };
        });
      },
      
      // ========================================================================
      // Assignment
      // ========================================================================
      
      assignTask: (taskId, assignee, sendNotification = true) => {
        const task = get().tasks[taskId];
        if (!task) return;
        
        const fullAssignee: TaskAssignee = {
          ...assignee,
          assignedAt: timestamp(),
        };
        
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: {
              ...state.tasks[taskId],
              assignees: [...state.tasks[taskId].assignees, fullAssignee],
            },
          },
        }));
        
        if (sendNotification) {
          get().sendTaskNotifications(taskId, 'assignment');
        }
      },
      
      unassignTask: (taskId, userId) => {
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: state.tasks[taskId] 
              ? {
                  ...state.tasks[taskId],
                  assignees: state.tasks[taskId].assignees.filter(a => a.userId !== userId),
                }
              : state.tasks[taskId],
          },
        }));
      },
      
      reassignTask: (taskId, fromUserId, toUserId, toUserName, toEmail) => {
        const task = get().tasks[taskId];
        if (!task) return;
        
        const existingAssignee = task.assignees.find(a => a.userId === fromUserId);
        if (!existingAssignee) return;
        
        get().unassignTask(taskId, fromUserId);
        get().assignTask(taskId, {
          userId: toUserId,
          userName: toUserName,
          email: toEmail,
          role: existingAssignee.role,
        }, true);
      },
      
      // ========================================================================
      // Status Management
      // ========================================================================
      
      updateTaskStatus: (taskId, status, userId) => {
        const task = get().tasks[taskId];
        if (!task) return;
        
        const updates: Partial<SubmissionTask> = { status };
        
        if (status === 'in-progress' && !task.startedAt) {
          updates.startedAt = timestamp();
        }
        
        if (status === 'complete') {
          updates.completedAt = timestamp();
          updates.percentComplete = 100;
        }
        
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: { ...state.tasks[taskId], ...updates },
          },
        }));
        
        // Send notification for status change
        get().sendTaskNotifications(taskId, 'status-change');
      },
      
      updateTaskProgress: (taskId, percentComplete) => {
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: state.tasks[taskId]
              ? { ...state.tasks[taskId], percentComplete: Math.min(100, Math.max(0, percentComplete)) }
              : state.tasks[taskId],
          },
        }));
      },
      
      addBlocker: (taskId, blocker) => {
        const task = get().tasks[taskId];
        if (!task) return;
        
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: {
              ...state.tasks[taskId],
              blockers: [...state.tasks[taskId].blockers, blocker],
              status: 'blocked',
            },
          },
        }));
      },
      
      removeBlocker: (taskId, blockerIndex) => {
        const task = get().tasks[taskId];
        if (!task) return;
        
        const newBlockers = task.blockers.filter((_, idx) => idx !== blockerIndex);
        
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: {
              ...state.tasks[taskId],
              blockers: newBlockers,
              status: newBlockers.length === 0 && task.status === 'blocked' ? 'in-progress' : task.status,
            },
          },
        }));
      },
      
      // ========================================================================
      // Comments
      // ========================================================================
      
      addComment: (taskId, userId, userName, content) => {
        const comment: TaskComment = {
          id: generateId('comment'),
          userId,
          userName,
          content,
          timestamp: timestamp(),
        };
        
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: state.tasks[taskId]
              ? { ...state.tasks[taskId], comments: [...state.tasks[taskId].comments, comment] }
              : state.tasks[taskId],
          },
        }));
        
        // Notify other assignees about comment
        get().sendTaskNotifications(taskId, 'comment');
      },
      
      // ========================================================================
      // Escalation
      // ========================================================================
      
      escalateTask: (taskId, escalatedTo, reason) => {
        const task = get().tasks[taskId];
        if (!task) return;
        
        const escalation: TaskEscalation = {
          level: task.escalations.length + 1,
          triggeredAt: timestamp(),
          escalatedTo,
          reason,
          resolved: false,
        };
        
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: {
              ...state.tasks[taskId],
              escalations: [...state.tasks[taskId].escalations, escalation],
            },
          },
        }));
        
        get().sendTaskNotifications(taskId, 'escalation');
      },
      
      resolveEscalation: (taskId, escalationIndex) => {
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: state.tasks[taskId]
              ? {
                  ...state.tasks[taskId],
                  escalations: state.tasks[taskId].escalations.map((e, idx) =>
                    idx === escalationIndex ? { ...e, resolved: true } : e
                  ),
                }
              : state.tasks[taskId],
          },
        }));
      },
      
      // ========================================================================
      // Notifications
      // ========================================================================
      
      createNotification: (notificationData) => {
        const id = generateId('notif');
        
        const notification: TaskNotification = {
          ...notificationData,
          id,
          read: false,
          createdAt: timestamp(),
        };
        
        set(state => ({
          notifications: { ...state.notifications, [id]: notification },
          notificationIndex: [id, ...state.notificationIndex], // Most recent first
        }));
        
        return id;
      },
      
      markNotificationRead: (notificationId) => {
        set(state => ({
          notifications: {
            ...state.notifications,
            [notificationId]: state.notifications[notificationId]
              ? { ...state.notifications[notificationId], read: true }
              : state.notifications[notificationId],
          },
        }));
      },
      
      markAllNotificationsRead: (userId) => {
        set(state => ({
          notifications: Object.fromEntries(
            Object.entries(state.notifications).map(([id, n]) => [
              id,
              n.userId === userId ? { ...n, read: true } : n,
            ])
          ),
        }));
      },
      
      getUnreadNotifications: (userId) => {
        const state = get();
        return state.notificationIndex
          .map(id => state.notifications[id])
          .filter(n => n && n.userId === userId && !n.read);
      },
      
      // ========================================================================
      // Bulk Operations
      // ========================================================================
      
      createTasksFromTemplate: (templateId, submissionId, applicationNumber, sequenceNumber, productId, productName) => {
        const template = get().templates[templateId];
        if (!template) return [];
        
        const taskIds: string[] = [];
        
        for (const taskTemplate of template.tasks) {
          const taskId = get().createTask({
            ...taskTemplate,
            submissionId,
            applicationNumber,
            sequenceNumber,
            productId,
            productName,
            assignees: [],
          });
          taskIds.push(taskId);
        }
        
        return taskIds;
      },
      
      assignTasksInBulk: (taskIds, assignee) => {
        for (const taskId of taskIds) {
          get().assignTask(taskId, assignee, false);
        }
        // Send single notification for bulk assignment
        // In real implementation, would batch these
      },
      
      // ========================================================================
      // Queries
      // ========================================================================
      
      getTask: (taskId) => get().tasks[taskId],
      
      getTasksForSubmission: (submissionId) => {
        const state = get();
        return state.taskIndex
          .map(id => state.tasks[id])
          .filter(t => t && t.submissionId === submissionId);
      },
      
      getTasksForUser: (userId) => {
        const state = get();
        return state.taskIndex
          .map(id => state.tasks[id])
          .filter(t => t && t.assignees.some(a => a.userId === userId));
      },
      
      getTasksByStatus: (status) => {
        const state = get();
        return state.taskIndex
          .map(id => state.tasks[id])
          .filter(t => t && t.status === status);
      },
      
      getOverdueTasks: () => {
        const state = get();
        return state.taskIndex
          .map(id => state.tasks[id])
          .filter(t => t && t.status !== 'complete' && daysUntil(t.dueDate) < 0);
      },
      
      getDueSoonTasks: (daysAhead) => {
        const state = get();
        return state.taskIndex
          .map(id => state.tasks[id])
          .filter(t => {
            if (!t || t.status === 'complete') return false;
            const days = daysUntil(t.dueDate);
            return days >= 0 && days <= daysAhead;
          });
      },
      
      getBlockedTasks: () => get().getTasksByStatus('blocked'),
      
      // ========================================================================
      // Content Readiness
      // ========================================================================
      
      getContentReadiness: (submissionId) => {
        const tasks = get().getTasksForSubmission(submissionId);
        
        const bySection: Record<string, { ready: number; total: number }> = {};
        let ready = 0;
        let total = 0;
        
        for (const task of tasks) {
          const section = task.ctdSection.split('.')[0]; // Group by module
          
          if (!bySection[section]) {
            bySection[section] = { ready: 0, total: 0 };
          }
          
          bySection[section].total++;
          total++;
          
          if (task.status === 'complete') {
            bySection[section].ready++;
            ready++;
          }
        }
        
        return { ready, total, bySection };
      },
      
      // ========================================================================
      // Send Notifications (simulated)
      // ========================================================================
      
      sendTaskNotifications: (taskId, type) => {
        const task = get().tasks[taskId];
        if (!task) return;
        
        const messages: Record<TaskNotification['type'], (t: SubmissionTask) => { title: string; message: string }> = {
          'assignment': (t) => ({
            title: 'New Task Assignment',
            message: `You have been assigned to "${t.title}" for ${t.applicationNumber}`,
          }),
          'reminder': (t) => ({
            title: 'Task Reminder',
            message: `"${t.title}" is due in ${daysUntil(t.dueDate)} days`,
          }),
          'escalation': (t) => ({
            title: 'Task Escalated',
            message: `"${t.title}" has been escalated`,
          }),
          'due-soon': (t) => ({
            title: 'Task Due Soon',
            message: `"${t.title}" is due in ${daysUntil(t.dueDate)} days`,
          }),
          'overdue': (t) => ({
            title: 'Task Overdue',
            message: `"${t.title}" is overdue by ${Math.abs(daysUntil(t.dueDate))} days`,
          }),
          'comment': (t) => ({
            title: 'New Comment',
            message: `New comment on "${t.title}"`,
          }),
          'status-change': (t) => ({
            title: 'Task Status Updated',
            message: `"${t.title}" status changed to ${t.status}`,
          }),
        };
        
        const { title, message } = messages[type](task);
        
        // Create notification for each assignee
        for (const assignee of task.assignees) {
          get().createNotification({
            taskId,
            userId: assignee.userId,
            type,
            title,
            message,
            actionUrl: `/submissions/${task.submissionId}/tasks/${taskId}`,
          });
        }
        
        // Update task's last notification time
        set(state => ({
          tasks: {
            ...state.tasks,
            [taskId]: {
              ...state.tasks[taskId],
              lastNotificationSent: timestamp(),
              remindersSent: type === 'reminder' 
                ? state.tasks[taskId].remindersSent + 1 
                : state.tasks[taskId].remindersSent,
            },
          },
        }));
        
        /* Notification sent */
      },
      
      sendReminderNotifications: () => {
        const dueSoonTasks = get().getDueSoonTasks(3); // 3 days ahead
        const overdueTasks = get().getOverdueTasks();
        
        for (const task of dueSoonTasks) {
          if (task.remindersSent < 3) { // Max 3 reminders
            get().sendTaskNotifications(task.id, 'due-soon');
          }
        }
        
        for (const task of overdueTasks) {
          get().sendTaskNotifications(task.id, 'overdue');
        }
      },
    }),
    { name: 'submission-task-store' }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

export function useUserTasks(userId: string) {
  const tasks = useSubmissionTaskStore(state => 
    state.taskIndex
      .map(id => state.tasks[id])
      .filter(t => t && t.assignees.some(a => a.userId === userId))
  );
  
  return tasks;
}

export function useSubmissionTasks(submissionId: string) {
  const tasks = useSubmissionTaskStore(state =>
    state.taskIndex
      .map(id => state.tasks[id])
      .filter(t => t && t.submissionId === submissionId)
  );
  
  return tasks;
}

export function useUnreadNotifications(userId: string) {
  return useSubmissionTaskStore(state => state.getUnreadNotifications(userId));
}

export default useSubmissionTaskStore;
