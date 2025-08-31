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
import { Bot, LayoutDashboard, Database, Settings, Shield, Search, Target, BookOpen, BarChart3, Zap } from "lucide-react";

export function AppSidebar() {
  const location = useLocation();

  const items = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Performance", url: "/performance", icon: BarChart3 },
    { title: "Data", url: "/data-management", icon: Database },
  ];

  const studioItems = [
    { title: "Search Studio", url: "/search-studio", icon: Search },
    { title: "Target Studio", url: "/target-studio", icon: Target },
  ];

  const automationItems = [
    { title: "Automation", url: "/automation", icon: Zap },
    { title: "Playbooks", url: "/playbooks", icon: BookOpen },
  ];

  const settingsItems = [
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Privacy", url: "/privacy", icon: Shield },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">PPC Pal</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url} end className="flex items-center gap-2">
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

        <SidebarGroup>
          <SidebarGroupLabel>Studios</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {studioItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url} end className="flex items-center gap-2">
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

        <SidebarGroup>
          <SidebarGroupLabel>Automation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {automationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url} end className="flex items-center gap-2">
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

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink to={item.url} end className="flex items-center gap-2">
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
      <SidebarFooter>
        <div className="px-2 py-2 text-xs text-muted-foreground">
          © {new Date().getFullYear()} PPC Pal
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
