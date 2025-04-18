import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeams, getTeamMembers } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Breadcrumb from '@/components/navigation/Breadcrumb';
import { Users } from 'lucide-react';

export default function Team() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('teams');
  
  const { data: teams, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['/api/teams'],
    queryFn: getTeams
  });
  
  // Filter teams based on search query
  const filteredTeams = teams?.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (team.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );
  
  // Default user
  const user = {
    id: 1,
    username: 'alexmorgan',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Project Manager'
  };
  
  // Mock team members for demonstration
  const demoTeamMembers = [
    {
      id: 1,
      fullName: 'Alex Morgan',
      role: 'Project Manager',
      email: 'alex.morgan@example.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    {
      id: 2,
      fullName: 'Sarah Chen',
      role: 'Frontend Developer',
      email: 'sarah.chen@example.com',
      avatar: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    {
      id: 3,
      fullName: 'Mark Johnson',
      role: 'Backend Developer',
      email: 'mark.johnson@example.com',
      avatar: 'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    {
      id: 4,
      fullName: 'Lisa Wong',
      role: 'Designer',
      email: 'lisa.wong@example.com',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    }
  ];
  
  // Filter team members based on search query
  const filteredTeamMembers = demoTeamMembers.filter(member => 
    member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getTeamIcon = (icon: string | null) => {
    // Default icon if none is provided
    const iconClass = icon || 'ri-group-line';
    return iconClass;
  };
  
  const getIconBgColor = (index: number) => {
    const colors = [
      'bg-purple-100 text-purple-600',
      'bg-blue-100 text-blue-600',
      'bg-pink-100 text-pink-600',
      'bg-yellow-100 text-yellow-600',
      'bg-green-100 text-green-600',
      'bg-red-100 text-red-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">
          <Breadcrumb 
            items={[
              {
                label: 'Team',
                icon: <Users className="h-4 w-4 mr-1" />
              }
            ]}
            className="mb-4"
          />
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Team</h1>
            
            <div className="flex space-x-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-2.5">
                  <i className="ri-search-line text-gray-400"></i>
                </div>
              </div>
              
              <Button onClick={() => toast({
                title: "Add Member",
                description: "This would open an add member form"
              })}>
                <i className="ri-user-add-line mr-1"></i> Add Member
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="teams" className="mb-6" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="members">Team Members</TabsTrigger>
            </TabsList>
            
            <TabsContent value="teams" className="mt-6">
              {isTeamsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <div className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></div>
                    <p className="text-gray-500">Loading teams...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeams?.map((team, index) => (
                    <Card key={team.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${getIconBgColor(index)}`}>
                            <i className={getTeamIcon(team.icon)}></i>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">
                              {team.memberCount || 0} members · {team.taskCount || 0} tasks
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm font-medium text-gray-700">{team.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                            <div 
                              className={`${getProgressColor(team.progress)} h-2 rounded-full`} 
                              style={{ width: `${team.progress}%` }}
                            ></div>
                          </div>
                          
                          <div className="flex justify-between mt-4">
                            <Button variant="outline" size="sm" onClick={() => toast({ 
                              title: "Team Details", 
                              description: `View details for ${team.name}`
                            })}>
                              <i className="ri-team-line mr-1"></i> View Team
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toast({ 
                              title: "Team Message", 
                              description: `Send message to ${team.name}`
                            })}>
                              <i className="ri-chat-3-line mr-1"></i> Message
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredTeams?.length === 0 && (
                    <div className="col-span-full flex justify-center items-center h-64">
                      <div className="text-center">
                        <div className="ri-team-line text-4xl text-gray-400 mb-4"></div>
                        <h3 className="text-lg font-medium text-gray-700">No teams found</h3>
                        <p className="text-gray-500 mt-1">Try adjusting your search or create a new team</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="members" className="mt-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTeamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar} alt={member.fullName} />
                                <AvatarFallback>{member.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{member.role}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm" onClick={() => toast({ 
                              title: "Message", 
                              description: `Send message to ${member.fullName}`
                            })} className="mr-2">
                              <i className="ri-chat-3-line"></i>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toast({ 
                              title: "Edit Member", 
                              description: `Edit ${member.fullName}'s information`
                            })}>
                              <i className="ri-pencil-line"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredTeamMembers.length === 0 && (
                    <div className="text-center py-8">
                      <div className="ri-user-search-line text-4xl text-gray-400 mb-4"></div>
                      <h3 className="text-lg font-medium text-gray-700">No team members found</h3>
                      <p className="text-gray-500 mt-1">Try adjusting your search criteria</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
