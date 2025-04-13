import { Link, useLocation } from "wouter";
import { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type SidebarProps = {
  user: User;
};

type SidebarLink = {
  href: string;
  label: string;
  icon: string;
};

type IntegrationLink = {
  name: string;
  icon: string;
  bgColor: string;
};

const navigationLinks: SidebarLink[] = [
  { href: "/", label: "Dashboard", icon: "ri-dashboard-line" },
  { href: "/projects", label: "Projects", icon: "ri-file-list-3-line" },
  { href: "/team", label: "Team", icon: "ri-team-line" },
  { href: "/documents", label: "Documents", icon: "ri-file-text-line" },
  { href: "/conversations", label: "Conversations", icon: "ri-chat-3-line" },
  { href: "/search", label: "Search", icon: "ri-search-line" },
  { href: "/integrations", label: "Integrations", icon: "ri-links-line" },
];

const integrationLinks: IntegrationLink[] = [
  { name: "Trello", icon: "ri-trello-line", bgColor: "bg-blue-500" },
  { name: "Jira", icon: "ri-jira-line", bgColor: "bg-blue-600" },
  { name: "Slack", icon: "ri-slack-line", bgColor: "bg-purple-500" },
  { name: "G Suite", icon: "ri-google-line", bgColor: "bg-yellow-500" },
];

export default function Sidebar({ user }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <i className="ri-bubble-chart-fill text-white"></i>
          </div>
          <h1 className="text-lg font-semibold text-gray-800">CPI Hub</h1>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigationLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>
                <a
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer",
                    location === link.href 
                      ? "bg-primary bg-opacity-10 text-primary" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <i className={cn(link.icon, "mr-3 text-lg")}></i>
                  {link.label}
                </a>
              </Link>
            </li>
          ))}
        </ul>
        
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Integrations
          </h3>
          <ul className="mt-2 space-y-1">
            {integrationLinks.map((integration) => (
              <li key={integration.name}>
                <Link href="/integrations">
                  <a className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <span className={cn("w-6 h-6 mr-3 rounded flex items-center justify-center text-white", integration.bgColor)}>
                      <i className={cn(integration.icon, "text-sm")}></i>
                    </span>
                    {integration.name}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <img 
            className="h-8 w-8 rounded-full" 
            src={user.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} 
            alt={`${user.fullName}'s avatar`} 
          />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{user.fullName}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
