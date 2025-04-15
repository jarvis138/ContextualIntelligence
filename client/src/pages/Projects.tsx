import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Share, Settings } from 'lucide-react';

export default function Projects() {
  const { toast } = useToast();
  
  // Demo projects data
  const demoProjects = [
    {
      id: 1,
      name: "Project Intelligence Hub",
      description: "A centralized platform for project analytics and insights",
      status: "active",
      progress: 75
    },
    {
      id: 2,
      name: "Data Integration Framework",
      description: "Framework for integrating data from various sources",
      status: "planning",
      progress: 25
    },
    {
      id: 3,
      name: "AI Analytics Dashboard",
      description: "Advanced analytics dashboard with AI-powered insights",
      status: "completed",
      progress: 100
    }
  ];
  
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoProjects.map(project => (
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
                onClick={() => toast({
                  title: "View Project",
                  description: `You clicked to view ${project.name}`
                })}
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
      </div>
    </div>
  );
}
