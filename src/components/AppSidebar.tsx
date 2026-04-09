import {
  LayoutDashboard, Package, ShoppingCart, Users, LogOut, Store, Palette, RotateCcw, BarChart2, CreditCard
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { title: "Branding", url: "/settings/branding", icon: Palette, adminOnly: true },
  { title: "Sales", url: "/sales", icon: ShoppingCart, adminOnly: false },
  { title: "Inventory", url: "/inventory", icon: Package, adminOnly: false },
  { title: "Users", url: "/users", icon: Users, adminOnly: false },
  { title: "Returns",    url: "/returns",    icon: RotateCcw,  adminOnly: false },
  { title: "Accounting",   url: "/accounting",   icon: BarChart2,   adminOnly: true },
  { title: "Subscription", url: "/subscription", icon: CreditCard, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { logout, username, role } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="flex flex-col h-full">
        {/* Brand — click to go to Setup */}
        <Link to="/setup" className="p-4 flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-slide-in">
              <h1 className="text-lg font-bold text-sidebar-foreground">Kasi P.O.S</h1>
              <p className="text-xs text-sidebar-foreground/60">Point of Sale</p>
            </div>
          )}
        </Link>

        {/* Nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.filter(item => !item.adminOnly || role === 'admin').map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent text-sidebar-foreground/80"
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          {!collapsed && (
            <div className="mb-3 animate-fade-in">
              <p className="text-sm font-medium text-sidebar-foreground">{username}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
