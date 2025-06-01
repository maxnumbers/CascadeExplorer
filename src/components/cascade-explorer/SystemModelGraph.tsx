
"use client";

import type { SystemModel } from '@/types/cascade';
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

interface SystemGraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: 'stock' | 'agent';
  description?: string;
  baseColor: string;
}

interface SystemGraphLink extends SimulationLinkDatum<SystemGraphNode> {
  source: string; // agentId
  target: string; // stockId
  label: string; // incentiveDescription
  flow?: string; // resultingFlow
}

interface SystemModelGraphProps {
  systemModel: SystemModel | null;
  width?: number;
  height?: number;
}

const STOCK_COLOR = 'hsl(var(--primary))'; // Electric Blue for stocks
const AGENT_COLOR = 'hsl(var(--accent))';  // Soft Purple for agents
const LINK_COLOR = 'hsl(var(--border))';
const TEXT_COLOR = 'hsl(var(--foreground))';
const BG_COLOR = 'hsl(var(--card))';


const SystemModelGraph: React.FC<SystemModelGraphProps> = ({ systemModel, width = 600, height = 400 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const transformSystemModelToGraphData = (model: SystemModel | null): { nodes: SystemGraphNode[], links: SystemGraphLink[] } => {
    if (!model) return { nodes: [], links: [] };

    const nodes: SystemGraphNode[] = [];
    const links: SystemGraphLink[] = [];
    let nodeIdCounter = 0;

    model.stocks.forEach(stock => {
      nodes.push({ 
        id: `stock-${nodeIdCounter++}`, 
        label: stock.name, 
        type: 'stock', 
        description: stock.description,
        baseColor: STOCK_COLOR 
      });
    });

    model.agents.forEach(agent => {
      nodes.push({ 
        id: `agent-${nodeIdCounter++}`, 
        label: agent.name, 
        type: 'agent', 
        description: agent.description,
        baseColor: AGENT_COLOR
       });
    });

    model.incentives.forEach(incentive => {
      const agentNode = nodes.find(n => n.label === incentive.agentName && n.type === 'agent');
      const stockNode = nodes.find(n => n.label === incentive.targetStockName && n.type === 'stock');

      if (agentNode && stockNode) {
        links.push({
          source: agentNode.id,
          target: stockNode.id,
          label: incentive.incentiveDescription,
          flow: incentive.resultingFlow
        });
      }
    });
    return { nodes, links };
  };


  useEffect(() => {
    if (!svgRef.current || !systemModel || !width || !height) {
       if (svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const { nodes: d3Nodes, links: d3Links } = transformSystemModelToGraphData(systemModel);
    
    if (d3Nodes.length === 0) {
      d3.select(svgRef.current).selectAll("*").remove(); // Clear if no nodes
      return;
    }


    const svg = d3.select(svgRef.current)
      .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
      .style('max-width', '100%')
      .style('height', 'auto');
      // .style('background-color', BG_COLOR); // Set background for the SVG area

    svg.selectAll("*").remove(); // Clear previous graph

    // Define arrow marker
    svg.append("svg:defs").selectAll("marker")
        .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22) // Distance from node center for arrow
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", LINK_COLOR);

    const simulation = d3.forceSimulation<SystemGraphNode>(d3Nodes)
      .force("link", d3.forceLink<SystemGraphNode, SystemGraphLink>(d3Links)
        .id(d => d.id)
        .distance(150) // Adjusted distance
        .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-500)) // Adjusted charge
      .force("center", d3.forceCenter(0,0).strength(0.1)) // Keep graph centered
      .force("collide", d3.forceCollide<SystemGraphNode>().radius(d => (d.type === 'stock' ? 50 : 35)).strength(0.7)); // Collision radius

    const linkElements = svg.append("g")
      .attr("class", "links")
      .attr("stroke", LINK_COLOR)
      .attr("stroke-opacity", 0.7)
      .selectAll("line")
      .data(d3Links, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#end)");

    const nodeElements = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(d3Nodes, (d: SystemGraphNode) => d.id)
      .join("g")
      .call(drag(simulation) as any);

    // Draw rectangles for stocks
    nodeElements.filter(d => d.type === 'stock')
      .append("rect")
      .attr("width", 80)
      .attr("height", 40)
      .attr("rx", 5) // Rounded corners
      .attr("ry", 5)
      .attr("x", -40)
      .attr("y", -20)
      .attr("fill", d => d.baseColor)
      .attr("stroke", d3.color(STOCK_COLOR)?.darker(0.5).toString() || '#000000')
      .attr("stroke-width", 1.5);

    // Draw circles for agents
    nodeElements.filter(d => d.type === 'agent')
      .append("circle")
      .attr("r", 25)
      .attr("fill", d => d.baseColor)
      .attr("stroke", d3.color(AGENT_COLOR)?.darker(0.5).toString() || '#000000')
      .attr("stroke-width", 1.5);

    const labelElements = nodeElements.append("text")
      .text(d => d.label)
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", TEXT_COLOR)
      .attr("text-anchor", "middle")
      .attr("dy", d => d.type === 'stock' ? "0.35em" : "0.35em") // Center text in shapes
      .style("pointer-events", "none")
      .call(wrapText, 70); // Wrap text within 70px width for stocks

    nodeElements.append("title")
      .text(d => `${d.label}${d.description ? `\nDescription: ${d.description}` : ''}`);
      
    // Link labels (for incentive descriptions)
    const linkLabelElements = svg.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(d3Links)
      .join("text")
      .attr("class", "link-label")
      .attr("font-size", "8px")
      .attr("fill", TEXT_COLOR)
      .attr("text-anchor", "middle")
      .text(d => d.label.length > 30 ? d.label.substring(0,27) + "..." : d.label) // Truncate long labels
      .append("title") // Full label on hover
         .text(d => `${d.label}${d.flow ? `\nFlow: ${d.flow}` : ''}`);


    simulation.on("tick", () => {
      linkElements
        .attr("x1", d => (d.source as SystemGraphNode).x || 0)
        .attr("y1", d => (d.source as SystemGraphNode).y || 0)
        .attr("x2", d => (d.target as SystemGraphNode).x || 0)
        .attr("y2", d => (d.target as SystemGraphNode).y || 0);

      nodeElements
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
      
      // Position link labels at the midpoint of the link
      linkLabelElements
        .attr("x", d => (((d.source as SystemGraphNode).x || 0) + ((d.target as SystemGraphNode).x || 0)) / 2)
        .attr("y", d => (((d.source as SystemGraphNode).y || 0) + ((d.target as SystemGraphNode).y || 0)) / 2 - 5); // Offset slightly above line
    });
    
    simulation.alpha(0.8).restart();

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 2])
        .on("zoom", (event) => {
            const { transform } = event;
            svg.selectAll(".nodes, .links, .link-labels").attr("transform", transform.toString());
        });
    
    svg.call(zoomBehavior);


    return () => {
      simulation.stop();
    };

  }, [systemModel, width, height]);


  function drag(simulation: d3.Simulation<SystemGraphNode, undefined>) {
    function dragstarted(event: d3.D3DragEvent<SVGGElement, SystemGraphNode, SystemGraphNode>, d: SystemGraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; 
      d.fy = d.y; 
    }
    
    function dragged(event: d3.D3DragEvent<SVGGElement, SystemGraphNode, SystemGraphNode>, d: SystemGraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: d3.D3DragEvent<SVGGElement, SystemGraphNode, SystemGraphNode>, d: SystemGraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      // To keep nodes fixed after drag, comment out below. To unpin:
      // d.fx = null; 
      // d.fy = null;
    }
    
    return d3.drag<SVGGElement, SystemGraphNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  // Helper function for text wrapping (adapted for D3 v7 selection)
  function wrapText(texts: d3.Selection<SVGTextElement, SystemGraphNode, SVGGElement, unknown>, width: number) {
    texts.each(function(d) { // Use 'each' to operate on individual text elements
      if (d.type === 'agent') return; // Only wrap for stocks (rectangles)
      const text = d3.select(this);
      const words = d.label.split(/\s+/).reverse();
      let word;
      let line: string[] = [];
      let lineNumber = 0;
      const lineHeight = 1.1; // ems
      const y = text.attr("y");
      const dy = parseFloat(text.attr("dy") || "0");
      let tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
      
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if ((tspan.node() as SVGTextContentElement).getComputedTextLength() > width && line.length > 1) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", (++lineNumber * lineHeight + dy) + "em").text(word);
        }
      }
      // Center multi-line text block
      const textBlockHeight = (lineNumber + 1) * (parseFloat(text.style("font-size")) * lineHeight);
      text.selectAll("tspan").attr("y", parseFloat(y as string) - textBlockHeight / 2 + (parseFloat(text.style("font-size"))*0.8) );

    });
  }


  return (
    <div className="w-full h-full flex justify-center items-center bg-card rounded-lg shadow-inner overflow-hidden border border-input">
       <svg ref={svgRef} width={width} height={height}></svg>
    </div>
  );
};

export default SystemModelGraph;
