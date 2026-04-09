import { useState, useRef } from "react";
import { companyStore, CompanyProfile, EMPTY_PROFILE, resizeImage } from "@/lib/company-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Upload, X, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BusinessProfileModal({ open, onClose }: Props) {
  const [form, setForm] = useState<CompanyProfile>(() => companyStore.get());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof CompanyProfile, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    setUploading(true);
    try {
      const b64 = await resizeImage(file, 280);
      setForm(prev => ({ ...prev, logo: b64 }));
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
    toast.success('Business profile saved');
    onClose();
  };

  const handleReset = () => {
    if (!window.confirm('Clear the business profile?')) return;
    setForm({ ...EMPTY_PROFILE });
    companyStore.set({ ...EMPTY_PROFILE });
    toast.success('Profile cleared');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Business Profile
          </DialogTitle>
          <DialogDescription>
            These details appear on printed reports. Keep them accurate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Logo */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
              {form.logo ? (
                <img src={form.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Company Logo</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG. Max 2 MB. Will be resized to 280px.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {uploading ? 'Processing…' : 'Upload'}
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

          {/* Core details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Business / Shop Name <span className="text-destructive">*</span></Label>
              <Input value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="e.g. Mthembu's Spaza Shop" />
            </div>
            <div className="space-y-1.5">
              <Label>Trading Name</Label>
              <Input value={form.tradingName} onChange={e => set('tradingName', e.target.value)} placeholder="If different from business name" />
            </div>
            <div className="space-y-1.5">
              <Label>Registration Number</Label>
              <Input value={form.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>VAT Number</Label>
              <Input value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 011 123 4567" />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="shop@email.co.za" />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.myshop.co.za (optional)" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Manager / Owner name" />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Physical Address</Label>
              <Input value={form.physicalAddress} onChange={e => set('physicalAddress', e.target.value)} placeholder="12 Main Street, Soweto, 1800" />
            </div>
            <div className="space-y-1.5">
              <Label>Postal Address</Label>
              <Input value={form.postalAddress} onChange={e => set('postalAddress', e.target.value)} placeholder="P.O. Box or same as physical" />
            </div>
          </div>

          {/* Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Branch / Store Name</Label>
              <Input value={form.branchName} onChange={e => set('branchName', e.target.value)} placeholder="Main Branch (optional)" />
            </div>
            <div className="space-y-1.5">
              <Label>Branch Code / Store ID</Label>
              <Input value={form.branchCode} onChange={e => set('branchCode', e.target.value)} placeholder="e.g. BR001 (optional)" />
            </div>
          </div>

          {/* Slogan */}
          <div className="space-y-1.5">
            <Label>Slogan / Tagline</Label>
            <Input value={form.slogan} onChange={e => set('slogan', e.target.value)} placeholder="e.g. Your neighbourhood store (optional)" />
          </div>

          {/* Receipt note */}
          <div className="space-y-1.5">
            <Label>Receipt Thank-You Message</Label>
            <Input value={form.receiptNote} onChange={e => set('receiptNote', e.target.value)} placeholder="e.g. Thank you for shopping with us!" />
          </div>

          {/* Footer note */}
          <div className="space-y-1.5">
            <Label>Report Footer Note</Label>
            <Input value={form.footerNote} onChange={e => set('footerNote', e.target.value)} placeholder="e.g. All prices include VAT. (shown on A4 reports)" />
          </div>

          {/* Powered by toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Show "Powered by Kasi P.O.S"</p>
              <p className="text-xs text-muted-foreground">Appears as a small line at the bottom of receipts and reports</p>
            </div>
            <Switch checked={form.showPoweredBy} onCheckedChange={v => set('showPoweredBy', v)} />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2 border-t">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={handleReset}>
              Clear Profile
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-1.5" /> Save Profile
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
