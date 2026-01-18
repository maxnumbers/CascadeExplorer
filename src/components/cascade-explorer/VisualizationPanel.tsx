'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useModelStore } from '@/store/model-store';
import { useDialogueStore } from '@/store/dialogue-store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Network,
  List,
  Eye,
  Users,
  Briefcase,
  Code,
  AlertTriangle,
  ChevronRight,
  Info,
} from 'lucide-react';
import * as d3 from 'd3';

// D3 types
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  order: number;
  validity?: 'high' | 'medium' | 'low';
  description?: string;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
}

function ImpactGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const impacts = useModelStore((s) => s.impacts);
  const [selectedNode, setSelectedNode] = useState<D3Node | null>(null);

  const nodes: D3Node[] = useMemo(
    () =>
      impacts.map((impact) => ({
        id: impact.id,
        label: impact.label,
        order: impact.order,
        validity: impact.validity,
        description: impact.description,
      })),
    [impacts]
  );

  const links: D3Link[] = useMemo(
    () =>
      impacts
        .filter((impact) => impact.parentId)
        .map((impact) => ({
          source: impact.parentId!,
          target: impact.id,
        })),
    [impacts]
  );

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 500;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Color scale by order
    const orderColors: Record<number, string> = {
      0: '#a855f7', // Purple - core assertion
      1: '#3b82f6', // Blue - 1st order
      2: '#22c55e', // Green - 2nd order
      3: '#f97316', // Orange - 3rd order
    };

    // Validity opacity
    const validityOpacity: Record<string, number> = {
      high: 1,
      medium: 0.7,
      low: 0.5,
    };

    // Create simulation
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force(
        'link',
        d3.forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('y', d3.forceY<D3Node>().y((d) => (d.order + 1) * (height / 5)).strength(0.5))
      .force('collision', d3.forceCollide().radius(40));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#6b7280')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#6b7280');

    // Draw nodes
    const node = g.append('g')
      .selectAll<SVGGElement, D3Node>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, D3Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_, d) => setSelectedNode(d));

    // Node circles
    node.append('circle')
      .attr('r', (d) => (d.order === 0 ? 25 : 18))
      .attr('fill', (d) => orderColors[d.order] || '#6b7280')
      .attr('opacity', (d) => validityOpacity[d.validity || 'high'])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node labels
    node.append('text')
      .text((d) => d.label.substring(0, 25) + (d.label.length > 25 ? '...' : ''))
      .attr('text-anchor', 'middle')
      .attr('dy', 35)
      .attr('fill', '#e5e7eb')
      .attr('font-size', 10)
      .style('pointer-events', 'none');

    // Order badge
    node.append('text')
      .text((d) => (d.order === 0 ? '★' : d.order.toString()))
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#fff')
      .attr('font-size', 12)
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Update positions
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as D3Node).x!)
        .attr('y1', (d) => (d.source as D3Node).y!)
        .attr('x2', (d) => (d.target as D3Node).x!)
        .attr('y2', (d) => (d.target as D3Node).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  return (
    <>
      <svg ref={svgRef} className="w-full h-full" />

      {/* Node detail dialog */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge
                style={{
                  backgroundColor:
                    selectedNode?.order === 0
                      ? '#a855f7'
                      : selectedNode?.order === 1
                      ? '#3b82f6'
                      : selectedNode?.order === 2
                      ? '#22c55e'
                      : '#f97316',
                }}
              >
                Order {selectedNode?.order}
              </Badge>
              {selectedNode?.label}
            </DialogTitle>
            <DialogDescription>{selectedNode?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Validity:</span>
              <Badge
                variant={
                  selectedNode?.validity === 'high'
                    ? 'default'
                    : selectedNode?.validity === 'medium'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {selectedNode?.validity}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImpactList() {
  const impacts = useModelStore((s) => s.impacts);

  const impactsByOrder = useMemo(() => {
    const grouped: Record<number, typeof impacts> = { 0: [], 1: [], 2: [], 3: [] };
    impacts.forEach((impact) => {
      if (!grouped[impact.order]) grouped[impact.order] = [];
      grouped[impact.order].push(impact);
    });
    return grouped;
  }, [impacts]);

  const orderLabels: Record<number, { label: string; color: string }> = {
    0: { label: 'Core Assertion', color: 'bg-purple-500' },
    1: { label: '1st Order Impacts', color: 'bg-blue-500' },
    2: { label: '2nd Order Impacts', color: 'bg-green-500' },
    3: { label: '3rd Order Impacts', color: 'bg-orange-500' },
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {Object.entries(impactsByOrder).map(([order, orderImpacts]) => {
          if (orderImpacts.length === 0) return null;
          const orderNum = parseInt(order);
          const config = orderLabels[orderNum];

          return (
            <div key={order}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${config.color}`} />
                <h3 className="font-medium">{config.label}</h3>
                <Badge variant="outline" className="ml-auto">
                  {orderImpacts.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {orderImpacts.map((impact) => (
                  <Card key={impact.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{impact.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {impact.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge
                            variant={
                              impact.validity === 'high'
                                ? 'default'
                                : impact.validity === 'medium'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {impact.validity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function PerspectiveSwitcher() {
  const perspectives = useModelStore((s) => s.model?.perspectives ?? []);
  const activePerspectiveId = useModelStore((s) => s.activePerspectiveId);
  const setActivePerspective = useModelStore((s) => s.setActivePerspective);

  const defaultPerspectives = [
    { id: 'all', name: 'All Views', icon: Eye },
    { id: 'executive', name: 'Executive', icon: Briefcase },
    { id: 'technical', name: 'Technical', icon: Code },
    { id: 'stakeholder', name: 'Stakeholder', icon: Users },
  ];

  const displayPerspectives =
    perspectives.length > 0
      ? [{ id: 'all', name: 'All Views', icon: Eye }, ...perspectives.map((p) => ({ ...p, icon: Users }))]
      : defaultPerspectives;

  return (
    <div className="flex gap-2 flex-wrap">
      {displayPerspectives.map((perspective) => {
        const Icon = perspective.icon;
        const isActive = activePerspectiveId === perspective.id || (!activePerspectiveId && perspective.id === 'all');

        return (
          <Button
            key={perspective.id}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setActivePerspective(perspective.id === 'all' ? null : perspective.id)}
          >
            <Icon className="h-3 w-3" />
            {perspective.name}
          </Button>
        );
      })}
    </div>
  );
}

export function VisualizationPanel() {
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const impacts = useModelStore((s) => s.impacts);
  const phase = useDialogueStore((s) => s.phase);

  const hasImpacts = impacts.length > 0;
  const impactCount = impacts.length;
  const maxOrder = Math.max(...impacts.map((i) => i.order), 0);

  if (phase === 'welcome') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
        <Network className="h-16 w-16 mb-4 opacity-30" />
        <h3 className="text-lg font-medium mb-2">Impact Network</h3>
        <p className="text-sm max-w-xs">
          Your impact cascade will appear here as you explore your ideas.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Impact Network</h3>
            <p className="text-xs text-muted-foreground">
              {impactCount} impact{impactCount !== 1 ? 's' : ''} across{' '}
              {maxOrder + 1} level{maxOrder !== 0 ? 's' : ''}
            </p>
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'graph' | 'list')}>
            <TabsList className="h-8">
              <TabsTrigger value="graph" className="text-xs px-2">
                <Network className="h-3 w-3 mr-1" />
                Graph
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs px-2">
                <List className="h-3 w-3 mr-1" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Perspective switcher */}
        <PerspectiveSwitcher />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {hasImpacts ? (
          viewMode === 'graph' ? (
            <ImpactGraph />
          ) : (
            <ImpactList />
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <Info className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">
              Continue the conversation to generate impacts.
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      {hasImpacts && (
        <div className="p-3 border-t">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Core</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>1st Order</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>2nd Order</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>3rd Order</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
