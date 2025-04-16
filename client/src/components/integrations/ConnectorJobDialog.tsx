import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConnectorJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectorType: string;
  connectorName: string;
  onSuccess: () => void;
}

const jobFormSchema = z.object({
  dataType: z.string().min(1, {
    message: "Please select a data type.",
  }),
  scheduleType: z.enum(["once", "interval", "cron"]),
  scheduleValue: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

export function ConnectorJobDialog({
  open,
  onOpenChange,
  connectorType,
  connectorName,
  onSuccess,
}: ConnectorJobDialogProps) {
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      dataType: "",
      scheduleType: "once",
      scheduleValue: "",
      priority: "normal",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (values: JobFormValues) => {
      const res = await apiRequest("POST", `/api/connectors/${connectorType}/jobs`, {
        ...values,
      });
      return await res.json();
    },
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
      toast({
        title: "Job created",
        description: "The fetching job has been created successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: JobFormValues) {
    createJobMutation.mutate(values);
  }

  // Get data type options based on connector type
  const getDataTypeOptions = () => {
    switch (connectorType) {
      case "slack":
        return [
          { value: "messages", label: "Messages" },
          { value: "channels", label: "Channels" },
          { value: "users", label: "Users" },
        ];
      case "google_drive":
        return [
          { value: "files", label: "Files" },
          { value: "folders", label: "Folders" },
          { value: "comments", label: "Comments" },
        ];
      case "gmail":
        return [
          { value: "messages", label: "Messages" },
          { value: "threads", label: "Threads" },
          { value: "labels", label: "Labels" },
        ];
      case "microsoft_graph":
        return [
          { value: "files", label: "Files" },
          { value: "messages", label: "Messages" },
          { value: "users", label: "Users" },
          { value: "events", label: "Events" },
        ];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Fetching Job for {connectorName}</DialogTitle>
          <DialogDescription>
            Configure what data to fetch and how often.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="dataType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select what data to fetch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getDataTypeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Schedule Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="once" id="once" />
                        <label
                          htmlFor="once"
                          className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                        >
                          <span>One-time run</span>
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="interval" id="interval" />
                        <label
                          htmlFor="interval"
                          className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                        >
                          <span>Interval</span>
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cron" id="cron" />
                        <label
                          htmlFor="cron"
                          className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                        >
                          <span>Cron Schedule</span>
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("scheduleType") !== "once" && (
              <FormField
                control={form.control}
                name="scheduleValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch("scheduleType") === "interval"
                        ? "Interval (minutes)"
                        : "Cron Expression"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={form.watch("scheduleType") === "interval" ? "30" : "*/30 * * * *"}
                      />
                    </FormControl>
                    <FormDescription>
                      {form.watch("scheduleType") === "interval" 
                        ? "How often to fetch data in minutes." 
                        : "Standard cron expression format."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="low" />
                        <label htmlFor="low" className="text-sm font-medium cursor-pointer">
                          Low
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="normal" id="normal" />
                        <label htmlFor="normal" className="text-sm font-medium cursor-pointer">
                          Normal
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="high" />
                        <label htmlFor="high" className="text-sm font-medium cursor-pointer">
                          High
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createJobMutation.isPending}
              >
                {createJobMutation.isPending ? <Spinner className="mr-2" size="sm" /> : null}
                Create Job
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}