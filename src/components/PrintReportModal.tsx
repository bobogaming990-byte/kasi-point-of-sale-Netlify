import { useState, useMemo } from "react";
import { auditStore, AuditLog, ActionType } from "@/lib/audit-store";
import { companyStore, CompanyProfile } from "@/lib/company-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Building2, CalendarDays, FileText } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom' | 'full';

interface Props {
  open: boolean;
  onClose: () => void;
  currentUser: string;
  onOpenProfile: () => void;
}

// ─── Action label / CSS-class maps used inside the generated HTML ─────────────

const ACTION_LABELS: Record<ActionType, string> = {
  SALE_COMPLETED: 'Sale', STOCK_RECEIVED: 'Stock In', STOCK_ADJUSTED: 'Stock Adj.',
  PRODUCT_ADDED: 'Product Added', PRODUCT_EDITED: 'Product Edited',
  PRODUCT_DELETED: 'Product Deleted', EXPIRED_REMOVED: 'Expired Removed',
  USER_LOGIN: 'Login', USER_LOGOUT: 'Logout', USER_ADDED: 'User Added',
  USER_REMOVED: 'User Removed', ADMIN_OVERRIDE: 'Admin Override', VOID_ACTION: 'Void',
  LOGIN_FAILED: 'Login Failed', SUBSCRIPTION_CHANGED: 'Subscription',
  RETURN_CREATED: 'Return Created', RETURN_VOIDED: 'Return Voided',
};

function actionClass(type: ActionType): string {
  if (type === 'SALE_COMPLETED') return 'at-sale';
  if (['STOCK_RECEIVED', 'STOCK_ADJUSTED', 'PRODUCT_ADDED', 'PRODUCT_EDITED'].includes(type)) return 'at-stock';
  if (['PRODUCT_DELETED', 'EXPIRED_REMOVED', 'LOGIN_FAILED'].includes(type)) return 'at-delete';
  if (['USER_LOGIN', 'USER_LOGOUT'].includes(type)) return 'at-auth';
  if (['USER_ADDED', 'USER_REMOVED'].includes(type)) return 'at-user';
  if (['ADMIN_OVERRIDE', 'VOID_ACTION'].includes(type)) return 'at-override';
  if (type === 'SUBSCRIPTION_CHANGED') return 'at-sub';
  return '';
}

function statusClass(s: string): string {
  if (s === 'success') return 'st-success';
  if (s === 'failed')  return 'st-failed';
  return 'st-pending';
}

function esc(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Revenue parser ───────────────────────────────────────────────────────────

function parseRevenue(log: AuditLog): number {
  if (log.action_type !== 'SALE_COMPLETED' || !log.new_value) return 0;
  const m = log.new_value.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

// ─── Date-range helpers ───────────────────────────────────────────────────────

function rangeFor(type: ReportType, from: string, to: string): { start: number; end: number; label: string } {
  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  switch (type) {
    case 'daily':
      return { start: new Date(todayStr + 'T00:00:00').getTime(), end: now, label: `Today — ${new Date().toLocaleDateString('en-ZA')}` };
    case 'weekly':
      return { start: now - 7 * 86400000, end: now, label: 'Last 7 Days' };
    case 'monthly': {
      const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0);
      return { start: m.getTime(), end: now, label: new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' }) };
    }
    case 'custom': {
      const s = from ? new Date(from + 'T00:00:00').getTime() : 0;
      const e = to   ? new Date(to   + 'T23:59:59').getTime() : now;
      return { start: s, end: e, label: `${from || '—'} to ${to || 'now'}` };
    }
    default:
      return { start: 0, end: now, label: 'All Time' };
  }
}

// ─── A4 HTML generator ────────────────────────────────────────────────────────

function buildReportHTML(
  profile: CompanyProfile,
  logs: AuditLog[],
  reportType: ReportType,
  from: string, to: string,
  generatedBy: string,
  filterUser: string,
  filterAction: string,
): string {
  const { start, end, label } = rangeFor(reportType, from, to);

  let data = logs.filter(l => {
    const t = new Date(l.timestamp).getTime();
    return t >= start && t <= end;
  });
  if (filterUser    !== 'all') data = data.filter(l => l.username    === filterUser);
  if (filterAction  !== 'all') data = data.filter(l => l.action_type === filterAction);
  data = [...data].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const revenue  = data.reduce((s, l) => s + parseRevenue(l), 0);
  const sales    = data.filter(l => l.action_type === 'SALE_COMPLETED').length;
  const stockIn  = data.filter(l => l.action_type === 'STOCK_RECEIVED' || l.action_type === 'PRODUCT_ADDED').length;
  const expired  = data.filter(l => l.action_type === 'EXPIRED_REMOVED').length;
  const failed   = data.filter(l => l.status === 'failed').length;
  const total    = data.length;

  const hasProfile   = Boolean(profile.businessName.trim());
  const companyName  = hasProfile ? profile.businessName : 'Business Report';
  const tradingLine  = profile.tradingName ? `<div class="trading">${esc(profile.tradingName)}</div>` : '';
  const sloganLine   = profile.slogan ? `<div class="slogan">${esc(profile.slogan)}</div>` : '';
  const branchLine   = profile.branchName  ? `<div class="branch">Branch: ${esc(profile.branchName)}${profile.branchCode ? ` (${esc(profile.branchCode)})` : ''}</div>` : '';
  const logoHTML     = profile.logo
    ? `<img src="${profile.logo}" alt="logo" class="logo" />`
    : `<div class="logo-initials">${esc(companyName.charAt(0).toUpperCase())}</div>`;

  const reportTitles: Record<ReportType, string> = {
    daily: 'Daily Activity Report', weekly: 'Weekly Activity Report',
    monthly: 'Monthly Activity Report', custom: 'Custom Activity Report', full: 'Full Activity Log',
  };
  const reportTitle = reportTitles[reportType];
  const generatedOn = new Date().toLocaleString('en-ZA', { dateStyle: 'full', timeStyle: 'short' });

  const footerContact = hasProfile
    ? `<strong>${esc(companyName)}</strong><br>
       ${profile.physicalAddress ? esc(profile.physicalAddress) + '<br>' : ''}
       ${profile.phone ? `Tel: ${esc(profile.phone)}` : ''}${profile.email ? ` &nbsp;|&nbsp; Email: ${esc(profile.email)}` : ''}${profile.website ? ` &nbsp;|&nbsp; ${esc(profile.website)}` : ''}
       ${profile.footerNote ? `<br><em>${esc(profile.footerNote)}</em>` : ''}`
    : `<em>Generated by Kasi P.O.S</em>`;

  const rows = data.map((l, i) => `
    <tr class="${i % 2 === 1 ? 'alt' : ''}">
      <td class="ts">${esc(fmtDate(l.timestamp))}</td>
      <td>${esc(l.username)}</td>
      <td class="cap">${esc(l.user_role)}</td>
      <td><span class="badge ${actionClass(l.action_type)}">${esc(ACTION_LABELS[l.action_type] ?? l.action_type)}</span></td>
      <td>${esc(l.module_name)}</td>
      <td class="item">${esc(l.item_name ?? l.reference_id ?? '—')}</td>
      <td class="num">${l.quantity != null ? l.quantity : '—'}</td>
      <td><span class="badge ${statusClass(l.status)}">${esc(l.status)}</span></td>
      <td class="desc">${esc(l.description)}</td>
    </tr>`).join('');

  const emptyRow = `<tr><td colspan="9" class="empty">No activity records found for this period.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(companyName)} — ${esc(reportTitle)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      color: #1a1a2e;
      background: #fff;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 15mm 16mm;
      margin: 0 auto;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2.5px solid #1a1a2e;
      padding-bottom: 14px;
      margin-bottom: 18px;
      gap: 16px;
    }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .logo { width: 64px; height: 64px; object-fit: contain; border-radius: 6px; }
    .logo-initials {
      width: 64px; height: 64px; border-radius: 8px;
      background: #1a1a2e; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 24pt; font-weight: 700; flex-shrink: 0;
    }
    .company-name { font-size: 17pt; font-weight: 800; color: #1a1a2e; line-height: 1.1; }
    .trading { font-size: 10pt; color: #555; margin-top: 3px; }
    .slogan  { font-size: 9pt; color: #6b7280; font-style: italic; margin-top: 2px; }
    .branch  { font-size: 9pt; color: #6b7280; margin-top: 3px; }
    .report-meta { text-align: right; font-size: 9pt; color: #555; flex-shrink: 0; }
    .report-title { font-size: 13pt; font-weight: 700; color: #1a1a2e; margin-bottom: 5px; }

    /* ── Summary cards ── */
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 7px;
      padding: 10px 13px;
    }
    .card .lbl {
      font-size: 7.5pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }
    .card .val {
      font-size: 20pt;
      font-weight: 800;
      color: #1a1a2e;
      margin-top: 2px;
      line-height: 1;
    }
    .card .val.danger { color: #dc2626; }

    /* ── Table ── */
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    thead tr {
      background: #1a1a2e;
      color: #fff;
    }
    thead th {
      padding: 7px 7px;
      text-align: left;
      font-weight: 600;
      font-size: 7.5pt;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    tbody tr { border-bottom: 1px solid #f3f4f6; }
    tbody tr.alt { background: #f9fafb; }
    tbody td {
      padding: 5.5px 7px;
      vertical-align: top;
      color: #374151;
    }
    td.ts   { white-space: nowrap; font-size: 8pt; color: #6b7280; }
    td.cap  { text-transform: capitalize; }
    td.num  { text-align: center; }
    td.item { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    td.desc { max-width: 180px; font-size: 8pt; color: #4b5563; }
    td.empty { text-align: center; padding: 28px; color: #9ca3af; font-style: italic; }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 3px;
      font-size: 7.5pt;
      font-weight: 600;
      white-space: nowrap;
    }
    .at-sale    { background: #dcfce7; color: #166534; }
    .at-stock   { background: #dbeafe; color: #1e40af; }
    .at-delete  { background: #fee2e2; color: #991b1b; }
    .at-auth    { background: #f3f4f6; color: #374151; }
    .at-user    { background: #ede9fe; color: #5b21b6; }
    .at-override{ background: #ffedd5; color: #c2410c; }
    .at-sub     { background: #f3e8ff; color: #6b21a8; }
    .st-success { background: #dcfce7; color: #166534; }
    .st-failed  { background: #fee2e2; color: #991b1b; }
    .st-pending { background: #fef9c3; color: #854d0e; }

    /* ── Footer ── */
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 8pt;
      color: #6b7280;
      gap: 12px;
    }
    .footer-left  { flex: 1; line-height: 1.5; }
    .footer-right { text-align: right; white-space: nowrap; flex-shrink: 0; }

    /* ── Print ── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { margin: 0; padding: 15mm 13mm; }
      table { page-break-inside: auto; }
      tr    { page-break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      .footer { position: running(footer); }
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${logoHTML}
      <div>
        <div class="company-name">${esc(companyName)}</div>
        ${tradingLine}
        ${sloganLine}
        ${branchLine}
        ${profile.registrationNumber ? `<div style="font-size:8.5pt;color:#6b7280;margin-top:3px;">Reg: ${esc(profile.registrationNumber)}${profile.vatNumber ? ` &nbsp;|&nbsp; VAT: ${esc(profile.vatNumber)}` : ''}</div>` : ''}
      </div>
    </div>
    <div class="report-meta">
      <div class="report-title">${esc(reportTitle)}</div>
      <div><strong>Period:</strong> ${esc(label)}</div>
      <div><strong>Generated:</strong> ${esc(generatedOn)}</div>
      <div><strong>Generated by:</strong> ${esc(generatedBy)}</div>
      ${filterUser   !== 'all' ? `<div><strong>User filter:</strong> ${esc(filterUser)}</div>`   : ''}
      ${filterAction !== 'all' ? `<div><strong>Action filter:</strong> ${esc(ACTION_LABELS[filterAction as ActionType] ?? filterAction)}</div>` : ''}
    </div>
  </div>

  <!-- Summary -->
  <div class="summary">
    <div class="card">
      <div class="lbl">Total Sales</div>
      <div class="val">${sales}</div>
    </div>
    <div class="card">
      <div class="lbl">Total Revenue</div>
      <div class="val">R ${revenue.toFixed(2)}</div>
    </div>
    <div class="card">
      <div class="lbl">Stock Received</div>
      <div class="val">${stockIn}</div>
    </div>
    <div class="card">
      <div class="lbl">Expired Removed</div>
      <div class="val">${expired}</div>
    </div>
    <div class="card">
      <div class="lbl">Total Events</div>
      <div class="val">${total}</div>
    </div>
    <div class="card">
      <div class="lbl">Failed Actions</div>
      <div class="val${failed > 0 ? ' danger' : ''}">${failed}</div>
    </div>
  </div>

  <!-- Table -->
  <div class="section-title">Activity Detail — ${total} record${total !== 1 ? 's' : ''}</div>
  <table>
    <thead>
      <tr>
        <th style="width:12%">Date &amp; Time</th>
        <th style="width:9%">User</th>
        <th style="width:7%">Role</th>
        <th style="width:11%">Action</th>
        <th style="width:8%">Module</th>
        <th style="width:11%">Item / Ref</th>
        <th style="width:5%">Qty</th>
        <th style="width:8%">Status</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      ${data.length ? rows : emptyRow}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">${footerContact}</div>
    <div class="footer-right">
      ${profile.showPoweredBy !== false ? 'Powered by Kasi P.O.S<br>' : ''}
      ${esc(new Date().toLocaleDateString('en-ZA', { dateStyle: 'long' }))}
    </div>
  </div>

</div>
<script>window.addEventListener('load', () => { window.print(); });</script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrintReportModal({ open, onClose, currentUser, onOpenProfile }: Props) {
  const [reportType, setReportType]     = useState<ReportType>('daily');
  const [fromDate,   setFromDate]       = useState('');
  const [toDate,     setToDate]         = useState(new Date().toISOString().slice(0, 10));
  const [filterUser, setFilterUser]     = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const profile      = companyStore.get();
  const hasProfile   = companyStore.hasProfile();
  const allLogs      = auditStore.getAll();

  const uniqueUsers = useMemo(
    () => Array.from(new Set(allLogs.map(l => l.username))).sort(),
    [allLogs],
  );

  const { label: periodLabel } = rangeFor(reportType, fromDate, toDate);

  const handlePrint = () => {
    const html = buildReportHTML(profile, allLogs, reportType, fromDate, toDate, currentUser, filterUser, filterAction);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { toast.error('Could not create print frame.'); document.body.removeChild(iframe); return; }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* already removed */ } }, 1000);
      }
    };
  };

  const REPORT_TYPES: { value: ReportType; label: string; icon: string }[] = [
    { value: 'daily',   label: 'Daily Report',       icon: '📅' },
    { value: 'weekly',  label: 'Weekly Report',      icon: '📆' },
    { value: 'monthly', label: 'Monthly Report',     icon: '🗓️' },
    { value: 'custom',  label: 'Custom Date Range',  icon: '🔍' },
    { value: 'full',    label: 'Full Activity Log',  icon: '📋' },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" /> Print Activity Report
          </DialogTitle>
          <DialogDescription>
            Select report options and click Print to open the A4-formatted report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">

          {/* Company profile preview */}
          <div className={`rounded-xl p-3 flex items-center gap-3 ${hasProfile ? 'bg-muted/40 border border-border' : 'bg-amber-50 border border-amber-200'}`}>
            {profile.logo ? (
              <img src={profile.logo} alt="logo" className="w-10 h-10 rounded-lg object-contain flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {hasProfile ? (
                <>
                  <p className="text-sm font-semibold truncate">{profile.businessName}</p>
                  {profile.tradingName && <p className="text-xs text-muted-foreground truncate">{profile.tradingName}</p>}
                  {profile.branchName  && <p className="text-xs text-muted-foreground">{profile.branchName}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-amber-700">No business profile set</p>
                  <p className="text-xs text-amber-600">Reports will use a generic header.</p>
                </>
              )}
            </div>
            <button
              onClick={() => { onClose(); setTimeout(onOpenProfile, 150); }}
              className="text-xs text-primary hover:underline flex-shrink-0"
            >
              {hasProfile ? 'Edit' : 'Set up'}
            </button>
          </div>

          {/* Report type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Report Type</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {REPORT_TYPES.map(rt => (
                <label
                  key={rt.value}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    reportType === rt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={rt.value}
                    checked={reportType === rt.value}
                    onChange={() => setReportType(rt.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">{rt.icon} {rt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom date range */}
          {reportType === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> From</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> To</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9" max={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>
          )}

          {/* Optional filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Filter by User</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {uniqueUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Filter by Action</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {(Object.keys(ACTION_LABELS) as ActionType[]).map(k => (
                    <SelectItem key={k} value={k}>{ACTION_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Period summary */}
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            📊 This report will cover: <strong>{periodLabel}</strong>
            {filterUser !== 'all' && <> &nbsp;·&nbsp; User: <strong>{filterUser}</strong></>}
            {filterAction !== 'all' && <> &nbsp;·&nbsp; Action: <strong>{ACTION_LABELS[filterAction as ActionType]}</strong></>}
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Print Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
