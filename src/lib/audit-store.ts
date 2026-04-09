// Audit / Activity log — localStorage-backed store for Kasi P.O.S

export type ActionType =
  | 'SALE_COMPLETED'
  | 'STOCK_RECEIVED'
  | 'STOCK_ADJUSTED'
  | 'PRODUCT_ADDED'
  | 'PRODUCT_EDITED'
  | 'PRODUCT_DELETED'
  | 'EXPIRED_REMOVED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_ADDED'
  | 'USER_REMOVED'
  | 'ADMIN_OVERRIDE'
  | 'VOID_ACTION'
  | 'LOGIN_FAILED'
  | 'SUBSCRIPTION_CHANGED'
  | 'RETURN_CREATED'
  | 'RETURN_VOIDED';

export type LogStatus = 'success' | 'failed' | 'pending';

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  user_role: string;
  action_type: ActionType;
  module_name: string;
  item_name?: string;
  reference_id?: string;
  quantity?: number;
  previous_value?: string;
  new_value?: string;
  description: string;
  status: LogStatus;
}

const KEY = 'kasi_audit_logs';
const MAX_ENTRIES = 2000;

export const auditStore = {
  getAll(): AuditLog[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]') as AuditLog[];
    } catch {
      return [];
    }
  },

  add(entry: AuditLog): void {
    try {
      const all = auditStore.getAll();
      all.push(entry);
      const trimmed = all.length > MAX_ENTRIES ? all.slice(all.length - MAX_ENTRIES) : all;
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      // Storage quota — silently ignore; logging must never crash the app
    }
  },

  clear(): void {
    localStorage.removeItem(KEY);
  },
};
