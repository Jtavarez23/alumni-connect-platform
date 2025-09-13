import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  BookOpen, 
  Users, 
  MessageSquare, 
  Calendar,
  Building,
  Briefcase,
  User,
  Bell,
  Settings,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const DesktopSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navigationItems = [
    {
      name: "Home",
      href: "/dashboard",
      icon: Home,
      active: location.pathname === "/dashboard"
    },
    {
      name: "Yearbooks", 
      href: "/yearbooks",
      icon: BookOpen,
      active: location.pathname.startsWith("/yearbooks")
    },
    {
      name: "Network",
      href: "/network",
      icon: Users,
      active: location.pathname.startsWith("/network") || 
               location.pathname.startsWith("/people") ||
               location.pathname.startsWith("/schools")
    },
    {
      name: "Messages",
      href: "/messages",
      icon: MessageSquare,
      active: location.pathname.startsWith("/messages")
    },
    {
      name: "Events",
      href: "/events",
      icon: Calendar,
      active: location.pathname.startsWith("/events")
    },
    {
      name: "Businesses",
      href: "/businesses",
      icon: Building,
      active: location.pathname.startsWith("/businesses")
    },
    {
      name: "Jobs",
      href: "/jobs",
      icon: Briefcase,
      active: location.pathname.startsWith("/jobs")
    },
    {
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      active: location.pathname.startsWith("/notifications")
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      active: location.pathname.startsWith("/profile")
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      active: location.pathname.startsWith("/settings")
    }
  ];

  if (!user) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 md:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AC</span>
            </div>
            <span className="text-xl font-bold gradient-text">Alumni Connect</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Create Button */}
        <div className="border-t p-4">
          <Button className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;