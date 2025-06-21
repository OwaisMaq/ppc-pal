
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Database, 
  Lightbulb, 
  PieChart,
  Settings,
  LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    title: "Performance Summary",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Trends",
    url: "/trends",
    icon: TrendingUp,
  },
  {
    title: "Optimisation Logs",
    url: "/optimization-logs",
    icon: FileText,
  },
  {
    title: "Keyword/Product Data",
    url: "/keyword-data",
    icon: Database,
  },
  {
    title: "Recommendations",
    url: "/recommendations",
    icon: Lightbulb,
  },
  {
    title: "Reporting",
    url: "/reporting",
    icon: PieChart,
  },
];

const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <span className="text-xl font-bold text-blue-600">PPC Pal</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <Link to="/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </Link>
        <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
