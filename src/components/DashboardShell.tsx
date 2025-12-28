import { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const DashboardShell = ({ children }: PropsWithChildren) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          {/* Minimal Header - just sidebar trigger */}
          <header className="sticky top-0 z-40 border-b border-border bg-background">
            <div className="flex h-12 items-center px-4">
              <SidebarTrigger className="h-8 w-8 shrink-0" />
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto bg-muted/30">
            <div className="relative min-h-full">
              <div className="relative p-4 md:p-6 lg:p-8">
                <div className="animate-fade-in max-w-[1600px] mx-auto">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardShell;
