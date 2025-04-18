import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Settings,
  Shield,
  Key,
  Bell,
  Globe,
  Database,
  Lock,
  Clock,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Cloud,
  UserPlus,
  Building,
  Check
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantName, setTenantName] = useState("Acme Corporation");
  const [tenantId, setTenantId] = useState("tenant-123");
  const [dataRegion, setDataRegion] = useState("eu-west-1");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(true);
  const [teamsNotifications, setTeamsNotifications] = useState(false);
  const [auditLogging, setAuditLogging] = useState(true);
  const [retentionPeriod, setRetentionPeriod] = useState("90");
  const [multiFactorAuth, setMultiFactorAuth] = useState(true);
  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: "Production", key: "••••••••••••••••", created: "2025-01-15", lastUsed: "2025-04-15", scopes: ["read", "write"] },
    { id: 2, name: "Development", key: "••••••••••••••••", created: "2025-02-20", lastUsed: "2025-04-10", scopes: ["read"] },
    { id: 3, name: "Analytics", key: "••••••••••••••••", created: "2025-03-05", lastUsed: "2025-04-12", scopes: ["read", "analytics"] }
  ]);
  
  // Platform connection settings
  const [platformSettings, setPlatformSettings] = useState({
    jira: { enabled: true, url: "https://acme.atlassian.net", apiKey: "••••••••••••••••" },
    github: { enabled: true, url: "https://github.com/acme", apiKey: "••••••••••••••••" },
    slack: { enabled: true, workspaceId: "T0123456", apiKey: "••••••••••••••••" },
    figma: { enabled: false, teamId: "", apiKey: "" },
    drive: { enabled: true, domain: "acme.com", apiKey: "••••••••••••••••" },
    teams: { enabled: false, tenantId: "", clientId: "" }
  });

  const handleRevokeApiKey = (id: number) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
    
    toast({
      title: "API key revoked",
      description: "The API key has been permanently revoked",
    });
  };

  const handleGenerateApiKey = () => {
    const newKey = {
      id: apiKeys.length + 1,
      name: "New Key",
      key: "••••••••••••••••",
      created: new Date().toISOString().split('T')[0],
      lastUsed: new Date().toISOString().split('T')[0],
      scopes: ["read"]
    };
    
    setApiKeys([...apiKeys, newKey]);
    
    toast({
      title: "New API key generated",
      description: "The new API key has been created with Read-only access"
    });
  };

  const handleSaveGeneralSettings = () => {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      
      toast({
        title: "Settings saved",
        description: "Your organization settings have been updated."
      });
    }, 1500);
  };

  const handleConnectPlatform = (platform: string) => {
    toast({
      title: "Connect Platform",
      description: `A new window will open to connect your ${platform} account.`
    });
  };

  const handleDisconnectPlatform = (platform: string) => {
    const updatedSettings = { ...platformSettings };
    const platformKey = platform as keyof typeof platformSettings;
    
    // Update all platforms to disabled state
    updatedSettings[platformKey].enabled = false;
    
    // Reset the appropriate field based on platform
    if (platform === 'teams') {
      (updatedSettings[platformKey] as any).clientId = "";
    } else {
      (updatedSettings[platformKey] as any).apiKey = "";
    }
    
    setPlatformSettings(updatedSettings);
    
    toast({
      title: "Platform disconnected",
      description: `Your ${platform} account has been disconnected.`
    });
  };

  const handleToggleTenantSetting = (setting: string, value: boolean) => {
    if (setting === 'notifications') {
      setNotificationsEnabled(value);
    } else if (setting === 'email') {
      setEmailNotifications(value);
    } else if (setting === 'slack') {
      setSlackNotifications(value);
    } else if (setting === 'teams') {
      setTeamsNotifications(value);
    } else if (setting === 'audit') {
      setAuditLogging(value);
    } else if (setting === 'mfa') {
      setMultiFactorAuth(value);
    }
    
    toast({
      title: "Setting updated",
      description: `${setting.charAt(0).toUpperCase() + setting.slice(1)} setting has been ${value ? 'enabled' : 'disabled'}.`
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings and preferences
        </p>
      </div>
      
      <Tabs defaultValue="organization">
        <TabsList className="grid grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="organization">
            <Building className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Cloud className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="h-4 w-4 mr-2" />
            API
          </TabsTrigger>
        </TabsList>
        
        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Manage your organization profile and tenant settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Organization Name</Label>
                  <Input 
                    id="tenant-name" 
                    value={tenantName} 
                    onChange={(e) => setTenantName(e.target.value)} 
                  />
                  <p className="text-sm text-muted-foreground">
                    The name of your organization as it appears in the system.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tenant-id">Tenant ID</Label>
                  <div className="flex">
                    <Input 
                      id="tenant-id" 
                      value={tenantId} 
                      readOnly 
                      className="bg-muted" 
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2"
                      onClick={() => {
                        navigator.clipboard.writeText(tenantId);
                        toast({
                          title: "Copied!",
                          description: "Tenant ID copied to clipboard",
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your unique tenant identifier for data isolation.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Admin Contact Email</Label>
                  <Input 
                    id="contact-email" 
                    type="email"
                    defaultValue="admin@acme.com" 
                  />
                  <p className="text-sm text-muted-foreground">
                    Primary contact for administrative notifications.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data-region">Data Residency Region</Label>
                  <Select value={dataRegion} onValueChange={setDataRegion}>
                    <SelectTrigger id="data-region">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                      <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                      <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Geographic region where your data is stored for compliance.
                  </p>
                </div>
                
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="organization-description">Organization Description</Label>
                  <Textarea 
                    id="organization-description" 
                    placeholder="Brief description of your organization" 
                    defaultValue="Acme Corporation is a global technology firm specializing in enterprise software solutions."
                  />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Data Isolation Strategy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Current setup for enterprise-grade tenant data isolation
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-sm">Database Isolation</CardTitle>
                        <Badge variant="outline" className="text-green-600 border-green-200 dark:text-green-400 dark:border-green-800">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Dedicated schema for your tenant with Row-Level Security</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-sm">File Storage Isolation</CardTitle>
                        <Badge variant="outline" className="text-green-600 border-green-200 dark:text-green-400 dark:border-green-800">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Tenant-specific storage buckets with IAM policies</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-sm">Search Index Isolation</CardTitle>
                        <Badge variant="outline" className="text-green-600 border-green-200 dark:text-green-400 dark:border-green-800">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Elasticsearch tenant-specific indices with security</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-sm">Cache Isolation</CardTitle>
                        <Badge variant="outline" className="text-green-600 border-green-200 dark:text-green-400 dark:border-green-800">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Redis database partitioning for tenant-specific caching</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Resource Usage</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Current utilization of your allocated resources
                </p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-sm">Storage Usage</Label>
                      <span className="text-sm">42.7 GB / 100 GB</span>
                    </div>
                    <Progress value={42.7} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-sm">Database Connections</Label>
                      <span className="text-sm">18 / 50</span>
                    </div>
                    <Progress value={36} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-sm">API Requests (Daily)</Label>
                      <span className="text-sm">143,502 / 1,000,000</span>
                    </div>
                    <Progress value={14.3} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-sm">Active Users</Label>
                      <span className="text-sm">842 / 10,000</span>
                    </div>
                    <Progress value={8.4} />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  setTenantName("Acme Corporation");
                  setDataRegion("eu-west-1");
                }}
              >
                Reset
              </Button>
              <Button 
                onClick={handleSaveGeneralSettings} 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
              <CardDescription>
                Configure data handling for regulatory compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">GDPR Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <Label htmlFor="gdpr-switch">Enable GDPR Controls</Label>
                      <Switch id="gdpr-switch" defaultChecked={true} />
                    </div>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li>Data subject access requests</li>
                      <li>Right to be forgotten</li>
                      <li>Data portability</li>
                      <li>Consent management</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">HIPAA Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <Label htmlFor="hipaa-switch">Enable HIPAA Controls</Label>
                      <Switch id="hipaa-switch" defaultChecked={false} />
                    </div>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li>PHI data encryption</li>
                      <li>Access audit logging</li>
                      <li>BAA documentation</li>
                      <li>Breach notification</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">SOC 2 Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <Label htmlFor="soc2-switch">Enable SOC 2 Controls</Label>
                      <Switch id="soc2-switch" defaultChecked={true} />
                    </div>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li>Access control verification</li>
                      <li>Change management</li>
                      <li>Risk assessment</li>
                      <li>Vendor management</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <div className="border rounded-md p-4 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300">Compliance Notice</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Changing compliance settings may require reconfiguration of data handling processes and could affect existing data. Please consult with your compliance officer before making changes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                Save Compliance Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage authentication, authorization, and data protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Multi-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Require MFA for all users in your organization
                      </p>
                    </div>
                    <Switch 
                      checked={multiFactorAuth}
                      onCheckedChange={(checked) => handleToggleTenantSetting('mfa', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Single Sign-On (SSO)</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable enterprise SSO via SAML or OIDC
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Password Policy</Label>
                      <p className="text-sm text-muted-foreground">
                        Enforce strong password requirements
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Session Management</Label>
                      <p className="text-sm text-muted-foreground">
                        Control session duration and concurrent logins
                      </p>
                    </div>
                    <Select defaultValue="60">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Session timeout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Audit & Compliance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">
                        Track all security events and user actions
                      </p>
                    </div>
                    <Switch 
                      checked={auditLogging}
                      onCheckedChange={(checked) => handleToggleTenantSetting('audit', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Data Retention</Label>
                      <p className="text-sm text-muted-foreground">
                        Set audit log retention period
                      </p>
                    </div>
                    <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Retention period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Export Audit Logs</Label>
                      <p className="text-sm text-muted-foreground">
                        Download audit logs for compliance reporting
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Export Logs
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Data Protection</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Encryption at Rest</Label>
                      <p className="text-sm text-muted-foreground">
                        All stored data is encrypted using AES-256
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-500">
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Encryption in Transit</Label>
                      <p className="text-sm text-muted-foreground">
                        TLS 1.3 for all data transmissions
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-500">
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Automated Backups</Label>
                      <p className="text-sm text-muted-foreground">
                        Daily encrypted backups with 30-day retention
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Data Residency Controls</Label>
                      <p className="text-sm text-muted-foreground">
                        Specify geographic location for data storage
                      </p>
                    </div>
                    <Select defaultValue="eu-west-1">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                        <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                Save Security Settings
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>
                Manage roles and permissions for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Role-Based Access Control (RBAC)</Label>
                  <div className="mt-4 border rounded-md divide-y">
                    <div className="grid grid-cols-7 p-3 font-medium text-sm">
                      <div className="col-span-2">Role</div>
                      <div className="col-span-5 grid grid-cols-5 text-center">
                        <div>View</div>
                        <div>Create</div>
                        <div>Edit</div>
                        <div>Delete</div>
                        <div>Admin</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 p-3">
                      <div className="col-span-2 flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-primary" />
                        <span>Administrator</span>
                      </div>
                      <div className="col-span-5 grid grid-cols-5 place-items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 p-3">
                      <div className="col-span-2 flex items-center">
                        <User className="h-4 w-4 mr-2 text-blue-500" />
                        <span>Manager</span>
                      </div>
                      <div className="col-span-5 grid grid-cols-5 place-items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 p-3">
                      <div className="col-span-2 flex items-center">
                        <User className="h-4 w-4 mr-2 text-purple-500" />
                        <span>Developer</span>
                      </div>
                      <div className="col-span-5 grid grid-cols-5 place-items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 p-3">
                      <div className="col-span-2 flex items-center">
                        <User className="h-4 w-4 mr-2 text-green-500" />
                        <span>Analyst</span>
                      </div>
                      <div className="col-span-5 grid grid-cols-5 place-items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-7 p-3">
                      <div className="col-span-2 flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Viewer</span>
                      </div>
                      <div className="col-span-5 grid grid-cols-5 place-items-center">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                        <AlertTriangle className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm" className="mr-2">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Role
                    </Button>
                    <Button size="sm">
                      Edit Permissions
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Integrations</CardTitle>
              <CardDescription>
                Connect third-party platforms for unified data access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={platformSettings.jira.enabled ? "border-green-200" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-base">Jira Integration</CardTitle>
                      <Badge variant={platformSettings.jira.enabled ? "default" : "outline"}>
                        {platformSettings.jira.enabled ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {platformSettings.jira.enabled ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">URL:</span>
                          <span className="col-span-2 truncate">{platformSettings.jira.url}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">API Key:</span>
                          <span className="col-span-2">{platformSettings.jira.apiKey}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="col-span-2 text-green-500 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Working
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Connect to Jira to import issues and manage projects
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    {platformSettings.jira.enabled ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleDisconnectPlatform('jira')}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleConnectPlatform('Jira')}
                      >
                        Connect Jira
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                <Card className={platformSettings.github.enabled ? "border-green-200" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-base">GitHub Integration</CardTitle>
                      <Badge variant={platformSettings.github.enabled ? "default" : "outline"}>
                        {platformSettings.github.enabled ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {platformSettings.github.enabled ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">URL:</span>
                          <span className="col-span-2 truncate">{platformSettings.github.url}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">API Key:</span>
                          <span className="col-span-2">{platformSettings.github.apiKey}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="col-span-2 text-green-500 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Working
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Connect to GitHub to sync repositories and pull requests
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    {platformSettings.github.enabled ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleDisconnectPlatform('github')}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleConnectPlatform('GitHub')}
                      >
                        Connect GitHub
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                <Card className={platformSettings.slack.enabled ? "border-green-200" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-base">Slack Integration</CardTitle>
                      <Badge variant={platformSettings.slack.enabled ? "default" : "outline"}>
                        {platformSettings.slack.enabled ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {platformSettings.slack.enabled ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Workspace:</span>
                          <span className="col-span-2 truncate">{platformSettings.slack.workspaceId}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">API Key:</span>
                          <span className="col-span-2">{platformSettings.slack.apiKey}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="col-span-2 text-green-500 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Working
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Connect to Slack for team communications and notifications
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    {platformSettings.slack.enabled ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleDisconnectPlatform('slack')}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleConnectPlatform('Slack')}
                      >
                        Connect Slack
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                <Card className={platformSettings.figma.enabled ? "border-green-200" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-base">Figma Integration</CardTitle>
                      <Badge variant={platformSettings.figma.enabled ? "default" : "outline"}>
                        {platformSettings.figma.enabled ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {platformSettings.figma.enabled ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Team ID:</span>
                          <span className="col-span-2 truncate">{platformSettings.figma.teamId}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">API Key:</span>
                          <span className="col-span-2">{platformSettings.figma.apiKey}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="col-span-2 text-green-500 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Working
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Connect to Figma to access design files and components
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    {platformSettings.figma.enabled ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleDisconnectPlatform('figma')}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleConnectPlatform('Figma')}
                      >
                        Connect Figma
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                <Card className={platformSettings.drive.enabled ? "border-green-200" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-base">Google Drive</CardTitle>
                      <Badge variant={platformSettings.drive.enabled ? "default" : "outline"}>
                        {platformSettings.drive.enabled ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {platformSettings.drive.enabled ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Domain:</span>
                          <span className="col-span-2 truncate">{platformSettings.drive.domain}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">API Key:</span>
                          <span className="col-span-2">{platformSettings.drive.apiKey}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="col-span-2 text-green-500 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Working
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Connect to Google Drive to access documents and files
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    {platformSettings.drive.enabled ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleDisconnectPlatform('drive')}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleConnectPlatform('Google Drive')}
                      >
                        Connect Drive
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                
                <Card className={platformSettings.teams.enabled ? "border-green-200" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-base">Microsoft Teams</CardTitle>
                      <Badge variant={platformSettings.teams.enabled ? "default" : "outline"}>
                        {platformSettings.teams.enabled ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {platformSettings.teams.enabled ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Tenant ID:</span>
                          <span className="col-span-2 truncate">{platformSettings.teams.tenantId}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Client ID:</span>
                          <span className="col-span-2">{platformSettings.teams.clientId}</span>
                        </div>
                        <div className="grid grid-cols-3 text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="col-span-2 text-green-500 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Working
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Connect to Microsoft Teams for meetings and collaboration
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    {platformSettings.teams.enabled ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleDisconnectPlatform('teams')}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleConnectPlatform('Microsoft Teams')}
                      >
                        Connect Teams
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Data Sync Settings</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sync-frequency">Sync Frequency</Label>
                      <Select defaultValue="15">
                        <SelectTrigger id="sync-frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">Every 5 minutes</SelectItem>
                          <SelectItem value="15">Every 15 minutes</SelectItem>
                          <SelectItem value="30">Every 30 minutes</SelectItem>
                          <SelectItem value="60">Every hour</SelectItem>
                          <SelectItem value="360">Every 6 hours</SelectItem>
                          <SelectItem value="720">Every 12 hours</SelectItem>
                          <SelectItem value="1440">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How often to sync data from connected platforms
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sync-depth">Sync Depth</Label>
                      <Select defaultValue="90">
                        <SelectTrigger id="sync-depth">
                          <SelectValue placeholder="Select depth" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Last 7 days</SelectItem>
                          <SelectItem value="30">Last 30 days</SelectItem>
                          <SelectItem value="90">Last 90 days</SelectItem>
                          <SelectItem value="180">Last 6 months</SelectItem>
                          <SelectItem value="365">Last year</SelectItem>
                          <SelectItem value="all">All data</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How far back to sync historical data
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="conflict-resolution">Conflict Resolution</Label>
                      <Select defaultValue="latest">
                        <SelectTrigger id="conflict-resolution">
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">Latest Wins</SelectItem>
                          <SelectItem value="source">Source Priority</SelectItem>
                          <SelectItem value="manual">Manual Resolution</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How to handle conflicting data from different sources
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="batch-size">Batch Size</Label>
                      <Select defaultValue="100">
                        <SelectTrigger id="batch-size">
                          <SelectValue placeholder="Select batch size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50 items</SelectItem>
                          <SelectItem value="100">100 items</SelectItem>
                          <SelectItem value="250">250 items</SelectItem>
                          <SelectItem value="500">500 items</SelectItem>
                          <SelectItem value="1000">1000 items</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Number of items to process in each sync operation
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <h4 className="font-medium">Force Manual Sync</h4>
                      <p className="text-sm text-muted-foreground">
                        Trigger an immediate sync of all connected platforms
                      </p>
                    </div>
                    <Button variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                Save Integration Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Master toggle for all notification types
                  </p>
                </div>
                <Switch 
                  checked={notificationsEnabled}
                  onCheckedChange={(checked) => handleToggleTenantSetting('notifications', checked)}
                />
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch 
                      checked={emailNotifications}
                      disabled={!notificationsEnabled}
                      onCheckedChange={(checked) => handleToggleTenantSetting('email', checked)}
                    />
                  </div>
                  
                  {emailNotifications && (
                    <div className="ml-8 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Email Digest</Label>
                        <Select defaultValue="daily">
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="real-time">Real-time</SelectItem>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Recipients</Label>
                        <Input defaultValue="admin@acme.com, team@acme.com" />
                        <p className="text-xs text-muted-foreground">
                          Comma-separated list of email addresses
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Slack Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send notifications to Slack channels
                      </p>
                    </div>
                    <Switch 
                      checked={slackNotifications}
                      disabled={!notificationsEnabled}
                      onCheckedChange={(checked) => handleToggleTenantSetting('slack', checked)}
                    />
                  </div>
                  
                  {slackNotifications && (
                    <div className="ml-8 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Default Channel</Label>
                        <Input defaultValue="#cpi-hub-alerts" className="w-[180px]" />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Message Format</Label>
                        <Select defaultValue="detailed">
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Microsoft Teams Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send notifications to Teams channels
                      </p>
                    </div>
                    <Switch 
                      checked={teamsNotifications}
                      disabled={!notificationsEnabled}
                      onCheckedChange={(checked) => handleToggleTenantSetting('teams', checked)}
                    />
                  </div>
                  
                  {teamsNotifications && (
                    <div className="ml-8 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Teams Webhook URL</Label>
                        <Input defaultValue="https://outlook.office.com/webhook/..." className="w-[250px]" />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Channel Name</Label>
                        <Input defaultValue="CPI Hub Alerts" className="w-[180px]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Notification Types</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">System Alerts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Service Disruptions</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Performance Issues</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Security Events</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Maintenance Updates</Label>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">User Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">New User Signups</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Role Changes</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Password Resets</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Failed Login Attempts</Label>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Project Updates</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">New Projects</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Status Changes</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Comments</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Assignments</Label>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">AI Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Risk Detections</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Bottleneck Alerts</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Optimization Suggestions</Label>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Anomaly Detections</Label>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                Save Notification Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* API Settings */}
        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>
                Manage API access keys and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">API Keys</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGenerateApiKey}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Generate New Key
                  </Button>
                </div>
                
                <div className="border rounded-md divide-y">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{key.name}</h4>
                          <div className="flex items-center mt-1">
                            <code className="bg-muted px-2 py-1 rounded text-sm">{key.key}</code>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 ml-2"
                              onClick={() => {
                                toast({
                                  title: "API Key",
                                  description: "The actual key would be displayed here in a real system.",
                                });
                              }}
                            >
                              Show
                            </Button>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleRevokeApiKey(key.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm mt-1">{key.created}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Used</p>
                          <p className="text-sm mt-1">{key.lastUsed}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Scopes</p>
                          <div className="flex gap-1 mt-1">
                            {key.scopes.map((scope) => (
                              <Badge key={scope} variant="outline" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">API Usage</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-sm">Requests (Last 30 days)</Label>
                      <span className="text-sm">
                        2,345,678 / 5,000,000 <span className="text-muted-foreground">(46.9%)</span>
                      </span>
                    </div>
                    <Progress value={46.9} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Rate Limit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">100</div>
                        <p className="text-xs text-muted-foreground">requests per second</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Average Response Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">124ms</div>
                        <p className="text-xs text-muted-foreground">across all endpoints</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">99.8%</div>
                        <p className="text-xs text-muted-foreground">requests successful</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">API Documentation</h3>
                <div className="p-4 border rounded-md">
                  <p className="text-sm">
                    Comprehensive API documentation is available for all endpoints, including authentication, request and response formats, and example code snippets.
                  </p>
                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline">
                      OpenAPI Spec
                    </Button>
                    <Button>
                      View Documentation
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Webhook Configurations</h3>
                <div className="p-4 border rounded-md">
                  <p className="text-sm mb-4">
                    Configure webhooks to receive real-time notifications about events in your Novexa instance.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <Input id="webhook-url" placeholder="https://example.com/webhook" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="webhook-secret">Webhook Secret</Label>
                        <Input id="webhook-secret" placeholder="Enter secret key" type="password" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Event Types</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="event-project" />
                          <label
                            htmlFor="event-project"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Project
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="event-task" />
                          <label
                            htmlFor="event-task"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Task
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="event-user" />
                          <label
                            htmlFor="event-user"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            User
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="event-document" />
                          <label
                            htmlFor="event-document"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Document
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button>Add Webhook</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Enterprise-Grade Data Isolation Settings</CardTitle>
              <CardDescription>
                Configure tenant-specific data isolation for API requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-md">
                  <h3 className="text-base font-medium">API Tenant Context</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    All API requests must include tenant context for data isolation. This can be specified using one of the following methods:
                  </p>
                  
                  <div className="mt-4 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Bearer Token (JWT)</Label>
                      <code className="text-xs block bg-muted p-2 rounded-md">
                        Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                      </code>
                      <p className="text-xs text-muted-foreground">
                        The JWT payload includes the tenant_id claim.
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-sm">Custom Header</Label>
                      <code className="text-xs block bg-muted p-2 rounded-md">
                        X-Tenant-ID: tenant-123
                      </code>
                      <p className="text-xs text-muted-foreground">
                        Include a custom header with each request.
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-sm">Query Parameter</Label>
                      <code className="text-xs block bg-muted p-2 rounded-md">
                        https://api.novexa.com/v1/projects?tenant_id=tenant-123
                      </code>
                      <p className="text-xs text-muted-foreground">
                        Include the tenant_id as a query parameter.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-md">
                  <h3 className="text-base font-medium">Security Policies</h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">API CORS Policy</Label>
                        <p className="text-xs text-muted-foreground">
                          Control which domains can access your API
                        </p>
                      </div>
                      <Input 
                        defaultValue="*.acme.com" 
                        className="w-[250px]" 
                        placeholder="e.g., *.example.com" 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">API IP Restrictions</Label>
                        <p className="text-xs text-muted-foreground">
                          Limit API access to specific IP addresses
                        </p>
                      </div>
                      <Input 
                        defaultValue="" 
                        className="w-[250px]" 
                        placeholder="e.g., 192.168.1.1, 10.0.0.0/24" 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">JWT Expiration</Label>
                        <p className="text-xs text-muted-foreground">
                          Set how long JWT tokens are valid
                        </p>
                      </div>
                      <Select defaultValue="3600">
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Expiration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="900">15 minutes</SelectItem>
                          <SelectItem value="1800">30 minutes</SelectItem>
                          <SelectItem value="3600">1 hour</SelectItem>
                          <SelectItem value="86400">24 hours</SelectItem>
                          <SelectItem value="604800">7 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">
                Save API Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}