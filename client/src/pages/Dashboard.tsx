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
  AlertTriangle
} from 'lucide-react';

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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your Contextual Project Intelligence Hub
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline">
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
                <Button variant="outline" className="w-full">
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
                  <Card key={insight.id} className="border-l-4 pl-0 
                    ${insight.type === 'warning' ? 'border-l-amber-500' : 
                    insight.type === 'success' ? 'border-l-green-500' : 
                    insight.type === 'alert' ? 'border-l-red-500' : 'border-l-blue-500'}">
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
    </div>
  );
}