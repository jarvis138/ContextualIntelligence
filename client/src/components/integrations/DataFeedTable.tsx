import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Trash } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface FetchedData {
  dataId: string;
  connectorType: string;
  dataType: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, any>;
  fetchedAt: string;
}

interface DataFeedTableProps {
  data: FetchedData[];
  isLoading: boolean;
}

export function DataFeedTable({ data, isLoading }: DataFeedTableProps) {
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedData, setSelectedData] = useState<FetchedData | null>(null);
  
  const deleteMutation = useMutation({
    mutationFn: async (dataId: string) => {
      await apiRequest("DELETE", `/api/connectors/data/${dataId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors/data"] });
      toast({
        title: "Data deleted",
        description: "The data was successfully deleted",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete data",
        variant: "destructive",
      });
    },
  });
  
  const handleViewData = (data: FetchedData) => {
    setSelectedData(data);
    setShowPreviewDialog(true);
  };
  
  const handleDeleteData = (dataId: string) => {
    if (confirm("Are you sure you want to delete this data?")) {
      deleteMutation.mutate(dataId);
    }
  };
  
  // Helper functions
  const getConnectorLabel = (type: string) => {
    switch (type) {
      case "slack":
        return "Slack";
      case "google_drive":
        return "Google Drive";
      case "gmail":
        return "Gmail";
      case "microsoft_graph":
        return "Microsoft Graph";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };
  
  const getDataTypeLabel = (type: string) => {
    switch (type) {
      case "message":
        return "Message";
      case "file":
        return "File";
      case "email":
        return "Email";
      case "document":
        return "Document";
      case "channel":
        return "Channel";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    }
  };

  const formatContentPreview = (content: string | null | undefined) => {
    if (!content) return "No content";
    return content.length > 100 ? content.substring(0, 100) + "..." : content;
  };

  const renderPreviewContent = (data: FetchedData) => {
    // If it's JSON content, pretty print it
    if (data.content && (data.content.startsWith("{") || data.content.startsWith("["))) {
      try {
        const jsonContent = JSON.parse(data.content);
        return <pre className="whitespace-pre-wrap overflow-auto text-sm">{JSON.stringify(jsonContent, null, 2)}</pre>;
      } catch {
        // If parsing fails, display as regular text
        return <p className="whitespace-pre-wrap">{data.content}</p>;
      }
    }
    
    return <p className="whitespace-pre-wrap">{data.content || "No content available"}</p>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-6 border rounded-md">
        <p className="text-muted-foreground">No data has been fetched yet.</p>
        <p className="text-muted-foreground mt-1">Create a fetching job to start collecting data.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Preview</TableHead>
            <TableHead>Fetched</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.dataId}>
              <TableCell className="font-medium">{item.title || "Untitled"}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getDataTypeLabel(item.dataType)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className="bg-secondary text-secondary-foreground">
                  {getConnectorLabel(item.connectorType)}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {formatContentPreview(item.content)}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(item.fetchedAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewData(item)}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteData(item.dataId)}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{selectedData?.title || "Untitled"}</DialogTitle>
            <DialogDescription>
              {getConnectorLabel(selectedData?.connectorType || "")} • {getDataTypeLabel(selectedData?.dataType || "")} • Fetched {selectedData ? formatDistanceToNow(new Date(selectedData.fetchedAt), { addSuffix: true }) : ""}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] mt-4 border rounded-md p-4">
            {selectedData && renderPreviewContent(selectedData)}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}