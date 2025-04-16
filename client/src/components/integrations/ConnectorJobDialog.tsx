import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  connectorType: z.string(),
  dataType: z.string(),
  scheduleType: z.enum(["once", "interval", "cron"]),
  scheduleValue: z.string().optional().nullable(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  parameters: z.record(z.any()).default({})
});

type JobFormValues = z.infer<typeof jobFormSchema>;

export function ConnectorJobDialog({ 
  open, 
  onOpenChange, 
  connectorType,
  connectorName,
  onSuccess 
}: ConnectorJobDialogProps) {
  const [availableDataTypes, setAvailableDataTypes] = useState<string[]>([]);
  const [isLoadingDataTypes, setIsLoadingDataTypes] = useState(false);
  
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      connectorType: connectorType,
      dataType: "",
      scheduleType: "once",
      scheduleValue: null,
      priority: "normal",
      parameters: {}
    },
  });
  
  // Set the connector type whenever it changes
  useEffect(() => {
    form.setValue("connectorType", connectorType);
  }, [connectorType, form]);
  
  // Fetch available data types for this connector
  useEffect(() => {
    if (open && connectorType) {
      setIsLoadingDataTypes(true);
      fetch(`/api/connectors/data-types?type=${connectorType}`)
        .then(res => res.json())
        .then(data => {
          if (data.dataTypes && Array.isArray(data.dataTypes)) {
            setAvailableDataTypes(data.dataTypes);
            if (data.dataTypes.length > 0) {
              form.setValue("dataType", data.dataTypes[0]);
            }
          }
        })
        .catch(err => {
          console.error("Failed to fetch data types:", err);
          toast({
            title: "Error",
            description: "Failed to fetch available data types",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoadingDataTypes(false);
        });
    }
  }, [open, connectorType, form]);
  
  const createJobMutation = useMutation({
    mutationFn: async (values: JobFormValues) => {
      const res = await apiRequest("POST", "/api/connectors/jobs", values);
      return await res.json();
    },
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
      toast({
        title: "Job Created",
        description: "The fetching job was successfully created",
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
    // Handle schedule value based on schedule type
    let scheduleValue = null;
    if (values.scheduleType === "interval" && values.scheduleValue) {
      scheduleValue = values.scheduleValue;
    } else if (values.scheduleType === "cron" && values.scheduleValue) {
      scheduleValue = values.scheduleValue;
    }
    
    createJobMutation.mutate({
      ...values,
      scheduleValue,
    });
  }

  // Show selected schedule field based on schedule type
  const scheduleType = form.watch("scheduleType");
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Fetching Job for {connectorName}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="dataType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Type</FormLabel>
                  {isLoadingDataTypes ? (
                    <div className="flex items-center gap-2 h-10">
                      <Spinner size="sm" />
                      <span className="text-sm text-muted-foreground">Loading data types...</span>
                    </div>
                  ) : (
                    <>
                      <Select
                        disabled={availableDataTypes.length === 0}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a data type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableDataTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableDataTypes.length === 0 && (
                        <FormDescription className="text-destructive">
                          No data types available for this connector
                        </FormDescription>
                      )}
                    </>
                  )}
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
                        <label htmlFor="once" className="text-sm font-medium">
                          One-time (run immediately)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="interval" id="interval" />
                        <label htmlFor="interval" className="text-sm font-medium">
                          Interval (run at regular intervals)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cron" id="cron" />
                        <label htmlFor="cron" className="text-sm font-medium">
                          Cron (custom schedule)
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {scheduleType === "interval" && (
              <FormField
                control={form.control}
                name="scheduleValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="5"
                        placeholder="e.g. 30"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum interval is 5 minutes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {scheduleType === "cron" && (
              <FormField
                control={form.control}
                name="scheduleValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cron Expression</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 0 9 * * 1-5"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Format: minute hour day-of-month month day-of-week
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
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
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
                disabled={createJobMutation.isPending || availableDataTypes.length === 0}
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