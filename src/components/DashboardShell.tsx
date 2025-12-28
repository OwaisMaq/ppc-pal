import { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const DashboardShell = ({ children }: PropsWithChildren) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
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
