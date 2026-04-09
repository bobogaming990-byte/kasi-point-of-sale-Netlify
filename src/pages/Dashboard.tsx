import { useMemo } from "react";
import { store } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  DollarSign, Zap, Award, ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, gradient, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; gradient: string; trend?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden card-hover"
      style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(52,199,89,0.12)", color: "#34c759" }}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Insight chip ─────────────────────────────────────────────────────────────
function InsightChip({ icon: Icon, text, color }: { icon: React.ElementType; text: string; color: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "hsl(var(--muted))" }}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + "22" }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>
    </div>
  );
}

export default function Dashboard() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const metrics = useMemo(() => {
    const sales    = store.getSales();
    const products = store.getProducts();
    const users    = store.getUsers();

    const todaySales     = sales.filter(s => s.date === today);
    const yesterdaySales = sales.filter(s => s.date === yesterday);
    const dailyTotal     = todaySales.reduce((s, x) => s + x.total, 0);
    const prevTotal      = yesterdaySales.reduce((s, x) => s + x.total, 0);
    const trendPct       = prevTotal > 0 ? ((dailyTotal - prevTotal) / prevTotal * 100) : null;

    const itemMap = new Map<string, number>();
    sales.forEach(s => s.items.forEach(i => {
      itemMap.set(i.name, (itemMap.get(i.name) || 0) + i.quantity);
    }));
    const topItems = [...itemMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const cashierMap = new Map<string, number>();
    sales.forEach(s => {
      if (s.cashier) cashierMap.set(s.cashier, (cashierMap.get(s.cashier) || 0) + 1);
    });
    const topCashier = [...cashierMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const lowStock  = products.filter(p => p.stock < 20);
    const critStock = products.filter(p => p.stock < 5);

    return {
      dailyTotal, dailyCount: todaySales.length, trendPct,
      topItems, lowStock, critStock, totalProducts: products.length,
      totalUsers: users.length, topCashier,
    };
  }, [today, yesterday]);

  // Smart insight messages
  const insights = useMemo(() => {
    const out: { icon: React.ElementType; text: string; color: string }[] = [];
    if (metrics.topItems[0])
      out.push({ icon: Award, text: `Top seller: "${metrics.topItems[0][0]}" with ${metrics.topItems[0][1]} units sold`, color: "#ff9500" });
    if (metrics.critStock.length > 0)
      out.push({ icon: AlertTriangle, text: `Critical: ${metrics.critStock.map(p => p.name).join(", ")} ${metrics.critStock.length === 1 ? "has" : "have"} fewer than 5 units left`, color: "#ff3b30" });
    else if (metrics.lowStock.length > 0)
      out.push({ icon: AlertTriangle, text: `${metrics.lowStock.length} product${metrics.lowStock.length > 1 ? "s are" : " is"} running low on stock`, color: "#ff9500" });
    if (metrics.topCashier)
      out.push({ icon: Zap, text: `Most active cashier today: ${metrics.topCashier[0]} (${metrics.topCashier[1]} sales)`, color: "#30d158" });
    if (metrics.trendPct !== null)
      out.push({ icon: TrendingUp, text: `Sales ${metrics.trendPct >= 0 ? "up" : "down"} ${Math.abs(metrics.trendPct).toFixed(0)}% compared to yesterday`, color: metrics.trendPct >= 0 ? "#30d158" : "#ff3b30" });
    if (out.length === 0)
      out.push({ icon: Zap, text: "No sales recorded yet — head to Sales to process your first transaction", color: "#0a84ff" });
    return out;
  }, [metrics]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {greeting}, {username} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => navigate("/sales")}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all press-effect"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))", boxShadow: "0 4px 14px hsl(var(--primary) / 0.35)" }}
        >
          <ShoppingCart className="w-4 h-4" /> New Sale <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue Today"
          value={`R ${metrics.dailyTotal.toFixed(2)}`}
          sub={metrics.trendPct !== null ? `${metrics.trendPct >= 0 ? "+" : ""}${metrics.trendPct.toFixed(0)}% vs yesterday` : "First day of tracking"}
          icon={DollarSign}
          gradient="linear-gradient(135deg, #ff9500, #ff6a00)"
          trend={metrics.trendPct !== null && metrics.trendPct > 0 ? `+${metrics.trendPct.toFixed(0)}%` : undefined}
        />
        <StatCard
          label="Transactions"
          value={metrics.dailyCount.toString()}
          sub="Today"
          icon={ShoppingCart}
          gradient="linear-gradient(135deg, #0a84ff, #0040dd)"
        />
        <StatCard
          label="Total Products"
          value={metrics.totalProducts.toString()}
          sub={`${metrics.lowStock.length} low stock`}
          icon={Package}
          gradient="linear-gradient(135deg, #30d158, #00a832)"
        />
        <StatCard
          label="Low Stock"
          value={metrics.lowStock.length.toString()}
          sub={metrics.critStock.length > 0 ? `${metrics.critStock.length} critical` : "items need restocking"}
          icon={AlertTriangle}
          gradient={metrics.critStock.length > 0 ? "linear-gradient(135deg,#ff3b30,#c0392b)" : "linear-gradient(135deg,#ff9500,#e67e00)"}
        />
      </div>

      {/* Smart insights */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Business Insights</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insights.map((ins, i) => <InsightChip key={i} {...ins} />)}
        </div>
      </div>

      {/* Two-column: Top sellers + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Selling */}
        <div className="rounded-2xl p-5" style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Top Selling Products</h2>
            <span className="text-xs text-muted-foreground">All time</span>
          </div>
          <div className="space-y-3">
            {metrics.topItems.map(([name, qty], i) => (
              <div key={name} className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0"
                  style={{ background: i === 0 ? "hsl(var(--primary) / 0.12)" : "hsl(var(--muted))", color: i === 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                >{i + 1}</span>
                <span className="flex-1 text-sm text-foreground truncate">{name}</span>
                <span className="text-xs font-medium text-muted-foreground">{qty} sold</span>
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((qty / (metrics.topItems[0]?.[1] || 1)) * 100)}%`, background: "hsl(var(--primary))" }}
                  />
                </div>
              </div>
            ))}
            {metrics.topItems.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No sales yet</p>
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div className="rounded-2xl p-5" style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Stock Alerts</h2>
            <button onClick={() => navigate("/inventory")} className="text-xs text-primary hover:underline">View inventory →</button>
          </div>
          <div className="space-y-3">
            {metrics.lowStock.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate flex-1">{p.name}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full ml-3"
                  style={p.stock < 5
                    ? { background: "rgba(255,59,48,0.1)", color: "#ff3b30" }
                    : { background: "rgba(255,149,0,0.1)", color: "#ff9500" }}
                >
                  {p.stock} left
                </span>
              </div>
            ))}
            {metrics.lowStock.length === 0 && (
              <div className="flex items-center gap-2 py-4 justify-center">
                <span className="text-2xl">🎉</span>
                <p className="text-sm text-muted-foreground">All items well stocked</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Support: Wilson Moabelo · 064 550 4029 · support@kasiecon.com
      </p>
    </div>
  );
}
