import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MessageSquare, 
  FileText, 
  ListChecks, 
  Calendar, 
  Search,
  FolderPlus,
  Upload,
  Plus,
  MoreHorizontal, 
  Edit,
  Trash,
  Share,
  History,
  Settings,
  Star,
  LucideProps,
  File,
  FilePlus,
  FileText as FileTextIcon,
  FileSpreadsheet,
  FileImage,
  Pencil,
  Send,
  Link,
  Video
} from 'lucide-react';

// Mock data - in a real implementation this would come from the API
const workspaceData = {
  id: "ws-1",
  name: "Product Development",
  description: "Collaborative workspace for our product roadmap and development efforts",
  icon: "🚀",
  privacy: "team",
  created: "2025-02-15T10:30:00Z",
  lastUpdated: "2025-04-10T14:22:00Z",
  members: [
    { id: 1, name: "Alex Johnson", role: "Owner", avatar: "/placeholder-user.jpg", initials: "AJ" },
    { id: 2, name: "Emma Wilson", role: "Editor", avatar: "/placeholder-user.jpg", initials: "EW" },
    { id: 3, name: "Michael Lee", role: "Editor", avatar: "/placeholder-user.jpg", initials: "ML" },
    { id: 4, name: "Sarah Chen", role: "Viewer", avatar: "/placeholder-user.jpg", initials: "SC" },
    { id: 5, name: "David Kim", role: "Viewer", avatar: "/placeholder-user.jpg", initials: "DK" }
  ],
  pinnedItems: [
    { id: "doc-1", name: "Product Roadmap Q2", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-08T09:15:00Z" },
    { id: "doc-2", name: "Feature Specifications", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-05T11:30:00Z" },
    { id: "task-1", name: "Development Sprint Planning", type: "tasklist", icon: <ListChecks className="h-4 w-4" />, updatedAt: "2025-04-09T14:20:00Z" }
  ],
  recentItems: [
    { id: "doc-3", name: "API Documentation", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-10T10:45:00Z" },
    { id: "sheet-1", name: "Resource Allocation", type: "spreadsheet", icon: <FileSpreadsheet className="h-4 w-4" />, updatedAt: "2025-04-09T16:30:00Z" },
    { id: "img-1", name: "UI Mockups", type: "image", icon: <FileImage className="h-4 w-4" />, updatedAt: "2025-04-08T13:15:00Z" },
    { id: "doc-4", name: "Meeting Notes - April 7", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-07T15:00:00Z" },
    { id: "task-2", name: "Bug Tracking", type: "tasklist", icon: <ListChecks className="h-4 w-4" />, updatedAt: "2025-04-06T09:20:00Z" }
  ],
  documents: [
    { id: "doc-1", name: "Product Roadmap Q2", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-08T09:15:00Z", updatedBy: "Alex Johnson" },
    { id: "doc-2", name: "Feature Specifications", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-05T11:30:00Z", updatedBy: "Emma Wilson" },
    { id: "doc-3", name: "API Documentation", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-10T10:45:00Z", updatedBy: "Michael Lee" },
    { id: "doc-4", name: "Meeting Notes - April 7", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-07T15:00:00Z", updatedBy: "Sarah Chen" },
    { id: "doc-5", name: "User Research Results", type: "document", icon: <FileTextIcon className="h-4 w-4" />, updatedAt: "2025-04-02T13:40:00Z", updatedBy: "David Kim" },
    { id: "sheet-1", name: "Resource Allocation", type: "spreadsheet", icon: <FileSpreadsheet className="h-4 w-4" />, updatedAt: "2025-04-09T16:30:00Z", updatedBy: "Alex Johnson" },
    { id: "img-1", name: "UI Mockups", type: "image", icon: <FileImage className="h-4 w-4" />, updatedAt: "2025-04-08T13:15:00Z", updatedBy: "Emma Wilson" }
  ],
  tasklists: [
    { 
      id: "task-1", 
      name: "Development Sprint Planning", 
      tasks: [
        { id: "t1", title: "Define sprint goals", completed: true, assignee: "Alex Johnson" },
        { id: "t2", title: "Prioritize backlog items", completed: true, assignee: "Sarah Chen" },
        { id: "t3", title: "Estimate story points", completed: false, assignee: "Michael Lee" },
        { id: "t4", title: "Schedule sprint review", completed: false, assignee: "Emma Wilson" }
      ],
      updatedAt: "2025-04-09T14:20:00Z",
      updatedBy: "Alex Johnson"
    },
    { 
      id: "task-2", 
      name: "Bug Tracking", 
      tasks: [
        { id: "t5", title: "Fix login authentication issue", completed: true, assignee: "Michael Lee" },
        { id: "t6", title: "Resolve data loading performance", completed: false, assignee: "David Kim" },
        { id: "t7", title: "Investigate mobile layout bug", completed: false, assignee: "Emma Wilson" }
      ],
      updatedAt: "2025-04-06T09:20:00Z",
      updatedBy: "David Kim"
    }
  ],
  discussions: [
    {
      id: "disc-1",
      title: "API Integration Approach",
      creator: "Michael Lee",
      createdAt: "2025-04-09T10:15:00Z",
      replies: 8,
      lastReply: "2025-04-10T09:30:00Z",
      lastReplyBy: "Alex Johnson",
      status: "active"
    },
    {
      id: "disc-2",
      title: "User Interface Design Review",
      creator: "Emma Wilson", 
      createdAt: "2025-04-07T14:45:00Z",
      replies: 12,
      lastReply: "2025-04-09T16:20:00Z",
      lastReplyBy: "Sarah Chen",
      status: "active"
    },
    {
      id: "disc-3",
      title: "Data Migration Strategy",
      creator: "Alex Johnson",
      createdAt: "2025-04-05T11:30:00Z",
      replies: 6,
      lastReply: "2025-04-08T13:40:00Z",
      lastReplyBy: "David Kim",
      status: "resolved"
    }
  ]
};

// Component for creating a new discussion thread
function NewDiscussionDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    toast({
      title: "Discussion created",
      description: "Your discussion thread has been created successfully.",
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Discussion</DialogTitle>
            <DialogDescription>
              Start a new discussion thread in this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Enter discussion title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select defaultValue="general">
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" placeholder="Enter your message" rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Create Discussion</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Component for creating a new document
function NewDocumentDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    toast({
      title: "Document created",
      description: "Your document has been created successfully.",
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Create a new document in this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Enter document title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docType">Document Type</Label>
              <Select defaultValue="doc">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doc">Text Document</SelectItem>
                  <SelectItem value="sheet">Spreadsheet</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template">Template (Optional)</Label>
              <Select defaultValue="blank">
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Blank</SelectItem>
                  <SelectItem value="project-plan">Project Plan</SelectItem>
                  <SelectItem value="meeting-notes">Meeting Notes</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Create Document</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Component for adding a new task list
function NewTaskListDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    toast({
      title: "Task list created",
      description: "Your task list has been created successfully.",
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task List</DialogTitle>
            <DialogDescription>
              Create a new task list to track work items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Enter task list title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" placeholder="Enter description" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Initial Tasks</Label>
              <div className="space-y-2">
                <Input placeholder="Task 1" />
                <Input placeholder="Task 2" />
                <Input placeholder="Task 3" />
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Add More
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Create Task List</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Component for the workspace discussion thread
function DiscussionThread() {
  const [message, setMessage] = useState("");
  
  // Mock thread messages
  const messages = [
    {
      id: 1,
      user: "Michael Lee",
      avatar: "/placeholder-user.jpg",
      initials: "ML",
      content: "I've been researching different approaches for our API integration. I think we should consider using GraphQL instead of REST for this project.",
      timestamp: "2025-04-09T10:15:00Z"
    },
    {
      id: 2,
      user: "Emma Wilson",
      avatar: "/placeholder-user.jpg",
      initials: "EW",
      content: "That's an interesting idea. What benefits do you see with GraphQL for our specific use case?",
      timestamp: "2025-04-09T11:22:00Z"
    },
    {
      id: 3,
      user: "Michael Lee",
      avatar: "/placeholder-user.jpg",
      initials: "ML",
      content: "The main benefits would be reduced over-fetching and the ability to request exactly the data we need. Also, it would give our frontend team more flexibility.",
      timestamp: "2025-04-09T12:05:00Z"
    },
    {
      id: 4,
      user: "Alex Johnson",
      avatar: "/placeholder-user.jpg",
      initials: "AJ",
      content: "I like the direction, but I'm concerned about the learning curve for the team. How much experience do we have with GraphQL implementations?",
      timestamp: "2025-04-09T14:30:00Z"
    },
    {
      id: 5,
      user: "Sarah Chen",
      avatar: "/placeholder-user.jpg",
      initials: "SC",
      content: "I've worked with GraphQL on my previous project. There is a learning curve, but the developer experience benefits are significant. I can help with knowledge sharing if we decide to go this route.",
      timestamp: "2025-04-09T15:15:00Z"
    },
    {
      id: 6,
      user: "David Kim",
      avatar: "/placeholder-user.jpg",
      initials: "DK",
      content: "What about performance considerations? I've heard GraphQL can have N+1 query problems if not implemented correctly.",
      timestamp: "2025-04-10T09:10:00Z"
    },
    {
      id: 7,
      user: "Alex Johnson",
      avatar: "/placeholder-user.jpg",
      initials: "AJ",
      content: "Good point, David. Let's schedule a technical deep dive session to discuss these concerns and potential solutions. I think it's worth exploring further.",
      timestamp: "2025-04-10T09:30:00Z"
    }
  ];
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Would send message to API in real implementation
      setMessage("");
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">API Integration Approach</h2>
        <div className="flex items-center text-sm text-muted-foreground mt-1">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>8 participants</span>
          </div>
          <span className="mx-2">•</span>
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>8 messages</span>
          </div>
          <span className="mx-2">•</span>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Started Apr 9, 2025</span>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className="flex">
              <Avatar className="h-10 w-10 mr-4 mt-0.5">
                <AvatarImage src={msg.avatar} alt={msg.user} />
                <AvatarFallback>{msg.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="font-medium">{msg.user}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDate(msg.timestamp)}
                  </span>
                </div>
                <div className="mt-1">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-user.jpg" alt="You" />
            <AvatarFallback>YO</AvatarFallback>
          </Avatar>
          <Input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Type your message..." 
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// Format a date string
function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000; // seconds in a year
  
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000; // seconds in a month
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400; // seconds in a day
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600; // seconds in an hour
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60; // seconds in a minute
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return "just now";
}

export default function Workspace() {
  const [location, setLocation] = useLocation();
  const [createDiscussionOpen, setCreateDiscussionOpen] = useState(false);
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false);
  const [createTaskListOpen, setCreateTaskListOpen] = useState(false);
  const { toast } = useToast();
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-md bg-primary/10 text-xl">
              {workspaceData.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{workspaceData.name}</h1>
              <p className="text-sm text-muted-foreground">{workspaceData.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Workspace settings", description: "This would open workspace settings" })}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Share workspace", description: "This would open the sharing dialog" })}>
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "History", description: "This would show workspace activity history" })}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main workspace content */}
          <div className="lg:flex-1 space-y-6">
            <Tabs defaultValue="home">
              <TabsList className="mb-4">
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="discussions">Discussions</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>

              <TabsContent value="home" className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h2 className="font-medium mb-1">Welcome to {workspaceData.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{workspaceData.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setCreateDocumentOpen(true)}>
                      <FilePlus className="h-4 w-4 mr-2" />
                      New Document
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCreateTaskListOpen(true)}>
                      <ListChecks className="h-4 w-4 mr-2" />
                      New Task List
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCreateDiscussionOpen(true)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      New Discussion
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-2 text-amber-500" />
                          Pinned Items
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {workspaceData.pinnedItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center mr-3">
                                {item.icon}
                              </div>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Updated {formatTimeAgo(item.updatedAt)}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="ghost" size="sm" className="w-full text-primary">Manage Pinned Items</Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {workspaceData.recentItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center mr-3">
                                {item.icon}
                              </div>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Updated {formatTimeAgo(item.updatedAt)}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="ghost" size="sm" className="w-full text-primary">View All Activity</Button>
                    </CardFooter>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Recent Discussions</span>
                      <Button size="sm" onClick={() => setCreateDiscussionOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Discussion
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {workspaceData.discussions.map((discussion) => (
                        <div key={discussion.id} className="p-3 border rounded-md">
                          <div className="flex justify-between mb-2">
                            <div className="font-medium">{discussion.title}</div>
                            <div className={`px-2 py-0.5 text-xs rounded-full ${discussion.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {discussion.status === 'active' ? 'Active' : 'Resolved'}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="text-muted-foreground">
                              Started by {discussion.creator} • {formatTimeAgo(discussion.createdAt)}
                            </div>
                            <div className="font-medium flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {discussion.replies}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Last reply by {discussion.lastReplyBy} {formatTimeAgo(discussion.lastReply)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="ghost" size="sm" className="w-full text-primary">View All Discussions</Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Input className="w-60" placeholder="Search documents..." />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="document">Documents</SelectItem>
                        <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                        <SelectItem value="image">Images</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setCreateDocumentOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Document
                  </Button>
                </div>

                <div className="rounded-md border">
                  <div className="grid grid-cols-5 px-4 py-3 bg-muted text-sm font-medium">
                    <div className="col-span-2">Name</div>
                    <div>Type</div>
                    <div>Last Updated</div>
                    <div>Actions</div>
                  </div>
                  {workspaceData.documents.map((doc) => (
                    <div key={doc.id} className="grid grid-cols-5 px-4 py-3 border-t items-center">
                      <div className="col-span-2 flex items-center">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center mr-3">
                          {doc.icon}
                        </div>
                        <div className="font-medium">{doc.name}</div>
                      </div>
                      <div className="capitalize">{doc.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTimeAgo(doc.updatedAt)} by {doc.updatedBy}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Task Lists</h2>
                  <Button onClick={() => setCreateTaskListOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task List
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaceData.tasklists.map((tasklist) => (
                    <Card key={tasklist.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{tasklist.name}</CardTitle>
                        <CardDescription>
                          Updated {formatTimeAgo(tasklist.updatedAt)} by {tasklist.updatedBy}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="space-y-2">
                          {tasklist.tasks.map((task) => (
                            <div key={task.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                              <input 
                                type="checkbox" 
                                checked={task.completed} 
                                onChange={() => {}} 
                                className="h-4 w-4 rounded" 
                              />
                              <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                                {task.title}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {task.assignee}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 flex justify-between">
                        <div className="text-sm text-muted-foreground">
                          {tasklist.tasks.filter(t => t.completed).length}/{tasklist.tasks.length} completed
                        </div>
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="discussions" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Input className="w-60" placeholder="Search discussions..." />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setCreateDiscussionOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Discussion
                  </Button>
                </div>

                <div className="space-y-4">
                  {workspaceData.discussions.map((discussion) => (
                    <Card key={discussion.id} className="p-0 overflow-hidden">
                      <div className="border-l-4 border-primary h-full">
                        <CardContent className="p-5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-bold">{discussion.title}</h3>
                              <div className="text-sm text-muted-foreground mt-1">
                                Started by {discussion.creator} • {formatTimeAgo(discussion.createdAt)}
                              </div>
                            </div>
                            <div className={`px-2 py-1 text-xs rounded-full ${discussion.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {discussion.status === 'active' ? 'Active' : 'Resolved'}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                <span className="text-sm font-medium">{discussion.replies} replies</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Last reply {formatTimeAgo(discussion.lastReply)}
                              </div>
                            </div>
                            <Button size="sm">
                              Join Discussion
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Workspace Members</h2>
                  <Button onClick={() => toast({ title: "Invite members", description: "This would open the invite dialog" })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Members
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <div className="rounded-md">
                      <div className="grid grid-cols-4 px-4 py-3 bg-muted text-sm font-medium">
                        <div className="col-span-2">Name</div>
                        <div>Role</div>
                        <div>Actions</div>
                      </div>
                      {workspaceData.members.map((member) => (
                        <div key={member.id} className="grid grid-cols-4 px-4 py-3 border-t items-center">
                          <div className="col-span-2 flex items-center">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarImage src={member.avatar} alt={member.name} />
                              <AvatarFallback>{member.initials}</AvatarFallback>
                            </Avatar>
                            <div className="font-medium">{member.name}</div>
                          </div>
                          <div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              member.role === 'Owner' ? 'bg-primary/20 text-primary' :
                              member.role === 'Editor' ? 'bg-green-100 text-green-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {member.role}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {member.role !== 'Owner' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => toast({ title: "Change role", description: `This would change ${member.name}'s role` })}>
                                  Edit Role
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => toast({ title: "Remove member", description: `This would remove ${member.name} from workspace` })}>
                                  Remove
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right sidebar for active discussion */}
          <div className="lg:w-1/3 border rounded-md overflow-hidden hidden lg:block">
            <div className="h-full flex flex-col">
              <DiscussionThread />
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <NewDiscussionDialog open={createDiscussionOpen} setOpen={setCreateDiscussionOpen} />
      <NewDocumentDialog open={createDocumentOpen} setOpen={setCreateDocumentOpen} />
      <NewTaskListDialog open={createTaskListOpen} setOpen={setCreateTaskListOpen} />
    </>
  );
}