import React, { useState } from 'react';
import { Grid, List, Grid3X3, LayoutGrid } from 'lucide-react';

import { DocumentCard, DocumentCardProps } from './DocumentCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list' | 'detailed';

interface DocumentGridProps {
  documents: Omit<DocumentCardProps, 'variant'>[];
  className?: string;
  emptyState?: React.ReactNode;
  initialViewMode?: ViewMode;
}

/**
 * Document Grid Component
 * 
 * Displays a collection of document cards with different view modes.
 * Follows the UI/UX PRD specifications.
 */
export function DocumentGrid({ 
  documents, 
  className,
  emptyState,
  initialViewMode = 'grid'
}: DocumentGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        {emptyState || (
          <>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Grid3X3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-1">No documents found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              There are no documents to display. Try creating a new document or adjusting your filters.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="bg-muted p-1 rounded-md flex">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2",
              viewMode === 'grid' && "bg-background shadow-sm"
            )}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4 mr-1" />
            <span className="text-xs">Grid</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2",
              viewMode === 'detailed' && "bg-background shadow-sm"
            )}
            onClick={() => setViewMode('detailed')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            <span className="text-xs">Cards</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2",
              viewMode === 'list' && "bg-background shadow-sm"
            )}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-1" />
            <span className="text-xs">List</span>
          </Button>
        </div>
      </div>

      {/* Document Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <DocumentCard 
              key={doc.id}
              {...doc}
              variant="default"
            />
          ))}
        </div>
      )}

      {/* Document Cards */}
      {viewMode === 'detailed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <DocumentCard 
              key={doc.id}
              {...doc}
              variant="detailed"
            />
          ))}
        </div>
      )}

      {/* Document List */}
      {viewMode === 'list' && (
        <div className="flex flex-col space-y-2">
          {documents.map((doc) => (
            <DocumentCard 
              key={doc.id}
              {...doc}
              variant="compact"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentGrid;