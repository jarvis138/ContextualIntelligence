// Server-side mock graph data utilities

// GraphNode interface
interface GraphNode {
  id: number;
  type: "DOCUMENT" | "MESSAGE" | "ENTITY" | "TOPIC" | "USER" | "PROJECT" | "TASK";
  label: string;
  properties?: Record<string, any>;
  embeddings?: Record<string, any>;
  importance?: number;
  externalId: string;
}

// GraphEdge interface
interface GraphEdge {
  source: number;
  target: number;
  id?: number;
  type?: "CONTAINS" | "MENTIONED_IN" | "DISCUSSES" | "AUTHORED_BY" | "REPLIED" | "RELATED" | "DEPENDS_ON" | "REFERS_TO" | "SIMILAR_TO" | "ASSOCIATED_WITH" | "PART_OF";
  properties?: Record<string, any>;
  weight?: number;
}

// GraphData interface
interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

// Generate mock graph data for visualization
export const getMockGraphData = (initialNodeId?: number, depth: number = 2, limit: number = 100): GraphData => {
  const nodes: GraphNode[] = [];
  const links: GraphEdge[] = [];
  
  // Define node types
  const nodeTypes: GraphNode["type"][] = [
    "DOCUMENT", "MESSAGE", "ENTITY", "TOPIC", "USER", "PROJECT", "TASK"
  ];
  
  // Define edge types
  const edgeTypes: GraphEdge["type"][] = [
    "CONTAINS", "MENTIONED_IN", "DISCUSSES", "AUTHORED_BY", "REPLIED", 
    "RELATED", "DEPENDS_ON", "REFERS_TO", "SIMILAR_TO", "ASSOCIATED_WITH", "PART_OF"
  ];
  
  // Generate a fixed set of nodes for consistency
  const generateNode = (id: number): GraphNode => {
    const type = nodeTypes[id % nodeTypes.length];
    const label = `${type} ${id}`;
    
    return {
      id,
      type,
      label,
      externalId: `ext-${id}`,
      importance: Math.min(1 + Math.floor(Math.random() * 10), 10),
      properties: {
        created: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: ["active", "archived", "draft", "completed"][Math.floor(Math.random() * 4)],
        priority: ["low", "medium", "high"][Math.floor(Math.random() * 3)]
      }
    };
  };
  
  // Start with central node or create a random one
  const centerNodeId = initialNodeId || 1;
  
  // Generate first level nodes
  nodes.push(generateNode(centerNodeId));
  
  // For each level of depth
  let currentLevel = [centerNodeId];
  let nextLevel: number[] = [];
  let nodeId = centerNodeId;
  
  // Generate connected nodes up to the specified depth
  for (let level = 0; level < depth; level++) {
    // For each node in current level
    for (const sourceId of currentLevel) {
      // Generate between 2-5 connected nodes for each current node
      const connectionsCount = Math.min(Math.floor(Math.random() * 4) + 2, Math.floor(limit / (level + 1) / currentLevel.length));
      
      for (let i = 0; i < connectionsCount; i++) {
        // Stop if we reach the node limit
        if (nodes.length >= limit) break;
        
        nodeId++;
        
        // Create a new node
        const newNode = generateNode(nodeId);
        nodes.push(newNode);
        nextLevel.push(nodeId);
        
        // Create edge from source to this node
        links.push({
          source: sourceId,
          target: nodeId,
          type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
          weight: 1 + Math.random() * 3
        });
        
        // Add some additional cross-connections for more realistic graph
        if (Math.random() > 0.7 && currentLevel.length > 1) {
          // Connect to a random node from the same level
          const otherSourceIdx = Math.floor(Math.random() * currentLevel.length);
          if (currentLevel[otherSourceIdx] !== sourceId) {
            links.push({
              source: currentLevel[otherSourceIdx],
              target: nodeId,
              type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
              weight: 0.5 + Math.random()
            });
          }
        }
      }
      
      // Stop if we reach the node limit
      if (nodes.length >= limit) break;
    }
    
    // Move to next level
    currentLevel = nextLevel;
    nextLevel = [];
    
    // Stop if we reach the node limit
    if (nodes.length >= limit) break;
  }
  
  // Add some extra connections for more complex graph
  if (nodes.length < limit) {
    const extraConnectionsCount = Math.floor(nodes.length * 0.2);
    for (let i = 0; i < extraConnectionsCount; i++) {
      const sourceIdx = Math.floor(Math.random() * nodes.length);
      let targetIdx = Math.floor(Math.random() * nodes.length);
      
      // Ensure we don't connect a node to itself
      while (targetIdx === sourceIdx) {
        targetIdx = Math.floor(Math.random() * nodes.length);
      }
      
      links.push({
        source: nodes[sourceIdx].id,
        target: nodes[targetIdx].id,
        type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)],
        weight: 0.5 + Math.random()
      });
    }
  }
  
  return { nodes, links };
};

// Get detailed information about a specific node
export const getMockNodeDetails = (nodeId: number): GraphNode | null => {
  const node = getMockGraphData().nodes.find(node => node.id === nodeId);
  
  if (!node) return null;
  
  // Add some additional mock details
  return {
    ...node,
    properties: {
      ...node.properties,
      creator: "John Doe",
      lastModified: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      version: "1." + Math.floor(Math.random() * 10),
      tags: ["important", "reviewed", "validated"].slice(0, Math.floor(Math.random() * 4)),
      description: "This is a detailed description for node " + nodeId,
      size: Math.floor(Math.random() * 1000) + "KB",
      accessLevel: ["public", "private", "restricted"][Math.floor(Math.random() * 3)]
    }
  };
};

// Mock function to search for nodes in the graph
export const mockGraphSearch = async (searchTerm: string): Promise<GraphNode[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate a set of random nodes as search results
  const results: GraphNode[] = [];
  const nodeTypes: GraphNode["type"][] = [
    "DOCUMENT", "MESSAGE", "ENTITY", "TOPIC", "USER", "PROJECT", "TASK"
  ];
  
  // Create between 0-10 results based on search term
  const resultCount = Math.min(
    Math.max(Math.floor(Math.random() * 10), 1), 
    10
  );
  
  for (let i = 0; i < resultCount; i++) {
    const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    const id = 100 + Math.floor(Math.random() * 900);
    
    results.push({
      id,
      type,
      label: `${type}: ${searchTerm} (Result ${i + 1})`,
      externalId: `search-${id}`,
      importance: Math.min(1 + Math.floor(Math.random() * 10), 10),
      properties: {
        relevance: (100 - i * 10) + "%",
        matches: Math.floor(Math.random() * 5) + 1,
        created: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  }
  
  return results;
};

// Function to create initial graph data
export const createMockGraphData = async (): Promise<void> => {
  // This would normally create data in the database
  // For mock purposes, we just wait a bit to simulate processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Mock graph data created successfully');
  return;
};