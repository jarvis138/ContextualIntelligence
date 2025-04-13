import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import Sidebar from '@/components/Sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types for conversations
interface Message {
  id: string;
  content: string;
  sender: {
    id: number;
    name: string;
    avatar: string;
  };
  timestamp: string;
}

interface Conversation {
  id: string;
  name: string;
  participants: {
    id: number;
    name: string;
    avatar: string;
  }[];
  lastMessage: string;
  lastActivity: string;
  unread: number;
}

export default function Conversations() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Mock conversations for the UI
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv1',
      name: 'Web App Redesign',
      participants: [
        {
          id: 1,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        },
        {
          id: 2,
          name: 'Sarah Chen',
          avatar: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        }
      ],
      lastMessage: 'The UI components are almost ready for testing',
      lastActivity: '10 min ago',
      unread: 2
    },
    {
      id: 'conv2',
      name: 'Backend Team',
      participants: [
        {
          id: 1,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        },
        {
          id: 3,
          name: 'Mark Johnson',
          avatar: 'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        }
      ],
      lastMessage: 'We need to fix the API issue before Friday',
      lastActivity: '3 hours ago',
      unread: 0
    }
  ]);
  
  // Mock messages for the active conversation
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    conv1: [
      {
        id: 'm1',
        content: 'Hi team, I just reviewed the latest designs.',
        sender: {
          id: 1,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        },
        timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        id: 'm2',
        content: 'The UI components are almost ready for testing. I just need to finalize the color scheme.',
        sender: {
          id: 2,
          name: 'Sarah Chen',
          avatar: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        },
        timestamp: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
      }
    ],
    conv2: [
      {
        id: 'm1',
        content: 'We need to discuss the API performance issues.',
        sender: {
          id: 1,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        },
        timestamp: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
      },
      {
        id: 'm2',
        content: 'I think we need to optimize the database queries.',
        sender: {
          id: 3,
          name: 'Mark Johnson',
          avatar: 'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        },
        timestamp: new Date(Date.now() - 10800000 + 300000).toISOString() // 5 minutes after previous
      },
      {
        id: 'm3',
        content: 'We need to fix the API issue before Friday',
        sender: {
          id: 1,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        },
        timestamp: new Date(Date.now() - 10800000 + 600000).toISOString() // 10 minutes after first
      }
    ]
  });
  
  // WebSocket for real-time messaging
  const { sendMessage: sendWebSocketMessage, isConnected } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'chat_message' && message.data.conversationId) {
        addMessage(
          message.data.conversationId,
          message.data.message,
          message.data.sender
        );
      }
    }
  });
  
  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => 
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Add a new message to a conversation
  const addMessage = (conversationId: string, content: string, sender: any) => {
    const newMessage: Message = {
      id: `m${Date.now()}`,
      content,
      sender,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage]
    }));
    
    // Update conversation's last message
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { 
              ...conv, 
              lastMessage: content,
              lastActivity: 'just now',
              unread: activeConversation === conversationId ? 0 : conv.unread + 1
            }
          : conv
      )
    );
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!message.trim() || !activeConversation) return;
    
    // Current user (mock)
    const currentUser = {
      id: 1,
      name: 'Alex Morgan',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    };
    
    // Add message locally
    addMessage(activeConversation, message, currentUser);
    
    // Send via WebSocket
    if (isConnected) {
      sendWebSocketMessage('chat_message', {
        conversationId: activeConversation,
        message,
        sender: currentUser
      });
    }
    
    setMessage('');
  };
  
  // Select a conversation
  const selectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    
    // Mark as read
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unread: 0 }
          : conv
      )
    );
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation, messages]);
  
  // Default user
  const user = {
    id: 1,
    username: 'alexmorgan',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Project Manager'
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-hidden bg-gray-50 flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search conversations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-3 top-2.5">
                <i className="ri-search-line text-gray-400"></i>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="recent">
              <div className="px-4 pt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="recent" className="flex-1">Recent</TabsTrigger>
                  <TabsTrigger value="teams" className="flex-1">Teams</TabsTrigger>
                  <TabsTrigger value="direct" className="flex-1">Direct</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="recent" className="mt-2">
                {filteredConversations.map(conversation => (
                  <div 
                    key={conversation.id}
                    className={`p-3 hover:bg-gray-100 cursor-pointer border-l-2 ${
                      activeConversation === conversation.id 
                        ? 'border-primary bg-blue-50 hover:bg-blue-50' 
                        : 'border-transparent'
                    }`}
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{conversation.name}</span>
                          {conversation.unread > 0 && (
                            <span className="ml-2 bg-primary text-white text-xs rounded-full px-2 py-0.5">
                              {conversation.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">{conversation.lastMessage}</p>
                      </div>
                      <span className="text-xs text-gray-400">{conversation.lastActivity}</span>
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="flex -space-x-2">
                        {conversation.participants.slice(0, 3).map(participant => (
                          <Avatar key={participant.id} className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={participant.avatar} alt={participant.name} />
                            <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {conversation.participants.length > 3 && (
                          <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-500">
                            +{conversation.participants.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredConversations.length === 0 && (
                  <div className="p-6 text-center">
                    <div className="ri-chat-3-line text-4xl text-gray-400 mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-700">No conversations found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="teams" className="mt-2 p-6 text-center">
                <div className="ri-team-line text-4xl text-gray-400 mb-4"></div>
                <h3 className="text-lg font-medium text-gray-700">Team Conversations</h3>
                <p className="text-gray-500 mt-1">This tab would show team conversations</p>
              </TabsContent>
              
              <TabsContent value="direct" className="mt-2 p-6 text-center">
                <div className="ri-user-line text-4xl text-gray-400 mb-4"></div>
                <h3 className="text-lg font-medium text-gray-700">Direct Messages</h3>
                <p className="text-gray-500 mt-1">This tab would show direct messages</p>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <Button 
              className="w-full" 
              onClick={() => toast({
                title: "New Conversation",
                description: "This would open a new conversation form"
              })}
            >
              <i className="ri-chat-new-line mr-1"></i> New Conversation
            </Button>
          </div>
        </div>
        
        {/* Conversation Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                <div className="flex items-center">
                  <h2 className="text-lg font-medium text-gray-800">
                    {conversations.find(c => c.id === activeConversation)?.name}
                  </h2>
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {conversations.find(c => c.id === activeConversation)?.participants.length} members
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => toast({
                    title: "Call",
                    description: "This would start a voice call"
                  })}>
                    <i className="ri-phone-line"></i>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({
                    title: "Video",
                    description: "This would start a video call"
                  })}>
                    <i className="ri-video-line"></i>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toast({
                    title: "Info",
                    description: "This would show conversation details"
                  })}>
                    <i className="ri-information-line"></i>
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages[activeConversation]?.map(message => (
                  <div key={message.id} className={`flex ${message.sender.id === 1 ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[70%] ${message.sender.id === 1 ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
                        <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className={`mx-2 ${message.sender.id === 1 ? 'text-right' : ''}`}>
                        <div className={`px-4 py-2 rounded-lg ${
                          message.sender.id === 1 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {message.content}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {message.sender.id !== 1 && <span className="mr-1">{message.sender.name}</span>}
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!message.trim()}>
                    <i className="ri-send-plane-fill mr-1"></i> Send
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle className="text-center">Select a conversation</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="ri-chat-3-line text-5xl text-gray-300 mb-4"></div>
                  <p className="text-gray-600">
                    Choose a conversation from the sidebar or start a new one.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      
      {/* WebSocket connection indicator - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 px-2 py-1 text-xs rounded-md bg-gray-800 text-white opacity-70">
          {isConnected ? 'WebSocket: Connected' : 'WebSocket: Disconnected'}
        </div>
      )}
    </div>
  );
}
