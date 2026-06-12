/**
 * Document Badge Utilities — extracted from DocumentControlScreen
 * to break circular dependency: DocumentViewer ↔ DocumentControlScreen
 * @version 0.45.4
 */

import React from 'react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import type { DocumentStatus, DocumentCategory } from '@/domains/document-control/contracts';

// ============================================
// Document Control Color Maps (v106)
// ============================================

const documentStatusColorMap: Record<string, BadgeColor> = {
  draft: 'slate', 'in-review': 'amber', 'pending-approval': 'orange', approved: 'blue',
  effective: 'green', superseded: 'purple', retired: 'slate', archived: 'slate',
  'on-hold': 'red', rejected: 'red',
};

const documentCategoryColorMap: Record<string, BadgeColor> = {
  regulatory: 'blue', clinical: 'teal', safety: 'red', quality: 'green',
  manufacturing: 'purple', nonclinical: 'amber', cmc: 'orange', labeling: 'cyan',
  correspondence: 'slate', administrative: 'slate', training: 'violet',
  reference: 'slate', template: 'teal', archive: 'slate',
};

const classificationColorMap: Record<string, BadgeColor> = {
  controlled: 'blue', uncontrolled: 'slate', reference: 'amber',
  working: 'green', archive: 'slate', template: 'purple',
};

const securityColorMap: Record<string, BadgeColor> = {
  public: 'green', internal: 'blue', confidential: 'amber',
  restricted: 'orange', 'top-secret': 'red',
};

const archiveStatusColorMap: Record<string, BadgeColor> = {
  active: 'green', archived: 'slate', 'legal-hold': 'red',
  'pending-destruction': 'amber', destroyed: 'slate',
};

const reviewStatusColorMap: Record<string, BadgeColor> = {
  'not-started': 'slate', 'in-progress': 'blue', completed: 'green',
  'awaiting-revision': 'amber', cancelled: 'red',
};

// ============================================
// Document Control Badge Helper Functions (v106)
// ============================================

export const getDocumentStatusBadge = (status: DocumentStatus) => {
  const labels: Record<string, string> = {
    draft: 'Draft', 'in-review': 'In Review', 'pending-approval': 'Pending Approval',
    approved: 'Approved', effective: 'Effective', superseded: 'Superseded',
    retired: 'Retired', archived: 'Archived', 'on-hold': 'On Hold', rejected: 'Rejected',
  };
  return <Badge color={documentStatusColorMap[status] || 'slate'} size="sm">{labels[status] || status}</Badge>;
};

export const getDocumentCategoryBadge = (category: DocumentCategory) => (
  <Badge color={documentCategoryColorMap[category] || 'slate'} size="xs">
    {category.charAt(0).toUpperCase() + category.slice(1)}
  </Badge>
);

export const getClassificationBadge = (classification: string) => (
  <Badge color={classificationColorMap[classification] || 'slate'} size="xs">
    {classification.charAt(0).toUpperCase() + classification.slice(1)}
  </Badge>
);

export const getSecurityBadge = (security: string) => (
  <Badge color={securityColorMap[security] || 'slate'} size="xs">
    {security.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
  </Badge>
);

export const getArchiveStatusBadge = (status: string) => (
  <Badge color={archiveStatusColorMap[status] || 'slate'} size="xs" dot>
    {status.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
  </Badge>
);

export const getReviewStatusBadge = (status: string) => (
  <Badge color={reviewStatusColorMap[status] || 'slate'} size="xs">
    {status.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
  </Badge>
);
