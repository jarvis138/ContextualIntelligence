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
import { 
  AlertTriangle, 
  Check, 
  Copy, 
  Key, 
  Loader2, 
  MoreHorizontal, 
  Plus, 
  RefreshCcw, 
  Search, 
  ShieldAlert, 
  X 
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
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

// API Key creation success dialog
const ApiKeyCreatedDialog = ({
  apiKey,
  onClose,
  isOpen,
}: {
  apiKey: string;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const { toast } = useToast();
  
  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-2" />
            API Key Created Successfully
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="mb-4">
              This API key will only be shown once. Please copy it now and store it securely.
            </div>
            <div className="bg-muted p-3 rounded-md flex items-center justify-between mb-2">
              <code className="text-xs break-all mr-2">{apiKey}</code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-red-500 text-sm flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              You won't be able to see this key again.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>I've Saved My API Key</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// API Key dialog component
const ApiKeyDialog = ({
  onClose,
  isOpen,
  onApiKeyCreated,
}: {
  onClose: () => void;
  isOpen: boolean;
  onApiKeyCreated: (apiKey: string) => void;
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    organizationId: "",
    expiresAt: "",
    permissions: "read",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch organizations for dropdown
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Calculate expiry date if not provided
      const dataToSubmit = { ...formData };
      if (!dataToSubmit.expiresAt) {
        // Default to 1 year from now
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        dataToSubmit.expiresAt = oneYearFromNow.toISOString().split('T')[0];
      }

      const response = await fetch(`/admin-api/organizations/${formData.organizationId}/api-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/admin-api/api-keys"] });
      
      // Show the created API key to the user
      onApiKeyCreated(result.key);
      
      // Close the form dialog
      onClose();
    } catch (error) {
      console.error("Error creating API key:", error);
      toast({
        title: "Error",
        description: "Failed to create API key. Please try again.",
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
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for secure access to the CPI Hub API.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="organizationId" className="text-right">
                Organization
              </Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value) => handleSelectChange("organizationId", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Key Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="e.g., Production API Key"
                required
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
                placeholder="e.g., Used for production environment integrations"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="permissions" className="text-right">
                Permissions
              </Label>
              <Select
                value={formData.permissions}
                onValueChange={(value) => handleSelectChange("permissions", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select permissions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read Only</SelectItem>
                  <SelectItem value="read-write">Read & Write</SelectItem>
                  <SelectItem value="full">Full Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expiresAt" className="text-right">
                Expiry Date
              </Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Leave blank for 1 year expiry"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate API Key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ApiKeysPanel = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState("");

  // Fetch API keys data
  const {
    data: apiKeys = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/admin-api/api-keys"],
  });

  // Handle creating a new API key
  const handleAddApiKey = () => {
    setShowCreateDialog(true);
  };

  // Handle API key creation success
  const handleApiKeyCreated = (apiKey: string) => {
    setCreatedApiKey(apiKey);
    setShowKeyDialog(true);
  };

  // Handle revoking an API key
  const handleRevokeApiKey = async (apiKey: any) => {
    try {
      const response = await fetch(`/admin-api/api-keys/${apiKey.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to revoke API key");

      toast({
        title: "API key revoked",
        description: `${apiKey.name} has been revoked.`,
      });

      // Refresh data
      refetch();
    } catch (error) {
      console.error("Error revoking API key:", error);
      toast({
        title: "Error",
        description: "Failed to revoke API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Check if API key is expired
  const isExpired = (dateString: string) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const now = new Date();
    return expiryDate < now;
  };

  // Get status badge for API key
  const getStatusBadge = (apiKey: any) => {
    if (apiKey.revokedAt) {
      return (
        <Badge variant="destructive" className="flex items-center">
          <X className="h-3 w-3 mr-1" />
          Revoked
        </Badge>
      );
    } else if (isExpired(apiKey.expiresAt)) {
      return (
        <Badge variant="outline" className="flex items-center text-yellow-600 border-yellow-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="flex items-center text-green-600 border-green-600">
          <Check className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
  };

  // Filter API keys based on search query
  const filteredApiKeys = apiKeys.filter((apiKey: any) => {
    if (!searchQuery) return true;
    
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const apiKeyData = `${apiKey.name} ${apiKey.description || ""} ${apiKey.organization?.name || ""}`.toLowerCase();
    
    return searchTerms.every((term) => apiKeyData.includes(term));
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for secure access to CPI Hub</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAddApiKey}>
                <Key className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search API keys..."
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
              Error loading API keys. Please try again.
            </div>
          ) : (
            <Table>
              <TableCaption>A list of all API keys.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>API Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      {searchQuery
                        ? "No API keys match your search criteria."
                        : "No API keys found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApiKeys.map((apiKey: any) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-mono text-xs">
                        {apiKey.keyPrefix}••••••••
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{apiKey.name}</div>
                        {apiKey.description && (
                          <div className="text-xs text-muted-foreground">{apiKey.description}</div>
                        )}
                      </TableCell>
                      <TableCell>{apiKey.organization?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={apiKey.permissions === "full" ? "destructive" : "outline"}>
                          {apiKey.permissions === "read" ? "Read Only" : 
                           apiKey.permissions === "read-write" ? "Read & Write" : "Full Access"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
                      <TableCell>{formatDate(apiKey.expiresAt)}</TableCell>
                      <TableCell>{getStatusBadge(apiKey)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              window.location.href = `/admin/api-keys/${apiKey.id}/usage`;
                            }}>
                              View Usage
                            </DropdownMenuItem>
                            {!apiKey.revokedAt && !isExpired(apiKey.expiresAt) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600 flex items-center"
                                  onClick={() => handleRevokeApiKey(apiKey)}
                                >
                                  <ShieldAlert className="h-4 w-4 mr-2" />
                                  Revoke Key
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
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredApiKeys.length} of {apiKeys.length} API keys
          </div>
        </CardFooter>
      </Card>

      {/* API key creation dialog */}
      {showCreateDialog && (
        <ApiKeyDialog
          onClose={() => setShowCreateDialog(false)}
          isOpen={showCreateDialog}
          onApiKeyCreated={handleApiKeyCreated}
        />
      )}

      {/* API key display dialog after successful creation */}
      {showKeyDialog && (
        <ApiKeyCreatedDialog
          apiKey={createdApiKey}
          onClose={() => setShowKeyDialog(false)}
          isOpen={showKeyDialog}
        />
      )}
    </>
  );
};

export default ApiKeysPanel;