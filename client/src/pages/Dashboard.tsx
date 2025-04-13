import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardData, getProjectRelationships } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { 
  SummaryCard, 
  ProjectNetwork, 
  AIInsights, 
  RecentActivities, 
  TeamOverview, 
  RecentDocuments,
  ProjectProgressChart,
  TeamProgressChart,
  RelationshipNetworkChart
} from '@/components/dashboard';
import { Activity, WebSocketMessage } from '@/lib/types';

export default function Dashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [realtimeActivities, setRealtimeActivities] = useState<Activity[]>([]);
  
  // Use project ID 1 for demo purposes
  const projectId = 1;
  
  // Fetch dashboard data
  const { data: dashboardData, error: dashboardError, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'dashboard'],
    queryFn: () => getDashboardData(projectId),
  });
  
  // Fetch relationships for network graph
  const { data: relationships, isLoading: isRelationshipsLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'relationships'],
    queryFn: () => getProjectRelationships(projectId),
  });
  
  // WebSocket for real-time updates
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    if (message.type === 'activity' && message.data.projectId === projectId) {
      setRealtimeActivities(prev => [message.data, ...prev].slice(0, 5));
    }
  };
  
  const { isConnected: isWebSocketConnected } = useWebSocket({
    onMessage: handleWebSocketMessage
  });
  
  // Show toast for errors
  useEffect(() => {
    if (dashboardError) {
      toast({
        title: 'Error loading dashboard',
        description: 'Could not load dashboard data. Please try again.',
        variant: 'destructive'
      });
    }
  }, [dashboardError, toast]);
  
  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    toast({
      title: 'Search',
      description: `Searching for "${query}"...`,
    });
  };
  
  // Merge real-time activities with fetched activities
  const activities = [...realtimeActivities, ...(dashboardData?.recentActivities || [])].slice(0, 5);
  
  if (isDashboardLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!dashboardData && dashboardError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="ri-error-warning-line text-4xl text-red-500 mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
          <p className="text-gray-500 mb-4">There was an error loading the dashboard data. Please try again later.</p>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-md"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Default user if not provided
  const user = {
    id: 1,
    username: 'alexmorgan',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Project Manager'
  };
  
  // Extract team members for top bar
  const teamMembers = dashboardData?.teams.reduce((acc, team) => {
    // This is a simplification as we don't have the actual user objects for team members
    return [...acc, user];
  }, [] as any[]) || [user];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <TopBar 
          project={dashboardData?.project || { id: 1, name: 'Web Application Redesign', description: 'Project description', status: 'active', progress: 67 }} 
          teamMembers={teamMembers}
          onSearch={handleSearch}
        />
        
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard
              title="Active Tasks"
              value={dashboardData?.summaryCards.activeTasks || 0}
              icon="ri-task-line"
              iconColor="primary"
              changeValue={12}
              changeType="increase"
            />
            
            <SummaryCard
              title="Documents"
              value={dashboardData?.summaryCards.documents || 0}
              icon="ri-file-text-line"
              iconColor="secondary"
              changeValue={7}
              changeType="increase"
            />
            
            <SummaryCard
              title="Team Members"
              value={dashboardData?.summaryCards.teamMembers || 0}
              icon="ri-team-line"
              iconColor="accent"
              changeValue={2}
              changeText="new this month"
              changeType="increase"
            />
            
            <SummaryCard
              title="Integrations"
              value={dashboardData?.summaryCards.integrations || 0}
              icon="ri-link-m"
              iconColor="info"
              changeValue={1}
              changeText="disconnected"
              changeType="decrease"
              linkTo="/integrations"
            />
          </div>
          
          {/* Data Visualization Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Progress Chart */}
            <ProjectProgressChart 
              activities={dashboardData?.recentActivities || []} 
            />
            
            {/* Team Progress Chart */}
            <TeamProgressChart 
              teams={dashboardData?.teams || []} 
            />
          </div>
          
          {/* Main Content Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Enhanced Network Visualization */}
              <RelationshipNetworkChart relationships={relationships || []} />
              
              {/* Legacy Project Network (as backup) */}
              {/* <ProjectNetwork relationships={relationships || []} /> */}
              
              {/* AI Insights */}
              <AIInsights
                projectId={projectId}
                summary={`The ${dashboardData?.project.name} project is ${dashboardData?.project.progress}% complete with ${dashboardData?.summaryCards.activeTasks} active tasks. There are ${dashboardData?.summaryCards.documents} documents associated with this project.`}
                insights={dashboardData?.insights || []}
                lastUpdated={dashboardData?.insights[0]?.timestamp || new Date().toISOString()}
              />
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              {/* Recent Activities */}
              <RecentActivities
                activities={activities}
                onViewAll={() => toast({ title: 'View All Activities', description: 'This would navigate to a full activities page' })}
              />
              
              {/* Team Overview */}
              <TeamOverview
                teams={dashboardData?.teams || []}
                onViewAll={() => toast({ title: 'View All Teams', description: 'This would navigate to the teams page' })}
              />
              
              {/* Recent Documents */}
              <RecentDocuments
                documents={dashboardData?.recentDocuments || []}
                onViewAll={() => toast({ title: 'View All Documents', description: 'This would navigate to the documents page' })}
              />
            </div>
          </div>
        </div>
      </main>
      
      {/* WebSocket connection indicator - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 px-2 py-1 text-xs rounded-md bg-gray-800 text-white opacity-70">
          {isWebSocketConnected ? 'WebSocket: Connected' : 'WebSocket: Disconnected'}
        </div>
      )}
    </div>
  );
}
