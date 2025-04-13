import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Integration } from "@shared/schema";
import { Loader2 } from "lucide-react";

const openAIIntegrationSchema = z.object({
  apiKey: z.string().min(1, { message: "API key is required" }),
  name: z.string().default("OpenAI Integration"),
  type: z.literal("openai"),
});

type OpenAIIntegrationFormValues = z.infer<typeof openAIIntegrationSchema>;

interface OpenAIIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
}

export function OpenAIIntegrationDialog({ open, onOpenChange, userId }: OpenAIIntegrationDialogProps) {
  const [integrationStatus, setIntegrationStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OpenAIIntegrationFormValues>({
    resolver: zodResolver(openAIIntegrationSchema),
    defaultValues: {
      apiKey: "",
      name: "OpenAI Integration",
      type: "openai",
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (formData: OpenAIIntegrationFormValues) => {
      const response = await apiRequest("POST", "/api/integrations", {
        ...formData,
        userId,
        config: {
          apiKey: formData.apiKey,
        },
      });
      return await response.json() as Integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/integrations`] });
      toast({
        title: "Integration successful",
        description: "OpenAI has been successfully integrated!",
      });
      setIntegrationStatus("success");
      // Close the dialog after a brief delay to show success state
      setTimeout(() => onOpenChange(false), 1500);
    },
    onError: (error) => {
      console.error("Integration error:", error);
      toast({
        title: "Integration failed",
        description: error.message || "Please check your API key and try again.",
        variant: "destructive",
      });
      setIntegrationStatus("error");
    },
  });

  // Testing OpenAI integration with a simple call
  const testOpenAIIntegration = useMutation({
    mutationFn: async (apiKey: string) => {
      const response = await apiRequest("POST", "/api/openai/test", { apiKey });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to validate API key");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        // If the test was successful, proceed to create the integration
        createIntegrationMutation.mutate(form.getValues());
      } else {
        setIntegrationStatus("error");
        toast({
          title: "Validation failed",
          description: data.message || "Please check your API key and try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      setIntegrationStatus("error");
      toast({
        title: "Validation failed",
        description: error.message || "Please check your API key and try again.",
        variant: "destructive",
      });
    },
  });

  async function onSubmit(values: OpenAIIntegrationFormValues) {
    setIntegrationStatus("testing");
    
    // First test the API key validity
    testOpenAIIntegration.mutate(values.apiKey);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Integrate with OpenAI</DialogTitle>
          <DialogDescription>
            Add your OpenAI API key to enable AI-powered features like document analysis, 
            summarization, and insights generation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OpenAI API Key</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="sk-..." 
                      type="password" 
                      autoComplete="off"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Your API key will be encrypted and stored securely.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={integrationStatus === "testing" || integrationStatus === "success"}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={integrationStatus === "testing" || integrationStatus === "success"}
              >
                {integrationStatus === "testing" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {integrationStatus === "testing" ? "Validating..." : 
                 integrationStatus === "success" ? "Connected!" : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}