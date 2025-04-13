import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Relationship } from "@/lib/types";

type ProjectNetworkProps = {
  relationships: Relationship[];
};

type Node = {
  id: string;
  type: string;
  label: string;
  group: number;
};

type Link = {
  source: string;
  target: string;
  value: number;
};

type GraphData = {
  nodes: Node[];
  links: Link[];
};

const typeToGroup = {
  "project": 1,
  "document": 2,
  "task": 3,
  "team": 4,
  "conversation": 5,
  "milestone": 6
};

const typeToColor = {
  "project": "#3B82F6", // primary/blue
  "document": "#3B82F6", // blue
  "task": "#10B981", // green
  "team": "#8B5CF6", // purple
  "conversation": "#F59E0B", // yellow
  "milestone": "#EF4444" // red
};

const typeToIcon = {
  "project": "ri-bubble-chart-fill",
  "document": "ri-file-text-line",
  "task": "ri-task-line",
  "team": "ri-team-line",
  "conversation": "ri-chat-3-line",
  "milestone": "ri-calendar-line"
};

export default function ProjectNetwork({ relationships }: ProjectNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || relationships.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    // Transform relationships into graph data
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, boolean>();

    relationships.forEach(rel => {
      const sourceId = `${rel.sourceType}-${rel.sourceId}`;
      const targetId = `${rel.targetType}-${rel.targetId}`;
      
      if (!nodeMap.has(sourceId)) {
        nodes.push({
          id: sourceId,
          type: rel.sourceType,
          label: rel.sourceType.charAt(0).toUpperCase() + rel.sourceType.slice(1),
          group: typeToGroup[rel.sourceType as keyof typeof typeToGroup] || 1
        });
        nodeMap.set(sourceId, true);
      }
      
      if (!nodeMap.has(targetId)) {
        nodes.push({
          id: targetId,
          type: rel.targetType,
          label: rel.targetType.charAt(0).toUpperCase() + rel.targetType.slice(1),
          group: typeToGroup[rel.targetType as keyof typeof typeToGroup] || 1
        });
        nodeMap.set(targetId, true);
      }
      
      links.push({
        source: sourceId,
        target: targetId,
        value: rel.strength
      });
    });

    const data: GraphData = { nodes, links };

    // Set up the SVG container
    const width = svgRef.current.clientWidth;
    const height = 400;
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Create a force simulation
    const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Create the links
    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#ccc")
      .attr("stroke-width", d => Math.sqrt(d.value));

    // Create the nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Add circle to each node
    node.append("circle")
      .attr("r", 15)
      .attr("fill", d => typeToColor[d.type as keyof typeof typeToColor] || "#999");

    // Add text icons to nodes
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "white")
      .attr("font-family", "remixicon")
      .attr("font-size", "12px")
      .text(d => String.fromCharCode(parseInt((typeToIcon[d.type as keyof typeof typeToIcon] || "ri-question-line").replace(/^ri-|\-\w+$/g, ""), 16)));

    // Add tooltips
    node.append("title")
      .text(d => d.label);

    // Update positions on each tick of the simulation
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node
        .attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      (d as any).fx = (d as any).x;
      (d as any).fy = (d as any).y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      (d as any).fx = event.x;
      (d as any).fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      (d as any).fx = null;
      (d as any).fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [relationships]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Project Relationship Network</h2>
        <div className="flex items-center space-x-2">
          <button className="p-1 rounded hover:bg-gray-100">
            <i className="ri-refresh-line text-gray-500"></i>
          </button>
          <button className="p-1 rounded hover:bg-gray-100">
            <i className="ri-more-2-fill text-gray-500"></i>
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="network-graph h-[400px] relative">
          <svg ref={svgRef} width="100%" height="400" />
        </div>
        <div className="mt-4 flex items-center justify-center space-x-4 text-sm flex-wrap">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Documents</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Tasks</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Team</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Conversations</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            <span className="text-gray-600">Milestones</span>
          </div>
        </div>
      </div>
    </div>
  );
}
