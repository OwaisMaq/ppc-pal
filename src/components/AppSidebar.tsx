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
import { Bot, LayoutDashboard, Settings, Shield, Target, Sparkles, Search, DollarSign, AlertTriangle, GitBranch, Users, Wrench, ClipboardList } from "lucide-react";

export function AppSidebar() {
  const location = useLocation();

  const items = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Account Audit", url: "/account-audit", icon: ClipboardList },
    { title: "Campaigns", url: "/campaigns", icon: Target },
    { title: "Search Terms", url: "/search-terms", icon: Search },
    { title: "AI Insights", url: "/ai-insights", icon: Sparkles },
    { title: "Budget Copilot", url: "/budget-copilot", icon: DollarSign },
    { title: "Anomalies", url: "/anomalies", icon: AlertTriangle },
    { title: "Attribution", url: "/attribution", icon: GitBranch },
    { title: "Multi-Account", url: "/multi-account", icon: Users },
  ];

  const settingsItems = [
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Privacy", url: "/privacy", icon: Shield },
    { title: "Dev Tools", url: "/dev-tools", icon: Wrench },
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
