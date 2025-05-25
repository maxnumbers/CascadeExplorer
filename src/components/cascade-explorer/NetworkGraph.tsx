"use client";

import type { ImpactNode, ImpactLink } from '@/types/cascade';
import { NODE_COLORS } from '@/types/cascade';
import React, { useEffect, useRef, useState } from 'react';
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
  const [nodes, setNodes] = useState<ImpactNode[]>([]);
  const [links, setLinks] = useState<ImpactLink[]>([]);

  useEffect(() => {
    setNodes(initialNodes.map(n => ({...n}))); // Create copies for D3 simulation
    setLinks(initialLinks.map(l => ({...l})));
  }, [initialNodes, initialLinks]);
  
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
      .style('max-width', '100%')
      .style('height', 'auto');

    svg.selectAll("*").remove(); // Clear previous graph

    const simulation = d3.forceSimulation<ImpactNode>(nodes)
      .force("link", d3.forceLink<ImpactNode, ImpactLink>(links).id(d => d.id).distance(d => (d.source as ImpactNode).order === 0 || (d.target as ImpactNode).order === 0 ? 150 : 100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(0,0).strength(0.1)) // Adjusted center force strength
      .force("x", d3.forceX().strength(0.05)) // Weaker X positioning force
      .force("y", d3.forceY().strength(0.05)); // Weaker Y positioning force


    const link = svg.append("g")
      .attr("stroke", "hsl(var(--border))") // Use border color for links
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(3)); // Fixed stroke width

    const nodeRadius = (d: ImpactNode) => d.order === 0 ? 20 : 12;

    const node = svg.append("g")
      .attr("stroke", "hsl(var(--background))") // Use background for stroke
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => NODE_COLORS[d.order] || 'hsl(var(--muted))')
      .on("click", (event, d) => {
        onNodeClick(d);
      })
      .call(drag(simulation) as any);

    node.append("title")
      .text(d => d.label);
      
    const labels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.label)
      .attr("font-size", "10px")
      .attr("fill", "hsl(var(--foreground))")
      .attr("text-anchor", "middle")
      .attr("dy", d => `${nodeRadius(d) + 12}px`) // Position below the node
      .style("pointer-events", "none"); // So labels don't interfere with node click/drag


    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as ImpactNode).x!)
        .attr("y1", d => (d.source as ImpactNode).y!)
        .attr("x2", d => (d.target as ImpactNode).x!)
        .attr("y2", d => (d.target as ImpactNode).y!);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);
      
      labels
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);
    });

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 5])
        .on("zoom", (event) => {
            const { transform } = event;
            svg.selectAll('g').attr("transform", transform.toString());
        });
    
    svg.call(zoomBehavior);
    
    // Apply initial zoom to fit (optional, can be tricky to get right)
    // Example: center graph, but might need adjustments
    // const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8);
    // svg.call(zoomBehavior.transform, initialTransform);


    return () => {
      simulation.stop();
    };

  }, [nodes, links, width, height, onNodeClick]);


  function drag(simulation: d3.Simulation<ImpactNode, undefined>) {
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: d3.D3DragEvent<SVGCircleElement, ImpactNode, ImpactNode>, d: ImpactNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
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
