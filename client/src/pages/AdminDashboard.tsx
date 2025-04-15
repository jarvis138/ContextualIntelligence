import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users } from 'lucide-react';
import { SystemMetricsCard } from '@/components/admin/SystemMetricsCard';
import { SystemEventsCard } from '@/components/admin/SystemEventsCard';
import { DatabaseStatsCard } from '@/components/admin/DatabaseStatsCard';
import { AuditLogsCard } from '@/components/admin/AuditLogsCard';
import { useQuery, QueryKey } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Keep track of the query keys to invalidate on refresh
  const queryKeysByTab: Record<string, QueryKey[]> = {
    overview: [
      ['/api/admin/metrics'],
      ['/api/admin/events'],
      ['/api/admin/system-performance']
    ],
    users: [],
    system: [
      ['/api/admin/metrics'],
      ['/api/admin/system-performance']
    ],
    integrations: [],
    logs: [
      ['/api/admin/audit-logs']
    ],
    database: [
      ['/api/admin/db-stats']
    ]
  };

  // Static data for user and integration stats - could be replaced with API data later
  const userStats = {
    total: 145,
    active: 38,
    newToday: 4,
    averageSessionTime: '22m',
  };

  const integrationStats = {
    total: 6,
    active: 5,
    errorRate: 0.02,
    dataProcessed: '1.7 GB',
  };

  // Helper function to refresh data for the current tab
  const refreshData = () => {
    const currentTabQueryKeys = queryKeysByTab[activeTab] || [];
    
    currentTabQueryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Administration Dashboard</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshData}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs 
        defaultValue="overview" 
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Metrics */}
          <SystemMetricsCard />

          {/* User Stats Card - still using static data for now */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          {/* System Events/Alerts */}
          <SystemEventsCard />
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
          <SystemMetricsCard />
          
          <Card>
            <CardHeader>
              <CardTitle>System Events</CardTitle>
              <CardDescription>Monitor and respond to system events</CardDescription>
            </CardHeader>
            <CardContent>
              <SystemEventsCard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <DatabaseStatsCard />
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
          <AuditLogsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}