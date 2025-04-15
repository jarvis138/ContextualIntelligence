import React, { useState } from 'react';
import { GraphFilter } from '@/lib/types/graphTypes';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calendar,
  CalendarIcon,
  Check,
  Filter,
  RefreshCw,
  Sliders
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

// Node type options
const nodeTypeOptions = [
  { value: 'project', label: 'Projects' },
  { value: 'document', label: 'Documents' },
  { value: 'task', label: 'Tasks' },
  { value: 'person', label: 'People' },
  { value: 'team', label: 'Teams' },
  { value: 'insight', label: 'Insights' },
  { value: 'email', label: 'Emails' },
  { value: 'comment', label: 'Comments' },
];

// Link type options
const linkTypeOptions = [
  { value: 'created', label: 'Created' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'commented', label: 'Commented' },
  { value: 'modified', label: 'Modified' },
  { value: 'referenced', label: 'Referenced' },
  { value: 'belongs_to', label: 'Belongs To' },
  { value: 'contains', label: 'Contains' },
  { value: 'part_of', label: 'Part Of' },
];

interface GraphControlsProps {
  filter: GraphFilter;
  onFilterChange: (filter: GraphFilter) => void;
  onTimeDecayToggle: (enabled: boolean) => void;
  onDecayFactorChange: (factor: number) => void;
  onResetLayout: () => void;
  isTimeDecayEnabled: boolean;
  decayFactor: number;
}

export default function GraphControls({
  filter,
  onFilterChange,
  onTimeDecayToggle,
  onDecayFactorChange,
  onResetLayout,
  isTimeDecayEnabled,
  decayFactor,
}: GraphControlsProps) {
  const [searchTerm, setSearchTerm] = useState(filter.searchTerm || '');
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>(filter.nodeTypes || []);
  const [selectedLinkTypes, setSelectedLinkTypes] = useState<string[]>(filter.linkTypes || []);
  const [startDate, setStartDate] = useState<Date | undefined>(filter.timeRange?.start);
  const [endDate, setEndDate] = useState<Date | undefined>(filter.timeRange?.end);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleNodeTypeToggle = (type: string) => {
    const newTypes = selectedNodeTypes.includes(type)
      ? selectedNodeTypes.filter(t => t !== type)
      : [...selectedNodeTypes, type];
    
    setSelectedNodeTypes(newTypes);
  };

  const handleLinkTypeToggle = (type: string) => {
    const newTypes = selectedLinkTypes.includes(type)
      ? selectedLinkTypes.filter(t => t !== type)
      : [...selectedLinkTypes, type];
    
    setSelectedLinkTypes(newTypes);
  };

  const applyFilters = () => {
    const newFilter: GraphFilter = {
      ...filter,
      searchTerm,
      nodeTypes: selectedNodeTypes.length > 0 ? selectedNodeTypes : undefined,
      linkTypes: selectedLinkTypes.length > 0 ? selectedLinkTypes : undefined,
      timeRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
    };

    onFilterChange(newFilter);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedNodeTypes([]);
    setSelectedLinkTypes([]);
    setStartDate(undefined);
    setEndDate(undefined);
    
    onFilterChange({});
  };

  return (
    <div className="bg-card border rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-medium mb-4">Graph Controls</h3>
      
      <div className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Nodes</Label>
          <div className="flex space-x-2">
            <Input
              id="search"
              placeholder="Search by name or content..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <Button onClick={applyFilters} variant="secondary" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {/* Node Type Filters */}
          <AccordionItem value="node-types">
            <AccordionTrigger>Node Types</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {nodeTypeOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`node-${option.value}`}
                      checked={selectedNodeTypes.includes(option.value)}
                      onChange={() => handleNodeTypeToggle(option.value)}
                      className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                    />
                    <Label htmlFor={`node-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Link Type Filters */}
          <AccordionItem value="link-types">
            <AccordionTrigger>Relationship Types</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {linkTypeOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`link-${option.value}`}
                      checked={selectedLinkTypes.includes(option.value)}
                      onChange={() => handleLinkTypeToggle(option.value)}
                      className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                    />
                    <Label htmlFor={`link-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Time Range Filter */}
          <AccordionItem value="time-range">
            <AccordionTrigger>Time Range</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Graph Visualization Settings */}
          <AccordionItem value="visualization">
            <AccordionTrigger>Visualization Settings</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="time-decay"
                    checked={isTimeDecayEnabled}
                    onCheckedChange={onTimeDecayToggle}
                  />
                  <Label htmlFor="time-decay">Enable Time Decay</Label>
                </div>
                
                {isTimeDecayEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="decay-factor">Decay Factor: {decayFactor.toFixed(2)}</Label>
                    </div>
                    <Slider
                      id="decay-factor"
                      min={0.01}
                      max={1}
                      step={0.01}
                      value={[decayFactor]}
                      onValueChange={(values) => onDecayFactorChange(values[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values cause faster decay of older relationships
                    </p>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={onResetLayout}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Layout
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <div className="flex space-x-2">
          <Button onClick={applyFilters} className="flex-1">
            Apply Filters
          </Button>
          <Button onClick={resetFilters} variant="outline">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}