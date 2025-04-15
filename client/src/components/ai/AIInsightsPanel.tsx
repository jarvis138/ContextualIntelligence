import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lightbulb, AlertTriangle, Sparkles, LineChart, Zap, BarChart4 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface AIInsightsPanelProps {
  projectId: number;
}

type InsightType = 'risk' | 'opportunity' | 'trend' | 'anomaly' | 'recommendation';

interface Insight {
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  relatedEntities?: {
    type: string;
    id: number;
    name: string;
  }[];
  metadata?: Record<string, any>;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ projectId }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('insights');

  // Fetch existing insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'insights'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/insights`);
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      return response.json();
    },
    enabled: !!projectId
  });

  // Generate AI insights mutation
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/ai-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: {
            maxInsights: 5,
            includeTasks: true,
            includeDocuments: true,
            includeActivities: true
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate insights');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'AI insights generated successfully',
      });
      // Invalidate insights query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'insights'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate insights',
        variant: 'destructive'
      });
    }
  });

  // Generate topic models mutation
  const generateTopicsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/topic-modeling`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate topic models');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Topic models generated successfully',
      });
      setTopicData(data.topicModel);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate topic models',
        variant: 'destructive'
      });
    }
  });

  // Generate predictive insights mutation
  const generatePredictiveInsightsMutation = useMutation({
    mutationFn: async (focusArea: string = 'timeline') => {
      const response = await fetch(`/api/projects/${projectId}/predictive-insights/${focusArea}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate predictive insights');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Predictive insights for ${data.focusArea} generated successfully`,
      });
      setPredictiveData(data.insights);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate predictive insights',
        variant: 'destructive'
      });
    }
  });

  // Detect anomalies mutation
  const detectAnomaliesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/anomaly-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to detect anomalies');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Anomalies detected successfully',
      });
      setAnomalyData(data.anomalies);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to detect anomalies',
        variant: 'destructive'
      });
    }
  });

  // Store results for tabs that don't use react-query
  const [topicData, setTopicData] = useState<any>(null);
  const [predictiveData, setPredictiveData] = useState<any>(null);
  const [anomalyData, setAnomalyData] = useState<any>(null);

  // Helper function to get icon for insight type
  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case 'risk': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'opportunity': return <Sparkles className="h-5 w-5 text-emerald-500" />;
      case 'trend': return <LineChart className="h-5 w-5 text-blue-500" />;
      case 'anomaly': return <Zap className="h-5 w-5 text-amber-500" />;
      case 'recommendation': return <Lightbulb className="h-5 w-5 text-primary" />;
      default: return <Lightbulb className="h-5 w-5 text-primary" />;
    }
  };

  // Helper function to get color for confidence badge
  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 80) return 'default';
    if (confidence >= 60) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>AI-Powered Insights</CardTitle>
            <CardDescription>
              Leverage advanced AI to gain deeper understanding of your project
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateInsightsMutation.mutate()}
              disabled={generateInsightsMutation.isPending}
            >
              {generateInsightsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="insights" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start border-b rounded-none h-12 px-6">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="topics">
              Topic Modeling
            </TabsTrigger>
            <TabsTrigger value="predictions">
              Predictive Analysis
            </TabsTrigger>
            <TabsTrigger value="anomalies">
              Anomaly Detection
            </TabsTrigger>
          </TabsList>
          
          {/* Insights Tab */}
          <TabsContent value="insights" className="p-6">
            {insightsLoading ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !insights || insights.length === 0 ? (
              <div className="text-center p-6">
                <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No insights yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate AI-powered insights to discover patterns, risks, and opportunities in your project.
                </p>
                <Button 
                  onClick={() => generateInsightsMutation.mutate()}
                  disabled={generateInsightsMutation.isPending}
                >
                  {generateInsightsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Insights'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight: any, index: number) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-md">
                    <div className="mt-1">
                      {getInsightIcon(insight.type as InsightType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{insight.content.split(':')[0]}</h3>
                        <Badge variant={getConfidenceBadgeVariant(insight.confidence)}>
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.content.includes(':') ? insight.content.split(':')[1].trim() : insight.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Topic Modeling Tab */}
          <TabsContent value="topics" className="p-6">
            {generateTopicsMutation.isPending ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !topicData ? (
              <div className="text-center p-6">
                <BarChart4 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No topic models yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate topic models to discover key themes and subjects across your project documents.
                </p>
                <Button 
                  onClick={() => generateTopicsMutation.mutate()}
                  disabled={generateTopicsMutation.isPending}
                >
                  Generate Topic Models
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {topicData.topics.length} topics identified across your documents
                </h3>
                
                {topicData.topics.map((topic: any) => (
                  <div key={topic.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">Topic {topic.id}</h4>
                      <Badge variant="outline">Score: {Math.round(topic.score * 100)}%</Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {topic.keywords.map((keyword: string, i: number) => (
                        <Badge key={i} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Found in {topic.documents.length} document{topic.documents.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Predictive Analysis Tab */}
          <TabsContent value="predictions" className="p-6">
            {generatePredictiveInsightsMutation.isPending ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !predictiveData ? (
              <div className="text-center p-6">
                <LineChart className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No predictive analysis yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate predictive insights to forecast timeline, resource needs, or potential risks.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={() => generatePredictiveInsightsMutation.mutate('timeline')}
                    disabled={generatePredictiveInsightsMutation.isPending}
                    variant="outline"
                  >
                    Timeline Analysis
                  </Button>
                  <Button 
                    onClick={() => generatePredictiveInsightsMutation.mutate('resources')}
                    disabled={generatePredictiveInsightsMutation.isPending}
                    variant="outline"
                  >
                    Resource Analysis
                  </Button>
                  <Button 
                    onClick={() => generatePredictiveInsightsMutation.mutate('risks')}
                    disabled={generatePredictiveInsightsMutation.isPending}
                    variant="outline"
                  >
                    Risk Analysis
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {predictiveData.predictions && (
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Predictions</h3>
                    <div className="space-y-2">
                      {Object.entries(predictiveData.predictions).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {predictiveData.recommendations && (
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Recommendations</h3>
                    <ul className="space-y-2 list-disc pl-5">
                      {predictiveData.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Anomaly Detection Tab */}
          <TabsContent value="anomalies" className="p-6">
            {detectAnomaliesMutation.isPending ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !anomalyData ? (
              <div className="text-center p-6">
                <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No anomalies detected yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Run anomaly detection to find unusual patterns or outliers in your project data.
                </p>
                <Button 
                  onClick={() => detectAnomaliesMutation.mutate()}
                  disabled={detectAnomaliesMutation.isPending}
                >
                  Detect Anomalies
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {anomalyData.length === 0 ? (
                  <div className="text-center p-4 border rounded-md bg-muted/30">
                    <p className="text-sm text-muted-foreground">No anomalies detected in the current project data.</p>
                  </div>
                ) : (
                  anomalyData.map((anomaly: any, i: number) => (
                    <div key={i} className="border rounded-md p-4">
                      <div className="flex justify-between mb-2">
                        <h3 className="font-medium">{anomaly.description}</h3>
                        <Badge variant={anomaly.severity > 7 ? 'destructive' : 'secondary'}>
                          Severity: {anomaly.severity}/10
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-3">
                        <strong>Evidence:</strong> {anomaly.evidence}
                      </div>
                      
                      <div className="bg-muted/30 p-3 rounded-md text-sm">
                        <strong>Recommendation:</strong> {anomaly.recommendations}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Powered by OpenAI GPT-4o
        </p>
        {activeTab === 'insights' ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => generateInsightsMutation.mutate()}
            disabled={generateInsightsMutation.isPending}
          >
            Refresh Insights
          </Button>
        ) : activeTab === 'topics' ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => generateTopicsMutation.mutate()}
            disabled={generateTopicsMutation.isPending}
          >
            Refresh Topics
          </Button>
        ) : activeTab === 'predictions' ? (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => generatePredictiveInsightsMutation.mutate('timeline')}
              disabled={generatePredictiveInsightsMutation.isPending}
            >
              Timeline
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => generatePredictiveInsightsMutation.mutate('resources')}
              disabled={generatePredictiveInsightsMutation.isPending}
            >
              Resources
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => generatePredictiveInsightsMutation.mutate('risks')}
              disabled={generatePredictiveInsightsMutation.isPending}
            >
              Risks
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => detectAnomaliesMutation.mutate()}
            disabled={detectAnomaliesMutation.isPending}
          >
            Refresh Anomalies
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default AIInsightsPanel;