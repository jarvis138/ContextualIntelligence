import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Tenant form schema
const tenantFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
  subdomain: z.string().min(2).max(63).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: "Subdomain must consist of lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen",
  }),
  customDomain: z.string().optional(),
  status: z.enum(["active", "suspended", "archived", "pending"]),
  tier: z.enum(["free", "standard", "professional", "enterprise"]),
  schemaStrategy: z.enum(["row_level_security", "schema_per_tenant"]),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

const defaultValues: Partial<TenantFormValues> = {
  status: "active",
  tier: "standard",
  schemaStrategy: "row_level_security",
};

interface TenantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant?: any; // The tenant to edit, undefined for new tenant
  onSuccess?: () => void;
}

export function TenantDialog({ isOpen, onClose, tenant, onSuccess }: TenantDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!tenant;

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: isEditMode
      ? {
          name: tenant.name,
          displayName: tenant.displayName,
          subdomain: tenant.subdomain,
          customDomain: tenant.customDomain || "",
          status: tenant.status,
          tier: tenant.tier,
          schemaStrategy: tenant.schemaStrategy,
        }
      : defaultValues,
  });

  const { formState } = form;
  const { isSubmitting } = formState;

  async function onSubmit(values: TenantFormValues) {
    try {
      if (values.customDomain === "") {
        values.customDomain = undefined;
      }

      // Clean up the object to match API expectations
      const payload = { ...values };

      if (isEditMode) {
        // Update existing tenant
        await apiRequest({
          url: `/api/v1/tenants/${tenant.id}`,
          method: "PATCH",
          data: payload,
        });

        toast({
          title: "Tenant updated",
          description: `${values.name} has been updated successfully.`,
        });
      } else {
        // Create new tenant
        await apiRequest({
          url: "/api/v1/tenants",
          method: "POST",
          data: payload,
        });

        toast({
          title: "Tenant created",
          description: `${values.name} has been created successfully.`,
        });
      }

      // Invalidate the tenants cache
      queryClient.invalidateQueries({ queryKey: ["/api/v1/tenants"] });
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close the dialog
      onClose();
    } catch (error) {
      console.error("Error saving tenant:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? "update" : "create"} tenant. Please try again.`,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit" : "Create"} Tenant</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the tenant's information below."
              : "Enter the details to create a new tenant."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Tenant name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The internal name of the tenant.
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
                      <Input placeholder="Display name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name shown to users.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subdomain</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="subdomain" 
                        {...field} 
                        disabled={isEditMode} // Can't change subdomain once created
                      />
                    </FormControl>
                    <FormDescription>
                      The subdomain for accessing the tenant (e.g., tenant.cpihub.com).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Domain (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="example.com" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Optional custom domain for this tenant.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
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
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
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

                <FormField
                  control={form.control}
                  name="schemaStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Isolation</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isEditMode} // Can't change isolation strategy once created
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select strategy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="row_level_security">Row-Level Security</SelectItem>
                          <SelectItem value="schema_per_tenant">Schema Per Tenant</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : isEditMode ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}