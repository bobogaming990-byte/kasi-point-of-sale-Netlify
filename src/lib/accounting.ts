// Accounting calculation engine for Kasi P.O.S
// Pure functions — reads from existing localStorage stores. No data duplication.

import { store } from '@/lib/store';
import { returnsStore } from '@/lib/returns-store';
import { prepaidStore } from '@/lib/freepaid-store';

// ─── Date filtering ────────────────────────────────────────────────────────────

export type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

export interface DateRange { from: string; to: string; } // YYYY-MM-DD

function getRange(filter: DateFilter, custom?: DateRange): DateRange {
  const now   = new Date();
  const fmt   = (d: Date) => d.toISOString().slice(0, 10);
  const today = fmt(now);

  if (filter === 'today')  return { from: today, to: today };
  if (filter === 'custom' && custom?.from && custom?.to) return custom;

  if (filter === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { from: fmt(start), to: today };
  }

  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: today };
  }

  return { from: '2000-01-01', to: '2099-12-31' };
}

function inRange(dateStr: string, range: DateRange): boolean {
  const d = dateStr.slice(0, 10);
  return d >= range.from && d <= range.to;
}

// ─── Output types ──────────────────────────────────────────────────────────────

export interface AccountingSummary {
  total_revenue:    number; // product + prepaid
  product_revenue:  number;
  prepaid_revenue:  number;
  total_cogs:       number; // cost of goods sold
  gross_profit:     number; // product_revenue - total_cogs
  refund_losses:    number;
  stock_losses:     number; // non-resalable returned goods at cost
  return_losses:    number; // refund + stock losses
  net_profit:       number; // gross_profit + prepaid_revenue - return_losses
  inventory_value:  number; // current stock at purchase price
  total_sales:      number; // count of sales transactions
  total_returns:    number; // count of return records
}

export interface ProductRow {
  id:               number;
  name:             string;
  qty_sold:         number;
  purchase_price:   number;
  selling_price:    number;
  profit_per_item:  number;
  total_revenue:    number;
  total_cost:       number;
  total_profit:     number;
  margin_pct:       number; // (profit / revenue) * 100
}

export interface ReturnRow {
  id:             number;
  return_number:  string;
  product_name:   string;
  qty_returned:   number;
  condition:      string;
  reason:         string;
  refund_amount:  number;
  stock_loss:     number;
  total_loss:     number;
}

export interface TrendPoint {
  date:     string; // YYYY-MM-DD
  revenue:  number;
  profit:   number;
  cost:     number;
}

export interface PrepaidSummaryRow {
  type:    string;
  network: string;
  count:   number;
  total:   number;
}

export interface MostReturnedRow {
  product_name: string;
  qty_returned: number;
  total_loss:   number;
}

export interface AccountingData {
  summary:        AccountingSummary;
  productRows:    ProductRow[];
  returnRows:     ReturnRow[];
  trends:         TrendPoint[];
  prepaidSummary: PrepaidSummaryRow[];
  mostReturned:   MostReturnedRow[];
  range:          DateRange;
  totalPrepaidTx: number;
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export function calcAccounting(filter: DateFilter, custom?: DateRange): AccountingData {
  const range    = getRange(filter, custom);
  const products = store.getProducts();
  const sales    = store.getSales().filter(s => inRange(s.date, range));
  const returns  = returnsStore.getAll().filter(
    r => r.status !== 'voided' && inRange(r.created_at, range),
  );
  const prepaid  = prepaidStore.getAll().filter(
    p => p.status === 'success' && inRange(p.date, range),
  );

  // Product map for fast purchase-price lookups
  const productById  = new Map(products.map(p => [p.id, p]));
  const productByName = new Map(products.map(p => [p.name.toLowerCase(), p]));

  // ── Per-product stats ──────────────────────────────────────────────────────
  const statMap = new Map<string, ProductRow>();

  for (const sale of sales) {
    for (const item of sale.items) {
      const prod          = productById.get(item.productId);
      const purchase_price = prod?.purchase_price ?? 0;
      const key            = `${item.productId}_${item.name}`;
      const existing       = statMap.get(key);

      if (existing) {
        existing.qty_sold      += item.quantity;
        existing.total_revenue += item.price * item.quantity;
        existing.total_cost    += purchase_price * item.quantity;
        existing.total_profit  += (item.price - purchase_price) * item.quantity;
      } else {
        statMap.set(key, {
          id:              item.productId,
          name:            item.name,
          qty_sold:        item.quantity,
          purchase_price,
          selling_price:   item.price,
          profit_per_item: item.price - purchase_price,
          total_revenue:   item.price * item.quantity,
          total_cost:      purchase_price * item.quantity,
          total_profit:    (item.price - purchase_price) * item.quantity,
          margin_pct:      item.price > 0 ? ((item.price - purchase_price) / item.price) * 100 : 0,
        });
      }
    }
  }

  const productRows = [...statMap.values()].sort((a, b) => b.total_profit - a.total_profit);

  // ── Returns impact ─────────────────────────────────────────────────────────
  const returnRows: ReturnRow[] = returns.map(r => {
    const prod           = productById.get(r.product_id ?? -1) ??
                           productByName.get(r.product_name.toLowerCase());
    const purchase_price  = prod?.purchase_price ?? 0;
    const is_unsalable    = r.return_condition !== 'resalable';
    const stock_loss      = is_unsalable ? purchase_price * r.quantity_returned : 0;

    return {
      id:            r.id,
      return_number: r.return_number,
      product_name:  r.product_name,
      qty_returned:  r.quantity_returned,
      condition:     r.return_condition,
      reason:        r.reason,
      refund_amount: r.refund_amount,
      stock_loss,
      total_loss:    r.refund_amount + stock_loss,
    };
  });

  // ── Summary totals ─────────────────────────────────────────────────────────
  const product_revenue = productRows.reduce((s, r) => s + r.total_revenue, 0);
  const total_cogs      = productRows.reduce((s, r) => s + r.total_cost,    0);
  const prepaid_revenue = prepaid.reduce((s, p) => s + parseFloat(p.sellvalue || '0'), 0);
  const total_revenue   = product_revenue + prepaid_revenue;
  const gross_profit    = product_revenue - total_cogs;
  const refund_losses   = returnRows.reduce((s, r) => s + r.refund_amount, 0);
  const stock_losses    = returnRows.reduce((s, r) => s + r.stock_loss,    0);
  const return_losses   = refund_losses + stock_losses;
  const net_profit      = gross_profit + prepaid_revenue - return_losses;
  const inventory_value = products.reduce((s, p) => s + p.purchase_price * p.stock, 0);

  // ── Daily revenue trend ────────────────────────────────────────────────────
  const trendMap = new Map<string, TrendPoint>();

  for (const sale of sales) {
    const d   = sale.date.slice(0, 10);
    const saleProfit = sale.items.reduce((s, i) => {
      const pp = productById.get(i.productId)?.purchase_price ?? 0;
      return s + (i.price - pp) * i.quantity;
    }, 0);
    const saleCost = sale.items.reduce((s, i) => {
      const pp = productById.get(i.productId)?.purchase_price ?? 0;
      return s + pp * i.quantity;
    }, 0);
    const ex = trendMap.get(d);
    if (ex) { ex.revenue += sale.total; ex.profit += saleProfit; ex.cost += saleCost; }
    else    { trendMap.set(d, { date: d, revenue: sale.total, profit: saleProfit, cost: saleCost }); }
  }

  // Add prepaid to trend
  for (const tx of prepaid) {
    const d  = tx.date.slice(0, 10);
    const v  = parseFloat(tx.sellvalue || '0');
    const ex = trendMap.get(d);
    if (ex) { ex.revenue += v; }
    else    { trendMap.set(d, { date: d, revenue: v, profit: 0, cost: 0 }); }
  }

  const trends = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      ...v,
      revenue: parseFloat(v.revenue.toFixed(2)),
      profit:  parseFloat(v.profit.toFixed(2)),
      cost:    parseFloat(v.cost.toFixed(2)),
    }));

  // ── Prepaid summary by type + network ────────────────────────────────────
  const prepaidMap = new Map<string, PrepaidSummaryRow>();
  for (const tx of prepaid) {
    const key = `${tx.type}__${tx.networkLabel || tx.network}`;
    const ex  = prepaidMap.get(key);
    const v   = parseFloat(tx.sellvalue || '0');
    if (ex) { ex.count += 1; ex.total += v; }
    else prepaidMap.set(key, { type: tx.type, network: tx.networkLabel || tx.network, count: 1, total: v });
  }
  const prepaidSummary = [...prepaidMap.values()].sort((a, b) => b.total - a.total);

  // ── Most returned products ────────────────────────────────────────────────
  const retMap = new Map<string, MostReturnedRow>();
  for (const r of returnRows) {
    const ex = retMap.get(r.product_name);
    if (ex) { ex.qty_returned += r.qty_returned; ex.total_loss += r.total_loss; }
    else retMap.set(r.product_name, { product_name: r.product_name, qty_returned: r.qty_returned, total_loss: r.total_loss });
  }
  const mostReturned = [...retMap.values()].sort((a, b) => b.qty_returned - a.qty_returned);

  return {
    summary: {
      total_revenue, product_revenue, prepaid_revenue,
      total_cogs, gross_profit,
      refund_losses, stock_losses, return_losses,
      net_profit, inventory_value,
      total_sales:   sales.length,
      total_returns: returns.length,
    },
    productRows,
    returnRows,
    prepaidSummary,
    mostReturned,
    trends,
    range,
    totalPrepaidTx: prepaid.length,
  };
}

// ─── CSV export helper ────────────────────────────────────────────────────────

export function buildProductCSV(rows: ProductRow[]): string {
  const headers = ['Product', 'Qty Sold', 'Purchase Price (R)', 'Selling Price (R)',
                   'Profit/Item (R)', 'Total Revenue (R)', 'Total Cost (R)', 'Total Profit (R)', 'Margin %'];
  const lines   = rows.map(r => [
    `"${r.name}"`, r.qty_sold,
    r.purchase_price.toFixed(2), r.selling_price.toFixed(2),
    r.profit_per_item.toFixed(2), r.total_revenue.toFixed(2),
    r.total_cost.toFixed(2), r.total_profit.toFixed(2),
    r.margin_pct.toFixed(1),
  ].join(','));
  return [headers.join(','), ...lines].join('\n');
}
