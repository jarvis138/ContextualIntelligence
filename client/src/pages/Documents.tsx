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
import { 
  Search, Upload, Plus, Settings, Share, Download, 
  MoreHorizontal, Clock, Star, Grid, List, LayoutGrid, 
  FileText, FolderIcon
} from 'lucide-react';
import DocumentGrid from '@/components/documents/DocumentGrid';
import Breadcrumb from '@/components/navigation/Breadcrumb';

export default function Documents() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('grid');
  
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
      <Breadcrumb 
        items={[
          {
            label: 'Documents',
            icon: <FolderIcon className="h-4 w-4 mr-1" />
          }
        ]}
        className="mb-4"
      />
      
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">All Documents</h3>
            {/* View mode toggles */}
            <div className="flex items-center space-x-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button 
                variant={viewMode === 'detailed' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setViewMode('detailed')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Details</span>
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mb-4"></div>
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            </div>
          ) : (
            <DocumentGrid 
              documents={filteredDocuments?.map(document => ({
                id: document.id,
                title: document.title,
                description: document.content,
                documentType: document.fileType || 'text',
                updatedAt: document.updatedAt,
                createdAt: document.createdAt || document.updatedAt,
                author: { name: document.updatedByUser?.fullName || 'Unknown', id: document.updatedByUser?.id || '1' },
                commentCount: document.commentCount || 0,
                tags: document.tags || [],
                favorited: document.favorited || false,
                size: document.size || '0KB'
              })) || []}
              initialViewMode={viewMode}
              emptyState={
                <div className="text-center p-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-1">No documents found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your search or upload a new document
                  </p>
                  <Button onClick={() => toast({ 
                    title: "Upload Document", 
                    description: "This would open a document upload form"
                  })}>
                    <Upload className="h-4 w-4 mr-2" /> Upload Document
                  </Button>
                </div>
              }
            />
          )}
        </TabsContent>
        
        <TabsContent value="recent" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Recent Documents</h3>
            {/* View mode toggles */}
            <div className="flex items-center space-x-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button 
                variant={viewMode === 'detailed' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setViewMode('detailed')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Details</span>
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mb-4"></div>
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            </div>
          ) : (
            <DocumentGrid 
              documents={(filteredDocuments || [])
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 12)
                .map(document => ({
                  id: document.id,
                  title: document.title,
                  description: document.content,
                  documentType: document.fileType || 'text',
                  updatedAt: document.updatedAt,
                  createdAt: document.createdAt || document.updatedAt,
                  author: { name: document.updatedByUser?.fullName || 'Unknown', id: document.updatedByUser?.id || '1' },
                  commentCount: document.commentCount || 0,
                  tags: document.tags || [],
                  favorited: document.favorited || false,
                  size: document.size || '0KB'
                }))}
              initialViewMode={viewMode}
              emptyState={
                <div className="text-center p-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-1">No recent documents</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your recently accessed documents will appear here
                  </p>
                </div>
              }
            />
          )}
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
