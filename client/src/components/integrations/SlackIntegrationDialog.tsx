import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Channel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members?: number;
}

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
  const [step, setStep] = useState<"token" | "channel">("token");
  const [tokenValidated, setTokenValidated] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const { toast } = useToast();

  // Clear state when dialog is opened
  useEffect(() => {
    if (isOpen) {
      setStep("token");
      setTokenValidated(false);
      setChannels([]);
    }
  }, [isOpen]);

  const verifyTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/slack/verify", {
        token
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setTokenValidated(true);
        setStep("channel");
        fetchChannels();
      } else {
        toast({
          title: "Invalid token",
          description: data.message || "The Slack token provided is invalid",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify the Slack token",
        variant: "destructive",
      });
    },
  });

  const integrationMutation = useMutation({
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

  const fetchChannels = async () => {
    if (!token) return;
    
    setIsLoadingChannels(true);
    try {
      const res = await apiRequest("POST", "/api/integrations/slack/channels", {
        token
      });
      const data = await res.json();
      
      if (data.success && data.channels) {
        setChannels(data.channels);
      } else {
        toast({
          title: "Couldn't fetch channels",
          description: data.message || "Failed to fetch channels from Slack",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error fetching channels",
        description: error.message || "An error occurred while fetching Slack channels",
        variant: "destructive",
      });
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleVerifyToken = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Missing token",
        description: "Please provide a Slack bot token",
        variant: "destructive",
      });
      return;
    }
    
    verifyTokenMutation.mutate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !channelId) {
      toast({
        title: "Missing information",
        description: "Please provide both a Slack token and select a channel",
        variant: "destructive",
      });
      return;
    }
    
    integrationMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect Slack Integration</DialogTitle>
          <DialogDescription>
            Configure your Slack integration to extract data and share project updates.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="token" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary" 
              disabled={step === "channel"}
            >
              1. Token
            </TabsTrigger>
            <TabsTrigger 
              value="channel" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary" 
              disabled={!tokenValidated || step === "token"}
            >
              2. Channel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="token" className="mt-6">
            <form onSubmit={handleVerifyToken} className="space-y-4">
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
                  The token should start with "xoxb-".
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">How to get a Slack Bot Token:</p>
                <ol className="pl-5 text-sm text-muted-foreground list-decimal space-y-1">
                  <li>Go to the <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Slack API Dashboard</a></li>
                  <li>Create a new app or select an existing one</li>
                  <li>Go to "OAuth & Permissions" in the sidebar</li>
                  <li>Add required scopes: channels:read, channels:history, chat:write</li>
                  <li>Install the app to your workspace</li>
                  <li>Copy the "Bot User OAuth Token" that starts with xoxb-</li>
                </ol>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onClose} disabled={verifyTokenMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={verifyTokenMutation.isPending || !token}>
                  {verifyTokenMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Verify Token"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="channel" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="text-green-500 h-4 w-4" />
                  <span>Token verified successfully</span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep("token")}
                  className="text-xs"
                >
                  Change token
                </Button>
              </div>

              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="channel-select" className="text-left">
                    Select Slack Channel
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchChannels}
                    disabled={isLoadingChannels}
                    className="h-6 px-2"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingChannels ? 'animate-spin' : ''}`} />
                    <span className="ml-1 text-xs">Refresh</span>
                  </Button>
                </div>

                {isLoadingChannels ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : channels.length > 0 ? (
                  <Select value={channelId} onValueChange={setChannelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.is_private ? '🔒' : '#'} {channel.name} {channel.num_members ? `(${channel.num_members} members)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center justify-center border rounded-md py-6 px-4 text-center">
                    <div className="space-y-2">
                      <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto" />
                      <p className="text-sm text-muted-foreground">No channels found or unable to fetch channels.</p>
                      <Button size="sm" onClick={fetchChannels} className="mt-2">
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  Select the channel where you want to extract project data from and share updates.
                </p>
              </div>

              <div className="mt-2 text-sm bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc pl-5 text-xs space-y-1 text-muted-foreground">
                  <li>The Slack bot must be invited to the selected channel</li>
                  <li>The bot needs permission to read messages and send messages</li>
                  <li>Private channels require explicit invitation of the bot</li>
                </ul>
              </div>

              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep("token")} 
                  disabled={integrationMutation.isPending}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={integrationMutation.isPending || !channelId}
                >
                  {integrationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
                    </>
                  ) : (
                    "Connect Slack"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}