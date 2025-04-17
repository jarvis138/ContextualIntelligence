import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  BarChart,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCcw,
  Server,
  ServerCog,
  Settings,
  Wrench
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Metrics Summary Component
const MetricsSummary = ({ data }: { data: any }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2 animate-pulse">
                <div className="h-5 w-1/2 bg-muted rounded"></div>
                <div className="h-8 w-3/4 bg-muted rounded"></div>
                <div className="h-4 w-full bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
              <div className="text-2xl font-bold">{data.cpu.current}%</div>
            </div>
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Server className="h-5 w-5" />
            </div>
          </div>
          <Progress value={data.cpu.current} className="h-2 mt-4" />
          <p className="text-xs text-muted-foreground mt-2">
            Peak: {data.cpu.peak}% | Avg: {data.cpu.average}%
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Memory Usage</p>
              <div className="text-2xl font-bold">{data.memory.usedFormatted}</div>
            </div>
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <HardDrive className="h-5 w-5" />
            </div>
          </div>
          <Progress value={data.memory.percentage} className="h-2 mt-4" />
          <p className="text-xs text-muted-foreground mt-2">
            {data.memory.usedFormatted} of {data.memory.totalFormatted} ({data.memory.percentage}%)
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Database</p>
              <div className="text-2xl font-bold">{data.database.connections}</div>
            </div>
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <Progress value={data.database.connectionsPercentage} className="h-2 mt-4" />
          <p className="text-xs text-muted-foreground mt-2">
            {data.database.size} DB Size | {data.database.queryCount} Queries Today
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">System Uptime</p>
              <div className="text-2xl font-bold">{data.uptime.formatted}</div>
            </div>
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <ServerCog className="h-5 w-5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground">API Calls</p>
              <p className="text-sm font-bold">{data.requests.apiCalls}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground">Response</p>
              <p className="text-sm font-bold">{data.requests.avgResponseTime}ms</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground">Error Rate</p>
              <p className="text-sm font-bold">{data.requests.errorRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// System Maintenance Dialog
const MaintenanceDialog = ({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  
  const handleConfirm = () => {
    setIsSubmitting(true);
    onConfirm();
    setIsSubmitting(false);
    onClose();
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter Maintenance Mode</AlertDialogTitle>
          <AlertDialogDescription>
            This action will put the system in maintenance mode. All users except administrators
            will be temporarily locked out of the system. Ongoing operations will be allowed to complete.
            
            <div className="flex items-center space-x-2 mt-4">
              <Checkbox 
                id="confirm-maintenance" 
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              />
              <Label htmlFor="confirm-maintenance">
                I understand that this will restrict access to the application
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={!confirmed || isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enable Maintenance Mode
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Backup Dialog
const BackupDialog = ({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: any) => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    type: "full", // full or schema
    location: "local", // local or s3
    includeFiles: true,
    includeUploads: true,
  });
  
  const handleOptionChange = (key: string, value: any) => {
    setBackupOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  
  const handleConfirm = () => {
    setIsSubmitting(true);
    onConfirm(backupOptions);
    setIsSubmitting(false);
    onClose();
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create System Backup</AlertDialogTitle>
          <AlertDialogDescription>
            Create a backup of the database and system files. This process may take several minutes
            depending on the size of your data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="backup-type" className="text-right">
              Backup Type
            </Label>
            <Select
              value={backupOptions.type}
              onValueChange={(value) => handleOptionChange("type", value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select backup type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Backup (Data + Schema)</SelectItem>
                <SelectItem value="schema">Schema Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="storage-location" className="text-right">
              Storage Location
            </Label>
            <Select
              value={backupOptions.location}
              onValueChange={(value) => handleOptionChange("location", value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select storage location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Storage</SelectItem>
                <SelectItem value="s3">Amazon S3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Include Files
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch 
                checked={backupOptions.includeFiles}
                onCheckedChange={(checked) => handleOptionChange("includeFiles", checked)}
              />
              <Label>Include system configuration files</Label>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Include Uploads
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch 
                checked={backupOptions.includeUploads}
                onCheckedChange={(checked) => handleOptionChange("includeUploads", checked)}
              />
              <Label>Include user uploaded files</Label>
            </div>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Backup
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const SystemPanel = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [timeRange, setTimeRange] = useState("24h");

  // Fetch system statistics
  const {
    data: systemStats = {},
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/admin-api/system/stats", timeRange],
  });

  // Handle entering maintenance mode
  const handleEnterMaintenance = async () => {
    try {
      const response = await fetch("/admin-api/system/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: true }),
      });

      if (!response.ok) throw new Error("Failed to enable maintenance mode");

      toast({
        title: "Maintenance mode enabled",
        description: "The system is now in maintenance mode.",
      });

      // Refresh data
      refetch();
    } catch (error) {
      console.error("Error enabling maintenance mode:", error);
      toast({
        title: "Error",
        description: "Failed to enable maintenance mode. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle creating a backup
  const handleCreateBackup = async (options: any) => {
    try {
      const response = await fetch("/admin-api/system/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) throw new Error("Failed to create backup");

      const result = await response.json();

      toast({
        title: "Backup created successfully",
        description: `Backup saved to ${result.location}`,
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      toast({
        title: "Error",
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get metrics data
  const getMetricsData = () => {
    if (!systemStats || !systemStats.metrics) {
      return {
        cpu: { current: 0, peak: 0, average: 0 },
        memory: { 
          usedFormatted: "0 MB", 
          totalFormatted: "0 MB", 
          percentage: 0 
        },
        database: { 
          connections: 0, 
          connectionsPercentage: 0, 
          size: "0 MB", 
          queryCount: 0 
        },
        uptime: { formatted: "0d 0h 0m" },
        requests: { apiCalls: 0, avgResponseTime: 0, errorRate: 0 }
      };
    }

    return {
      cpu: {
        current: systemStats.metrics.cpu.current,
        peak: systemStats.metrics.cpu.peak,
        average: systemStats.metrics.cpu.average,
      },
      memory: {
        usedFormatted: systemStats.metrics.memory.usedFormatted,
        totalFormatted: systemStats.metrics.memory.totalFormatted,
        percentage: systemStats.metrics.memory.percentage,
      },
      database: {
        connections: systemStats.metrics.database.connections,
        connectionsPercentage: systemStats.metrics.database.connectionsPercentage,
        size: systemStats.metrics.database.size,
        queryCount: systemStats.metrics.database.queryCount,
      },
      uptime: {
        formatted: systemStats.metrics.uptime.formatted,
      },
      requests: {
        apiCalls: systemStats.metrics.requests.apiCalls,
        avgResponseTime: systemStats.metrics.requests.avgResponseTime,
        errorRate: systemStats.metrics.requests.errorRate,
      },
    };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>System Management</CardTitle>
              <CardDescription>Monitor and manage system resources and maintenance</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Select
                value={timeRange}
                onValueChange={setTimeRange}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <AreaChart className="h-4 w-4" />
                <span>Performance</span>
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span>Maintenance</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isError ? (
                <div className="py-8 text-center text-red-500">
                  Error loading system statistics. Please try again.
                </div>
              ) : (
                <div className="space-y-6">
                  <MetricsSummary data={getMetricsData()} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">System Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {[
                            { name: "Web Server", status: systemStats.status?.webServer || "Online" },
                            { name: "Database", status: systemStats.status?.database || "Online" },
                            { name: "Cache", status: systemStats.status?.cache || "Online" },
                            { name: "Scheduler", status: systemStats.status?.scheduler || "Online" },
                            { name: "Background Jobs", status: systemStats.status?.backgroundJobs || "Running" },
                          ].map((service) => (
                            <div key={service.name} className="flex justify-between">
                              <span className="text-sm">{service.name}</span>
                              <span className={`text-sm font-medium ${
                                service.status === "Online" || service.status === "Running"
                                  ? "text-green-500"
                                  : service.status === "Warning"
                                  ? "text-yellow-500"
                                  : service.status === "Offline" || service.status === "Error"
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                              }`}>
                                {service.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(systemStats.recentActivity || []).map((activity: any, index: number) => (
                            <div key={index} className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium">{activity.description}</p>
                                <p className="text-xs text-muted-foreground">{activity.user}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">{activity.time}</span>
                            </div>
                          ))}
                          
                          {(!systemStats.recentActivity || systemStats.recentActivity.length === 0) && (
                            <p className="text-sm text-muted-foreground">No recent activity</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="performance">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">CPU Usage Over Time</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        {/* CPU Chart would go here */}
                        <div className="flex items-center justify-center h-full border border-dashed rounded-md">
                          <div className="text-center">
                            <AreaChart className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">CPU usage chart would display here</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Memory Usage Over Time</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          {/* Memory Chart would go here */}
                          <div className="flex items-center justify-center h-full border border-dashed rounded-md">
                            <div className="text-center">
                              <AreaChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground">Memory usage chart</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Database Connections</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          {/* DB Connections Chart would go here */}
                          <div className="flex items-center justify-center h-full border border-dashed rounded-md">
                            <div className="text-center">
                              <BarChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground">Database connections chart</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="maintenance">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Maintenance Actions</CardTitle>
                      <CardDescription>Perform system maintenance tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Button 
                            variant="outline" 
                            className="h-auto py-6 flex flex-col items-center justify-center"
                            onClick={() => setShowMaintenanceDialog(true)}
                          >
                            <Wrench className="h-8 w-8 mb-2" />
                            <span className="font-medium">Maintenance Mode</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Restrict access to administrators only
                            </span>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            className="h-auto py-6 flex flex-col items-center justify-center"
                            onClick={() => setShowBackupDialog(true)}
                          >
                            <Download className="h-8 w-8 mb-2" />
                            <span className="font-medium">Create Backup</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Back up database and configuration
                            </span>
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Button 
                            variant="outline" 
                            className="h-auto py-6 flex flex-col items-center justify-center"
                            onClick={() => {
                              toast({
                                title: "Clearing cache",
                                description: "System cache is being cleared.",
                              });
                              
                              setTimeout(() => {
                                toast({
                                  title: "Cache cleared",
                                  description: "System cache has been cleared successfully.",
                                });
                              }, 1500);
                            }}
                          >
                            <HardDrive className="h-8 w-8 mb-2" />
                            <span className="font-medium">Clear Cache</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Clear system and application cache
                            </span>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            className="h-auto py-6 flex flex-col items-center justify-center"
                            onClick={() => {
                              toast({
                                title: "Rebuilding indexes",
                                description: "Database indexes are being rebuilt. This might take a few minutes.",
                              });
                              
                              setTimeout(() => {
                                toast({
                                  title: "Indexes rebuilt",
                                  description: "Database indexes have been rebuilt successfully.",
                                });
                              }, 2500);
                            }}
                          >
                            <Database className="h-8 w-8 mb-2" />
                            <span className="font-medium">Rebuild Indexes</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              Optimize database performance
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Scheduled Tasks</CardTitle>
                      <CardDescription>System maintenance schedule</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { name: "Database Backup", schedule: "Daily at 2:00 AM", lastRun: "4 hours ago", status: "Success" },
                          { name: "Cache Cleanup", schedule: "Every 6 hours", lastRun: "2 hours ago", status: "Success" },
                          { name: "Log Rotation", schedule: "Weekly on Sunday", lastRun: "4 days ago", status: "Success" },
                          { name: "Index Optimization", schedule: "Weekly on Saturday", lastRun: "5 days ago", status: "Success" },
                        ].map((task) => (
                          <div key={task.name} className="space-y-1">
                            <div className="font-medium text-sm">{task.name}</div>
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">{task.schedule}</span>
                              <span className={`text-xs font-medium ${
                                task.status === "Success" ? "text-green-500" : 
                                task.status === "Warning" ? "text-yellow-500" : 
                                task.status === "Failed" ? "text-red-500" : 
                                "text-muted-foreground"
                              }`}>
                                {task.status}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">Last run: {task.lastRun}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Backup History</CardTitle>
                    <CardDescription>Recent system backups</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted/50">
                          <tr>
                            <th scope="col" className="px-4 py-3">Date</th>
                            <th scope="col" className="px-4 py-3">Time</th>
                            <th scope="col" className="px-4 py-3">Type</th>
                            <th scope="col" className="px-4 py-3">Size</th>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { date: "2025-04-16", time: "02:00 AM", type: "Full", size: "1.2 GB", status: "Success" },
                            { date: "2025-04-15", time: "02:00 AM", type: "Full", size: "1.1 GB", status: "Success" },
                            { date: "2025-04-14", time: "02:00 AM", type: "Full", size: "1.1 GB", status: "Success" },
                            { date: "2025-04-13", time: "02:00 AM", type: "Full", size: "1.0 GB", status: "Success" },
                          ].map((backup, index) => (
                            <tr key={index} className="border-b">
                              <td className="px-4 py-3">{backup.date}</td>
                              <td className="px-4 py-3">{backup.time}</td>
                              <td className="px-4 py-3">{backup.type}</td>
                              <td className="px-4 py-3">{backup.size}</td>
                              <td className="px-4 py-3">
                                <Badge variant={backup.status === "Success" ? "outline" : "destructive"}>
                                  {backup.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System Configuration</CardTitle>
                  <CardDescription>Configure system settings and parameters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Performance Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="cache-enabled">Enable Application Cache</Label>
                            <p className="text-xs text-muted-foreground">Improves performance by caching frequently accessed data</p>
                          </div>
                          <Switch id="cache-enabled" defaultChecked />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="query-cache">Enable Query Cache</Label>
                            <p className="text-xs text-muted-foreground">Cache database query results for better performance</p>
                          </div>
                          <Switch id="query-cache" defaultChecked />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-3">Security Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="force-ssl">Force SSL/HTTPS</Label>
                            <p className="text-xs text-muted-foreground">Redirect all HTTP traffic to HTTPS</p>
                          </div>
                          <Switch id="force-ssl" defaultChecked />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="ip-whitelist">Enable IP Whitelist</Label>
                            <p className="text-xs text-muted-foreground">Restrict access to specified IP addresses</p>
                          </div>
                          <Switch id="ip-whitelist" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-3">Logging Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="audit-logging">Enable Audit Logging</Label>
                            <p className="text-xs text-muted-foreground">Log all system activities and user actions</p>
                          </div>
                          <Switch id="audit-logging" defaultChecked />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="log-level" className="text-right">
                            Log Level
                          </Label>
                          <Select defaultValue="info">
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select log level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="debug">Debug (Verbose)</SelectItem>
                              <SelectItem value="info">Info (Normal)</SelectItem>
                              <SelectItem value="warn">Warning</SelectItem>
                              <SelectItem value="error">Error Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline">Reset to Defaults</Button>
                      <Button onClick={() => {
                        toast({
                          title: "Settings saved",
                          description: "System settings have been updated successfully.",
                        });
                      }}>Save Settings</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </CardFooter>
      </Card>

      {/* Maintenance mode dialog */}
      {showMaintenanceDialog && (
        <MaintenanceDialog
          isOpen={showMaintenanceDialog}
          onClose={() => setShowMaintenanceDialog(false)}
          onConfirm={handleEnterMaintenance}
        />
      )}

      {/* Backup dialog */}
      {showBackupDialog && (
        <BackupDialog
          isOpen={showBackupDialog}
          onClose={() => setShowBackupDialog(false)}
          onConfirm={handleCreateBackup}
        />
      )}
    </>
  );
};

export default SystemPanel;