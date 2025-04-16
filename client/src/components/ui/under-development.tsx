import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";

interface FeatureStatus {
  name: string;
  status: "Complete" | "In Progress" | "Not Started";
}

interface TimelineItem {
  name: string;
  date: string;
}

interface PlannedFeature {
  name: string;
}

interface UnderDevelopmentProps {
  pageTitle: string;
  phaseNumber?: number;
  featureStatuses?: FeatureStatus[];
  timelineItems?: TimelineItem[];
  plannedFeatures?: PlannedFeature[];
}

export function UnderDevelopment({
  pageTitle,
  phaseNumber = 2,
  featureStatuses = [
    { name: "Planning", status: "Complete" },
    { name: "Design", status: "Complete" },
    { name: "Development", status: "In Progress" },
    { name: "Testing", status: "Not Started" },
    { name: "Deployment", status: "Not Started" },
  ],
  timelineItems = [
    { name: "Initial Release", date: "June 2025" },
    { name: "Beta Testing", date: "July 2025" },
    { name: "Full Deployment", date: "August 2025" },
  ],
  plannedFeatures = [
    { name: "Comprehensive data visualization" },
    { name: "Advanced filtering and search" },
    { name: "Real-time updates and notifications" },
    { name: "Exportable reports and analytics" },
    { name: "Team collaboration tools" },
  ],
}: UnderDevelopmentProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Complete":
        return "bg-green-500";
      case "In Progress":
        return "bg-amber-500";
      case "Not Started":
        return "bg-gray-300";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">{pageTitle}</h1>
      
      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Page Under Development</AlertTitle>
        <AlertDescription>
          This page is currently under development as part of Phase {phaseNumber} implementation.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Implementation Status</CardTitle>
            <CardDescription>Current status of this feature's implementation</CardDescription>
          </CardHeader>
          <CardContent>
            {featureStatuses.map((feature, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <span>{feature.name}</span>
                <div className="flex items-center">
                  <span className={`mr-2 ${feature.status === "Complete" ? "text-green-500" : 
                    feature.status === "In Progress" ? "text-amber-500" : "text-gray-500"}`}>
                    {feature.status}
                  </span>
                  <div className={`h-2 w-16 rounded-full ${getStatusColor(feature.status)}`}></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Estimated Timeline</CardTitle>
            <CardDescription>Expected completion dates</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <span>{item.name}</span>
                <span className="font-medium">{item.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Planned Features</CardTitle>
            <CardDescription>Key features for this section</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plannedFeatures.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}