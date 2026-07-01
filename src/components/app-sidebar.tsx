import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, FilePlus2, Briefcase, LineChart, Bell, FileText, Calculator, BarChart3, Sparkles, UserCircle2 } from "lucide-react";
import kfintechLogo from "@/assets/kfintech.png.asset.json";
import mpowerLogo from "@/assets/mpower-logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { RegionSwitcher } from "@/components/region-switcher";

const items = [
  { title: "Screener",    url: "/",            icon: LayoutGrid },
  { title: "Proposal",    url: "/proposal",    icon: FilePlus2 },
  { title: "Held Away Assets", url: "/portfolio",   icon: Briefcase },
  { title: "Tax Liability", url: "/tax",         icon: Calculator },
  { title: "Market Data",   url: "/market-data", icon: LineChart },
  { title: "Alerts",        url: "/alerts",      icon: Bell },
  { title: "Analytics",     url: "/analytics",   icon: BarChart3 },
  { title: "Reports",       url: "/reports",     icon: FileText },
  { title: "mPower AI",     url: "/assistant",   icon: Sparkles },
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
            <img src={mpowerLogo} alt="mPower" className="h-7 w-auto object-contain shrink-0" />
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
      <SidebarFooter className="border-t border-border p-2 space-y-2">
        <RegionSwitcher />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Customer Portal">
              <Link to="/customer/login" className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20">
                <UserCircle2 className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="font-medium">Customer Portal</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
