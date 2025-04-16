import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Building, CreditCard, ShieldAlert, Key, ServerIcon, BarChart4, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Admin panel tabs
import OrganizationsPanel from "@/components/admin/OrganizationsPanel";
import UsersPanel from "@/components/admin/UsersPanel";
import SubscriptionsPanel from "@/components/admin/SubscriptionsPanel";
import RolesPermissionsPanel from "@/components/admin/RolesPermissionsPanel";
import ApiKeysPanel from "@/components/admin/ApiKeysPanel";
import SystemPanel from "@/components/admin/SystemPanel";
import AuditLogsPanel from "@/components/admin/AuditLogsPanel";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("organizations");
  const { toast } = useToast();
  
  // Define user type
  interface User {
    id: number;
    username: string;
    role: string;
    [key: string]: any;
  }
  
  // Check if user has admin access
  const { data: currentUser, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Custom header for Admin page
  const AdminHeader = () => (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <Link 
            href="/"
            className="flex items-center gap-2"
          >
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">CPI Hub Admin</span>
          </Link>
        </div>
        <div className="ml-auto">
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </header>
  );

  // Handle permission check
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Checking admin permissions...</span>
      </div>
    );
  }

  if (isError || !currentUser || currentUser.role !== "admin") {
    return (
      <>
        <AdminHeader />
        <div className="container mx-auto p-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access the admin portal. Please contact your administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = "/"}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <div className="container mx-auto p-4">
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
            <p className="text-muted-foreground">
              Enterprise management console for CPI Hub organization administration
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="organizations" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Organizations</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span className="hidden sm:inline">Roles</span>
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">API Keys</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <ServerIcon className="h-4 w-4" />
                <span className="hidden sm:inline">System</span>
              </TabsTrigger>
              <TabsTrigger value="audit-logs" className="flex items-center gap-2">
                <BarChart4 className="h-4 w-4" />
                <span className="hidden sm:inline">Logs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="organizations" className="space-y-4">
              <OrganizationsPanel />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UsersPanel />
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-4">
              <SubscriptionsPanel />
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <RolesPermissionsPanel />
            </TabsContent>

            <TabsContent value="api-keys" className="space-y-4">
              <ApiKeysPanel />
            </TabsContent>

            <TabsContent value="system" className="space-y-4">
              <SystemPanel />
            </TabsContent>

            <TabsContent value="audit-logs" className="space-y-4">
              <AuditLogsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}