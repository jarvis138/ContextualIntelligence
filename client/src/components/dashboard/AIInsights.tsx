import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Insight } from "@/lib/types";
import { generateInsights } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type AIInsightsProps = {
  projectId: number;
  summary: string;
  insights: Insight[];
  lastUpdated: string;
};

export default function AIInsights({ projectId, summary, insights, lastUpdated }: AIInsightsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Calculate how long ago the insights were updated
  const getLastUpdatedText = () => {
    const updated = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHrs < 24) {
      return `${diffHrs}h ago`;
    } else {
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays}d ago`;
    }
  };
  
  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      await generateInsights(projectId);
      toast({
        title: "Insights generated",
        description: "New project insights have been generated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "dashboard"] });
    } catch (error) {
      toast({
        title: "Failed to generate insights",
        description: "An error occurred while generating insights",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 mt-0.5">
          <i className="ri-error-warning-line text-sm"></i>
        </div>;
      case 'success':
        return <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 mt-0.5">
          <i className="ri-checkbox-circle-line text-sm"></i>
        </div>;
      case 'info':
      default:
        return <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mt-0.5">
          <i className="ri-information-line text-sm"></i>
        </div>;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-gray-800">AI Insights</h2>
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            Updated {getLastUpdatedText()}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1 rounded hover:bg-gray-100">
            <i className="ri-refresh-line text-gray-500"></i>
          </button>
          <button className="p-1 rounded hover:bg-gray-100">
            <i className="ri-more-2-fill text-gray-500"></i>
          </button>
        </div>
      </div>
      <div className="p-6">
        {/* AI Generated Summary */}
        <div className="mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
              <i className="ri-robot-line"></i>
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-800">Project Summary</h3>
              <p className="mt-2 text-sm text-gray-600">{summary}</p>
            </div>
          </div>
        </div>
        
        {/* Key Insights */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Key Insights</h3>
        <div className="space-y-4">
          {insights.map((insight) => (
            <div key={insight.id} className="flex items-start space-x-3">
              {getInsightIcon(insight.type)}
              <div>
                <p className="text-sm text-gray-700">{insight.content}</p>
                <div className="mt-1 flex items-center text-xs text-gray-500">
                  <span>Confidence: {insight.confidence}%</span>
                </div>
              </div>
            </div>
          ))}
          
          {insights.length === 0 && (
            <div className="text-sm text-gray-500 italic">
              No insights available. Generate insights to get AI-powered analysis of your project.
            </div>
          )}
        </div>
        
        {/* Generate More Insights Button */}
        <div className="mt-6">
          <Button 
            variant="outline"
            className="w-full py-2 text-sm font-medium flex items-center justify-center"
            onClick={handleGenerateInsights}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-2"></i> Generating Insights...
              </>
            ) : (
              <>
                <i className="ri-refresh-line mr-2"></i> Generate More Insights
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
