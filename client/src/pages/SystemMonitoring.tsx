import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Upload
} from 'lucide-react';

export default function SystemMonitoring() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("24h");
  
  // Sample data - in a real application, this would come from API
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

  const serviceStatus = [
    { id: 1, name: "API Service", status: "operational", uptime: "99.99%", lastIncident: "12d ago" },
    { id: 2, name: "Database Cluster", status: "operational", uptime: "99.95%", lastIncident: "3d ago" },
    { id: 3, name: "Authentication Service", status: "operational", uptime: "99.99%", lastIncident: "24d ago" },
    { id: 4, name: "Storage Service", status: "degraded", uptime: "99.5%", lastIncident: "12h ago" },
    { id: 5, name: "Search Index", status: "operational", uptime: "99.9%", lastIncident: "5d ago" },
    { id: 6, name: "Background Jobs", status: "operational", uptime: "99.9%", lastIncident: "2d ago" },
    { id: 7, name: "Notification Service", status: "critical", uptime: "95.2%", lastIncident: "1h ago" },
  ];

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
        return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Investigating</span>;
      case 'monitoring':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Monitoring</span>;
      case 'resolved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Resolved</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
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
        <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
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

      <Tabs defaultValue="dashboard">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="services">Service Status</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
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
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        service.status === 'operational' ? 'bg-green-100 text-green-800' :
                        service.status === 'degraded' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {service.status === 'operational' ? 'Operational' :
                         service.status === 'degraded' ? 'Degraded' : 'Critical'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                      <div className="flex items-center">
                        {getIncidentStatusBadge(incident.status)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      Started: {incident.started}
                    </div>
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium mb-2">Updates</h4>
                      <div className="space-y-2">
                        {incident.updates.map((update, idx) => (
                          <div key={idx} className="flex">
                            <div className="text-xs text-muted-foreground w-16">{update.time}</div>
                            <div className="text-sm">{update.message}</div>
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

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Application and system logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-900 font-mono text-xs h-80 overflow-auto">
                <div className="space-y-1">
                  {[...Array(30)].map((_, i) => (
                    <div key={i} className="flex">
                      <span className="text-gray-500 w-24">
                        {new Date(Date.now() - (i * 60000)).toISOString().replace('T', ' ').substring(0, 19)}
                      </span>
                      <span className={`w-16 ${
                        i % 5 === 0 ? "text-red-500" : 
                        i % 4 === 0 ? "text-amber-500" : 
                        "text-green-500"
                      }`}>
                        {i % 5 === 0 ? "ERROR" : i % 4 === 0 ? "WARN" : "INFO"}
                      </span>
                      <span className="flex-1">
                        {i % 5 === 0 ? "Failed to connect to database - connection timeout" : 
                         i % 4 === 0 ? "Slow query detected (3.2s) - SELECT * FROM documents WHERE..." : 
                         i % 3 === 0 ? "User authentication successful for user_id: 12345" :
                         i % 2 === 0 ? "Document ID:890123 indexed successfully" :
                         "API request processed in 124ms - GET /api/projects/123"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm">
                Export Logs
              </Button>
              <Button variant="outline" size="sm">
                Clear View
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}