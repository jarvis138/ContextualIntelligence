import React, { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, GitMerge, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface GitHubIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

const gitHubFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  accessToken: z.string().min(1, "Personal access token is required"),
  repository: z.string().min(1, "Repository is required"),
  owner: z.string().min(1, "Owner is required"),
  includeIssues: z.boolean().default(true),
  includePullRequests: z.boolean().default(true),
  includeCommits: z.boolean().default(true),
  type: z.enum(["github", "gitlab"]),
});

type GitHubFormValues = z.infer<typeof gitHubFormSchema>;

export function GitHubIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess,
}: GitHubIntegrationDialogProps) {
  const { toast } = useToast();
  const [serviceType, setServiceType] = useState<"github" | "gitlab">("github");

  const form = useForm<GitHubFormValues>({
    resolver: zodResolver(gitHubFormSchema),
    defaultValues: {
      name: "",
      accessToken: "",
      repository: "",
      owner: "",
      includeIssues: true,
      includePullRequests: true,
      includeCommits: true,
      type: "github",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: GitHubFormValues) => {
      const res = await apiRequest("POST", `/api/users/${userId}/integrations`, {
        name: values.name,
        type: values.type,
        config: {
          accessToken: values.accessToken,
          repository: values.repository,
          owner: values.owner,
          includeIssues: values.includeIssues,
          includePullRequests: values.includePullRequests,
          includeCommits: values.includeCommits,
        },
        active: true,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Integration added",
        description: `${serviceType === "github" ? "GitHub" : "GitLab"} integration has been successfully added`,
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

  function onSubmit(values: GitHubFormValues) {
    values.type = serviceType;
    mutation.mutate(values);
  }

  function handleTabChange(value: string) {
    setServiceType(value as "github" | "gitlab");
    form.setValue("type", value as "github" | "gitlab");
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Git Repository Integration</DialogTitle>
          <DialogDescription>
            Connect your code repositories to track activity and gain insights.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="github" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="github">
              <Github className="mr-2 h-4 w-4" /> GitHub
            </TabsTrigger>
            <TabsTrigger value="gitlab">
              <GitMerge className="mr-2 h-4 w-4" /> GitLab
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <TabsContent value="github">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Integration Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My GitHub Integration" {...field} />
                      </FormControl>
                      <FormDescription>
                        A friendly name for this integration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Access Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="ghp_xxxxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormDescription>
                        Create a token with 'repo' scope from GitHub Settings &gt; Developer Settings
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner/Organization</FormLabel>
                        <FormControl>
                          <Input placeholder="octocat" {...field} />
                        </FormControl>
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
                          <Input placeholder="my-project" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="includeIssues"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Issues</FormLabel>
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
                </div>
              </TabsContent>

              <TabsContent value="gitlab">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Integration Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My GitLab Integration" {...field} />
                      </FormControl>
                      <FormDescription>
                        A friendly name for this integration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Access Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="glpat-xxxxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormDescription>
                        Create a token with 'read_api' scope from GitLab Settings &gt; Access Tokens
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group/Namespace</FormLabel>
                        <FormControl>
                          <Input placeholder="mygroup" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repository"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <FormControl>
                          <Input placeholder="my-project" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="includeIssues"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Issues</FormLabel>
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
                    name="includePullRequests"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Merge Requests</FormLabel>
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
                </div>
              </TabsContent>

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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}