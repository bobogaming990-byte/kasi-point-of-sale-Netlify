import { useState, useCallback } from "react";
import { store, Product } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Search, Package } from "lucide-react";

export default function Inventory() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [products, setProducts] = useState(store.getProducts());
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", stock: "", supplier: "", barcode: "", expiry_date: "" });

  const refresh = useCallback(() => setProducts(store.getProducts()), []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const all = store.getProducts();
    const id = all.length > 0 ? Math.max(...all.map(p => p.id)) + 1 : 1;
    const newProd: Product = {
      id,
      name: form.name,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      supplier: form.supplier,
      barcode: form.barcode,
      expiry_date: form.expiry_date || undefined,
    };
    all.push(newProd);
    store.setProducts(all);
    setForm({ name: "", price: "", stock: "", supplier: "", barcode: "", expiry_date: "" });
    setShowAdd(false);
    refresh();
  };

  const handleDelete = (id: number) => {
    const all = store.getProducts().filter(p => p.id !== id);
    store.setProducts(all);
    refresh();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">{products.length} products</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && isAdmin && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">New Product</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Price (R)" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              <Input placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
              <Input placeholder="Supplier" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} required />
              <Input placeholder="Barcode" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} required />
              <Input placeholder="Expiry Date" type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
              <div className="sm:col-span-3">
                <Button type="submit" className="w-full sm:w-auto">Save Product</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or barcode..."
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Price (R)</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Barcode</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Expiry</th>
                {isAdmin && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    {p.name}
                  </td>
                  <td className="p-3 text-right">{p.price.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <span className={`font-semibold ${p.stock < 10 ? 'text-destructive' : p.stock < 20 ? 'text-secondary' : 'text-accent'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{p.supplier}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{p.barcode}</td>
                  <td className="p-3 text-muted-foreground">{p.expiry_date || "–"}</td>
                  {isAdmin && (
                    <td className="p-3">
                      <button onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
