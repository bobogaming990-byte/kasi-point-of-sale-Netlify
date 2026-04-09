// Store Code — portable export/import for multi-device setup in Kasi P.O.S
// Generates a base64 encoded snapshot of company data so additional machines
// can be bootstrapped from an existing store without a backend.

import { companyStore, CompanyProfile } from './company-store';
import { store, User, hashPassword } from './store';
import { subscriptionStore, SubscriptionData } from './subscription-store';
import { deviceStore } from './device-store';

export interface StoreExport {
  v: 1;
  company_id:   string;
  company:      CompanyProfile;
  users:        User[];
  subscription: SubscriptionData;
  exported_at:  string;
  exported_by:  string;
}

export const storeCode = {
  /** Generate a portable store code (base64 JSON) from the current machine's data. */
  generate(exportedBy: string): string {
    const data: StoreExport = {
      v:            1,
      company_id:   subscriptionStore.getCompanyId(),
      company:      companyStore.get(),
      users:        store.getUsers(),
      subscription: subscriptionStore.get(),
      exported_at:  new Date().toISOString(),
      exported_by:  exportedBy,
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  },

  /** Parse and validate a store code string. */
  parse(raw: string): { ok: true; data: StoreExport } | { ok: false; error: string } {
    try {
      const json = decodeURIComponent(escape(atob(raw.trim())));
      const data = JSON.parse(json) as StoreExport;
      if (data.v !== 1)                             return { ok: false, error: 'Unsupported store code version.' };
      if (!data.company_id)                         return { ok: false, error: 'Store code is missing company ID.' };
      if (!Array.isArray(data.users) || !data.users.length)
                                                    return { ok: false, error: 'Store code contains no users.' };
      return { ok: true, data };
    } catch {
      return { ok: false, error: 'Invalid store code — make sure you copied the full code.' };
    }
  },

  /** Verify a plaintext admin password against the exported users list. */
  verifyAdmin(data: StoreExport, password: string): boolean {
    const hashed = hashPassword(password);
    return data.users.some(u => u.role === 'admin' && u.password_hash === hashed);
  },

  /** Apply a parsed store export to this device (imports all company data into localStorage). */
  apply(data: StoreExport, deviceName: string, deviceLocation: string): void {
    // Restore company profile (branding, name, logo, contact details)
    companyStore.set(data.company);

    // Restore all users with their hashed passwords (safe to transfer — already hashed)
    store.setUsers(data.users);

    // Align company ID so subscription status reads correctly
    localStorage.setItem('kasi_company_id', data.company_id);

    // Restore trial start date so trial days remain consistent with the primary machine
    if (data.subscription?.trial_start_date) {
      localStorage.setItem('kasi_trial_start', data.subscription.trial_start_date);
    }

    // Restore full subscription state (active, grace period, etc.)
    if (data.subscription) {
      localStorage.setItem('kasi_subscription_v2', JSON.stringify(data.subscription));
      if (data.subscription.subscription_status === 'active') {
        localStorage.setItem('kasi_subscribed', 'true');
      }
    }

    // Register this browser/machine as a secondary device
    deviceStore.registerSecondary(deviceName, deviceLocation);
  },
};
