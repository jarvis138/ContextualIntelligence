/**
 * Sentiment Analysis Panel Component
 * 
 * This component analyzes sentiment in project feedback and communications.
 * It provides visual representations of sentiment trends and distributions.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSentimentAnalysis } from '@/hooks/use-ai-api';
import { Loader2, BarChart2, Smile, Frown, Meh } from 'lucide-react';

export default function SentimentAnalysisPanel() {
  const [text, setText] = useState('');
  const [sentimentResult, setSentimentResult] = useState<{ sentiment: string; confidence: number } | null>(null);
  
  const sentimentAnalysis = useSentimentAnalysis();
  const isLoading = sentimentAnalysis.isPending;
  
  const handleAnalyze = async () => {
    if (!text.trim() || isLoading) return;
    
    try {
      const result = await sentimentAnalysis.mutateAsync(text);
      setSentimentResult(result);
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
    }
  };
  
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return <Smile className="h-8 w-8 text-green-500" />;
      case 'negative':
        return <Frown className="h-8 w-8 text-red-500" />;
      default:
        return <Meh className="h-8 w-8 text-yellow-500" />;
    }
  };
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-500 text-white';
      case 'negative':
        return 'bg-red-500 text-white';
      default:
        return 'bg-yellow-500 text-white';
    }
  };
  
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Very High';
    if (confidence >= 0.6) return 'High';
    if (confidence >= 0.4) return 'Moderate';
    if (confidence >= 0.2) return 'Low';
    return 'Very Low';
  };
  
  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" />
          Sentiment Analysis
        </CardTitle>
        <CardDescription>
          Analyze sentiment in project feedback and communications
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <Textarea
            placeholder="Enter text to analyze sentiment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[120px]"
          />
          
          <Button 
            onClick={handleAnalyze} 
            disabled={!text.trim() || isLoading}
            className="w-full mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : 'Analyze Sentiment'}
          </Button>
        </div>
        
        {sentimentResult && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {getSentimentIcon(sentimentResult.sentiment)}
                <div>
                  <Badge 
                    className={getSentimentColor(sentimentResult.sentiment)}
                  >
                    {sentimentResult.sentiment.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sentiment detected with {getConfidenceLabel(sentimentResult.confidence)} confidence
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Confidence</span>
                <span>{(sentimentResult.confidence * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={sentimentResult.confidence * 100} 
                className="h-2"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <h4 className="font-medium mb-1">Analysis Summary:</h4>
              <p>
                {sentimentResult.sentiment === 'positive' && 'The text expresses a positive sentiment, indicating approval or satisfaction.'}
                {sentimentResult.sentiment === 'negative' && 'The text expresses a negative sentiment, indicating disapproval or dissatisfaction.'}
                {sentimentResult.sentiment === 'neutral' && 'The text expresses a neutral sentiment, without strong positive or negative indicators.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground">
        Powered by AI sentiment analysis
      </CardFooter>
    </Card>
  );
}