import { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bot } from "lucide-react";

const DashboardShell = ({ children }: PropsWithChildren) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          {/* Mobile header with sidebar trigger */}
          <header className="flex md:hidden items-center gap-3 h-14 border-b border-border bg-background px-4 shrink-0">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <Bot className="h-4 w-4" />
              </span>
              <span className="font-display font-semibold text-lg tracking-tight">PPC Pal</span>
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
