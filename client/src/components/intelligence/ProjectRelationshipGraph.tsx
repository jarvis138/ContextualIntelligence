/**
 * Project Relationship Graph Component
 * 
 * This component visualizes the relationships between project elements
 * (documents, tasks, people, etc.) using a force-directed graph.
 * Part of Phase 3 AI Intelligence features.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Network, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Filter, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAIServices } from '@/hooks/useAIServices';
import ForceGraph2D from 'react-force-graph-2d';

// Define types for graph data
interface GraphNode {
  id: string;
  name: string;
  type: string;
  color?: string;
  size?: number;
  val?: number;
  metadata?: Record<string, any>;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  value?: number;
  color?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function ProjectRelationshipGraph({ projectId }: { projectId: number }) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [graphFilter, setGraphFilter] = useState<string>('all');
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('graph');
  
  const graphRef = useRef<any>(null);
  
  const { isOpenAIAvailable, isLoading: aiServiceCheckLoading } = useAIServices();
  
  // Fetch graph data from the API
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/projects', projectId, 'graph'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/graph`);
      if (!response.ok) {
        throw new Error('Failed to fetch project relationship graph data');
      }
      return response.json() as Promise<GraphData>;
    },
    enabled: !!projectId && isOpenAIAvailable
  });
  
  // Update local graph data state when data changes
  useEffect(() => {
    if (data) {
      setGraphData(data);
    }
  }, [data]);
  
  // Filter the graph data based on the selected filter
  const getFilteredGraphData = useCallback(() => {
    if (graphFilter === 'all') {
      return graphData;
    }
    
    // Filter nodes by type
    const filteredNodes = graphData.nodes.filter(node => 
      graphFilter === 'all' || node.type === graphFilter
    );
    
    // Get node IDs for filtering links
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    
    // Filter links that connect filtered nodes
    const filteredLinks = graphData.links.filter(link => 
      nodeIds.has(link.source.toString()) && nodeIds.has(link.target.toString())
    );
    
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, graphFilter]);
  
  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setHighlightedNode(node.id);
    
    // Center view on node with some zoom
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(2, 1000);
    }
  };
  
  // Zoom in
  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.5, 800);
    }
  };
  
  // Zoom out
  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.5, 800);
    }
  };
  
  // Reset view
  const handleResetView = () => {
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 1000);
      graphRef.current.zoom(1, 1000);
    }
    setHighlightedNode(null);
  };
  
  // Export graph as image
  const handleExportImage = () => {
    if (graphRef.current) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `project-${projectId}-relationship-graph.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };
  
  // Get node details component for selected node
  const renderNodeDetails = () => {
    if (!highlightedNode) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
          <Network className="h-12 w-12 mb-4" />
          <p>Select a node to view details</p>
        </div>
      );
    }
    
    const node = graphData.nodes.find(n => n.id === highlightedNode);
    if (!node) return null;
    
    // Find connected nodes
    const connectedLinks = graphData.links.filter(
      link => link.source.toString() === highlightedNode || link.target.toString() === highlightedNode
    );
    
    return (
      <div className="space-y-4 p-2">
        <div>
          <h3 className="text-xl font-semibold">{node.name}</h3>
          <Badge className="mt-1" variant="outline">{node.type}</Badge>
        </div>
        
        {node.metadata && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Properties</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(node.metadata).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {connectedLinks.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Connections ({connectedLinks.length})</h4>
            <div className="space-y-1">
              {connectedLinks.map((link, idx) => {
                const isSource = link.source.toString() === highlightedNode;
                const connectedNodeId = isSource ? link.target.toString() : link.source.toString();
                const connectedNode = graphData.nodes.find(n => n.id === connectedNodeId);
                
                return (
                  <div key={idx} className="flex items-center justify-between text-sm p-1 rounded hover:bg-muted">
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2 text-xs">{link.type}</Badge>
                      <span>{connectedNode?.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{connectedNode?.type}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Assign colors based on node type
  const getNodeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'document': return '#4338ca'; // indigo
      case 'task': return '#0891b2'; // cyan
      case 'person': return '#ca8a04'; // yellow
      case 'project': return '#15803d'; // green
      case 'topic': return '#db2777'; // pink
      case 'message': return '#7c3aed'; // violet
      case 'entity': return '#ea580c'; // orange
      default: return '#64748b'; // slate
    }
  };
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-0">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Project Relationship Graph
            </CardTitle>
            <CardDescription>
              Visualize connections between project elements
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={graphFilter} onValueChange={setGraphFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="person">People</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="topic">Topics</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="entity">Entities</SelectItem>
              </SelectContent>
            </Select>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleResetView}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset view</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleExportImage}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export as image</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="details">Selected Node</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-0 pt-2">
        {aiServiceCheckLoading ? (
          <div className="flex items-center justify-center h-[500px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />
            <p>Checking AI service availability...</p>
          </div>
        ) : !isOpenAIAvailable ? (
          <div className="flex flex-col items-center justify-center h-[500px]">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium text-lg">OpenAI service is not available</p>
            <p className="text-muted-foreground mt-1">
              Please check your API key configuration to use this feature
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-[500px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />
            <p>Loading project relationship graph...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[500px]">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium text-lg">Failed to load graph data</p>
            <p className="text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
          </div>
        ) : (
          <TabsContent value="graph" className="m-0">
            <div className="h-[500px] w-full">
              <ForceGraph2D
                ref={graphRef}
                graphData={getFilteredGraphData()}
                nodeLabel="name"
                nodeColor={node => highlightedNode === node.id ? '#ff6b6b' : getNodeColor(node.type)}
                nodeVal={node => node.size || 1}
                linkColor={link => {
                  if (!highlightedNode) return '#cccccc';
                  return (link.source === highlightedNode || link.target === highlightedNode) 
                    ? '#ff6b6b' 
                    : '#cccccc';
                }}
                linkWidth={link => {
                  if (!highlightedNode) return 1;
                  return (link.source === highlightedNode || link.target === highlightedNode) ? 2 : 1;
                }}
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={1}
                linkCurvature={0.2}
                onNodeClick={handleNodeClick}
                cooldownTicks={100}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
                  
                  // Draw node
                  ctx.fillStyle = highlightedNode === node.id ? '#ff6b6b' : getNodeColor(node.type);
                  ctx.beginPath();
                  ctx.arc(node.x || 0, node.y || 0, 5, 0, 2 * Math.PI, false);
                  ctx.fill();
                  
                  // Draw text background
                  if (globalScale >= 1) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(
                      (node.x || 0) - bckgDimensions[0] / 2,
                      (node.y || 0) + 8,
                      bckgDimensions[0],
                      bckgDimensions[1]
                    );
                    
                    // Draw text
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#000000';
                    ctx.fillText(
                      label,
                      node.x || 0,
                      (node.y || 0) + 8 + fontSize / 2
                    );
                  }
                }}
              />
            </div>
          </TabsContent>
        )}
        
        <TabsContent value="details" className="m-0 min-h-[500px]">
          {renderNodeDetails()}
        </TabsContent>
      </CardContent>
    </Card>
  );
}