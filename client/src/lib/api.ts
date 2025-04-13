import { apiRequest } from "./queryClient";
import {
  Project,
  User,
  Team,
  Task,
  Document,
  Activity,
  Integration,
  Insight,
  Relationship,
  DashboardData
} from "./types";

// Project API
export async function getProjects(): Promise<Project[]> {
  const res = await apiRequest("GET", "/api/projects");
  return res.json();
}

export async function getProject(id: number): Promise<Project> {
  const res = await apiRequest("GET", `/api/projects/${id}`);
  return res.json();
}

export async function createProject(project: Omit<Project, "id">): Promise<Project> {
  const res = await apiRequest("POST", "/api/projects", project);
  return res.json();
}

export async function updateProject(id: number, project: Partial<Project>): Promise<Project> {
  const res = await apiRequest("PATCH", `/api/projects/${id}`, project);
  return res.json();
}

// User API
export async function getUsers(): Promise<User[]> {
  const res = await apiRequest("GET", "/api/users");
  return res.json();
}

export async function getUser(id: number): Promise<User> {
  const res = await apiRequest("GET", `/api/users/${id}`);
  return res.json();
}

// Team API
export async function getTeams(): Promise<Team[]> {
  const res = await apiRequest("GET", "/api/teams");
  return res.json();
}

export async function getTeam(id: number): Promise<Team> {
  const res = await apiRequest("GET", `/api/teams/${id}`);
  return res.json();
}

export async function getTeamMembers(teamId: number): Promise<{ id: number; teamId: number; userId: number; user: User }[]> {
  const res = await apiRequest("GET", `/api/teams/${teamId}/members`);
  return res.json();
}

// Task API
export async function getProjectTasks(projectId: number): Promise<Task[]> {
  const res = await apiRequest("GET", `/api/projects/${projectId}/tasks`);
  return res.json();
}

export async function getTeamTasks(teamId: number): Promise<Task[]> {
  const res = await apiRequest("GET", `/api/teams/${teamId}/tasks`);
  return res.json();
}

export async function createTask(task: Omit<Task, "id">): Promise<Task> {
  const res = await apiRequest("POST", `/api/projects/${task.projectId}/tasks`, task);
  return res.json();
}

// Document API
export async function getProjectDocuments(projectId: number): Promise<Document[]> {
  const res = await apiRequest("GET", `/api/projects/${projectId}/documents`);
  return res.json();
}

export async function getRecentDocuments(): Promise<(Document & { updatedByUser: User })[]> {
  const res = await apiRequest("GET", "/api/documents/recent");
  return res.json();
}

// Activity API
export async function getProjectActivities(projectId: number, limit?: number): Promise<(Activity & { user: User })[]> {
  const url = limit ? `/api/projects/${projectId}/activities?limit=${limit}` : `/api/projects/${projectId}/activities`;
  const res = await apiRequest("GET", url);
  return res.json();
}

export async function createActivity(activity: Omit<Activity, "id" | "timestamp">): Promise<Activity> {
  const res = await apiRequest("POST", `/api/projects/${activity.projectId}/activities`, activity);
  return res.json();
}

// Integration API
export async function getUserIntegrations(userId: number): Promise<Integration[]> {
  const res = await apiRequest("GET", `/api/users/${userId}/integrations`);
  return res.json();
}

export async function createIntegration(integration: Omit<Integration, "id">): Promise<Integration> {
  const res = await apiRequest("POST", `/api/users/${integration.userId}/integrations`, integration);
  return res.json();
}

export async function updateIntegration(id: number, integration: Partial<Integration>): Promise<Integration> {
  const res = await apiRequest("PATCH", `/api/integrations/${id}`, integration);
  return res.json();
}

export async function deleteIntegration(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/integrations/${id}`);
}

export async function syncIntegration(id: number): Promise<any> {
  const res = await apiRequest("POST", `/api/integrations/${id}/sync`);
  return res.json();
}

// Insight API
export async function getProjectInsights(projectId: number): Promise<Insight[]> {
  const res = await apiRequest("GET", `/api/projects/${projectId}/insights`);
  return res.json();
}

export async function generateInsights(projectId: number): Promise<Insight[]> {
  const res = await apiRequest("POST", `/api/projects/${projectId}/generate-insights`);
  return res.json();
}

// Relationship API
export async function getProjectRelationships(projectId: number): Promise<Relationship[]> {
  const res = await apiRequest("GET", `/api/projects/${projectId}/relationships`);
  return res.json();
}

// Dashboard API
export async function getDashboardData(projectId: number): Promise<DashboardData> {
  const res = await apiRequest("GET", `/api/projects/${projectId}/dashboard`);
  return res.json();
}

// Project Analysis API
export async function analyzeProject(projectId: number): Promise<any> {
  const res = await apiRequest("GET", `/api/projects/${projectId}/analyze`);
  return res.json();
}
