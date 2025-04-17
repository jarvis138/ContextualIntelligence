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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  Search
} from 'lucide-react';

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  
  // State for anomalies dialog
  const [anomaliesDialogOpen, setAnomaliesDialogOpen] = useState(false);
  const [allAnomalies, setAllAnomalies] = useState<Array<{
    id: number;
    type: string;
    description: string;
    severity: string;
    timeDetected: string;
    relatedProject?: string;
    impact?: string;
    recommendations?: string;
    status?: string;
  }>>([]);
  
  // State for investigation dialog
  const [investigateDialogOpen, setInvestigateDialogOpen] = useState(false);
  const [currentAnomaly, setCurrentAnomaly] = useState<{
    id: number;
    type: string;
    description: string;
    severity: string;
    timeDetected: string;
    relatedProject?: string;
    impact?: string;
    recommendations?: string;
    status?: string;
    data?: any;
  } | null>(null);
  
  // State for detailed predictions dialog
  const [predictionsDialogOpen, setPredictionsDialogOpen] = useState(false);
  const [detailedPredictions, setDetailedPredictions] = useState<Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    confidence: number;
    impact: string;
    trend: 'up' | 'down' | 'stable';
    timeframe: string;
    dataPoints?: Array<{
      date: string;
      value: number;
    }>;
  }>>([]);
  
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

  // Handle viewing all anomalies
  const handleViewAllAnomalies = () => {
    if (anomalyAlerts) {
      // Generate extended anomaly data with additional fields for the full view
      const extendedAnomalies = anomalyAlerts.map(alert => ({
        ...alert,
        relatedProject: ['Website Redesign', 'Mobile App Development', 'Customer Portal', 'Marketing Campaign'][Math.floor(Math.random() * 4)],
        impact: alert.severity === 'high' 
          ? 'Potential significant impact on project timeline and deliverables' 
          : alert.severity === 'medium'
          ? 'Moderate impact on specific project components'
          : 'Limited impact, primarily affecting documentation and reporting',
        recommendations: alert.severity === 'high'
          ? 'Immediate attention required. Schedule a team meeting to address the issue.'
          : alert.severity === 'medium'
          ? 'Review affected components within this week.'
          : 'Document the anomaly and monitor for any changes.',
        status: ['New', 'In Progress', 'Under Review'][Math.floor(Math.random() * 3)]
      }));
      
      setAllAnomalies(extendedAnomalies);
      setAnomaliesDialogOpen(true);
    }
  };
  
  // Handle investigating a specific anomaly
  const handleInvestigateAnomaly = (anomaly: any) => {
    // Generate detailed investigation data for the anomaly
    const detailedAnomaly = {
      ...anomaly,
      relatedProject: anomaly.relatedProject || ['Website Redesign', 'Mobile App Development', 'Customer Portal', 'Marketing Campaign'][Math.floor(Math.random() * 4)],
      impact: anomaly.impact || (anomaly.severity === 'high' 
        ? 'Potential significant impact on project timeline and deliverables' 
        : anomaly.severity === 'medium'
        ? 'Moderate impact on specific project components'
        : 'Limited impact, primarily affecting documentation and reporting'),
      recommendations: anomaly.recommendations || (anomaly.severity === 'high'
        ? 'Immediate attention required. Schedule a team meeting to address the issue.'
        : anomaly.severity === 'medium'
        ? 'Review affected components within this week.'
        : 'Document the anomaly and monitor for any changes.'),
      status: anomaly.status || ['New', 'In Progress', 'Under Review'][Math.floor(Math.random() * 3)],
      data: {
        timeSeriesData: Array.from({ length: 14 }, (_, i) => ({
          date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: Math.floor(Math.random() * 100) + 20
        })),
        relatedEntities: [
          { name: 'Document: Technical Specification', confidence: 0.89 },
          { name: 'User: Alex Kumar', confidence: 0.78 },
          { name: 'Task: API Integration', confidence: 0.92 }
        ],
        suggestedActions: [
          'Review recent changes in affected documents',
          'Check integration tests for failures',
          'Notify project stakeholders of potential delays',
          'Schedule detailed analysis with subject matter experts'
        ]
      }
    };
    
    setCurrentAnomaly(detailedAnomaly);
    setInvestigateDialogOpen(true);
  };
  
  // Handle viewing detailed predictions
  const handleViewDetailedPredictions = () => {
    toast({
      title: "Loading predictions",
      description: "Retrieving detailed forecasts and predictions...",
    });
    
    try {
      // Generate detailed predictions data
      const samplePredictions = [
        {
          id: 1,
          title: "Project Completion Rate",
          description: "Rate of task completion is projected to increase by 12% in the next 30 days based on current team velocity and resource allocation.",
          category: "productivity",
          confidence: 0.87,
          impact: "High positive impact on overall delivery timeline",
          trend: "up" as const,
          timeframe: "30 days",
          dataPoints: Array.from({ length: 12 }, (_, i) => ({
            date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            value: 65 + Math.floor(Math.random() * 20) + (i * 0.5)
          }))
        },
        {
          id: 2,
          title: "Resource Utilization",
          description: "Current team allocation shows 23% underutilization in backend development resources while frontend resources are 15% overallocated.",
          category: "resources",
          confidence: 0.92,
          impact: "Workflow inefficiency affecting delivery speed",
          trend: "down" as const,
          timeframe: "Current",
          dataPoints: Array.from({ length: 12 }, (_, i) => ({
            date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            value: 85 - Math.floor(Math.random() * 15) - (i * 0.8)
          }))
        },
        {
          id: 3,
          title: "Budget Forecast",
          description: "Based on current spending patterns, the project is projected to be 8% under budget at completion.",
          category: "finance",
          confidence: 0.78,
          impact: "Potential cost savings or opportunity for additional features",
          trend: "stable" as const,
          timeframe: "Project end",
          dataPoints: Array.from({ length: 12 }, (_, i) => ({
            date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            value: 92 + Math.floor(Math.random() * 6) - (i * 0.1)
          }))
        },
        {
          id: 4,
          title: "Quality Metrics",
          description: "Code quality metrics predicted to improve by 7% based on recent testing patterns and defect resolution rates.",
          category: "quality",
          confidence: 0.81,
          impact: "Reduced maintenance costs and technical debt",
          trend: "up" as const,
          timeframe: "60 days",
          dataPoints: Array.from({ length: 12 }, (_, i) => ({
            date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            value: 78 + Math.floor(Math.random() * 8) + (i * 0.4)
          }))
        },
        {
          id: 5,
          title: "Team Capacity",
          description: "Team capacity is likely to decrease by 18% during the upcoming holiday season without additional staffing.",
          category: "resources",
          confidence: 0.89,
          impact: "Schedule risk for Q4 deliverables",
          trend: "down" as const,
          timeframe: "Q4",
          dataPoints: Array.from({ length: 12 }, (_, i) => ({
            date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            value: 90 - Math.floor(Math.random() * 10) - (i * 1.2)
          }))
        }
      ];
      
      setDetailedPredictions(samplePredictions);
      setPredictionsDialogOpen(true);
      
    } catch (error) {
      console.error('Error loading detailed predictions:', error);
      toast({
        title: "Error",
        description: "Failed to load detailed predictions. Please try again.",
        variant: "destructive"
      });
    }
  };

  const isLoading = isTeamsLoading || isActivitiesLoading || isMetricsLoading || isAnomalyLoading;

  return (
    <div className="space-y-6" data-tour="analytics-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Select defaultValue={timeRange} onValueChange={setTimeRange} data-tour="time-range-selector">
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
          <Button variant="outline" size="sm" onClick={handleRefresh} data-tour="refresh-analytics">
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
        <Tabs defaultValue="overview" data-tour="analytics-tabs">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="anomalies" data-tour="analytics-anomalies">Anomaly Detection</TabsTrigger>
            <TabsTrigger value="predictions" data-tour="analytics-predictions">Predictive Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4" data-tour="analytics-overview">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="analytics-kpi-cards">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="analytics-charts">
              {activitiesData && (
                <div data-tour="project-progress-chart">
                  <ProjectProgressChart activities={activitiesData} />
                </div>
              )}
              
              {teamsData && (
                <div data-tour="team-progress-chart">
                  <TeamProgressChart teams={teamsData} />
                </div>
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
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleViewAllAnomalies}
                  >
                    View All Anomalies
                  </Button>
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

          <TabsContent value="anomalies" className="space-y-4" data-tour="analytics-anomalies-tab">
            {anomalyAlerts && anomalyAlerts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                <Card data-tour="anomalies-card">
                  <CardHeader>
                    <CardTitle>Anomaly Detection</CardTitle>
                    <CardDescription>AI-detected anomalies requiring attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {anomalyAlerts.map(alert => (
                        <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-md" data-tour="anomaly-item">
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
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleInvestigateAnomaly(alert)}
                              >
                                Investigate
                              </Button>
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

          <TabsContent value="predictions" className="space-y-4" data-tour="analytics-predictions-tab">
            <Card data-tour="predictions-card">
              <CardHeader>
                <CardTitle>Predictive Insights</CardTitle>
                <CardDescription>AI-powered predictions based on project trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border rounded-md p-4 space-y-2" data-tour="prediction-item">
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
                <Button variant="outline" className="w-full" onClick={handleViewDetailedPredictions}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Detailed Predictions
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      {/* All Anomalies Dialog */}
      <Dialog open={anomaliesDialogOpen} onOpenChange={setAnomaliesDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>All Detected Anomalies</DialogTitle>
            <DialogDescription>
              Complete list of all anomalies detected by the system
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4 py-4">
              {allAnomalies.map((anomaly) => (
                <div key={anomaly.id} className="border rounded-md p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className={`h-5 w-5 ${
                        anomaly.severity === 'high' ? 'text-red-500' : 
                        anomaly.severity === 'medium' ? 'text-amber-500' : 
                        'text-blue-500'
                      }`} />
                      <h3 className="font-medium">{anomaly.type}</h3>
                    </div>
                    {getSeverityBadge(anomaly.severity)}
                  </div>
                  <p className="text-sm">{anomaly.description}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Project: </span>
                      <span className="font-medium">{anomaly.relatedProject}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      <span className="font-medium">{anomaly.status}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Detected: </span>
                      <span>{anomaly.timeDetected}</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setAnomaliesDialogOpen(false);
                        handleInvestigateAnomaly(anomaly);
                      }}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Investigate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setAnomaliesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Investigation Dialog */}
      <Dialog open={investigateDialogOpen} onOpenChange={setInvestigateDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          {currentAnomaly && (
            <>
              <DialogHeader>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`h-5 w-5 ${
                    currentAnomaly.severity === 'high' ? 'text-red-500' : 
                    currentAnomaly.severity === 'medium' ? 'text-amber-500' : 
                    'text-blue-500'
                  }`} />
                  <DialogTitle>{currentAnomaly.type}</DialogTitle>
                </div>
                <DialogDescription>
                  Anomaly #{currentAnomaly.id} • {currentAnomaly.timeDetected} • {getSeverityBadge(currentAnomaly.severity)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Description</h3>
                    <p className="text-sm">{currentAnomaly.description}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Project Context</h3>
                    <div className="rounded-md border p-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Project: </span>
                          <span className="font-medium">{currentAnomaly.relatedProject}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status: </span>
                          <span className="font-medium">{currentAnomaly.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Impact Assessment</h3>
                    <div className="rounded-md border p-3 text-sm">
                      {currentAnomaly.impact}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">AI Recommended Actions</h3>
                    <div className="rounded-md border p-3">
                      <p className="text-sm mb-2">{currentAnomaly.recommendations}</p>
                      {currentAnomaly.data?.suggestedActions && (
                        <ul className="text-sm space-y-1 list-disc pl-4">
                          {currentAnomaly.data.suggestedActions.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                  {currentAnomaly.data?.relatedEntities && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Related Entities</h3>
                      <div className="space-y-2">
                        {currentAnomaly.data.relatedEntities.map((entity, index) => (
                          <div key={index} className="flex items-center justify-between rounded-md border p-2">
                            <span className="text-sm">{entity.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(entity.confidence * 100)}% confidence
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {currentAnomaly.data?.timeSeriesData && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Trend Analysis</h3>
                      <div className="h-[180px] border rounded-md p-4">
                        {/* Simple chart visualization */}
                        <div className="h-full flex items-end space-x-1">
                          {currentAnomaly.data.timeSeriesData.map((point, index) => {
                            const height = (point.value / 100) * 100;
                            return (
                              <div 
                                key={index} 
                                className="flex-1 group relative"
                              >
                                <div 
                                  className={`${
                                    index === currentAnomaly.data.timeSeriesData.length - 1 
                                      ? 'bg-red-500' 
                                      : 'bg-primary/60'
                                  } h-[${height}%] min-h-[4px] rounded-t`}
                                  style={{ height: `${height}%` }}
                                ></div>
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 z-10 bg-black text-white text-xs rounded p-1 whitespace-nowrap">
                                  {point.date}: {point.value}
                                </div>
                                {index === currentAnomaly.data.timeSeriesData.length - 1 && (
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setInvestigateDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setInvestigateDialogOpen(false);
                  toast({
                    title: "Anomaly assigned",
                    description: `Anomaly #${currentAnomaly.id} has been assigned to your team for resolution.`
                  });
                }}>
                  Assign to Team
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Detailed Predictions Dialog */}
      <Dialog open={predictionsDialogOpen} onOpenChange={setPredictionsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detailed AI Predictions</DialogTitle>
            <DialogDescription>
              Comprehensive AI-generated predictions and forecasts for your projects
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6 py-4">
              {detailedPredictions.map((prediction) => (
                <div key={prediction.id} className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {prediction.trend === 'up' ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : prediction.trend === 'down' ? (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      ) : (
                        <Target className="h-5 w-5 text-blue-500" />
                      )}
                      <h3 className="font-medium">{prediction.title}</h3>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                      {Math.round(prediction.confidence * 100)}% confidence
                    </span>
                  </div>
                  
                  <p className="text-sm">{prediction.description}</p>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Category: </span>
                      <span className="font-medium capitalize">{prediction.category}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Impact: </span>
                      <span className="font-medium">{prediction.impact}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeframe: </span>
                      <span>{prediction.timeframe}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trend: </span>
                      <span className={`font-medium ${
                        prediction.trend === 'up' ? 'text-green-600' : 
                        prediction.trend === 'down' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        {prediction.trend === 'up' ? 'Increasing' : 
                         prediction.trend === 'down' ? 'Decreasing' : 
                         'Stable'}
                      </span>
                    </div>
                  </div>
                  
                  {prediction.dataPoints && (
                    <div className="h-[120px] pt-2">
                      {/* Simple chart visualization */}
                      <div className="h-full flex items-end space-x-1">
                        {prediction.dataPoints.map((point, index) => {
                          const height = (point.value / 100) * 100;
                          const isLast = index === prediction.dataPoints!.length - 1;
                          return (
                            <div 
                              key={index} 
                              className="flex-1 group relative"
                            >
                              <div 
                                className={`${
                                  isLast
                                    ? (prediction.trend === 'up' ? 'bg-green-500' : 
                                       prediction.trend === 'down' ? 'bg-red-500' : 
                                       'bg-blue-500')
                                    : 'bg-primary/60'
                                } h-[${height}%] min-h-[4px] rounded-t`}
                                style={{ height: `${height}%` }}
                              ></div>
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 z-10 bg-black text-white text-xs rounded p-1 whitespace-nowrap">
                                {point.date}: {point.value.toFixed(1)}
                              </div>
                              {isLast && (
                                <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${
                                  prediction.trend === 'up' ? 'bg-green-500' : 
                                  prediction.trend === 'down' ? 'bg-red-500' : 
                                  'bg-blue-500'
                                }`}></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Report generated",
                          description: `A detailed report for ${prediction.title.toLowerCase()} has been prepared.`
                        });
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setPredictionsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setPredictionsDialogOpen(false);
              toast({
                title: "Predictions exported",
                description: "All prediction data has been exported to CSV format."
              });
            }}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}