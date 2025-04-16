import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { RelationshipGraph } from "@/components/visualizations/RelationshipGraph";
import { TeamProgressChart } from "@/components/dashboard/TeamProgressChart";
import { ProjectProgressChart } from "@/components/dashboard/ProjectProgressChart";
import { 
  Activity, 
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  BarChart3,
  Filter,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  
  // Fetch team data
  const { 
    data: teamsData, 
    isLoading: isTeamsLoading,
    refetch: refetchTeams
  } = useQuery({
    queryKey: ['/api/analytics/teams', { timeRange }],
  });

  // Fetch activities data
  const { 
    data: activitiesData, 
    isLoading: isActivitiesLoading,
    refetch: refetchActivities
  } = useQuery({
    queryKey: ['/api/analytics/activities', { timeRange }],
  });

  // Fetch project metrics
  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['/api/analytics/metrics', { timeRange }],
  });

  // Fetch anomaly alerts
  const {
    data: anomalyAlerts,
    isLoading: isAnomalyLoading,
    refetch: refetchAnomalies
  } = useQuery({
    queryKey: ['/api/analytics/anomalies', { timeRange }],
  });
  
  // Fetch trend data for project completion
  const {
    data: trendData,
    isLoading: isTrendLoading
  } = useQuery({
    queryKey: ['/api/analytics/trends', { metric: 'project-completion', timeRange }],
  });
  
  // Fetch predictions
  const {
    data: predictionsData,
    isLoading: isPredictionsLoading
  } = useQuery({
    queryKey: ['/api/analytics/predict-metrics', { metrics: ['completion-rate', 'document-processing'], timeRange }],
  });

  const handleRefresh = async () => {
    toast({
      title: "Refreshing analytics data",
      description: "Fetching the latest metrics and insights...",
    });
    
    try {
      // Refresh all data sources
      await Promise.all([
        refetchTeams(),
        refetchActivities(),
        refetchMetrics(),
        refetchAnomalies()
      ]);
      
      toast({
        title: "Data refreshed",
        description: "Analytics data has been updated with the latest information.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing the analytics data. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDownloadReport = async () => {
    toast({
      title: "Downloading report",
      description: "Preparing analytics report for download...",
    });
    
    try {
      // Generate a comprehensive report via API
      const response = await fetch('/api/analytics/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'comprehensive',
          timeRange,
          format: 'pdf',
          options: {
            includeCharts: true,
            includeRawData: true
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const result = await response.json();
      
      // If download URL is available, open it
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
        toast({
          title: "Report ready",
          description: "Your analytics report has been generated and will download shortly.",
        });
      } else {
        throw new Error('No download URL provided');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Download failed",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const getSeverityBadge = (severity: string) => {
    switch(severity) {
      case 'high':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">High</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Medium</span>;
      case 'low':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Low</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{severity}</span>;
    }
  };

  const isLoading = isTeamsLoading || isActivitiesLoading || isMetricsLoading || isAnomalyLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Select defaultValue={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="year">Last 12 months</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[500px]">
          <Spinner size="lg" />
        </div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
            <TabsTrigger value="predictions">Predictive Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart className="h-5 w-5 text-muted-foreground mr-2" />
                      <div className="text-2xl font-bold">{metricsData?.activeProjects || 0}</div>
                    </div>
                    <div className="text-sm flex items-center text-green-600">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {metricsData?.projectsGrowth > 0 ? "+" : ""}{metricsData?.projectsGrowth || 0}%
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {metricsData?.totalProjects || 0} total projects
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Document Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-muted-foreground mr-2" />
                      <div className="text-2xl font-bold">{metricsData?.totalDocuments || 0}</div>
                    </div>
                    <div className="text-sm flex items-center text-green-600">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {metricsData?.documentsGrowth > 0 ? "+" : ""}{metricsData?.documentsGrowth || 0}%
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {metricsData?.processedDocuments || 0} processed this period
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-muted-foreground mr-2" />
                      <div className="text-2xl font-bold">{metricsData?.activeUsers || 0}</div>
                    </div>
                    <div className={`text-sm flex items-center ${metricsData?.usersGrowth > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {metricsData?.usersGrowth > 0 ? (
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                      )}
                      {metricsData?.usersGrowth > 0 ? "+" : ""}{metricsData?.usersGrowth || 0}%
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {metricsData?.newUsers || 0} new this period
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 text-muted-foreground mr-2" />
                    <div className="text-2xl font-bold">{metricsData?.completionRate || 0}%</div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${metricsData?.completionRate || 0}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Activity & Teams Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activitiesData && (
                <ProjectProgressChart activities={activitiesData} />
              )}
              
              {teamsData && (
                <TeamProgressChart teams={teamsData} />
              )}
            </div>

            {/* Anomaly Alerts Summary */}
            {anomalyAlerts && anomalyAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Anomalies</CardTitle>
                  <CardDescription>Detected anomalies requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {anomalyAlerts.slice(0, 3).map(alert => (
                      <div key={alert.id} className="flex items-start space-x-4 pb-4 border-b last:border-0 last:pb-0">
                        <div className="mt-0.5">
                          <AlertTriangle className={`h-5 w-5 ${
                            alert.severity === 'high' ? 'text-red-500' : 
                            alert.severity === 'medium' ? 'text-amber-500' : 
                            'text-blue-500'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{alert.type}</div>
                            {getSeverityBadge(alert.severity)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">{alert.description}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Detected {alert.timeDetected}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">View All Anomalies</Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="relationships">
            <RelationshipGraph 
              width={1000}
              height={600}
            />
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            {activitiesData && (
              <div className="grid grid-cols-1 gap-4">
                <ProjectProgressChart activities={activitiesData} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            {teamsData && (
              <div className="grid grid-cols-1 gap-4">
                <TeamProgressChart teams={teamsData} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4">
            {anomalyAlerts && anomalyAlerts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Anomaly Detection</CardTitle>
                    <CardDescription>AI-detected anomalies requiring attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {anomalyAlerts.map(alert => (
                        <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-md">
                          <div className="mt-0.5">
                            <AlertTriangle className={`h-5 w-5 ${
                              alert.severity === 'high' ? 'text-red-500' : 
                              alert.severity === 'medium' ? 'text-amber-500' : 
                              'text-blue-500'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{alert.type}</div>
                              {getSeverityBadge(alert.severity)}
                            </div>
                            <div className="text-sm mt-1">{alert.description}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Detected {alert.timeDetected}
                            </div>
                            <div className="mt-2">
                              <Button variant="outline" size="sm">Investigate</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-medium">No Anomalies Detected</h3>
                  <p className="text-muted-foreground mt-2">All systems are operating within normal parameters</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Predictive Insights</CardTitle>
                <CardDescription>AI-powered predictions based on project trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border rounded-md p-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <h3 className="font-medium">Project Completion Forecast</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Based on current velocity, the project is predicted to complete 
                      <span className="font-medium text-green-600"> 2 weeks ahead</span> of schedule.
                    </p>
                  </div>

                  <div className="border rounded-md p-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-5 w-5 text-amber-500" />
                      <h3 className="font-medium">Resource Utilization Alert</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Team Alpha is predicted to experience resource constraints in the next sprint.
                      Consider reallocating 2 engineers from Team Beta.
                    </p>
                  </div>

                  <div className="border rounded-md p-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      <h3 className="font-medium">Budget Projection</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current spending patterns indicate the project will be
                      <span className="font-medium text-blue-600"> 8% under budget</span> at completion.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Detailed Predictions
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}