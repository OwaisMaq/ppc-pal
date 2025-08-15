import { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const DashboardShell = ({ children }: PropsWithChildren) => {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <div className="flex h-12 items-center gap-3 px-3 md:px-4">
              <SidebarTrigger />
              <div className="flex-1 max-w-xl">
                <Input placeholder="Search…" className="h-9" />
              </div>
              {user && (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:block text-xs text-muted-foreground">{user.email}</span>
                  <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
                </div>
              )}
            </div>
          </header>
          <div className="p-4 md:p-6 animate-fade-in">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardShell;
