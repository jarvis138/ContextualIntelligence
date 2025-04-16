import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Projects from "@/pages/Projects";
import Dashboard from "@/pages/Dashboard";
import DocumentsPage from "@/pages/documents-page";
import PlaceholderPage from "@/pages/placeholder-page";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

import MainLayout from "@/components/layout/MainLayout";

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
    <>
      <MainLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/documents" component={DocumentsPage} />
          <Route path="/teams" component={PlaceholderPage} />
          <Route path="/workspace" component={PlaceholderPage} />
          <Route path="/analytics" component={PlaceholderPage} />
          <Route path="/insights" component={PlaceholderPage} />
          <Route path="/integrations" component={PlaceholderPage} />
          <Route path="/search" component={PlaceholderPage} />
          <Route path="/settings" component={PlaceholderPage} />
          <Route path="/admin" component={PlaceholderPage} />
          <Route path="/system" component={PlaceholderPage} />
          <Route path="/profile" component={PlaceholderPage} />
          <Route component={NotFound} />
        </Switch>
      </MainLayout>
      <Toaster />
    </>
  );
}

export default App;
