import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Eye, Share, Settings, Calendar, Users, CheckCircle2, X, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Projects() {
  const { toast } = useToast();
  
  // States for dialogs
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [viewProjectOpen, setViewProjectOpen] = useState(false);
  const [shareProjectOpen, setShareProjectOpen] = useState(false);
  const [settingsProjectOpen, setSettingsProjectOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  
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
            onClick={() => setCreateProjectOpen(true)}
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
                onClick={() => {
                  setCurrentProject(project);
                  setViewProjectOpen(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" /> View
              </Button>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setCurrentProject(project);
                    setShareProjectOpen(true);
                  }}
                >
                  <Share className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setCurrentProject(project);
                    setSettingsProjectOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {/* Create Project Dialog */}
      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to your workspace. Fill out the details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" placeholder="Enter project name" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe the project purpose and goals" 
                className="min-h-[100px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="planning">
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select defaultValue="frontend">
                  <SelectTrigger>
                    <SelectValue placeholder="Assign team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frontend">Frontend Team</SelectItem>
                    <SelectItem value="backend">Backend Team</SelectItem>
                    <SelectItem value="design">Design Team</SelectItem>
                    <SelectItem value="qa">QA Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Project created",
                description: "Your new project has been created successfully"
              });
              setCreateProjectOpen(false);
            }}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Project Dialog */}
      {currentProject && (
        <Dialog open={viewProjectOpen} onOpenChange={setViewProjectOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{currentProject.name}</DialogTitle>
              <DialogDescription>
                Project overview and details
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div className="mt-1 flex items-center">
                    <div className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(currentProject.status)}`}></div>
                    <span className="font-medium capitalize">{currentProject.status}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
                  <div className="mt-1 flex items-center">
                    <Progress value={currentProject.progress} className="h-2 w-24 mr-3" />
                    <span>{currentProject.progress}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p>{currentProject.description}</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Team Members</h3>
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="h-8 w-8 rounded-full bg-primary/10 border border-background flex items-center justify-center text-xs font-medium"
                    >
                      {i}
                    </div>
                  ))}
                  <div className="h-8 w-8 rounded-full bg-primary/5 border border-background flex items-center justify-center text-xs">
                    +3
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    { user: 'Sarah Chen', action: 'added a new document', time: '2 hours ago' },
                    { user: 'Mark Johnson', action: 'completed a task', time: 'yesterday' },
                    { user: 'Lisa Wong', action: 'created a milestone', time: '3 days ago' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start text-sm">
                      <div className="h-5 w-5 rounded-full bg-primary/10 mr-2 flex-shrink-0"></div>
                      <div>
                        <span className="font-medium">{activity.user}</span>
                        <span className="text-muted-foreground"> {activity.action}</span>
                        <div className="text-xs text-muted-foreground">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setViewProjectOpen(false);
                  setCurrentProject(currentProject);
                  setShareProjectOpen(true);
                }}>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline
                </Button>
              </div>
              <Button onClick={() => setViewProjectOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Share Project Dialog */}
      {currentProject && (
        <Dialog open={shareProjectOpen} onOpenChange={setShareProjectOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Share Project</DialogTitle>
              <DialogDescription>
                Share {currentProject.name} with team members or external collaborators
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>People with access</Label>
                <div className="space-y-3">
                  {[
                    { name: 'Sarah Chen', email: 'sarah.c@example.com', role: 'Editor' },
                    { name: 'Mark Johnson', email: 'mark.j@example.com', role: 'Viewer' },
                    { name: 'Lisa Wong', email: 'lisa.w@example.com', role: 'Owner' },
                  ].map((person, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 mr-3 flex items-center justify-center text-xs font-medium">
                          {person.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{person.name}</div>
                          <div className="text-xs text-muted-foreground">{person.email}</div>
                        </div>
                      </div>
                      <Select defaultValue={person.role.toLowerCase()}>
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Add people</Label>
                <div className="flex space-x-2">
                  <Input placeholder="Add email or name" className="flex-1" />
                  <Select defaultValue="editor">
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Share link</Label>
                <div className="flex space-x-2">
                  <Input value="https://cpihub.com/project/123" readOnly className="flex-1" />
                  <Button variant="outline" size="sm" onClick={() => {
                    toast({
                      title: "Link copied",
                      description: "Project link has been copied to clipboard"
                    });
                  }}>
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShareProjectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Sharing updated",
                  description: "Project sharing settings have been updated"
                });
                setShareProjectOpen(false);
              }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Project Settings Dialog */}
      {currentProject && (
        <Dialog open={settingsProjectOpen} onOpenChange={setSettingsProjectOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Project Settings</DialogTitle>
              <DialogDescription>
                Configure settings for {currentProject.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" defaultValue={currentProject.name} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  defaultValue={currentProject.description}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select defaultValue={currentProject.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="progress">Progress</Label>
                  <div className="flex items-center space-x-4">
                    <Input 
                      id="progress" 
                      type="number" 
                      min="0"
                      max="100"
                      defaultValue={currentProject.progress} 
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Danger Zone</Label>
                <div className="border border-destructive/20 rounded-md p-4">
                  <h4 className="font-medium text-destructive mb-2">Archive Project</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    This action will archive the project and make it read-only. It can be restored later.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Project archived",
                        description: "The project has been moved to archives",
                        variant: "destructive"
                      });
                    }}
                  >
                    Archive Project
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsProjectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast({
                  title: "Settings saved",
                  description: "Project settings have been updated successfully"
                });
                setSettingsProjectOpen(false);
              }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
