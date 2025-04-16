import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, ZoomIn, ZoomOut, RotateCcw, Download, Share2, 
  Info, Filter, Sun, Moon, Maximize2, Minimize2
} from 'lucide-react';

// Define types for graph data structures
export interface GraphNode {
  id: number;
  type: "DOCUMENT" | "MESSAGE" | "ENTITY" | "TOPIC" | "USER" | "PROJECT" | "TASK";
  label: string;
  properties?: Record<string, any>;
  embeddings?: Record<string, any>;
  importance?: number;
  externalId: string;
}

export interface GraphEdge {
  source: number;
  target: number;
  id?: number;
  type?: "CONTAINS" | "MENTIONED_IN" | "DISCUSSES" | "AUTHORED_BY" | "REPLIED" | "RELATED" | "DEPENDS_ON" | "REFERS_TO" | "SIMILAR_TO" | "ASSOCIATED_WITH" | "PART_OF";
  properties?: Record<string, any>;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

// Node details dialog component
interface NodeDetailsProps {
  node: GraphNode | null;
  onClose: () => void;
}

const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <Dialog open={!!node} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className={
              node.type === "DOCUMENT" ? "bg-blue-100" : 
              node.type === "MESSAGE" ? "bg-green-100" :
              node.type === "ENTITY" ? "bg-purple-100" :
              node.type === "TOPIC" ? "bg-yellow-100" :
              node.type === "USER" ? "bg-red-100" :
              node.type === "PROJECT" ? "bg-indigo-100" :
              "bg-gray-100"
            }>
              {node.type}
            </Badge>
            {node.label}
          </DialogTitle>
          <DialogDescription>Node ID: {node.id}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h4 className="text-sm font-medium mb-2">Properties</h4>
          {node.properties ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(node.properties).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="font-medium text-gray-500">{key}</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No properties available</p>
          )}
          
          {node.importance !== undefined && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Importance</h4>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${(node.importance / 10) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 mt-1 inline-block">{node.importance}/10</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" variant="outline">View Full Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main graph visualizer component
interface GraphVisualizerProps {
  initialNodeId?: number;
  depth?: number;
  height?: number;
  width?: string;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ 
  initialNodeId, 
  depth = 2,
  height = 600,
  width = '100%'
}) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [nodeFilters, setNodeFilters] = useState<{
    [key in GraphNode['type']]?: boolean;
  }>({
    DOCUMENT: true,
    MESSAGE: true,
    ENTITY: true,
    TOPIC: true,
    USER: true,
    PROJECT: true,
    TASK: true
  });

  const graphRef = useRef<any>(null);
  
  // Fetch graph data on component mount
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        let url = `/api/graph/visualization?depth=${depth}`;
        if (initialNodeId) {
          url += `&nodeId=${initialNodeId}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch graph data: ${response.statusText}`);
        }
        
        const data = await response.json();
        setGraphData(data);
        setError(null);
      } catch (err) {
        console.error('Error loading graph data:', err);
        setError('Failed to load graph data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGraphData();
  }, [initialNodeId, depth]);

  // Filter nodes based on selected types
  const filteredData = useMemo(() => {
    const filteredNodes = graphData.nodes.filter(node => nodeFilters[node.type]);
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
    const filteredLinks = graphData.links.filter(
      link => 
        filteredNodeIds.has(typeof link.source === 'object' ? link.source.id : link.source as number) && 
        filteredNodeIds.has(typeof link.target === 'object' ? link.target.id : link.target as number)
    );
    
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, nodeFilters]);

  // Color mapping for different node types
  const getNodeColor = (node: GraphNode) => {
    const colorMap = {
      DOCUMENT: darkMode ? '#3b82f6' : '#60a5fa', // blue
      MESSAGE: darkMode ? '#10b981' : '#34d399', // green
      ENTITY: darkMode ? '#8b5cf6' : '#a78bfa', // purple
      TOPIC: darkMode ? '#f59e0b' : '#fbbf24', // yellow
      USER: darkMode ? '#ef4444' : '#f87171', // red
      PROJECT: darkMode ? '#6366f1' : '#818cf8', // indigo
      TASK: darkMode ? '#64748b' : '#94a3b8'  // slate
    };
    
    return colorMap[node.type] || '#9ca3af'; // gray as default
  };

  // Color mapping for different edge types
  const getLinkColor = (link: GraphEdge) => {
    const colorMap: Record<string, string> = {
      CONTAINS: '#94a3b8', // slate-400
      MENTIONED_IN: '#a1a1aa', // zinc-400
      DISCUSSES: '#60a5fa', // blue-400
      AUTHORED_BY: '#f87171', // red-400
      REPLIED: '#34d399', // green-400
      RELATED: '#a78bfa', // purple-400
      DEPENDS_ON: '#fbbf24', // yellow-400
      REFERS_TO: '#f472b6', // pink-400
      SIMILAR_TO: '#818cf8', // indigo-400
      ASSOCIATED_WITH: '#c084fc', // violet-400
      PART_OF: '#2dd4bf', // teal-400
    };
    
    return colorMap[link.type || ''] || '#9ca3af'; // gray as default
  };

  // Calculate node size based on importance
  const getNodeSize = (node: GraphNode) => {
    const baseSize = 5;
    const importanceFactor = node.importance ? node.importance / 10 : 0.5;
    return baseSize + importanceFactor * 5;
  };

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  // Export graph as PNG
  const exportAsPNG = useCallback(() => {
    if (graphRef.current) {
      const canvas = document.querySelector('.scene-container canvas') as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'graph-visualization.png';
        link.click();
      }
    }
  }, []);

  // Reset camera to center view
  const resetCamera = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.centerAt();
      graphRef.current.zoom(1, 400);
    }
  }, []);

  // Handle zoom in
  const zoomIn = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.2, 400);
    }
  }, []);

  // Handle zoom out
  const zoomOut = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.2, 400);
    }
  }, []);

  return (
    <Card className="w-full h-full shadow-md border">
      <CardHeader className="pb-0 flex flex-row justify-between items-center">
        <div>
          <CardTitle>Context Graph Visualization</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filteredData.nodes.length} nodes and {filteredData.links.length} connections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as '2d' | '3d')}
            className="w-auto"
          >
            <TabsList className="grid w-[110px] grid-cols-2">
              <TabsTrigger value="2d">2D</TabsTrigger>
              <TabsTrigger value="3d">3D</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          {/* Filter controls */}
          <div className="flex items-center gap-2 mr-4">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          {Object.keys(nodeFilters).map((type) => (
            <Badge 
              key={type}
              variant={nodeFilters[type as GraphNode['type']] ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setNodeFilters(prev => ({
                ...prev,
                [type]: !prev[type as GraphNode['type']]
              }))}
            >
              {type}
            </Badge>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="show-labels" className="text-sm">Show Labels</Label>
            <Switch 
              id="show-labels" 
              checked={showLabels} 
              onCheckedChange={setShowLabels}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-[600px] bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-[600px] bg-gray-50">
            <div className="text-center text-red-500">{error}</div>
          </div>
        ) : (
          <div 
            className={`graph-container relative ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
            style={{ height: `${height}px`, width }}
          >
            {viewMode === '2d' ? (
              <ForceGraph2D
                ref={graphRef}
                graphData={filteredData}
                nodeId="id"
                nodeLabel={showLabels ? (node => (node as GraphNode).label) : undefined}
                nodeColor={(node) => getNodeColor(node as GraphNode)}
                nodeVal={(node) => getNodeSize(node as GraphNode)}
                linkColor={(link) => getLinkColor(link as GraphEdge)}
                linkWidth={(link) => (link as GraphEdge).weight || 1}
                linkDirectionalArrowLength={(link) => (link as GraphEdge).type === 'DEPENDS_ON' ? 4 : 0}
                onNodeClick={(node) => handleNodeClick(node as GraphNode)}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const { x, y, id, label } = node as any;
                  const size = getNodeSize(node as GraphNode);
                  
                  // Draw node
                  ctx.beginPath();
                  ctx.arc(x, y, size, 0, 2 * Math.PI);
                  ctx.fillStyle = getNodeColor(node as GraphNode);
                  ctx.fill();
                  ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
                  ctx.lineWidth = 0.5;
                  ctx.stroke();
                  
                  // Draw label if zoom is sufficient and showLabels is true
                  if (showLabels && globalScale > 1) {
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = darkMode ? 'white' : 'black';
                    
                    // Add a background for better readability
                    const textWidth = ctx.measureText(label).width;
                    ctx.fillStyle = darkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
                    ctx.fillRect(
                      x - textWidth/2 - 2,
                      y + size + 2,
                      textWidth + 4,
                      fontSize + 2
                    );
                    
                    // Draw text
                    ctx.fillStyle = darkMode ? 'white' : 'black';
                    ctx.fillText(label, x, y + size + fontSize/2 + 2);
                  }
                }}
                cooldownTicks={100}
                linkDirectionalParticles={4}
                linkDirectionalParticleWidth={(link) => (link as GraphEdge).weight || 0}
                enableNodeDrag={true}
                enableZoomInteraction={true}
              />
            ) : (
              <ForceGraph3D
                ref={graphRef}
                graphData={filteredData}
                nodeId="id"
                nodeLabel={(node) => (node as GraphNode).label}
                nodeColor={(node) => getNodeColor(node as GraphNode)}
                nodeVal={(node) => getNodeSize(node as GraphNode)}
                linkColor={(link) => getLinkColor(link as GraphEdge)}
                linkWidth={(link) => (link as GraphEdge).weight || 1}
                linkDirectionalArrowLength={(link) => (link as GraphEdge).type === 'DEPENDS_ON' ? 4 : 0}
                onNodeClick={(node) => handleNodeClick(node as GraphNode)}
                nodeThreeObject={(node) => {
                  if (!showLabels) return null;
                  const label = (node as GraphNode).label;
                  
                  // Create a sprite to display the label
                  const sprite = new THREE.Sprite(
                    new THREE.SpriteMaterial({
                      map: createTextTexture(label),
                      color: darkMode ? 0xffffff : 0x000000,
                      sizeAttenuation: false
                    })
                  );
                  
                  // Position the sprite above the node
                  sprite.position.y = 5;
                  return sprite;
                }}
                
                // Helper function to create text texture
                function createTextTexture(text: string) {
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  if (!context) return new THREE.Texture();
                  
                  // Set canvas dimensions
                  canvas.width = 256;
                  canvas.height = 64;
                  
                  // Draw background (transparent)
                  context.fillStyle = 'rgba(0,0,0,0)';
                  context.fillRect(0, 0, canvas.width, canvas.height);
                  
                  // Draw text
                  context.font = '24px Arial';
                  context.fillStyle = 'white';
                  context.textAlign = 'center';
                  context.textBaseline = 'middle';
                  context.fillText(text, canvas.width / 2, canvas.height / 2);
                  
                  // Create texture from canvas
                  const texture = new THREE.Texture(canvas);
                  texture.needsUpdate = true;
                  return texture;
                }
                backgroundColor={darkMode ? '#1f2937' : '#ffffff'}
                enableNodeDrag={true}
                enableNavigationControls={true}
              />
            )}
            
            {/* Controls overlay */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <Button variant="secondary" size="icon" onClick={zoomIn} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={zoomOut} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={resetCamera} title="Reset View">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={exportAsPNG} title="Export as PNG">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 justify-between border-t p-4">
        <div className="text-sm text-muted-foreground">
          <span>Depth: {depth}</span>
          {initialNodeId && <span className="ml-2">| Centered on node: {initialNodeId}</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button size="sm">
            <Info className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardFooter>

      {/* Node details dialog */}
      <NodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} />
    </Card>
  );
};

export default GraphVisualizer;