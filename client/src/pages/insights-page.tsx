import React from "react";
import { UnderDevelopment } from "@/components/ui/under-development";

export default function InsightsPage() {
  return (
    <UnderDevelopment 
      pageTitle="Project Insights" 
      phaseNumber={3} 
      plannedFeatures={[
        { name: "AI-driven project risk assessment" },
        { name: "Automated bottleneck identification" },
        { name: "Communication sentiment analysis" },
        { name: "Project progress forecasting" },
        { name: "Resource allocation optimization" },
      ]}
    />
  );
}