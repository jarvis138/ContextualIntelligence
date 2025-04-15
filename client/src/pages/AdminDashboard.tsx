import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  RefreshCw, 
  Users, 
  Server, 
  Database, 
  Shield, 
  Activity,
  AlertTriangle,
  FileText,
  Clock
} from 'lucide-react';

export default function AdminDashboard() {
  // Sample data - in a real application, this would come from API
  const systemHealth = {
    cpu: 32,
    memory: 64,
    storage: 48,
    network: 71,
    apiResponseTime: 230, // ms
    queueLength: 12,
    activeConnections: 38,
  };

  const recentAlerts = [
    { id: 1, type: 'warning', message: 'High CPU usage detected', time: '2h ago' },
    { id: 2, type: 'error', message: 'Database connection timeout', time: '4h ago' },
    { id: 3, type: 'info', message: 'System backup completed', time: '6h ago' },
    { id: 4, type: 'warning', message: 'API rate limit approaching', time: '12h ago' },
  ];

  const userStats = {
    total: 1245,
    active: 678,
    newToday: 24,
    averageSessionTime: '18m',
  };

  const integrationStats = {
    total: 8,
    active: 6,
    errorRate: 0.03,
    dataProcessed: '2.4 GB',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Administration Dashboard</h1>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User Stats Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-muted-foreground mr-2" />
                  <div className="text-2xl font-bold">{userStats.total}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {userStats.active} active now
                </div>
              </CardContent>
            </Card>

            {/* System Health Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Server className="h-4 w-4 text-muted-foreground mr-2" />
                  <div className="text-2xl font-bold">
                    {systemHealth.cpu < 50 ? 'Good' : systemHealth.cpu < 80 ? 'Warning' : 'Critical'}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  CPU: {systemHealth.cpu}% | Memory: {systemHealth.memory}%
                </div>
              </CardContent>
            </Card>

            {/* Storage Usage Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Database className="h-4 w-4 text-muted-foreground mr-2" />
                  <div className="text-2xl font-bold">{systemHealth.storage}%</div>
                </div>
                <Progress value={systemHealth.storage} className="h-2 mt-2" />
              </CardContent>
            </Card>

            {/* API Health Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Activity className="h-4 w-4 text-muted-foreground mr-2" />
                  <div className="text-2xl font-bold">{systemHealth.apiResponseTime}ms</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemHealth.activeConnections} active connections
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>System alerts from the past 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className="flex items-start pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="mr-4 mt-0.5">
                      <AlertTriangle 
                        className={`h-5 w-5 ${
                          alert.type === 'error' ? 'text-red-500' : 
                          alert.type === 'warning' ? 'text-amber-500' : 
                          'text-blue-500'
                        }`} 
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-sm text-muted-foreground">{alert.time}</div>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">User Management Panel</h3>
                <p className="text-muted-foreground mb-4">
                  This panel would contain user listing, role management, and permission controls.
                </p>
                <Button>Manage Users</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Monitor system performance and resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm font-medium">{systemHealth.cpu}%</span>
                  </div>
                  <Progress value={systemHealth.cpu} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm font-medium">{systemHealth.memory}%</span>
                  </div>
                  <Progress value={systemHealth.memory} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Storage Usage</span>
                    <span className="text-sm font-medium">{systemHealth.storage}%</span>
                  </div>
                  <Progress value={systemHealth.storage} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Network Usage</span>
                    <span className="text-sm font-medium">{systemHealth.network}%</span>
                  </div>
                  <Progress value={systemHealth.network} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Management</CardTitle>
              <CardDescription>Monitor and manage system integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{integrationStats.active}/{integrationStats.total}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Error Rate: {(integrationStats.errorRate * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Data Processed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{integrationStats.dataProcessed}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      In the last 24 hours
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="text-center">
                <Button>Manage Integrations</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>System activity and security logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-start border-b pb-3 last:border-0 last:pb-0">
                    <div className="mr-4 mt-0.5">
                      {i % 3 === 0 ? (
                        <Shield className="h-5 w-5 text-blue-500" />
                      ) : i % 3 === 1 ? (
                        <FileText className="h-5 w-5 text-green-500" />
                      ) : (
                        <Users className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {i % 3 === 0 ? 'User authentication' : 
                         i % 3 === 1 ? 'Document accessed' : 'User permission changed'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {i % 3 === 0 ? 'admin@example.com logged in' : 
                         i % 3 === 1 ? 'requirements.pdf viewed by user123' : 
                         'user456 granted editor access to Project X'}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {`${i * 12}m ago`}
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