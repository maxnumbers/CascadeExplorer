
"use client";

import type { ImpactNode, ImpactLink } from '@/types/cascade';
import { NODE_COLORS } from '@/types/cascade';
import React, { useEffect, useRef } from 'react';
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
    if (!svgRef.current || !width || !height) { // Ensure width/height are available
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      return;
    }
    
    if (initialNodes.length === 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }


    const d3Nodes: ImpactNode[] = initialNodes.map(n => {
      let nodeOverrides: Partial<ImpactNode> = {};
      if (n.order === 0) { // Core assertion node
        nodeOverrides = {
          ...n,
          fx: 0, // Fix x at center
          fy: -height / 2 + 50, // Fix y near top
        };
      }
      return { 
          ...n, 
          x: n.x, 
          y: n.y, 
          vx: n.vx, 
          vy: n.vy,
          ...nodeOverrides // Apply fixed positions for root
      };
    });

    const d3Links: ImpactLink[] = initialLinks.map(l => ({ ...l }));

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
      .style('max-width', '100%')
      .style('height', 'auto');

    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<ImpactNode>(d3Nodes)
      .force("link", d3.forceLink<ImpactNode, ImpactLink>(d3Links)
        .id((d: any) => d.id)
        .distance(d => {
            // Ensure source and target are ImpactNode objects for order access
            const sourceNode = typeof d.source === 'string' ? d3Nodes.find(n => n.id === d.source) : d.source as ImpactNode;
            const targetNode = typeof d.target === 'string' ? d3Nodes.find(n => n.id === d.target) : d.target as ImpactNode;
            if (sourceNode && targetNode) {
                 if (sourceNode.order === 0 || targetNode.order === 0) return 150; // Longer links for root
                 if (Math.abs(sourceNode.order - targetNode.order) === 1) return 120; // Links between adjacent orders
            }
            return 100; // Default for same-order or other links
        })
        .strength(0.7) // Slightly stronger link force
      )
      .force("charge", d3.forceManyBody().strength(-450)) // Adjusted charge
      .force("x", d3.forceX(0).strength(0.02)) // Gentle pull to horizontal center
      .force("y", d3.forceY<ImpactNode>(d => {
        if (d.order === 0) return -height / 2 + 50; // Matches fixed position
        if (d.order === 1) return -height / 2 + 180;
        if (d.order === 2) return -height / 2 + 330;
        if (d.order === 3) return -height / 2 + 480;
        return 0;
      }).strength(d => (d.order === 0 ? 1 : 0.15))) // Stronger for root if not fixed, moderate for others
      .force("collide", d3.forceCollide<ImpactNode>().radius(d => (d.order === 0 ? 35 : 20)).strength(0.8));


    const linkGroup = svg.append("g")
      .attr("class", "links");

    const nodeGroup = svg.append("g")
        .attr("class", "nodes");

    const labelGroup = svg.append("g")
        .attr("class", "labels");

    const linkElements = linkGroup
      .attr("stroke", "hsl(var(--border))") 
      .attr("stroke-opacity", 0.5) // Slightly more transparent
      .selectAll("line")
      .data(d3Links, (d: any) => `${typeof d.source === 'object' ? d.source.id : d.source}-${typeof d.target === 'object' ? d.target.id : d.target}`)
      .join("line")
      .attr("stroke-width", 1.5);

    const nodeRadius = (d: ImpactNode) => d.order === 0 ? 20 : 12; // Larger root node

    const nodeElements = nodeGroup
      .attr("stroke", "hsl(var(--card))")
      .attr("stroke-width", 2) // Slightly thicker stroke
      .selectAll("circle")
      .data(d3Nodes, (d: ImpactNode) => d.id)
      .join("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => d.originalColor || NODE_COLORS[d.order] || 'hsl(var(--muted))')
      .on("click", (event, d_typed) => {
        onNodeClick(d_typed as ImpactNode);
      })
      .call(drag(simulation) as any);

    nodeElements.append("title")
      .text(d => `${d.label}\nOrder: ${d.order}\nValidity: ${d.validity}\nID: ${d.id}`);
      
    const labelElements = labelGroup
      .selectAll("text")
      .data(d3Nodes, (d: ImpactNode) => d.id)
      .join("text")
      .text(d => d.label)
      .attr("font-size", d => d.order === 0 ? "11px" : "9px") // Larger label for root
      .attr("font-weight", d => d.order === 0 ? "600" : "normal")
      .attr("fill", "hsl(var(--foreground))")
      .attr("text-anchor", "middle")
      .attr("paint-order", "stroke")
      .attr("stroke", "hsl(var(--card))") 
      .attr("stroke-width", "0.3em")
      .attr("stroke-linejoin", "round")
      .attr("dy", d => `${nodeRadius(d) + (d.order === 0 ? 12 : 10)}px`) 
      .style("pointer-events", "none"); 


    simulation.on("tick", () => {
      linkElements
        .attr("x1", d => (d.source as ImpactNode).x || 0)
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
    
    simulation.alpha(0.6).restart(); // Increased initial alpha for more settling


    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 3]) // Adjusted scale extent
        .on("zoom", (event) => {
            const { transform } = event;
            linkGroup.attr("transform", transform.toString());
            nodeGroup.attr("transform", transform.toString());
            labelGroup.attr("transform", transform.toString());
        });
    
    svg.call(zoomBehavior);


    return () => {
      simulation.stop();
    };

  }, [initialNodes, initialLinks, width, height, onNodeClick]);


  function drag(simulation: d3.Simulation<ImpactNode, undefined>) {
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      // For non-root nodes, update fx/fy. Root node is already fixed.
      if (d.order !== 0) {
        d.fx = d.x; 
        d.fy = d.y; 
      }
    }
    
    function dragged(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      if (d.order !== 0) {
        d.fx = event.x;
        d.fy = event.y;
      }
    }
    
    function dragended(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      if (!event.active) simulation.alphaTarget(0);
      // If you want to unpin after drag for non-root nodes:
      // if (d.order !== 0) {
      //   d.fx = null; 
      //   d.fy = null;
      // }
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

    
