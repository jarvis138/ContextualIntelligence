import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Search() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Mock search results
  const [searchResults, setSearchResults] = useState<{
    projects: any[];
    documents: any[];
    tasks: any[];
    conversations: any[];
    people: any[];
  }>({
    projects: [],
    documents: [],
    tasks: [],
    conversations: [],
    people: []
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Mock search results based on query
      if (searchQuery.toLowerCase().includes('redesign')) {
        setSearchResults({
          projects: [
            { id: 1, name: 'Web Application Redesign', description: 'Redesign of the company web application', progress: 67 }
          ],
          documents: [
            { id: 1, title: 'UI Component Documentation', updatedAt: '2 hours ago', updatedBy: 'Sarah Chen', fileType: 'text' },
            { id: 2, title: 'Redesign Wireframes', updatedAt: '3 days ago', updatedBy: 'Lisa Wong', fileType: 'pdf' }
          ],
          tasks: [
            { id: 1, title: 'Review redesign mockups', status: 'pending', assignee: 'Alex Morgan' },
            { id: 2, title: 'Implement new layout', status: 'in_progress', assignee: 'Sarah Chen' }
          ],
          conversations: [
            { id: 'conv1', name: 'Web App Redesign', lastMessage: 'The UI components are almost ready for testing', lastActivity: '10 min ago' }
          ],
          people: []
        });
      } else if (searchQuery.toLowerCase().includes('api')) {
        setSearchResults({
          projects: [],
          documents: [
            { id: 3, title: 'API Documentation', updatedAt: '3 days ago', updatedBy: 'Mark Johnson', fileType: 'pdf' }
          ],
          tasks: [
            { id: 3, title: 'Fix API Integration Issue #42', status: 'in_progress', assignee: 'Mark Johnson' },
            { id: 4, title: 'API Performance Testing', status: 'pending', assignee: 'David Kim' }
          ],
          conversations: [
            { id: 'conv2', name: 'Backend Team', lastMessage: 'We need to fix the API issue before Friday', lastActivity: '3 hours ago' }
          ],
          people: []
        });
      } else if (searchQuery.toLowerCase().includes('alex') || searchQuery.toLowerCase().includes('morgan')) {
        setSearchResults({
          projects: [],
          documents: [],
          tasks: [
            { id: 1, title: 'Review redesign mockups', status: 'pending', assignee: 'Alex Morgan' }
          ],
          conversations: [],
          people: [
            { id: 1, name: 'Alex Morgan', role: 'Project Manager', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }
          ]
        });
      } else {
        // No results
        setSearchResults({
          projects: [],
          documents: [],
          tasks: [],
          conversations: [],
          people: []
        });
      }
      
      setIsSearching(false);
    }, 1000);
  };
  
  const totalResults = 
    searchResults.projects.length + 
    searchResults.documents.length + 
    searchResults.tasks.length + 
    searchResults.conversations.length +
    searchResults.people.length;
  
  // Default user
  const user = {
    id: 1,
    username: 'alexmorgan',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Project Manager'
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Search</h1>
            
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for projects, documents, tasks, conversations, or people..."
                  className="pl-10 pr-24 py-6 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-4">
                  <i className="ri-search-line text-gray-400 text-xl"></i>
                </div>
                <div className="absolute right-3 top-2">
                  <Button 
                    type="submit" 
                    disabled={!searchQuery.trim() || isSearching}
                    className="py-4"
                  >
                    {isSearching ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i> Searching...
                      </>
                    ) : (
                      'Search'
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="mt-2 text-sm text-gray-500">
                Try searching for "redesign", "API", or "Alex Morgan"
              </div>
            </form>
            
            {hasSearched && (
              <>
                {isSearching ? (
                  <div className="text-center py-12">
                    <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
                    <p className="text-gray-500">Searching across all project data...</p>
                  </div>
                ) : (
                  <>
                    {totalResults > 0 ? (
                      <div>
                        <div className="mb-6">
                          <h2 className="text-lg font-medium text-gray-700">
                            Found {totalResults} results for "{searchQuery}"
                          </h2>
                        </div>
                        
                        <Tabs defaultValue="all">
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
                            {searchResults.conversations.length > 0 && (
                              <TabsTrigger value="conversations">Conversations ({searchResults.conversations.length})</TabsTrigger>
                            )}
                            {searchResults.people.length > 0 && (
                              <TabsTrigger value="people">People ({searchResults.people.length})</TabsTrigger>
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
                            
                            {/* Conversations */}
                            {searchResults.conversations.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversations</h3>
                                <div className="space-y-3">
                                  {searchResults.conversations.map(conv => (
                                    <Card key={conv.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-start">
                                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 mr-3">
                                            <i className="ri-chat-3-line"></i>
                                          </div>
                                          <div>
                                            <h4 className="text-md font-medium text-gray-800">{conv.name}</h4>
                                            <p className="text-sm text-gray-600 line-clamp-1">{conv.lastMessage}</p>
                                            <p className="text-xs text-gray-500 mt-1">Active {conv.lastActivity}</p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* People */}
                            {searchResults.people.length > 0 && (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">People</h3>
                                <div className="space-y-3">
                                  {searchResults.people.map(person => (
                                    <Card key={person.id} className="hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-center">
                                          <Avatar className="h-10 w-10 mr-3">
                                            <AvatarImage src={person.avatar} alt={person.name} />
                                            <AvatarFallback>{person.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <h4 className="text-md font-medium text-gray-800">{person.name}</h4>
                                            <p className="text-sm text-gray-500">{person.role}</p>
                                          </div>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="ml-auto"
                                            onClick={() => {
                                              window.alert(`Viewing ${person.name}'s profile. This would navigate to the team member's profile page.`);
                                            }}
                                          >
                                            View Profile
                                          </Button>
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
                            {/* Tasks content */}
                          </TabsContent>
                          
                          <TabsContent value="conversations">
                            {/* Conversations content */}
                          </TabsContent>
                          
                          <TabsContent value="people">
                            {/* People content */}
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
