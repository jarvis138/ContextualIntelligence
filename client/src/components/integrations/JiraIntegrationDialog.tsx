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

interface JiraIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

export function JiraIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess
}: JiraIntegrationDialogProps) {
  const [token, setToken] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [serviceType, setServiceType] = useState<"jira" | "trello">("jira");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/project-management/test", {
        token,
        domain,
        email: serviceType === "jira" ? email : undefined,
        projectKey,
        serviceType,
        userId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Integration successful",
          description: `${serviceType === "jira" ? "Jira" : "Trello"} integration has been successfully configured`,
          variant: "default",
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "Integration failed",
          description: data.message || `Please check your ${serviceType === "jira" ? "Jira" : "Trello"} credentials and settings`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Integration failed",
        description: error.message || `Please check your ${serviceType === "jira" ? "Jira" : "Trello"} credentials and settings`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !domain) {
      toast({
        title: "Missing information",
        description: `Please provide all required ${serviceType === "jira" ? "Jira" : "Trello"} integration details`,
        variant: "destructive",
      });
      return;
    }
    
    if (serviceType === "jira" && !email) {
      toast({
        title: "Missing information",
        description: "Please provide your Jira email address",
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
          <DialogTitle>Connect Project Management Tool</DialogTitle>
          <DialogDescription>
            Integrate with Jira or Trello to sync tasks and track work progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label>Service Type</Label>
            <RadioGroup 
              value={serviceType} 
              onValueChange={(value) => setServiceType(value as "jira" | "trello")}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jira" id="jira" />
                <Label htmlFor="jira">Jira</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="trello" id="trello" />
                <Label htmlFor="trello">Trello</Label>
              </div>
            </RadioGroup>
          </div>

          {serviceType === "jira" && (
            <div className="grid gap-2">
              <Label htmlFor="jira-email" className="text-left">
                Jira Email Address
              </Label>
              <Input
                id="jira-email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
              <p className="text-xs text-muted-foreground">
                The email address used for your Jira account.
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="domain" className="text-left">
              {serviceType === "jira" ? "Jira Domain" : "Trello Team/Board ID"}
            </Label>
            <Input
              id="domain"
              placeholder={serviceType === "jira" ? "your-company.atlassian.net" : "board-id or team-name"}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {serviceType === "jira" 
                ? "The domain where your Jira instance is hosted." 
                : "The ID of your Trello board or team name."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="token" className="text-left">
              {serviceType === "jira" ? "Jira API Token" : "Trello API Key"}
            </Label>
            <Input
              id="token"
              placeholder={serviceType === "jira" ? "API token..." : "API key..."}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {serviceType === "jira" ? (
                <>
                  Create a token in 
                  <a 
                    href="https://id.atlassian.com/manage/api-tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 text-primary hover:underline"
                  >
                    Atlassian Account Settings
                  </a>
                </>
              ) : (
                <>
                  Get your API key from 
                  <a 
                    href="https://trello.com/app-key" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 text-primary hover:underline"
                  >
                    Trello Developer API Keys
                  </a>
                </>
              )}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-key" className="text-left">
              {serviceType === "jira" ? "Jira Project Key (Optional)" : "Trello Board ID (Optional)"}
            </Label>
            <Input
              id="project-key"
              placeholder={serviceType === "jira" ? "PROJ" : "board-id"}
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to sync all projects. Specify to limit to a single project.
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