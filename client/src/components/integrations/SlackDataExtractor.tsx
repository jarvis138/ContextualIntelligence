import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Download, Loader2, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Integration } from "@shared/schema";

interface SlackDataExtractorProps {
  userId: number;
  projectId: number;
  slackIntegration?: Integration;
}

export function SlackDataExtractor({
  userId,
  projectId,
  slackIntegration,
}: SlackDataExtractorProps) {
  const { toast } = useToast();
  const [lastExtraction, setLastExtraction] = useState<string | null>(null);

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
        // Store the timestamp of successful extraction
        setLastExtraction(new Date().toLocaleString());
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents`] });
        
        toast({
          title: "Data extracted successfully",
          description: data.message || `Extracted ${data.count || 'several'} items from Slack`,
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
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded text-xs">
              {slackChannelId}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Extract messages and conversations from Slack to analyze in the project context.
            Messages will be stored as activities and important messages as documents.
          </p>
          
          {lastExtraction && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Last extracted: {lastExtraction}
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" /> Extract Slack Data
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}