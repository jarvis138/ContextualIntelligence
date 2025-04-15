import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSystemEvents, useAcknowledgeEvent } from '@/hooks/useAdminData';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface SystemEventsCardProps {
  limit?: number;
}

export const SystemEventsCard: React.FC<SystemEventsCardProps> = ({ limit = 5 }) => {
  const { data: events, isLoading, refetch } = useSystemEvents(undefined, undefined, limit, false);
  const acknowledgeEvent = useAcknowledgeEvent();
  const { toast } = useToast();

  const handleAcknowledge = async (eventId: number) => {
    try {
      await acknowledgeEvent.mutateAsync(eventId);
      toast({
        title: 'Event acknowledged',
        description: 'The event has been successfully acknowledged',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to acknowledge event',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start pb-4 border-b last:border-0 last:pb-0">
                <Skeleton className="h-6 w-6 mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>System Events</CardTitle>
            <CardDescription>Recent unacknowledged system events</CardDescription>
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
        {events && events.length > 0 ? (
          <div className="space-y-4">
            {events.map(event => (
              <div 
                key={event.id} 
                className="flex items-start pb-4 border-b last:border-0 last:pb-0"
              >
                <div className="mr-4 mt-0.5">
                  <AlertTriangle 
                    className={`h-5 w-5 ${
                      event.severity === 'error' || event.severity === 'critical' 
                        ? 'text-red-500' 
                        : event.severity === 'warning' 
                        ? 'text-amber-500' 
                        : 'text-blue-500'
                    }`} 
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {event.message}
                    <Badge variant={
                      event.severity === 'error' || event.severity === 'critical'
                        ? 'destructive'
                        : event.severity === 'warning'
                        ? 'default'
                        : 'secondary'
                    }>
                      {event.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) : 'Recently'}
                    {event.source && ` • ${event.source}`}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleAcknowledge(event.id)}
                  disabled={acknowledgeEvent.isPending}
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No unacknowledged events found
          </div>
        )}
      </CardContent>
    </Card>
  );
};