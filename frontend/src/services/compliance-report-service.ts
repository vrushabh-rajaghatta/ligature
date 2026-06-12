
/**
 * Compliance Report Service - 21 CFR Part 11 Audit Reports
 * 
 * Generates compliance reports for regulatory audits including:
 * - Signature summary reports
 * - Unsigned critical action alerts
 * - Timeline reconstructions
 * - User activity reports
 * - Change justification summaries
 */

import { 
  auditService, 
  AuditEntry, 
  AuditCategory, 
  AuditSeverity,
  ChangeReasonCode,
} from './audit-service';
import { currentUser } from '@/data/users-data';

// Local type matching audit-service signature meaning
type SignatureMeaning = 'approval' | 'review' | 'authorship' | 'witness';

// ============================================================================
// TYPES
// ============================================================================

export interface ComplianceReportConfig {
  title: string;
  dateFrom?: Date;
  dateTo?: Date;
  categories?: AuditCategory[];
  includeSignatures?: boolean;
  includeUnsignedCritical?: boolean;
  includeChangeJustifications?: boolean;
  targetType?: string;
  targetId?: string;
  correlationId?: string;
}

export interface SignatureSummary {
  totalSignatures: number;
  byMeaning: Record<SignatureMeaning, number>;
  byUser: Array<{
    userId: string;
    userName: string;
    role: string;
    signatureCount: number;
    meanings: SignatureMeaning[];
  }>;
  recentSignatures: Array<{
    entryId: string;
    signedAt: Date;
    signedBy: string;
    role: string;
    meaning: SignatureMeaning;
    reason?: string;
    targetName: string;
    action: string;
  }>;
}

export interface UnsignedCriticalAlert {
  entryId: string;
  timestamp: Date;
  category: AuditCategory;
  action: string;
  summary: string;
  actor: string;
  targetName: string;
  riskLevel: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface ChangeJustificationSummary {
  totalChanges: number;
  byReasonCode: Record<ChangeReasonCode, number>;
  changesWithoutReason: number;
  recentChanges: Array<{
    entryId: string;
    timestamp: Date;
    action: string;
    summary: string;
    reasonCode?: ChangeReasonCode;
    reasonText?: string;
    changedFields: string[];
  }>;
}

export interface UserActivitySummary {
  userId: string;
  userName: string;
  role: string;
  totalActions: number;
  criticalActions: number;
  signedActions: number;
  actionsByCategory: Record<AuditCategory, number>;
  recentActivity: Array<{
    timestamp: Date;
    action: string;
    summary: string;
    signed: boolean;
  }>;
  firstActivity?: Date;
  lastActivity?: Date;
}

export interface ComplianceReport {
  id: string;
  title: string;
  generatedAt: Date;
  generatedBy: {
    userId: string;
    userName: string;
    role: string;
  };
  config: ComplianceReportConfig;
  dateRange: {
    from: Date;
    to: Date;
  };
  summary: {
    totalEntries: number;
    criticalEntries: number;
    warningEntries: number;
    signedEntries: number;
    unsignedCritical: number;
    categoriesIncluded: AuditCategory[];
    complianceScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high';
  };
  signatureSummary?: SignatureSummary;
  unsignedCriticalAlerts?: UnsignedCriticalAlert[];
  changeJustifications?: ChangeJustificationSummary;
  userActivities?: UserActivitySummary[];
  timeline?: TimelineEvent[];
  recommendations: string[];
}

export interface TimelineEvent {
  timestamp: Date;
  entryId: string;
  category: AuditCategory;
  action: string;
  summary: string;
  actor: string;
  hasSigning: boolean;
  severity: AuditSeverity;
}

export type ReportFormat = 'json' | 'html' | 'pdf-ready';

// ============================================================================
// COMPLIANCE REPORT SERVICE
// ============================================================================

class ComplianceReportService {
  /**
   * Generate a compliance report
   */
  generateReport(config: ComplianceReportConfig): ComplianceReport {
    const now = new Date();
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Get filtered entries
    const filter = {
      categories: config.categories,
      dateFrom: config.dateFrom,
      dateTo: config.dateTo,
      targetType: config.targetType,
      targetId: config.targetId,
    };
    
    let entries = config.correlationId 
      ? auditService.getByCorrelationId(config.correlationId)
      : auditService.filter(filter);

    // Calculate date range
    const dateRange = {
      from: config.dateFrom || (entries.length > 0 ? entries[entries.length - 1].timestamp : now),
      to: config.dateTo || now,
    };

    // Calculate summary statistics
    const criticalEntries = entries.filter(e => e.severity === 'critical');
    const warningEntries = entries.filter(e => e.severity === 'warning');
    const signedEntries = entries.filter(e => e.electronicSignature);
    const unsignedCritical = criticalEntries.filter(e => !e.electronicSignature);
    
    const categoriesIncluded = Array.from(new Set(entries.map(e => e.category)));
    
    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(entries, criticalEntries, signedEntries, unsignedCritical);
    const riskLevel = complianceScore >= 90 ? 'low' : complianceScore >= 70 ? 'medium' : 'high';

    // Build report sections
    const report: ComplianceReport = {
      id: reportId,
      title: config.title,
      generatedAt: now,
      generatedBy: {
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
      },
      config,
      dateRange,
      summary: {
        totalEntries: entries.length,
        criticalEntries: criticalEntries.length,
        warningEntries: warningEntries.length,
        signedEntries: signedEntries.length,
        unsignedCritical: unsignedCritical.length,
        categoriesIncluded,
        complianceScore,
        riskLevel,
      },
      recommendations: [],
    };

    // Add optional sections
    if (config.includeSignatures) {
      report.signatureSummary = this.buildSignatureSummary(entries);
    }

    if (config.includeUnsignedCritical) {
      report.unsignedCriticalAlerts = this.buildUnsignedCriticalAlerts(unsignedCritical);
    }

    if (config.includeChangeJustifications) {
      report.changeJustifications = this.buildChangeJustifications(entries);
    }

    // Always include timeline
    report.timeline = this.buildTimeline(entries);

    // Build user activities
    report.userActivities = this.buildUserActivities(entries);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * Calculate compliance score (0-100)
   */
  private calculateComplianceScore(
    entries: AuditEntry[],
    critical: AuditEntry[],
    signed: AuditEntry[],
    unsignedCritical: AuditEntry[]
  ): number {
    if (entries.length === 0) return 100;

    let score = 100;

    // Penalize unsigned critical actions heavily
    const unsignedCriticalPenalty = Math.min(unsignedCritical.length * 10, 40);
    score -= unsignedCriticalPenalty;

    // Check signature rate for critical actions
    const criticalSignatureRate = critical.length > 0 
      ? (critical.filter(e => e.electronicSignature).length / critical.length) * 100 
      : 100;
    if (criticalSignatureRate < 100) {
      score -= Math.min((100 - criticalSignatureRate) / 5, 20);
    }

    // Check for entries without proper change reasons
    const entriesWithChanges = entries.filter(e => e.changes && e.changes.length > 0);
    const entriesWithReason = entriesWithChanges.filter(e => e.reasonCode);
    if (entriesWithChanges.length > 0) {
      const reasonRate = (entriesWithReason.length / entriesWithChanges.length) * 100;
      if (reasonRate < 100) {
        score -= Math.min((100 - reasonRate) / 10, 15);
      }
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Build signature summary section
   */
  private buildSignatureSummary(entries: AuditEntry[]): SignatureSummary {
    const signedEntries = entries.filter(e => e.electronicSignature);
    
    const byMeaning: Record<SignatureMeaning, number> = {
      approval: 0,
      review: 0,
      authorship: 0,
      witness: 0,
    };

    const userMap = new Map<string, {
      userId: string;
      userName: string;
      role: string;
      signatureCount: number;
      meanings: Set<SignatureMeaning>;
    }>();

    signedEntries.forEach(entry => {
      const sig = entry.electronicSignature!;
      byMeaning[sig.signatureMeaning]++;

      const existing = userMap.get(sig.signedBy.userId);
      if (existing) {
        existing.signatureCount++;
        existing.meanings.add(sig.signatureMeaning);
      } else {
        userMap.set(sig.signedBy.userId, {
          userId: sig.signedBy.userId,
          userName: sig.signedBy.userName,
          role: sig.signedBy.role,
          signatureCount: 1,
          meanings: new Set([sig.signatureMeaning]),
        });
      }
    });

    const byUser = Array.from(userMap.values())
      .map(u => ({
        ...u,
        meanings: Array.from(u.meanings),
      }))
      .sort((a, b) => b.signatureCount - a.signatureCount);

    const recentSignatures = signedEntries
      .slice(0, 20)
      .map(e => ({
        entryId: e.id,
        signedAt: e.electronicSignature!.signedAt,
        signedBy: e.electronicSignature!.signedBy.userName,
        role: e.electronicSignature!.signedBy.role,
        meaning: e.electronicSignature!.signatureMeaning,
        reason: e.electronicSignature!.signatureReason,
        targetName: e.target.name,
        action: e.action,
      }));

    return {
      totalSignatures: signedEntries.length,
      byMeaning,
      byUser,
      recentSignatures,
    };
  }

  /**
   * Build unsigned critical alerts
   */
  private buildUnsignedCriticalAlerts(unsignedCritical: AuditEntry[]): UnsignedCriticalAlert[] {
    return unsignedCritical.map(entry => {
      const riskLevel = this.assessRiskLevel(entry);
      return {
        entryId: entry.id,
        timestamp: entry.timestamp,
        category: entry.category,
        action: entry.action,
        summary: entry.summary,
        actor: entry.actor.userName,
        targetName: entry.target.name,
        riskLevel,
        recommendation: this.getRecommendation(entry, riskLevel),
      };
    });
  }

  /**
   * Assess risk level for unsigned critical action
   */
  private assessRiskLevel(entry: AuditEntry): 'high' | 'medium' | 'low' {
    // High risk: submission, approval, release actions
    const highRiskActions = ['submitted', 'approved', 'released', 'finalized'];
    if (highRiskActions.some(a => entry.action.includes(a))) {
      return 'high';
    }

    // Medium risk: safety, CMC critical
    if (entry.category === 'safety' || entry.category === 'cmc') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get recommendation for unsigned action
   */
  private getRecommendation(entry: AuditEntry, riskLevel: 'high' | 'medium' | 'low'): string {
    if (riskLevel === 'high') {
      return `Critical action "${entry.action}" requires immediate review and retrospective signature by authorized personnel.`;
    }
    if (riskLevel === 'medium') {
      return `Action "${entry.action}" should be reviewed during next compliance check.`;
    }
    return `Document reason for unsigned action in compliance notes.`;
  }

  /**
   * Build change justification summary
   */
  private buildChangeJustifications(entries: AuditEntry[]): ChangeJustificationSummary {
    const entriesWithChanges = entries.filter(e => e.changes && e.changes.length > 0);
    
    const byReasonCode: Record<ChangeReasonCode, number> = {
      correction: 0,
      amendment: 0,
      update: 0,
      regulatory: 0,
      safety: 0,
      quality: 0,
      process: 0,
      'user-request': 0,
      system: 0,
      migration: 0,
      other: 0,
    };

    let changesWithoutReason = 0;

    entriesWithChanges.forEach(entry => {
      if (entry.reasonCode) {
        byReasonCode[entry.reasonCode]++;
      } else {
        changesWithoutReason++;
      }
    });

    const recentChanges = entriesWithChanges
      .slice(0, 20)
      .map(e => ({
        entryId: e.id,
        timestamp: e.timestamp,
        action: e.action,
        summary: e.summary,
        reasonCode: e.reasonCode,
        reasonText: e.reasonJustification,
        changedFields: e.changes?.map(c => c.field) || [],
      }));

    return {
      totalChanges: entriesWithChanges.length,
      byReasonCode,
      changesWithoutReason,
      recentChanges,
    };
  }

  /**
   * Build timeline of events
   */
  private buildTimeline(entries: AuditEntry[]): TimelineEvent[] {
    return entries.map(e => ({
      timestamp: e.timestamp,
      entryId: e.id,
      category: e.category,
      action: e.action,
      summary: e.summary,
      actor: e.actor.userName,
      hasSigning: !!e.electronicSignature,
      severity: e.severity,
    }));
  }

  /**
   * Build user activity summaries
   */
  private buildUserActivities(entries: AuditEntry[]): UserActivitySummary[] {
    const userMap = new Map<string, {
      userId: string;
      userName: string;
      role: string;
      entries: AuditEntry[];
    }>();

    entries.forEach(entry => {
      const existing = userMap.get(entry.actor.userId);
      if (existing) {
        existing.entries.push(entry);
      } else {
        userMap.set(entry.actor.userId, {
          userId: entry.actor.userId,
          userName: entry.actor.userName,
          role: entry.actor.role,
          entries: [entry],
        });
      }
    });

    return Array.from(userMap.values()).map(user => {
      const actionsByCategory: Record<AuditCategory, number> = {
        authoring: 0,
        submissions: 0,
        publishing: 0,
        safety: 0,
        cmc: 0,
        clinical: 0,
        portfolio: 0,
        system: 0,
        workflow: 0,
      };

      user.entries.forEach(e => {
        actionsByCategory[e.category]++;
      });

      const sortedEntries = [...user.entries].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      return {
        userId: user.userId,
        userName: user.userName,
        role: user.role,
        totalActions: user.entries.length,
        criticalActions: user.entries.filter(e => e.severity === 'critical').length,
        signedActions: user.entries.filter(e => e.electronicSignature).length,
        actionsByCategory,
        recentActivity: sortedEntries.slice(0, 10).map(e => ({
          timestamp: e.timestamp,
          action: e.action,
          summary: e.summary,
          signed: !!e.electronicSignature,
        })),
        firstActivity: sortedEntries.length > 0 
          ? sortedEntries[sortedEntries.length - 1].timestamp 
          : undefined,
        lastActivity: sortedEntries.length > 0 
          ? sortedEntries[0].timestamp 
          : undefined,
      };
    }).sort((a, b) => b.totalActions - a.totalActions);
  }

  /**
   * Generate recommendations based on report findings
   */
  private generateRecommendations(report: ComplianceReport): string[] {
    const recommendations: string[] = [];

    // Unsigned critical actions
    if (report.summary.unsignedCritical > 0) {
      recommendations.push(
        `${report.summary.unsignedCritical} critical action(s) lack electronic signatures. ` +
        `Review and apply retrospective signatures where appropriate.`
      );
    }

    // Compliance score
    if (report.summary.complianceScore < 90) {
      recommendations.push(
        `Compliance score is ${report.summary.complianceScore}%. ` +
        `Target score should be 90% or higher for regulatory readiness.`
      );
    }

    // Change justifications
    if (report.changeJustifications && report.changeJustifications.changesWithoutReason > 0) {
      recommendations.push(
        `${report.changeJustifications.changesWithoutReason} change(s) lack documented reason codes. ` +
        `Ensure all modifications include justification per SOP.`
      );
    }

    // Signature coverage
    if (report.signatureSummary) {
      const signatureRate = report.summary.totalEntries > 0
        ? (report.signatureSummary.totalSignatures / report.summary.totalEntries) * 100
        : 100;
      
      if (signatureRate < 50 && report.summary.criticalEntries > 0) {
        recommendations.push(
          `Electronic signature coverage is ${signatureRate.toFixed(1)}%. ` +
          `Consider expanding signature requirements for high-risk operations.`
        );
      }
    }

    // Good standing
    if (recommendations.length === 0) {
      recommendations.push(
        `Audit trail compliance is in good standing. Continue monitoring for ongoing compliance.`
      );
    }

    return recommendations;
  }

  /**
   * Export report in specified format
   */
  export(report: ComplianceReport, format: ReportFormat = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, (key, value) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        }, 2);

      case 'html':
        return this.generateHTMLReport(report);

      case 'pdf-ready':
        return this.generatePDFReadyHTML(report);

      default:
        return this.export(report, 'json');
    }
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(report: ComplianceReport): string {
    const riskColors = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#ef4444',
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: white; padding: 24px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { margin: 0 0 8px 0; color: #1e293b; }
    .header .meta { color: #64748b; font-size: 14px; }
    .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h2 { margin: 0 0 16px 0; color: #334155; font-size: 18px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .stat { text-align: center; padding: 16px; background: #f8fafc; border-radius: 6px; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .score { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 9999px; font-weight: 600; }
    .score.low { background: #dcfce7; color: #166534; }
    .score.medium { background: #fef3c7; color: #92400e; }
    .score.high { background: #fee2e2; color: #991b1b; }
    .alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 8px; }
    .alert.high { background: #fee2e2; border-left: 4px solid #ef4444; }
    .alert.medium { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .alert.low { background: #f0f9ff; border-left: 4px solid #0ea5e9; }
    .recommendation { padding: 12px 16px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 6px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .badge.signed { background: #dcfce7; color: #166534; }
    .badge.critical { background: #fee2e2; color: #991b1b; }
    .badge.warning { background: #fef3c7; color: #92400e; }
    .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${report.title}</h1>
      <div class="meta">
        Generated: ${report.generatedAt.toLocaleString()} by ${report.generatedBy.userName} (${report.generatedBy.role})<br>
        Report ID: ${report.id}<br>
        Date Range: ${report.dateRange.from.toLocaleDateString()} - ${report.dateRange.to.toLocaleDateString()}
      </div>
    </div>

    <div class="card">
      <h2>Compliance Summary</h2>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <span class="score ${report.summary.riskLevel}">
            Score: ${report.summary.complianceScore}% (${report.summary.riskLevel.toUpperCase()} RISK)
          </span>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${report.summary.totalEntries}</div>
          <div class="stat-label">Total Entries</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #ef4444;">${report.summary.criticalEntries}</div>
          <div class="stat-label">Critical</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #22c55e;">${report.summary.signedEntries}</div>
          <div class="stat-label">Signed</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: ${report.summary.unsignedCritical > 0 ? '#ef4444' : '#22c55e'};">${report.summary.unsignedCritical}</div>
          <div class="stat-label">Unsigned Critical</div>
        </div>
      </div>
    </div>

    ${report.recommendations.length > 0 ? `
    <div class="card">
      <h2>Recommendations</h2>
      ${report.recommendations.map(r => `<div class="recommendation">${r}</div>`).join('')}
    </div>
    ` : ''}

    ${report.unsignedCriticalAlerts && report.unsignedCriticalAlerts.length > 0 ? `
    <div class="card">
      <h2>Unsigned Critical Actions (${report.unsignedCriticalAlerts.length})</h2>
      ${report.unsignedCriticalAlerts.map(alert => `
        <div class="alert ${alert.riskLevel}">
          <strong>${alert.action}</strong> - ${alert.summary}<br>
          <small>By ${alert.actor} on ${alert.timestamp.toLocaleString()} | Target: ${alert.targetName}</small><br>
          <em>${alert.recommendation}</em>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${report.signatureSummary ? `
    <div class="card">
      <h2>Electronic Signatures (${report.signatureSummary.totalSignatures})</h2>
      <div class="stats-grid" style="margin-bottom: 20px;">
        <div class="stat">
          <div class="stat-value">${report.signatureSummary.byMeaning.approval}</div>
          <div class="stat-label">Approvals</div>
        </div>
        <div class="stat">
          <div class="stat-value">${report.signatureSummary.byMeaning.review}</div>
          <div class="stat-label">Reviews</div>
        </div>
        <div class="stat">
          <div class="stat-value">${report.signatureSummary.byMeaning.authorship}</div>
          <div class="stat-label">Authorship</div>
        </div>
        <div class="stat">
          <div class="stat-value">${report.signatureSummary.byMeaning.witness}</div>
          <div class="stat-label">Witness</div>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>User</th><th>Role</th><th>Signatures</th><th>Types</th></tr>
        </thead>
        <tbody>
          ${report.signatureSummary.byUser.slice(0, 10).map(u => `
            <tr>
              <td>${u.userName}</td>
              <td>${u.role}</td>
              <td>${u.signatureCount}</td>
              <td>${u.meanings.join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${report.timeline && report.timeline.length > 0 ? `
    <div class="card">
      <h2>Activity Timeline (Recent ${Math.min(report.timeline.length, 50)} Events)</h2>
      <table>
        <thead>
          <tr><th>Time</th><th>Category</th><th>Action</th><th>Actor</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${report.timeline.slice(0, 50).map(e => `
            <tr>
              <td>${e.timestamp.toLocaleString()}</td>
              <td>${e.category}</td>
              <td>${e.summary}</td>
              <td>${e.actor}</td>
              <td>
                ${e.hasSigning ? '<span class="badge signed">Signed</span>' : ''}
                ${e.severity === 'critical' ? '<span class="badge critical">Critical</span>' : ''}
                ${e.severity === 'warning' ? '<span class="badge warning">Warning</span>' : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      This report was generated by Ligature Compliance Report Service<br>
      21 CFR Part 11 compliant audit trail documentation
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate PDF-ready HTML (with print styles)
   */
  private generatePDFReadyHTML(report: ComplianceReport): string {
    const html = this.generateHTMLReport(report);
    // Add print-specific styles
    return html.replace('</style>', `
    @media print {
      body { padding: 0; background: white; }
      .card { box-shadow: none; border: 1px solid #e2e8f0; page-break-inside: avoid; }
      .header { box-shadow: none; border: 1px solid #e2e8f0; }
    }
    @page { margin: 1cm; }
    </style>`);
  }

  /**
   * Generate quick summary report
   */
  generateQuickSummary(days: number = 7): ComplianceReport {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return this.generateReport({
      title: `${days}-Day Compliance Summary`,
      dateFrom,
      includeSignatures: true,
      includeUnsignedCritical: true,
      includeChangeJustifications: true,
    });
  }

  /**
   * Generate submission-specific report
   */
  generateSubmissionReport(
    applicationId: string,
    applicationName: string,
    sequenceId?: string
  ): ComplianceReport {
    return this.generateReport({
      title: `Compliance Report: ${applicationName}${sequenceId ? ` (Seq ${sequenceId})` : ''}`,
      targetType: 'submission',
      targetId: sequenceId || applicationId,
      includeSignatures: true,
      includeUnsignedCritical: true,
      includeChangeJustifications: true,
    });
  }

  /**
   * Generate workflow execution report
   */
  generateWorkflowReport(correlationId: string, workflowName: string): ComplianceReport {
    return this.generateReport({
      title: `Workflow Compliance Report: ${workflowName}`,
      correlationId,
      includeSignatures: true,
      includeUnsignedCritical: true,
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const complianceReportService = new ComplianceReportService();
export { ComplianceReportService };
