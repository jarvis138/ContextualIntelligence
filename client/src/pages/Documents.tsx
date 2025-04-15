import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecentDocuments } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';

export default function Documents() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigateToDocumentManagement = () => {
    navigate('/documents/manage');
  };
  
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents/recent'],
    queryFn: () => getRecentDocuments()
  });
  
  // Filter documents based on search query
  const filteredDocuments = documents?.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.content?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );
  
  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  };
  
  const getDocumentIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'ri-file-pdf-line';
      case 'excel':
      case 'spreadsheet':
        return 'ri-file-excel-2-line';
      case 'word':
      case 'doc':
        return 'ri-file-word-line';
      case 'ppt':
      case 'presentation':
        return 'ri-file-ppt-line';
      default:
        return 'ri-file-text-line';
    }
  };
  
  const getDocumentIconColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'bg-red-100 text-red-700';
      case 'excel':
      case 'spreadsheet':
        return 'bg-green-100 text-green-700';
      case 'word':
      case 'doc':
        return 'bg-blue-100 text-blue-700';
      case 'ppt':
      case 'presentation':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };
  
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
            
            <div className="flex space-x-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search documents..."
                  className="w-64 pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-2.5">
                  <i className="ri-search-line text-gray-400"></i>
                </div>
              </div>
              
              <Button onClick={() => toast({
                title: "Upload Document",
                description: "This would open a document upload form"
              })}>
                <i className="ri-upload-2-line mr-1"></i> Upload
              </Button>
              
              <Button variant="outline" onClick={() => toast({
                title: "Create Document",
                description: "This would open a document creation form"
              })}>
                <i className="ri-add-line mr-1"></i> New
              </Button>
              
              <Button variant="secondary" onClick={navigateToDocumentManagement}>
                <i className="ri-settings-line mr-1"></i> Manage Docs
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="all" className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="shared">Shared with me</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
                    <p className="text-gray-500">Loading documents...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDocuments?.map(document => (
                    <Card key={document.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        <div 
                          className="p-4 cursor-pointer" 
                          onClick={() => navigate(`/documents/${document.id}`)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-12 h-12 rounded flex items-center justify-center ${getDocumentIconColor(document.fileType)}`}>
                              <i className={`${getDocumentIcon(document.fileType)} text-xl`}></i>
                            </div>
                            <div>
                              <h3 className="text-md font-medium text-gray-800">{document.title}</h3>
                              <div className="mt-1 text-xs text-gray-500">
                                <span>
                                  Updated {formatTimeAgo(document.updatedAt)}
                                  {document.updatedByUser && ` by ${document.updatedByUser.fullName}`}
                                </span>
                              </div>
                              {document.content && (
                                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                  {document.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="border-t px-4 py-2 bg-gray-50 flex justify-between">
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => toast({ 
                              title: "Share Document", 
                              description: `Share ${document.title} with team members`
                            })}>
                              <i className="ri-share-line mr-1"></i> Share
                            </Button>
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => toast({ 
                              title: "Download Document", 
                              description: `Download ${document.title}`
                            })}>
                              <i className="ri-download-line"></i>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toast({ 
                              title: "More Options", 
                              description: `Options for ${document.title}`
                            })}>
                              <i className="ri-more-2-line"></i>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredDocuments?.length === 0 && (
                    <div className="col-span-full flex justify-center items-center h-64">
                      <div className="text-center">
                        <div className="ri-file-search-line text-4xl text-gray-400 mb-4"></div>
                        <h3 className="text-lg font-medium text-gray-700">No documents found</h3>
                        <p className="text-gray-500 mt-1">Try adjusting your search or upload a new document</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recent" className="mt-6">
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="ri-time-line text-4xl text-gray-400 mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-700">Recent Documents</h3>
                  <p className="text-gray-500 mt-1">This tab would show recently accessed documents</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="shared" className="mt-6">
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="ri-share-line text-4xl text-gray-400 mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-700">Shared with me</h3>
                  <p className="text-gray-500 mt-1">This tab would show documents shared with you</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="favorites" className="mt-6">
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="ri-star-line text-4xl text-gray-400 mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-700">Favorites</h3>
                  <p className="text-gray-500 mt-1">This tab would show your favorite documents</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
