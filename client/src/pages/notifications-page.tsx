import React, { useState } from 'react';
import { Bell, CheckCircle, X, AlertTriangle, Info, Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Mock notification data
const initialNotifications = [
  { 
    id: 1, 
    title: 'New comment', 
    message: 'John commented on your document "Project Requirements"',
    type: 'comment',
    read: false,
    timestamp: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    priority: 'medium'
  },
  { 
    id: 2, 
    title: 'Document processed', 
    message: 'Project requirements.pdf was processed successfully',
    type: 'system',
    read: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    priority: 'low'
  },
  { 
    id: 3, 
    title: 'Task due soon', 
    message: 'Your task "Update API documentation" is due in 2 days',
    type: 'reminder',
    read: false,
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    priority: 'high'
  },
  { 
    id: 4, 
    title: 'Meeting scheduled', 
    message: 'Weekly project meeting scheduled for tomorrow at 10:00 AM',
    type: 'calendar',
    read: true,
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    priority: 'medium'
  },
  { 
    id: 5, 
    title: 'Security alert', 
    message: 'New login to your account from unknown device',
    type: 'alert',
    read: true,
    timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    priority: 'high'
  },
];

// Get relative time string
const getRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000; // years
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000; // months
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400; // days
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600; // hours
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60; // minutes
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return 'just now';
};

// Get icon for notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'comment':
      return <MessageSquare className="h-4 w-4" />;
    case 'reminder':
      return <AlertTriangle className="h-4 w-4" />;
    case 'calendar':
      return <Calendar className="h-4 w-4" />;
    case 'alert':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'system':
    default:
      return <Info className="h-4 w-4" />;
  }
};

// Get icon color for notification type
const getNotificationColor = (type: string) => {
  switch (type) {
    case 'comment':
      return 'bg-blue-100 text-blue-600';
    case 'reminder':
      return 'bg-amber-100 text-amber-600';
    case 'calendar':
      return 'bg-green-100 text-green-600';
    case 'alert':
      return 'bg-red-100 text-red-600';
    case 'system':
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const { toast } = useToast();
  
  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    return notification.type === activeTab;
  });
  
  // Sort notifications
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (sortBy === 'priority') {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      return priorityMap[b.priority as keyof typeof priorityMap] - priorityMap[a.priority as keyof typeof priorityMap];
    }
    return 0;
  });
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast({
      title: "All notifications marked as read",
      description: `${unreadCount} notifications have been marked as read.`
    });
  };
  
  // Mark one notification as read
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };
  
  // Delete a notification
  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast({
      title: "Notification removed",
      description: "The notification has been removed from your list."
    });
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    toast({
      title: "All notifications cleared",
      description: "Your notification list has been cleared."
    });
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
          <Button variant="outline" onClick={clearAllNotifications} disabled={notifications.length === 0}>
            <X className="mr-2 h-4 w-4" />
            Clear all
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Your Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} unread</Badge>
            )}
          </div>
          <CardDescription>
            Stay updated on recent activities, comments, and system alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">
                All
                {notifications.length > 0 && (
                  <span className="ml-2 text-xs bg-muted rounded-full h-5 min-w-5 inline-flex items-center justify-center px-1.5">
                    {notifications.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs bg-muted rounded-full h-5 min-w-5 inline-flex items-center justify-center px-1.5">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="comment">Comments</TabsTrigger>
              <TabsTrigger value="calendar">Meetings</TabsTrigger>
              <TabsTrigger value="reminder">Reminders</TabsTrigger>
              <TabsTrigger value="alert">Alerts</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
              {sortedNotifications.length > 0 ? (
                <div className="space-y-4">
                  {sortedNotifications.map((notification) => (
                    <div key={notification.id} className={`p-4 border rounded-lg transition-colors ${!notification.read ? 'bg-muted/30' : ''}`}>
                      <div className="flex items-start gap-4">
                        <div className={`rounded-full p-2 ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {notification.title}
                                {notification.priority === 'high' && (
                                  <Badge variant="destructive" className="text-[10px] h-5">High priority</Badge>
                                )}
                                {!notification.read && (
                                  <Badge variant="secondary" className="text-[10px] h-5">New</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="sr-only">Mark as read</span>
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {getRelativeTime(notification.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No notifications</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === 'all' 
                      ? "You don't have any notifications yet" 
                      : `You don't have any ${activeTab === 'unread' ? 'unread' : activeTab} notifications`}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Configure your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-4">Delivery Methods</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a href="/settings?tab=notifications" className="block p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="font-medium">Email Notifications</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage how you receive emails for notifications
                </p>
              </a>
              <a href="/settings?tab=notifications" className="block p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="font-medium">Push Notifications</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Control alerts on your devices
                </p>
              </a>
              <a href="/settings?tab=notifications" className="block p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="font-medium">In-app Notifications</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Adjust what appears in your notification panel
                </p>
              </a>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href="/settings?tab=notifications">Edit Notification Settings</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/settings?tab=notifications&section=preferences">Notification Preferences</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/settings?tab=notifications&section=schedule">Do Not Disturb Schedule</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 