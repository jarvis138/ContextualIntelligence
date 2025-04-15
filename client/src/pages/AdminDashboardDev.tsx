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

// This is a development version of the admin dashboard that doesn't require authentication
export default function AdminDashboardDev() {
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

  // Static data for user and integration stats (using only for UI structure)
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
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Administration Dashboard (Development Version)</h1>
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
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>User Statistics</CardTitle>
                <CardDescription>
                  Current users statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Total Users</dt>
                    <dd className="font-medium">{userStats.total}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Active Now</dt>
                    <dd className="font-medium">{userStats.active}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">New Today</dt>
                    <dd className="font-medium">{userStats.newToday}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Avg. Session</dt>
                    <dd className="font-medium">{userStats.averageSessionTime}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Integration Statistics</CardTitle>
                <CardDescription>
                  Status of system integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Total Integrations</dt>
                    <dd className="font-medium">{integrationStats.total}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Active</dt>
                    <dd className="font-medium">{integrationStats.active}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Error Rate</dt>
                    <dd className="font-medium">{(integrationStats.errorRate * 100).toFixed(1)}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Data Processed</dt>
                    <dd className="font-medium">{integrationStats.dataProcessed}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent System Events</CardTitle>
              <CardDescription>Monitor and respond to system events</CardDescription>
            </CardHeader>
            <CardContent>
              <SystemEventsCard limit={5} />
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
              <CardDescription>Manage and monitor system integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-6 w-6 text-primary" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">Integration Management Panel</h3>
                <p className="text-muted-foreground mb-4">
                  This panel would contain integration settings, status monitoring, and connection controls.
                </p>
                <Button>Manage Integrations</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Review system activity and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogsCard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}