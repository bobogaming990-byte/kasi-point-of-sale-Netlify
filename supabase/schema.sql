-- Kasi P.O.S Supabase Database Schema
-- Multi-tenant POS system with real-time sync

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES (Tenants)
-- ============================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    business_name TEXT,
    registration_number TEXT,
    vat_number TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    logo_url TEXT,
    show_powered_by BOOLEAN DEFAULT true,
    footer_note TEXT,
    receipt_note TEXT,
    vat_enabled BOOLEAN DEFAULT false,
    vat_rate DECIMAL(5,2) DEFAULT 15.00,
    currency TEXT DEFAULT 'ZAR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'manager')),
    full_name TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, username)
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    contact_person TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    barcode TEXT,
    sku TEXT,
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    stock_received INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category TEXT,
    image_url TEXT,
    expiry_date DATE,
    not_expiring BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(company_id, barcode)
);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sale_number TEXT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mobile_money')),
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'refunded')),
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    cashier_name TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    notes TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALE ITEMS
-- ============================================================
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    purchase_price_at_time DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RETURNS
-- ============================================================
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    return_number TEXT NOT NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    barcode TEXT,
    quantity_returned INTEGER NOT NULL DEFAULT 1,
    return_type TEXT DEFAULT 'refund' CHECK (return_type IN ('refund', 'exchange', 'store_credit')),
    reason TEXT NOT NULL,
    reason_notes TEXT,
    return_condition TEXT NOT NULL CHECK (return_condition IN ('resalable', 'damaged', 'expired', 'opened', 'faulty')),
    refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    exchange_product_name TEXT,
    restock BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'pending')),
    processed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    processed_by_name TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PREPAID TRANSACTIONS (Airtime/Data)
-- ============================================================
CREATE TABLE prepaid_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('airtime', 'data', 'electricity')),
    network TEXT,
    phone_number TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    voucher_pin TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
    reference TEXT,
    external_reference TEXT,
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username TEXT,
    user_role TEXT,
    action_type TEXT NOT NULL,
    module_name TEXT,
    description TEXT NOT NULL,
    item_name TEXT,
    reference_id TEXT,
    quantity INTEGER,
    previous_value TEXT,
    new_value TEXT,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    ip_address TEXT,
    user_agent TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'trial_expired', 'active', 'expired', 'pending', 'failed', 'grace_period', 'suspended')),
    plan TEXT DEFAULT 'monthly',
    price DECIMAL(12,2) DEFAULT 55.00,
    trial_start_date TIMESTAMPTZ,
    trial_end_date TIMESTAMPTZ,
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    last_payment_date TIMESTAMPTZ,
    next_renewal_date TIMESTAMPTZ,
    grace_period_end TIMESTAMPTZ,
    paystack_customer_code TEXT,
    paystack_subscription_code TEXT,
    paystack_authorization_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENT HISTORY
-- ============================================================
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    gateway TEXT DEFAULT 'paystack',
    gateway_reference TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEVICES (Multi-device registry)
-- ============================================================
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, device_id)
);

-- ============================================================
-- SYNC QUEUE (For offline support)
-- ============================================================
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    payload JSONB NOT NULL,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_username ON users(company_id, username);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_barcode ON products(company_id, barcode);
CREATE INDEX idx_sales_company ON sales(company_id);
CREATE INDEX idx_sales_created ON sales(company_id, created_at);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_returns_company ON returns(company_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(company_id, created_at);
CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_devices_company ON devices(company_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status, company_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see their own company
CREATE POLICY company_isolation ON companies
    FOR ALL
    USING (id IN (
        SELECT company_id FROM users WHERE auth.uid() = users.id
    ));

-- Users: Can only see users in their company
CREATE POLICY user_isolation ON users
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users WHERE auth.uid() = users.id
    ));

-- Products: Can only see products in their company
CREATE POLICY product_isolation ON products
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users WHERE auth.uid() = users.id
    ));

-- Sales: Can only see sales in their company
CREATE POLICY sale_isolation ON sales
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users WHERE auth.uid() = users.id
    ));

-- Sale Items: Can only see items from sales in their company
CREATE POLICY sale_item_isolation ON sale_items
    FOR ALL
    USING (sale_id IN (
        SELECT id FROM sales WHERE company_id IN (
            SELECT company_id FROM users WHERE auth.uid() = users.id
        )
    ));

-- Returns: Can only see returns in their company
CREATE POLICY return_isolation ON returns
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users WHERE auth.uid() = users.id
    ));

-- Audit Logs: Can only see logs in their company
CREATE POLICY audit_log_isolation ON audit_logs
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users WHERE auth.uid() = users.id
    ));

-- Subscriptions: Can only see their company's subscription
CREATE POLICY subscription_isolation ON subscriptions
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users WHERE auth.uid() = users.id
    ));

-- Devices: Can only see devices in their company
CREATE POLICY device_isolation ON devices
    FOR ALL
    USING (company_id IN (
        SELECT company_id FROM users WHERE auth.uid() = users.id
    ));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate sale number
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sale_number := 'SALE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(
        (SELECT COUNT(*) + 1 FROM sales WHERE DATE(created_at) = CURRENT_DATE)::TEXT, 4, '0'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sale_number BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION generate_sale_number();

-- Generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.return_number := 'RET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(
        (SELECT COUNT(*) + 1 FROM returns WHERE DATE(created_at) = CURRENT_DATE)::TEXT, 4, '0'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_return_number BEFORE INSERT ON returns
    FOR EACH ROW EXECUTE FUNCTION generate_return_number();

-- Decrement stock on sale
CREATE OR REPLACE FUNCTION decrement_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_stock AFTER INSERT ON sale_items
    FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_sale();

-- Increment stock on return (if restocking)
CREATE OR REPLACE FUNCTION increment_stock_on_return()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.restock AND NEW.product_id IS NOT NULL THEN
        UPDATE products 
        SET stock_quantity = stock_quantity + NEW.quantity_returned
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_stock AFTER INSERT ON returns
    FOR EACH ROW EXECUTE FUNCTION increment_stock_on_return();
