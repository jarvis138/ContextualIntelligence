import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  FileText, 
  Calendar,
  Mail,
  Clock,
  PieChart,
  BarChart3,
  BarChart,
  LineChart,
  RefreshCw,
} from 'lucide-react';

interface ReportGeneratorProps {
  projectId?: number;
  teamId?: number;
}

export function ReportGenerator({ projectId, teamId }: ReportGeneratorProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>('project');
  const [reportFormat, setReportFormat] = useState<string>('pdf');
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [includeRawData, setIncludeRawData] = useState<boolean>(false);
  const [scheduleReport, setScheduleReport] = useState<boolean>(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>('weekly');
  const [recipients, setRecipients] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      toast({
        title: "Generating report",
        description: "Your report is being prepared...",
      });
      
      // Prepare the report configuration
      const reportConfig = {
        reportType,
        timeRange,
        format: reportFormat,
        options: {
          includeCharts,
          includeRawData
        },
        notes
      };
      
      if (scheduleReport) {
        // API call to schedule a report
        const scheduleConfig = {
          ...reportConfig,
          scheduleFrequency,
          recipients: recipients.split(',').map(email => email.trim()),
          projectId,
          teamId
        };
        
        const response = await fetch('/api/analytics/reports/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scheduleConfig),
        });
        
        if (!response.ok) {
          throw new Error('Failed to schedule report');
        }
        
        toast({
          title: "Report scheduled",
          description: `Your ${reportType} report will be sent ${scheduleFrequency}.`,
        });
      } else {
        // API call to generate a report immediately
        const generateConfig = {
          ...reportConfig,
          projectId,
          teamId
        };
        
        const response = await fetch('/api/analytics/reports/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(generateConfig),
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate report');
        }
        
        // Get report URL or data
        const result = await response.json();
        
        toast({
          title: "Report generated",
          description: "Your report is ready for download.",
        });
        
        // If there's a download URL, open it
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        }
      }
    } catch (error) {
      toast({
        title: "Error generating report",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive",
      });
      console.error('Report generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Report Generator</CardTitle>
        <CardDescription>
          Create and schedule customized reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="report-type">Report Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger id="report-type">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Project Report</SelectItem>
              <SelectItem value="team">Team Performance</SelectItem>
              <SelectItem value="activity">Activity Summary</SelectItem>
              <SelectItem value="document">Document Analysis</SelectItem>
              <SelectItem value="relationship">Relationship Network</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time-range">Time Range</Label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger id="time-range">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="year">Last 12 months</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-format">Report Format</Label>
          <Select value={reportFormat} onValueChange={setReportFormat}>
            <SelectTrigger id="report-format">
              <SelectValue placeholder="Select report format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF Document</SelectItem>
              <SelectItem value="excel">Excel Spreadsheet</SelectItem>
              <SelectItem value="csv">CSV Data</SelectItem>
              <SelectItem value="docx">Word Document</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Report Content</Label>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-charts" 
              checked={includeCharts} 
              onCheckedChange={(checked) => {
                if (checked !== "indeterminate") {
                  setIncludeCharts(checked);
                }
              }} 
            />
            <Label htmlFor="include-charts" className="cursor-pointer">Include charts and visualizations</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="include-raw-data" 
              checked={includeRawData} 
              onCheckedChange={(checked) => {
                if (checked !== "indeterminate") {
                  setIncludeRawData(checked);
                }
              }} 
            />
            <Label htmlFor="include-raw-data" className="cursor-pointer">Include raw data tables</Label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="schedule-report" 
              checked={scheduleReport} 
              onCheckedChange={(checked) => {
                if (checked !== "indeterminate") {
                  setScheduleReport(checked);
                }
              }} 
            />
            <Label htmlFor="schedule-report" className="cursor-pointer">Schedule recurring report</Label>
          </div>
          
          {scheduleReport && (
            <div className="ml-6 space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="schedule-frequency">Frequency</Label>
                <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                  <SelectTrigger id="schedule-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every two weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
                <Textarea 
                  id="recipients" 
                  placeholder="email@example.com, another@example.com" 
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea 
            id="notes" 
            placeholder="Any specific information you want included in the report?" 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isGenerating}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" size="sm" disabled={isGenerating}>
            <LineChart className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
        <Button 
          onClick={handleGenerateReport} 
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : scheduleReport ? (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Schedule Report
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}