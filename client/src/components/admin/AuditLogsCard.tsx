import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, File, User, RefreshCw } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditLogs } from '@/hooks/useAdminData';
import { formatDistanceToNow } from 'date-fns';

export const AuditLogsCard: React.FC = () => {
  const { data: logs, isLoading, refetch } = useAuditLogs(undefined, undefined, undefined, 10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start border-b pb-3 last:border-0 last:pb-0">
                <Skeleton className="h-6 w-6 mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get icon based on entity type
  const getIcon = (entityType: string) => {
    switch (entityType?.toLowerCase()) {
      case 'user':
        return <User className="h-5 w-5 text-purple-500" />;
      case 'document':
        return <File className="h-5 w-5 text-green-500" />;
      case 'project':
        return <File className="h-5 w-5 text-blue-500" />;
      case 'auth':
      default:
        return <Shield className="h-5 w-5 text-blue-500" />;
    }
  };

  // Helper function to get action description
  const getActionDescription = (log: any) => {
    const { action, details, entityType, entityId } = log;
    
    if (details) {
      return details;
    }
    
    return `${action} performed on ${entityType || 'item'} ${entityId ? `#${entityId}` : ''}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>Recent system activity and user actions</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs && logs.length > 0 ? (
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="flex items-start border-b pb-3 last:border-0 last:pb-0">
                <div className="mr-4 mt-0.5">
                  {getIcon(log.entityType)}
                </div>
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {log.action}
                    <Badge variant="outline">{log.entityType || 'system'}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getActionDescription(log)}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {log.timestamp 
                    ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) 
                    : 'Recently'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found
          </div>
        )}
      </CardContent>
    </Card>
  );
};