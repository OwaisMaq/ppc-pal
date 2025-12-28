import { NavLink, useLocation } from "react-router-dom";
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
  SidebarMenuButton
} from "@/components/ui/sidebar";
import { 
  Bot, 
  LayoutDashboard, 
  Settings, 
  Target, 
  BarChart3, 
  Zap
} from "lucide-react";

export function AppSidebar() {
  const location = useLocation();

  const menuItems = [
    { title: "Overview", url: "/overview", icon: LayoutDashboard },
    { title: "Campaigns", url: "/campaigns", icon: Target },
    { title: "Automate", url: "/automate", icon: Zap },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border/50">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
            <Bot className="h-5 w-5" />
          </span>
          <span className="font-display font-semibold text-lg tracking-tight">PPC Pal</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url !== '/overview' && location.pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url} end={item.url === '/overview'} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/50">
        <div className="px-3 py-3 text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} PPC Pal
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
