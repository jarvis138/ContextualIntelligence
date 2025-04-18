import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Info,
  Maximize2,
  MessageSquare,
  Minimize2,
  Plus,
  SearchIcon,
  Share2,
  Star,
  Users,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type DocumentFormat = 'text' | 'pdf' | 'image' | 'spreadsheet' | 'code' | 'unknown';

export interface DocumentUser {
  id: string | number;
  name: string;
  avatar?: string;
  role?: string;
}

export interface DocumentViewerProps {
  documentId: string | number;
  title: string;
  content: string;
  format: DocumentFormat;
  author: DocumentUser;
  createdAt: string | Date;
  updatedAt: string | Date;
  version?: string;
  tags?: string[];
  favorited?: boolean;
  currentUsers?: DocumentUser[];
  previewUrl?: string;
  className?: string;
  onToggleSidebar?: () => void;
  onToggleFavorite?: () => void;
  onSearch?: (searchTerm: string) => void;
  onComment?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}

/**
 * Document Viewer Component
 * 
 * Displays a document with controls and metadata according to UI/UX PRD specifications
 */
export function DocumentViewer({
  documentId,
  title,
  content,
  format,
  author,
  createdAt,
  updatedAt,
  version = '1.0',
  tags = [],
  favorited = false,
  currentUsers = [],
  previewUrl,
  className,
  onToggleSidebar,
  onToggleFavorite,
  onSearch,
  onComment,
  onShare,
  onDownload
}: DocumentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');

  // Format for display
  const formattedCreatedAt = typeof createdAt === 'string' ? createdAt : new Date(createdAt).toLocaleDateString();
  const formattedUpdatedAt = typeof updatedAt === 'string' ? updatedAt : new Date(updatedAt).toLocaleDateString();

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchTerm);
  };

  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  // Handle fullscreen toggle
  const handleFullscreenToggle = () => {
    setIsFullscreen(prev => !prev);
    // In a real implementation, this would use the Fullscreen API
    // document.getElementById('document-content')?.requestFullscreen();
  };

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (onToggleFavorite) onToggleFavorite();
  };

  // Render document content based on format
  const renderDocumentContent = () => {
    switch (format) {
      case 'text':
        return (
          <div className="prose max-w-none" style={{ zoom: `${zoomLevel}%` }}>
            {content.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        );
      case 'pdf':
        return previewUrl ? (
          <embed
            src={previewUrl}
            type="application/pdf"
            className="w-full h-full min-h-[500px]"
            style={{ zoom: `${zoomLevel}%` }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">PDF preview not available</p>
          </div>
        );
      case 'image':
        return previewUrl ? (
          <div className="flex justify-center" style={{ zoom: `${zoomLevel}%` }}>
            <img
              src={previewUrl}
              alt={title}
              className="max-w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Image preview not available</p>
          </div>
        );
      default:
        return (
          <div className="prose max-w-none">
            <pre className="bg-muted p-4 rounded-md overflow-auto" style={{ zoom: `${zoomLevel}%` }}>
              {content}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Document Header */}
      <div className="flex justify-between items-center mb-4 p-4 border-b">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="mr-2 md:hidden">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <span>Version {version}</span>
              <span className="mx-1">•</span>
              <span>Last updated: {formattedUpdatedAt}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Viewer Actions */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  className={favorited ? "text-amber-500" : ""}
                >
                  <Star className="h-5 w-5" fill={favorited ? "currentColor" : "none"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{favorited ? "Remove from favorites" : "Add to favorites"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onComment}>
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Comments</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDownload}>
                  <Download className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleFullscreenToggle}>
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Document Toolbar */}
      <div className="flex justify-between items-center mb-4 px-4">
        <div className="flex space-x-2">
          {/* Zoom Controls */}
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 50}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="inline-flex items-center text-sm font-medium border rounded px-2">
            {zoomLevel}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 200}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Search in Document */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-xs w-full hidden md:block">
          <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search in document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </form>

        {/* Current Viewers */}
        <div className="flex items-center">
          <div className="flex -space-x-1 mr-2">
            {currentUsers.slice(0, 3).map((user) => (
              <TooltipProvider key={user.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-7 w-7 border-2 border-background">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{user.name}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {currentUsers.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                      +{currentUsers.length - 3}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {currentUsers.slice(3).map(u => u.name).join(', ')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-7">
            <Plus className="h-3 w-3 mr-1" />
            <span className="text-xs">Invite</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Content */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30 rounded-md" id="document-content">
          <Card className={cn("mx-auto bg-background shadow-sm", isFullscreen ? "max-w-none" : "max-w-4xl")}>
            <CardContent className="p-8">
              {renderDocumentContent()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Footer */}
      <div className="flex justify-between items-center mt-4 pt-4 px-4 border-t text-sm text-muted-foreground">
        <div className="flex items-center">
          <Avatar className="h-5 w-5 mr-2">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span>Created by {author.name} on {formattedCreatedAt}</span>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="h-7 mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="text-xs">Previous</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7">
            <span className="text-xs">Next</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Document Viewer With Sidebar
 * 
 * Extends the basic viewer with a sidebar for metadata, activity, and comments
 */
export function DocumentViewerWithSidebar(props: DocumentViewerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Document Viewer */}
      <div className="flex-1 overflow-auto">
        <DocumentViewer 
          {...props} 
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-80 border-l bg-background overflow-auto">
          <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-4 py-2">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="info" className="text-xs">
                  <Info className="h-4 w-4 mr-1" /> Info
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs">
                  <MessageSquare className="h-4 w-4 mr-1" /> Comments
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  <Users className="h-4 w-4 mr-1" /> Activity
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="info" className="p-4">
              <h3 className="font-medium mb-2">Document Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Title</div>
                  <div>{props.title}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Version</div>
                  <div>{props.version}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="flex items-center">
                    <Avatar className="h-4 w-4 mr-1">
                      <AvatarImage src={props.author.avatar} alt={props.author.name} />
                      <AvatarFallback>{props.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>
                      {typeof props.createdAt === 'string' 
                        ? props.createdAt 
                        : new Date(props.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last Modified</div>
                  <div>
                    {typeof props.updatedAt === 'string' 
                      ? props.updatedAt 
                      : new Date(props.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Format</div>
                  <div className="capitalize">{props.format}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tags</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {props.tags && props.tags.length > 0 ? (
                      props.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="comments" className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Comments</h3>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-4">
                <div className="text-center text-muted-foreground p-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet</p>
                  <p className="text-xs mt-1">Be the first to start the conversation</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="activity" className="p-4">
              <h3 className="font-medium mb-4">Activity</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={props.author.avatar} alt={props.author.name} />
                      <AvatarFallback>{props.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <div className="flex items-baseline">
                      <span className="font-medium">{props.author.name}</span>
                      <span className="text-muted-foreground text-xs ml-2">Created this document</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {typeof props.createdAt === 'string' 
                        ? props.createdAt 
                        : new Date(props.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export default DocumentViewerWithSidebar;