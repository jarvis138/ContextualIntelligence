import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { 
  GraphData, 
  ForceGraphConfig,
  GraphNode as GraphNodeType,
  GraphLink as GraphLinkType
} from '@/lib/types/graphTypes';
import { applyTimeDecay } from '@/lib/graphUtils';

const defaultConfig: ForceGraphConfig = {
  width: 800,
  height: 600,
  linkDistance: 100,
  linkStrength: 0.7,
  charge: -300,
  centerForce: 0.03,
  collideRadius: 15,
  nodeRadius: 10,
  timeDecay: false,
  timeDecayFactor: 0.1,
  timeDecayReference: new Date()
};

interface ForceGraphProps {
  data: GraphData;
  config?: Partial<ForceGraphConfig>;
  onNodeClick?: (node: GraphNodeType) => void;
  onLinkClick?: (link: GraphLinkType) => void;
  className?: string;
}

export default function ForceGraph({ 
  data, 
  config = {}, 
  onNodeClick,
  onLinkClick,
  className,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [graphReady, setGraphReady] = useState(false);
  
  // Merge default config with provided config
  const graphConfig: ForceGraphConfig = { ...defaultConfig, ...config };
  
  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes || !data.links) return;
    
    // Process time decay if enabled
    const processedData = graphConfig.timeDecay 
      ? applyTimeDecay(data, graphConfig.timeDecayReference, graphConfig.timeDecayFactor)
      : data;
    
    // Clear any existing visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current)
      .attr("width", graphConfig.width)
      .attr("height", graphConfig.height)
      .attr("viewBox", [0, 0, graphConfig.width, graphConfig.height])
      .attr("style", "max-width: 100%; height: auto;");
    
    // Create the zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        setIsZooming(true);
        g.attr("transform", event.transform);
        setIsZooming(false);
      });
    
    // Add zoom and pan capabilities
    svg.call(zoom as any);
    
    // Create a group for all visualization elements
    const g = svg.append("g")
      .attr("class", "graph-container");
    
    // Define node colors based on group/type
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Create the simulation
    const simulation = d3.forceSimulation(processedData.nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(processedData.links)
        .id((d: any) => d.id)
        .distance(graphConfig.linkDistance)
        .strength((d: any) => {
          // Use the link strength if provided, otherwise use default
          return d.strength || graphConfig.linkStrength;
        })
      )
      .force("charge", d3.forceManyBody().strength(graphConfig.charge))
      .force("center", d3.forceCenter(graphConfig.width / 2, graphConfig.height / 2).strength(graphConfig.centerForce))
      .force("collide", d3.forceCollide().radius(graphConfig.collideRadius));
    
    // Create arrow marker for directional links
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");
      
    // Create links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(processedData.links)
      .enter().append("line")
      .attr("stroke-width", (d: any) => Math.sqrt((d.value || 1) * 2))
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrowhead)")
      .on("click", function(event, d) {
        if (onLinkClick) onLinkClick(d as GraphLinkType);
      })
      .on("mouseover", function() {
        d3.select(this).attr("stroke", "#555").attr("stroke-width", 3);
      })
      .on("mouseout", function(_, d: any) {
        d3.select(this).attr("stroke", "#999").attr("stroke-width", Math.sqrt((d.value || 1) * 2));
      });
      
    // Create link labels
    const linkLabel = g.append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(processedData.links)
      .enter().append("text")
      .attr("font-size", "8px")
      .attr("text-anchor", "middle")
      .text((d: any) => d.type);
      
    // Create nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(processedData.nodes)
      .enter().append("circle")
      .attr("r", (d: any) => d.value ? Math.sqrt(d.value) * 3 : graphConfig.nodeRadius)
      .attr("fill", (d: any) => color(d.group?.toString() || "0"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("click", function(event, d) {
        if (onNodeClick) onNodeClick(d as GraphNodeType);
      })
      .on("mouseover", function() {
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1.5);
      })
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any
      );
      
    // Add node labels
    const nodeLabel = g.append("g")
      .attr("class", "node-labels")
      .selectAll("text")
      .data(processedData.nodes)
      .enter().append("text")
      .attr("dy", -15)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .text((d: any) => d.name);
      
    // Handle node dragging
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    // Update positions on each simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      
      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
      
      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
      
      nodeLabel
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });
    
    // Set graph as ready
    setGraphReady(true);
    
    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, graphConfig, onNodeClick, onLinkClick]);
  
  return (
    <div className={`force-graph-container ${className}`}>
      {!graphReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
        </div>
      )}
      <svg 
        ref={svgRef} 
        className={`w-full h-full ${isZooming ? 'cursor-grabbing' : 'cursor-grab'}`}
      />
    </div>
  );
}