import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Bell, 
  Menu, 
  Search, 
  Settings, 
  ChevronDown, 
  User,
  BarChart2,
  Briefcase,
  FileText,
  Users,
  Zap,
  Grid,
  Wrench,
  Home,
  Shield,
  Monitor,
  LineChart,
  Layers,
  FileBarChart,
  AlertCircle,
  Network
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { HelpMenu } from '@/components/tour/HelpMenu';

type MainLayoutProps = {
  children: React.ReactNode;
};

// Navigation items based on the provided design
const navItems = [
  { name: 'Dashboard', href: '/', icon: <Home className="mr-2 h-4 w-4" /> },
  { name: 'Projects', href: '/projects', icon: <Briefcase className="mr-2 h-4 w-4" /> },
  { name: 'Documents', href: '/documents', icon: <FileText className="mr-2 h-4 w-4" /> },
  { name: 'Teams', href: '/teams', icon: <Users className="mr-2 h-4 w-4" /> },
  { name: 'Workspace', href: '/workspace', icon: <Layers className="mr-2 h-4 w-4" /> },
  { name: 'Analytics', href: '/analytics', icon: <LineChart className="mr-2 h-4 w-4" /> },
  { name: 'Reports & Alerts', href: '/reports-alerts', icon: <FileBarChart className="mr-2 h-4 w-4" /> },
  { name: 'Insights', href: '/insights', icon: <BarChart2 className="mr-2 h-4 w-4" /> },
  { name: 'Graph', href: '/graph', icon: <Network className="mr-2 h-4 w-4" /> },
  { name: 'Integrations', href: '/integrations', icon: <Zap className="mr-2 h-4 w-4" /> },
  { name: 'Search', href: '/search', icon: <Search className="mr-2 h-4 w-4" /> },
  { name: 'Settings', href: '/settings', icon: <Settings className="mr-2 h-4 w-4" /> },
  { name: 'Admin', href: '/admin', icon: <Shield className="mr-2 h-4 w-4" /> },
  { name: 'System', href: '/system', icon: <Monitor className="mr-2 h-4 w-4" /> },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const isAdminPage = location === "/admin";
  
  // If this is the admin page, we want to render a different layout
  if (isAdminPage) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; title: string; message: string }[]>([
    { id: 1, title: 'New comment', message: 'John commented on your document' },
    { id: 2, title: 'Document processed', message: 'Project requirements.pdf was processed' },
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-14 items-center">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile menu button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                <nav className="flex flex-col gap-4 pt-4" data-tour="sidebar-mobile">
                  {navItems.map((item) => (
                    <div key={item.href}>
                      <Link 
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        data-tour={`${item.name.toLowerCase().replace(/\s+/g, '-')}-mobile`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
                          location === item.href
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {item.icon}
                        {item.name}
                      </Link>
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            {/* Logo */}
            <Link 
              href="/"
              className="flex items-center gap-2"
            >
              <Grid className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Novexa</span>
            </Link>
          </div>

          {/* Quick search */}
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-sm md:max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full pl-8 rounded-full bg-background"
              />
            </div>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Help Menu */}
            <div className="mr-1">
              <HelpMenu />
            </div>
            
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="p-3 cursor-pointer">
                      <div>
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-muted-foreground">{notification.message}</div>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-tour="user-menu" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex w-full items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex w-full items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                {/* Admin-only menu items */}
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex w-full items-center">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/system" className="flex w-full items-center">
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System Monitoring</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => console.log('Logged out')}>
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content layout */}
      <div className="flex flex-1">
        {/* Sidebar - visible on larger screens */}
        <aside className="hidden border-r bg-background md:block md:w-[240px] lg:w-[280px]">
          <div className="flex h-full flex-col">
            <nav className="flex-1 p-4 space-y-1" data-tour="sidebar">
              {navItems.map((item) => (
                <div key={item.href}>
                  <Link 
                    href={item.href}
                    data-tour={item.name.toLowerCase().replace(/\s+/g, '-')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
                      location === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                </div>
              ))}
            </nav>
            <div className="border-t p-4">
              <div className="flex items-center gap-2 rounded-md px-3 py-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">v1.0.0</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}