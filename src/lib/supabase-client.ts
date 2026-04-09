// Supabase Client Configuration
// Real-time multi-device sync for Kasi P.O.S

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Environment variables (set in Netlify dashboard)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Create Supabase client
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'http://localhost',
  SUPABASE_ANON_KEY || 'dummy-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    db: {
      schema: 'public',
    },
  }
);

// ============================================================
// COMPANY CONTEXT
// ============================================================
let currentCompanyId: string | null = null;

export const setCurrentCompanyId = (companyId: string | null): void => {
  currentCompanyId = companyId;
};

export const getCurrentCompanyId = (): string | null => {
  return currentCompanyId;
};

// ============================================================
// DEVICE ID
// ============================================================
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('kasi_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('kasi_device_id', deviceId);
  }
  return deviceId;
};

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================
const activeChannels: Map<string, RealtimeChannel> = new Map();

export const subscribeToProducts = (
  companyId: string,
  callback: (payload: any) => void
): (() => void) => {
  const channelName = `products:${companyId}`;
  
  // Unsubscribe if already exists
  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName)?.unsubscribe();
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `company_id=eq.${companyId}`,
      },
      callback
    )
    .subscribe();

  activeChannels.set(channelName, channel);

  // Return unsubscribe function
  return () => {
    channel.unsubscribe();
    activeChannels.delete(channelName);
  };
};

export const subscribeToSales = (
  companyId: string,
  callback: (payload: any) => void
): (() => void) => {
  const channelName = `sales:${companyId}`;
  
  if (activeChannels.has(channelName)) {
    activeChannels.get(channelName)?.unsubscribe();
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sales',
        filter: `company_id=eq.${companyId}`,
      },
      callback
    )
    .subscribe();

  activeChannels.set(channelName, channel);

  return () => {
    channel.unsubscribe();
    activeChannels.delete(channelName);
  };
};

export const unsubscribeAll = (): void => {
  activeChannels.forEach((channel) => channel.unsubscribe());
  activeChannels.clear();
};

// ============================================================
// OFFLINE MODE DETECTION
// ============================================================
export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const onConnectionChange = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  const handleOnline = () => onOnline();
  const handleOffline = () => onOffline();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// ============================================================
// ERROR HANDLING
// ============================================================
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export const handleSupabaseError = (error: any): SupabaseError => {
  if (error?.code === '23505') {
    return new SupabaseError('A record with this information already exists.', 'DUPLICATE');
  }
  if (error?.code === '42501') {
    return new SupabaseError('You do not have permission to perform this action.', 'PERMISSION');
  }
  if (error?.code === 'PGRST116') {
    return new SupabaseError('Record not found.', 'NOT_FOUND');
  }
  return new SupabaseError(
    error?.message || 'An unexpected error occurred.',
    error?.code,
    error?.details
  );
};

// ============================================================
// FALLBACK MODE (localStorage when Supabase not configured)
// ============================================================
export const useLocalStorageFallback = (): boolean => {
  return !isSupabaseConfigured();
};
