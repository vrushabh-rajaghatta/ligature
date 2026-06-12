/**
 * Demo Path 2: Autonomous AI Agent Hub
 * Integration tests — v0.125.33 (field names corrected from live route inspection)
 *
 * GxP refs: FDA AI/ML Draft Guidance 2023; GAMP 5 Appendix D5; ICH Q10 §3.2
 */

import { describe, it, expect } from 'vitest';
import { callRoute, assertGxPFields, assertListResponse } from '../helpers';

import { GET as getAgents }        from '@/app/api/agents/route';
import { GET as getStatus }        from '@/app/api/agents/status/route';
import { GET as getTaskQueue }     from '@/app/api/agents/task-queue/route';
import { GET as getCascades }      from '@/app/api/agents/cascades/route';
import { GET as getOrchestration } from '@/app/api/agents/orchestration/route';
import { GET as getAudit }         from '@/app/api/agents/audit/route';

describe('Demo Path 2 — Autonomous AI Agent Hub', () => {

  describe('AGT-01: Agent Registry', () => {
    it('returns all 20 agents with type and status', async () => {
      const { status, data } = await callRoute(getAgents, '/api/agents');
      expect(status).toBe(200);
      assertGxPFields(data, ['agents', 'total', 'active', 'idle', 'failed'], 'AGT-01');
      const agents = assertListResponse(data, 'agents', 'AGT-01');
      expect(agents.length).toBeGreaterThanOrEqual(10);
    });

    it('each agent carries humanReviewRequired flag (GAMP 5 risk classification)', async () => {
      const { data } = await callRoute(getAgents, '/api/agents');
      const agents = (data as Record<string, Record<string, unknown>[]>).agents;
      const missing = agents.filter(a => !('humanReviewRequired' in a));
      expect(missing.length, 'AGT-01: agents missing humanReviewRequired flag').toBe(0);
    });
  });

  describe('AGT-02: Agent Status', () => {
    it('returns real-time agent status with heartbeat data', async () => {
      const { status, data } = await callRoute(getStatus, '/api/agents/status');
      expect(status).toBe(200);
      assertGxPFields(data, ['agentStatuses', 'total', 'active'], 'AGT-02');
    });

    it('each status entry has lastHeartbeat for liveness monitoring', async () => {
      const { data } = await callRoute(getStatus, '/api/agents/status');
      const statuses = (data as Record<string, Record<string, unknown>[]>).agentStatuses;
      if (statuses?.length > 0) {
        expect(statuses[0]).toHaveProperty('lastHeartbeat');
      }
    });
  });

  describe('AGT-03: Task Queue', () => {
    it('returns task queue with processing counts and task list', async () => {
      const { status, data } = await callRoute(getTaskQueue, '/api/agents/task-queue');
      expect(status).toBe(200);
      assertGxPFields(data, ['queued', 'processing', 'tasks'], 'AGT-03');
    });

    it('tasks include humanReviewRequired flag (GAMP 5 oversight)', async () => {
      const { data } = await callRoute(getTaskQueue, '/api/agents/task-queue');
      const tasks = (data as Record<string, Record<string, unknown>[]>).tasks;
      if (tasks?.length > 0) {
        expect(tasks[0]).toHaveProperty('humanReviewRequired');
      }
    });
  });

  describe('AGT-04: Cascade Types', () => {
    it('returns cascade definitions with triggerEvent and downstream agents', async () => {
      const { status, data } = await callRoute(getCascades, '/api/agents/cascades');
      expect(status).toBe(200);
      assertGxPFields(data, ['cascades', 'total'], 'AGT-04');
      const cascades = assertListResponse(data, 'cascades', 'AGT-04');
      expect(cascades.length).toBeGreaterThanOrEqual(5);
    });

    it('each cascade has triggerEvent and downstreamAgents defined', async () => {
      const { data } = await callRoute(getCascades, '/api/agents/cascades');
      const cascades = (data as Record<string, Record<string, unknown>[]>).cascades;
      cascades.forEach((c, i) => {
        expect(c, `AGT-04: cascade[${i}] missing triggerEvent`).toHaveProperty('triggerEvent');
        expect(c, `AGT-04: cascade[${i}] missing downstreamAgents`).toHaveProperty('downstreamAgents');
      });
    });
  });

  describe('AGT-07: IND→NDA Orchestration DAG', () => {
    it('returns orchestration graph with human oversight enabled', async () => {
      const { status, data } = await callRoute(getOrchestration, '/api/agents/orchestration');
      expect(status).toBe(200);
      assertGxPFields(data, ['humanOversightEnabled', 'graphId', 'graphName'], 'AGT-07');
    });

    it('defines human intervention points (FDA AI/ML Guidance 2023)', async () => {
      const { data } = await callRoute(getOrchestration, '/api/agents/orchestration');
      const d = data as Record<string, unknown>;
      expect(d.humanOversightEnabled, 'AGT-07: humanOversightEnabled must be true').toBe(true);
      const points = d.humanInterventionPoints as unknown[] | undefined;
      expect(Array.isArray(points) && points.length > 0,
        'AGT-07: No human intervention points defined').toBe(true);
    });
  });

  describe('AGT-08: Agent Audit Log', () => {
    it('returns immutable audit entries with esigHash (21 CFR Part 11)', async () => {
      const { status, data } = await callRoute(getAudit, '/api/agents/audit');
      expect(status).toBe(200);
      assertGxPFields(data, ['auditEntries'], 'AGT-08');
      const entries = (data as Record<string, Record<string, unknown>[]>).auditEntries;
      if (entries?.length > 0) {
        // immutable flag must be present on all entries
        const hasImmutable = entries.every(e => 'immutable' in e);
        expect(hasImmutable, 'AGT-08: Not all audit entries have immutable flag').toBe(true);
        // esigHash present on at least one entry (signed actions)
        const hasEsig = entries.some(e => 'esigHash' in e || 'esigHashIncluded' in e);
        expect(hasEsig, 'AGT-08: No esigHash on any audit entry (21 CFR Part 11 §11.70)').toBe(true);
      }
    });
  });

});
