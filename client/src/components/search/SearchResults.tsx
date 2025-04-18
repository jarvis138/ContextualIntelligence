import React, { useState } from 'react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  DownloadCloud, 
  Share, 
  Calendar, 
  User, 
  FileText, 
  MessageSquare, 
  Mail,
  Clock,
  Tag,
  Paperclip,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Define types for search results
export type SearchResultType = 'document' | 'file' | 'event' | 'message' | 'email' | 'contact' | 'task';
export type SearchResultSource = 'workspace' | 'drive' | 'slack' | 'email' | 'figma' | 'github' | 'jira';

export interface Author {
  id: string;
  name: string;
  avatar?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  excerpt?: string;
  type: SearchResultType;
  source: SearchResultSource;
  created: Date;
  updated: Date;
  author: Author;
  relevanceScore: number;
  tags?: string[];
  url: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  loading?: boolean;
  onFilterChange?: (filters: any) => void;
  totalCount: number;
}

/**
 * SearchResults Component
 * 
 * Displays search results with filtering options according to PRD specifications
 */
export default function SearchResults({ 
  results, 
  query, 
  loading = false,
  onFilterChange,
  totalCount
}: SearchResultsProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<SearchResultType[]>([]);
  const [selectedSources, setSelectedSources] = useState<SearchResultSource[]>([]);
  const [dateRange, setDateRange] = useState('anytime');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  
  // Handle filter changes
  const updateFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        types: selectedTypes,
        sources: selectedSources,
        dateRange,
        people: selectedPeople
      });
    }
  };
  
  // Toggle type filter
  const toggleTypeFilter = (type: SearchResultType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
    updateFilters();
  };
  
  // Toggle source filter
  const toggleSourceFilter = (source: SearchResultSource) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source) 
        : [...prev, source]
    );
    updateFilters();
  };
  
  // Change date range
  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    updateFilters();
  };
  
  // Toggle person filter
  const togglePersonFilter = (personId: string) => {
    setSelectedPeople(prev => 
      prev.includes(personId) 
        ? prev.filter(id => id !== personId) 
        : [...prev, personId]
    );
    updateFilters();
  };
  
  // Get icon for result type
  const getResultTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'file': return <Paperclip className="h-4 w-4 text-green-600" />;
      case 'event': return <Calendar className="h-4 w-4 text-amber-600" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'email': return <Mail className="h-4 w-4 text-red-600" />;
      case 'contact': return <User className="h-4 w-4 text-cyan-600" />;
      case 'task': return <Clock className="h-4 w-4 text-orange-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };
  
  // Get icon for result source
  const getResultSourceIcon = (source: SearchResultSource) => {
    switch (source) {
      case 'workspace': return <FileText className="h-4 w-4" />;
      case 'drive': return <DownloadCloud className="h-4 w-4" />;
      case 'slack': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'figma': return <Paperclip className="h-4 w-4" />;
      case 'github': return <Paperclip className="h-4 w-4" />;
      case 'jira': return <Paperclip className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };
  
  // Get display name for source
  const getSourceDisplayName = (source: SearchResultSource) => {
    switch (source) {
      case 'workspace': return 'Workspace';
      case 'drive': return 'Google Drive';
      case 'slack': return 'Slack';
      case 'email': return 'Email';
      case 'figma': return 'Figma';
      case 'github': return 'GitHub';
      case 'jira': return 'Jira';
      default: return source.charAt(0).toUpperCase() + source.slice(1);
    }
  };
  
  // Highlight search query in text
  const highlightQuery = (text: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-100 dark:bg-yellow-800">{part}</mark> : part
    );
  };
  
  // Get the icon for a type filter
  const getTypeFilterIcon = (type: SearchResultType) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'file': return <Paperclip className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'contact': return <User className="h-4 w-4" />;
      case 'task': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };
  
  // Loading skeletons for search results
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        
        {[1, 2, 3].map((item) => (
          <Card key={item} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center space-x-2 mt-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // Empty results state
  if (results.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn't find any results matching "{query}". Try adjusting your search terms or filters.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalCount}</span> results for 
          <span className="font-medium text-foreground"> "{query}"</span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", filtersOpen ? "rotate-180" : "")} />
        </Button>
      </div>
      
      {/* Filters section */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Type filters */}
                <div>
                  <h4 className="font-medium mb-2">Content Type</h4>
                  <div className="space-y-2">
                    {['document', 'file', 'event', 'message', 'email', 'contact', 'task'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`type-${type}`} 
                          checked={selectedTypes.includes(type as SearchResultType)}
                          onCheckedChange={() => toggleTypeFilter(type as SearchResultType)}
                        />
                        <label 
                          htmlFor={`type-${type}`} 
                          className="flex items-center cursor-pointer text-sm"
                        >
                          {getTypeFilterIcon(type as SearchResultType)}
                          <span className="ml-2 capitalize">{type}s</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Source filters */}
                <div>
                  <h4 className="font-medium mb-2">Source</h4>
                  <div className="space-y-2">
                    {['workspace', 'drive', 'slack', 'email', 'figma', 'github', 'jira'].map((source) => (
                      <div key={source} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`source-${source}`} 
                          checked={selectedSources.includes(source as SearchResultSource)}
                          onCheckedChange={() => toggleSourceFilter(source as SearchResultSource)}
                        />
                        <label 
                          htmlFor={`source-${source}`} 
                          className="flex items-center cursor-pointer text-sm"
                        >
                          {getResultSourceIcon(source as SearchResultSource)}
                          <span className="ml-2">{getSourceDisplayName(source as SearchResultSource)}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Date range */}
                <div>
                  <h4 className="font-medium mb-2">Date</h4>
                  <div className="space-y-2">
                    {[
                      { id: 'anytime', label: 'Anytime' },
                      { id: 'past-day', label: 'Past 24 hours' },
                      { id: 'past-week', label: 'Past week' },
                      { id: 'past-month', label: 'Past month' },
                      { id: 'past-year', label: 'Past year' },
                      { id: 'custom', label: 'Custom range' }
                    ].map((range) => (
                      <div key={range.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`date-${range.id}`} 
                          checked={dateRange === range.id}
                          onCheckedChange={() => handleDateRangeChange(range.id)}
                        />
                        <label 
                          htmlFor={`date-${range.id}`} 
                          className="cursor-pointer text-sm"
                        >
                          {range.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedTypes([]);
                    setSelectedSources([]);
                    setDateRange('anytime');
                    setSelectedPeople([]);
                    updateFilters();
                  }}
                  className="mr-2"
                >
                  Reset Filters
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setFiltersOpen(false);
                    updateFilters();
                  }}
                >
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
      
      {/* Results list */}
      <div className="space-y-4">
        {results.map((result) => (
          <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="mr-3 mt-1">
                  {getResultTypeIcon(result.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <Link 
                      href={result.url}
                      className="text-lg font-medium hover:underline text-primary"
                    >
                      {highlightQuery(result.title)}
                    </Link>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Share className="mr-2 h-4 w-4" />
                          <span>Share</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <DownloadCloud className="mr-2 h-4 w-4" />
                          <span>Download</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Search className="mr-2 h-4 w-4" />
                          <span>Find similar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {result.excerpt && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {highlightQuery(result.excerpt)}
                    </p>
                  )}
                  
                  <div className="mt-2 flex flex-wrap items-center text-xs text-muted-foreground">
                    <div className="flex items-center mr-4">
                      <User className="mr-1 h-3 w-3" />
                      <span>{result.author.name}</span>
                    </div>
                    
                    <div className="flex items-center mr-4">
                      <Clock className="mr-1 h-3 w-3" />
                      <span>
                        {format(result.updated, 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <div className="flex items-center mr-4">
                      <span className="flex items-center">
                        {getResultSourceIcon(result.source)}
                        <span className="ml-1">{getSourceDisplayName(result.source)}</span>
                      </span>
                    </div>
                    
                    {result.tags && result.tags.length > 0 && (
                      <div className="flex items-center flex-wrap mt-1 md:mt-0">
                        <Tag className="mr-1 h-3 w-3" />
                        {result.tags.map((tag, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="mr-1 px-1 py-0 text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}