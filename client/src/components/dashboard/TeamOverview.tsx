import { Team } from "@/lib/types";
import { Button } from "@/components/ui/button";

type TeamOverviewProps = {
  teams: (Team & { memberCount: number; taskCount: number })[];
  onViewAll: () => void;
};

export default function TeamOverview({ teams, onViewAll }: TeamOverviewProps) {
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTeamIcon = (icon: string | null) => {
    // Default icon if none is provided
    const iconClass = icon || "ri-group-line";
    return iconClass;
  };

  const getIconBgColor = (index: number) => {
    const colors = [
      "bg-purple-100 text-purple-600",
      "bg-blue-100 text-blue-600",
      "bg-pink-100 text-pink-600",
      "bg-yellow-100 text-yellow-600",
      "bg-green-100 text-green-600",
      "bg-red-100 text-red-600"
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Team Overview</h2>
        <Button 
          variant="ghost" 
          className="text-sm text-primary font-medium hover:text-blue-700"
          onClick={onViewAll}
        >
          View All
        </Button>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {teams.map((team, index) => (
            <div key={team.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconBgColor(index)}`}>
                  <i className={getTeamIcon(team.icon)}></i>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-800">{team.name}</h3>
                  <p className="text-xs text-gray-500">{team.memberCount} members · {team.taskCount} tasks</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className={`${getProgressColor(team.progress)} h-2 rounded-full`} 
                    style={{ width: `${team.progress}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-600">{team.progress}%</span>
              </div>
            </div>
          ))}

          {teams.length === 0 && (
            <div className="text-sm text-gray-500 italic">
              No teams available.
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" className="py-2 text-sm font-medium rounded-lg flex items-center justify-center">
            <i className="ri-team-line mr-2"></i> Add Member
          </Button>
          <Button variant="outline" className="py-2 text-sm font-medium rounded-lg flex items-center justify-center">
            <i className="ri-chat-3-line mr-2"></i> Message
          </Button>
        </div>
      </div>
    </div>
  );
}
