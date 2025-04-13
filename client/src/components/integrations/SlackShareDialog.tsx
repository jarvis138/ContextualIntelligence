import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Integration } from "@shared/schema";

interface SlackShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  projectId: number;
  projectName: string;
  slackIntegration?: Integration;
  insightId?: number;
  onSuccess?: () => void;
}

export function SlackShareDialog({
  isOpen,
  onClose,
  userId,
  projectId,
  projectName,
  slackIntegration,
  insightId,
  onSuccess
}: SlackShareDialogProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const isInsightShare = !!insightId;

  // Use the correct mutation endpoint based on whether we're sharing an insight or a message
  const endpoint = isInsightShare 
    ? `/api/projects/${projectId}/slack/insight`
    : `/api/projects/${projectId}/slack/update`;

  // Extract Slack credentials from integration config
  const slackToken = slackIntegration?.config ? (slackIntegration.config as any).token : undefined;
  const slackChannelId = slackIntegration?.config ? (slackIntegration.config as any).channelId : undefined;

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      // When sharing an insight, use the insight endpoint with insightId
      if (isInsightShare) {
        const res = await apiRequest("POST", endpoint, {
          token: slackToken,
          channelId: slackChannelId,
          insightId,
          userId
        });
        return await res.json();
      }
      
      // Otherwise, share a custom message
      const res = await apiRequest("POST", endpoint, {
        token: slackToken,
        channelId: slackChannelId,
        message,
        userId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Shared successfully",
          description: isInsightShare 
            ? "Insight has been shared to Slack"
            : "Update has been shared to Slack",
          variant: "default",
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "Share failed",
          description: data.message || "Failed to share to Slack",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Share failed",
        description: error.message || "Failed to share to Slack",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isInsightShare && !message) {
      toast({
        title: "Missing information",
        description: "Please enter a message to share",
        variant: "destructive",
      });
      return;
    }
    
    if (!slackToken || !slackChannelId) {
      toast({
        title: "Integration error",
        description: "Slack integration is not properly configured",
        variant: "destructive",
      });
      return;
    }
    
    mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isInsightShare ? "Share Insight to Slack" : "Share Update to Slack"}
          </DialogTitle>
          <DialogDescription>
            {isInsightShare 
              ? "Share this project insight with your Slack team."
              : `Share an update about "${projectName}" with your Slack team.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {!isInsightShare && (
            <div className="grid gap-2">
              <Label htmlFor="message" className="text-left">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="What would you like to share about this project?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="col-span-3 min-h-[100px]"
              />
            </div>
          )}

          <div className="grid gap-2">
            <p className="text-xs text-muted-foreground">
              Will be posted to channel: <span className="font-semibold">{slackChannelId}</span>
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sharing...
                </>
              ) : (
                "Share"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}