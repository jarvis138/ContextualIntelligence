/**
 * Sentiment Analyzer Component
 * 
 * This component allows users to analyze the sentiment of project communications.
 * It provides a UI for inputting text and visualizing sentiment analysis results.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSentimentAnalysis } from '@/hooks/use-ai-api';
import { useAIServices } from '@/hooks/useAIServices';
import { Loader2, MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown, Meh } from 'lucide-react';

export default function SentimentAnalyzer() {
  const [text, setText] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  const { isOpenAIAvailable, isLoading: aiServiceCheckLoading } = useAIServices();
  const sentimentAnalysis = useSentimentAnalysis();
  
  const handleAnalyze = async () => {
    if (!text.trim() || sentimentAnalysis.isPending) return;
    
    try {
      await sentimentAnalysis.mutateAsync(text);
      setShowResults(true);
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
    }
  };
  
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return <ThumbsUp className="h-8 w-8 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="h-8 w-8 text-red-500" />;
      default:
        return <Meh className="h-8 w-8 text-yellow-500" />;
    }
  };
  
  const getSentimentColor = (score: number) => {
    if (score >= 0.2) return 'bg-green-500';
    if (score <= -0.2) return 'bg-red-500';
    return 'bg-yellow-500';
  };
  
  const getSentimentLabel = (score: number) => {
    if (score >= 0.5) return 'Very Positive';
    if (score >= 0.2) return 'Positive';
    if (score > -0.2) return 'Neutral';
    if (score > -0.5) return 'Negative';
    return 'Very Negative';
  };
  
  const renderSentimentResult = () => {
    const result = sentimentAnalysis.data;
    
    if (!result) return null;
    
    return (
      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getSentimentIcon(result.sentiment)}
            <div>
              <h3 className="font-medium text-lg">{result.sentiment}</h3>
              <p className="text-muted-foreground text-sm">
                {getSentimentLabel(result.score)}
              </p>
            </div>
          </div>
          <div className="text-2xl font-bold">
            {result.score >= 0 ? '+' : ''}{result.score.toFixed(2)}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Negative</span>
            <span>Neutral</span>
            <span>Positive</span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-muted">
            <div 
              className={`absolute h-full rounded-full ${getSentimentColor(result.score)}`}
              style={{ 
                width: '4px',
                left: `calc(50% + ${result.score * 50}% - 2px)` 
              }}
            />
            <div 
              className="absolute h-4 w-4 rounded-full bg-background border-2 border-primary top-1/2 transform -translate-y-1/2"
              style={{ 
                left: `calc(50% + ${result.score * 50}% - 8px)` 
              }}
            />
          </div>
        </div>
        
        <div className="pt-4 text-sm">
          <p className="font-medium">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
          <Progress 
            className="mt-2" 
            value={result.confidence * 100}
          />
        </div>
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication Sentiment Analyzer
        </CardTitle>
        <CardDescription>
          Analyze the sentiment of project communications to understand team dynamics
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {aiServiceCheckLoading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <p>Checking AI service availability...</p>
          </div>
        ) : !isOpenAIAvailable ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              OpenAI service is not available. Please check your API key configuration.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Textarea
              placeholder="Enter project communication text to analyze sentiment..."
              className="min-h-[120px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            
            {showResults && sentimentAnalysis.data && renderSentimentResult()}
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleAnalyze}
          disabled={!text.trim() || sentimentAnalysis.isPending || !isOpenAIAvailable}
        >
          {sentimentAnalysis.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Sentiment'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}