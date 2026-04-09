// Reusable audit logging helper for Kasi P.O.S
// Call auditLog() from any module to record an action.

import { auditStore, AuditLog, ActionType, LogStatus } from '@/lib/audit-store';

function getCurrentAuth(): { username: string; role: string } {
  try {
    const raw = localStorage.getItem('kasi_auth');
    if (raw) return JSON.parse(raw) as { username: string; role: string };
  } catch { /* ignore */ }
  return { username: 'system', role: 'system' };
}

let _seq = 0;
function genId(): string {
  return `${Date.now()}-${(++_seq).toString(36)}`;
}

export interface LogParams {
  action_type: ActionType;
  module_name: string;
  description: string;
  username?: string;
  user_role?: string;
  item_name?: string;
  reference_id?: string;
  quantity?: number;
  previous_value?: string;
  new_value?: string;
  status?: LogStatus;
}

export function auditLog(params: LogParams): void {
  try {
    const auth = getCurrentAuth();
    const entry: AuditLog = {
      id: genId(),
      timestamp: new Date().toISOString(),
      username: params.username ?? auth.username,
      user_role: params.user_role ?? auth.role,
      action_type: params.action_type,
      module_name: params.module_name,
      description: params.description,
      item_name: params.item_name,
      reference_id: params.reference_id,
      quantity: params.quantity,
      previous_value: params.previous_value,
      new_value: params.new_value,
      status: params.status ?? 'success',
    };
    auditStore.add(entry);
  } catch { /* logging must never crash the app */ }
}
