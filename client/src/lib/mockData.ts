import { GraphData, GraphNode, GraphEdge } from '../components/visualizations/GraphVisualizer';

/**
 * Generate mock graph data for development
 * @param centralNodeId Optional central node ID to focus the graph around
 * @param depth Depth of connections to include
 * @param limit Maximum number of nodes to include
 * @returns Graph data with nodes and links
 */
export function getMockGraphData(centralNodeId?: number, depth: number = 2, limit: number = 100): GraphData {
  let nodes: GraphNode[] = [];
  let links: GraphEdge[] = [];
  
  // Start with base mock data or filter it by centralNodeId
  const baseNodes = getBaseMockNodes();
  const baseEdges = getBaseMockEdges();
  
  if (centralNodeId !== undefined) {
    // Filter to include only the central node and connected nodes up to depth
    const nodeMap = new Map<number, GraphNode>();
    
    // First get the central node
    const centralNode = baseNodes.find(node => node.id === centralNodeId);
    if (!centralNode) {
      // If central node doesn't exist, return empty data
      return { nodes: [], links: [] };
    }
    
    nodeMap.set(centralNodeId, centralNode);
    
    // Track nodes at each depth level
    let currentDepthNodes = [centralNodeId];
    
    // Traverse the graph up to the specified depth
    for (let i = 0; i < depth; i++) {
      const nextDepthNodes: number[] = [];
      
      // Find all edges connected to nodes at the current depth
      for (const nodeId of currentDepthNodes) {
        // Find edges where the current node is the source
        const outgoingEdges = baseEdges.filter(edge => edge.source === nodeId);
        for (const edge of outgoingEdges) {
          const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
          if (!nodeMap.has(targetId)) {
            const targetNode = baseNodes.find(node => node.id === targetId);
            if (targetNode) {
              nodeMap.set(targetId, targetNode);
              nextDepthNodes.push(targetId);
              links.push(edge);
            }
          } else {
            links.push(edge);
          }
        }
        
        // Find edges where the current node is the target
        const incomingEdges = baseEdges.filter(edge => {
          const edgeTarget = typeof edge.target === 'object' ? edge.target.id : edge.target;
          return edgeTarget === nodeId;
        });
        
        for (const edge of incomingEdges) {
          const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
          if (!nodeMap.has(sourceId)) {
            const sourceNode = baseNodes.find(node => node.id === sourceId);
            if (sourceNode) {
              nodeMap.set(sourceId, sourceNode);
              nextDepthNodes.push(sourceId);
              links.push(edge);
            }
          } else {
            links.push(edge);
          }
        }
      }
      
      // Update current depth nodes for the next iteration
      currentDepthNodes = nextDepthNodes;
    }
    
    // Convert node map to array
    nodes = Array.from(nodeMap.values());
    
    // Deduplicate links
    links = Array.from(
      new Map(
        links.map(link => [
          `${typeof link.source === 'object' ? link.source.id : link.source}-${
            typeof link.target === 'object' ? link.target.id : link.target
          }-${link.type}`,
          link,
        ])
      ).values()
    );
  } else {
    // Use all base data, subject to limit
    nodes = baseNodes.slice(0, limit);
    
    // Only include links between nodes that are included
    const nodeIds = new Set(nodes.map(node => node.id));
    links = baseEdges.filter(
      edge => 
        nodeIds.has(typeof edge.source === 'object' ? edge.source.id : edge.source as number) && 
        nodeIds.has(typeof edge.target === 'object' ? edge.target.id : edge.target as number)
    );
  }
  
  return { nodes, links };
}

/**
 * Get details for a specific node
 * @param nodeId Node ID to get details for
 * @returns Node details or null if not found
 */
export function getMockNodeDetails(nodeId: number): GraphNode | null {
  const nodes = getBaseMockNodes();
  return nodes.find(node => node.id === nodeId) || null;
}

/**
 * Search for nodes matching a query string
 * @param query Query string to search for
 * @returns Array of matching nodes
 */
export async function mockGraphSearch(query: string): Promise<GraphNode[]> {
  if (!query.trim()) return [];
  
  const nodes = getBaseMockNodes();
  const normalizedQuery = query.toLowerCase();
  
  return nodes.filter(
    node => 
      node.label.toLowerCase().includes(normalizedQuery) || 
      (node.properties?.name && node.properties.name.toLowerCase().includes(normalizedQuery)) ||
      (node.properties?.title && node.properties.title.toLowerCase().includes(normalizedQuery))
  );
}

/**
 * Simulate creating mock graph data in the database
 */
export async function createMockGraphData(): Promise<void> {
  console.log('Creating mock graph data');
  // In a real application, this would create data in the database
  // For now, it's just a placeholder
  return Promise.resolve();
}

/**
 * Create base mock nodes for the graph
 * @returns Array of mock nodes
 */
function getBaseMockNodes(): GraphNode[] {
  return [
    // Projects
    {
      id: 1,
      type: "PROJECT",
      label: "CPI Hub Development",
      externalId: "project-1",
      properties: {
        status: "active",
        startDate: "2025-01-15",
        description: "Development of the Contextual Project Intelligence Hub platform",
        owner: "John Smith",
        priority: "high"
      },
      importance: 9
    },
    {
      id: 2,
      type: "PROJECT",
      label: "Marketing Campaign",
      externalId: "project-2",
      properties: {
        status: "planning",
        startDate: "2025-03-01",
        description: "Q2 marketing campaign for CPI Hub",
        owner: "Sarah Johnson",
        priority: "medium"
      },
      importance: 7
    },
    {
      id: 3,
      type: "PROJECT",
      label: "API Integration",
      externalId: "project-3",
      properties: {
        status: "active",
        startDate: "2025-02-10",
        description: "Third-party API integrations for CPI Hub",
        owner: "Michael Lee",
        priority: "high"
      },
      importance: 8
    },
    
    // Tasks
    {
      id: 11,
      type: "TASK",
      label: "Implement User Authentication",
      externalId: "task-1",
      properties: {
        status: "completed",
        dueDate: "2025-01-30",
        assignee: "David Chen",
        project: "CPI Hub Development",
        hours: 24
      },
      importance: 8
    },
    {
      id: 12,
      type: "TASK",
      label: "Design Graph Visualization",
      externalId: "task-2",
      properties: {
        status: "in_progress",
        dueDate: "2025-02-15",
        assignee: "Emily Wang",
        project: "CPI Hub Development",
        hours: 40
      },
      importance: 7
    },
    {
      id: 13,
      type: "TASK",
      label: "Setup Database Schema",
      externalId: "task-3",
      properties: {
        status: "completed",
        dueDate: "2025-01-25",
        assignee: "Michael Lee",
        project: "CPI Hub Development",
        hours: 16
      },
      importance: 9
    },
    {
      id: 14,
      type: "TASK",
      label: "Create Marketing Materials",
      externalId: "task-4",
      properties: {
        status: "not_started",
        dueDate: "2025-03-10",
        assignee: "Sarah Johnson",
        project: "Marketing Campaign",
        hours: 30
      },
      importance: 6
    },
    {
      id: 15,
      type: "TASK",
      label: "Implement Slack Integration",
      externalId: "task-5",
      properties: {
        status: "in_progress",
        dueDate: "2025-02-28",
        assignee: "David Chen",
        project: "API Integration",
        hours: 20
      },
      importance: 7
    },
    
    // Documents
    {
      id: 21,
      type: "DOCUMENT",
      label: "CPI Hub Requirements",
      externalId: "doc-1",
      properties: {
        type: "requirement",
        author: "John Smith",
        created: "2025-01-10",
        modified: "2025-01-15",
        version: "1.2"
      },
      importance: 9
    },
    {
      id: 22,
      type: "DOCUMENT",
      label: "Architecture Design",
      externalId: "doc-2",
      properties: {
        type: "technical",
        author: "Michael Lee",
        created: "2025-01-20",
        modified: "2025-01-25",
        version: "1.0"
      },
      importance: 8
    },
    {
      id: 23,
      type: "DOCUMENT",
      label: "Marketing Strategy",
      externalId: "doc-3",
      properties: {
        type: "business",
        author: "Sarah Johnson",
        created: "2025-02-05",
        modified: "2025-02-10",
        version: "1.1"
      },
      importance: 7
    },
    {
      id: 24,
      type: "DOCUMENT",
      label: "API Documentation",
      externalId: "doc-4",
      properties: {
        type: "technical",
        author: "David Chen",
        created: "2025-02-15",
        modified: "2025-02-20",
        version: "1.0"
      },
      importance: 8
    },
    
    // Messages
    {
      id: 31,
      type: "MESSAGE",
      label: "Weekly Progress Update",
      externalId: "msg-1",
      properties: {
        sender: "John Smith",
        timestamp: "2025-02-01T10:30:00Z",
        channel: "team-chat",
        thread: "progress-updates"
      },
      importance: 6
    },
    {
      id: 32,
      type: "MESSAGE",
      label: "API Integration Issues",
      externalId: "msg-2",
      properties: {
        sender: "Michael Lee",
        timestamp: "2025-02-18T15:45:00Z",
        channel: "tech-support",
        thread: "api-issues"
      },
      importance: 8
    },
    {
      id: 33,
      type: "MESSAGE",
      label: "Marketing Campaign Feedback",
      externalId: "msg-3",
      properties: {
        sender: "Sarah Johnson",
        timestamp: "2025-03-05T09:15:00Z",
        channel: "marketing",
        thread: "campaign-discussion"
      },
      importance: 7
    },
    
    // Users
    {
      id: 41,
      type: "USER",
      label: "John Smith",
      externalId: "user-1",
      properties: {
        role: "Project Manager",
        email: "john.smith@example.com",
        department: "Project Management",
        joinDate: "2024-06-15"
      },
      importance: 8
    },
    {
      id: 42,
      type: "USER",
      label: "Sarah Johnson",
      externalId: "user-2",
      properties: {
        role: "Marketing Director",
        email: "sarah.johnson@example.com",
        department: "Marketing",
        joinDate: "2023-09-01"
      },
      importance: 7
    },
    {
      id: 43,
      type: "USER",
      label: "Michael Lee",
      externalId: "user-3",
      properties: {
        role: "Senior Developer",
        email: "michael.lee@example.com",
        department: "Engineering",
        joinDate: "2023-11-15"
      },
      importance: 8
    },
    {
      id: 44,
      type: "USER",
      label: "David Chen",
      externalId: "user-4",
      properties: {
        role: "Full Stack Developer",
        email: "david.chen@example.com",
        department: "Engineering",
        joinDate: "2024-01-10"
      },
      importance: 7
    },
    {
      id: 45,
      type: "USER",
      label: "Emily Wang",
      externalId: "user-5",
      properties: {
        role: "UX Designer",
        email: "emily.wang@example.com",
        department: "Design",
        joinDate: "2024-02-05"
      },
      importance: 6
    },
    
    // Topics
    {
      id: 51,
      type: "TOPIC",
      label: "Authentication",
      externalId: "topic-1",
      properties: {
        category: "Security",
        relevance: 0.85,
        documentCount: 5,
        messageCount: 12
      },
      importance: 8
    },
    {
      id: 52,
      type: "TOPIC",
      label: "Graph Visualization",
      externalId: "topic-2",
      properties: {
        category: "Frontend",
        relevance: 0.92,
        documentCount: 3,
        messageCount: 8
      },
      importance: 9
    },
    {
      id: 53,
      type: "TOPIC",
      label: "Database Schema",
      externalId: "topic-3",
      properties: {
        category: "Backend",
        relevance: 0.88,
        documentCount: 4,
        messageCount: 10
      },
      importance: 8
    },
    {
      id: 54,
      type: "TOPIC",
      label: "Marketing Strategy",
      externalId: "topic-4",
      properties: {
        category: "Business",
        relevance: 0.79,
        documentCount: 2,
        messageCount: 15
      },
      importance: 7
    },
    {
      id: 55,
      type: "TOPIC",
      label: "API Integration",
      externalId: "topic-5",
      properties: {
        category: "Backend",
        relevance: 0.86,
        documentCount: 3,
        messageCount: 9
      },
      importance: 8
    },
    
    // Entities
    {
      id: 61,
      type: "ENTITY",
      label: "OAuth",
      externalId: "entity-1",
      properties: {
        category: "Technology",
        relevance: 0.83,
        occurrences: 24,
        firstMention: "2025-01-18"
      },
      importance: 7
    },
    {
      id: 62,
      type: "ENTITY",
      label: "PostgreSQL",
      externalId: "entity-2",
      properties: {
        category: "Technology",
        relevance: 0.91,
        occurrences: 35,
        firstMention: "2025-01-12"
      },
      importance: 8
    },
    {
      id: 63,
      type: "ENTITY",
      label: "React Force Graph",
      externalId: "entity-3",
      properties: {
        category: "Technology",
        relevance: 0.88,
        occurrences: 18,
        firstMention: "2025-02-08"
      },
      importance: 8
    },
    {
      id: 64,
      type: "ENTITY",
      label: "Target Audience",
      externalId: "entity-4",
      properties: {
        category: "Business",
        relevance: 0.76,
        occurrences: 12,
        firstMention: "2025-02-15"
      },
      importance: 6
    },
    {
      id: 65,
      type: "ENTITY",
      label: "Slack API",
      externalId: "entity-5",
      properties: {
        category: "Technology",
        relevance: 0.85,
        occurrences: 22,
        firstMention: "2025-02-12"
      },
      importance: 7
    }
  ];
}

/**
 * Create base mock edges for the graph
 * @returns Array of mock edges
 */
function getBaseMockEdges(): GraphEdge[] {
  return [
    // Project to Task edges
    { source: 1, target: 11, type: "CONTAINS", weight: 2 },
    { source: 1, target: 12, type: "CONTAINS", weight: 2 },
    { source: 1, target: 13, type: "CONTAINS", weight: 2 },
    { source: 2, target: 14, type: "CONTAINS", weight: 2 },
    { source: 3, target: 15, type: "CONTAINS", weight: 2 },
    
    // Project to Document edges
    { source: 1, target: 21, type: "RELATED", weight: 3 },
    { source: 1, target: 22, type: "RELATED", weight: 3 },
    { source: 2, target: 23, type: "RELATED", weight: 3 },
    { source: 3, target: 24, type: "RELATED", weight: 3 },
    
    // User to Project edges
    { source: 41, target: 1, type: "AUTHORED_BY", weight: 2 },
    { source: 42, target: 2, type: "AUTHORED_BY", weight: 2 },
    { source: 43, target: 3, type: "AUTHORED_BY", weight: 2 },
    
    // User to Task edges
    { source: 44, target: 11, type: "ASSIGNED", weight: 1 },
    { source: 45, target: 12, type: "ASSIGNED", weight: 1 },
    { source: 43, target: 13, type: "ASSIGNED", weight: 1 },
    { source: 42, target: 14, type: "ASSIGNED", weight: 1 },
    { source: 44, target: 15, type: "ASSIGNED", weight: 1 },
    
    // User to Document edges
    { source: 41, target: 21, type: "AUTHORED_BY", weight: 2 },
    { source: 43, target: 22, type: "AUTHORED_BY", weight: 2 },
    { source: 42, target: 23, type: "AUTHORED_BY", weight: 2 },
    { source: 44, target: 24, type: "AUTHORED_BY", weight: 2 },
    
    // User to Message edges
    { source: 41, target: 31, type: "AUTHORED_BY", weight: 1 },
    { source: 43, target: 32, type: "AUTHORED_BY", weight: 1 },
    { source: 42, target: 33, type: "AUTHORED_BY", weight: 1 },
    
    // Topic to Document edges
    { source: 21, target: 51, type: "DISCUSSES", weight: 2 },
    { source: 22, target: 51, type: "DISCUSSES", weight: 1 },
    { source: 22, target: 52, type: "DISCUSSES", weight: 3 },
    { source: 22, target: 53, type: "DISCUSSES", weight: 2 },
    { source: 23, target: 54, type: "DISCUSSES", weight: 3 },
    { source: 24, target: 55, type: "DISCUSSES", weight: 3 },
    
    // Entity mentioned in Documents
    { source: 21, target: 61, type: "MENTIONED_IN", weight: 2 },
    { source: 22, target: 62, type: "MENTIONED_IN", weight: 3 },
    { source: 22, target: 63, type: "MENTIONED_IN", weight: 2 },
    { source: 23, target: 64, type: "MENTIONED_IN", weight: 3 },
    { source: 24, target: 65, type: "MENTIONED_IN", weight: 3 },
    
    // Entity mentioned in Messages
    { source: 31, target: 63, type: "MENTIONED_IN", weight: 1 },
    { source: 32, target: 65, type: "MENTIONED_IN", weight: 2 },
    { source: 33, target: 64, type: "MENTIONED_IN", weight: 2 },
    
    // Topics related to each other
    { source: 51, target: 53, type: "RELATED", weight: 2 },
    { source: 52, target: 53, type: "RELATED", weight: 2 },
    { source: 54, target: 64, type: "RELATED", weight: 3 },
    { source: 55, target: 65, type: "RELATED", weight: 3 },
    
    // Additional edges
    { source: 12, target: 52, type: "RELATED", weight: 3 },
    { source: 13, target: 53, type: "RELATED", weight: 3 },
    { source: 15, target: 55, type: "RELATED", weight: 3 },
    { source: 11, target: 51, type: "RELATED", weight: 3 },
    { source: 14, target: 54, type: "RELATED", weight: 3 }
  ];
}