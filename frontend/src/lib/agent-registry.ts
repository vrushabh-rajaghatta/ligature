// =============================================================================
// AGENT REGISTRY — v0.111.0
// =============================================================================
// Single source of truth for the agent ID → AgentDefinition map.
// Imported by /api/agents/trigger and /api/agents/proactive/scan.
// Direct imports only — no barrel re-exports.
// =============================================================================

import { documentResolutionAgent }   from '@/services/agents/document-resolution-agent';
import { haqResponseAgent }           from '@/services/agents/haq-response-agent';
import { icsrProcessingAgent }        from '@/services/agents/icsr-processing-agent';
import { siteMonitoringAgent }        from '@/services/agents/site-monitoring-agent';
import { submissionAssemblyAgent }    from '@/services/agents/submission-assembly-agent';
import { signalIntelligenceAgent }    from '@/services/agents/signal-intelligence-agent';
import { qualityIntelligenceAgent }   from '@/services/agents/quality-intelligence-agent';
import { regStrategyAgent }           from '@/services/agents/reg-strategy-agent';
import { nonclinicalPackageAgent }    from '@/services/agents/nonclinical-package-agent';
import { researchIntelligenceAgent }  from '@/services/agents/research-intelligence-agent';
import { studyOperationsAgent }       from '@/services/agents/study-operations-agent';
import { labelingManagementAgent }    from '@/services/agents/labeling-management-agent';
import { cmcLifecycleAgent }          from '@/services/agents/cmc-lifecycle-agent';
import { medicalMonitorAgent }        from '@/services/agents/medical-monitor-agent';
import { biostatisticianAgent }       from '@/services/agents/biostatistician-agent';
import { medicalAffairsAgent }        from '@/services/agents/medical-affairs-agent';
import { leadOptimisationAgent }      from '@/services/agents/lead-optimisation-agent';
import { portfolioIntelligenceAgent } from '@/services/agents/portfolio-intelligence-agent';
import type { AgentDefinition } from '@/lib/agent-engine';
import type { AgentId } from '@/types/agents';

export const AGENT_REGISTRY: Record<AgentId, AgentDefinition> = {
  'document-resolution':   documentResolutionAgent,
  'haq-response':          haqResponseAgent,
  'icsr-processing':       icsrProcessingAgent,
  'site-monitoring':       siteMonitoringAgent,
  'submission-assembly':   submissionAssemblyAgent,
  'signal-intelligence':   signalIntelligenceAgent,
  'quality-intelligence':  qualityIntelligenceAgent,
  'reg-strategy':          regStrategyAgent,
  'nonclinical-package':   nonclinicalPackageAgent,
  'research-intelligence': researchIntelligenceAgent,
  'study-operations':      studyOperationsAgent,
  'labeling-management':   labelingManagementAgent,
  'cmc-lifecycle':         cmcLifecycleAgent,
  'medical-monitor':       medicalMonitorAgent,
  'biostatistician':       biostatisticianAgent,
  'medical-affairs':       medicalAffairsAgent,
  'lead-optimisation':     leadOptimisationAgent,
  'portfolio-intelligence': portfolioIntelligenceAgent,
};
