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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MoreHorizontal, Plus, RefreshCcw, Search, ShieldCheck, Users } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Scope badge component
const ScopeBadge = ({ scope }: { scope: string }) => {
  const getBadgeVariant = () => {
    switch (scope) {
      case "global":
        return "destructive";
      case "organization":
        return "default";
      case "team":
        return "secondary";
      case "project":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Badge variant={getBadgeVariant()} className="capitalize">
      {scope}
    </Badge>
  );
};

// Role dialog component
const RoleDialog = ({
  role = null,
  onClose,
  isOpen,
}: {
  role?: any;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const isEditing = !!role;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: role?.name || "",
    description: role?.description || "",
    isSystem: role?.isSystem || false,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<number[]>(
    role?.permissions?.map((p: any) => p.id) || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch permissions for checkbox selection
  const { data: permissions = [] } = useQuery({
    queryKey: ["/admin-api/permissions"],
    enabled: isOpen,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        permissionIds: selectedPermissions,
      };

      const url = isEditing ? `/admin-api/roles/${role.id}` : "/admin-api/roles";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      toast({
        title: `Role ${isEditing ? "updated" : "created"} successfully`,
        description: `${formData.name} has been ${isEditing ? "updated" : "created"}.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/admin-api/roles"] });
      onClose();
    } catch (error) {
      console.error("Error submitting role:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} role. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group permissions by scope for better organization
  const groupedPermissions = permissions.reduce((groups: any, permission: any) => {
    const scope = permission.scope || "global";
    if (!groups[scope]) {
      groups[scope] = [];
    }
    groups[scope].push(permission);
    return groups;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Role" : "Add New Role"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the role details and permissions below."
              : "Enter the details for the new role."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Role Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
                disabled={formData.isSystem}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isSystem" className="text-right">
                System Role
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="isSystem"
                  checked={formData.isSystem}
                  onCheckedChange={(checked) => handleCheckboxChange("isSystem", checked as boolean)}
                  disabled={isEditing} // Can't change system role status once created
                />
                <Label htmlFor="isSystem">
                  System roles cannot be deleted and have restricted editing
                </Label>
              </div>
            </div>

            <div className="my-4">
              <h3 className="font-medium mb-2">Permissions</h3>
              <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
                {Object.entries(groupedPermissions).map(([scope, perms]: [string, any]) => (
                  <div key={scope} className="mb-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <ScopeBadge scope={scope} />
                      <span className="ml-2 capitalize">{scope} Permissions</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-2">
                      {perms.map((permission: any) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`permission-${permission.id}`}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                          <Label htmlFor={`permission-${permission.id}`} className="text-sm">
                            {permission.name}
                            <span className="text-xs text-muted-foreground block">
                              {permission.description}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(groupedPermissions).length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No permissions found. Please create permissions first.
                  </div>
                )}
              </div>
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

// Permission dialog component
const PermissionDialog = ({
  permission = null,
  onClose,
  isOpen,
}: {
  permission?: any;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const isEditing = !!permission;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: permission?.name || "",
    description: permission?.description || "",
    scope: permission?.scope || "global",
    action: permission?.action || "",
    resource: permission?.resource || "",
    isSystem: permission?.isSystem || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEditing ? `/admin-api/permissions/${permission.id}` : "/admin-api/permissions";
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
        title: `Permission ${isEditing ? "updated" : "created"} successfully`,
        description: `${formData.name} has been ${isEditing ? "updated" : "created"}.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/admin-api/permissions"] });
      onClose();
    } catch (error) {
      console.error("Error submitting permission:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} permission. Please try again.`,
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
          <DialogTitle>{isEditing ? "Edit Permission" : "Add New Permission"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the permission details below."
              : "Enter the details for the new permission."}
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
                disabled={formData.isSystem}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="scope" className="text-right">
                Scope
              </Label>
              <Select
                value={formData.scope}
                onValueChange={(value) => handleSelectChange("scope", value)}
                disabled={formData.isSystem}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="action" className="text-right">
                Action
              </Label>
              <Input
                id="action"
                name="action"
                value={formData.action}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="e.g., read, write, delete"
                required
                disabled={formData.isSystem}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="resource" className="text-right">
                Resource
              </Label>
              <Input
                id="resource"
                name="resource"
                value={formData.resource}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="e.g., users, projects, documents"
                required
                disabled={formData.isSystem}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isSystem" className="text-right">
                System Permission
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="isSystem"
                  checked={formData.isSystem}
                  onCheckedChange={(checked) => handleCheckboxChange("isSystem", checked as boolean)}
                  disabled={isEditing} // Can't change system permission status once created
                />
                <Label htmlFor="isSystem">
                  System permissions cannot be deleted and have restricted editing
                </Label>
              </div>
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

// Roles tab component
const RolesTab = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  // Fetch roles data
  const {
    data: roles = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/admin-api/roles"],
  });

  // Handle adding a new role
  const handleAddRole = () => {
    setSelectedRole(null);
    setShowDialog(true);
  };

  // Handle editing a role
  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    setShowDialog(true);
  };

  // Handle deleting a role
  const handleDeleteRole = async (role: any) => {
    if (role.isSystem) {
      toast({
        title: "Cannot delete system role",
        description: "System roles cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/admin-api/roles/${role.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete role");

      toast({
        title: "Role deleted",
        description: `${role.name} has been deleted.`,
      });

      // Refresh data
      refetch();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({
        title: "Error",
        description: "Failed to delete role. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter roles based on search query
  const filteredRoles = roles.filter((role: any) => {
    if (!searchQuery) return true;
    
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const roleData = `${role.name} ${role.description || ""}`.toLowerCase();
    
    return searchTerms.every((term) => roleData.includes(term));
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Manage user roles and their permissions</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAddRole}>
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
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
              Error loading roles. Please try again.
            </div>
          ) : (
            <Table>
              <TableCaption>A list of all roles.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      {searchQuery
                        ? "No roles match your search criteria."
                        : "No roles found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role: any) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        {role.name}
                      </TableCell>
                      <TableCell>{role.description || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={role.isSystem ? "destructive" : "outline"}>
                          {role.isSystem ? "System" : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.permissions?.length ? (
                          <Badge variant="outline">
                            {role.permissions.length} permissions
                          </Badge>
                        ) : (
                          "—"
                        )}
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
                            <DropdownMenuItem onClick={() => handleEditRole(role)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/admin/roles/${role.id}/users`}>
                              View Users
                            </DropdownMenuItem>
                            {!role.isSystem && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteRole(role)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
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
      </Card>

      {showDialog && (
        <RoleDialog
          role={selectedRole}
          onClose={() => setShowDialog(false)}
          isOpen={showDialog}
        />
      )}
    </>
  );
};

// Permissions tab component
const PermissionsTab = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<any>(null);

  // Fetch permissions data
  const {
    data: permissions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/admin-api/permissions"],
  });

  // Handle adding a new permission
  const handleAddPermission = () => {
    setSelectedPermission(null);
    setShowDialog(true);
  };

  // Handle editing a permission
  const handleEditPermission = (permission: any) => {
    setSelectedPermission(permission);
    setShowDialog(true);
  };

  // Handle deleting a permission
  const handleDeletePermission = async (permission: any) => {
    if (permission.isSystem) {
      toast({
        title: "Cannot delete system permission",
        description: "System permissions cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/admin-api/permissions/${permission.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete permission");

      toast({
        title: "Permission deleted",
        description: `${permission.name} has been deleted.`,
      });

      // Refresh data
      refetch();
    } catch (error) {
      console.error("Error deleting permission:", error);
      toast({
        title: "Error",
        description: "Failed to delete permission. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter permissions based on search query
  const filteredPermissions = permissions.filter((permission: any) => {
    if (!searchQuery) return true;
    
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const permissionData = `${permission.name} ${permission.description || ""} ${permission.action} ${permission.resource} ${permission.scope}`.toLowerCase();
    
    return searchTerms.every((term) => permissionData.includes(term));
  });

  // Group permissions by scope for better organization
  const groupedPermissions = filteredPermissions.reduce((groups: any, permission: any) => {
    const scope = permission.scope || "global";
    if (!groups[scope]) {
      groups[scope] = [];
    }
    groups[scope].push(permission);
    return groups;
  }, {});

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>Manage system permissions</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAddPermission}>
                <Plus className="mr-2 h-4 w-4" />
                Add Permission
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
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
              Error loading permissions. Please try again.
            </div>
          ) : (
            Object.entries(groupedPermissions).length > 0 ? (
              Object.entries(groupedPermissions).map(([scope, perms]: [string, any]) => (
                <div key={scope} className="mb-6">
                  <div className="flex items-center mb-2">
                    <ScopeBadge scope={scope} />
                    <h3 className="ml-2 font-medium capitalize">{scope} Permissions</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perms.map((permission: any) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            {permission.name}
                          </TableCell>
                          <TableCell>{permission.action}</TableCell>
                          <TableCell>{permission.resource}</TableCell>
                          <TableCell>{permission.description || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={permission.isSystem ? "destructive" : "outline"}>
                              {permission.isSystem ? "System" : "Custom"}
                            </Badge>
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
                                <DropdownMenuItem onClick={() => handleEditPermission(permission)}>
                                  Edit
                                </DropdownMenuItem>
                                {!permission.isSystem && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => handleDeletePermission(permission)}
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {searchQuery
                  ? "No permissions match your search criteria."
                  : "No permissions found. Click 'Add Permission' to create one."}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {showDialog && (
        <PermissionDialog
          permission={selectedPermission}
          onClose={() => setShowDialog(false)}
          isOpen={showDialog}
        />
      )}
    </>
  );
};

const RolesPermissionsPanel = () => {
  const [activeTab, setActiveTab] = useState("roles");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>Roles</span>
        </TabsTrigger>
        <TabsTrigger value="permissions" className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          <span>Permissions</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roles" className="space-y-4">
        <RolesTab />
      </TabsContent>

      <TabsContent value="permissions" className="space-y-4">
        <PermissionsTab />
      </TabsContent>
    </Tabs>
  );
};

export default RolesPermissionsPanel;