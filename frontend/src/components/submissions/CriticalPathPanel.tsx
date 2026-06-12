// ============================================================================
// CriticalPathPanel — v0.64.0
// LIG-016 COMPLETE: Critical Path Visualisation and Dependency Linking
// SVG dependency graph · circular dependency detection · zero-slack calculation
// ============================================================================


import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  X, AlertTriangle, GitBranch, LayoutGrid,
  ZoomIn, ZoomOut, Maximize2, Info, Crown, Flag,
} from 'lucide-react';
import {
  GlobalSubmissionPlan, GSPTask, TaskSection,
} from '@/data/global-submission-plan-data';
import {
  calculateCriticalPath, detectCircularDependencies, topologicalSort,
} from '@/lib/date-calculation-engine';

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

const NODE_W = 180;
const NODE_H = 52;
const H_GAP = 60;   // horizontal gap between levels
const V_GAP = 20;   // vertical gap between nodes in same level

const SECTION_COLORS: Record<TaskSection, { fill: string; stroke: string; text: string }> = {
  M1: { fill: '#2d1b69', stroke: '#7c3aed', text: '#a78bfa' },
  M2: { fill: '#0c3341', stroke: '#0891b2', text: '#67e8f9' },
  M3: { fill: '#362003', stroke: '#d97706', text: '#fbbf24' },
  M4: { fill: '#3b1035', stroke: '#be185d', text: '#f472b6' },
  M5: { fill: '#0a2e1a', stroke: '#059669', text: '#34d399' },
};

// ============================================================================
// GRAPH LAYOUT ENGINE
// ============================================================================

interface LayoutNode {
  task: GSPTask;
  x: number;
  y: number;
  level: number;
  isCritical: boolean;
}

function layoutGraph(
  tasks: GSPTask[],
  criticalIds: Set<string>,
): LayoutNode[] {
  const workTasks = tasks.filter(t => !t.isHolidayRow && t.status !== 'inactive');
  const idToTask = new Map(workTasks.map(t => [t.id, t]));
  const sorted = topologicalSort(workTasks);

  // Assign levels via longest-path from leaves
  const levels = new Map<string, number>();
  for (const task of sorted) {
    const predLevels = (task.predecessorIds ?? [])
      .map(pid => levels.get(pid) ?? 0);
    levels.set(task.id, predLevels.length > 0 ? Math.max(...predLevels) + 1 : 0);
  }

  // Group by level
  const byLevel = new Map<number, GSPTask[]>();
  for (const task of sorted) {
    const lv = levels.get(task.id) ?? 0;
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv)!.push(task);
  }

  // Assign positions
  const nodes: LayoutNode[] = [];
  const maxLevel = Math.max(...Array.from(levels.values()), 0);

  for (let lv = 0; lv <= maxLevel; lv++) {
    const lvTasks = byLevel.get(lv) ?? [];
    lvTasks.forEach((task, idx) => {
      nodes.push({
        task,
        x: lv * (NODE_W + H_GAP),
        y: idx * (NODE_H + V_GAP),
        level: lv,
        isCritical: criticalIds.has(task.id),
      });
    });
  }

  return nodes;
}

// ============================================================================
// EDGE RENDERING
// ============================================================================

function renderEdges(nodes: LayoutNode[], criticalIds: Set<string>): React.ReactElement[] {
  const idToNode = new Map(nodes.map(n => [n.task.id, n]));
  const edges: React.ReactElement[] = [];

  for (const node of nodes) {
    for (const predId of node.task.predecessorIds ?? []) {
      const predNode = idToNode.get(predId);
      if (!predNode) continue;

      const x1 = predNode.x + NODE_W;
      const y1 = predNode.y + NODE_H / 2;
      const x2 = node.x;
      const y2 = node.y + NODE_H / 2;
      const mx = (x1 + x2) / 2;
      const isCritical = criticalIds.has(node.task.id) && criticalIds.has(predId);

      edges.push(
        <path
          key={`${predId}-${node.task.id}`}
          d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke={isCritical ? '#f59e0b' : '#374151'}
          strokeWidth={isCritical ? 2.5 : 1.5}
          strokeDasharray={isCritical ? undefined : '4,3'}
          markerEnd={`url(#arrowhead-${isCritical ? 'critical' : 'normal'})`}
        />
      );
    }
  }
  return edges;
}

// ============================================================================
// MAIN PANEL
// ============================================================================

interface CriticalPathPanelProps {
  plan: GlobalSubmissionPlan;
  onClose: () => void;
  onJumpToTask?: (taskId: string) => void;
}

export function CriticalPathPanel({ plan, onClose, onJumpToTask }: CriticalPathPanelProps) {
  const [zoom, setZoom] = useState(0.75);
  const [selectedTask, setSelectedTask] = useState<GSPTask | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute critical path + detect circular dependencies
  const workTasks = useMemo(
    () => plan.tasks.filter(t => !t.isHolidayRow && t.status !== 'inactive'),
    [plan.tasks],
  );
  const criticalIds = useMemo(() => calculateCriticalPath(workTasks), [workTasks]);
  const circles = useMemo(() => detectCircularDependencies(workTasks), [workTasks]);
  const nodes = useMemo(() => layoutGraph(workTasks, criticalIds), [workTasks, criticalIds]);
  const edges = useMemo(() => renderEdges(nodes, criticalIds), [nodes, criticalIds]);

  // SVG canvas size
  const canvasW = nodes.length > 0
    ? Math.max(...nodes.map(n => n.x)) + NODE_W + 60
    : 600;
  const canvasH = nodes.length > 0
    ? Math.max(...nodes.map(n => n.y)) + NODE_H + 40
    : 300;

  const criticalCount = workTasks.filter(t => criticalIds.has(t.id)).length;
  const dependencyCount = workTasks.reduce((s, t) => s + (t.predecessorIds?.length ?? 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col" onClick={onClose}>
      <div
        className="flex flex-col bg-surface-elevated h-full max-h-full overflow-hidden"
        style={{ maxWidth: '100vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-border flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-text-primary">Critical Path &amp; Dependency Graph</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted ml-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {criticalCount} critical tasks
            </span>
            <span>{dependencyCount} dependency links</span>
            {circles.length > 0 && (
              <span className="flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                {circles.length} circular reference{circles.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {/* Zoom controls */}
            <button
              onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
              className="p-1.5 rounded hover:bg-surface-card text-text-muted"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
              className="p-1.5 rounded hover:bg-surface-card text-text-muted"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(0.75)}
              className="p-1.5 rounded hover:bg-surface-card text-text-muted"
              title="Reset zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={onClose} className="p-1.5 hover:bg-surface-card rounded">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Circular dependency warning */}
        {circles.length > 0 && (
          <div className="flex-shrink-0 mx-5 mt-3 flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Circular Dependency Detected</p>
              {circles.map((cycle, i) => (
                <p key={i} className="text-xs text-text-muted mt-0.5 font-mono">
                  {cycle.join(' → ')}
                </p>
              ))}
              <p className="text-xs text-text-muted mt-1">
                Circular references prevent critical path calculation. Resolve before calculating dates.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* SVG canvas */}
          <div className="flex-1 overflow-auto p-4 bg-surface">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', minWidth: canvasW * zoom, minHeight: canvasH * zoom }}>
              <svg
                ref={svgRef}
                width={canvasW}
                height={canvasH}
                className="select-none"
              >
                <defs>
                  <marker id="arrowhead-critical" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                  </marker>
                  <marker id="arrowhead-normal" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#374151" />
                  </marker>
                  <filter id="node-shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                  </filter>
                </defs>

                {/* Edges */}
                <g>{edges}</g>

                {/* Nodes */}
                {nodes.map(({ task, x, y, isCritical }) => {
                  const sectionCfg = SECTION_COLORS[task.moduleSection as TaskSection] ?? SECTION_COLORS.M1;
                  const isSelected = selectedTask?.id === task.id;

                  return (
                    <g
                      key={task.id}
                      transform={`translate(${x}, ${y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedTask(isSelected ? null : task)}
                    >
                      {/* Node background */}
                      <rect
                        width={NODE_W}
                        height={NODE_H}
                        rx={6}
                        fill={sectionCfg.fill}
                        stroke={isCritical ? '#f59e0b' : sectionCfg.stroke}
                        strokeWidth={isCritical ? 2.5 : 1.5}
                        filter={isSelected ? 'url(#node-shadow)' : undefined}
                      />
                      {/* Critical path amber left-bar */}
                      {isCritical && (
                        <rect width={4} height={NODE_H} rx={2} fill="#f59e0b" />
                      )}

                      {/* Task name */}
                      <foreignObject x={8} y={6} width={NODE_W - 16} height={28}>
                        <div
                          // @ts-ignore
                          xmlns="http://www.w3.org/1999/xhtml"
                          style={{
                            fontSize: 10,
                            fontFamily: 'system-ui, sans-serif',
                            color: '#e5e7eb',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.3,
                          }}
                        >
                          {task.taskName}
                        </div>
                      </foreignObject>

                      {/* Footer: section badge + row num */}
                      <text x={8} y={NODE_H - 8} fontSize={9} fill={sectionCfg.text} fontFamily="monospace">
                        {task.moduleSection} · §{task.ctdSection}
                      </text>
                      <text x={NODE_W - 8} y={NODE_H - 8} fontSize={9} fill="#6b7280" textAnchor="end" fontFamily="monospace">
                        #{task.rowNum}
                      </text>

                      {/* Critical badge */}
                      {isCritical && (
                        <rect x={NODE_W - 24} y={2} width={22} height={12} rx={3} fill="#f59e0b33" />
                      )}
                      {isCritical && (
                        <text x={NODE_W - 13} y={11} fontSize={8} fill="#f59e0b" textAnchor="middle" fontFamily="system-ui">
                          ⚡
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Detail panel */}
          {selectedTask && (
            <div className="w-72 flex-shrink-0 border-l border-border overflow-auto p-4 bg-surface-elevated">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary">Task Detail</h3>
                <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-surface-card rounded">
                  <X className="w-3.5 h-3.5 text-text-muted" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-muted mb-1">Task Name</p>
                  <p className="text-sm text-text-primary font-medium">{selectedTask.taskName}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-text-muted mb-0.5">Module</p>
                    <p className="text-text-secondary">{selectedTask.moduleSection}</p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-0.5">CTD Section</p>
                    <p className="text-text-secondary font-mono">{selectedTask.ctdSection}</p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-0.5">Duration</p>
                    <p className="text-text-secondary">{selectedTask.duration ?? '—'} days</p>
                  </div>
                  <div>
                    <p className="text-text-muted mb-0.5">Critical Path</p>
                    <p className={criticalIds.has(selectedTask.id) ? 'text-amber-400 font-medium' : 'text-text-secondary'}>
                      {criticalIds.has(selectedTask.id) ? '⚡ Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {selectedTask.predecessorIds && selectedTask.predecessorIds.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1.5">Predecessors</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTask.predecessorIds.map(pid => {
                        const predTask = plan.tasks.find(t => t.id === pid);
                        return (
                          <button
                            key={pid}
                            onClick={() => {
                              const t = plan.tasks.find(x => x.id === pid);
                              if (t) setSelectedTask(t);
                            }}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-accent-blue hover:text-accent-blue/80"
                          >
                            #{predTask?.rowNum ?? pid}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Derive successors */}
                {(() => {
                  const succs = workTasks.filter(t => t.predecessorIds?.includes(selectedTask.id));
                  return succs.length > 0 ? (
                    <div>
                      <p className="text-xs text-text-muted mb-1.5">Successors</p>
                      <div className="flex flex-wrap gap-1">
                        {succs.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedTask(s)}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-cyan-400 hover:text-cyan-300"
                          >
                            #{s.rowNum}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="grid grid-cols-1 gap-1 text-xs">
                  {selectedTask.plannedStartDate && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Start</span>
                      <span className={`${selectedTask.isDateCalculated ? 'text-amber-300' : ''} ${selectedTask.isDateOverridden ? 'text-violet-400' : 'text-text-secondary'}`}>
                        {selectedTask.plannedStartDate}
                        {selectedTask.isDateOverridden && ' ✎'}
                        {selectedTask.isDateCalculated && !selectedTask.isDateOverridden && ' ⚡'}
                      </span>
                    </div>
                  )}
                  {selectedTask.plannedFinishDate && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Finish</span>
                      <span className="text-text-secondary">{selectedTask.plannedFinishDate}</span>
                    </div>
                  )}
                </div>

                {onJumpToTask && (
                  <button
                    onClick={() => { onJumpToTask(selectedTask.id); onClose(); }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-accent-blue hover:text-accent-blue/80 flex items-center justify-center gap-1.5"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    Jump to row in plan grid
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-border flex flex-wrap items-center gap-5 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-12 h-0.5 bg-amber-500" style={{ background: 'repeating-linear-gradient(90deg, #f59e0b 0 6px, transparent 6px 10px)' }} />
            <span>Critical path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-0.5 border-t-2 border-dashed border-[#374151]" />
            <span>Non-critical dependency</span>
          </div>
          {Object.entries(SECTION_COLORS).map(([section, cfg]) => (
            <div key={section} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: cfg.fill, border: `1.5px solid ${cfg.stroke}` }} />
              <span>{section}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CriticalPathPanel;
