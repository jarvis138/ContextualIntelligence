import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Integration } from "@shared/schema";
import { SlackIntegrationDialog } from "./SlackIntegrationDialog";
import { OpenAIIntegrationDialog } from "./OpenAIIntegrationDialog";
import { GitHubIntegrationDialog } from "./GitHubIntegrationDialog";
import { JiraIntegrationDialog } from "./JiraIntegrationDialog";
import { BitbucketIntegrationDialog } from "./BitbucketIntegrationDialog";
import { BrowserStackIntegrationDialog } from "./BrowserStackIntegrationDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  RefreshCcw, 
  Slack, 
  Github, 
  GitBranch,
  GitFork,
  MessageSquare, 
  X, 
  Sparkles, 
  Layout,
  LayoutGrid
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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

interface IntegrationsPanelProps {
  userId: number;
}

export function IntegrationsPanel({ userId }: IntegrationsPanelProps) {
  const [slackDialogOpen, setSlackDialogOpen] = useState(false);
  const [openAIDialogOpen, setOpenAIDialogOpen] = useState(false);
  const [gitHubDialogOpen, setGitHubDialogOpen] = useState(false);
  const [jiraDialogOpen, setJiraDialogOpen] = useState(false);
  const [bitbucketDialogOpen, setBitbucketDialogOpen] = useState(false);
  const [browserStackDialogOpen, setBrowserStackDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user integrations
  const { data: integrations, isLoading, error } = useQuery({
    queryKey: [`/api/users/${userId}/integrations`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${userId}/integrations`);
      const data = await res.json();
      return data as Integration[];
    },
  });

  // Delete integration mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/integrations/${id}`);
      return res.status === 204;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/integrations`] });
      toast({
        title: "Integration removed",
        description: "The integration has been successfully removed",
      });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove the integration",
        variant: "destructive",
      });
    },
  });

  // Function to get integration icon
  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case "slack":
        return <Slack className="h-6 w-6" />;
      case "openai":
        return <Sparkles className="h-6 w-6 text-violet-500" />;
      case "github":
      case "gitlab":
        return <Github className="h-6 w-6" />;
      case "jira":
      case "trello":
        return <MessageSquare className="h-6 w-6" />;
      case "bitbucket":
        return <GitFork className="h-6 w-6" />;
      case "browserstack":
        return <LayoutGrid className="h-6 w-6" />;
      default:
        return <MessageSquare className="h-6 w-6" />;
    }
  };

  // Function to handle delete confirmation
  const confirmDelete = (integration: Integration) => {
    setSelectedIntegration(integration);
    setDeleteDialogOpen(true);
  };

  // Function to handle deleting an integration
  const handleDelete = () => {
    if (selectedIntegration) {
      deleteMutation.mutate(selectedIntegration.id);
    }
  };

  const handleIntegrationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/integrations`] });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Integrations</CardTitle>
          <CardDescription>
            Connect external services to enhance your project intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="available" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="connected">
                Connected{" "}
                {integrations && integrations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {integrations.filter(i => i.active).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="available" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Slack Integration Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Slack className="h-6 w-6" />
                      <Badge variant="outline" className="text-xs">
                        Real-time Communication
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">Slack</CardTitle>
                    <CardDescription>
                      Connect your Slack workspace to share project updates and insights.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      onClick={() => setSlackDialogOpen(true)}
                      className="w-full"
                      variant="outline"
                    >
                      Connect
                    </Button>
                  </CardFooter>
                </Card>

                {/* OpenAI Integration Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Sparkles className="h-6 w-6 text-violet-500" />
                      <Badge variant="outline" className="text-xs">
                        AI Processing
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">OpenAI</CardTitle>
                    <CardDescription>
                      Enable AI-powered features like document summarization and insights.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      onClick={() => setOpenAIDialogOpen(true)}
                      className="w-full"
                      variant="outline"
                    >
                      Connect
                    </Button>
                  </CardFooter>
                </Card>

                {/* GitHub Integration Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Github className="h-6 w-6" />
                      <Badge variant="outline" className="text-xs">
                        Code Repository
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">GitHub / GitLab</CardTitle>
                    <CardDescription>
                      Connect your repositories to track code activity, issues, and commits.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setGitHubDialogOpen(true)}
                    >
                      Connect
                    </Button>
                  </CardFooter>
                </Card>

                {/* Jira Integration Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <MessageSquare className="h-6 w-6" />
                      <Badge variant="outline" className="text-xs">
                        Project Management
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">Jira / Trello</CardTitle>
                    <CardDescription>
                      Connect project management tools to sync tasks and track progress.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setJiraDialogOpen(true)}
                    >
                      Connect
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Bitbucket Integration Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <GitFork className="h-6 w-6" />
                      <Badge variant="outline" className="text-xs">
                        Version Control
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">Bitbucket</CardTitle>
                    <CardDescription>
                      Connect Bitbucket to track repositories, pull requests, and pipelines.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setBitbucketDialogOpen(true)}
                    >
                      Connect
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* BrowserStack Integration Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <LayoutGrid className="h-6 w-6" />
                      <Badge variant="outline" className="text-xs">
                        Testing Platform
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">BrowserStack</CardTitle>
                    <CardDescription>
                      Connect BrowserStack to integrate cross-browser testing insights.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setBrowserStackDialogOpen(true)}
                    >
                      Connect
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="connected" className="pt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-muted-foreground">
                  Failed to load integrations. Please try again.
                </div>
              ) : integrations && integrations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {integrations.map((integration) => (
                    <Card key={integration.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          {getIntegrationIcon(integration.type)}
                          <Badge
                            variant={integration.active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {integration.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">{integration.name}</CardTitle>
                        <CardDescription>
                          {integration.type === "slack"
                            ? `Connected to channel: ${(integration.config as any)?.channelId || "Unknown"}`
                            : `Connected ${integration.type} integration`}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="flex justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => confirmDelete(integration)}
                        >
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // Reopen the appropriate dialog based on integration type
                            switch (integration.type) {
                              case "slack":
                                setSlackDialogOpen(true);
                                break;
                              case "openai":
                                setOpenAIDialogOpen(true);
                                break;
                              case "github":
                              case "gitlab":
                                setGitHubDialogOpen(true);
                                break;
                              case "jira":
                              case "trello":
                                setJiraDialogOpen(true);
                                break;
                              case "bitbucket":
                                setBitbucketDialogOpen(true);
                                break;
                              case "browserstack":
                                setBrowserStackDialogOpen(true);
                                break;
                              default:
                                toast({
                                  title: "Update not available",
                                  description: `Updates for ${integration.type} integrations are not supported yet`,
                                  variant: "default",
                                });
                            }
                          }}
                        >
                          <RefreshCcw className="h-4 w-4 mr-1" /> Update
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No connected integrations. Connect some from the Available tab.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Slack Integration Dialog */}
      <SlackIntegrationDialog
        isOpen={slackDialogOpen}
        onClose={() => setSlackDialogOpen(false)}
        userId={userId}
        onSuccess={handleIntegrationSuccess}
      />
      
      {/* OpenAI Integration Dialog */}
      <OpenAIIntegrationDialog
        open={openAIDialogOpen}
        onOpenChange={setOpenAIDialogOpen}
        userId={userId}
      />
      
      {/* GitHub/GitLab Integration Dialog */}
      <GitHubIntegrationDialog
        isOpen={gitHubDialogOpen}
        onClose={() => setGitHubDialogOpen(false)}
        userId={userId}
        onSuccess={handleIntegrationSuccess}
      />
      
      {/* Jira/Trello Integration Dialog */}
      <JiraIntegrationDialog
        isOpen={jiraDialogOpen}
        onClose={() => setJiraDialogOpen(false)}
        userId={userId}
        onSuccess={handleIntegrationSuccess}
      />
      
      {/* Bitbucket Integration Dialog */}
      <BitbucketIntegrationDialog
        isOpen={bitbucketDialogOpen}
        onClose={() => setBitbucketDialogOpen(false)}
        userId={userId}
        onSuccess={handleIntegrationSuccess}
      />
      
      {/* BrowserStack Integration Dialog */}
      <BrowserStackIntegrationDialog
        isOpen={browserStackDialogOpen}
        onClose={() => setBrowserStackDialogOpen(false)}
        userId={userId}
        onSuccess={handleIntegrationSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the {selectedIntegration?.name} integration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}