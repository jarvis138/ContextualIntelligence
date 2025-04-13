// Project types
export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  progress: number;
}

// User types
export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  avatar: string | null;
  role: string;
}

// Team types
export interface Team {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  progress: number;
  memberCount?: number;
  taskCount?: number;
}

// Task types
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  assigneeId: number | null;
  projectId: number;
  teamId: number | null;
  dueDate: string | null;
}

// Document types
export interface Document {
  id: number;
  title: string;
  content: string | null;
  fileType: string;
  projectId: number;
  createdBy: number;
  updatedBy: number;
  updatedAt: string;
  updatedByUser?: User;
}

// Activity types
export interface Activity {
  id: number;
  type: string;
  description: string;
  userId: number;
  projectId: number;
  entityType: string | null;
  entityId: number | null;
  timestamp: string;
  user?: User;
}

// Integration types
export interface Integration {
  id: number;
  name: string;
  type: string;
  config: Record<string, any>;
  active: boolean;
  userId: number;
}

// Insight types
export interface Insight {
  id: number;
  type: 'warning' | 'success' | 'info';
  content: string;
  projectId: number;
  timestamp: string;
  confidence: number;
}

// Relationship types
export interface Relationship {
  id: number;
  sourceType: string;
  sourceId: number;
  targetType: string;
  targetId: number;
  strength: number;
  description: string | null;
}

// Dashboard data types
export interface DashboardData {
  project: Project;
  summaryCards: {
    activeTasks: number;
    documents: number;
    teamMembers: number;
    integrations: number;
  };
  teams: (Team & { memberCount: number, taskCount: number })[];
  recentActivities: (Activity & { user: User })[];
  recentDocuments: (Document & { updatedByUser: User })[];
  insights: Insight[];
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: any;
}
