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
  Search, 
  BarChart3, 
  Sparkles,
  Zap,
  ListChecks,
  History,
  Users
} from "lucide-react";

export function AppSidebar() {
  const location = useLocation();

  const overviewItems = [
    { title: "Overview", url: "/overview", icon: LayoutDashboard },
  ];

  const campaignItems = [
    { title: "Campaigns", url: "/campaigns", icon: Target },
    { title: "Search Terms", url: "/campaigns/search-terms", icon: Search },
  ];

  const automateItems = [
    { title: "Automation", url: "/automate", icon: Zap },
    { title: "Actions Queue", url: "/automate/queue", icon: ListChecks },
    { title: "History", url: "/automate/history", icon: History },
  ];

  const reportsItems = [
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "AI Insights", url: "/reports/ai-insights", icon: Sparkles },
  ];

  const settingsItems = [
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Multi-Account", url: "/settings/accounts", icon: Users },
  ];

  const renderMenuItems = (items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[]) => (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = location.pathname === item.url || 
          (item.url !== '/overview' && location.pathname.startsWith(item.url) && item.url.split('/').length === location.pathname.split('/').length);
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
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">PPC Pal</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Overview */}
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(overviewItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Campaigns */}
        <SidebarGroup>
          <SidebarGroupLabel>Campaigns</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(campaignItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Automate */}
        <SidebarGroup>
          <SidebarGroupLabel>Automate</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(automateItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reports */}
        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(reportsItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(settingsItems)}
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
