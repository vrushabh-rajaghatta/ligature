

// AI Integration Layer Store - Enterprise AI for Life Sciences R&D (v60)
import { create } from 'zustand';
import { useMemo } from 'react';
import type {
  AIIntegrationState, AIIntegrationActions, AIModel, AIModelConfiguration,
  ModelUsageMetrics, AIAgent, AgentCapability, AgentTool, AgentSession,
  AgentMessage, MessageFeedback, EntityContext, AITask, TaskOutput, TaskError,
  AIWorkflow, WorkflowStep, WorkflowTransition, WorkflowInstance, StepExecution,
  KnowledgeBase, KnowledgeSource, KnowledgeDocument, KnowledgeSearchResult,
  AutomationRule, AutomationCondition, AutomationAction, AutomationExecution,
  AIAnalyticsDashboard, CrossModuleAIConfig, AIModuleIntegration, AIIntegrationView,
  AIIntegrationFilters, AIModuleScope, AITaskType
} from './aiIntegrationTypes';

const generateId = () => `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateModelId = (counter: number) => `MODEL-${String(counter).padStart(4, '0')}`;
const generateAgentId = (counter: number) => `AGENT-${String(counter).padStart(4, '0')}`;
const generateTaskId = (counter: number) => `TASK-${String(counter).padStart(6, '0')}`;
const generateWorkflowId = (counter: number) => `WF-${String(counter).padStart(4, '0')}`;
const generateKBId = (counter: number) => `KB-${String(counter).padStart(4, '0')}`;
const generateRuleId = (counter: number) => `RULE-${String(counter).padStart(4, '0')}`;
const now = () => new Date().toISOString();

const initialView: AIIntegrationView = { activeTab: 'dashboard', selectedModelId: null, selectedAgentId: null, selectedWorkflowId: null, selectedKnowledgeBaseId: null, selectedRuleId: null };
const initialFilters: AIIntegrationFilters = { moduleScope: [], status: [], priority: [] };

const initialState: AIIntegrationState = {
  models: {}, modelConfigurations: {}, modelUsageMetrics: {}, agents: {}, agentSessions: {}, activeSessionsByAgent: {},
  tasks: {}, taskQueue: [], runningTasks: [], workflows: {}, workflowInstances: {}, instancesByWorkflow: {},
  knowledgeBases: {}, knowledgeSources: {}, knowledgeDocuments: {}, automationRules: {}, automationExecutions: {},
  analytics: null, globalConfig: null, moduleIntegrations: {}, activeView: initialView, filters: initialFilters, isLoading: false, error: null
};

export const useAIIntegrationStore = create<AIIntegrationState & AIIntegrationActions>((set, get) => ({
  ...initialState,

  // ===== MODEL MANAGEMENT =====
  registerModel: (data) => {
    const id = generateId();
    const modelId = generateModelId(Object.keys(get().models).length + 1);
    const model: AIModel = {
      id, modelId: data.modelId || modelId, name: data.name || 'New Model', displayName: data.displayName || data.name || 'New Model',
      provider: data.provider || 'anthropic', version: data.version || '1.0', capabilities: data.capabilities || ['text-generation'],
      primaryCapability: data.primaryCapability || 'text-generation', contextWindow: data.contextWindow || 200000,
      maxOutputTokens: data.maxOutputTokens || 8192, supportsStreaming: data.supportsStreaming ?? true, supportsToolUse: data.supportsToolUse ?? true,
      defaultTemperature: data.defaultTemperature ?? 0.7, defaultTopP: data.defaultTopP ?? 0.9, supportedLanguages: data.supportedLanguages || ['en'],
      latencyMs: data.latencyMs || 500, throughputTokensPerSecond: data.throughputTokensPerSecond || 100,
      costPerInputToken: data.costPerInputToken || 0.00001, costPerOutputToken: data.costPerOutputToken || 0.00003,
      approvedForPHI: data.approvedForPHI ?? false, approvedForPII: data.approvedForPII ?? false, dataResidency: data.dataResidency || ['US'],
      certifications: data.certifications || [], isActive: data.isActive ?? true, isDefault: data.isDefault ?? false,
      lastHealthCheck: now(), healthStatus: 'healthy', createdAt: now(), updatedAt: now()
    };
    set((s) => ({ models: { ...s.models, [id]: model } }));
    return model;
  },
  updateModel: (id, updates) => { const m = get().models[id]; if (m) set((s) => ({ models: { ...s.models, [id]: { ...m, ...updates, updatedAt: now() } } })); },
  deactivateModel: (id) => { const m = get().models[id]; if (m) set((s) => ({ models: { ...s.models, [id]: { ...m, isActive: false, updatedAt: now() } } })); },

  createModelConfiguration: (data) => {
    const id = generateId();
    const config: AIModelConfiguration = {
      id, modelId: data.modelId || '', configName: data.configName || 'Default Config', temperature: data.temperature ?? 0.7,
      topP: data.topP ?? 0.9, maxTokens: data.maxTokens || 4096, stopSequences: data.stopSequences || [],
      systemPrompt: data.systemPrompt, promptTemplate: data.promptTemplate, contentSafety: data.contentSafety || 'standard',
      enabledFilters: data.enabledFilters || [], includeContext: data.includeContext ?? true, contextSources: data.contextSources || [],
      maxContextLength: data.maxContextLength || 100000, enabledTools: data.enabledTools || [], toolChoice: data.toolChoice || 'auto',
      moduleScope: data.moduleScope || 'global', taskTypes: data.taskTypes || [], isDefault: data.isDefault ?? false,
      createdAt: now(), createdBy: data.createdBy || 'system'
    };
    set((s) => ({ modelConfigurations: { ...s.modelConfigurations, [id]: config } }));
    return config;
  },
  updateModelConfiguration: (id, updates) => { const c = get().modelConfigurations[id]; if (c) set((s) => ({ modelConfigurations: { ...s.modelConfigurations, [id]: { ...c, ...updates } } })); },

  recordModelUsage: (modelId, metrics) => {
    const existing = get().modelUsageMetrics[modelId] || [];
    const usage: ModelUsageMetrics = {
      modelId, period: metrics.period || 'hour', startDate: metrics.startDate || now(), endDate: metrics.endDate || now(),
      totalRequests: metrics.totalRequests || 0, successfulRequests: metrics.successfulRequests || 0, failedRequests: metrics.failedRequests || 0,
      inputTokens: metrics.inputTokens || 0, outputTokens: metrics.outputTokens || 0, totalTokens: (metrics.inputTokens || 0) + (metrics.outputTokens || 0),
      averageLatencyMs: metrics.averageLatencyMs || 0, p95LatencyMs: metrics.p95LatencyMs || 0, p99LatencyMs: metrics.p99LatencyMs || 0,
      totalCost: metrics.totalCost || 0, usageByModule: metrics.usageByModule || {} as Record<AIModuleScope, number>, usageByTaskType: metrics.usageByTaskType || {}
    };
    set((s) => ({ modelUsageMetrics: { ...s.modelUsageMetrics, [modelId]: [...existing, usage] } }));
  },

  // ===== AGENT MANAGEMENT =====
  createAgent: (data) => {
    const id = generateId();
    const agentId = generateAgentId(Object.keys(get().agents).length + 1);
    const agent: AIAgent = {
      id, agentId: data.agentId || agentId, name: data.name || 'New Agent', description: data.description || '',
      agentType: data.agentType || 'general-purpose', baseModelId: data.baseModelId || '',
      modelConfiguration: data.modelConfiguration || {} as AIModelConfiguration,
      persona: data.persona || { role: 'AI Assistant', expertise: [], communicationStyle: 'professional', responseFormat: 'detailed',
        languagePreference: 'en', therapeuticAreas: [], regulatoryRegions: [], specializations: [],
        cautionLevel: 'balanced', citationRequired: true, uncertaintyThreshold: 0.7 },
      capabilities: data.capabilities || [], enabledTools: data.enabledTools || [], knowledgeSources: data.knowledgeSources || [],
      memoryEnabled: data.memoryEnabled ?? true, memoryWindow: data.memoryWindow || 10, autonomyLevel: data.autonomyLevel || 'supervised',
      requiresApproval: data.requiresApproval ?? true, approvalThreshold: data.approvalThreshold || 0.8,
      moduleAccess: data.moduleAccess || ['global'], permissions: data.permissions || [], isActive: data.isActive ?? true,
      lastActive: now(), totalInteractions: 0, successRate: 1.0, createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now()
    };
    set((s) => ({ agents: { ...s.agents, [id]: agent } }));
    return agent;
  },
  updateAgent: (id, updates) => { const a = get().agents[id]; if (a) set((s) => ({ agents: { ...s.agents, [id]: { ...a, ...updates, updatedAt: now() } } })); },
  activateAgent: (id) => { const a = get().agents[id]; if (a) set((s) => ({ agents: { ...s.agents, [id]: { ...a, isActive: true, updatedAt: now() } } })); },
  deactivateAgent: (id) => { const a = get().agents[id]; if (a) set((s) => ({ agents: { ...s.agents, [id]: { ...a, isActive: false, updatedAt: now() } } })); },

  addAgentCapability: (agentId, capability) => {
    const agent = get().agents[agentId];
    if (!agent) return null as unknown as AgentCapability;
    const cap: AgentCapability = { id: generateId(), name: capability.name || 'New Capability', description: capability.description || '',
      category: capability.category || 'general', enabled: capability.enabled ?? true, requiresApproval: capability.requiresApproval ?? false,
      maxOperationsPerHour: capability.maxOperationsPerHour || 100, allowedModules: capability.allowedModules || ['global'], usageCount: 0, successRate: 1.0 };
    set((s) => ({ agents: { ...s.agents, [agentId]: { ...agent, capabilities: [...agent.capabilities, cap], updatedAt: now() } } }));
    return cap;
  },
  removeAgentCapability: (agentId, capabilityId) => { const a = get().agents[agentId]; if (a) set((s) => ({ agents: { ...s.agents, [agentId]: { ...a, capabilities: a.capabilities.filter(c => c.id !== capabilityId), updatedAt: now() } } })); },

  addAgentTool: (agentId, tool) => {
    const agent = get().agents[agentId];
    if (!agent) return null as unknown as AgentTool;
    const t: AgentTool = { id: generateId(), toolId: tool.toolId || generateId(), name: tool.name || 'New Tool', description: tool.description || '',
      category: tool.category || 'read', inputSchema: tool.inputSchema || {}, outputSchema: tool.outputSchema || {},
      requiredPermissions: tool.requiredPermissions || [], moduleScope: tool.moduleScope || ['global'], timeout: tool.timeout || 30000,
      retryPolicy: tool.retryPolicy || { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 }, isEnabled: tool.isEnabled ?? true };
    set((s) => ({ agents: { ...s.agents, [agentId]: { ...agent, enabledTools: [...agent.enabledTools, t], updatedAt: now() } } }));
    return t;
  },
  removeAgentTool: (agentId, toolId) => { const a = get().agents[agentId]; if (a) set((s) => ({ agents: { ...s.agents, [agentId]: { ...a, enabledTools: a.enabledTools.filter(t => t.id !== toolId), updatedAt: now() } } })); },

  // ===== AGENT SESSIONS =====
  startAgentSession: (agentId, userId, context) => {
    const id = generateId();
    const session: AgentSession = { id, agentId, userId, moduleContext: context?.entityType as AIModuleScope || 'global',
      entityContext: context, messages: [], status: 'active', startedAt: now(), lastActivityAt: now(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), sessionMemory: {}, messageCount: 0, tokenUsage: 0, toolInvocations: 0 };
    const existing = get().activeSessionsByAgent[agentId] || [];
    set((s) => ({ agentSessions: { ...s.agentSessions, [id]: session }, activeSessionsByAgent: { ...s.activeSessionsByAgent, [agentId]: [...existing, id] } }));
    return session;
  },

  addMessage: (sessionId, message) => {
    const session = get().agentSessions[sessionId];
    if (!session) return null as unknown as AgentMessage;
    const msg: AgentMessage = { id: generateId(), role: message.role || 'user', content: message.content || '',
      toolCalls: message.toolCalls, toolResults: message.toolResults, citations: message.citations,
      tokenCount: message.tokenCount || 0, timestamp: now(), processingTimeMs: message.processingTimeMs || 0 };
    set((s) => ({ agentSessions: { ...s.agentSessions, [sessionId]: { ...session, messages: [...session.messages, msg],
      lastActivityAt: now(), messageCount: session.messageCount + 1, tokenUsage: session.tokenUsage + msg.tokenCount,
      toolInvocations: session.toolInvocations + (msg.toolCalls?.length || 0) } } }));
    return msg;
  },

  endSession: (sessionId) => {
    const session = get().agentSessions[sessionId];
    if (session) set((s) => ({ agentSessions: { ...s.agentSessions, [sessionId]: { ...session, status: 'completed' } },
      activeSessionsByAgent: { ...s.activeSessionsByAgent, [session.agentId]: (s.activeSessionsByAgent[session.agentId] || []).filter(id => id !== sessionId) } }));
  },

  provideMessageFeedback: (sessionId, messageId, feedback) => {
    const session = get().agentSessions[sessionId];
    if (!session) return;
    const messages = session.messages.map(m => m.id === messageId ? { ...m, feedback } : m);
    set((s) => ({ agentSessions: { ...s.agentSessions, [sessionId]: { ...session, messages } } }));
  },

  // ===== TASK MANAGEMENT =====
  createTask: (data) => {
    const id = generateId();
    const taskId = generateTaskId(Object.keys(get().tasks).length + 1);
    const task: AITask = { id, taskId: data.taskId || taskId, name: data.name || 'New Task', description: data.description || '',
      taskType: data.taskType || 'custom', agentId: data.agentId, modelId: data.modelId || '',
      configuration: data.configuration || {} as AIModelConfiguration, input: data.input || { type: 'text', content: '' },
      status: 'pending', priority: data.priority || 'normal', progress: 0, timeout: data.timeout || 300000,
      dependsOn: data.dependsOn || [], blockedBy: [], moduleScope: data.moduleScope || 'global',
      entityReferences: data.entityReferences || [], createdAt: now(), createdBy: data.createdBy || 'system',
      retryCount: 0, maxRetries: data.maxRetries || 3 };
    set((s) => ({ tasks: { ...s.tasks, [id]: task }, taskQueue: [...s.taskQueue, id] }));
    return task;
  },
  updateTask: (id, updates) => { const t = get().tasks[id]; if (t) set((s) => ({ tasks: { ...s.tasks, [id]: { ...t, ...updates } } })); },
  startTask: (id) => { const t = get().tasks[id]; if (t) set((s) => ({ tasks: { ...s.tasks, [id]: { ...t, status: 'running', startedAt: now() } }, taskQueue: s.taskQueue.filter(tid => tid !== id), runningTasks: [...s.runningTasks, id] })); },
  completeTask: (id, output) => { const t = get().tasks[id]; if (t) set((s) => ({ tasks: { ...s.tasks, [id]: { ...t, status: 'completed', output, progress: 100, completedAt: now() } }, runningTasks: s.runningTasks.filter(tid => tid !== id) })); },
  failTask: (id, error) => { const t = get().tasks[id]; if (t) set((s) => ({ tasks: { ...s.tasks, [id]: { ...t, status: 'failed', lastError: error, completedAt: now() } }, runningTasks: s.runningTasks.filter(tid => tid !== id) })); },
  cancelTask: (id) => { const t = get().tasks[id]; if (t) set((s) => ({ tasks: { ...s.tasks, [id]: { ...t, status: 'cancelled', completedAt: now() } }, taskQueue: s.taskQueue.filter(tid => tid !== id), runningTasks: s.runningTasks.filter(tid => tid !== id) })); },
  retryTask: (id) => { const t = get().tasks[id]; if (t && t.retryCount < t.maxRetries) set((s) => ({ tasks: { ...s.tasks, [id]: { ...t, status: 'pending', retryCount: t.retryCount + 1, lastError: undefined } }, taskQueue: [...s.taskQueue, id] })); },

  // ===== WORKFLOW MANAGEMENT =====
  createWorkflow: (data) => {
    const id = generateId();
    const workflowId = generateWorkflowId(Object.keys(get().workflows).length + 1);
    const workflow: AIWorkflow = { id, workflowId: data.workflowId || workflowId, name: data.name || 'New Workflow',
      description: data.description || '', version: data.version || '1.0.0', steps: data.steps || [], transitions: data.transitions || [],
      triggerConfig: data.triggerConfig || { type: 'manual' }, inputSchema: data.inputSchema || {}, outputSchema: data.outputSchema || {},
      maxDuration: data.maxDuration || 3600000, timeoutAction: data.timeoutAction || 'cancel',
      errorHandling: data.errorHandling || { onError: 'fail', notifyOnError: true, notifyRecipients: [] },
      moduleScope: data.moduleScope || ['global'], requiredPermissions: data.requiredPermissions || [],
      status: 'draft', runCount: 0, successRate: 1.0, createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now() };
    set((s) => ({ workflows: { ...s.workflows, [id]: workflow } }));
    return workflow;
  },
  updateWorkflow: (id, updates) => { const w = get().workflows[id]; if (w) set((s) => ({ workflows: { ...s.workflows, [id]: { ...w, ...updates, updatedAt: now() } } })); },

  addWorkflowStep: (workflowId, step) => {
    const workflow = get().workflows[workflowId];
    if (!workflow) return null as unknown as WorkflowStep;
    const s: WorkflowStep = { id: generateId(), stepId: step.stepId || generateId(), name: step.name || 'New Step',
      description: step.description || '', stepType: step.stepType || 'ai-task', taskType: step.taskType, agentId: step.agentId,
      toolId: step.toolId, inputMapping: step.inputMapping || [], outputMapping: step.outputMapping || [],
      timeout: step.timeout || 60000, retryPolicy: step.retryPolicy, position: step.position || { x: 0, y: 0 } };
    set((st) => ({ workflows: { ...st.workflows, [workflowId]: { ...workflow, steps: [...workflow.steps, s], updatedAt: now() } } }));
    return s;
  },
  updateWorkflowStep: (workflowId, stepId, updates) => { const w = get().workflows[workflowId]; if (w) { const steps = w.steps.map(s => s.id === stepId ? { ...s, ...updates } : s); set((st) => ({ workflows: { ...st.workflows, [workflowId]: { ...w, steps, updatedAt: now() } } })); } },
  removeWorkflowStep: (workflowId, stepId) => { const w = get().workflows[workflowId]; if (w) set((st) => ({ workflows: { ...st.workflows, [workflowId]: { ...w, steps: w.steps.filter(s => s.id !== stepId), transitions: w.transitions.filter(t => t.fromStepId !== stepId && t.toStepId !== stepId), updatedAt: now() } } })); },

  addWorkflowTransition: (workflowId, transition) => {
    const workflow = get().workflows[workflowId];
    if (!workflow) return null as unknown as WorkflowTransition;
    const t: WorkflowTransition = { id: generateId(), fromStepId: transition.fromStepId || '', toStepId: transition.toStepId || '', condition: transition.condition, label: transition.label };
    set((st) => ({ workflows: { ...st.workflows, [workflowId]: { ...workflow, transitions: [...workflow.transitions, t], updatedAt: now() } } }));
    return t;
  },
  removeWorkflowTransition: (workflowId, transitionId) => { const w = get().workflows[workflowId]; if (w) set((st) => ({ workflows: { ...st.workflows, [workflowId]: { ...w, transitions: w.transitions.filter(t => t.id !== transitionId), updatedAt: now() } } })); },
  activateWorkflow: (id) => { const w = get().workflows[id]; if (w) set((s) => ({ workflows: { ...s.workflows, [id]: { ...w, status: 'active', updatedAt: now() } } })); },
  pauseWorkflow: (id) => { const w = get().workflows[id]; if (w) set((s) => ({ workflows: { ...s.workflows, [id]: { ...w, status: 'paused', updatedAt: now() } } })); },
  archiveWorkflow: (id) => { const w = get().workflows[id]; if (w) set((s) => ({ workflows: { ...s.workflows, [id]: { ...w, status: 'archived', updatedAt: now() } } })); },

  // ===== WORKFLOW EXECUTION =====
  startWorkflowInstance: (workflowId, input, triggeredBy) => {
    const workflow = get().workflows[workflowId];
    if (!workflow) return null as unknown as WorkflowInstance;
    const id = generateId();
    const instance: WorkflowInstance = { id, workflowId, workflowVersion: workflow.version, input, status: 'active',
      currentStepId: workflow.steps[0]?.id, progress: 0, stepExecutions: [], startedAt: now(), triggeredBy, triggerType: workflow.triggerConfig.type };
    const existing = get().instancesByWorkflow[workflowId] || [];
    set((s) => ({ workflowInstances: { ...s.workflowInstances, [id]: instance }, instancesByWorkflow: { ...s.instancesByWorkflow, [workflowId]: [...existing, id] },
      workflows: { ...s.workflows, [workflowId]: { ...workflow, lastRunAt: now(), runCount: workflow.runCount + 1 } } }));
    return instance;
  },

  updateStepExecution: (instanceId, stepId, execution) => {
    const instance = get().workflowInstances[instanceId];
    if (!instance) return;
    const stepExec: StepExecution = { stepId, status: execution.status || 'running', input: execution.input, output: execution.output,
      startedAt: execution.startedAt || now(), completedAt: execution.completedAt, duration: execution.duration, error: execution.error };
    const existingIdx = instance.stepExecutions.findIndex(se => se.stepId === stepId);
    const stepExecutions = existingIdx >= 0 ? instance.stepExecutions.map((se, i) => i === existingIdx ? { ...se, ...stepExec } : se) : [...instance.stepExecutions, stepExec];
    const wf = get().workflows[instance.workflowId];
    const progress = wf ? Math.round((stepExecutions.filter(se => se.status === 'completed').length / wf.steps.length) * 100) : 0;
    set((s) => ({ workflowInstances: { ...s.workflowInstances, [instanceId]: { ...instance, stepExecutions, progress, currentStepId: stepId } } }));
  },
  completeWorkflowInstance: (instanceId, output) => { const i = get().workflowInstances[instanceId]; if (i) { const duration = Date.now() - new Date(i.startedAt).getTime(); set((s) => ({ workflowInstances: { ...s.workflowInstances, [instanceId]: { ...i, status: 'completed', output, progress: 100, completedAt: now(), duration } } })); } },
  failWorkflowInstance: (instanceId, error) => { const i = get().workflowInstances[instanceId]; if (i) { const duration = Date.now() - new Date(i.startedAt).getTime(); set((s) => ({ workflowInstances: { ...s.workflowInstances, [instanceId]: { ...i, status: 'failed', error, completedAt: now(), duration } } })); } },

  // ===== KNOWLEDGE MANAGEMENT =====
  createKnowledgeBase: (data) => {
    const id = generateId();
    const kbId = generateKBId(Object.keys(get().knowledgeBases).length + 1);
    const kb: KnowledgeBase = { id, knowledgeBaseId: data.knowledgeBaseId || kbId, name: data.name || 'New Knowledge Base',
      description: data.description || '', embeddingModelId: data.embeddingModelId || '', chunkSize: data.chunkSize || 1000,
      chunkOverlap: data.chunkOverlap || 200, sources: [], moduleScope: data.moduleScope || ['global'],
      accessLevel: data.accessLevel || 'public', documentCount: 0, chunkCount: 0, totalTokens: 0, status: 'building',
      createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now() };
    set((s) => ({ knowledgeBases: { ...s.knowledgeBases, [id]: kb } }));
    return kb;
  },
  updateKnowledgeBase: (id, updates) => { const kb = get().knowledgeBases[id]; if (kb) set((s) => ({ knowledgeBases: { ...s.knowledgeBases, [id]: { ...kb, ...updates, updatedAt: now() } } })); },
  deleteKnowledgeBase: (id) => { const { [id]: _, ...rest } = get().knowledgeBases; set({ knowledgeBases: rest }); },

  addKnowledgeSource: (kbId, source) => {
    const kb = get().knowledgeBases[kbId];
    if (!kb) return null as unknown as KnowledgeSource;
    const src: KnowledgeSource = { id: generateId(), sourceId: source.sourceId || generateId(), name: source.name || 'New Source',
      sourceType: source.sourceType || 'document', connectionConfig: source.connectionConfig || { type: 'file', config: {} },
      syncSchedule: source.syncSchedule, syncStatus: 'pending', documentCount: 0 };
    set((s) => ({ knowledgeBases: { ...s.knowledgeBases, [kbId]: { ...kb, sources: [...kb.sources, src], updatedAt: now() } }, knowledgeSources: { ...s.knowledgeSources, [src.id]: src } }));
    return src;
  },
  removeKnowledgeSource: (kbId, sourceId) => { const kb = get().knowledgeBases[kbId]; if (kb) set((s) => ({ knowledgeBases: { ...s.knowledgeBases, [kbId]: { ...kb, sources: kb.sources.filter(src => src.id !== sourceId), updatedAt: now() } } })); },
  syncKnowledgeSource: (kbId, sourceId) => { const kb = get().knowledgeBases[kbId]; if (kb) { const sources = kb.sources.map(src => src.id === sourceId ? { ...src, syncStatus: 'syncing' as const, lastSyncAt: now() } : src); set((s) => ({ knowledgeBases: { ...s.knowledgeBases, [kbId]: { ...kb, sources, updatedAt: now() } } })); } },

  indexDocument: (kbId, document) => {
    const kb = get().knowledgeBases[kbId];
    if (!kb) return null as unknown as KnowledgeDocument;
    const doc: KnowledgeDocument = { id: generateId(), knowledgeBaseId: kbId, sourceId: document.sourceId || '',
      title: document.title || 'Untitled', content: document.content || '', contentType: document.contentType || 'text/plain',
      metadata: document.metadata || {}, chunks: document.chunks || [], status: 'indexed', indexedAt: now() };
    set((s) => ({ knowledgeDocuments: { ...s.knowledgeDocuments, [doc.id]: doc },
      knowledgeBases: { ...s.knowledgeBases, [kbId]: { ...kb, documentCount: kb.documentCount + 1, lastIndexedAt: now(), updatedAt: now() } } }));
    return doc;
  },

  searchKnowledge: (query) => {
    const results: KnowledgeSearchResult[] = [];
    const docs = Object.values(get().knowledgeDocuments).filter(d => query.knowledgeBaseIds?.includes(d.knowledgeBaseId));
    const searchTerm = query.query?.toLowerCase() || '';
    for (const doc of docs) {
      if (doc.content.toLowerCase().includes(searchTerm)) {
        results.push({ chunkId: doc.chunks[0]?.id || '', documentId: doc.id, knowledgeBaseId: doc.knowledgeBaseId,
          content: doc.content.slice(0, 500), score: 0.85, metadata: doc.chunks[0]?.metadata || { startOffset: 0, endOffset: 500 }, documentMetadata: doc.metadata });
      }
    }
    return results.slice(0, query.topK || 10);
  },

  // ===== AUTOMATION =====
  createAutomationRule: (data) => {
    const id = generateId();
    const ruleId = generateRuleId(Object.keys(get().automationRules).length + 1);
    const rule: AutomationRule = { id, ruleId: data.ruleId || ruleId, name: data.name || 'New Automation Rule',
      description: data.description || '', trigger: data.trigger || { type: 'manual' }, conditions: data.conditions || [],
      conditionLogic: data.conditionLogic || 'all', actions: data.actions || [], moduleScope: data.moduleScope || ['global'],
      priority: data.priority || 'normal', isEnabled: data.isEnabled ?? false, executionCount: 0,
      createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now() };
    set((s) => ({ automationRules: { ...s.automationRules, [id]: rule } }));
    return rule;
  },
  updateAutomationRule: (id, updates) => { const r = get().automationRules[id]; if (r) set((s) => ({ automationRules: { ...s.automationRules, [id]: { ...r, ...updates, updatedAt: now() } } })); },
  enableAutomationRule: (id) => { const r = get().automationRules[id]; if (r) set((s) => ({ automationRules: { ...s.automationRules, [id]: { ...r, isEnabled: true, updatedAt: now() } } })); },
  disableAutomationRule: (id) => { const r = get().automationRules[id]; if (r) set((s) => ({ automationRules: { ...s.automationRules, [id]: { ...r, isEnabled: false, updatedAt: now() } } })); },
  deleteAutomationRule: (id) => { const { [id]: _, ...rest } = get().automationRules; set({ automationRules: rest }); },

  addAutomationCondition: (ruleId, condition) => {
    const rule = get().automationRules[ruleId];
    if (!rule) return null as unknown as AutomationCondition;
    const cond: AutomationCondition = { id: generateId(), field: condition.field || '', operator: condition.operator || 'equals', value: condition.value };
    set((s) => ({ automationRules: { ...s.automationRules, [ruleId]: { ...rule, conditions: [...rule.conditions, cond], updatedAt: now() } } }));
    return cond;
  },
  removeAutomationCondition: (ruleId, conditionId) => { const r = get().automationRules[ruleId]; if (r) set((s) => ({ automationRules: { ...s.automationRules, [ruleId]: { ...r, conditions: r.conditions.filter(c => c.id !== conditionId), updatedAt: now() } } })); },

  addAutomationAction: (ruleId, action) => {
    const rule = get().automationRules[ruleId];
    if (!rule) return null as unknown as AutomationAction;
    const act: AutomationAction = { id: generateId(), actionType: action.actionType || 'send-notification', ...action };
    set((s) => ({ automationRules: { ...s.automationRules, [ruleId]: { ...rule, actions: [...rule.actions, act], updatedAt: now() } } }));
    return act;
  },
  removeAutomationAction: (ruleId, actionId) => { const r = get().automationRules[ruleId]; if (r) set((s) => ({ automationRules: { ...s.automationRules, [ruleId]: { ...r, actions: r.actions.filter(a => a.id !== actionId), updatedAt: now() } } })); },

  executeAutomationRule: (ruleId, triggerEvent) => {
    const rule = get().automationRules[ruleId];
    if (!rule) return null as unknown as AutomationExecution;
    const execution: AutomationExecution = { id: generateId(), ruleId, triggeredAt: now(), triggerType: rule.trigger.type, triggerEvent,
      conditionsEvaluated: rule.conditions.map(c => ({ conditionId: c.id, result: true })), conditionsPassed: true,
      actionsExecuted: rule.actions.map(a => ({ actionId: a.id, actionType: a.actionType, status: 'success' as const, durationMs: 100 })), status: 'success', durationMs: 500 };
    const existing = get().automationExecutions[ruleId] || [];
    set((s) => ({ automationExecutions: { ...s.automationExecutions, [ruleId]: [...existing, execution] },
      automationRules: { ...s.automationRules, [ruleId]: { ...rule, lastTriggeredAt: now(), executionCount: rule.executionCount + 1 } } }));
    return execution;
  },

  // ===== ANALYTICS =====
  refreshAnalytics: (period = 'month') => {
    const models = Object.values(get().models);
    const agents = Object.values(get().agents);
    const workflows = Object.values(get().workflows);
    const tasks = Object.values(get().tasks);

    const analytics: AIAnalyticsDashboard = {
      id: generateId(), period, startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate: now(),
      usageSummary: { totalTasks: tasks.length, completedTasks: tasks.filter(t => t.status === 'completed').length,
        failedTasks: tasks.filter(t => t.status === 'failed').length, totalTokens: 500000, inputTokens: 300000, outputTokens: 200000,
        totalAgentSessions: Object.keys(get().agentSessions).length, averageSessionDuration: 300000,
        totalWorkflowRuns: Object.keys(get().workflowInstances).length, workflowSuccessRate: 0.95, activeUsers: 25,
        byModule: {} as Record<AIModuleScope, { taskCount: number; tokenUsage: number; activeUsers: number; cost: number }> },
      modelPerformance: models.map(m => ({ modelId: m.id, modelName: m.name, requestCount: 1000, successRate: 0.98,
        averageLatencyMs: m.latencyMs, p95LatencyMs: m.latencyMs * 1.5, averageTokensPerRequest: 1500, cost: 50, costPerRequest: 0.05, qualityScore: 0.92, userSatisfaction: 0.88 })),
      agentPerformance: agents.map(a => ({ agentId: a.id, agentName: a.name, agentType: a.agentType, totalSessions: a.totalInteractions,
        averageSessionLength: 5, taskCompletionRate: a.successRate, userSatisfactionScore: 0.9,
        mostUsedTools: a.enabledTools.slice(0, 3).map(t => ({ toolId: t.id, toolName: t.name, invocationCount: 50, successRate: 0.95 })), tokenUsage: 50000, cost: 25 })),
      workflowPerformance: workflows.map(w => ({ workflowId: w.id, workflowName: w.name, totalRuns: w.runCount, successRate: w.successRate,
        averageDuration: 60000, p95Duration: 120000, stepMetrics: w.steps.map(s => ({ stepId: s.id, stepName: s.name, averageDuration: 10000, successRate: 0.98, errorRate: 0.02 })), cost: 10 })),
      costAnalysis: { totalCost: 500, byModel: models.reduce((acc, m) => ({ ...acc, [m.id]: 50 }), {}),
        byModule: {} as Record<AIModuleScope, number>, byTaskType: {} as Record<AITaskType, number>,
        trend: [{ date: now(), cost: 500, tokenUsage: 500000 }], projectedMonthlyCost: 600 },
      qualityMetrics: { overallScore: 0.9, accuracy: 0.92, relevance: 0.91, completeness: 0.88, consistency: 0.93,
        userFeedbackScore: 0.87, positiveRatings: 450, negativeRatings: 50, complianceScore: 0.95, safetyScore: 0.98,
        byModule: {} as Record<AIModuleScope, { overallScore: number; taskCount: number; feedbackCount: number; trend: 'improving' | 'stable' | 'declining' }> },
      trends: [{ metric: 'token_usage', dataPoints: [{ date: now(), value: 500000 }], trend: 'up', changePercent: 15 }],
      recommendations: [{ id: generateId(), type: 'optimization', priority: 'medium', title: 'Optimize prompt templates',
        description: 'Consider shorter prompts to reduce token usage', impact: 'Could reduce costs by 10%', action: 'Review and shorten system prompts', estimatedSavings: 50 }],
      generatedAt: now()
    };
    set({ analytics });
  },

  // ===== CONFIGURATION =====
  updateGlobalConfig: (config) => { const existing = get().globalConfig || {} as CrossModuleAIConfig; set({ globalConfig: { ...existing, ...config } as CrossModuleAIConfig }); },

  createModuleIntegration: (data) => {
    const id = generateId();
    const integration: AIModuleIntegration = { id, sourceModule: data.sourceModule || 'global', targetModule: data.targetModule || 'global',
      dataFlowConfig: data.dataFlowConfig || { direction: 'source-to-target', syncMode: 'on-demand' },
      triggers: data.triggers || [], transformations: data.transformations || [], isEnabled: data.isEnabled ?? true };
    set((s) => ({ moduleIntegrations: { ...s.moduleIntegrations, [id]: integration } }));
    return integration;
  },
  updateModuleIntegration: (id, updates) => { const i = get().moduleIntegrations[id]; if (i) set((s) => ({ moduleIntegrations: { ...s.moduleIntegrations, [id]: { ...i, ...updates } } })); },

  // ===== UI ACTIONS =====
  setActiveView: (view) => set((s) => ({ activeView: { ...s.activeView, ...view } })),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  clearFilters: () => set({ filters: initialFilters }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // ===== UTILITY =====
  clearAll: () => set(initialState),
  generateMockData: () => {
    const store = get();
    // Register models
    const claude = store.registerModel({ name: 'Claude 3.5 Sonnet', provider: 'anthropic', capabilities: ['text-generation', 'reasoning', 'tool-use'], contextWindow: 200000, approvedForPHI: true });
    store.registerModel({ name: 'Claude 3 Opus', provider: 'anthropic', capabilities: ['text-generation', 'reasoning', 'tool-use', 'vision'], contextWindow: 200000, approvedForPHI: true });
    // Create agents
    const writer = store.createAgent({ name: 'Regulatory Writer', agentType: 'regulatory-writer', baseModelId: claude.id,
      persona: { role: 'Senior Regulatory Writer', expertise: ['CTD', 'eCTD', 'FDA', 'EMA'], communicationStyle: 'professional',
        responseFormat: 'structured', languagePreference: 'en', therapeuticAreas: ['oncology', 'immunology'],
        regulatoryRegions: ['US', 'EU', 'Japan'], specializations: ['Module 2', 'Clinical Summaries'],
        cautionLevel: 'conservative', citationRequired: true, uncertaintyThreshold: 0.8 } });
    store.createAgent({ name: 'Document Reviewer', agentType: 'document-reviewer', baseModelId: claude.id });
    store.createAgent({ name: 'Data Analyst', agentType: 'data-analyst', baseModelId: claude.id });
    // Create knowledge base
    const kb = store.createKnowledgeBase({ name: 'Regulatory Guidance', description: 'FDA and EMA guidance documents', moduleScope: ['regulatory', 'submissions'] });
    store.addKnowledgeSource(kb.id, { name: 'FDA Guidance', sourceType: 'document' });
    // Create workflow
    const wf = store.createWorkflow({ name: 'Document Review Workflow', description: 'Automated document review and approval',
      moduleScope: ['authoring', 'documents'], steps: [], transitions: [] });
    store.addWorkflowStep(wf.id, { name: 'AI Review', stepType: 'ai-task', taskType: 'document-review', agentId: writer.id });
    store.addWorkflowStep(wf.id, { name: 'Human Approval', stepType: 'human-review' });
    // Create automation rule
    store.createAutomationRule({ name: 'Auto-Review New Documents', trigger: { type: 'event', eventType: 'document.created' },
      conditions: [{ id: generateId(), field: 'status', operator: 'equals', value: 'draft' }],
      actions: [{ id: generateId(), actionType: 'trigger-workflow', workflowId: wf.id }] });
    store.refreshAnalytics();
  }
}));

// ===== SELECTOR HOOKS (v0.2.5 - Fixed infinite loop with useMemo) =====
export const useModels = () => {
  const models = useAIIntegrationStore((s) => s.models);
  return useMemo(() => Object.values(models), [models]);
};

export const useActiveModels = () => {
  const models = useAIIntegrationStore((s) => s.models);
  return useMemo(() => Object.values(models).filter(m => m.isActive), [models]);
};

export const useSelectedModel = () => {
  const selectedModelId = useAIIntegrationStore((s) => s.activeView.selectedModelId);
  const models = useAIIntegrationStore((s) => s.models);
  return useMemo(() => selectedModelId ? models[selectedModelId] : null, [selectedModelId, models]);
};

export const useModelConfigurations = () => {
  const modelConfigurations = useAIIntegrationStore((s) => s.modelConfigurations);
  return useMemo(() => Object.values(modelConfigurations), [modelConfigurations]);
};

export const useAgents = () => {
  const agents = useAIIntegrationStore((s) => s.agents);
  return useMemo(() => Object.values(agents), [agents]);
};

export const useActiveAgents = () => {
  const agents = useAIIntegrationStore((s) => s.agents);
  return useMemo(() => Object.values(agents).filter(a => a.isActive), [agents]);
};

export const useSelectedAgent = () => {
  const selectedAgentId = useAIIntegrationStore((s) => s.activeView.selectedAgentId);
  const agents = useAIIntegrationStore((s) => s.agents);
  return useMemo(() => selectedAgentId ? agents[selectedAgentId] : null, [selectedAgentId, agents]);
};

export const useAgentsByType = (type: string) => {
  const agents = useAIIntegrationStore((s) => s.agents);
  return useMemo(() => Object.values(agents).filter(a => a.agentType === type), [agents, type]);
};

export const useAgentSessions = () => {
  const agentSessions = useAIIntegrationStore((s) => s.agentSessions);
  return useMemo(() => Object.values(agentSessions), [agentSessions]);
};

export const useActiveAgentSessions = () => {
  const agentSessions = useAIIntegrationStore((s) => s.agentSessions);
  return useMemo(() => Object.values(agentSessions).filter(sess => sess.status === 'active'), [agentSessions]);
};

export const useSessionsForAgent = (agentId: string) => {
  const activeSessionsByAgent = useAIIntegrationStore((s) => s.activeSessionsByAgent[agentId] || []);
  const agentSessions = useAIIntegrationStore((s) => s.agentSessions);
  return useMemo(() => activeSessionsByAgent.map(id => agentSessions[id]).filter(Boolean), [activeSessionsByAgent, agentSessions]);
};

export const useTasks = () => {
  const tasks = useAIIntegrationStore((s) => s.tasks);
  return useMemo(() => Object.values(tasks), [tasks]);
};

export const useTaskQueue = () => {
  const taskQueue = useAIIntegrationStore((s) => s.taskQueue);
  const tasks = useAIIntegrationStore((s) => s.tasks);
  return useMemo(() => taskQueue.map(id => tasks[id]).filter(Boolean), [taskQueue, tasks]);
};

export const useRunningTasks = () => {
  const runningTasks = useAIIntegrationStore((s) => s.runningTasks);
  const tasks = useAIIntegrationStore((s) => s.tasks);
  return useMemo(() => runningTasks.map(id => tasks[id]).filter(Boolean), [runningTasks, tasks]);
};

export const useCompletedTasks = () => {
  const tasks = useAIIntegrationStore((s) => s.tasks);
  return useMemo(() => Object.values(tasks).filter(t => t.status === 'completed'), [tasks]);
};

export const useFailedTasks = () => {
  const tasks = useAIIntegrationStore((s) => s.tasks);
  return useMemo(() => Object.values(tasks).filter(t => t.status === 'failed'), [tasks]);
};

export const useWorkflows = () => {
  const workflows = useAIIntegrationStore((s) => s.workflows);
  return useMemo(() => Object.values(workflows), [workflows]);
};

export const useActiveWorkflows = () => {
  const workflows = useAIIntegrationStore((s) => s.workflows);
  return useMemo(() => Object.values(workflows).filter(w => w.status === 'active'), [workflows]);
};

export const useSelectedWorkflow = () => {
  const selectedWorkflowId = useAIIntegrationStore((s) => s.activeView.selectedWorkflowId);
  const workflows = useAIIntegrationStore((s) => s.workflows);
  return useMemo(() => selectedWorkflowId ? workflows[selectedWorkflowId] : null, [selectedWorkflowId, workflows]);
};

export const useWorkflowInstances = () => {
  const workflowInstances = useAIIntegrationStore((s) => s.workflowInstances);
  return useMemo(() => Object.values(workflowInstances), [workflowInstances]);
};

export const useInstancesForWorkflow = (workflowId: string) => {
  const instancesByWorkflow = useAIIntegrationStore((s) => s.instancesByWorkflow[workflowId] || []);
  const workflowInstances = useAIIntegrationStore((s) => s.workflowInstances);
  return useMemo(() => instancesByWorkflow.map(id => workflowInstances[id]).filter(Boolean), [instancesByWorkflow, workflowInstances]);
};

export const useKnowledgeBases = () => {
  const knowledgeBases = useAIIntegrationStore((s) => s.knowledgeBases);
  return useMemo(() => Object.values(knowledgeBases), [knowledgeBases]);
};

export const useSelectedKnowledgeBase = () => {
  const selectedKnowledgeBaseId = useAIIntegrationStore((s) => s.activeView.selectedKnowledgeBaseId);
  const knowledgeBases = useAIIntegrationStore((s) => s.knowledgeBases);
  return useMemo(() => selectedKnowledgeBaseId ? knowledgeBases[selectedKnowledgeBaseId] : null, [selectedKnowledgeBaseId, knowledgeBases]);
};

export const useKnowledgeDocuments = () => {
  const knowledgeDocuments = useAIIntegrationStore((s) => s.knowledgeDocuments);
  return useMemo(() => Object.values(knowledgeDocuments), [knowledgeDocuments]);
};

export const useDocumentsForKB = (kbId: string) => {
  const knowledgeDocuments = useAIIntegrationStore((s) => s.knowledgeDocuments);
  return useMemo(() => Object.values(knowledgeDocuments).filter(d => d.knowledgeBaseId === kbId), [knowledgeDocuments, kbId]);
};

export const useAutomationRules = () => {
  const automationRules = useAIIntegrationStore((s) => s.automationRules);
  return useMemo(() => Object.values(automationRules), [automationRules]);
};

export const useEnabledRules = () => {
  const automationRules = useAIIntegrationStore((s) => s.automationRules);
  return useMemo(() => Object.values(automationRules).filter(r => r.isEnabled), [automationRules]);
};

export const useSelectedRule = () => {
  const selectedRuleId = useAIIntegrationStore((s) => s.activeView.selectedRuleId);
  const automationRules = useAIIntegrationStore((s) => s.automationRules);
  return useMemo(() => selectedRuleId ? automationRules[selectedRuleId] : null, [selectedRuleId, automationRules]);
};

export const useRuleExecutions = (ruleId: string) => useAIIntegrationStore((s) => s.automationExecutions[ruleId] || []);

export const useAIAnalytics = () => useAIIntegrationStore((s) => s.analytics);
export const useGlobalConfig = () => useAIIntegrationStore((s) => s.globalConfig);

export const useModuleIntegrations = () => {
  const moduleIntegrations = useAIIntegrationStore((s) => s.moduleIntegrations);
  return useMemo(() => Object.values(moduleIntegrations), [moduleIntegrations]);
};

export const useAIActiveView = () => useAIIntegrationStore((s) => s.activeView);
export const useAIFilters = () => useAIIntegrationStore((s) => s.filters);
export const useAILoading = () => useAIIntegrationStore((s) => s.isLoading);
export const useAIError = () => useAIIntegrationStore((s) => s.error);
