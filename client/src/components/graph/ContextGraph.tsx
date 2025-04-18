import React, { useState, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Download, 
  Search, 
  Filter, 
  Layout, 
  Maximize2,
  List,
  FileText,
  User as UserIcon,
  Hash,
  GanttChart,
  MessageSquare,
  Calendar,
  ArrowLeftRight,
  X
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import colors from '@/styles/colors';

export interface GraphNode {
  id: string;
  label: string;
  type: 'document' | 'person' | 'topic' | 'project' | 'task' | 'entity' | 'event';
  group?: string;
  color?: string;
  size?: number;
  details?: any;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  strength?: number;
  color?: string;
  width?: number;
  details?: any;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ContextGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onLinkClick?: (link: GraphLink) => void;
  initialFilter?: { nodeTypes?: string[], linkTypes?: string[] };
  loading?: boolean;
  className?: string;
}

// Node type colors
const NODE_COLORS = {
  document: '#4285F4',  // Blue
  person: '#34A853',    // Green
  topic: '#FBBC05',     // Yellow
  project: '#EA4335',   // Red
  task: '#8B5CF6',      // Purple
  entity: '#EC4899',    // Pink
  event: '#F97316',     // Orange
};

// Node type icons (for the legend)
const NODE_ICONS = {
  document: <FileText className="h-4 w-4" />,
  person: <UserIcon className="h-4 w-4" />,
  topic: <Hash className="h-4 w-4" />,
  project: <GanttChart className="h-4 w-4" />,
  task: <List className="h-4 w-4" />,
  entity: <ArrowLeftRight className="h-4 w-4" />,
  event: <Calendar className="h-4 w-4" />,
};

/**
 * Context Graph Component
 * 
 * Visualizes relationships between nodes in a network according to UI/UX PRD specs
 */
export function ContextGraph({
  data,
  onNodeClick,
  onLinkClick,
  initialFilter,
  loading = false,
  className,
}: ContextGraphProps) {
  const graphRef = useRef<ForceGraphMethods>();
  const [filteredData, setFilteredData] = useState(data);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<'force' | 'radial' | 'circular'>('force');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    nodeTypes: initialFilter?.nodeTypes || Object.keys(NODE_COLORS),
    linkTypes: initialFilter?.linkTypes || [],
  });
  const [infoOpen, setInfoOpen] = useState(false);
  const [linkDistance, setLinkDistance] = useState(100);
  const [nodeSize, setNodeSize] = useState(10);

  // Update filtered data when base data or filters change
  useEffect(() => {
    if (!data) return;

    // Apply filters
    const filteredNodes = data.nodes.filter(node => 
      filters.nodeTypes.includes(node.type) &&
      (searchQuery 
        ? node.label.toLowerCase().includes(searchQuery.toLowerCase())
        : true)
    );
    
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    
    const filteredLinks = data.links.filter(link => 
      nodeIds.has(link.source.toString()) && 
      nodeIds.has(link.target.toString()) &&
      (filters.linkTypes.length > 0 
        ? filters.linkTypes.includes(link.type)
        : true)
    );
    
    setFilteredData({
      nodes: filteredNodes,
      links: filteredLinks
    });
  }, [data, filters, searchQuery]);

  // Handle zoom in/out
  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.2, 400);
      setZoomLevel(prev => Math.min(prev * 1.2, 5));
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.2, 400);
      setZoomLevel(prev => Math.max(prev / 1.2, 0.2));
    }
  };

  // Reset view
  const handleResetView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
      setZoomLevel(1);
    }
  };

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    
    // Highlight connected nodes and links
    const connectedNodes = new Set([node.id]);
    const connectedLinks = new Set();
    
    filteredData.links.forEach(link => {
      if (link.source === node.id || link.target === node.id) {
        const connectedNodeId = link.source === node.id ? link.target : link.source;
        connectedNodes.add(connectedNodeId);
        connectedLinks.add(link);
      }
    });
    
    setHighlightNodes(connectedNodes);
    setHighlightLinks(connectedLinks);
    
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  // Export graph as PNG
  const handleExportGraph = () => {
    if (graphRef.current) {
      const canvas = document.querySelector('.context-graph canvas') as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement('a');
        link.download = 'context-graph.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  // Apply a different layout algorithm
  const applyLayout = (layout: 'force' | 'radial' | 'circular') => {
    setLayoutAlgorithm(layout);
    if (graphRef.current) {
      if (layout === 'force') {
        // Default force layout
        graphRef.current.d3Force('link')?.distance(linkDistance);
        graphRef.current.d3Force('charge')?.strength(-100);
      } else if (layout === 'radial') {
        // Radial layout
        graphRef.current.d3Force('link')?.distance(linkDistance);
        graphRef.current.d3Force('charge')?.strength(-300);
        // Add radial force
        // @ts-ignore - d3Force allows string for adding new forces
        graphRef.current.d3Force('radial', d3.forceRadial(200));
      } else if (layout === 'circular') {
        // Circular layout approximation
        graphRef.current.d3Force('link')?.distance(linkDistance);
        graphRef.current.d3Force('charge')?.strength(-50);
        // Position nodes in a circle
        const nodeCount = filteredData.nodes.length;
        const radius = Math.min(500, nodeCount * 10);
        filteredData.nodes.forEach((node, i) => {
          const angle = (i / nodeCount) * 2 * Math.PI;
          node.x = radius * Math.cos(angle);
          node.y = radius * Math.sin(angle);
        });
      }
      graphRef.current.refresh();
    }
  };

  // Node painter function
  const nodeCanvasObject = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { id, x, y, label, type, size = nodeSize } = node;
    
    // Is this node highlighted?
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(id);
    
    // Node color based on type
    const color = NODE_COLORS[type] || NODE_COLORS.document;
    
    // Draw node
    ctx.beginPath();
    ctx.fillStyle = isHighlighted ? color : `${color}80`; // 50% opacity if not highlighted
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw outline
    ctx.strokeStyle = isHighlighted ? '#ffffff' : '#ffffff80';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw label if zoom level is sufficient or node is selected
    if ((showLabels && globalScale >= 0.8) || id === selectedNode?.id) {
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      
      // Draw background for text
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth + 8, fontSize + 4].map(n => n + 2 * globalScale);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(
        x - bckgDimensions[0] / 2,
        y + size + 2,
        bckgDimensions[0],
        bckgDimensions[1]
      );
      
      // Draw text
      ctx.fillStyle = '#000000';
      ctx.fillText(label, x, y + size + fontSize / 2 + 4);
    }
  };

  // Link painter function
  const linkCanvasObject = (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Get source and target
    const source = typeof link.source === 'object' ? link.source : filteredData.nodes.find(node => node.id === link.source);
    const target = typeof link.target === 'object' ? link.target : filteredData.nodes.find(node => node.id === link.target);
    
    if (!source || !target) return;
    
    // Is this link highlighted?
    const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(link);
    
    // Link width
    const width = link.width || (isHighlighted ? 2 : 1);
    
    // Link color
    const color = isHighlighted ? '#666666' : '#99999980';
    
    // Draw link
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    // Draw link label if zoom level is sufficient
    if (globalScale >= 1.2 && link.type) {
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      
      const fontSize = 10 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw background for text
      const textWidth = ctx.measureText(link.type).width;
      const bckgDimensions = [textWidth + 6, fontSize + 2].map(n => n + 2 * globalScale);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(
        midX - bckgDimensions[0] / 2,
        midY - bckgDimensions[1] / 2,
        bckgDimensions[0],
        bckgDimensions[1]
      );
      
      // Draw text
      ctx.fillStyle = '#666666';
      ctx.fillText(link.type, midX, midY);
    }
  };

  // Render graph legend
  const renderLegend = () => {
    return (
      <div className="bg-white/80 p-3 rounded-lg shadow-sm border absolute bottom-4 left-4 z-10 text-sm">
        <h4 className="font-medium mb-2">Node Types</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div 
              key={type} 
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded transition-colors cursor-pointer hover:bg-gray-100",
                filters.nodeTypes.includes(type) ? "opacity-100" : "opacity-40"
              )}
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  nodeTypes: prev.nodeTypes.includes(type)
                    ? prev.nodeTypes.filter(t => t !== type)
                    : [...prev.nodeTypes, type]
                }));
              }}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              ></div>
              <div className="flex items-center gap-1">
                {NODE_ICONS[type]}
                <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render node details panel
  const renderNodeDetails = () => {
    if (!selectedNode) return null;
    
    return (
      <Card className="absolute top-4 right-4 w-64 z-10 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: NODE_COLORS[selectedNode.type] || '#888888' }}
            ></div>
            {selectedNode.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="text-xs text-muted-foreground">
            <div className="mb-1">Type: {selectedNode.type}</div>
            {selectedNode.group && <div className="mb-1">Group: {selectedNode.group}</div>}
            <div className="mb-1">
              Connections: {
                filteredData.links.filter(
                  link => link.source === selectedNode.id || link.target === selectedNode.id
                ).length
              }
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs h-7"
            onClick={() => setInfoOpen(true)}
          >
            View Details
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-muted/30 rounded-md">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
          <p className="text-muted-foreground">Loading graph visualization...</p>
        </div>
      </div>
    );
  }

  if (!filteredData.nodes.length) {
    return (
      <div className="flex items-center justify-center h-80 bg-muted/30 rounded-md">
        <div className="flex flex-col items-center text-center max-w-md px-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No graph data available</h3>
          <p className="text-sm text-muted-foreground">
            There is no relationship data to visualize with the current filters. 
            Try adjusting your filters or adding more content to generate relationships.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Graph Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <TooltipProvider>
          <div className="bg-white/90 rounded-lg shadow-sm border p-1">
            <div className="flex flex-col gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Zoom in</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Zoom out</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleResetView}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Reset view</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Layout Controls */}
          <div className="bg-white/90 rounded-lg shadow-sm border p-1">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Layout className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Change layout</TooltipContent>
              </Tooltip>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={layoutAlgorithm === 'force'}
                  onCheckedChange={() => applyLayout('force')}
                >
                  Force-directed
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={layoutAlgorithm === 'radial'}
                  onCheckedChange={() => applyLayout('radial')}
                >
                  Radial layout
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={layoutAlgorithm === 'circular'}
                  onCheckedChange={() => applyLayout('circular')}
                >
                  Circular layout
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Display Options */}
          <div className="bg-white/90 rounded-lg shadow-sm border p-1">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Display options</TooltipContent>
              </Tooltip>
              <DropdownMenuContent>
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="show-labels" className="text-sm">Show Labels</Label>
                    <Switch 
                      id="show-labels" 
                      checked={showLabels} 
                      onCheckedChange={setShowLabels} 
                    />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="show-legend" className="text-sm">Show Legend</Label>
                    <Switch 
                      id="show-legend" 
                      checked={showLegend} 
                      onCheckedChange={setShowLegend} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="link-distance" className="text-sm">Link Distance</Label>
                    <Slider 
                      id="link-distance"
                      min={30} 
                      max={200} 
                      step={10}
                      value={[linkDistance]}
                      onValueChange={(value) => {
                        setLinkDistance(value[0]);
                        if (graphRef.current) {
                          graphRef.current.d3Force('link')?.distance(value[0]);
                          graphRef.current.refresh();
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1 mt-3">
                    <Label htmlFor="node-size" className="text-sm">Node Size</Label>
                    <Slider 
                      id="node-size"
                      min={4} 
                      max={20} 
                      step={1}
                      value={[nodeSize]}
                      onValueChange={(value) => setNodeSize(value[0])}
                    />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleExportGraph}
                  className="flex items-center cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export as image
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
      </div>

      {/* Search Box */}
      <div className="absolute top-4 right-4 z-10 w-64 bg-white/90 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="pl-8 pr-8 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="relative h-[600px] w-full overflow-hidden rounded-md bg-muted/20 context-graph border shadow-sm">
        <ForceGraph2D
          ref={graphRef}
          graphData={filteredData}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          cooldownTicks={100}
          onNodeClick={handleNodeClick}
          onNodeRightClick={() => {
            setSelectedNode(null);
            setHighlightNodes(new Set());
            setHighlightLinks(new Set());
          }}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          nodeRelSize={1}
          backgroundColor="rgba(255,255,255,0.01)"
          warmupTicks={100}
          width={800}
          height={600}
        />
        
        {/* Node details panel (only shown when a node is selected) */}
        {selectedNode && renderNodeDetails()}
        
        {/* Legend */}
        {showLegend && renderLegend()}
      </div>

      {/* Information Panel (opened when a node is clicked) */}
      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent className="w-[350px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle>Node Details</SheetTitle>
          </SheetHeader>
          {selectedNode && (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: NODE_COLORS[selectedNode.type] || '#888888' }}
                  ></div>
                  {selectedNode.label}
                </h3>
                <Badge variant="outline" className="mt-1">
                  {selectedNode.type}
                </Badge>
              </div>
              
              {/* Connected nodes */}
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Connected to:</h4>
                <div className="space-y-2">
                  {filteredData.links
                    .filter(link => link.source === selectedNode.id || link.target === selectedNode.id)
                    .map((link, idx) => {
                      const connectedNodeId = link.source === selectedNode.id ? link.target : link.source;
                      const connectedNode = filteredData.nodes.find(n => n.id === connectedNodeId);
                      if (!connectedNode) return null;
                      
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: NODE_COLORS[connectedNode.type] || '#888888' }}
                          ></div>
                          <span>{connectedNode.label}</span>
                          <span className="text-xs text-muted-foreground mx-1">via</span>
                          <Badge variant="outline" className="text-xs h-5">
                            {link.type}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              {/* Details section */}
              {selectedNode.details && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Details:</h4>
                  <div className="text-sm space-y-2">
                    {Object.entries(selectedNode.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ContextGraph;