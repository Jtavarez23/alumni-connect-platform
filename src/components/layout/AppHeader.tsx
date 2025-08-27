import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBadge } from "@/components/activity/NotificationBadge";
import { Breadcrumbs } from "./Breadcrumbs";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex flex-col">
          {title && (
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          )}
          <Breadcrumbs />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <NotificationBadge />
      </div>
    </header>
  );
}