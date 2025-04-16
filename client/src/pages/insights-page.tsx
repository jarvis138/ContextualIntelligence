import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  ArrowUpRight, 
  Brain, 
  Calendar, 
  Clock, 
  BarChart2, 
  Download,
  LightbulbIcon,
  MessageSquare,
  Eye,
  Users,
  TrendingUp,
  FileQuestion,
  AlertCircle,
  Filter,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export default function InsightsPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [insightType, setInsightType] = useState('all');

  // Demo insights data
  const insights = [
    {
      id: 1,
      title: "Potential schedule risk detected",
      description: "Task completion rate has decreased 15% in the last sprint, possibly affecting delivery timeline.",
      type: "risk",
      severity: "high",
      timestamp: "2 hours ago",
      project: "Web Application Redesign",
      associatedNames: ["UI Component Development", "Frontend Integration"],
      actions: ["Review timeline", "Assign additional resources"],
      entity: {
        type: "task",
        name: "Frontend Integration",
        progress: 68,
      },
      confidence: 87
    },
    {
      id: 2,
      title: "Communication bottleneck identified",
      description: "Backend team is waiting on responses from the design team for 3+ days on average.",
      type: "bottleneck",
      severity: "medium",
      timestamp: "Yesterday",
      project: "Web Application Redesign",
      associatedNames: ["Backend Team", "Design Team"],
      actions: ["Schedule sync meeting", "Establish response SLAs"],
      entity: {
        type: "team",
        name: "Design Team",
      },
      confidence: 92
    },
    {
      id: 3,
      title: "Resource allocation opportunity",
      description: "Dave Miller has 40% available capacity and relevant skills for the API integration task.",
      type: "optimization",
      severity: "low",
      timestamp: "3 days ago",
      project: "Web Application Redesign",
      associatedNames: ["Dave Miller", "API Integration"],
      actions: ["Reassign resource", "Update capacity planning"],
      entity: {
        type: "resource",
        name: "Dave Miller",
        availability: 40,
      },
      confidence: 78
    },
    {
      id: 4,
      title: "Knowledge gap identified",
      description: "Documentation for the authentication module is outdated and causing implementation delays.",
      type: "risk",
      severity: "medium",
      timestamp: "1 week ago",
      project: "Web Application Redesign",
      associatedNames: ["Authentication Module", "Documentation"],
      actions: ["Update documentation", "Schedule knowledge transfer session"],
      entity: {
        type: "document",
        name: "Authentication Module Documentation",
      },
      confidence: 85
    },
    {
      id: 5,
      title: "Positive sentiment trend",
      description: "Team communication sentiment has improved 28% following the implementation of daily standups.",
      type: "sentiment",
      severity: "positive",
      timestamp: "2 weeks ago",
      project: "Web Application Redesign",
      associatedNames: ["Daily Standups", "Team Communication"],
      actions: ["Continue practice", "Share success in next review"],
      entity: {
        type: "process",
        name: "Daily Standups",
      },
      confidence: 91
    },
  ];

  // Filter insights based on selected type
  const filteredInsights = insightType === 'all' 
    ? insights 
    : insights.filter(insight => insight.type === insightType);

  // Function to render appropriate icon based on insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'risk':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'bottleneck':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'optimization':
        return <Zap className="h-5 w-5 text-green-500" />;
      case 'sentiment':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      default:
        return <LightbulbIcon className="h-5 w-5 text-primary" />;
    }
  };

  // Function to get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-amber-500">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      case 'positive':
        return <Badge variant="default" className="bg-green-500">Positive</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  // Function to handle action button clicks
  const handleAction = (action: string, insightId: number) => {
    toast({
      title: "Action triggered",
      description: `"${action}" initiated for insight #${insightId}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Insights</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights for improved project decision making
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`hover:shadow-md cursor-pointer ${insightType === 'all' ? 'bg-accent/50 border-primary' : ''}`} onClick={() => setInsightType('all')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <LightbulbIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">All Insights</p>
                <p className="text-sm text-muted-foreground">{insights.length} total</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className={`hover:shadow-md cursor-pointer ${insightType === 'risk' ? 'bg-accent/50 border-primary' : ''}`} onClick={() => setInsightType('risk')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3 h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Risk Factors</p>
                <p className="text-sm text-muted-foreground">{insights.filter(i => i.type === 'risk').length} detected</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className={`hover:shadow-md cursor-pointer ${insightType === 'bottleneck' ? 'bg-accent/50 border-primary' : ''}`} onClick={() => setInsightType('bottleneck')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="font-medium">Bottlenecks</p>
                <p className="text-sm text-muted-foreground">{insights.filter(i => i.type === 'bottleneck').length} identified</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className={`hover:shadow-md cursor-pointer ${insightType === 'optimization' ? 'bg-accent/50 border-primary' : ''}`} onClick={() => setInsightType('optimization')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Zap className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Optimizations</p>
                <p className="text-sm text-muted-foreground">{insights.filter(i => i.type === 'optimization').length} opportunities</p>
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Insights</CardTitle>
          <CardDescription>
            AI analysis of project data, communication patterns, and resource allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredInsights.map((insight) => (
              <div key={insight.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex justify-between">
                  <div className="flex items-start space-x-3">
                    {getInsightIcon(insight.type)}
                    <div>
                      <h3 className="font-medium">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    {getSeverityBadge(insight.severity)}
                    <div className="flex items-center bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                      <Brain className="h-3 w-3 mr-1" /> 
                      {insight.confidence}% confidence
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-muted-foreground">{insight.timestamp}</span>
                    </div>
                    <div className="flex items-center">
                      <FileQuestion className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span className="text-muted-foreground">{insight.project}</span>
                    </div>
                    {insight.entity.type === 'task' && (
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{insight.entity.progress}%</span>
                        </div>
                        <Progress value={insight.entity.progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {insight.actions.map((action, idx) => (
                      <Button 
                        key={idx} 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => handleAction(action, insight.id)}
                      >
                        {action}
                      </Button>
                    ))}
                    <Button variant="ghost" size="sm" className="h-8">
                      <Eye className="h-3 w-3 mr-1" /> Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              Powered by AI analysis of project data, communication patterns, and resource allocation
            </div>
            <Button variant="outline" size="sm">
              <BarChart2 className="h-4 w-4 mr-2" />
              View All Insights
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Implementation Status</CardTitle>
            <CardDescription>Current status of AI insights features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>AI-driven project risk assessment</span>
                  <span className="text-green-500">Complete</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Automated bottleneck identification</span>
                  <span className="text-green-500">Complete</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Communication sentiment analysis</span>
                  <span className="text-green-500">Complete</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Project progress forecasting</span>
                  <span className="text-green-500">Complete</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Resource allocation optimization</span>
                  <span className="text-green-500">Complete</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enhanced AI Capabilities</CardTitle>
            <CardDescription>Features of the AI insights engine</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex">
                <div className="mr-4 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Predictive Analytics</p>
                  <p className="text-sm text-muted-foreground">Forecasting project completion and resource needs based on historical data</p>
                </div>
              </li>
              <li className="flex">
                <div className="mr-4 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Sentiment Analysis</p>
                  <p className="text-sm text-muted-foreground">Analyzing communication patterns to detect team sentiment and potential issues</p>
                </div>
              </li>
              <li className="flex">
                <div className="mr-4 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Resource Optimization</p>
                  <p className="text-sm text-muted-foreground">Identifying optimal resource allocation based on skills, availability and project needs</p>
                </div>
              </li>
              <li className="flex">
                <div className="mr-4 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Risk Detection</p>
                  <p className="text-sm text-muted-foreground">Early identification of potential project risks and recommendations for mitigation</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}