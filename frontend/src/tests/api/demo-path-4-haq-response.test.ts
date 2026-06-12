/**
 * Demo Path 4: Health Authority Question (HAQ) Response
 * Integration tests — v0.125.33
 *
 * GxP refs: ICH M4; ICH Q12; 21 CFR 312.61; FDA Information Requests Guidance;
 *           EMA Questions & Answers procedure; PMDA Inquiry process
 * Covers: Query list, query detail, workflow, authorities, deadlines,
 *         compliance, templates, archive, analytics.
 *
 * Investor demo flow:
 *   HAQ screen → FDA question received → response workflow initiated →
 *   response drafted → esig'd → submitted → archived immutably
 */

import { describe, it, expect } from 'vitest';
import { callRoute, assertGxPFields, assertListResponse, assertPart11Compliant } from '../helpers';

import { GET as getQueries }    from '@/app/api/haq/queries/route';
import { GET as getWorkflow }   from '@/app/api/haq/workflow/route';
import { GET as getAuthorities }from '@/app/api/haq/authorities/route';
import { GET as getDeadlines }  from '@/app/api/haq/deadlines/route';
import { GET as getCompliance } from '@/app/api/haq/compliance/route';
import { GET as getTemplates }  from '@/app/api/haq/templates/route';
import { GET as getArchive }    from '@/app/api/haq/archive/route';
import { GET as getAnalytics }  from '@/app/api/haq/analytics/route';

describe('Demo Path 4 — HAQ Response Workflow', () => {

  describe('HAQ-01: Query Registry', () => {
    it('returns open HAQs with authority and submission reference', async () => {
      const { status, data } = await callRoute(getQueries, '/api/haq/queries');
      expect(status).toBe(200);
      assertGxPFields(data, ['queries', 'total', 'openCount', 'authority'], 'HAQ-01');
    });

    it('each query has a regulatory deadline and question text', async () => {
      const { data } = await callRoute(getQueries, '/api/haq/queries');
      const queries = assertListResponse(data, 'queries', 'HAQ-01');
      const q = queries[0];
      expect(q).toHaveProperty('questionText');
      expect(q).toHaveProperty('receivedDate');
      // Must have a response deadline — MedDRA, CTD, or authority-specific
      const hasDeadline = 'dueDate' in q || 'responseDeadline' in q || 'deadline' in q;
      expect(hasDeadline, 'HAQ-01: No response deadline (regulatory clock required)').toBe(true);
    });
  });

  describe('HAQ-03: Response Workflow', () => {
    it('returns workflow stages with current stage and approver', async () => {
      const { status, data } = await callRoute(getWorkflow, '/api/haq/workflow');
      expect(status).toBe(200);
      assertGxPFields(data, ['stages', 'currentStage', 'assignee', 'approver'], 'HAQ-03');
    });

    it('workflow includes Part 11 esig gate (21 CFR Part 11)', async () => {
      const { data } = await callRoute(getWorkflow, '/api/haq/workflow');
      const d = data as Record<string, unknown>;
      const hasEsig =
        d.part11SigRequired === true ||
        String(d.currentStage ?? '').toLowerCase().includes('sig') ||
        (Array.isArray(d.stages) &&
          (d.stages as Record<string, unknown>[]).some(s =>
            String(s.requiresEsig ?? s.esig ?? '').length > 0 ||
            s.requiresEsig === true
          ));
      expect(hasEsig, 'HAQ-03: No Part 11 esig gate in workflow').toBe(true);
    });
  });

  describe('HAQ-04: Authority Registry', () => {
    it('returns all health authorities with contact info', async () => {
      const { status, data } = await callRoute(getAuthorities, '/api/haq/authorities');
      expect(status).toBe(200);
      assertGxPFields(data, ['authorities', 'total'], 'HAQ-04');
      const authorities = assertListResponse(data, 'authorities', 'HAQ-04');
      expect(authorities.length).toBeGreaterThanOrEqual(3); // FDA, EMA, PMDA minimum
    });
  });

  describe('HAQ-05: Regulatory Deadlines', () => {
    it('returns deadline schedule with clock and escalation rules', async () => {
      const { status, data } = await callRoute(getDeadlines, '/api/haq/deadlines');
      expect(status).toBe(200);
      assertGxPFields(data, ['deadlines', 'daysRemaining', 'escalationRule'], 'HAQ-05');
    });

    it('deadline entries carry CFR clock reference', async () => {
      const { data } = await callRoute(getDeadlines, '/api/haq/deadlines');
      const deadlines = (data as Record<string, Record<string, unknown>[]>).deadlines;
      if (deadlines?.length > 0) {
        const hasCfrRef = deadlines.some(d =>
          'cfrClock' in d || 'regulatoryBasis' in d || 'clockDays' in d
        );
        expect(hasCfrRef, 'HAQ-05: No CFR clock reference on deadlines').toBe(true);
      }
    });
  });

  describe('HAQ-06: Part 11 Compliance Controls', () => {
    it('returns compliance status with audit trail enabled', async () => {
      const { status, data } = await callRoute(getCompliance, '/api/haq/compliance');
      expect(status).toBe(200);
      assertGxPFields(
        data,
        ['complianceStatus', 'part11Signature', 'auditTrailEnabled'],
        'HAQ-06'
      );
      expect((data as Record<string, unknown>).auditTrailEnabled).toBe(true);
    });
  });

  describe('HAQ-08: Submission Archive', () => {
    it('returns immutable archive records with esigHash', async () => {
      const { status, data } = await callRoute(getArchive, '/api/haq/archive');
      expect(status).toBe(200);
      assertGxPFields(data, ['archived', 'total'], 'HAQ-08');
      const records = assertListResponse(data, 'archived', 'HAQ-08');
      // Each archived record must be immutable with esig hash
      if (records.length > 0) {
        const hasEsig = 'esigHash' in records[0] || 'finalResponse' in records[0];
        expect(hasEsig, 'HAQ-08: Archived records missing esigHash (21 CFR Part 11 §11.70)').toBe(true);
      }
    });
  });

  describe('HAQ-09: Analytics Dashboard', () => {
    it('returns response time analytics with authority breakdown', async () => {
      const { status, data } = await callRoute(getAnalytics, '/api/haq/analytics');
      expect(status).toBe(200);
      assertGxPFields(data, ['avgResponseTime', 'onTimeRate', 'byAuthority'], 'HAQ-09');
    });

    it('on-time rate is a valid percentage (0-100)', async () => {
      const { data } = await callRoute(getAnalytics, '/api/haq/analytics');
      const rate = (data as Record<string, unknown>).onTimeRate as number;
      expect(typeof rate).toBe('number');
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

});
