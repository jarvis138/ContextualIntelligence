import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import TenantsPanel from "@/components/admin/TenantsPanel";
import { useUser } from "@/hooks/use-user";
import { Navigate } from "wouter";

export default function TenantManagementPage() {
  const { user, isLoading } = useUser();

  // Show loading state while checking user
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  // Redirect non-admin users
  if (!user || user.role !== "admin") {
    return <Navigate to="/login" />;
  }

  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage your CPI Hub tenants and their settings
          </p>
        </div>

        <TenantsPanel />
      </div>
    </AdminLayout>
  );
}