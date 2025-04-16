import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw, Calendar, Trash } from "lucide-react";
import { ConnectorDialog } from "@/components/integrations/ConnectorDialog";
import { ConnectorJobDialog } from "@/components/integrations/ConnectorJobDialog";
import { DataFeedTable } from "@/components/integrations/DataFeedTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatDistanceToNow } from "date-fns";
import { SiSlack, SiGoogle } from "react-icons/si";
import { BsMicrosoft } from "react-icons/bs";

// Types for connectors, jobs, and data
export interface ApiToken {
  tokenId: string;
  connectorType: string;
  userId: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface FetchingJob {
  jobId: string;
  connectorType: string;
  dataType: string;
  scheduleType: string;
  scheduleValue: string | null;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  parameters: Record<string, any>;
}

export interface FetchedData {
  dataId: string;
  connectorType: string;
  dataType: string;
  sourceId: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, any>;
  fetchedAt: string;
  jobId: string | null;
}

// Helper function to get connector icon
const getConnectorIcon = (type: string) => {
  switch (type) {
    case "slack":
      return <SiSlack className="h-5 w-5 text-[#4A154B]" />;
    case "google_drive":
    case "gmail":
      return <SiGoogle className="h-5 w-5 text-[#4285F4]" />;
    case "microsoft_graph":
      return <BsMicrosoft className="h-5 w-5 text-[#0078D4]" />;
    default:
      return null;
  }
};

// Helper function to get connector name
const getConnectorName = (type: string) => {
  switch (type) {
    case "slack":
      return "Slack";
    case "google_drive":
      return "Google Drive";
    case "gmail":
      return "Gmail";
    case "microsoft_graph":
      return "Microsoft Graph";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  }
};

// Helper function to get job status color
const getJobStatusColor = (status: string) => {
  switch (status) {
    case "queued":
      return "bg-blue-100 text-blue-800";
    case "running":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function ConnectorsPage() {
  const { toast } = useToast();
  const [showConnectorDialog, setShowConnectorDialog] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<ApiToken | null>(null);
  const [activeTab, setActiveTab] = useState("connectors");

  // Query to fetch connectors (API tokens)
  const {
    data: connectors,
    isLoading: isLoadingConnectors,
    refetch: refetchConnectors,
  } = useQuery<ApiToken[]>({
    queryKey: ["/api/connectors/tokens"],
  });

  // Query to fetch fetching jobs
  const {
    data: jobs,
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
  } = useQuery<FetchingJob[]>({
    queryKey: ["/api/connectors/jobs"],
  });

  // Query to fetch data
  const {
    data: fetchedData,
    isLoading: isLoadingData,
    refetch: refetchData,
  } = useQuery<FetchedData[]>({
    queryKey: ["/api/connectors/data"],
  });

  // Handle add connector click
  const handleAddConnector = () => {
    setShowConnectorDialog(true);
  };

  // Handle add job click for specific connector
  const handleAddJob = (connector: ApiToken) => {
    setSelectedConnector(connector);
    setShowJobDialog(true);
  };

  // Handle refresh data
  const handleRefreshData = () => {
    refetchConnectors();
    refetchJobs();
    refetchData();
    toast({
      title: "Refreshed",
      description: "Data has been refreshed",
      variant: "default",
    });
  };

  // Render connector cards
  const renderConnectorCards = () => {
    if (isLoadingConnectors) {
      return (
        <div className="flex justify-center items-center h-32">
          <Spinner size="lg" />
        </div>
      );
    }

    if (!connectors || connectors.length === 0) {
      return (
        <div className="text-center p-6 border rounded-md">
          <p className="text-muted-foreground">No connectors configured yet.</p>
          <p className="text-muted-foreground mt-1">Click "Add Connector" to get started.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((connector) => (
          <Card key={connector.tokenId}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getConnectorIcon(connector.connectorType)}
                  <CardTitle className="text-lg">{connector.name || getConnectorName(connector.connectorType)}</CardTitle>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <CardDescription>
                Connected {formatDistanceToNow(new Date(connector.createdAt), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-sm">
                <p className="text-muted-foreground">
                  {connector.lastUsedAt 
                    ? `Last used ${formatDistanceToNow(new Date(connector.lastUsedAt), { addSuffix: true })}` 
                    : "Not used yet"}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleAddJob(connector)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Create Fetching Job
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  // Render jobs table
  const renderJobsTable = () => {
    if (isLoadingJobs) {
      return (
        <div className="flex justify-center items-center h-32">
          <Spinner size="lg" />
        </div>
      );
    }

    if (!jobs || jobs.length === 0) {
      return (
        <div className="text-center p-6 border rounded-md">
          <p className="text-muted-foreground">No fetching jobs created yet.</p>
          <p className="text-muted-foreground mt-1">Create a connector first, then add fetching jobs.</p>
        </div>
      );
    }

    return (
      <div className="border rounded-md">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-muted/50">
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Connector
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Data Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Schedule
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Run
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Next Run
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {jobs.map((job) => (
              <tr key={job.jobId}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getConnectorIcon(job.connectorType)}
                    <div className="ml-2">{getConnectorName(job.connectorType)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{job.dataType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    {job.scheduleType === "once" 
                      ? "One-time" 
                      : job.scheduleType === "interval" 
                        ? `Every ${job.scheduleValue} minutes` 
                        : "Custom schedule"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getJobStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {job.lastRunAt 
                    ? formatDistanceToNow(new Date(job.lastRunAt), { addSuffix: true }) 
                    : "Never"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {job.nextRunAt 
                    ? formatDistanceToNow(new Date(job.nextRunAt), { addSuffix: true }) 
                    : "Not scheduled"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <span className="sr-only">Open menu</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Trash className="h-4 w-4 mr-2" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6" data-tour="connectors-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Data Connectors</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAddConnector} data-tour="add-connector">
            <Plus className="h-4 w-4 mr-2" />
            Add Connector
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="jobs">Fetching Jobs</TabsTrigger>
          <TabsTrigger value="data">Fetched Data</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-4" data-tour="connector-list">
          {renderConnectorCards()}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4" data-tour="connector-jobs">
          {renderJobsTable()}
        </TabsContent>

        <TabsContent value="data" className="space-y-4" data-tour="data-feeds">
          <DataFeedTable data={fetchedData || []} isLoading={isLoadingData} />
        </TabsContent>
      </Tabs>

      {/* Connector Dialog */}
      <ConnectorDialog
        open={showConnectorDialog}
        onOpenChange={setShowConnectorDialog}
        onSuccess={() => {
          refetchConnectors();
          toast({ 
            title: "Connector added",
            description: "The connector was successfully added",
            variant: "default",
          });
        }}
      />

      {/* Job Dialog */}
      {selectedConnector && (
        <ConnectorJobDialog
          open={showJobDialog}
          onOpenChange={setShowJobDialog}
          connectorType={selectedConnector.connectorType}
          connectorName={selectedConnector.name || getConnectorName(selectedConnector.connectorType)}
          onSuccess={() => {
            refetchJobs();
            setActiveTab("jobs");
          }}
        />
      )}
    </div>
  );
}