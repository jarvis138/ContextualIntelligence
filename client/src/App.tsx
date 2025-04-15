import React, { useEffect } from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import CustomizableDashboard from "@/pages/CustomizableDashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectInsights from "@/pages/ProjectInsights";
import Team from "@/pages/Team";
import Documents from "@/pages/Documents";
import DocumentManagement from "@/pages/DocumentManagement";
import DocumentDetail from "@/pages/DocumentDetail";
import Conversations from "@/pages/Conversations";
import Search from "@/pages/Search";
import Integrations from "@/pages/Integrations";
import AuthPage from "@/pages/AuthPage";
import UserProfile from "@/pages/UserProfile";
import ErrorBoundary from "@/components/ErrorBoundary";

import MainLayout from "@/components/layout/MainLayout";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* All other routes wrapped in MainLayout */}
      <Route path="/">
        {(params) => (
          <MainLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard/custom" component={CustomizableDashboard} />
              <Route path="/projects" component={Projects} />
              <Route path="/projects/:id">
                {params => <ProjectDetail params={params} />}
              </Route>
              <Route path="/projects/:projectId/insights" component={ProjectInsights} />
              <Route path="/teams" component={Team} />
              <Route path="/documents" component={Documents} />
              <Route path="/documents/manage" component={DocumentManagement} />
              <Route path="/documents/:documentId">
                {params => <DocumentDetail documentId={params.documentId} />}
              </Route>
              <Route path="/conversations" component={Conversations} />
              <Route path="/search" component={Search} />
              <Route path="/profile" component={UserProfile} />
              <Route path="/integrations" component={Integrations} />
              <Route path="/integrations/trello" component={Integrations} />
              <Route path="/integrations/jira" component={Integrations} />
              <Route path="/integrations/slack" component={Integrations} />
              <Route path="/integrations/gsuite" component={Integrations} />
              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </MainLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Add timeline styles that we can't easily add through components
    const style = document.createElement("style");
    style.innerHTML = `
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
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
      <Toaster />
    </>
  );
}

export default App;
