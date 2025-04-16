import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle,
  Calendar, 
  Download, 
  Eye, 
  FileDown, 
  Loader2, 
  RefreshCcw, 
  Search, 
  SlidersHorizontal, 
  User 
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Action badge component
const ActionBadge = ({ action }: { action: string }) => {
  const getBadgeVariant = () => {
    switch (action) {
      case "create":
        return "default";
      case "update":
        return "secondary";
      case "delete":
        return "destructive";
      case "login":
      case "logout":
        return "outline";
      case "export":
      case "import":
        return "default";
      case "admin_action":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Badge variant={getBadgeVariant()} className="capitalize">
      {action.replace('_', ' ')}
    </Badge>
  );
};

// Format date in a user-friendly way
const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  
  const date = new Date(dateString);
  const now = new Date();
  
  // For today, show time only
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // For yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // For dates within the last week
  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // For older dates
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) + 
         ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const AuditLogsPanel = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    action: "",
    user: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
    entityType: "",
  });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Fetch audit logs data
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "/admin-api/audit-logs", 
      page, 
      itemsPerPage, 
      filters.action, 
      filters.user, 
      filters.startDate, 
      filters.endDate, 
      filters.entityType
    ],
  });

  const auditLogs = data?.logs || [];
  const totalLogs = data?.total || 0;
  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    
    // Reset to first page when filters change
    setPage(1);
  };

  // Handle exporting logs
  const handleExportLogs = async () => {
    try {
      toast({
        title: "Exporting logs",
        description: "Your logs are being prepared for export.",
      });
      
      // In a real implementation, this would download a file
      setTimeout(() => {
        toast({
          title: "Logs exported",
          description: "Audit logs have been exported successfully.",
        });
      }, 1500);
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast({
        title: "Export failed",
        description: "Failed to export audit logs. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter logs based on search query
  const filteredLogs = auditLogs.filter((log: any) => {
    if (!searchQuery) return true;
    
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const logData = `${log.user?.username || ""} ${log.action} ${log.description} ${log.entityType || ""}`.toLowerCase();
    
    return searchTerms.every((term) => logData.includes(term));
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>Track all system activities and user actions</CardDescription>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportLogs}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-full sm:w-[300px]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                    {Object.values(filters).some(value => value !== "" && value !== null) && (
                      <Badge variant="secondary" className="ml-2 px-1 py-0">
                        {Object.values(filters).filter(value => value !== "" && value !== null).length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Filter Logs</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="filter-action">Action Type</Label>
                      <Select
                        value={filters.action}
                        onValueChange={(value) => handleFilterChange("action", value)}
                      >
                        <SelectTrigger id="filter-action">
                          <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All actions</SelectItem>
                          <SelectItem value="create">Create</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="delete">Delete</SelectItem>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="login">Login</SelectItem>
                          <SelectItem value="logout">Logout</SelectItem>
                          <SelectItem value="export">Export</SelectItem>
                          <SelectItem value="import">Import</SelectItem>
                          <SelectItem value="share">Share</SelectItem>
                          <SelectItem value="invite">Invite</SelectItem>
                          <SelectItem value="admin_action">Admin Action</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="filter-entity">Entity Type</Label>
                      <Select
                        value={filters.entityType}
                        onValueChange={(value) => handleFilterChange("entityType", value)}
                      >
                        <SelectTrigger id="filter-entity">
                          <SelectValue placeholder="All entities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All entities</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="team">Team</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="organization">Organization</SelectItem>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                          <SelectItem value="setting">Setting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {filters.startDate ? (
                                filters.startDate.toLocaleDateString()
                              ) : (
                                <span>Start date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={filters.startDate}
                              onSelect={(date) => handleFilterChange("startDate", date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {filters.endDate ? (
                                filters.endDate.toLocaleDateString()
                              ) : (
                                <span>End date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={filters.endDate}
                              onSelect={(date) => handleFilterChange("endDate", date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setFilters({
                            action: "",
                            user: "",
                            startDate: null,
                            endDate: null,
                            entityType: "",
                          });
                        }}
                      >
                        Reset filters
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          // Apply filters and close popover
                          document.body.click(); // Close popover
                        }}
                      >
                        Apply filters
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setPage(1); // Reset to first page when changing items per page
                }}
              >
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {Object.values(filters).some(value => value !== "" && value !== null) && (
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters applied</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 ml-auto"
                onClick={() => {
                  setFilters({
                    action: "",
                    user: "",
                    startDate: null,
                    endDate: null,
                    entityType: "",
                  });
                }}
              >
                Clear all
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              Error loading audit logs. Please try again.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[40%]">Description</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        {searchQuery || Object.values(filters).some(value => value !== "" && value !== null)
                          ? "No logs match your search or filter criteria."
                          : "No audit logs found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{log.user?.username || "System"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.description}
                        </TableCell>
                        <TableCell className="capitalize">
                          {log.entityType || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px]">
                              <div className="space-y-2">
                                <h4 className="font-medium">Audit Log Details</h4>
                                <Accordion type="single" collapsible className="w-full">
                                  <AccordionItem value="metadata">
                                    <AccordionTrigger>Metadata</AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">ID:</span>
                                          <span>{log.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Timestamp:</span>
                                          <span>{new Date(log.timestamp).toISOString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">IP Address:</span>
                                          <span>{log.ipAddress || "—"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">User Agent:</span>
                                          <span className="truncate max-w-[250px]">{log.userAgent || "—"}</span>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                  <AccordionItem value="entity">
                                    <AccordionTrigger>Entity Information</AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Entity Type:</span>
                                          <span className="capitalize">{log.entityType || "—"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Entity ID:</span>
                                          <span>{log.entityId || "—"}</span>
                                        </div>
                                        {log.entityName && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Entity Name:</span>
                                            <span>{log.entityName}</span>
                                          </div>
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                  {log.changes && (
                                    <AccordionItem value="changes">
                                      <AccordionTrigger>Changes</AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-2 text-sm">
                                          {Object.entries(log.changes).map(([key, value]: [string, any]) => (
                                            <div key={key} className="space-y-1">
                                              <div className="font-medium">{key}</div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-muted p-1 rounded text-xs overflow-auto">
                                                  {JSON.stringify(value.from, null, 2) || "null"}
                                                </div>
                                                <div className="bg-muted p-1 rounded text-xs overflow-auto">
                                                  {JSON.stringify(value.to, null, 2) || "null"}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                          {(!log.changes || Object.keys(log.changes).length === 0) && (
                                            <div className="text-muted-foreground">No changes recorded</div>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  )}
                                </Accordion>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {!isLoading && !isError && totalPages > 1 && (
            <div className="flex items-center justify-between py-2">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, totalLogs)} of {totalLogs} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" onClick={handleExportLogs}>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuditLogsPanel;