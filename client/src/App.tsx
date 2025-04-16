import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Projects from "@/pages/Projects";
import Dashboard from "@/pages/Dashboard";
import DocumentsPage from "@/pages/documents-page";
import ConnectorsPage from "@/pages/connectors-page";
import TeamsPage from "@/pages/teams-page";
import WorkspacePage from "@/pages/workspace-page";
import AnalyticsPage from "@/pages/analytics-page";
import ReportsAlertsPage from "@/pages/reports-alerts-page";
import InsightsPage from "@/pages/insights-page";
import SearchPage from "@/pages/search-page";
import SettingsPage from "@/pages/settings-page";
import AdminPage from "@/pages/admin-page";
import SystemPage from "@/pages/system-page";
import PlaceholderPage from "@/pages/placeholder-page";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

import MainLayout from "@/components/layout/MainLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TourContextProvider } from "@/contexts/TourContext";
import { TourManager } from "@/components/tour/TourManager";
import { ProjectAssistantProvider } from "@/contexts/ProjectAssistantContext";
import { ChatInterface } from "@/components/chatbot/ChatInterface";

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000,
    },
  },
});

// Simplified App with direct routes and no authentication
function App() {
  const [location] = useLocation();
  
  useEffect(() => {
    console.log("Current location:", location);
    // Add some basic styles
    const style = document.createElement("style");
    style.innerHTML = `
      body {
        font-family: 'Inter', sans-serif;
      }
      .timeline-item::before {
        content: '';
        position: absolute;
        left: -25px;
        top: 0;
        width: 2px;
        height: 100%;
        background-color: #e5e7eb;
        z-index: -1;
      }
      
      .timeline-item::after {
        content: '';
        position: absolute;
        left: -29px;
        top: 10px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #3B82F6;
        z-index: 1;
      }

      .network-graph {
        background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
        background-size: 20px 20px;
      }

      /* Tour styles */
      .tour-helper {
        --reactour-accent: var(--primary);
      }
      
      .tour-mask {
        color: rgba(0, 0, 0, 0.7);
      }
      
      .tour-highlighted-mask {
        border: 2px solid var(--primary);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [location]);

  return (
    <QueryClientProvider client={queryClient}>
      <TourContextProvider>
        <ProjectAssistantProvider>
          {location === "/admin" ? (
            <AdminPage />
          ) : (
            <MainLayout>
              <Switch>
                <Route path="/projects" component={Projects} />
                <Route path="/documents" component={DocumentsPage} />
                <Route path="/teams" component={TeamsPage} />
                <Route path="/workspace" component={WorkspacePage} />
                <Route path="/analytics" component={AnalyticsPage} />
                <Route path="/reports-alerts" component={ReportsAlertsPage} />
                <Route path="/insights" component={InsightsPage} />
                <Route path="/integrations" component={ConnectorsPage} />
                <Route path="/connectors" component={ConnectorsPage} />
                <Route path="/search" component={SearchPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/system" component={SystemPage} />
                <Route path="/profile" component={PlaceholderPage} />
                <Route path="/" component={Dashboard} />
                <Route component={NotFound} />
              </Switch>
            </MainLayout>
          )}
          <TourManager />
          <ChatInterface />
          <Toaster />
        </ProjectAssistantProvider>
      </TourContextProvider>
    </QueryClientProvider>
  );
}

export default App;
