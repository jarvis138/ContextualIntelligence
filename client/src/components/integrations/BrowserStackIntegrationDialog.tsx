import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LayoutGrid, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface BrowserStackIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

const browserStackFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  accessKey: z.string().min(1, "Access key is required"),
  projectName: z.string().optional(),
  buildName: z.string().optional(),
  dataType: z.enum(["automate", "app-automate", "percy"]).default("automate"),
});

type BrowserStackFormValues = z.infer<typeof browserStackFormSchema>;

export function BrowserStackIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess,
}: BrowserStackIntegrationDialogProps) {
  const { toast } = useToast();

  const form = useForm<BrowserStackFormValues>({
    resolver: zodResolver(browserStackFormSchema),
    defaultValues: {
      name: "BrowserStack Integration",
      username: "",
      accessKey: "",
      projectName: "",
      buildName: "",
      dataType: "automate",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: BrowserStackFormValues) => {
      const res = await apiRequest("POST", `/api/users/${userId}/integrations`, {
        name: values.name,
        type: "browserstack",
        config: {
          username: values.username,
          accessKey: values.accessKey,
          projectName: values.projectName || "",
          buildName: values.buildName || "",
          dataType: values.dataType,
        },
        active: true,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Integration added",
        description: "BrowserStack integration has been successfully added",
      });
      onSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding integration",
        description: error.message || "Failed to add integration",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: BrowserStackFormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            <DialogTitle>Add BrowserStack Integration</DialogTitle>
          </div>
          <DialogDescription>
            Connect BrowserStack to integrate cross-browser testing insights and analytics.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Integration Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My BrowserStack Integration" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name for this integration
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="browserstack_username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Access Key"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dataType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BrowserStack Product</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="automate">Automate</SelectItem>
                      <SelectItem value="app-automate">App Automate</SelectItem>
                      <SelectItem value="percy">Percy</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The BrowserStack product you want to integrate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buildName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Build Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Build name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}