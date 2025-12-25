import { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { HeaderSyncStatus } from "@/components/HeaderSyncStatus";
import { 
  Search, 
  Bell, 
  ChevronDown,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Command
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const DashboardShell = ({ children }: PropsWithChildren) => {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          {/* Premium Header */}
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center gap-4 px-4 md:px-6">
              {/* Sidebar trigger */}
              <SidebarTrigger className="h-8 w-8 shrink-0" />
              
              {/* Search bar - premium styling */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search campaigns, keywords, ASINs..." 
                  className={cn(
                    "pl-9 pr-12 h-9",
                    "bg-muted/50 border-transparent",
                    "focus:bg-background focus:border-border",
                    "placeholder:text-muted-foreground/50",
                    "transition-all duration-200"
                  )}
                />
                {/* Keyboard shortcut hint */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
                  <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground inline-flex">
                    <Command className="h-3 w-3" />K
                  </kbd>
                </div>
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Sync status */}
                <HeaderSyncStatus />
                
                {/* Notifications */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-9 w-9"
                >
                  <Bell className="h-4 w-4" />
                  {/* Notification badge */}
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                </Button>

                {/* User menu */}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className={cn(
                          "h-9 gap-2 px-2",
                          "hover:bg-muted/50",
                          "data-[state=open]:bg-muted"
                        )}
                      >
                        {/* Avatar */}
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary-foreground">
                            {user.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Email - hidden on mobile */}
                        <span className="hidden lg:block text-sm font-medium max-w-[120px] truncate">
                          {user.email?.split('@')[0]}
                        </span>
                        
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent 
                      align="end" 
                      className="w-56"
                      sideOffset={8}
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">Account</p>
                          <p className="text-xs leading-none text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>Help & Support</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={signOut}
                        className="text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </header>

          {/* Main content area with subtle background pattern */}
          <main className="flex-1 overflow-auto">
            <div className="relative min-h-full">
              {/* Subtle grid background */}
              <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />
              
              {/* Content */}
              <div className="relative p-4 md:p-6 lg:p-8">
                <div className="animate-in max-w-[1600px] mx-auto">
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