import { useState } from "react";
import { FetchedData } from "@/pages/connectors-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, ExternalLink, FileText, Info, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DataFeedTableProps {
  data: FetchedData[];
  connectorTypes: Array<{ id: string; name: string; icon: string; description: string }>;
}

export default function DataFeedTable({ data, connectorTypes }: DataFeedTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [detailItem, setDetailItem] = useState<FetchedData | null>(null);

  // Get connector name from type
  const getConnectorName = (type: string) => {
    const connector = connectorTypes.find(t => t.id === type);
    return connector ? connector.name : type;
  };

  // Filter data based on search term
  const filteredData = searchTerm 
    ? data.filter(item => 
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase())) || 
        item.dataType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.connectorType.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data;

  // Format data type for display
  const formatDataType = (dataType: string) => {
    return dataType
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get a color for the connector type
  const getConnectorColor = (type: string) => {
    switch (type) {
      case "slack":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "google_drive":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "gmail":
        return "bg-red-50 text-red-700 border-red-200";
      case "microsoft_graph":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fetched Data</CardTitle>
            <CardDescription>
              Data collected from your connected external sources
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-56 h-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Fetched</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.dataId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{truncateText(item.title || "Untitled", 40)}</p>
                      <p className="text-sm text-muted-foreground">
                        {truncateText(item.content || "", 60)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatDataType(item.dataType)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getConnectorColor(item.connectorType)}>
                      {getConnectorName(item.connectorType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                      {formatDate(item.fetchedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailItem(item)}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{detailItem?.title || "Untitled Item"}</DialogTitle>
            <DialogDescription>
              Item details from {detailItem && getConnectorName(detailItem.connectorType)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4 max-h-[500px] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Data Type</p>
                <Badge variant="outline" className="mt-1">
                  {detailItem && formatDataType(detailItem.dataType)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <Badge 
                  className={`mt-1 ${detailItem && getConnectorColor(detailItem.connectorType)}`}
                >
                  {detailItem && getConnectorName(detailItem.connectorType)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fetched At</p>
                <p className="text-sm font-medium mt-1">
                  {detailItem && formatDate(detailItem.fetchedAt)}
                </p>
              </div>
            </div>

            {detailItem?.sourceUrl && (
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">Source URL:</p>
                <a 
                  href={detailItem.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center"
                >
                  {truncateText(detailItem.sourceUrl, 50)}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}

            {detailItem?.sourceId && (
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">Source ID:</p>
                <p className="text-sm font-mono">{detailItem.sourceId}</p>
              </div>
            )}

            {detailItem?.content && (
              <div className="pt-2">
                <p className="text-sm font-medium mb-1 flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  Content
                </p>
                <div className="bg-muted/50 p-4 rounded-md overflow-auto max-h-60">
                  <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                    {detailItem.content}
                  </pre>
                </div>
              </div>
            )}

            {detailItem?.metadata && (
              <div className="pt-2">
                <p className="text-sm font-medium mb-1 flex items-center">
                  <Info className="h-4 w-4 mr-1" />
                  Metadata
                </p>
                <div className="bg-muted/50 p-4 rounded-md overflow-auto max-h-60">
                  <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                    {JSON.stringify(detailItem.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setDetailItem(null)} variant="outline">
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}