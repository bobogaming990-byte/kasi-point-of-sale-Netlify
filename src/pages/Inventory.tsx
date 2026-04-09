import { useState, useCallback } from "react";
import { store, Product } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionStore } from "@/lib/subscription-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Search, Package, AlertTriangle, ScanBarcode, Plus, RefreshCw, Tag } from "lucide-react";
import { toast } from "sonner";
import AddProductModal from "@/components/AddProductModal";
import BarcodeLabelModal from "@/components/BarcodeLabelModal";
import { auditLog } from "@/lib/audit-logger";
import { generateBarcodeValue } from "@/lib/barcode-utils";

export default function Inventory() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [products, setProducts] = useState(store.getProducts());
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState("");
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);

  const refresh = useCallback(() => setProducts(store.getProducts()), []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  );

  const isExpired = (p: Product) => {
    if (p.not_expiring || !p.expiry_date) return false;
    return new Date(p.expiry_date) < new Date();
  };

  const isLowStock = (p: Product) => p.stock < 10;

  const handleScanSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !search.trim()) return;
    const barcode = search.trim();
    const match = products.find(p => p.barcode === barcode);
    if (match) {
      toast.success(`Found: ${match.name}`);
    } else {
      const access = subscriptionStore.checkAccess('inventory');
      if (!access.allowed) {
        toast.error(access.reason!, { action: { label: 'Subscribe Now', onClick: () => { window.location.href = '/subscription'; } } });
        return;
      }
      setPendingBarcode(barcode);
      setShowAddModal(true);
      setSearch("");
      toast.info("New barcode detected — fill in product details");
    }
  };

  const handleSaveProduct = (product: Omit<Product, "id">) => {
    const access = subscriptionStore.checkAccess('inventory');
    if (!access.allowed) {
      toast.error(access.reason!, { action: { label: 'Subscribe Now', onClick: () => { window.location.href = '/subscription'; } } });
      return;
    }
    try {
      const all = store.getProducts();
      const barcodeExists = all.some(p => p.barcode === product.barcode);

      if (barcodeExists) {
        toast.error("This barcode already exists in inventory");
        return;
      }

      const id = all.length > 0 ? Math.max(...all.map(p => p.id)) + 1 : 1;
      all.push({ id, ...product });
      store.setProducts(all);
      auditLog({ action_type: 'PRODUCT_ADDED', module_name: 'Inventory', description: `Product "${product.name}" added to inventory`, item_name: product.name, reference_id: String(id), quantity: product.stock, new_value: `Price: R${product.price.toFixed(2)}, Stock: ${product.stock}` });
      setShowAddModal(false);
      setPendingBarcode("");
      refresh();
      toast.success("Product saved");
    } catch {
      toast.error("Could not save product. If image is large, try a smaller file.");
    }
  };

  const handleGenerateBarcode = (id: number) => {
    const all = store.getProducts();
    const product = all.find(p => p.id === id);
    if (!product) return;
    const code = generateBarcodeValue(product.name);
    const updated = all.map(p =>
      p.id === id
        ? { ...p, barcode: code, barcode_generated: true, barcode_created_at: new Date().toISOString() }
        : p
    );
    store.setProducts(updated);
    auditLog({ action_type: 'PRODUCT_EDITED', module_name: 'Inventory', description: `Barcode generated for "${product.name}": ${code}`, item_name: product.name, reference_id: String(id), new_value: code });
    refresh();
    toast.success(`Barcode generated: ${code}`);
  };

  const handleDelete = (id: number) => {
    const product = store.getProducts().find(p => p.id === id);
    const all = store.getProducts().filter(p => p.id !== id);
    store.setProducts(all);
    if (product) {
      const wasExpired = isExpired(product);
      auditLog({ action_type: wasExpired ? 'EXPIRED_REMOVED' : 'PRODUCT_DELETED', module_name: 'Inventory', description: `${wasExpired ? 'Expired product' : 'Product'} "${product.name}" removed from inventory`, item_name: product.name, reference_id: String(id), previous_value: `Stock: ${product.stock}` });
    }
    toast.success("Product removed");
    refresh();
  };

  const lowStockCount = products.filter(isLowStock).length;
  const expiredCount = products.filter(isExpired).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">{products.length} products in stock</p>
        </div>
        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <Badge variant="outline" className="border-secondary text-secondary gap-1">
              <AlertTriangle className="w-3 h-3" /> {lowStockCount} low stock
            </Badge>
          )}
          {expiredCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" /> {expiredCount} expired
            </Badge>
          )}
          {isAdmin && !store.isTrialExpired() && (
            <Button onClick={() => { setPendingBarcode(""); setShowAddModal(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Scan to Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4">
          <div className="relative max-w-lg">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            <Input
              placeholder="Scan barcode or search by name..."
              className="pl-11 h-12 text-base"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleScanSearch}
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hidden sm:block">
              Press Enter to search
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Product Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Cost (R)</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Price (R)</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Barcode</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Expiry</th>
                {isAdmin && <th className="p-3 w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const expired = isExpired(p);
                const lowStock = isLowStock(p);
                return (
                  <tr key={p.id} className={`border-b last:border-0 transition-colors ${expired ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${expired ? "text-destructive" : ""}`}>{p.name}</p>
                          {p.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{p.purchase_price.toFixed(2)}</td>
                    <td className="p-3 text-right font-medium">{p.price.toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <span className={`font-semibold ${lowStock ? "text-destructive" : "text-accent"}`}>
                        {p.stock}
                      </span>
                      {lowStock && <AlertTriangle className="w-3 h-3 text-destructive inline ml-1" />}
                    </td>
                    <td className="p-3 text-muted-foreground">{p.supplier.name}</td>
                    <td className="p-3">
                      {p.barcode ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[130px]" title={p.barcode}>{p.barcode}</span>
                          {p.barcode_generated && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/40 text-primary shrink-0">gen</Badge>
                          )}
                          <button
                            onClick={() => setLabelProduct(p)}
                            className="ml-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                            title="Print barcode label"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : isAdmin ? (
                        <button
                          onClick={() => handleGenerateBarcode(p.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                          title="Generate a barcode for this product"
                        >
                          <RefreshCw className="w-3 h-3" /> Generate
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">No barcode</span>
                      )}
                    </td>
                    <td className="p-3">
                      {p.not_expiring ? (
                        <Badge variant="outline" className="text-xs">No expiry</Badge>
                      ) : expired ? (
                        <Badge variant="destructive" className="text-xs">Expired</Badge>
                      ) : (
                        <span className="text-muted-foreground">{p.expiry_date}</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-3">
                        {(expired || true) && (
                          <button onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive/80 transition-colors" title="Remove product">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No products found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Barcode Label Modal */}
      {labelProduct && (
        <BarcodeLabelModal
          open={Boolean(labelProduct)}
          onClose={() => setLabelProduct(null)}
          productName={labelProduct.name}
          barcode={labelProduct.barcode}
          price={labelProduct.price}
        />
      )}

      {/* Add Product Modal */}
      <AddProductModal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setPendingBarcode(""); }}
        onSave={handleSaveProduct}
        initialBarcode={pendingBarcode}
      />
    </div>
  );
}
