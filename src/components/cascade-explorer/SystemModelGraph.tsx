
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
          displayedText: incentive.resultingFlow || incentive.incentiveDescription.substring(0,20) + (incentive.incentiveDescription.length > 20 ? "..." : ""), 
          detailText: incentive.resultingFlow && incentive.resultingFlow !== incentive.incentiveDescription ? incentive.resultingFlow : undefined,
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
                displayedText: flow.flowDescription, 
                detailText: flow.drivingForceDescription,
                type: 'stock-to-stock',
            });
        } else {
             console.warn(`SystemModelGraph: Could not find D3 node for source stock '${flow.sourceStockName}' or target stock '${flow.targetStockName}' for stock-to-stock flow:`, flow);
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
    
    const getRefXForMarker = (targetNode: SystemGraphNode | string | number | d3.SimulationNodeDatum | undefined) => {
        const node = typeof targetNode === 'string' || typeof targetNode === 'number' ? d3Nodes.find(n => n.id === targetNode) : targetNode as SystemGraphNode;
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
      .attr("class", "links") // This group will be transformed by zoom
      .attr("stroke", LINK_COLOR)
      .attr("stroke-opacity", 0.7)
      .selectAll("line")
      .data(d3Links, (d_link: any) => `${(d_link.source as SystemGraphNode).id || d_link.source}-${(d_link.target as SystemGraphNode).id || d_link.target}`)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#end-arrow)")
      .each(function(d_link) { 
          const marker = svg.select("#end-arrow"); 
          marker.attr("refX", getRefXForMarker(d_link.target));
      });


    const nodeElements = svg.append("g")
      .attr("class", "nodes") // This group will be transformed by zoom
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

    nodeElements.append("text") // Appending text directly to the node's <g>
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

    // Top-level group for all link labels, this one gets transformed by zoom
    const topLevelLinkLabelGroup = svg.append("g").attr("class", "link-labels");

    // Create individual <g> elements for each link label
    const individualLabelGroups = topLevelLinkLabelGroup
      .selectAll("g.link-label-item-group")
      .data(d3Links, (d_link: any) => `${(d_link.source as SystemGraphNode).id || d_link.source}-${(d_link.target as SystemGraphNode).id || d_link.target}`)
      .join("g")
      .attr("class", "link-label-item-group");

    // Append text to these individual groups
    individualLabelGroups.append("text")
      .attr("class", "link-label")
      .attr("font-size", "9px")
      .attr("fill", LINK_LABEL_COLOR) 
      .attr("text-anchor", "middle")
      .attr("paint-order", "stroke")
      .attr("stroke", BG_COLOR) 
      .attr("stroke-width", "0.25em") 
      .text(d_link => {
        const textToShow = d_link.displayedText;
        if (textToShow && textToShow.length > 25) { 
            return textToShow.substring(0, 22) + "...";
        }
        return textToShow || "";
      })
      .call(wrapLinkText, 70);

    individualLabelGroups.append("title")
        .text(d_link => `${d_link.type === 'incentive' ? 'Incentive' : 'Flow'}: ${d_link.label}${d_link.detailText ? `\nDetails: ${d_link.detailText}` : ''}`);


    simulation.on("tick", () => {
      linkElements
        .attr("x1", d_link => (d_link.source as SystemGraphNode).x || 0)
        .attr("y1", d_link => (d_link.source as SystemGraphNode).y || 0)
        .attr("x2", d_link => (d_link.target as SystemGraphNode).x || 0)
        .attr("y2", d_link => (d_link.target as SystemGraphNode).y || 0);

      nodeElements
        .attr("transform", d_node => `translate(${d_node.x || 0},${d_node.y || 0})`);
            
      individualLabelGroups.attr("transform", (d_link: SystemGraphLink) => {
        const sourceNode = d_link.source as SystemGraphNode;
        const targetNode = d_link.target as SystemGraphNode;

        let newX = 0;
        let newY = 0;

        if (sourceNode.x !== undefined && targetNode.x !== undefined) {
          newX = (sourceNode.x + targetNode.x) / 2;
        }
        if (sourceNode.y !== undefined && targetNode.y !== undefined) {
          newY = (sourceNode.y + targetNode.y) / 2 - 8; // Offset slightly above link
        }
        return `translate(${newX}, ${newY})`;
      });
    });
                
    simulation.alpha(0.8).restart();

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 2.5]) 
        .on("zoom", (event) => {
            const { transform } = event;
            // Apply zoom to the main groups: nodes, links, and the top-level link-labels group
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

function wrapLinkText(texts: d3.Selection<d3.BaseType, SystemGraphLink, SVGGElement, unknown>, maxWidth: number) {
    texts.each(function(dLink) {
        const textElement = d3.select(this); // This is the <text> element
        const words = (dLink.displayedText || "").split(/\s+/).reverse(); 
        let word;
        let line: string[] = [];
        let lineNumber = 0;
        const lineHeight = 1.1; // ems
        
        // Get the dy of the <text> element itself if it exists, otherwise default for tspans
        // For tspans within a text element that's anchored middle, dy is usually used for line spacing
        const initialDyValue = textElement.attr("dy"); // Check if <text> has a dy
        let currentLineDy = initialDyValue ? initialDyValue : "0.35em"; // Adjusted default dy for first line if text has no dy
                                                                      // 0.35em is often used to vertically center single line text
                                                                      // If the text element has no 'dy' itself, the first tspan needs to establish a baseline.
                                                                      // If text has `dominant-baseline: middle`, tspans might use `dy` for offsets.
                                                                      // For text-anchor:middle, we want the tspans to stack around the y=0 of the text element.

        textElement.text(null); // Clear existing text content before adding tspans

        const maxLines = 2;

        while ((word = words.pop()) && lineNumber < maxLines) {
            line.push(word);
            const tspan = textElement.append("tspan")
                .attr("x", 0) // Centered horizontally due to parent text's text-anchor="middle"
                .attr("dy", lineNumber === 0 ? currentLineDy : `${lineHeight}em`) // Use adjusted dy for first line, then relative for subsequent
                .text(line.join(" "));
            
            if ((tspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth) {
                if (line.length > 1) { 
                    line.pop(); // remove the word that made it too long
                    tspan.text(line.join(" ")); // re-set the tspan to the line without that word
                    if (lineNumber + 1 < maxLines) { 
                        lineNumber++;
                        line = [word!]; // start new line with the popped word
                        textElement.append("tspan")
                            .attr("x", 0)
                            .attr("dy", `${lineHeight}em`)
                            .text(word);
                    } else { // Max lines reached, truncate current line
                        let currentText = line.join(" ");
                        while((tspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth && currentText.length > 0) {
                            currentText = currentText.slice(0, -1);
                            tspan.text(currentText + "…");
                        }
                        if (currentText.length === 0 && tspan.node()) tspan.text("…");
                        words.length = 0; // Stop processing more words
                        break;
                    }
                } else { // Single word is too long
                     let currentText = line.join(" ");
                     while((tspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth && currentText.length > 0) {
                        currentText = currentText.slice(0, -1);
                        tspan.text(currentText + "…");
                     }
                     if (currentText.length === 0 && tspan.node()) tspan.text("…");
                     words.length = 0; // Stop processing more words
                     break;
                }
            }
        }
        
        // If there are still words left and we've hit maxLines, ensure the last displayed line is truncated
        if (words.length > 0 && lineNumber === maxLines - 1) {
            const lastTspan = textElement.selectAll<SVGTSpanElement, unknown>("tspan").filter((_,i,nodes) => i === nodes.length -1 );
            if (lastTspan.node()) {
                 let currentText = lastTspan.text();
                 if (!(currentText.endsWith("…"))) { // Avoid double "…"
                    // This part needs to be careful not to make it longer again
                    // Check if adding "…" makes it exceed maxWidth. If so, shorten further.
                    let tempText = currentText.substring(0, currentText.length -1) + "…";
                    lastTspan.text(tempText); // Tentatively set
                    while((lastTspan.node() as SVGTextContentElement).getComputedTextLength() > maxWidth && tempText.length > 1) {
                        tempText = tempText.substring(0, tempText.length - 2) + "…"; // Remove char before "…"
                        lastTspan.text(tempText);
                    }
                    if(tempText.length <=1 && lastTspan.node()) lastTspan.text("…");

                 }
            }
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

