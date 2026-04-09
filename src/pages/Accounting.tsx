import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  RotateCcw, Download, RefreshCw, BarChart2, Wallet, Printer, Wifi,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { companyStore } from "@/lib/company-store";
import {
  calcAccounting, buildProductCSV,
  type DateFilter, type DateRange,
  type ProductRow, type ReturnRow,
  type PrepaidSummaryRow, type MostReturnedRow,
} from "@/lib/accounting";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  'R ' + Math.abs(v).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtLabel = (v: number, unit: string) => {
  if (v === 0) return `R 0.00`;
  return `R ${v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit}`;
};

const FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today',  label: 'Today' },
  { key: 'week',   label: 'This Week' },
  { key: 'month',  label: 'This Month' },
  { key: 'all',    label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

// ─── Summary card ─────────────────────────────────────────────────────────────

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;   // Tailwind bg-* class for the icon backdrop
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, value, sub, icon, color, trend }: CardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          {trend && (
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold mt-0.5 truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Profit badge ─────────────────────────────────────────────────────────────

function ProfitBadge({ v }: { v: number }) {
  if (v > 0) return <Badge variant="outline" className="border-green-300 text-green-700 text-xs">+{fmt(v)}</Badge>;
  if (v < 0) return <Badge variant="outline" className="border-red-300 text-red-700 text-xs">−{fmt(Math.abs(v))}</Badge>;
  return <Badge variant="outline" className="text-xs">R 0.00</Badge>;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Accounting() {
  const { role } = useAuth();
  const company  = companyStore.get();

  const [filter,     setFilter]     = useState<DateFilter>('month');
  const [refreshKey, setRefreshKey] = useState(0);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const customRange: DateRange | undefined =
    filter === 'custom' && customFrom && customTo
      ? { from: customFrom, to: customTo }
      : undefined;

  const { summary, productRows, returnRows, trends, prepaidSummary, mostReturned, totalPrepaidTx, range } = useMemo(
    () => calcAccounting(filter, customRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, customFrom, customTo, refreshKey],
  );

  // ── CSV export ───────────────────────────────────────────────────────────────
  function exportCSV() {
    const csv  = buildProductCSV(productRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `kasi-accounting-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Print A4 report ───────────────────────────────────────────────────────────
  function printReport() {
    const periodLabel = filter === 'custom' && customFrom
      ? `${customFrom} to ${customTo}`
      : FILTERS.find(f => f.key === filter)?.label ?? filter;

    const productRowsHTML = productRows.length === 0
      ? '<tr><td colspan="7" style="text-align:center;color:#999">No product sales in this period</td></tr>'
      : productRows.map(r => `<tr>
          <td>${r.name}</td><td style="text-align:right">${r.qty_sold}</td>
          <td style="text-align:right">R ${r.purchase_price.toFixed(2)}</td>
          <td style="text-align:right">R ${r.selling_price.toFixed(2)}</td>
          <td style="text-align:right">R ${r.profit_per_item.toFixed(2)}</td>
          <td style="text-align:right">R ${r.total_revenue.toFixed(2)}</td>
          <td style="text-align:right;font-weight:600;color:${r.total_profit >= 0 ? '#16a34a' : '#dc2626'}">R ${r.total_profit.toFixed(2)}</td>
        </tr>`).join('');

    const prepaidHTML = prepaidSummary.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#999">No prepaid transactions</td></tr>'
      : prepaidSummary.map(p => `<tr><td style="text-transform:capitalize">${p.type}</td><td>${p.network}</td><td style="text-align:right">${p.count}</td><td style="text-align:right">R ${p.total.toFixed(2)}</td></tr>`).join('');

    const html = `<!DOCTYPE html><html><head><title>Accounting Report — Kasi P.O.S</title>
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}
h1{font-size:20px;margin:0}h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}
.meta{color:#555;font-size:11px;margin:4px 0 16px}
.metrics{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px}
.m{border:1px solid #ddd;border-radius:6px;padding:10px 14px;min-width:140px}
.m-label{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:.05em}
.m-value{font-size:17px;font-weight:700;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e5e5e5;padding:5px 8px;text-align:left}
th{background:#f5f5f5;font-weight:600}tr:nth-child(even){background:#fafafa}
.pos{color:#16a34a}.neg{color:#dc2626}
@media print{body{margin:0}}</style></head><body>
<h1>Kasi P.O.S — Accounting Report</h1>
<p class="meta">Company: <strong>${company?.businessName || 'Kasi P.O.S'}</strong> &nbsp;|&nbsp; Period: <strong>${periodLabel}</strong> &nbsp;|&nbsp; Printed: ${new Date().toLocaleString('en-ZA')}</p>
<div class="metrics">
  <div class="m"><div class="m-label">Total Revenue</div><div class="m-value">R ${summary.total_revenue.toFixed(2)}</div></div>
  <div class="m"><div class="m-label">Gross Profit</div><div class="m-value ${summary.gross_profit >= 0 ? 'pos' : 'neg'}">R ${summary.gross_profit.toFixed(2)}</div></div>
  <div class="m"><div class="m-label">Cost of Goods</div><div class="m-value">R ${summary.total_cogs.toFixed(2)}</div></div>
  <div class="m"><div class="m-label">Return Losses</div><div class="m-value neg">R ${summary.return_losses.toFixed(2)}</div></div>
  <div class="m"><div class="m-label">Net Profit</div><div class="m-value ${summary.net_profit >= 0 ? 'pos' : 'neg'}">R ${summary.net_profit.toFixed(2)}</div></div>
  <div class="m"><div class="m-label">Prepaid Revenue</div><div class="m-value">R ${summary.prepaid_revenue.toFixed(2)}</div></div>
  <div class="m"><div class="m-label">Inventory Value</div><div class="m-value">R ${summary.inventory_value.toFixed(2)}</div></div>
</div>
<h2>Product Profitability (${productRows.length} products)</h2>
<table><thead><tr><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Buy Price</th><th style="text-align:right">Sell Price</th><th style="text-align:right">Profit/Item</th><th style="text-align:right">Revenue</th><th style="text-align:right">Total Profit</th></tr></thead><tbody>${productRowsHTML}</tbody></table>
<h2>Prepaid Revenue Summary</h2>
<table><thead><tr><th>Type</th><th>Network</th><th style="text-align:right">Transactions</th><th style="text-align:right">Total</th></tr></thead><tbody>${prepaidHTML}</tbody></table>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  }

  const netColor    = summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600';
  const hasAnyData  = summary.total_sales > 0 || totalPrepaidTx > 0 || summary.total_returns > 0;
  const periodLabel = filter === 'custom' && customFrom
    ? `${customFrom} → ${customTo}`
    : FILTERS.find(f => f.key === filter)?.label;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Accounting</h1>
            {company?.businessName && (
              <p className="text-xs text-muted-foreground">{company.businessName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date filter */}
          <div className="flex rounded-lg border overflow-hidden">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>

          {role === 'admin' && (
            <>
              {productRows.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={printReport}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Print
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Custom date range inputs */}
      {filter === 'custom' && (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Date range:</span>
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-background"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            min={customFrom}
            className="text-xs border rounded px-2 py-1 bg-background"
          />
          {(!customFrom || !customTo) && (
            <span className="text-xs text-amber-600">Select both dates to apply</span>
          )}
        </div>
      )}

      {/* Data provenance row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{periodLabel}</span>
        <span>{summary.total_sales} sale transaction{summary.total_sales !== 1 ? 's' : ''}</span>
        <span>{totalPrepaidTx} prepaid transaction{totalPrepaidTx !== 1 ? 's' : ''}</span>
        <span>{summary.total_returns} return{summary.total_returns !== 1 ? 's' : ''}</span>
        {!hasAnyData && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
            No transactions in this period
          </Badge>
        )}
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <MetricCard
          label="Total Revenue"
          value={fmt(summary.total_revenue)}
          sub={`${summary.total_sales} sale${summary.total_sales !== 1 ? 's' : ''}`}
          icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
          color="bg-blue-100"
        />
        <MetricCard
          label="Gross Profit"
          value={fmt(summary.gross_profit)}
          sub={`Product sales only`}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          color="bg-green-100"
          trend={summary.gross_profit >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          label="Cost of Goods"
          value={fmt(summary.total_cogs)}
          sub="Stock at purchase price"
          icon={<Package className="w-5 h-5 text-amber-600" />}
          color="bg-amber-100"
        />
        <MetricCard
          label="Return Losses"
          value={fmt(summary.return_losses)}
          sub={`${summary.total_returns} return${summary.total_returns !== 1 ? 's' : ''}`}
          icon={<RotateCcw className="w-5 h-5 text-red-600" />}
          color="bg-red-100"
          trend={summary.return_losses > 0 ? 'down' : 'neutral'}
        />
        <MetricCard
          label="Net Profit"
          value={fmt(summary.net_profit)}
          sub={summary.prepaid_revenue > 0 ? `Incl. ${fmt(summary.prepaid_revenue)} prepaid` : 'After all deductions'}
          icon={<Wallet className="w-5 h-5 text-purple-600" />}
          color="bg-purple-100"
          trend={summary.net_profit >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* ── Secondary stats row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Product Revenue',   value: fmt(summary.product_revenue) },
          { label: 'Prepaid Revenue',   value: fmt(summary.prepaid_revenue) },
          { label: 'Refund Losses',     value: fmt(summary.refund_losses) },
          { label: 'Stock Write-offs',  value: fmt(summary.stock_losses) },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-base font-semibold mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Revenue & Profit trend chart ──────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Revenue & Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No sales data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trends} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={d => {
                    try { return new Date(d + 'T00:00').toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }); }
                    catch { return d; }
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `R${(v as number).toFixed(0)}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue"      fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="profit"  name="Gross Profit" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cost"    name="Cost of Goods" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Product profitability table ───────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Product Profitability</span>
            <span className="text-xs font-normal text-muted-foreground">
              {productRows.length} product{productRows.length !== 1 ? 's' : ''} sold
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {productRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No product sales in selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Product</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Qty</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Buy Price</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Sell Price</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Profit/Item</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Revenue</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row: ProductRow, i: number) => (
                    <tr key={`${row.id}_${i}`} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{row.name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{row.qty_sold}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(row.purchase_price)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.selling_price)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <ProfitBadge v={row.profit_per_item} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(row.total_revenue)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-semibold tabular-nums ${row.total_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {row.total_profit >= 0 ? '' : '−'}{fmt(Math.abs(row.total_profit))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                      Totals
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {productRows.reduce((s, r) => s + r.qty_sold, 0)}
                    </td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {fmt(summary.product_revenue)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${summary.gross_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(summary.gross_profit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Returns impact table ──────────────────────────────────────────────── */}
      {returnRows.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-500" /> Returns Impact
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Total loss: <span className="text-red-600 font-semibold">{fmt(summary.return_losses)}</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ref #</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Product</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Qty</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Condition</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Reason</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Refund</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Stock Loss</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {returnRows.map((row: ReturnRow) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{row.return_number}</td>
                      <td className="px-3 py-2.5 font-medium">{row.product_name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{row.qty_returned}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${row.condition === 'resalable' ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700'}`}
                        >
                          {row.condition}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground capitalize text-xs">{row.reason.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-red-600">{fmt(row.refund_amount)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-amber-600">{fmt(row.stock_loss)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-red-700">{fmt(row.total_loss)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={5} className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Totals</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-red-600 tabular-nums">{fmt(summary.refund_losses)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-600 tabular-nums">{fmt(summary.stock_losses)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-700 tabular-nums">{fmt(summary.return_losses)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Prepaid revenue summary ─────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-500" /> Prepaid Revenue Summary
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {totalPrepaidTx} transaction{totalPrepaidTx !== 1 ? 's' : ''} &nbsp;·&nbsp; Total: <span className="font-semibold">{fmt(summary.prepaid_revenue)}</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {prepaidSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No prepaid transactions in selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Network</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Transactions</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {prepaidSummary.map((row: PrepaidSummaryRow, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 capitalize font-medium">{row.type}</td>
                      <td className="px-3 py-2.5">{row.network}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{row.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-blue-700">{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={2} className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Total Prepaid</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{totalPrepaidTx}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-blue-700">{fmt(summary.prepaid_revenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Most returned products ────────────────────────────────────────────── */}
      {mostReturned.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-500" /> Most Returned Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Product</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Total Qty Returned</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Total Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {mostReturned.map((row: MostReturnedRow, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{row.product_name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{row.qty_returned}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-red-700">{fmt(row.total_loss)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Net profit summary ────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className={`h-1.5 ${summary.net_profit >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`} />
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Net Profit</p>
            <p className={`text-3xl font-bold mt-0.5 ${netColor}`}>{fmt(summary.net_profit)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue {fmt(summary.total_revenue)} − COGS {fmt(summary.total_cogs)} − Losses {fmt(summary.return_losses)}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground">Inventory value (current stock)</p>
            <p className="text-lg font-semibold">{fmt(summary.inventory_value)}</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
