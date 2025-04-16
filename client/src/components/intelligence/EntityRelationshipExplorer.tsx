import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Search, Network, Users, FileText, MessageSquare, CalendarClock, Folder, Tag } from "lucide-react";
import { RelationshipGraph, type RelationshipGraphData } from "@/components/visualizations/RelationshipGraph";

interface EntityRelationshipExplorerProps {
  initialEntityId?: string;
  initialEntityType?: string;
  entityTypes?: string[];
  title?: string;
  description?: string;
  height?: number;
}

interface EntityDetails {
  id: string;
  type: string;
  name: string;
  description: string;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  relatedCount: number;
}

type EntityType = "person" | "document" | "project" | "task" | "message" | "event" | "folder" | "any";

export function EntityRelationshipExplorer({
  initialEntityId,
  initialEntityType,
  entityTypes = ["person", "document", "project", "task", "message", "event", "folder"],
  title = "Entity Relationship Explorer",
  description = "Explore relationships between entities in your project ecosystem",
  height = 650,
}: EntityRelationshipExplorerProps) {
  const [selectedEntity, setSelectedEntity] = useState<string | undefined>(initialEntityId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [entityType, setEntityType] = useState<EntityType>(initialEntityType as EntityType || "any");
  const [selectedDepth, setSelectedDepth] = useState<number>(2);
  const [selectedScoreThreshold, setSelectedScoreThreshold] = useState<number>(0.3);

  // Query to fetch graph data
  const {
    data: graphData,
    isLoading: graphLoading,
  } = useQuery<RelationshipGraphData>({
    queryKey: ["/api/analytics/entity-relationships", { 
      entityId: selectedEntity,
      entityType: entityType !== "any" ? entityType : undefined,
      depth: selectedDepth,
      scoreThreshold: selectedScoreThreshold,
    }],
    enabled: !!selectedEntity,
  });

  // Query to fetch entity details when one is selected
  const {
    data: entityDetails,
    isLoading: entityLoading,
  } = useQuery<EntityDetails>({
    queryKey: ["/api/entities", { id: selectedEntity }],
    enabled: !!selectedEntity,
  });

  // Query to search for entities
  const {
    data: searchResults,
    isLoading: searchLoading,
    refetch: searchEntities,
  } = useQuery<EntityDetails[]>({
    queryKey: ["/api/entities/search", { query: searchQuery, type: entityType !== "any" ? entityType : undefined }],
    enabled: false,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchEntities();
    }
  };

  const handleEntityClick = (id: string) => {
    setSelectedEntity(id);
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case "person":
        return <Users className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "project":
        return <Folder className="h-4 w-4" />;
      case "task":
        return <Tag className="h-4 w-4" />;
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "event":
        return <CalendarClock className="h-4 w-4" />;
      case "folder":
        return <Folder className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case "person":
        return "bg-blue-100 text-blue-800";
      case "document":
        return "bg-amber-100 text-amber-800";
      case "project":
        return "bg-green-100 text-green-800";
      case "task":
        return "bg-purple-100 text-purple-800";
      case "message":
        return "bg-pink-100 text-pink-800";
      case "event":
        return "bg-red-100 text-red-800";
      case "folder":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderSearchResults = () => {
    if (!searchResults || searchResults.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          No entities found matching your search criteria.
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {searchResults.map((entity) => (
          <div 
            key={entity.id}
            className="flex items-center justify-between p-3 border rounded-md hover:bg-muted cursor-pointer"
            onClick={() => handleEntityClick(entity.id)}
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${getEntityTypeColor(entity.type)}`}>
                {getEntityTypeIcon(entity.type)}
              </div>
              <div>
                <p className="font-medium leading-none">{entity.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{entity.description.substring(0, 60)}...</p>
              </div>
            </div>
            <Badge variant="outline" className="whitespace-nowrap">
              {entity.relatedCount} connections
            </Badge>
          </div>
        ))}
      </div>
    );
  };

  const renderEntityDetails = () => {
    if (!entityDetails) return null;

    return (
      <div className="border rounded-md p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${getEntityTypeColor(entityDetails.type)}`}>
            {getEntityTypeIcon(entityDetails.type)}
          </div>
          <div>
            <h3 className="text-lg font-medium">{entityDetails.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{entityDetails.description}</p>
            
            {entityDetails.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entityDetails.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span>Created: {new Date(entityDetails.createdAt).toLocaleString()}</span>
              <span>Updated: {new Date(entityDetails.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <div className="flex gap-2">
              <Input 
                placeholder="Search for entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="default" size="icon" onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? <Spinner size="sm" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Select value={entityType} onValueChange={(value) => setEntityType(value as EntityType)}>
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All Types</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {searchLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : searchResults ? (
          renderSearchResults()
        ) : null}
        
        {selectedEntity && (
          <div className="space-y-4">
            {entityLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="md" />
              </div>
            ) : (
              renderEntityDetails()
            )}

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Network className="h-5 w-5" />
                Relationship Visualization
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Depth:</label>
                  <Select value={selectedDepth.toString()} onValueChange={(v) => setSelectedDepth(Number(v))}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm">Relevance:</label>
                  <Select 
                    value={selectedScoreThreshold.toString()} 
                    onValueChange={(v) => setSelectedScoreThreshold(Number(v))}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.1">Low</SelectItem>
                      <SelectItem value="0.3">Medium</SelectItem>
                      <SelectItem value="0.6">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {graphLoading ? (
              <div className="flex justify-center items-center h-[400px]">
                <Spinner size="lg" />
              </div>
            ) : graphData ? (
              <RelationshipGraph 
                width={1000} 
                height={height} 
                focusId={selectedEntity}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Network className="h-12 w-12 mb-2 text-muted-foreground/50" />
                <p>No relationship data available for this entity.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}