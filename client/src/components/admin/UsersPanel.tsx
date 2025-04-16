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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MoreHorizontal, Plus, RefreshCcw, Search, ShieldAlert, UserPlus } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Role badge component
const RoleBadge = ({ role }: { role: string }) => {
  const getBadgeColor = () => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "manager":
        return "bg-purple-500";
      case "user":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Badge className={`${getBadgeColor()} text-white`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
};

// User dialog component (Add/Edit)
const UserDialog = ({
  user = null,
  onClose,
  isOpen,
}: {
  user?: any;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const isEditing = !!user;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: user?.username || "",
    fullName: user?.fullName || "",
    email: user?.email || "",
    role: user?.role || "user",
    password: "",
    confirmPassword: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: organizations = [] } = useQuery({
    queryKey: ["/admin-api/organizations"],
    enabled: isOpen,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!isEditing && formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "The passwords you entered do not match.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      // Remove confirmPassword from data sent to server
      const { confirmPassword, ...dataToSubmit } = formData;
      
      // Don't send empty password when editing
      if (isEditing && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }

      const url = isEditing ? `/admin-api/users/${user.id}` : "/admin-api/users";
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
        title: `User ${isEditing ? "updated" : "created"} successfully`,
        description: `${formData.username} has been ${isEditing ? "updated" : "created"}.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/admin-api/users"] });
      onClose();
    } catch (error) {
      console.error("Error submitting user:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} user. Please try again.`,
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
          <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the user details below."
              : "Enter the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="col-span-3"
                required
                disabled={isEditing}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleSelectChange("role", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Only show password fields for new users or when editing */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {isEditing ? "New Password" : "Password"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="col-span-3"
                required={!isEditing}
                placeholder={isEditing ? "Leave blank to keep current" : ""}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassword" className="text-right">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="col-span-3"
                required={!isEditing || !!formData.password}
                placeholder={isEditing ? "Leave blank to keep current" : ""}
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

const UsersPanel = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Fetch users data
  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/admin-api/users"],
  });

  // Handle adding a new user
  const handleAddUser = () => {
    setSelectedUser(null);
    setShowDialog(true);
  };

  // Handle editing a user
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setShowDialog(true);
  };

  // Handle suspending a user
  const handleSuspendUser = async (user: any) => {
    try {
      const response = await fetch(`/admin-api/users/${user.id}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to suspend user");

      toast({
        title: "User suspended",
        description: `${user.username} has been suspended.`,
      });

      // Refresh data
      refetch();
    } catch (error) {
      console.error("Error suspending user:", error);
      toast({
        title: "Error",
        description: "Failed to suspend user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user: any) => {
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const userData = `${user.username} ${user.fullName || ""} ${user.email || ""} ${
      user.role
    }`.toLowerCase();

    return searchTerms.every((term) => userData.includes(term));
  });

  // Get user initials for avatar
  const getUserInitials = (user: any) => {
    if (!user.fullName) return user.username.substring(0, 2).toUpperCase();
    
    const nameParts = user.fullName.split(" ");
    if (nameParts.length === 1) return nameParts[0].substring(0, 2).toUpperCase();
    
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage all users in the system</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAddUser}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
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
              Error loading users. Please try again.
            </div>
          ) : (
            <Table>
              <TableCaption>A list of all users.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      {searchQuery
                        ? "No users match your search criteria."
                        : "No users found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} alt={user.fullName || user.username} />
                          <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-xs text-muted-foreground">@{user.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                        {user.role === "admin" && (
                          <ShieldAlert className="inline h-4 w-4 ml-1 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>{user.organization?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.active !== false ? "outline" : "destructive"}
                          className="capitalize"
                        >
                          {user.active !== false ? "Active" : "Suspended"}
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
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.active !== false ? (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleSuspendUser(user)}
                              >
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  // Handle reactivating the user
                                  toast({
                                    title: "Not implemented",
                                    description: "This feature is coming soon.",
                                  });
                                }}
                              >
                                Activate
                              </DropdownMenuItem>
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
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardFooter>
      </Card>

      {showDialog && (
        <UserDialog
          user={selectedUser}
          onClose={() => setShowDialog(false)}
          isOpen={showDialog}
        />
      )}
    </>
  );
};

export default UsersPanel;