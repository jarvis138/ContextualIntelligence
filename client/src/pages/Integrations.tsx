import React from "react";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { Button } from "@/components/ui/button";
import { Layers, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function IntegrationsPage() {
  const [, setLocation] = useLocation();
  
  // In a real application, this would come from auth context
  const userId = 1; // Default to demo user for now

  return (
    <>
      
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              className="mr-2"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Integrations</h1>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Connect your tools to enhance project intelligence
            </span>
          </div>
        </div>

        <section className="mb-8">
          <div className="grid grid-cols-1 gap-6">
            <IntegrationsPanel userId={userId} />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Benefits of Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-medium mb-2">Unified View</h3>
              <p className="text-muted-foreground">
                Combine data from multiple sources to get a comprehensive view of your projects.
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-medium mb-2">Real-time Updates</h3>
              <p className="text-muted-foreground">
                Stay informed with real-time notifications and updates from connected services.
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-medium mb-2">Enhanced Insights</h3>
              <p className="text-muted-foreground">
                Get AI-powered insights based on comprehensive data from all your tools.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Integration Security</h2>
          <div className="p-6 border rounded-lg bg-card">
            <p className="text-muted-foreground mb-4">
              All integrations are secured using OAuth or API tokens. Your credentials are encrypted and never stored in plain text.
              Permissions are limited to only what's needed for each integration to function properly.
            </p>
            <Button variant="outline" disabled>
              View Security Policy
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}