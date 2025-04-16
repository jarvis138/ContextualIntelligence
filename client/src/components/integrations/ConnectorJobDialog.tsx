import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/queryClient";

interface ConnectorJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectorType: string;
  connectorTypes: Array<{ id: string; name: string; icon: string; description: string }>;
  onSuccess: () => void;
}

export default function ConnectorJobDialog({
  open,
  onOpenChange,
  connectorType,
  connectorTypes,
  onSuccess,
}: ConnectorJobDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"configure" | "creating" | "success" | "error">("configure");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Job configuration state
  const [jobConfig, setJobConfig] = useState({
    dataType: "",
    scheduleType: "once",
    scheduleValue: "",
    parameters: "{}",
    priority: "normal",
  });

  // Find the selected connector type
  const selectedConnector = connectorTypes.find((t) => t.id === connectorType);

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/connectors/jobs", {
        ...data,
        connectorType,
        parameters: JSON.parse(data.parameters)
      });
      return response.json();
    },
    onSuccess: () => {
      setStep("success");
      setTimeout(() => {
        handleClose(true);
      }, 2000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to create job");
      setStep("error");
    }
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("creating");

    try {
      // Validate JSON parameters
      JSON.parse(jobConfig.parameters);
      
      // Convert parameters to proper format
      createJobMutation.mutate(jobConfig);
    } catch (error) {
      setErrorMessage("Invalid JSON in parameters field");
      setStep("error");
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJobConfig((prev) => ({ ...prev, [name]: value }));
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setJobConfig((prev) => ({ ...prev, [name]: value }));
  };

  // Handle dialog close
  const handleClose = (success = false) => {
    if (success) {
      onSuccess();
    }
    
    // Reset state
    setStep("configure");
    setJobConfig({
      dataType: "",
      scheduleType: "once",
      scheduleValue: "",
      parameters: "{}",
      priority: "normal",
    });
    setErrorMessage("");
    
    onOpenChange(false);
  };

  // Get data type options based on connector type
  const getDataTypeOptions = () => {
    switch (connectorType) {
      case "slack":
        return [
          { value: "channels", label: "Channels" },
          { value: "messages", label: "Messages" },
          { value: "users", label: "Users" },
          { value: "files", label: "Files" }
        ];
      case "google_drive":
        return [
          { value: "files", label: "Files" },
          { value: "folders", label: "Folders" },
          { value: "comments", label: "Comments" },
          { value: "activity", label: "Activity" }
        ];
      case "gmail":
        return [
          { value: "messages", label: "Emails" },
          { value: "attachments", label: "Attachments" },
          { value: "labels", label: "Labels" },
          { value: "threads", label: "Threads" }
        ];
      case "microsoft_graph":
        return [
          { value: "emails", label: "Emails" },
          { value: "files", label: "Files" },
          { value: "events", label: "Calendar Events" },
          { value: "contacts", label: "Contacts" },
          { value: "notes", label: "Notes" }
        ];
      default:
        return [
          { value: "all", label: "All Data" }
        ];
    }
  };

  // Get parameter template based on data type
  const getParameterTemplate = () => {
    if (!jobConfig.dataType) return "{}";

    switch (connectorType) {
      case "slack":
        if (jobConfig.dataType === "messages") {
          return JSON.stringify({
            channelId: "C12345678",
            limit: 100,
            oldest: "2024-01-01"
          }, null, 2);
        } else if (jobConfig.dataType === "files") {
          return JSON.stringify({
            types: "all",
            count: 50
          }, null, 2);
        }
        break;
      case "google_drive":
        if (jobConfig.dataType === "files") {
          return JSON.stringify({
            folderId: "optional-folder-id",
            pageSize: 100,
            orderBy: "modifiedTime desc",
            mimeTypes: ["application/pdf", "application/vnd.google-apps.document"]
          }, null, 2);
        }
        break;
      case "gmail":
        if (jobConfig.dataType === "messages") {
          return JSON.stringify({
            maxResults: 50,
            labelIds: ["INBOX"],
            q: "is:unread"
          }, null, 2);
        }
        break;
      case "microsoft_graph":
        if (jobConfig.dataType === "emails") {
          return JSON.stringify({
            folder: "inbox",
            top: 50,
            filter: "receivedDateTime ge 2023-01-01T00:00:00Z"
          }, null, 2);
        }
        break;
    }
    
    return "{}";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {step === "configure" ? (
              `Create ${selectedConnector?.name || connectorType} Data Fetching Job`
            ) : step === "creating" ? (
              "Creating Job"
            ) : step === "success" ? (
              "Job Created Successfully"
            ) : (
              "Error Creating Job"
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "configure"
              ? `Configure a job to fetch data from ${selectedConnector?.name || connectorType}.`
              : step === "creating"
              ? "Please wait while we create your job..."
              : step === "success"
              ? "Your data fetching job has been created and scheduled."
              : "There was an error creating your job."}
          </DialogDescription>
        </DialogHeader>

        {step === "configure" ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="dataType">Data Type</Label>
                <Select
                  value={jobConfig.dataType}
                  onValueChange={(value) => {
                    handleSelectChange("dataType", value);
                    // Update parameters template when data type changes
                    setJobConfig(prev => ({
                      ...prev,
                      dataType: value,
                      parameters: getParameterTemplate()
                    }));
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type to fetch" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDataTypeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select the type of data you want to fetch from {selectedConnector?.name || connectorType}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduleType">Schedule Type</Label>
                <Select
                  value={jobConfig.scheduleType}
                  onValueChange={(value) => handleSelectChange("scheduleType", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="interval">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {jobConfig.scheduleType === "interval" && (
                <div className="space-y-2">
                  <Label htmlFor="scheduleValue">Interval (minutes)</Label>
                  <Input
                    id="scheduleValue"
                    name="scheduleValue"
                    type="number"
                    min="5"
                    value={jobConfig.scheduleValue}
                    onChange={handleInputChange}
                    placeholder="e.g., 60 for hourly"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    How often to run this job (in minutes)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={jobConfig.priority}
                  onValueChange={(value) => handleSelectChange("priority", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Higher priority jobs are executed first
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parameters">Parameters (JSON)</Label>
                <textarea
                  id="parameters"
                  name="parameters"
                  value={jobConfig.parameters}
                  onChange={handleInputChange}
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder='{}'
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Additional parameters in JSON format for the data fetching operation
                </p>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => handleClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={createJobMutation.isPending || !jobConfig.dataType}>
                {createJobMutation.isPending ? "Creating..." : "Create Job"}
              </Button>
            </DialogFooter>
          </form>
        ) : step === "creating" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size="lg" />
            <p className="mt-4 text-center text-muted-foreground">
              Creating and scheduling your data fetching job...
            </p>
          </div>
        ) : step === "success" ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6 text-green-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-green-800">Job Created Successfully</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your job has been created and scheduled according to your preferences.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage || "There was an error creating your job."}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("configure")}>
                Try Again
              </Button>
              <Button variant="destructive" onClick={() => handleClose()}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}