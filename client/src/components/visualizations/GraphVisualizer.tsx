import { useEffect, useRef, useState } from 'react';
import ForceGraph3D, { ForceGraphInstance } from 'react-force-graph';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { Loader2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Node {
  id: number;
  label: string;
  type: string;
  group: string;
  properties: Record<string, any>;
}

interface Link {
  source: number;
  target: number;
  label: string;
  value: number;
  properties: Record<string, any>;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const nodeColors: Record<string, string> = {
  DOCUMENT: '#4285F4', // Blue
  MESSAGE: '#34A853',  // Green
  ENTITY: '#FBBC05',   // Yellow
  TOPIC: '#EA4335',    // Red
  USER: '#9C27B0',     // Purple
  PROJECT: '#FF9800',  // Orange
  TASK: '#00BCD4',     // Cyan
};

const NODE_SIZE = 5;
const linkColors: Record<string, string> = {
  CONTAINS: '#4285F4',
  MENTIONED_IN: '#34A853',
  DISCUSSES: '#FBBC05',
  AUTHORED_BY: '#EA4335',
  REPLIED: '#9C27B0',
  RELATED: '#FF9800',
  DEPENDS_ON: '#00BCD4',
  REFERS_TO: '#3F51B5',
  SIMILAR_TO: '#009688',
  ASSOCIATED_WITH: '#795548',
  PART_OF: '#607D8B',
};

const GraphVisualizer = ({ centralNodeId, depth = 2, limit = 100 }: { centralNodeId?: number; depth?: number; limit?: number }) => {
  const { toast } = useToast();
  const graphRef = useRef<ForceGraphInstance>();
  const [graphType, setGraphType] = useState<'3d' | '2d'>('3d');
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  
  // Fetch the graph data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/graph/visualization', { nodeId: centralNodeId, depth, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (centralNodeId) params.append('nodeId', centralNodeId.toString());
      params.append('depth', depth.toString());
      params.append('limit', limit.toString());
      
      const response = await fetch(`/api/graph/visualization?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch graph data');
      }
      return response.json() as Promise<GraphData>;
    }
  });
  
  // Fetch details about selected node
  const { data: nodeDetails } = useQuery({
    queryKey: ['/api/graph/nodes', selectedNodeId],
    queryFn: async () => {
      if (!selectedNodeId) return null;
      const response = await fetch(`/api/graph/nodes/${selectedNodeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch node details');
      }
      return response.json();
    },
    enabled: !!selectedNodeId,
  });
  
  // Set selected node with details when they arrive
  useEffect(() => {
    if (nodeDetails && selectedNodeId) {
      setSelectedNode(nodeDetails);
    }
  }, [nodeDetails, selectedNodeId]);
  
  // Apply zoom when changed
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.zoom(zoom, 300);
    }
  }, [zoom]);
  
  // Handle errors
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error loading graph",
        description: "There was a problem fetching the graph data.",
        variant: "destructive"
      });
    }
  }, [isError, toast]);
  
  // Filter nodes by type if a filter is applied
  const filteredData = data && filterType ? {
    nodes: data.nodes.filter(node => node.type === filterType),
    links: data.links.filter(link => {
      const sourceNode = data.nodes.find(n => n.id === link.source);
      const targetNode = data.nodes.find(n => n.id === link.target);
      return (sourceNode?.type === filterType || targetNode?.type === filterType);
    })
  } : data;
  
  // Reset zoom
  const resetZoom = () => {
    setZoom(1);
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };
  
  // Handle node click
  const handleNodeClick = (node: Node) => {
    setSelectedNodeId(node.id);
    
    if (graphRef.current) {
      graphRef.current.centerAt(
        (node as any).x,
        (node as any).y,
        1000
      );
      graphRef.current.zoom(1.5, 1000);
    }
  };
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Knowledge Graph Visualization</CardTitle>
            <CardDescription>
              {centralNodeId 
                ? `Showing relationships around node #${centralNodeId}` 
                : 'Showing the entire knowledge graph'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <TabsList>
              <TabsTrigger 
                value="3d" 
                onClick={() => setGraphType('3d')}
                className={graphType === '3d' ? 'bg-primary text-primary-foreground' : ''}
              >
                3D
              </TabsTrigger>
              <TabsTrigger 
                value="2d" 
                onClick={() => setGraphType('2d')}
                className={graphType === '2d' ? 'bg-primary text-primary-foreground' : ''}
              >
                2D
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          <Select value={filterType || ''} onValueChange={(value) => setFilterType(value || null)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="DOCUMENT">Documents</SelectItem>
              <SelectItem value="MESSAGE">Messages</SelectItem>
              <SelectItem value="ENTITY">Entities</SelectItem>
              <SelectItem value="TOPIC">Topics</SelectItem>
              <SelectItem value="USER">Users</SelectItem>
              <SelectItem value="PROJECT">Projects</SelectItem>
              <SelectItem value="TASK">Tasks</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 ml-2 flex-1">
            <ZoomOut className="h-4 w-4" />
            <Slider 
              value={[zoom]} 
              min={0.1} 
              max={2} 
              step={0.1} 
              onValueChange={(value) => setZoom(value[0])}
              className="w-32"
            />
            <ZoomIn className="h-4 w-4" />
            <Button variant="ghost" size="sm" onClick={resetZoom}>Reset</Button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {Object.entries(nodeColors).map(([type, color]) => (
              <Badge key={type} style={{ backgroundColor: color }} className="text-white">
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col md:flex-row h-[70vh]">
        <div className="relative w-full h-full min-h-[400px] mb-4 md:mb-0 border rounded-lg">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : graphType === '3d' ? (
            <ForceGraph3D
              ref={graphRef as any}
              graphData={filteredData || { nodes: [], links: [] }}
              nodeLabel={(node: any) => `${node.label} (${node.type})`}
              nodeColor={(node: any) => nodeColors[node.type] || '#999'}
              nodeRelSize={NODE_SIZE}
              linkWidth={(link: any) => link.value || 1}
              linkColor={(link: any) => linkColors[link.label] || '#999'}
              linkLabel={(link: any) => link.label}
              onNodeClick={handleNodeClick}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={2}
              linkDirectionalParticleSpeed={0.01}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              backgroundColor="#00000000"
            />
          ) : (
            <ForceGraph3D
              ref={graphRef as any}
              graphData={filteredData || { nodes: [], links: [] }}
              nodeLabel={(node: any) => `${node.label} (${node.type})`}
              nodeColor={(node: any) => nodeColors[node.type] || '#999'}
              nodeRelSize={NODE_SIZE}
              linkWidth={(link: any) => link.value || 1}
              linkColor={(link: any) => linkColors[link.label] || '#999'}
              linkLabel={(link: any) => link.label}
              onNodeClick={handleNodeClick}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={2}
              linkDirectionalParticleSpeed={0.01}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              backgroundColor="#00000000"
              // 2D-specific props
              linkCurvature={0.25}
            />
          )}
        </div>
        
        {selectedNode && (
          <div className="md:ml-4 w-full md:w-1/3 border rounded-lg p-4 overflow-auto">
            <h3 className="text-lg font-medium">Selected Node Details</h3>
            <p className="text-sm text-muted-foreground mb-4">Node #{selectedNode.id}</p>
            
            <div className="space-y-2">
              <div>
                <span className="font-medium">Label:</span> {selectedNode.label}
              </div>
              <div>
                <span className="font-medium">Type:</span> 
                <Badge className="ml-2" style={{ backgroundColor: nodeColors[selectedNode.type] }}>
                  {selectedNode.type}
                </Badge>
              </div>
              <div className="border-t pt-2 mt-2">
                <span className="font-medium">Properties:</span>
                <pre className="bg-muted p-2 rounded-md text-xs mt-1 max-h-32 overflow-auto">
                  {JSON.stringify(selectedNode.properties, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="mt-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  window.location.href = `/graph?nodeId=${selectedNode.id}&depth=2`;
                }}
              >
                Explore from this node
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GraphVisualizer;