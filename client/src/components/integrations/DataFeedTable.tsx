import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { SiSlack, SiGoogle } from "react-icons/si";
import { BsMicrosoft } from "react-icons/bs";
import { FetchedData } from "@/pages/connectors-page";

interface DataFeedTableProps {
  data: FetchedData[];
  isLoading: boolean;
}

export function DataFeedTable({ data, isLoading }: DataFeedTableProps) {
  // Helper function to get connector icon
  const getConnectorIcon = (type: string) => {
    switch (type) {
      case "slack":
        return <SiSlack className="h-4 w-4 text-[#4A154B]" />;
      case "google_drive":
      case "gmail":
        return <SiGoogle className="h-4 w-4 text-[#4285F4]" />;
      case "microsoft_graph":
        return <BsMicrosoft className="h-4 w-4 text-[#0078D4]" />;
      default:
        return null;
    }
  };

  // Helper function to get connector name
  const getConnectorName = (type: string) => {
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
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    }
  };

  // Helper function to format data type
  const formatDataType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
        <p className="text-muted-foreground mt-1">
          Create a fetching job to start collecting data.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Fetched</TableHead>
            <TableHead>Job ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.dataId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getConnectorIcon(item.connectorType)}
                  <span>{getConnectorName(item.connectorType)}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{formatDataType(item.dataType)}</Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {item.title || item.sourceId}
              </TableCell>
              <TableCell>
                {format(new Date(item.fetchedAt), "MMM d, yyyy HH:mm")}
              </TableCell>
              <TableCell>
                {item.jobId ? (
                  <span className="text-xs text-muted-foreground font-mono">
                    {item.jobId.substring(0, 8)}...
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Manual</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}