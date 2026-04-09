import { useState, useRef } from "react";
import { companyStore, CompanyProfile, EMPTY_PROFILE, resizeImage } from "@/lib/company-store";
import { storeCode } from "@/lib/store-code";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Upload, X, Save, RotateCcw, Palette, Monitor,
  Receipt, FileText, Phone, Mail, Globe, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Live receipt preview ─────────────────────────────────────────────────────

function ThermalPreview({ form }: { form: CompanyProfile }) {
  const name = form.businessName || 'Your Shop Name';
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 font-mono text-[10px] leading-snug text-gray-900 max-w-[220px] mx-auto shadow-inner">
      {/* Header */}
      {form.logo && (
        <div className="flex justify-center mb-1">
          <img src={form.logo} alt="logo" className="max-h-10 max-w-[80px] object-contain" />
        </div>
      )}
      <div className="text-center font-bold text-[12px]">{name}</div>
      {form.tradingName && <div className="text-center text-[9px] text-gray-500">{form.tradingName}</div>}
      {form.slogan && <div className="text-center text-[9px] italic text-gray-400">{form.slogan}</div>}
      {form.physicalAddress && <div className="text-center text-[9px]">{form.physicalAddress}</div>}
      {(form.phone || form.email) && (
        <div className="text-center text-[9px]">{[form.phone, form.email].filter(Boolean).join(' | ')}</div>
      )}

      <div className="border-t border-dashed border-gray-400 my-1" />
      <div className="text-center font-bold text-[10px]">SALES RECEIPT</div>
      <div className="border-t border-dashed border-gray-400 my-1" />

      <div className="flex justify-between"><span>Date:</span><span>30 Mar 2026 08:00</span></div>
      <div className="flex justify-between"><span>Receipt #:</span><span>R000001</span></div>
      <div className="flex justify-between"><span>Cashier:</span><span>Admin</span></div>
      <div className="border-t border-dashed border-gray-400 my-1" />
      <div className="text-[9px]">Coca-Cola 2L</div>
      <div className="flex justify-between text-[9px] pl-2 text-gray-500"><span>1 x R 22.99</span><span>R 22.99</span></div>
      <div className="text-[9px]">Albany Bread</div>
      <div className="flex justify-between text-[9px] pl-2 text-gray-500"><span>2 x R 18.99</span><span>R 37.98</span></div>
      <div className="border-t border-gray-400 my-1" />
      <div className="flex justify-between"><span>Subtotal:</span><span>R 60.97</span></div>
      <div className="flex justify-between font-bold"><span>TOTAL:</span><span>R 60.97</span></div>
      <div className="border-t border-dashed border-gray-400 my-1" />

      {/* Footer */}
      <div className="text-center text-[9px]">{name}</div>
      {form.physicalAddress && <div className="text-center text-[8px] text-gray-500">{form.physicalAddress}</div>}
      <div className="text-center text-[9px] italic">
        {form.receiptNote || 'Thank you for your business!'}
      </div>
      {form.showPoweredBy !== false && (
        <div className="text-center text-[8px] text-gray-400 mt-1">Powered by Kasi P.O.S</div>
      )}
    </div>
  );
}

function A4HeaderPreview({ form }: { form: CompanyProfile }) {
  const name = form.businessName || 'Your Business Name';
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="bg-white border rounded-lg p-4 shadow-inner">
      <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3 mb-3 gap-3">
        <div className="flex items-center gap-3">
          {form.logo ? (
            <img src={form.logo} alt="logo" className="w-12 h-12 object-contain rounded" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xl flex-shrink-0">{initial}</div>
          )}
          <div>
            <div className="font-extrabold text-gray-900 text-sm leading-tight">{name}</div>
            {form.tradingName && <div className="text-xs text-gray-500">{form.tradingName}</div>}
            {form.slogan && <div className="text-xs italic text-gray-400">{form.slogan}</div>}
            {form.branchName && <div className="text-xs text-gray-400">Branch: {form.branchName}{form.branchCode ? ` (${form.branchCode})` : ''}</div>}
          </div>
        </div>
        <div className="text-right text-xs text-gray-500 flex-shrink-0">
          <div className="font-bold text-gray-800 text-sm mb-0.5">Activity Report</div>
          <div>Period: Today</div>
          <div>Generated: 30 Mar 2026</div>
          {form.showPoweredBy !== false && <div className="text-gray-300 text-[9px] mt-1">Powered by Kasi P.O.S</div>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['Total Sales','5'],['Revenue','R 1,240.00'],['Events','28']].map(([l,v]) => (
          <div key={l} className="border rounded p-2">
            <div className="text-[9px] text-gray-400 uppercase font-semibold">{l}</div>
            <div className="font-extrabold text-gray-900 text-sm">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section heading helper ────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BrandingSettings() {
  const { role, username } = useAuth();
  const [form, setForm] = useState<CompanyProfile>(() => companyStore.get());
  const [uploading, setUploading] = useState(false);
  const [previewTab, setPreviewTab] = useState<'receipt' | 'report'>('receipt');
  const [showCode,   setShowCode]   = useState(false);
  const [storeCodeStr, setStoreCodeStr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (role !== 'admin') return <Navigate to="/dashboard" replace />;

  const set = (field: keyof CompanyProfile, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    setUploading(true);
    try {
      const b64 = await resizeImage(file, 300);
      setForm(prev => ({ ...prev, logo: b64 }));
      toast.success('Logo uploaded');
    } catch {
      toast.error('Could not process image');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!form.businessName.trim()) { toast.error('Business name is required'); return; }
    companyStore.set(form);
    toast.success('Branding saved — all receipts and reports will use these details');
  };

  const handleReset = () => {
    if (!window.confirm('Clear all branding settings? This cannot be undone.')) return;
    const cleared = { ...EMPTY_PROFILE };
    setForm(cleared);
    companyStore.set(cleared);
    toast.success('Branding cleared');
  };

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" /> Business Branding
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your shop identity — used on all printed receipts and reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Branding
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Left: Form ── */}
        <div className="xl:col-span-3 space-y-6">

          {/* Logo */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Logo & Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo upload */}
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                  {form.logo
                    ? <img src={form.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                    : <Building2 className="w-10 h-10 text-muted-foreground/30" />
                  }
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Shop / Company Logo</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, SVG — max 2 MB. Appears on receipts and reports.</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> {uploading ? 'Processing…' : 'Upload Logo'}
                    </Button>
                    {form.logo && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => set('logo', '')}>
                        <X className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>

              <Separator />

              {/* Core names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Business / Shop Name <span className="text-destructive">*</span></Label>
                  <Input value={form.businessName} onChange={e => set('businessName', e.target.value)}
                    placeholder="e.g. Mthembu's Spaza Shop" />
                </div>
                <div className="space-y-1.5">
                  <Label>Trading Name</Label>
                  <Input value={form.tradingName} onChange={e => set('tradingName', e.target.value)}
                    placeholder="If different from business name" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Slogan / Tagline</Label>
                  <Input value={form.slogan} onChange={e => set('slogan', e.target.value)}
                    placeholder="e.g. Your neighbourhood store — fresh every day" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" /> Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone Number</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="011 123 4567" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email Address</Label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="shop@email.co.za" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Website</Label>
                <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.myshop.co.za" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Manager / Owner name" />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Address & Branch
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Physical Address</Label>
                <Input value={form.physicalAddress} onChange={e => set('physicalAddress', e.target.value)}
                  placeholder="12 Main Street, Soweto, 1800" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Postal Address</Label>
                <Input value={form.postalAddress} onChange={e => set('postalAddress', e.target.value)}
                  placeholder="P.O. Box or same as physical" />
              </div>
              <div className="space-y-1.5">
                <Label>Branch / Store Name</Label>
                <Input value={form.branchName} onChange={e => set('branchName', e.target.value)} placeholder="Main Branch (optional)" />
              </div>
              <div className="space-y-1.5">
                <Label>Branch Code / Store ID</Label>
                <Input value={form.branchCode} onChange={e => set('branchCode', e.target.value)} placeholder="BR001 (optional)" />
              </div>
            </CardContent>
          </Card>

          {/* Legal */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Legal & Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Registration Number</Label>
                <Input value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>VAT Number</Label>
                <Input value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="Optional" />
              </div>
            </CardContent>
          </Card>

          {/* Print settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" /> Print Messaging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Receipt Thank-You Message</Label>
                <Input value={form.receiptNote} onChange={e => set('receiptNote', e.target.value)}
                  placeholder="e.g. Thank you for shopping with us! Come again." />
                <p className="text-xs text-muted-foreground">Shown at the bottom of every thermal receipt</p>
              </div>
              <div className="space-y-1.5">
                <Label>Report Footer Note</Label>
                <Input value={form.footerNote} onChange={e => set('footerNote', e.target.value)}
                  placeholder="e.g. All prices include VAT. E&OE." />
                <p className="text-xs text-muted-foreground">Shown at the bottom of A4 activity reports</p>
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-lg border p-3.5">
                <div>
                  <p className="text-sm font-medium">Show "Powered by Kasi P.O.S"</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Adds a small platform credit at the very bottom of receipts and reports
                  </p>
                </div>
                <Switch
                  checked={form.showPoweredBy !== false}
                  onCheckedChange={v => set('showPoweredBy', v)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm sticky top-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Live Preview</CardTitle>
                <div className="flex rounded-lg bg-muted p-0.5 gap-0.5 text-xs">
                  {(['receipt', 'report'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setPreviewTab(t)}
                      className={cn(
                        'px-3 py-1 rounded-md font-medium transition-colors capitalize',
                        previewTab === t
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t === 'receipt' ? '🧾 Thermal' : '📄 A4 Report'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {previewTab === 'receipt'
                ? <ThermalPreview form={form} />
                : <A4HeaderPreview form={form} />
              }
              <p className="text-xs text-muted-foreground text-center mt-3">
                Preview updates as you type — save to apply to all prints
              </p>
            </CardContent>
          </Card>

          {/* Quick tips */}
          <Card className="border-0 shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-3 space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground text-sm">Print branding rules</p>
              <ul className="space-y-1.5 list-disc pl-4">
                <li>Your shop name &amp; logo are the <strong>main identity</strong> on every slip</li>
                <li>Kasi P.O.S only appears as a tiny optional mark at the very bottom</li>
                <li>Changes apply instantly to all future prints — no restart needed</li>
                <li>Logo is stored locally in the browser — re-upload if you switch devices</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Multi-Device / Store Code ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" /> Multi-Device Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate a <strong>Store Code</strong> to activate additional cashier machines (tills) using the same company account.
            Paste the code on the new device's setup screen under <em>Join Existing Store</em>.
          </p>
          {!showCode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setStoreCodeStr(storeCode.generate(username)); setShowCode(true); }}
            >
              Generate Store Code
            </Button>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Store Code (copy all of it):</label>
              <textarea
                readOnly
                value={storeCodeStr}
                className="w-full font-mono text-xs rounded-md border border-border bg-muted/40 p-3 min-h-[80px] resize-none select-all"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(storeCodeStr); toast.success('Store code copied to clipboard'); }}>
                  Copy Code
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCode(false)}>Hide</Button>
              </div>
              <p className="text-xs text-amber-600 font-medium">
                ⚠ Keep this code private — it contains all staff credentials.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky bottom save bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border shadow-sm">
        <p className="text-sm text-muted-foreground">
          {companyStore.hasProfile() ? '✓ Branding is configured' : 'No branding saved yet'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset All
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Branding
          </Button>
        </div>
      </div>
    </div>
  );
}
