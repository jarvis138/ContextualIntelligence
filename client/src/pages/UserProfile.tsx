import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  UserIcon,
  SettingsIcon,
  BellIcon,
  ShieldIcon,
  KeyIcon,
  AlertTriangleIcon,
  LogOutIcon,
  CheckIcon,
  XIcon,
  LoaderIcon,
  ClockIcon,
  RefreshCwIcon,
  LinkIcon
} from 'lucide-react';

// Default user if not provided
const defaultUser = {
  id: 1,
  username: 'alexmorgan',
  fullName: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  role: 'Project Manager',
  jobTitle: 'Senior Project Manager',
  department: 'Engineering',
  location: 'San Francisco, CA',
  timezone: 'America/Los_Angeles',
  bio: 'Project management professional with 5+ years of experience in software development projects.',
  phone: '+1 (555) 123-4567',
  lastActive: '2023-05-20T14:30:00Z',
  joinDate: '2020-03-15T09:00:00Z',
  authMethod: 'local',
  activeIntegrations: ['slack', 'github', 'google_drive'],
  preferences: {
    emailNotifications: true,
    pushNotifications: false,
    desktopNotifications: true,
    darkMode: false,
    language: 'en',
    timezone: 'America/Los_Angeles',
    twoFactorAuth: false
  },
  recentActivity: [
    {
      id: 1,
      type: 'comment',
      projectId: 1,
      projectName: 'Web Application Redesign',
      timestamp: '2023-05-19T16:45:00Z',
      description: 'Commented on design document'
    },
    {
      id: 2,
      type: 'document',
      projectId: 1,
      projectName: 'Web Application Redesign',
      timestamp: '2023-05-18T14:30:00Z',
      description: 'Uploaded new wireframes'
    },
    {
      id: 3,
      type: 'task',
      projectId: 1,
      projectName: 'Web Application Redesign',
      timestamp: '2023-05-17T11:15:00Z',
      description: 'Completed task "Finalize color palette"'
    }
  ]
};

// Integration providers
const integrationProviders = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    icon: 'ri-google-drive-fill',
    description: 'Access and import documents from Google Drive',
    color: 'text-yellow-500'
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: 'ri-slack-fill',
    description: 'Connect with your Slack workspace',
    color: 'text-purple-500'
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'ri-github-fill',
    description: 'Sync with GitHub repositories',
    color: 'text-gray-800'
  },
  {
    id: 'microsoft365',
    name: 'Microsoft 365',
    icon: 'ri-microsoft-fill',
    description: 'Connect with Microsoft 365 services',
    color: 'text-blue-500'
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: 'ri-jira-fill',
    description: 'Sync with Jira projects and issues',
    color: 'text-blue-600'
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: 'ri-trello-fill',
    description: 'Import boards and cards from Trello',
    color: 'text-sky-500'
  }
];

export default function UserProfile() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileData, setProfileData] = useState(defaultUser);
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Fetch user data
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: async () => {
      try {
        // In a real implementation, fetch from API
        return defaultUser;
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive'
        });
        return defaultUser;
      }
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof password) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });
      setPassword({
        current: '',
        new: '',
        confirm: ''
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to change password',
        variant: 'destructive'
      });
    }
  });

  // Toggle integration mutation
  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'connect' | 'disconnect' }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      toast({
        title: 'Success',
        description: `${variables.action === 'connect' ? 'Connected to' : 'Disconnected from'} integration`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update integration',
        variant: 'destructive'
      });
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle preference toggle
  const handlePreferenceToggle = (name: string, checked: boolean) => {
    setProfileData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [name]: checked
      }
    }));
  };

  // Handle password change input
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPassword(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle profile update
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  // Handle password update
  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.new !== password.confirm) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive'
      });
      return;
    }
    
    changePasswordMutation.mutate(password);
  };

  // Handle integration toggle
  const handleIntegrationToggle = (id: string, isConnected: boolean) => {
    toggleIntegrationMutation.mutate({
      id,
      action: isConnected ? 'disconnect' : 'connect'
    });
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      toast({
        title: 'Success',
        description: 'Logged out successfully',
      });
      setLocation('/auth');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={profileData} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <TopBar 
          project={{
            id: 0,
            name: 'User Profile',
            description: 'Manage your account settings',
            status: 'active',
            progress: 100
          }}
          teamMembers={[profileData]}
        />
        
        <div className="container mx-auto py-8 px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - User Info Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Avatar className="h-24 w-24 border-4 border-background">
                      <AvatarImage src={profileData.avatar} alt={profileData.fullName} />
                      <AvatarFallback>
                        {profileData.fullName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle>{profileData.fullName}</CardTitle>
                  <CardDescription className="flex flex-col items-center gap-2">
                    <span className="text-sm">{profileData.jobTitle}</span>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <UserIcon className="h-3 w-3" />
                      {profileData.role}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{profileData.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span>@{profileData.username}</span>
                    </div>
                    
                    {profileData.department && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{profileData.department}</span>
                      </div>
                    )}
                    
                    {profileData.location && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{profileData.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Last active: {new Date(profileData.lastActive).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Joined: {new Date(profileData.joinDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Bio</h4>
                    <p className="text-sm text-muted-foreground">{profileData.bio || 'No bio provided'}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="destructive" 
                    className="w-full gap-2"
                    onClick={handleLogout}
                  >
                    <LogOutIcon className="h-4 w-4" />
                    Sign Out
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Recent Activity Card */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profileData.recentActivity.map(activity => (
                      <div key={activity.id} className="flex gap-2">
                        <div className="mt-0.5">
                          {activity.type === 'comment' && (
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <i className="ri-message-2-line text-blue-600 text-sm"></i>
                            </div>
                          )}
                          {activity.type === 'document' && (
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <i className="ri-file-text-line text-green-600 text-sm"></i>
                            </div>
                          )}
                          {activity.type === 'task' && (
                            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <i className="ri-task-line text-purple-600 text-sm"></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{activity.projectName}</span>
                            <span>•</span>
                            <span>{new Date(activity.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column - Settings Tabs */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile" className="gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Profile</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="gap-2">
                    <ShieldIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Security</span>
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="gap-2">
                    <BellIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Notifications</span>
                  </TabsTrigger>
                  <TabsTrigger value="integrations" className="gap-2">
                    <LinkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Integrations</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* Profile Tab */}
                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update your profile information visible to other users
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                              id="fullName"
                              name="fullName"
                              value={profileData.fullName}
                              onChange={handleInputChange}
                              placeholder="Your full name"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              name="username"
                              value={profileData.username}
                              onChange={handleInputChange}
                              placeholder="Your username"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={profileData.email}
                              onChange={handleInputChange}
                              placeholder="Your email address"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              name="phone"
                              value={profileData.phone}
                              onChange={handleInputChange}
                              placeholder="Your phone number"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input
                              id="jobTitle"
                              name="jobTitle"
                              value={profileData.jobTitle}
                              onChange={handleInputChange}
                              placeholder="Your job title"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input
                              id="department"
                              name="department"
                              value={profileData.department}
                              onChange={handleInputChange}
                              placeholder="Your department"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              name="location"
                              value={profileData.location}
                              onChange={handleInputChange}
                              placeholder="Your location"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="timezone">Timezone</Label>
                            <Select
                              value={profileData.timezone}
                              onValueChange={(value) => 
                                setProfileData(prev => ({ ...prev, timezone: value }))
                              }
                            >
                              <SelectTrigger id="timezone">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                                <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
                                <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
                                <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                                <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            name="bio"
                            value={profileData.bio}
                            onChange={handleInputChange}
                            placeholder="Tell us about yourself"
                            rows={4}
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full md:w-auto"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending && (
                            <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Security Tab */}
                <TabsContent value="security">
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>
                        Update your account password
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="current">Current Password</Label>
                          <Input
                            id="current"
                            name="current"
                            type="password"
                            value={password.current}
                            onChange={handlePasswordChange}
                            required
                            placeholder="Enter your current password"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="new">New Password</Label>
                          <Input
                            id="new"
                            name="new"
                            type="password"
                            value={password.new}
                            onChange={handlePasswordChange}
                            required
                            placeholder="Enter your new password"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirm">Confirm New Password</Label>
                          <Input
                            id="confirm"
                            name="confirm"
                            type="password"
                            value={password.confirm}
                            onChange={handlePasswordChange}
                            required
                            placeholder="Confirm your new password"
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full md:w-auto"
                          disabled={changePasswordMutation.isPending}
                        >
                          {changePasswordMutation.isPending && (
                            <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Update Password
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Two-Factor Authentication</CardTitle>
                      <CardDescription>
                        Add an extra layer of security to your account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">Two-Factor Authentication</div>
                          <p className="text-sm text-muted-foreground">
                            Require a code in addition to your password when signing in
                          </p>
                        </div>
                        <Switch
                          checked={profileData.preferences.twoFactorAuth}
                          onCheckedChange={(checked) => 
                            handlePreferenceToggle('twoFactorAuth', checked)
                          }
                        />
                      </div>
                      
                      {!profileData.preferences.twoFactorAuth && (
                        <Button 
                          variant="outline" 
                          className="mt-4 w-full md:w-auto"
                          onClick={() => {
                            handlePreferenceToggle('twoFactorAuth', true);
                            toast({
                              title: 'Not Implemented',
                              description: 'This feature would show a 2FA setup wizard',
                            });
                          }}
                        >
                          <ShieldIcon className="mr-2 h-4 w-4" />
                          Set Up Two-Factor Authentication
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Notifications Tab */}
                <TabsContent value="notifications">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Preferences</CardTitle>
                      <CardDescription>
                        Manage how you receive notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Email Notifications</h3>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-medium">Project Updates</div>
                            <p className="text-sm text-muted-foreground">
                              Receive email notifications for project activity
                            </p>
                          </div>
                          <Switch
                            checked={profileData.preferences.emailNotifications}
                            onCheckedChange={(checked) => 
                              handlePreferenceToggle('emailNotifications', checked)
                            }
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Push Notifications</h3>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-medium">Mobile Push Notifications</div>
                            <p className="text-sm text-muted-foreground">
                              Receive push notifications on your mobile device
                            </p>
                          </div>
                          <Switch
                            checked={profileData.preferences.pushNotifications}
                            onCheckedChange={(checked) => 
                              handlePreferenceToggle('pushNotifications', checked)
                            }
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Desktop Notifications</h3>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-medium">Browser Notifications</div>
                            <p className="text-sm text-muted-foreground">
                              Show notifications in your browser
                            </p>
                          </div>
                          <Switch
                            checked={profileData.preferences.desktopNotifications}
                            onCheckedChange={(checked) => 
                              handlePreferenceToggle('desktopNotifications', checked)
                            }
                          />
                        </div>
                      </div>
                      
                      <Button 
                        className="mt-4"
                        onClick={() => {
                          updateProfileMutation.mutate(profileData);
                        }}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending && (
                          <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Notification Preferences
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Integrations Tab */}
                <TabsContent value="integrations">
                  <Card>
                    <CardHeader>
                      <CardTitle>Connected Services</CardTitle>
                      <CardDescription>
                        Manage third-party services and applications
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {integrationProviders.map(provider => {
                          const isConnected = profileData.activeIntegrations.includes(provider.id);
                          
                          return (
                            <div key={provider.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-md flex items-center justify-center bg-gray-100 ${provider.color}`}>
                                  <i className={`${provider.icon} text-lg`}></i>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-medium">{provider.name}</div>
                                  <p className="text-sm text-muted-foreground">
                                    {provider.description}
                                  </p>
                                </div>
                              </div>
                              
                              <Button
                                variant={isConnected ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => handleIntegrationToggle(provider.id, isConnected)}
                                disabled={toggleIntegrationMutation.isPending}
                              >
                                {toggleIntegrationMutation.isPending && 
                                 toggleIntegrationMutation.variables?.id === provider.id ? (
                                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                                ) : isConnected ? (
                                  <>
                                    <XIcon className="mr-2 h-4 w-4" />
                                    Disconnect
                                  </>
                                ) : (
                                  <>
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Connect
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}