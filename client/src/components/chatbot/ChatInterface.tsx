import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Minimize2, 
  Maximize2, 
  X, 
  AlertCircle, 
  Calendar, 
  FileText, 
  Users, 
  CheckCircle,
  Clock,
  BrainCircuit,
  Zap,
  Plug,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useProjectAssistant } from '@/contexts/ProjectAssistantContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'alert' | 'task' | 'blocker';
  metadata?: {
    priority?: 'low' | 'medium' | 'high';
    dueDate?: Date;
    related?: string;
    status?: string;
  };
}

export function ChatInterface() {
  const { 
    activeProject, 
    currentUserContext, 
    integrations,
    isAssistantOpen,
    toggleAssistant,
    getBlockers,
    getNextSteps,
    getProjectStatus
  } = useProjectAssistant();

  const [activeTab, setActiveTab] = useState('project');
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! I'm your Project Intelligence Assistant. I can help you manage your projects, detect blockers, and suggest next steps.${currentUserContext ? ` I see you're currently ${currentUserContext.action} ${currentUserContext.document} in ${currentUserContext.tool}.` : ''} How can I assist you today?`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens or un-minimizes
  useEffect(() => {
    if (isAssistantOpen && !isMinimized && inputRef.current && activeTab === 'chat') {
      inputRef.current.focus();
    }
  }, [isAssistantOpen, isMinimized, activeTab]);

  // Initialize with context-specific message if context changes
  useEffect(() => {
    if (currentUserContext) {
      const contextMessage: Message = {
        id: Date.now().toString(),
        text: `I noticed you're ${currentUserContext.action} ${currentUserContext.document} in ${currentUserContext.tool}. Would you like me to provide any project context or related information?`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'suggestion'
      };
      
      setMessages(prev => {
        // Only add if the last message isn't already about context
        if (prev.length > 0 && !prev[prev.length - 1].text.includes(currentUserContext.document)) {
          return [...prev, contextMessage];
        }
        return prev;
      });
    }
  }, [currentUserContext]);

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');

    // Simulate bot response after a short delay
    setTimeout(() => {
      processBotResponse(inputText);
    }, 1000);
  };

  const processBotResponse = (userInput: string) => {
    const lowerInput = userInput.toLowerCase();
    
    // Demo responses based on user input
    if (lowerInput.includes('blocker') || lowerInput.includes('stuck') || lowerInput.includes('blocked')) {
      addBlockerResponse();
    } else if (lowerInput.includes('next') || lowerInput.includes('step') || lowerInput.includes('what should i do')) {
      addNextStepsResponse();
    } else if (lowerInput.includes('status') || lowerInput.includes('progress') || lowerInput.includes('how is')) {
      addStatusResponse();
    } else if (lowerInput.includes('risk') || lowerInput.includes('issue') || lowerInput.includes('problem')) {
      addRiskResponse();
    } else if (lowerInput.includes('context') || lowerInput.includes('related') || lowerInput.includes('document')) {
      addContextResponse();
    } else if (lowerInput.includes('team') || lowerInput.includes('who')) {
      addTeamResponse();
    } else if (lowerInput.includes('integr') || lowerInput.includes('connect') || lowerInput.includes('platform')) {
      addIntegrationsResponse();
    } else {
      addGenericResponse();
    }
  };

  const addBlockerResponse = () => {
    const blockers = getBlockers();
    
    if (!blockers.length) {
      const noBlockersResponse: Message = {
        id: Date.now().toString(),
        text: 'Great news! I don\'t detect any blockers in your current project. Everything seems to be moving forward as expected.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, noBlockersResponse]);
      return;
    }
    
    const introResponse: Message = {
      id: Date.now().toString(),
      text: `I've detected ${blockers.length} potential blocker${blockers.length > 1 ? 's' : ''} in your project:`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, introResponse]);
    
    // Add each blocker as a separate message
    blockers.forEach((blocker, index) => {
      setTimeout(() => {
        const blockerResponse: Message = {
          id: Date.now().toString() + index,
          text: blocker.description,
          sender: 'bot',
          timestamp: new Date(),
          type: 'blocker',
          metadata: {
            priority: blocker.severity,
            status: blocker.status === 'identified' ? 'At Risk' : blocker.status === 'in-progress' ? 'Being Addressed' : 'Resolved'
          }
        };
        
        setMessages(prev => [...prev, blockerResponse]);
        
        // Add suggestion after the last blocker
        if (index === blockers.length - 1) {
          setTimeout(() => {
            const suggestionResponse: Message = {
              id: Date.now().toString() + 'suggestion',
              text: 'Would you like me to help resolve these blockers? I can schedule meetings, send reminders, or suggest alternative approaches.',
              sender: 'bot',
              timestamp: new Date(),
              type: 'suggestion'
            };
            setMessages(prev => [...prev, suggestionResponse]);
          }, 500);
        }
      }, index * 500); // Stagger the messages for better UX
    });
  };

  const addNextStepsResponse = () => {
    const nextSteps = getNextSteps();
    
    if (!nextSteps.length) {
      const noTasksResponse: Message = {
        id: Date.now().toString(),
        text: 'There are no pending tasks in your current project. This might be a good time to plan the next phase or review completed work.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, noTasksResponse]);
      return;
    }
    
    const nextStepsResponse: Message = {
      id: Date.now().toString(),
      text: `Based on your current project phase (${activeProject?.phase || 'Current Phase'}), here are the ${Math.min(3, nextSteps.length)} highest priority next steps:`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, nextStepsResponse]);
    
    // Add top 3 tasks as separate messages
    nextSteps.slice(0, 3).forEach((task, index) => {
      setTimeout(() => {
        const taskResponse: Message = {
          id: Date.now().toString() + index,
          text: task.title,
          sender: 'bot',
          timestamp: new Date(),
          type: 'task',
          metadata: {
            priority: task.priority,
            dueDate: task.dueDate,
            status: task.status === 'not-started' 
              ? 'Not Started' 
              : task.status === 'in-progress' 
                ? 'In Progress' 
                : task.status === 'blocked'
                  ? 'Blocked'
                  : 'Completed'
          }
        };
        
        setMessages(prev => [...prev, taskResponse]);
      }, index * 500); // Stagger the messages for better UX
    });
  };

  const addStatusResponse = () => {
    if (!activeProject) {
      const noProjectResponse: Message = {
        id: Date.now().toString(),
        text: 'I don\'t have any active project data to analyze. Please select a project or connect your project management tool to get status updates.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, noProjectResponse]);
      return;
    }
    
    const projectStatus = getProjectStatus();
    
    const statusResponse: Message = {
      id: Date.now().toString(),
      text: `${activeProject.name} is currently in the ${projectStatus.phase} phase (${activeProject.progress}% complete). Overall project completion is at ${activeProject.progress}% with ${projectStatus.daysRemaining} days remaining until the next milestone.`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };

    let alertResponse: Message | null = null;
    
    if (!projectStatus.isOnSchedule) {
      alertResponse = {
        id: (Date.now() + 1).toString(),
        text: `The project is currently ${activeProject.blockers.length > 0 ? `blocked by ${activeProject.blockers.length} issue${activeProject.blockers.length > 1 ? 's' : ''}` : 'behind schedule'}, primarily due to ${activeProject.blockers[0]?.description || 'delays in the current phase'}.`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'alert',
        metadata: {
          priority: 'medium',
          related: 'Timeline',
          status: 'Behind Schedule'
        }
      };
    }

    setMessages(prev => [...prev, statusResponse]);
    
    if (alertResponse) {
      setTimeout(() => {
        setMessages(prev => [...prev, alertResponse!]);
      }, 500);
    }
  };

  const addRiskResponse = () => {
    if (!activeProject) {
      const noProjectResponse: Message = {
        id: Date.now().toString(),
        text: 'I don\'t have any active project data to analyze risks. Please select a project or connect your project management tool.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, noProjectResponse]);
      return;
    }
    
    const blockers = getBlockers();
    const nextSteps = getNextSteps();
    const projectStatus = getProjectStatus();
    
    // Calculate risks based on project data
    const risks = [
      ...(blockers.length > 0 ? [{
        description: `You have ${blockers.length} active blocker${blockers.length > 1 ? 's' : ''} that could impact project delivery`,
        priority: 'high' as const,
        related: 'Blockers',
        status: 'At Risk'
      }] : []),
      
      ...(!projectStatus.isOnSchedule ? [{
        description: 'Project is falling behind schedule based on expected progress',
        priority: 'medium' as const,
        related: 'Timeline',
        status: 'Behind Schedule'
      }] : []),
      
      ...(nextSteps.filter(t => t.status === 'blocked').length > 0 ? [{
        description: `${nextSteps.filter(t => t.status === 'blocked').length} critical tasks are currently blocked`,
        priority: 'high' as const,
        related: 'Tasks',
        status: 'At Risk'
      }] : []),
      
      ...(nextSteps.filter(t => new Date(t.dueDate) < new Date()).length > 0 ? [{
        description: `${nextSteps.filter(t => new Date(t.dueDate) < new Date()).length} tasks are past their due date`,
        priority: 'medium' as const,
        related: 'Deadlines',
        status: 'Overdue'
      }] : [])
    ];
    
    if (risks.length === 0) {
      const noRisksResponse: Message = {
        id: Date.now().toString(),
        text: 'Good news! I haven\'t identified any significant risks in your current project. Everything appears to be on track.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, noRisksResponse]);
      return;
    }
    
    const riskResponse: Message = {
      id: Date.now().toString(),
      text: `I've identified ${risks.length} potential risk${risks.length > 1 ? 's' : ''} in your current project:`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, riskResponse]);
    
    // Add each risk as a separate message
    risks.forEach((risk, index) => {
      setTimeout(() => {
        const riskAlert: Message = {
          id: (Date.now() + index).toString(),
          text: risk.description,
          sender: 'bot',
          timestamp: new Date(),
          type: 'alert',
          metadata: {
            priority: risk.priority,
            related: risk.related,
            status: risk.status
          }
        };
        
        setMessages(prev => [...prev, riskAlert]);
        
        // Add suggestion after the last risk
        if (index === risks.length - 1) {
          setTimeout(() => {
            const mitigationResponse: Message = {
              id: (Date.now() + 100).toString(),
              text: 'Would you like me to suggest mitigation strategies for these risks?',
              sender: 'bot',
              timestamp: new Date(),
              type: 'suggestion'
            };
            setMessages(prev => [...prev, mitigationResponse]);
          }, 500);
        }
      }, index * 500); // Stagger the messages for better UX
    });
  };

  const addContextResponse = () => {
    if (!currentUserContext) {
      const noContextResponse: Message = {
        id: Date.now().toString(),
        text: 'I don\'t have any context about what you\'re currently working on. Could you specify which document or task you\'re referring to?',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, noContextResponse]);
      return;
    }
    
    const contextResponse: Message = {
      id: Date.now().toString(),
      text: `You're currently ${currentUserContext.action} ${currentUserContext.document} in ${currentUserContext.tool}. Here's some relevant project context:`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, contextResponse]);
    
    // Simulate finding related information
    setTimeout(() => {
      const relatedBlockers = getBlockers().filter(b => 
        b.description.toLowerCase().includes(currentUserContext.document.toLowerCase().split('.')[0])
      );
      
      if (relatedBlockers.length > 0) {
        const blockerContext: Message = {
          id: (Date.now() + 1).toString(),
          text: `This document is related to a current blocker: ${relatedBlockers[0].description}`,
          sender: 'bot',
          timestamp: new Date(),
          type: 'blocker',
          metadata: {
            priority: relatedBlockers[0].severity,
            status: 'At Risk'
          }
        };
        
        setMessages(prev => [...prev, blockerContext]);
      } else {
        const documentContext: Message = {
          id: (Date.now() + 1).toString(),
          text: `This document is part of the ${activeProject?.phase || 'current'} phase of ${activeProject?.name || 'your project'}. Would you like me to provide more specific information about how it relates to other project activities?`,
          sender: 'bot',
          timestamp: new Date(),
          type: 'suggestion'
        };
        
        setMessages(prev => [...prev, documentContext]);
      }
    }, 800);
  };

  const addTeamResponse = () => {
    if (!activeProject) {
      const noTeamResponse: Message = {
        id: Date.now().toString(),
        text: 'I don\'t have any active project data with team information. Please select a project to view team details.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, noTeamResponse]);
      return;
    }
    
    const teamResponse: Message = {
      id: Date.now().toString(),
      text: `The team for ${activeProject.name} consists of ${activeProject.team.length} members:`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };

    const teamDetailsResponse: Message = {
      id: (Date.now() + 1).toString(),
      text: activeProject.team.join(', '),
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };

    const teamTasksResponse: Message = {
      id: (Date.now() + 2).toString(),
      text: 'Would you like to see the tasks assigned to specific team members?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'suggestion'
    };

    setMessages(prev => [...prev, teamResponse, teamDetailsResponse, teamTasksResponse]);
  };

  const addIntegrationsResponse = () => {
    const connectedCount = integrations.filter(i => i.isConnected).length;
    
    const integrationsResponse: Message = {
      id: Date.now().toString(),
      text: `You have ${connectedCount} active integration${connectedCount !== 1 ? 's' : ''} out of ${integrations.length} available platforms:`,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, integrationsResponse]);
    
    // Show each integration status
    integrations.forEach((integration, index) => {
      setTimeout(() => {
        const integrationStatus: Message = {
          id: (Date.now() + index).toString(),
          text: `${integration.platform}: ${integration.isConnected ? 'Connected' : 'Not connected'}${integration.lastSync ? ` (Last synced: ${new Date(integration.lastSync).toLocaleString()})` : ''}`,
          sender: 'bot',
          timestamp: new Date(),
          type: integration.isConnected ? 'text' : 'alert',
          metadata: integration.isConnected ? undefined : {
            priority: 'medium',
            status: 'Not Connected'
          }
        };
        
        setMessages(prev => [...prev, integrationStatus]);
        
        // After the last integration, offer to help connect
        if (index === integrations.length - 1 && integrations.some(i => !i.isConnected)) {
          setTimeout(() => {
            const connectSuggestion: Message = {
              id: (Date.now() + 100).toString(),
              text: 'Would you like me to help you connect the remaining platforms?',
              sender: 'bot',
              timestamp: new Date(),
              type: 'suggestion'
            };
            
            setMessages(prev => [...prev, connectSuggestion]);
          }, 500);
        }
      }, index * 300); // Stagger the messages
    });
  };

  const addGenericResponse = () => {
    const genericResponse: Message = {
      id: Date.now().toString(),
      text: 'I understand you need help with your project. To provide specific assistance, try asking me about blockers, next steps, project status, or potential risks. I can also help with scheduling meetings or reminding team members of pending tasks.',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, genericResponse]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const getMessageComponent = (message: Message) => {
    switch (message.type) {
      case 'suggestion':
        return (
          <div className="flex flex-col gap-2">
            <p>{message.text}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {message.text.includes('schedule') && (
                <Button variant="outline" size="sm">Schedule Meeting</Button>
              )}
              {message.text.includes('reminder') && (
                <Button variant="outline" size="sm">Send Reminder</Button>
              )}
              {message.text.includes('mitigation') && (
                <Button variant="outline" size="sm">Show Mitigation Strategies</Button>
              )}
              {message.text.includes('connect') && (
                <Button variant="outline" size="sm">Connect Platforms</Button>
              )}
              {message.text.includes('specific') && (
                <Button variant="outline" size="sm">Show Related Activities</Button>
              )}
              {message.text.includes('team members') && (
                <Button variant="outline" size="sm">View Assigned Tasks</Button>
              )}
              {message.text.includes('resolve') && (
                <Button variant="outline" size="sm">Resolve Blockers</Button>
              )}
              <Button variant="ghost" size="sm">No Thanks</Button>
            </div>
          </div>
        );
      case 'alert':
        return (
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p>{message.text}</p>
              {message.metadata && (
                <div className="flex items-center gap-2 mt-1">
                  {message.metadata.priority && (
                    <Badge variant={
                      message.metadata.priority === 'high' ? 'destructive' : 
                      message.metadata.priority === 'medium' ? 'default' : 'outline'
                    }>
                      {message.metadata.priority} priority
                    </Badge>
                  )}
                  {message.metadata.related && (
                    <Badge variant="outline">
                      {message.metadata.related}
                    </Badge>
                  )}
                  {message.metadata.status && (
                    <Badge variant="secondary">
                      {message.metadata.status}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'blocker':
        return (
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p>{message.text}</p>
              {message.metadata && (
                <div className="flex items-center gap-2 mt-1">
                  {message.metadata.priority && (
                    <Badge variant="destructive">
                      {message.metadata.priority} priority
                    </Badge>
                  )}
                  {message.metadata.status && (
                    <Badge variant="outline" className="text-red-500 border-red-500">
                      {message.metadata.status}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'task':
        return (
          <div className="flex items-start gap-2 border rounded-md p-2">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{message.text}</p>
              {message.metadata && (
                <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                  {message.metadata.priority && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{message.metadata.priority} priority</span>
                    </div>
                  )}
                  {message.metadata.status && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{message.metadata.status}</span>
                    </div>
                  )}
                  {message.metadata.dueDate && (
                    <div className="flex items-center gap-1 col-span-2">
                      <Calendar className="h-3 w-3" />
                      <span>Due {message.metadata.dueDate.toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-2">
                <Button variant="outline" size="sm">Mark Complete</Button>
              </div>
            </div>
          </div>
        );
      default:
        return <p>{message.text}</p>;
    }
  };

  // Project overview tab content
  const renderProjectOverview = () => {
    if (!activeProject) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-2" />
          <h3 className="font-medium mb-1">No Active Project</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select a project or connect your project management tool.
          </p>
          <Button variant="outline">Connect Project</Button>
        </div>
      );
    }

    const projectStatus = getProjectStatus();
    const nextSteps = getNextSteps().slice(0, 3); // Top 3 next steps
    const blockers = getBlockers();

    return (
      <div className="space-y-4 p-2 overflow-y-auto">
        <div>
          <h3 className="font-medium text-lg">{activeProject.name}</h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">
              Phase: {projectStatus.phase}
            </span>
            <Badge variant={projectStatus.isOnSchedule ? "outline" : "destructive"}>
              {projectStatus.isOnSchedule ? "On Schedule" : "Behind Schedule"}
            </Badge>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{activeProject.progress}%</span>
          </div>
          <Progress value={activeProject.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="border rounded-md p-2">
            <div className="text-muted-foreground mb-1">Start Date</div>
            <div>{activeProject.startDate.toLocaleDateString()}</div>
          </div>
          <div className="border rounded-md p-2">
            <div className="text-muted-foreground mb-1">Due Date</div>
            <div>{activeProject.dueDate.toLocaleDateString()}</div>
          </div>
        </div>

        {blockers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
              Active Blockers ({blockers.length})
            </h4>
            <div className="space-y-2">
              {blockers.map(blocker => (
                <div key={blocker.id} className="border rounded-md p-2 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <p>{blocker.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="destructive" className="text-xs">
                        {blocker.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Since {new Date(blocker.created).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <ArrowRight className="h-4 w-4 text-primary mr-1" />
            Next Steps
          </h4>
          <div className="space-y-2">
            {nextSteps.map(task => (
              <div key={task.id} className="border rounded-md p-2 text-sm">
                <p className="font-medium">{task.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant={
                    task.priority === 'high' ? "destructive" : 
                    task.priority === 'medium' ? "default" : "outline"
                  } className="text-xs">
                    {task.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Team Members</h4>
          <div className="flex flex-wrap gap-2">
            {activeProject.team.map((member, index) => (
              <Badge key={index} variant="outline">{member}</Badge>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Integrations tab content 
  const renderIntegrations = () => {
    return (
      <div className="space-y-4 p-2 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Connected Platforms</h3>
          <Button variant="outline" size="sm">
            <Plug className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {integrations.map((integration, index) => (
            <div key={index} className="flex items-center justify-between border rounded-md p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{integration.platform}</p>
                  <p className="text-xs text-muted-foreground">
                    {integration.isConnected 
                      ? `Last synced: ${integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}`
                      : 'Not connected'}
                  </p>
                </div>
              </div>
              <Button variant={integration.isConnected ? "ghost" : "outline"} size="sm">
                {integration.isConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating button to open chatbot */}
      {!isAssistantOpen && (
        <Button
          onClick={toggleAssistant}
          className="fixed bottom-4 right-4 rounded-full h-14 w-14 p-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-primary text-primary-foreground flex items-center justify-center"
          aria-label="Open Project Intelligence Assistant"
        >
          <div className="relative">
            <BrainCircuit className="h-7 w-7" />
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </div>
        </Button>
      )}

      {/* Chatbot interface */}
      {isAssistantOpen && (
        <Card className={cn(
          "fixed right-4 transition-all duration-300 ease-in-out z-50 chatbot-card",
          isMinimized ? "bottom-4 h-14 w-72" : "bottom-4 h-[500px] w-[360px]"
        )}>
          {/* Chat header */}
          <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="relative">
                <BrainCircuit className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary-foreground opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-primary-foreground"></span>
                </span>
              </div>
              <h3 className="font-medium">Project Intelligence Assistant</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary/80"
                onClick={toggleMinimize}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary/80"
                onClick={toggleAssistant}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100%-48px)]">
              <div className="border-b">
                <TabsList className="w-full justify-start rounded-none h-10 bg-transparent p-0">
                  <TabsTrigger 
                    value="chat" 
                    className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Chat
                  </TabsTrigger>
                  <TabsTrigger 
                    value="project" 
                    className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Project
                  </TabsTrigger>
                  <TabsTrigger 
                    value="integrations" 
                    className="rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    Integrations
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0 h-full">
                {/* Chat messages */}
                <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={cn(
                        "flex gap-2 max-w-[90%]",
                        message.sender === 'user' ? "ml-auto" : "mr-auto"
                      )}
                    >
                      {message.sender === 'bot' && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/avatars/01.png" alt="AI Assistant" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "rounded-lg p-3 message-bubble",
                          message.sender === 'user'
                            ? "bg-primary text-primary-foreground message-bubble-user"
                            : "bg-muted message-bubble-bot",
                          message.type === 'alert' && "border-l-4 border-destructive",
                          message.type === 'suggestion' && "border-l-4 border-primary/70",
                          message.type === 'task' && "border-l-4 border-yellow-500"
                        )}
                      >
                        {getMessageComponent(message)}
                        <div className="text-xs mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {message.sender === 'user' && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder-user.jpg" alt="User" />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Ask about your project..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Quick action buttons */}
                  <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setInputText("What are the current blockers?");
                      handleSendMessage();
                    }}>
                      Blockers
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setInputText("What's the next step?");
                      handleSendMessage();
                    }}>
                      Next Steps
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setInputText("What's the project status?");
                      handleSendMessage();
                    }}>
                      Status
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setInputText("Any project risks?");
                      handleSendMessage();
                    }}>
                      Risks
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="project" className="p-0 m-0 flex-1 overflow-hidden">
                {renderProjectOverview()}
              </TabsContent>
              
              <TabsContent value="integrations" className="p-0 m-0 flex-1 overflow-hidden">
                {renderIntegrations()}
              </TabsContent>
            </Tabs>
          )}
        </Card>
      )}
    </>
  );
}