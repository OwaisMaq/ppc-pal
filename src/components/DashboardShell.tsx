import { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useDateRange } from "@/context/DateRangeContext";

const DashboardShell = ({ children }: PropsWithChildren) => {
  const { user, signOut } = useAuth();
  const { dateRangeDays, setDateRangeDays, diagnosticMode, setDiagnosticMode } = useDateRange();

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
              <div className="hidden md:flex items-center gap-3">
                <Select value={String(dateRangeDays)} onValueChange={(v) => setDateRangeDays(parseInt(v))}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Today</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <div className="hidden lg:flex items-center gap-2">
                  <Switch checked={diagnosticMode} onCheckedChange={setDiagnosticMode} id="diagnostic-switch" />
                  <label htmlFor="diagnostic-switch" className="text-xs text-muted-foreground">Diagnostic</label>
                </div>
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
