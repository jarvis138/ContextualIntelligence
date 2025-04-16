/**
 * Project Insights Panel Component
 * 
 * This component displays AI-generated insights for a project.
 * It groups insights by category and displays them with impact scores.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, AlertTriangle, Info, CheckCircle, Sparkles } from 'lucide-react';
import { ProjectInsight } from '@/types/ai-types';
import { useProjectInsights } from '@/hooks/use-ai-api';

interface ProjectInsightsPanelProps {
  projectId: number;
  projectDescription?: string;
}

export default function ProjectInsightsPanel({ projectId, projectDescription }: ProjectInsightsPanelProps) {
  const [insights, setInsights] = useState<ProjectInsight[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  const projectInsightsMutation = useProjectInsights();
  
  useEffect(() => {
    if (projectId) {
      loadProjectInsights();
    }
  }, [projectId]);
  
  const loadProjectInsights = async () => {
    try {
      // In a real implementation, these would be fetched from the database
      // For now, we'll use the project ID to simulate different insights
      const context = {
        projectDescription: projectDescription || 'Project for implementing new user onboarding experience',
        recentDocuments: [
          'User interface wireframes for onboarding flow',
          'Technical requirements for authentication integration',
          'Milestone timeline for Q2 2025'
        ],
        teamMembers: ['Alex Chen', 'Maya Rodriguez', 'Sam Wilson', 'Taylor Kim'],
        recentActivities: [
          'UI/UX team completed initial wireframes',
          'Backend team started work on authentication service',
          'Project kick-off meeting scheduled for next Monday'
        ],
        currentIssues: [
          'Integration with legacy authentication system needs additional planning',
          'Mobile responsive design requires more detailed specifications'
        ]
      };
      
      const projectInsights = await projectInsightsMutation.mutateAsync(context);
      setInsights(projectInsights);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(projectInsights.map(insight => insight.category)));
      setCategories(['all', ...uniqueCategories]);
    } catch (error) {
      console.error('Failed to load project insights:', error);
    }
  };
  
  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      opportunity: <Sparkles className="h-4 w-4 text-green-500" />,
      risk: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      suggestion: <Lightbulb className="h-4 w-4 text-blue-500" />,
      observation: <Info className="h-4 w-4 text-purple-500" />
    };
    
    return iconMap[category.toLowerCase()] || <Info className="h-4 w-4" />;
  };
  
  const getImpactBadgeColor = (impact: number) => {
    if (impact >= 0.8) return 'bg-red-500 text-white';
    if (impact >= 0.6) return 'bg-amber-500 text-white';
    if (impact >= 0.4) return 'bg-yellow-500 text-white';
    return 'bg-blue-500 text-white';
  };
  
  const filteredInsights = activeCategory === 'all' 
    ? insights 
    : insights.filter(insight => insight.category.toLowerCase() === activeCategory.toLowerCase());
  
  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Project Insights
        </CardTitle>
        <CardDescription>
          AI-generated insights to improve your project outcomes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        {projectInsightsMutation.isPending ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing project data...</p>
          </div>
        ) : insights.length > 0 ? (
          <div>
            <Tabs 
              value={activeCategory} 
              onValueChange={setActiveCategory}
              className="w-full"
            >
              <TabsList className="px-6 pt-2 w-full flex flex-wrap h-auto">
                {categories.map(category => (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    className="capitalize flex items-center gap-1"
                  >
                    {category !== 'all' && getCategoryIcon(category)}
                    {category === 'all' ? 'All Insights' : category}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value={activeCategory} className="p-0">
                <div className="divide-y">
                  {filteredInsights.length > 0 ? (
                    filteredInsights.map((insight, index) => (
                      <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(insight.category)}
                            <h3 className="text-base font-medium">{insight.title}</h3>
                          </div>
                          <Badge className={getImpactBadgeColor(insight.impact)}>
                            {insight.impact >= 0.8 ? 'Critical' : 
                             insight.impact >= 0.6 ? 'High' : 
                             insight.impact >= 0.4 ? 'Medium' : 'Low'} Impact
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                        
                        {insight.suggestions && insight.suggestions.length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-sm font-medium mb-1">Suggestions:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {insight.suggestions.map((suggestion, i) => (
                                <li key={i} className="text-xs text-muted-foreground pl-2">
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {insight.relatedEntities && insight.relatedEntities.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {insight.relatedEntities.map((entity, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {entity}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 space-y-2">
                      <Info className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No insights found for this category</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Info className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No insights available for this project yet</p>
            <Button onClick={loadProjectInsights} variant="outline" size="sm">
              Generate Insights
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          AI Powered Analysis
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs"
          onClick={loadProjectInsights}
          disabled={projectInsightsMutation.isPending}
        >
          {projectInsightsMutation.isPending ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Refreshing...
            </>
          ) : 'Refresh Insights'}
        </Button>
      </CardFooter>
    </Card>
  );
}