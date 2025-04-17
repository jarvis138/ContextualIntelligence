import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TenantDialog } from "./TenantDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Edit, 
  MoreHorizontal, 
  Archive, 
  Plus, 
  Search,
  RefreshCw,
  Trash2
} from "lucide-react";

export default function TenantsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<any>(null);
  const [tenantToArchive, setTenantToArchive] = useState<any>(null);

  const { data: tenants = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/v1/tenants"],
    queryFn: async () => {
      const response = await apiRequest({
        url: "/api/v1/tenants",
        method: "GET",
      });
      return response.data || [];
    },
  });

  const filteredTenants = tenants.filter((tenant: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.displayName.toLowerCase().includes(query) ||
      tenant.subdomain.toLowerCase().includes(query) ||
      (tenant.customDomain && tenant.customDomain.toLowerCase().includes(query))
    );
  });

  const handleArchiveTenant = async () => {
    if (!tenantToArchive) return;
    
    try {
      await apiRequest({
        url: `/api/v1/tenants/${tenantToArchive.id}`,
        method: "DELETE",
      });

      toast({
        title: "Tenant archived",
        description: `${tenantToArchive.name} has been archived successfully.`,
      });

      // Refresh the tenants list
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tenants"] });

      // Close the dialog
      setTenantToArchive(null);
    } catch (error) {
      console.error("Error archiving tenant:", error);
      toast({
        title: "Error",
        description: "Failed to archive tenant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-gray-400 hover:bg-gray-500";
      case "standard":
        return "bg-blue-400 hover:bg-blue-500";
      case "professional":
        return "bg-purple-400 hover:bg-purple-500";
      case "enterprise":
        return "bg-amber-400 hover:bg-amber-500";
      default:
        return "bg-gray-400 hover:bg-gray-500";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-400 hover:bg-green-500";
      case "suspended":
        return "bg-amber-400 hover:bg-amber-500";
      case "archived":
        return "bg-red-400 hover:bg-red-500";
      case "pending":
        return "bg-blue-400 hover:bg-blue-500";
      default:
        return "bg-gray-400 hover:bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tenant Management</CardTitle>
              <CardDescription>
                Manage tenants in your multi-tenant CPI Hub instance.
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Tenant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tenants..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Error loading tenants. Please try again later.</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery ? (
                <p>No tenants found matching "{searchQuery}".</p>
              ) : (
                <p>No tenants found. Create your first tenant to get started.</p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subdomain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Data Isolation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant: any) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{tenant.displayName}</div>
                          <div className="text-xs text-muted-foreground">{tenant.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{tenant.subdomain}</span>
                          {tenant.customDomain && (
                            <span className="text-xs text-muted-foreground">
                              Custom: {tenant.customDomain}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(tenant.status)}>
                          {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierBadgeColor(tenant.tier)}>
                          {tenant.tier.charAt(0).toUpperCase() + tenant.tier.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tenant.schemaStrategy === "row_level_security" 
                          ? "Row-Level Security" 
                          : "Schema Per Tenant"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditTenant(tenant)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setTenantToArchive(tenant)}
                              className="text-red-600"
                              disabled={tenant.status === "archived"}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="text-xs text-muted-foreground">
            Showing {filteredTenants.length} of {tenants.length} tenants
          </div>
        </CardFooter>
      </Card>

      {/* Create/Edit Tenant Dialog */}
      {isCreateDialogOpen && (
        <TenantDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={() => setIsCreateDialogOpen(false)}
        />
      )}

      {/* Edit Tenant Dialog */}
      {editTenant && (
        <TenantDialog
          isOpen={!!editTenant}
          onClose={() => setEditTenant(null)}
          tenant={editTenant}
          onSuccess={() => setEditTenant(null)}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!tenantToArchive} onOpenChange={() => setTenantToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the tenant "{tenantToArchive?.displayName}". Archived tenants cannot be
              accessed by users, but their data is preserved. This action can be reversed by changing the tenant
              status back to "active".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveTenant} className="bg-red-600 hover:bg-red-700">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}