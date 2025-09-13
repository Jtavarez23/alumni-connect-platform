import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  BookOpen, 
  Users, 
  MessageCircle, 
  User
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const quickActions = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: BookOpen, label: "Yearbooks", path: "/yearbooks" },
  { icon: Users, label: "Network", path: "/network" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function MobileQuickActions() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {quickActions.map((action) => {
          const isActive = location.pathname === action.path;
          return (
            <Button
              key={action.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(action.path)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 h-12 px-1 rounded-lg touch-manipulation",
                isActive && "text-primary bg-primary/10"
              )}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}