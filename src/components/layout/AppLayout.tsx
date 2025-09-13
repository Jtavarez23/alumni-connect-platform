import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileQuickActions } from "@/components/mobile/MobileQuickActions";
import { FloatingCreateButton } from "@/components/mobile/FloatingCreateButton";
import { MobileBottomNavigation } from "@/components/mobile/MobileBottomNavigation";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <AppHeader title={title} />
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileQuickActions />
      <FloatingCreateButton />
      <MobileBottomNavigation />
    </SidebarProvider>
  );
}