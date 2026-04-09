// 80mm thermal receipt printer utility for Kasi P.O.S
// All receipts use the active company/shop profile — never hardcoded branding.

import { companyStore, CompanyProfile } from '@/lib/company-store';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface SaleReceiptParams {
  saleId: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  vatEnabled: boolean;
  cashier: string;
}

export interface PrepaidReceiptParams {
  orderno: string;
  type: 'airtime' | 'data';
  networkLabel: string;
  amount: string;
  msisdn: string;
  pin?: string;
  cashier: string;
  status: 'success' | 'pending' | 'failed';
  mock?: boolean;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function now(): string {
  return new Date().toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function dashedLine(): string {
  return `<div class="divider">- - - - - - - - - - - - - - - - - - - - -</div>`;
}

function solidLine(): string {
  return `<div class="divider solid">─────────────────────────────────────</div>`;
}

function row(left: string, right: string, bold = false): string {
  return `<div class="row${bold ? ' bold' : ''}"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
}

// ─── Shared receipt HTML shell ────────────────────────────────────────────────

function buildShell(profile: CompanyProfile, title: string, body: string): string {
  const hasProfile  = Boolean(profile.businessName.trim());
  const shopName    = hasProfile ? profile.businessName : 'Receipt';
  const tradingLine = profile.tradingName ? `<div class="center small">${esc(profile.tradingName)}</div>` : '';
  const addrLine    = profile.physicalAddress ? `<div class="center small">${esc(profile.physicalAddress)}</div>` : '';
  const contactLine = [profile.phone, profile.email].filter(Boolean).map(esc).join('  |  ');

  const sloganLine = profile.slogan ? `<div class="center small italic">${esc(profile.slogan)}</div>` : '';
  const logoHtml = profile.logo
    ? `<div class="center"><img src="${profile.logo}" class="logo" alt="logo" /></div>`
    : '';

  const receiptThankYou = profile.receiptNote
    ? `<div class="center italic">${esc(profile.receiptNote)}</div>`
    : `<div class="center italic">Thank you for your business!</div>`;

  const footer = hasProfile
    ? `<div class="center small">${esc(shopName)}</div>
       ${addrLine}
       ${contactLine ? `<div class="center small">${contactLine}</div>` : ''}
       ${profile.website ? `<div class="center small">${esc(profile.website)}</div>` : ''}
       ${receiptThankYou}
       ${profile.footerNote ? `<div class="center small">${esc(profile.footerNote)}</div>` : ''}`
    : `${receiptThankYou}`;

  const poweredBy = (profile.showPoweredBy !== false)
    ? `<div class="powered">Powered by Kasi P.O.S</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(shopName)} — ${esc(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: 80mm auto; margin: 2mm 3mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: 72mm;
    }
    .center   { text-align: center; }
    .small    { font-size: 8pt; }
    .bold     { font-weight: 700; }
    .italic   { font-style: italic; }
    .large    { font-size: 11pt; font-weight: 800; }
    .xlarge   { font-size: 13pt; font-weight: 900; letter-spacing: 0.5px; }
    .logo     { max-width: 40mm; max-height: 20mm; object-fit: contain; margin: 3px 0; }
    .divider  { text-align: center; color: #333; margin: 3px 0; font-size: 8pt; letter-spacing: 1px; }
    .divider.solid { letter-spacing: 0; }
    .row      { display: flex; justify-content: space-between; gap: 4px; margin: 1px 0; }
    .row span:first-child { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row span:last-child  { flex-shrink: 0; text-align: right; }
    .row.bold span { font-weight: 700; }
    .item-row { margin: 2px 0; }
    .item-row .name { font-size: 8.5pt; }
    .item-row .calc { display: flex; justify-content: space-between; font-size: 8pt; color: #333; padding-left: 4px; }
    .badge    { display: inline-block; border: 1px solid #000; border-radius: 2px; padding: 0 3px; font-size: 7.5pt; font-weight: 700; }
    .badge.success { border-color: #166534; color: #166534; }
    .badge.pending { border-color: #854d0e; color: #854d0e; }
    .badge.failed  { border-color: #991b1b; color: #991b1b; }
    .powered  { text-align: center; font-size: 7pt; color: #888; margin-top: 4px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  ${logoHtml}
  <div class="center xlarge">${esc(shopName)}</div>
  ${tradingLine}
  ${sloganLine}
  ${addrLine}
  ${contactLine ? `<div class="center small">${contactLine}</div>` : ''}

  ${solidLine()}
  <div class="center bold">${esc(title)}</div>
  ${solidLine()}

  ${body}

  ${dashedLine()}
  ${footer}
  ${poweredBy}
  <br/>

<script>window.addEventListener('load', () => window.print());</script>
</body>
</html>`;
}

// ─── Sales receipt ─────────────────────────────────────────────────────────────

function buildSaleHTML(params: SaleReceiptParams, profile: CompanyProfile): string {
  const { saleId, items, subtotal, vatAmount, total, vatEnabled, cashier } = params;

  const itemRows = items.map(i => {
    const lineTotal = (i.price * i.quantity).toFixed(2);
    return `<div class="item-row">
      <div class="name">${esc(i.name)}</div>
      <div class="calc">
        <span>${i.quantity} x R ${i.price.toFixed(2)}</span>
        <span>R ${lineTotal}</span>
      </div>
    </div>`;
  }).join('');

  const body = `
    ${row('Date:', now())}
    ${row('Receipt #:', `R${String(saleId).padStart(6, '0')}`)}
    ${row('Cashier:', cashier)}
    ${dashedLine()}
    ${itemRows}
    ${solidLine()}
    ${row('Subtotal:', `R ${subtotal.toFixed(2)}`)}
    ${vatEnabled ? row('VAT (15%):', `R ${vatAmount.toFixed(2)}`) : ''}
    ${row('TOTAL:', `R ${total.toFixed(2)}`, true)}
    ${dashedLine()}
    <div class="center small">Items: ${items.reduce((s, i) => s + i.quantity, 0)}</div>
  `;

  return buildShell(profile, 'SALES RECEIPT', body);
}

// ─── Prepaid receipt ───────────────────────────────────────────────────────────

function buildPrepaidHTML(params: PrepaidReceiptParams, profile: CompanyProfile): string {
  const { orderno, type, networkLabel, amount, msisdn, pin, cashier, status, mock } = params;
  const title = type === 'airtime' ? 'AIRTIME RECEIPT' : 'DATA BUNDLE RECEIPT';
  const statusLabel = status === 'success' ? 'SUCCESS' : status === 'pending' ? 'PENDING' : 'FAILED';

  const pinLine = pin
    ? `${solidLine()}
       <div class="center bold">VOUCHER PIN</div>
       <div class="center xlarge" style="letter-spacing:2px;">${esc(pin)}</div>`
    : '';

  const body = `
    ${row('Date:', now())}
    ${row('Ref #:', esc(orderno) || '—')}
    ${row('Cashier:', cashier)}
    ${dashedLine()}
    ${row('Network:', networkLabel)}
    ${row('Service:', type === 'airtime' ? 'Airtime' : 'Data Bundle')}
    ${row('Cell Number:', msisdn)}
    ${row('Amount:', `R ${parseFloat(amount || '0').toFixed(2)}`, true)}
    ${solidLine()}
    ${row('Status:', `<span class="badge ${status}">${statusLabel}</span>`, true)}
    ${pinLine}
    ${dashedLine()}
    ${mock ? '<div class="center small italic">* Demo transaction — not real *</div>' : ''}
  `;

  return buildShell(profile, title, body);
}

// ─── iframe print trigger ─────────────────────────────────────────────────────

function triggerIframePrint(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* already removed */ }
      }, 2000);
    }
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function printSaleReceipt(params: SaleReceiptParams): void {
  try {
    const profile = companyStore.get();
    const html    = buildSaleHTML(params, profile);
    triggerIframePrint(html);
  } catch { /* receipt printing must never crash the app */ }
}

export function printPrepaidReceipt(params: PrepaidReceiptParams): void {
  try {
    const profile = companyStore.get();
    const html    = buildPrepaidHTML(params, profile);
    triggerIframePrint(html);
  } catch { /* receipt printing must never crash the app */ }
}
