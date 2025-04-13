import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Integration } from "@shared/schema";
import { AlertCircle, Loader2, Send } from "lucide-react";

interface SlackShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  projectId: number;
  projectName: string;
  slackIntegration: Integration;
  onSuccess?: () => void;
}

export function SlackShareDialog({
  isOpen,
  onClose,
  userId,
  projectId,
  projectName,
  slackIntegration,
  onSuccess
}: SlackShareDialogProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState(`Project update: ${projectName}`);

  // Extract Slack credentials from integration config
  const slackChannelId = slackIntegration?.config ? (slackIntegration.config as any).channelId : undefined;
  const isConfigured = !!slackChannelId;

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/integrations/slack/share`, {
        channelId: slackChannelId,
        userId,
        message
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Message shared successfully",
          description: "Your message has been shared to Slack",
          variant: "default",
        });
        
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
      } else {
        toast({
          title: "Sharing failed",
          description: data.error || "Failed to share message to Slack",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Sharing failed",
        description: error.message || "Failed to share message to Slack",
        variant: "destructive",
      });
    },
  });

  if (!isConfigured) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slack Integration Not Configured</DialogTitle>
            <DialogDescription>
              Please configure your Slack integration first before sharing messages.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 border rounded-md bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm">Go to the Integrations tab to set up your Slack connection.</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share to Slack</DialogTitle>
          <DialogDescription>
            Send a message about this project to your connected Slack channel.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Channel:</span>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded text-xs">
              {slackChannelId}
            </span>
          </div>
          
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message here..."
            className="min-h-[100px]"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={() => mutate()}
            disabled={isPending || !message.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Share
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}