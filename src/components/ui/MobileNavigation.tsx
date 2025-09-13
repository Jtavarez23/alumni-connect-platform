import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  BookOpen, 
  Users, 
  MessageSquare, 
  User,
  Plus
} from "lucide-react";
import { Button } from "./button";
import { useAuth } from "@/contexts/AuthContext";

const MobileNavigation = () => {
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
      name: "Profile",
      href: "/profile",
      icon: User,
      active: location.pathname.startsWith("/profile") ||
               location.pathname.startsWith("/settings")
    }
  ];

  if (!user) return null;

  return (
    <>
      {/* Floating Create Button */}
      <div className="fixed bottom-20 right-4 z-50 md:hidden">
        <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="grid grid-cols-5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-col items-center space-y-1 px-2 py-3 text-xs transition-colors hover:text-primary"
              >
                <Icon 
                  className={`h-5 w-5 ${item.active ? 'text-primary' : 'text-muted-foreground'}`} 
                />
                <span className={`${item.active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNavigation;