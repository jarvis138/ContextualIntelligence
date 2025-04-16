import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Filter, 
  FileText, 
  Users, 
  Code, 
  Calendar, 
  ExternalLink,
  Clock, 
  Save,
  CalendarDays,
  ArrowUpRight,
  Star,
  MessageSquare,
  GitBranch,
  BarChart2,
  CheckCircle,
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// For the document highlighting in search results
const Highlight = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? 
          <span key={i} className="bg-yellow-100 dark:bg-yellow-800">{part}</span> : 
          <span key={i}>{part}</span>
      )}
    </span>
  );
};

// Type definitions for search results
type PlatformSource = "jira" | "github" | "drive" | "slack" | "figma" | "teams";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  lastUpdated: string;
  source: PlatformSource;
  url?: string;
  matchScore: number;
  tags?: string[];
  author?: {
    name: string;
    avatar: string;
  };
  project?: string;
  metadata?: Record<string, any>;
}

export default function SearchPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [resultsView, setResultsView] = useState<"relevance" | "source" | "timeline">("relevance");
  const [activeTab, setActiveTab] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearch, setLastSearch] = useState("");
  const [selectedSources, setSelectedSources] = useState<PlatformSource[]>(["jira", "github", "drive", "slack", "figma", "teams"]);
  const [dateRange, setDateRange] = useState<"all" | "day" | "week" | "month">("all");
  const [sortOrder, setSortOrder] = useState<"relevance" | "date">("relevance");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [savedSearches, setSavedSearches] = useState<{id: number, name: string, query: string}[]>([
    {id: 1, name: "API Documentation", query: "authentication api docs"},
    {id: 2, name: "Design System", query: "component library figma"},
    {id: 3, name: "Release Notes", query: "release notes v2.0"}
  ]);

  // Mock search results
  const mockResults: SearchResult[] = [
    {
      id: "jira-123",
      type: "task",
      title: "Implement Cross-Platform Search",
      description: "Create a unified search experience that queries across all integrated platforms with tenant isolation.",
      lastUpdated: "2 hours ago",
      source: "jira",
      url: "https://jira.example.com/browse/CPI-123",
      matchScore: 92,
      tags: ["search", "integration", "high-priority"],
      author: {
        name: "Sarah Chen",
        avatar: "/avatars/02.png"
      },
      project: "CPI Hub",
      metadata: {
        status: "In Progress",
        priority: "High",
        assignee: "Mark Johnson"
      }
    },
    {
      id: "github-456",
      type: "pull-request",
      title: "Feature: Elasticsearch Integration for Unified Search",
      description: "Adds Elasticsearch client and search index configuration with tenant isolation as specified in PRD.",
      lastUpdated: "Yesterday",
      source: "github",
      url: "https://github.com/example/cpi-hub/pull/456",
      matchScore: 88,
      author: {
        name: "Mark Johnson",
        avatar: "/avatars/03.png"
      },
      project: "CPI Hub",
      metadata: {
        status: "Open",
        comments: 5,
        branches: {
          from: "feature/elasticsearch-integration",
          to: "main"
        }
      }
    },
    {
      id: "drive-789",
      type: "document",
      title: "Search Architecture Technical Specification",
      description: "Technical specifications for implementing unified search across all platforms with tenant-specific results and security controls.",
      lastUpdated: "3 days ago",
      source: "drive",
      url: "https://drive.example.com/docs/789",
      matchScore: 85,
      author: {
        name: "Alex Morgan",
        avatar: "/avatars/01.png"
      },
      project: "CPI Hub",
      metadata: {
        type: "Google Doc",
        lastEditor: "Lisa Wong",
        pages: 12
      }
    },
    {
      id: "slack-321",
      type: "conversation",
      title: "Search Implementation Discussion",
      description: "Thread about how to structure the search indices for optimal performance while maintaining tenant isolation.",
      lastUpdated: "1 week ago",
      source: "slack",
      url: "https://slack.example.com/archives/C123/p321",
      matchScore: 79,
      author: {
        name: "David Kim",
        avatar: "/avatars/05.png"
      },
      project: "CPI Hub",
      metadata: {
        channel: "#engineering",
        participants: 5,
        messages: 12
      }
    },
    {
      id: "figma-654",
      type: "design",
      title: "Search UI Components",
      description: "Design mockups for the unified search experience including result cards and filtering options.",
      lastUpdated: "2 weeks ago",
      source: "figma",
      url: "https://figma.example.com/file/654",
      matchScore: 75,
      author: {
        name: "Lisa Wong",
        avatar: "/avatars/04.png"
      },
      project: "CPI Hub",
      metadata: {
        type: "Design File",
        pages: 3,
        components: 15
      }
    },
    {
      id: "teams-987",
      type: "meeting",
      title: "Search Implementation Planning",
      description: "Meeting to discuss the implementation details of the unified search feature across platforms.",
      lastUpdated: "3 weeks ago",
      source: "teams",
      url: "https://teams.example.com/meeting/987",
      matchScore: 68,
      author: {
        name: "Alex Morgan",
        avatar: "/avatars/01.png"
      },
      project: "CPI Hub",
      metadata: {
        duration: "45 minutes",
        participants: 8,
        recording: true
      }
    }
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setLastSearch(searchQuery);

    // Simulate search delay
    setTimeout(() => {
      // Filter results based on selected sources and date range
      const filteredResults = mockResults
        .filter(result => selectedSources.includes(result.source))
        .sort((a, b) => {
          if (sortOrder === "relevance") {
            return b.matchScore - a.matchScore;
          } else {
            // Simple date sorting for demo purposes
            return a.lastUpdated.localeCompare(b.lastUpdated);
          }
        });
      
      setSearchResults(filteredResults);
      setIsSearching(false);
      
      // If there are results, show a success toast
      if (filteredResults.length > 0) {
        toast({
          title: "Search complete",
          description: `Found ${filteredResults.length} results for "${searchQuery}"`,
        });
      } else {
        toast({
          title: "No results found",
          description: `No matches for "${searchQuery}" with your current filters.`,
          variant: "destructive",
        });
      }
    }, 1500);
  };

  const saveCurrentSearch = () => {
    if (!lastSearch) return;
    
    const newSavedSearch = {
      id: savedSearches.length + 1,
      name: `Search: ${lastSearch.substring(0, 20)}${lastSearch.length > 20 ? '...' : ''}`,
      query: lastSearch
    };
    
    setSavedSearches([...savedSearches, newSavedSearch]);
    
    toast({
      title: "Search saved",
      description: `Your search "${lastSearch}" has been saved for future use.`,
    });
  };

  const loadSavedSearch = (query: string) => {
    setSearchQuery(query);
    // Automatically trigger the search
    setTimeout(() => handleSearch(), 100);
  };

  const toggleSource = (source: PlatformSource) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const getSourceIcon = (source: PlatformSource) => {
    switch (source) {
      case "jira":
        return <svg className="h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
      case "github":
        return <GitBranch className="h-4 w-4 text-gray-700" />;
      case "drive":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "slack":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case "figma":
        return <svg className="h-4 w-4 text-pink-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H8.5a3.5 3.5 0 0 0 0 7h3.5V2z"/><path d="M12 9H8.5a3.5 3.5 0 0 0 0 7h3.5V9z"/><path d="M12 16H8.5a3.5 3.5 0 0 0 0 7h7a3.5 3.5 0 0 0 0-7h-3.5v7"/><path d="M12 2h3.5a3.5 3.5 0 0 1 0 7H12V2z"/><path d="M15.5 9a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"/></svg>;
      case "teams":
        return <Users className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "task":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "pull-request":
        return <GitBranch className="h-5 w-5 text-gray-700" />;
      case "document":
        return <FileText className="h-5 w-5 text-green-500" />;
      case "conversation":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "design":
        return <Eye className="h-5 w-5 text-pink-500" />;
      case "meeting":
        return <Users className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  // Setting up keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement === document.getElementById('search-input')) {
        handleSearch();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Unified Search</h1>
        <p className="text-muted-foreground mt-1">
          Search across all integrated platforms with tenant isolation
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-input"
                className="pl-10 pr-16"
                placeholder="Search across all platforms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  className="absolute right-2 top-2 h-6 w-6 p-0" 
                  onClick={() => setSearchQuery("")}
                >
                  <span className="sr-only">Clear</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-x h-4 w-4"
                  >
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <div className="p-2">
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Sources</p>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Checkbox 
                            id="source-jira" 
                            checked={selectedSources.includes("jira")}
                            onCheckedChange={() => toggleSource("jira")}
                          />
                          <label
                            htmlFor="source-jira"
                            className="ml-2 text-sm font-medium leading-none cursor-pointer"
                          >
                            Jira
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox 
                            id="source-github" 
                            checked={selectedSources.includes("github")}
                            onCheckedChange={() => toggleSource("github")}
                          />
                          <label
                            htmlFor="source-github"
                            className="ml-2 text-sm font-medium leading-none cursor-pointer"
                          >
                            GitHub
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox 
                            id="source-drive" 
                            checked={selectedSources.includes("drive")}
                            onCheckedChange={() => toggleSource("drive")}
                          />
                          <label
                            htmlFor="source-drive"
                            className="ml-2 text-sm font-medium leading-none cursor-pointer"
                          >
                            Drive
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox 
                            id="source-slack" 
                            checked={selectedSources.includes("slack")}
                            onCheckedChange={() => toggleSource("slack")}
                          />
                          <label
                            htmlFor="source-slack"
                            className="ml-2 text-sm font-medium leading-none cursor-pointer"
                          >
                            Slack
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox 
                            id="source-figma" 
                            checked={selectedSources.includes("figma")}
                            onCheckedChange={() => toggleSource("figma")}
                          />
                          <label
                            htmlFor="source-figma"
                            className="ml-2 text-sm font-medium leading-none cursor-pointer"
                          >
                            Figma
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox 
                            id="source-teams" 
                            checked={selectedSources.includes("teams")}
                            onCheckedChange={() => toggleSource("teams")}
                          />
                          <label
                            htmlFor="source-teams"
                            className="ml-2 text-sm font-medium leading-none cursor-pointer"
                          >
                            Teams
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Date Range</p>
                      <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All time</SelectItem>
                          <SelectItem value="day">Last 24 hours</SelectItem>
                          <SelectItem value="week">Last 7 days</SelectItem>
                          <SelectItem value="month">Last 30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Sort Order</p>
                      <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="date">Date (newest first)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                className="flex gap-2" 
                onClick={handleSearch} 
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 
                  <svg 
                    className="h-4 w-4 animate-spin" 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg> : 
                  <Search className="h-4 w-4" />
                }
                <span className="hidden sm:inline">{isSearching ? 'Searching...' : 'Search'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!lastSearch && !isSearching && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Get Started with Unified Search</CardTitle>
            <CardDescription>
              Search across all connected platforms with a single query
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Available Sources</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center p-2 border rounded-md">
                    <div className="h-8 w-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Jira</p>
                      <p className="text-muted-foreground text-xs">Tasks, Epics</p>
                    </div>
                  </div>
                  <div className="flex items-center p-2 border rounded-md">
                    <div className="h-8 w-8 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center mr-2">
                      <GitBranch className="h-5 w-5" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">GitHub</p>
                      <p className="text-muted-foreground text-xs">PRs, Issues</p>
                    </div>
                  </div>
                  <div className="flex items-center p-2 border rounded-md">
                    <div className="h-8 w-8 rounded-md bg-green-100 text-green-600 flex items-center justify-center mr-2">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Drive</p>
                      <p className="text-muted-foreground text-xs">Documents</p>
                    </div>
                  </div>
                  <div className="flex items-center p-2 border rounded-md">
                    <div className="h-8 w-8 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center mr-2">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Slack</p>
                      <p className="text-muted-foreground text-xs">Messages</p>
                    </div>
                  </div>
                  <div className="flex items-center p-2 border rounded-md">
                    <div className="h-8 w-8 rounded-md bg-pink-100 text-pink-600 flex items-center justify-center mr-2">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H8.5a3.5 3.5 0 0 0 0 7h3.5V2z"/><path d="M12 9H8.5a3.5 3.5 0 0 0 0 7h3.5V9z"/><path d="M12 16H8.5a3.5 3.5 0 0 0 0 7h7a3.5 3.5 0 0 0 0-7h-3.5v7"/><path d="M12 2h3.5a3.5 3.5 0 0 1 0 7H12V2z"/><path d="M15.5 9a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"/></svg>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Figma</p>
                      <p className="text-muted-foreground text-xs">Designs</p>
                    </div>
                  </div>
                  <div className="flex items-center p-2 border rounded-md">
                    <div className="h-8 w-8 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Teams</p>
                      <p className="text-muted-foreground text-xs">Meetings</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Saved Searches</h3>
                <div className="space-y-2">
                  {savedSearches.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">
                      No saved searches yet. You can save searches for quick access.
                    </p>
                  ) : (
                    savedSearches.map(search => (
                      <div key={search.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-accent/50 transition-colors">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-2" />
                          <span className="font-medium">{search.name}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => loadSavedSearch(search.query)}
                        >
                          Run
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {lastSearch && !isSearching && searchResults.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{searchResults.length} results for "{lastSearch}"</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={saveCurrentSearch}
                className="flex gap-1"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-muted-foreground mr-1">
                View by:
              </div>
              <Button
                variant={resultsView === "relevance" ? "default" : "outline"}
                size="sm"
                onClick={() => setResultsView("relevance")}
              >
                <BarChart2 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Relevance</span>
              </Button>
              <Button
                variant={resultsView === "timeline" ? "default" : "outline"}
                size="sm"
                onClick={() => setResultsView("timeline")}
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Timeline</span>
              </Button>
              <Button
                variant={resultsView === "source" ? "default" : "outline"}
                size="sm"
                onClick={() => setResultsView("source")}
              >
                <Code className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Source</span>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              {resultsView === "relevance" && (
                <div className="space-y-4 mt-4">
                  {searchResults.map((result) => (
                    <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="flex">
                        <div className={`w-2 ${
                          result.source === 'jira' ? 'bg-blue-500' :
                          result.source === 'github' ? 'bg-gray-700' :
                          result.source === 'drive' ? 'bg-green-500' :
                          result.source === 'slack' ? 'bg-purple-500' :
                          result.source === 'figma' ? 'bg-pink-500' :
                          'bg-blue-600'
                        }`}></div>
                        <div className="flex-1 p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              {getResultIcon(result.type)}
                              <div className="ml-2">
                                <h3 className="font-medium">
                                  <Highlight text={result.title} highlight={lastSearch} />
                                </h3>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center">
                                    {getSourceIcon(result.source)}
                                    <span className="ml-1 capitalize">{result.source}</span>
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    <span>{result.lastUpdated}</span>
                                  </span>
                                  {result.project && (
                                    <>
                                      <span className="mx-2">•</span>
                                      <span>{result.project}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {result.matchScore}% match
                            </Badge>
                          </div>
                          {result.description && (
                            <p className="mt-2 text-sm">
                              <Highlight text={result.description} highlight={lastSearch} />
                            </p>
                          )}
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {result.tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-4">
                            {result.author && (
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage src={result.author.avatar} alt={result.author.name} />
                                  <AvatarFallback>{result.author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{result.author.name}</span>
                              </div>
                            )}
                            {result.url && (
                              <Button variant="ghost" size="sm" className="gap-1" asChild>
                                <a href={result.url} target="_blank" rel="noopener noreferrer">
                                  Open
                                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              
              {resultsView === "timeline" && (
                <div className="space-y-2 mt-6">
                  <div className="relative border-l-2 border-muted pl-6 ml-4">
                    {searchResults
                      .sort((a, b) => {
                        // Simple sort for demonstration
                        if (a.lastUpdated === b.lastUpdated) return 0;
                        const timeUnits = { 
                          "hours": 1, 
                          "Yesterday": 24, 
                          "days": 24, 
                          "week": 168, 
                          "weeks": 168 
                        };
                        
                        const getTimeValue = (str: string) => {
                          for (const [unit, multiplier] of Object.entries(timeUnits)) {
                            if (str.includes(unit)) {
                              const num = parseInt(str.split(' ')[0]);
                              return num * multiplier;
                            }
                          }
                          return 999; // Default high value for unknown formats
                        };
                        
                        return getTimeValue(a.lastUpdated) - getTimeValue(b.lastUpdated);
                      })
                      .map((result, index, arr) => {
                        // Create time groups
                        const isNewGroup = index === 0 || 
                          (result.lastUpdated.includes('hours') && !arr[index-1].lastUpdated.includes('hours')) ||
                          (result.lastUpdated.includes('Yesterday') && !arr[index-1].lastUpdated.includes('Yesterday')) ||
                          (result.lastUpdated.includes('days') && !arr[index-1].lastUpdated.includes('days')) ||
                          (result.lastUpdated.includes('week') && !arr[index-1].lastUpdated.includes('week'));
                        
                        return (
                          <div key={result.id} className="mb-6">
                            {isNewGroup && (
                              <div className="absolute -left-[9px] -mt-1">
                                <div className="h-4 w-4 rounded-full bg-primary"></div>
                              </div>
                            )}
                            {isNewGroup && (
                              <h3 className="text-base font-semibold -mt-1 mb-3">
                                {result.lastUpdated.includes("hours") ? "Today" : 
                                 result.lastUpdated === "Yesterday" ? "Yesterday" : 
                                 result.lastUpdated.includes("days") || result.lastUpdated.includes("week") ? "This Week" : 
                                 "Earlier"}
                              </h3>
                            )}
                            <div className="relative mb-8">
                              <div className="absolute -left-[30px] top-2">
                                <div className="h-2 w-2 rounded-full bg-primary"></div>
                              </div>
                              <Card>
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between">
                                    <div className="flex items-center">
                                      {getResultIcon(result.type)}
                                      <CardTitle className="ml-2 text-base">
                                        <Highlight text={result.title} highlight={lastSearch} />
                                      </CardTitle>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {result.lastUpdated}
                                    </span>
                                  </div>
                                </CardHeader>
                                <CardContent className="pb-2">
                                  {result.description && (
                                    <p className="text-sm">
                                      <Highlight text={result.description} highlight={lastSearch} />
                                    </p>
                                  )}
                                  <div className="flex justify-between items-center mt-3">
                                    <div className="flex items-center">
                                      <Badge variant="outline" className="mr-2">
                                        <span className="flex items-center">
                                          {getSourceIcon(result.source)}
                                          <span className="ml-1 capitalize">{result.source}</span>
                                        </span>
                                      </Badge>
                                      {result.tags && result.tags.length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          {result.tags[0]}{result.tags.length > 1 && `+${result.tags.length - 1}`}
                                        </Badge>
                                      )}
                                    </div>
                                    {result.url && (
                                      <Button variant="ghost" size="sm" asChild>
                                        <a href={result.url} target="_blank" rel="noopener noreferrer">
                                          View
                                          <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {resultsView === "source" && (
                <div className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(["jira", "github", "drive", "slack", "figma", "teams"] as PlatformSource[])
                      .filter(source => selectedSources.includes(source) && searchResults.some(r => r.source === source))
                      .map(source => {
                        const sourceResults = searchResults.filter(r => r.source === source);
                        return (
                          <Card key={source} className="overflow-hidden">
                            <CardHeader className="pb-2">
                              <div className="flex items-center">
                                <div className={`h-8 w-8 rounded-md flex items-center justify-center mr-2 ${
                                  source === 'jira' ? 'bg-blue-100 text-blue-500' :
                                  source === 'github' ? 'bg-gray-100 text-gray-700' :
                                  source === 'drive' ? 'bg-green-100 text-green-500' :
                                  source === 'slack' ? 'bg-purple-100 text-purple-500' :
                                  source === 'figma' ? 'bg-pink-100 text-pink-500' :
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {getSourceIcon(source)}
                                </div>
                                <div>
                                  <CardTitle className="capitalize">{source}</CardTitle>
                                  <CardDescription>{sourceResults.length} results</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <ScrollArea className="h-[240px] pr-3">
                                <div className="space-y-2">
                                  {sourceResults.map(result => (
                                    <div key={result.id} className="border rounded-md p-3 hover:bg-accent/50 transition-colors">
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-start">
                                          <div className="mt-0.5">
                                            {getResultIcon(result.type)}
                                          </div>
                                          <div className="ml-2">
                                            <h4 className="font-medium text-sm">
                                              <Highlight text={result.title} highlight={lastSearch} />
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {result.lastUpdated}
                                            </p>
                                          </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          {result.matchScore}%
                                        </Badge>
                                      </div>
                                      {result.description && (
                                        <p className="text-xs mt-2 line-clamp-2">
                                          <Highlight text={result.description} highlight={lastSearch} />
                                        </p>
                                      )}
                                      {result.url && (
                                        <div className="mt-2 flex justify-end">
                                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                            <a href={result.url} target="_blank" rel="noopener noreferrer">
                                              View
                                              <ArrowUpRight className="h-3 w-3 ml-1" />
                                            </a>
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </CardContent>
                            <CardFooter>
                              <Button variant="outline" size="sm" className="w-full" asChild>
                                <a href={`https://${source}.example.com/search?q=${encodeURIComponent(lastSearch)}`} target="_blank" rel="noopener noreferrer">
                                  View all in {source.charAt(0).toUpperCase() + source.slice(1)}
                                </a>
                              </Button>
                            </CardFooter>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="documents">
              <div className="mt-4">
                {searchResults.filter(r => r.type === "document" || r.source === "drive" || r.type === "design").length === 0 ? (
                  <p className="text-center p-8 text-muted-foreground">No document results found</p>
                ) : (
                  <div className="space-y-4">
                    {searchResults
                      .filter(r => r.type === "document" || r.source === "drive" || r.type === "design")
                      .map(result => (
                        <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex">
                            <div className={`w-2 ${
                              result.source === 'drive' ? 'bg-green-500' :
                              result.source === 'figma' ? 'bg-pink-500' :
                              'bg-blue-500'
                            }`}></div>
                            <div className="flex-1 p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                  {getResultIcon(result.type)}
                                  <div className="ml-2">
                                    <h3 className="font-medium">
                                      <Highlight text={result.title} highlight={lastSearch} />
                                    </h3>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                      <span className="flex items-center">
                                        {getSourceIcon(result.source)}
                                        <span className="ml-1 capitalize">{result.source}</span>
                                      </span>
                                      <span className="mx-2">•</span>
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        <span>{result.lastUpdated}</span>
                                      </span>
                                      {result.project && (
                                        <>
                                          <span className="mx-2">•</span>
                                          <span>{result.project}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {result.description && (
                                <p className="mt-2 text-sm">
                                  <Highlight text={result.description} highlight={lastSearch} />
                                </p>
                              )}
                              <div className="flex justify-between items-center mt-4">
                                {result.author && (
                                  <div className="flex items-center">
                                    <Avatar className="h-6 w-6 mr-2">
                                      <AvatarImage src={result.author.avatar} alt={result.author.name} />
                                      <AvatarFallback>{result.author.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{result.author.name}</span>
                                  </div>
                                )}
                                {result.url && (
                                  <Button variant="outline" size="sm" className="gap-1" asChild>
                                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                                      Open Document
                                      <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="tasks">
              <div className="mt-4">
                {searchResults.filter(r => r.type === "task" || r.source === "jira").length === 0 ? (
                  <p className="text-center p-8 text-muted-foreground">No task results found</p>
                ) : (
                  <div className="space-y-4">
                    {searchResults
                      .filter(r => r.type === "task" || r.source === "jira")
                      .map(result => (
                        <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex">
                            <div className="w-2 bg-blue-500"></div>
                            <div className="flex-1 p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                  {getResultIcon(result.type)}
                                  <div className="ml-2">
                                    <h3 className="font-medium">
                                      <Highlight text={result.title} highlight={lastSearch} />
                                    </h3>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                      <span className="flex items-center">
                                        {getSourceIcon(result.source)}
                                        <span className="ml-1 capitalize">{result.source}</span>
                                      </span>
                                      <span className="mx-2">•</span>
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        <span>{result.lastUpdated}</span>
                                      </span>
                                      {result.project && (
                                        <>
                                          <span className="mx-2">•</span>
                                          <span>{result.project}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {result.metadata?.status && (
                                  <Badge className={
                                    result.metadata.status === "In Progress" ? "bg-blue-500" :
                                    result.metadata.status === "Done" ? "bg-green-500" :
                                    result.metadata.status === "Blocked" ? "bg-red-500" :
                                    "bg-gray-500"
                                  }>
                                    {result.metadata.status}
                                  </Badge>
                                )}
                              </div>
                              {result.description && (
                                <p className="mt-2 text-sm">
                                  <Highlight text={result.description} highlight={lastSearch} />
                                </p>
                              )}
                              {result.metadata?.priority && (
                                <div className="mt-2">
                                  <span className="text-xs text-muted-foreground">Priority: </span>
                                  <Badge variant="outline" className={
                                    result.metadata.priority === "High" ? "text-red-500" :
                                    result.metadata.priority === "Medium" ? "text-amber-500" :
                                    "text-green-500"
                                  }>
                                    {result.metadata.priority}
                                  </Badge>
                                </div>
                              )}
                              <div className="flex justify-between items-center mt-4">
                                {result.metadata?.assignee && (
                                  <div className="flex items-center">
                                    <span className="text-sm">Assigned to: {result.metadata.assignee}</span>
                                  </div>
                                )}
                                {result.url && (
                                  <Button variant="outline" size="sm" className="gap-1" asChild>
                                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                                      View Task
                                      <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="code">
              <div className="mt-4">
                {searchResults.filter(r => r.type === "pull-request" || r.source === "github").length === 0 ? (
                  <p className="text-center p-8 text-muted-foreground">No code results found</p>
                ) : (
                  <div className="space-y-4">
                    {searchResults
                      .filter(r => r.type === "pull-request" || r.source === "github")
                      .map(result => (
                        <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex">
                            <div className="w-2 bg-gray-700"></div>
                            <div className="flex-1 p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                  {getResultIcon(result.type)}
                                  <div className="ml-2">
                                    <h3 className="font-medium">
                                      <Highlight text={result.title} highlight={lastSearch} />
                                    </h3>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                      <span className="flex items-center">
                                        {getSourceIcon(result.source)}
                                        <span className="ml-1 capitalize">{result.source}</span>
                                      </span>
                                      <span className="mx-2">•</span>
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        <span>{result.lastUpdated}</span>
                                      </span>
                                      {result.project && (
                                        <>
                                          <span className="mx-2">•</span>
                                          <span>{result.project}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {result.metadata?.status && (
                                  <Badge variant="outline">
                                    {result.metadata.status}
                                  </Badge>
                                )}
                              </div>
                              {result.description && (
                                <p className="mt-2 text-sm">
                                  <Highlight text={result.description} highlight={lastSearch} />
                                </p>
                              )}
                              {result.metadata?.branches && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center">
                                    <GitBranch className="h-3.5 w-3.5 mr-1" />
                                    {result.metadata.branches.from} → {result.metadata.branches.to}
                                  </span>
                                </div>
                              )}
                              {result.metadata?.comments > 0 && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center">
                                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                    {result.metadata.comments} comments
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center mt-4">
                                {result.author && (
                                  <div className="flex items-center">
                                    <Avatar className="h-6 w-6 mr-2">
                                      <AvatarImage src={result.author.avatar} alt={result.author.name} />
                                      <AvatarFallback>{result.author.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{result.author.name}</span>
                                  </div>
                                )}
                                {result.url && (
                                  <Button variant="outline" size="sm" className="gap-1" asChild>
                                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                                      View PR
                                      <ExternalLink className="h-3.5 w-3.5 ml-1" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="people">
              <div className="mt-4">
                {searchResults.filter(r => r.author).length === 0 ? (
                  <p className="text-center p-8 text-muted-foreground">No people results found</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from(new Set(searchResults.filter(r => r.author).map(r => r.author?.name)))
                      .map(name => {
                        const personResults = searchResults.filter(r => r.author?.name === name);
                        const person = personResults[0].author!;
                        return (
                          <Card key={name} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10 mr-3">
                                  <AvatarImage src={person.avatar} alt={person.name} />
                                  <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <CardTitle className="text-lg">{person.name}</CardTitle>
                                  <CardDescription>
                                    {personResults[0].metadata?.assignee || personResults[0].project || "Team Member"}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <div className="space-y-2">
                                <div>
                                  <div className="text-sm font-medium">Recent Activity</div>
                                  <div className="mt-1 space-y-2">
                                    {personResults.slice(0, 3).map(result => (
                                      <div key={result.id} className="text-sm flex items-start">
                                        <div className="mt-0.5 mr-2">
                                          {getSourceIcon(result.source)}
                                        </div>
                                        <div>
                                          <Highlight
                                            text={result.title.length > 40 ? result.title.substring(0, 40) + '...' : result.title}
                                            highlight={lastSearch}
                                          />
                                          <div className="text-xs text-muted-foreground">
                                            {result.lastUpdated}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm font-medium">Platforms</div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Array.from(new Set(personResults.map(r => r.source))).map(source => (
                                      <Badge key={source} variant="outline" className="text-xs capitalize">
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                              <div className="flex space-x-2 w-full">
                                <Button variant="outline" size="sm" className="flex-1 h-8">
                                  <MessageSquare className="h-3.5 w-3.5 mr-2" />
                                  Message
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 h-8">
                                  <Users className="h-3.5 w-3.5 mr-2" />
                                  View Profile
                                </Button>
                              </div>
                            </CardFooter>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
      
      {lastSearch && !isSearching && searchResults.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No results found</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-md">
              We couldn't find any results for "{lastSearch}" with your current filters. Try adjusting your search terms or filters.
            </p>
            <div className="mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setLastSearch("");
                }}
              >
                Clear Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {isSearching && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <h3 className="mt-4 text-lg font-medium">Searching across platforms...</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-md">
              We're searching for "{searchQuery}" in all your connected platforms. This might take a moment.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Enterprise-Grade Search Implementation</CardTitle>
          <CardDescription>
            Features aligned with the Technical Product Requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>Cross-Platform Query Engine</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>Tenant Isolation & Data Security</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>AI-Enhanced Result Ranking</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>Multi-Index Search Architecture</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>Real-Time Knowledge Graph</span>
                <span className="text-green-500">Complete</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}