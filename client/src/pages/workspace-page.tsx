import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Search, 
  FileText, 
  Users, 
  Video, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  MoreHorizontal,
  Send,
  Paperclip,
  ChevronRight,
  Link as LinkIcon,
  FilterX
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function WorkspacePage() {
  const { toast } = useToast();
  const [currentChat, setCurrentChat] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("chats");
  const [newMessageText, setNewMessageText] = useState<string>("");

  // Demo data for chats
  const chatChannels = [
    { 
      id: 0, 
      name: "Web App Redesign Team", 
      type: "team", 
      lastMessage: "Let's review the latest design updates", 
      timestamp: "10:24 AM",
      unread: 2,
      participants: [
        { id: 1, name: "Alex Morgan", avatar: "https://example.com/avatar1.jpg" },
        { id: 2, name: "Sarah Chen", avatar: "https://example.com/avatar2.jpg" },
        { id: 3, name: "Mark Johnson", avatar: "https://example.com/avatar3.jpg" },
        { id: 4, name: "Lisa Wong", avatar: "https://example.com/avatar4.jpg" }
      ]
    },
    { 
      id: 1, 
      name: "Frontend Team", 
      type: "team", 
      lastMessage: "The new components are ready for testing", 
      timestamp: "Yesterday",
      unread: 0,
      participants: [
        { id: 2, name: "Sarah Chen", avatar: "https://example.com/avatar2.jpg" },
        { id: 3, name: "Mark Johnson", avatar: "https://example.com/avatar3.jpg" }
      ]
    },
    { 
      id: 2, 
      name: "Sarah Chen", 
      type: "direct", 
      lastMessage: "I'll get those UI mockups to you by EOD", 
      timestamp: "2 days ago",
      unread: 0,
      participants: [
        { id: 1, name: "Alex Morgan", avatar: "https://example.com/avatar1.jpg" },
        { id: 2, name: "Sarah Chen", avatar: "https://example.com/avatar2.jpg" }
      ]
    },
    { 
      id: 3, 
      name: "Project Planning", 
      type: "topic", 
      lastMessage: "The timeline for Phase 2 looks good", 
      timestamp: "1 week ago",
      unread: 0,
      participants: [
        { id: 1, name: "Alex Morgan", avatar: "https://example.com/avatar1.jpg" },
        { id: 2, name: "Sarah Chen", avatar: "https://example.com/avatar2.jpg" },
        { id: 4, name: "Lisa Wong", avatar: "https://example.com/avatar4.jpg" },
        { id: 5, name: "David Kim", avatar: "https://example.com/avatar5.jpg" }
      ]
    }
  ];

  // Demo data for messages in current chat
  const chatMessages = [
    {
      id: 1,
      sender: { id: 1, name: "Alex Morgan", avatar: "/avatars/01.png" },
      timestamp: "10:12 AM",
      content: "Good morning team! I've just pushed the latest updates to the repository. Please take a look and let me know your thoughts.",
      attachments: []
    },
    {
      id: 2,
      sender: { id: 2, name: "Sarah Chen", avatar: "/avatars/02.png" },
      timestamp: "10:15 AM",
      content: "Thanks Alex, I'll review them now. I've also completed the UI components we discussed yesterday.",
      attachments: [
        { type: "file", name: "ui-components.fig", size: "2.4 MB" }
      ]
    },
    {
      id: 3,
      sender: { id: 3, name: "Mark Johnson", avatar: "/avatars/03.png" },
      timestamp: "10:20 AM",
      content: "Looks good so far! I think we should update the color scheme to match our new brand guidelines though.",
      attachments: []
    },
    {
      id: 4,
      sender: { id: 4, name: "Lisa Wong", avatar: "/avatars/04.png" },
      timestamp: "10:22 AM",
      content: "I agree with Mark. Here's the updated brand guidelines document for reference.",
      attachments: [
        { type: "file", name: "brand-guidelines-2025.pdf", size: "5.1 MB" }
      ]
    },
    {
      id: 5,
      sender: { id: 1, name: "Alex Morgan", avatar: "/avatars/01.png" },
      timestamp: "10:24 AM",
      content: "Let's review the latest design updates in our meeting at 2PM then. I'll send out a calendar invite.",
      attachments: []
    }
  ];

  // Demo data for documents
  const documents = [
    {
      id: 1,
      title: "UI Component Documentation",
      type: "document",
      modified: "Today at 9:42 AM",
      modifiedBy: { id: 2, name: "Sarah Chen", avatar: "/avatars/02.png" },
      size: "2.4 MB"
    },
    {
      id: 2,
      title: "Project Timeline (Q3-Q4)",
      type: "spreadsheet",
      modified: "Yesterday at 4:15 PM",
      modifiedBy: { id: 1, name: "Alex Morgan", avatar: "/avatars/01.png" },
      size: "1.2 MB"
    },
    {
      id: 3,
      title: "API Documentation",
      type: "document",
      modified: "2 days ago",
      modifiedBy: { id: 3, name: "Mark Johnson", avatar: "/avatars/03.png" },
      size: "3.7 MB"
    },
    {
      id: 4,
      title: "Brand Guidelines 2025",
      type: "pdf",
      modified: "1 week ago",
      modifiedBy: { id: 4, name: "Lisa Wong", avatar: "/avatars/04.png" },
      size: "5.1 MB"
    }
  ];

  // Demo data for calendar events
  const calendarEvents = [
    {
      id: 1,
      title: "Team Standup",
      start: "9:30 AM",
      end: "10:00 AM",
      participants: [
        { id: 1, name: "Alex Morgan", avatar: "/avatars/01.png" },
        { id: 2, name: "Sarah Chen", avatar: "/avatars/02.png" },
        { id: 3, name: "Mark Johnson", avatar: "/avatars/03.png" },
        { id: 4, name: "Lisa Wong", avatar: "/avatars/04.png" }
      ],
      location: "Video Call"
    },
    {
      id: 2,
      title: "Design Review",
      start: "2:00 PM",
      end: "3:00 PM",
      participants: [
        { id: 1, name: "Alex Morgan", avatar: "/avatars/01.png" },
        { id: 2, name: "Sarah Chen", avatar: "/avatars/02.png" },
        { id: 4, name: "Lisa Wong", avatar: "/avatars/04.png" }
      ],
      location: "Conference Room A"
    },
    {
      id: 3,
      title: "Sprint Planning",
      start: "Tomorrow, 10:00 AM",
      end: "Tomorrow, 11:30 AM",
      participants: [
        { id: 1, name: "Alex Morgan", avatar: "/avatars/01.png" },
        { id: 2, name: "Sarah Chen", avatar: "/avatars/02.png" },
        { id: 3, name: "Mark Johnson", avatar: "/avatars/03.png" },
        { id: 4, name: "Lisa Wong", avatar: "/avatars/04.png" },
        { id: 5, name: "David Kim", avatar: "/avatars/05.png" }
      ],
      location: "Conference Room B"
    }
  ];

  // Handle sending a new message
  const sendMessage = () => {
    if (newMessageText.trim() === "") return;
    
    toast({
      title: "Message sent",
      description: "Your message has been sent to the chat"
    });
    
    setNewMessageText("");
  };

  // Function to get the avatar component for a user
  const getUserAvatar = (user: { id: number, name: string, avatar: string }) => {
    return (
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
      </Avatar>
    );
  };

  // Function to get icon for document type
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "spreadsheet":
        return <div className="h-4 w-4 text-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <line x1="15" y1="3" x2="15" y2="21"></line>
          </svg>
        </div>;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace</h1>
          <p className="text-muted-foreground mt-1">
            Collaborate with your team in real-time
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Video className="h-4 w-4 mr-2" />
            Join Meeting
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Workspace
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-3 h-full flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-8"
            />
          </div>

          <Tabs defaultValue="chats" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="chats">
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Chats</span>
              </TabsTrigger>
              <TabsTrigger value="files">
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Files</span>
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="flex-1 mt-4 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-sm">Recent Conversations</h3>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {chatChannels.map((channel) => (
                    <button
                      key={channel.id}
                      className={`w-full flex items-center p-2 rounded-md hover:bg-accent/50 transition-colors ${currentChat === channel.id ? 'bg-accent' : ''}`}
                      onClick={() => setCurrentChat(channel.id)}
                    >
                      <div className="relative">
                        {channel.type === 'direct' ? (
                          getUserAvatar(channel.participants[1])
                        ) : channel.type === 'team' ? (
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        {channel.unread > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
                            {channel.unread}
                          </span>
                        )}
                      </div>
                      <div className="ml-3 text-left flex-1 overflow-hidden">
                        <div className="flex justify-between">
                          <span className="font-medium text-sm truncate">{channel.name}</span>
                          <span className="text-xs text-muted-foreground">{channel.timestamp}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{channel.lastMessage}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="files" className="flex-1 mt-4 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-sm">Recent Files</h3>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start">
                          <div className="p-2 rounded-md bg-primary/10 mr-3">
                            {getDocumentIcon(doc.type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{doc.title}</h4>
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-muted-foreground">{doc.modified}</span>
                              <span className="text-xs text-muted-foreground mx-1">•</span>
                              <span className="text-xs text-muted-foreground">{doc.size}</span>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Open</DropdownMenuItem>
                            <DropdownMenuItem>Download</DropdownMenuItem>
                            <DropdownMenuItem>Share</DropdownMenuItem>
                            <DropdownMenuItem>Rename</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="calendar" className="flex-1 mt-4 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-sm">Upcoming Events</h3>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-3">
                  {calendarEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="p-3 rounded-md border hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge variant="outline" className="h-5">
                          <Clock className="h-3 w-3 mr-1" />
                          <span className="text-xs">{event.start}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center mt-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        <span>{event.start} - {event.end}</span>
                      </div>
                      <div className="flex items-center mt-1 text-sm text-muted-foreground">
                        <Video className="h-3.5 w-3.5 mr-1.5" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center mt-3">
                        <div className="flex -space-x-2">
                          {event.participants.slice(0, 3).map((user) => (
                            <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {event.participants.length > 3 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            +{event.participants.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="team" className="flex-1 mt-4 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-sm">Team Members</h3>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {chatChannels[0].participants.map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-sm">{user.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {user.id === 1 ? 'Project Manager' : 
                           user.id === 2 ? 'UI/UX Designer' :
                           user.id === 3 ? 'Frontend Developer' :
                           user.id === 4 ? 'QA Engineer' : 'Backend Developer'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main content area - Chat */}
        <div className="col-span-12 md:col-span-9 border rounded-lg h-full flex flex-col">
          {activeTab === "chats" && (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center">
                  {chatChannels[currentChat].type === 'direct' ? (
                    getUserAvatar(chatChannels[currentChat].participants[1])
                  ) : chatChannels[currentChat].type === 'team' ? (
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="ml-3">
                    <h3 className="font-medium">{chatChannels[currentChat].name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {chatChannels[currentChat].participants.length} participants
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chat messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
                        <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3 space-y-1">
                        <div className="flex items-center">
                          <span className="font-medium text-sm">{message.sender.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{message.timestamp}</span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        {message.attachments.length > 0 && (
                          <div className="flex items-center mt-2">
                            {message.attachments.map((attachment, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center py-1 px-3 rounded-full bg-accent text-sm mr-2"
                              >
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                <span>{attachment.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {attachment.size}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Chat input */}
              <div className="border-t p-4">
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Textarea 
                      placeholder="Type a message..." 
                      className="min-h-[80px] resize-none" 
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button onClick={sendMessage}>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "files" && (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Document Workspace</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <Button variant="outline" className="text-sm">All Files</Button>
                <Button variant="outline" className="text-sm">Shared with Me</Button>
                <Button variant="outline" className="text-sm">Recent</Button>
                <Button variant="outline" className="text-sm">Favorites</Button>
              </div>
              
              <Card className="flex-1">
                <CardHeader className="py-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>All Files</CardTitle>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Search files..."
                        className="w-[200px] h-8"
                      />
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center">
                          <div className="p-2 rounded-md bg-primary/10 mr-3">
                            {getDocumentIcon(doc.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{doc.title}</h4>
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-muted-foreground">Modified {doc.modified}</span>
                              <span className="text-xs text-muted-foreground mx-1">•</span>
                              <span className="text-xs text-muted-foreground">{doc.size}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={doc.modifiedBy.avatar} alt={doc.modifiedBy.name} />
                            <AvatarFallback>{doc.modifiedBy.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Team Calendar</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </div>
              
              <Card className="flex-1">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2 items-center">
                      <Button variant="outline" size="sm">
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </Button>
                      <CardTitle>April 2025</CardTitle>
                      <Button variant="outline" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Today</Button>
                      <Button variant="outline" size="sm">Day</Button>
                      <Button variant="outline" size="sm">Week</Button>
                      <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">Month</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-0 mb-2 text-center">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="p-2 text-sm font-medium">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0 h-[500px]">
                    {Array.from({ length: 35 }).map((_, idx) => {
                      const day = idx - 2; // Offset to start the month on the right day
                      return (
                        <div 
                          key={idx} 
                          className={`border p-1 min-h-[80px] ${
                            day < 1 || day > 30 ? 'bg-gray-50 dark:bg-gray-800/20 text-gray-400' : ''
                          } ${
                            day === 16 ? 'bg-primary/5 border-primary' : ''
                          }`}
                        >
                          <div className="text-right text-sm p-1">{day > 0 && day <= 30 ? day : ''}</div>
                          {day === 16 && (
                            <div className="mt-1">
                              {calendarEvents.map((event, eventIdx) => (
                                <div
                                  key={eventIdx}
                                  className="bg-primary/10 text-primary text-xs p-1 rounded mb-1 truncate"
                                >
                                  {event.title} ({event.start})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "team" && (
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Team Management</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <Button variant="outline" className="text-sm">All Members</Button>
                <Button variant="outline" className="text-sm">Frontend Team</Button>
                <Button variant="outline" className="text-sm">Backend Team</Button>
                <Button variant="outline" className="text-sm">Design Team</Button>
              </div>
              
              <Card className="flex-1">
                <CardHeader className="py-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Team Members</CardTitle>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Search members..."
                        className="w-[200px] h-8"
                      />
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {chatChannels[0].participants.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{user.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {user.id === 1 ? 'Project Manager' : 
                              user.id === 2 ? 'UI/UX Designer' :
                              user.id === 3 ? 'Frontend Developer' :
                              user.id === 4 ? 'QA Engineer' : 'Backend Developer'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={user.id === 1 ? 'border-primary text-primary' : ''}>
                            {user.id === 1 ? 'Admin' : 'Member'}
                          </Badge>
                          <Button variant="ghost" size="sm">Message</Button>
                          <Button variant="outline" size="sm">View Profile</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}