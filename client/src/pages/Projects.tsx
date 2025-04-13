import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Projects() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: getProjects
  });
  
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
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'on hold':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  // Default user
  const user = {
    id: 1,
    username: 'alexmorgan',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Project Manager'
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
            
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
                  <i className="ri-search-line text-gray-400"></i>
                </div>
              </div>
              
              <Button 
                onClick={() => toast({
                  title: "Create Project",
                  description: "This would open a create project form"
                })}
              >
                <i className="ri-add-line mr-1"></i> New Project
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
                <p className="text-gray-500">Loading projects...</p>
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
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm font-medium text-gray-700">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4 flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => toast({ 
                      title: "Project Details", 
                      description: `View details for ${project.name}`
                    })}>
                      <i className="ri-eye-line mr-1"></i> View
                    </Button>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => toast({ 
                        title: "Share Project", 
                        description: `Share ${project.name} with team members`
                      })}>
                        <i className="ri-share-line"></i>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toast({ 
                        title: "Project Settings", 
                        description: `Edit settings for ${project.name}`
                      })}>
                        <i className="ri-settings-line"></i>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
              
              {filteredProjects?.length === 0 && (
                <div className="col-span-full flex justify-center items-center h-64">
                  <div className="text-center">
                    <div className="ri-file-search-line text-4xl text-gray-400 mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-700">No projects found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or create a new project</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
