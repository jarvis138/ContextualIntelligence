import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatabaseStats } from '@/hooks/useAdminData';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export const DatabaseStatsCard: React.FC = () => {
  const { data: dbStats, isLoading } = useDatabaseStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          </div>
          <Skeleton className="h-[200px] w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  // Get top tables by row count
  const topTables = dbStats?.tableStats?.rows
    ?.slice(0, 5)
    ?.sort((a, b) => b.row_count - a.row_count) || [];

  // Get active indexes by scan count
  const activeIndexes = dbStats?.indexStats?.rows
    ?.slice(0, 5)
    ?.sort((a, b) => b.index_scans - a.index_scans) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Statistics</CardTitle>
        <CardDescription>Current database metrics and table statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dbStats?.databaseSize?.db_size || 'Unknown'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dbStats?.tableStats?.rows?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Top Tables by Row Count</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Name</TableHead>
                  <TableHead className="text-right">Row Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topTables.length > 0 ? (
                  topTables.map((table, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{table.tablename}</TableCell>
                      <TableCell className="text-right">{table.row_count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                      No table statistics available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="font-medium mb-3">Most Used Indexes</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Index Name</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Scan Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeIndexes.length > 0 ? (
                  activeIndexes.map((index, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{index.index_name}</TableCell>
                      <TableCell>{index.table_name}</TableCell>
                      <TableCell className="text-right">{index.index_scans.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No index statistics available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};