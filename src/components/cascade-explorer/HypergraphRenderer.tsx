'use client';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useModelStore } from '@/store/model-store';
import {
  computeLayout,
  generateBlobPath,
  generateEdgePath,
  wrapText,
  NODE_CONFIG,
  HYPEREDGE_CONFIG,
  DOMAIN_COLORS,
  type LayoutNode,
  type LayoutEdge,
  type HyperedgeBlob,
} from '@/lib/dagre-layout';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, MinusCircle, PlusCircle } from 'lucide-react';
import type { SystemConcept, ConcernHyperedge, Perspective } from '@/types/perspectival-model';

// =============================================================================
// TYPES
// =============================================================================

interface HypergraphRendererProps {
  onNodeSelect?: (nodeId: string, nodeType: 'concept' | 'hyperedge' | 'perspective') => void;
  className?: string;
}

interface NodeInteractionState {
  hoveredNode: string | null;
  selectedNode: string | null;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ConceptNodeProps {
  node: LayoutNode;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
}

function ConceptNode({ node, isHovered, isSelected, onHover, onClick }: ConceptNodeProps) {
  const concept = node.data as SystemConcept;
  const lines = wrapText(node.label, node.width - NODE_CONFIG.padding * 2);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g
            transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
            className="cursor-pointer"
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
            onClick={onClick}
          >
            <rect
              width={node.width}
              height={node.height}
              rx={NODE_CONFIG.cornerRadius}
              fill={isSelected ? node.color : 'var(--card)'}
              stroke={node.color}
              strokeWidth={isHovered || isSelected ? 3 : 2}
              className="transition-all duration-200"
            />
            <foreignObject
              x={NODE_CONFIG.padding}
              y={NODE_CONFIG.padding}
              width={node.width - NODE_CONFIG.padding * 2}
              height={node.height - NODE_CONFIG.padding * 2}
            >
              <div
                className="text-xs leading-tight text-center flex items-center justify-center h-full"
                style={{
                  color: isSelected ? 'white' : 'var(--foreground)',
                  wordBreak: 'break-word',
                }}
              >
                {node.label}
              </div>
            </foreignObject>
          </g>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{concept.name}</div>
            <p className="text-xs text-muted-foreground">{concept.description}</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {concept.conceptType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {concept.abstractionLevel}
              </Badge>
            </div>
            {concept.domains.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {concept.domains.map(d => (
                  <span
                    key={d}
                    className="text-xs px-1 py-0.5 rounded"
                    style={{ backgroundColor: `${DOMAIN_COLORS[d]}20`, color: DOMAIN_COLORS[d] }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CollapsedHyperedgeNodeProps {
  node: LayoutNode;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  onExpand: () => void;
}

function CollapsedHyperedgeNode({
  node,
  isHovered,
  isSelected,
  onHover,
  onClick,
  onExpand,
}: CollapsedHyperedgeNodeProps) {
  const concern = node.data as ConcernHyperedge;
  const nodeCount = concern.connectedConceptIds.length;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g
            transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
            className="cursor-pointer"
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
            onClick={onClick}
          >
            {/* Dashed border to indicate collapsed group */}
            <rect
              width={node.width}
              height={node.height}
              rx={NODE_CONFIG.cornerRadius}
              fill={`${node.color}15`}
              stroke={node.color}
              strokeWidth={isHovered || isSelected ? 3 : 2}
              strokeDasharray="5,3"
              className="transition-all duration-200"
            />
            <foreignObject
              x={NODE_CONFIG.padding}
              y={NODE_CONFIG.padding}
              width={node.width - NODE_CONFIG.padding * 2}
              height={node.height - NODE_CONFIG.padding * 2}
            >
              <div className="text-xs leading-tight text-center flex flex-col items-center justify-center h-full gap-1">
                <span style={{ color: node.color }}>{node.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({nodeCount} concepts)
                </span>
              </div>
            </foreignObject>
            {/* Expand button */}
            <g
              transform={`translate(${node.width - 12}, -8)`}
              onClick={(e) => { e.stopPropagation(); onExpand(); }}
              className="cursor-pointer"
            >
              <circle r={10} fill="var(--background)" stroke={node.color} strokeWidth={1.5} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill={node.color}
                fontSize={12}
                fontWeight="bold"
              >
                +
              </text>
            </g>
          </g>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">{concern.concernName}</div>
            <p className="text-xs text-muted-foreground">{concern.description}</p>
            <div className="text-xs">
              <span className="text-muted-foreground">Contains: </span>
              {nodeCount} concepts
            </div>
            <div className="text-xs text-muted-foreground italic">
              Click + to expand
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface HyperedgeBlobComponentProps {
  blob: HyperedgeBlob;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  onCollapse: () => void;
}

function HyperedgeBlobComponent({
  blob,
  isHovered,
  onHover,
  onClick,
  onCollapse,
}: HyperedgeBlobComponentProps) {
  const path = generateBlobPath(blob.points);

  return (
    <g
      onMouseEnter={() => onHover(blob.id)}
      onMouseLeave={() => onHover(null)}
    >
      <path
        d={path}
        fill={blob.color}
        fillOpacity={isHovered ? 0.25 : HYPEREDGE_CONFIG.opacity}
        stroke={blob.color}
        strokeWidth={HYPEREDGE_CONFIG.strokeWidth}
        strokeOpacity={HYPEREDGE_CONFIG.strokeOpacity}
        className="transition-all duration-200 cursor-pointer"
        onClick={onClick}
      />
      {/* Label at top of blob */}
      <text
        x={blob.centerX}
        y={Math.min(...blob.points.map(p => p.y)) - 10}
        textAnchor="middle"
        fill={blob.color}
        fontSize={11}
        fontWeight={500}
        className="pointer-events-none"
      >
        {blob.concernName}
      </text>
      {/* Collapse button */}
      <g
        transform={`translate(${Math.max(...blob.points.map(p => p.x)) + 5}, ${Math.min(...blob.points.map(p => p.y))})`}
        onClick={(e) => { e.stopPropagation(); onCollapse(); }}
        className="cursor-pointer"
      >
        <circle r={10} fill="var(--background)" stroke={blob.color} strokeWidth={1.5} />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill={blob.color}
          fontSize={12}
          fontWeight="bold"
        >
          −
        </text>
      </g>
    </g>
  );
}

interface EdgeComponentProps {
  edge: LayoutEdge;
  sourceNode: LayoutNode;
  targetNode: LayoutNode;
  isHighlighted: boolean;
}

function EdgeComponent({ edge, sourceNode, targetNode, isHighlighted }: EdgeComponentProps) {
  const { path, arrowX, arrowY, arrowAngle } = generateEdgePath(
    sourceNode.x,
    sourceNode.y,
    targetNode.x,
    targetNode.y,
    sourceNode.width,
    sourceNode.height,
    targetNode.width,
    targetNode.height
  );

  const strokeColor = edge.polarity === 'positive'
    ? '#22c55e'
    : edge.polarity === 'negative'
    ? '#ef4444'
    : '#6b7280';

  const strokeWidth = edge.strength === 'strong' ? 3 : edge.strength === 'moderate' ? 2 : 1;
  const dashArray = edge.strength === 'weak' ? '4,2' : undefined;

  return (
    <g className={`transition-opacity duration-200 ${isHighlighted ? 'opacity-100' : 'opacity-60'}`}>
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        markerEnd={`url(#arrow-${edge.polarity})`}
      />
    </g>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function HypergraphRenderer({ onNodeSelect, className }: HypergraphRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State from store
  const model = useModelStore((s) => s.model);
  const activePerspectiveId = useModelStore((s) => s.activePerspectiveId);
  const expandedHyperedges = useModelStore((s) => s.expandedHyperedges);
  const expandedConcepts = useModelStore((s) => s.expandedConcepts);
  const toggleHyperedgeExpansionStore = useModelStore((s) => s.toggleHyperedgeExpansion);

  // Interaction state
  const [interactionState, setInteractionState] = useState<NodeInteractionState>({
    hoveredNode: null,
    selectedNode: null,
  });

  // Zoom and pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  // Compute layout
  const layout = useMemo(() => {
    if (!model) return null;
    return computeLayout({
      model,
      activePerspectiveId,
      expandedHyperedges,
      expandedConcepts,
    });
  }, [model, activePerspectiveId, expandedHyperedges, expandedConcepts]);

  // Build node lookup
  const nodeMap = useMemo(() => {
    if (!layout) return new Map<string, LayoutNode>();
    return new Map(layout.nodes.map(n => [n.id, n]));
  }, [layout]);

  // Event handlers
  const handleNodeHover = useCallback((id: string | null) => {
    setInteractionState(prev => ({ ...prev, hoveredNode: id }));
  }, []);

  const handleNodeClick = useCallback((nodeId: string, nodeType: 'concept' | 'hyperedge' | 'perspective') => {
    setInteractionState(prev => ({
      ...prev,
      selectedNode: prev.selectedNode === nodeId ? null : nodeId,
    }));
    onNodeSelect?.(nodeId, nodeType);
  }, [onNodeSelect]);

  const toggleHyperedgeExpansion = useCallback((hyperedgeId: string) => {
    toggleHyperedgeExpansionStore(hyperedgeId);
  }, [toggleHyperedgeExpansionStore]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.3) }));
  }, []);

  const handleResetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setTransform(prev => ({
          ...prev,
          scale: Math.min(Math.max(prev.scale * delta, 0.3), 3),
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Drag pan
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as Element).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!model || !layout) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        <p>No model to display</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`}>
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleResetView}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 text-xs space-y-2 z-10">
        <div className="font-medium">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-500" />
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-500" />
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-gray-500" style={{ strokeDasharray: '4,2' }} />
          <span>Variable</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Defs for arrow markers */}
        <defs>
          <marker
            id="arrow-positive"
            viewBox="0 -5 10 10"
            refX="8"
            refY="0"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,-5L10,0L0,5" fill="#22c55e" />
          </marker>
          <marker
            id="arrow-negative"
            viewBox="0 -5 10 10"
            refX="8"
            refY="0"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,-5L10,0L0,5" fill="#ef4444" />
          </marker>
          <marker
            id="arrow-variable"
            viewBox="0 -5 10 10"
            refX="8"
            refY="0"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,-5L10,0L0,5" fill="#6b7280" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Render hyperedge blobs (behind nodes) */}
          {layout.hyperedgeBlobs.map(blob => (
            <HyperedgeBlobComponent
              key={blob.id}
              blob={blob}
              isHovered={interactionState.hoveredNode === blob.id}
              onHover={handleNodeHover}
              onClick={() => handleNodeClick(blob.id, 'hyperedge')}
              onCollapse={() => toggleHyperedgeExpansion(blob.id)}
            />
          ))}

          {/* Render edges */}
          {layout.edges.map(edge => {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) return null;

            const isHighlighted =
              interactionState.hoveredNode === edge.source ||
              interactionState.hoveredNode === edge.target ||
              interactionState.selectedNode === edge.source ||
              interactionState.selectedNode === edge.target;

            return (
              <EdgeComponent
                key={edge.id}
                edge={edge}
                sourceNode={sourceNode}
                targetNode={targetNode}
                isHighlighted={isHighlighted}
              />
            );
          })}

          {/* Render nodes */}
          {layout.nodes.map(node => {
            const isHovered = interactionState.hoveredNode === node.id;
            const isSelected = interactionState.selectedNode === node.id;

            if (node.type === 'hyperedge-collapsed') {
              return (
                <CollapsedHyperedgeNode
                  key={node.id}
                  node={node}
                  isHovered={isHovered}
                  isSelected={isSelected}
                  onHover={handleNodeHover}
                  onClick={() => handleNodeClick(node.id, 'hyperedge')}
                  onExpand={() => toggleHyperedgeExpansion(node.id)}
                />
              );
            }

            return (
              <ConceptNode
                key={node.id}
                node={node}
                isHovered={isHovered}
                isSelected={isSelected}
                onHover={handleNodeHover}
                onClick={() => handleNodeClick(node.id, 'concept')}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
