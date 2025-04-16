import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSearchParams } from "../lib/hooks";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import GraphVisualizer from "@/components/visualizations/GraphVisualizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Circle, 
  Share2, 
  Download, 
  GitFork, 
  Info
} from "lucide-react";
import { createMockGraphData } from "@/lib/mockData";

const GraphPage = () => {
  const [, setLocation] = useLocation();
  const searchParams = useSearchParams();
  const nodeId = searchParams.get("nodeId") ? parseInt(searchParams.get("nodeId") as string) : undefined;
  const depth = searchParams.get("depth") ? parseInt(searchParams.get("depth") as string) : 2;
  const [activeTab, setActiveTab] = useState("visualization");
  
  // Create some sample data if the backend doesn't have any yet
  useEffect(() => {
    const initializeGraphData = async () => {
      try {
        // Check if we have any nodes
        const response = await fetch('/api/graph/nodes');
        const data = await response.json();
        
        // If no nodes, create mock data
        if (Array.isArray(data) && data.length === 0) {
          await createMockGraphData();
        }
      } catch (error) {
        console.error('Error initializing graph data:', error);
      }
    };
    
    initializeGraphData();
  }, []);
  
  return (
    <Layout>
      <div className="flex flex-col h-full">
        <PageHeader
          heading="Knowledge Graph"
          subheading="Visualize and explore the relationships between your project entities"
        >
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share this graph view with your team</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export this graph to various formats</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => setLocation("/")}
            >
              <GitFork className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
        </PageHeader>

        <div className="pt-6 flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="visualization" className="flex items-center">
                  {activeTab === "visualization" ? (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  ) : (
                    <Circle className="h-4 w-4 mr-1" />
                  )}
                  Visualization
                </TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center">
                  {activeTab === "analysis" ? (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  ) : (
                    <Circle className="h-4 w-4 mr-1" />
                  )}
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center">
                  {activeTab === "settings" ? (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  ) : (
                    <Circle className="h-4 w-4 mr-1" />
                  )}
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>The knowledge graph visualizes connections between entities in your project.</p>
                    <p className="mt-1">Click on nodes to explore relationships and gain insights.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <TabsContent value="visualization" className="m-0 h-full">
              <GraphVisualizer centralNodeId={nodeId} depth={depth} limit={100} />
            </TabsContent>
            
            <TabsContent value="analysis" className="m-0">
              <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
                <div>
                  <h3 className="text-xl font-medium mb-2">Graph Analysis</h3>
                  <p>Graph Analysis features will be available in the next release.</p>
                  <p className="mt-4">This will include centrality measures, community detection, and path analysis.</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="m-0">
              <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
                <div>
                  <h3 className="text-xl font-medium mb-2">Graph Settings</h3>
                  <p>Graph Settings will be available in the next release.</p>
                  <p className="mt-4">This will allow you to customize visualization parameters, physics settings, and more.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default GraphPage;