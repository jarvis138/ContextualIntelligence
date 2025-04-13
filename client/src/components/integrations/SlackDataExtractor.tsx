import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Download, Loader2, MessageSquare, FileText, Calendar, CheckSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Integration } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface SlackDataExtractorProps {
  userId: number;
  projectId: number;
  slackIntegration?: Integration;
}

interface ExtractionResult {
  count?: number;
  entities?: number;
  tasks?: number;
  documents?: number;
  timestamp: string;
}

export function SlackDataExtractor({
  userId,
  projectId,
  slackIntegration,
}: SlackDataExtractorProps) {
  const { toast } = useToast();
  const [lastExtraction, setLastExtraction] = useState<ExtractionResult | null>(null);
  const [extractionStats, setExtractionStats] = useState<{ messages: number; entities: number; tasks: number; documents: number }>({ 
    messages: 0, 
    entities: 0, 
    tasks: 0, 
    documents: 0 
  });

  // Extract Slack credentials from integration config
  const slackToken = slackIntegration?.config ? (slackIntegration.config as any).token : undefined;
  const slackChannelId = slackIntegration?.config ? (slackIntegration.config as any).channelId : undefined;
  const isConfigured = !!slackToken && !!slackChannelId;

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/integrations/slack/extract`, {
        channelId: slackChannelId,
        userId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Store the timestamp and detailed results of successful extraction
        const extractionResult: ExtractionResult = {
          count: data.count || 0,
          entities: data.entities || 0,
          tasks: data.tasks || 0,
          documents: data.documents || 0,
          timestamp: new Date().toLocaleString()
        };
        
        setLastExtraction(extractionResult);
        
        // Update stats
        setExtractionStats(prev => ({
          messages: prev.messages + (data.count || 0),
          entities: prev.entities + (data.entities || 0),
          tasks: prev.tasks + (data.tasks || 0),
          documents: prev.documents + (data.documents || 0)
        }));
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/relationships`] });
        
        toast({
          title: "Data extracted successfully",
          description: `Processed ${data.count} messages, extracted ${data.entities} entities, created ${data.tasks} tasks and ${data.documents} documents`,
          variant: "default",
        });
      } else {
        toast({
          title: "Extraction failed",
          description: data.error || "Failed to extract data from Slack",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction failed",
        description: error.message || "Failed to extract data from Slack",
        variant: "destructive",
      });
    },
  });

  if (!isConfigured) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Slack Data Extractor
          </CardTitle>
          <CardDescription>
            Extract data from your Slack workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm">Slack integration is not configured. Connect your Slack workspace first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Slack Data Extractor
        </CardTitle>
        <CardDescription>
          Extract data from your Slack workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
            <span className="text-sm font-medium">Connected channel:</span>
            <Badge variant="secondary" className="font-mono">
              {slackChannelId}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Extract messages and conversations from Slack to analyze in the project context.
            The advanced extraction pipeline identifies tasks, deadlines, sentiments, and key entities.
          </p>
          
          {extractionStats.messages > 0 && (
            <div className="space-y-3 pt-2">
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1" /> Messages
                    </span>
                    <span className="text-xs font-medium">{extractionStats.messages}</span>
                  </div>
                  <Progress value={(extractionStats.messages / (extractionStats.messages + 10)) * 100} className="h-1.5" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center">
                      <FileText className="h-3 w-3 mr-1" /> Documents
                    </span>
                    <span className="text-xs font-medium">{extractionStats.documents}</span>
                  </div>
                  <Progress value={(extractionStats.documents / (extractionStats.messages || 1)) * 100} className="h-1.5" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" /> Entities
                    </span>
                    <span className="text-xs font-medium">{extractionStats.entities}</span>
                  </div>
                  <Progress value={(extractionStats.entities / (extractionStats.messages * 3 || 1)) * 100} className="h-1.5" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center">
                      <CheckSquare className="h-3 w-3 mr-1" /> Tasks
                    </span>
                    <span className="text-xs font-medium">{extractionStats.tasks}</span>
                  </div>
                  <Progress value={(extractionStats.tasks / (extractionStats.entities || 1)) * 100} className="h-1.5" />
                </div>
              </div>
            </div>
          )}
          
          {lastExtraction && (
            <div className="text-xs text-muted-foreground pt-1">
              <span className="block font-medium">Last extraction: {lastExtraction.timestamp}</span>
              {lastExtraction.count && lastExtraction.count > 0 && (
                <span className="block mt-1">
                  Processed {lastExtraction.count} messages, 
                  extracted {lastExtraction.entities} entities, 
                  created {lastExtraction.tasks} tasks and {lastExtraction.documents} documents
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          disabled={isPending}
          onClick={() => mutate()}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Processing data pipeline...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" /> 
              Extract & Process Slack Data
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}