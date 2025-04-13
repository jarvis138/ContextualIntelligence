import React, { useMemo } from "react";
import { 
  AreaChart,
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "@shared/schema";

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-md p-2 shadow-sm">
        <p className="text-sm font-medium">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ProjectProgressChartProps {
  activities: Activity[];
}

export function ProjectProgressChart({ activities }: ProjectProgressChartProps) {
  // Create chart data from activities
  const chartData = useMemo(() => {
    // Sort activities by creation date
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group activities by day and count them by type
    const aggregatedData = sortedActivities.reduce<{
      [key: string]: {
        date: string;
        create: number;
        update: number;
        delete: number;
        complete: number;
        integration: number;
        ai: number;
      };
    }>((acc, activity) => {
      const date = new Date(activity.timestamp).toLocaleDateString();
      
      if (!acc[date]) {
        acc[date] = {
          date,
          create: 0,
          update: 0,
          delete: 0,
          complete: 0,
          integration: 0,
          ai: 0
        };
      }
      
      // Increment count for the activity type
      if (acc[date][activity.type as keyof typeof acc[typeof date]]) {
        (acc[date][activity.type as keyof typeof acc[typeof date]] as number) += 1;
      }
      
      return acc;
    }, {});

    // Convert to array for the chart
    return Object.values(aggregatedData);
  }, [activities]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Activity</CardTitle>
          <CardDescription>No activities recorded yet</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Start working on your project to see activity data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Activity Over Time</CardTitle>
        <CardDescription>
          Visualizes different types of activities in your project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="create" 
                stackId="1"
                stroke="#8884d8" 
                fill="#8884d8" 
                name="Create" 
              />
              <Area 
                type="monotone" 
                dataKey="update" 
                stackId="1" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
                name="Update" 
              />
              <Area 
                type="monotone" 
                dataKey="complete" 
                stackId="1" 
                stroke="#ffc658" 
                fill="#ffc658" 
                name="Complete" 
              />
              <Area 
                type="monotone" 
                dataKey="integration" 
                stackId="1" 
                stroke="#ff8042" 
                fill="#ff8042" 
                name="Integration" 
              />
              <Area 
                type="monotone" 
                dataKey="ai" 
                stackId="1" 
                stroke="#0088fe" 
                fill="#0088fe" 
                name="AI" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}