// Mock Approval Comments Data - Phase 2.3e.3
// Review comments thread with threading, mentions, and resolution workflow

import type { ApprovalComment } from '@/types/approval';

// ============================================================================
// MOCK COMMENTS - Realistic review conversation
// ============================================================================

export const mockApprovalComments: ApprovalComment[] = [
  // Thread 1: Regulatory concern about dosing language
  {
    id: 'cmt-001',
    approvalRequestId: 'apr-001',
    stepId: 'step-1',
    authorId: 'user-sarah-chen',
    authorName: 'Dr. Sarah Chen',
    authorRole: 'Medical Director',
    content: 'The dosing adjustment language in Section 3.2 needs to be aligned with the approved label. Currently states "may be adjusted" but should read "should be adjusted based on renal function." @michael.rodriguez can you confirm this matches the CSR?',
    commentType: 'revision-request',
    status: 'addressed',
    addressedBy: 'user-michael-rodriguez',
    addressedAt: '2026-01-06T14:30:00Z',
    createdAt: '2026-01-06T09:15:00Z',
    updatedAt: '2026-01-06T14:30:00Z',
    replies: [
      {
        id: 'cmt-001-r1',
        approvalRequestId: 'apr-001',
        stepId: 'step-1',
        authorId: 'user-michael-rodriguez',
        authorName: 'Michael Rodriguez',
        authorRole: 'Regulatory Lead',
        content: 'Confirmed - CSR Section 12.3 specifies "should be adjusted based on renal function (eGFR < 60 mL/min)." I\'ll update the document to match.',
        commentType: 'response',
        status: 'closed',
        parentCommentId: 'cmt-001',
        createdAt: '2026-01-06T10:45:00Z',
      },
      {
        id: 'cmt-001-r2',
        approvalRequestId: 'apr-001',
        stepId: 'step-1',
        authorId: 'user-michael-rodriguez',
        authorName: 'Michael Rodriguez',
        authorRole: 'Regulatory Lead',
        content: 'Updated in version 2.1. Section 3.2 now reads: "Dosage should be adjusted based on renal function for patients with eGFR < 60 mL/min." @sarah.chen please verify.',
        commentType: 'resolution',
        status: 'closed',
        parentCommentId: 'cmt-001',
        createdAt: '2026-01-06T14:30:00Z',
      },
    ],
  },
  
  // Thread 2: QA question about reference standards
  {
    id: 'cmt-002',
    approvalRequestId: 'apr-001',
    stepId: 'step-2',
    authorId: 'user-lisa-park',
    authorName: 'Lisa Park',
    authorRole: 'QA Manager',
    content: 'Question: The analytical methods section references USP <621> but doesn\'t specify the edition. Per SOP-QA-042, we need to cite the specific edition or state "current edition." Which applies here?',
    commentType: 'question',
    status: 'open',
    createdAt: '2026-01-06T11:20:00Z',
    replies: [],
  },
  
  // Thread 3: Completed review note
  {
    id: 'cmt-003',
    approvalRequestId: 'apr-001',
    stepId: 'step-1',
    authorId: 'user-sarah-chen',
    authorName: 'Dr. Sarah Chen',
    authorRole: 'Medical Director',
    content: 'Medical review complete. All clinical claims are supported by the referenced studies. Minor editorial suggestions provided via track changes. Ready for next approver.',
    commentType: 'note',
    status: 'closed',
    createdAt: '2026-01-06T16:00:00Z',
    replies: [],
  },
  
  // Thread 4: Cross-functional discussion
  {
    id: 'cmt-004',
    approvalRequestId: 'apr-001',
    authorId: 'user-james-wilson',
    authorName: 'James Wilson',
    authorRole: 'Legal Counsel',
    content: 'The IP claims in the executive summary may need to be softened. Phrases like "breakthrough technology" could be challenged. @emily.watson @sarah.chen - thoughts on alternative language?',
    commentType: 'question',
    status: 'addressed',
    addressedBy: 'user-emily-watson',
    addressedAt: '2026-01-06T15:45:00Z',
    createdAt: '2026-01-06T13:00:00Z',
    updatedAt: '2026-01-06T15:45:00Z',
    replies: [
      {
        id: 'cmt-004-r1',
        approvalRequestId: 'apr-001',
        authorId: 'user-emily-watson',
        authorName: 'Dr. Emily Watson',
        authorRole: 'Compliance Officer',
        content: 'Agreed. Suggest replacing "breakthrough technology" with "novel therapeutic approach" which is more defensible. This aligns with our FDA submission language.',
        commentType: 'response',
        status: 'closed',
        parentCommentId: 'cmt-004',
        createdAt: '2026-01-06T14:20:00Z',
      },
      {
        id: 'cmt-004-r2',
        approvalRequestId: 'apr-001',
        authorId: 'user-sarah-chen',
        authorName: 'Dr. Sarah Chen',
        authorRole: 'Medical Director',
        content: 'I support Emily\'s suggestion. "Novel therapeutic approach" accurately describes the mechanism without overstating claims.',
        commentType: 'response',
        status: 'closed',
        parentCommentId: 'cmt-004',
        createdAt: '2026-01-06T14:55:00Z',
      },
      {
        id: 'cmt-004-r3',
        approvalRequestId: 'apr-001',
        authorId: 'user-james-wilson',
        authorName: 'James Wilson',
        authorRole: 'Legal Counsel',
        content: 'Perfect. I\'ll mark this as resolved. Please update the document accordingly.',
        commentType: 'resolution',
        status: 'closed',
        parentCommentId: 'cmt-004',
        createdAt: '2026-01-06T15:45:00Z',
      },
    ],
  },
  
  // Thread 5: Revision request with attachment reference
  {
    id: 'cmt-005',
    approvalRequestId: 'apr-001',
    stepId: 'step-3',
    authorId: 'user-robert-kim',
    authorName: 'Robert Kim',
    authorRole: 'Executive Sponsor',
    content: 'The budget projections in Appendix C don\'t match the figures from last week\'s board presentation. Please reconcile before final approval. Attaching the board deck for reference.',
    commentType: 'revision-request',
    status: 'open',
    attachmentIds: ['att-001'],
    createdAt: '2026-01-07T08:30:00Z',
    replies: [],
  },
];

// ============================================================================
// MOCK USERS FOR MENTIONS
// ============================================================================

export interface MentionableUser {
  id: string;
  userId: string;
  userName: string;
  email: string;
  role: string;
  department: string;
  avatarInitials: string;
}

export const mockMentionableUsers: MentionableUser[] = [
  {
    id: 'user-sarah-chen',
    userId: 'user-sarah-chen',
    userName: 'Dr. Sarah Chen',
    email: 'sarah.chen@company.com',
    role: 'Medical Director',
    department: 'Medical Affairs',
    avatarInitials: 'SC',
  },
  {
    id: 'user-michael-rodriguez',
    userId: 'user-michael-rodriguez',
    userName: 'Michael Rodriguez',
    email: 'michael.rodriguez@company.com',
    role: 'Regulatory Lead',
    department: 'Regulatory Affairs',
    avatarInitials: 'MR',
  },
  {
    id: 'user-emily-watson',
    userId: 'user-emily-watson',
    userName: 'Dr. Emily Watson',
    email: 'emily.watson@company.com',
    role: 'Compliance Officer',
    department: 'Quality',
    avatarInitials: 'EW',
  },
  {
    id: 'user-lisa-park',
    userId: 'user-lisa-park',
    userName: 'Lisa Park',
    email: 'lisa.park@company.com',
    role: 'QA Manager',
    department: 'Quality Assurance',
    avatarInitials: 'LP',
  },
  {
    id: 'user-james-wilson',
    userId: 'user-james-wilson',
    userName: 'James Wilson',
    email: 'james.wilson@company.com',
    role: 'Legal Counsel',
    department: 'Legal',
    avatarInitials: 'JW',
  },
  {
    id: 'user-robert-kim',
    userId: 'user-robert-kim',
    userName: 'Robert Kim',
    email: 'robert.kim@company.com',
    role: 'Executive Sponsor',
    department: 'Executive',
    avatarInitials: 'RK',
  },
  {
    id: 'user-amanda-jones',
    userId: 'user-amanda-jones',
    userName: 'Amanda Jones',
    email: 'amanda.jones@company.com',
    role: 'Document Control Specialist',
    department: 'Document Control',
    avatarInitials: 'AJ',
  },
  {
    id: 'user-david-brown',
    userId: 'user-david-brown',
    userName: 'David Brown',
    email: 'david.brown@company.com',
    role: 'Clinical Operations Lead',
    department: 'Clinical Operations',
    avatarInitials: 'DB',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get comments for a specific approval request
 */
export function getCommentsForApproval(approvalRequestId: string): ApprovalComment[] {
  return mockApprovalComments.filter(c => c.approvalRequestId === approvalRequestId);
}

/**
 * Get comments for a specific step
 */
export function getCommentsForStep(approvalRequestId: string, stepId: string): ApprovalComment[] {
  return mockApprovalComments.filter(
    c => c.approvalRequestId === approvalRequestId && c.stepId === stepId
  );
}

/**
 * Get open (unresolved) comments
 */
export function getOpenComments(approvalRequestId: string): ApprovalComment[] {
  return mockApprovalComments.filter(
    c => c.approvalRequestId === approvalRequestId && c.status === 'open'
  );
}

/**
 * Get addressed comments pending verification
 */
export function getAddressedComments(approvalRequestId: string): ApprovalComment[] {
  return mockApprovalComments.filter(
    c => c.approvalRequestId === approvalRequestId && c.status === 'addressed'
  );
}

/**
 * Count comments by status
 */
export function countCommentsByStatus(approvalRequestId: string): {
  open: number;
  addressed: number;
  closed: number;
  total: number;
} {
  const comments = getCommentsForApproval(approvalRequestId);
  return {
    open: comments.filter(c => c.status === 'open').length,
    addressed: comments.filter(c => c.status === 'addressed').length,
    closed: comments.filter(c => c.status === 'closed').length,
    total: comments.length,
  };
}

/**
 * Search users for mentions
 */
export function searchMentionableUsers(query: string): MentionableUser[] {
  const lowerQuery = query.toLowerCase();
  return mockMentionableUsers.filter(
    u =>
      u.userName.toLowerCase().includes(lowerQuery) ||
      u.email.toLowerCase().includes(lowerQuery) ||
      u.role.toLowerCase().includes(lowerQuery) ||
      u.department.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get user by ID for mention resolution
 */
export function getMentionableUser(userId: string): MentionableUser | undefined {
  return mockMentionableUsers.find(u => u.id === userId || u.userId === userId);
}

/**
 * Parse @mentions from comment content
 * Returns array of userIds mentioned
 */
export function parseMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z]+\.[a-zA-Z]+)/g;
  const matches = content.match(mentionRegex);
  if (!matches) return [];
  
  return matches
    .map(m => m.substring(1)) // Remove @
    .map(emailPrefix => {
      const user = mockMentionableUsers.find(
        u => u.email.toLowerCase().startsWith(emailPrefix.toLowerCase() + '@')
      );
      return user?.userId;
    })
    .filter((id): id is string => id !== undefined);
}

/**
 * Format comment content with highlighted mentions
 */
export function formatContentWithMentions(content: string): string {
  return content.replace(
    /@([a-zA-Z]+\.[a-zA-Z]+)/g,
    '<span class="text-blue-600 font-medium">@$1</span>'
  );
}

/**
 * Get comment type badge color
 */
export function getCommentTypeBadgeColor(type: ApprovalComment['commentType']): string {
  switch (type) {
    case 'question': return 'bg-blue-100 text-blue-800';
    case 'response': return 'bg-gray-100 text-gray-800';
    case 'note': return 'bg-purple-100 text-purple-800';
    case 'revision-request': return 'bg-amber-100 text-amber-800';
    case 'resolution': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status: ApprovalComment['status']): string {
  switch (status) {
    case 'open': return 'bg-red-100 text-red-800';
    case 'addressed': return 'bg-amber-100 text-amber-800';
    case 'closed': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format relative time for comments
 */
export function formatCommentTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
