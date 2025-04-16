import React from "react";
import { UnderDevelopment } from "@/components/ui/under-development";

export default function TeamsPage() {
  return (
    <UnderDevelopment 
      pageTitle="Teams Management" 
      phaseNumber={3} 
      plannedFeatures={[
        { name: "Team permissions and role-based access" },
        { name: "Team activity analytics" },
        { name: "Team communication insights" },
        { name: "AI-powered team suggestions" },
        { name: "Cross-team collaboration tools" },
      ]}
    />
  );
}