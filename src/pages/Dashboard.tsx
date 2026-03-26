import { useMemo } from "react";
import { store } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { username } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { dailyTotal, dailyCount, topItems, lowStock, totalProducts } = useMemo(() => {
    const sales = store.getSales();
    const products = store.getProducts();
    const todaySales = sales.filter(s => s.date === today);
    const dailyTotal = todaySales.reduce((s, sale) => s + sale.total, 0);

    // Top items across all sales
    const itemMap = new Map<string, number>();
    sales.forEach(s => s.items.forEach(i => {
      itemMap.set(i.name, (itemMap.get(i.name) || 0) + i.quantity);
    }));
    const topItems = [...itemMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const lowStock = products.filter(p => p.stock < 20);

    return { dailyTotal, dailyCount: todaySales.length, topItems, lowStock, totalProducts: products.length };
  }, [today]);

  const stats = [
    { label: "Today's Sales", value: `R ${dailyTotal.toFixed(2)}`, icon: DollarSign, color: "bg-primary" },
    { label: "Transactions", value: dailyCount.toString(), icon: ShoppingCart, color: "bg-secondary" },
    { label: "Total Products", value: totalProducts.toString(), icon: Package, color: "bg-accent" },
    { label: "Low Stock Items", value: lowStock.length.toString(), icon: TrendingUp, color: "bg-destructive" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {username} 👋</h1>
        <p className="text-muted-foreground">Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center`}>
                <s.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topItems.map(([name, qty], i) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{qty} sold</span>
              </div>
            ))}
            {topItems.length === 0 && <p className="text-sm text-muted-foreground">No sales yet.</p>}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.name}</span>
                <span className={`text-sm font-semibold ${p.stock < 10 ? 'text-destructive' : 'text-secondary'}`}>
                  {p.stock} left
                </span>
              </div>
            ))}
            {lowStock.length === 0 && <p className="text-sm text-muted-foreground">All items well stocked! 🎉</p>}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-4">
        Support: Wilson Moabelo | 064 550 4029 | support@kasiecon.com
      </p>
    </div>
  );
}
