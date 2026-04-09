import { barcodeSVG } from "@/lib/barcode-utils";
import { cn } from "@/lib/utils";

interface Props {
  value:      string;
  barHeight?: number;
  fontSize?:  number;
  moduleW?:   number;
  className?: string;
}

export default function BarcodeDisplay({
  value,
  barHeight = 60,
  fontSize  = 10,
  moduleW   = 2,
  className,
}: Props) {
  if (!value) return null;
  const svg = barcodeSVG(value, barHeight, fontSize, moduleW);
  if (!svg) return null;

  return (
    <div
      className={cn("flex justify-center overflow-hidden", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
