import React, { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { TenantsPanel } from "@/components/admin/TenantsPanel";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";

export default function TenantManagementPage() {
  const { user, isLoading, isAdmin } = useUser();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  // Once loading is complete, check if user is admin
  React.useEffect(() => {
    if (!isLoading && !isInitialized) {
      setIsInitialized(true);
      if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
      }
    }
  }, [isLoading, isAdmin, isInitialized, toast]);

  // Redirect non-admin users
  if (isInitialized && !isAdmin) {
    return <Redirect to="/" />;
  }

  // Show loading state
  if (isLoading || !user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all tenants and their settings in the CPI Hub platform
          </p>
        </header>
        
        <TenantsPanel />
      </div>
    </AdminLayout>
  );
}