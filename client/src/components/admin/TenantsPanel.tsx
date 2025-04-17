import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TenantDialog } from "./TenantDialog";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Trash2,
  RefreshCw,
  Flag,
} from "lucide-react";

interface Tenant {
  id: number;
  name: string;
  displayName?: string;
  subdomain: string;
  customDomain?: string;
  status: string;
  tier: string;
  schemaStrategy: string;
  createdAt: string;
  updatedAt: string;
  logoUrl?: string;
  primaryColor?: string;
  featureFlags?: TenantFeatureFlag[];
}

interface TenantFeatureFlag {
  id: number;
  tenantId: number;
  key: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export function TenantsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isFeatureFlagsDialogOpen, setIsFeatureFlagsDialogOpen] = useState(false);

  // Fetch tenants
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/v1/tenants', page, limit, search, statusFilter, tierFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (tierFilter) params.append('tier', tierFilter);
      
      const response = await apiRequest({
        url: `/api/v1/tenants?${params.toString()}`,
        method: 'GET'
      });
      
      return response.data;
    }
  });

  // Delete tenant mutation
  const deleteTenant = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest({
        url: `/api/v1/tenants/${id}`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Tenant deleted",
        description: "The tenant has been deleted successfully.",
      });
      
      // Invalidate tenant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/v1/tenants'] });
      
      // Close delete dialog
      setIsDeleteDialogOpen(false);
      setCurrentTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete tenant",
        variant: "destructive",
      });
    }
  });

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset page when searching
    setPage(1);
  };

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTierFilter("");
    setPage(1);
  };

  // Handle delete tenant
  const handleDeleteTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    setIsDeleteDialogOpen(true);
  };

  // Handle edit tenant
  const handleEditTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    setIsEditDialogOpen(true);
  };

  // Handle feature flags
  const handleFeatureFlags = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    setIsFeatureFlagsDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = (refresh: boolean = false) => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsFeatureFlagsDialogOpen(false);
    setCurrentTenant(null);
    
    if (refresh) {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/tenants'] });
    }
  };

  // Status badge colors
  const statusColors: Record<string, string> = {
    active: "bg-green-500",
    suspended: "bg-amber-500",
    archived: "bg-zinc-500",
    pending: "bg-blue-500"
  };

  // Tier badge colors
  const tierColors: Record<string, string> = {
    free: "bg-zinc-400",
    standard: "bg-blue-400",
    professional: "bg-purple-500",
    enterprise: "bg-indigo-600"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tenants..."
              className="pl-8 w-[250px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tier filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </form>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>
            Manage all tenants in the CPI Hub platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">
                Error loading tenants: {error instanceof Error ? error.message : "Unknown error"}
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/v1/tenants'] })}
              >
                Try again
              </Button>
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="py-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No tenants found</h3>
              <p className="text-muted-foreground">
                Get started by creating your first tenant.
              </p>
              <Button
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Create Tenant
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subdomain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Schema Strategy</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((tenant: Tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        {tenant.displayName || tenant.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {tenant.subdomain}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusColors[tenant.status] || "bg-gray-500"} text-white border-0`}
                        >
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${tierColors[tenant.tier] || "bg-gray-500"} text-white border-0`}
                        >
                          {tenant.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tenant.schemaStrategy === "row_level_security"
                          ? "Row Level Security"
                          : "Schema Per Tenant"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit tenant
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFeatureFlags(tenant)}>
                              <Flag className="h-4 w-4 mr-2" />
                              Feature flags
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTenant(tenant)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete tenant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {data?.total > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to{" "}
                    {Math.min(page * limit, data?.total)} of {data?.total} tenants
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page <= 1}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, Math.ceil(data?.total / limit)) }, (_, i) => {
                        const pageNumber = i + 1;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              isActive={pageNumber === page}
                              onClick={() => setPage(pageNumber)}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      {Math.ceil(data?.total / limit) > 5 && (
                        <>
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink
                              isActive={Math.ceil(data?.total / limit) === page}
                              onClick={() => setPage(Math.ceil(data?.total / limit))}
                            >
                              {Math.ceil(data?.total / limit)}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      )}
                      
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(Math.min(Math.ceil(data?.total / limit), page + 1))}
                          disabled={page >= Math.ceil(data?.total / limit)}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Tenant Dialog */}
      <TenantDialog
        isOpen={isCreateDialogOpen}
        onClose={handleDialogClose}
      />

      {/* Edit Tenant Dialog */}
      {currentTenant && (
        <TenantDialog
          isOpen={isEditDialogOpen}
          onClose={handleDialogClose}
          tenant={currentTenant}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tenant "{currentTenant?.name}"?
              This action cannot be undone and will permanently delete all data
              associated with this tenant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currentTenant && deleteTenant.mutate(currentTenant.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTenant.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}