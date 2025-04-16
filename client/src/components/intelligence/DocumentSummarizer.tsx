/**
 * Document Summarizer Component
 * 
 * This component allows users to analyze documents with AI to extract summaries, topics, and key elements.
 * It provides insights about document content and importance in a user-friendly interface.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDocumentAnalysis } from '@/hooks/use-ai-api';
import { DocumentAnalysis, Entity } from '@/types/ai-types';
import { FileText, Loader2, Tag, PenTool, AlertCircle } from 'lucide-react';

export default function DocumentSummarizer() {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  
  const documentAnalysis = useDocumentAnalysis();
  const isLoading = documentAnalysis.isPending;
  
  const handleAnalyze = async () => {
    if (!text.trim() || isLoading) return;
    
    try {
      const result = await documentAnalysis.mutateAsync(text);
      setAnalysis(result);
      setActiveTab('results');
    } catch (error) {
      console.error('Document analysis failed:', error);
    }
  };
  
  const getSentimentColor = (score: number) => {
    if (score >= 0.2) return 'bg-green-500';
    if (score <= -0.2) return 'bg-red-500';
    return 'bg-yellow-500';
  };
  
  const getImportanceLabel = (score: number) => {
    if (score >= 0.75) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
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
          <FileText className="h-5 w-5" />
          Document Summarizer
        </CardTitle>
        <CardDescription>
          Analyze documents with AI to extract summaries, topics, and key insights
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px] mx-auto">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="results" disabled={!analysis}>Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="input" className="p-4">
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your document text to analyze..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[250px]"
            />
            
            <Button 
              onClick={handleAnalyze} 
              disabled={!text.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Document...
                </>
              ) : 'Analyze Document'}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="results" className="p-4">
          {analysis && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Summary
                </h3>
                <div className="bg-muted p-3 rounded-md text-sm">
                  {analysis.summary}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary">{keyword}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Main Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topics.map((topic, index) => (
                      <Badge key={index} variant="outline">{topic}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Key Entities</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.entities.slice(0, 10).map((entity, index) => (
                    <Badge 
                      key={`${entity.name}-${index}`}
                      className={`${getEntityBadgeColor(entity.type)} text-white`}
                      title={`Confidence: ${(entity.confidence * 100).toFixed(0)}%`}
                    >
                      {entity.name} ({entity.type})
                    </Badge>
                  ))}
                  {analysis.entities.length > 10 && (
                    <Badge variant="outline">+{analysis.entities.length - 10} more</Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Sentiment
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`${getSentimentColor(analysis.sentiment.score)} text-white`}
                    >
                      {analysis.sentiment.label.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Score: {analysis.sentiment.score.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Importance</h3>
                  <div className="space-y-2">
                    <Progress value={analysis.importance * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{getImportanceLabel(analysis.importance)} Importance</span>
                      <span>{(analysis.importance * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setActiveTab('input')}
                className="w-full"
              >
                Analyze Another Document
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <CardFooter className="text-sm text-muted-foreground">
        Results are generated using AI document analysis
      </CardFooter>
    </Card>
  );
}