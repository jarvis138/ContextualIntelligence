import React from "react";
import { UnderDevelopment } from "@/components/ui/under-development";

export default function AnalyticsPage() {
  return (
    <UnderDevelopment 
      pageTitle="Analytics Dashboard" 
      phaseNumber={3} 
      plannedFeatures={[
        { name: "AI-powered trend analysis" },
        { name: "Project performance metrics" },
        { name: "Interactive data visualizations" },
        { name: "Predictive analytics" },
        { name: "Custom report generation" },
      ]}
    />
  );
}