import React from 'react';
import { useNavigate } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileTextIcon, 
  FileIcon, 
  MessageSquareIcon, 
  UserIcon, 
  FolderIcon,
  TagIcon,
  ExternalLinkIcon,
  ChevronRightIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for search results
export interface SearchResultEntity {
  id: string;
  type: string;
  name: string;
  confidence: number;
}

export interface SearchResultHighlight {
  field: string;
  snippet: string;
}

export interface SearchResult {
  id: string;
  documentId: number;
  title: string;
  type: 'document' | 'comment' | 'task' | 'user' | 'project';
  snippet: string;
  relevance: number;
  date?: string;
  author?: string;
  fileType?: string;
  entities?: SearchResultEntity[];
  highlights?: SearchResultHighlight[];
  url?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  onResultClick?: (result: SearchResult) => void;
  selectedFilters?: string[];
}

export function SearchResults({
  results,
  isLoading = false,
  onResultClick,
  selectedFilters = [],
}: SearchResultsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <FileTextIcon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium text-lg mb-2">No results found</h3>
          <p className="text-muted-foreground max-w-sm">
            Try using different keywords or removing some filters to broaden your search.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else if (result.url) {
      navigate(result.url);
    }
  };

  // Helper to get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileTextIcon className="h-4 w-4" />;
      case 'comment':
        return <MessageSquareIcon className="h-4 w-4" />;
      case 'user':
        return <UserIcon className="h-4 w-4" />;
      case 'task':
        return <FileIcon className="h-4 w-4" />;
      case 'project':
        return <FolderIcon className="h-4 w-4" />;
      default:
        return <FileTextIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {getResultIcon(result.type)}
                  </span>
                  <span className="line-clamp-1">{result.title}</span>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="py-0 px-1">
                    {result.type}
                  </Badge>
                  {result.fileType && (
                    <Badge 
                      variant="outline" 
                      className={cn("py-0 px-1", 
                        result.fileType.includes('pdf') ? "bg-red-50 text-red-700 border-red-200" : 
                        result.fileType.includes('doc') ? "bg-blue-50 text-blue-700 border-blue-200" :
                        result.fileType.includes('xls') ? "bg-green-50 text-green-700 border-green-200" :
                        "bg-gray-50"
                      )}
                    >
                      {result.fileType}
                    </Badge>
                  )}
                  {result.date && (
                    <span className="text-muted-foreground">
                      {result.date}
                    </span>
                  )}
                  {result.author && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <UserIcon className="h-3 w-3" />
                      {result.author}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge className="ml-2 shrink-0">
                {Math.round(result.relevance * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm pb-2">
            <p className="text-muted-foreground line-clamp-3">
              {result.snippet || 'No preview available'}
            </p>
            
            {result.entities && result.entities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.entities.map((entity, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className={cn("text-xs py-0 flex items-center gap-1",
                      entity.type === 'person' ? "bg-blue-50 text-blue-700 border-blue-200" :
                      entity.type === 'organization' ? "bg-purple-50 text-purple-700 border-purple-200" :
                      entity.type === 'location' ? "bg-green-50 text-green-700 border-green-200" :
                      entity.type === 'date' ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-gray-50"
                    )}
                  >
                    <TagIcon className="h-3 w-3" />
                    {entity.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
          <Separator />
          <CardFooter className="py-2 px-6 flex justify-between">
            <span></span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => handleResultClick(result)}
            >
              View
              <ChevronRightIcon className="ml-1 h-3 w-3" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}