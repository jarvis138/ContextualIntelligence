import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SiSlack, SiGoogle } from "react-icons/si";
import { BsMicrosoft } from "react-icons/bs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const connectorFormSchema = z.object({
  connectorType: z.enum(["slack", "google_drive", "gmail", "microsoft_graph"]),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }).max(50, {
    message: "Name must not be longer than 50 characters.",
  }),
});

// Schema for direct credential input
const credentialFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  email: z.string().email("Please enter a valid email").optional(),
  workspaceUrl: z.string().optional(),
  tokenName: z.string().min(2, "Token name is required"),
  rememberMe: z.boolean().default(false)
});

type ConnectorFormValues = z.infer<typeof connectorFormSchema>;
type CredentialFormValues = z.infer<typeof credentialFormSchema>;

export function ConnectorDialog({ open, onOpenChange, onSuccess }: ConnectorDialogProps) {
  const [step, setStep] = useState<"select" | "authorize">("select");
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  
  const form = useForm<ConnectorFormValues>({
    resolver: zodResolver(connectorFormSchema),
    defaultValues: {
      connectorType: "slack",
      name: "",
    },
  });
  
  const credentialForm = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialFormSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      workspaceUrl: "",
      tokenName: "",
      rememberMe: false
    },
  });

  // Mutation for creating OAuth authorization URL
  const createAuthUrlMutation = useMutation({
    mutationFn: async (values: ConnectorFormValues) => {
      const res = await apiRequest("POST", "/api/connectors/auth-url", values);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        setAuthUrl(data.authUrl);
        setStep("authorize");
      } else {
        toast({
          title: "Error",
          description: "Failed to generate authorization URL",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for creating credentials directly
  const createDirectCredentialsMutation = useMutation({
    mutationFn: async (values: CredentialFormValues & { connectorType: string, name: string }) => {
      const res = await apiRequest("POST", "/api/connectors/direct-auth", values);
      return await res.json();
    },
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
      toast({
        title: "Success",
        description: "Connector successfully connected with your credentials",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to authenticate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: ConnectorFormValues) {
    createAuthUrlMutation.mutate(values);
  }
  
  function handleCredentialSubmit(values: CredentialFormValues) {
    // Combine credential form values with connector type and name
    const combinedValues = {
      ...values,
      connectorType: form.getValues("connectorType"),
      name: form.getValues("name")
    };
    
    // Submit the credentials directly
    createDirectCredentialsMutation.mutate(combinedValues);
  }
  
  function handleAuthorize() {
    if (authUrl) {
      // Open the authorization URL in a new window
      window.open(authUrl, "auth_window", "width=600,height=700");
      
      // Check for authorization callback
      const checkAuth = setInterval(() => {
        // Check if the API token was created by polling
        fetch("/api/connectors/check-auth")
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              clearInterval(checkAuth);
              onOpenChange(false);
              onSuccess();
              toast({
                title: "Success",
                description: "Connector successfully authorized",
                variant: "default",
              });
            }
          })
          .catch(() => {
            // Ignore errors, just keep polling
          });
      }, 2000);
      
      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(checkAuth);
      }, 5 * 60 * 1000);
    }
  }
  
  function handleReset() {
    setStep("select");
    setAuthUrl(null);
    form.reset();
    credentialForm.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Add Data Connector" : "Authorize Connector"}
          </DialogTitle>
        </DialogHeader>
        
        {step === "select" ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="connectorType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Connector Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="slack" id="slack" />
                          <label
                            htmlFor="slack"
                            className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                          >
                            <SiSlack className="h-4 w-4 text-[#4A154B]" />
                            <span>Slack</span>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="google_drive" id="google_drive" />
                          <label
                            htmlFor="google_drive"
                            className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                          >
                            <SiGoogle className="h-4 w-4 text-[#4285F4]" />
                            <span>Google Drive</span>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="gmail" id="gmail" />
                          <label
                            htmlFor="gmail"
                            className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                          >
                            <SiGoogle className="h-4 w-4 text-[#D14836]" />
                            <span>Gmail</span>
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="microsoft_graph" id="microsoft_graph" />
                          <label
                            htmlFor="microsoft_graph"
                            className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                          >
                            <BsMicrosoft className="h-4 w-4 text-[#0078D4]" />
                            <span>Microsoft Graph</span>
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Workspace" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createAuthUrlMutation.isPending}
                >
                  {createAuthUrlMutation.isPending ? <Spinner className="mr-2" size="sm" /> : null}
                  Next
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="oauth" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth">OAuth Authorization</TabsTrigger>
                <TabsTrigger value="direct">Direct Credentials</TabsTrigger>
              </TabsList>
              
              <TabsContent value="oauth" className="pt-4">
                <div className="text-center py-2">
                  <p className="mb-4">
                    Click the button below to authorize access to your{" "}
                    {form.getValues("connectorType").replace("_", " ")} account.
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    You will be redirected to the service to grant permission.
                  </p>
                  
                  <Button onClick={handleAuthorize} className="w-full">
                    Authorize Connection
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="direct" className="pt-4">
                <Form {...credentialForm}>
                  <form onSubmit={credentialForm.handleSubmit(handleCredentialSubmit)} className="space-y-4">
                    <div className="space-y-4">
                      <FormField
                        control={credentialForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={credentialForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.getValues("connectorType") === "slack" && (
                        <FormField
                          control={credentialForm.control}
                          name="workspaceUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Workspace URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://your-workspace.slack.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {(form.getValues("connectorType") === "google_drive" || 
                        form.getValues("connectorType") === "gmail") && (
                        <FormField
                          control={credentialForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="your-email@gmail.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={credentialForm.control}
                        name="tokenName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Token Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Access Token Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={credentialForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Remember Me</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Save these credentials for future connections
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createDirectCredentialsMutation.isPending}
                      >
                        {createDirectCredentialsMutation.isPending ? (
                          <Spinner className="mr-2" size="sm" />
                        ) : null}
                        Connect
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
            <div className="text-center py-2">
              <Button onClick={handleReset} variant="ghost" size="sm">
                Change connector type
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}