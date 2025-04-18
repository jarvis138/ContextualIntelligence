import React, { useState, useEffect, KeyboardEvent } from 'react';
import { Link, useLocation } from 'wouter';
import PageTransition from '@/components/layout/PageTransition';
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
  Network,
  HelpCircle,
  LogOut,
  X,
  PlusCircle
} from 'lucide-react';
import { NovexaLogo } from '@/components/ui/novexa-logo';
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

// Import the theme constants
import colors from '@/styles/colors';
import { typography } from '@/styles/typography';

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
  const [location, navigate] = useLocation();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      // Navigate to search page with query
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearching(false);
    }
  };

  // Handle keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [notifications, setNotifications] = useState<{ id: number; title: string; message: string }[]>([
    { id: 1, title: 'New comment', message: 'John commented on your document' },
    { id: 2, title: 'Document processed', message: 'Project requirements.pdf was processed' },
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background shadow-sm">
        <div className="container flex h-16 items-center">
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
                <div className="flex items-center justify-between mb-4">
                  <Link href="/" className="flex items-center gap-2">
                    <NovexaLogo variant="light" />
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex flex-col gap-1 pt-2" data-tour="sidebar-mobile">
                  {navItems.map((item) => (
                    <div key={item.href}>
                      <Link 
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        data-tour={`${item.name.toLowerCase().replace(/\s+/g, '-')}-mobile`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-200",
                          location === item.href
                            ? "bg-primary/10 text-primary"
                            : "text-neutral-800 hover:bg-neutral-100 hover:text-primary"
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
              <NovexaLogo variant="light" />
            </Link>
          </div>

          {/* Workspace Selector - Added as per requirements */}
          <div className="hidden md:flex mx-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <span className="font-medium">Main Workspace</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="bg-primary/10 text-primary cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary"></div>
                    <span>Main Workspace</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-secondary-main"></div>
                    <span>Marketing Team</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-accent-main"></div>
                    <span>Product Development</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <div className="flex items-center gap-2 text-primary">
                    <PlusCircle className="h-4 w-4" />
                    <span>Create New Workspace</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Global search - Updated per requirements */}
          <div className="flex-1 flex justify-center px-4">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative w-full max-w-sm md:max-w-md lg:max-w-xl mx-auto">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="global-search"
                  type="search"
                  placeholder="Search anything... (Ctrl+K)"
                  className="w-full pl-10 pr-10 rounded-md border border-input h-10 shadow-sm focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-tour="search"
                  autoComplete="off"
                />
                <kbd className="absolute right-3 top-2.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </form>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Create Button - Added per requirements */}
            <Button className="hidden md:flex items-center gap-1">
              <PlusCircle className="h-4 w-4 mr-1" />
              Create
            </Button>
            
            {/* Help Button with Tour */}
            <HelpMenu />

            {/* Notifications - Updated to match requirements */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-white">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <Button variant="ghost" size="sm" className="h-8 text-xs">Mark all as read</Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="p-3 hover:bg-accent cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Bell className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{notification.title}</div>
                          <div className="text-sm text-muted-foreground mt-0.5">{notification.message}</div>
                          <div className="text-xs text-muted-foreground mt-1">2 minutes ago</div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="font-medium mb-1">No new notifications</p>
                    <p className="text-sm">We'll notify you when something arrives.</p>
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/notifications" className="w-full text-center justify-center text-sm text-primary cursor-pointer">
                    View all notifications
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu - Updated to match requirements */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-tour="user-menu" className="rounded-full h-9 w-9 p-0">
                  <Avatar className="h-9 w-9 border border-muted">
                    <AvatarImage src="/placeholder-user.jpg" alt="User" />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      UN
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2">
                  <div className="flex items-center gap-3 p-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/placeholder-user.jpg" alt="User" />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">UN</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">User Name</div>
                      <div className="text-xs text-muted-foreground">user@example.com</div>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex w-full items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex w-full items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                {/* Admin-only menu items */}
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex w-full items-center cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/system" className="flex w-full items-center cursor-pointer">
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System Monitoring</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
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
        <aside className="hidden border-r bg-background shadow-sm md:block md:w-[240px] lg:w-[280px]">
          <div className="flex h-full flex-col">
            {/* Navigation Sections */}
            <div className="flex-1 overflow-y-auto">
              {/* Main Navigation */}
              <div className="px-3 py-4">
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Main Navigation
                </h3>
                <nav className="space-y-1" data-tour="sidebar">
                  {navItems.slice(0, 4).map((item) => (
                    <div key={item.href}>
                      <Link 
                        href={item.href}
                        data-tour={item.name.toLowerCase().replace(/\s+/g, '-')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-200",
                          location === item.href
                            ? "bg-primary/10 text-primary"
                            : "text-neutral-800 hover:bg-neutral-100 hover:text-primary"
                        )}
                      >
                        {item.icon}
                        {item.name}
                      </Link>
                    </div>
                  ))}
                </nav>
              </div>

              {/* Workspaces Section */}
              <div className="px-3 py-4">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Workspaces
                  </h3>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                    <PlusCircle className="h-4 w-4" />
                    <span className="sr-only">Add workspace</span>
                  </Button>
                </div>
                <nav className="space-y-1">
                  <div>
                    <Link 
                      href="/workspace"
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md",
                        location === "/workspace"
                          ? "bg-primary/10 text-primary"
                          : "text-neutral-800 hover:bg-neutral-100 hover:text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                        <span>Main Workspace</span>
                      </div>
                    </Link>
                  </div>
                  <div>
                    <Link 
                      href="/marketing"
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md",
                        location === "/marketing"
                          ? "bg-primary/10 text-primary"
                          : "text-neutral-800 hover:bg-neutral-100 hover:text-primary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-secondary-main"></div>
                        <span>Marketing Team</span>
                      </div>
                    </Link>
                  </div>
                </nav>
              </div>

              {/* Analytics Section */}
              <div className="px-3 py-4">
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Analytics & Reports
                </h3>
                <nav className="space-y-1">
                  {navItems.slice(4, 8).map((item) => (
                    <div key={item.href}>
                      <Link 
                        href={item.href}
                        data-tour={item.name.toLowerCase().replace(/\s+/g, '-')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-200",
                          location === item.href
                            ? "bg-primary/10 text-primary"
                            : "text-neutral-800 hover:bg-neutral-100 hover:text-primary"
                        )}
                      >
                        {item.icon}
                        {item.name}
                      </Link>
                    </div>
                  ))}
                </nav>
              </div>

              {/* System Section */}
              <div className="px-3 py-4">
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  System
                </h3>
                <nav className="space-y-1">
                  {navItems.slice(8).map((item) => (
                    <div key={item.href}>
                      <Link 
                        href={item.href}
                        data-tour={item.name.toLowerCase().replace(/\s+/g, '-')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-200",
                          location === item.href
                            ? "bg-primary/10 text-primary"
                            : "text-neutral-800 hover:bg-neutral-100 hover:text-primary"
                        )}
                      >
                        {item.icon}
                        {item.name}
                      </Link>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
            
            {/* Footer Section */}
            <div className="border-t p-4">
              <div className="flex items-center justify-between rounded-md p-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">v1.0.0</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                  Check for updates
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content with breadcrumbs */}
        <div className="flex-1 flex flex-col">
          {/* Breadcrumb navigation */}
          <div className="bg-background border-b px-4 py-2 md:px-6">
            <div className="flex items-center text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Home
              </Link>
              {location !== "/" && (
                <>
                  <span className="mx-2 text-muted-foreground">/</span>
                  <span className="font-medium">
                    {navItems.find(item => item.href === location)?.name || "Page"}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
    </div>
  );
}