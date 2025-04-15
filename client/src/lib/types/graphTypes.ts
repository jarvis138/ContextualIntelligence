// Graph node and link types for D3.js visualization

export interface GraphNode {
  id: string;
  name: string;
  type: 'project' | 'document' | 'task' | 'person' | 'team' | 'insight' | 'email' | 'comment';
  group?: number;
  value?: number;
  metadata?: Record<string, any>;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  value?: number;
  strength?: number;
  timestamp?: string;
  description?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ForceGraphConfig {
  width: number;
  height: number;
  linkDistance?: number;
  linkStrength?: number;
  charge?: number;
  centerForce?: number;
  collideRadius?: number;
  nodeRadius?: number;
  timeDecay?: boolean;
  timeDecayFactor?: number;
  timeDecayReference?: Date;
}

export interface GraphFilter {
  nodeTypes?: string[];
  linkTypes?: string[];
  searchTerm?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
}