import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraphNode, GraphLink } from '@/lib/types/graphTypes';
import { X, ExternalLink, Calendar, User, Tag, FileText, Link2, FileType2, Mail, MessageSquare } from 'lucide-react';

interface EntityDetailCardProps {
  entity: GraphNode | GraphLink | null;
  type: 'node' | 'link';
  onClose: () => void;
  onNavigate?: (entity: GraphNode | GraphLink) => void;
}

export default function EntityDetailCard({ 
  entity, 
  type, 
  onClose,
  onNavigate
}: EntityDetailCardProps) {
  if (!entity) return null;

  // Function to format ISO timestamp to readable format
  const formatDate = (isoDate: string) => {
    if (!isoDate) return 'N/A';
    try {
      return new Date(isoDate).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Determine icon based on node type
  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'project': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'document': return <FileType2 className="h-5 w-5 text-orange-500" />;
      case 'task': return <Tag className="h-5 w-5 text-green-500" />;
      case 'person': return <User className="h-5 w-5 text-purple-500" />;
      case 'team': return <User className="h-5 w-5 text-indigo-500" />;
      case 'email': return <Mail className="h-5 w-5 text-yellow-500" />;
      case 'comment': return <MessageSquare className="h-5 w-5 text-red-500" />;
      default: return <Tag className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-medium">
            {type === 'node' 
              ? (entity as GraphNode).name
              : `${(entity as GraphLink).type} Relationship`
            }
          </CardTitle>
          <CardDescription>
            {type === 'node' 
              ? `${(entity as GraphNode).type} ID: ${(entity as GraphNode).id}`
              : `Connection between entities`
            }
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {type === 'node' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {getNodeIcon((entity as GraphNode).type)}
              <Badge variant="outline">{(entity as GraphNode).type}</Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Metadata</h4>
              {(entity as GraphNode).metadata ? (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify((entity as GraphNode).metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No metadata available</p>
              )}
            </div>
          </div>
        )}
        
        {type === 'link' && (
          <div className="space-y-4">
            <div>
              <div className="text-sm mb-1">Source → Target</div>
              <div className="bg-muted p-2 rounded text-sm">
                {typeof (entity as GraphLink).source === 'object' 
                  ? (entity as any).source.id 
                  : (entity as GraphLink).source
                } → {
                  typeof (entity as GraphLink).target === 'object'
                    ? (entity as any).target.id
                    : (entity as GraphLink).target
                }
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link2 className="h-4 w-4" />
              <Badge>{(entity as GraphLink).type}</Badge>
              {(entity as GraphLink).strength && (
                <Badge variant="outline">
                  Strength: {((entity as GraphLink).strength || 0).toFixed(2)}
                </Badge>
              )}
            </div>
            
            {(entity as GraphLink).timestamp && (
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate((entity as GraphLink).timestamp!)}</span>
              </div>
            )}
            
            {(entity as GraphLink).description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm">{(entity as GraphLink).description}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {onNavigate && (
          <Button variant="outline" className="w-full" onClick={() => onNavigate(entity)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}