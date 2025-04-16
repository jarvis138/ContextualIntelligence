import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface ProjectData {
  id: string;
  name: string;
  phase: string;
  progress: number;
  startDate: Date;
  dueDate: Date;
  team: string[];
  blockers: {
    id: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    status: 'identified' | 'in-progress' | 'resolved';
    created: Date;
  }[];
  tasks: {
    id: string;
    title: string;
    status: 'not-started' | 'in-progress' | 'blocked' | 'completed';
    dueDate: Date;
    assignee: string;
    priority: 'low' | 'medium' | 'high';
  }[];
}

interface PlatformIntegration {
  platform: string;
  isConnected: boolean;
  lastSync: Date | null;
}

interface ProjectAssistantContextType {
  activeProject: ProjectData | null;
  setActiveProject: (project: ProjectData | null) => void;
  currentUserContext: {
    tool: string;
    document: string;
    action: string;
  } | null;
  setCurrentUserContext: (context: { tool: string; document: string; action: string } | null) => void;
  integrations: PlatformIntegration[];
  isAssistantOpen: boolean;
  toggleAssistant: () => void;
  getBlockers: () => ProjectData['blockers'];
  getNextSteps: () => ProjectData['tasks'];
  getProjectStatus: () => { phase: string; progress: number; daysRemaining: number; isOnSchedule: boolean };
}

const ProjectAssistantContext = createContext<ProjectAssistantContextType | undefined>(undefined);

// Sample project data for demonstration
const sampleProject: ProjectData = {
  id: 'project-x',
  name: 'Project X',
  phase: 'Design',
  progress: 32,
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
  team: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams'],
  blockers: [
    {
      id: 'blocker-1',
      description: 'UI mockups pending approval from design team lead',
      severity: 'high',
      status: 'identified',
      created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      id: 'blocker-2',
      description: 'Backend team capacity at 95%',
      severity: 'medium',
      status: 'in-progress',
      created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Complete final review of UI mockups',
      status: 'blocked',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      assignee: 'John Doe',
      priority: 'high'
    },
    {
      id: 'task-2',
      title: 'Schedule kickoff meeting with development team',
      status: 'not-started',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      assignee: 'Jane Smith',
      priority: 'medium'
    },
    {
      id: 'task-3',
      title: 'Finalize API specifications',
      status: 'in-progress',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      assignee: 'Bob Johnson',
      priority: 'high'
    }
  ]
};

// Sample integrations
const sampleIntegrations: PlatformIntegration[] = [
  {
    platform: 'Slack',
    isConnected: true,
    lastSync: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
  },
  {
    platform: 'Google Workspace',
    isConnected: true,
    lastSync: new Date(Date.now() - 120 * 60 * 1000) // 2 hours ago
  },
  {
    platform: 'Jira',
    isConnected: true,
    lastSync: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
  },
  {
    platform: 'Trello',
    isConnected: false,
    lastSync: null
  }
];

interface ProjectAssistantProviderProps {
  children: ReactNode;
}

export const ProjectAssistantProvider = ({ children }: ProjectAssistantProviderProps) => {
  const [activeProject, setActiveProject] = useState<ProjectData | null>(sampleProject);
  const [currentUserContext, setCurrentUserContext] = useState<{ tool: string; document: string; action: string } | null>({
    tool: 'Google Docs',
    document: 'Project X Requirements.doc',
    action: 'editing'
  });
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>(sampleIntegrations);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(true);

  const toggleAssistant = () => {
    setIsAssistantOpen(prev => !prev);
  };

  const getBlockers = () => {
    return activeProject?.blockers || [];
  };

  const getNextSteps = () => {
    if (!activeProject) return [];
    
    // Return tasks sorted by priority and due date
    return [...activeProject.tasks].sort((a, b) => {
      // Priority first: high > medium > low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date (earlier first)
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  };

  const getProjectStatus = () => {
    if (!activeProject) {
      return { phase: '', progress: 0, daysRemaining: 0, isOnSchedule: false };
    }

    const now = new Date();
    const totalDuration = activeProject.dueDate.getTime() - activeProject.startDate.getTime();
    const elapsedDuration = now.getTime() - activeProject.startDate.getTime();
    const expectedProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
    
    const daysRemaining = Math.ceil((activeProject.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    // If actual progress is within 5% of expected progress, consider on schedule
    const isOnSchedule = Math.abs(activeProject.progress - expectedProgress) <= 5;
    
    return {
      phase: activeProject.phase,
      progress: activeProject.progress,
      daysRemaining,
      isOnSchedule
    };
  };

  return (
    <ProjectAssistantContext.Provider 
      value={{
        activeProject,
        setActiveProject,
        currentUserContext,
        setCurrentUserContext,
        integrations,
        isAssistantOpen,
        toggleAssistant,
        getBlockers,
        getNextSteps,
        getProjectStatus
      }}
    >
      {children}
    </ProjectAssistantContext.Provider>
  );
};

export const useProjectAssistant = (): ProjectAssistantContextType => {
  const context = useContext(ProjectAssistantContext);
  
  if (context === undefined) {
    throw new Error('useProjectAssistant must be used within a ProjectAssistantProvider');
  }
  
  return context;
};