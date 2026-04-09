// Return slip printer for Kasi P.O.S — thermal 80mm and A4 formats

import { ReturnRecord, RETURN_REASONS, RETURN_CONDITIONS, RETURN_TYPES } from '@/lib/returns-store';
import { companyStore } from '@/lib/company-store';

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

/** Fires an iframe-based print of a return slip (thermal or A4). */
export function printReturnSlip(record: ReturnRecord, mode: 'thermal' | 'a4' = 'thermal'): void {
  try {
    const html = mode === 'a4' ? buildA4HTML(record) : buildThermalHTML(record);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    iframe.onload = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
      finally { setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* removed */ } }, 2000); }
    };
  } catch { /* printing must never crash the app */ }
}

// ─── Thermal 80mm ─────────────────────────────────────────────────────────────

function buildThermalHTML(r: ReturnRecord): string {
  const p       = companyStore.get();
  const shop    = p.businessName || 'Kasi P.O.S';
  const powered = p.showPoweredBy !== false;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Return Slip ${esc(r.return_number)}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: 80mm auto; margin: 3mm; }
body   { font-family: 'Courier New', monospace; font-size: 9pt; color: #000; width: 74mm; }
.c     { text-align: center; }
.b     { font-weight: 700; }
.sm    { font-size: 7.5pt; }
hr     { border: none; border-top: 1px dashed #555; margin: 3mm 0; }
.row   { display: flex; justify-content: space-between; margin: 0.5mm 0; }
.lbl   { color: #555; }
.badge { display: inline-block; border: 1px solid #000; padding: 0 3px; font-size: 7pt; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="c b" style="font-size:12pt">${esc(shop)}</div>
${p.slogan    ? `<div class="c sm">${esc(p.slogan)}</div>` : ''}
${p.physicalAddress ? `<div class="c sm">${esc(p.physicalAddress)}</div>` : ''}
${p.phone           ? `<div class="c sm">Tel: ${esc(p.phone)}</div>` : ''}
<hr/>
<div class="c b" style="font-size:13pt;letter-spacing:1px">RETURN SLIP</div>
<div class="c sm">${esc(r.return_number)}</div>
<div class="c sm">${fmtDate(r.created_at)}</div>
<hr/>
<div class="row"><span class="lbl">Processed by:</span><span class="b">${esc(r.processed_by)}</span></div>
${r.original_sale_id ? `<div class="row"><span class="lbl">Orig. Sale #:</span><span>${r.original_sale_id}</span></div>` : ''}
<hr/>
<div class="b" style="margin-bottom:1mm">Item Returned</div>
<div class="b">${esc(r.product_name)}</div>
${r.barcode ? `<div class="sm">Barcode: ${esc(r.barcode)}</div>` : ''}
<div class="row"><span class="lbl">Qty:</span><span class="b">${r.quantity_returned}</span></div>
<div class="row"><span class="lbl">Type:</span><span>${esc(RETURN_TYPES[r.return_type])}</span></div>
<div class="row"><span class="lbl">Reason:</span><span>${esc(RETURN_REASONS[r.reason])}</span></div>
<div class="row"><span class="lbl">Condition:</span><span>${esc(RETURN_CONDITIONS[r.return_condition])}</span></div>
${r.reason_notes ? `<div class="sm" style="margin-top:1mm">Notes: ${esc(r.reason_notes)}</div>` : ''}
<hr/>
<div class="row b"><span>Refund Amount:</span><span>R ${r.refund_amount.toFixed(2)}</span></div>
${r.exchange_product_name ? `<div class="row"><span class="lbl">Exchange for:</span><span>${esc(r.exchange_product_name)}</span></div>` : ''}
<div class="row"><span class="lbl">Restocked:</span><span>${r.restock ? 'Yes' : 'No'}</span></div>
<hr/>
<div class="c sm">Status: <span class="badge">${r.status.toUpperCase()}</span></div>
${p.receiptNote ? `<div class="c sm" style="margin-top:2mm">${esc(p.receiptNote)}</div>` : ''}
${powered ? '<div class="c sm" style="margin-top:3mm;color:#555">Powered by Kasi P.O.S</div>' : ''}
<script>window.addEventListener('load',()=>window.print())</script>
</body></html>`;
}

// ─── A4 ───────────────────────────────────────────────────────────────────────

function buildA4HTML(r: ReturnRecord): string {
  const p       = companyStore.get();
  const shop    = p.businessName || 'Kasi P.O.S';
  const powered = p.showPoweredBy !== false;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Return Report ${esc(r.return_number)}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
@page  { size: A4 portrait; margin: 20mm; }
body   { font-family: Arial, sans-serif; font-size: 10pt; color: #000; }
.hdr   { border-bottom: 2px solid #000; padding-bottom: 6mm; margin-bottom: 6mm; display: flex; justify-content: space-between; align-items: flex-start; }
.shop  { font-size: 18pt; font-weight: 900; }
.sub   { font-size: 9pt; color: #555; margin-top: 1mm; }
.title { font-size: 16pt; font-weight: 700; text-align: right; }
.rno   { font-size: 9pt; color: #555; text-align: right; }
table  { width: 100%; border-collapse: collapse; margin: 4mm 0; }
th,td  { border: 1px solid #ccc; padding: 2mm 3mm; text-align: left; }
th     { background: #f5f5f5; font-weight: 700; }
.sec-t { font-weight: 700; font-size: 11pt; border-bottom: 1px solid #ddd; padding-bottom: 1mm; margin: 5mm 0 3mm; }
.badge { border: 1px solid #000; padding: 1px 6px; font-size: 8pt; display: inline-block; }
.foot  { margin-top: 10mm; border-top: 1px solid #ccc; padding-top: 4mm; font-size: 8pt; color: #777; display: flex; justify-content: space-between; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="shop">${esc(shop)}</div>
    ${p.slogan  ? `<div class="sub">${esc(p.slogan)}</div>` : ''}
    ${p.physicalAddress ? `<div class="sub">${esc(p.physicalAddress)}</div>` : ''}
    ${p.phone           ? `<div class="sub">Tel: ${esc(p.phone)}</div>` : ''}
  </div>
  <div>
    <div class="title">RETURN SLIP</div>
    <div class="rno">${esc(r.return_number)}</div>
    <div class="rno">${fmtDate(r.created_at)}</div>
  </div>
</div>

<div class="sec-t">Return Summary</div>
<table>
  <tr><th>Field</th><th>Details</th></tr>
  <tr><td>Return Number</td><td><strong>${esc(r.return_number)}</strong></td></tr>
  <tr><td>Date &amp; Time</td><td>${fmtDate(r.created_at)}</td></tr>
  <tr><td>Processed By</td><td>${esc(r.processed_by)}</td></tr>
  ${r.original_sale_id ? `<tr><td>Original Sale #</td><td>${r.original_sale_id}</td></tr>` : ''}
  <tr><td>Status</td><td><span class="badge">${r.status.toUpperCase()}</span></td></tr>
</table>

<div class="sec-t">Returned Item</div>
<table>
  <tr><th>Field</th><th>Details</th></tr>
  <tr><td>Product Name</td><td><strong>${esc(r.product_name)}</strong></td></tr>
  ${r.barcode ? `<tr><td>Barcode / SKU</td><td>${esc(r.barcode)}</td></tr>` : ''}
  <tr><td>Quantity Returned</td><td>${r.quantity_returned}</td></tr>
  <tr><td>Return Type</td><td>${esc(RETURN_TYPES[r.return_type])}</td></tr>
  <tr><td>Return Reason</td><td>${esc(RETURN_REASONS[r.reason])}</td></tr>
  <tr><td>Item Condition</td><td>${esc(RETURN_CONDITIONS[r.return_condition])}</td></tr>
  ${r.reason_notes ? `<tr><td>Notes</td><td>${esc(r.reason_notes)}</td></tr>` : ''}
</table>

<div class="sec-t">Outcome</div>
<table>
  <tr><th>Field</th><th>Details</th></tr>
  <tr><td>Refund Amount</td><td><strong>R ${r.refund_amount.toFixed(2)}</strong></td></tr>
  ${r.exchange_product_name ? `<tr><td>Exchange Product</td><td>${esc(r.exchange_product_name)}</td></tr>` : ''}
  <tr><td>Item Restocked</td><td>${r.restock ? '&#10003; Yes — added back to inventory' : '&#10007; No — held for admin review'}</td></tr>
</table>

<div class="foot">
  <span>Printed: ${new Date().toLocaleString('en-ZA')}</span>
  ${powered ? '<span>Powered by Kasi P.O.S</span>' : `<span>${esc(shop)}</span>`}
</div>
<script>window.addEventListener('load',()=>window.print())</script>
</body></html>`;
}
