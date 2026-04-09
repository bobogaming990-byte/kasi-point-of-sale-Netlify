import { defineConfig, type Plugin, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import https from "node:https";
import fs from "node:fs";
import crypto from "node:crypto";
import { componentTagger } from "lovable-tagger";
import { searchSupplierRecords, seedSupplierRecords } from "./src/lib/supplier-directory";

function supplierSearchApiPlugin(): Plugin {
  const handleRequest = (requestUrl: string | undefined, response: NodeJS.WritableStream & {
    end: (chunk?: string) => void;
    setHeader: (name: string, value: string) => void;
    statusCode: number;
  }) => {
    const url = new URL(requestUrl ?? "/", "http://localhost");

    if (url.pathname !== "/api/suppliers/search") {
      return false;
    }

    const query = url.searchParams.get("q") ?? "";
    const results = searchSupplierRecords(query, seedSupplierRecords);

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(results));
    return true;
  };

  return {
    name: "supplier-search-api",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (handleRequest(request.url, response)) {
          return;
        }

        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (handleRequest(request.url, response)) {
          return;
        }

        next();
      });
    },
  };
}

function freepaidSoapPlugin(): Plugin {
  const SOAP_URL = "https://ws.freepaid.co.za/airtimeplus/";

  const esc = (v: string) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const buildSoap = (method: string, params: Record<string, string>) => {
    const fields = Object.entries(params)
      .map(([k, v]) => `<${k}>${esc(v)}</${k}>`)
      .join("");
    return `<?xml version="1.0" encoding="UTF-8"?><SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><SOAP-ENV:Body><${method} xmlns="https://ws.freepaid.co.za/airtimeplus/"><request>${fields}</request></${method}></SOAP-ENV:Body></SOAP-ENV:Envelope>`;
  };

  const getTag = (xml: string, tag: string): string => {
    const m = xml.match(new RegExp(`<(?:[\\w]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${tag}>`, "i"));
    return m ? m[1].trim() : "";
  };

  const getAllTags = (xml: string, tag: string): string[] => {
    const re = new RegExp(`<(?:[\\w]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${tag}>`, "gi");
    const result: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) result.push(m[1]);
    return result;
  };

  const readJson = (req: any): Promise<Record<string, string>> =>
    new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (c: Buffer) => { body += c.toString(); });
      req.on("end", () => { try { resolve(JSON.parse(body)); } catch { reject(new Error("Bad JSON")); } });
      req.on("error", reject);
    });

  const callSoap = (method: string, params: Record<string, string>): Promise<string> => {
    const body = buildSoap(method, params);
    const bodyBuf = Buffer.from(body, "utf-8");
    const urlObj = new URL(SOAP_URL);
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname,
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=UTF-8",
            "Content-Length": bodyBuf.byteLength,
            "SOAPAction": '""',
          },
          timeout: 25000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => resolve(data));
        },
      );
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Freepaid request timed out")); });
      req.write(bodyBuf);
      req.end();
    });
  };

  const sendJson = (res: any, data: unknown, status = 200) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };

  const MOCK_PRODUCTS = [
    { id: "p-vodacom-air", network: "p-vodacom", networkLabel: "Vodacom", type: "airtime", description: "Vodacom Pinless Airtime", sellvalue: "" },
    { id: "p-mtn-air",     network: "p-mtn",     networkLabel: "MTN",     type: "airtime", description: "MTN Pinless Airtime",     sellvalue: "" },
    { id: "p-cellc-air",   network: "p-cellc",   networkLabel: "Cell C",  type: "airtime", description: "Cell C Pinless Airtime",  sellvalue: "" },
    { id: "p-telkom-air",  network: "p-telkom",  networkLabel: "Telkom",  type: "airtime", description: "Telkom Pinless Airtime",  sellvalue: "" },
    { id: "d-voda-100",  network: "p-vodacom", networkLabel: "Vodacom", type: "data", description: "Vodacom 100MB",  sellvalue: "12.00" },
    { id: "d-voda-500",  network: "p-vodacom", networkLabel: "Vodacom", type: "data", description: "Vodacom 500MB",  sellvalue: "29.00" },
    { id: "d-voda-1gb",  network: "p-vodacom", networkLabel: "Vodacom", type: "data", description: "Vodacom 1GB",    sellvalue: "49.00" },
    { id: "d-mtn-100",   network: "p-mtn",     networkLabel: "MTN",     type: "data", description: "MTN 100MB",      sellvalue: "12.00" },
    { id: "d-mtn-1gb",   network: "p-mtn",     networkLabel: "MTN",     type: "data", description: "MTN 1GB",        sellvalue: "49.00" },
    { id: "d-cellc-100", network: "p-cellc",   networkLabel: "Cell C",  type: "data", description: "Cell C 100MB",   sellvalue: "10.00" },
    { id: "d-telkom-100",network: "p-telkom",  networkLabel: "Telkom",  type: "data", description: "Telkom 100MB",   sellvalue: "11.00" },
  ];

  const handle = async (url: URL, req: any, res: any, next: () => void) => {
    if (!url.pathname.startsWith("/api/freepaid/")) return next();

    let body: Record<string, string>;
    try { body = await readJson(req); }
    catch { return sendJson(res, { error: "Invalid request body" }, 400); }

    const { user, pass, ...rest } = body;
    const hasCreds = !!(user?.trim() && pass?.trim());
    const subpath = url.pathname.replace("/api/freepaid/", "");

    try {
      if (subpath === "balance") {
        if (!hasCreds) return sendJson(res, { balance: "250.00", mock: true });
        const xml = await callSoap("fetchBalance", { user, pass });
        const fault = getTag(xml, "faultstring");
        if (fault) return sendJson(res, { error: fault }, 400);
        return sendJson(res, { balance: getTag(xml, "balance") || "0.00" });
      }

      if (subpath === "products") {
        if (!hasCreds) return sendJson(res, MOCK_PRODUCTS);
        const xml = await callSoap("fetchProducts", { user, pass });
        const fault = getTag(xml, "faultstring");
        if (fault) return sendJson(res, { error: fault }, 400);
        const items = getAllTags(xml, "item");
        if (!items.length) return sendJson(res, MOCK_PRODUCTS);
        const products = items.map((item, i) => {
          const network = getTag(item, "network");
          const value = getTag(item, "value");
          const base = network.replace(/^[pd]-/, "");
          const label = base.charAt(0).toUpperCase() + base.slice(1);
          const isData = network.startsWith("d-") || parseFloat(value) > 50;
          return {
            id: `${network}-${value}-${i}`,
            network,
            networkLabel: label,
            type: isData ? "data" : "airtime",
            description: `${label} ${isData ? "Data" : "Airtime"}${value ? ` R${value}` : ""}`.trim(),
            sellvalue: value,
          };
        });
        return sendJson(res, products);
      }

      if (subpath === "order/place") {
        const { refno, network: net, sellvalue, extra } = rest;
        if (!hasCreds) {
          return sendJson(res, { success: true, orderno: `MOCK-${Date.now()}`, balance: "250.00", mock: true });
        }
        const xml = await callSoap("placeOrder", { user, pass, refno, network: net, sellvalue, count: "1", extra });
        const fault = getTag(xml, "faultstring");
        if (fault) return sendJson(res, { success: false, error: fault, orderno: "" }, 400);
        const orderno = getTag(xml, "orderno");
        return sendJson(res, { success: !!orderno, orderno, balance: getTag(xml, "balance") });
      }

      if (subpath === "order/query") {
        const { orderno } = rest;
        if (!hasCreds || orderno?.startsWith("MOCK-")) {
          return sendJson(res, { success: true, orderno, status: "000", mock: true });
        }
        const xml = await callSoap("queryOrder", { user, pass, orderno });
        const fault = getTag(xml, "faultstring");
        if (fault) return sendJson(res, { success: false, error: fault, orderno, status: fault }, 400);
        const status = getTag(xml, "status");
        const pin = getTag(xml, "pin");
        const serial = getTag(xml, "serial");
        return sendJson(res, {
          success: status === "000",
          pending: status === "001",
          orderno,
          status,
          ...(pin    ? { pin }    : {}),
          ...(serial ? { serial } : {}),
        });
      }

      sendJson(res, { error: "Unknown endpoint" }, 404);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Freepaid service unavailable";
      sendJson(res, { error: msg }, 503);
    }
  };

  const middleware = (server: any) => {
    server.middlewares.use(async (req: any, res: any, next: () => void) => {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
        await handle(url, req, res, next);
      } catch { next(); }
    });
  };

  return {
    name: "freepaid-soap-proxy",
    configureServer: middleware,
    configurePreviewServer: middleware,
  };
}

// ─── Paystack Subscription API plugin ────────────────────────────────────────
// Runs entirely in the Vite dev-server process (Node.js).
// PAYSTACK_SECRET_KEY never leaves the server — only authorization_url reaches the client.
//
// Endpoints:
//   POST /api/subscription/initialize-payment  → init Paystack transaction
//   POST /api/subscription/verify              → verify transaction by reference
//   GET  /api/subscription/status              → read server-side subscription record
//   GET  /api/subscription/history             → payment history for a company
//   POST /api/paystack/webhook                 → Paystack charge.success event

function paystackSubscriptionPlugin(paystackSecret: string, webhookSecret: string): Plugin {
  const DATA_DIR  = path.join(process.cwd(), '.kasi-subscription-data');
  const SUBS_FILE = path.join(DATA_DIR, 'subscriptions.json');
  const PLAN_KOBO = 5500; // R55.00 in smallest currency unit (cents)

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SUBS_FILE)) fs.writeFileSync(SUBS_FILE, '{}', 'utf-8');

  function loadSubs(): Record<string, unknown> {
    try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8')); }
    catch { return {}; }
  }
  function saveSubs(d: Record<string, unknown>) {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(d, null, 2), 'utf-8');
  }

  function callPaystack(
    method: string, apiPath: string, body?: unknown,
  ): Promise<{ status: number; data: Record<string, unknown> }> {
    return new Promise((resolve, reject) => {
      const buf = body ? Buffer.from(JSON.stringify(body), 'utf-8') : null;
      const req = https.request(
        {
          hostname: 'api.paystack.co',
          path:     `/${apiPath}`,
          method,
          headers: {
            Authorization:   `Bearer ${paystackSecret}`,
            'Content-Type':  'application/json',
            Accept:          'application/json',
            ...(buf ? { 'Content-Length': buf.byteLength } : {}),
          },
          timeout: 15000,
        },
        res => {
          let raw = '';
          res.on('data', (c: Buffer) => { raw += c.toString(); });
          res.on('end', () => {
            try { resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) as Record<string, unknown> }); }
            catch { resolve({ status: res.statusCode ?? 0, data: { raw } }); }
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Paystack API timeout')); });
      if (buf) req.write(buf);
      req.end();
    });
  }

  const readBody = (req: any): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end',  () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

  const sendJson = (res: any, data: unknown, status = 200) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify(data));
  };

  const handle = async (url: URL, req: any, res: any, next: () => void) => {

    // ── POST /api/subscription/initialize-payment ────────────────────────────
    if (url.pathname === '/api/subscription/initialize-payment' && req.method === 'POST') {
      if (!paystackSecret)
        return sendJson(res, { error: 'Paystack not configured — add PAYSTACK_SECRET_KEY to .env', demo: true }, 503);

      let body: any;
      try { body = JSON.parse((await readBody(req)).toString()); }
      catch { return sendJson(res, { error: 'Invalid JSON body' }, 400); }

      const { company_id, email, base_url = 'http://localhost:8080' } = body ?? {};
      if (!company_id) return sendJson(res, { error: 'company_id required' }, 400);

      // Use supplied email or derive a stable placeholder
      const customerEmail = (email?.trim()) || `${company_id}@kasi-pos.app`;
      // Paystack appends ?trxref=xxx&reference=xxx to the callback_url automatically
      const callbackUrl = `${base_url}/subscription`;

      try {
        const r = await callPaystack('POST', 'transaction/initialize', {
          email:        customerEmail,
          amount:       PLAN_KOBO,
          currency:     'ZAR',
          callback_url: callbackUrl,
          metadata: {
            company_id,
            plan:        'monthly_r55',
            type:        'subscription',
          },
        });

        if (!r.data.status)
          return sendJson(res, { error: (r.data as any)?.message ?? 'Payment initialization failed', paystack: r.data }, 502);

        const { authorization_url, reference } = (r.data as any).data ?? {};
        // Save pending reference server-side
        const subs = loadSubs();
        (subs[company_id] as any) = {
          ...((subs[company_id] ?? {}) as object),
          pending_reference:  reference,
          pending_created_at: new Date().toISOString(),
        };
        saveSubs(subs);
        return sendJson(res, { authorization_url, reference });
      } catch (e: any) {
        return sendJson(res, { error: e.message ?? 'Paystack unavailable' }, 503);
      }
    }

    // ── POST /api/subscription/verify ────────────────────────────────────────
    if (url.pathname === '/api/subscription/verify' && req.method === 'POST') {
      if (!paystackSecret) return sendJson(res, { error: 'Paystack not configured', demo: true }, 503);

      let body: any;
      try { body = JSON.parse((await readBody(req)).toString()); }
      catch { return sendJson(res, { error: 'Invalid JSON body' }, 400); }

      const { company_id, reference } = body ?? {};
      if (!company_id || !reference)
        return sendJson(res, { error: 'company_id and reference required' }, 400);

      try {
        const r = await callPaystack('GET', `transaction/verify/${encodeURIComponent(reference)}`);
        if (r.status !== 200)
          return sendJson(res, { error: 'Could not retrieve transaction', paystack: r.data }, r.status);

        const txData   = (r.data as any)?.data;
        if (!txData) return sendJson(res, { error: 'Invalid Paystack response' }, 502);

        const txStatus = txData.status as string; // 'success' | 'failed' | 'abandoned' | ...
        if (txStatus === 'success') {
          const now     = new Date();
          const renewal = new Date(now);
          renewal.setMonth(renewal.getMonth() + 1);
          const subs    = loadSubs();
          const prev    = (subs[company_id] as any) ?? {};
          subs[company_id] = {
            ...prev,
            status:            'active',
            payment_reference: reference,
            last_payment_date: now.toISOString(),
            next_renewal_date: renewal.toISOString(),
            payment_history:   [
              ...(prev.payment_history ?? []),
              { id: reference, date: now.toISOString(), amount: 55, currency: 'ZAR',
                status: 'success', reference, gateway: 'Paystack' },
            ],
          };
          saveSubs(subs);
          return sendJson(res, { verified: true, status: 'active', reference, next_renewal_date: renewal.toISOString() });
        }
        return sendJson(res, { verified: false, status: txStatus });
      } catch (e: any) {
        return sendJson(res, { error: e.message }, 503);
      }
    }

    // ── GET /api/subscription/status ─────────────────────────────────────────
    if (url.pathname === '/api/subscription/status' && req.method === 'GET') {
      const cid = url.searchParams.get('company_id');
      if (!cid) return sendJson(res, { error: 'company_id required' }, 400);
      return sendJson(res, { company_id: cid, record: (loadSubs()[cid] as any) ?? null });
    }

    // ── GET /api/subscription/history ────────────────────────────────────────
    if (url.pathname === '/api/subscription/history' && req.method === 'GET') {
      const cid = url.searchParams.get('company_id');
      if (!cid) return sendJson(res, { error: 'company_id required' }, 400);
      const record = (loadSubs()[cid] as any) ?? {};
      return sendJson(res, { history: record.payment_history ?? [] });
    }

    // ── POST /api/paystack/webhook ────────────────────────────────────────────
    // Paystack signs webhooks with HMAC-SHA512 using the secret key.
    // Header: X-Paystack-Signature
    if (url.pathname === '/api/paystack/webhook' && req.method === 'POST') {
      const rawBody = await readBody(req);
      if (webhookSecret) {
        const sig      = (req.headers['x-paystack-signature'] as string) ?? '';
        const expected = crypto.createHmac('sha512', webhookSecret).update(rawBody).digest('hex');
        if (sig !== expected) return sendJson(res, { error: 'Invalid signature' }, 401);
      }

      let event: any;
      try { event = JSON.parse(rawBody.toString()); }
      catch { return sendJson(res, { error: 'Invalid payload' }, 400); }

      // Handle charge.success — activate subscription server-side
      if (event?.event === 'charge.success') {
        const txData    = event?.data;
        const cid       = txData?.metadata?.company_id as string;
        const reference = txData?.reference             as string;

        if (cid && reference) {
          const now  = new Date();
          const ren  = new Date(now);
          ren.setMonth(ren.getMonth() + 1);
          const subs = loadSubs();
          const prev = (subs[cid] as any) ?? {};
          subs[cid]  = {
            ...prev,
            status:            'active',
            payment_reference: reference,
            last_payment_date: now.toISOString(),
            next_renewal_date: ren.toISOString(),
            payment_history: [
              ...(prev.payment_history ?? []),
              { id: reference, date: now.toISOString(), amount: 55, currency: 'ZAR',
                status: 'success', reference, gateway: 'Paystack' },
            ],
          };
          saveSubs(subs);
        }
      }
      return sendJson(res, { received: true });
    }

    next();
  };

  const mw = (server: any) => {
    server.middlewares.use(async (req: any, res: any, next: () => void) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        await handle(url, req, res, next);
      } catch { next(); }
    });
  };

  return { name: 'paystack-subscription-api', configureServer: mw, configurePreviewServer: mw };
}

// ─── Vite config ──────────────────────────────────────────────────────────────

export default defineConfig(({ mode }) => {
  const env                  = loadEnv(mode, process.cwd(), '');
  const PAYSTACK_SECRET      = env.PAYSTACK_SECRET_KEY      ?? '';
  const PAYSTACK_WH_SECRET   = env.PAYSTACK_WEBHOOK_SECRET  ?? '';

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), supplierSearchApiPlugin(), freepaidSoapPlugin(), paystackSubscriptionPlugin(PAYSTACK_SECRET, PAYSTACK_WH_SECRET), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
};
});
