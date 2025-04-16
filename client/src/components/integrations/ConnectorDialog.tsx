import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectorType: string;
  connectorTypes: Array<{ id: string; name: string; icon: string; description: string }>;
  onSuccess: () => void;
}

export default function ConnectorDialog({
  open,
  onOpenChange,
  connectorType,
  connectorTypes,
  onSuccess,
}: ConnectorDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"configure" | "testing" | "success" | "error">("configure");
  const [tokenData, setTokenData] = useState<Record<string, string>>({
    accessToken: "",
    refreshToken: "",
    tokenSecret: "",
    scope: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  // Find the selected connector type
  const selectedConnector = connectorTypes.find((t) => t.id === connectorType);

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/connectors/test", {
        type: connectorType
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setStep("success");
      } else {
        setErrorMessage(data.error || "Failed to connect to service");
        setStep("error");
      }
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to test connection");
      setStep("error");
    }
  });

  // Store token mutation
  const storeTokenMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/connectors/token", {
        ...data,
        connectorType
      });
      return response.json();
    },
    onSuccess: () => {
      setStep("testing");
      testConnectionMutation.mutate();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to store token");
      setStep("error");
    }
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty fields
    const filteredTokenData = Object.entries(tokenData)
      .filter(([_, value]) => value.trim() !== "")
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    storeTokenMutation.mutate(filteredTokenData);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTokenData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle dialog close
  const handleClose = () => {
    if (step === "success") {
      onSuccess();
    }
    
    // Reset state
    setStep("configure");
    setTokenData({
      accessToken: "",
      refreshToken: "",
      tokenSecret: "",
      scope: "",
    });
    setErrorMessage("");
    
    onOpenChange(false);
  };

  // Render configuration form based on connector type
  const renderConfigForm = () => {
    switch (connectorType) {
      case "slack":
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Slack Bot Token</Label>
                <Input
                  id="accessToken"
                  name="accessToken"
                  value={tokenData.accessToken}
                  onChange={handleInputChange}
                  placeholder="xoxb-..."
                  required
                />
                <p className="text-sm text-muted-foreground">
                  This is your Slack Bot User OAuth Token that starts with 'xoxb-'
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scope">Scope (optional)</Label>
                <Input
                  id="scope"
                  name="scope"
                  value={tokenData.scope}
                  onChange={handleInputChange}
                  placeholder="channels:read,chat:write,files:read"
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated list of OAuth scopes granted to your app
                </p>
              </div>
            </div>
            <Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Make sure your Slack app has the necessary OAuth scopes and is installed to your workspace.
              </AlertDescription>
            </Alert>
          </>
        );
      
      case "google_drive":
      case "gmail":
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  name="accessToken"
                  value={tokenData.accessToken}
                  onChange={handleInputChange}
                  placeholder="ya29.a0AVvZVsr..."
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="refreshToken">Refresh Token</Label>
                <Input
                  id="refreshToken"
                  name="refreshToken"
                  value={tokenData.refreshToken}
                  onChange={handleInputChange}
                  placeholder="1//04dX..."
                />
                <p className="text-sm text-muted-foreground">
                  Used to automatically refresh the access token when it expires
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scope">Scope</Label>
                <Input
                  id="scope"
                  name="scope"
                  value={tokenData.scope}
                  onChange={handleInputChange}
                  placeholder="https://www.googleapis.com/auth/drive.readonly"
                />
              </div>
            </div>
            <Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Make sure you've authorized the application with the correct scopes in the Google Cloud Console.
              </AlertDescription>
            </Alert>
          </>
        );
      
      case "microsoft_graph":
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  name="accessToken"
                  value={tokenData.accessToken}
                  onChange={handleInputChange}
                  placeholder="eyJ0eXAiOiJKV1QiLCJub..."
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="refreshToken">Refresh Token</Label>
                <Input
                  id="refreshToken"
                  name="refreshToken"
                  value={tokenData.refreshToken}
                  onChange={handleInputChange}
                  placeholder="0.AR8A8lVO-..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scope">Scope</Label>
                <Input
                  id="scope"
                  name="scope"
                  value={tokenData.scope}
                  onChange={handleInputChange}
                  placeholder="User.Read Files.Read Mail.Read"
                />
              </div>
            </div>
            <Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Ensure your Microsoft application has the appropriate permissions in the Azure portal.
              </AlertDescription>
            </Alert>
          </>
        );
      
      default:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                name="accessToken"
                value={tokenData.accessToken}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="refreshToken">Refresh Token (optional)</Label>
              <Input
                id="refreshToken"
                name="refreshToken"
                value={tokenData.refreshToken}
                onChange={handleInputChange}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === "configure" ? (
              `Configure ${selectedConnector?.name || connectorType} Connection`
            ) : step === "testing" ? (
              "Testing Connection"
            ) : step === "success" ? (
              "Connection Successful"
            ) : (
              "Connection Error"
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "configure"
              ? `Enter your ${selectedConnector?.name || connectorType} API credentials to connect.`
              : step === "testing"
              ? "Please wait while we test your connection..."
              : step === "success"
              ? "Your connection has been successfully configured."
              : "There was an error configuring your connection."}
          </DialogDescription>
        </DialogHeader>

        {step === "configure" ? (
          <form onSubmit={handleSubmit}>
            {renderConfigForm()}
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={storeTokenMutation.isPending}>
                {storeTokenMutation.isPending ? "Saving..." : "Save & Test"}
              </Button>
            </DialogFooter>
          </form>
        ) : step === "testing" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size="lg" />
            <p className="mt-4 text-center text-muted-foreground">
              Testing connection to {selectedConnector?.name || connectorType}...
            </p>
          </div>
        ) : step === "success" ? (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-green-800 font-medium">Connection Successful</h4>
                  <p className="text-green-700 text-sm">
                    Your {selectedConnector?.name || connectorType} connection has been verified and is working correctly.
                  </p>
                </div>
              </div>
            </Card>
            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage || "There was an error testing your connection."}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("configure")}>
                Try Again
              </Button>
              <Button variant="destructive" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}