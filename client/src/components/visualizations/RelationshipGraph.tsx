import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import * as d3 from "d3";

// Types for relationship visualization
export interface RelationshipNode {
  id: string;
  type: string;
  label: string;
  group: string;
  score?: number;
}

export interface RelationshipLink {
  source: string;
  target: string;
  type: string;
  strength: number;
  label?: string;
}

export interface RelationshipGraphData {
  nodes: RelationshipNode[];
  links: RelationshipLink[];
}

interface RelationshipGraphProps {
  width?: number;
  height?: number;
  focusId?: string;
  sourceType?: string;
  maxNodes?: number;
  minScore?: number;
}

export function RelationshipGraph({
  width = 800,
  height = 600,
  focusId,
  sourceType,
  maxNodes = 50,
  minScore = 0.1,
}: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [strengthFilter, setStrengthFilter] = useState(0.1);
  const [zoom, setZoom] = useState(1);

  // Query to fetch relationship data
  const {
    data,
    isLoading,
    refetch,
  } = useQuery<RelationshipGraphData>({
    queryKey: ["/api/analytics/relationships", { 
      focusId, 
      sourceType, 
      maxNodes, 
      minScore,
      filter: filter !== "all" ? filter : undefined,
      strengthFilter
    }],
  });

  // Initialize or update visualization when data changes
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    // Clear previous content
    svg.selectAll("*").remove();

    // Create a group that will contain all elements and can be zoomed/panned
    const g = svg.append("g");

    // Apply zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);
    
    // Set initial zoom level
    svg.call(zoomBehavior.transform, d3.zoomIdentity.scale(zoom));

    // Filter nodes based on strength filter
    const filteredLinks = data.links.filter(link => link.strength >= strengthFilter);
    const nodeIds = new Set([
      ...filteredLinks.map(link => link.source),
      ...filteredLinks.map(link => link.target)
    ]);
    const filteredNodes = data.nodes.filter(node => nodeIds.has(node.id));

    // Create color scale for node groups
    const groupTypes = Array.from(new Set(filteredNodes.map(d => d.group)));
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(groupTypes);

    // Create link elements
    const links = g.selectAll(".link")
      .data(filteredLinks)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.max(1, d.strength * 5));

    // Create node elements
    const nodes = g.selectAll(".node")
      .data(filteredNodes)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", d => (d.id === focusId) ? 10 : Math.max(5, (d.score || 0.5) * 10))
      .attr("fill", d => color(d.group) as string)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseover", (event, d) => {
        tooltip
          .style("visibility", "visible")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(`
            <div class="font-medium">${d.label}</div>
            <div class="text-xs text-muted-foreground">${d.type}</div>
            ${d.score ? `<div class="text-xs">Score: ${d.score.toFixed(2)}</div>` : ""}
          `);
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // Add labels to nodes
    const labels = g.selectAll(".label")
      .data(filteredNodes)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("font-size", 10)
      .attr("dx", 12)
      .attr("dy", 4)
      .text(d => d.label?.length > 20 ? d.label.substring(0, 20) + "..." : d.label);

    // Setup force simulation
    const simulation = d3.forceSimulation(filteredNodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>()
        .id(d => (d as RelationshipNode).id)
        .links(filteredLinks)
        .distance(100)
        .strength(d => (d as RelationshipLink).strength * 0.5)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Update positions on each tick
    simulation.on("tick", () => {
      links
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      nodes
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);

      labels
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);
    });

    // Highlight focus node if provided
    if (focusId) {
      nodes
        .filter(d => d.id === focusId)
        .attr("stroke", "#ff0000")
        .attr("stroke-width", 3);
    }

    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [data, svgRef, tooltipRef, zoom, focusId, strengthFilter]);

  // Handle zoom in/out buttons
  const handleZoomIn = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 5]);
      svg.transition().duration(250).call(
        zoomBehavior.transform,
        d3.zoomIdentity.scale(Math.min(5, zoom * 1.2))
      );
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoomBehavior = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 5]);
      svg.transition().duration(250).call(
        zoomBehavior.transform,
        d3.zoomIdentity.scale(Math.max(0.2, zoom / 1.2))
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Relationship Graph</CardTitle>
            <CardDescription>
              Visualizing connections between project elements
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="person">People</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="communication">Communications</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4">
          <span className="text-sm">Relationship Strength:</span>
          <Slider
            className="w-64"
            value={[strengthFilter]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(values) => setStrengthFilter(values[0])}
          />
          <span className="text-sm text-muted-foreground">{strengthFilter.toFixed(2)}</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="relative">
            <svg 
              ref={svgRef} 
              width={width} 
              height={height}
              className="border rounded-md"
            />
            <div 
              ref={tooltipRef}
              className="absolute bg-background border border-border p-2 rounded-md shadow-md text-sm"
              style={{ visibility: "hidden", pointerEvents: "none" }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}