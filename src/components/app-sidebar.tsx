import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, FilePlus2, Briefcase, LineChart, Bell, FileText, Calculator, BarChart3, Sparkles, UserCircle2, UserPlus } from "lucide-react";
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
import { ThemeSwitcher } from "@/components/theme-switcher";

const groups = [
  {
    label: "Analytics Modules",
    items: [
      { title: "Screener", desc: "Product Screening", url: "/", icon: LayoutGrid },
      { title: "Market Data", desc: "Live Market Feed", url: "/market-data", icon: LineChart },
      { title: "Analytics", desc: "Performance & Risk", url: "/analytics", icon: BarChart3 },
      { title: "Reports", desc: "Client Reporting", url: "/reports", icon: FileText },
    ],
  },
  {
    label: "Portfolio Management",
    items: [
      { title: "Onboarding", desc: "Client Setup", url: "/onboarding", icon: UserPlus },
      { title: "Proposal", desc: "Build & Simulate", url: "/proposal", icon: FilePlus2 },
      { title: "Held Away Assets", desc: "External Holdings", url: "/portfolio", icon: Briefcase },
      { title: "Tax Liability", desc: "Gains & Estimates", url: "/tax", icon: Calculator },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Alerts", desc: "Signals & Triggers", url: "/alerts", icon: Bell },
      { title: "mPower AI", desc: "Portfolio Assistant", url: "/assistant", icon: Sparkles },
    ],
  },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) => path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <img src={kfintechLogo.url} alt="KFintech" className="h-7 w-auto object-contain shrink-0" />
          {!collapsed && (
            <img src={mpowerLogo} alt="mPower" className="h-7 w-auto object-contain shrink-0" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="h-auto py-2">
                        <Link
                          to={item.url}
                          className={`relative flex items-center gap-2.5 rounded-md transition-colors ${
                            active ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                          }`}
                        >
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-sidebar-primary transition-opacity ${
                              active ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-sidebar-primary" : ""}`} />
                          {!collapsed && (
                            <span className="flex min-w-0 flex-col leading-tight">
                              <span className="truncate text-[13px] font-medium">{item.title}</span>
                              <span className="truncate text-[10px] text-sidebar-foreground/55">{item.desc}</span>
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 space-y-2">
        <RegionSwitcher />
        <ThemeSwitcher />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Customer Portal">
              <Link to="/customer/login" className="flex items-center gap-2 rounded-md border border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary hover:bg-sidebar-primary/25">
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
