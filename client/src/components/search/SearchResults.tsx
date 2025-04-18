import React, { useState } from 'react';
import { Link } from 'wouter';
import { 
  CalendarIcon, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  FileText, 
  FilterIcon, 
  FolderIcon, 
  Grid, 
  Image as ImageIcon, 
  List, 
  MessageSquare, 
  MoreHorizontal, 
  Search, 
  SlidersHorizontal, 
  UserIcon, 
  X 
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SearchResultType = 
  | 'document' 
  | 'message' 
  | 'contact' 
  | 'task' 
  | 'event' 
  | 'project' 
  | 'file';

export type SearchResultSource = 
  | 'workspace' 
  | 'drive' 
  | 'slack' 
  | 'email' 
  | 'figma';

export interface SearchResult {
  id: string | number;
  title: string;
  excerpt?: string;
  type: SearchResultType;
  source: SearchResultSource;
  url?: string;
  created: string | Date;
  updated: string | Date;
  author: {
    id: string | number;
    name: string;
    avatar?: string;
  };
  relevanceScore?: number;
  tags?: string[];
  folderId?: string | number;
  folderName?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  totalCount?: number;
  query: string;
  loading?: boolean;
  onFilterChange?: (filters: any) => void;
  selectedResult?: string | number | null;
  onSelectResult?: (result: SearchResult) => void;
  className?: string;
}

/**
 * Search icon for search result by type
 */
const getResultIcon = (type: SearchResultType) => {
  switch (type) {
    case 'document':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'message':
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case 'contact':
      return <UserIcon className="h-4 w-4 text-purple-500" />;
    case 'task':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'event':
      return <CalendarIcon className="h-4 w-4 text-pink-500" />;
    case 'project':
      return <FolderIcon className="h-4 w-4 text-orange-500" />;
    case 'file':
      return <ImageIcon className="h-4 w-4 text-sky-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
};

/**
 * Source badge for search results
 */
const SourceBadge = ({ source }: { source: SearchResultSource }) => {
  const getSourceColor = () => {
    switch (source) {
      case 'workspace':
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case 'drive':
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case 'slack':
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case 'email':
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case 'figma':
        return "bg-pink-100 text-pink-800 hover:bg-pink-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs font-normal py-0 h-5", getSourceColor())}
    >
      {source}
    </Badge>
  );
};

/**
 * SearchResults Component
 * Displays search results with filtering and preview capabilities
 */
export function SearchResults({
  results,
  totalCount = 0,
  query,
  loading = false,
  onFilterChange,
  selectedResult,
  onSelectResult,
  className,
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortOrder, setSortOrder] = useState<'relevance' | 'date'>('relevance');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    types: SearchResultType[];
    sources: SearchResultSource[];
    dateRange: string;
    people: string[];
  }>({
    types: [],
    sources: [],
    dateRange: 'anytime',
    people: [],
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    const updatedFilters = { ...activeFilters, ...newFilters };
    setActiveFilters(updatedFilters);
    if (onFilterChange) {
      onFilterChange(updatedFilters);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const resetFilters = {
      types: [],
      sources: [],
      dateRange: 'anytime',
      people: [],
    };
    setActiveFilters(resetFilters);
    if (onFilterChange) {
      onFilterChange(resetFilters);
    }
  };

  // Remove a single filter
  const removeFilter = (type: keyof typeof activeFilters, value: string) => {
    const newFilters = { ...activeFilters };
    if (type === 'dateRange') {
      newFilters.dateRange = 'anytime';
    } else {
      newFilters[type] = (newFilters[type] as string[]).filter(v => v !== value);
    }
    setActiveFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    return activeFilters.types.length + 
           activeFilters.sources.length + 
           (activeFilters.dateRange !== 'anytime' ? 1 : 0) + 
           activeFilters.people.length;
  };

  // Render active filter pills
  const renderFilterPills = () => {
    const pills = [];
    
    activeFilters.types.forEach(type => {
      pills.push(
        <Badge key={`type-${type}`} variant="outline" className="flex items-center gap-1 h-6">
          {getResultIcon(type)}
          <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 ml-1"
            onClick={() => removeFilter('types', type)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove</span>
          </Button>
        </Badge>
      );
    });
    
    activeFilters.sources.forEach(source => {
      pills.push(
        <Badge key={`source-${source}`} variant="outline" className="flex items-center gap-1 h-6">
          <span>{source.charAt(0).toUpperCase() + source.slice(1)}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 ml-1"
            onClick={() => removeFilter('sources', source)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove</span>
          </Button>
        </Badge>
      );
    });
    
    if (activeFilters.dateRange !== 'anytime') {
      pills.push(
        <Badge key="date" variant="outline" className="flex items-center gap-1 h-6">
          <CalendarIcon className="h-3 w-3 mr-1" />
          <span>{activeFilters.dateRange.replace('-', ' ')}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 ml-1"
            onClick={() => removeFilter('dateRange', '')}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove</span>
          </Button>
        </Badge>
      );
    }
    
    activeFilters.people.forEach(person => {
      pills.push(
        <Badge key={`person-${person}`} variant="outline" className="flex items-center gap-1 h-6">
          <UserIcon className="h-3 w-3 mr-1" />
          <span>{person}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 p-0 ml-1"
            onClick={() => removeFilter('people', person)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove</span>
          </Button>
        </Badge>
      );
    });
    
    return pills;
  };

  // Render empty state
  if (results.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No results found</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          We couldn't find any results matching "{query}". Try adjusting your search or filters.
        </p>
        <Button variant="outline" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Searching...</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col md:flex-row gap-6", className)}>
      {/* Mobile Filter Button */}
      <div className="flex md:hidden justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {totalCount} results for "{query}"
        </p>
        <Sheet open={filtersVisible} onOpenChange={setFiltersVisible}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center">
              <FilterIcon className="h-4 w-4 mr-2" />
              <span>Filters</span>
              {getActiveFilterCount() > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              {/* Filter content for mobile */}
              {/* Content types filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">Content Type</h3>
                <div className="space-y-2">
                  {['document', 'message', 'file', 'task', 'event', 'contact', 'project'].map((type) => (
                    <div key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`mobile-type-${type}`}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={activeFilters.types.includes(type as SearchResultType)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...activeFilters.types, type as SearchResultType]
                            : activeFilters.types.filter(t => t !== type);
                          handleFilterChange({ types: newTypes });
                        }}
                      />
                      <label htmlFor={`mobile-type-${type}`} className="ml-2 text-sm">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">Sources</h3>
                <div className="space-y-2">
                  {['workspace', 'drive', 'slack', 'email', 'figma'].map((source) => (
                    <div key={source} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`mobile-source-${source}`}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={activeFilters.sources.includes(source as SearchResultSource)}
                        onChange={(e) => {
                          const newSources = e.target.checked
                            ? [...activeFilters.sources, source as SearchResultSource]
                            : activeFilters.sources.filter(s => s !== source);
                          handleFilterChange({ sources: newSources });
                        }}
                      />
                      <label htmlFor={`mobile-source-${source}`} className="ml-2 text-sm">
                        {source.charAt(0).toUpperCase() + source.slice(1)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">Date</h3>
                <Select
                  value={activeFilters.dateRange}
                  onValueChange={(value) => handleFilterChange({ dateRange: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anytime">Any time</SelectItem>
                    <SelectItem value="past-day">Past 24 hours</SelectItem>
                    <SelectItem value="past-week">Past week</SelectItem>
                    <SelectItem value="past-month">Past month</SelectItem>
                    <SelectItem value="past-year">Past year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
                <Button onClick={() => setFiltersVisible(false)}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Filter Panel */}
      <div className="hidden md:block w-[240px] flex-shrink-0">
        <div className="sticky top-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Filters</h3>
            <p className="text-xs text-muted-foreground">
              {totalCount} results for "{query}"
            </p>
          </div>

          {/* Content types filter */}
          <div className="mb-6">
            <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">
              Content Type
            </h4>
            <div className="space-y-2">
              {['document', 'message', 'file', 'task', 'event', 'contact', 'project'].map((type) => (
                <div key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`type-${type}`}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={activeFilters.types.includes(type as SearchResultType)}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...activeFilters.types, type as SearchResultType]
                        : activeFilters.types.filter(t => t !== type);
                      handleFilterChange({ types: newTypes });
                    }}
                  />
                  <label htmlFor={`type-${type}`} className="ml-2 text-sm">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Sources filter */}
          <div className="mb-6">
            <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">
              Sources
            </h4>
            <div className="space-y-2">
              {['workspace', 'drive', 'slack', 'email', 'figma'].map((source) => (
                <div key={source} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`source-${source}`}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={activeFilters.sources.includes(source as SearchResultSource)}
                    onChange={(e) => {
                      const newSources = e.target.checked
                        ? [...activeFilters.sources, source as SearchResultSource]
                        : activeFilters.sources.filter(s => s !== source);
                      handleFilterChange({ sources: newSources });
                    }}
                  />
                  <label htmlFor={`source-${source}`} className="ml-2 text-sm">
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Date filter */}
          <div className="mb-6">
            <h4 className="text-xs font-medium uppercase text-muted-foreground mb-2">
              Date
            </h4>
            <Select
              value={activeFilters.dateRange}
              onValueChange={(value) => handleFilterChange({ dateRange: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anytime">Any time</SelectItem>
                <SelectItem value="past-day">Past 24 hours</SelectItem>
                <SelectItem value="past-week">Past week</SelectItem>
                <SelectItem value="past-month">Past month</SelectItem>
                <SelectItem value="past-year">Past year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {getActiveFilterCount() > 0 && (
            <Button 
              variant="ghost" 
              className="text-xs px-2 h-8 text-muted-foreground"
              onClick={clearFilters}
            >
              Clear all filters
            </Button>
          )}
        </div>
      </div>

      {/* Results area */}
      <div className="flex-1 min-w-0">
        {/* Results header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-wrap gap-2">
            {getActiveFilterCount() > 0 && renderFilterPills()}
          </div>
          <div className="flex items-center gap-2">
            <Select 
              value={sortOrder} 
              onValueChange={(value) => setSortOrder(value as 'relevance' | 'date')}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="date">Date (newest)</SelectItem>
              </SelectContent>
            </Select>
            <div className="bg-muted p-1 rounded-md hidden md:flex">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0",
                  viewMode === 'list' && "bg-background shadow-sm"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0",
                  viewMode === 'grid' && "bg-background shadow-sm"
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {results.map((result) => (
              <Card
                key={result.id}
                className={cn(
                  "overflow-hidden hover:shadow-md transition-shadow",
                  selectedResult === result.id && "ring-2 ring-primary ring-opacity-50"
                )}
                onClick={() => onSelectResult && onSelectResult(result)}
              >
                <CardContent className="p-4">
                  <div className="flex">
                    <div className={`w-2 ${
                      result.source === 'drive' ? 'bg-green-500' :
                      result.source === 'slack' ? 'bg-purple-500' :
                      result.source === 'email' ? 'bg-amber-500' :
                      result.source === 'figma' ? 'bg-pink-500' :
                      'bg-blue-500'
                    }`}></div>
                    <div className="flex-1 ml-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          {getResultIcon(result.type)}
                          <h3 className="ml-2 font-medium">
                            <Link href={result.url || '#'} className="hover:underline">
                              {result.title}
                            </Link>
                          </h3>
                        </div>
                        <SourceBadge source={result.source} />
                      </div>
                      
                      {result.excerpt && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {result.excerpt}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                        <div className="flex items-center">
                          <Avatar className="h-5 w-5 mr-2">
                            <AvatarImage src={result.author.avatar} alt={result.author.name} />
                            <AvatarFallback>{result.author.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{result.author.name}</span>
                          <span className="mx-2 text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {typeof result.updated === 'string' 
                              ? result.updated 
                              : new Date(result.updated).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center">
                          {result.folderName && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <FolderIcon className="h-3 w-3 mr-1" />
                              {result.folderName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((result) => (
              <Card
                key={result.id}
                className={cn(
                  "overflow-hidden hover:shadow-md transition-shadow cursor-pointer",
                  selectedResult === result.id && "ring-2 ring-primary ring-opacity-50"
                )}
                onClick={() => onSelectResult && onSelectResult(result)}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      {getResultIcon(result.type)}
                      <CardTitle className="ml-2 text-base">
                        <Link href={result.url || '#'} className="hover:underline">
                          {result.title}
                        </Link>
                      </CardTitle>
                    </div>
                    <SourceBadge source={result.source} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {result.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.excerpt}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t flex justify-between items-center">
                  <div className="flex items-center">
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarImage src={result.author.avatar} alt={result.author.name} />
                      <AvatarFallback>{result.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{result.author.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {typeof result.updated === 'string' 
                      ? result.updated 
                      : new Date(result.updated).toLocaleDateString()}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResults;