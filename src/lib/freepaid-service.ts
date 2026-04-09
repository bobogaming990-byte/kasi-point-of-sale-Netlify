// Freepaid airtime/data API service for KasiPOS
// All SOAP calls are proxied through the Vite middleware at /api/freepaid/*
// Credentials are stored in localStorage — never hardcoded.

const CREDS_KEY = "kasi_freepaid_creds";

export interface FreepaidCredentials {
  user: string;
  pass: string;
}

export interface PrepaidProduct {
  id: string;
  network: string;
  networkLabel: string;
  type: "airtime" | "data" | "pinned";
  description: string;
  sellvalue: string;
}

export interface FreepaidBalanceResult {
  balance: string;
  mock?: boolean;
  error?: string;
}

export interface PlaceOrderResult {
  success: boolean;
  orderno: string;
  balance?: string;
  mock?: boolean;
  error?: string;
}

export interface QueryOrderResult {
  success: boolean;
  pending?: boolean;
  orderno: string;
  status: string;
  pin?: string;
  serial?: string;
  mock?: boolean;
  error?: string;
}

export const freepaidCreds = {
  get: (): FreepaidCredentials | null => {
    try {
      const s = localStorage.getItem(CREDS_KEY);
      return s ? (JSON.parse(s) as FreepaidCredentials) : null;
    } catch {
      return null;
    }
  },
  set: (creds: FreepaidCredentials): void => {
    localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  },
  clear: (): void => {
    localStorage.removeItem(CREDS_KEY);
  },
};

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`/api/freepaid${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `Request failed (${res.status})`);
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

export function fetchBalance(
  creds: FreepaidCredentials | null,
): Promise<FreepaidBalanceResult> {
  return post("/balance", creds ?? {});
}

export function fetchProducts(
  creds: FreepaidCredentials | null,
): Promise<PrepaidProduct[]> {
  return post("/products", creds ?? {});
}

export function placeOrder(
  creds: FreepaidCredentials | null,
  params: { refno: string; network: string; sellvalue: string; extra: string },
): Promise<PlaceOrderResult> {
  return post("/order/place", { ...(creds ?? {}), ...params });
}

export function queryOrder(
  creds: FreepaidCredentials | null,
  orderno: string,
): Promise<QueryOrderResult> {
  return post("/order/query", { ...(creds ?? {}), orderno });
}

// Human-readable error messages from Freepaid status codes
export const FREEPAID_ERRORS: Record<string, string> = {
  "000": "Success",
  "001": "Order is still processing",
  "100": "Empty order",
  "101": "Invalid Freepaid user number",
  "102": "Invalid last request",
  "103": "Incorrect Freepaid password",
  "104": "Invalid network selected",
  "105": "Invalid sell value",
  "106": "Insufficient Freepaid wallet balance",
  "107": "Out of stock",
  "108": "Invalid count",
  "109": "Invalid reference number",
  "110": "Invalid request",
  "111": "Order still processing — try again shortly",
  "112": "Invalid order number",
  "113": "Invalid cell number",
  "197": "Freepaid internal error",
  "198": "Temporary error — please try again",
  "199": "Unknown error",
};

export function friendlyError(codeOrMsg: string): string {
  const code = codeOrMsg?.match(/^\d{3}$/)?.[0] ?? codeOrMsg?.match(/\b(\d{3})\b/)?.[1];
  return code ? (FREEPAID_ERRORS[code] ?? `Freepaid error ${code}`) : (codeOrMsg || "Unknown error");
}
