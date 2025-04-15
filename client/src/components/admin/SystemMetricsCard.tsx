import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Server, Database } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemMetrics, useSystemPerformance } from '@/hooks/useAdminData';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  showProgress?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  description, 
  showProgress = false 
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center">
        {icon}
        <div className="text-2xl font-bold">{value}</div>
      </div>
      {description && (
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      )}
      {showProgress && typeof value === 'number' && (
        <Progress value={value} className="h-2 mt-2" />
      )}
    </CardContent>
  </Card>
);

export const SystemMetricsCard: React.FC = () => {
  const { data: performanceData, isLoading: performanceLoading } = useSystemPerformance();
  const { data: cpuMetrics } = useSystemMetrics('cpu', 1);
  const { data: memoryMetrics } = useSystemMetrics('memory', 1);
  const { data: apiMetrics } = useSystemMetrics('api', 1);
  
  const cpuUsage = cpuMetrics && cpuMetrics.length > 0 
    ? parseFloat(cpuMetrics[0].value as string) 
    : (performanceData?.cpu && performanceData.cpu.length > 0 
      ? parseFloat(performanceData.cpu[0].value as string)
      : 0);
  
  const memoryUsage = memoryMetrics && memoryMetrics.length > 0 
    ? parseFloat(memoryMetrics[0].value as string) 
    : (performanceData?.memory && performanceData.memory.length > 0 
      ? parseFloat(performanceData.memory[0].value as string)
      : 0);

  const apiResponseTime = apiMetrics && apiMetrics.length > 0 
    ? parseFloat(apiMetrics[0].value as string) 
    : (performanceData?.api && performanceData.api.length > 0 
      ? parseFloat(performanceData.api[0].value as string)
      : 0);

  const storageUsage = 48; // For now we'll keep this static, could be added to backend later

  if (performanceLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Skeleton className="h-6 w-6 mr-2 rounded-full" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-2 mt-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="System Health"
        value={cpuUsage < 50 ? 'Good' : cpuUsage < 80 ? 'Warning' : 'Critical'}
        icon={<Server className="h-4 w-4 text-muted-foreground mr-2" />}
        description={`CPU: ${cpuUsage.toFixed(1)}% | Memory: ${memoryUsage.toFixed(1)}%`}
      />
      
      <MetricCard
        title="CPU Usage"
        value={cpuUsage.toFixed(1) + '%'}
        icon={<Server className="h-4 w-4 text-muted-foreground mr-2" />}
        showProgress={true}
      />
      
      <MetricCard
        title="Memory Usage"
        value={memoryUsage.toFixed(1) + '%'}
        icon={<Database className="h-4 w-4 text-muted-foreground mr-2" />}
        showProgress={true}
      />
      
      <MetricCard
        title="API Response Time"
        value={apiResponseTime.toFixed(0) + 'ms'}
        icon={<Activity className="h-4 w-4 text-muted-foreground mr-2" />}
        description={`Average over last minute`}
      />
    </div>
  );
};