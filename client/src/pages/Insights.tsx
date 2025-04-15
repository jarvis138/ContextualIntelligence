import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Filter, Calendar, ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Insights() {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  
  // Mock data for insights
  const projectInsights = [
    {
      id: 1,
      title: 'Deadline risk detection',
      description: 'Project "Website Redesign" has a high risk of missing the deadline based on current progress.',
      date: '2025-04-15',
      type: 'risk',
      project: 'Website Redesign'
    },
    {
      id: 2,
      title: 'Resource optimization',
      description: 'Team "Design" has 40% capacity available next week. Consider allocating to high-priority tasks.',
      date: '2025-04-14',
      type: 'optimization',
      project: 'Mobile App Development'
    },
    {
      id: 3,
      title: 'Document similarity detected',
      description: 'New document "Marketing Strategy" has 75% similarity with existing document "Brand Guidelines".',
      date: '2025-04-13',
      type: 'content',
      project: 'Marketing Campaign'
    },
    {
      id: 4,
      title: 'Communication gap detected',
      description: 'Development team has not received feedback from stakeholders in 14 days.',
      date: '2025-04-12',
      type: 'collaboration',
      project: 'ERP Implementation'
    },
    {
      id: 5,
      title: 'Topic trend identified',
      description: 'Increasing discussion around "user authentication" in recent communications.',
      date: '2025-04-11',
      type: 'trend',
      project: 'Website Redesign'
    },
  ];

  // Filter insights based on selected project
  const filteredInsights = selectedProject === 'all' 
    ? projectInsights
    : projectInsights.filter(insight => insight.project === selectedProject);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground">
            AI-powered intelligence across your projects and teams
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 days
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="Website Redesign">Website Redesign</SelectItem>
              <SelectItem value="Mobile App Development">Mobile App Development</SelectItem>
              <SelectItem value="Marketing Campaign">Marketing Campaign</SelectItem>
              <SelectItem value="ERP Implementation">ERP Implementation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Insights</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {filteredInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          {filteredInsights.filter(i => i.type === 'risk').map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          {filteredInsights.filter(i => i.type === 'optimization').map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          {filteredInsights.filter(i => i.type === 'content').map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-4">
          {filteredInsights.filter(i => i.type === 'collaboration').map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {filteredInsights.filter(i => i.type === 'trend').map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface InsightProps {
  insight: {
    id: number;
    title: string;
    description: string;
    date: string;
    type: string;
    project: string;
  };
}

function InsightCard({ insight }: InsightProps) {
  const [expanded, setExpanded] = useState(false);

  // Define insight colors based on type
  const getInsightColorClass = (type: string) => {
    switch (type) {
      case 'risk':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'optimization':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'content':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'collaboration':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'trend':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-full ${getInsightColorClass(insight.type)}`}>
              <Lightbulb className="h-4 w-4" />
            </div>
            <CardTitle className="text-xl">{insight.title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-0 h-8 w-8"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span>Project: {insight.project}</span>
          <span>•</span>
          <span>{new Date(insight.date).toLocaleDateString()}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>{insight.description}</p>
        {expanded && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-muted p-4">
              <h4 className="mb-2 font-medium">Related Context</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>3 recent team discussions mentioned this topic</li>
                <li>Similar pattern observed in previous project phase</li>
                <li>AI confidence score: 89%</li>
              </ul>
            </div>
            <div className="rounded-md p-4 border">
              <h4 className="mb-2 font-medium">Recommended Actions</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                  <span>Schedule a review meeting with the project team</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                  <span>Update the project timeline to account for current progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 flex-shrink-0" />
                  <span>Reassign resources to critical path tasks</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-1">
        <div className="flex justify-between items-center w-full">
          <Button variant="ghost" size="sm" onClick={() => console.log('Marked as read')}>
            Mark as read
          </Button>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Take action
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => console.log('Create task')}>
                  Create task
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => console.log('Share with team')}>
                  Share with team
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => console.log('Generate report')}>
                  Generate report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => console.log('Download')}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}