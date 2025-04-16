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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MoreHorizontal, Plus, RefreshCcw, Search } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Organization status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getBadgeColor = () => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "suspended":
        return "bg-red-500";
      case "trial":
        return "bg-blue-500";
      case "archived":
        return "bg-gray-500";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <Badge className={`${getBadgeColor()} text-white`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Add/Edit Organization dialog component
const OrganizationDialog = ({
  organization = null,
  onClose,
  isOpen,
}: {
  organization?: any;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const isEditing = !!organization;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: organization?.name || "",
    displayName: organization?.displayName || "",
    status: organization?.status || "active",
    domain: organization?.domain || "",
    primaryContactEmail: organization?.primaryContactEmail || "",
    phoneNumber: organization?.phoneNumber || "",
    maxUsers: organization?.maxUsers || 5,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEditing
        ? `/admin-api/organizations/${organization.id}`
        : "/admin-api/organizations";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      toast({
        title: `Organization ${isEditing ? "updated" : "created"} successfully`,
        description: `${formData.name} has been ${isEditing ? "updated" : "created"}.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/admin-api/organizations"] });
      onClose();
    } catch (error) {
      console.error("Error submitting organization:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} organization. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Organization" : "Add New Organization"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the organization details below."
              : "Enter the details for the new organization."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayName" className="text-right">
                Display Name
              </Label>
              <Input
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="domain" className="text-right">
                Domain
              </Label>
              <Input
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="example.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="primaryContactEmail" className="text-right">
                Contact Email
              </Label>
              <Input
                id="primaryContactEmail"
                name="primaryContactEmail"
                type="email"
                value={formData.primaryContactEmail}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phoneNumber" className="text-right">
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxUsers" className="text-right">
                Max Users
              </Label>
              <Input
                id="maxUsers"
                name="maxUsers"
                type="number"
                min="1"
                value={formData.maxUsers}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const OrganizationsPanel = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null);

  // Define Organization type
  interface Organization {
    id: number;
    name: string;
    displayName?: string;
    domain?: string;
    status: string;
    primaryContactEmail: string;
    phoneNumber?: string;
    maxUsers?: number;
    totalUsers?: number;
    createdAt?: string;
  }

  // Mock data for development mode
  const mockOrganizations: Organization[] = [
    {
      id: 1,
      name: "acme-corp",
      displayName: "ACME Corporation",
      domain: "acme-corp.com",
      status: "active",
      primaryContactEmail: "admin@acme-corp.com",
      phoneNumber: "+1 (555) 123-4567",
      maxUsers: 50,
      totalUsers: 42,
      createdAt: "2024-11-15T08:00:00Z"
    },
    {
      id: 2,
      name: "globex",
      displayName: "Globex Industries",
      domain: "globex-ind.com",
      status: "active",
      primaryContactEmail: "contact@globex-ind.com",
      phoneNumber: "+1 (555) 987-6543",
      maxUsers: 25,
      totalUsers: 18,
      createdAt: "2024-12-01T10:30:00Z"
    },
    {
      id: 3,
      name: "initech",
      displayName: "Initech Solutions",
      domain: "initech.io",
      status: "trial",
      primaryContactEmail: "info@initech.io",
      phoneNumber: "+1 (555) 456-7890",
      maxUsers: 10,
      totalUsers: 8,
      createdAt: "2025-01-20T14:15:00Z"
    },
    {
      id: 4,
      name: "umbrella-corp",
      displayName: "Umbrella Corporation",
      domain: "umbrella-corp.net",
      status: "suspended",
      primaryContactEmail: "support@umbrella-corp.net",
      phoneNumber: "+1 (555) 789-0123",
      maxUsers: 100,
      totalUsers: 87,
      createdAt: "2024-10-05T09:45:00Z"
    },
    {
      id: 5,
      name: "stark-industries",
      displayName: "Stark Industries",
      domain: "stark-ind.com",
      status: "active",
      primaryContactEmail: "admin@stark-ind.com",
      phoneNumber: "+1 (555) 234-5678",
      maxUsers: 75,
      totalUsers: 62,
      createdAt: "2025-02-10T11:20:00Z"
    }
  ];

  // Determine if we're in development mode
  const isDevelopmentMode = import.meta.env.DEV === true;

  // Fetch organizations data (or use mock data in development)
  const {
    data: organizations = isDevelopmentMode ? mockOrganizations : [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Organization[]>({
    queryKey: ["/admin-api/organizations"],
    enabled: !isDevelopmentMode, // Don't run the query in development mode
  });

  // Handle adding a new organization
  const handleAddOrganization = () => {
    setSelectedOrganization(null);
    setShowDialog(true);
  };

  // Handle editing an organization
  const handleEditOrganization = (organization: any) => {
    setSelectedOrganization(organization);
    setShowDialog(true);
  };

  // Handle suspending an organization
  const handleSuspendOrganization = async (organization: any) => {
    try {
      const response = await fetch(`/admin-api/organizations/${organization.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...organization, status: "suspended" }),
      });

      if (!response.ok) throw new Error("Failed to suspend organization");

      toast({
        title: "Organization suspended",
        description: `${organization.name} has been suspended.`,
      });

      // Refresh data
      refetch();
    } catch (error) {
      console.error("Error suspending organization:", error);
      toast({
        title: "Error",
        description: "Failed to suspend organization. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter organizations based on search query
  const filteredOrganizations = (organizations as Organization[]).filter((org) => {
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const orgData = `${org.name} ${org.displayName || ""} ${org.domain || ""} ${
      org.primaryContactEmail
    }`.toLowerCase();

    return searchTerms.every((term) => orgData.includes(term));
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Manage all tenant organizations in the system</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAddOrganization}>
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              Error loading organizations. Please try again.
            </div>
          ) : (
            <Table>
              <TableCaption>A list of all organizations.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Primary Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      {searchQuery
                        ? "No organizations match your search criteria."
                        : "No organizations found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrganizations.map((org: any) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        {org.displayName || org.name}
                      </TableCell>
                      <TableCell>{org.domain || "—"}</TableCell>
                      <TableCell>{org.primaryContactEmail}</TableCell>
                      <TableCell>
                        <StatusBadge status={org.status} />
                      </TableCell>
                      <TableCell>
                        {org.totalUsers !== undefined ? org.totalUsers : "?"}/{org.maxUsers || "∞"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditOrganization(org)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/admin-api/organizations/${org.id}/members`}>
                              View Members
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {org.status === "active" ? (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleSuspendOrganization(org)}
                              >
                                Suspend
                              </DropdownMenuItem>
                            ) : org.status === "suspended" ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  // Handle activating the organization
                                  toast({
                                    title: "Not implemented",
                                    description: "This feature is coming soon.",
                                  });
                                }}
                              >
                                Activate
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredOrganizations.length} of {organizations.length} organizations
          </div>
        </CardFooter>
      </Card>

      {showDialog && (
        <OrganizationDialog
          organization={selectedOrganization}
          onClose={() => setShowDialog(false)}
          isOpen={showDialog}
        />
      )}
    </>
  );
};

export default OrganizationsPanel;