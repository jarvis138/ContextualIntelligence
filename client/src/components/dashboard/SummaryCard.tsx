import { cn } from "@/lib/utils";

type SummaryCardProps = {
  title: string;
  value: number;
  icon: string;
  iconColor: string;
  changeValue?: number;
  changeText?: string;
  changeType?: 'increase' | 'decrease';
};

export default function SummaryCard({
  title,
  value,
  icon,
  iconColor,
  changeValue,
  changeText,
  changeType = 'increase'
}: SummaryCardProps) {
  const getChangeColor = () => {
    if (!changeType) return "text-gray-500";
    return changeType === 'increase' ? "text-success" : "text-warning";
  };

  const getChangeIcon = () => {
    return changeType === 'increase' ? "ri-arrow-up-line" : "ri-arrow-down-line";
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="mt-1 text-2xl font-semibold text-gray-800">{value}</h3>
        </div>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", `bg-${iconColor}-opacity-10`)}>
          <i className={cn(icon, "text-lg", `text-${iconColor}`)}></i>
        </div>
      </div>
      {(changeValue !== undefined || changeText) && (
        <div className="mt-4 flex items-center">
          <span className={cn("text-sm font-medium flex items-center", getChangeColor())}>
            <i className={cn(getChangeIcon(), "mr-1")}></i> {changeValue !== undefined ? `${Math.abs(changeValue)}%` : ''}
            {changeValue !== undefined && changeText && ' '}
            {changeText}
          </span>
          {!changeText && <span className="text-xs text-gray-500 ml-2">from last week</span>}
        </div>
      )}
    </div>
  );
}
