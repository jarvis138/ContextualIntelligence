import { formatDistanceToNow } from "date-fns";
import { Activity } from "@/lib/types";
import { Button } from "@/components/ui/button";

type RecentActivitiesProps = {
  activities: Activity[];
  onViewAll: () => void;
};

export default function RecentActivities({ activities, onViewAll }: RecentActivitiesProps) {
  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "recently";
    }
  };

  const getActivityDescription = (activity: Activity) => {
    // In a real implementation, we would replace placeholders with actual data
    return (
      <p className="text-sm text-gray-600">
        {activity.user ? (
          <span className="font-semibold text-gray-800">{activity.user.fullName}</span>
        ) : (
          <span className="font-semibold text-gray-800">A user</span>
        )}{" "}
        {activity.description}
      </p>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Recent Activities</h2>
        <Button 
          variant="ghost" 
          className="text-sm text-primary font-medium hover:text-blue-700"
          onClick={onViewAll}
        >
          View All
        </Button>
      </div>
      <div className="px-6 py-4">
        <div className="relative pl-8">
          {activities.map((activity) => (
            <div key={activity.id} className="timeline-item relative pl-4 pb-6">
              <div>
                {getActivityDescription(activity)}
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            </div>
          ))}
          
          {activities.length === 0 && (
            <div className="text-sm text-gray-500 italic pl-4">
              No recent activities to display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
