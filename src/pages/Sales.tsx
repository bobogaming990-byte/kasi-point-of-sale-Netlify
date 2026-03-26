import { useState, useMemo } from "react";
import { store, Product, CartItem } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Minus, Trash2, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";

export default function Sales() {
  const { username } = useAuth();
  const [products] = useState(store.getProducts());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [vat, setVat] = useState(false);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      const match = products.find(p => p.barcode === search.trim());
      if (match) {
        addToCart(match);
        setSearch("");
        toast.success(`Added ${match.name}`);
      } else {
        toast.error("Product not found for barcode: " + search.trim());
      }
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) {
        return prev.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newQty = c.quantity + delta;
      return newQty > 0 ? { ...c, quantity: newQty } : c;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const total = vat ? subtotal * 1.15 : subtotal;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const saleId = store.addSale(cart, total, username);
    toast.success(`Sale #${saleId} completed — R ${total.toFixed(2)}`);
    setCart([]);
  };

  return (
    <div className="animate-fade-in h-full">
      <h1 className="text-2xl font-bold mb-4">Sales</h1>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-12rem)]">
        {/* Products panel */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products or scan barcode..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-1 pr-1">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-card rounded-xl p-4 text-left shadow-sm hover:shadow-md hover:ring-2 hover:ring-primary/30 transition-all group"
              >
                <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{p.name}</p>
                <p className="text-lg font-bold text-primary mt-1">R {p.price.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart panel */}
        <Card className="lg:col-span-2 border-0 shadow-sm flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {cart.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Add items to start a sale</p>
              )}
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">R {item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-md bg-card flex items-center justify-center hover:bg-background">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-md bg-card flex items-center justify-center hover:bg-background">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="ml-1 text-destructive hover:text-destructive/80">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">R {subtotal.toFixed(2)}</span>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={vat} onChange={e => setVat(e.target.checked)}
                  className="rounded border-input accent-primary" />
                Add VAT (15%)
              </label>
              {vat && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">VAT</span>
                  <span>R {(subtotal * 0.15).toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">R {total.toFixed(2)}</span>
              </div>
              <Button onClick={handleCheckout} disabled={cart.length === 0} className="w-full h-12 text-base font-semibold">
                <Check className="w-4 h-4 mr-2" /> Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
