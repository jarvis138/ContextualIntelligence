import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, ArrowLeft, Calendar, Clock, Download, Users, Share, Brain, Lightbulb } from 'lucide-react';
import { SlackDataExtractor } from '@/components/integrations/SlackDataExtractor';
import { SlackShareDialog } from '@/components/integrations/SlackShareDialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Integration } from '@shared/schema';

interface ProjectDetailProps {
  params: {
    id: string;
  };
}

export default function ProjectDetail({ params }: ProjectDetailProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const projectId = parseInt(params.id);
  
  // Default user (would come from authentication)
  const user = {
    id: 1,
    username: 'alexmorgan',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Project Manager'
  };

  // Fetch project details
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      return await res.json();
    }
  });

  // Fetch team members (simplified)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/team-members'],
    queryFn: async () => {
      // Normally we'd fetch this from the API, but for now return mock data
      return [
        { id: 1, fullName: 'Alex Morgan', avatar: user.avatar },
        { id: 2, fullName: 'Jamie Smith', avatar: null },
        { id: 3, fullName: 'Taylor Kim', avatar: null }
      ];
    }
  });

  // Fetch project tasks
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}/tasks`);
      return await res.json();
    }
  });

  // Fetch project activities
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: [`/api/projects/${projectId}/activities`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}/activities`);
      return await res.json();
    }
  });

  // Fetch project documents
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: [`/api/projects/${projectId}/documents`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}/documents`);
      return await res.json();
    }
  });

  // Fetch user integrations (for Slack)
  const { data: integrations = [] } = useQuery({
    queryKey: [`/api/users/${user.id}/integrations`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${user.id}/integrations`);
      return await res.json();
    }
  });

  // Find Slack integration if exists
  const slackIntegration = integrations.find((i: Integration) => i.type === 'slack' && i.active);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'on hold': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  if (isLoadingProject) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="flex justify-center items-center h-screen">
            <div className="text-center">
              <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
              <p className="text-gray-500">Loading project details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="flex justify-center items-center h-screen">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Project Not Found</h2>
              <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or you don't have access.</p>
              <Button onClick={() => setLocation('/projects')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <TopBar 
          project={project} 
          teamMembers={teamMembers}
          onSearch={(query) => setSearchQuery(query)}
        />
        
        <div className="p-6">
          {/* Project Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-8 w-8"
                  onClick={() => setLocation('/projects')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
                <div className={`px-2 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(project.status)}`}>
                  {project.status}
                </div>
              </div>
              <p className="text-gray-500 mt-1">{project.description}</p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => setShowShareDialog(true)}
                disabled={!slackIntegration}
              >
                <Share className="mr-2 h-4 w-4" /> Share to Slack
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation(`/projects/${projectId}/insights`)}
              >
                <Lightbulb className="mr-2 h-4 w-4" /> Project Insights
              </Button>
              <Button>
                <Users className="mr-2 h-4 w-4" /> Manage Team
              </Button>
            </div>
          </div>

          {/* Project Progress */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Project Progress</h2>
                  <p className="text-sm text-gray-500">Overall completion status</p>
                </div>
                <div className="flex items-center space-x-4 mt-2 md:mt-0">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-600">Started: {formatDate(project.createdAt || new Date().toISOString())}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-600">Updated: {formatDate(project.updatedAt || new Date().toISOString())}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-medium text-gray-700">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Tasks</CardTitle>
                    <CardDescription>Project tasks summary</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800 mb-2">
                      {tasks.length}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Completed</span>
                        <span className="font-medium">{tasks.filter((t: any) => t.status === 'completed').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">In Progress</span>
                        <span className="font-medium">{tasks.filter((t: any) => t.status === 'in_progress').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Pending</span>
                        <span className="font-medium">{tasks.filter((t: any) => t.status === 'pending').length}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => toast({ title: "View Tasks", description: "This would navigate to tasks tab" })}>
                      View All Tasks
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Documents</CardTitle>
                    <CardDescription>Project documentation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800 mb-2">
                      {documents.length}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Text Documents</span>
                        <span className="font-medium">{documents.filter((d: any) => d.fileType === 'text').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Spreadsheets</span>
                        <span className="font-medium">{documents.filter((d: any) => d.fileType === 'spreadsheet').length}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Other Files</span>
                        <span className="font-medium">{documents.filter((d: any) => !['text', 'spreadsheet'].includes(d.fileType)).length}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => toast({ title: "View Documents", description: "This would navigate to documents tab" })}>
                      View All Documents
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Team</CardTitle>
                    <CardDescription>Project team members</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800 mb-2">
                      {teamMembers.length}
                    </div>
                    <div className="flex mt-4">
                      <div className="flex -space-x-4">
                        {teamMembers.map(member => (
                          <img 
                            key={`team-member-${member.id}`}
                            className="w-10 h-10 rounded-full border-2 border-white" 
                            src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}`} 
                            alt={member.fullName} 
                            title={member.fullName}
                          />
                        ))}
                        {teamMembers.length > 3 && (
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-sm text-gray-600">
                            +{teamMembers.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => toast({ title: "View Team", description: "This would navigate to team page" })}>
                      View Team
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="tasks" className="space-y-6">
              {isLoadingTasks ? (
                <div className="text-center py-12">
                  <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
                  <p className="text-gray-500">Loading tasks...</p>
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map((task: any) => (
                    <Card key={task.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">Due: {formatDate(task.dueDate)}</span>
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">Assignee: {task.assigneeName || 'Unassigned'}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 text-xs font-medium text-white rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' : 
                            task.status === 'in_progress' ? 'bg-blue-500' : 
                            'bg-yellow-500'
                          }`}>
                            {task.status?.replace('_', ' ')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <div className="ri-file-list-3-line text-4xl text-gray-300 mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-700">No tasks found</h3>
                  <p className="text-gray-500 mt-1">This project doesn't have any tasks yet</p>
                  <Button className="mt-4">Create Task</Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-6">
              {isLoadingDocuments ? (
                <div className="text-center py-12">
                  <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
                  <p className="text-gray-500">Loading documents...</p>
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-4">
                  {documents.map((doc: any) => (
                    <Card key={doc.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{doc.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{doc.content.substring(0, 100)}...</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-500">Updated: {formatDate(doc.updatedAt)}</span>
                              </div>
                              <div className="flex items-center">
                                <div className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-600">
                                  {doc.fileType}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <div className="ri-file-text-line text-4xl text-gray-300 mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-700">No documents found</h3>
                  <p className="text-gray-500 mt-1">This project doesn't have any documents yet</p>
                  <Button className="mt-4">Upload Document</Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-6">
              {isLoadingActivities ? (
                <div className="text-center py-12">
                  <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
                  <p className="text-gray-500">Loading activities...</p>
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity: any) => (
                    <Card key={activity.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <img 
                              className="w-8 h-8 rounded-full" 
                              src={activity.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.user?.fullName || '')}`} 
                              alt={activity.user?.fullName} 
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <div>
                                <span className="font-medium text-gray-900">{activity.user?.fullName}</span> 
                                <span className="text-gray-500"> {activity.description}</span>
                              </div>
                              <span className="text-xs text-gray-500">{formatDate(activity.timestamp || activity.createdAt)}</span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {activity.entityType === 'task' && 'Updated task status'}
                              {activity.entityType === 'document' && 'Modified document'}
                              {activity.entityType === 'slack_message' && 'From Slack integration'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <div className="ri-history-line text-4xl text-gray-300 mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-700">No activities found</h3>
                  <p className="text-gray-500 mt-1">This project doesn't have any activities yet</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="integrations" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SlackDataExtractor 
                  userId={user.id}
                  projectId={projectId} 
                  slackIntegration={slackIntegration}
                />
                
                {/* Placeholder for other integrations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <i className="ri-github-fill text-gray-700"></i>
                      GitHub Integration
                    </CardTitle>
                    <CardDescription>
                      Connect your GitHub repository
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      <p className="text-sm">GitHub integration is not configured yet.</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => toast({ 
                        title: "GitHub Integration", 
                        description: "This would open the GitHub integration dialog"
                      })}
                    >
                      <i className="ri-github-line mr-2"></i> Connect GitHub
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {slackIntegration && (
        <SlackShareDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          userId={user.id}
          projectId={projectId}
          projectName={project.name}
          slackIntegration={slackIntegration}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] });
          }}
        />
      )}
    </div>
  );
}