/**
 * Entity Relationship Explorer Component
 * 
 * This component allows users to explore entity relationships extracted from text
 * using the OpenAI API. It provides a text input interface and visualizes the
 * detected entities and their relationships.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Entity, Relation, Graph, GraphNode, GraphLink } from '@/types/ai-types';
import { useEntityExtraction, useRelationExtraction } from '@/hooks/use-ai-api';
import { Loader2, Network } from 'lucide-react';
import RelationshipGraph from '@/components/visualizations/RelationshipGraph';

export default function EntityRelationshipExplorer() {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [graph, setGraph] = useState<Graph>({ nodes: [], links: [] });
  
  const entityExtraction = useEntityExtraction();
  const relationExtraction = useRelationExtraction();
  
  const isLoading = entityExtraction.isPending || relationExtraction.isPending;
  
  const handleAnalyze = async () => {
    if (!text.trim() || isLoading) return;
    
    // Reset previous results
    setEntities([]);
    setRelations([]);
    setGraph({ nodes: [], links: [] });
    
    try {
      // Extract entities
      const extractedEntities = await entityExtraction.mutateAsync(text);
      setEntities(extractedEntities);
      
      if (extractedEntities.length > 0) {
        // Extract relations if entities were found
        const extractedRelations = await relationExtraction.mutateAsync({ 
          text, 
          entities: extractedEntities 
        });
        setRelations(extractedRelations);
        
        // Build graph for visualization
        buildGraph(extractedEntities, extractedRelations);
        
        // Switch to results tab if successful
        setActiveTab('visualization');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };
  
  const buildGraph = (entities: Entity[], relations: Relation[]) => {
    const nodes: GraphNode[] = entities.map(entity => ({
      id: entity.name,
      label: entity.name,
      type: entity.type,
      size: Math.max(30, Math.min(50, entity.confidence * 40 + 30)), // Size based on confidence
      metadata: { confidence: entity.confidence }
    }));
    
    const links: GraphLink[] = relations.map(relation => ({
      source: relation.source,
      target: relation.target,
      label: relation.relationType,
      value: relation.confidence,
      metadata: { context: relation.context }
    }));
    
    setGraph({ nodes, links });
  };
  
  const getEntityBadgeColor = (entityType: string) => {
    const typeColorMap: Record<string, string> = {
      person: 'bg-blue-500',
      organization: 'bg-red-500',
      location: 'bg-green-500',
      date: 'bg-yellow-500',
      project: 'bg-purple-500',
      technology: 'bg-indigo-500',
      document: 'bg-pink-500'
    };
    
    return typeColorMap[entityType.toLowerCase()] || 'bg-gray-500';
  };
  
  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Entity Relationship Explorer
        </CardTitle>
        <CardDescription>
          Extract entities and discover relationships in your text using AI
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px] mx-auto">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="visualization" disabled={entities.length === 0}>
            Visualization
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="input" className="p-4">
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your text to analyze for entities and relationships..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[200px]"
            />
            
            <Button 
              onClick={handleAnalyze} 
              disabled={!text.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : 'Analyze Text'}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="visualization" className="p-4">
          <div className="space-y-6">
            {entities.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Detected Entities</h3>
                <div className="flex flex-wrap gap-2">
                  {entities.map((entity, index) => (
                    <Badge 
                      key={`${entity.name}-${index}`}
                      className={`${getEntityBadgeColor(entity.type)} text-white`}
                      title={`Confidence: ${(entity.confidence * 100).toFixed(0)}%`}
                    >
                      {entity.name} ({entity.type})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {relations.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Detected Relationships</h3>
                <ul className="list-disc list-inside space-y-1">
                  {relations.map((relation, index) => (
                    <li key={index}>
                      <span className="font-medium">{relation.source}</span>
                      {' '}
                      <span className="text-muted-foreground">{relation.relationType}</span>
                      {' '}
                      <span className="font-medium">{relation.target}</span>
                      {relation.context && (
                        <span className="text-sm text-muted-foreground italic block ml-5">
                          "{relation.context}"
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {graph.nodes.length > 0 && (
              <div className="h-[400px] border rounded-md p-2">
                <RelationshipGraph graph={graph} />
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={() => setActiveTab('input')}
              className="w-full"
            >
              Analyze Another Text
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="text-sm text-muted-foreground">
        Powered by advanced natural language processing
      </CardFooter>
    </Card>
  );
}