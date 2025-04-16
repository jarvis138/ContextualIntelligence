import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Plus, 
  BarChart, 
  MoreHorizontal,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  Star,
  Filter,
  ChevronUp,
  ChevronDown,
  UserPlus,
  Shield,
  Activity,
  Brain,
  Share2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TeamsPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<string>("grid");

  // Demo data for teams
  const teams = [
    {
      id: 1,
      name: "Frontend Team",
      icon: "code-square",
      members: 5,
      lead: { id: 1, name: "Sarah Chen", avatar: "/avatars/02.png", role: "UI/UX Designer" },
      description: "Responsible for UI development",
      progress: 85,
      workload: 72,
      capacity: 85,
      tasks: { completed: 32, inProgress: 8, total: 45 },
      skills: ["React", "TypeScript", "UI/UX Design", "Tailwind CSS"],
      projects: [
        { id: 1, name: "Web Application Redesign" }
      ]
    },
    {
      id: 2,
      name: "Backend Team",
      icon: "database",
      members: 4,
      lead: { id: 2, name: "Mark Johnson", avatar: "/avatars/03.png", role: "Senior Backend Developer" },
      description: "Responsible for API and database",
      progress: 43,
      workload: 90,
      capacity: 80,
      tasks: { completed: 18, inProgress: 12, total: 38 },
      skills: ["Node.js", "PostgreSQL", "Express", "API Design"],
      projects: [
        { id: 1, name: "Web Application Redesign" }
      ]
    },
    {
      id: 3,
      name: "Design Team",
      icon: "pen-nib",
      members: 3,
      lead: { id: 3, name: "Lisa Wong", avatar: "/avatars/04.png", role: "Design Lead" },
      description: "Responsible for UX/UI design",
      progress: 92,
      workload: 60,
      capacity: 90,
      tasks: { completed: 29, inProgress: 2, total: 32 },
      skills: ["UI Design", "User Research", "Figma", "Prototyping"],
      projects: [
        { id: 1, name: "Web Application Redesign" }
      ]
    },
    {
      id: 4,
      name: "QA Team",
      icon: "test-tube",
      members: 2,
      lead: { id: 4, name: "David Kim", avatar: "/avatars/05.png", role: "QA Lead" },
      description: "Responsible for testing",
      progress: 65,
      workload: 75,
      capacity: 70,
      tasks: { completed: 24, inProgress: 5, total: 40 },
      skills: ["Manual Testing", "Automated Testing", "Test Planning", "Issue Tracking"],
      projects: [
        { id: 1, name: "Web Application Redesign" }
      ]
    }
  ];

  // Team members for demo
  const teamMembers = [
    { id: 1, name: "Sarah Chen", avatar: "/avatars/02.png", role: "UI/UX Designer", team: "Frontend Team", availability: 85, tasks: 8, skills: ["UI Design", "Figma", "CSS", "React"] },
    { id: 2, name: "Mark Johnson", avatar: "/avatars/03.png", role: "Senior Backend Developer", team: "Backend Team", availability: 60, tasks: 12, skills: ["Node.js", "API Design", "Database", "AWS"] },
    { id: 3, name: "Lisa Wong", avatar: "/avatars/04.png", role: "Design Lead", team: "Design Team", availability: 90, tasks: 5, skills: ["UI/UX", "Design Systems", "User Research", "Prototyping"] },
    { id: 4, name: "David Kim", avatar: "/avatars/05.png", role: "QA Lead", team: "QA Team", availability: 75, tasks: 10, skills: ["Test Planning", "Manual Testing", "Automation", "Quality Control"] },
    { id: 5, name: "James Wilson", avatar: "/avatars/01.png", role: "Frontend Developer", team: "Frontend Team", availability: 70, tasks: 7, skills: ["JavaScript", "React", "CSS", "HTML"] },
    { id: 6, name: "Emily Zhang", avatar: "/avatars/01.png", role: "Backend Developer", team: "Backend Team", availability: 80, tasks: 9, skills: ["Python", "API Design", "Database", "Docker"] },
    { id: 7, name: "Michael Brown", avatar: "/avatars/02.png", role: "UI Designer", team: "Design Team", availability: 95, tasks: 3, skills: ["UI Design", "Illustration", "Wireframing", "Figma"] },
    { id: 8, name: "Jessica Lee", avatar: "/avatars/03.png", role: "Frontend Developer", team: "Frontend Team", availability: 65, tasks: 11, skills: ["React", "Redux", "TypeScript", "Jest"] },
    { id: 9, name: "Robert Garcia", avatar: "/avatars/04.png", role: "Backend Developer", team: "Backend Team", availability: 75, tasks: 8, skills: ["Node.js", "Express", "MongoDB", "RESTful APIs"] },
    { id: 10, name: "Sophia Martinez", avatar: "/avatars/05.png", role: "QA Engineer", team: "QA Team", availability: 90, tasks: 5, skills: ["Automated Testing", "Test Cases", "Bug Tracking", "Selenium"] },
  ];

  // Function to handle creating a new team
  const handleCreateTeam = () => {
    toast({
      title: "Create Team",
      description: "Team creation dialog would open here",
    });
  };

  // Function to handle inviting a team member
  const handleInviteMember = () => {
    toast({
      title: "Invite Team Member",
      description: "Member invitation dialog would open here",
    });
  };

  const getTeamIcon = (icon: string) => {
    switch (icon) {
      case "code-square":
        return (
          <div className="h-6 w-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 16 4-4-4-4"></path>
              <path d="m6 8-4 4 4 4"></path>
              <path d="m14.5 4-5 16"></path>
            </svg>
          </div>
        );
      case "database":
        return (
          <div className="h-6 w-6 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
          </div>
        );
      case "pen-nib":
        return (
          <div className="h-6 w-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19 7-7 3 3-7 7-3-3z"></path>
              <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="m2 2 7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
          </div>
        );
      case "test-tube":
        return (
          <div className="h-6 w-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"></path>
              <path d="M8.5 2h7"></path>
              <path d="M14.5 16h-5"></path>
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage team structure, members, and performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleInviteMember}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
          <Button onClick={handleCreateTeam}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>

      <div className="flex justify-between">
        <div className="flex space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search teams or members..."
              className="pl-8"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="active">High Workload</SelectItem>
              <SelectItem value="completed">Available Capacity</SelectItem>
              <SelectItem value="inactive">High Performance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-9 w-9 p-0 flex items-center justify-center"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="h-4 w-4"
            >
              <rect width="7" height="7" x="3" y="3" rx="1"></rect>
              <rect width="7" height="7" x="14" y="3" rx="1"></rect>
              <rect width="7" height="7" x="14" y="14" rx="1"></rect>
              <rect width="7" height="7" x="3" y="14" rx="1"></rect>
            </svg>
          </Button>
          <Button 
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-9 w-9 p-0 flex items-center justify-center"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="h-4 w-4"
            >
              <line x1="8" x2="21" y1="6" y2="6"></line>
              <line x1="8" x2="21" y1="12" y2="12"></line>
              <line x1="8" x2="21" y1="18" y2="18"></line>
              <line x1="3" x2="3.01" y1="6" y2="6"></line>
              <line x1="3" x2="3.01" y1="12" y2="12"></line>
              <line x1="3" x2="3.01" y1="18" y2="18"></line>
            </svg>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">
            <Users className="h-4 w-4 mr-2" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="members">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 mr-2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Members
          </TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-6">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        {getTeamIcon(team.icon)}
                        <CardTitle className="ml-2">{team.name}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Team</DropdownMenuItem>
                          <DropdownMenuItem>Edit Team</DropdownMenuItem>
                          <DropdownMenuItem>Message Team</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Delete Team</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="mt-1">{team.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Project Progress</span>
                          <span className="font-medium">{team.progress}%</span>
                        </div>
                        <Progress value={team.progress} className="h-2" />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">Team Lead</div>
                          <div className="flex items-center mt-1">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={team.lead.avatar} alt={team.lead.name} />
                              <AvatarFallback>{team.lead.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{team.lead.name}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Members</div>
                          <div className="flex justify-end mt-1">
                            <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                              <Users className="h-3.5 w-3.5 inline-block mr-1" />
                              {team.members}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-2 text-sm border-t">
                        <div>
                          <div className="text-muted-foreground">Workload</div>
                          <div className={`font-medium ${team.workload > 80 ? 'text-red-500' : team.workload > 60 ? 'text-amber-500' : 'text-green-500'}`}>
                            {team.workload}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Capacity</div>
                          <div className="font-medium">{team.capacity}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Tasks</div>
                          <div className="font-medium">{team.tasks.completed}/{team.tasks.total}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm">
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      View Members
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Workload</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <div className="flex items-center">
                          {getTeamIcon(team.icon)}
                          <span className="ml-2 font-medium">{team.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={team.lead.avatar} alt={team.lead.name} />
                            <AvatarFallback>{team.lead.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{team.lead.name}</div>
                            <div className="text-xs text-muted-foreground">{team.lead.role}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full w-fit">
                          <Users className="h-3.5 w-3.5 inline-block mr-1" />
                          {team.members}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{team.progress}%</span>
                          </div>
                          <Progress value={team.progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={team.workload > 80 ? 'destructive' : team.workload > 60 ? 'default' : 'outline'}>
                          {team.workload}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {team.tasks.completed}/{team.tasks.total} completed
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.team}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.slice(0, 2).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {member.skills.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{member.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Available</span>
                          <span>{member.availability}%</span>
                        </div>
                        <Progress 
                          value={member.availability} 
                          className="h-2" 
                          style={{
                            color: member.availability > 80 ? "rgb(34, 197, 94)" : 
                                  member.availability > 50 ? "rgb(234, 179, 8)" : 
                                  "rgb(239, 68, 68)"
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.tasks} active</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">78%</div>
                <p className="text-xs text-muted-foreground mt-1">+5% from previous month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Average Team Workload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">74%</div>
                <p className="text-xs text-muted-foreground mt-1">-2% from previous month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team Capacity Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">81%</div>
                <p className="text-xs text-muted-foreground mt-1">+3% from previous month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Team Performance Comparison</CardTitle>
              <CardDescription>
                Completion rates, workload, and capacity utilization by team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {teams.map((team) => (
                  <div key={team.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getTeamIcon(team.icon)}
                        <span className="font-medium ml-2">{team.name}</span>
                      </div>
                      <Badge variant="outline">
                        {team.tasks.completed}/{team.tasks.total} tasks
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{team.progress}%</span>
                        </div>
                        <Progress value={team.progress} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Workload</span>
                          <span className={team.workload > 80 ? 'text-red-500' : team.workload > 60 ? 'text-amber-500' : 'text-green-500'}>
                            {team.workload}%
                          </span>
                        </div>
                        <Progress 
                          value={team.workload} 
                          className="h-2" 
                          style={{
                            color: team.workload > 80 ? "rgb(239, 68, 68)" : 
                                 team.workload > 60 ? "rgb(234, 179, 8)" : 
                                 "rgb(34, 197, 94)"
                          }}
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Capacity</span>
                          <span>{team.capacity}%</span>
                        </div>
                        <Progress value={team.capacity} className="h-2" style={{ color: "rgb(59, 130, 246)" }} />
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <div className="text-sm font-medium mb-2">Key Performance Indicators</div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="rounded-md border p-2">
                          <div className="text-xs text-muted-foreground">Tasks Completed</div>
                          <div className="font-medium mt-1">{team.tasks.completed}</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-xs text-muted-foreground">In Progress</div>
                          <div className="font-medium mt-1">{team.tasks.inProgress}</div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-xs text-muted-foreground">Completion Rate</div>
                          <div className="font-medium mt-1">
                            {Math.round((team.tasks.completed / team.tasks.total) * 100)}%
                          </div>
                        </div>
                        <div className="rounded-md border p-2">
                          <div className="text-xs text-muted-foreground">Resource Efficiency</div>
                          <div className="font-medium mt-1">
                            {Math.round((team.progress / team.workload) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Permissions and Access Control</CardTitle>
              <CardDescription>
                Configure role-based access control and permissions for team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="rounded-md border p-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-primary" /> Role-Based Access Control
                  </h3>
                  
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>View Projects</TableHead>
                          <TableHead>Edit Projects</TableHead>
                          <TableHead>Delete Projects</TableHead>
                          <TableHead>Manage Team</TableHead>
                          <TableHead>Admin Access</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Team Admin</TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Team Lead</TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-amber-100 text-amber-800">Limited</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Senior Developer</TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-amber-100 text-amber-800">Limited</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Developer</TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-amber-100 text-amber-800">Limited</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Viewer</TableCell>
                          <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">Yes</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="bg-red-100 text-red-800">No</Badge></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm" className="mr-2">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Role
                      </Button>
                      <Button size="sm">
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md border p-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-primary" /> Team Activity Analytics
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Communication Frequency</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">24 messages/day</div>
                        <p className="text-xs text-muted-foreground mt-1">+12% from previous week</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Collaboration Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">8.4/10</div>
                        <p className="text-xs text-muted-foreground mt-1">Based on cross-team interactions</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Response Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">42 minutes</div>
                        <p className="text-xs text-muted-foreground mt-1">Average time to respond to requests</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <div className="rounded-md border p-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-primary" /> AI-Powered Team Suggestions
                  </h3>
                  
                  <div className="mt-4 space-y-4">
                    <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950">
                      <h4 className="font-medium">Optimization Opportunity</h4>
                      <p className="text-sm mt-1">Backend Team has 3 members with redundant skills. Consider reassigning 1 member to Frontend Team where there's a skill gap in UI animation.</p>
                    </div>
                    
                    <div className="p-3 border rounded-md bg-green-50 dark:bg-green-950">
                      <h4 className="font-medium">Communication Pattern</h4>
                      <p className="text-sm mt-1">Design Team shows excellent internal communication but limited cross-team interaction. Consider scheduling joint sessions with Frontend Team.</p>
                    </div>
                    
                    <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-950">
                      <h4 className="font-medium">Workload Balancing</h4>
                      <p className="text-sm mt-1">QA Team is approaching capacity limits. Consider temporary support from members with testing skills from other teams.</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md border p-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Share2 className="h-5 w-5 mr-2 text-primary" /> Cross-Team Collaboration Tools
                  </h3>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-md p-3">
                      <h4 className="font-medium">Shared Workspaces</h4>
                      <p className="text-sm text-muted-foreground mt-1">Create virtual spaces where multiple teams can collaborate on shared projects</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Create Workspace
                      </Button>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <h4 className="font-medium">Cross-Team Channels</h4>
                      <p className="text-sm text-muted-foreground mt-1">Dedicated communication channels for topics that span multiple teams</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Create Channel
                      </Button>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <h4 className="font-medium">Skill Exchange</h4>
                      <p className="text-sm text-muted-foreground mt-1">Platform for team members to request or offer skills across team boundaries</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Users className="h-3.5 w-3.5 mr-1.5" />
                        Browse Skills
                      </Button>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <h4 className="font-medium">Virtual Team Buildings</h4>
                      <p className="text-sm text-muted-foreground mt-1">Schedule cross-team activities to foster communication and teamwork</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        Schedule Event
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Feature Implementation Status</CardTitle>
          <CardDescription>Current status of team management features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>Team permissions and role-based access</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>Team activity analytics</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>Team communication insights</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>AI-powered team suggestions</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>Cross-team collaboration tools</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}