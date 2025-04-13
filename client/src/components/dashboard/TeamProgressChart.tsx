import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Team {
  id: number;
  name: string;
  progress: number;
  memberCount: number;
  taskCount: number;
}

interface TeamProgressChartProps {
  teams: Team[];
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-md p-2 shadow-sm">
        <p className="text-sm font-medium">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}%`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TeamProgressChart({ teams }: TeamProgressChartProps) {
  if (!teams || teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Progress</CardTitle>
          <CardDescription>No teams data available</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Create teams to see progress data</p>
        </CardContent>
      </Card>
    );
  }

  // Process data for the chart
  const chartData = teams.map((team) => ({
    name: team.name,
    progress: team.progress,
    tasks: team.taskCount,
    members: team.memberCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Progress Comparison</CardTitle>
        <CardDescription>
          Shows the progress of each team in the project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="progress"
                fill="var(--primary)"
                name="Progress (%)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="tasks"
                fill="#82ca9d"
                name="Tasks"
                radius={[4, 4, 0, 0]}
              />
              <ReferenceLine yAxisId="left" y={50} stroke="#ff7300" label="Goal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}