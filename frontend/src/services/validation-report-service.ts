
// =============================================================================
// VALIDATION REPORT SERVICE - v0.9.14
// =============================================================================
// Generates validation reports in HTML format for eCTD submissions.
// Reports can be exported, printed, or saved for regulatory records.
// =============================================================================

import type {
  ValidationStatus,
  ValidationIssue,
  ValidationCategory,
  ValidationSeverity,
} from '@/store/ectd-publishing-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ValidationReportOptions {
  /** Report title (e.g., "NDA 215847 Sequence 0001 Validation Report") */
  title: string;
  /** Application number */
  applicationNumber: string;
  /** Sequence number */
  sequenceNumber: string;
  /** Region (FDA, EMA, etc.) */
  region: string;
  /** Sponsor/company name */
  sponsorName?: string;
  /** Include resolved issues */
  includeResolved?: boolean;
  /** Include waived issues */
  includeWaived?: boolean;
  /** Include info-level messages */
  includeInfo?: boolean;
  /** Custom footer text */
  footerText?: string;
}

export interface ValidationReportData {
  options: ValidationReportOptions;
  validation: ValidationStatus;
  generatedAt: string;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<ValidationSeverity, { icon: string; color: string; bgColor: string }> = {
  error: { icon: '❌', color: '#DC2626', bgColor: '#FEE2E2' },
  warning: { icon: '⚠️', color: '#D97706', bgColor: '#FEF3C7' },
  info: { icon: 'ℹ️', color: '#2563EB', bgColor: '#DBEAFE' },
};

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  structure: 'XML/Folder Structure',
  pdf: 'PDF Specification',
  reference: 'Cross-Reference Integrity',
  checksum: 'File Checksum',
  metadata: 'Metadata Completeness',
  regional: 'Regional Requirements',
  business: 'Business Logic',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function groupIssuesByCategory(issues: ValidationIssue[]): Map<ValidationCategory, ValidationIssue[]> {
  const grouped = new Map<ValidationCategory, ValidationIssue[]>();
  
  for (const issue of issues) {
    const existing = grouped.get(issue.category) || [];
    existing.push(issue);
    grouped.set(issue.category, existing);
  }
  
  return grouped;
}

// -----------------------------------------------------------------------------
// REPORT GENERATION
// -----------------------------------------------------------------------------

/**
 * Generate an HTML validation report
 */
export function generateValidationReportHTML(data: ValidationReportData): string {
  const { options, validation, generatedAt } = data;
  
  // Filter issues based on options
  let issues = [...validation.issues];
  
  if (!options.includeResolved) {
    issues = issues.filter(i => !i.isResolved);
  }
  
  if (!options.includeWaived) {
    issues = issues.filter(i => !i.isWaived);
  }
  
  if (!options.includeInfo) {
    issues = issues.filter(i => i.severity !== 'info');
  }
  
  const groupedIssues = groupIssuesByCategory(issues);
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1F2937;
      background: #fff;
      padding: 40px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #E5E7EB;
    }
    
    .header-left h1 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    
    .header-left .subtitle {
      color: #6B7280;
      font-size: 13px;
    }
    
    .header-right {
      text-align: right;
      color: #6B7280;
      font-size: 11px;
    }
    
    .summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    
    .summary-card {
      flex: 1;
      min-width: 120px;
      padding: 16px;
      border-radius: 8px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
    }
    
    .summary-card.error { background: #FEE2E2; border-color: #FECACA; }
    .summary-card.warning { background: #FEF3C7; border-color: #FDE68A; }
    .summary-card.info { background: #DBEAFE; border-color: #BFDBFE; }
    .summary-card.success { background: #D1FAE5; border-color: #A7F3D0; }
    
    .summary-card .label {
      font-size: 11px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .summary-card .value {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
    }
    
    .summary-card.error .value { color: #DC2626; }
    .summary-card.warning .value { color: #D97706; }
    .summary-card.info .value { color: #2563EB; }
    .summary-card.success .value { color: #059669; }
    
    .progress-bar {
      height: 8px;
      background: #E5E7EB;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .progress-bar .fill {
      height: 100%;
      background: #10B981;
      transition: width 0.3s ease;
    }
    
    .section {
      margin-bottom: 24px;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
    }
    
    .section-header h2 {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }
    
    .section-header .count {
      font-size: 11px;
      padding: 2px 8px;
      background: #F3F4F6;
      border-radius: 10px;
      color: #6B7280;
    }
    
    .issue {
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      border-left: 4px solid;
    }
    
    .issue.error { background: #FEF2F2; border-left-color: #DC2626; }
    .issue.warning { background: #FFFBEB; border-left-color: #D97706; }
    .issue.info { background: #EFF6FF; border-left-color: #2563EB; }
    
    .issue-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 6px;
    }
    
    .issue-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .issue-title {
      font-weight: 500;
      color: #111827;
      flex: 1;
    }
    
    .issue-id {
      font-size: 10px;
      color: #9CA3AF;
      font-family: monospace;
    }
    
    .issue-message {
      color: #4B5563;
      margin-left: 22px;
      margin-bottom: 6px;
    }
    
    .issue-details {
      font-size: 11px;
      color: #6B7280;
      margin-left: 22px;
    }
    
    .issue-details .path {
      font-family: monospace;
      background: #F3F4F6;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      margin-top: 4px;
    }
    
    .issue-resolution {
      margin-top: 8px;
      margin-left: 22px;
      padding: 8px;
      background: #D1FAE5;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .issue-waiver {
      margin-top: 8px;
      margin-left: 22px;
      padding: 8px;
      background: #FEF3C7;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .no-issues {
      text-align: center;
      padding: 32px;
      color: #059669;
      background: #D1FAE5;
      border-radius: 8px;
    }
    
    .no-issues .icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      color: #9CA3AF;
      font-size: 10px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .issue {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${escapeHtml(options.title)}</h1>
      <div class="subtitle">
        Application: ${escapeHtml(options.applicationNumber)} | 
        Sequence: ${escapeHtml(options.sequenceNumber)} | 
        Region: ${escapeHtml(options.region)}
        ${options.sponsorName ? ` | Sponsor: ${escapeHtml(options.sponsorName)}` : ''}
      </div>
    </div>
    <div class="header-right">
      <div>Report Generated: ${formatDate(generatedAt)}</div>
      <div>Validation Run: ${formatDate(validation.lastRun)}</div>
    </div>
  </div>
  
  <div class="summary">
    <div class="summary-card error">
      <div class="label">Errors</div>
      <div class="value">${errorCount}</div>
    </div>
    <div class="summary-card warning">
      <div class="label">Warnings</div>
      <div class="value">${warningCount}</div>
    </div>
    <div class="summary-card info">
      <div class="label">Info</div>
      <div class="value">${infoCount}</div>
    </div>
    <div class="summary-card success">
      <div class="label">Completeness</div>
      <div class="value">${validation.completeness}%</div>
      <div class="progress-bar">
        <div class="fill" style="width: ${validation.completeness}%"></div>
      </div>
    </div>
  </div>
  
  ${issues.length === 0 ? `
  <div class="no-issues">
    <div class="icon">✅</div>
    <div>No validation issues found. Submission is ready for publishing.</div>
  </div>
  ` : Array.from(groupedIssues.entries()).map(([category, categoryIssues]) => `
  <div class="section">
    <div class="section-header">
      <h2>${CATEGORY_LABELS[category] || category}</h2>
      <span class="count">${categoryIssues.length} issue${categoryIssues.length !== 1 ? 's' : ''}</span>
    </div>
    ${categoryIssues.map(issue => `
    <div class="issue ${issue.severity}">
      <div class="issue-header">
        <span class="issue-icon">${SEVERITY_CONFIG[issue.severity].icon}</span>
        <span class="issue-title">${escapeHtml(issue.ruleName)}</span>
        <span class="issue-id">${escapeHtml(issue.ruleId)}</span>
      </div>
      <div class="issue-message">${escapeHtml(issue.message)}</div>
      ${issue.details ? `<div class="issue-details">${escapeHtml(issue.details)}</div>` : ''}
      ${issue.documentPath ? `
      <div class="issue-details">
        <span class="path">${escapeHtml(issue.documentPath)}</span>
      </div>
      ` : ''}
      ${issue.isResolved ? `
      <div class="issue-resolution">
        <strong>✓ Resolved</strong> ${issue.resolvedAt ? `on ${formatDate(issue.resolvedAt)}` : ''}
        ${issue.resolvedBy ? `by ${escapeHtml(issue.resolvedBy)}` : ''}
        ${issue.resolution ? `<br>${escapeHtml(issue.resolution)}` : ''}
      </div>
      ` : ''}
      ${issue.isWaived ? `
      <div class="issue-waiver">
        <strong>⚠ Waived</strong> ${issue.waivedAt ? `on ${formatDate(issue.waivedAt)}` : ''}
        ${issue.waivedBy ? `by ${escapeHtml(issue.waivedBy)}` : ''}
        ${issue.waiverJustification ? `<br>Justification: ${escapeHtml(issue.waiverJustification)}` : ''}
      </div>
      ` : ''}
    </div>
    `).join('')}
  </div>
  `).join('')}
  
  <div class="footer">
    <div>${options.footerText || 'Ligature IDOP - eCTD Publishing Module'}</div>
    <div>Page 1 of 1</div>
  </div>
</body>
</html>`;
}

/**
 * Download validation report as HTML file
 */
export function downloadValidationReport(
  data: ValidationReportData,
  filename?: string
): void {
  const html = generateValidationReportHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `validation-report-${data.options.sequenceNumber}-${Date.now()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open validation report in new window for printing
 */
export function printValidationReport(data: ValidationReportData): void {
  const html = generateValidationReportHTML(data);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Generate validation report data from store state
 */
export function createValidationReportData(
  validation: ValidationStatus,
  options: ValidationReportOptions
): ValidationReportData {
  return {
    options,
    validation,
    generatedAt: new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------

export type {
  ValidationReportOptions as ReportOptions,
  ValidationReportData as ReportData,
};
