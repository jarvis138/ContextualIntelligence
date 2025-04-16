import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Plus, RefreshCw } from "lucide-react";
import ConnectorDialog from "@/components/integrations/ConnectorDialog";
import ConnectorJobDialog from "@/components/integrations/ConnectorJobDialog";
import DataFeedTable from "@/components/integrations/DataFeedTable";

export interface Connector {
  id: number;
  type: string;
  name: string;
  icon: string;
  expiresAt?: string;
}

export interface ConnectorJob {
  jobId: string;
  userId: number;
  connectorType: string;
  dataType: string;
  parameters: Record<string, any>;
  scheduleType: string;
  scheduleValue?: string;
  priority: string;
  status: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastResult?: Record<string, any>;
  lastError?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FetchedData {
  dataId: string;
  userId: number;
  jobId?: string;
  connectorType: string;
  dataType: string;
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
  sourceUrl?: string;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  fetchedAt: string;
}

export default function ConnectorsPage() {
  const { toast } = useToast();
  const [isConnectorDialogOpen, setIsConnectorDialogOpen] = useState(false);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] = useState("");

  // Get connector types
  const { data: connectorTypes, isLoading: isLoadingTypes } = useQuery<{ types: Array<{ id: string; name: string; icon: string; description: string }> }>({
    queryKey: ["/api/connectors/types"],
  });

  // Get user's active connectors
  const { 
    data: connectorsData, 
    isLoading: isLoadingConnectors,
    refetch: refetchConnectors 
  } = useQuery<{ connectors: Connector[] }>({
    queryKey: ["/api/connectors"],
  });

  // Get user's jobs
  const { 
    data: jobsData, 
    isLoading: isLoadingJobs,
    refetch: refetchJobs 
  } = useQuery<{ jobs: ConnectorJob[] }>({
    queryKey: ["/api/connectors/jobs"],
  });

  // Get user's fetched data
  const { 
    data: fetchedData, 
    isLoading: isLoadingData,
    refetch: refetchData 
  } = useQuery<{ data: FetchedData[] }>({
    queryKey: ["/api/connectors/data"],
  });

  const handleConnectorDialogOpen = (connectorType: string) => {
    setSelectedConnectorType(connectorType);
    setIsConnectorDialogOpen(true);
  };

  const handleJobDialogOpen = (connectorType: string) => {
    setSelectedConnectorType(connectorType);
    setIsJobDialogOpen(true);
  };

  const handleConnectorSuccess = () => {
    toast({
      title: "Connector configured successfully",
      description: "Your connector has been set up and is ready to use.",
    });
    refetchConnectors();
  };

  const handleJobSuccess = () => {
    toast({
      title: "Data fetching job created",
      description: "Your data fetching job has been set up and scheduled.",
    });
    refetchJobs();
  };

  const refreshAll = () => {
    refetchConnectors();
    refetchJobs();
    refetchData();
    toast({
      title: "Refreshed",
      description: "All connector data has been refreshed.",
    });
  };

  // Get active connector types by id
  const activeConnectorTypes = connectorsData?.connectors.map(connector => connector.type) || [];

  return (
    <div className="container max-w-7xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Connectors</h1>
          <p className="text-muted-foreground mt-1">
            Connect to external data sources and manage your data integration jobs
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="connectors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connectors">Available Connectors</TabsTrigger>
          <TabsTrigger value="jobs">Data Fetching Jobs</TabsTrigger>
          <TabsTrigger value="data">Fetched Data</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingTypes ? (
              // Loading skeletons
              Array(4).fill(0).map((_, i) => (
                <Card key={i} className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full" />
                  </CardFooter>
                </Card>
              ))
            ) : (
              // Actual connector cards
              connectorTypes?.types.map((type) => {
                const isActive = activeConnectorTypes.includes(type.id);
                
                return (
                  <Card key={type.id} className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{type.name}</CardTitle>
                        {isActive && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Connected
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isActive ? (
                        <Alert variant="success" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-4 w-4" />
                          <AlertTitle>Connected</AlertTitle>
                          <AlertDescription>
                            This connector is configured and active.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Not Connected</AlertTitle>
                          <AlertDescription>
                            Click connect to set up this data source.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant={isActive ? "outline" : "default"}
                        onClick={() => handleConnectorDialogOpen(type.id)}
                      >
                        {isActive ? "Reconfigure" : "Connect"}
                      </Button>
                      
                      {isActive && (
                        <Button 
                          variant="outline" 
                          onClick={() => handleJobDialogOpen(type.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Job
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          {isLoadingJobs ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : jobsData?.jobs && jobsData.jobs.length > 0 ? (
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Group jobs by connector type */}
                {Object.entries(
                  jobsData.jobs.reduce<Record<string, ConnectorJob[]>>((acc, job) => {
                    if (!acc[job.connectorType]) {
                      acc[job.connectorType] = [];
                    }
                    acc[job.connectorType].push(job);
                    return acc;
                  }, {})
                ).map(([connectorType, jobs]) => {
                  const connectorName = connectorTypes?.types.find(t => t.id === connectorType)?.name || connectorType;
                  
                  return (
                    <Card key={connectorType}>
                      <CardHeader>
                        <CardTitle>{connectorName} Jobs</CardTitle>
                        <CardDescription>
                          Data fetching jobs for {connectorName} integration
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {jobs.map((job) => (
                            <div key={job.jobId} className="border rounded-lg p-4 shadow-sm">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">{job.dataType}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Schedule: {job.scheduleType === 'once' ? 'One time' : 
                                              job.scheduleType === 'interval' ? `Every ${job.scheduleValue} minutes` : 
                                              job.scheduleType}
                                  </p>
                                </div>
                                <Badge 
                                  variant={
                                    job.status === 'completed' ? 'success' :
                                    job.status === 'failed' ? 'destructive' :
                                    job.status === 'in_progress' ? 'default' :
                                    'outline'
                                  }
                                >
                                  {job.status === 'in_progress' ? 'Running' : 
                                   job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="mt-3 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-muted-foreground">Last run:</p>
                                    <p>{job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Next run:</p>
                                    <p>{job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : 'Not scheduled'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Run count:</p>
                                    <p>{job.runCount}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Created:</p>
                                    <p>{new Date(job.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                {job.lastError && (
                                  <Alert variant="destructive" className="mt-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{job.lastError}</AlertDescription>
                                  </Alert>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => handleJobDialogOpen(connectorType)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create New Job
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Jobs Found</CardTitle>
                <CardDescription>
                  You haven't created any data fetching jobs yet. Connect to a data source and create a job to start fetching data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <p className="text-center text-muted-foreground mb-6">
                    Create a job to fetch data from your connected sources
                  </p>
                  {connectorTypes?.types.map((type) => {
                    if (activeConnectorTypes.includes(type.id)) {
                      return (
                        <Button 
                          key={type.id}
                          className="mb-2"
                          onClick={() => handleJobDialogOpen(type.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create {type.name} Job
                        </Button>
                      );
                    }
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="data">
          {isLoadingData ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : fetchedData?.data && fetchedData.data.length > 0 ? (
            <DataFeedTable data={fetchedData.data} connectorTypes={connectorTypes?.types || []} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Data Found</CardTitle>
                <CardDescription>
                  You haven't fetched any data yet. Create a data fetching job to start collecting data from your connected sources.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <p className="text-center text-muted-foreground">
                    No data has been fetched yet
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog for connecting to a source */}
      <ConnectorDialog 
        open={isConnectorDialogOpen}
        onOpenChange={setIsConnectorDialogOpen}
        connectorType={selectedConnectorType}
        connectorTypes={connectorTypes?.types || []}
        onSuccess={handleConnectorSuccess}
      />

      {/* Dialog for creating a data fetching job */}
      <ConnectorJobDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        connectorType={selectedConnectorType}
        connectorTypes={connectorTypes?.types || []}
        onSuccess={handleJobSuccess}
      />
    </div>
  );
}