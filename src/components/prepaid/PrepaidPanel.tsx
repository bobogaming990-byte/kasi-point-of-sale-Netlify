import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, Settings2, RefreshCw, CheckCircle2, XCircle, Loader2, Smartphone, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { subscriptionStore } from "@/lib/subscription-store";
import {
  freepaidCreds,
  fetchBalance,
  fetchProducts,
  placeOrder,
  queryOrder,
  friendlyError,
  FreepaidCredentials,
  PrepaidProduct,
} from "@/lib/freepaid-service";
import { prepaidStore } from "@/lib/freepaid-store";
import { printPrepaidReceipt } from "@/lib/receipt-printer";

const NETWORKS = [
  { id: "p-vodacom", label: "Vodacom" },
  { id: "p-mtn",     label: "MTN"     },
  { id: "p-cellc",   label: "Cell C"  },
  { id: "p-telkom",  label: "Telkom"  },
];

const QUICK_AMOUNTS = ["5", "10", "20", "29", "30", "50", "100"];

interface SaleResult {
  success: boolean;
  pending?: boolean;
  network: string;
  networkLabel: string;
  type: "airtime" | "data";
  amount: string;
  msisdn: string;
  orderno: string;
  pin?: string;
  mock?: boolean;
  error?: string;
}

interface Props {
  cashier: string;
}

export default function PrepaidPanel({ cashier }: Props) {
  const [creds, setCreds] = useState<FreepaidCredentials | null>(freepaidCreds.get());
  const [showSettings, setShowSettings] = useState(false);
  const [settingsUser, setSettingsUser] = useState("");
  const [settingsPass, setSettingsPass] = useState("");

  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [products, setProducts] = useState<PrepaidProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [tab, setTab] = useState<"airtime" | "data">("airtime");
  const [network, setNetwork] = useState("p-vodacom");
  const [amount, setAmount] = useState("");
  const [dataProduct, setDataProduct] = useState("");
  const [msisdn, setMsisdn] = useState("");

  const [selling, setSelling] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);

  const isMock = !creds;

  const refreshBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await fetchBalance(creds);
      setBalance(res.balance);
    } catch {
      setBalance(null);
      if (creds) toast.error("Could not fetch Freepaid balance");
    } finally {
      setBalanceLoading(false);
    }
  }, [creds]);

  const loadProducts = useCallback(async () => {
    if (tab !== "data") return;
    setProductsLoading(true);
    try {
      const list = await fetchProducts(creds);
      setProducts(list.filter((p) => p.type === "data"));
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [creds, tab]);

  useEffect(() => { refreshBalance(); }, [refreshBalance]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const saveSettings = () => {
    if (!settingsUser.trim() || !settingsPass.trim()) {
      toast.error("Enter both user number and password");
      return;
    }
    const newCreds = { user: settingsUser.trim(), pass: settingsPass.trim() };
    freepaidCreds.set(newCreds);
    setCreds(newCreds);
    setShowSettings(false);
    toast.success("Freepaid credentials saved");
    fetchBalance(newCreds).then((r) => setBalance(r.balance)).catch(() => {});
  };

  const clearSettings = () => {
    freepaidCreds.clear();
    setCreds(null);
    setBalance(null);
    setShowSettings(false);
    toast.info("Freepaid credentials cleared — running in demo mode");
  };

  const networkLabel = NETWORKS.find((n) => n.id === network)?.label ?? network;
  const filteredData = products.filter((p) => p.network === network);
  const selectedDataProduct = filteredData.find((p) => p.id === dataProduct);
  const currentAmount = tab === "airtime" ? amount : (selectedDataProduct?.sellvalue ?? "");

  const canSell = (() => {
    if (selling || !msisdn.trim()) return false;
    if (tab === "airtime") {
      const n = parseFloat(amount);
      return !isNaN(n) && n >= 2 && n <= 999;
    }
    return !!dataProduct;
  })();

  const handleSell = async () => {
    if (!canSell) return;
    const access = subscriptionStore.checkAccess('airtime');
    if (!access.allowed) {
      toast.error(access.reason!, { action: { label: 'Subscribe Now', onClick: () => { window.location.href = '/subscription'; } } });
      return;
    }
    const sellNetwork = tab === "data" ? (selectedDataProduct?.network ?? network) : network;
    const sellValue = currentAmount;
    const refno = `KPOS${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    setSelling(true);
    try {
      const placeRes = await placeOrder(creds, {
        refno,
        network: sellNetwork,
        sellvalue: sellValue,
        extra: msisdn.trim(),
      });

      if (!placeRes.success || !placeRes.orderno) {
        throw new Error(placeRes.error ?? "Order placement failed");
      }

      prepaidStore.add({
        id: placeRes.orderno,
        date: new Date().toISOString(),
        cashier,
        type: tab,
        network: sellNetwork,
        networkLabel,
        sellvalue: sellValue,
        msisdn: msisdn.trim(),
        orderno: placeRes.orderno,
        status: "pending",
      });

      await new Promise((r) => setTimeout(r, 1500));
      const queryRes = await queryOrder(creds, placeRes.orderno);

      const succeeded = queryRes.success;
      prepaidStore.update(placeRes.orderno, {
        status: succeeded ? "success" : queryRes.pending ? "pending" : "failed",
        pin: queryRes.pin,
        serial: queryRes.serial,
      });

      if (placeRes.balance) setBalance(placeRes.balance);

      const errMsg = succeeded
        ? undefined
        : queryRes.pending
        ? "Order is still processing. Check back later."
        : friendlyError(queryRes.status);

      const saleResult = {
        success: succeeded,
        pending: queryRes.pending,
        network: sellNetwork,
        networkLabel,
        type: tab,
        amount: sellValue,
        msisdn: msisdn.trim(),
        orderno: placeRes.orderno,
        pin: queryRes.pin,
        mock: placeRes.mock,
        error: errMsg,
      };
      setResult(saleResult);

      if (succeeded || queryRes.pending) {
        printPrepaidReceipt({
          orderno: placeRes.orderno,
          type: tab,
          networkLabel,
          amount: sellValue,
          msisdn: msisdn.trim(),
          pin: queryRes.pin,
          cashier,
          status: succeeded ? 'success' : 'pending',
          mock: placeRes.mock,
        });
      }

      if (succeeded) {
        setAmount("");
        setMsisdn("");
        setDataProduct("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sale failed";
      const friendly = friendlyError(msg);
      toast.error(friendly);
      setResult({ success: false, network, networkLabel, type: tab, amount: currentAmount, msisdn, orderno: "", error: friendly });
    } finally {
      setSelling(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base">
              <Wifi className="w-4 h-4 text-primary" />
              Prepaid Services
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm">
                {balanceLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                ) : balance !== null ? (
                  <span className="font-semibold text-primary">
                    R {parseFloat(balance).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {isMock ? "Demo Mode" : "—"}
                  </span>
                )}
                <button
                  onClick={refreshBalance}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh balance"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={() => {
                  setSettingsUser(creds?.user ?? "");
                  setSettingsPass(creds?.pass ?? "");
                  setShowSettings(true);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Configure Freepaid"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4 px-4 pb-4 overflow-y-auto">
          {isMock && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Demo mode — all sales are simulated. Click <Settings2 className="inline w-3 h-3" /> to add your Freepaid credentials.
              </span>
            </div>
          )}

          {/* Type tabs */}
          <div className="flex rounded-lg bg-muted p-1 gap-1">
            {(["airtime", "data"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setDataProduct(""); }}
                className={cn(
                  "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                  tab === t
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "airtime" ? "Airtime" : "Data Bundle"}
              </button>
            ))}
          </div>

          {/* Network selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Network</Label>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setNetwork(n.id); setDataProduct(""); }}
                  className={cn(
                    "rounded-lg border py-2 px-1 text-xs font-semibold transition-all",
                    network === n.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount / Data bundle */}
          {tab === "airtime" ? (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Amount — R2 to R999
              </Label>
              <Input
                type="number"
                min="2"
                max="999"
                step="1"
                placeholder="e.g. 30"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold h-11"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-colors",
                      amount === a
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    R{a}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Data Bundle</Label>
              {productsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading bundles...
                </div>
              ) : (
                <Select value={dataProduct} onValueChange={setDataProduct}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a data bundle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredData.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No bundles available for {networkLabel}
                      </SelectItem>
                    ) : (
                      filteredData.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.description}
                          {p.sellvalue
                            ? ` — R ${parseFloat(p.sellvalue).toFixed(2)}`
                            : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* MSISDN */}
          <div>
            <Label htmlFor="fp-msisdn" className="text-xs text-muted-foreground mb-2 block">
              Customer Cell Number
            </Label>
            <div className="relative">
              <Smartphone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="fp-msisdn"
                type="tel"
                placeholder="e.g. 082 123 4567"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </div>

          {/* Sell button */}
          <Button
            className="w-full h-12 text-base font-semibold mt-auto"
            disabled={!canSell}
            onClick={handleSell}
          >
            {selling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Sell ${networkLabel} ${tab === "airtime" ? "Airtime" : "Data"}${
                currentAmount ? ` — R ${parseFloat(currentAmount || "0").toFixed(2)}` : ""
              }`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Freepaid Credentials
            </DialogTitle>
            <DialogDescription>
              Stored locally on this device only. Register at{" "}
              <a
                href="https://services.freepaid.co.za"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                services.freepaid.co.za
              </a>{" "}
              to get your user number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Freepaid User Number</Label>
              <Input
                placeholder="7-digit number received via SMS"
                value={settingsUser}
                onChange={(e) => setSettingsUser(e.target.value)}
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Your Freepaid password"
                value={settingsPass}
                onChange={(e) => setSettingsPass(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              {creds && (
                <Button variant="destructive" size="sm" onClick={clearSettings}>
                  Clear
                </Button>
              )}
              <Button className="flex-1" onClick={saveSettings}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent className="sm:max-w-sm">
          <div className="text-center py-2">
            {result?.success ? (
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
            ) : result?.pending ? (
              <Clock className="w-14 h-14 text-amber-500 mx-auto mb-3" />
            ) : (
              <XCircle className="w-14 h-14 text-destructive mx-auto mb-3" />
            )}
            <h3 className="text-lg font-bold mb-1">
              {result?.success
                ? "Sale Successful!"
                : result?.pending
                ? "Order Processing"
                : "Sale Failed"}
            </h3>

            {result?.success && (
              <div className="space-y-2 text-sm mt-3 text-left bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">{result.networkLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{result.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-primary">
                    R {parseFloat(result.amount || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cell Number</span>
                  <span className="font-medium">{result.msisdn}</span>
                </div>
                {result.pin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voucher PIN</span>
                    <span className="font-mono font-bold tracking-wider text-primary">
                      {result.pin}
                    </span>
                  </div>
                )}
                {result.orderno && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order #</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {result.orderno}
                    </span>
                  </div>
                )}
                {result.mock && (
                  <Badge variant="outline" className="mt-1 text-xs text-amber-600 border-amber-400">
                    Demo — not a real transaction
                  </Badge>
                )}
              </div>
            )}

            {!result?.success && result?.error && (
              <p className="text-sm text-muted-foreground mt-2 px-2">{result.error}</p>
            )}
          </div>
          <Button className="w-full mt-2" onClick={() => setResult(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
