// Returns store for Kasi P.O.S — localStorage-backed, backward-compatible

export type ReturnReason =
  | 'damaged' | 'faulty' | 'wrong_item' | 'changed_mind'
  | 'expired' | 'not_working' | 'poor_quality' | 'duplicate_purchase' | 'other';

export type ReturnCondition = 'resalable' | 'damaged' | 'expired' | 'opened' | 'faulty';

export type ReturnType =
  | 'full_return' | 'partial_return' | 'exchange' | 'refund' | 'faulty_item';

export type ReturnStatus = 'completed' | 'pending' | 'voided';

export interface ReturnRecord {
  id:                    number;
  return_number:         string;       // e.g. RTN-20260330-0001
  original_sale_id?:     number;
  product_id?:           number;
  barcode:               string;
  product_name:          string;
  quantity_returned:     number;
  return_type:           ReturnType;
  reason:                ReturnReason;
  reason_notes:          string;       // extra notes / "Other" detail
  return_condition:      ReturnCondition;
  refund_amount:         number;
  exchange_product_name: string;
  processed_by:          string;
  status:                ReturnStatus;
  restock:               boolean;      // true = qty added back to inventory
  created_at:            string;       // ISO timestamp
  updated_at:            string;
}

const KEY = 'kasi_returns';

function load(): ReturnRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as ReturnRecord[]; }
  catch { return []; }
}

function save(records: ReturnRecord[]): void {
  localStorage.setItem(KEY, JSON.stringify(records));
}

function nextId(): number {
  const all = load();
  return all.length === 0 ? 1 : Math.max(...all.map(r => r.id)) + 1;
}

function generateReturnNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq  = String(load().length + 1).padStart(4, '0');
  return `RTN-${date}-${seq}`;
}

export const returnsStore = {
  getAll(): ReturnRecord[] {
    return load();
  },

  getById(id: number): ReturnRecord | undefined {
    return load().find(r => r.id === id);
  },

  add(record: Omit<ReturnRecord, 'id' | 'return_number' | 'created_at' | 'updated_at'>): ReturnRecord {
    const now  = new Date().toISOString();
    const full: ReturnRecord = {
      ...record,
      id:            nextId(),
      return_number: generateReturnNumber(),
      created_at:    now,
      updated_at:    now,
    };
    const all = load();
    all.push(full);
    save(all);
    return full;
  },

  void(id: number): ReturnRecord | undefined {
    const all = load().map(r =>
      r.id === id
        ? { ...r, status: 'voided' as ReturnStatus, updated_at: new Date().toISOString() }
        : r
    );
    save(all);
    return all.find(r => r.id === id);
  },

  search(query: string): ReturnRecord[] {
    const q = query.toLowerCase().trim();
    if (!q) return load();
    return load().filter(r =>
      r.return_number.toLowerCase().includes(q) ||
      r.product_name.toLowerCase().includes(q) ||
      r.barcode.toLowerCase().includes(q) ||
      r.processed_by.toLowerCase().includes(q) ||
      String(r.original_sale_id ?? '').includes(q)
    );
  },
};

// ─── Display label maps ────────────────────────────────────────────────────────

export const RETURN_REASONS: Record<ReturnReason, string> = {
  damaged:            'Damaged',
  faulty:             'Faulty / Not working',
  wrong_item:         'Wrong item supplied',
  changed_mind:       'Customer changed mind',
  expired:            'Expired',
  not_working:        'Not working',
  poor_quality:       'Poor quality',
  duplicate_purchase: 'Duplicate purchase',
  other:              'Other',
};

export const RETURN_CONDITIONS: Record<ReturnCondition, string> = {
  resalable: 'Resalable',
  damaged:   'Damaged',
  expired:   'Expired',
  opened:    'Opened / Used',
  faulty:    'Faulty',
};

export const RETURN_TYPES: Record<ReturnType, string> = {
  full_return:    'Full Return',
  partial_return: 'Partial Return',
  exchange:       'Exchange',
  refund:         'Refund',
  faulty_item:    'Faulty Item',
};
