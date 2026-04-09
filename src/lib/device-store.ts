// Device registry for Kasi P.O.S
// Tracks which machines / browsers are registered to this store.

const DEVICE_ID_KEY = 'kasi_device_id';
const DEVICES_KEY   = 'kasi_devices';

export type DeviceStatus = 'approved' | 'pending' | 'blocked';

export interface DeviceRecord {
  id:            string;
  name:          string;
  location:      string;
  status:        DeviceStatus;
  created_at:    string;
  last_login_at: string;
  approved_by:   string | null;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const deviceStore = {
  getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) { id = uuid(); localStorage.setItem(DEVICE_ID_KEY, id); }
    return id;
  },

  getAll(): DeviceRecord[] {
    try { return JSON.parse(localStorage.getItem(DEVICES_KEY) ?? '[]'); }
    catch { return []; }
  },

  _save(devices: DeviceRecord[]): void {
    localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
  },

  getCurrentDevice(): DeviceRecord | null {
    return deviceStore.getAll().find(d => d.id === deviceStore.getDeviceId()) ?? null;
  },

  /** Register this device as the primary (first-run setup). Always approved. */
  registerPrimary(name: string): DeviceRecord {
    const id = deviceStore.getDeviceId();
    const existing = deviceStore.getAll().filter(d => d.id !== id);
    const rec: DeviceRecord = {
      id, name, location: 'Primary',
      status: 'approved',
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      approved_by: 'self',
    };
    deviceStore._save([...existing, rec]);
    return rec;
  },

  /** Register this device as secondary (joining an existing store).
   *  Auto-approved because the admin password was verified during import. */
  registerSecondary(name: string, location: string): DeviceRecord {
    const id  = deviceStore.getDeviceId();
    const all = deviceStore.getAll();
    const existing = all.find(d => d.id === id);

    if (existing && existing.status === 'approved') {
      const updated = all.map(d =>
        d.id === id ? { ...d, name, location, last_login_at: new Date().toISOString() } : d
      );
      deviceStore._save(updated);
      return updated.find(d => d.id === id)!;
    }

    const rec: DeviceRecord = {
      id, name,
      location: location || 'Secondary Till',
      status: 'approved',
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      approved_by: 'store-code-import',
    };
    deviceStore._save([...all.filter(d => d.id !== id), rec]);
    return rec;
  },

  updateLastLogin(): void {
    const id = deviceStore.getDeviceId();
    deviceStore._save(
      deviceStore.getAll().map(d =>
        d.id === id ? { ...d, last_login_at: new Date().toISOString() } : d
      )
    );
  },

  approve(id: string, approvedBy: string): void {
    deviceStore._save(
      deviceStore.getAll().map(d =>
        d.id === id ? { ...d, status: 'approved', approved_by: approvedBy } : d
      )
    );
  },

  block(id: string): void {
    deviceStore._save(
      deviceStore.getAll().map(d => d.id === id ? { ...d, status: 'blocked' } : d)
    );
  },

  remove(id: string): void {
    deviceStore._save(deviceStore.getAll().filter(d => d.id !== id));
  },
};
