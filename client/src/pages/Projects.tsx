import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { getProjects } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Share, Settings } from 'lucide-react';

export default function Projects() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: projectsData, isLoading, isError } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: getProjects,
    retry: 0,
    refetchOnWindowFocus: false
  });
  
  // Extract the actual projects array from the response
  const projects = projectsData?.data || [];
  
  // Filter projects based on search query
  const filteredProjects = Array.isArray(projects) 
    ? projects.filter(project => 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      )
    : [];
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
      case 'planning':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'on_hold':
      case 'on hold':
        return 'bg-gray-500';
      case 'archived':
        return 'bg-gray-400';
      default:
        return 'bg-blue-500';
    }
  };
    
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search projects..."
              className="w-64 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <Button 
            onClick={() => toast({
              title: "Create Project",
              description: "This would open a create project form"
            })}
          >
            <Plus className="h-4 w-4 mr-2" /> New Project
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mb-4"></div>
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects?.map(project => (
            <Card key={project.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" /> View
                </Button>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => toast({ 
                    title: "Share Project", 
                    description: `Share ${project.name} with team members`
                  })}>
                    <Share className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({ 
                    title: "Project Settings", 
                    description: `Edit settings for ${project.name}`
                  })}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          
          {filteredProjects?.length === 0 && (
            <div className="col-span-full flex justify-center items-center h-64">
              <div className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No projects found</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your search or create a new project</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
