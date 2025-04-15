import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  LineChart,
  PieChart,
  Activity, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  BarChart3,
  Filter
} from 'lucide-react';

// Mock data - in a real implementation this would come from API calls
const projectMetrics = {
  totalProjects: 42,
  activeProjects: 28,
  completedLastMonth: 6,
  atRiskProjects: 4,
  averageCompletion: 78, // percentage
  projectsByStatus: [
    { name: 'On Track', value: 18 },
    { name: 'At Risk', value: 4 },
    { name: 'Delayed', value: 6 },
    { name: 'Completed', value: 12 },
    { name: 'Planning', value: 2 }
  ],
  projectTimeline: [
    { month: 'Jan', completed: 4, started: 5 },
    { month: 'Feb', completed: 6, started: 4 },
    { month: 'Mar', completed: 3, started: 7 },
    { month: 'Apr', completed: 5, started: 3 },
    { month: 'May', completed: 7, started: 4 },
    { month: 'Jun', completed: 6, started: 6 }
  ]
};

const documentMetrics = {
  totalDocuments: 754,
  processedLastWeek: 48,
  byType: [
    { type: 'PDF', count: 320 },
    { type: 'DOCX', count: 215 },
    { type: 'Spreadsheets', count: 112 },
    { type: 'Presentations', count: 67 },
    { type: 'Other', count: 40 }
  ],
  topKeywords: [
    { keyword: 'API Integration', count: 87 },
    { keyword: 'Data Migration', count: 65 },
    { keyword: 'Cloud Security', count: 54 },
    { keyword: 'User Authentication', count: 48 },
    { keyword: 'Database Optimization', count: 42 }
  ],
  processingTrend: [
    { day: 'Mon', processed: 12 },
    { day: 'Tue', processed: 8 },
    { day: 'Wed', processed: 15 },
    { day: 'Thu', processed: 10 },
    { day: 'Fri', processed: 18 },
    { day: 'Sat', processed: 2 },
    { day: 'Sun', processed: 0 }
  ]
};

const userActivityMetrics = {
  activeUsers: 38,
  newUsers: 5,
  totalUsers: 52,
  activityByHour: [
    { hour: '00:00', count: 3 },
    { hour: '03:00', count: 1 },
    { hour: '06:00', count: 5 },
    { hour: '09:00', count: 25 },
    { hour: '12:00', count: 18 },
    { hour: '15:00', count: 22 },
    { hour: '18:00', count: 14 },
    { hour: '21:00', count: 7 }
  ],
  topActiveUsers: [
    { name: 'Sarah Chen', role: 'Project Manager', activityScore: 92 },
    { name: 'Michael Rodriguez', role: 'Developer', activityScore: 87 },
    { name: 'Emma Wilson', role: 'Designer', activityScore: 85 },
    { name: 'David Kim', role: 'Data Analyst', activityScore: 78 },
    { name: 'Olivia Martinez', role: 'Content Writer', activityScore: 72 }
  ],
  activityByType: [
    { type: 'Document Edits', count: 218 },
    { type: 'Comments', count: 145 },
    { type: 'Task Updates', count: 192 },
    { type: 'Logins', count: 320 },
    { type: 'Search Queries', count: 175 }
  ]
};

const anomalyAlerts = [
  { 
    id: 1, 
    type: 'Unusual Activity Spike',
    description: 'Detected abnormal increase in API requests from user david.kim',
    severity: 'medium',
    timeDetected: '2 hours ago'
  },
  { 
    id: 2, 
    type: 'Document Access Pattern',
    description: 'Multiple access attempts to restricted financial documents',
    severity: 'high',
    timeDetected: '6 hours ago'
  },
  { 
    id: 3, 
    type: 'Project Delay Risk',
    description: 'Mobile App Redesign project showing signs of schedule slippage',
    severity: 'low',
    timeDetected: '1 day ago'
  },
  { 
    id: 4, 
    type: 'Data Processing Outlier',
    description: 'Abnormally large document processing time for marketing-plan.pdf',
    severity: 'medium',
    timeDetected: '1 day ago'
  }
];

export default function AdvancedAnalytics() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  
  const handleRefresh = () => {
    toast({
      title: "Refreshing analytics data",
      description: "Fetching the latest metrics and insights...",
    });
  };
  
  const handleDownloadReport = () => {
    toast({
      title: "Downloading report",
      description: "Preparing analytics report for download...",
    });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
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

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
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
                    <div className="text-2xl font-bold">{projectMetrics.activeProjects}</div>
                  </div>
                  <div className="text-sm flex items-center text-green-600">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    +12%
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {projectMetrics.totalProjects} total projects
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
                    <div className="text-2xl font-bold">{documentMetrics.totalDocuments}</div>
                  </div>
                  <div className="text-sm flex items-center text-green-600">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    +8%
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {documentMetrics.processedLastWeek} processed last week
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
                    <div className="text-2xl font-bold">{userActivityMetrics.activeUsers}</div>
                  </div>
                  <div className="text-sm flex items-center text-amber-600">
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                    -3%
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {userActivityMetrics.newUsers} new this week
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
                  <div className="text-2xl font-bold">{projectMetrics.averageCompletion}%</div>
                </div>
                <Progress value={projectMetrics.averageCompletion} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Anomaly Alerts Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Anomalies</CardTitle>
              <CardDescription>Detected anomalies requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anomalyAlerts.slice(0, 2).map(alert => (
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

          {/* Project Timeline & Document Processing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Projects started vs. completed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-end space-x-2">
                  {projectMetrics.projectTimeline.map((month, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center space-y-1">
                      <div className="w-full flex flex-col items-center space-y-1">
                        <div 
                          className="w-full bg-blue-500 rounded-sm" 
                          style={{ height: `${month.started * 10}px` }}
                          title={`Started: ${month.started}`}
                        ></div>
                        <div 
                          className="w-full bg-green-500 rounded-sm" 
                          style={{ height: `${month.completed * 10}px` }}
                          title={`Completed: ${month.completed}`}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground">{month.month}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mt-4 space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-sm bg-blue-500 mr-2"></div>
                    <span className="text-sm">Started</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-sm bg-green-500 mr-2"></div>
                    <span className="text-sm">Completed</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Processing</CardTitle>
                <CardDescription>Documents processed by day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-end space-x-2">
                  {documentMetrics.processingTrend.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center space-y-1">
                      <div 
                        className="w-full bg-primary/80 rounded-sm" 
                        style={{ height: `${day.processed * 8}px` }}
                        title={`${day.processed} documents`}
                      ></div>
                      <div className="text-xs text-muted-foreground">{day.day}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm">Total this week: {documentMetrics.processingTrend.reduce((a, b) => a + b.processed, 0)}</div>
                  <Button variant="outline" size="sm">See Details</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Status</CardTitle>
                <CardDescription>Distribution by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60 relative flex items-center justify-center">
                  <PieChart className="h-40 w-40 stroke-muted-foreground" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{projectMetrics.totalProjects}</div>
                      <div className="text-xs text-muted-foreground">Total Projects</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {projectMetrics.projectsByStatus.map((status, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          i === 0 ? "bg-green-500" :
                          i === 1 ? "bg-amber-500" :
                          i === 2 ? "bg-red-500" :
                          i === 3 ? "bg-blue-500" :
                          "bg-gray-500"
                        }`}></div>
                        <span>{status.name}</span>
                      </div>
                      <span className="font-medium">{status.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>At Risk Projects</CardTitle>
                <CardDescription>Projects needing attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className={`mt-0.5 w-2 h-8 rounded-full ${
                        i === 0 ? "bg-red-500" :
                        i === 1 ? "bg-amber-500" :
                        "bg-amber-500"
                      }`}></div>
                      <div>
                        <div className="font-medium">
                          {i === 0 ? "Mobile App Redesign" :
                           i === 1 ? "API Integration Platform" :
                           "Cloud Migration Phase 2"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {i === 0 ? "3 weeks behind schedule" :
                           i === 1 ? "Resource allocation issues" :
                           "Dependency blockers"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Owner: {i === 0 ? "Emma Wilson" : i === 1 ? "David Kim" : "Sarah Chen"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">View All At-Risk Projects</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Trends</CardTitle>
                <CardDescription>Project completion rate over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>This Month</span>
                      <span className="font-medium">83%</span>
                    </div>
                    <Progress value={83} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Last Month</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>2 Months Ago</span>
                      <span className="font-medium">72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>3 Months Ago</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Completion Trend</div>
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span className="text-sm">Positive</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold">+15%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Performance</CardTitle>
              <CardDescription>Detailed metrics across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 px-4 py-3 bg-muted text-sm font-medium">
                  <div>Project Name</div>
                  <div>Status</div>
                  <div>Progress</div>
                  <div>Team Size</div>
                  <div>Deadline</div>
                </div>
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="grid grid-cols-5 px-4 py-3 border-t items-center text-sm"
                  >
                    <div className="font-medium">
                      {i === 0 ? "Customer Portal Upgrade" :
                       i === 1 ? "Mobile App Redesign" :
                       i === 2 ? "API Integration Platform" :
                       i === 3 ? "Cloud Migration Phase 2" :
                       "Security Compliance Update"}
                    </div>
                    <div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        i === 0 ? "bg-green-100 text-green-800" :
                        i === 1 ? "bg-red-100 text-red-800" :
                        i === 2 ? "bg-amber-100 text-amber-800" :
                        i === 3 ? "bg-amber-100 text-amber-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {i === 0 ? "On Track" :
                         i === 1 ? "Delayed" :
                         i === 2 ? "At Risk" :
                         i === 3 ? "At Risk" :
                         "Planning"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={
                        i === 0 ? 85 :
                        i === 1 ? 62 :
                        i === 2 ? 43 :
                        i === 3 ? 38 :
                        15
                      } className="h-2 w-24" />
                      <span className="text-xs">
                        {i === 0 ? "85%" :
                         i === 1 ? "62%" :
                         i === 2 ? "43%" :
                         i === 3 ? "38%" :
                         "15%"}
                      </span>
                    </div>
                    <div>
                      {i === 0 ? "7" :
                       i === 1 ? "5" :
                       i === 2 ? "8" :
                       i === 3 ? "12" :
                       "4"}
                    </div>
                    <div>
                      {i === 0 ? "Jun 30, 2025" :
                       i === 1 ? "May 15, 2025" :
                       i === 2 ? "Jul 20, 2025" :
                       i === 3 ? "Aug 5, 2025" :
                       "Sep 15, 2025"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Document Types</CardTitle>
                <CardDescription>Distribution by file format</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 relative">
                  <BarChart3 className="h-full w-full stroke-muted-foreground" />
                </div>
                <div className="flex justify-center mt-4 space-x-4">
                  {documentMetrics.byType.map((type, i) => (
                    <div key={i} className="flex items-center">
                      <div className={`w-3 h-3 rounded-sm mr-2 ${
                        i === 0 ? "bg-red-500" :
                        i === 1 ? "bg-blue-500" :
                        i === 2 ? "bg-green-500" :
                        i === 3 ? "bg-amber-500" :
                        "bg-gray-500"
                      }`}></div>
                      <span className="text-sm">{type.type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Keywords</CardTitle>
                <CardDescription>Most frequent terms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documentMetrics.topKeywords.map((keyword, i) => (
                    <div key={i} className="flex justify-between items-center pb-2 border-b last:border-0 last:pb-0">
                      <div className="flex items-center space-x-2">
                        <div className="text-xl font-bold text-muted-foreground">{i + 1}</div>
                        <div className="font-medium">{keyword.keyword}</div>
                      </div>
                      <div className="text-sm">{keyword.count} occurrences</div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">View All Keywords</Button>
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Processing Performance</CardTitle>
              <CardDescription>Document processing metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Average Processing Time</div>
                  <div className="text-2xl font-bold">3.2s</div>
                  <div className="text-xs text-muted-foreground flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
                    12% faster than last month
                  </div>
                </div>
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Entity Extraction Accuracy</div>
                  <div className="text-2xl font-bold">94.8%</div>
                  <div className="text-xs text-muted-foreground flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    2.1% improvement
                  </div>
                </div>
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium">OCR Confidence</div>
                  <div className="text-2xl font-bold">92.3%</div>
                  <div className="text-xs text-muted-foreground flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    1.5% improvement
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">Processing Pipeline Performance</h3>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Text Extraction</span>
                      <span className="font-medium">18ms avg</span>
                    </div>
                    <Progress value={88} className="h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Entity Recognition</span>
                      <span className="font-medium">150ms avg</span>
                    </div>
                    <Progress value={75} className="h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Sentiment Analysis</span>
                      <span className="font-medium">95ms avg</span>
                    </div>
                    <Progress value={82} className="h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Keyword Extraction</span>
                      <span className="font-medium">68ms avg</span>
                    </div>
                    <Progress value={90} className="h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Topic Modeling</span>
                      <span className="font-medium">210ms avg</span>
                    </div>
                    <Progress value={65} className="h-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity by Time</CardTitle>
                <CardDescription>User activity throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end space-x-2">
                  {userActivityMetrics.activityByHour.map((hour, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center space-y-1">
                      <div 
                        className="w-full bg-primary/80 rounded-sm" 
                        style={{ height: `${hour.count * 2}px` }}
                        title={`${hour.count} active users`}
                      ></div>
                      <div className="text-xs text-muted-foreground">{hour.hour}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm">Peak: {Math.max(...userActivityMetrics.activityByHour.map(h => h.count))} users at 09:00</div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Target className="h-4 w-4 mr-1" />
                    All times in local timezone
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity by Type</CardTitle>
                <CardDescription>Distribution of user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 relative">
                  <PieChart className="h-full w-full stroke-muted-foreground" />
                </div>
                <div className="flex flex-wrap justify-center mt-4 gap-2">
                  {userActivityMetrics.activityByType.map((type, i) => (
                    <div key={i} className="flex items-center">
                      <div className={`w-3 h-3 rounded-sm mr-2 ${
                        i === 0 ? "bg-blue-500" :
                        i === 1 ? "bg-green-500" :
                        i === 2 ? "bg-purple-500" :
                        i === 3 ? "bg-amber-500" :
                        "bg-red-500"
                      }`}></div>
                      <span className="text-sm">{type.type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Most Active Users</CardTitle>
              <CardDescription>Top users by activity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userActivityMetrics.topActiveUsers.map((user, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-medium text-sm">{user.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium">{user.activityScore}/100</div>
                      <Progress value={user.activityScore} className="h-2 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View All Users</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-lg font-medium">Anomaly Detection</h2>
              <p className="text-sm text-muted-foreground">Unusual patterns and outliers requiring attention</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <div className="grid grid-cols-7 px-4 py-3 bg-muted text-sm font-medium">
                  <div className="col-span-1">Severity</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1">Detected</div>
                </div>
                {anomalyAlerts.map((alert, i) => (
                  <div 
                    key={alert.id} 
                    className="grid grid-cols-7 px-4 py-3 border-t items-center text-sm"
                  >
                    <div className="col-span-1">
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <div className="col-span-2 font-medium">{alert.type}</div>
                    <div className="col-span-3">{alert.description}</div>
                    <div className="col-span-1 text-muted-foreground">{alert.timeDetected}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Anomaly Distribution</CardTitle>
                <CardDescription>By severity and category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">By Severity</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted rounded-md p-3 text-center">
                        <div className="text-2xl font-bold text-red-500">2</div>
                        <div className="text-xs text-muted-foreground">High</div>
                      </div>
                      <div className="bg-muted rounded-md p-3 text-center">
                        <div className="text-2xl font-bold text-amber-500">5</div>
                        <div className="text-xs text-muted-foreground">Medium</div>
                      </div>
                      <div className="bg-muted rounded-md p-3 text-center">
                        <div className="text-2xl font-bold text-blue-500">3</div>
                        <div className="text-xs text-muted-foreground">Low</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="text-sm font-medium">By Category</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span>User Activity</span>
                        <span className="font-medium">4</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>System Performance</span>
                        <span className="font-medium">3</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Project Metrics</span>
                        <span className="font-medium">2</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Security</span>
                        <span className="font-medium">1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Anomaly Timeline</CardTitle>
                <CardDescription>Detection frequency over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 relative">
                  <LineChart className="h-full w-full stroke-muted-foreground" />
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">Total anomalies this month: 17</div>
                  <div className="flex items-center text-sm">
                    <ArrowUpRight className="h-4 w-4 mr-1 text-amber-500" />
                    <span className="text-amber-500">+24% from last month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-lg font-medium">Predictive Insights</h2>
              <p className="text-sm text-muted-foreground">AI-generated predictions and forecasts</p>
            </div>
            <div className="flex items-center space-x-2">
              <Select defaultValue="60">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Forecast period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="60">Next 60 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                  <SelectItem value="180">Next 6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Completion Forecast</CardTitle>
                <CardDescription>Predicted completion dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-4">
                      <div className={`mt-0.5 w-1 h-full rounded-full ${
                        i === 0 ? "bg-green-500" :
                        i === 1 ? "bg-green-500" :
                        i === 2 ? "bg-amber-500" :
                        "bg-red-500"
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div className="font-medium">
                            {i === 0 ? "Customer Portal Upgrade" :
                             i === 1 ? "Security Compliance Update" :
                             i === 2 ? "API Integration Platform" :
                             "Mobile App Redesign"}
                          </div>
                          <div className={`text-sm ${
                            i === 0 || i === 1 ? "text-green-600" :
                            i === 2 ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {i === 0 ? "On time" :
                             i === 1 ? "Early" :
                             i === 2 ? "1 week delay" :
                             "3 weeks delay"}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {i === 0 ? "Predicted: Jun 28, 2025 (Planned: Jun 30)" :
                           i === 1 ? "Predicted: Sep 10, 2025 (Planned: Sep 15)" :
                           i === 2 ? "Predicted: Jul 27, 2025 (Planned: Jul 20)" :
                           "Predicted: Jun 5, 2025 (Planned: May 15)"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Confidence: {i === 0 ? "92%" : i === 1 ? "88%" : i === 2 ? "75%" : "82%"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization Forecast</CardTitle>
                <CardDescription>Predicted utilization levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 relative">
                  <LineChart className="h-full w-full stroke-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs">Engineering</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs">Design</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-xs">QA</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Strategic Insights</CardTitle>
              <CardDescription>AI-generated business intelligence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start mb-2">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Efficiency Opportunity</div>
                      <div className="text-sm">Document processing times could be reduced by an estimated 18% by optimizing the OCR pipeline and implementing caching for common document templates.</div>
                    </div>
                  </div>
                  <div className="text-xs text-right text-muted-foreground">Confidence: High (92%)</div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start mb-2">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Risk Alert</div>
                      <div className="text-sm">Based on current project velocity and resource allocation patterns, the Mobile App Redesign project has a 78% probability of missing its deadline by 2-4 weeks.</div>
                    </div>
                  </div>
                  <div className="text-xs text-right text-muted-foreground">Confidence: Medium (78%)</div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start mb-2">
                    <Target className="h-5 w-5 mr-2 text-blue-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Resource Optimization</div>
                      <div className="text-sm">Team utilization analysis indicates engineering resources are over-allocated in late June. Consider redistributing 2-3 engineers from the API project to the Mobile App project to prevent delays.</div>
                    </div>
                  </div>
                  <div className="text-xs text-right text-muted-foreground">Confidence: Medium (75%)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}