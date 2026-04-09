// Sync Service - Offline Queue and Conflict Resolution
// Handles data synchronization when connection is restored

import { supabase, isOnline, isSupabaseConfigured, getDeviceId } from './supabase-client';

// ============================================================
// TYPES
// ============================================================

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  payload: any;
  retryCount: number;
  error?: string;
  timestamp: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSync: number | null;
  pendingCount: number;
  error: string | null;
}

// ============================================================
// SYNC QUEUE (LocalStorage-backed)
// ============================================================

const QUEUE_KEY = 'kasi_sync_queue';
const STATE_KEY = 'kasi_sync_state';

class SyncQueue {
  private getQueue(): SyncQueueItem[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveQueue(queue: SyncQueueItem[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  add(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): void {
    const queue = this.getQueue();
    queue.push({
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    });
    this.saveQueue(queue);
    this.notifyListeners();
  }

  remove(id: string): void {
    const queue = this.getQueue().filter(item => item.id !== id);
    this.saveQueue(queue);
    this.notifyListeners();
  }

  update(id: string, updates: Partial<SyncQueueItem>): void {
    const queue = this.getQueue().map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.saveQueue(queue);
    this.notifyListeners();
  }

  getAll(): SyncQueueItem[] {
    return this.getQueue();
  }

  clear(): void {
    localStorage.removeItem(QUEUE_KEY);
    this.notifyListeners();
  }

  getPendingCount(): number {
    return this.getQueue().length;
  }

  // Listeners for UI updates
  private listeners: Set<() => void> = new Set();

  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb());
  }
}

export const syncQueue = new SyncQueue();

// ============================================================
// SYNC STATE
// ============================================================

class SyncStateManager {
  private getState(): SyncState {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || '{"status":"idle","lastSync":null,"pendingCount":0,"error":null}');
    } catch {
      return { status: 'idle', lastSync: null, pendingCount: 0, error: null };
    }
  }

  private saveState(state: Partial<SyncState>): void {
    const current = this.getState();
    const updated = { ...current, ...state };
    localStorage.setItem(STATE_KEY, JSON.stringify(updated));
    this.notifyListeners();
  }

  get(): SyncState {
    return { ...this.getState(), pendingCount: syncQueue.getPendingCount() };
  }

  setStatus(status: SyncStatus, error?: string): void {
    this.saveState({ status, error: error || null });
  }

  setLastSync(timestamp: number): void {
    this.saveState({ lastSync: timestamp });
  }

  // Listeners
  private listeners: Set<(state: SyncState) => void> = new Set();

  onChange(callback: (state: SyncState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const state = this.get();
    this.listeners.forEach(cb => cb(state));
  }
}

export const syncState = new SyncStateManager();

// ============================================================
// SYNC OPERATIONS
// ============================================================

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function processQueueItem(item: SyncQueueItem): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping sync');
    return true; // Mark as processed to clear queue
  }

  try {
    const { operation, table, recordId, payload } = item;

    switch (operation) {
      case 'create': {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
        break;
      }
      case 'update': {
        const { error } = await supabase.from(table).update(payload).eq('id', recordId);
        if (error) throw error;
        break;
      }
      case 'delete': {
        const { error } = await supabase.from(table).delete().eq('id', recordId);
        if (error) throw error;
        break;
      }
    }

    return true;
  } catch (error: any) {
    console.error('Sync error for item:', item.id, error);
    
    // Update retry count
    const newRetryCount = item.retryCount + 1;
    syncQueue.update(item.id, {
      retryCount: newRetryCount,
      error: error.message || 'Unknown error',
    });

    // If max retries reached, keep in queue but mark as failed
    if (newRetryCount >= MAX_RETRIES) {
      console.error('Max retries reached for item:', item.id);
      return false; // Keep in queue for manual retry
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * newRetryCount));
    return false;
  }
}

export async function syncPendingChanges(): Promise<void> {
  if (!isOnline()) {
    syncState.setStatus('offline');
    return;
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  const pending = syncQueue.getAll();
  if (pending.length === 0) {
    syncState.setStatus('idle');
    return;
  }

  syncState.setStatus('syncing');

  let successCount = 0;
  let failCount = 0;

  for (const item of pending) {
    const success = await processQueueItem(item);
    
    if (success) {
      syncQueue.remove(item.id);
      successCount++;
    } else if (item.retryCount >= MAX_RETRIES) {
      // Keep in queue but mark as failed
      failCount++;
    }
  }

  if (failCount > 0) {
    syncState.setStatus('error', `${failCount} items failed to sync`);
  } else if (successCount > 0) {
    syncState.setStatus('idle');
    syncState.setLastSync(Date.now());
  } else {
    syncState.setStatus('idle');
  }
}

// ============================================================
// DATA MIGRATION (from localStorage to Supabase)
// ============================================================

export async function migrateLocalDataToCloud(companyId: string): Promise<{ success: boolean; message: string; stats: any }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase not configured', stats: {} };
  }

  const stats = {
    users: 0,
    products: 0,
    sales: 0,
    returns: 0,
    errors: [] as string[],
  };

  try {
    // Migrate users
    const localUsers = JSON.parse(localStorage.getItem('kasi_users') || '[]');
    for (const user of localUsers) {
      try {
        await supabase.from('users').upsert({
          id: user.id || crypto.randomUUID(),
          company_id: companyId,
          username: user.username,
          password_hash: user.passwordHash || user.password_hash,
          role: user.role,
          is_active: true,
        });
        stats.users++;
      } catch (e: any) {
        stats.errors.push(`User ${user.username}: ${e.message}`);
      }
    }

    // Migrate products
    const localProducts = JSON.parse(localStorage.getItem('kasi_products') || '[]');
    for (const product of localProducts) {
      try {
        await supabase.from('products').upsert({
          id: String(product.id),
          company_id: companyId,
          name: product.name,
          description: product.description,
          barcode: product.barcode,
          purchase_price: product.purchase_price || 0,
          selling_price: product.price,
          stock_quantity: product.stock,
          is_active: true,
        });
        stats.products++;
      } catch (e: any) {
        stats.errors.push(`Product ${product.name}: ${e.message}`);
      }
    }

    // Migrate sales
    const localSales = JSON.parse(localStorage.getItem('kasi_sales') || '[]');
    for (const sale of localSales) {
      try {
        await supabase.from('sales').upsert({
          id: sale.id || crypto.randomUUID(),
          company_id: companyId,
          total_amount: sale.total,
          final_amount: sale.total,
          cashier_name: sale.cashier,
          created_at: sale.date + 'T' + (sale.time || '00:00:00'),
        });
        stats.sales++;
      } catch (e: any) {
        stats.errors.push(`Sale ${sale.id}: ${e.message}`);
      }
    }

    return {
      success: true,
      message: `Migration complete: ${stats.users} users, ${stats.products} products, ${stats.sales} sales`,
      stats,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Migration failed: ${error.message}`,
      stats,
    };
  }
}

// ============================================================
// AUTO-SYNC SETUP
// ============================================================

let syncInterval: number | null = null;

export function startAutoSync(intervalMs: number = 30000): void {
  stopAutoSync();
  
  // Sync immediately
  syncPendingChanges();
  
  // Then sync periodically
  syncInterval = window.setInterval(() => {
    if (isOnline() && syncQueue.getPendingCount() > 0) {
      syncPendingChanges();
    }
  }, intervalMs);

  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('Connection restored - syncing...');
    syncPendingChanges();
  });

  window.addEventListener('offline', () => {
    console.log('Connection lost - entering offline mode');
    syncState.setStatus('offline');
  });
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// ============================================================
// CONFLICT RESOLUTION
// ============================================================

export interface Conflict {
  table: string;
  recordId: string;
  localVersion: any;
  serverVersion: any;
  timestamp: number;
}

export function detectConflict(local: any, server: any): boolean {
  // Simple conflict detection: compare updated_at timestamps
  if (!local.updated_at && !server.updated_at) return false;
  
  const localTime = new Date(local.updated_at || 0).getTime();
  const serverTime = new Date(server.updated_at || 0).getTime();
  
  // If server has newer data, local is stale
  return serverTime > localTime;
}

export function resolveConflict(local: any, server: any, strategy: 'server-wins' | 'local-wins' | 'merge' = 'server-wins'): any {
  switch (strategy) {
    case 'server-wins':
      return server;
    case 'local-wins':
      return { ...local, updated_at: new Date().toISOString() };
    case 'merge':
      // Merge fields, preferring server for conflicts except specified fields
      return { ...server, ...local, updated_at: new Date().toISOString() };
    default:
      return server;
  }
}
