import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  ShieldCheck,
  Flag,
  Database,
  Bell,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const navigation = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Tenants",
      href: "/admin/tenant-management",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Security",
      href: "/admin/security",
      icon: <ShieldCheck className="h-5 w-5" />,
    },
    {
      title: "Feature Flags",
      href: "/admin/feature-flags",
      icon: <Flag className="h-5 w-5" />,
    },
    {
      title: "Database",
      href: "/admin/database",
      icon: <Database className="h-5 w-5" />,
    },
    {
      title: "Alerts",
      href: "/admin/alerts",
      icon: <Bell className="h-5 w-5" />,
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  // Function to determine if a nav item is active
  const isActive = (href: string) => {
    if (href === "/admin" && location === "/admin") {
      return true;
    }
    if (href !== "/admin" && location.startsWith(href)) {
      return true;
    }
    return false;
  };

  const Sidebar = (
    <div className="group flex flex-col h-full">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Building2 className="h-6 w-6" />
          <span className="text-lg">CPI Hub Admin</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-4 pt-6">
          <nav className="grid gap-1">
            {navigation.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </ScrollArea>
      <div className="mt-auto border-t">
        <div className="flex items-center p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="grid gap-0.5">
              <div className="text-sm font-medium">
                {user?.username || "Admin"}
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.role === "admin" ? "Administrator" : "Staff"}
              </div>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for desktop */}
      <div className="hidden border-r bg-muted/40 lg:block lg:w-[280px]">
        {Sidebar}
      </div>

      {/* Mobile navigation */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-4 top-4 z-40 lg:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          {Sidebar}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static lg:h-[60px] lg:px-6">
          <div className="flex flex-1 items-center justify-end">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center">
                <Button variant="ghost" size="sm">
                  Exit Admin
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}