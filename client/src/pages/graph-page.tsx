import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import GraphVisualizer from '../components/visualizations/GraphVisualizer';
import { getMockGraphData, mockGraphSearch } from '../lib/mockData';
import { GraphNode } from '../components/visualizations/GraphVisualizer';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, DownloadCloud, Code, Settings, Pin, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const GraphPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | undefined>(undefined);
  const [depth, setDepth] = useState<number>(2);
  const [nodeLimit, setNodeLimit] = useState<number>(100);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('graph');
  
  // State for dialogs
  const [apiDialogOpen, setApiDialogOpen] = useState<boolean>(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false);
  
  // Toast notifications
  const { toast } = useToast();
  
  // Parse node ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nodeId = params.get('nodeId');
    if (nodeId && !isNaN(parseInt(nodeId))) {
      setSelectedNodeId(parseInt(nodeId));
    }
  }, [location]);
  
  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // In a real app, this would call an API endpoint
      const results = await mockGraphSearch(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!e.target.value.trim()) {
      setSearchResults([]);
    }
  };
  
  // Handle node selection from search results
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSearchResults([]);
    setSearchTerm('');
    
    // Update URL with nodeId
    const params = new URLSearchParams(window.location.search);
    params.set('nodeId', nodeId.toString());
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  };
  
  // Handle depth change
  const handleDepthChange = (newDepth: number[]) => {
    setDepth(newDepth[0]);
  };
  
  // Handle filter click
  const handleFilterClick = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
  };
  
  // Handle export button click
  const handleExport = () => {
    toast({
      title: "Exporting graph data",
      description: "Your graph data is being prepared for download.",
    });
    
    // In a real implementation, we would fetch the data and create a download
    setTimeout(() => {
      // Create sample data for demonstration
      const graphData = {
        nodes: getMockGraphData(selectedNodeId || 1, depth).nodes,
        links: getMockGraphData(selectedNodeId || 1, depth).links,
        metadata: {
          exportedAt: new Date().toISOString(),
          depth: depth,
          nodeLimit: nodeLimit,
          filter: activeFilter,
        }
      };
      
      // Create and download the file
      const dataStr = JSON.stringify(graphData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportFileDefaultName = `graph-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast({
        title: "Export complete",
        description: "Graph data has been downloaded successfully.",
      });
    }, 1000);
  };
  
  // Handle API dialog open/close
  const handleApiDialogToggle = () => {
    setApiDialogOpen(!apiDialogOpen);
  };
  
  // Handle settings dialog open/close
  const handleSettingsDialogToggle = () => {
    setSettingsDialogOpen(!settingsDialogOpen);
  };
  
  return (
    <div className="container mx-auto py-6 max-w-full">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Context Graph</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <DownloadCloud className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleApiDialogToggle}>
              <Code className="mr-2 h-4 w-4" />
              API
            </Button>
            <Button variant="outline" size="sm" onClick={handleSettingsDialogToggle}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Search & Filter</CardTitle>
                <CardDescription>
                  Find nodes and connections in the graph
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name, type..."
                      value={searchTerm}
                      onChange={handleSearchInputChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button size="sm" onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto border rounded-md p-2">
                    <h4 className="text-sm font-medium mb-2">Results ({searchResults.length})</h4>
                    <ul className="space-y-2">
                      {searchResults.map((node) => (
                        <li key={node.id} className="text-sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleNodeSelect(node.id)}
                          >
                            <Badge
                              variant="outline"
                              className="mr-2"
                              style={{
                                backgroundColor:
                                  node.type === 'DOCUMENT'
                                    ? '#e0f2fe'
                                    : node.type === 'MESSAGE'
                                    ? '#dcfce7'
                                    : node.type === 'ENTITY'
                                    ? '#f3e8ff'
                                    : node.type === 'TOPIC'
                                    ? '#fef9c3'
                                    : node.type === 'USER'
                                    ? '#fee2e2'
                                    : node.type === 'PROJECT'
                                    ? '#e0e7ff'
                                    : node.type === 'TASK'
                                    ? '#f1f5f9'
                                    : '#f5f5f5',
                              }}
                            >
                              {node.type}
                            </Badge>
                            {node.label}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2">Node Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {['DOCUMENT', 'MESSAGE', 'ENTITY', 'TOPIC', 'USER', 'PROJECT', 'TASK'].map(
                      (type) => (
                        <Badge
                          key={type}
                          variant={activeFilter === type ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => handleFilterClick(type)}
                          style={{
                            backgroundColor:
                              activeFilter === type
                                ? type === 'DOCUMENT'
                                  ? '#60a5fa'
                                  : type === 'MESSAGE'
                                  ? '#34d399'
                                  : type === 'ENTITY'
                                  ? '#a78bfa'
                                  : type === 'TOPIC'
                                  ? '#fbbf24'
                                  : type === 'USER'
                                  ? '#f87171'
                                  : type === 'PROJECT'
                                  ? '#818cf8'
                                  : type === 'TASK'
                                  ? '#94a3b8'
                                  : '#9ca3af'
                                : undefined,
                          }}
                        >
                          {type}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="depth">Depth: {depth}</Label>
                  </div>
                  <Slider
                    id="depth"
                    min={1}
                    max={5}
                    step={1}
                    defaultValue={[depth]}
                    onValueChange={handleDepthChange}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Depth of connections to display from central node
                  </p>
                </div>
                
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="node-limit">Node Limit: {nodeLimit}</Label>
                  </div>
                  <Slider
                    id="node-limit"
                    min={10}
                    max={500}
                    step={10}
                    defaultValue={[nodeLimit]}
                    onValueChange={(value) => setNodeLimit(value[0])}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum number of nodes to display
                  </p>
                </div>
                
                <div className="mt-6">
                  <div className="flex items-center space-x-2">
                    <Switch id="pin-selection" />
                    <Label htmlFor="pin-selection">Pin selected node</Label>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-2">
                {selectedNodeId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedNodeId(undefined)}
                  >
                    Clear Selection
                  </Button>
                )}
                {activeFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveFilter(null)}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="col-span-1 lg:col-span-3">
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="graph">Graph View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="graph" className="m-0">
                <GraphVisualizer
                  initialNodeId={selectedNodeId}
                  depth={depth}
                  height={700}
                  width="100%"
                />
              </TabsContent>
              
              <TabsContent value="table" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Graph Data</CardTitle>
                    <CardDescription>
                      View and analyze the nodes and connections in tabular format
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Table view is not implemented yet.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="stats" className="m-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Graph Statistics</CardTitle>
                    <CardDescription>
                      View analytics and metrics about the graph structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Statistics view is not implemented yet.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* API Dialog */}
      <Dialog open={apiDialogOpen} onOpenChange={setApiDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Graph API Documentation</DialogTitle>
            <DialogDescription>
              Access the graph data programmatically using the following API endpoints.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="rounded-md bg-muted p-4">
              <h3 className="text-sm font-medium mb-2">Get Graph Visualization</h3>
              <p className="text-xs mb-2">Retrieve a graph visualization data with specified parameters.</p>
              <div className="bg-background rounded-md p-2 overflow-x-auto">
                <code className="text-xs">
                  GET /api/graph/visualization?depth=2&nodeId=12&nodeLimit=100&filter=DOCUMENT
                </code>
              </div>
              <p className="text-xs mt-2 text-muted-foreground">
                Parameters:
                <br />• depth (optional): Depth of connections from central node (1-5)
                <br />• nodeId (optional): ID of the central node
                <br />• nodeLimit (optional): Maximum number of nodes to return
                <br />• filter (optional): Filter by node type
              </p>
            </div>
            
            <div className="rounded-md bg-muted p-4">
              <h3 className="text-sm font-medium mb-2">Search Nodes</h3>
              <p className="text-xs mb-2">Search for nodes in the graph by keyword.</p>
              <div className="bg-background rounded-md p-2 overflow-x-auto">
                <code className="text-xs">
                  GET /api/graph/search?query=project&limit=10
                </code>
              </div>
              <p className="text-xs mt-2 text-muted-foreground">
                Parameters:
                <br />• query (required): Search term
                <br />• limit (optional): Maximum number of results to return
              </p>
            </div>
            
            <div className="rounded-md bg-muted p-4">
              <h3 className="text-sm font-medium mb-2">Get Node Details</h3>
              <p className="text-xs mb-2">Get detailed information about a specific node.</p>
              <div className="bg-background rounded-md p-2 overflow-x-auto">
                <code className="text-xs">
                  GET /api/graph/node/:id
                </code>
              </div>
              <p className="text-xs mt-2 text-muted-foreground">
                Parameters:
                <br />• id (required): Node ID
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Graph Visualization Settings</DialogTitle>
            <DialogDescription>
              Customize the appearance and behavior of the graph visualization.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Performance</h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="webgl-renderer">WebGL Renderer</Label>
                  <p className="text-xs text-muted-foreground">
                    Use WebGL for better performance with large graphs
                  </p>
                </div>
                <Switch id="webgl-renderer" defaultChecked />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Appearance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="node-size">Node Size</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger id="node-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-width">Link Width</Label>
                  <Select defaultValue="default">
                    <SelectTrigger id="link-width">
                      <SelectValue placeholder="Select width" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thin">Thin</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="thick">Thick</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Interaction</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="zoom-to-fit">Auto Zoom to Fit</Label>
                  <Switch id="zoom-to-fit" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-labels">Always Show Labels</Label>
                  <Switch id="show-labels" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="directional-links">Directional Links</Label>
                  <Switch id="directional-links" defaultChecked />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Settings Saved",
                description: "Your graph visualization settings have been updated.",
              });
              setSettingsDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GraphPage;