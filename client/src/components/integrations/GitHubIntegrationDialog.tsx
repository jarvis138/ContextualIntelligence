import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface GitHubIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

export function GitHubIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess
}: GitHubIntegrationDialogProps) {
  const [token, setToken] = useState("");
  const [organization, setOrganization] = useState("");
  const [repoVisibility, setRepoVisibility] = useState("all");
  const [serviceType, setServiceType] = useState<"github" | "gitlab">("github");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/git/test", {
        token,
        organization,
        serviceType,
        repoVisibility,
        userId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Integration successful",
          description: `${serviceType === "github" ? "GitHub" : "GitLab"} integration has been successfully configured`,
          variant: "default",
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "Integration failed",
          description: data.message || `Please check your ${serviceType === "github" ? "GitHub" : "GitLab"} token and settings`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Integration failed",
        description: error.message || `Please check your ${serviceType === "github" ? "GitHub" : "GitLab"} token and settings`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Missing information",
        description: `Please provide a ${serviceType === "github" ? "GitHub" : "GitLab"} personal access token`,
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
          <DialogTitle>Connect Git Repository</DialogTitle>
          <DialogDescription>
            Link your GitHub or GitLab repositories to track project code and development progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label>Service Type</Label>
            <RadioGroup 
              value={serviceType} 
              onValueChange={(value) => setServiceType(value as "github" | "gitlab")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="github" id="github" />
                <Label htmlFor="github">GitHub</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gitlab" id="gitlab" />
                <Label htmlFor="gitlab">GitLab</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="git-token" className="text-left">
              {serviceType === "github" ? "GitHub" : "GitLab"} Personal Access Token
            </Label>
            <Input
              id="git-token"
              placeholder={serviceType === "github" ? "ghp_..." : "glpat-..."}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Token requires read access to repositories and webhooks. 
              <a 
                href={serviceType === "github" 
                  ? "https://github.com/settings/tokens" 
                  : "https://gitlab.com/-/profile/personal_access_tokens"} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-primary hover:underline"
              >
                Create token
              </a>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="organization" className="text-left">
              Organization/Username (Optional)
            </Label>
            <Input
              id="organization"
              placeholder={serviceType === "github" ? "your-org" : "your-group"}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to access all your repositories.
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="text-left">Repository Visibility</Label>
            <RadioGroup 
              value={repoVisibility} 
              onValueChange={(value) => setRepoVisibility(value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public">Public Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private">Private Only</Label>
              </div>
            </RadioGroup>
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