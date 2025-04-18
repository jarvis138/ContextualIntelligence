import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import UserPreferences from "@/components/settings/UserPreferences";
import { 
  User, 
  Shield, 
  Bell, 
  Languages, 
  PaintBucket, 
  Key, 
  Database, 
  Upload, 
  Download, 
  Terminal,
  Clock,
  Smartphone,
  Mail,
  Moon,
  Sun,
  Monitor,
  Settings as SettingsIcon,
  RefreshCw
} from 'lucide-react';

import Breadcrumb from '@/components/navigation/Breadcrumb';

export default function Settings() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumb 
        items={[
          {
            label: 'Settings',
            icon: <SettingsIcon className="h-4 w-4 mr-1" />
          }
        ]}
        className="mb-4"
      />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integration">Integrations</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="Alex" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Johnson" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="alex.johnson@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" defaultValue="Senior Project Manager" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select defaultValue="engineering">
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  placeholder="Tell us about yourself"
                  defaultValue="Project manager with 8+ years of experience in software development lifecycle management."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  <User className="h-12 w-12 text-gray-500" />
                </div>
                <Button variant="outline">Upload New Picture</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <UserPreferences />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Projects</h3>
                <div className="space-y-2">
                  {['New project created', 'Project status changes', 'Task assigned to you', 'Task deadline approaching', 'Project comments'].map((item) => (
                    <div key={item} className="flex items-center justify-between">
                      <span>{item}</span>
                      <div className="flex space-x-2">
                        <div className="flex items-center space-x-1">
                          <Switch id={`email-${item}`} />
                          <Label htmlFor={`email-${item}`} className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Switch id={`push-${item}`} defaultChecked />
                          <Label htmlFor={`push-${item}`} className="text-sm">Push</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Documents</h3>
                <div className="space-y-2">
                  {['Document shared with you', 'Document updated', 'Document comment added', 'Document access changed'].map((item) => (
                    <div key={item} className="flex items-center justify-between">
                      <span>{item}</span>
                      <div className="flex space-x-2">
                        <div className="flex items-center space-x-1">
                          <Switch id={`email-${item}`} />
                          <Label htmlFor={`email-${item}`} className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Switch id={`push-${item}`} defaultChecked />
                          <Label htmlFor={`push-${item}`} className="text-sm">Push</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System</h3>
                <div className="space-y-2">
                  {['Security alerts', 'System updates', 'Integration status changes', 'Weekly summary reports'].map((item) => (
                    <div key={item} className="flex items-center justify-between">
                      <span>{item}</span>
                      <div className="flex space-x-2">
                        <div className="flex items-center space-x-1">
                          <Switch id={`email-${item}`} defaultChecked />
                          <Label htmlFor={`email-${item}`} className="text-sm">Email</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Switch id={`push-${item}`} />
                          <Label htmlFor={`push-${item}`} className="text-sm">Push</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex items-center space-x-2">
                <Button variant="outline">Reset to Defaults</Button>
                <Button>Save Preferences</Button>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Delivery</CardTitle>
              <CardDescription>Configure how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailDigest">Email Digest Frequency</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quietHours">Quiet Hours</Label>
                <div className="flex items-center space-x-2">
                  <Select defaultValue="22:00">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="From" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(24)].map((_, i) => (
                        <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {`${i.toString().padStart(2, '0')}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>to</span>
                  <Select defaultValue="07:00">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="To" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(24)].map((_, i) => (
                        <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {`${i.toString().padStart(2, '0')}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="doNotDisturb">Do Not Disturb</Label>
                  <div className="text-sm text-muted-foreground">
                    Pause all notifications
                  </div>
                </div>
                <Switch id="doNotDisturb" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Update Password</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Enhance your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">Authenticator App</div>
                  <div className="text-sm text-muted-foreground">
                    Use an authenticator app to generate one-time codes
                  </div>
                </div>
                <Button variant="outline">Setup</Button>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <div className="font-medium">SMS Recovery</div>
                  <div className="text-sm text-muted-foreground">
                    Receive a code via SMS to verify your identity
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground mr-2">+1 *** *** 5678</span>
                  <Button variant="outline" size="sm">Change</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <div className="font-medium">Recovery Codes</div>
                  <div className="text-sm text-muted-foreground">
                    Generate backup codes for account recovery
                  </div>
                </div>
                <Button variant="outline">Generate Codes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Login Sessions</CardTitle>
              <CardDescription>Manage your active sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between p-3 bg-muted rounded-md">
                  <div className="flex items-start">
                    <div className="mr-4 mt-0.5">
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">MacBook Pro - Chrome</div>
                      <div className="text-sm text-muted-foreground">
                        San Francisco, CA, USA • Current Session
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">This Device</Button>
                </div>
                
                <div className="flex items-start justify-between p-3 rounded-md">
                  <div className="flex items-start">
                    <div className="mr-4 mt-0.5">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">iPhone 13 - Safari</div>
                      <div className="text-sm text-muted-foreground">
                        San Francisco, CA, USA • Last active: 2 hours ago
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Logout</Button>
                </div>
                
                <div className="flex items-start justify-between p-3 rounded-md">
                  <div className="flex items-start">
                    <div className="mr-4 mt-0.5">
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">Windows PC - Firefox</div>
                      <div className="text-sm text-muted-foreground">
                        New York, NY, USA • Last active: 5 days ago
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Logout</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Logout from All Other Devices</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Management</CardTitle>
              <CardDescription>Configure third-party service connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5.5 16C3.6 16 2 14.4 2 12.5S3.6 9 5.5 9l13 0C20.4 9 22 10.6 22 12.5S20.4 16 18.5 16l-13 0z"></path>
                      <path d="M7.5 12.5C7.5 16.09 10.41 19 14 19h1c3.59 0 6.5-2.91 6.5-6.5S18.59 6 15 6h-1c-3.59 0-6.5 2.91-6.5 6.5z"></path>
                      <path d="M15.5 9l0 7"></path>
                      <path d="M12.5 12l6 0"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Slack</h3>
                    <p className="text-sm text-muted-foreground">
                      Connected to Workspace: Team CPI Hub
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 mr-2">Connected</span>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Jira</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Jira project for task integration
                    </p>
                  </div>
                </div>
                <Button>Connect</Button>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Google Drive</h3>
                    <p className="text-sm text-muted-foreground">
                      Connected to: alex.johnson@example.com
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 mr-2">Connected</span>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 21 9-9"></path>
                      <path d="M13 13a3 3 0 0 0 0-6H9v2"></path>
                      <path d="M9 6V3"></path>
                      <path d="M9 13v-1"></path>
                      <circle cx="9" cy="19" r="2"></circle>
                      <circle cx="17" cy="7" r="2"></circle>
                      <path d="M17 17v-8"></path>
                      <circle cx="17" cy="19" r="2"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">GitHub</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your GitHub repositories
                    </p>
                  </div>
                </div>
                <Button>Connect</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API access to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Development API Key</h3>
                  <p className="text-sm text-muted-foreground">Created on Jan 15, 2025</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">Regenerate</Button>
                  <Button variant="destructive" size="sm">Revoke</Button>
                </div>
              </div>
              
              <div className="rounded-md border p-3 flex items-center justify-between">
                <div className="text-sm font-mono text-muted-foreground">•••••••••••••••••••••••••••••••</div>
                <Button variant="ghost" size="sm">Show</Button>
              </div>
              
              <div className="flex justify-end">
                <Button variant="outline">Generate New API Key</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Import & Export</CardTitle>
              <CardDescription>Manage your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Import Data</h3>
                <div className="border-2 border-dashed rounded-md p-6 text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop files or <span className="text-primary font-medium">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV, JSON, and XML formats up to 50MB
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-4">Export Data</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <span>Projects & Tasks</span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">CSV</Button>
                      <Button variant="outline" size="sm">JSON</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md">
                    <span>Documents & Comments</span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">CSV</Button>
                      <Button variant="outline" size="sm">JSON</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md">
                    <span>User Activity Log</span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">CSV</Button>
                      <Button variant="outline" size="sm">JSON</Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Full Account Export</h3>
                  <p className="text-sm text-muted-foreground">Export all your data in a single archive</p>
                </div>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
              <CardDescription>Manage how long your data is stored</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="retentionArchived">Archived Projects</Label>
                  <div className="text-sm text-muted-foreground">
                    How long to keep archived projects
                  </div>
                </div>
                <Select defaultValue="365">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="retentionDeletedDocs">Deleted Documents</Label>
                  <div className="text-sm text-muted-foreground">
                    How long to keep deleted documents in trash
                  </div>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="retentionActivityLogs">Activity Logs</Label>
                  <div className="text-sm text-muted-foreground">
                    How long to keep user activity history
                  </div>
                </div>
                <Select defaultValue="90">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure advanced system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Performance</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="preloadDocuments">Preload Documents</Label>
                      <div className="text-sm text-muted-foreground">
                        Preload documents for faster access
                      </div>
                    </div>
                    <Switch id="preloadDocuments" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="backgroundProcessing">Background Processing</Label>
                      <div className="text-sm text-muted-foreground">
                        Allow processing tasks in background
                      </div>
                    </div>
                    <Switch id="backgroundProcessing" defaultChecked />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Developer Options</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="debugMode">Debug Mode</Label>
                      <div className="text-sm text-muted-foreground">
                        Enable verbose logging for troubleshooting
                      </div>
                    </div>
                    <Switch id="debugMode" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="experimentalFeatures">Experimental Features</Label>
                      <div className="text-sm text-muted-foreground">
                        Enable access to features in development
                      </div>
                    </div>
                    <Switch id="experimentalFeatures" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Reset & Cleanup</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset All Settings to Default
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Terminal className="h-4 w-4 mr-2" />
                    Clear Application Cache
                  </Button>
                  <Button variant="destructive" className="w-full justify-start">
                    <div className="flex-1 text-left">Delete Account</div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}