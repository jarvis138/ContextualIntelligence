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
import { GitFork, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface BitbucketIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

const bitbucketFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  appPassword: z.string().min(1, "App password is required"),
  workspace: z.string().min(1, "Workspace is required"),
  repository: z.string().min(1, "Repository is required"),
  includePullRequests: z.boolean().default(true),
  includeCommits: z.boolean().default(true),
  includePipelines: z.boolean().default(true),
});

type BitbucketFormValues = z.infer<typeof bitbucketFormSchema>;

export function BitbucketIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess,
}: BitbucketIntegrationDialogProps) {
  const { toast } = useToast();

  const form = useForm<BitbucketFormValues>({
    resolver: zodResolver(bitbucketFormSchema),
    defaultValues: {
      name: "Bitbucket Integration",
      username: "",
      appPassword: "",
      workspace: "",
      repository: "",
      includePullRequests: true,
      includeCommits: true,
      includePipelines: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: BitbucketFormValues) => {
      const res = await apiRequest("POST", `/api/users/${userId}/integrations`, {
        name: values.name,
        type: "bitbucket",
        config: {
          username: values.username,
          appPassword: values.appPassword,
          workspace: values.workspace,
          repository: values.repository,
          includePullRequests: values.includePullRequests,
          includeCommits: values.includeCommits,
          includePipelines: values.includePipelines,
        },
        active: true,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Integration added",
        description: "Bitbucket integration has been successfully added",
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

  function onSubmit(values: BitbucketFormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <GitFork className="h-6 w-6" />
            <DialogTitle>Add Bitbucket Integration</DialogTitle>
          </div>
          <DialogDescription>
            Connect your Bitbucket repositories to track code activity and CI/CD pipelines.
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
                    <Input placeholder="My Bitbucket Integration" {...field} />
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
                      <Input placeholder="bitbucket_username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="App Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workspace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace</FormLabel>
                    <FormControl>
                      <Input placeholder="workspace-slug" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Bitbucket workspace slug
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="repository"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository</FormLabel>
                    <FormControl>
                      <Input placeholder="repo-name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Repository name in the workspace
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <FormField
                control={form.control}
                name="includePullRequests"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Pull Requests</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="includeCommits"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Commits</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="includePipelines"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Pipelines</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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