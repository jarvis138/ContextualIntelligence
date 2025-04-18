import React from 'react';
import { Link } from 'wouter';
import { MoreHorizontal, Star, Share, MessageSquare, FileText, Image, FileSpreadsheet, FileCode, PenTool, File } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type DocumentType = 
  | 'text' 
  | 'spreadsheet' 
  | 'image' 
  | 'code' 
  | 'design'
  | 'other';

export interface Author {
  id: string | number;
  name: string;
  avatar?: string;
}

export interface DocumentCardProps {
  id: string | number;
  title: string;
  description?: string;
  documentType: DocumentType;
  updatedAt: Date | string;
  createdAt?: Date | string;
  author: Author;
  commentCount?: number;
  tags?: string[];
  favorited?: boolean;
  size?: string;
  thumbnail?: string;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

/**
 * Returns the appropriate icon based on document type
 */
const getDocumentIcon = (documentType: DocumentType) => {
  switch (documentType) {
    case 'text':
      return <FileText className="h-5 w-5 text-blue-500" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    case 'image':
      return <Image className="h-5 w-5 text-purple-500" />;
    case 'code':
      return <FileCode className="h-5 w-5 text-orange-500" />;
    case 'design':
      return <PenTool className="h-5 w-5 text-pink-500" />;
    default:
      return <File className="h-5 w-5 text-gray-500" />;
  }
};

/**
 * Document Card Component
 * 
 * Displays document information according to the UI/UX PRD specifications
 */
export function DocumentCard({
  id,
  title,
  description,
  documentType,
  updatedAt,
  createdAt,
  author,
  commentCount = 0,
  tags = [],
  favorited = false,
  size,
  thumbnail,
  variant = 'default',
  className,
}: DocumentCardProps) {
  // Format the date consistently
  const formattedDate = typeof updatedAt === 'string' 
    ? updatedAt 
    : formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

  // Handle favorite toggle
  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // This would connect to state management in a real implementation
    console.log('Toggle favorite for document', id);
  };

  // Handle share click
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Share document', id);
  };

  // Render compact view (for list layouts)
  if (variant === 'compact') {
    return (
      <Link href={`/documents/${id}`}>
        <Card className={cn("flex items-center p-3 cursor-pointer hover:shadow-md transition-shadow", className)}>
          <div className="p-2 rounded-md bg-primary/10 mr-3">
            {getDocumentIcon(documentType)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{title}</h4>
            <div className="flex items-center mt-1">
              <span className="text-xs text-muted-foreground">Updated {formattedDate}</span>
              {size && (
                <>
                  <span className="text-xs text-muted-foreground mx-1">•</span>
                  <span className="text-xs text-muted-foreground">{size}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center ml-2">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </Link>
    );
  }

  // Render detailed view (with preview)
  if (variant === 'detailed') {
    return (
      <Link href={`/documents/${id}`}>
        <Card className={cn("overflow-hidden cursor-pointer hover:shadow-md transition-shadow", className)}>
          {thumbnail && (
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img 
                src={thumbnail} 
                alt={`Preview of ${title}`} 
                className="h-full w-full object-cover" 
              />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  {getDocumentIcon(documentType)}
                </div>
                <div>
                  <h3 className="font-medium">{title}</h3>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8", favorited ? "text-amber-500" : "text-muted-foreground")}
                onClick={handleFavoriteToggle}
              >
                <Star className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="flex items-center">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={author.avatar} alt={author.name} />
                  <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{author.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleShare}>
                  <Share className="h-4 w-4 mr-1" />
                  <span className="text-xs">Share</span>
                </Button>
                {commentCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="text-xs">{commentCount}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Default view (standard grid view)
  return (
    <Link href={`/documents/${id}`}>
      <Card className={cn("overflow-hidden cursor-pointer hover:shadow-md transition-shadow", className)}>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-md bg-primary/10">
                {getDocumentIcon(documentType)}
              </div>
              <div>
                <h3 className="font-medium">{title}</h3>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground">Updated {formattedDate}</span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  console.log('Open document', id);
                }}>
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  console.log('Download document', id);
                }}>
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleShare(e);
                }}>
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  console.log('Delete document', id);
                }} className="text-red-600">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={author.avatar} alt={author.name} />
                <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{author.name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFavoriteToggle}>
                <Star 
                  className={cn("h-4 w-4", favorited ? "text-amber-500" : "text-muted-foreground")} 
                  fill={favorited ? "currentColor" : "none"} 
                />
              </Button>
              {commentCount > 0 && (
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">{commentCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default DocumentCard;