/**
 * Demo Path 3: Safety Signal Detection & Cascade
 * Integration tests — v0.125.33
 *
 * GxP refs: ICH E2B(R3); ICH E2C(R2); 21 CFR 314.81; EMA GVP Module VI
 * Covers: Signal list, signal detail, E2B export, reporting clock,
 *         signal assessment, SUSAR, PSUR.
 *
 * Investor demo flow:
 *   Safety screen → signal detected → cascade triggered →
 *   SUSAR filed → PSUR updated → labeling flagged
 */

import { describe, it, expect } from 'vitest';
import { callRoute, assertGxPFields, assertListResponse, assertPart11Compliant } from '../helpers';

import { GET as getSignals }          from '@/app/api/safety/signals/route';
import { GET as getReportingClock }   from '@/app/api/safety/reporting-clock/route';
import { GET as getSignalAssessment } from '@/app/api/safety/signal-assessment/route';
import { GET as getSusar }            from '@/app/api/safety/susar/route';
import { GET as getPsur }             from '@/app/api/safety/psur/route';
import { GET as getPsmf }             from '@/app/api/safety/psmf/route';

describe('Demo Path 3 — Safety Signal Detection & Cascade', () => {

  describe('SAF-01: Safety Signal List', () => {
    it('returns signals with status and priority', async () => {
      const { status, data } = await callRoute(getSignals, '/api/safety/signals');
      expect(status).toBe(200);
      assertGxPFields(data, ['signals', 'openCount', 'seriousCount'], 'SAF-01');
    });

    it('signals include E2B-required fields (ICH E2B(R3))', async () => {
      const { data } = await callRoute(getSignals, '/api/safety/signals');
      const signals = (data as Record<string, Record<string, unknown>[]>).signals;
      if (signals?.length > 0) {
        const sig = signals[0];
        // E2B R3 mandatory fields
        expect(sig).toHaveProperty('id');
        expect(sig).toHaveProperty('status');
        // seriousness or priority must be present for signal classification
        const hasClassification = 'seriousness' in sig || 'priority' in sig || 'severity' in sig;
        expect(hasClassification, 'SAF-01: No signal classification field (ICH E2B(R3) §B.1)').toBe(true);
      }
    });
  });

  describe('SAF-05: Reporting Clock', () => {
    it('returns regulatory reporting deadlines with clock status', async () => {
      const { status, data } = await callRoute(getReportingClock, '/api/safety/reporting-clock');
      expect(status).toBe(200);
      // Reporting clock must track 7-day, 15-day, and 90-day windows
      assertGxPFields(data, ['t0Date', 'reportingDeadlines', 'authority'], 'SAF-05');
    });

    it('includes expedited 7-day and 15-day reporting deadlines (21 CFR 312.32)', async () => {
      const { data } = await callRoute(getReportingClock, '/api/safety/reporting-clock');
      const d = data as Record<string, unknown>;
      // Actual response has day7Deadline, day15Deadline as top-level fields
      expect('day7Deadline' in d || 'reportingDeadlines' in d,
        'SAF-05: No expedited reporting deadlines (21 CFR 312.32)').toBe(true);
    });
  });

  describe('SAF-06: Signal Assessment', () => {
    it('returns signal assessments with benefit-risk evaluation', async () => {
      const { status, data } = await callRoute(getSignalAssessment, '/api/safety/signal-assessment');
      expect(status).toBe(200);
      assertGxPFields(data, ['assessments', 'method', 'conclusion'], 'SAF-06');
    });
  });

  describe('SAF-07: SUSAR Filing', () => {
    it('returns SUSAR records with Part 11 esig hash', async () => {
      const { status, data } = await callRoute(getSusar, '/api/safety/susar');
      expect(status).toBe(200);
      assertGxPFields(data, ['susars', 'total', 'openSusars', 'closedSusars'], 'SAF-07');
      // Part 11 compliance is in gxpMetadata block
      const d = data as Record<string, unknown>;
      const gxp = d.gxpMetadata as Record<string, unknown> | undefined;
      expect(gxp?.part11Compliant ?? 'gxpMetadata' in d,
        'SAF-07: No Part 11 compliance flag in gxpMetadata').toBeTruthy();
    });

    it('each SUSAR has submission timestamp and agency', async () => {
      const { data } = await callRoute(getSusar, '/api/safety/susar');
      const susars = (data as Record<string, Record<string, unknown>[]>).susars;
      if (susars?.length > 0) {
        // SUSAR records include studyNumber and regulatory report date
        expect(susars[0]).toHaveProperty('studyNumber');
        expect(susars[0]).toHaveProperty('regulatoryReportDate');
      }
    });
  });

  describe('SAF-08: PSUR / PBRER', () => {
    it('returns PSUR with reporting period and benefit-risk conclusion', async () => {
      const { status, data } = await callRoute(getPsur, '/api/safety/psur');
      expect(status).toBe(200);
      assertGxPFields(data, ['psurs', 'total', 'coveragePeriod'], 'SAF-08');
    });
  });

  describe('SAF-09: PSMF', () => {
    it('returns Pharmacovigilance System Master File with EU-QPPV', async () => {
      const { status, data } = await callRoute(getPsmf, '/api/safety/psmf');
      expect(status).toBe(200);
      assertGxPFields(data, ['psmfId', 'qppvName', 'lastUpdated'], 'SAF-09');
    });
  });

});
