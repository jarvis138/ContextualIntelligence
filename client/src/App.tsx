import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Projects from "@/pages/Projects";
import Dashboard from "@/pages/Dashboard";
import DocumentsPage from "@/pages/documents-page";
import ConnectorsPage from "@/pages/connectors-page";
import PlaceholderPage from "@/pages/placeholder-page";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

import MainLayout from "@/components/layout/MainLayout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  useEffect(() => {
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
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/documents" component={DocumentsPage} />
          <Route path="/teams" component={PlaceholderPage} />
          <Route path="/workspace" component={PlaceholderPage} />
          <Route path="/analytics" component={PlaceholderPage} />
          <Route path="/insights" component={PlaceholderPage} />
          <Route path="/integrations" component={ConnectorsPage} />
          <Route path="/connectors" component={ConnectorsPage} />
          <Route path="/search" component={PlaceholderPage} />
          <Route path="/settings" component={PlaceholderPage} />
          <Route path="/admin" component={PlaceholderPage} />
          <Route path="/system" component={PlaceholderPage} />
          <Route path="/profile" component={PlaceholderPage} />
          <Route component={NotFound} />
        </Switch>
      </MainLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
