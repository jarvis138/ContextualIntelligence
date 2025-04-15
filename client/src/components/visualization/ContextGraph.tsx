import React, { useState, useEffect } from 'react';
import ForceGraph from './ForceGraph';
import GraphControls from './GraphControls';
import EntityDetailCard from './EntityDetailCard';
import { GraphData, GraphFilter, GraphNode, GraphLink, ForceGraphConfig } from '@/lib/types/graphTypes';
import { applyTimeDecay, filterGraphData, analyzeGraphStructure } from '@/lib/graphUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Network, 
  BarChart2, 
  AlertCircle, 
  Layers, 
  ArrowDownCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

interface ContextGraphProps {
  projectId?: number;
  initialFilter?: GraphFilter;
  height?: number;
  className?: string;
}

export function ContextGraph({ 
  projectId, 
  initialFilter = {}, 
  height = 700,
  className = ''
}: ContextGraphProps) {
  // State
  const [filter, setFilter] = useState<GraphFilter>(initialFilter);
  const [selectedEntity, setSelectedEntity] = useState<GraphNode | GraphLink | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<'node' | 'link' | null>(null);
  const [graphConfig, setGraphConfig] = useState<ForceGraphConfig>({
    width: 1000,
    height: height,
    timeDecay: false,
    timeDecayFactor: 0.1,
    timeDecayReference: new Date()
  });
  const [processedData, setProcessedData] = useState<GraphData | null>(null);
  const [insights, setInsights] = useState<any | null>(null);

  // Fetch relationship data
  const { data: graphData, isLoading, error } = useQuery<GraphData>({
    queryKey: ['/api/relationships', projectId],
    enabled: !!projectId,
  });

  // Process and filter data when it changes
  useEffect(() => {
    if (!graphData) return;

    // Apply time decay if enabled
    let processed = graphConfig.timeDecay 
      ? applyTimeDecay(
          graphData, 
          graphConfig.timeDecayReference, 
          graphConfig.timeDecayFactor
        ) 
      : graphData;
    
    // Apply filters
    processed = filterGraphData(processed, filter);
    
    setProcessedData(processed);
    
    // Generate insights
    setInsights(analyzeGraphStructure(processed));
  }, [graphData, filter, graphConfig.timeDecay, graphConfig.timeDecayFactor, graphConfig.timeDecayReference]);

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedEntity(node);
    setSelectedEntityType('node');
  };

  // Handle link click
  const handleLinkClick = (link: GraphLink) => {
    setSelectedEntity(link);
    setSelectedEntityType('link');
  };

  // Handle filter change
  const handleFilterChange = (newFilter: GraphFilter) => {
    setFilter(newFilter);
  };

  // Handle time decay toggle
  const handleTimeDecayToggle = (enabled: boolean) => {
    setGraphConfig({
      ...graphConfig,
      timeDecay: enabled
    });
  };

  // Handle decay factor change
  const handleDecayFactorChange = (factor: number) => {
    setGraphConfig({
      ...graphConfig,
      timeDecayFactor: factor
    });
  };

  // Reset graph layout
  const handleResetLayout = () => {
    // Force redraw of graph by temporarily setting to null then back
    setProcessedData(null);
    setTimeout(() => {
      if (graphData) {
        let processed = graphConfig.timeDecay 
          ? applyTimeDecay(
              graphData, 
              graphConfig.timeDecayReference, 
              graphConfig.timeDecayFactor
            ) 
          : graphData;
        processed = filterGraphData(processed, filter);
        setProcessedData(processed);
      }
    }, 50);
  };

  // Entity navigation - implement this based on your routing needs
  const handleEntityNavigation = (entity: GraphNode | GraphLink) => {
    if (selectedEntityType === 'node') {
      const node = entity as GraphNode;
      // Navigate to entity's detail page based on type
      console.log(`Navigate to ${node.type} with ID ${node.id}`);
      // Example: navigate(`/${node.type}s/${node.id}`);
    }
  };

  // Handle close of entity detail
  const handleCloseEntityDetail = () => {
    setSelectedEntity(null);
    setSelectedEntityType(null);
  };

  // Export graph data as JSON
  const handleExportGraph = () => {
    if (!processedData) return;
    
    const dataStr = JSON.stringify(processedData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportName = `context-graph-${projectId || 'all'}-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  };

  return (
    <div className={`context-graph-container grid grid-cols-1 lg:grid-cols-3 gap-4 ${className}`}>
      {/* Left sidebar */}
      <div className="lg:col-span-1">
        <div className="space-y-4">
          {/* Controls */}
          <GraphControls
            filter={filter}
            onFilterChange={handleFilterChange}
            onTimeDecayToggle={handleTimeDecayToggle}
            onDecayFactorChange={handleDecayFactorChange}
            onResetLayout={handleResetLayout}
            isTimeDecayEnabled={graphConfig.timeDecay}
            decayFactor={graphConfig.timeDecayFactor}
          />
          
          {/* Entity detail card */}
          {selectedEntity && selectedEntityType && (
            <EntityDetailCard
              entity={selectedEntity}
              type={selectedEntityType}
              onClose={handleCloseEntityDetail}
              onNavigate={handleEntityNavigation}
            />
          )}
        </div>
      </div>
      
      {/* Main content area */}
      <div className="lg:col-span-2">
        <Tabs defaultValue="graph">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="graph">
                <Network className="h-4 w-4 mr-2" />
                Graph View
              </TabsTrigger>
              <TabsTrigger value="insights">
                <BarChart2 className="h-4 w-4 mr-2" />
                Insights
              </TabsTrigger>
            </TabsList>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportGraph}
              disabled={!processedData}
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <TabsContent value="graph" className="mt-0">
            <Card className="w-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Context Relationship Graph</CardTitle>
                    <CardDescription>
                      Visualizing connections between {projectId ? 'project' : 'organizational'} entities
                    </CardDescription>
                  </div>
                  
                  {processedData && (
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {processedData.nodes.length} Nodes
                      </Badge>
                      <Badge variant="outline">
                        {processedData.links.length} Links
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading && (
                  <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {error && (
                  <div className="flex flex-col items-center justify-center bg-muted/50 rounded-md" style={{ height: `${height}px` }}>
                    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                    <h3 className="text-lg font-medium">Failed to load graph data</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {error instanceof Error ? error.message : 'Unknown error occurred'}
                    </p>
                  </div>
                )}
                
                {processedData && (
                  <div className="relative border rounded-md" style={{ height: `${height}px` }}>
                    <ForceGraph 
                      data={processedData}
                      config={{
                        ...graphConfig,
                        width: 1000, // This will be adjusted by the responsiveness of the component
                        height 
                      }}
                      onNodeClick={handleNodeClick}
                      onLinkClick={handleLinkClick}
                      className="w-full h-full"
                    />
                  </div>
                )}
                
                {!isLoading && !error && !processedData && (
                  <div className="flex flex-col items-center justify-center bg-muted/50 rounded-md" style={{ height: `${height}px` }}>
                    <Layers className="h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">No graph data available</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your filters or select a project to view its relationships
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="insights" className="mt-0">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Relationship Insights</CardTitle>
                <CardDescription>
                  Analysis of the contextual relationships and structure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!insights ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Graph Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-card rounded-lg border p-4 flex flex-col items-center">
                        <h3 className="text-sm font-medium text-muted-foreground">Entities</h3>
                        <p className="text-3xl font-bold mt-1">{insights.totalNodes}</p>
                      </div>
                      
                      <div className="bg-card rounded-lg border p-4 flex flex-col items-center">
                        <h3 className="text-sm font-medium text-muted-foreground">Connections</h3>
                        <p className="text-3xl font-bold mt-1">{insights.totalLinks}</p>
                      </div>
                      
                      <div className="bg-card rounded-lg border p-4 flex flex-col items-center">
                        <h3 className="text-sm font-medium text-muted-foreground">Avg. Connections</h3>
                        <p className="text-3xl font-bold mt-1">{insights.averageConnections.toFixed(1)}</p>
                      </div>
                    </div>
                    
                    {/* Key Nodes */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Central Entities</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {insights.centralNodes?.slice(0, 4).map((node: GraphNode) => (
                          <div 
                            key={node.id}
                            className="border rounded-md p-3 flex items-start space-x-3 hover:bg-accent/50 cursor-pointer"
                            onClick={() => handleNodeClick(node)}
                          >
                            <div className={`rounded-full h-8 w-8 flex items-center justify-center bg-primary/10`}>
                              <span className="text-xs font-bold text-primary">{node.type.substring(0, 2).toUpperCase()}</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{node.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{node.type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Isolated Nodes */}
                    {insights.isolatedNodes?.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Isolated Entities</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          These entities have no connections to other elements in the dataset
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {insights.isolatedNodes?.slice(0, 6).map((node: GraphNode) => (
                            <div 
                              key={node.id}
                              className="border rounded-md p-2 flex items-center space-x-2 hover:bg-accent/50 cursor-pointer"
                              onClick={() => handleNodeClick(node)}
                            >
                              <Badge variant="outline">{node.type}</Badge>
                              <span className="text-sm truncate">{node.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Also export as default for backward compatibility
export default ContextGraph;