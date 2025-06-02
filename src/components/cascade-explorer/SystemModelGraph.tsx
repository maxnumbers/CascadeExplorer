
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
const NODE_TEXT_COLOR = 'hsl(var(--primary-foreground))';
const LINK_LABEL_COLOR = 'hsl(var(--muted-foreground))';
const BG_COLOR = 'hsl(var(--card))';


const SystemModelGraph: React.FC<SystemModelGraphProps> = ({ systemModel, width = 600, height = 400 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const transformSystemModelToGraphData = (model: SystemModel | null): { nodes: SystemGraphNode[], links: SystemGraphLink[] } => {
    if (!model) return { nodes: [], links: [] };

    const nodes: SystemGraphNode[] = [];
    const links: SystemGraphLink[] = [];
    let nodeIdCounter = 0;

    (model.stocks || []).forEach(stock => {
      nodes.push({
        id: `stock-${nodeIdCounter++}`,
        label: stock.name,
        type: 'stock',
        description: stock.description,
        baseColor: STOCK_COLOR
      });
    });

    (model.agents || []).forEach(agent => {
      nodes.push({
        id: `agent-${nodeIdCounter++}`,
        label: agent.name,
        type: 'agent',
        description: agent.description,
        baseColor: AGENT_COLOR
       });
    });

    (model.incentives || []).forEach(incentive => {
      const agentNode = nodes.find(n => n.label === incentive.agentName && n.type === 'agent');
      const stockNode = nodes.find(n => n.label === incentive.targetStockName && n.type === 'stock');

      if (agentNode && stockNode) {
        links.push({
          source: agentNode.id,
          target: stockNode.id,
          label: incentive.incentiveDescription,
          flow: incentive.resultingFlow
        });
      } else {
        console.warn(`SystemModelGraph: Could not find agent '${incentive.agentName}' or stock '${incentive.targetStockName}' for incentive:`, incentive);
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
        .data(["end"])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22) // Adjusted for node size/shape
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
        .distance(150)
        .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(0,0).strength(0.1))
      .force("collide", d3.forceCollide<SystemGraphNode>().radius(d => (d.type === 'stock' ? 50 : 35)).strength(0.7)); // Larger radius for stocks

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

    // Stocks as rectangles
    nodeElements.filter(d => d.type === 'stock')
      .append("rect")
      .attr("width", 80)
      .attr("height", 40)
      .attr("rx", 5) // Rounded corners for rectangles
      .attr("ry", 5)
      .attr("x", -40) // Center the rect
      .attr("y", -20) // Center the rect
      .attr("fill", d => d.baseColor)
      .attr("stroke", d => d3.color(d.baseColor)?.darker(0.5).toString() || '#000000')
      .attr("stroke-width", 1.5);

    // Agents as circles
    nodeElements.filter(d => d.type === 'agent')
      .append("circle")
      .attr("r", 25)
      .attr("fill", d => d.baseColor)
      .attr("stroke", d => d3.color(d.baseColor)?.darker(0.5).toString() || '#000000')
      .attr("stroke-width", 1.5);

    const labelElements = nodeElements.append("text")
      .text(d => d.label)
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", NODE_TEXT_COLOR)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em") // Initial dy for vertical alignment within the shape
      .style("pointer-events", "none")
      .call(wrapText, 70); // Max width for text inside rects

    nodeElements.append("title")
      .text(d => `${d.label}${d.description ? `\nDescription: ${d.description}` : ''}`);

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
      .attr("stroke", BG_COLOR) // Use background color for halo effect
      .attr("stroke-width", "0.2em") // Adjust halo size
      .attr("stroke-linejoin", "round")
      .text(d => d.label.length > 35 ? d.label.substring(0,32) + "..." : d.label); // Truncate long labels

    linkLabelElements.append("title")
        .text(d => `Incentive: ${d.label}${d.flow ? `\nResulting Flow: ${d.flow}` : ''}`);


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
        .attr("y", d => (((d.source as SystemGraphNode).y || 0) + ((d.target as SystemGraphNode).y || 0)) / 2 - 7); // Offset slightly above link
    });

    simulation.alpha(0.8).restart();

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 2])
        .on("zoom", (event) => {
            const { transform } = event;
            // Apply zoom to a parent 'g' element containing all visual elements
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
      // To unpin after drag, set fx and fy to null:
      // d.fx = null;
      // d.fy = null;
    }

    return d3.drag<SVGGElement, SystemGraphNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

 function wrapText(texts: d3.Selection<SVGTextElement, SystemGraphNode, SVGGElement, unknown>, maxWidth: number) {
    texts.each(function(dNode) {
        // Only apply complex wrapping to stocks, agents can have simpler labels
        if (dNode.type === 'agent') {
            // For agents (circles), if label is too long, truncate with ellipsis
            const textElement = d3.select(this);
            const r = 25; // Agent circle radius
            const maxAgentLabelWidth = r * 1.8; // Approximate width within circle

            if ((textElement.node() as SVGTextContentElement).getComputedTextLength() > maxAgentLabelWidth) {
                let text = dNode.label;
                while ((textElement.node()as SVGTextContentElement).getComputedTextLength() > maxAgentLabelWidth && text.length > 0) {
                    text = text.slice(0, -1);
                    textElement.text(text + "…");
                }
                 if(text.length === 0) textElement.text("…"); // if even one char is too long
            }
            return;
        }

        // Proceed with multi-line wrapping for stocks (rectangles)
        const text = d3.select(this);
        const words = dNode.label.split(/\s+/).reverse();
        let word;
        let line: string[] = [];
        let lineNumber = 0;
        const lineHeight = 1.1; // ems

        let fontSize = 10; // Default
        const textNode = text.node();
        if (textNode && typeof window !== 'undefined') { // Check for window for getComputedStyle
            try {
                const computedStyle = window.getComputedStyle(textNode);
                if (computedStyle) {
                    const parsedSize = parseFloat(computedStyle.fontSize);
                    if (!isNaN(parsedSize)) {
                        fontSize = parsedSize;
                    }
                }
            } catch (e) {
                console.warn("Could not get computed style for font size in wrapText", e);
            }
        }

        text.text(null); // Clear existing content
        // The initial dy of the parent text element (e.g., 0.35em) centers a single line.
        // We will adjust the first tspan to re-center the whole block of tspans.
        let tspan = text.append("tspan").attr("x", 0); // dy will be set later

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            const tspanNode = tspan.node() as SVGTextContentElement;
            if (tspanNode && tspanNode.getComputedTextLength() > maxWidth && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                lineNumber++;
                tspan = text.append("tspan").attr("x", 0).attr("dy", lineHeight + "em").text(word);
            }
        }

        // Vertical centering for multi-line text block
        // The original dy (e.g. 0.35em on the <text> element) is for centering a single line.
        // We calculate the total height of our tspan block and shift the first tspan
        // so that the block is centered around the text element's y-coordinate.
        const totalLines = lineNumber + 1;
        const blockHeightEms = totalLines * lineHeight;
        // Shift block up by half its height, then down by half the height of one line to center first line
        const firstTspanDyOffsetEms = -(blockHeightEms / 2) + (lineHeight / 2);

        text.selectAll("tspan").each(function(data, index) {
            if (index === 0) {
                d3.select(this).attr("dy", firstTspanDyOffsetEms + "em");
            }
            // Subsequent tspans already have their relative dy set to lineHeight + "em"
        });
    });
}


  return (
    <div className="w-full h-full flex justify-center items-center bg-card rounded-lg shadow-inner overflow-hidden border border-input">
       <svg ref={svgRef} width={width} height={height}></svg>
    </div>
  );
};

export default SystemModelGraph;

