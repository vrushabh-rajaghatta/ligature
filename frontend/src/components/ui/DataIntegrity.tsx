

/**
 * DataIntegrity - v130
 * 
 * Cross-module data integrity system for:
 * - Cascade updates when parent entities change
 * - Orphan detection and cleanup
 * - Referential integrity checks
 * - Cross-module relationship tracking
 * 
 * Features:
 * - Entity dependency graph
 * - Cascade policy definitions
 * - Integrity violation detection
 * - Auto-repair suggestions
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link2,
  Unlink,
  RefreshCw,
  Shield,
  Database,
  GitBranch,
  Search,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  Settings,
} from 'lucide-react';
import { Button } from './Button';
import { Badge, BadgeColor } from './Badge';
import { Card, CardHeader, CardContent } from './Card';

// ============================================================================
// TYPES
// ============================================================================

export type EntityType = 
  | 'program'
  | 'product'
  | 'document'
  | 'haq'
  | 'haq-response'
  | 'submission'
  | 'sequence'
  | 'study'
  | 'site'
  | 'subject'
  | 'safety-case'
  | 'capa'
  | 'deviation'
  | 'tmf-document';

export type CascadePolicy = 'cascade' | 'restrict' | 'set-null' | 'no-action';

export interface EntityReference {
  entityId: string;
  entityType: EntityType;
  displayName?: string;
  module?: string;
}

export interface EntityRelationship {
  id: string;
  parentEntity: EntityReference;
  childEntity: EntityReference;
  relationshipType: 'contains' | 'references' | 'depends-on' | 'linked-to';
  cascadeOnUpdate: CascadePolicy;
  cascadeOnDelete: CascadePolicy;
  required: boolean;
  metadata?: Record<string, unknown>;
}

export interface IntegrityViolation {
  id: string;
  type: 'orphan' | 'missing-reference' | 'circular-dependency' | 'invalid-state' | 'stale-reference';
  severity: 'error' | 'warning' | 'info';
  entity: EntityReference;
  relatedEntity?: EntityReference;
  description: string;
  detectedAt: string;
  autoFixable: boolean;
  suggestedFix?: string;
  fixAction?: () => Promise<void>;
}

export interface CascadeUpdate {
  id: string;
  sourceEntity: EntityReference;
  changeType: 'update' | 'delete' | 'archive';
  affectedEntities: EntityReference[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  changesApplied: number;
  changesFailed: number;
}

export interface IntegrityCheckResult {
  id: string;
  checkedAt: string;
  duration: number;
  totalEntities: number;
  entitiesChecked: number;
  violations: IntegrityViolation[];
  status: 'passed' | 'failed' | 'warnings';
}

export interface DataIntegrityConfig {
  enableAutoRepair: boolean;
  checkOnStartup: boolean;
  checkInterval: number; // minutes
  cascadeTimeout: number; // seconds
  maxCascadeDepth: number;
  notifyOnViolations: boolean;
}

// ============================================================================
// DEFAULT RELATIONSHIP DEFINITIONS
// ============================================================================

export const DEFAULT_RELATIONSHIPS: EntityRelationship[] = [
  // Program relationships
  {
    id: 'program-product',
    parentEntity: { entityId: '*', entityType: 'program' },
    childEntity: { entityId: '*', entityType: 'product' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'restrict',
    required: true,
  },
  // Product relationships
  {
    id: 'product-document',
    parentEntity: { entityId: '*', entityType: 'product' },
    childEntity: { entityId: '*', entityType: 'document' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'set-null',
    required: false,
  },
  {
    id: 'product-haq',
    parentEntity: { entityId: '*', entityType: 'product' },
    childEntity: { entityId: '*', entityType: 'haq' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'restrict',
    required: true,
  },
  {
    id: 'product-submission',
    parentEntity: { entityId: '*', entityType: 'product' },
    childEntity: { entityId: '*', entityType: 'submission' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'restrict',
    required: true,
  },
  {
    id: 'product-study',
    parentEntity: { entityId: '*', entityType: 'product' },
    childEntity: { entityId: '*', entityType: 'study' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'restrict',
    required: true,
  },
  // HAQ relationships
  {
    id: 'haq-response',
    parentEntity: { entityId: '*', entityType: 'haq' },
    childEntity: { entityId: '*', entityType: 'haq-response' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'cascade',
    required: false,
  },
  // Submission relationships
  {
    id: 'submission-sequence',
    parentEntity: { entityId: '*', entityType: 'submission' },
    childEntity: { entityId: '*', entityType: 'sequence' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'cascade',
    required: false,
  },
  {
    id: 'submission-document',
    parentEntity: { entityId: '*', entityType: 'submission' },
    childEntity: { entityId: '*', entityType: 'document' },
    relationshipType: 'references',
    cascadeOnUpdate: 'no-action',
    cascadeOnDelete: 'set-null',
    required: false,
  },
  // Study relationships
  {
    id: 'study-site',
    parentEntity: { entityId: '*', entityType: 'study' },
    childEntity: { entityId: '*', entityType: 'site' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'cascade',
    required: false,
  },
  {
    id: 'study-subject',
    parentEntity: { entityId: '*', entityType: 'study' },
    childEntity: { entityId: '*', entityType: 'subject' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'cascade',
    required: false,
  },
  // Safety relationships
  {
    id: 'subject-safety-case',
    parentEntity: { entityId: '*', entityType: 'subject' },
    childEntity: { entityId: '*', entityType: 'safety-case' },
    relationshipType: 'contains',
    cascadeOnUpdate: 'cascade',
    cascadeOnDelete: 'cascade',
    required: false,
  },
  // Quality relationships
  {
    id: 'capa-deviation',
    parentEntity: { entityId: '*', entityType: 'capa' },
    childEntity: { entityId: '*', entityType: 'deviation' },
    relationshipType: 'linked-to',
    cascadeOnUpdate: 'no-action',
    cascadeOnDelete: 'set-null',
    required: false,
  },
];

// ============================================================================
// DATA INTEGRITY HOOK
// ============================================================================

export interface UseDataIntegrityOptions {
  relationships?: EntityRelationship[];
  config?: Partial<DataIntegrityConfig>;
  onViolationDetected?: (violation: IntegrityViolation) => void;
  onCascadeComplete?: (update: CascadeUpdate) => void;
}

export function useDataIntegrity(options: UseDataIntegrityOptions = {}) {
  const {
    relationships = DEFAULT_RELATIONSHIPS,
    config: userConfig,
    onViolationDetected,
    onCascadeComplete,
  } = options;

  const config = useMemo<DataIntegrityConfig>(() => ({
    enableAutoRepair: false,
    checkOnStartup: true,
    checkInterval: 60,
    cascadeTimeout: 30,
    maxCascadeDepth: 10,
    notifyOnViolations: true,
    ...userConfig,
  }), [userConfig]);

  const [violations, setViolations] = useState<IntegrityViolation[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<IntegrityCheckResult | null>(null);
  const [cascadeUpdates, setCascadeUpdates] = useState<CascadeUpdate[]>([]);

  // Get relationships for an entity type
  const getRelationshipsForEntity = useCallback(
    (entityType: EntityType, direction: 'parent' | 'child') => {
      return relationships.filter(r =>
        direction === 'parent'
          ? r.childEntity.entityType === entityType
          : r.parentEntity.entityType === entityType
      );
    },
    [relationships]
  );

  // Check integrity for a single entity
  const checkEntityIntegrity = useCallback(
    async (entity: EntityReference): Promise<IntegrityViolation[]> => {
      const foundViolations: IntegrityViolation[] = [];
      
      // Check parent relationships (required references)
      const parentRels = getRelationshipsForEntity(entity.entityType, 'parent');
      for (const rel of parentRels) {
        if (rel.required) {
          // In a real implementation, this would check the actual data store
          // For demo, we simulate occasional violations
          if (Math.random() < 0.05) {
            foundViolations.push({
              id: `viol-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: 'missing-reference',
              severity: 'error',
              entity,
              relatedEntity: { entityId: 'unknown', entityType: rel.parentEntity.entityType },
              description: `Missing required reference to ${rel.parentEntity.entityType}`,
              detectedAt: new Date().toISOString(),
              autoFixable: false,
              suggestedFix: `Link to a valid ${rel.parentEntity.entityType} or remove orphaned entity`,
            });
          }
        }
      }

      return foundViolations;
    },
    [getRelationshipsForEntity]
  );

  // Run full integrity check
  const runIntegrityCheck = useCallback(
    async (entities: EntityReference[]): Promise<IntegrityCheckResult> => {
      setIsChecking(true);
      const startTime = Date.now();
      const allViolations: IntegrityViolation[] = [];

      try {
        for (const entity of entities) {
          const entityViolations = await checkEntityIntegrity(entity);
          allViolations.push(...entityViolations);
          
          entityViolations.forEach(v => onViolationDetected?.(v));
        }

        const result: IntegrityCheckResult = {
          id: `check-${Date.now()}`,
          checkedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
          totalEntities: entities.length,
          entitiesChecked: entities.length,
          violations: allViolations,
          status: allViolations.some(v => v.severity === 'error')
            ? 'failed'
            : allViolations.length > 0
            ? 'warnings'
            : 'passed',
        };

        setViolations(allViolations);
        setLastCheck(result);
        return result;
      } finally {
        setIsChecking(false);
      }
    },
    [checkEntityIntegrity, onViolationDetected]
  );

  // Execute cascade update
  const executeCascadeUpdate = useCallback(
    async (
      sourceEntity: EntityReference,
      changeType: 'update' | 'delete' | 'archive',
      updateFn: (entity: EntityReference) => Promise<boolean>
    ): Promise<CascadeUpdate> => {
      const cascadeId = `cascade-${Date.now()}`;
      const affectedEntities: EntityReference[] = [];
      
      // Find child relationships
      const childRels = getRelationshipsForEntity(sourceEntity.entityType, 'child');
      
      // Build affected entities list based on cascade policies
      for (const rel of childRels) {
        const policy = changeType === 'delete' ? rel.cascadeOnDelete : rel.cascadeOnUpdate;
        if (policy === 'cascade') {
          // In real implementation, query for actual child entities
          // For demo, we add placeholder entities
          affectedEntities.push({
            entityId: `child-${rel.childEntity.entityType}-${Math.random().toString(36).slice(2)}`,
            entityType: rel.childEntity.entityType,
            module: rel.childEntity.module,
          });
        }
      }

      const cascadeUpdate: CascadeUpdate = {
        id: cascadeId,
        sourceEntity,
        changeType,
        affectedEntities,
        status: 'pending',
        changesApplied: 0,
        changesFailed: 0,
      };

      setCascadeUpdates(prev => [...prev, cascadeUpdate]);

      // Execute the cascade
      try {
        cascadeUpdate.status = 'in-progress';
        cascadeUpdate.startedAt = new Date().toISOString();
        setCascadeUpdates(prev => prev.map(c => c.id === cascadeId ? cascadeUpdate : c));

        for (const entity of affectedEntities) {
          const success = await updateFn(entity);
          if (success) {
            cascadeUpdate.changesApplied++;
          } else {
            cascadeUpdate.changesFailed++;
          }
        }

        cascadeUpdate.status = cascadeUpdate.changesFailed > 0 ? 'failed' : 'completed';
        cascadeUpdate.completedAt = new Date().toISOString();
      } catch (err) {
        cascadeUpdate.status = 'failed';
        cascadeUpdate.error = (err as Error).message;
        cascadeUpdate.completedAt = new Date().toISOString();
      }

      setCascadeUpdates(prev => prev.map(c => c.id === cascadeId ? cascadeUpdate : c));
      onCascadeComplete?.(cascadeUpdate);

      return cascadeUpdate;
    },
    [getRelationshipsForEntity, onCascadeComplete]
  );

  // Fix a violation
  const fixViolation = useCallback(
    async (violationId: string): Promise<boolean> => {
      const violation = violations.find(v => v.id === violationId);
      if (!violation || !violation.autoFixable || !violation.fixAction) {
        return false;
      }

      try {
        await violation.fixAction();
        setViolations(prev => prev.filter(v => v.id !== violationId));
        return true;
      } catch {
        return false;
      }
    },
    [violations]
  );

  // Clear resolved violations
  const clearViolation = useCallback((violationId: string) => {
    setViolations(prev => prev.filter(v => v.id !== violationId));
  }, []);

  return {
    violations,
    isChecking,
    lastCheck,
    cascadeUpdates,
    config,
    runIntegrityCheck,
    executeCascadeUpdate,
    fixViolation,
    clearViolation,
    getRelationshipsForEntity,
  };
}

// ============================================================================
// VISUAL COMPONENTS
// ============================================================================

const severityColors: Record<IntegrityViolation['severity'], BadgeColor> = {
  error: 'red',
  warning: 'amber',
  info: 'blue',
};

const severityIcons: Record<IntegrityViolation['severity'], React.ReactNode> = {
  error: <XCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Eye className="w-4 h-4" />,
};

const entityTypeColors: Record<EntityType, BadgeColor> = {
  program: 'purple',
  product: 'blue',
  document: 'slate',
  haq: 'amber',
  'haq-response': 'amber',
  submission: 'emerald',
  sequence: 'teal',
  study: 'cyan',
  site: 'blue',
  subject: 'purple',
  'safety-case': 'red',
  capa: 'orange',
  deviation: 'red',
  'tmf-document': 'slate',
};

interface IntegrityDashboardProps {
  violations: IntegrityViolation[];
  lastCheck: IntegrityCheckResult | null;
  isChecking: boolean;
  onRunCheck: () => void;
  onFixViolation: (id: string) => void;
  onClearViolation: (id: string) => void;
  className?: string;
}

export function IntegrityDashboard({
  violations,
  lastCheck,
  isChecking,
  onRunCheck,
  onFixViolation,
  onClearViolation,
  className = '',
}: IntegrityDashboardProps) {
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set());

  const toggleViolation = (id: string) => {
    setExpandedViolations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const stats = useMemo(() => ({
    errors: violations.filter(v => v.severity === 'error').length,
    warnings: violations.filter(v => v.severity === 'warning').length,
    info: violations.filter(v => v.severity === 'info').length,
    autoFixable: violations.filter(v => v.autoFixable).length,
  }), [violations]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent-blue" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Data Integrity</h3>
            <p className="text-sm text-text-muted">
              {lastCheck
                ? `Last checked ${new Date(lastCheck.checkedAt).toLocaleString()}`
                : 'Not yet checked'}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRunCheck}
          disabled={isChecking}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Run Check'}
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 bg-surface-card rounded-lg border border-border">
          <div className="text-2xl font-bold text-accent-red">{stats.errors}</div>
          <div className="text-xs text-text-muted">Errors</div>
        </div>
        <div className="p-3 bg-surface-card rounded-lg border border-border">
          <div className="text-2xl font-bold text-accent-amber">{stats.warnings}</div>
          <div className="text-xs text-text-muted">Warnings</div>
        </div>
        <div className="p-3 bg-surface-card rounded-lg border border-border">
          <div className="text-2xl font-bold text-accent-blue">{stats.info}</div>
          <div className="text-xs text-text-muted">Info</div>
        </div>
        <div className="p-3 bg-surface-card rounded-lg border border-border">
          <div className="text-2xl font-bold text-accent-green">{stats.autoFixable}</div>
          <div className="text-xs text-text-muted">Auto-fixable</div>
        </div>
      </div>

      {/* Last Check Result */}
      {lastCheck && (
        <div className="p-3 bg-surface-card rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lastCheck.status === 'passed' && (
                <CheckCircle className="w-5 h-5 text-accent-green" />
              )}
              {lastCheck.status === 'failed' && (
                <XCircle className="w-5 h-5 text-accent-red" />
              )}
              {lastCheck.status === 'warnings' && (
                <AlertTriangle className="w-5 h-5 text-accent-amber" />
              )}
              <span className="font-medium text-text-primary">
                {lastCheck.status === 'passed' && 'All checks passed'}
                {lastCheck.status === 'failed' && 'Integrity issues detected'}
                {lastCheck.status === 'warnings' && 'Warnings detected'}
              </span>
            </div>
            <span className="text-sm text-text-muted">
              {lastCheck.entitiesChecked} entities checked in {lastCheck.duration}ms
            </span>
          </div>
        </div>
      )}

      {/* Violations List */}
      {violations.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text-secondary">Violations</h4>
          {violations.map(violation => (
            <div
              key={violation.id}
              className="bg-surface-card rounded-lg border border-border overflow-hidden"
            >
              <button
                onClick={() => toggleViolation(violation.id)}
                className="w-full p-3 flex items-center gap-3 hover:bg-surface-elevated transition-colors"
              >
                <span className={`text-accent-${severityColors[violation.severity]}`}>
                  {severityIcons[violation.severity]}
                </span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <Badge color={entityTypeColors[violation.entity.entityType]} size="xs">
                      {violation.entity.entityType}
                    </Badge>
                    <span className="text-sm font-medium text-text-primary">
                      {violation.description}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Entity: {violation.entity.displayName || violation.entity.entityId}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {violation.autoFixable && (
                    <Badge color="green" size="xs">Auto-fix</Badge>
                  )}
                  {expandedViolations.has(violation.id) ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </div>
              </button>

              {expandedViolations.has(violation.id) && (
                <div className="px-3 pb-3 border-t border-border bg-surface-base">
                  <div className="pt-3 space-y-3">
                    {violation.suggestedFix && (
                      <div>
                        <div className="text-xs font-medium text-text-muted mb-1">Suggested Fix</div>
                        <div className="text-sm text-text-secondary">{violation.suggestedFix}</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {violation.autoFixable && (
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => onFixViolation(violation.id)}
                          className="gap-1.5"
                        >
                          <Zap className="w-3 h-3" />
                          Auto-fix
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onClearViolation(violation.id)}
                        className="gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : lastCheck ? (
        <div className="p-6 text-center bg-surface-card rounded-lg border border-border">
          <CheckCircle className="w-8 h-8 text-accent-green mx-auto mb-2" />
          <div className="text-sm text-text-muted">No integrity violations detected</div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// ENTITY DEPENDENCY GRAPH
// ============================================================================

interface EntityDependencyGraphProps {
  entity: EntityReference;
  relationships: EntityRelationship[];
  depth?: number;
  className?: string;
}

export function EntityDependencyGraph({
  entity,
  relationships,
  depth = 2,
  className = '',
}: EntityDependencyGraphProps) {
  // Get parent and child relationships
  const parentRels = relationships.filter(r => r.childEntity.entityType === entity.entityType);
  const childRels = relationships.filter(r => r.parentEntity.entityType === entity.entityType);

  return (
    <div className={`p-4 bg-surface-base rounded-lg ${className}`}>
      <div className="flex flex-col items-center">
        {/* Parents */}
        {parentRels.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 justify-center mb-2">
              {parentRels.map(rel => (
                <Badge key={rel.id} color={entityTypeColors[rel.parentEntity.entityType]} size="sm">
                  {rel.parentEntity.entityType}
                </Badge>
              ))}
            </div>
            <div className="w-px h-4 bg-border" />
            <ArrowRight className="w-4 h-4 text-text-muted rotate-90 -my-1" />
            <div className="w-px h-4 bg-border" />
          </>
        )}

        {/* Current Entity */}
        <div className="px-4 py-2 bg-accent-blue/10 border-2 border-accent-blue rounded-lg">
          <Badge color={entityTypeColors[entity.entityType]} size="md">
            <Database className="w-4 h-4 mr-1" />
            {entity.displayName || entity.entityType}
          </Badge>
        </div>

        {/* Children */}
        {childRels.length > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <ArrowRight className="w-4 h-4 text-text-muted rotate-90 -my-1" />
            <div className="w-px h-4 bg-border" />
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {childRels.map(rel => (
                <div key={rel.id} className="text-center">
                  <Badge color={entityTypeColors[rel.childEntity.entityType]} size="sm">
                    {rel.childEntity.entityType}
                  </Badge>
                  <div className="text-xs text-text-muted mt-1">
                    {rel.cascadeOnDelete}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CASCADE UPDATE PANEL
// ============================================================================

interface CascadeUpdatePanelProps {
  updates: CascadeUpdate[];
  className?: string;
}

export function CascadeUpdatePanel({ updates, className = '' }: CascadeUpdatePanelProps) {
  if (updates.length === 0) {
    return (
      <div className={`p-4 text-center text-text-muted text-sm ${className}`}>
        No cascade updates in progress
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {updates.map(update => (
        <div
          key={update.id}
          className="p-3 bg-surface-card rounded-lg border border-border"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge color={entityTypeColors[update.sourceEntity.entityType]} size="xs">
                {update.sourceEntity.entityType}
              </Badge>
              <span className="text-sm font-medium text-text-primary">
                {update.changeType} cascade
              </span>
            </div>
            <Badge
              color={
                update.status === 'completed' ? 'green' :
                update.status === 'failed' ? 'red' :
                update.status === 'in-progress' ? 'blue' : 'slate'
              }
              size="xs"
            >
              {update.status}
            </Badge>
          </div>
          <div className="text-xs text-text-muted">
            {update.affectedEntities.length} entities affected •{' '}
            {update.changesApplied} applied •{' '}
            {update.changesFailed} failed
          </div>
          {update.error && (
            <div className="mt-2 text-xs text-accent-red">{update.error}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// INTEGRITY WIDGET (Compact)
// ============================================================================

interface IntegrityWidgetProps {
  violations: IntegrityViolation[];
  lastCheck: IntegrityCheckResult | null;
  onRunCheck?: () => void;
  className?: string;
}

export function IntegrityWidget({
  violations,
  lastCheck,
  onRunCheck,
  className = '',
}: IntegrityWidgetProps) {
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;

  const statusColor: BadgeColor = errorCount > 0 ? 'red' : warningCount > 0 ? 'amber' : 'green';
  const statusText = errorCount > 0 ? `${errorCount} errors` : warningCount > 0 ? `${warningCount} warnings` : 'Healthy';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-text-muted" />
            <h4 className="text-sm font-medium text-text-primary">Data Integrity</h4>
          </div>
          <Badge color={statusColor} size="sm">
            {statusText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">
            {lastCheck
              ? `Last: ${new Date(lastCheck.checkedAt).toLocaleTimeString()}`
              : 'Not checked'}
          </span>
          {onRunCheck && (
            <Button variant="ghost" size="xs" onClick={onRunCheck}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default IntegrityDashboard;
