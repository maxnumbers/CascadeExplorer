
"use client";

import type { SystemModel, SystemGraphNode, SystemGraphLink } from '@/types/cascade'; // Using new graph-specific types
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3'; // d3 types still needed for simulation

const STOCK_COLOR = 'hsl(var(--primary))'; // Electric Blue for stocks
const AGENT_COLOR = 'hsl(var(--accent))';  // Soft Purple for agents
const LINK_COLOR = 'hsl(var(--border))';
const NODE_TEXT_COLOR = 'hsl(var(--card-foreground))'; // Ensure text is readable on node
const LINK_LABEL_COLOR = 'hsl(var(--muted-foreground))';
const BG_COLOR = 'hsl(var(--card))';


const SystemModelGraph: React.FC<{ systemModel: SystemModel | null; width?: number; height?: number; }> = ({ systemModel, width = 600, height = 400 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const transformSystemModelToGraphData = (model: SystemModel | null): { nodes: SystemGraphNode[], links: SystemGraphLink[] } => {
    if (!model) return { nodes: [], links: [] };

    const nodes: SystemGraphNode[] = [];
    const links: SystemGraphLink[] = [];
    
    // Create unique IDs for D3 based on type and name
    const getD3Id = (type: 'stock' | 'agent', name: string) => `${type}-${name.replace(/\s+/g, '_')}`;

    (model.stocks || []).forEach(stock => {
      nodes.push({
        id: getD3Id('stock', stock.name),
        originalId: stock.name,
        label: stock.name,
        type: 'stock',
        description: stock.description,
        qualitativeState: stock.qualitativeState,
        baseColor: STOCK_COLOR,
        x: undefined, y: undefined, vx: undefined, vy: undefined, // Initialize D3 properties
      });
    });

    (model.agents || []).forEach(agent => {
      nodes.push({
        id: getD3Id('agent', agent.name),
        originalId: agent.name,
        label: agent.name,
        type: 'agent',
        description: agent.description,
        baseColor: AGENT_COLOR,
        x: undefined, y: undefined, vx: undefined, vy: undefined, // Initialize D3 properties
       });
    });

    (model.incentives || []).forEach(incentive => {
      const agentNodeId = getD3Id('agent', incentive.agentName);
      const stockNodeId = getD3Id('stock', incentive.targetStockName);
      const agentNode = nodes.find(n => n.id === agentNodeId);
      const stockNode = nodes.find(n => n.id === stockNodeId);


      if (agentNode && stockNode) {
        links.push({
          source: agentNode.id,
          target: stockNode.id,
          label: incentive.incentiveDescription,
          flow: incentive.resultingFlow,
          type: 'incentive',
        });
      } else {
        console.warn(`SystemModelGraph: Could not find D3 node for agent '${incentive.agentName}' or stock '${incentive.targetStockName}' for incentive:`, incentive);
      }
    });

    (model.stockToStockFlows || []).forEach(flow => {
        const sourceNodeId = getD3Id('stock', flow.sourceStockName);
        const targetNodeId = getD3Id('stock', flow.targetStockName);
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        const targetNode = nodes.find(n => n.id === targetNodeId);

        if (sourceNode && targetNode) {
            links.push({
                source: sourceNode.id,
                target: targetNode.id,
                label: flow.flowDescription,
                flow: flow.drivingForceDescription, // Using 'flow' to store the secondary text
                type: 'stock-to-stock',
            });
        } else {
             console.warn(`SystemModelGraph: Could not find D3 node for source stock '${flow.sourceStockName}' or target stock '${flow.targetStockName}' for stock-to-stock flow:`, flow);
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
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }


    const svg = d3.select(svgRef.current)
      .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
      .style('max-width', '100%')
      .style('height', 'auto');

    svg.selectAll("*").remove();

    svg.append("svg:defs").selectAll("marker")
        .data(["end-incentive", "end-stockflow"]) // Different markers if needed
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", (d) => d === "end-incentive" ? 22 : 47 ) // Adjust refX for rects
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
        .distance(180) // Increased distance
        .strength(0.4)
      )
      .force("charge", d3.forceManyBody().strength(-600)) // Increased repulsion
      .force("center", d3.forceCenter(0,0).strength(0.05))
      .force("collide", d3.forceCollide<SystemGraphNode>().radius(d => (d.type === 'stock' ? 55 : 35)).strength(0.8));

    const linkElements = svg.append("g")
      .attr("class", "links")
      .attr("stroke", LINK_COLOR)
      .attr("stroke-opacity", 0.7)
      .selectAll("line")
      .data(d3Links, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", d => d.type === 'incentive' ? "url(#end-incentive)" : "url(#end-stockflow)");


    const nodeElements = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(d3Nodes, (d: SystemGraphNode) => d.id)
      .join("g")
      .call(drag(simulation) as any);

    // Stocks as rectangles
    nodeElements.filter(d => d.type === 'stock')
      .append("rect")
      .attr("width", 90)  // Slightly wider
      .attr("height", 50) // Slightly taller to accommodate state
      .attr("rx", 6) 
      .attr("ry", 6)
      .attr("x", -45) 
      .attr("y", -25) 
      .attr("fill", d => d.baseColor)
      .attr("stroke", d => d3.color(d.baseColor)?.darker(0.5).toString() || '#000000')
      .attr("stroke-width", 1.5);

    // Agents as circles
    nodeElements.filter(d => d.type === 'agent')
      .append("circle")
      .attr("r", 28) // Slightly larger
      .attr("fill", d => d.baseColor)
      .attr("stroke", d => d3.color(d.baseColor)?.darker(0.5).toString() || '#000000')
      .attr("stroke-width", 1.5);

    const labelElements = nodeElements.append("text")
      .attr("font-size", "10px")
      .attr("font-weight", "600") // Bolder label
      .attr("fill", NODE_TEXT_COLOR)
      .attr("text-anchor", "middle")
      .style("pointer-events", "none")
      .each(function(d) { // Use 'each' to handle multi-line and state
        const g = d3.select(this);
        g.append("tspan")
            .attr("x", 0)
            .attr("dy", d.type === 'stock' && d.qualitativeState ? "-0.3em" : "0.35em") // Adjust if state is present
            .text(d.label);
        
        if (d.type === 'stock' && d.qualitativeState) {
            g.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.2em") // New line for state
                .attr("font-size", "8px")
                .attr("font-style", "italic")
                .attr("fill", d3.color(NODE_TEXT_COLOR)?.brighter(0.5).toString() || NODE_TEXT_COLOR) // Lighter state text
                .text(`(${d.qualitativeState})`);
        }
      })
      .call(wrapStockText, 80); // Max width for text inside rects


    nodeElements.append("title")
      .text(d => `${d.label}${d.qualitativeState ? ` (${d.qualitativeState})` : ''}${d.description ? `\nDescription: ${d.description}` : ''}`);

    const linkLabelGroup = svg.append("g")
      .attr("class", "link-labels");

    const linkLabelElements = linkLabelGroup
      .selectAll("text")
      .data(d3Links)
      .join("text")
      .attr("class", "link-label")
      .attr("font-size", "9px")
      .attr("fill", LINK_LABEL_COLOR)
      .attr("text-anchor", "middle")
      .attr("paint-order", "stroke")
      .attr("stroke", BG_COLOR) 
      .attr("stroke-width", "0.25em") // Slightly thicker halo
      .attr("stroke-linejoin", "round")
      .text(d => d.label.length > 30 ? d.label.substring(0,27) + "..." : d.label); 

    linkLabelElements.append("title")
        .text(d => `${d.type === 'incentive' ? 'Incentive' : 'Flow'}: ${d.label}${d.flow ? `\nDetails: ${d.flow}` : ''}`);


    simulation.on("tick", () => {
      linkElements
        .attr("x1", d => (d.source as SystemGraphNode).x || 0)
        .attr("y1", d => (d.source as SystemGraphNode).y || 0)
        .attr("x2", d => (d.target as SystemGraphNode).x || 0)
        .attr("y2", d => (d.target as SystemGraphNode).y || 0);

      nodeElements
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);

      linkLabelElements
        .attr("x", d => (((d.source as SystemGraphNode).x || 0) + ((d.target as SystemGraphNode).x || 0)) / 2)
        .attr("y", d => (((d.source as SystemGraphNode).y || 0) + ((d.target as SystemGraphNode).y || 0)) / 2 - 8); // Offset slightly above link
    });

    simulation.alpha(0.8).restart();

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 2.5]) // Adjusted zoom
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
       // Optional: unpin after drag
       // d.fx = null;
       // d.fy = null;
    }

    return d3.drag<SVGGElement, SystemGraphNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

 function wrapStockText(texts: d3.Selection<SVGTextElement, SystemGraphNode, SVGGElement, unknown>, maxWidth: number) {
    texts.each(function(dNode) {
        // This function is primarily for stock labels if they become too complex.
        // Agent labels (circles) are simpler and might not need this multi-tspan logic,
        // as their main label tspan already has dy adjustments.
        if (dNode.type === 'agent') {
            const textElement = d3.select(this).select<SVGTSpanElement>("tspan:first-child"); // Select the main label tspan
            const agentCircleRadius = 28;
            const maxAgentLabelWidth = agentCircleRadius * 1.7; // Approx width within circle

            if (textElement.node() && (textElement.node() as SVGTextContentElement).getComputedTextLength() > maxAgentLabelWidth) {
                let text = dNode.label;
                while (textElement.node() && (textElement.node()as SVGTextContentElement).getComputedTextLength() > maxAgentLabelWidth && text.length > 0) {
                    text = text.slice(0, -1);
                    textElement.text(text + "…");
                }
                 if(textElement.node() && text.length === 0) textElement.text("…");
            }
            return;
        }
        
        // For stocks, the tspans for label and state are already created.
        // This function could be extended if stock labels themselves need word wrapping.
        // For now, the multi-tspan approach for label + state is handled directly in the .each()
        // callback when creating labelElements. If stock labels also need wrapping:
        const stockLabelTspan = d3.select(this).select<SVGTSpanElement>("tspan:first-child");
        if (stockLabelTspan.node() && (stockLabelTspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth) {
            // Implement word wrapping logic similar to original wrapText if needed for the main label.
            // This would involve splitting dNode.label, creating new tspans for the label part,
            // and adjusting dy attributes carefully considering the qualitativeState tspan.
            // For simplicity in this iteration, I'm assuming stock names are relatively concise.
            // If they can be long, a more robust text wrapping is needed here for the first tspan.
            let text = dNode.label;
            while (stockLabelTspan.node() && (stockLabelTspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth && text.length > 0) {
                text = text.slice(0, -1);
                stockLabelTspan.text(text + "…");
            }
             if(stockLabelTspan.node() && text.length === 0) stockLabelTspan.text("…");
        }
    });
}


  return (
    <div className="w-full h-full flex justify-center items-center bg-card rounded-lg shadow-inner overflow-hidden border border-input">
       <svg ref={svgRef} width={width} height={height}></svg>
    </div>
  );
};

export default SystemModelGraph;

