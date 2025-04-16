import React from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  BookOpen, 
  LifeBuoy, 
  Lightbulb, 
  PlayCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { useTourContext } from '@/contexts/TourContext';

/**
 * HelpMenu - Provides access to help resources including guided tours
 */
export function HelpMenu() {
  const { startTour } = useTourContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-tour="help-menu">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Help & Resources</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1.5 mb-1">
            Tours
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => startTour('welcome')}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Getting Started</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => startTour('connectors')}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Integrations Guide</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => startTour('analytics')}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Analytics Features</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => startTour('documents')}>
            <PlayCircle className="mr-2 h-4 w-4" />
            <span>Document Management</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1.5 mb-1">
          Resources
        </DropdownMenuLabel>
        <DropdownMenuItem>
          <BookOpen className="mr-2 h-4 w-4" />
          <span>Documentation</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Lightbulb className="mr-2 h-4 w-4" />
          <span>Tips & Tricks</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Chat Support</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LifeBuoy className="mr-2 h-4 w-4" />
          <span>Contact Support</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}