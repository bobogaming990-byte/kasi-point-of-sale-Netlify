import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { CommandPalette } from "./CommandPalette";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Sun, Moon, Command } from "lucide-react";

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("kasi_theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("kasi_theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}

export function AppLayout() {
  const { username, role } = useAuth();
  const { dark, toggle } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const initials = username ? username.slice(0, 2).toUpperCase() : "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Premium top bar ── */}
          <header
            className="h-14 flex items-center justify-between px-5 border-b border-border sticky top-0 z-20"
            style={{ background: "hsl(var(--card))", boxShadow: "0 1px 0 hsl(var(--border))" }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />

              {/* Search pill — opens CommandPalette */}
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg text-muted-foreground text-sm transition-colors hover:bg-muted"
                style={{ border: "1px solid hsl(var(--border))", minWidth: 200 }}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="flex-1 text-left text-xs">Search…</span>
                <span className="flex items-center gap-0.5 text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded">
                  <Command className="w-2.5 h-2.5" /> K
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Dark mode toggle */}
              <button
                onClick={toggle}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* User avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}
                >
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-foreground leading-none">{username}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{role}</p>
                </div>
              </div>
            </div>
          </header>

          <SubscriptionBanner />

          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>

        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      </div>
    </SidebarProvider>
  );
}
