// Persist prepaid airtime/data/electricity transactions to localStorage

export type PrepaidTxType = "airtime" | "data" | "pinned";
export type PrepaidTxStatus = "success" | "failed" | "pending";

export interface PrepaidTransaction {
  id: string;
  date: string;
  cashier: string;
  type: PrepaidTxType;
  network: string;
  networkLabel: string;
  sellvalue: string;
  msisdn: string;
  orderno: string;
  status: PrepaidTxStatus;
  pin?: string;
  serial?: string;
}

const KEY = "kasi_prepaid_transactions";

export const prepaidStore = {
  getAll: (): PrepaidTransaction[] => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PrepaidTransaction[];
    } catch {
      return [];
    }
  },

  add: (tx: PrepaidTransaction): void => {
    const all = prepaidStore.getAll();
    all.push(tx);
    localStorage.setItem(KEY, JSON.stringify(all));
  },

  update: (id: string, patch: Partial<PrepaidTransaction>): void => {
    const all = prepaidStore
      .getAll()
      .map((tx) => (tx.id === id ? { ...tx, ...patch } : tx));
    localStorage.setItem(KEY, JSON.stringify(all));
  },
};
