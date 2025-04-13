import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Info, Search as SearchIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SearchResults {
  projects: any[];
  documents: any[];
  tasks: any[];
  users: any[];
  teams: any[];
  semanticResults: any[];
  source?: string;
}

export default function Search() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    projects: [],
    documents: [],
    tasks: [],
    users: [],
    teams: [],
    semanticResults: []
  });

  // Check if Elasticsearch is available
  const { 
    data: elasticsearchStatus,
    isLoading: isLoadingStatus
  } = useQuery({
    queryKey: ['/api/search/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/search/status');
      return await response.json();
    },
  });

  // Mutation for performing search
  const searchMutation = useMutation({
    mutationFn: async ({ query, projectId }: { query: string, projectId?: number }) => {
      const endpoint = elasticsearchStatus?.available ? '/api/search/hybrid' : '/api/search/global';
      const response = await apiRequest('POST', endpoint, { 
        query, 
        projectId,
        filters: projectId ? { projectId } : {}
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSearchResults(data.results);
      } else {
        toast({
          title: 'Search failed',
          description: data.message || 'Failed to perform search. Please try again.',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Search failed',
        description: error.message || 'An error occurred while searching',
        variant: 'destructive'
      });
    }
  });

  // Initialization mutation for Elasticsearch (admin only)
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/search/initialize');
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Search index initialized',
          description: `Indexed ${data.results.projects} projects, ${data.results.documents} documents, ${data.results.tasks} tasks, ${data.results.users} users, and ${data.results.teams} teams.`,
        });
        queryClient.invalidateQueries({queryKey: ['/api/search/status']});
      } else {
        toast({
          title: 'Initialization failed',
          description: data.message || 'Failed to initialize search index',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Initialization failed',
        description: error.message || 'An error occurred while initializing search',
        variant: 'destructive'
      });
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    searchMutation.mutate({
      query: searchQuery,
      projectId: projectFilter
    });
  };

  // Calculate total results
  const totalResults = 
    searchResults.projects.length +
    searchResults.documents.length +
    searchResults.tasks.length +
    searchResults.users.length +
    searchResults.teams.length +
    searchResults.semanticResults.length;

  // Mock user for demonstration
  const user = {
    id: 1,
    avatar: null,
    fullName: 'Current User',
    role: 'user'
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Search</h1>
              
              {user?.role === 'admin' && (
                <Button 
                  variant="outline"
                  onClick={() => initializeMutation.mutate()}
                  disabled={initializeMutation.isPending}
                >
                  {initializeMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Initializing...</>
                  ) : (
                    <>Initialize Search Index</>
                  )}
                </Button>
              )}
            </div>
            
            {isLoadingStatus ? (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-sm text-gray-500">Checking search service status...</p>
              </div>
            ) : (
              <>
                {!elasticsearchStatus?.available && (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Full-text search is currently unavailable. The system will use basic search capabilities.
                      {user?.role === 'admin' && ' Click "Initialize Search Index" to set up the search service.'}
                    </AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSearch} className="mb-8">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search for projects, documents, tasks, users, or teams..."
                      className="pl-10 pr-24 py-6 text-lg"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute left-3 top-4">
                      <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="absolute right-3 top-2">
                      <Button 
                        type="submit" 
                        disabled={!searchQuery.trim() || searchMutation.isPending}
                        className="py-4"
                      >
                        {searchMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                          </>
                        ) : (
                          'Search'
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    Try searching for project names, document titles, or task descriptions
                  </div>
                </form>
                
                {searchMutation.isPending ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-500">Searching across all project data...</p>
                  </div>
                ) : (
                  <>
                    {searchMutation.isSuccess && totalResults > 0 ? (
                      <div>
                        <div className="mb-6">
                          <h2 className="text-lg font-medium text-gray-700">
                            Found {totalResults} results for "{searchQuery}"
                            {searchResults.source && (
                              <Badge className="ml-2" variant="outline">Source: {searchResults.source}</Badge>
                            )}
                          </h2>
                        </div>
                        
                        <Tabs defaultValue="all" onValueChange={setSelectedTab}>
                          <TabsList className="mb-6">
                            <TabsTrigger value="all">All Results ({totalResults})</TabsTrigger>
                            {searchResults.projects.length > 0 && (
                              <TabsTrigger value="projects">Projects ({searchResults.projects.length})</TabsTrigger>
                            )}
                            {searchResults.documents.length > 0 && (
                              <TabsTrigger value="documents">Documents ({searchResults.documents.length})</TabsTrigger>
                            )}
                            {searchResults.tasks.length > 0 && (
                              <TabsTrigger value="tasks">Tasks ({searchResults.tasks.length})</TabsTrigger>
                            )}
                            {searchResults.users.length > 0 && (
                              <TabsTrigger value="users">Users ({searchResults.users.length})</TabsTrigger>
                            )}
                            {searchResults.teams.length > 0 && (
                              <TabsTrigger value="teams">Teams ({searchResults.teams.length})</TabsTrigger>
                            )}
                            {searchResults.semanticResults.length > 0 && (
                              <TabsTrigger value="semantic">Semantic Results ({searchResults.semanticResults.length})</TabsTrigger>
                            )}
                          </TabsList>
                          
                          <TabsContent value="all" className="space-y-6">
                            {/* Projects */}
                            {searchResults.projects.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Projects</h3>
                                <div className="space-y-3">
                                  {searchResults.projects.map(project => (
                                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-start">
                                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 mr-3">
                                            <i className="ri-file-list-3-line"></i>
                                          </div>
                                          <div>
                                            <h4 className="text-md font-medium text-gray-800">{project.name}</h4>
                                            <p className="text-sm text-gray-600">{project.description}</p>
                                            <div className="mt-2 flex items-center">
                                              <div className="w-24 bg-gray-200 rounded-full h-1.5 mr-2">
                                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                                              </div>
                                              <span className="text-xs text-gray-500">{project.progress}% complete</span>
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Documents */}
                            {searchResults.documents.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h3>
                                <div className="space-y-3">
                                  {searchResults.documents.map(doc => (
                                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-start">
                                          <div className={`w-10 h-10 rounded flex items-center justify-center mr-3 ${
                                            doc.fileType === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                          }`}>
                                            <i className={doc.fileType === 'pdf' ? 'ri-file-pdf-line' : 'ri-file-text-line'}></i>
                                          </div>
                                          <div>
                                            <h4 className="text-md font-medium text-gray-800">{doc.title}</h4>
                                            <p className="text-sm text-gray-500">Updated {doc.updatedAt} by {doc.updatedBy}</p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Tasks */}
                            {searchResults.tasks.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Tasks</h3>
                                <div className="space-y-3">
                                  {searchResults.tasks.map(task => (
                                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-start">
                                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700 mr-3">
                                            <i className="ri-task-line"></i>
                                          </div>
                                          <div>
                                            <h4 className="text-md font-medium text-gray-800">{task.title}</h4>
                                            <div className="flex items-center mt-1">
                                              <span className={`px-2 py-1 text-xs rounded-full mr-2 ${
                                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'
                                              }`}>
                                                {task.status.replace('_', ' ')}
                                              </span>
                                              <span className="text-sm text-gray-500">Assigned to {task.assignee}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Users */}
                            {searchResults.users.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Users</h3>
                                <div className="space-y-3">
                                  {searchResults.users.map((user) => (
                                    <Card key={user.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-center">
                                          <Avatar className="h-10 w-10 mr-3">
                                            <AvatarImage src={user.avatar} alt={user.fullName} />
                                            <AvatarFallback>{user.fullName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <h4 className="text-md font-medium text-gray-800">{user.fullName}</h4>
                                            <p className="text-sm text-gray-500">{user.role}</p>
                                          </div>
                                          <Badge variant="outline" className="ml-auto">{user.username}</Badge>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Teams */}
                            {searchResults.teams.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Teams</h3>
                                <div className="space-y-3">
                                  {searchResults.teams.map((team) => (
                                    <Card key={team.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-start">
                                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 mr-3">
                                            <i className="ri-team-line"></i>
                                          </div>
                                          <div>
                                            <h4 className="text-md font-medium text-gray-800">{team.name}</h4>
                                            <p className="text-sm text-gray-600">{team.description}</p>
                                            {team.memberCount && <p className="text-xs text-gray-500 mt-1">{team.memberCount} members</p>}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Semantic Results */}
                            {searchResults.semanticResults.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Semantic Matches</h3>
                                <div className="space-y-3">
                                  {searchResults.semanticResults.map((result) => (
                                    <Card key={result.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-start">
                                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700 mr-3">
                                            <Info className="h-5 w-5" />
                                          </div>
                                          <div>
                                            <h4 className="text-md font-medium text-gray-800">{result.title || result.name}</h4>
                                            <p className="text-sm text-gray-600">{result.description || result.content}</p>
                                            {result.similarity && (
                                              <div className="mt-2 flex items-center">
                                                <div className="w-24 bg-gray-200 rounded-full h-1.5 mr-2">
                                                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${result.similarity * 100}%` }}></div>
                                                </div>
                                                <span className="text-xs text-gray-500">{Math.round(result.similarity * 100)}% match</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="projects">
                            {searchResults.projects.length > 0 ? (
                              <div className="space-y-3">
                                {searchResults.projects.map(project => (
                                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-start">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 mr-3">
                                          <i className="ri-file-list-3-line"></i>
                                        </div>
                                        <div>
                                          <h4 className="text-md font-medium text-gray-800">{project.name}</h4>
                                          <p className="text-sm text-gray-600">{project.description}</p>
                                          <div className="mt-2 flex items-center">
                                            <div className="w-24 bg-gray-200 rounded-full h-1.5 mr-2">
                                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                                            </div>
                                            <span className="text-xs text-gray-500">{project.progress}% complete</span>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <p className="text-gray-500">No project results found</p>
                              </div>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="documents">
                            {searchResults.documents.length > 0 ? (
                              <div className="space-y-3">
                                {searchResults.documents.map(doc => (
                                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-start">
                                        <div className={`w-10 h-10 rounded flex items-center justify-center mr-3 ${
                                          doc.fileType === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                          <i className={doc.fileType === 'pdf' ? 'ri-file-pdf-line' : 'ri-file-text-line'}></i>
                                        </div>
                                        <div>
                                          <h4 className="text-md font-medium text-gray-800">{doc.title}</h4>
                                          <p className="text-sm text-gray-500">Updated {doc.updatedAt} by {doc.updatedBy}</p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <p className="text-gray-500">No document results found</p>
                              </div>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="tasks">
                            {searchResults.tasks.length > 0 ? (
                              <div className="space-y-3">
                                {searchResults.tasks.map(task => (
                                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-start">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700 mr-3">
                                          <i className="ri-task-line"></i>
                                        </div>
                                        <div>
                                          <h4 className="text-md font-medium text-gray-800">{task.title}</h4>
                                          <div className="flex items-center mt-1">
                                            <span className={`px-2 py-1 text-xs rounded-full mr-2 ${
                                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                              'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              {task.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-sm text-gray-500">Assigned to {task.assignee}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <p className="text-gray-500">No task results found</p>
                              </div>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="users">
                            {searchResults.users.length > 0 ? (
                              <div className="space-y-3">
                                {searchResults.users.map((user) => (
                                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-center">
                                        <Avatar className="h-10 w-10 mr-3">
                                          <AvatarImage src={user.avatar} alt={user.fullName} />
                                          <AvatarFallback>{user.fullName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <h4 className="text-md font-medium text-gray-800">{user.fullName}</h4>
                                          <p className="text-sm text-gray-500">{user.role}</p>
                                        </div>
                                        <Badge variant="outline" className="ml-auto">{user.username}</Badge>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <p className="text-gray-500">No user results found</p>
                              </div>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="teams">
                            {searchResults.teams.length > 0 ? (
                              <div className="space-y-3">
                                {searchResults.teams.map((team) => (
                                  <Card key={team.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-start">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 mr-3">
                                          <i className="ri-team-line"></i>
                                        </div>
                                        <div>
                                          <h4 className="text-md font-medium text-gray-800">{team.name}</h4>
                                          <p className="text-sm text-gray-600">{team.description}</p>
                                          {team.memberCount && <p className="text-xs text-gray-500 mt-1">{team.memberCount} members</p>}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <p className="text-gray-500">No team results found</p>
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="semantic">
                            {searchResults.semanticResults.length > 0 ? (
                              <div className="space-y-3">
                                {searchResults.semanticResults.map((result) => (
                                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-start">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700 mr-3">
                                          <Info className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <h4 className="text-md font-medium text-gray-800">{result.title || result.name}</h4>
                                          <p className="text-sm text-gray-600">{result.description || result.content}</p>
                                          {result.similarity && (
                                            <div className="mt-2 flex items-center">
                                              <div className="w-24 bg-gray-200 rounded-full h-1.5 mr-2">
                                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${result.similarity * 100}%` }}></div>
                                              </div>
                                              <span className="text-xs text-gray-500">{Math.round(result.similarity * 100)}% match</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12">
                                <p className="text-gray-500">No semantic results found</p>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="ri-search-line text-5xl text-gray-300 mb-6"></div>
                        <h3 className="text-xl font-medium text-gray-700 mb-2">No results found</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          We couldn't find any matches for "{searchQuery}". Try adjusting your search terms or browse through the project categories.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}