import React from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { SmilePlus, Frown, Meh } from "lucide-react";

interface SentimentResult {
  score: number;
  confidence: number;
  keywords: {
    word: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }[];
}

interface SentimentAnalysisPanelProps {
  title?: string;
  description?: string;
  onAnalysisComplete?: (result: SentimentResult) => void;
  defaultText?: string;
  contextId?: string;
  contextType?: string;
}

export function SentimentAnalysisPanel({
  title = "Sentiment Analysis",
  description = "Analyze the sentiment of text to understand emotional tone",
  onAnalysisComplete,
  defaultText = "",
  contextId,
  contextType,
}: SentimentAnalysisPanelProps) {
  const [text, setText] = React.useState(defaultText);
  const [result, setResult] = React.useState<SentimentResult | null>(null);
  const { toast } = useToast();

  const sentimentMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/ai/sentiment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          contextId,
          contextType,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to analyze sentiment");
      }
      
      return await res.json() as SentimentResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!text.trim()) {
      toast({
        title: "Empty Text",
        description: "Please enter some text to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    sentimentMutation.mutate(text);
  };

  const getSentimentIcon = (score: number) => {
    if (score >= 0.6) return <SmilePlus className="h-8 w-8 text-green-500" />;
    if (score <= 0.4) return <Frown className="h-8 w-8 text-red-500" />;
    return <Meh className="h-8 w-8 text-yellow-500" />;
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 0.8) return "Very Positive";
    if (score >= 0.6) return "Positive";
    if (score > 0.4) return "Neutral";
    if (score > 0.2) return "Negative";
    return "Very Negative";
  };

  const getKeywordColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return "bg-green-100 text-green-800";
      case 'negative':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter text to analyze sentiment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[100px]"
          disabled={sentimentMutation.isPending}
        />
        
        {sentimentMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-4">
            <Spinner size="lg" className="mb-2" />
            <p className="text-sm text-muted-foreground">Analyzing sentiment...</p>
          </div>
        )}
        
        {result && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              {getSentimentIcon(result.score)}
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Sentiment Score: {Math.round(result.score * 100)}%</span>
                  <span className="text-sm font-medium">{getSentimentLabel(result.score)}</span>
                </div>
                <Progress value={result.score * 100} className="h-2" />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Key phrases</h4>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((keyword, i) => (
                  <span 
                    key={i} 
                    className={`px-2 py-1 rounded-full text-xs ${getKeywordColor(keyword.sentiment)}`}
                  >
                    {keyword.word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAnalyze} 
          disabled={sentimentMutation.isPending || !text.trim()}
          className="w-full"
        >
          Analyze Sentiment
        </Button>
      </CardFooter>
    </Card>
  );
}