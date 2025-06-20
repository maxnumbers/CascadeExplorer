
"use client";

import type { SystemModel, SystemGraphNode, SystemGraphLink } from '@/types/cascade'; // Using new graph-specific types
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3'; // d3 types still needed for simulation

const STOCK_COLOR = 'hsl(var(--primary))';
const AGENT_COLOR = 'hsl(var(--accent))';
const LINK_COLOR = 'hsl(var(--muted-foreground))';
const LINK_LABEL_COLOR = 'hsl(var(--foreground))';
const BG_COLOR = 'hsl(var(--card))';
const LABEL_VERTICAL_OFFSET = 14; // Increased spacing for parallel labels


const SystemModelGraph: React.FC<{ systemModel: SystemModel | null; width?: number; height?: number; }> = ({ systemModel, width: propWidth, height: propHeight }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);


  const transformSystemModelToGraphData = (model: SystemModel | null): { nodes: SystemGraphNode[], links: SystemGraphLink[] } => {
    if (!model) return { nodes: [], links: [] };

    const nodes: SystemGraphNode[] = [];
    const links: SystemGraphLink[] = [];
    
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
       });
    });

    (model.incentives || []).forEach((incentive, index) => {
      const agentNodeId = getD3Id('agent', incentive.agentName);
      const stockNodeId = getD3Id('stock', incentive.targetStockName);
      const agentNode = nodes.find(n => n.id === agentNodeId);
      const stockNode = nodes.find(n => n.id === stockNodeId);

      if (agentNode && stockNode) {
        const displayed = (incentive.resultingFlow && incentive.resultingFlow.trim() !== '') 
                         ? incentive.resultingFlow 
                         : incentive.incentiveDescription.substring(0,35) + (incentive.incentiveDescription.length > 35 ? "..." : "");
        links.push({
          linkId: `incentive-${agentNode.id}-${stockNode.id}-${displayed.replace(/\s+/g, '_').slice(0,15)}-${index}`,
          source: agentNode.id, 
          target: stockNode.id, 
          label: incentive.incentiveDescription, 
          displayedText: displayed,
          detailText: (incentive.resultingFlow && incentive.resultingFlow.trim() !== '' && incentive.incentiveDescription !== incentive.resultingFlow) 
                      ? incentive.incentiveDescription 
                      : undefined, 
          type: 'incentive',
          parallelIndex: 0, // Default, will be updated
          parallelTotal: 1, // Default, will be updated
        });
      } else {
        console.warn(`SystemModelGraph: Could not find D3 node for agent '${incentive.agentName}' or stock '${incentive.targetStockName}' for incentive:`, incentive);
      }
    });

    (model.stockToStockFlows || []).forEach((flow, index) => {
        const sourceNodeId = getD3Id('stock', flow.sourceStockName);
        const targetNodeId = getD3Id('stock', flow.targetStockName);
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        const targetNode = nodes.find(n => n.id === targetNodeId);

        if (sourceNode && targetNode) {
            links.push({
                linkId: `s2s-${sourceNode.id}-${targetNode.id}-${flow.flowDescription.replace(/\s+/g, '_').slice(0,15)}-${index}`,
                source: sourceNode.id, 
                target: targetNode.id, 
                label: flow.flowDescription, 
                displayedText: flow.flowDescription, 
                detailText: flow.drivingForceDescription, 
                type: 'stock-to-stock',
                parallelIndex: 0, // Default, will be updated
                parallelTotal: 1, // Default, will be updated
            });
        } else {
             console.warn(`SystemModelGraph: Could not find D3 node for source stock '${flow.sourceStockName}' or target stock '${flow.targetStockName}' for stock-to-stock flow:`, flow);
        }
    });

    // Assign parallelIndex and parallelTotal
    const linkGroups: Record<string, SystemGraphLink[]> = {};
    links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as SystemGraphNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as SystemGraphNode).id;
        
        // Normalize order for key to handle bidirectional links as part of the same group for stacking
        const groupKey = sourceId < targetId ? `${sourceId}---${targetId}` : `${targetId}---${sourceId}`;

        if (!linkGroups[groupKey]) {
            linkGroups[groupKey] = [];
        }
        linkGroups[groupKey].push(link);
    });

    Object.values(linkGroups).forEach(group => {
        if (group.length > 1) {
            group.forEach((link, index) => {
                link.parallelIndex = index;
                link.parallelTotal = group.length;
            });
        } else {
            // For single links, explicitly set these so the condition in tick function is clean
            group.forEach(link => {
              link.parallelIndex = 0;
              link.parallelTotal = 1;
            });
        }
    });

    return { nodes, links };
  };


  useEffect(() => {
    if (!svgRef.current || !systemModel || !containerRef.current ) {
       if (svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
      return;
    }
    
    const { clientWidth: width, clientHeight: height } = containerRef.current;
    if (width === 0 || height === 0) return;


    const { nodes: d3Nodes, links: d3Links } = transformSystemModelToGraphData(systemModel);

    if (d3Nodes.length === 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [-width / 2, -height / 2, width, height].join(' '))
      .style('width', '100%') 
      .style('height', '100%');


    svg.selectAll("*").remove();

    svg.append("svg:defs").selectAll("marker")
        .data(["end-arrow"]) 
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15) 
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", LINK_COLOR);
    
    const getRefXForMarker = (targetNodeDatum: SystemGraphNode | string | number | d3.SimulationNodeDatum | undefined) => {
        const node = typeof targetNodeDatum === 'string' || typeof targetNodeDatum === 'number' ? d3Nodes.find(n => n.id === targetNodeDatum) : targetNodeDatum as SystemGraphNode;
        if (node?.type === 'stock') return 47; 
        if (node?.type === 'agent') return 30; 
        return 15; 
    };


    const simulation = d3.forceSimulation<SystemGraphNode>(d3Nodes)
      .force("link", d3.forceLink<SystemGraphNode, SystemGraphLink>(d3Links)
        .id(d_node => d_node.id)
        .distance(200) 
        .strength(0.4)
      )
      .force("charge", d3.forceManyBody().strength(-600)) 
      .force("center", d3.forceCenter(0,0).strength(0.05))
      .force("collide", d3.forceCollide<SystemGraphNode>().radius(d_node => (d_node.type === 'stock' ? 60 : 40)).strength(0.9)); 

    const linkElements = svg.append("g")
      .attr("class", "links") 
      .attr("stroke", LINK_COLOR)
      .attr("stroke-opacity", 0.7)
      .selectAll("line")
      .data(d3Links, (d_link: SystemGraphLink) => d_link.linkId)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#end-arrow)")
      .each(function(d_link) { 
          const marker = svg.select("#end-arrow"); 
          let targetNodeForMarker: SystemGraphNode | undefined;
          if (typeof d_link.target === 'string') {
            targetNodeForMarker = d3Nodes.find(n => n.id === d_link.target);
          } else if (typeof d_link.target === 'number') {
            targetNodeForMarker = d3Nodes.find(n => n.id === String(d_link.target));
          } else {
            targetNodeForMarker = d_link.target as SystemGraphNode;
          }
          marker.attr("refX", getRefXForMarker(targetNodeForMarker));
      });


    const nodeElements = svg.append("g")
      .attr("class", "nodes") 
      .selectAll("g")
      .data(d3Nodes, (d_node: SystemGraphNode) => d_node.id)
      .join("g")
      .call(drag(simulation) as any);

    nodeElements.filter(d_node => d_node.type === 'stock')
      .append("rect")
      .attr("width", 90)  
      .attr("height", 50) 
      .attr("rx", 6) 
      .attr("ry", 6)
      .attr("x", -45) 
      .attr("y", -25) 
      .attr("fill", d_node => d_node.baseColor)
      .attr("stroke", d_node => d3.color(d_node.baseColor)?.darker(0.5).toString() || '#000000')
      .attr("stroke-width", 1.5);

    nodeElements.filter(d_node => d_node.type === 'agent')
      .append("circle")
      .attr("r", 28) 
      .attr("fill", d_node => d_node.baseColor)
      .attr("stroke", d_node => d3.color(d_node.baseColor)?.darker(0.5).toString() || '#000000')
      .attr("stroke-width", 1.5);

    nodeElements.append("text") 
      .attr("font-size", "10px")
      .attr("font-weight", "600") 
      .attr("fill", d_node => { 
        if (d_node.type === 'stock') return 'hsl(var(--primary-foreground))';
        if (d_node.type === 'agent') return 'hsl(var(--accent-foreground))';
        return 'hsl(var(--foreground))'; 
      })
      .attr("text-anchor", "middle")
      .style("pointer-events", "none")
      .each(function(d_node) { 
        const g = d3.select(this);
        g.append("tspan")
            .attr("x", 0)
            .attr("dy", d_node.type === 'stock' && d_node.qualitativeState ? "-0.3em" : "0.35em") 
            .text(d_node.label);
        
        if (d_node.type === 'stock' && d_node.qualitativeState) {
            g.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.2em") 
                .attr("font-size", "8px")
                .attr("font-style", "italic")
                .attr("fill", 'hsl(var(--primary-foreground))') 
                .style("opacity", 0.85) 
                .text(`(${d_node.qualitativeState})`);
        }
      })
      .call(wrapStockText, 80); 


    nodeElements.append("title")
      .text(d_node => `${d_node.label}${d_node.qualitativeState ? ` (${d_node.qualitativeState})` : ''}${d_node.description ? `\nDescription: ${d_node.description}` : ''}`);

    const topLevelLinkLabelGroup = svg.append("g").attr("class", "link-labels");

    const individualLabelGroups = topLevelLinkLabelGroup
      .selectAll("g.link-label-item-group")
      .data(d3Links, (d_link: SystemGraphLink) => d_link.linkId) 
      .join(
        enter => { 
          const g = enter.append("g").attr("class", "link-label-item-group");
          g.append("text") 
            .attr("class", "link-label")
            .attr("font-size", "9px")
            .attr("fill", LINK_LABEL_COLOR)
            .attr("text-anchor", "middle")
            .attr("paint-order", "stroke")
            .attr("stroke", BG_COLOR) 
            .attr("stroke-width", "0.25em")
            .call(wrapLinkText, 200);
          g.append("title");
          return g;
        },
        update => { 
            update.select<SVGTextElement>("text.link-label").call(wrapLinkText, 200);
            return update;
        },
        exit => exit.remove()
      );
    
    individualLabelGroups.select<SVGTitleElement>("title") 
        .text(d_link => `${d_link.type === 'incentive' ? 'Incentive' : 'Flow'}: ${d_link.label}${d_link.detailText ? `\nDetails: ${d_link.detailText}` : ''}`);


    simulation.on("tick", () => {
      linkElements
        .attr("x1", d_link => (d_link.source as SystemGraphNode).x || 0)
        .attr("y1", d_link => (d_link.source as SystemGraphNode).y || 0)
        .attr("x2", d_link => (d_link.target as SystemGraphNode).x || 0)
        .attr("y2", d_link => (d_link.target as SystemGraphNode).y || 0);

      nodeElements
        .attr("transform", d_node => `translate(${d_node.x || 0},${d_node.y || 0})`);
            
      individualLabelGroups.each(function(d_link) {
        const linkTextGroup = d3.select(this);
        const sourceNode = d_link.source as SystemGraphNode; 
        const targetNode = d_link.target as SystemGraphNode; 
        
        let newX = 0;
        let newY = 0;

        if (sourceNode.x !== undefined && targetNode.x !== undefined && sourceNode.y !== undefined && targetNode.y !== undefined) {
            newX = (sourceNode.x + targetNode.x) / 2;
            newY = (sourceNode.y + targetNode.y) / 2 - 8; // Base offset for the first label or single label
        
            // Apply simplified vertical offset for parallel links
            if (d_link.parallelTotal && d_link.parallelTotal > 1 && d_link.parallelIndex !== undefined) {
                const verticalStackOffset = (d_link.parallelIndex - (d_link.parallelTotal - 1) / 2) * LABEL_VERTICAL_OFFSET;
                newY += verticalStackOffset; 
            }
        }
        linkTextGroup.attr("transform", `translate(${newX}, ${newY})`);
      });
    });
                
    simulation.alpha(0.8).restart();

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 2.5]) 
        .on("zoom", (event) => {
            const { transform } = event;
            svg.selectAll(".nodes, .links, .link-labels").attr("transform", transform.toString());
        });

    svg.call(zoomBehavior);


    return () => {
      simulation.stop();
    };

  }, [systemModel, propWidth, propHeight]); 


  function drag(simulation: d3.Simulation<SystemGraphNode, undefined>) {
    function dragstarted(event: d3.D3DragEvent<SVGGElement, SystemGraphNode, SystemGraphNode>, d_node: SystemGraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d_node.fx = d_node.x;
      d_node.fy = d_node.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, SystemGraphNode, SystemGraphNode>, d_node: SystemGraphNode) {
      d_node.fx = event.x;
      d_node.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, SystemGraphNode, SystemGraphNode>, d_node: SystemGraphNode) {
      if (!event.active) simulation.alphaTarget(0);
    }

    return d3.drag<SVGGElement, SystemGraphNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

 function wrapStockText(texts: d3.Selection<SVGTextElement, SystemGraphNode, SVGGElement, unknown>, maxWidth: number) {
    texts.each(function(dNode) {
        if (dNode.type === 'agent') {
            const textElement = d3.select(this).select<SVGTSpanElement>("tspan:first-child"); 
            const agentCircleRadius = 28;
            const maxAgentLabelWidth = agentCircleRadius * 1.7; 

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
        
        const stockLabelTspan = d3.select(this).select<SVGTSpanElement>("tspan:first-child");
        if (stockLabelTspan.node() && (stockLabelTspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth) {
            let text = dNode.label;
            while (stockLabelTspan.node() && (stockLabelTspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth && text.length > 0) {
                text = text.slice(0, -1);
                stockLabelTspan.text(text + "…");
            }
             if(stockLabelTspan.node() && text.length === 0) stockLabelTspan.text("…");
        }
    });
}

function wrapLinkText(texts: d3.Selection<SVGTextElement, SystemGraphLink, SVGGElement, unknown>, maxWidth: number) {
    texts.each(function(dLink) {
        const textElement = d3.select(this);
        textElement.text(null); 

        const originalText = dLink.displayedText || "";
        const maxLines = 1; // Force single line for link labels
        let lineNumber = 0; 
        
        const tspan = textElement.append("tspan")
            .attr("x", 0)
            .attr("dy", "0.35em") 
            .text(originalText);

        if ((tspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth) {
            let text = originalText;
            while (text.length > 0 && (tspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth) {
                text = text.slice(0, -1);
                tspan.text(text + "…");
            }
            if (text.length === 0 && tspan.node()) tspan.text("…"); 
        }
    });
}


  return (
    <div ref={containerRef} className="w-full h-full flex justify-center items-center bg-card rounded-lg shadow-inner overflow-hidden border border-input">
       <svg ref={svgRef}></svg>
    </div>
  );
};

export default SystemModelGraph;

