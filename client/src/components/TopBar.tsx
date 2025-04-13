import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, ChevronDown, Settings, User } from "lucide-react";

interface TopBarProps {
  project: {
    id: number;
    name: string;
  };
  teamMembers: {
    id: number;
    fullName: string;
    avatar: string | null;
  }[];
  onSearch: (query: string) => void;
}

export default function TopBar({ project, teamMembers, onSearch }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };
  
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Project Dashboard</h1>
          <p className="text-sm text-gray-500">{project.name}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-2.5">
              <i className="ri-search-line text-gray-400"></i>
            </div>
          </form>
          
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 3).map((member) => (
              <img 
                key={`team-member-${member.id}`}
                className="w-8 h-8 rounded-full border-2 border-white" 
                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}`} 
                alt={member.fullName} 
              />
            ))}
            {teamMembers.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-sm text-gray-600">
                +{teamMembers.length - 3}
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Account</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </div>
                <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer text-red-500">
                    <i className="ri-logout-box-line"></i>
                    <span>Log out</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}