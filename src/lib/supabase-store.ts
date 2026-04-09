// Supabase Store - Cloud Data Layer for Kasi P.O.S
// All CRUD operations with offline fallback support

import { supabase, isSupabaseConfigured, getCurrentCompanyId, getDeviceId, handleSupabaseError } from './supabase-client';
import { store as localStore } from './store';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface Company {
  id: string;
  name: string;
  business_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  created_at?: string;
}

export interface User {
  id: string;
  company_id: string;
  username: string;
  email?: string;
  role: 'admin' | 'cashier' | 'manager';
  full_name?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  barcode?: string;
  sku?: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  supplier_id?: string;
  category?: string;
  image_url?: string;
  expiry_date?: string;
  not_expiring?: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_price_at_time: number;
}

export interface Sale {
  id: string;
  company_id: string;
  sale_number: string;
  total_amount: number;
  vat_amount?: number;
  discount_amount?: number;
  final_amount: number;
  payment_method: 'cash' | 'card' | 'mobile_money';
  status: 'completed' | 'voided' | 'refunded';
  cashier_id: string;
  cashier_name?: string;
  customer_name?: string;
  items: SaleItem[];
  created_at?: string;
}

export interface Return {
  id: string;
  company_id: string;
  return_number: string;
  sale_id?: string;
  product_id?: string;
  product_name: string;
  barcode?: string;
  quantity_returned: number;
  return_type: 'refund' | 'exchange' | 'store_credit';
  reason: string;
  reason_notes?: string;
  return_condition: 'resalable' | 'damaged' | 'expired' | 'opened' | 'faulty';
  refund_amount: number;
  exchange_product_name?: string;
  restock: boolean;
  status: 'completed' | 'voided' | 'pending';
  processed_by: string;
  processed_by_name?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id?: string;
  username: string;
  user_role: string;
  action_type: string;
  module_name?: string;
  description: string;
  item_name?: string;
  reference_id?: string;
  quantity?: number;
  previous_value?: string;
  new_value?: string;
  status: 'success' | 'failed' | 'pending';
  created_at?: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  status: 'trial' | 'trial_expired' | 'active' | 'expired' | 'pending' | 'failed' | 'grace_period' | 'suspended';
  plan: string;
  price: number;
  trial_start_date?: string;
  trial_end_date?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  last_payment_date?: string;
  next_renewal_date?: string;
  grace_period_end?: string;
  paystack_customer_code?: string;
  paystack_subscription_code?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const ensureCompanyId = (): string => {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    throw new Error('No company context set. Please log in.');
  }
  return companyId;
};

const getDeviceInfo = () => ({
  device_id: getDeviceId(),
  user_agent: navigator.userAgent,
});

// ============================================================
// COMPANIES
// ============================================================

export const companyApi = {
  async create(company: Omit<Company, 'id'>): Promise<Company> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return data;
  },

  async getById(id: string): Promise<Company | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async update(id: string, updates: Partial<Company>): Promise<Company> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return data;
  },
};

// ============================================================
// USERS
// ============================================================

export const userApi = {
  async create(user: Omit<User, 'id'>): Promise<User> {
    if (!isSupabaseConfigured()) {
      // Fallback to localStorage
      const users = localStore.getUsers();
      const newUser = { ...user, id: crypto.randomUUID() };
      localStore.setUsers([...users, newUser as any]);
      return newUser as User;
    }

    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return data;
  },

  async getByCompany(companyId: string): Promise<User[]> {
    if (!isSupabaseConfigured()) {
      const localUsers = localStore.getUsers();
      return localUsers.map(u => ({
        id: String((u as any).id || crypto.randomUUID()),
        company_id: companyId,
        username: u.username,
        email: (u as any).email,
        role: u.role as 'admin' | 'cashier' | 'manager',
        full_name: (u as any).full_name,
        is_active: true,
        last_login_at: (u as any).lastLoginAt,
        created_at: (u as any).createdAt,
      })) as User[];
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw handleSupabaseError(error);
    return data || [];
  },

  async getByUsername(companyId: string, username: string): Promise<User | null> {
    if (!isSupabaseConfigured()) {
      const users = localStore.getUsers();
      const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!found) return null;
      return {
        id: String((found as any).id || crypto.randomUUID()),
        company_id: companyId,
        username: found.username,
        email: (found as any).email,
        role: found.role as 'admin' | 'cashier' | 'manager',
        full_name: (found as any).full_name,
        is_active: true,
        last_login_at: (found as any).lastLoginAt,
        created_at: (found as any).createdAt,
      } as User;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .eq('username', username)
      .single();

    if (error) return null;
    return data;
  },

  async updateLoginTime(userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  },

  async delete(userId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const users = localStore.getUsers().filter((u: any) => String(u.id) !== userId);
      localStore.setUsers(users);
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) throw handleSupabaseError(error);
  },
};

// ============================================================
// PRODUCTS
// ============================================================

export const productApi = {
  async create(product: Omit<Product, 'id'>): Promise<Product> {
    if (!isSupabaseConfigured()) {
      const products = localStore.getProducts();
      const newProduct = { ...product, id: crypto.randomUUID(), stock: product.stock_quantity };
      localStore.setProducts([...products, newProduct as any]);
      return newProduct as Product;
    }

    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return data;
  },

  async getByCompany(companyId: string): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
      return localStore.getProducts().map((p: any) => ({
        id: String(p.id),
        company_id: companyId,
        name: p.name,
        description: p.description,
        barcode: p.barcode,
        sku: p.sku,
        purchase_price: p.purchase_price || 0,
        selling_price: p.price,
        stock_quantity: p.stock,
        min_stock_level: p.min_stock_level || 10,
        supplier_id: p.supplier_id,
        category: p.category,
        image_url: p.image,
        expiry_date: p.expiry_date,
        not_expiring: p.not_expiring,
        is_active: true,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })) as Product[];
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (error) throw handleSupabaseError(error);
    return data || [];
  },

  async getByBarcode(companyId: string, barcode: string): Promise<Product | null> {
    if (!isSupabaseConfigured()) {
      const products = localStore.getProducts();
      const found = products.find((p: any) => p.barcode === barcode);
      if (!found) return null;
      return {
        id: String(found.id),
        company_id: companyId,
        name: found.name,
        description: found.description,
        barcode: found.barcode,
        sku: (found as any).sku,
        purchase_price: found.purchase_price || 0,
        selling_price: found.price,
        stock_quantity: found.stock,
        min_stock_level: 10,
        supplier_id: (found as any).supplier_id,
        category: (found as any).category,
        image_url: found.image,
        expiry_date: found.expiry_date,
        not_expiring: found.not_expiring,
        is_active: true,
      } as Product;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('barcode', barcode)
      .single();

    if (error) return null;
    return data;
  },

  async updateStock(productId: string, newStock: number): Promise<void> {
    if (!isSupabaseConfigured()) {
      const products = localStore.getProducts().map((p: any) =>
        String(p.id) === productId ? { ...p, stock: newStock } : p
      );
      localStore.setProducts(products);
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) throw handleSupabaseError(error);
  },

  async delete(productId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const products = localStore.getProducts().filter((p: any) => String(p.id) !== productId);
      localStore.setProducts(products);
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId);

    if (error) throw handleSupabaseError(error);
  },

  subscribeToChanges(companyId: string, callback: (payload: any) => void): () => void {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel(`products:${companyId}`)
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

    return () => channel.unsubscribe();
  },
};

// ============================================================
// SALES
// ============================================================

export const saleApi = {
  async create(sale: Omit<Sale, 'id' | 'sale_number'>, items: SaleItem[]): Promise<Sale> {
    if (!isSupabaseConfigured()) {
      // Fallback to localStorage
      const localSale = {
        id: crypto.randomUUID(),
        ...sale,
        sale_number: 'SALE-' + Date.now(),
        items: items.map(i => ({
          ...i,
          productId: i.product_id,
          name: i.product_name,
          price: i.unit_price,
        })),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
      };
      
      const sales = JSON.parse(localStorage.getItem('kasi_sales') || '[]');
      sales.push(localSale);
      localStorage.setItem('kasi_sales', JSON.stringify(sales));
      
      // Update stock
      items.forEach(item => {
        const products = localStore.getProducts().map((p: any) =>
          String(p.id) === item.product_id ? { ...p, stock: p.stock - item.quantity } : p
        );
        localStore.setProducts(products);
      });
      
      return localSale as unknown as Sale;
    }

    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        ...sale,
        device_id: getDeviceId(),
      })
      .select()
      .single();

    if (saleError) throw handleSupabaseError(saleError);

    // Insert sale items
    const saleItems = items.map(item => ({
      sale_id: saleData.id,
      ...item,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw handleSupabaseError(itemsError);

    return { ...saleData, items };
  },

  async getByCompany(companyId: string, limit: number = 100): Promise<Sale[]> {
    if (!isSupabaseConfigured()) {
      return JSON.parse(localStorage.getItem('kasi_sales') || '[]').map((s: any) => ({
        ...s,
        final_amount: s.total || 0,
        items: s.items || [],
        sale_number: s.sale_number || s.id,
      })) as unknown as Sale[];
    }

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw handleSupabaseError(error);
    return data || [];
  },

  async getByDateRange(companyId: string, startDate: string, endDate: string): Promise<Sale[]> {
    if (!isSupabaseConfigured()) {
      const allSales = JSON.parse(localStorage.getItem('kasi_sales') || '[]');
      return allSales.filter((s: any) => s.date >= startDate && s.date <= endDate).map((s: any) => ({
        ...s,
        sale_number: s.sale_number || s.id,
        final_amount: s.total || 0,
        items: s.items || [],
      })) as unknown as Sale[];
    }

    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        items:sale_items(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (error) throw handleSupabaseError(error);
    return data || [];
  },

  subscribeToNewSales(companyId: string, callback: (sale: Sale) => void): () => void {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel(`sales:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => callback(payload.new as Sale)
      )
      .subscribe();

    return () => channel.unsubscribe();
  },
};

// ============================================================
// RETURNS
// ============================================================

export const returnApi = {
  async create(ret: Omit<Return, 'id' | 'return_number'>): Promise<Return> {
    if (!isSupabaseConfigured()) {
      const newReturn = {
        id: crypto.randomUUID(),
        ...ret,
        return_number: 'RET-' + Date.now(),
        created_at: new Date().toISOString(),
      };
      
      const returns = JSON.parse(localStorage.getItem('kasi_returns') || '[]');
      returns.push(newReturn);
      localStorage.setItem('kasi_returns', JSON.stringify(returns));
      
      // Restock if applicable
      if (ret.restock && ret.product_id) {
        const products = localStore.getProducts().map((p: any) =>
          String(p.id) === ret.product_id ? { ...p, stock: p.stock + ret.quantity_returned } : p
        );
        localStore.setProducts(products);
      }
      
      return newReturn as unknown as Return;
    }

    const { data, error } = await supabase
      .from('returns')
      .insert({
        ...ret,
        device_id: getDeviceId(),
      })
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return data;
  },

  async getByCompany(companyId: string): Promise<Return[]> {
    if (!isSupabaseConfigured()) {
      return JSON.parse(localStorage.getItem('kasi_returns') || '[]') as Return[];
    }

    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'voided')
      .order('created_at', { ascending: false });

    if (error) throw handleSupabaseError(error);
    return data || [];
  },

  async void(returnId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const returns = JSON.parse(localStorage.getItem('kasi_returns') || '[]').map((r: Return) =>
        r.id === returnId ? { ...r, status: 'voided' } : r
      );
      localStorage.setItem('kasi_returns', JSON.stringify(returns));
      return;
    }

    const { error } = await supabase
      .from('returns')
      .update({ status: 'voided' })
      .eq('id', returnId);

    if (error) throw handleSupabaseError(error);
  },
};

// ============================================================
// AUDIT LOGS
// ============================================================

export const auditApi = {
  async create(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    if (!isSupabaseConfigured()) {
      const newLog = { id: crypto.randomUUID(), ...log };
      const logs = JSON.parse(localStorage.getItem('kasi_audit_logs') || '[]');
      logs.push(newLog);
      // Keep only last 2000
      if (logs.length > 2000) logs.shift();
      localStorage.setItem('kasi_audit_logs', JSON.stringify(logs));
      return newLog as AuditLog;
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        ...log,
        device_id: getDeviceId(),
      })
      .select()
      .single();

    if (error) {
      // Don't throw - audit logs should never crash the app
      console.error('Audit log error:', error);
      return null as any;
    }
    return data;
  },

  async getByCompany(companyId: string, limit: number = 100): Promise<AuditLog[]> {
    if (!isSupabaseConfigured()) {
      return JSON.parse(localStorage.getItem('kasi_audit_logs') || '[]').slice(-limit) as AuditLog[];
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw handleSupabaseError(error);
    return data || [];
  },
};

// ============================================================
// SUBSCRIPTIONS
// ============================================================

export const subscriptionApi = {
  async getByCompany(companyId: string): Promise<Subscription | null> {
    if (!isSupabaseConfigured()) {
      // Fallback to localStorage subscription store
      const subData = localStorage.getItem('kasi_subscription_v2');
      if (subData) {
        const data = JSON.parse(subData);
        return {
          id: data.company_id,
          company_id: data.company_id,
          status: data.subscription_status,
          plan: data.subscription_plan,
          price: data.subscription_price,
          trial_start_date: data.trial_start_date,
          trial_end_date: data.trial_end_date,
          last_payment_date: data.last_payment_date,
          next_renewal_date: data.next_renewal_date,
          grace_period_end: data.grace_period_end,
          paystack_reference: data.paystack_reference,
        } as Subscription;
      }
      return null;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error) return null;
    return data;
  },

  async create(subscription: Omit<Subscription, 'id'>): Promise<Subscription> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase required for subscription management');
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) throw handleSupabaseError(error);
    return data;
  },

  async updateStatus(companyId: string, status: Subscription['status'], updates: Partial<Subscription> = {}): Promise<void> {
    if (!isSupabaseConfigured()) {
      // Update localStorage
      const subData = JSON.parse(localStorage.getItem('kasi_subscription_v2') || '{}');
      subData.subscription_status = status;
      Object.assign(subData, updates);
      localStorage.setItem('kasi_subscription_v2', JSON.stringify(subData));
      return;
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({ status, ...updates, updated_at: new Date().toISOString() })
      .eq('company_id', companyId);

    if (error) throw handleSupabaseError(error);
  },
};

// ============================================================
// DEVICES
// ============================================================

export const deviceApi = {
  async register(device: { company_id: string; device_name?: string; is_primary?: boolean }): Promise<void> {
    if (!isSupabaseConfigured()) {
      // Store in localStorage
      const devices = JSON.parse(localStorage.getItem('kasi_devices') || '[]');
      const existing = devices.find((d: any) => d.device_id === getDeviceId());
      
      if (!existing) {
        devices.push({
          device_id: getDeviceId(),
          ...device,
          is_approved: true,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('kasi_devices', JSON.stringify(devices));
      }
      return;
    }

    const { error } = await supabase
      .from('devices')
      .upsert({
        device_id: getDeviceId(),
        ...device,
        last_login_at: new Date().toISOString(),
      }, { onConflict: 'company_id,device_id' });

    if (error) throw handleSupabaseError(error);
  },

  async getByCompany(companyId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      return JSON.parse(localStorage.getItem('kasi_devices') || '[]');
    }

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('company_id', companyId)
      .order('last_login_at', { ascending: false });

    if (error) throw handleSupabaseError(error);
    return data || [];
  },

  async approve(deviceId: string, approvedBy: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const devices = JSON.parse(localStorage.getItem('kasi_devices') || '[]').map((d: any) =>
        d.device_id === deviceId ? { ...d, is_approved: true, approved_at: new Date().toISOString() } : d
      );
      localStorage.setItem('kasi_devices', JSON.stringify(devices));
      return;
    }

    const { error } = await supabase
      .from('devices')
      .update({
        is_approved: true,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('device_id', deviceId);

    if (error) throw handleSupabaseError(error);
  },
};
