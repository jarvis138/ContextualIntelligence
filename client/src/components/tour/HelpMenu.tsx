import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { HelpCircle } from 'lucide-react';
import { useTourContext } from '@/contexts/TourContext';

export function HelpMenu() {
  const { startTour } = useTourContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => startTour('welcome')}>
          Platform Tour
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => startTour('connectors')}>
          Connector Guide
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startTour('analytics')}>
          Analytics Guide
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startTour('documents')}>
          Document Management Guide
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="https://example.com/help" target="_blank" rel="noopener noreferrer">
            Help Center
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}