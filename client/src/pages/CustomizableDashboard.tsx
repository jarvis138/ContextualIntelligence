import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, WebSocketMessage } from '@/lib/types';
import {
  LayoutGridIcon,
  PlusIcon,
  XIcon,
  Maximize2Icon,
  Minimize2Icon,
  Settings2Icon,
  SaveIcon,
  UndoIcon,
  MoveIcon,
  LayoutPanelTopIcon
} from 'lucide-react';

// Dashboard widget types
type WidgetType = 
  | 'summary-cards'
  | 'project-progress'
  | 'team-progress'
  | 'relationship-network'
  | 'ai-insights'
  | 'recent-activities'
  | 'team-overview'
  | 'recent-documents'
  | 'custom-chart';

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: number;
  expanded?: boolean;
  config?: any;
}

// Available widgets configuration
const availableWidgets: Array<Omit<DashboardWidget, 'id' | 'position'>> = [
  { type: 'summary-cards', title: 'Project Summary', size: 'full' },
  { type: 'project-progress', title: 'Project Progress', size: 'medium' },
  { type: 'team-progress', title: 'Team Progress', size: 'medium' },
  { type: 'relationship-network', title: 'Relationship Network', size: 'large' },
  { type: 'ai-insights', title: 'AI Insights', size: 'large' },
  { type: 'recent-activities', title: 'Recent Activities', size: 'medium' },
  { type: 'team-overview', title: 'Team Overview', size: 'medium' },
  { type: 'recent-documents', title: 'Recent Documents', size: 'medium' },
  { type: 'custom-chart', title: 'Custom Chart', size: 'medium' },
];

// Default dashboard layout
const defaultDashboardLayout: DashboardWidget[] = [
  { id: 'widget-1', type: 'summary-cards', title: 'Project Summary', size: 'full', position: 0 },
  { id: 'widget-2', type: 'project-progress', title: 'Project Progress', size: 'medium', position: 1 },
  { id: 'widget-3', type: 'team-progress', title: 'Team Progress', size: 'medium', position: 2 },
  { id: 'widget-4', type: 'relationship-network', title: 'Relationship Network', size: 'large', position: 3 },
  { id: 'widget-5', type: 'ai-insights', title: 'AI Insights', size: 'large', position: 4 },
  { id: 'widget-6', type: 'recent-activities', title: 'Recent Activities', size: 'medium', position: 5 },
  { id: 'widget-7', type: 'recent-documents', title: 'Recent Documents', size: 'medium', position: 6 },
];

export default function CustomizableDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [realtimeActivities, setRealtimeActivities] = useState<Activity[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardWidget[]>(defaultDashboardLayout);
  const [showAddWidgetDialog, setShowAddWidgetDialog] = useState(false);
  
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
  
  // Load saved layout from local storage
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboardLayout');
    if (savedLayout) {
      try {
        setDashboardLayout(JSON.parse(savedLayout));
      } catch (error) {
        console.error('Failed to parse saved dashboard layout', error);
      }
    }
  }, []);
  
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
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      // Save layout when exiting edit mode
      localStorage.setItem('dashboardLayout', JSON.stringify(dashboardLayout));
      toast({
        title: 'Dashboard Saved',
        description: 'Your dashboard layout has been saved.',
      });
    }
  };
  
  // Reset dashboard to default
  const resetDashboard = () => {
    setDashboardLayout(defaultDashboardLayout);
    localStorage.removeItem('dashboardLayout');
    toast({
      title: 'Dashboard Reset',
      description: 'Your dashboard has been reset to the default layout.',
    });
  };
  
  // Add a new widget
  const addWidget = (widgetType: WidgetType) => {
    const widgetTemplate = availableWidgets.find(w => w.type === widgetType);
    if (!widgetTemplate) return;
    
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      title: widgetTemplate.title,
      size: widgetTemplate.size,
      position: dashboardLayout.length,
    };
    
    setDashboardLayout([...dashboardLayout, newWidget]);
    setShowAddWidgetDialog(false);
  };
  
  // Remove a widget
  const removeWidget = (widgetId: string) => {
    const updatedLayout = dashboardLayout.filter(widget => widget.id !== widgetId);
    // Update positions
    const repositioned = updatedLayout.map((widget, index) => ({
      ...widget,
      position: index
    }));
    setDashboardLayout(repositioned);
  };
  
  // Toggle widget expansion
  const toggleWidgetExpansion = (widgetId: string) => {
    setDashboardLayout(dashboardLayout.map(widget => {
      if (widget.id === widgetId) {
        return { ...widget, expanded: !widget.expanded };
      }
      return widget;
    }));
  };
  
  // Change widget size
  const changeWidgetSize = (widgetId: string, newSize: DashboardWidget['size']) => {
    setDashboardLayout(dashboardLayout.map(widget => {
      if (widget.id === widgetId) {
        return { ...widget, size: newSize };
      }
      return widget;
    }));
  };
  
  // Move widget up or down
  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const currentIndex = dashboardLayout.findIndex(w => w.id === widgetId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === dashboardLayout.length - 1)
    ) {
      return; // Can't move further
    }
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newLayout = [...dashboardLayout];
    const widget = newLayout[currentIndex];
    newLayout.splice(currentIndex, 1);
    newLayout.splice(newIndex, 0, widget);
    
    // Update positions
    const repositioned = newLayout.map((widget, index) => ({
      ...widget,
      position: index
    }));
    setDashboardLayout(repositioned);
  };
  
  // Merge real-time activities with fetched activities
  const activities = [...realtimeActivities, ...(dashboardData?.recentActivities || [])].slice(0, 5);
  
  // Determine grid span classes based on widget size and expanded state
  const getWidgetGridSpan = (widget: DashboardWidget) => {
    if (widget.expanded) return 'col-span-12';
    
    switch(widget.size) {
      case 'small': return 'col-span-12 md:col-span-4';
      case 'medium': return 'col-span-12 md:col-span-6';
      case 'large': return 'col-span-12 md:col-span-8';
      case 'full': return 'col-span-12';
      default: return 'col-span-12 md:col-span-6';
    }
  };
  
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
  
  // Extract team members for top bar with unique keys
  const teamMembers = dashboardData?.teams.reduce((acc, team, index) => {
    // Create a unique user object for each team to avoid duplicate keys
    const uniqueUser = { 
      ...user, 
      id: user.id + index + 1 // Ensure each user has a unique ID
    };
    return [...acc, uniqueUser];
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
        
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Dashboard Controls */}
          <div className="flex flex-wrap justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            
            <div className="flex items-center space-x-2">
              {isEditMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetDashboard}
                    className="flex items-center gap-1"
                  >
                    <UndoIcon className="h-4 w-4" />
                    Reset
                  </Button>
                  
                  <Dialog open={showAddWidgetDialog} onOpenChange={setShowAddWidgetDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Widget
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Widget to Dashboard</DialogTitle>
                        <DialogDescription>
                          Select a widget to add to your dashboard.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        {availableWidgets.map(widget => (
                          <Button
                            key={widget.type}
                            variant="outline"
                            className="flex flex-col items-center justify-center h-24 gap-2 p-4"
                            onClick={() => addWidget(widget.type)}
                          >
                            <div className="text-xl">
                              {widget.type === 'summary-cards' && <LayoutGridIcon className="h-6 w-6" />}
                              {widget.type === 'project-progress' && <LayoutPanelTopIcon className="h-6 w-6" />}
                              {widget.type === 'team-progress' && <LayoutPanelTopIcon className="h-6 w-6" />}
                              {widget.type === 'relationship-network' && <LayoutGridIcon className="h-6 w-6" />}
                              {widget.type === 'ai-insights' && <LayoutPanelTopIcon className="h-6 w-6" />}
                              {widget.type === 'recent-activities' && <LayoutPanelTopIcon className="h-6 w-6" />}
                              {widget.type === 'team-overview' && <LayoutPanelTopIcon className="h-6 w-6" />}
                              {widget.type === 'recent-documents' && <LayoutPanelTopIcon className="h-6 w-6" />}
                              {widget.type === 'custom-chart' && <LayoutPanelTopIcon className="h-6 w-6" />}
                            </div>
                            <span className="text-sm">{widget.title}</span>
                          </Button>
                        ))}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddWidgetDialog(false)}>
                          Cancel
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={toggleEditMode}
                className="flex items-center gap-1"
              >
                {isEditMode ? (
                  <>
                    <SaveIcon className="h-4 w-4" />
                    Save Layout
                  </>
                ) : (
                  <>
                    <Settings2Icon className="h-4 w-4" />
                    Customize
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Dashboard Widgets */}
          <div className="grid grid-cols-12 gap-6">
            {dashboardLayout
              .sort((a, b) => a.position - b.position)
              .map(widget => (
                <div 
                  key={widget.id}
                  className={`${getWidgetGridSpan(widget)} transition-all duration-300`}
                >
                  <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                      <CardTitle className="text-base font-medium">{widget.title}</CardTitle>
                      
                      {isEditMode ? (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveWidget(widget.id, 'up')}
                            disabled={widget.position === 0}
                          >
                            <i className="ri-arrow-up-line h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveWidget(widget.id, 'down')}
                            disabled={widget.position === dashboardLayout.length - 1}
                          >
                            <i className="ri-arrow-down-line h-4 w-4" />
                          </Button>
                          
                          <Select
                            value={widget.size}
                            onValueChange={(value: any) => changeWidgetSize(widget.id, value)}
                          >
                            <SelectTrigger className="h-8 w-24">
                              <SelectValue placeholder="Size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                              <SelectItem value="full">Full</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeWidget(widget.id)}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleWidgetExpansion(widget.id)}
                        >
                          {widget.expanded ? (
                            <Minimize2Icon className="h-4 w-4" />
                          ) : (
                            <Maximize2Icon className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      {/* Render widget content based on type */}
                      {widget.type === 'summary-cards' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      )}
                      
                      {widget.type === 'project-progress' && (
                        <ProjectProgressChart 
                          activities={dashboardData?.recentActivities as any[] || []} 
                        />
                      )}
                      
                      {widget.type === 'team-progress' && (
                        <TeamProgressChart 
                          teams={dashboardData?.teams || []} 
                        />
                      )}
                      
                      {widget.type === 'relationship-network' && (
                        <RelationshipNetworkChart relationships={relationships || []} />
                      )}
                      
                      {widget.type === 'ai-insights' && (
                        <AIInsights
                          projectId={projectId}
                          summary={`The ${dashboardData?.project.name} project is ${dashboardData?.project.progress}% complete with ${dashboardData?.summaryCards.activeTasks} active tasks.`}
                          insights={dashboardData?.insights || []}
                          lastUpdated={dashboardData?.insights[0]?.timestamp || new Date().toISOString()}
                        />
                      )}
                      
                      {widget.type === 'recent-activities' && (
                        <RecentActivities
                          activities={activities}
                          onViewAll={() => toast({ title: 'View All Activities', description: 'This would navigate to a full activities page' })}
                        />
                      )}
                      
                      {widget.type === 'team-overview' && (
                        <TeamOverview
                          teams={dashboardData?.teams || []}
                          onViewAll={() => toast({ title: 'View All Teams', description: 'This would navigate to the teams page' })}
                        />
                      )}
                      
                      {widget.type === 'recent-documents' && (
                        <RecentDocuments
                          documents={dashboardData?.recentDocuments || []}
                          onViewAll={() => toast({ title: 'View All Documents', description: 'This would navigate to the documents page' })}
                        />
                      )}
                      
                      {widget.type === 'custom-chart' && (
                        <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-md border border-dashed border-gray-300">
                          <p className="text-muted-foreground">Custom Chart Widget</p>
                          <p className="text-xs text-muted-foreground">Configure this widget in edit mode</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
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