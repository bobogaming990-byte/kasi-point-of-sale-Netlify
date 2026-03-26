// Local state store for Kasi P.O.S (will be replaced with Lovable Cloud later)

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'cashier';
  created_at: string;
}

export interface Supplier {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  purchase_price: number;
  price: number; // selling price
  stock: number;
  stock_received: number;
  supplier: Supplier;
  barcode: string;
  image?: string;
  expiry_date?: string;
  not_expiring: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: number;
  total: number;
  date: string;
  cashier: string;
  items: { productId: number; name: string; quantity: number; price: number }[];
}

// Default data
const defaultProducts: Product[] = [
  { id: 1, name: "Coca-Cola 2L", description: "Carbonated soft drink 2 litre", purchase_price: 16.00, price: 22.99, stock: 48, stock_received: 50, supplier: { name: "SAB", phone: "011 881 8111", email: "orders@sab.co.za", address: "Sandton, Johannesburg" }, barcode: "6001134000012", expiry_date: "2026-12-01", not_expiring: false },
  { id: 2, name: "White Star Maize 2.5kg", description: "Super maize meal", purchase_price: 28.00, price: 39.99, stock: 30, stock_received: 40, supplier: { name: "Pioneer Foods", phone: "021 807 1100", email: "info@pioneerfoods.co.za", address: "Paarl, Western Cape" }, barcode: "6001240000015", expiry_date: "2027-06-15", not_expiring: false },
  { id: 3, name: "Sunlight Soap Bar", description: "Laundry bar soap", purchase_price: 9.00, price: 14.50, stock: 60, stock_received: 60, supplier: { name: "Unilever", phone: "011 570 7000", email: "info@unilever.co.za", address: "La Lucia, Durban" }, barcode: "6001087000018", not_expiring: true },
  { id: 4, name: "Albany Bread", description: "White sliced bread", purchase_price: 13.00, price: 18.99, stock: 20, stock_received: 25, supplier: { name: "Tiger Brands", phone: "011 840 4000", email: "info@tigerbrands.com", address: "Bryanston, Johannesburg" }, barcode: "6001070000011", expiry_date: "2026-04-05", not_expiring: false },
  { id: 5, name: "Lucky Star Pilchards", description: "Pilchards in tomato sauce 400g", purchase_price: 20.00, price: 29.99, stock: 45, stock_received: 50, supplier: { name: "Oceana Group", phone: "021 410 1400", email: "info@oceana.co.za", address: "Cape Town" }, barcode: "6001056000014", expiry_date: "2028-03-20", not_expiring: false },
  { id: 6, name: "Simba Chips 125g", description: "Potato chips assorted flavours", purchase_price: 11.00, price: 16.99, stock: 55, stock_received: 60, supplier: { name: "PepsiCo", phone: "011 884 0600", email: "info@pepsico.co.za", address: "Sandton, Johannesburg" }, barcode: "6001134500019", expiry_date: "2026-09-10", not_expiring: false },
  { id: 7, name: "Omo Washing Powder 2kg", description: "Auto washing powder", purchase_price: 62.00, price: 89.99, stock: 15, stock_received: 20, supplier: { name: "Unilever", phone: "011 570 7000", email: "info@unilever.co.za", address: "La Lucia, Durban" }, barcode: "6001087500012", not_expiring: true },
  { id: 8, name: "Five Roses Tea 100s", description: "Tagless tea bags 100 pack", purchase_price: 32.00, price: 44.99, stock: 25, stock_received: 30, supplier: { name: "AVI", phone: "011 502 2600", email: "info@avi.co.za", address: "Bryanston, Johannesburg" }, barcode: "6001240500010", expiry_date: "2027-12-01", not_expiring: false },
];

const defaultUsers: User[] = [
  { id: 1, username: "admin", role: "admin", created_at: "2026-01-01T00:00:00Z" },
  { id: 2, username: "cashier1", role: "cashier", created_at: "2026-02-15T00:00:00Z" },
];

const defaultSales: Sale[] = [
  { id: 1, total: 61.97, date: "2026-03-26", cashier: "cashier1", items: [{ productId: 1, name: "Coca-Cola 2L", quantity: 1, price: 22.99 }, { productId: 4, name: "Albany Bread", quantity: 1, price: 18.99 }, { productId: 6, name: "Simba Chips 125g", quantity: 1, price: 16.99 }] },
  { id: 2, total: 84.98, date: "2026-03-26", cashier: "admin", items: [{ productId: 2, name: "White Star Maize 2.5kg", quantity: 1, price: 39.99 }, { productId: 8, name: "Five Roses Tea 100s", quantity: 1, price: 44.99 }] },
  { id: 3, total: 134.48, date: "2026-03-25", cashier: "cashier1", items: [{ productId: 7, name: "Omo Washing Powder 2kg", quantity: 1, price: 89.99 }, { productId: 3, name: "Sunlight Soap Bar", quantity: 1, price: 14.50 }, { productId: 5, name: "Lucky Star Pilchards", quantity: 1, price: 29.99 }] },
];

// Simple localStorage-based store
function load<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(`kasi_${key}`);
    return data ? JSON.parse(data) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(`kasi_${key}`, JSON.stringify(data));
}

export const store = {
  getProducts: (): Product[] => load('products', defaultProducts),
  setProducts: (p: Product[]) => save('products', p),

  getUsers: (): User[] => load('users', defaultUsers),
  setUsers: (u: User[]) => save('users', u),

  getSales: (): Sale[] => load('sales', defaultSales),
  setSales: (s: Sale[]) => save('sales', s),

  getAuth: (): { username: string; role: string } | null => load('auth', null),
  setAuth: (a: { username: string; role: string } | null) => save('auth', a),

  login: (username: string, password: string): { success: boolean; role?: string } => {
    // Demo: admin/admin123, cashier1/cashier1
    const creds: Record<string, { password: string; role: string }> = {
      admin: { password: "admin123", role: "admin" },
      cashier1: { password: "cashier1", role: "cashier" },
    };
    // Also check dynamically added users
    const users = load<User[]>('users', defaultUsers);
    users.forEach(u => {
      if (!creds[u.username]) {
        creds[u.username] = { password: u.username, role: u.role };
      }
    });
    const user = creds[username];
    if (user && user.password === password) {
      const auth = { username, role: user.role };
      save('auth', auth);
      return { success: true, role: user.role };
    }
    return { success: false };
  },

  logout: () => {
    localStorage.removeItem('kasi_auth');
  },

  // Trial management
  getTrialStart: (): string => {
    let start = localStorage.getItem('kasi_trial_start');
    if (!start) {
      start = new Date().toISOString();
      localStorage.setItem('kasi_trial_start', start);
    }
    return start;
  },

  getTrialDaysLeft: (): number => {
    const start = new Date(store.getTrialStart());
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 90 - elapsed);
  },

  isTrialExpired: (): boolean => {
    return store.getTrialDaysLeft() <= 0 && !store.isSubscribed();
  },

  isSubscribed: (): boolean => {
    return load('subscribed', false);
  },

  setSubscribed: (val: boolean) => {
    save('subscribed', val);
  },

  addSale: (items: CartItem[], total: number, cashier: string): number => {
    const sales = load<Sale[]>('sales', defaultSales);
    const id = sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1;
    const sale: Sale = {
      id, total, date: new Date().toISOString().slice(0, 10), cashier,
      items: items.map(i => ({ productId: i.id, name: i.name, quantity: i.quantity, price: i.price })),
    };
    sales.push(sale);
    save('sales', sales);

    // Update stock
    const products = load<Product[]>('products', defaultProducts);
    items.forEach(item => {
      const p = products.find(pr => pr.id === item.id);
      if (p) p.stock = Math.max(0, p.stock - item.quantity);
    });
    save('products', products);
    return id;
  },
};
