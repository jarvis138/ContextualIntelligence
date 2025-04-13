import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../../pages/Dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API responses
vi.mock('../../lib/queryClient', () => {
  return {
    getQueryFn: () => async () => ({
      project: {
        id: 1,
        name: 'Test Project',
        description: 'Test project description',
        status: 'in_progress',
        progress: 65,
        ownerId: 1,
        startDate: new Date('2023-01-01').toISOString(),
        endDate: new Date('2023-12-31').toISOString(),
        createdAt: new Date('2023-01-01').toISOString(),
        updatedAt: new Date('2023-01-01').toISOString(),
      },
      summaryCards: {
        teamMembers: 5,
        activeTasks: 8,
        documents: 12,
        milestones: 3,
      },
      recentActivities: [
        {
          id: 1,
          projectId: 1,
          userId: 1,
          description: 'Created project',
          type: 'creation',
          entityType: 'project',
          entityId: 1,
          timestamp: new Date('2023-01-01').toISOString(),
          user: {
            id: 1,
            username: 'testuser',
            fullName: 'Test User',
            role: 'admin',
            avatar: null,
          },
        },
      ],
      teams: [
        {
          id: 1,
          name: 'Frontend Team',
          description: 'UI/UX Development',
          projectId: 1,
          progress: 75,
        },
        {
          id: 2,
          name: 'Backend Team',
          description: 'API Development',
          projectId: 1,
          progress: 60,
        },
      ],
      recentDocuments: [
        {
          id: 1,
          title: 'Project Requirements',
          content: 'Requirements document',
          type: 'doc',
          projectId: 1,
          createdBy: 1,
          lastUpdatedBy: 1,
          createdAt: new Date('2023-01-01').toISOString(),
          updatedAt: new Date('2023-01-01').toISOString(),
        },
      ],
      insights: [
        {
          type: 'warning',
          content: 'Resource allocation might be a concern',
          confidence: 0.85,
        },
        {
          type: 'success',
          content: 'Project is on track for completion',
          confidence: 0.92,
        },
      ],
    }),
    apiRequest: vi.fn(),
    queryClient: new QueryClient(),
  };
});

// Mock react-query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn().mockImplementation(({ queryKey }) => {
      if (queryKey.includes('/api/projects/1/relationships')) {
        return {
          data: [
            {
              id: 1,
              projectId: 1,
              sourceType: 'document',
              sourceId: 1,
              targetType: 'task',
              targetId: 2,
              relationship: 'references',
              strength: 3,
              description: 'Requirements document references implementation task',
            },
          ],
          isLoading: false,
          error: null,
        };
      }
      
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    }),
  };
});

// Mock wouter
vi.mock('wouter', () => {
  return {
    useLocation: () => ['/projects/1', () => {}],
    useParams: () => ({ id: '1' }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  };
});

// Mock hooks
vi.mock('../../hooks/use-toast', () => {
  return {
    useToast: () => ({
      toast: vi.fn(),
    }),
  };
});

describe('Dashboard Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('renders dashboard with project data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Test Project/i)).toBeInTheDocument();
    });

    // Check for summary cards
    expect(screen.getByText(/5/i)).toBeInTheDocument(); // Team Members
    expect(screen.getByText(/8/i)).toBeInTheDocument(); // Active Tasks
    expect(screen.getByText(/12/i)).toBeInTheDocument(); // Documents

    // Check for chart components
    expect(screen.getByText(/Project Activity/i)).toBeInTheDocument();
    expect(screen.getByText(/Team Progress/i)).toBeInTheDocument();
    
    // Check for relationship visualization
    expect(screen.getByText(/Project Relationships Network/i)).toBeInTheDocument();
    
    // Check for AI insights
    expect(screen.getByText(/AI Project Insights/i)).toBeInTheDocument();
  });
});