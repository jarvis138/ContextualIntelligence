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
import { Trello, ListChecks, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface JiraIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

const jiraFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["jira", "trello"]),
  apiKey: z.string().min(1, "API key is required"),
  apiToken: z.string().min(1, "API token is required"),
  domain: z.string().min(1, "Domain is required"),
  projectKey: z.string().optional(),
});

type JiraFormValues = z.infer<typeof jiraFormSchema>;

export function JiraIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess,
}: JiraIntegrationDialogProps) {
  const { toast } = useToast();
  const [serviceType, setServiceType] = useState<"jira" | "trello">("jira");

  const form = useForm<JiraFormValues>({
    resolver: zodResolver(jiraFormSchema),
    defaultValues: {
      name: "",
      type: "jira",
      apiKey: "",
      apiToken: "",
      domain: "",
      projectKey: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: JiraFormValues) => {
      const res = await apiRequest("POST", `/api/users/${userId}/integrations`, {
        name: values.name,
        type: values.type,
        config: {
          apiKey: values.apiKey,
          apiToken: values.apiToken,
          domain: values.domain,
          projectKey: values.projectKey || "",
        },
        active: true,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Integration added",
        description: `${serviceType === "jira" ? "Jira" : "Trello"} integration has been successfully added`,
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

  function onSubmit(values: JiraFormValues) {
    values.type = serviceType;
    mutation.mutate(values);
  }

  function handleTabChange(value: string) {
    setServiceType(value as "jira" | "trello");
    form.setValue("type", value as "jira" | "trello");
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Project Management Integration</DialogTitle>
          <DialogDescription>
            Connect your project management tools to sync tasks and track progress.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="jira" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jira">
              <ListChecks className="mr-2 h-4 w-4" /> Jira
            </TabsTrigger>
            <TabsTrigger value="trello">
              <Trello className="mr-2 h-4 w-4" /> Trello
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <TabsContent value="jira">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Integration Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Jira Integration" {...field} />
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
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jira Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="mycompany.atlassian.net" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your Jira instance domain (without https://)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="user@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Token</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="API Token" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="projectKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Key (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="MYPROJECT" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave empty to access all projects you have permission to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="trello">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Integration Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Trello Integration" {...field} />
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
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Trello API Key" {...field} />
                      </FormControl>
                      <FormDescription>
                        Get your API key from your Trello account settings
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Trello API Token" {...field} />
                      </FormControl>
                      <FormDescription>
                        Generate a token using your API key
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board ID</FormLabel>
                      <FormControl>
                        <Input placeholder="trello-board-id" {...field} />
                      </FormControl>
                      <FormDescription>
                        The ID of the Trello board you want to connect
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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