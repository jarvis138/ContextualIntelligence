import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { Relationship } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Node types mapped to colors
const typeColors: Record<string, string> = {
  project: "#3b82f6", // blue
  task: "#10b981",    // green
  document: "#6366f1", // indigo
  user: "#f59e0b",    // amber
  team: "#ec4899",    // pink
  integration: "#8b5cf6", // purple
  insight: "#ef4444",  // red
  comment: "#64748b", // slate
  default: "#6b7280", // gray
};

// Type definitions for our graph data
interface Node {
  id: string;
  type: string;
  name: string;
  group: number;
  weight: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
  description?: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface TimePoint {
  date: string;
  snapshot: GraphData;
}

interface ContextGraphProps {
  projectId: number;
  relationships: Relationship[];
  includeEntities?: string[];
  width?: number;
  height?: number;
  isLoading?: boolean;
  showControls?: boolean;
  temporalData?: TimePoint[];
}

export function ContextGraph({
  projectId,
  relationships,
  includeEntities = ["all"],
  width = 800,
  height = 600,
  isLoading = false,
  showControls = true,
  temporalData,
}: ContextGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [timeIndex, setTimeIndex] = useState(0);
  const [forceStrength, setForceStrength] = useState(50);
  const [selectedLayout, setSelectedLayout] = useState<string>("force-directed");
  const [filteredTypes, setFilteredTypes] = useState<string[]>(includeEntities);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const { toast } = useToast();

  // Transform relationships into graph data
  useEffect(() => {
    if (isLoading || !relationships.length) return;

    try {
      // Create a map to track unique nodes
      const nodesMap: Record<string, Node> = {};
      const links: Link[] = [];

      // Process each relationship
      relationships.forEach((rel) => {
        // Only include relationships with entity types in our filter
        if (
          filteredTypes.includes("all") ||
          (filteredTypes.includes(rel.sourceType) && filteredTypes.includes(rel.targetType))
        ) {
          // Create source node if it doesn't exist
          const sourceId = `${rel.sourceType}-${rel.sourceId}`;
          if (!nodesMap[sourceId]) {
            nodesMap[sourceId] = {
              id: sourceId,
              type: rel.sourceType,
              name: `${rel.sourceType} ${rel.sourceId}`,
              group: Object.keys(typeColors).indexOf(rel.sourceType) + 1,
              weight: 1,
            };
          } else {
            // Increment weight for existing node
            nodesMap[sourceId].weight += 1;
          }

          // Create target node if it doesn't exist
          const targetId = `${rel.targetType}-${rel.targetId}`;
          if (!nodesMap[targetId]) {
            nodesMap[targetId] = {
              id: targetId,
              type: rel.targetType,
              name: `${rel.targetType} ${rel.targetId}`,
              group: Object.keys(typeColors).indexOf(rel.targetType) + 1,
              weight: 1,
            };
          } else {
            // Increment weight for existing node
            nodesMap[targetId].weight += 1;
          }

          // Add link
          links.push({
            source: sourceId,
            target: targetId,
            value: rel.strength || 1,
            description: rel.description,
          });
        }
      });

      // Convert nodes map to array
      const nodes = Object.values(nodesMap);
      
      setData({ nodes, links });
    } catch (error) {
      console.error("Error processing relationships:", error);
      toast({
        title: "Error",
        description: "Failed to process relationship data",
        variant: "destructive",
      });
    }
  }, [relationships, filteredTypes, isLoading, toast]);

  // Use temporal data if provided
  useEffect(() => {
    if (temporalData && temporalData.length > 0) {
      setData(temporalData[timeIndex].snapshot);
    }
  }, [temporalData, timeIndex]);

  // Render graph with D3
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length || isLoading) return;

    const svg = d3.select(svgRef.current);

    // Clear previous graph
    svg.selectAll("*").remove();

    // Add grid background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "network-graph");

    // Create the force simulation
    const forceStrengthScale = forceStrength / 50; // Scale 0-100 to 0-2
    
    // Choose layout algorithm based on selection
    let simulation;
    
    if (selectedLayout === "force-directed") {
      simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
        .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-100 * forceStrengthScale))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius((d: any) => 20 + d.weight * 3));
    } else if (selectedLayout === "radial") {
      simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
        .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-100 * forceStrengthScale))
        .force("r", d3.forceRadial(height / 3, width / 2, height / 2))
        .force("collide", d3.forceCollide().radius((d: any) => 20 + d.weight * 3));
    } else if (selectedLayout === "circular") {
      // Position nodes in a circle
      const total = data.nodes.length;
      data.nodes.forEach((node, i) => {
        const angle = (i / total) * 2 * Math.PI;
        const radius = height / 3;
        node.x = width / 2 + radius * Math.cos(angle);
        node.y = height / 2 + radius * Math.sin(angle);
      });
      
      simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
        .force("link", d3.forceLink(data.links).id((d: any) => d.id))
        .force("x", d3.forceX().x((d: any) => d.x).strength(0.5))
        .force("y", d3.forceY().y((d: any) => d.y).strength(0.5));
    }

    // Create a container for the graph
    const container = svg.append("g");

    // Add zoom behavior
    svg.call(
      d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          container.attr("transform", event.transform);
        }) as any
    );

    // Create links
    const link = container
      .append("g")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke-width", (d: any) => Math.sqrt(d.value) * 1.5)
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6);

    // Create nodes
    const node = container
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .enter()
      .append("circle")
      .attr("r", (d: any) => 10 + d.weight)
      .attr("fill", (d: any) => typeColors[d.type] || typeColors.default)
      .call(
        d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      );

    // Add tooltips with node details
    node.append("title").text((d: any) => d.name);

    // Add labels to nodes
    container
      .append("g")
      .selectAll("text")
      .data(data.nodes)
      .enter()
      .append("text")
      .text((d: any) => d.name.split(' ')[0])
      .attr("font-size", "10px")
      .attr("dx", (d: any) => 12)
      .attr("dy", ".35em")
      .style("pointer-events", "none");

    // Add relationship descriptions on hover
    link.append("title").text((d: any) => d.description || "Relationship");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      container
        .selectAll("text")
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [data, width, height, isLoading, forceStrength, selectedLayout]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50 rounded-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading context graph...</span>
      </div>
    );
  }

  if (relationships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gray-50 rounded-md">
        <p className="text-muted-foreground mb-4">No relationships found for this project</p>
        <Button variant="outline">Analyze Project</Button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {showControls && (
        <div className="absolute top-2 right-2 z-10 bg-white/90 p-3 rounded-md shadow-sm border space-y-2 w-64">
          <h3 className="font-medium text-sm mb-1">Graph Controls</h3>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Layout</label>
            <Select
              value={selectedLayout}
              onValueChange={(value) => setSelectedLayout(value)}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="force-directed">Force Directed</SelectItem>
                <SelectItem value="radial">Radial</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs text-muted-foreground">Force Strength</label>
              <span className="text-xs">{forceStrength}%</span>
            </div>
            <Slider
              value={[forceStrength]}
              min={1}
              max={100}
              step={1}
              onValueChange={(values) => setForceStrength(values[0])}
              className="w-full"
            />
          </div>

          {temporalData && temporalData.length > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs text-muted-foreground">Time Period</label>
                <span className="text-xs">{temporalData[timeIndex].date}</span>
              </div>
              <Slider
                value={[timeIndex]}
                min={0}
                max={temporalData.length - 1}
                step={1}
                onValueChange={(values) => setTimeIndex(values[0])}
                className="w-full"
              />
            </div>
          )}
          
          <div className="pt-1">
            <h4 className="text-xs text-muted-foreground mb-1">Entity Types</h4>
            <div className="flex flex-wrap gap-1">
              {Object.keys(typeColors).map((type) => 
                type !== 'default' && (
                  <Button
                    key={type}
                    variant={filteredTypes.includes(type) || filteredTypes.includes("all") ? "default" : "outline"}
                    size="sm"
                    className="text-xs px-2 py-0 h-6"
                    onClick={() => {
                      if (filteredTypes.includes("all")) {
                        // If "all" is currently selected, switch to only this type
                        setFilteredTypes([type]);
                      } else if (filteredTypes.includes(type) && filteredTypes.length === 1) {
                        // If this is the only selected type, switch to "all"
                        setFilteredTypes(["all"]);
                      } else if (filteredTypes.includes(type)) {
                        // Remove this type
                        setFilteredTypes(filteredTypes.filter(t => t !== type));
                      } else {
                        // Add this type
                        setFilteredTypes([...filteredTypes, type]);
                      }
                    }}
                    style={{
                      backgroundColor: filteredTypes.includes(type) || filteredTypes.includes("all") 
                        ? typeColors[type] 
                        : 'transparent',
                      borderColor: typeColors[type],
                      color: filteredTypes.includes(type) || filteredTypes.includes("all") ? 'white' : typeColors[type]
                    }}
                  >
                    {type}
                  </Button>
                )
              )}
              <Button
                variant={filteredTypes.includes("all") ? "default" : "outline"}
                size="sm"
                className="text-xs px-2 py-0 h-6"
                onClick={() => setFilteredTypes(["all"])}
              >
                All
              </Button>
            </div>
          </div>
        </div>
      )}

      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        className="border rounded-lg shadow-sm"
      />
    </div>
  );
}