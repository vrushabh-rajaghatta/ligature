
// ============================================================================
// AI Integration Layer Types - Enterprise AI for Life Sciences R&D (v60)
// Comprehensive types for AI models, agents, workflows, knowledge management,
// automation, analytics, and cross-module AI orchestration
// ============================================================================

// ============================================================================
// COMMON ENUMS & BASE TYPES
// ============================================================================

export type AIModelProvider = 
  | 'anthropic' | 'openai' | 'google' | 'azure' | 'aws' | 'custom';

export type AIModelCapability = 
  | 'text-generation' | 'summarization' | 'classification' | 'extraction'
  | 'translation' | 'embedding' | 'vision' | 'code-generation'
  | 'reasoning' | 'tool-use' | 'multimodal';

export type AITaskStatus = 
  | 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export type AITaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export type AIAgentType = 
  | 'regulatory-writer' | 'document-reviewer' | 'data-analyst' | 'qa-specialist'
  | 'submission-coordinator' | 'safety-monitor' | 'compliance-auditor'
  | 'clinical-analyst' | 'research-assistant' | 'general-purpose';

export type AIWorkflowStatus = 
  | 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'archived';

export type KnowledgeSourceType = 
  | 'document' | 'database' | 'api' | 'web' | 'internal-module' | 'external-system';

export type AutomationTriggerType = 
  | 'schedule' | 'event' | 'condition' | 'manual' | 'webhook' | 'threshold';

export type AIRiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export type ContentSafetyLevel = 'unrestricted' | 'standard' | 'strict' | 'regulated';

export type AIModuleScope = 
  | 'portfolio' | 'authoring' | 'submissions' | 'haq' | 'safety'
  | 'clinical' | 'cmc' | 'regulatory' | 'quality' | 'documents'
  | 'master-data' | 'cross-module' | 'global';

// ============================================================================
// AI MODEL MANAGEMENT
// ============================================================================

export interface AIModel {
  id: string;
  modelId: string;
  name: string;
  displayName: string;
  provider: AIModelProvider;
  version: string;
  
  // Capabilities
  capabilities: AIModelCapability[];
  primaryCapability: AIModelCapability;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsToolUse: boolean;
  
  // Configuration
  defaultTemperature: number;
  defaultTopP: number;
  defaultTopK?: number;
  supportedLanguages: string[];
  
  // Performance
  latencyMs: number;
  throughputTokensPerSecond: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  
  // Compliance
  approvedForPHI: boolean;
  approvedForPII: boolean;
  dataResidency: string[];
  certifications: string[];
  
  // Status
  isActive: boolean;
  isDefault: boolean;
  lastHealthCheck: string;
  healthStatus: 'healthy' | 'degraded' | 'unavailable';
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface AIModelConfiguration {
  id: string;
  modelId: string;
  configName: string;
  
  // Parameters
  temperature: number;
  topP: number;
  topK?: number;
  maxTokens: number;
  stopSequences: string[];
  
  // System Prompt
  systemPrompt?: string;
  promptTemplate?: string;
  
  // Safety
  contentSafety: ContentSafetyLevel;
  enabledFilters: string[];
  
  // Context
  includeContext: boolean;
  contextSources: string[];
  maxContextLength: number;
  
  // Tool Use
  enabledTools: string[];
  toolChoice: 'auto' | 'required' | 'none';
  
  // Scope
  moduleScope: AIModuleScope;
  taskTypes: string[];
  
  isDefault: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ModelUsageMetrics {
  modelId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  
  // Usage
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  
  // Tokens
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  
  // Performance
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  
  // Cost
  totalCost: number;
  
  // By Module
  usageByModule: Record<AIModuleScope, number>;
  usageByTaskType: Record<string, number>;
}

// ============================================================================
// AI AGENTS
// ============================================================================

export interface AIAgent {
  id: string;
  agentId: string;
  name: string;
  description: string;
  agentType: AIAgentType;
  
  // Configuration
  baseModelId: string;
  modelConfiguration: AIModelConfiguration;
  
  // Persona
  persona: AgentPersona;
  
  // Capabilities
  capabilities: AgentCapability[];
  enabledTools: AgentTool[];
  
  // Knowledge
  knowledgeSources: string[];
  memoryEnabled: boolean;
  memoryWindow: number;
  
  // Behavior
  autonomyLevel: 'supervised' | 'semi-autonomous' | 'autonomous';
  requiresApproval: boolean;
  approvalThreshold: number;
  
  // Module Access
  moduleAccess: AIModuleScope[];
  permissions: AgentPermission[];
  
  // Status
  isActive: boolean;
  lastActive: string;
  totalInteractions: number;
  successRate: number;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface AgentPersona {
  role: string;
  expertise: string[];
  communicationStyle: 'formal' | 'professional' | 'conversational';
  responseFormat: 'concise' | 'detailed' | 'structured';
  languagePreference: string;
  
  // Domain Knowledge
  therapeuticAreas: string[];
  regulatoryRegions: string[];
  specializations: string[];
  
  // Behavior
  cautionLevel: 'conservative' | 'balanced' | 'aggressive';
  citationRequired: boolean;
  uncertaintyThreshold: number;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  
  // Configuration
  enabled: boolean;
  requiresApproval: boolean;
  
  // Constraints
  maxOperationsPerHour: number;
  allowedModules: AIModuleScope[];
  
  // Metrics
  usageCount: number;
  successRate: number;
}

export interface AgentTool {
  id: string;
  toolId: string;
  name: string;
  description: string;
  category: 'read' | 'write' | 'analyze' | 'communicate' | 'execute';
  
  // Schema
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  
  // Permissions
  requiredPermissions: string[];
  moduleScope: AIModuleScope[];
  
  // Configuration
  timeout: number;
  retryPolicy: RetryPolicy;
  
  isEnabled: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface AgentPermission {
  moduleScope: AIModuleScope;
  actions: ('read' | 'write' | 'delete' | 'approve' | 'execute')[];
  resourceTypes: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'greater_than' | 'less_than';
  value: unknown;
}

export interface AgentSession {
  id: string;
  agentId: string;
  userId: string;
  
  // Context
  moduleContext: AIModuleScope;
  entityContext?: EntityContext;
  
  // Conversation
  messages: AgentMessage[];
  
  // State
  status: 'active' | 'paused' | 'completed' | 'expired';
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
  
  // Memory
  sessionMemory: Record<string, unknown>;
  
  // Metrics
  messageCount: number;
  tokenUsage: number;
  toolInvocations: number;
}

export interface EntityContext {
  entityType: string;
  entityId: string;
  entityName: string;
  relatedEntities?: EntityContext[];
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  
  // Tool Use
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  
  // Citations
  citations?: AIMessageCitation[];
  
  // Metadata
  tokenCount: number;
  timestamp: string;
  processingTimeMs: number;
  
  // Feedback
  feedback?: MessageFeedback;
}

export interface ToolCall {
  id: string;
  toolId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface AIMessageCitation {
  id: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  sourceName: string;
  excerpt: string;
  page?: number;
  section?: string;
  confidence: number;
  url?: string;
}

export interface MessageFeedback {
  rating: 'positive' | 'negative' | 'neutral';
  category?: string;
  comment?: string;
  timestamp: string;
  userId: string;
}

// ============================================================================
// AI TASKS & WORKFLOWS
// ============================================================================

export interface AITask {
  id: string;
  taskId: string;
  name: string;
  description: string;
  taskType: AITaskType;
  
  // Configuration
  agentId?: string;
  modelId: string;
  configuration: AIModelConfiguration;
  
  // Input/Output
  input: TaskInput;
  output?: TaskOutput;
  
  // Execution
  status: AITaskStatus;
  priority: AITaskPriority;
  progress: number;
  
  // Schedule
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  timeout: number;
  
  // Dependencies
  dependsOn: string[];
  blockedBy: string[];
  
  // Module Context
  moduleScope: AIModuleScope;
  entityReferences: EntityReference[];
  
  // Audit
  createdAt: string;
  createdBy: string;
  executedBy?: string;
  
  // Error Handling
  retryCount: number;
  maxRetries: number;
  lastError?: TaskError;
}

export type AITaskType = 
  | 'document-generation' | 'document-review' | 'document-summarization'
  | 'data-extraction' | 'data-analysis' | 'data-validation'
  | 'translation' | 'classification' | 'entity-recognition'
  | 'question-answering' | 'compliance-check' | 'risk-assessment'
  | 'recommendation' | 'prediction' | 'anomaly-detection'
  | 'workflow-step' | 'batch-processing' | 'custom';

export interface TaskInput {
  type: 'text' | 'document' | 'structured' | 'multimodal';
  content: unknown;
  context?: TaskContext;
  parameters?: Record<string, unknown>;
}

export interface TaskContext {
  precedingTasks?: string[];
  relatedDocuments?: string[];
  userInstructions?: string;
  constraints?: TaskConstraint[];
}

export interface TaskConstraint {
  type: 'length' | 'format' | 'content' | 'style' | 'compliance';
  specification: string;
  strictness: 'must' | 'should' | 'may';
}

export interface TaskOutput {
  type: 'text' | 'document' | 'structured' | 'multimodal';
  content: unknown;
  metadata: OutputMetadata;
  quality?: QualityAssessment;
}

export interface OutputMetadata {
  tokenCount: number;
  processingTimeMs: number;
  modelVersion: string;
  citations: AIMessageCitation[];
  confidence: number;
}

export interface QualityAssessment {
  overallScore: number;
  dimensions: QualityDimension[];
  issues: QualityIssue[];
  suggestions: string[];
}

export interface QualityDimension {
  name: string;
  score: number;
  weight: number;
  details: string;
}

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  description: string;
  location?: string;
  suggestion?: string;
}

export interface EntityReference {
  moduleScope: AIModuleScope;
  entityType: string;
  entityId: string;
  entityName: string;
  accessType: 'read' | 'write';
}

export interface TaskError {
  code: string;
  message: string;
  details?: string;
  retryable: boolean;
  timestamp: string;
}

export interface AIWorkflow {
  id: string;
  workflowId: string;
  name: string;
  description: string;
  
  // Definition
  version: string;
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
  
  // Configuration
  triggerConfig: WorkflowTrigger;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  
  // Execution Settings
  maxDuration: number;
  timeoutAction: 'cancel' | 'pause' | 'notify';
  errorHandling: ErrorHandlingConfig;
  
  // Module Context
  moduleScope: AIModuleScope[];
  requiredPermissions: string[];
  
  // Status
  status: AIWorkflowStatus;
  lastRunAt?: string;
  runCount: number;
  successRate: number;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  stepId: string;
  name: string;
  description: string;
  stepType: WorkflowStepType;
  
  // Configuration
  taskType?: AITaskType;
  agentId?: string;
  toolId?: string;
  
  // Input/Output
  inputMapping: FieldMapping[];
  outputMapping: FieldMapping[];
  
  // Execution
  timeout: number;
  retryPolicy?: RetryPolicy;
  
  // Conditions
  skipCondition?: WorkflowCondition;
  
  // Position
  position: { x: number; y: number };
}

export type WorkflowStepType = 
  | 'ai-task' | 'agent-interaction' | 'tool-execution'
  | 'decision' | 'parallel' | 'loop' | 'wait'
  | 'human-review' | 'notification' | 'integration';

export interface FieldMapping {
  source: string;
  target: string;
  transform?: string;
}

export interface WorkflowTransition {
  id: string;
  fromStepId: string;
  toStepId: string;
  condition?: WorkflowCondition;
  label?: string;
}

export interface WorkflowCondition {
  type: 'expression' | 'comparison' | 'state';
  expression: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value?: unknown;
}

export interface WorkflowTrigger {
  type: AutomationTriggerType;
  schedule?: string;
  event?: EventTriggerConfig;
  condition?: WorkflowCondition;
  webhook?: WebhookConfig;
}

export interface EventTriggerConfig {
  eventType: string;
  sourceModule: AIModuleScope;
  entityTypes?: string[];
  filters?: Record<string, unknown>;
}

export interface WebhookConfig {
  endpoint: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  authentication?: AuthConfig;
}

export interface AuthConfig {
  type: 'none' | 'api-key' | 'oauth' | 'basic';
  credentials?: Record<string, string>;
}

export interface ErrorHandlingConfig {
  onError: 'fail' | 'retry' | 'skip' | 'fallback';
  fallbackStepId?: string;
  notifyOnError: boolean;
  notifyRecipients: string[];
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowVersion: string;
  
  // Input/Output
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  
  // Execution
  status: AIWorkflowStatus;
  currentStepId?: string;
  progress: number;
  
  // Step Executions
  stepExecutions: StepExecution[];
  
  // Timing
  startedAt: string;
  completedAt?: string;
  duration?: number;
  
  // Context
  triggeredBy: string;
  triggerType: AutomationTriggerType;
  
  // Error
  error?: TaskError;
}

export interface StepExecution {
  stepId: string;
  status: AITaskStatus;
  input: unknown;
  output?: unknown;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: TaskError;
}

// ============================================================================
// KNOWLEDGE MANAGEMENT
// ============================================================================

export interface KnowledgeBase {
  id: string;
  knowledgeBaseId: string;
  name: string;
  description: string;
  
  // Configuration
  embeddingModelId: string;
  chunkSize: number;
  chunkOverlap: number;
  
  // Sources
  sources: KnowledgeSource[];
  
  // Scope
  moduleScope: AIModuleScope[];
  accessLevel: 'public' | 'restricted' | 'private';
  
  // Statistics
  documentCount: number;
  chunkCount: number;
  totalTokens: number;
  lastIndexedAt?: string;
  
  // Status
  status: 'building' | 'ready' | 'updating' | 'error';
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface KnowledgeSource {
  id: string;
  sourceId: string;
  name: string;
  sourceType: KnowledgeSourceType;
  
  // Connection
  connectionConfig: ConnectionConfig;
  
  // Sync
  syncSchedule?: string;
  lastSyncAt?: string;
  syncStatus: 'synced' | 'syncing' | 'error' | 'pending';
  
  // Filtering
  includePatterns?: string[];
  excludePatterns?: string[];
  
  // Statistics
  documentCount: number;
  lastModified?: string;
}

export interface ConnectionConfig {
  type: 'file' | 'database' | 'api' | 'module';
  config: Record<string, unknown>;
  credentials?: AuthConfig;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  sourceId: string;
  
  // Document Info
  title: string;
  content: string;
  contentType: string;
  
  // Metadata
  metadata: DocumentMetadata;
  
  // Chunking
  chunks: DocumentChunk[];
  
  // Status
  status: 'pending' | 'indexed' | 'error';
  indexedAt?: string;
  
  // Source Reference
  sourceUrl?: string;
  sourceModule?: AIModuleScope;
  sourceEntityId?: string;
}

export interface DocumentMetadata {
  author?: string;
  createdAt?: string;
  modifiedAt?: string;
  version?: string;
  tags?: string[];
  categories?: string[];
  language?: string;
  custom?: Record<string, unknown>;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  section?: string;
  page?: number;
  startOffset: number;
  endOffset: number;
  headings?: string[];
}

export interface KnowledgeQuery {
  id: string;
  query: string;
  knowledgeBaseIds: string[];
  
  // Search Config
  searchType: 'semantic' | 'keyword' | 'hybrid';
  topK: number;
  minScore: number;
  
  // Filters
  filters?: QueryFilter[];
  
  // Results
  results: KnowledgeSearchResult[];
  
  // Timing
  queryTimeMs: number;
  timestamp: string;
}

export interface QueryFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'range';
  value: unknown;
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  knowledgeBaseId: string;
  content: string;
  score: number;
  metadata: ChunkMetadata;
  documentMetadata: DocumentMetadata;
  highlights?: string[];
}

// ============================================================================
// AUTOMATION & TRIGGERS
// ============================================================================

export interface AutomationRule {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  
  // Trigger
  trigger: AutomationTrigger;
  
  // Conditions
  conditions: AutomationCondition[];
  conditionLogic: 'all' | 'any' | 'custom';
  customLogic?: string;
  
  // Actions
  actions: AutomationAction[];
  
  // Scope
  moduleScope: AIModuleScope[];
  
  // Execution
  priority: AITaskPriority;
  maxExecutionsPerHour?: number;
  cooldownMinutes?: number;
  
  // Status
  isEnabled: boolean;
  lastTriggeredAt?: string;
  executionCount: number;
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface AutomationTrigger {
  type: AutomationTriggerType;
  
  // Schedule
  schedule?: ScheduleConfig;
  
  // Event
  eventType?: string;
  eventSourceModule?: AIModuleScope;
  eventEntityTypes?: string[];
  
  // Threshold
  metricId?: string;
  thresholdOperator?: 'above' | 'below' | 'equals' | 'change_by';
  thresholdValue?: number;
  
  // Webhook
  webhookId?: string;
}

export interface ScheduleConfig {
  cronExpression: string;
  timezone: string;
  startDate?: string;
  endDate?: string;
}

export interface AutomationCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'regex';
  value: unknown;
  negate?: boolean;
}

export interface AutomationAction {
  id: string;
  actionType: AutomationActionType;
  
  // Task
  taskConfig?: Partial<AITask>;
  
  // Workflow
  workflowId?: string;
  workflowInput?: Record<string, unknown>;
  
  // Agent
  agentId?: string;
  agentPrompt?: string;
  
  // Notification
  notificationConfig?: NotificationConfig;
  
  // Integration
  integrationConfig?: IntegrationActionConfig;
  
  // Delay
  delayMinutes?: number;
}

export type AutomationActionType = 
  | 'run-task' | 'trigger-workflow' | 'invoke-agent'
  | 'send-notification' | 'update-entity' | 'call-integration'
  | 'create-ticket' | 'escalate';

export interface NotificationConfig {
  channels: ('email' | 'slack' | 'teams' | 'in-app')[];
  recipients: string[];
  template: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface IntegrationActionConfig {
  integrationId: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  
  // Trigger Info
  triggeredAt: string;
  triggerType: AutomationTriggerType;
  triggerEvent?: Record<string, unknown>;
  
  // Condition Evaluation
  conditionsEvaluated: ConditionResult[];
  conditionsPassed: boolean;
  
  // Action Execution
  actionsExecuted: ActionResult[];
  
  // Status
  status: 'success' | 'partial' | 'failed' | 'skipped';
  error?: string;
  
  // Duration
  durationMs: number;
}

export interface ConditionResult {
  conditionId: string;
  result: boolean;
  actualValue?: unknown;
}

export interface ActionResult {
  actionId: string;
  actionType: AutomationActionType;
  status: 'success' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  durationMs: number;
}

// ============================================================================
// AI ANALYTICS & INSIGHTS
// ============================================================================

export interface AIAnalyticsDashboard {
  id: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  
  // Usage Summary
  usageSummary: AIUsageSummary;
  
  // Model Performance
  modelPerformance: ModelPerformanceMetrics[];
  
  // Agent Performance
  agentPerformance: AgentPerformanceMetrics[];
  
  // Workflow Performance
  workflowPerformance: WorkflowPerformanceMetrics[];
  
  // Cost Analysis
  costAnalysis: CostAnalysis;
  
  // Quality Metrics
  qualityMetrics: AIQualityMetrics;
  
  // Trends
  trends: AITrendData[];
  
  // Recommendations
  recommendations: AIRecommendation[];
  
  generatedAt: string;
}

export interface AIUsageSummary {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  
  totalAgentSessions: number;
  averageSessionDuration: number;
  
  totalWorkflowRuns: number;
  workflowSuccessRate: number;
  
  activeUsers: number;
  
  byModule: Record<AIModuleScope, ModuleUsage>;
}

export interface ModuleUsage {
  taskCount: number;
  tokenUsage: number;
  activeUsers: number;
  cost: number;
}

export interface ModelPerformanceMetrics {
  modelId: string;
  modelName: string;
  
  requestCount: number;
  successRate: number;
  
  averageLatencyMs: number;
  p95LatencyMs: number;
  
  averageTokensPerRequest: number;
  
  cost: number;
  costPerRequest: number;
  
  qualityScore: number;
  userSatisfaction: number;
}

export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  agentType: AIAgentType;
  
  totalSessions: number;
  averageSessionLength: number;
  
  taskCompletionRate: number;
  userSatisfactionScore: number;
  
  mostUsedTools: ToolUsageMetric[];
  
  tokenUsage: number;
  cost: number;
}

export interface ToolUsageMetric {
  toolId: string;
  toolName: string;
  invocationCount: number;
  successRate: number;
}

export interface WorkflowPerformanceMetrics {
  workflowId: string;
  workflowName: string;
  
  totalRuns: number;
  successRate: number;
  
  averageDuration: number;
  p95Duration: number;
  
  stepMetrics: StepPerformanceMetric[];
  
  cost: number;
}

export interface StepPerformanceMetric {
  stepId: string;
  stepName: string;
  averageDuration: number;
  successRate: number;
  errorRate: number;
}

export interface CostAnalysis {
  totalCost: number;
  
  byModel: Record<string, number>;
  byModule: Record<AIModuleScope, number>;
  byTaskType: Record<AITaskType, number>;
  
  trend: CostTrendPoint[];
  
  projectedMonthlyCost: number;
  budgetRemaining?: number;
  budgetUtilization?: number;
}

export interface CostTrendPoint {
  date: string;
  cost: number;
  tokenUsage: number;
}

export interface AIQualityMetrics {
  overallScore: number;
  
  accuracy: number;
  relevance: number;
  completeness: number;
  consistency: number;
  
  userFeedbackScore: number;
  positiveRatings: number;
  negativeRatings: number;
  
  complianceScore: number;
  safetyScore: number;
  
  byModule: Record<AIModuleScope, QualityScoreByModule>;
}

export interface QualityScoreByModule {
  overallScore: number;
  taskCount: number;
  feedbackCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AITrendData {
  metric: string;
  dataPoints: TrendDataPoint[];
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface AIRecommendation {
  id: string;
  type: 'optimization' | 'cost-saving' | 'quality' | 'performance' | 'security';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
  estimatedSavings?: number;
}

// ============================================================================
// CROSS-MODULE AI ORCHESTRATION
// ============================================================================

export interface CrossModuleAIConfig {
  id: string;
  
  // Model Defaults
  defaultModelByModule: Record<AIModuleScope, string>;
  defaultAgentByModule: Record<AIModuleScope, string>;
  
  // Feature Flags
  enabledFeatures: AIFeatureFlag[];
  
  // Limits
  globalLimits: AIUsageLimits;
  limitsByModule: Record<AIModuleScope, AIUsageLimits>;
  
  // Safety
  globalSafetyConfig: SafetyConfig;
  
  // Integrations
  enabledIntegrations: string[];
  
  // Audit
  auditLevel: 'minimal' | 'standard' | 'comprehensive';
  retentionDays: number;
}

export interface AIFeatureFlag {
  featureId: string;
  name: string;
  enabled: boolean;
  moduleScope?: AIModuleScope[];
  rolloutPercent?: number;
}

export interface AIUsageLimits {
  maxTokensPerHour: number;
  maxTokensPerDay: number;
  maxRequestsPerMinute: number;
  maxConcurrentTasks: number;
  maxWorkflowsPerHour: number;
}

export interface SafetyConfig {
  contentFiltering: ContentSafetyLevel;
  piiDetection: boolean;
  phiDetection: boolean;
  toxicityThreshold: number;
  
  blockedTopics: string[];
  requiredDisclosures: string[];
  
  humanReviewThreshold: number;
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  id: string;
  condition: WorkflowCondition;
  action: 'notify' | 'pause' | 'block' | 'human-review';
  recipients?: string[];
}

export interface AIModuleIntegration {
  id: string;
  sourceModule: AIModuleScope;
  targetModule: AIModuleScope;
  
  // Data Flow
  dataFlowConfig: DataFlowConfig;
  
  // Triggers
  triggers: CrossModuleTrigger[];
  
  // Transformations
  transformations: DataTransformation[];
  
  isEnabled: boolean;
  lastSyncAt?: string;
}

export interface DataFlowConfig {
  direction: 'source-to-target' | 'bidirectional';
  syncMode: 'real-time' | 'batch' | 'on-demand';
  batchInterval?: string;
}

export interface CrossModuleTrigger {
  id: string;
  sourceEvent: string;
  targetAction: string;
  condition?: WorkflowCondition;
}

export interface DataTransformation {
  id: string;
  sourceField: string;
  targetField: string;
  transformType: 'map' | 'convert' | 'aggregate' | 'custom';
  config: Record<string, unknown>;
}

// ============================================================================
// STATE & STORE
// ============================================================================

export interface AIIntegrationView {
  activeTab: 'dashboard' | 'models' | 'agents' | 'workflows' | 'knowledge' | 'automation' | 'analytics';
  selectedModelId: string | null;
  selectedAgentId: string | null;
  selectedWorkflowId: string | null;
  selectedKnowledgeBaseId: string | null;
  selectedRuleId: string | null;
}

export interface AIIntegrationFilters {
  moduleScope: AIModuleScope[];
  status: AITaskStatus[];
  priority: AITaskPriority[];
  dateRange?: { start: string; end: string };
  searchQuery?: string;
}

export interface AIIntegrationState {
  // Models
  models: Record<string, AIModel>;
  modelConfigurations: Record<string, AIModelConfiguration>;
  modelUsageMetrics: Record<string, ModelUsageMetrics[]>;
  
  // Agents
  agents: Record<string, AIAgent>;
  agentSessions: Record<string, AgentSession>;
  activeSessionsByAgent: Record<string, string[]>;
  
  // Tasks
  tasks: Record<string, AITask>;
  taskQueue: string[];
  runningTasks: string[];
  
  // Workflows
  workflows: Record<string, AIWorkflow>;
  workflowInstances: Record<string, WorkflowInstance>;
  instancesByWorkflow: Record<string, string[]>;
  
  // Knowledge
  knowledgeBases: Record<string, KnowledgeBase>;
  knowledgeSources: Record<string, KnowledgeSource>;
  knowledgeDocuments: Record<string, KnowledgeDocument>;
  
  // Automation
  automationRules: Record<string, AutomationRule>;
  automationExecutions: Record<string, AutomationExecution[]>;
  
  // Analytics
  analytics: AIAnalyticsDashboard | null;
  
  // Configuration
  globalConfig: CrossModuleAIConfig | null;
  moduleIntegrations: Record<string, AIModuleIntegration>;
  
  // UI State
  activeView: AIIntegrationView;
  filters: AIIntegrationFilters;
  isLoading: boolean;
  error: string | null;
}

export interface AIIntegrationActions {
  // Model Management
  registerModel: (data: Partial<AIModel>) => AIModel;
  updateModel: (id: string, updates: Partial<AIModel>) => void;
  deactivateModel: (id: string) => void;
  createModelConfiguration: (data: Partial<AIModelConfiguration>) => AIModelConfiguration;
  updateModelConfiguration: (id: string, updates: Partial<AIModelConfiguration>) => void;
  recordModelUsage: (modelId: string, metrics: Partial<ModelUsageMetrics>) => void;
  
  // Agent Management
  createAgent: (data: Partial<AIAgent>) => AIAgent;
  updateAgent: (id: string, updates: Partial<AIAgent>) => void;
  activateAgent: (id: string) => void;
  deactivateAgent: (id: string) => void;
  addAgentCapability: (agentId: string, capability: Partial<AgentCapability>) => AgentCapability;
  removeAgentCapability: (agentId: string, capabilityId: string) => void;
  addAgentTool: (agentId: string, tool: Partial<AgentTool>) => AgentTool;
  removeAgentTool: (agentId: string, toolId: string) => void;
  
  // Agent Sessions
  startAgentSession: (agentId: string, userId: string, context?: EntityContext) => AgentSession;
  addMessage: (sessionId: string, message: Partial<AgentMessage>) => AgentMessage;
  endSession: (sessionId: string) => void;
  provideMessageFeedback: (sessionId: string, messageId: string, feedback: MessageFeedback) => void;
  
  // Task Management
  createTask: (data: Partial<AITask>) => AITask;
  updateTask: (id: string, updates: Partial<AITask>) => void;
  startTask: (id: string) => void;
  completeTask: (id: string, output: TaskOutput) => void;
  failTask: (id: string, error: TaskError) => void;
  cancelTask: (id: string) => void;
  retryTask: (id: string) => void;
  
  // Workflow Management
  createWorkflow: (data: Partial<AIWorkflow>) => AIWorkflow;
  updateWorkflow: (id: string, updates: Partial<AIWorkflow>) => void;
  addWorkflowStep: (workflowId: string, step: Partial<WorkflowStep>) => WorkflowStep;
  updateWorkflowStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => void;
  removeWorkflowStep: (workflowId: string, stepId: string) => void;
  addWorkflowTransition: (workflowId: string, transition: Partial<WorkflowTransition>) => WorkflowTransition;
  removeWorkflowTransition: (workflowId: string, transitionId: string) => void;
  activateWorkflow: (id: string) => void;
  pauseWorkflow: (id: string) => void;
  archiveWorkflow: (id: string) => void;
  
  // Workflow Execution
  startWorkflowInstance: (workflowId: string, input: Record<string, unknown>, triggeredBy: string) => WorkflowInstance;
  updateStepExecution: (instanceId: string, stepId: string, execution: Partial<StepExecution>) => void;
  completeWorkflowInstance: (instanceId: string, output: Record<string, unknown>) => void;
  failWorkflowInstance: (instanceId: string, error: TaskError) => void;
  
  // Knowledge Management
  createKnowledgeBase: (data: Partial<KnowledgeBase>) => KnowledgeBase;
  updateKnowledgeBase: (id: string, updates: Partial<KnowledgeBase>) => void;
  deleteKnowledgeBase: (id: string) => void;
  addKnowledgeSource: (kbId: string, source: Partial<KnowledgeSource>) => KnowledgeSource;
  removeKnowledgeSource: (kbId: string, sourceId: string) => void;
  syncKnowledgeSource: (kbId: string, sourceId: string) => void;
  indexDocument: (kbId: string, document: Partial<KnowledgeDocument>) => KnowledgeDocument;
  searchKnowledge: (query: Partial<KnowledgeQuery>) => KnowledgeSearchResult[];
  
  // Automation
  createAutomationRule: (data: Partial<AutomationRule>) => AutomationRule;
  updateAutomationRule: (id: string, updates: Partial<AutomationRule>) => void;
  enableAutomationRule: (id: string) => void;
  disableAutomationRule: (id: string) => void;
  deleteAutomationRule: (id: string) => void;
  addAutomationCondition: (ruleId: string, condition: Partial<AutomationCondition>) => AutomationCondition;
  removeAutomationCondition: (ruleId: string, conditionId: string) => void;
  addAutomationAction: (ruleId: string, action: Partial<AutomationAction>) => AutomationAction;
  removeAutomationAction: (ruleId: string, actionId: string) => void;
  executeAutomationRule: (ruleId: string, triggerEvent?: Record<string, unknown>) => AutomationExecution;
  
  // Analytics
  refreshAnalytics: (period?: 'day' | 'week' | 'month') => void;
  
  // Configuration
  updateGlobalConfig: (config: Partial<CrossModuleAIConfig>) => void;
  createModuleIntegration: (data: Partial<AIModuleIntegration>) => AIModuleIntegration;
  updateModuleIntegration: (id: string, updates: Partial<AIModuleIntegration>) => void;
  
  // UI Actions
  setActiveView: (view: Partial<AIIntegrationView>) => void;
  setFilters: (filters: Partial<AIIntegrationFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utility
  clearAll: () => void;
  generateMockData: () => void;
}
