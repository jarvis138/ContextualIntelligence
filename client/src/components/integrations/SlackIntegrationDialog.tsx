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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SlackIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

export function SlackIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess
}: SlackIntegrationDialogProps) {
  const [token, setToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/slack/test", {
        token,
        channelId,
        userId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Integration successful",
          description: "Slack integration has been successfully configured",
          variant: "default",
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "Integration failed",
          description: data.message || "Please check your Slack token and channel ID",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Integration failed",
        description: error.message || "Please check your Slack token and channel ID",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !channelId) {
      toast({
        title: "Missing information",
        description: "Please provide both a Slack token and channel ID",
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
          <DialogTitle>Connect Slack Integration</DialogTitle>
          <DialogDescription>
            Enter your Slack bot token and channel ID to integrate with your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="slack-token" className="text-left">
              Slack Bot Token
            </Label>
            <Input
              id="slack-token"
              placeholder="xoxb-your-token-here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="col-span-3"
            />
            <p className="text-xs text-muted-foreground">
              Find this in your Slack App's OAuth & Permissions page.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="channel-id" className="text-left">
              Channel ID
            </Label>
            <Input
              id="channel-id"
              placeholder="C01234ABCDE"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="col-span-3"
            />
            <p className="text-xs text-muted-foreground">
              Right-click on a channel in Slack and select "Copy Link" to find the ID.
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}