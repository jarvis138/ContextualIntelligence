import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BrowserStackIntegrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

export function BrowserStackIntegrationDialog({
  isOpen,
  onClose,
  userId,
  onSuccess
}: BrowserStackIntegrationDialogProps) {
  const [username, setUsername] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/browserstack/test", {
        username,
        accessKey,
        userId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Integration successful",
          description: "BrowserStack integration has been successfully configured",
          variant: "default",
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "Integration failed",
          description: data.message || "Please check your BrowserStack credentials",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Integration failed",
        description: error.message || "Please check your BrowserStack credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !accessKey) {
      toast({
        title: "Missing information",
        description: "Please provide both a BrowserStack username and access key",
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
          <DialogTitle>Connect BrowserStack</DialogTitle>
          <DialogDescription>
            Integrate with BrowserStack to access cross-browser testing insights and results.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="browserstack-username" className="text-left">
              BrowserStack Username
            </Label>
            <Input
              id="browserstack-username"
              placeholder="username@company.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Email address associated with your BrowserStack account.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="browserstack-key" className="text-left">
              Access Key
            </Label>
            <Input
              id="browserstack-key"
              placeholder="Access key..."
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              type="password"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Find your access key in the
              <a 
                href="https://www.browserstack.com/accounts/settings" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 text-primary hover:underline"
              >
                BrowserStack Account Settings
              </a>
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