import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecentDocuments } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { Search, Upload, Plus, Settings, Share, Download, MoreHorizontal, Clock, Star } from 'lucide-react';

export default function Documents() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigateToDocumentManagement = () => {
    navigate('/documents/manage');
  };
  
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['/api/documents/recent'],
    queryFn: getRecentDocuments
  });
  
  // Extract the actual documents array from the response
  const documents = documentsData?.data || [];
  
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
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        
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
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <Button onClick={() => toast({
            title: "Upload Document",
            description: "This would open a document upload form"
          })}>
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
          
          <Button variant="outline" onClick={() => toast({
            title: "Create Document",
            description: "This would open a document creation form"
          })}>
            <Plus className="h-4 w-4 mr-2" /> New
          </Button>
          
          <Button variant="secondary" onClick={navigateToDocumentManagement}>
            <Settings className="h-4 w-4 mr-2" /> Manage Docs
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
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mb-4"></div>
                <p className="text-muted-foreground">Loading documents...</p>
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
                          <FileIcon fileType={document.fileType} />
                        </div>
                        <div>
                          <h3 className="text-md font-medium">{document.title}</h3>
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span>
                              Updated {formatTimeAgo(document.updatedAt)}
                              {document.updatedByUser && ` by ${document.updatedByUser.fullName}`}
                            </span>
                          </div>
                          {document.content && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {document.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="border-t px-4 py-2 bg-muted/30 flex justify-between">
                      <div>
                        <Button variant="ghost" size="sm" onClick={() => toast({ 
                          title: "Share Document", 
                          description: `Share ${document.title} with team members`
                        })}>
                          <Share className="h-4 w-4 mr-2" /> Share
                        </Button>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => toast({ 
                          title: "Download Document", 
                          description: `Download ${document.title}`
                        })}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toast({ 
                          title: "More Options", 
                          description: `Options for ${document.title}`
                        })}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredDocuments?.length === 0 && (
                <div className="col-span-full flex justify-center items-center h-64">
                  <div className="text-center">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No documents found</h3>
                    <p className="text-muted-foreground mt-1">Try adjusting your search or upload a new document</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="recent" className="mt-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Recent Documents</h3>
              <p className="text-muted-foreground mt-1">This tab would show recently accessed documents</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="shared" className="mt-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Share className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Shared with me</h3>
              <p className="text-muted-foreground mt-1">This tab would show documents shared with you</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="favorites" className="mt-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Favorites</h3>
              <p className="text-muted-foreground mt-1">This tab would show your favorite documents</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for file type icons
function FileIcon({ fileType }: { fileType: string }) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return <div className="text-red-600">PDF</div>;
    case 'excel':
    case 'spreadsheet':
      return <div className="text-green-600">XLS</div>;
    case 'word':
    case 'doc':
      return <div className="text-blue-600">DOC</div>;
    case 'ppt':
    case 'presentation':
      return <div className="text-orange-600">PPT</div>;
    default:
      return <div className="text-blue-600">TXT</div>;
  }
}
