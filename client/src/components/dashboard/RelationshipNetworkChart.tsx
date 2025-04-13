import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Relationship } from "@shared/schema";

interface RelationshipNetworkChartProps {
  relationships: Relationship[];
}

interface Node {
  id: string;
  group: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
  relationship: string;
}

export function RelationshipNetworkChart({ relationships }: RelationshipNetworkChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!relationships || relationships.length === 0 || !svgRef.current) {
      return;
    }

    // Clear any existing chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Create a set of all unique entities involved in relationships
    const entities = new Set<string>();
    relationships.forEach((rel) => {
      const sourceEntity = `${rel.sourceType}:${rel.sourceId}`;
      const targetEntity = `${rel.targetType}:${rel.targetId}`;
      entities.add(sourceEntity);
      entities.add(targetEntity);
    });

    // Create nodes and links for the force graph
    const nodes: Node[] = Array.from(entities).map((entity, i) => ({
      id: entity,
      group: determineGroup(entity),
    }));

    const links: Link[] = relationships.map((rel) => ({
      source: `${rel.sourceType}:${rel.sourceId}`,
      target: `${rel.targetType}:${rel.targetId}`,
      value: rel.strength,
      relationship: rel.sourceType + ' to ' + rel.targetType,
    }));

    // Set up SVG dimensions
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create color scale for node groups
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    // Create SVG elements
    const svg = d3.select(svgRef.current);

    // Define arrowhead marker
    svg.append("defs").selectAll("marker")
      .data(["arrow"])
      .enter().append("marker")
      .attr("id", d => d)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value) * 2)
      .attr("stroke", "#999")
      .attr("marker-end", "url(#arrow)");

    // Create link labels
    const linkLabels = svg.append("g")
      .selectAll("text")
      .data(links)
      .enter().append("text")
      .text(d => d.relationship)
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("fill", "#666");

    // Create nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 8)
      .attr("fill", (d) => color(d.group.toString()) as string)
      .call(d3.drag<SVGCircleElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any
      );

    // Create node labels
    const nodeLabels = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text(d => truncateText(d.id, 15))
      .attr("font-size", 10)
      .attr("dx", 12)
      .attr("dy", 4)
      .attr("fill", "#333");

    // Add title for hover effect
    node.append("title")
      .text(d => d.id);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      nodeLabels
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

    // Clean up on unmount
    return () => {
      simulation.stop();
    };
  }, [relationships]);

  if (!relationships || relationships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Relationships</CardTitle>
          <CardDescription>No relationship data available</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">
            Relationship data will appear here once created
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Relationships Network</CardTitle>
        <CardDescription>
          Interactive visualization of relationships between project entities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="border rounded-lg bg-card"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to determine the group for an entity based on its name
function determineGroup(entityName: string): number {
  if (entityName.toLowerCase().includes("task")) return 1;
  if (entityName.toLowerCase().includes("document")) return 2;
  if (entityName.toLowerCase().includes("user") || entityName.toLowerCase().includes("team")) return 3;
  return 0;
}

// Helper function to truncate text
function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}