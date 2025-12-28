import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import { 
  Bot, 
  LayoutDashboard, 
  Settings, 
  Target, 
  BarChart3, 
  Zap,
  Bell,
  LogOut,
  User,
  HelpCircle,
  ChevronUp,
  RefreshCw,
  Check
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { status, refresh } = useSyncStatus();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuItems = [
    { title: "Command Center", url: "/command-center", icon: LayoutDashboard },
    { title: "Campaigns", url: "/campaigns", icon: Target },
    { title: "Automate", url: "/automate", icon: Zap },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border/50">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background shadow-sm shrink-0">
            <Bot className="h-5 w-5" />
          </span>
          {!isCollapsed && (
            <span className="font-display font-semibold text-lg tracking-tight">PPC Pal</span>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/overview'} 
                      className={({ isActive }) => cn(
                        "flex items-center gap-2",
                        isActive && "bg-muted text-foreground font-medium"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-border/50 p-2 space-y-1">
        {/* Sync Status */}
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "sm"}
          onClick={refresh}
          className={cn(
            "w-full justify-start gap-2",
            isCollapsed && "justify-center px-0"
          )}
          title={status?.isProcessing ? "Syncing..." : "Data synced"}
        >
          {status?.isProcessing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4 text-primary" />
          )}
          {!isCollapsed && (
            <span className="text-xs text-muted-foreground">
              {status?.isProcessing ? "Syncing..." : "Synced"}
            </span>
          )}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "sm"}
          className={cn(
            "w-full justify-start gap-2 relative",
            isCollapsed && "justify-center px-0"
          )}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 left-5 h-1.5 w-1.5 rounded-full bg-primary" />
          {!isCollapsed && (
            <span className="text-xs text-muted-foreground">Notifications</span>
          )}
        </Button>

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? "icon" : "sm"}
                className={cn(
                  "w-full justify-start gap-2",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <div className="h-6 w-6 rounded-md bg-foreground flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-background">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                {!isCollapsed && (
                  <>
                    <span className="text-xs truncate flex-1 text-left">
                      {user.email?.split('@')[0]}
                    </span>
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
              side="top" 
              align={isCollapsed ? "center" : "start"}
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
      </SidebarFooter>
    </Sidebar>
  );
}
