import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw } from "lucide-react";

// Tenant schema for form validation
const tenantSchema = z.object({
  name: z.string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(50, { message: "Name cannot exceed 50 characters" })
    .regex(/^[a-z0-9_-]+$/, { 
      message: "Name can only contain lowercase letters, numbers, hyphens, and underscores" 
    }),
  displayName: z.string()
    .min(2, { message: "Display name must be at least 2 characters long" })
    .max(100, { message: "Display name cannot exceed 100 characters" }),
  subdomain: z.string()
    .min(2, { message: "Subdomain must be at least 2 characters" })
    .max(50, { message: "Subdomain cannot exceed 50 characters" })
    .regex(/^[a-z0-9-]+$/, { 
      message: "Subdomain can only contain lowercase letters, numbers, and hyphens" 
    }),
  customDomain: z.string().optional(),
  description: z.string().max(500, { 
    message: "Description cannot exceed 500 characters" 
  }).optional(),
  status: z.enum(["active", "suspended", "archived", "pending"]),
  tier: z.enum(["free", "standard", "professional", "enterprise"]),
  schemaStrategy: z.enum(["row_level_security", "schema_per_tenant"]),
  primaryColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { 
      message: "Please provide a valid hex color code" 
    })
    .optional(),
  logoUrl: z.string().url({ message: "Please provide a valid URL" }).optional(),
  maxUsers: z.number().int().positive().optional(),
  maxProjects: z.number().int().positive().optional(),
  maxStorage: z.number().int().positive().optional(),
  allowExternalAuth: z.boolean().optional(),
  restrictIpAccess: z.boolean().optional(),
  enforceStrictSecurity: z.boolean().optional(),
});

// Interface for the form values
type TenantFormValues = z.infer<typeof tenantSchema>;

// Interface for tenant data
interface Tenant {
  id: number;
  name: string;
  displayName?: string;
  subdomain: string;
  customDomain?: string;
  description?: string;
  status: string;
  tier: string;
  schemaStrategy: string;
  createdAt: string;
  updatedAt: string;
  logoUrl?: string;
  primaryColor?: string;
  maxUsers?: number;
  maxProjects?: number;
  maxStorage?: number;
  allowExternalAuth?: boolean;
  restrictIpAccess?: boolean;
  enforceStrictSecurity?: boolean;
}

// Interface for the dialog component props
interface TenantDialogProps {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  tenant?: Tenant;
}

export function TenantDialog({ isOpen, onClose, tenant }: TenantDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!tenant;

  // Define default values for the form
  const defaultValues: Partial<TenantFormValues> = {
    name: "",
    displayName: "",
    subdomain: "",
    customDomain: "",
    description: "",
    status: "pending",
    tier: "standard",
    schemaStrategy: "row_level_security",
    primaryColor: "#6366f1", // Indigo color default
    logoUrl: "",
    maxUsers: 10,
    maxProjects: 20,
    maxStorage: 5, // GB
    allowExternalAuth: true,
    restrictIpAccess: false,
    enforceStrictSecurity: false,
  };

  // Initialize the form
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues,
  });

  // Function to set form values if in edit mode
  useEffect(() => {
    if (isEditMode && tenant) {
      // Reset the form with tenant data
      form.reset({
        name: tenant.name,
        displayName: tenant.displayName || "",
        subdomain: tenant.subdomain,
        customDomain: tenant.customDomain || "",
        description: tenant.description || "",
        status: tenant.status as any,
        tier: tenant.tier as any,
        schemaStrategy: tenant.schemaStrategy as any,
        primaryColor: tenant.primaryColor || "#6366f1",
        logoUrl: tenant.logoUrl || "",
        maxUsers: tenant.maxUsers || 10,
        maxProjects: tenant.maxProjects || 20,
        maxStorage: tenant.maxStorage || 5,
        allowExternalAuth: tenant.allowExternalAuth || true,
        restrictIpAccess: tenant.restrictIpAccess || false,
        enforceStrictSecurity: tenant.enforceStrictSecurity || false,
      });
    } else {
      // Reset to default values for create mode
      form.reset(defaultValues);
    }
  }, [isEditMode, tenant, form]);

  // Create tenant mutation
  const createTenant = useMutation({
    mutationFn: async (data: TenantFormValues) => {
      const response = await apiRequest({
        url: "/api/v1/tenants",
        method: "POST",
        data,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant created successfully",
      });
      onClose(true); // Close with refresh
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create tenant",
        variant: "destructive",
      });
    },
  });

  // Update tenant mutation
  const updateTenant = useMutation({
    mutationFn: async (data: TenantFormValues & { id: number }) => {
      const { id, ...tenantData } = data;
      const response = await apiRequest({
        url: `/api/v1/tenants/${id}`,
        method: "PATCH",
        data: tenantData,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
      onClose(true); // Close with refresh
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update tenant",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: TenantFormValues) => {
    if (isEditMode && tenant) {
      updateTenant.mutate({ ...values, id: tenant.id });
    } else {
      createTenant.mutate(values);
    }
  };

  // Generate a random subdomain based on name
  const generateSubdomain = () => {
    const name = form.getValues("name");
    if (name) {
      const randomSuffix = Math.floor(Math.random() * 10000);
      const subdomain = `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${randomSuffix}`;
      form.setValue("subdomain", subdomain, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Tenant" : "Create New Tenant"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the tenant information and settings"
              : "Enter the details for the new tenant"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="limits">Limits</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="acme-corp" {...field} />
                      </FormControl>
                      <FormDescription>
                        A unique identifier for the tenant (lowercase, numbers, hyphens)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name shown throughout the interface
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2">
                  <FormField
                    control={form.control}
                    name="subdomain"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Subdomain</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input placeholder="acme" {...field} />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={generateSubdomain}
                          >
                            Generate
                          </Button>
                        </div>
                        <FormDescription>
                          Tenants will access the platform at subdomain.cpihub.com
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Domain (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="cpihub.acmecorp.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        A custom domain for tenant access (requires DNS setup)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="A brief description of this tenant" 
                          className="h-20" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <FormField
                  control={form.control}
                  name="schemaStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Database Schema Strategy</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select schema strategy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="row_level_security">Row Level Security</SelectItem>
                          <SelectItem value="schema_per_tenant">Schema Per Tenant</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How data is isolated between tenants in the database
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allowExternalAuth"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Allow External Authentication</FormLabel>
                        <FormDescription>
                          Enable SSO, OAuth, and other external authentication methods
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="restrictIpAccess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Restrict IP Access</FormLabel>
                        <FormDescription>
                          Restrict access to specific IP addresses or ranges
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enforceStrictSecurity"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enforce Strict Security</FormLabel>
                        <FormDescription>
                          Enforce 2FA, regular password changes, and security auditing
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Limits Tab */}
              <TabsContent value="limits" className="space-y-4">
                <FormField
                  control={form.control}
                  name="maxUsers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Users</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of users allowed for this tenant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxProjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Projects</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of projects allowed for this tenant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="maxStorage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Storage (GB)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum storage allowed in gigabytes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-4">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <div className="flex space-x-2">
                        <div 
                          className="w-10 h-10 rounded border" 
                          style={{ backgroundColor: field.value || '#6366f1' }}
                        />
                        <FormControl>
                          <Input placeholder="#6366f1" {...field} />
                        </FormControl>
                      </div>
                      <FormDescription>
                        Primary brand color (hex code)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL to the tenant's logo image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose()}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createTenant.isPending || updateTenant.isPending}
              >
                {(createTenant.isPending || updateTenant.isPending) ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditMode ? "Update Tenant" : "Create Tenant"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}