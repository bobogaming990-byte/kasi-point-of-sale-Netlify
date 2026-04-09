import { useCallback, useEffect, useRef, useState } from "react";
import { store, Product, Sale } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionStore } from "@/lib/subscription-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw, Search, ScanBarcode, Package, Printer, Trash2, X,
  CheckCircle, AlertTriangle, ShoppingCart, Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  returnsStore, ReturnRecord, ReturnReason, ReturnCondition, ReturnType, ReturnStatus,
  RETURN_REASONS, RETURN_CONDITIONS, RETURN_TYPES,
} from "@/lib/returns-store";
import { printReturnSlip } from "@/lib/return-printer";
import { auditLog } from "@/lib/audit-logger";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReturnStatus }) {
  if (status === 'completed') return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Completed</Badge>;
  if (status === 'voided')    return <Badge variant="destructive">Voided</Badge>;
  return <Badge variant="outline" className="border-amber-400 text-amber-700">Pending</Badge>;
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString('en-ZA', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return iso; }
}

const BLANK_FORM = {
  barcode:               '',
  product_name:          '',
  product_id:            undefined as number | undefined,
  original_sale_id:      undefined as number | undefined,
  quantity_returned:     1,
  return_type:           'full_return'  as ReturnType,
  reason:                'changed_mind' as ReturnReason,
  reason_notes:          '',
  return_condition:      'resalable'    as ReturnCondition,
  refund_amount:         0,
  exchange_product_name: '',
  restock:               true,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Returns() {
  const { username, role } = useAuth();
  const isAdmin = role === 'admin';

  // ── scan / search state
  const [scanInput,    setScanInput]    = useState('');
  const [searchHits,   setSearchHits]   = useState<Product[]>([]);
  const [saleHits,     setSaleHits]     = useState<{ sale: Sale; item: Sale['items'][number] }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scanFlash,    setScanFlash]    = useState(false);
  const scanRef  = useRef<HTMLInputElement>(null);
  const lastKeyT = useRef<number>(0);

  // ── return form
  const [form, setForm] = useState({ ...BLANK_FORM });

  // ── history
  const [returns,        setReturns]        = useState<ReturnRecord[]>(() => returnsStore.getAll());
  const [historySearch,  setHistorySearch]  = useState('');
  const [statusFilter,   setStatusFilter]   = useState<ReturnStatus | 'all'>('all');

  // ── auto-focus scan field on mount
  useEffect(() => {
    const t = window.setTimeout(() => scanRef.current?.focus(), 200);
    return () => window.clearTimeout(t);
  }, []);

  const refresh = useCallback(() => setReturns(returnsStore.getAll()), []);

  const triggerFlash = () => {
    setScanFlash(true);
    window.setTimeout(() => setScanFlash(false), 700);
  };

  // ── Search logic
  const runSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setSearchHits([]); setSaleHits([]); setShowDropdown(false); return; }

    const allProducts = store.getProducts();
    const allSales    = store.getSales();

    // exact barcode match first
    const byBarcode = allProducts.filter(p => p.barcode === trimmed);
    if (byBarcode.length === 1) {
      applyProduct(byBarcode[0]);
      setScanInput('');
      triggerFlash();
      setShowDropdown(false);
      return;
    }

    // sale ID lookup (numeric)
    if (/^\d+$/.test(trimmed)) {
      const saleId = parseInt(trimmed);
      const sale   = allSales.find(s => s.id === saleId);
      if (sale) {
        const pairs = sale.items.map(item => ({ sale, item }));
        setSaleHits(pairs);
        setSearchHits([]);
        setShowDropdown(true);
        return;
      }
    }

    // name / partial barcode search
    const byName = allProducts.filter(p =>
      p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
      p.barcode.includes(trimmed)
    ).slice(0, 8);
    setSearchHits(byName);
    setSaleHits([]);
    setShowDropdown(byName.length > 0);
  };

  const applyProduct = (p: Product) => {
    setForm(prev => ({
      ...prev,
      barcode:          p.barcode,
      product_name:     p.name,
      product_id:       p.id,
      refund_amount:    parseFloat((p.price * prev.quantity_returned).toFixed(2)),
    }));
  };

  const applySaleItem = (sale: Sale, item: Sale['items'][number]) => {
    const product = store.getProducts().find(p => p.id === item.productId);
    setForm(prev => ({
      ...prev,
      barcode:          product?.barcode ?? '',
      product_name:     item.name,
      product_id:       item.productId,
      original_sale_id: sale.id,
      refund_amount:    parseFloat((item.price * prev.quantity_returned).toFixed(2)),
    }));
    setShowDropdown(false);
    setScanInput('');
    triggerFlash();
  };

  // ── Scanner intercept on scan input (fast = scanner)
  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const gap = now - lastKeyT.current;
    lastKeyT.current = now;

    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch(scanInput);
      return;
    }

    if (gap < 80 && gap > 0 && e.key.length === 1) {
      // scanner speed detected — just accumulate, final Enter will trigger runSearch
    }
  };

  // ── Form helpers
  const setF = <K extends keyof typeof BLANK_FORM>(k: K, v: typeof BLANK_FORM[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const clearForm = () => {
    setForm({ ...BLANK_FORM });
    setScanInput('');
    setSearchHits([]);
    setSaleHits([]);
    setShowDropdown(false);
    window.setTimeout(() => scanRef.current?.focus(), 100);
  };

  // ── Save return
  const handleSave = () => {
    const access = subscriptionStore.checkAccess('returns');
    if (!access.allowed) {
      toast.error(access.reason!, { action: { label: 'Subscribe Now', onClick: () => { window.location.href = '/subscription'; } } });
      return;
    }
    if (!form.product_name.trim()) { toast.error('Product name is required'); return; }
    if (form.quantity_returned < 1) { toast.error('Quantity must be at least 1'); return; }
    if (form.refund_amount < 0)     { toast.error('Refund amount cannot be negative'); return; }
    if (form.return_type === 'exchange' && !form.exchange_product_name.trim()) {
      toast.error('Exchange product name is required for exchanges'); return;
    }

    const shouldRestock = form.restock && form.return_condition === 'resalable';

    // Restock inventory if applicable
    if (shouldRestock && form.product_id) {
      const all     = store.getProducts();
      const product = all.find(p => p.id === form.product_id);
      if (product) {
        const prev = product.stock;
        const updated = all.map(p =>
          p.id === form.product_id ? { ...p, stock: p.stock + form.quantity_returned } : p
        );
        store.setProducts(updated);
        auditLog({
          action_type:   'STOCK_ADJUSTED',
          module_name:   'Returns',
          description:   `Stock increased for "${form.product_name}" from return (qty +${form.quantity_returned})`,
          item_name:     form.product_name,
          reference_id:  String(form.product_id),
          quantity:      form.quantity_returned,
          previous_value: String(prev),
          new_value:      String(prev + form.quantity_returned),
        });
      }
    }

    const record = returnsStore.add({
      barcode:               form.barcode,
      product_name:          form.product_name.trim(),
      product_id:            form.product_id,
      original_sale_id:      form.original_sale_id,
      quantity_returned:     form.quantity_returned,
      return_type:           form.return_type,
      reason:                form.reason,
      reason_notes:          form.reason_notes.trim(),
      return_condition:      form.return_condition,
      refund_amount:         form.refund_amount,
      exchange_product_name: form.exchange_product_name.trim(),
      processed_by:          username,
      status:                'completed',
      restock:               shouldRestock,
    });

    auditLog({
      action_type:  'RETURN_CREATED',
      module_name:  'Returns',
      description:  `Return recorded for "${form.product_name}" — ${RETURN_REASONS[form.reason]}`,
      item_name:    form.product_name,
      reference_id: record.return_number,
      quantity:     form.quantity_returned,
      new_value:    `Refund: R${form.refund_amount.toFixed(2)}, Restocked: ${shouldRestock}`,
    });

    toast.success(`Return ${record.return_number} recorded`);
    refresh();
    clearForm();
  };

  // ── Void return (admin only)
  const handleVoid = (id: number) => {
    const rec = returnsStore.getById(id);
    if (!rec || rec.status === 'voided') return;

    // Reverse stock if item was restocked
    if (rec.restock && rec.product_id) {
      const all     = store.getProducts();
      const product = all.find(p => p.id === rec.product_id);
      if (product) {
        const prev = product.stock;
        const updated = all.map(p =>
          p.id === rec.product_id
            ? { ...p, stock: Math.max(0, p.stock - rec.quantity_returned) }
            : p
        );
        store.setProducts(updated);
        auditLog({
          action_type:   'STOCK_ADJUSTED',
          module_name:   'Returns',
          description:   `Stock reversed for "${rec.product_name}" due to voided return ${rec.return_number}`,
          item_name:     rec.product_name,
          reference_id:  String(rec.product_id),
          quantity:      rec.quantity_returned,
          previous_value: String(prev),
          new_value:      String(Math.max(0, prev - rec.quantity_returned)),
        });
      }
    }

    returnsStore.void(id);
    auditLog({
      action_type:  'RETURN_VOIDED',
      module_name:  'Returns',
      description:  `Return ${rec.return_number} voided by ${username}`,
      item_name:    rec.product_name,
      reference_id: rec.return_number,
    });
    toast.success(`Return ${rec.return_number} voided`);
    refresh();
  };

  // ── Filtered history
  const filteredHistory = (() => {
    let recs = historySearch.trim() ? returnsStore.search(historySearch) : returns;
    if (statusFilter !== 'all') recs = recs.filter(r => r.status === statusFilter);
    return [...recs].reverse();
  })();

  // ── Today's stats
  const today = new Date().toISOString().slice(0, 10);
  const todayReturns  = returns.filter(r => r.created_at.startsWith(today) && r.status !== 'voided');
  const todayRefund   = todayReturns.reduce((s, r) => s + r.refund_amount, 0);
  const todayRestock  = todayReturns.filter(r => r.restock).length;
  const todayHeld     = todayReturns.filter(r => !r.restock).length;

  // ── condition changes restock auto-logic
  const handleConditionChange = (cond: ReturnCondition) => {
    setF('return_condition', cond);
    if (cond !== 'resalable') setF('restock', false);
    else setF('restock', true);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-primary" /> Returns Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Record, scan, and process product returns</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Returns Today",     value: todayReturns.length, icon: RotateCcw,    color: "text-blue-600" },
          { label: "Refunded Today",    value: `R ${todayRefund.toFixed(2)}`, icon: CheckCircle, color: "text-green-600" },
          { label: "Restocked Today",   value: todayRestock,        icon: Package,      color: "text-primary" },
          { label: "Held for Review",   value: todayHeld,           icon: AlertTriangle,color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label} className="border shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 shrink-0 ${s.color}`} />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Process Return ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border shadow-none">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <ScanBarcode className="w-4 h-4" /> Process New Return
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">

              {/* Scan / Search */}
              <div>
                <Label htmlFor="scan-input" className="text-sm font-medium">Scan Barcode or Search</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scan-input"
                    ref={scanRef}
                    placeholder="Scan item, enter product name, or receipt #…"
                    value={scanInput}
                    onChange={e => { setScanInput(e.target.value); runSearch(e.target.value); }}
                    onKeyDown={handleScanKeyDown}
                    onBlur={() => window.setTimeout(() => setShowDropdown(false), 150)}
                    onFocus={() => scanInput.trim() && setShowDropdown(true)}
                    className={`pl-9 transition-all duration-150 ${scanFlash ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    autoComplete="off"
                  />
                  {scanInput && (
                    <button onClick={() => { setScanInput(''); setShowDropdown(false); }}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Scan item or search by name / receipt number to begin return
                </p>

                {/* Results dropdown */}
                {showDropdown && (searchHits.length > 0 || saleHits.length > 0) && (
                  <div className="mt-1 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                    {searchHits.map(p => (
                      <button key={p.id} type="button" onMouseDown={() => { applyProduct(p); setScanInput(''); setShowDropdown(false); triggerFlash(); }}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors">
                        <Package className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.barcode || 'No barcode'} · R {p.price.toFixed(2)} · Stock: {p.stock}</p>
                        </div>
                      </button>
                    ))}
                    {saleHits.map(({ sale, item }) => (
                      <button key={`${sale.id}-${item.productId}`} type="button"
                        onMouseDown={() => applySaleItem(sale, item)}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors">
                        <ShoppingCart className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Sale #{sale.id} · {sale.date} · R {item.price.toFixed(2)} × {item.quantity}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Return form */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="r-name">Product Name *</Label>
                  <Input id="r-name" value={form.product_name}
                    onChange={e => setF('product_name', e.target.value)}
                    placeholder="e.g. Coca-Cola 2L" className="mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="r-barcode">Barcode / SKU</Label>
                    <Input id="r-barcode" value={form.barcode}
                      onChange={e => setF('barcode', e.target.value)}
                      className="font-mono mt-1" placeholder="Optional" />
                  </div>
                  <div>
                    <Label htmlFor="r-sale">Orig. Sale #</Label>
                    <Input id="r-sale" type="number" min="1"
                      value={form.original_sale_id ?? ''}
                      onChange={e => setF('original_sale_id', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="mt-1" placeholder="Optional" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="r-qty">Qty Returned *</Label>
                    <Input id="r-qty" type="number" min="1"
                      value={form.quantity_returned}
                      onChange={e => {
                        const q = Math.max(1, parseInt(e.target.value) || 1);
                        setF('quantity_returned', q);
                      }}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="r-refund">Refund Amount (R)</Label>
                    <Input id="r-refund" type="number" step="0.01" min="0"
                      value={form.refund_amount}
                      onChange={e => setF('refund_amount', parseFloat(e.target.value) || 0)}
                      className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Return Type</Label>
                  <Select value={form.return_type} onValueChange={v => setF('return_type', v as ReturnType)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(RETURN_TYPES) as [ReturnType, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Return Reason</Label>
                  <Select value={form.reason} onValueChange={v => setF('reason', v as ReturnReason)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(RETURN_REASONS) as [ReturnReason, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Item Condition</Label>
                  <Select value={form.return_condition} onValueChange={v => handleConditionChange(v as ReturnCondition)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(RETURN_CONDITIONS) as [ReturnCondition, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.return_type === 'exchange' && (
                  <div>
                    <Label htmlFor="r-exchange">Exchange For</Label>
                    <Input id="r-exchange" value={form.exchange_product_name}
                      onChange={e => setF('exchange_product_name', e.target.value)}
                      placeholder="Replacement product name" className="mt-1" />
                  </div>
                )}

                <div>
                  <Label htmlFor="r-notes">Notes</Label>
                  <Textarea id="r-notes" rows={2} value={form.reason_notes}
                    onChange={e => setF('reason_notes', e.target.value)}
                    placeholder="Additional details or customer comments…" className="mt-1" />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="r-restock" checked={form.restock}
                    disabled={form.return_condition !== 'resalable'}
                    onCheckedChange={v => setF('restock', Boolean(v))} />
                  <Label htmlFor="r-restock" className={`cursor-pointer ${form.return_condition !== 'resalable' ? 'text-muted-foreground' : ''}`}>
                    Add quantity back to stock
                  </Label>
                </div>
                {form.return_condition !== 'resalable' && (
                  <p className="text-xs text-amber-600">Item condition is not resalable — will not be restocked automatically.</p>
                )}
              </div>

              <Separator />

              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSave} className="flex-1 min-w-[130px]">
                  <Save className="w-4 h-4 mr-1.5" /> Save Return
                </Button>
                <Button variant="outline" onClick={clearForm}>
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Return History ── */}
        <div className="lg:col-span-3">
          <Card className="border shadow-none">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Return History
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search returns…" value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ReturnStatus | 'all')}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {['Return #','Date','Product','Qty','Reason','Refund','Status','Actions'].map(h => (
                          <th key={h} className="p-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No returns recorded yet</p>
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map(r => (
                          <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 font-mono text-xs font-medium">{r.return_number}</td>
                            <td className="p-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.created_at)}</td>
                            <td className="p-2.5 font-medium max-w-[140px]">
                              <p className="truncate" title={r.product_name}>{r.product_name}</p>
                              {r.barcode && <p className="text-xs font-mono text-muted-foreground">{r.barcode}</p>}
                            </td>
                            <td className="p-2.5 text-center font-semibold">{r.quantity_returned}</td>
                            <td className="p-2.5 text-xs">{RETURN_REASONS[r.reason]}</td>
                            <td className="p-2.5 text-right font-medium whitespace-nowrap">R {r.refund_amount.toFixed(2)}</td>
                            <td className="p-2.5"><StatusBadge status={r.status} /></td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <button onClick={() => printReturnSlip(r)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                  title="Print return slip (thermal)">
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => printReturnSlip(r, 'a4')}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                  title="Print A4 return report">
                                  <Printer className="w-3.5 h-3.5 opacity-60" />
                                </button>
                                {isAdmin && r.status !== 'voided' && (
                                  <button onClick={() => handleVoid(r.id)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                                    title="Void this return (admin only)">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredHistory.length > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}
                  {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
