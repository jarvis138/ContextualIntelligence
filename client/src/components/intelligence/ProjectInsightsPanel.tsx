import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, ArrowRightLeft, RefreshCw, Clock, Tag, BrainCircuit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Insight {
  id: string;
  projectId: string;
  type: "risk" | "opportunity" | "efficiency" | "resource" | "dependency" | "general";
  title: string;
  description: string;
  confidence: number;
  impact: "low" | "medium" | "high";
  suggestedActions?: string[];
  relatedEntities?: {
    id: string;
    type: string;
    name: string;
  }[];
  createdAt: string;
}

interface ProjectInsightsPanelProps {
  projectId?: string;
  title?: string;
  description?: string;
  showGenerateButton?: boolean;
}

export function ProjectInsightsPanel({
  projectId,
  title = "Project Insights",
  description = "AI-generated insights to improve project outcomes",
  showGenerateButton = true,
}: ProjectInsightsPanelProps) {
  const [insightType, setInsightType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("insights");
  const { toast } = useToast();

  // Query to fetch insights
  const {
    data: insights,
    isLoading,
    refetch,
  } = useQuery<Insight[]>({
    queryKey: ["/api/ai/insights", { projectId, type: insightType !== "all" ? insightType : undefined }],
    enabled: !!projectId,
  });

  // Mutation to generate new insights
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/generate-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          type: insightType !== "all" ? insightType : undefined,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to generate insights");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Insights Generated",
        description: "New insights have been generated for the project",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getInsightTypeIcon = (type: string) => {
    switch (type) {
      case "risk":
        return <Badge variant="destructive" className="gap-1"><span>⚠️</span> Risk</Badge>;
      case "opportunity":
        return <Badge variant="success" className="gap-1"><span>✨</span> Opportunity</Badge>;
      case "efficiency":
        return <Badge variant="outline" className="gap-1"><span>⚡</span> Efficiency</Badge>;
      case "resource":
        return <Badge variant="secondary" className="gap-1"><span>📊</span> Resource</Badge>;
      case "dependency":
        return <Badge variant="outline" className="gap-1"><ArrowRightLeft className="h-3 w-3 mr-1" /> Dependency</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Lightbulb className="h-3 w-3 mr-1" /> General</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge variant="outline" className="bg-green-100 text-green-800">High Confidence</Badge>;
    if (confidence >= 0.5) return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>;
    return <Badge variant="outline" className="bg-red-100 text-red-800">Low Confidence</Badge>;
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "high":
        return <Badge variant="destructive">High Impact</Badge>;
      case "medium":
        return <Badge variant="warning">Medium Impact</Badge>;
      case "low":
        return <Badge variant="outline">Low Impact</Badge>;
      default:
        return <Badge variant="outline">Unknown Impact</Badge>;
    }
  };

  const renderInsights = () => {
    if (!insights || insights.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <Lightbulb className="h-12 w-12 mb-2 text-muted-foreground/50" />
          <p>No insights available for this project.</p>
          {showGenerateButton && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !projectId}
            >
              Generate Insights
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {insights.map((insight) => (
          <Card key={insight.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex gap-2 mb-2">
                    {getInsightTypeIcon(insight.type)}
                    {getConfidenceBadge(insight.confidence)}
                    {getImpactBadge(insight.impact)}
                  </div>
                  <CardTitle>{insight.title}</CardTitle>
                </div>
                <div className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(insight.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{insight.description}</p>
              
              {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Suggested Actions</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {insight.suggestedActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {insight.relatedEntities && insight.relatedEntities.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Related Items</h4>
                  <div className="flex flex-wrap gap-2">
                    {insight.relatedEntities.map((entity, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {entity.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={insightType} onValueChange={setInsightType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter insights" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="risk">Risks</SelectItem>
                <SelectItem value="opportunity">Opportunities</SelectItem>
                <SelectItem value="efficiency">Efficiency</SelectItem>
                <SelectItem value="resource">Resources</SelectItem>
                <SelectItem value="dependency">Dependencies</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            {showGenerateButton && (
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="about">About AI Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="insights" className="space-y-4">
            {isLoading || generateMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Spinner size="lg" className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  {generateMutation.isPending ? "Generating insights..." : "Loading insights..."}
                </p>
              </div>
            ) : (
              renderInsights()
            )}
          </TabsContent>
          
          <TabsContent value="about">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">AI-Powered Project Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Our AI analyzes your project data, communications, and documents to identify patterns,
                    risks, and opportunities that might otherwise go unnoticed.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">How Insights Are Generated</h4>
                  <p className="text-sm text-muted-foreground">
                    The system uses natural language processing and machine learning to analyze project data,
                    communications, documents, and past performance patterns to generate actionable insights.
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Types of Insights</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Risks: Potential issues that could impact project success</li>
                    <li>• Opportunities: Possible improvements or optimizations</li>
                    <li>• Efficiency: Workflow and process improvement suggestions</li>
                    <li>• Resources: Resource allocation and management insights</li>
                    <li>• Dependencies: Critical path and dependency analysis</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      {showGenerateButton && activeTab === "insights" && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !projectId}
          >
            {generateMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Generating Insights...
              </>
            ) : (
              <>
                <BrainCircuit className="h-4 w-4 mr-2" />
                Generate New Insights
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}