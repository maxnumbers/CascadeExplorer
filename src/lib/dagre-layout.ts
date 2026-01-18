/**
 * @fileOverview Dagre Layout Engine for Hypergraph Visualization
 *
 * This module wraps dagre to provide deterministic, hierarchical layout
 * for the perspectival heterograph. Key features:
 *
 * - Left-to-right (LR) hierarchical layout
 * - Support for hyperedge blobs (grouped nodes)
 * - Progressive disclosure (collapsed/expanded states)
 * - Stable node positions across perspective switches
 */

import dagre from 'dagre';
import type {
  PerspectivalSystemModel,
  SystemConcept,
  ConceptRelationship,
  ConcernHyperedge,
  Perspective,
  KnowledgeDomain,
} from '@/types/perspectival-model';

// =============================================================================
// CONFIGURATION
// =============================================================================

export const LAYOUT_CONFIG = {
  rankdir: 'LR' as const,     // Left-to-right
  ranksep: 100,               // Space between ranks
  nodesep: 50,                // Space between nodes in same rank
  marginx: 40,
  marginy: 40,
  align: 'UL' as const,       // Upper-left alignment
};

export const NODE_CONFIG = {
  minWidth: 120,
  maxWidth: 180,
  padding: 16,
  fontSize: 12,
  lineHeight: 1.4,
  cornerRadius: 8,
};

export const HYPEREDGE_CONFIG = {
  paddingX: 30,
  paddingY: 25,
  borderRadius: 15,
  opacity: 0.15,
  strokeWidth: 2,
  strokeOpacity: 0.5,
};

// Color scheme per concern/domain
export const DOMAIN_COLORS: Record<KnowledgeDomain, string> = {
  technical: '#3b82f6',     // Blue
  business: '#22c55e',      // Green
  legal: '#f59e0b',         // Amber
  social: '#ec4899',        // Pink
  environmental: '#10b981', // Emerald
  political: '#8b5cf6',     // Violet
  economic: '#f97316',      // Orange
  psychological: '#06b6d4', // Cyan
  organizational: '#6366f1', // Indigo
  temporal: '#84cc16',      // Lime
};

// =============================================================================
// TYPES
// =============================================================================

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: 'concept' | 'hyperedge-collapsed' | 'perspective';
  data: SystemConcept | ConcernHyperedge | Perspective;
  color?: string;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  label?: string;
  type: ConceptRelationship['relationshipType'];
  polarity: 'positive' | 'negative' | 'variable';
  strength: 'strong' | 'moderate' | 'weak';
}

export interface HyperedgeBlob {
  id: string;
  concernName: string;
  color: string;
  points: Array<{ x: number; y: number }>;  // Convex hull points
  containedNodeIds: string[];
  isExpanded: boolean;
  centerX: number;
  centerY: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  hyperedgeBlobs: HyperedgeBlob[];
  width: number;
  height: number;
}

export interface LayoutInput {
  model: PerspectivalSystemModel;
  activePerspectiveId: string | null;
  expandedHyperedges: Set<string>;
  expandedConcepts: Set<string>;
}

// =============================================================================
// TEXT WRAPPING
// =============================================================================

/**
 * Wraps text to fit within maxWidth, returning array of lines
 */
export function wrapText(text: string, maxWidth: number, fontSize: number = NODE_CONFIG.fontSize): string[] {
  // Approximate character width
  const charWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / charWidth);

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Calculate node dimensions based on label
 */
export function calculateNodeDimensions(label: string): { width: number; height: number } {
  const lines = wrapText(label, NODE_CONFIG.maxWidth - NODE_CONFIG.padding * 2);
  const textHeight = lines.length * NODE_CONFIG.fontSize * NODE_CONFIG.lineHeight;

  const width = Math.min(
    NODE_CONFIG.maxWidth,
    Math.max(
      NODE_CONFIG.minWidth,
      Math.max(...lines.map(l => l.length * NODE_CONFIG.fontSize * 0.6)) + NODE_CONFIG.padding * 2
    )
  );

  const height = textHeight + NODE_CONFIG.padding * 2;

  return { width, height };
}

// =============================================================================
// CONVEX HULL FOR HYPEREDGE BLOBS
// =============================================================================

interface Point {
  x: number;
  y: number;
}

/**
 * Compute convex hull using Graham scan algorithm
 */
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  // Find the point with lowest y (and leftmost if tie)
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < points[start].y ||
        (points[i].y === points[start].y && points[i].x < points[start].x)) {
      start = i;
    }
  }

  // Swap to put start point first
  [points[0], points[start]] = [points[start], points[0]];
  const pivot = points[0];

  // Sort by polar angle with respect to pivot
  const sorted = points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
    const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
    if (angleA !== angleB) return angleA - angleB;
    // If same angle, sort by distance
    const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
    const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
    return distA - distB;
  });

  // Graham scan
  const hull: Point[] = [pivot];

  for (const point of sorted) {
    while (hull.length > 1) {
      const top = hull[hull.length - 1];
      const prev = hull[hull.length - 2];
      const cross = (top.x - prev.x) * (point.y - prev.y) - (top.y - prev.y) * (point.x - prev.x);
      if (cross <= 0) {
        hull.pop();
      } else {
        break;
      }
    }
    hull.push(point);
  }

  return hull;
}

/**
 * Expand hull by padding amount
 */
function expandHull(hull: Point[], padding: number): Point[] {
  if (hull.length < 3) return hull;

  // Find centroid
  const cx = hull.reduce((sum, p) => sum + p.x, 0) / hull.length;
  const cy = hull.reduce((sum, p) => sum + p.y, 0) / hull.length;

  // Expand each point away from centroid
  return hull.map(p => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return p;
    const scale = (dist + padding) / dist;
    return {
      x: cx + dx * scale,
      y: cy + dy * scale,
    };
  });
}

// =============================================================================
// MAIN LAYOUT FUNCTION
// =============================================================================

/**
 * Compute layout for the perspectival model
 */
export function computeLayout(input: LayoutInput): LayoutResult {
  const { model, activePerspectiveId, expandedHyperedges, expandedConcepts } = input;

  if (!model) {
    return { nodes: [], edges: [], hyperedgeBlobs: [], width: 0, height: 0 };
  }

  // Create dagre graph
  const g = new dagre.graphlib.Graph();
  g.setGraph(LAYOUT_CONFIG);
  g.setDefaultEdgeLabel(() => ({}));

  // Filter concepts by perspective
  const visibleConcepts = activePerspectiveId
    ? model.concepts.filter(c =>
        !c.visibleToPerspectives ||
        c.visibleToPerspectives.length === 0 ||
        c.visibleToPerspectives.includes(activePerspectiveId)
      )
    : model.concepts;

  // Track which concepts are inside collapsed hyperedges
  const conceptsInCollapsedHyperedges = new Set<string>();
  const hyperedgeRepresentatives = new Map<string, string>(); // conceptId -> hyperedgeId

  // Process concerns/hyperedges
  for (const concern of model.concerns) {
    if (!expandedHyperedges.has(concern.id)) {
      // Collapsed: mark contained concepts as hidden, add hyperedge as node
      for (const conceptId of concern.connectedConceptIds) {
        conceptsInCollapsedHyperedges.add(conceptId);
        hyperedgeRepresentatives.set(conceptId, concern.id);
      }
    }
  }

  // Add concept nodes (excluding those in collapsed hyperedges)
  const nodeMap = new Map<string, LayoutNode>();

  for (const concept of visibleConcepts) {
    if (!conceptsInCollapsedHyperedges.has(concept.id)) {
      const dims = calculateNodeDimensions(concept.name);
      g.setNode(concept.id, { ...dims, label: concept.name });
      nodeMap.set(concept.id, {
        id: concept.id,
        x: 0,
        y: 0,
        ...dims,
        label: concept.name,
        type: 'concept',
        data: concept,
        color: DOMAIN_COLORS[concept.domains[0]] || '#6b7280',
      });
    }
  }

  // Add collapsed hyperedge nodes
  for (const concern of model.concerns) {
    if (!expandedHyperedges.has(concern.id)) {
      const dims = calculateNodeDimensions(`[${concern.concernName}] (${concern.connectedConceptIds.length})`);
      g.setNode(concern.id, { ...dims, label: concern.concernName });
      nodeMap.set(concern.id, {
        id: concern.id,
        x: 0,
        y: 0,
        ...dims,
        label: concern.concernName,
        type: 'hyperedge-collapsed',
        data: concern,
        color: DOMAIN_COLORS[concern.primaryDomain] || '#6b7280',
      });
    }
  }

  // Filter relationships by perspective and reroute through hyperedges
  const visibleRelationships = activePerspectiveId
    ? model.relationships.filter(r =>
        !r.visibleToPerspectives ||
        r.visibleToPerspectives.length === 0 ||
        r.visibleToPerspectives.includes(activePerspectiveId)
      )
    : model.relationships;

  // Add edges (rerouting to hyperedge nodes if needed)
  for (const rel of visibleRelationships) {
    let sourceId = rel.sourceId;
    let targetId = rel.targetId;

    // Reroute if endpoint is in collapsed hyperedge
    if (conceptsInCollapsedHyperedges.has(sourceId)) {
      sourceId = hyperedgeRepresentatives.get(sourceId) || sourceId;
    }
    if (conceptsInCollapsedHyperedges.has(targetId)) {
      targetId = hyperedgeRepresentatives.get(targetId) || targetId;
    }

    // Skip self-loops
    if (sourceId === targetId) continue;

    // Only add edge if both endpoints exist as nodes
    if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
      g.setEdge(sourceId, targetId, { label: rel.description });
    }
  }

  // Run dagre layout
  dagre.layout(g);

  // Extract layout results
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  g.nodes().forEach(nodeId => {
    const nodeData = g.node(nodeId);
    const layoutNode = nodeMap.get(nodeId);
    if (layoutNode && nodeData) {
      layoutNode.x = nodeData.x;
      layoutNode.y = nodeData.y;
      nodes.push(layoutNode);
    }
  });

  g.edges().forEach(edgeKey => {
    const edgeData = g.edge(edgeKey);
    const rel = visibleRelationships.find(
      r => r.sourceId === edgeKey.v && r.targetId === edgeKey.w
    ) || visibleRelationships.find(r => {
      // Check rerouted
      const sourceId = conceptsInCollapsedHyperedges.has(r.sourceId)
        ? hyperedgeRepresentatives.get(r.sourceId)
        : r.sourceId;
      const targetId = conceptsInCollapsedHyperedges.has(r.targetId)
        ? hyperedgeRepresentatives.get(r.targetId)
        : r.targetId;
      return sourceId === edgeKey.v && targetId === edgeKey.w;
    });

    if (edgeData && rel) {
      const sourceNode = nodeMap.get(edgeKey.v as string);
      const targetNode = nodeMap.get(edgeKey.w as string);

      if (sourceNode && targetNode) {
        edges.push({
          id: rel.id,
          source: edgeKey.v as string,
          target: edgeKey.w as string,
          sourceX: sourceNode.x,
          sourceY: sourceNode.y,
          targetX: targetNode.x,
          targetY: targetNode.y,
          label: rel.description,
          type: rel.relationshipType,
          polarity: rel.polarity,
          strength: rel.strength,
        });
      }
    }
  });

  // Compute hyperedge blobs for expanded hyperedges
  const hyperedgeBlobs: HyperedgeBlob[] = [];

  for (const concern of model.concerns) {
    if (expandedHyperedges.has(concern.id)) {
      // Get positions of contained nodes
      const containedNodes = concern.connectedConceptIds
        .map(id => nodeMap.get(id))
        .filter((n): n is LayoutNode => n !== undefined);

      if (containedNodes.length > 0) {
        // Create points for convex hull (include node corners)
        const points: Point[] = [];
        for (const node of containedNodes) {
          const halfW = node.width / 2;
          const halfH = node.height / 2;
          points.push({ x: node.x - halfW, y: node.y - halfH });
          points.push({ x: node.x + halfW, y: node.y - halfH });
          points.push({ x: node.x - halfW, y: node.y + halfH });
          points.push({ x: node.x + halfW, y: node.y + halfH });
        }

        const hull = convexHull(points);
        const expandedPoints = expandHull(hull, HYPEREDGE_CONFIG.paddingX);

        // Compute center
        const centerX = containedNodes.reduce((sum, n) => sum + n.x, 0) / containedNodes.length;
        const centerY = containedNodes.reduce((sum, n) => sum + n.y, 0) / containedNodes.length;

        hyperedgeBlobs.push({
          id: concern.id,
          concernName: concern.concernName,
          color: DOMAIN_COLORS[concern.primaryDomain] || '#6b7280',
          points: expandedPoints,
          containedNodeIds: concern.connectedConceptIds,
          isExpanded: true,
          centerX,
          centerY,
        });
      }
    }
  }

  // Compute total dimensions
  const graphData = g.graph();
  const width = (graphData.width || 800) + LAYOUT_CONFIG.marginx * 2;
  const height = (graphData.height || 600) + LAYOUT_CONFIG.marginy * 2;

  return { nodes, edges, hyperedgeBlobs, width, height };
}

// =============================================================================
// PATH GENERATION
// =============================================================================

/**
 * Generate SVG path for hyperedge blob
 */
export function generateBlobPath(points: Point[]): string {
  if (points.length < 3) return '';

  // Use rounded corners between points
  const radius = HYPEREDGE_CONFIG.borderRadius;

  let path = '';
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];

    // Vector from p0 to p1
    const v1x = p1.x - p0.x;
    const v1y = p1.y - p0.y;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);

    // Vector from p1 to p2
    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

    // Shorten vectors to leave room for curve
    const t1 = Math.min(radius / len1, 0.5);
    const t2 = Math.min(radius / len2, 0.5);

    const startX = p1.x - v1x * t1;
    const startY = p1.y - v1y * t1;
    const endX = p1.x + v2x * t2;
    const endY = p1.y + v2y * t2;

    if (i === 0) {
      path = `M ${startX} ${startY}`;
    } else {
      path += ` L ${startX} ${startY}`;
    }

    path += ` Q ${p1.x} ${p1.y} ${endX} ${endY}`;
  }

  path += ' Z';
  return path;
}

/**
 * Generate SVG path for edge with arrow
 */
export function generateEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { path: string; arrowX: number; arrowY: number; arrowAngle: number } {
  // Calculate intersection with source node boundary
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angle = Math.atan2(dy, dx);

  // Source intersection
  const sIntersect = getRectEdgeIntersection(sourceX, sourceY, sourceWidth, sourceHeight, angle);

  // Target intersection (opposite direction)
  const tIntersect = getRectEdgeIntersection(targetX, targetY, targetWidth, targetHeight, angle + Math.PI);

  const path = `M ${sIntersect.x} ${sIntersect.y} L ${tIntersect.x} ${tIntersect.y}`;

  return {
    path,
    arrowX: tIntersect.x,
    arrowY: tIntersect.y,
    arrowAngle: angle * (180 / Math.PI),
  };
}

function getRectEdgeIntersection(
  cx: number,
  cy: number,
  width: number,
  height: number,
  angle: number
): Point {
  const hw = width / 2;
  const hh = height / 2;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Calculate t for each side
  let t = Infinity;

  if (cos !== 0) {
    const tRight = hw / cos;
    const tLeft = -hw / cos;
    if (tRight > 0) t = Math.min(t, tRight);
    if (tLeft > 0) t = Math.min(t, tLeft);
  }

  if (sin !== 0) {
    const tBottom = hh / sin;
    const tTop = -hh / sin;
    if (tBottom > 0) t = Math.min(t, tBottom);
    if (tTop > 0) t = Math.min(t, tTop);
  }

  return {
    x: cx + cos * t,
    y: cy + sin * t,
  };
}
