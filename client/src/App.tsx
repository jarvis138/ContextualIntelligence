import { Switch, Route, useRoute } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectInsights from "@/pages/ProjectInsights";
import Team from "@/pages/Team";
import Documents from "@/pages/Documents";
import Conversations from "@/pages/Conversations";
import Search from "@/pages/Search";
import Integrations from "@/pages/Integrations";
import ErrorBoundary from "@/components/ErrorBoundary";

// Import CSS to fix timeline styling
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id">
        {params => <ProjectDetail params={params} />}
      </Route>
      <Route path="/projects/:projectId/insights" component={ProjectInsights} />
      <Route path="/team" component={Team} />
      <Route path="/documents" component={Documents} />
      <Route path="/conversations" component={Conversations} />
      <Route path="/search" component={Search} />
      <Route path="/integrations" component={Integrations} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
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
