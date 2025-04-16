import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowDownIcon, ArrowUpIcon, RefreshCw } from "lucide-react";
import { RelationshipGraph } from "@/components/visualizations/RelationshipGraph";

// Types for analytics data
interface MetricData {
  name: string;
  value: number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
}

interface ActivityData {
  date: string;
  documents: number;
  tasks: number;
  communications: number;
}

interface EntityDistribution {
  name: string;
  value: number;
  color: string;
}

interface AnalyticsData {
  metrics: {
    totalDocuments: MetricData;
    activeProjects: MetricData;
    totalTasks: MetricData;
    completedTasks: MetricData;
  };
  activityTrend: ActivityData[];
  entityDistribution: EntityDistribution[];
  topEntities: {
    name: string;
    type: string;
    frequency: number;
    sentiment: number;
  }[];
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [focusEntity, setFocusEntity] = useState<string | undefined>(undefined);

  // Query to fetch analytics data
  const {
    data,
    isLoading,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", { timeRange }],
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Spinner size="xl" />
      </div>
    );
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  // Render the overview dashboard
  const renderOverview = () => {
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {data.metrics.totalDocuments.value}
                </div>
                <div className={`flex items-center text-xs ${
                  data.metrics.totalDocuments.changeType === "increase" 
                    ? "text-green-500" 
                    : data.metrics.totalDocuments.changeType === "decrease" 
                      ? "text-red-500" 
                      : "text-muted-foreground"
                }`}>
                  {data.metrics.totalDocuments.changeType === "increase" ? (
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                  ) : data.metrics.totalDocuments.changeType === "decrease" ? (
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                  ) : null}
                  {data.metrics.totalDocuments.change}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">compared to previous period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {data.metrics.activeProjects.value}
                </div>
                <div className={`flex items-center text-xs ${
                  data.metrics.activeProjects.changeType === "increase" 
                    ? "text-green-500" 
                    : data.metrics.activeProjects.changeType === "decrease" 
                      ? "text-red-500" 
                      : "text-muted-foreground"
                }`}>
                  {data.metrics.activeProjects.changeType === "increase" ? (
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                  ) : data.metrics.activeProjects.changeType === "decrease" ? (
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                  ) : null}
                  {data.metrics.activeProjects.change}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">compared to previous period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {data.metrics.totalTasks.value}
                </div>
                <div className={`flex items-center text-xs ${
                  data.metrics.totalTasks.changeType === "increase" 
                    ? "text-green-500" 
                    : data.metrics.totalTasks.changeType === "decrease" 
                      ? "text-red-500" 
                      : "text-muted-foreground"
                }`}>
                  {data.metrics.totalTasks.changeType === "increase" ? (
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                  ) : data.metrics.totalTasks.changeType === "decrease" ? (
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                  ) : null}
                  {data.metrics.totalTasks.change}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">compared to previous period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">
                  {data.metrics.completedTasks.value}
                </div>
                <div className={`flex items-center text-xs ${
                  data.metrics.completedTasks.changeType === "increase" 
                    ? "text-green-500" 
                    : data.metrics.completedTasks.changeType === "decrease" 
                      ? "text-red-500" 
                      : "text-muted-foreground"
                }`}>
                  {data.metrics.completedTasks.changeType === "increase" ? (
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                  ) : data.metrics.completedTasks.changeType === "decrease" ? (
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                  ) : null}
                  {data.metrics.completedTasks.change}%
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">compared to previous period</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Trend */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Activity Trend</CardTitle>
              <CardDescription>
                Document and task activity over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.activityTrend}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="documents" fill="#8884d8" name="Documents" />
                    <Bar dataKey="tasks" fill="#82ca9d" name="Tasks" />
                    <Bar dataKey="communications" fill="#ffc658" name="Communications" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Entity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Entity Distribution</CardTitle>
              <CardDescription>
                Distribution of detected entities by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.entityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        name,
                      }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
                        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="#888"
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                            fontSize={12}
                          >
                            {name} ({(percent * 100).toFixed(0)}%)
                          </text>
                        );
                      }}
                    >
                      {data.entityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Entities */}
          <Card>
            <CardHeader>
              <CardTitle>Top Entities</CardTitle>
              <CardDescription>
                Most frequently mentioned entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[300px]">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="text-xs uppercase text-muted-foreground">
                      <th className="px-4 py-2 text-left">Entity</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-right">Frequency</th>
                      <th className="px-4 py-2 text-right">Sentiment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.topEntities.map((entity, i) => (
                      <tr 
                        key={i} 
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setFocusEntity(entity.name)}
                      >
                        <td className="px-4 py-2 whitespace-nowrap font-medium">{entity.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground capitalize">{entity.type}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">{entity.frequency}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          <span className={
                            entity.sentiment > 0.5 
                              ? "text-green-500" 
                              : entity.sentiment < 0.3
                                ? "text-red-500"
                                : "text-yellow-500"
                          }>
                            {entity.sentiment.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last quarter</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="relationships">Relationship Graph</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <RelationshipGraph 
            width={1000} 
            height={600} 
            focusId={focusEntity} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}