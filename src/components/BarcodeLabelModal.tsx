import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Tag } from "lucide-react";
import { toast } from "sonner";
import { printBarcodeLabel, LabelPrintParams } from "@/lib/barcode-utils";
import BarcodeDisplay from "@/components/BarcodeDisplay";
import { companyStore } from "@/lib/company-store";
import { cn } from "@/lib/utils";

interface Props {
  open:        boolean;
  onClose:     () => void;
  productName: string;
  barcode:     string;
  price?:      number;
  category?:   string;
}

export default function BarcodeLabelModal({ open, onClose, productName, barcode, price, category }: Props) {
  const [mode,   setMode]   = useState<'thermal' | 'a4'>('thermal');
  const [copies, setCopies] = useState(mode === 'a4' ? 24 : 1);
  const shop = companyStore.get().businessName || 'Kasi P.O.S';

  const handleModeChange = (m: 'thermal' | 'a4') => {
    setMode(m);
    setCopies(m === 'a4' ? 24 : 1);
  };

  const handlePrint = () => {
    if (!barcode) { toast.error('No barcode to print'); return; }
    const params: LabelPrintParams = {
      productName,
      barcode,
      price,
      category,
      copies,
    };
    printBarcodeLabel(params, mode);
    toast.success(`Printing ${mode === 'a4' ? `${copies} label(s) on A4` : 'thermal label'}…`);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" /> Print Barcode Label
          </DialogTitle>
          <DialogDescription>Preview and print a label for this product or service.</DialogDescription>
        </DialogHeader>

        {/* Mode selector */}
        <div className="flex rounded-lg bg-muted p-1 gap-1 text-sm">
          {(['thermal', 'a4'] as const).map(m => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={cn(
                'flex-1 py-1.5 rounded-md font-medium transition-colors',
                mode === m
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'thermal' ? '🖨️ Thermal (80mm)' : '📄 A4 Sheet'}
            </button>
          ))}
        </div>

        {/* Label preview */}
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 text-center font-mono text-sm shadow-inner">
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">{shop}</div>
          <div className="font-extrabold text-gray-900 text-sm leading-tight mb-0.5">{productName || '—'}</div>
          {category && <div className="text-[9px] text-gray-400 mb-0.5">{category}</div>}
          {price != null && <div className="font-black text-base mb-1">R {price.toFixed(2)}</div>}
          {barcode ? (
            <div className="flex justify-center my-1">
              <BarcodeDisplay value={barcode} barHeight={55} fontSize={9} moduleW={1.8} />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-4">No barcode</div>
          )}
          <div className="text-[9px] tracking-widest text-gray-500 mt-1 font-mono">{barcode}</div>
        </div>

        {/* Copies (A4 only) */}
        {mode === 'a4' && (
          <div className="flex items-center gap-3">
            <Label className="w-24 shrink-0 text-sm">Copies</Label>
            <Input
              type="number" min={1} max={72} value={copies}
              onChange={e => setCopies(Math.max(1, Math.min(72, parseInt(e.target.value) || 1)))}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">Max 72 labels per print job</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePrint} disabled={!barcode}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print {mode === 'a4' ? `${copies} Labels` : 'Label'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
