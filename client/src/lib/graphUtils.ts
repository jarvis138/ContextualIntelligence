import { GraphData, GraphFilter, GraphLink, GraphNode } from "./types/graphTypes";

/**
 * Process raw relationship data into a format suitable for D3 visualization
 */
export function processGraphData(data: any[]): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  // Process nodes first
  data.forEach(relation => {
    if (!nodeMap.has(relation.source.id)) {
      nodeMap.set(relation.source.id, {
        id: relation.source.id,
        name: relation.source.name || `${relation.sourceType}-${relation.source.id}`,
        type: relation.sourceType,
        group: getGroupForType(relation.sourceType),
        metadata: relation.source.metadata || {}
      });
    }

    if (!nodeMap.has(relation.target.id)) {
      nodeMap.set(relation.target.id, {
        id: relation.target.id,
        name: relation.target.name || `${relation.targetType}-${relation.target.id}`,
        type: relation.targetType,
        group: getGroupForType(relation.targetType),
        metadata: relation.target.metadata || {}
      });
    }

    // Process link
    links.push({
      source: relation.source.id,
      target: relation.target.id,
      type: relation.type,
      strength: relation.strength || 1,
      timestamp: relation.timestamp,
      description: relation.description
    });
  });

  return {
    nodes: Array.from(nodeMap.values()),
    links
  };
}

/**
 * Assign group numbers to different node types for visual differentiation
 */
function getGroupForType(type: string): number {
  switch (type) {
    case 'project': return 1;
    case 'document': return 2;
    case 'task': return 3;
    case 'person': return 4;
    case 'team': return 5;
    case 'insight': return 6;
    case 'email': return 7;
    case 'comment': return 8;
    default: return 0;
  }
}

/**
 * Apply time decay to relationship strengths
 * Older relationships will have weaker strengths
 */
export function applyTimeDecay(
  graphData: GraphData, 
  referenceDate: Date = new Date(), 
  decayFactor: number = 0.5
): GraphData {
  const newLinks = graphData.links.map(link => {
    if (!link.timestamp) return link;
    
    const linkDate = new Date(link.timestamp);
    const ageDays = (referenceDate.getTime() - linkDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Apply logarithmic decay: strength = originalStrength * e^(-decayFactor * ageDays)
    const decayedStrength = (link.strength || 1) * Math.exp(-decayFactor * ageDays);
    
    return {
      ...link,
      strength: Math.max(0.1, decayedStrength) // Ensure minimum strength of 0.1
    };
  });

  return {
    nodes: graphData.nodes,
    links: newLinks
  };
}

/**
 * Filter graph data based on specified criteria
 */
export function filterGraphData(
  graphData: GraphData,
  filter: GraphFilter
): GraphData {
  let { nodes, links } = graphData;
  
  // Filter nodes by type
  if (filter.nodeTypes && filter.nodeTypes.length > 0) {
    nodes = nodes.filter(node => filter.nodeTypes!.includes(node.type));
  }
  
  // Filter links by type
  if (filter.linkTypes && filter.linkTypes.length > 0) {
    links = links.filter(link => filter.linkTypes!.includes(link.type));
  }
  
  // Filter by search term (across node names)
  if (filter.searchTerm && filter.searchTerm.trim() !== '') {
    const searchTerm = filter.searchTerm.toLowerCase();
    nodes = nodes.filter(node => 
      node.name.toLowerCase().includes(searchTerm) || 
      (node.metadata && JSON.stringify(node.metadata).toLowerCase().includes(searchTerm))
    );
  }
  
  // Filter by time range
  if (filter.timeRange) {
    const { start, end } = filter.timeRange;
    links = links.filter(link => {
      if (!link.timestamp) return true; // Keep links without timestamp
      const linkDate = new Date(link.timestamp);
      return linkDate >= start && linkDate <= end;
    });
  }
  
  // Ensure we only keep links where both source and target nodes are present
  const nodeIds = new Set(nodes.map(n => n.id));
  links = links.filter(link => 
    nodeIds.has(typeof link.source === 'object' ? link.source.id : link.source) && 
    nodeIds.has(typeof link.target === 'object' ? link.target.id : link.target)
  );
  
  return { nodes, links };
}

/**
 * Calculate community clusters within the graph using the Louvain method
 * This is a simplified implementation - for production use a proper community detection library
 */
export function detectCommunities(graphData: GraphData): GraphData {
  // This is a placeholder for community detection
  // In a real implementation, you would use a proper algorithm
  // For now, we'll just use the node types as communities
  
  const nodes = graphData.nodes.map(node => ({
    ...node,
    group: getGroupForType(node.type)
  }));
  
  return {
    nodes,
    links: graphData.links
  };
}

/**
 * Extract insights from graph structure
 */
export function analyzeGraphStructure(graphData: GraphData) {
  const { nodes, links } = graphData;
  
  // Count connections for each node
  const connectionCounts = new Map<string, number>();
  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1);
    connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1);
  });
  
  // Find central nodes (highest connection count)
  const centralNodes = Array.from(connectionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => nodes.find(n => n.id === id))
    .filter(Boolean);
  
  // Find isolated nodes (no connections)
  const isolatedNodes = nodes.filter(node => !connectionCounts.has(node.id) || connectionCounts.get(node.id) === 0);
  
  // Calculate graph density
  const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
  const density = maxPossibleEdges > 0 ? links.length / maxPossibleEdges : 0;
  
  return {
    totalNodes: nodes.length,
    totalLinks: links.length,
    density,
    averageConnections: nodes.length > 0 ? links.length / nodes.length : 0,
    centralNodes,
    isolatedNodes
  };
}