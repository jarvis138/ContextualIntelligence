import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Project, User } from "@/lib/types";

type TopBarProps = {
  project: Project;
  teamMembers: User[];
  onSearch: (query: string) => void;
};

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
                key={member.id}
                className="w-8 h-8 rounded-full border-2 border-white" 
                src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}`} 
                alt={member.fullName} 
              />
            ))}
            {teamMembers.length > 3 && (
              <div 
                key="more-members-count"
                className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-500"
              >
                +{teamMembers.length - 3}
              </div>
            )}
          </div>
          
          <Button className="text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-600">
            <i className="ri-add-line mr-1"></i> Add Resource
          </Button>
        </div>
      </div>
    </div>
  );
}
