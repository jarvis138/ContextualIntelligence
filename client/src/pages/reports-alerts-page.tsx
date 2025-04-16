import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportGenerator } from '@/components/analytics/ReportGenerator';
import { AlertConfiguration } from '@/components/analytics/AlertConfiguration';
import { 
  FileText, 
  Bell, 
  Download, 
  BarChart2, 
  PieChart, 
  LineChart 
} from 'lucide-react';

export default function ReportsAlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports &amp; Alerts</h1>
        <p className="text-muted-foreground mt-2">
          Generate comprehensive reports and configure smart alerts
        </p>
      </div>

      <Tabs defaultValue="reports">
        <TabsList className="mb-4">
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <ReportGenerator />
            </div>
            <div>
              <div className="border rounded-md p-6 h-full space-y-6">
                <h2 className="text-xl font-semibold mb-4">Available Templates</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center p-3 border rounded-md hover:bg-accent cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Project Overview</h3>
                      <p className="text-sm text-muted-foreground">Key metrics and status updates</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 border rounded-md hover:bg-accent cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <PieChart className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Resource Allocation</h3>
                      <p className="text-sm text-muted-foreground">Team and budget distribution</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 border rounded-md hover:bg-accent cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <LineChart className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Progress Tracking</h3>
                      <p className="text-sm text-muted-foreground">Timeline and milestone analysis</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-6">
                  <h3 className="font-medium mb-2">Recently Generated</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="flex-1">Project_Overview_Q2.pdf</span>
                      <Download className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" />
                    </div>
                    <div className="flex items-center text-sm">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="flex-1">Team_Performance_March.xlsx</span>
                      <Download className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" />
                    </div>
                    <div className="flex items-center text-sm">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="flex-1">Resource_Allocation_2025.pdf</span>
                      <Download className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
}