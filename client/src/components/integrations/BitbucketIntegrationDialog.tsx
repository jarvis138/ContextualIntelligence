import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BitbucketIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

export function BitbucketIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess
}: BitbucketIntegrationDialogProps) {
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [workspace, setWorkspace] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/bitbucket/test", {
        username,
        appPassword,
        workspace,
        userId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Integration successful",
          description: "Bitbucket integration has been successfully configured",
          variant: "default",
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "Integration failed",
          description: data.message || "Please check your Bitbucket credentials and settings",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Integration failed",
        description: error.message || "Please check your Bitbucket credentials and settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !appPassword) {
      toast({
        title: "Missing information",
        description: "Please provide both a Bitbucket username and app password",
        variant: "destructive",
      });
      return;
    }
    
    mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect Bitbucket</DialogTitle>
          <DialogDescription>
            Link your Bitbucket repositories to track code changes and pull requests.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="bitbucket-username" className="text-left">
              Bitbucket Username
            </Label>
            <Input
              id="bitbucket-username"
              placeholder="your-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your Bitbucket account username.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bitbucket-password" className="text-left">
              App Password
            </Label>
            <Input
              id="bitbucket-password"
              placeholder="App password..."
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              type="password"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Create an app password with repository read access in
              <a 
                href="https://bitbucket.org/account/settings/app-passwords/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-primary hover:underline"
              >
                Bitbucket Settings
              </a>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bitbucket-workspace" className="text-left">
              Workspace (Optional)
            </Label>
            <Input
              id="bitbucket-workspace"
              placeholder="workspace-id"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The Bitbucket workspace ID to limit access to. Leave empty for all workspaces.
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
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