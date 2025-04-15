import React, { useState, useRef, useEffect } from 'react';
import { useDebounce } from '../../hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  CheckIcon,
  ChevronDownIcon,
  FilterIcon,
  SearchIcon,
  Loader2Icon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchFilter {
  field: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'not' | 'before' | 'after';
  value: string;
}

const availableFields = [
  { value: 'content', label: 'Content' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'date', label: 'Date' },
  { value: 'type', label: 'Document Type' },
  { value: 'entity', label: 'Entity' },
  { value: 'sentiment', label: 'Sentiment' },
  { value: 'topic', label: 'Topic' },
];

const operators = {
  content: ['contains', 'not'],
  title: ['contains', 'equals', 'startsWith', 'endsWith', 'not'],
  author: ['equals', 'not'],
  date: ['before', 'after', 'equals'],
  type: ['equals', 'not'],
  entity: ['contains', 'equals', 'not'],
  sentiment: ['equals', 'not'],
  topic: ['equals', 'contains', 'not'],
};

const operatorLabels = {
  contains: 'contains',
  equals: 'equals',
  startsWith: 'starts with',
  endsWith: 'ends with',
  not: 'does not contain',
  before: 'before',
  after: 'after',
};

interface AdvancedSearchBarProps {
  onSearch: (query: string, filters: SearchFilter[]) => void;
  isSearching?: boolean;
  placeholder?: string;
  suggestions?: string[];
  recentSearches?: string[];
}

export function AdvancedSearchBar({
  onSearch,
  isSearching = false,
  placeholder = 'Search documents, entities, and relationships...',
  suggestions = [],
  recentSearches = [],
}: AdvancedSearchBarProps) {
  const [query, setQuery] = useState<string>('');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentField, setCurrentField] = useState<string>('content');
  const [currentOperator, setCurrentOperator] = useState<string>('contains');
  const [currentValue, setCurrentValue] = useState<string>('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search when query or filters change
  useEffect(() => {
    if (debouncedQuery || filters.length > 0) {
      onSearch(debouncedQuery, filters);
    }
  }, [debouncedQuery, filters, onSearch]);

  // Handle new filter creation
  const addFilter = () => {
    if (currentValue) {
      setFilters([
        ...filters,
        {
          field: currentField,
          operator: currentOperator as any,
          value: currentValue,
        },
      ]);
      setCurrentValue('');
    }
  };

  // Remove a filter
  const removeFilter = (index: number) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };

  // Focus on input when clicking the search container
  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Build filter displays
  const getFilterDisplay = (filter: SearchFilter) => {
    const fieldLabel = availableFields.find(f => f.value === filter.field)?.label || filter.field;
    const operatorLabel = operatorLabels[filter.operator] || filter.operator;
    
    return `${fieldLabel} ${operatorLabel} "${filter.value}"`;
  };

  return (
    <div className="flex flex-col space-y-2 w-full">
      <div 
        className="flex items-center border rounded-md px-2 py-1 bg-white shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary"
        onClick={handleContainerClick}
      >
        <SearchIcon className="h-4 w-4 mr-2 text-muted-foreground" />
        
        <div className="flex flex-wrap gap-1 flex-1 min-h-[2rem] items-center">
          {/* Render filter badges */}
          {filters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="gap-1 py-0.5">
              {getFilterDisplay(filter)}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeFilter(index)}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          
          {/* Search input */}
          <Input
            ref={inputRef}
            className="flex-1 border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={filters.length ? '' : placeholder}
            disabled={isSearching}
          />
        </div>
        
        {/* Advanced filter button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="end">
            <div className="space-y-3">
              <h4 className="font-medium">Add Filter</h4>
              
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={currentField}
                    onValueChange={setCurrentField}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={currentOperator}
                    onValueChange={setCurrentOperator}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operators[currentField as keyof typeof operators]?.map((op) => (
                        <SelectItem key={op} value={op}>
                          {operatorLabels[op as keyof typeof operatorLabels]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Input 
                    value={currentValue} 
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="Value"
                  />
                </div>
                
                <Button 
                  onClick={addFilter}
                  disabled={!currentValue}
                  className="w-full"
                >
                  Add Filter
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Search button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-1"
          disabled={isSearching || (!query && filters.length === 0)}
          onClick={() => onSearch(query, filters)}
        >
          {isSearching ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && (query || recentSearches.length > 0) && (
        <div className="relative z-10">
          <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Type to search..." value={query} onValueChange={setQuery} />
            <CommandList>
              {query && (
                <CommandGroup heading="Suggestions">
                  {suggestions
                    .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
                    .map((suggestion) => (
                      <CommandItem
                        key={suggestion}
                        value={suggestion}
                        onSelect={(value) => {
                          setQuery(value);
                          onSearch(value, filters);
                        }}
                      >
                        <SearchIcon className="mr-2 h-4 w-4" />
                        <span>{suggestion}</span>
                      </CommandItem>
                    ))}
                  {suggestions.filter((s) => 
                    s.toLowerCase().includes(query.toLowerCase())).length === 0 && (
                    <CommandItem 
                      value={query}
                      onSelect={() => {
                        onSearch(query, filters);
                      }}
                    >
                      <SearchIcon className="mr-2 h-4 w-4" />
                      <span>Search for "<span className="font-medium">{query}</span>"</span>
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
              
              {recentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search) => (
                    <CommandItem
                      key={search}
                      value={search}
                      onSelect={(value) => {
                        setQuery(value);
                        onSearch(value, filters);
                      }}
                    >
                      <div className="mr-2 h-4 w-4 flex items-center justify-center opacity-50">
                        ↩
                      </div>
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}