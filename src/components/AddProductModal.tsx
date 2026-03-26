import { useState, useRef } from "react";
import { Product, Supplier } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Camera, Package, Truck, CalendarDays, X, Save } from "lucide-react";
import { toast } from "sonner";

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, "id">) => void;
  initialBarcode?: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function AddProductModal({ open, onClose, onSave, initialBarcode = "" }: AddProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [notExpiring, setNotExpiring] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState({
    name: "",
    description: "",
    purchase_price: "",
    price: "",
    barcode: initialBarcode,
    stock_received: "",
    expiry_date: "",
    supplier_name: "",
    supplier_phone: "",
    supplier_email: "",
    supplier_address: "",
  });

  const resetForm = () => {
    setForm({ name: "", description: "", purchase_price: "", price: "", barcode: initialBarcode, stock_received: "", expiry_date: "", supplier_name: "", supplier_phone: "", supplier_email: "", supplier_address: "" });
    setImagePreview("");
    setNotExpiring(false);
    setErrors({});
  };

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Product name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.purchase_price || parseFloat(form.purchase_price) <= 0) e.purchase_price = "Valid purchase price is required";
    if (!form.price || parseFloat(form.price) <= 0) e.price = "Valid selling price is required";
    if (!form.barcode.trim()) e.barcode = "Barcode / SKU is required";
    if (!form.stock_received || parseInt(form.stock_received) < 0) e.stock_received = "Valid stock quantity is required";
    if (!notExpiring && !form.expiry_date) e.expiry_date = "Expiry date is required (or check 'Not Expiring')";
    if (!form.supplier_name.trim()) e.supplier_name = "Supplier name is required";
    if (!form.supplier_phone.trim()) e.supplier_phone = "Supplier phone is required";
    if (!form.supplier_email.trim()) e.supplier_email = "Supplier email is required";
    if (!form.supplier_address.trim()) e.supplier_address = "Supplier address is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors below");
      return;
    }
    const supplier: Supplier = {
      name: form.supplier_name.trim(),
      phone: form.supplier_phone.trim(),
      email: form.supplier_email.trim(),
      address: form.supplier_address.trim(),
    };
    const stockQty = parseInt(form.stock_received);
    const product: Omit<Product, "id"> = {
      name: form.name.trim(),
      description: form.description.trim(),
      purchase_price: parseFloat(form.purchase_price),
      price: parseFloat(form.price),
      stock: stockQty,
      stock_received: stockQty,
      supplier,
      barcode: form.barcode.trim(),
      image: imagePreview || undefined,
      expiry_date: notExpiring ? undefined : form.expiry_date,
      not_expiring: notExpiring,
    };
    onSave(product);
    resetForm();
    toast.success(`${product.name} added to inventory`);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-destructive mt-1">{errors[field]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Register New Product
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Complete all fields to add this product to your inventory.</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          {/* Product Info */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4" /> Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input id="name" placeholder="e.g. Coca-Cola 2L" value={form.name} onChange={e => set("name", e.target.value)} className={errors.name ? "border-destructive" : ""} />
                  <FieldError field="name" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Full Description *</Label>
                  <Textarea id="description" placeholder="Describe the product in detail..." value={form.description} onChange={e => set("description", e.target.value)} rows={2} className={errors.description ? "border-destructive" : ""} />
                  <FieldError field="description" />
                </div>
                <div>
                  <Label htmlFor="purchase_price">Purchase Price (R) *</Label>
                  <Input id="purchase_price" type="number" step="0.01" min="0" placeholder="0.00" value={form.purchase_price} onChange={e => set("purchase_price", e.target.value)} className={errors.purchase_price ? "border-destructive" : ""} />
                  <FieldError field="purchase_price" />
                </div>
                <div>
                  <Label htmlFor="price">Selling Price (R) *</Label>
                  <Input id="price" type="number" step="0.01" min="0" placeholder="0.00" value={form.price} onChange={e => set("price", e.target.value)} className={errors.price ? "border-destructive" : ""} />
                  <FieldError field="price" />
                </div>
                <div>
                  <Label htmlFor="barcode">Barcode / SKU *</Label>
                  <Input id="barcode" placeholder="Scan or type barcode" value={form.barcode} onChange={e => set("barcode", e.target.value)} className={`font-mono ${errors.barcode ? "border-destructive" : ""}`} />
                  <FieldError field="barcode" />
                </div>
                <div>
                  <Label htmlFor="stock_received">Quantity Received *</Label>
                  <Input id="stock_received" type="number" min="0" placeholder="0" value={form.stock_received} onChange={e => set("stock_received", e.target.value)} className={errors.stock_received ? "border-destructive" : ""} />
                  <FieldError field="stock_received" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Image */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Camera className="w-4 h-4" /> Product Image
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-start gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all overflow-hidden flex-shrink-0"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">Click the box to upload a product photo. JPG, PNG accepted.</p>
                  {imagePreview && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setImagePreview("")}>
                      <X className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </CardContent>
          </Card>

          {/* Expiry */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Expiry Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="not_expiring" checked={notExpiring} onCheckedChange={v => { setNotExpiring(!!v); if (v) { set("expiry_date", ""); if (errors.expiry_date) setErrors(prev => { const n = { ...prev }; delete n.expiry_date; return n; }); } }} />
                <Label htmlFor="not_expiring" className="cursor-pointer">This product does not expire</Label>
              </div>
              {!notExpiring && (
                <div className="max-w-xs">
                  <Label htmlFor="expiry_date">Expiry Date *</Label>
                  <Input id="expiry_date" type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} className={errors.expiry_date ? "border-destructive" : ""} />
                  <FieldError field="expiry_date" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Truck className="w-4 h-4" /> Supplier Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier_name">Supplier Name *</Label>
                  <Input id="supplier_name" placeholder="e.g. SAB" value={form.supplier_name} onChange={e => set("supplier_name", e.target.value)} className={errors.supplier_name ? "border-destructive" : ""} />
                  <FieldError field="supplier_name" />
                </div>
                <div>
                  <Label htmlFor="supplier_phone">Phone *</Label>
                  <Input id="supplier_phone" type="tel" placeholder="e.g. 011 881 8111" value={form.supplier_phone} onChange={e => set("supplier_phone", e.target.value)} className={errors.supplier_phone ? "border-destructive" : ""} />
                  <FieldError field="supplier_phone" />
                </div>
                <div>
                  <Label htmlFor="supplier_email">Email *</Label>
                  <Input id="supplier_email" type="email" placeholder="e.g. orders@supplier.co.za" value={form.supplier_email} onChange={e => set("supplier_email", e.target.value)} className={errors.supplier_email ? "border-destructive" : ""} />
                  <FieldError field="supplier_email" />
                </div>
                <div>
                  <Label htmlFor="supplier_address">Address *</Label>
                  <Input id="supplier_address" placeholder="e.g. Sandton, Johannesburg" value={form.supplier_address} onChange={e => set("supplier_address", e.target.value)} className={errors.supplier_address ? "border-destructive" : ""} />
                  <FieldError field="supplier_address" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="min-w-[100px]">
              Cancel
            </Button>
            <Button type="submit" className="min-w-[140px]">
              <Save className="w-4 h-4 mr-2" /> Save Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
