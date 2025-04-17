import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  Database,
  RefreshCw,
  Download,
  Calendar,
  User,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { DatePicker } from '@/components/ui/date-picker';

// Audit log type from server
interface AuditLog {
  id: number;
  userId: number;
  tenantId?: number;
  action: string;
  category: string;
  severity: string;
  resourceType: string;
  resourceId?: string;
  description?: string;
  timestamp: string;
  success?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

// Filter options
interface AuditLogFilters {
  category?: string;
  severity?: string;
  fromDate?: Date;
  toDate?: Date;
  userId?: number;
  tenantId?: number;
  resourceType?: string;
  search?: string;
  success?: boolean;
}

export default function AuditLogsPanel() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<AuditLogFilters>({});

  // Fetch audit logs with filters
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/admin/audit-logs', page, pageSize, filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(filters.category && { category: filters.category }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.fromDate && { fromDate: filters.fromDate.toISOString() }),
        ...(filters.toDate && { toDate: filters.toDate.toISOString() }),
        ...(filters.userId && { userId: filters.userId.toString() }),
        ...(filters.tenantId && { tenantId: filters.tenantId.toString() }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.search && { search: filters.search }),
        ...(filters.success !== undefined && { success: filters.success.toString() }),
      });
      
      return apiRequest(`/api/admin/audit-logs?${queryParams.toString()}`);
    },
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Handle export to CSV
  const exportToCSV = async () => {
    try {
      const queryParams = new URLSearchParams({
        format: 'csv',
        ...(filters.category && { category: filters.category }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.fromDate && { fromDate: filters.fromDate.toISOString() }),
        ...(filters.toDate && { toDate: filters.toDate.toISOString() }),
        ...(filters.userId && { userId: filters.userId.toString() }),
        ...(filters.tenantId && { tenantId: filters.tenantId.toString() }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.search && { search: filters.search }),
        ...(filters.success !== undefined && { success: filters.success.toString() }),
      });
      
      // Request CSV data
      const response = await fetch(`/api/admin/audit-logs/export?${queryParams.toString()}`);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export audit logs', error);
    }
  };

  // Generate severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Critical
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge variant="warning" className="flex items-center gap-1 bg-yellow-500 text-white hover:bg-yellow-600">
            <AlertTriangle className="h-3 w-3" />
            Warning
          </Badge>
        );
      case 'INFO':
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Info
          </Badge>
        );
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date);
  };

  // Generate status badge
  const getStatusBadge = (success?: boolean) => {
    if (success === undefined) return null;
    
    return success ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Success
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        Failed
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Security Audit Logs</CardTitle>
        <CardDescription>
          View and analyze security events across the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-auto">
              <Label htmlFor="search" className="mb-1">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search logs..."
                  className="pl-8"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <Label htmlFor="category" className="mb-1">Category</Label>
              <Select
                value={filters.category || ''}
                onValueChange={(value) => handleFilterChange('category', value || undefined)}
              >
                <SelectTrigger id="category" className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="AUTH">Authentication</SelectItem>
                  <SelectItem value="DATA_ACCESS">Data Access</SelectItem>
                  <SelectItem value="DATA_MODIFICATION">Data Modification</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="SECURITY">Security</SelectItem>
                  <SelectItem value="USER_MANAGEMENT">User Management</SelectItem>
                  <SelectItem value="CONFIG">Configuration</SelectItem>
                  <SelectItem value="INTEGRATION">Integration</SelectItem>
                  <SelectItem value="TENANT">Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto">
              <Label htmlFor="severity" className="mb-1">Severity</Label>
              <Select
                value={filters.severity || ''}
                onValueChange={(value) => handleFilterChange('severity', value || undefined)}
              >
                <SelectTrigger id="severity" className="w-[180px]">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto">
              <Label htmlFor="resource-type" className="mb-1">Resource Type</Label>
              <div className="flex items-center">
                <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="resource-type"
                  placeholder="Resource type..."
                  value={filters.resourceType || ''}
                  onChange={(e) => handleFilterChange('resourceType', e.target.value || undefined)}
                  className="w-[180px]"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-auto">
              <Label htmlFor="from-date" className="mb-1">From Date</Label>
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <DatePicker
                  id="from-date"
                  date={filters.fromDate}
                  onSelect={(date) => handleFilterChange('fromDate', date)}
                  className="w-[180px]"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <Label htmlFor="to-date" className="mb-1">To Date</Label>
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <DatePicker
                  id="to-date"
                  date={filters.toDate}
                  onSelect={(date) => handleFilterChange('toDate', date)}
                  className="w-[180px]"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <Label htmlFor="user-id" className="mb-1">User ID</Label>
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-id"
                  type="number"
                  placeholder="User ID..."
                  value={filters.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-[180px]"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <Label htmlFor="status" className="mb-1">Status</Label>
              <Select
                value={filters.success !== undefined ? filters.success.toString() : ''}
                onValueChange={(value) => {
                  if (value === '') {
                    handleFilterChange('success', undefined);
                  } else {
                    handleFilterChange('success', value === 'true');
                  }
                }}
              >
                <SelectTrigger id="status" className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end ml-auto">
              <Button variant="outline" className="mr-2" onClick={resetFilters}>
                Reset Filters
              </Button>
              <Button variant="default" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="secondary" className="ml-2" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Audit logs table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-destructive">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>Failed to load audit logs. Please try again.</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs?.length ? (
                    data.logs.map((log: AuditLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell>{log.userId}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={log.action}>
                          {log.action}
                          {log.description && (
                            <div className="text-xs text-muted-foreground truncate" title={log.description}>
                              {log.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.resourceType}
                          {log.resourceId && <span className="text-xs text-muted-foreground ml-1">#{log.resourceId}</span>}
                        </TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>{getStatusBadge(log.success)}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        No audit logs found matching the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data?.pagination && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1}-
                  {Math.min(page * pageSize, data.pagination.totalItems)} of {data.pagination.totalItems} logs
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        disabled={page === 1}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                      // Logic to show 5 page links centered around the current page
                      let pageNum;
                      if (data.pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= data.pagination.totalPages - 2) {
                        pageNum = data.pagination.totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={page === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {data.pagination.totalPages > 5 && page < data.pagination.totalPages - 2 && (
                      <>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setPage(data.pagination.totalPages)}
                          >
                            {data.pagination.totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(prev => Math.min(prev + 1, data.pagination.totalPages))}
                        disabled={page === data.pagination.totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}