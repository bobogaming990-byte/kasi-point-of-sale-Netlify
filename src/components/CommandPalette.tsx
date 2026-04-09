import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart2,
  CreditCard, Palette, RotateCcw, Search, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { store } from "@/lib/store";

interface Action {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  url?: string;
  action?: () => void;
  group: string;
}

const NAV_ACTIONS: Action[] = [
  { id: "dashboard",    label: "Dashboard",    description: "Overview & insights", icon: LayoutDashboard, url: "/dashboard",         group: "Navigate" },
  { id: "sales",        label: "Sales",        description: "Process a sale",      icon: ShoppingCart,    url: "/sales",             group: "Navigate" },
  { id: "inventory",    label: "Inventory",    description: "Manage products",     icon: Package,         url: "/inventory",         group: "Navigate" },
  { id: "users",        label: "Users",        description: "Staff accounts",      icon: Users,           url: "/users",             group: "Navigate" },
  { id: "accounting",   label: "Accounting",   description: "Reports & profits",   icon: BarChart2,       url: "/accounting",        group: "Navigate" },
  { id: "subscription", label: "Subscription", description: "Billing & plan",      icon: CreditCard,      url: "/subscription",      group: "Navigate" },
  { id: "branding",     label: "Branding",     description: "Logo & colours",      icon: Palette,         url: "/settings/branding", group: "Navigate" },
  { id: "returns",      label: "Returns",      description: "Process returns",     icon: RotateCcw,       url: "/returns",           group: "Navigate" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery]     = useState("");
  const navigate               = useNavigate();
  const [selected, setSelected] = useState(0);
  const inputRef               = useRef<HTMLInputElement>(null);

  const products = store.getProducts();
  const productActions: Action[] = products.slice(0, 20).map(p => ({
    id: `product-${p.id}`,
    label: p.name,
    description: `R${p.price.toFixed(2)} · ${p.stock} in stock`,
    icon: Package,
    url: "/inventory",
    group: "Products",
  }));

  const all = [...NAV_ACTIONS, ...productActions];

  const filtered = query.trim()
    ? all.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.description?.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ACTIONS;

  const groups = filtered.reduce<Record<string, Action[]>>((acc, a) => {
    (acc[a.group] = acc[a.group] || []).push(a);
    return acc;
  }, {});

  const flat = Object.values(groups).flat();

  const run = useCallback((a: Action) => {
    if (a.url)    navigate(a.url);
    if (a.action) a.action();
    onClose();
    setQuery("");
  }, [navigate, onClose]);

  useEffect(() => { if (open) { setQuery(""); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter")     { if (flat[selected]) run(flat[selected]); }
      if (e.key === "Escape")    { onClose(); }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open, flat, selected, run, onClose]);

  if (!open) return null;

  let idx = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.2)", background: "hsl(var(--card))" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, products, actions…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-1.5">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-4 py-1.5 mt-1">{group}</p>
              {items.map(item => {
                idx++;
                const i = idx;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setSelected(i)}
                    onMouseDown={() => run(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selected === i ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      selected === i ? "bg-white/20" : "bg-muted"
                    )}>
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      {item.description && (
                        <p className={cn("text-xs truncate", selected === i ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className={cn("w-3.5 h-3.5 shrink-0", selected === i ? "opacity-70" : "opacity-0 group-hover:opacity-40")} />
                  </button>
                );
              })}
            </div>
          ))}
          {flat.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No results for "{query}"</p>
          )}
        </div>
      </div>
    </div>
  );
}
