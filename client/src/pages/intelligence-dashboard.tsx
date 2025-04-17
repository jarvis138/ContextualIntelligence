/**
 * Intelligence Dashboard
 * 
 * This page brings together all Phase 3 AI Intelligence features in one place,
 * allowing users to access the AI-powered tools for project intelligence.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AIInsightsPanel } from '@/components/ai';
import DocumentSummarizer from '@/components/intelligence/DocumentSummarizer';
import SentimentAnalyzer from '@/components/intelligence/SentimentAnalyzer';
import ProjectRelationshipGraph from '@/components/intelligence/ProjectRelationshipGraph';
import { useAIServices } from '@/hooks/useAIServices';
import { AlertTriangle, BrainCircuit, Sparkles, Lightbulb, Key } from 'lucide-react';

export default function IntelligenceDashboard() {
  const [selectedProject, setSelectedProject] = useState<string>('1'); // Default to first project
  const { isOpenAIAvailable, isLoading: aiServiceCheckLoading } = useAIServices();
  
  // Fetch available projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    }
  });
  
  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intelligence Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered insights and analysis tools
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Only show project selector if OpenAI is available */}
          {isOpenAIAvailable && (
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Project:</p>
              <Select 
                value={selectedProject} 
                onValueChange={setSelectedProject}
                disabled={projectsLoading}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* OpenAI status indicator */}
          {aiServiceCheckLoading ? (
            <Button variant="outline" disabled>
              <span className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
              Checking AI services...
            </Button>
          ) : isOpenAIAvailable ? (
            <Button variant="outline">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
              AI Ready
            </Button>
          ) : (
            <Button variant="outline" className="text-destructive">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
              AI Unavailable
            </Button>
          )}
        </div>
      </div>
      
      {/* OpenAI Key Missing Alert */}
      {!aiServiceCheckLoading && !isOpenAIAvailable && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>OpenAI API Key Required</AlertTitle>
          <AlertDescription>
            The AI features require an OpenAI API key to be configured. Please contact your administrator to set up the API key.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Feature Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span>Project Insights</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            <span>Document Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Sentiment Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="relationships" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span>Relationship Graph</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Project Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {isOpenAIAvailable ? (
            <AIInsightsPanel projectId={parseInt(selectedProject)} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Project Insights</CardTitle>
                <CardDescription>
                  AI-powered insights and recommendations for your project
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h3 className="text-xl font-semibold mb-2">OpenAI API Key Required</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  To use AI-powered project insights, an OpenAI API key needs to be configured.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Document Analysis Tab */}
        <TabsContent value="documents" className="space-y-4">
          <DocumentSummarizer />
        </TabsContent>
        
        {/* Sentiment Analysis Tab */}
        <TabsContent value="sentiment" className="space-y-4">
          <SentimentAnalyzer />
        </TabsContent>
        
        {/* Relationship Graph Tab */}
        <TabsContent value="relationships" className="space-y-4">
          <ProjectRelationshipGraph projectId={parseInt(selectedProject)} />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}