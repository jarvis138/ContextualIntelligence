import { FC, useRef, useEffect, useState } from "react";
import { Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types matching the backend structures
export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ContextGraphProps {
  projectId: number;
  data?: GraphData;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * A component that visualizes the context graph for a project
 */
const ContextGraph: FC<ContextGraphProps> = ({ 
  projectId, 
  data, 
  isLoading = false,
  onRefresh 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isClient, setIsClient] = useState(false);
  
  // Only render on client-side to avoid SSR issues with D3
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Effect to create and update the graph visualization
  useEffect(() => {
    if (!isClient || !data || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Clear previous graph
    svg.selectAll("*").remove();
    
    // Apply filters
    const filteredData = {
      nodes: filter === "all" 
        ? data.nodes 
        : data.nodes.filter(node => node.type === filter),
      edges: data.edges.filter(edge => {
        if (filter === "all") return true;
        const sourceNode = data.nodes.find(n => n.id === edge.source);
        const targetNode = data.nodes.find(n => n.id === edge.target);
        return (sourceNode?.type === filter || targetNode?.type === filter);
      })
    };
    
    // Create the simulation
    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));
    
    // Create a group for links with arrowheads
    const linkGroup = svg.append("g").attr("class", "links");
    
    // Add arrow definitions
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
    const links = linkGroup.selectAll("line")
      .data(filteredData.edges)
      .enter().append("line")
      .attr("stroke-width", d => Math.max(1, d.strength / 2))
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrowhead)");
    
    // Create a group for nodes
    const nodeGroup = svg.append("g").attr("class", "nodes");
    
    // Create node groups
    const nodeGroups = nodeGroup.selectAll("g")
      .data(filteredData.nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragStarted)
        .on("drag", dragging)
        .on("end", dragEnded)
      );
    
    // Add circles for nodes with different colors based on type
    nodeGroups.append("circle")
      .attr("r", 12)
      .attr("fill", d => {
        switch (d.type) {
          case "project": return "#4f46e5"; // Indigo
          case "task": return "#16a34a"; // Green
          case "document": return "#ea580c"; // Orange
          default: return "#6b7280"; // Gray
        }
      });
    
    // Add node labels
    nodeGroups.append("text")
      .attr("dy", 24)
      .attr("text-anchor", "middle")
      .text(d => d.label.length > 20 ? d.label.substring(0, 18) + "..." : d.label)
      .attr("font-size", "10px");
    
    // Add tooltips (using title for simplicity)
    nodeGroups.append("title")
      .text(d => `${d.type}: ${d.label}\n${Object.entries(d.properties)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")}`);
    
    // Setup simulation
    simulation
      .nodes(filteredData.nodes)
      .on("tick", ticked);
    
    (simulation.force("link") as d3.ForceLink<GraphNode, GraphEdge>)
      .links(filteredData.edges);
    
    // Simulation tick function
    function ticked() {
      links
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);
      
      nodeGroups.attr("transform", d => `translate(${d.x},${d.y})`);
    }
    
    // Zoom functionality
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        svg.selectAll("g").attr("transform", event.transform.toString());
      });
    
    svg.call(zoom);
    
    // Drag functions
    function dragStarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragging(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return () => {
      simulation.stop();
    };
  }, [data, filter, isClient]);
  
  // If not client-side or loading, show skeleton
  if (!isClient || isLoading) {
    return (
      <Card className="w-full h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Project Context Graph</span>
            <div className="flex gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Generating context graph...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If no data, show empty state
  if (!data || data.nodes.length === 0) {
    return (
      <Card className="w-full h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Project Context Graph</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RotateCw className="h-4 w-4 mr-1" />
              Generate Graph
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No context graph data available.
            </p>
            <Button 
              onClick={onRefresh}
              disabled={isLoading}
            >
              Generate Context Graph
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Compute available node types for filtering
  const nodeTypes = ["all", ...new Set(data.nodes.map(node => node.type))];
  
  return (
    <Card className="w-full h-[500px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Project Context Graph</span>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {nodeTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => {
                    const svg = d3.select(svgRef.current);
                    const zoom = d3.zoom();
                    svg.transition().call(zoom.transform as any, d3.zoomIdentity.scale(1.2));
                  }}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => {
                    const svg = d3.select(svgRef.current);
                    const zoom = d3.zoom();
                    svg.transition().call(zoom.transform as any, d3.zoomIdentity.scale(0.8));
                  }}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onRefresh}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh Graph</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[400px]">
        <svg ref={svgRef} width="100%" height="100%" className="overflow-hidden">
          {/* Graph will be rendered here by D3 */}
        </svg>
      </CardContent>
    </Card>
  );
};

export default ContextGraph;