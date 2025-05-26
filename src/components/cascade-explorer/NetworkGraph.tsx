
"use client";

import type { ImpactNode, ImpactLink } from '@/types/cascade';
import { NODE_COLORS } from '@/types/cascade';
import React, { useEffect, useRef } from 'react'; // Removed useState
import * as d3 from 'd3';

interface NetworkGraphProps {
  nodes: ImpactNode[];
  links: ImpactLink[];
  onNodeClick: (node: ImpactNode) => void;
  width?: number;
  height?: number;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ nodes: initialNodes, links: initialLinks, onNodeClick, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || initialNodes.length === 0) {
      // Clear previous graph if no nodes
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      return;
    }

    // Make mutable copies for D3 simulation as D3 modifies these objects
    // Also ensure D3 specific properties like x, y, fx, fy are preserved if they exist from previous simulations or manual setting
    const d3Nodes: ImpactNode[] = initialNodes.map(n => ({ 
        ...n, 
        x: n.x, 
        y: n.y, 
        vx: n.vx, 
        vy: n.vy, 
        fx: n.fx, 
        fy: n.fy 
    }));
    const d3Links: ImpactLink[] = initialLinks.map(l => ({ ...l }));


    const svg = d3.select(svgRef.current)
      .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
      .style('max-width', '100%')
      .style('height', 'auto');

    svg.selectAll("*").remove(); // Clear previous graph parts to prevent duplicates

    const simulation = d3.forceSimulation<ImpactNode>(d3Nodes)
      .force("link", d3.forceLink<ImpactNode, ImpactLink>(d3Links).id((d: any) => d.id).distance(d => ((d.source as ImpactNode).order === 0 || (d.target as ImpactNode).order === 0 ? 150 : 100)))
      .force("charge", d3.forceManyBody().strength(-350)) 
      .force("center", d3.forceCenter(0,0).strength(0.05)) 
      .force("x", d3.forceX().strength(0.03)) 
      .force("y", d3.forceY().strength(0.03));


    const linkGroup = svg.append("g")
      .attr("class", "links");

    const nodeGroup = svg.append("g")
        .attr("class", "nodes");

    const labelGroup = svg.append("g")
        .attr("class", "labels");

    const linkElements = linkGroup
      .attr("stroke", "hsl(var(--border))") 
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(d3Links, (d: any) => `${typeof d.source === 'object' ? d.source.id : d.source}-${typeof d.target === 'object' ? d.target.id : d.target}`) // Key for links
      .join("line")
      .attr("stroke-width", 1.5);

    const nodeRadius = (d: ImpactNode) => d.order === 0 ? 18 : 10; 

    const nodeElements = nodeGroup
      .attr("stroke", "hsl(var(--card))") // Stroke color that contrasts with node fill
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(d3Nodes, (d: ImpactNode) => d.id) // Key for nodes
      .join("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => d.originalColor || NODE_COLORS[d.order] || 'hsl(var(--muted))')
      .on("click", (event, d_typed) => {
        onNodeClick(d_typed as ImpactNode);
      })
      .call(drag(simulation) as any);

    nodeElements.append("title")
      .text(d => `${d.label}\nOrder: ${d.order}\nValidity: ${d.validity}\nID: ${d.id}`); // Added ID to title for debugging
      
    const labelElements = labelGroup
      .selectAll("text")
      .data(d3Nodes, (d: ImpactNode) => d.id) // Key for labels
      .join("text")
      .text(d => d.label)
      .attr("font-size", "9px") 
      .attr("fill", "hsl(var(--foreground))")
      .attr("text-anchor", "middle")
      .attr("paint-order", "stroke") // Render stroke behind fill
      .attr("stroke", "hsl(var(--card))") 
      .attr("stroke-width", "0.3em") // Adjust for desired outline thickness
      .attr("stroke-linejoin", "round")
      .attr("dy", d => `${nodeRadius(d) + 10}px`) 
      .style("pointer-events", "none"); 


    simulation.on("tick", () => {
      linkElements
        .attr("x1", d => (d.source as ImpactNode).x || 0) // Fallback to 0 if undefined
        .attr("y1", d => (d.source as ImpactNode).y || 0)
        .attr("x2", d => (d.target as ImpactNode).x || 0)
        .attr("y2", d => (d.target as ImpactNode).y || 0);

      nodeElements
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0);
      
      labelElements
        .attr("x", d => d.x || 0)
        .attr("y", d => d.y || 0);
    });
    
    simulation.alpha(0.3).restart();


    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 5]) 
        .on("zoom", (event) => {
            const { transform } = event;
            linkGroup.attr("transform", transform.toString());
            nodeGroup.attr("transform", transform.toString());
            labelGroup.attr("transform", transform.toString());
        });
    
    svg.call(zoomBehavior);
    // svg.call(zoomBehavior.transform, d3.zoomIdentity); // Uncomment to reset zoom on redraw


    return () => {
      simulation.stop();
    };

  }, [initialNodes, initialLinks, width, height, onNodeClick]);


  function drag(simulation: d3.Simulation<ImpactNode, undefined>) {
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; // Pin node by setting fixed x
      d.fy = d.y; // Pin node by setting fixed y
    }
    
    function dragged(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      if (!event.active) simulation.alphaTarget(0);
      // To unpin after drag, set fx and fy to null. If you want them to stay pinned, leave as is.
      // d.fx = null; 
      // d.fy = null;
    }
    
    return d3.drag<SVGCircleElement, ImpactNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }


  return (
    <div className="w-full h-full flex justify-center items-center bg-card rounded-lg shadow-md overflow-hidden">
       <svg ref={svgRef} width={width} height={height}></svg>
    </div>
  );
};

export default NetworkGraph;

    