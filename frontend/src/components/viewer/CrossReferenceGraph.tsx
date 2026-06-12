

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, RefreshCw, Filter,
  Quote, Link2, ArrowUpRight, Edit3, CheckCircle, GitBranch,
  ExternalLink, Lock, X, Eye, ChevronDown, Download, Search,
  AlertTriangle, Info, Layers
} from 'lucide-react';
import { useCrossReferenceStore } from '@/store/useCrossReferenceStore';
import {
  DocumentCrossReference,
  CrossReferenceType,
  crossReferenceTypeLabels,
  getCrossReferenceDescription,
} from '@/utils/document-converters';

// ============================================================================
// TYPES
// ============================================================================

interface GraphNode {
  id: string;
  title: string;
  shortTitle: string;
  x: number;
  y: number;
  type: 'document';
  incomingCount: number;
  outgoingCount: number;
  isSelected: boolean;
  isHighlighted: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: CrossReferenceType;
  label: string;
  isHighlighted: boolean;
}

interface CrossReferenceGraphProps {
  focusDocumentId?: string;
  onDocumentClick?: (documentId: string) => void;
  onViewDocument?: (documentId: string) => void;
  className?: string;
}

// ============================================================================
// REFERENCE TYPE ICONS & COLORS
// ============================================================================

const referenceTypeConfig: Record<CrossReferenceType, { 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = {
  'cites': { icon: Quote, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'references': { icon: Link2, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  'supersedes': { icon: ArrowUpRight, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'amends': { icon: Edit3, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'supports': { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'derived-from': { icon: GitBranch, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  'see-also': { icon: ExternalLink, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  'prerequisite': { icon: Lock, color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

// ============================================================================
// LAYOUT ALGORITHM - Force-Directed Simulation (Simplified)
// ============================================================================

function calculateLayout(
  nodes: Map<string, { title: string; incoming: number; outgoing: number }>,
  edges: DocumentCrossReference[],
  width: number,
  height: number
): GraphNode[] {
  const nodeArray = Array.from(nodes.entries());
  const nodeCount = nodeArray.length;
  
  if (nodeCount === 0) return [];
  
  // Simple radial layout with influence from connections
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  
  // Calculate importance (total connections)
  const importance = new Map<string, number>();
  nodeArray.forEach(([id, data]) => {
    importance.set(id, data.incoming + data.outgoing);
  });
  
  // Sort by importance (most connected in center-ish)
  nodeArray.sort((a, b) => {
    const impA = importance.get(a[0]) || 0;
    const impB = importance.get(b[0]) || 0;
    return impB - impA;
  });
  
  return nodeArray.map(([id, data], index) => {
    const angle = (2 * Math.PI * index) / nodeCount - Math.PI / 2;
    const imp = importance.get(id) || 0;
    const maxImp = Math.max(...Array.from(importance.values()), 1);
    const radiusFactor = 0.5 + 0.5 * (1 - imp / maxImp); // More connected = closer to center
    
    return {
      id,
      title: data.title,
      shortTitle: data.title.length > 25 ? data.title.substring(0, 22) + '...' : data.title,
      x: centerX + Math.cos(angle) * radius * radiusFactor,
      y: centerY + Math.sin(angle) * radius * radiusFactor,
      type: 'document' as const,
      incomingCount: data.incoming,
      outgoingCount: data.outgoing,
      isSelected: false,
      isHighlighted: false,
    };
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CrossReferenceGraph({
  focusDocumentId,
  onDocumentClick,
  onViewDocument,
  className = '',
}: CrossReferenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Store data - use individual selectors to prevent infinite loops
  const references = useCrossReferenceStore(s => s.references);
  const filterType = useCrossReferenceStore(s => s.filterType);
  const setFilterType = useCrossReferenceStore(s => s.setFilterType);
  const searchQuery = useCrossReferenceStore(s => s.searchQuery);
  const setSearchQuery = useCrossReferenceStore(s => s.setSearchQuery);
  
  // Local state
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(focusDocumentId || null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter references by type
  const filteredReferences = useMemo(() => {
    if (filterType === 'all') return references;
    return references.filter(r => r.referenceType === filterType);
  }, [references, filterType]);

  // Build nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, { title: string; incoming: number; outgoing: number }>();
    
    // Extract unique documents
    filteredReferences.forEach(ref => {
      if (!nodeMap.has(ref.sourceDocumentId)) {
        nodeMap.set(ref.sourceDocumentId, {
          title: ref.sourceDocumentTitle,
          incoming: 0,
          outgoing: 0,
        });
      }
      if (!nodeMap.has(ref.targetDocumentId)) {
        nodeMap.set(ref.targetDocumentId, {
          title: ref.targetDocumentTitle,
          incoming: 0,
          outgoing: 0,
        });
      }
      
      // Count connections
      const source = nodeMap.get(ref.sourceDocumentId)!;
      const target = nodeMap.get(ref.targetDocumentId)!;
      source.outgoing++;
      target.incoming++;
    });
    
    // Calculate layout
    const graphNodes = calculateLayout(nodeMap, filteredReferences, dimensions.width, dimensions.height);
    
    // Mark selected/highlighted
    graphNodes.forEach(node => {
      node.isSelected = node.id === selectedNodeId;
      node.isHighlighted = node.id === hoveredNodeId ||
        (selectedNodeId !== null && filteredReferences.some(
          r => (r.sourceDocumentId === selectedNodeId && r.targetDocumentId === node.id) ||
               (r.targetDocumentId === selectedNodeId && r.sourceDocumentId === node.id)
        ));
    });
    
    // Build edges
    const graphEdges: GraphEdge[] = filteredReferences.map(ref => ({
      id: ref.id,
      source: ref.sourceDocumentId,
      target: ref.targetDocumentId,
      type: ref.referenceType,
      label: crossReferenceTypeLabels[ref.referenceType],
      isHighlighted: hoveredEdgeId === ref.id ||
        selectedNodeId === ref.sourceDocumentId ||
        selectedNodeId === ref.targetDocumentId,
    }));
    
    return { nodes: graphNodes, edges: graphEdges };
  }, [filteredReferences, dimensions, selectedNodeId, hoveredNodeId, hoveredEdgeId]);

  // Get node positions for edges
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      positions.set(node.id, { x: node.x, y: node.y });
    });
    return positions;
  }, [nodes]);

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom handling
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(focusDocumentId || null);
  };

  // Node click
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
    onDocumentClick?.(nodeId);
  };

  // Selected node info
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeRefs = selectedNodeId ? {
    outgoing: references.filter(r => r.sourceDocumentId === selectedNodeId),
    incoming: references.filter(r => r.targetDocumentId === selectedNodeId),
  } : null;

  return (
    <div className={`flex flex-col h-full bg-surface ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Document Relationship Graph</h3>
          <span className="text-xs text-text-muted px-2 py-0.5 bg-surface-card rounded">
            {nodes.length} documents • {edges.length} references
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-8 pr-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg w-48 focus:outline-none focus:border-accent-blue"
            />
          </div>
          
          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterType !== 'all' ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-secondary hover:text-text-primary'
              }`}
            >
              <Filter className="w-4 h-4" />
              {filterType === 'all' ? 'All Types' : crossReferenceTypeLabels[filterType]}
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showFilters && (
              <div className="absolute right-0 top-full mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-20 py-1 min-w-[180px]">
                <button
                  onClick={() => { setFilterType('all'); setShowFilters(false); }}
                  className={`w-full px-3 py-1.5 text-sm text-left hover:bg-surface-card ${filterType === 'all' ? 'text-accent-blue' : 'text-text-secondary'}`}
                >
                  All Types
                </button>
                {(Object.keys(crossReferenceTypeLabels) as CrossReferenceType[]).map(type => {
                  const config = referenceTypeConfig[type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => { setFilterType(type); setShowFilters(false); }}
                      className={`w-full px-3 py-1.5 text-sm text-left hover:bg-surface-card flex items-center gap-2 ${filterType === type ? 'text-accent-blue' : 'text-text-secondary'}`}
                    >
                      <Icon className={`w-4 h-4 ${config?.color ?? ''}`} />
                      {crossReferenceTypeLabels[type]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <button onClick={handleZoomOut} className="p-1.5 hover:bg-surface-card rounded transition-colors">
              <ZoomOut className="w-4 h-4 text-text-muted" />
            </button>
            <span className="text-xs text-text-muted w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1.5 hover:bg-surface-card rounded transition-colors">
              <ZoomIn className="w-4 h-4 text-text-muted" />
            </button>
            <button onClick={handleReset} className="p-1.5 hover:bg-surface-card rounded transition-colors" title="Reset View">
              <RefreshCw className="w-4 h-4 text-text-muted" />
            </button>
          </div>
          
          {/* Legend toggle */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`p-1.5 rounded transition-colors ${showLegend ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-surface-card text-text-muted'}`}
            title="Toggle Legend"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* SVG Canvas */}
        <div 
          ref={containerRef} 
          className="flex-1 overflow-hidden relative cursor-grab"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="select-none"
          >
            <defs>
              {/* Arrow markers for each type */}
              {(Object.keys(referenceTypeConfig) as CrossReferenceType[]).map(type => (
                <marker
                  key={type}
                  id={`arrow-${type}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className={referenceTypeConfig[type]?.color.replace('text-', 'fill-')} />
                </marker>
              ))}
            </defs>
            
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.map(edge => {
                const sourcePos = nodePositions.get(edge.source);
                const targetPos = nodePositions.get(edge.target);
                if (!sourcePos || !targetPos) return null;
                
                const config = referenceTypeConfig[edge.type];
                
                // Calculate edge path with curve
                const dx = targetPos.x - sourcePos.x;
                const dy = targetPos.y - sourcePos.y;
                const midX = (sourcePos.x + targetPos.x) / 2;
                const midY = (sourcePos.y + targetPos.y) / 2;
                // Add slight curve
                const curveOffset = 20;
                const perpX = -dy / Math.sqrt(dx * dx + dy * dy) * curveOffset;
                const perpY = dx / Math.sqrt(dx * dx + dy * dy) * curveOffset;
                
                // Shorten path to not overlap with nodes
                const nodeRadius = 50;
                const len = Math.sqrt(dx * dx + dy * dy);
                const startX = sourcePos.x + (dx / len) * nodeRadius;
                const startY = sourcePos.y + (dy / len) * nodeRadius;
                const endX = targetPos.x - (dx / len) * nodeRadius;
                const endY = targetPos.y - (dy / len) * nodeRadius;
                
                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`}
                      fill="none"
                      strokeWidth={edge.isHighlighted ? 2 : 1}
                      className={`${config.color.replace('text-', 'stroke-')} ${edge.isHighlighted ? 'opacity-100' : 'opacity-50'}`}
                      markerEnd={`url(#arrow-${edge.type})`}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      style={{ cursor: 'pointer' }}
                    />
                    {edge.isHighlighted && (
                      <text
                        x={midX + perpX}
                        y={midY + perpY - 8}
                        textAnchor="middle"
                        className="fill-text-muted text-[10px]"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* Nodes */}
              {nodes.map(node => (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Node background */}
                  <rect
                    x={-50}
                    y={-20}
                    width={100}
                    height={40}
                    rx={6}
                    className={`transition-all ${
                      node.isSelected
                        ? 'fill-accent-blue/30 stroke-accent-blue stroke-2'
                        : node.isHighlighted
                        ? 'fill-surface-elevated stroke-accent-blue/50 stroke-2'
                        : 'fill-surface-card stroke-border'
                    }`}
                    strokeWidth={node.isSelected ? 2 : 1}
                  />
                  
                  {/* Document icon */}
                  <Layers
                    x={-42}
                    y={-8}
                    width={16}
                    height={16}
                    className={node.isSelected ? 'text-accent-blue' : 'text-text-muted'}
                  />
                  
                  {/* Title */}
                  <text
                    x={-22}
                    y={-4}
                    className={`text-[10px] font-medium ${node.isSelected ? 'fill-accent-blue' : 'fill-text-primary'}`}
                  >
                    {node.shortTitle}
                  </text>
                  
                  {/* Connection counts */}
                  <text
                    x={-22}
                    y={10}
                    className="text-[9px] fill-text-muted"
                  >
                    {node.outgoingCount} out • {node.incomingCount} in
                  </text>
                </g>
              ))}
            </g>
          </svg>
          
          {/* Legend */}
          {showLegend && (
            <div className="absolute bottom-4 left-4 bg-surface-elevated border border-border rounded-lg p-3 shadow-lg">
              <div className="text-xs font-semibold text-text-primary mb-2">Reference Types</div>
              <div className="space-y-1.5">
                {(Object.keys(referenceTypeConfig) as CrossReferenceType[]).map(type => {
                  const config = referenceTypeConfig[type];
                  const Icon = config.icon;
                  return (
                    <div key={type} className="flex items-center gap-2 text-xs">
                      <Icon className={`w-3 h-3 ${config?.color ?? ''}`} />
                      <span className="text-text-secondary">{crossReferenceTypeLabels[type]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Layers className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-text-muted">No document references found</p>
                <p className="text-xs text-text-muted mt-1">Add cross-references to see relationships</p>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedNode && selectedNodeRefs && (
          <div className="w-80 border-l border-border bg-surface-elevated overflow-y-auto">
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">{selectedNode.title}</h4>
                  <p className="text-xs text-text-muted mt-1">
                    {selectedNode.outgoingCount + selectedNode.incomingCount} total references
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1 hover:bg-surface-card rounded"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              
              {onViewDocument && (
                <button
                  onClick={() => onViewDocument(selectedNode.id)}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue text-white text-sm rounded-lg hover:bg-accent-blue/90"
                >
                  <Eye className="w-4 h-4" />
                  View Document
                </button>
              )}
            </div>
            
            {/* Outgoing references */}
            <div className="p-4 border-b border-border">
              <h5 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-2">
                <ExternalLink className="w-3 h-3 text-accent-blue" />
                References ({selectedNodeRefs.outgoing.length})
              </h5>
              {selectedNodeRefs.outgoing.length > 0 ? (
                <div className="space-y-2">
                  {selectedNodeRefs.outgoing.map(ref => {
                    const config = referenceTypeConfig[ref.referenceType];
                    const Icon = config.icon;
                    return (
                      <button
                        key={ref.id}
                        onClick={() => handleNodeClick(ref.targetDocumentId)}
                        className="w-full text-left p-2 bg-surface-card border border-border rounded-lg hover:border-accent-blue/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-3 h-3 ${config?.color ?? ''}`} />
                          <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config?.color ?? ''}`}>
                            {crossReferenceTypeLabels[ref.referenceType]}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary truncate">{ref.targetDocumentTitle}</p>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{ref.referenceText}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">No outgoing references</p>
              )}
            </div>
            
            {/* Incoming references */}
            <div className="p-4">
              <h5 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-2">
                <GitBranch className="w-3 h-3 text-accent-purple" />
                Referenced By ({selectedNodeRefs.incoming.length})
              </h5>
              {selectedNodeRefs.incoming.length > 0 ? (
                <div className="space-y-2">
                  {selectedNodeRefs.incoming.map(ref => {
                    const config = referenceTypeConfig[ref.referenceType];
                    const Icon = config.icon;
                    return (
                      <button
                        key={ref.id}
                        onClick={() => handleNodeClick(ref.sourceDocumentId)}
                        className="w-full text-left p-2 bg-surface-card border border-border rounded-lg hover:border-accent-purple/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-3 h-3 ${config?.color ?? ''}`} />
                          <span className={`text-xs px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple`}>
                            {getCrossReferenceDescription(ref.referenceType, false)}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary truncate">{ref.sourceDocumentTitle}</p>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{ref.referenceText}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">No incoming references</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrossReferenceGraph;
