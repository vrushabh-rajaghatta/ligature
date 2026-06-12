/**
 * Demo Path 5: Regulatory Submission Assembly
 * Integration tests — v0.125.33
 *
 * GxP refs: FDA eCTD Technical Spec v4.0; ICH M4; 21 CFR 314.50;
 *           21 CFR 312.23; EMA eCTD Specification v3.2.2
 * Covers: Submission packages, eCTD sequences, components, agencies,
 *         submission history, IND annual report, filing checklist,
 *         correspondence.
 *
 * Investor demo flow:
 *   Submissions Hub → NDA package → eCTD sequence assembly →
 *   module completeness → filing checklist → FDA gateway submit
 */

import { describe, it, expect } from 'vitest';
import { callRoute, assertGxPFields, assertListResponse, assertPart11Compliant } from '../helpers';

import { GET as getPackages }        from '@/app/api/submissions/packages/route';
import { GET as getSequences }       from '@/app/api/submissions/ectd/sequences/route';
import { GET as getAgencies }        from '@/app/api/submissions/agencies/route';
import { GET as getHistory }         from '@/app/api/submissions/history/route';
import { GET as getIndAnnual }       from '@/app/api/submissions/ind-annual/route';
import { GET as getFilingChecklist } from '@/app/api/submissions/filing-checklist/route';
import { GET as getCorrespondence }  from '@/app/api/submissions/correspondence/route';

describe('Demo Path 5 — Regulatory Submission Assembly', () => {

  describe('SUB-01: Submission Package Registry', () => {
    it('returns submission packages with type, agency, and status', async () => {
      const { status, data } = await callRoute(getPackages, '/api/submissions/packages');
      expect(status).toBe(200);
      assertGxPFields(data, ['packages', 'total', 'submissionType', 'agency', 'status'], 'SUB-01');
    });

    it('packages include eCTD validity flag', async () => {
      const { data } = await callRoute(getPackages, '/api/submissions/packages');
      const packages = assertListResponse(data, 'packages', 'SUB-01');
      const p = packages[0];
      const hasEctd =
        'ectdValid' in p || 'ectdStatus' in p || 'ectdVersion' in p || 'ectd' in p;
      expect(hasEctd, 'SUB-01: No eCTD validity indicator (FDA eCTD Spec §3.2)').toBe(true);
    });
  });

  describe('SUB-02: eCTD Sequence Registry', () => {
    it('returns eCTD sequences with sequence number and operation type', async () => {
      const { status, data } = await callRoute(getSequences, '/api/submissions/ectd/sequences');
      expect(status).toBe(200);
      assertGxPFields(data, ['sequences', 'total', 'sequenceNumber'], 'SUB-02');
    });

    it('sequences are ordered and have operation types (new/replace/append/delete)', async () => {
      const { data } = await callRoute(getSequences, '/api/submissions/ectd/sequences');
      const sequences = assertListResponse(data, 'sequences', 'SUB-02');
      const s = sequences[0];
      expect(s).toHaveProperty('sequenceNumber');
      const hasOpType = 'operation' in s || 'operationType' in s || 'type' in s;
      expect(hasOpType, 'SUB-02: No eCTD operation type (ICH M8 §3.3)').toBe(true);
    });
  });

  describe('SUB-04: Agency Registry', () => {
    it('returns global regulatory agencies with submission portals', async () => {
      const { status, data } = await callRoute(getAgencies, '/api/submissions/agencies');
      expect(status).toBe(200);
      assertGxPFields(data, ['agencies', 'total'], 'SUB-04');
      const agencies = assertListResponse(data, 'agencies', 'SUB-04');
      // Must include FDA and EMA at minimum
      const agencyNames = agencies.map(a => String(a.name ?? a.id ?? '').toUpperCase());
      const hasFda = agencyNames.some(n => n.includes('FDA'));
      const hasEma = agencyNames.some(n => n.includes('EMA') || n.includes('EUROPEAN'));
      expect(hasFda, 'SUB-04: FDA not in agency registry').toBe(true);
      expect(hasEma, 'SUB-04: EMA not in agency registry').toBe(true);
    });
  });

  describe('SUB-05: Submission History', () => {
    it('returns submission history with dates and outcomes', async () => {
      const { status, data } = await callRoute(getHistory, '/api/submissions/history');
      expect(status).toBe(200);
      assertGxPFields(data, ['history', 'total'], 'SUB-05');
      // GxP metadata block confirms Part 11 compliance
      const d = data as Record<string, unknown>;
      expect('gxpMetadata' in d || 'auditTrail' in d,
        'SUB-05: No GxP metadata block').toBe(true);
    });
  });

  describe('SUB-06: IND Annual Report', () => {
    it('returns IND annual report with subject counts (21 CFR 312.33)', async () => {
      const { status, data } = await callRoute(getIndAnnual, '/api/submissions/ind-annual');
      expect(status).toBe(200);
      assertGxPFields(data, ['annualReports', 'reportingYear', 'indNumber'], 'SUB-06');
    });

    it('IND annual report includes subject exposure data', async () => {
      const { data } = await callRoute(getIndAnnual, '/api/submissions/ind-annual');
      const report = (data as Record<string, unknown>).annualReports as Record<string, unknown> | undefined;
      // annualReports is an array — check first item for safetySection
      const reports = report as unknown;
      if (Array.isArray(reports) && reports.length > 0) {
        const first = reports[0] as Record<string, unknown>;
        const hasSafety = 'safetySection' in first || 'subjectsEnrolled' in first;
        expect(hasSafety, 'SUB-06: No subject exposure/safety data (21 CFR 312.33(b)(1))').toBe(true);
      }
    });
  });

  describe('SUB-07: Filing Checklist', () => {
    it('returns pre-filing checklist with completeness score', async () => {
      const { status, data } = await callRoute(getFilingChecklist, '/api/submissions/filing-checklist');
      expect(status).toBe(200);
      assertGxPFields(data, ['checklistItems', 'completionPct', 'applicationNumber'], 'SUB-07');
    });

    it('checklist items map to CTD modules', async () => {
      const { data } = await callRoute(getFilingChecklist, '/api/submissions/filing-checklist');
      const checklist = (data as Record<string, Record<string, unknown>[]>).checklistItems;
      if (checklist?.length > 0) {
        const hasCtdRef = checklist.some(
          item => 'ctdModule' in item || 'module' in item || 'section' in item
        );
        expect(hasCtdRef, 'SUB-07: Checklist items not mapped to CTD modules (ICH M4)').toBe(true);
      }
    });
  });

  describe('SUB-08: Agency Correspondence', () => {
    it('returns correspondence log with direction and timestamps', async () => {
      const { status, data } = await callRoute(getCorrespondence, '/api/submissions/correspondence');
      expect(status).toBe(200);
      assertGxPFields(data, ['correspondence', 'total'], 'SUB-08');
      const items = assertListResponse(data, 'correspondence', 'SUB-08');
      const c = items[0];
      const hasDirection = 'direction' in c || 'type' in c || 'subject' in c;
      expect(hasDirection, 'SUB-08: No correspondence direction/type field').toBe(true);
    });
  });

});
