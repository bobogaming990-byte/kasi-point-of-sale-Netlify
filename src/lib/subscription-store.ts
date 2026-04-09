// Subscription store for Kasi P.O.S
// Manages trial countdown and subscription lifecycle in localStorage.
// Backward-compatible: reads/writes legacy keys used by src/lib/store.ts.

export type SubscriptionStatus =
  | 'trial'           // Trial active
  | 'trial_expired'   // Trial ended, not subscribed
  | 'active'          // Paid subscription active
  | 'expired'         // Subscription renewal missed
  | 'pending'         // Payment initiated, awaiting confirmation
  | 'failed'          // Last payment attempt failed
  | 'grace_period'    // Payment failed but within 5-day grace window
  | 'suspended';      // Grace period ended — features locked

/** Features that can be access-gated by subscription status. */
export type AccessFeature = 'sales' | 'inventory' | 'airtime' | 'returns' | 'users';
export interface AccessResult  { allowed: boolean; reason: string | null; }

export interface PaymentHistoryEntry {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  reference: string;
  gateway: string;
}

export interface SubscriptionData {
  company_id: string;
  trial_start_date: string;
  trial_end_date: string;
  subscription_status: SubscriptionStatus;
  subscription_plan: 'monthly';
  subscription_price: number;
  last_payment_date: string | null;
  next_renewal_date: string | null;
  grace_period_end:  string | null;
  paystack_reference: string | null;
  payment_reference: string | null;
  payment_history: PaymentHistoryEntry[];
}

const TRIAL_DAYS    = 90;
const PLAN_PRICE    = 55;
const KEY           = 'kasi_subscription_v2';
const COMPANY_KEY   = 'kasi_company_id';
const LEGACY_TRIAL  = 'kasi_trial_start';
const LEGACY_SUB    = 'kasi_subscribed';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function genId(): string {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getCompanyId(): string {
  let id = localStorage.getItem(COMPANY_KEY);
  if (!id) { id = genId(); localStorage.setItem(COMPANY_KEY, id); }
  return id;
}

function getTrialStart(): string {
  const legacy = localStorage.getItem(LEGACY_TRIAL);
  if (legacy) return legacy;
  const now = new Date().toISOString();
  localStorage.setItem(LEGACY_TRIAL, now);
  return now;
}

function load(): SubscriptionData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SubscriptionData) : null;
  } catch { return null; }
}

function persist(data: SubscriptionData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function buildDefault(): SubscriptionData {
  const trialStart  = getTrialStart();
  const trialEnd    = new Date(new Date(trialStart).getTime() + TRIAL_DAYS * 86_400_000).toISOString();
  const legacySub   = localStorage.getItem(LEGACY_SUB);
  const isLegacySub = legacySub === 'true' || legacySub === '"true"';
  const daysLeft    = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86_400_000));

  const status: SubscriptionStatus =
    isLegacySub ? 'active' : daysLeft <= 0 ? 'trial_expired' : 'trial';

  return {
    company_id:           getCompanyId(),
    trial_start_date:     trialStart,
    trial_end_date:       trialEnd,
    subscription_status:  status,
    subscription_plan:    'monthly',
    subscription_price:   PLAN_PRICE,
    last_payment_date:    null,
    next_renewal_date:    null,
    grace_period_end:     null,
    paystack_reference:   null,
    payment_reference:    null,
    payment_history:      [],
  };
}

// ─── Public store ─────────────────────────────────────────────────────────────

export const subscriptionStore = {
  /** Get full subscription data, auto-recalculating status from dates. */
  get(): SubscriptionData {
    const stored = load() ?? buildDefault();
    const now    = Date.now();
    let dirty    = false;

    if (stored.subscription_status === 'trial' && now > new Date(stored.trial_end_date).getTime()) {
      stored.subscription_status = 'trial_expired';
      dirty = true;
    }
    if (
      stored.subscription_status === 'active' &&
      stored.next_renewal_date &&
      now > new Date(stored.next_renewal_date).getTime()
    ) {
      stored.subscription_status = 'expired';
      dirty = true;
    }
    // Auto-promote grace period → suspended when window closes
    if (stored.subscription_status === 'grace_period' && stored.grace_period_end) {
      if (now > new Date(stored.grace_period_end).getTime()) {
        stored.subscription_status = 'suspended';
        dirty = true;
      }
    }
    if (dirty) persist(stored);
    return stored;
  },

  getCompanyId(): string { return subscriptionStore.get().company_id; },

  getTrialDaysLeft(): number {
    const end = new Date(subscriptionStore.get().trial_end_date).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
  },

  getTrialDaysUsed(): number { return TRIAL_DAYS - subscriptionStore.getTrialDaysLeft(); },

  getTrialPercent(): number {
    return Math.min(100, (subscriptionStore.getTrialDaysUsed() / TRIAL_DAYS) * 100);
  },

  getTrialExpiryDate(): Date { return new Date(subscriptionStore.get().trial_end_date); },

  isActive():      boolean { return subscriptionStore.get().subscription_status === 'active'; },
  isTrialActive(): boolean { return subscriptionStore.get().subscription_status === 'trial'; },
  isPending():     boolean { return subscriptionStore.get().subscription_status === 'pending'; },
  isExpired():     boolean {
    const s = subscriptionStore.get().subscription_status;
    return s === 'trial_expired' || s === 'expired';
  },

  /** Mark subscription as payment-pending (store Paystack reference). */
  setPending(reference: string): void {
    const data = subscriptionStore.get();
    data.subscription_status = 'pending';
    data.paystack_reference  = reference;
    persist(data);
  },

  /** Activate subscription after confirmed Paystack payment. */
  setActive(reference: string): void {
    const data    = subscriptionStore.get();
    const now     = new Date();
    const renewal = new Date(now);
    renewal.setMonth(renewal.getMonth() + 1);

    const entry: PaymentHistoryEntry = {
      id:       genId(),
      date:     now.toISOString(),
      amount:   PLAN_PRICE,
      currency: 'ZAR',
      status:   'success',
      reference,
      gateway:  'Paystack',
    };

    data.subscription_status = 'active';
    data.last_payment_date   = now.toISOString();
    data.next_renewal_date   = renewal.toISOString();
    data.payment_reference   = reference;
    data.paystack_reference  = reference;
    data.payment_history = [...data.payment_history, entry];
    persist(data);
    localStorage.setItem(LEGACY_SUB, 'true');   // sync legacy key
  },

  /** Record a failed/cancelled Paystack payment. */
  setFailed(reference?: string): void {
    const data = subscriptionStore.get();
    // If user has paid before → start 5-day grace period
    if (data.last_payment_date !== null) {
      const graceEnd = new Date();
      graceEnd.setDate(graceEnd.getDate() + 5);
      data.subscription_status = 'grace_period';
      data.grace_period_end    = graceEnd.toISOString();
    } else {
      // First-time payment failure → revert to trial state
      data.subscription_status =
        subscriptionStore.getTrialDaysLeft() > 0 ? 'trial' : 'trial_expired';
      data.grace_period_end = null;
    }

    if (reference) {
      data.payment_history = [
        ...data.payment_history,
        {
          id:       genId(),
          date:     new Date().toISOString(),
          amount:   PLAN_PRICE,
          currency: 'ZAR',
          status:   'failed',
          reference,
          gateway:  'Paystack',
        },
      ];
    }
    persist(data);
  },

  getPaymentHistory(): PaymentHistoryEntry[] {
    return [...subscriptionStore.get().payment_history].reverse();
  },

  /** Days remaining in grace period (0 if not in grace period). */
  getGraceDaysLeft(): number {
    const { grace_period_end } = subscriptionStore.get();
    if (!grace_period_end) return 0;
    return Math.max(0, Math.ceil((new Date(grace_period_end).getTime() - Date.now()) / 86_400_000));
  },

  isSuspended(): boolean {
    const s = subscriptionStore.get().subscription_status;
    return s === 'suspended';
  },

  isGracePeriod(): boolean {
    return subscriptionStore.get().subscription_status === 'grace_period';
  },

  /**
   * Check whether a feature is accessible based on the current subscription.
   * Reports (allowed, reason) — callers show a toast + redirect when not allowed.
   */
  checkAccess(feature: AccessFeature): AccessResult {
    const status = subscriptionStore.get().subscription_status;

    // Statuses that allow full access
    if (
      status === 'active' ||
      status === 'trial'  ||
      status === 'grace_period' ||
      status === 'pending'
    ) {
      return { allowed: true, reason: null };
    }

    // Reports / accounting are always readable — only write features are locked
    const WRITE_FEATURES: AccessFeature[] = ['sales', 'inventory', 'airtime', 'returns', 'users'];
    if (!WRITE_FEATURES.includes(feature)) return { allowed: true, reason: null };

    if (status === 'trial_expired') {
      return { allowed: false, reason: 'Your free trial has expired. Subscribe to continue using Kasi P.O.S.' };
    }

    // suspended | expired | failed
    return { allowed: false, reason: 'Subscription suspended. Please renew to restore access.' };
  },

  /** Demo/test activation — no real payment. */
  activateDemo(): void {
    subscriptionStore.setActive('DEMO-' + Date.now());
  },
};

export const TRIAL_DAYS_TOTAL = TRIAL_DAYS;
export const PLAN_PRICE_ZAR   = PLAN_PRICE;
