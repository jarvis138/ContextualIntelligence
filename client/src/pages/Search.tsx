import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Filter,
  FilterIcon,
  Search as SearchIcon,
  SlidersHorizontal,
  Save,
  Star,
  Calendar,
  Clock,
  FileText,
  FolderIcon,
  User,
} from 'lucide-react';

import Breadcrumb from '@/components/navigation/Breadcrumb';
import SearchResults from '@/components/search/SearchResults';
import { SearchResult, SearchResultSource, SearchResultType } from '@/components/search/SearchResults';

/**
 * Search page component
 * 
 * This component integrates the SearchResults component from the UI/UX PRD
 */
export default function Search() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [resultsView, setResultsView] = useState<'relevance' | 'timeline' | 'source'>('relevance');
  const [activeFilters, setActiveFilters] = useState({
    types: [] as SearchResultType[],
    sources: [] as SearchResultSource[],
    dateRange: 'anytime',
    people: [] as string[],
  });

  // Parse query string from URL if any
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [location]);

  // Perform search
  const performSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Mock search results with sample data for demonstration
    // In a real implementation, this would be replaced with an API call
    setTimeout(() => {
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: 'Project Intelligence Hub Design Documentation',
          excerpt: 'This document outlines the design principles and UI components of the Novexa platform.',
          type: 'document',
          source: 'workspace',
          created: new Date(2023, 1, 15),
          updated: new Date(2023, 4, 20),
          author: {
            id: '101',
            name: 'Alex Johnson',
            avatar: '/avatars/alex.png'
          },
          relevanceScore: 0.95,
          tags: ['design', 'documentation', 'UI/UX'],
          url: '/documents/1'
        },
        {
          id: '2',
          title: 'Integration API Specifications',
          excerpt: 'Technical specifications for the Novexa API integration protocols.',
          type: 'document',
          source: 'drive',
          created: new Date(2023, 2, 5),
          updated: new Date(2023, 5, 12),
          author: {
            id: '102',
            name: 'Sam Wright',
            avatar: '/avatars/sam.png'
          },
          relevanceScore: 0.82,
          tags: ['API', 'integration', 'technical'],
          url: '/documents/2'
        },
        {
          id: '3',
          title: 'Weekly Team Sync Meeting',
          excerpt: 'Notes from the weekly sync meeting discussing project status and tasks.',
          type: 'event',
          source: 'workspace',
          created: new Date(2023, 5, 1),
          updated: new Date(2023, 5, 1),
          author: {
            id: '103',
            name: 'Robin Chen',
            avatar: '/avatars/robin.png'
          },
          relevanceScore: 0.78,
          tags: ['meeting', 'sync', 'weekly'],
          url: '/calendar/events/3'
        },
        {
          id: '4',
          title: 'Product Roadmap Q3 2023',
          excerpt: 'Detailed roadmap for Q3 2023 product development and feature releases.',
          type: 'document',
          source: 'workspace',
          created: new Date(2023, 4, 25),
          updated: new Date(2023, 4, 25),
          author: {
            id: '104',
            name: 'Jordan Lee',
            avatar: '/avatars/jordan.png'
          },
          relevanceScore: 0.88,
          tags: ['roadmap', 'planning', 'product'],
          url: '/documents/4'
        },
        {
          id: '5',
          title: 'Design System Components',
          excerpt: 'Library of design system components used in the Novexa platform.',
          type: 'file',
          source: 'figma',
          created: new Date(2023, 3, 10),
          updated: new Date(2023, 5, 8),
          author: {
            id: '105',
            name: 'Taylor Kim',
            avatar: '/avatars/taylor.png'
          },
          relevanceScore: 0.75,
          tags: ['design', 'components', 'library'],
          url: '/files/5'
        }
      ];
      
      setSearchResults(mockResults);
      setIsSearching(false);
    }, 1000);
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Update URL with search query
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    setLocation(`/search?${searchParams.toString()}`);
    
    performSearch(query);
  };

  // Handle filter changes
  const handleFilterChange = (filters: any) => {
    setActiveFilters(filters);
    // In a real app, this would trigger a new search with the updated filters
  };

  // Get filtered results based on active tab
  const getFilteredResults = () => {
    if (activeTab === 'all') return searchResults;
    return searchResults.filter(result => {
      switch (activeTab) {
        case 'documents': return result.type === 'document';
        case 'events': return result.type === 'event';
        case 'files': return result.type === 'file';
        case 'messages': return result.type === 'message';
        case 'people': return result.type === 'contact';
        default: return true;
      }
    });
  };

  // Save search as favorite
  const saveSearch = () => {
    toast({
      title: "Search Saved",
      description: `Your search for "${query}" has been saved.`
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumb 
        items={[
          {
            label: 'Search',
            icon: <SearchIcon className="h-4 w-4 mr-1" />
          }
        ]}
        className="mb-4"
      />
      
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Search</h1>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents, messages, people..."
              className="pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Search in..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Content</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="messages">Messages</SelectItem>
              <SelectItem value="people">People</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>
        
        {query && (
          <div className="mt-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">All Results</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="events">Events</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                  <TabsTrigger value="people">People</TabsTrigger>
                </TabsList>
                
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={saveSearch}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Search
                    </Button>
                    <Select 
                      value={resultsView} 
                      onValueChange={(value: 'relevance' | 'timeline' | 'source') => setResultsView(value)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="View by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="timeline">Timeline</SelectItem>
                        <SelectItem value="source">Source</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <TabsContent value="all">
                <SearchResults
                  results={getFilteredResults()}
                  query={query}
                  loading={isSearching}
                  onFilterChange={handleFilterChange}
                  totalCount={searchResults.length}
                />
              </TabsContent>
              
              <TabsContent value="documents">
                <SearchResults
                  results={getFilteredResults()}
                  query={query}
                  loading={isSearching}
                  onFilterChange={handleFilterChange}
                  totalCount={searchResults.filter(r => r.type === 'document').length}
                />
              </TabsContent>
              
              <TabsContent value="files">
                <SearchResults
                  results={getFilteredResults()}
                  query={query}
                  loading={isSearching}
                  onFilterChange={handleFilterChange}
                  totalCount={searchResults.filter(r => r.type === 'file').length}
                />
              </TabsContent>
              
              <TabsContent value="events">
                <SearchResults
                  results={getFilteredResults()}
                  query={query}
                  loading={isSearching}
                  onFilterChange={handleFilterChange}
                  totalCount={searchResults.filter(r => r.type === 'event').length}
                />
              </TabsContent>
              
              <TabsContent value="messages">
                <SearchResults
                  results={getFilteredResults()}
                  query={query}
                  loading={isSearching}
                  onFilterChange={handleFilterChange}
                  totalCount={searchResults.filter(r => r.type === 'message').length}
                />
              </TabsContent>
              
              <TabsContent value="people">
                <SearchResults
                  results={getFilteredResults()}
                  query={query}
                  loading={isSearching}
                  onFilterChange={handleFilterChange}
                  totalCount={searchResults.filter(r => r.type === 'contact').length}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {!query && !searchResults.length && (
          <Card className="mt-12">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <SearchIcon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Search for anything</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Search across documents, messages, tasks, events, and contacts in your workspace.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
                <Card className="p-4 text-center hover:bg-accent/50 transition-colors cursor-pointer">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="font-medium">Documents</p>
                </Card>
                <Card className="p-4 text-center hover:bg-accent/50 transition-colors cursor-pointer">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">Events</p>
                </Card>
                <Card className="p-4 text-center hover:bg-accent/50 transition-colors cursor-pointer">
                  <User className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="font-medium">People</p>
                </Card>
                <Card className="p-4 text-center hover:bg-accent/50 transition-colors cursor-pointer">
                  <FolderIcon className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <p className="font-medium">Projects</p>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}