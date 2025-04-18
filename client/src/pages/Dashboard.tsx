import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  BarChart2,
  Briefcase,
  Calendar,
  FileText,
  Grid,
  Inbox,
  Info,
  Plus,
  Users,
  Zap,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  Network,
  Home
} from 'lucide-react';

import Breadcrumb from '@/components/navigation/Breadcrumb';

import { ContextGraph, GraphData } from '@/components/graph/ContextGraph';
import { ProductEcosystem } from '@/components/dashboard/ProductEcosystem';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  
  // State for report generation
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportDownloadUrl, setReportDownloadUrl] = useState("");
  
  // State for calendar
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  
  // State for activity view
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [allActivities, setAllActivities] = useState<Array<{
    id: number;
    type: string;
    action: string;
    subject: string;
    project: string;
    user: string;
    time: string;
    icon: JSX.Element;
  }>>([]);
  
  // Sample graph data for the ContextGraph component
  const sampleGraphData: GraphData = {
    nodes: [
      { id: "doc1", label: "Project Plan", type: "document", group: "Planning" },
      { id: "doc2", label: "Requirements Doc", type: "document", group: "Planning" },
      { id: "doc3", label: "API Documentation", type: "document", group: "Development" },
      { id: "task1", label: "Frontend Design", type: "task", group: "Design" },
      { id: "task2", label: "Backend API", type: "task", group: "Development" },
      { id: "task3", label: "Database Setup", type: "task", group: "Development" },
      { id: "person1", label: "Sarah Miller", type: "person", group: "Design Team" },
      { id: "person2", label: "Alex Kim", type: "person", group: "Development Team" },
      { id: "person3", label: "Jamal Wilson", type: "person", group: "Project Management" },
      { id: "proj1", label: "Website Redesign", type: "project", group: "Main Projects" },
      { id: "topic1", label: "UI/UX", type: "topic", group: "Design Concepts" },
      { id: "topic2", label: "Authentication", type: "topic", group: "Security" },
      { id: "event1", label: "Design Review", type: "event", group: "Meetings" },
      { id: "entity1", label: "Customer Feedback", type: "entity", group: "External" }
    ],
    links: [
      { source: "proj1", target: "doc1", type: "contains" },
      { source: "proj1", target: "doc2", type: "contains" },
      { source: "proj1", target: "task1", type: "contains" },
      { source: "proj1", target: "task2", type: "contains" },
      { source: "person1", target: "task1", type: "assigned" },
      { source: "person2", target: "task2", type: "assigned" },
      { source: "person3", target: "doc1", type: "created" },
      { source: "person3", target: "proj1", type: "manages" },
      { source: "doc1", target: "doc2", type: "references" },
      { source: "doc2", target: "doc3", type: "references" },
      { source: "task2", target: "doc3", type: "produces" },
      { source: "task3", target: "task2", type: "depends_on" },
      { source: "topic1", target: "task1", type: "relates_to" },
      { source: "topic2", target: "task2", type: "relates_to" },
      { source: "event1", target: "topic1", type: "discusses" },
      { source: "entity1", target: "topic1", type: "influences" }
    ]
  };
  
  // Handle report generation
  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    toast({
      title: "Generating report",
      description: "Compiling data for your dashboard report...",
    });
    
    // Simulate report generation
    setTimeout(() => {
      setIsGeneratingReport(false);
      // Create a blob URL for the mock report
      const reportData = {
        date: new Date().toISOString(),
        overview: {
          projects: 12,
          documents: 238,
          teamMembers: 24,
          integrations: 7
        },
        recentProjects: [
          {
            name: "Website Redesign",
            status: "active",
            progress: 68,
            team: "Design"
          },
          {
            name: "Mobile App Development",
            status: "planning",
            progress: 23,
            team: "Engineering"
          }
        ],
        insights: [
          {
            title: "Content Overlap Detected",
            severity: "warning"
          },
          {
            title: "Team Velocity Increasing",
            severity: "positive" 
          }
        ]
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      setReportDownloadUrl(url);
      setReportDialogOpen(true);
    }, 2000);
  };
  
  // Handle calendar view
  const handleViewCalendar = () => {
    setCalendarDialogOpen(true);
  };
  
  // Handle view all activities
  const handleViewAllActivities = () => {
    // Set up all activities (could fetch more from API in real app)
    setAllActivities([
      {
        id: 1,
        type: "document",
        action: "uploaded",
        subject: "Requirements.docx",
        project: "Website Redesign",
        user: "Sarah M.",
        time: "15 minutes ago",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        id: 2,
        type: "comment",
        action: "commented on",
        subject: "API Documentation",
        project: "Mobile App Development",
        user: "Alex K.",
        time: "1 hour ago",
        icon: <Inbox className="h-4 w-4" />,
      },
      {
        id: 3,
        type: "task",
        action: "completed",
        subject: "User Authentication",
        project: "Customer Portal",
        user: "Jamal W.",
        time: "3 hours ago",
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
      {
        id: 4,
        type: "integration",
        action: "connected",
        subject: "Slack integration",
        project: "Team Communication",
        user: "Sophia L.",
        time: "5 hours ago",
        icon: <Zap className="h-4 w-4" />,
      },
      {
        id: 5,
        type: "insight",
        action: "generated",
        subject: "Duplicate content warning",
        project: "Website Redesign",
        user: "System",
        time: "6 hours ago",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        id: 6,
        type: "document",
        action: "updated",
        subject: "Marketing Strategy.pptx",
        project: "Q2 Marketing Campaign",
        user: "Elena R.",
        time: "1 day ago",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        id: 7,
        type: "task",
        action: "assigned",
        subject: "Logo Redesign",
        project: "Website Redesign",
        user: "Jamal W.",
        time: "1 day ago",
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
      {
        id: 8,
        type: "comment",
        action: "mentioned you in",
        subject: "Budget Discussion",
        project: "Q2 Marketing Campaign",
        user: "Sarah M.",
        time: "2 days ago",
        icon: <Inbox className="h-4 w-4" />,
      }
    ]);
    
    setActivityDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb 
        items={[
          {
            label: 'Dashboard',
            icon: <Home className="h-4 w-4 mr-1" />
          }
        ]}
        className="mb-4"
      />
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Nuvexa - Your Comprehensive Project Intelligence Solution
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
            {isGeneratingReport ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleViewCalendar}>
            <Calendar className="mr-2 h-4 w-4" />
            View Calendar
          </Button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4" onValueChange={(value) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents Processed</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">238</div>
                <p className="text-xs text-muted-foreground">
                  +42 in the last week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  +4 new this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7</div>
                <p className="text-xs text-muted-foreground">
                  Slack, GitHub, Google Drive and more
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects & Recent Activity Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Projects */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
                <CardDescription>
                  Your most recently updated projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: 1,
                      name: "Website Redesign",
                      status: "active",
                      progress: 68,
                      team: "Design",
                      updatedAt: "2 hours ago",
                    },
                    {
                      id: 2,
                      name: "Mobile App Development",
                      status: "planning",
                      progress: 23,
                      team: "Engineering",
                      updatedAt: "1 day ago",
                    },
                    {
                      id: 3,
                      name: "Q2 Marketing Campaign",
                      status: "on_hold",
                      progress: 45,
                      team: "Marketing",
                      updatedAt: "3 days ago",
                    },
                    {
                      id: 4,
                      name: "Customer Portal",
                      status: "completed",
                      progress: 100,
                      team: "Engineering",
                      updatedAt: "1 week ago",
                    },
                  ].map((project) => (
                    <div key={project.id} className="flex items-center">
                      <div className="w-full grid grid-cols-6 gap-2 items-center">
                        <div className="col-span-2">
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground">{project.team}</div>
                        </div>
                        <div className="col-span-2">
                          <Progress value={project.progress} className="h-2" />
                        </div>
                        <div className="text-sm">
                          <Badge
                            variant={
                              project.status === "completed"
                                ? "outline"
                                : project.status === "active"
                                ? "default"
                                : project.status === "planning"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {project.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground text-right">
                          {project.updatedAt}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/projects" className="w-full">
                    View All Projects
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates across all projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: 1,
                      type: "document",
                      action: "uploaded",
                      subject: "Requirements.docx",
                      project: "Website Redesign",
                      user: "Sarah M.",
                      time: "15 minutes ago",
                      icon: <FileText className="h-4 w-4" />,
                    },
                    {
                      id: 2,
                      type: "comment",
                      action: "commented on",
                      subject: "API Documentation",
                      project: "Mobile App Development",
                      user: "Alex K.",
                      time: "1 hour ago",
                      icon: <Inbox className="h-4 w-4" />,
                    },
                    {
                      id: 3,
                      type: "task",
                      action: "completed",
                      subject: "User Authentication",
                      project: "Customer Portal",
                      user: "Jamal W.",
                      time: "3 hours ago",
                      icon: <CheckCircle2 className="h-4 w-4" />,
                    },
                    {
                      id: 4,
                      type: "integration",
                      action: "connected",
                      subject: "Slack integration",
                      project: "Team Communication",
                      user: "Sophia L.",
                      time: "5 hours ago",
                      icon: <Zap className="h-4 w-4" />,
                    },
                    {
                      id: 5,
                      type: "insight",
                      action: "generated",
                      subject: "Duplicate content warning",
                      project: "Website Redesign",
                      user: "System",
                      time: "6 hours ago",
                      icon: <AlertTriangle className="h-4 w-4" />,
                    },
                  ].map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4">
                      <div className="mt-1 rounded-full bg-primary/10 p-1 text-primary">
                        {activity.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {activity.user} {activity.action}{" "}
                          <strong>{activity.subject}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.project} • {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={handleViewAllActivities}>
                  View All Activity
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Insights & Team Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Insights */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Latest Insights</CardTitle>
                <CardDescription>
                  AI-generated insights from your projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: 1,
                      title: "Content Overlap Detected",
                      description: "Similar content found across multiple documents in Website Redesign",
                      type: "warning",
                      time: "2 hours ago",
                    },
                    {
                      id: 2,
                      title: "Team Velocity Increasing",
                      description: "Development team showing 15% improvement in velocity over the last sprint",
                      type: "success",
                      time: "1 day ago",
                    },
                    {
                      id: 3,
                      title: "Missing Requirements",
                      description: "Key security requirements may be missing in Customer Portal documentation",
                      type: "alert",
                      time: "2 days ago",
                    },
                  ].map((insight) => (
                    <Card key={insight.id}>
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`rounded-full p-1 
                            ${insight.type === "warning" ? "bg-amber-500/20 text-amber-500" : 
                             insight.type === "success" ? "bg-green-500/20 text-green-500" : 
                             "bg-red-500/20 text-red-500"}`}>
                            <Info className="h-4 w-4" />
                          </div>
                          <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {insight.time}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/insights" className="w-full">
                    View All Insights
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Team Members */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Active members across your projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: 1,
                      name: "Sarah Miller",
                      role: "Product Manager",
                      avatar: "/avatars/01.png",
                      projects: 4,
                      status: "online",
                    },
                    {
                      id: 2,
                      name: "Alex Kumar",
                      role: "Lead Developer",
                      avatar: "/avatars/02.png",
                      projects: 3,
                      status: "online",
                    },
                    {
                      id: 3,
                      name: "Jamal Washington",
                      role: "UI/UX Designer",
                      avatar: "/avatars/03.png",
                      projects: 2,
                      status: "offline",
                    },
                    {
                      id: 4,
                      name: "Sophia Lee",
                      role: "Full Stack Developer",
                      avatar: "/avatars/04.png",
                      projects: 3,
                      status: "away",
                    },
                    {
                      id: 5,
                      name: "Carlos Rodriguez",
                      role: "Data Analyst",
                      avatar: "/avatars/05.png",
                      projects: 1,
                      status: "offline",
                    },
                  ].map((member) => (
                    <div key={member.id} className="flex items-center gap-4">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none">
                            {member.name}
                          </p>
                          <div
                            className={`h-2 w-2 rounded-full ${
                              member.status === "online"
                                ? "bg-green-500"
                                : member.status === "away"
                                ? "bg-yellow-500"
                                : "bg-gray-300"
                            }`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.role} • {member.projects} projects
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/teams" className="w-full">
                    View All Team Members
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center">
              <div className="flex-1">
                <CardTitle>All Projects</CardTitle>
                <CardDescription>
                  Manage and monitor all your projects
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-6 border-b px-4 py-3 font-medium">
                  <div className="col-span-2">Name</div>
                  <div>Status</div>
                  <div>Progress</div>
                  <div>Team</div>
                  <div className="text-right">Last Updated</div>
                </div>
                {[
                  {
                    id: 1,
                    name: "Website Redesign",
                    status: "active",
                    progress: 68,
                    team: "Design",
                    updatedAt: "2 hours ago",
                  },
                  {
                    id: 2,
                    name: "Mobile App Development",
                    status: "planning",
                    progress: 23,
                    team: "Engineering",
                    updatedAt: "1 day ago",
                  },
                  {
                    id: 3,
                    name: "Q2 Marketing Campaign",
                    status: "on_hold",
                    progress: 45,
                    team: "Marketing",
                    updatedAt: "3 days ago",
                  },
                  {
                    id: 4,
                    name: "Customer Portal",
                    status: "completed",
                    progress: 100,
                    team: "Engineering",
                    updatedAt: "1 week ago",
                  },
                  {
                    id: 5,
                    name: "Product Roadmap 2024",
                    status: "planning",
                    progress: 12,
                    team: "Product",
                    updatedAt: "2 weeks ago",
                  },
                  {
                    id: 6,
                    name: "Annual Report",
                    status: "active",
                    progress: 88,
                    team: "Finance",
                    updatedAt: "2 weeks ago",
                  },
                ].map((project) => (
                  <div
                    key={project.id}
                    className="grid grid-cols-6 items-center px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="col-span-2 font-medium">{project.name}</div>
                    <div>
                      <Badge
                        variant={
                          project.status === "completed"
                            ? "outline"
                            : project.status === "active"
                            ? "default"
                            : project.status === "planning"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={project.progress} className="h-2 w-full max-w-24" />
                      <span className="text-xs text-muted-foreground w-8">
                        {project.progress}%
                      </span>
                    </div>
                    <div>{project.team}</div>
                    <div className="text-right text-sm text-muted-foreground">
                      {project.updatedAt}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center">
              <div className="flex-1">
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>
                  Recently added and modified documents
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Repeat className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-6 border-b px-4 py-3 font-medium">
                  <div className="col-span-2">Name</div>
                  <div>Type</div>
                  <div>Project</div>
                  <div>Added By</div>
                  <div className="text-right">Date</div>
                </div>
                {[
                  {
                    id: 1,
                    name: "Requirements Specification",
                    type: "DOCX",
                    project: "Website Redesign",
                    addedBy: "Sarah M.",
                    date: "Apr 12, 2023",
                  },
                  {
                    id: 2,
                    name: "User Flow Diagrams",
                    type: "PDF",
                    project: "Mobile App",
                    addedBy: "Jamal W.",
                    date: "Apr 10, 2023",
                  },
                  {
                    id: 3,
                    name: "API Documentation",
                    type: "MD",
                    project: "Customer Portal",
                    addedBy: "Alex K.",
                    date: "Apr 8, 2023",
                  },
                  {
                    id: 4,
                    name: "Marketing Strategy",
                    type: "PPTX",
                    project: "Q2 Campaign",
                    addedBy: "Emma R.",
                    date: "Apr 5, 2023",
                  },
                  {
                    id: 5,
                    name: "Budget Forecast",
                    type: "XLSX",
                    project: "Annual Report",
                    addedBy: "Carlos R.",
                    date: "Apr 1, 2023",
                  },
                ].map((doc) => (
                  <div
                    key={doc.id}
                    className="grid grid-cols-6 items-center px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="col-span-2 flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {doc.name}
                    </div>
                    <div>
                      <Badge variant="outline">{doc.type}</Badge>
                    </div>
                    <div>{doc.project}</div>
                    <div>{doc.addedBy}</div>
                    <div className="text-right text-sm text-muted-foreground">
                      {doc.date}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {/* Project Relationship Graph - Added per UI/UX PRD */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Project Relationship Graph</CardTitle>
                  <CardDescription>Visualizing connections between project elements</CardDescription>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Network className="h-3 w-3" /> New Visualization
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full border rounded-md">
                <ContextGraph 
                  data={sampleGraphData} 
                  onNodeClick={(node) => {
                    toast({
                      title: `Selected: ${node.label}`,
                      description: `Type: ${node.type}, Group: ${node.group}`,
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* AI-Powered Insights */}
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription>
                Key insights and intelligence generated across all projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    title: "Content Overlap Detected",
                    description: "Similar content found across multiple documents in Website Redesign project. Consider consolidating to improve consistency.",
                    type: "warning",
                    project: "Website Redesign",
                    time: "2 hours ago",
                  },
                  {
                    id: 2,
                    title: "Team Velocity Increasing",
                    description: "Development team showing 15% improvement in velocity over the last sprint. Continue current process improvements.",
                    type: "success",
                    project: "Mobile App Development",
                    time: "1 day ago",
                  },
                  {
                    id: 3,
                    title: "Missing Requirements",
                    description: "Key security requirements may be missing in Customer Portal documentation. Review security standards compliance.",
                    type: "alert",
                    project: "Customer Portal",
                    time: "2 days ago",
                  },
                  {
                    id: 4,
                    title: "Content Readability Score Low",
                    description: "Marketing materials have lower than target readability scores. Consider simplifying language and sentence structure.",
                    type: "info",
                    project: "Q2 Marketing Campaign",
                    time: "3 days ago",
                  },
                  {
                    id: 5,
                    title: "Budget Risks Identified",
                    description: "Current spending patterns may exceed Q2 budget projections by 8%. Review allocated resources and adjust scope.",
                    type: "warning",
                    project: "Annual Report",
                    time: "1 week ago",
                  },
                ].map((insight) => (
                  <Card key={insight.id} className={`border-l-4 pl-0 
                    ${insight.type === 'warning' ? 'border-l-amber-500' : 
                    insight.type === 'success' ? 'border-l-green-500' : 
                    insight.type === 'alert' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                    <CardHeader className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full p-1 
                          ${insight.type === "warning" ? "bg-amber-500/20 text-amber-500" : 
                          insight.type === "success" ? "bg-green-500/20 text-green-500" : 
                          insight.type === "alert" ? "bg-red-500/20 text-red-500" :
                          "bg-blue-500/20 text-blue-500"}`}>
                          <Info className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="outline">{insight.project}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {insight.time}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Report Generation Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Report Generated</DialogTitle>
            <DialogDescription>
              Your dashboard report has been generated successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-muted p-4">
              <div className="flex items-center gap-3 text-sm">
                <FileText className="h-5 w-5 text-primary" />
                <div className="font-medium">dashboard-report-{new Date().toLocaleDateString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\//g, '-')}.json</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This report includes statistics for all your projects, documents, and team activities as displayed on your dashboard.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              window.open(reportDownloadUrl);
              setReportDialogOpen(false);
              
              // Release the blob URL when done
              setTimeout(() => {
                URL.revokeObjectURL(reportDownloadUrl);
              }, 1000);
            }}>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Calendar Dialog */}
      <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Project Calendar</DialogTitle>
            <DialogDescription>
              View and manage your upcoming project deadlines and events.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md border p-4">
              {/* Simplified calendar display */}
              <div className="grid grid-cols-7 gap-2 text-center font-medium">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2 text-center">
                {/* Generate dummy calendar days */}
                {Array.from({ length: 30 }, (_, i) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded ${
                      [4, 12, 18, 23].includes(i) 
                        ? 'bg-primary/20 font-medium text-primary hover:bg-primary/30' 
                        : 'hover:bg-muted/50'
                    } cursor-pointer`}
                  >
                    {i + 1}
                    {i === 4 && <div className="mt-1 text-xs">Website</div>}
                    {i === 12 && <div className="mt-1 text-xs">Meeting</div>}
                    {i === 18 && <div className="mt-1 text-xs">Deadline</div>}
                    {i === 23 && <div className="mt-1 text-xs">Release</div>}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Upcoming Events</h4>
              <div className="space-y-2">
                <div className="flex justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">Website Redesign Milestone</div>
                    <div className="text-xs text-muted-foreground">Design Team • High Priority</div>
                  </div>
                  <div className="text-muted-foreground">April 5, 2023</div>
                </div>
                <div className="flex justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">Stakeholder Meeting</div>
                    <div className="text-xs text-muted-foreground">All Teams • Medium Priority</div>
                  </div>
                  <div className="text-muted-foreground">April 13, 2023</div>
                </div>
                <div className="flex justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">API Documentation Deadline</div>
                    <div className="text-xs text-muted-foreground">Engineering Team • High Priority</div>
                  </div>
                  <div className="text-muted-foreground">April 19, 2023</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalendarDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>All Activities</DialogTitle>
            <DialogDescription>
              A complete log of recent activities across all projects.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <div className="space-y-4 py-4">
              {allActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="mt-1 rounded-full bg-primary/10 p-1 text-primary">
                    {activity.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium leading-none">
                        {activity.user} {activity.action}{" "}
                        <strong>{activity.subject}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.project}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}