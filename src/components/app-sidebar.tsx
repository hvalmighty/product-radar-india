import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, FilePlus2, Briefcase, LineChart, Bell, FileText } from "lucide-react";
import kfintechLogo from "@/assets/kfintech.png.asset.json";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Screener",    url: "/",            icon: LayoutGrid },
  { title: "Proposal",    url: "/proposal",    icon: FilePlus2 },
  { title: "Portfolios",  url: "/portfolio",   icon: Briefcase },
  { title: "Market Data", url: "/market-data", icon: LineChart },
  { title: "Alerts",      url: "/alerts",      icon: Bell },
  { title: "Reports",     url: "/reports",     icon: FileText },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) => path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img src={kfintechLogo.url} alt="KFintech" className="h-7 w-auto object-contain shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-tight truncate">mPower Wealth</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground leading-tight truncate">RM Terminal · IN</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
