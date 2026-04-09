import { useEffect, useMemo, useRef, useState } from "react";
import { store, Product, Supplier } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Camera, Package, Truck, CalendarDays, X, Save, Check, Loader2, Search, RefreshCw, Tag } from "lucide-react";
import { generateBarcodeValue } from "@/lib/barcode-utils";
import BarcodeDisplay from "@/components/BarcodeDisplay";
import BarcodeLabelModal from "@/components/BarcodeLabelModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeSupplierKey, type SupplierRecord } from "@/lib/supplier-directory";
import { searchSuppliers as searchSuppliersRequest } from "@/lib/supplier-search";

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, "id">) => void;
  initialBarcode?: string;
}

interface FormErrors {
  [key: string]: string;
}

function highlightSupplierText(text: string, query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return text;
  }

  const start = text.toLowerCase().indexOf(trimmedQuery.toLowerCase());

  if (start === -1) {
    return text;
  }

  const end = start + trimmedQuery.length;

  return (
    <>
      {text.slice(0, start)}
      <span className="rounded-sm bg-primary/15 px-0.5 text-foreground">{text.slice(start, end)}</span>
      {text.slice(end)}
    </>
  );
}

export default function AddProductModal({ open, onClose, onSave, initialBarcode = "" }: AddProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const supplierBlurTimeoutRef = useRef<number | null>(null);
  const scannerModeRef = useRef<boolean>(false);
  const scannerBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [notExpiring, setNotExpiring] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [supplierResults, setSupplierResults] = useState<SupplierRecord[]>([]);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const [addressManuallyEdited, setAddressManuallyEdited] = useState(false);
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

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

  useEffect(() => {
    if (open) {
      setForm(prev => ({ ...prev, barcode: initialBarcode }));
      setDuplicateWarning('');
      setScanFlash(false);
      scannerModeRef.current = false;
      scannerBufferRef.current = '';
      lastKeyTimeRef.current = 0;
      // Focus barcode field so scanner input goes to the correct field
      const t = window.setTimeout(() => barcodeInputRef.current?.focus(), 150);
      return () => window.clearTimeout(t);
    }
  }, [open, initialBarcode]);

  useEffect(() => {
    return () => {
      if (supplierBlurTimeoutRef.current) {
        window.clearTimeout(supplierBlurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const supplierQuery = form.supplier_name.trim();

    if (!supplierQuery) {
      setSupplierResults([]);
      setSupplierLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSupplierLoading(true);

      try {
        const results = await searchSuppliersRequest(supplierQuery, controller.signal);
        setSupplierResults(results);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSupplierResults([]);
        }
      } finally {
        setSupplierLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [form.supplier_name, open]);

  const exactSupplierMatch = useMemo(() => {
    const supplierName = form.supplier_name.trim();

    if (!supplierName) {
      return null;
    }

    return supplierResults.find((supplier) => normalizeSupplierKey(supplier.name) === normalizeSupplierKey(supplierName)) ?? null;
  }, [form.supplier_name, supplierResults]);

  const showDuplicateHint = Boolean(exactSupplierMatch && exactSupplierMatch.id !== selectedSupplier?.id);

  const clearSupplierBlurTimeout = () => {
    if (supplierBlurTimeoutRef.current) {
      window.clearTimeout(supplierBlurTimeoutRef.current);
      supplierBlurTimeoutRef.current = null;
    }
  };

  const clearSupplierErrors = () => {
    setErrors(prev => {
      const next = { ...prev };
      delete next.supplier_name;
      delete next.supplier_phone;
      delete next.supplier_email;
      delete next.supplier_address;
      return next;
    });
  };

  const triggerScanFlash = () => {
    setScanFlash(true);
    window.setTimeout(() => setScanFlash(false), 700);
  };

  const checkDuplicateBarcode = (code: string) => {
    if (!code.trim()) { setDuplicateWarning(''); return; }
    const existing = store.getProducts().find(p => p.barcode === code.trim());
    setDuplicateWarning(existing ? `Already registered as "${existing.name}"` : '');
  };

  /** Called on keydown inside the Barcode / SKU input. Enter moves focus to Product Name. */
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerScanFlash();
      window.setTimeout(() => nameInputRef.current?.focus(), 60);
    }
  };

  /**
   * Scanner interception on the Product Name field.
   * If characters arrive very fast (< 80 ms apart) it is scanner input — redirect to barcode.
   */
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const gap = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    if (e.key === 'Enter') {
      if (scannerModeRef.current && scannerBufferRef.current) {
        e.preventDefault();
        const code = scannerBufferRef.current;
        scannerBufferRef.current = '';
        scannerModeRef.current = false;
        setForm(prev => ({ ...prev, name: '', barcode: code }));
        setBarcodeGenerated(false);
        checkDuplicateBarcode(code);
        triggerScanFlash();
        window.setTimeout(() => nameInputRef.current?.focus(), 80);
      }
      return;
    }

    if (e.key.length !== 1) return; // skip Shift, Backspace, etc.

    if (scannerModeRef.current) {
      // Already intercepting — absorb key into buffer
      e.preventDefault();
      scannerBufferRef.current += e.key;
      return;
    }

    // Start interception if 2nd+ char arrives within 80 ms (scanner speed)
    if (gap < 80 && gap > 0) {
      e.preventDefault();
      scannerBufferRef.current = form.name + e.key;
      setForm(prev => ({ ...prev, name: '' }));
      scannerModeRef.current = true;
    }
  };

  const handleGenerateBarcode = () => {
    const name = form.name.trim() || 'ITEM';
    const code = generateBarcodeValue(name);
    setForm(prev => ({ ...prev, barcode: code }));
    setBarcodeGenerated(true);
    if (errors.barcode) setErrors(prev => { const n = { ...prev }; delete n.barcode; return n; });
  };

  const resetForm = () => {
    setForm({ name: "", description: "", purchase_price: "", price: "", barcode: initialBarcode, stock_received: "", expiry_date: "", supplier_name: "", supplier_phone: "", supplier_email: "", supplier_address: "" });
    setImagePreview("");
    setNotExpiring(false);
    setErrors({});
    setSupplierResults([]);
    setSupplierDropdownOpen(false);
    setSupplierLoading(false);
    setSelectedSupplier(null);
    setAddressAutoFilled(false);
    setAddressManuallyEdited(false);
    setBarcodeGenerated(false);
    setDuplicateWarning('');
    setScanFlash(false);
    scannerModeRef.current = false;
    scannerBufferRef.current = '';
    clearSupplierBlurTimeout();
  };

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    
    if (field === "supplier_address") {
      if (selectedSupplier) {
        setAddressManuallyEdited(true);
      }
      setAddressAutoFilled(false);
    }
  };

  const handleSupplierNameChange = (value: string) => {
    clearSupplierBlurTimeout();
    setSupplierDropdownOpen(true);

    const detachedFromSelection = Boolean(
      selectedSupplier && normalizeSupplierKey(selectedSupplier.name) !== normalizeSupplierKey(value),
    );

    setForm(prev => ({
      ...prev,
      supplier_name: value,
      supplier_phone: detachedFromSelection ? "" : prev.supplier_phone,
      supplier_email: detachedFromSelection ? "" : prev.supplier_email,
      supplier_address: detachedFromSelection && !addressManuallyEdited ? "" : prev.supplier_address,
    }));

    if (errors.supplier_name) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.supplier_name;
        return next;
      });
    }

    if (detachedFromSelection) {
      setSelectedSupplier(null);
      setAddressAutoFilled(false);
    }
  };

  const handleSupplierInputFocus = () => {
    clearSupplierBlurTimeout();
    setSupplierDropdownOpen(true);
  };

  const handleSupplierInputBlur = () => {
    clearSupplierBlurTimeout();
    supplierBlurTimeoutRef.current = window.setTimeout(() => {
      setSupplierDropdownOpen(false);
    }, 120);
  };

  const handleSupplierSelect = (supplier: SupplierRecord) => {
    clearSupplierBlurTimeout();
    setSelectedSupplier(supplier);
    setForm(prev => ({
      ...prev,
      supplier_name: supplier.name,
      supplier_phone: supplier.phone,
      supplier_email: supplier.email,
      supplier_address: supplier.address,
    }));
    setAddressAutoFilled(true);
    setAddressManuallyEdited(false);
    setSupplierDropdownOpen(false);
    clearSupplierErrors();
  };

  const handleAddNewSupplier = () => {
    clearSupplierBlurTimeout();
    setSelectedSupplier(null);
    setAddressAutoFilled(false);
    setSupplierDropdownOpen(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
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
      barcode_generated: barcodeGenerated || undefined,
      barcode_created_at: barcodeGenerated ? new Date().toISOString() : undefined,
    };
    try {
      onSave(product);
      resetForm();
      toast.success(`${product.name} added to inventory`);
    } catch {
      toast.error("Could not save product. Try a smaller image or check required fields.");
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const isTextArea = target instanceof HTMLTextAreaElement;
    const isButton = target instanceof HTMLButtonElement;

    if (e.key === "Enter" && !isTextArea && !isButton) {
      e.preventDefault();
    }
  };

  const handleClose = () => {
    clearSupplierBlurTimeout();
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
          <DialogDescription>Complete all fields to add this product to your inventory.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="px-6 pb-6 space-y-6">
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
                  <Input
                    id="name"
                    ref={nameInputRef}
                    placeholder="e.g. Coca-Cola 2L"
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    className={errors.name ? "border-destructive" : ""}
                  />
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
                <div className="md:col-span-2">
                  <Label htmlFor="barcode">Barcode / SKU *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="barcode"
                      ref={barcodeInputRef}
                      placeholder="Scan or type barcode, or click Generate"
                      value={form.barcode}
                      onChange={e => {
                        set("barcode", e.target.value);
                        setBarcodeGenerated(false);
                        checkDuplicateBarcode(e.target.value);
                      }}
                      onKeyDown={handleBarcodeKeyDown}
                      className={`font-mono flex-1 transition-all duration-150 ${
                        scanFlash ? 'ring-2 ring-primary ring-offset-1' : ''
                      } ${errors.barcode ? 'border-destructive' : ''}`}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateBarcode} title="Auto-generate barcode from product name">
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Generate
                    </Button>
                    {form.barcode && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowLabelModal(true)} title="Print barcode label">
                        <Tag className="w-3.5 h-3.5 mr-1" /> Print Label
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scan barcode or enter manually — field is auto-focused when form opens
                  </p>
                  {barcodeGenerated && form.barcode && !duplicateWarning && (
                    <p className="text-xs text-primary mt-1">✓ Auto-generated — save the product to lock this barcode</p>
                  )}
                  {duplicateWarning && (
                    <p className="text-xs text-destructive mt-1 font-medium">⚠ {duplicateWarning}</p>
                  )}
                  <FieldError field="barcode" />
                  {form.barcode && (
                    <div className={`mt-3 p-3 rounded-lg border flex flex-col items-center gap-1 transition-colors duration-300 ${
                      scanFlash ? 'bg-primary/10 border-primary' : 'bg-muted/40'
                    }`}>
                      <BarcodeDisplay value={form.barcode} barHeight={44} fontSize={8} moduleW={1.8} />
                    </div>
                  )}
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
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => setImagePreview(reader.result as string);
                reader.readAsDataURL(file);
              }} />
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
                <div className="md:col-span-2">
                  <Label htmlFor="supplier_name">Supplier Name *</Label>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="supplier_name"
                      autoComplete="off"
                      placeholder="Start typing supplier name..."
                      value={form.supplier_name}
                      onChange={e => handleSupplierNameChange(e.target.value)}
                      onFocus={handleSupplierInputFocus}
                      onBlur={handleSupplierInputBlur}
                      className={cn("pl-9 pr-10", errors.supplier_name && "border-destructive")}
                    />
                    <div className="pointer-events-none absolute right-3 top-3 flex items-center">
                      {supplierLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : selectedSupplier ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : null}
                    </div>
                    {supplierDropdownOpen && (supplierLoading || form.supplier_name.trim()) && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                        <div className="max-h-72 overflow-y-auto py-2">
                          {supplierResults.length > 0 ? (
                            supplierResults.map((supplier) => (
                              <button
                                key={supplier.id}
                                type="button"
                                className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60"
                                onMouseDown={event => {
                                  event.preventDefault();
                                  handleSupplierSelect(supplier);
                                }}
                              >
                                <div className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                                  <Truck className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="truncate font-medium">{highlightSupplierText(supplier.name, form.supplier_name)}</p>
                                    {selectedSupplier?.id === supplier.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                                  </div>
                                  <p className="truncate text-xs text-muted-foreground">{highlightSupplierText(supplier.address, form.supplier_name)}</p>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span>{highlightSupplierText(supplier.phone, form.supplier_name)}</span>
                                    <span>{highlightSupplierText(supplier.email, form.supplier_name)}</span>
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4">
                              <p className="text-sm font-medium">No supplier found</p>
                              <p className="mt-1 text-xs text-muted-foreground">You can keep typing and enter the supplier details manually.</p>
                              <Button
                                type="button"
                                variant="ghost"
                                className="mt-3 h-8 px-2"
                                onMouseDown={event => {
                                  event.preventDefault();
                                  handleAddNewSupplier();
                                }}
                              >
                                Add new supplier
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Start typing to auto-fill supplier details</p>
                  {showDuplicateHint && (
                    <p className="mt-1 text-xs text-amber-600">Existing supplier found. Select it to avoid duplicates.</p>
                  )}
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
                <div className="md:col-span-2">
                  <Label htmlFor="supplier_address">Address *</Label>
                  <Input id="supplier_address" placeholder="e.g. Sandton, Johannesburg" value={form.supplier_address} onChange={e => set("supplier_address", e.target.value)} className={errors.supplier_address ? "border-destructive" : ""} />
                  {addressAutoFilled && (
                    <p className="text-xs text-muted-foreground mt-1">Auto-filled from supplier details.</p>
                  )}
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

      <BarcodeLabelModal
        open={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        productName={form.name || 'Product'}
        barcode={form.barcode}
        price={form.price ? parseFloat(form.price) : undefined}
      />
    </Dialog>
  );
}
