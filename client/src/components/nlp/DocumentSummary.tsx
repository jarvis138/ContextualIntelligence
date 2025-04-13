import { FC } from "react";
import { Loader2, FileText, XCircle, Check, ThumbsUp, ThumbsDown, Meh } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
export interface Entity {
  name: string;
  type: string;
  confidence: number;
  start?: number;
  end?: number;
  metadata?: Record<string, any>;
}

export interface DocumentSummaryData {
  summary: string;
  keyTopics: string[];
  sentiment: {
    label: string;
    score: number;
  };
  entities: Entity[];
}

interface DocumentSummaryProps {
  documentId: number;
  documentTitle?: string;
  data?: DocumentSummaryData;
  isLoading?: boolean;
  error?: string;
  onGenerate: () => void;
}

/**
 * Component to display AI-generated document summary
 */
const DocumentSummary: FC<DocumentSummaryProps> = ({
  documentId,
  documentTitle,
  data,
  isLoading = false,
  error,
  onGenerate
}) => {
  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
            <Loader2 className="h-4 w-4 animate-spin ml-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-6" />
          
          <p className="text-sm font-medium mb-2">Key Topics</p>
          <div className="flex flex-wrap gap-2 mb-6">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
          
          <p className="text-sm font-medium mb-2">Sentiment</p>
          <Skeleton className="h-6 w-32" />
        </CardContent>
      </Card>
    );
  }
  
  // If error, show error UI
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Document Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive-foreground font-medium mb-2">Error Generating Summary</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={onGenerate}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }
  
  // If no data, show empty state
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>{documentTitle || `Document #${documentId}`}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-4">
            Generate an AI-powered summary of this document to extract key information, topics, and sentiment analysis.
          </p>
          <Button onClick={onGenerate}>Generate Summary</Button>
        </CardContent>
      </Card>
    );
  }
  
  // Render the summary data
  const { summary, keyTopics, sentiment, entities } = data;
  
  // Get sentiment icon
  const getSentimentIcon = () => {
    switch (sentiment.label.toLowerCase()) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 mr-1" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 mr-1" />;
      default:
        return <Meh className="h-4 w-4 mr-1" />;
    }
  };
  
  // Get sentiment color
  const getSentimentColor = () => {
    switch (sentiment.label.toLowerCase()) {
      case 'positive':
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case 'negative':
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <span>Document Summary</span>
          <Badge variant="outline" className="ml-auto">
            <Check className="h-3 w-3 mr-1" /> AI Generated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div>
            <p className="whitespace-pre-line">{summary}</p>
          </div>
          
          {/* Key Topics */}
          <div>
            <p className="text-sm font-medium mb-2">Key Topics</p>
            <div className="flex flex-wrap gap-2">
              {keyTopics.map((topic, idx) => (
                <Badge key={idx} variant="secondary">{topic}</Badge>
              ))}
            </div>
          </div>
          
          {/* Sentiment Analysis */}
          <div>
            <p className="text-sm font-medium mb-2">Sentiment</p>
            <Badge className={getSentimentColor()}>
              {getSentimentIcon()}
              {sentiment.label} ({Math.round(sentiment.score * 100)}%)
            </Badge>
          </div>
          
          {/* Entities */}
          {entities.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Extracted Entities</p>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 px-2 font-medium">Entity</th>
                      <th className="text-left py-1 px-2 font-medium">Type</th>
                      <th className="text-left py-1 px-2 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entities
                      .filter(e => e.confidence > 0.6) // Only show high confidence entities
                      .sort((a, b) => b.confidence - a.confidence)
                      .map((entity, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-muted/50" : ""}>
                          <td className="py-1 px-2">{entity.name}</td>
                          <td className="py-1 px-2">
                            <Badge variant="outline">{entity.type}</Badge>
                          </td>
                          <td className="py-1 px-2">{Math.round(entity.confidence * 100)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={onGenerate} className="ml-auto">
          Regenerate
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DocumentSummary;