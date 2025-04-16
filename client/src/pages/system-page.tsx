import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  LineChart,
  RefreshCw, 
  Server, 
  Database, 
  HardDrive,
  Network,
  Clock,
  CpuIcon,
  MemoryStick,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Info,
  ShieldCheck,
  Users
} from 'lucide-react';

export default function SystemPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("24h");
  
  // System health metrics
  const systemHealth = {
    cpu: {
      current: 32,
      history: [28, 35, 29, 40, 32, 45, 50, 35, 28, 32]
    },
    memory: {
      current: 64,
      total: "32 GB",
      used: "20.5 GB",
      history: [58, 62, 65, 60, 70, 68, 64, 72, 60, 64]
    },
    storage: {
      current: 48,
      total: "2 TB",
      used: "960 GB",
      history: [44, 45, 46, 47, 48, 48, 49, 48, 47, 48]
    },
    network: {
      current: 71,
      upload: "24 Mbps",
      download: "62 Mbps",
      history: [65, 70, 75, 60, 80, 65, 90, 40, 60, 71]
    }
  };

  // Service status
  const serviceStatus = [
    { id: 1, name: "API Service", status: "operational", uptime: "99.99%", lastIncident: "12d ago" },
    { id: 2, name: "Database Cluster", status: "operational", uptime: "99.95%", lastIncident: "3d ago" },
    { id: 3, name: "Authentication Service", status: "operational", uptime: "99.99%", lastIncident: "24d ago" },
    { id: 4, name: "Storage Service", status: "degraded", uptime: "99.5%", lastIncident: "12h ago" },
    { id: 5, name: "Search Index", status: "operational", uptime: "99.9%", lastIncident: "5d ago" },
    { id: 6, name: "Background Jobs", status: "operational", uptime: "99.9%", lastIncident: "2d ago" },
    { id: 7, name: "Notification Service", status: "critical", uptime: "95.2%", lastIncident: "1h ago" },
  ];

  // Recent incidents
  const recentIncidents = [
    { 
      id: 1, 
      service: "Notification Service", 
      status: "investigating", 
      started: "1h ago",
      description: "Increased latency in notification delivery",
      updates: [
        { time: "1h ago", message: "Investigating increased latency in notification delivery." },
        { time: "45m ago", message: "Identified issue with message queue backing up." },
        { time: "30m ago", message: "Scaling up queue processing resources." }
      ]
    },
    { 
      id: 2, 
      service: "Storage Service", 
      status: "monitoring", 
      started: "12h ago",
      description: "Degraded performance for file uploads",
      updates: [
        { time: "12h ago", message: "Investigating slow upload speeds." },
        { time: "11h ago", message: "Identified network congestion to storage cluster." },
        { time: "10h ago", message: "Applied network configuration changes." },
        { time: "9h ago", message: "Performance improving, continuing to monitor." }
      ]
    },
    { 
      id: 3, 
      service: "Database Cluster", 
      status: "resolved", 
      started: "3d ago",
      description: "Read replica synchronization delays",
      updates: [
        { time: "3d ago", message: "Investigating replication lag on database read replicas." },
        { time: "3d ago", message: "Identified high write volume causing lag." },
        { time: "3d ago", message: "Scaled up replica resources, lag decreasing." },
        { time: "3d ago", message: "Replication back to normal, incident resolved." }
      ]
    }
  ];

  // Implementation phases for development status
  const implementationPhases = [
    { 
      id: 1, 
      name: "Phase 1", 
      status: "complete", 
      description: "Core platform and basic features",
      completionDate: "October 2024"
    },
    { 
      id: 2, 
      name: "Phase 2", 
      status: "complete", 
      description: "Enterprise integrations and data isolation",
      completionDate: "March 2025"
    },
    { 
      id: 3, 
      name: "Phase 3", 
      status: "in-progress", 
      description: "AI capabilities and advanced analytics",
      completionDate: "June 2025"
    },
    { 
      id: 4, 
      name: "Phase 4", 
      status: "planned", 
      description: "Advanced customization and enterprise workflows",
      completionDate: "December 2025"
    }
  ];

  // Implementation features status
  const featureStatuses = [
    { name: "Planning", status: "Complete" },
    { name: "Design", status: "Complete" },
    { name: "Development", status: "Complete" },
    { name: "Testing", status: "Complete" },
    { name: "Deployment", status: "Complete" }
  ];

  // Planned features
  const plannedFeatures = [
    { name: "AI-powered document analysis", date: "April 2025" },
    { name: "Extended AI Features", date: "May 2025" },
    { name: "Full Capability Release", date: "June 2025" }
  ];

  // Utility functions for rendering
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'operational':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getIncidentStatusBadge = (status: string) => {
    switch(status) {
      case 'investigating':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Investigating</Badge>;
      case 'monitoring':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Monitoring</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPhaseStatusBadge = (status: string) => {
    switch(status) {
      case 'complete':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Complete</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case 'planned':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Planned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRefresh = () => {
    toast({
      title: "Refreshing data",
      description: "Fetching the latest system metrics...",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">System</h1>
        <div className="flex items-center space-x-2">
          <Select defaultValue={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Phase 3 Implementation</AlertTitle>
        <AlertDescription>
          Phase 2 is completed. This feature is now part of Phase 3 implementation with enhanced AI capabilities.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="development">
        <TabsList className="mb-4">
          <TabsTrigger value="development">Development Status</TabsTrigger>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
          <TabsTrigger value="services">Service Status</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        {/* Development Status Tab */}
        <TabsContent value="development" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Implementation Status</CardTitle>
                <CardDescription>Current status of this feature's implementation</CardDescription>
              </CardHeader>
              <CardContent>
                {featureStatuses.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span>{feature.name}</span>
                    <div className="flex items-center">
                      <span className={`mr-2 ${feature.status === "Complete" ? "text-green-500" : 
                        feature.status === "In Progress" ? "text-amber-500" : "text-gray-500"}`}>
                        {feature.status}
                      </span>
                      <div className={`h-2 w-16 rounded-full ${
                        feature.status === "Complete" ? "bg-green-500" : 
                        feature.status === "In Progress" ? "bg-amber-500" : "bg-gray-200"
                      }`}></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Estimated Timeline</CardTitle>
                <CardDescription>Expected completion dates</CardDescription>
              </CardHeader>
              <CardContent>
                {plannedFeatures.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span>{item.name}</span>
                    <span className="font-medium">{item.date}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Planned Features</CardTitle>
                <CardDescription>Key features for this section</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                    <span>AI-powered document analysis</span>
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                    <span>Sentiment analysis for project communications</span>
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                    <span>Project relationship visualization</span>
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                    <span>Contextual project insights</span>
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                    <span>Entity relationship explorer</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Implementation Phases</CardTitle>
              <CardDescription>Roadmap for CPI Hub development</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {implementationPhases.map(phase => (
                  <div key={phase.id} className="flex items-start space-x-4">
                    <div className="flex-none">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        phase.status === 'complete' ? 'bg-green-100 text-green-600' :
                        phase.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {phase.id}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h3 className="font-semibold mr-2">{phase.name}</h3>
                        {getPhaseStatusBadge(phase.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{phase.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {phase.status === 'complete' ? 'Completed' : 'Target completion'}: {phase.completionDate}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CpuIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.cpu.current}%</div>
                <Progress value={systemHealth.cpu.current} className="h-2 mt-2" />
                <div className="mt-2 h-10 flex items-end gap-1">
                  {systemHealth.cpu.history.map((value, i) => (
                    <div 
                      key={i} 
                      className="bg-primary/80 rounded-sm w-full" 
                      style={{ height: `${value}%` }}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Memory Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <MemoryStick className="h-4 w-4 mr-2 text-muted-foreground" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.memory.current}%</div>
                <Progress value={systemHealth.memory.current} className="h-2 mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {systemHealth.memory.used} of {systemHealth.memory.total}
                </div>
                <div className="mt-2 h-10 flex items-end gap-1">
                  {systemHealth.memory.history.map((value, i) => (
                    <div 
                      key={i} 
                      className="bg-primary/80 rounded-sm w-full" 
                      style={{ height: `${value}%` }}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Storage Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <HardDrive className="h-4 w-4 mr-2 text-muted-foreground" />
                  Storage Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.storage.current}%</div>
                <Progress value={systemHealth.storage.current} className="h-2 mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {systemHealth.storage.used} of {systemHealth.storage.total}
                </div>
                <div className="mt-2 h-10 flex items-end gap-1">
                  {systemHealth.storage.history.map((value, i) => (
                    <div 
                      key={i} 
                      className="bg-primary/80 rounded-sm w-full" 
                      style={{ height: `${value}%` }}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Network Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Network className="h-4 w-4 mr-2 text-muted-foreground" />
                  Network Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.network.current}%</div>
                <Progress value={systemHealth.network.current} className="h-2 mt-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <div className="flex items-center">
                    <Upload className="h-3 w-3 mr-1" />
                    {systemHealth.network.upload}
                  </div>
                  <div className="flex items-center">
                    <Download className="h-3 w-3 mr-1" />
                    {systemHealth.network.download}
                  </div>
                </div>
                <div className="mt-2 h-10 flex items-end gap-1">
                  {systemHealth.network.history.map((value, i) => (
                    <div 
                      key={i} 
                      className="bg-primary/80 rounded-sm w-full" 
                      style={{ height: `${value}%` }}
                    ></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Health Summary */}
          <Card>
            <CardHeader>
              <CardTitle>System Health Summary</CardTitle>
              <CardDescription>Overall system status and active incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                    <span className="font-medium">System Status:</span>
                  </div>
                  <span>Degraded Performance</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                    <span className="font-medium">Active Incidents:</span>
                  </div>
                  <span>{recentIncidents.filter(i => i.status !== 'resolved').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="font-medium">Services Down:</span>
                  </div>
                  <span>{serviceStatus.filter(s => s.status === 'critical').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    <span className="font-medium">Services Operational:</span>
                  </div>
                  <span>{serviceStatus.filter(s => s.status === 'operational').length}/{serviceStatus.length}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View Detailed Report</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Service Status Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Current status of all system services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceStatus.map(service => (
                  <div key={service.id} className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex items-center">
                      {getStatusIcon(service.status)}
                      <div className="ml-4">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Uptime: {service.uptime} | Last incident: {service.lastIncident}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Badge className={`${
                        service.status === 'operational' ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' :
                        service.status === 'degraded' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200' :
                        'bg-red-100 text-red-800 hover:bg-red-100 border-red-200'
                      }`}>
                        {service.status === 'operational' ? 'Operational' :
                         service.status === 'degraded' ? 'Degraded' : 'Critical'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
              <CardDescription>Incident history and status updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentIncidents.map(incident => (
                  <div key={incident.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{incident.service}</h3>
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{incident.started}</span>
                        {getIncidentStatusBadge(incident.status)}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium">Updates</h4>
                      <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                        {incident.updates.map((update, i) => (
                          <div key={i} className="relative">
                            <span className="text-xs text-muted-foreground block mb-1">{update.time}</span>
                            <p className="text-sm">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}