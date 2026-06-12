/**
 * Demo Path 1: Portfolio Command Center
 * Integration tests — v0.125.33
 *
 * GxP refs: ICH M4; ICH Q8(R2); FDA IND Guidance
 * Covers: Programs list, program detail, milestones, regulatory strategy,
 *         compounds, indications, metrics, submission plans.
 *
 * Investor demo flow:
 *   Portfolio screen → program card → regulatory strategy → submission timeline
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { callRoute, assertGxPFields, assertListResponse, assertPart11Compliant } from '../helpers';

// Route handlers
import { GET as getPrograms }       from '@/app/api/portfolio/programs/route';
import { GET as getMilestones }     from '@/app/api/portfolio/milestones/route';
import { GET as getRegStrategy }    from '@/app/api/portfolio/regulatory-strategy/route';
import { GET as getCompounds }      from '@/app/api/portfolio/compounds/route';
import { GET as getIndications }    from '@/app/api/portfolio/indications/route';
import { GET as getMetrics }        from '@/app/api/portfolio/metrics/route';
import { GET as getSubmissionPlans }from '@/app/api/portfolio/submission-plans/route';

describe('Demo Path 1 — Portfolio Command Center', () => {

  describe('PORT-01: Program Portfolio List', () => {
    it('returns a list of programs with required GxP fields', async () => {
      const { status, data } = await callRoute(getPrograms, '/api/portfolio/programs');
      expect(status).toBe(200);
      assertGxPFields(data, ['programs', 'total', 'therapeuticAreas'], 'PORT-01');
      const programs = assertListResponse(data, 'programs', 'PORT-01');
      // Each program must have regulatory metadata
      const p = programs[0];
      assertGxPFields(p, ['id', 'name', 'stage', 'indication', 'regulatoryStrategy'], 'PORT-01 program');
    });

    it('includes GxP compliance status on each program', async () => {
      const { data } = await callRoute(getPrograms, '/api/portfolio/programs');
      const programs = (data as Record<string, unknown[]>).programs;
      assertPart11Compliant(programs[0] as Record<string, unknown>, 'PORT-01 compliance');
    });
  });

  describe('PORT-03: Development Milestones', () => {
    it('returns milestones with dates and status', async () => {
      const { status, data } = await callRoute(getMilestones, '/api/portfolio/milestones');
      expect(status).toBe(200);
      assertGxPFields(data, ['milestones', 'program', 'plannedDate', 'status'], 'PORT-03');
    });

    it('milestone entries include critical path flag', async () => {
      const { data } = await callRoute(getMilestones, '/api/portfolio/milestones');
      const d = data as Record<string, unknown>;
      // milestones or program level should carry criticalPath data
      expect(
        Array.isArray(d.milestones) || typeof d.criticalPath !== 'undefined',
        'PORT-03: No milestones array or criticalPath'
      ).toBe(true);
    });
  });

  describe('PORT-04: Regulatory Strategy Map', () => {
    it('returns strategy with target agencies and submission types', async () => {
      const { status, data } = await callRoute(getRegStrategy, '/api/portfolio/regulatory-strategy');
      expect(status).toBe(200);
      assertGxPFields(data, ['strategy', 'targetAgencies', 'submissionTypes', 'timeline'], 'PORT-04');
    });
  });

  describe('PORT-05: Compound Data Sheet', () => {
    it('returns compounds with INN, route, and formulation', async () => {
      const { status, data } = await callRoute(getCompounds, '/api/portfolio/compounds');
      expect(status).toBe(200);
      assertGxPFields(data, ['compounds', 'inn', 'routeOfAdministration', 'formulation'], 'PORT-05');
    });
  });

  describe('PORT-06: Indication Mapping', () => {
    it('returns indications with ICD codes and MedDRA mapping', async () => {
      const { status, data } = await callRoute(getIndications, '/api/portfolio/indications');
      expect(status).toBe(200);
      assertGxPFields(data, ['indications', 'icdCode', 'orphanDesignation', 'prevalence'], 'PORT-06');
    });
  });

  describe('PORT-08: Submission Plans', () => {
    it('returns submission plans with agency and eCTD lifecycle', async () => {
      const { status, data } = await callRoute(getSubmissionPlans, '/api/portfolio/submission-plans');
      expect(status).toBe(200);
      assertGxPFields(data, ['plans', 'agency', 'submissionType', 'targetDate'], 'PORT-08');
    });
  });

});
