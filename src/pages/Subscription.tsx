import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Clock, CheckCircle, ShieldCheck, AlertTriangle,
  Loader2, RotateCcw, CalendarDays, History, Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { subscriptionStore, TRIAL_DAYS_TOTAL, PLAN_PRICE_ZAR, type SubscriptionStatus } from "@/lib/subscription-store";
import { companyStore } from "@/lib/company-store";
import { useAuth } from "@/contexts/AuthContext";
import { emailService } from "@/lib/email-service";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const map: Record<SubscriptionStatus, { label: string; class: string }> = {
    trial:         { label: 'Free Trial Active',    class: 'bg-blue-100 text-blue-800 border-blue-200' },
    trial_expired: { label: 'Trial Expired',        class: 'bg-red-100 text-red-800 border-red-200' },
    active:        { label: 'Subscription Active',  class: 'bg-green-100 text-green-800 border-green-200' },
    expired:       { label: 'Subscription Expired', class: 'bg-red-100 text-red-800 border-red-200' },
    pending:       { label: 'Payment Pending',      class: 'bg-amber-100 text-amber-800 border-amber-200' },
    failed:        { label: 'Payment Failed',       class: 'bg-red-100 text-red-800 border-red-200' },
    grace_period:  { label: 'Grace Period',         class: 'bg-amber-100 text-amber-800 border-amber-200' },
    suspended:     { label: 'Suspended',            class: 'bg-red-100 text-red-800 border-red-200' },
  };
  const { label, class: cls } = map[status];
  return <Badge variant="outline" className={`${cls} text-xs font-semibold px-2.5 py-0.5 hover:${cls}`}>{label}</Badge>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Subscription() {
  const { role, username } = useAuth();
  const isAdmin      = role === 'admin';

  const [sub,        setSub]        = useState(() => subscriptionStore.get());
  const [loading,    setLoading]    = useState(false);
  const [verifying,  setVerifying]  = useState(false);
  const [showDemo,   setShowDemo]   = useState(false);

  const status       = sub.subscription_status;
  const daysLeft     = subscriptionStore.getTrialDaysLeft();
  const daysUsed     = subscriptionStore.getTrialDaysUsed();
  const trialPct     = subscriptionStore.getTrialPercent();
  const trialExpiry  = subscriptionStore.getTrialExpiryDate();
  const history      = subscriptionStore.getPaymentHistory();
  const isActive     = status === 'active';
  const isTrial      = status === 'trial';
  const isExpired    = status === 'trial_expired' || status === 'expired';
  const isPending    = status === 'pending';
  const company      = companyStore.get();

  // ── Handle Paystack redirect URL params ─────────────────────────────────────────
  // Paystack appends ?trxref={ref}&reference={ref} to the callback_url.
  useEffect(() => {
    const sp        = new URLSearchParams(window.location.search);
    const reference = sp.get('reference') ?? sp.get('trxref');

    if (reference) {
      setVerifying(true);
      window.history.replaceState({}, '', '/subscription');
      verifyPayment(reference);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Paystack: initialize payment ────────────────────────────────────────────────
  async function handleUpgrade() {
    setLoading(true);
    try {
      const res  = await fetch('/.netlify/functions/paystack-initialize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          company_id: sub.company_id,
          email:      company.email || `${username}@kasi-pos.app`,
          base_url:   window.location.origin,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.demo && isAdmin) { setShowDemo(true); return; }
        throw new Error(data.error ?? 'Failed to initialize payment');
      }

      subscriptionStore.setPending(data.reference);
      setSub(subscriptionStore.get());
      window.location.href = data.authorization_url;   // redirect to Paystack
    } catch (err: any) {
      toast.error(err.message ?? 'Could not start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Paystack: verify transaction after redirect ──────────────────────────────
  async function verifyPayment(reference: string) {
    try {
      const res  = await fetch('/.netlify/functions/paystack-verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ company_id: sub.company_id, reference }),
      });
      const data = await res.json();

      if (data.verified && data.status === 'active') {
        subscriptionStore.setActive(reference);
        setSub(subscriptionStore.get());
        toast.success('Payment successful! Your subscription is now active.');

        // Send payment success email
        const email = company.email || `${username}@kasi-pos.app`;
        emailService.sendPaymentSuccess({
          to: email,
          amount: data.data?.amount ? String(data.data.amount) : '55.00',
          reference,
          date: new Date().toLocaleDateString('en-ZA'),
          nextRenewal: new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }),
        });
      } else if (data.demo && isAdmin) {
        setShowDemo(true);
      } else {
        subscriptionStore.setFailed(reference);
        setSub(subscriptionStore.get());
        const statusMsg =
          data.status === 'failed' || data.status === 'abandoned'
            ? 'Payment was not completed. Please try again.'
            : 'Payment could not be verified. Contact support if payment was deducted.';
        toast.error(statusMsg);

        // Send payment failed email
        const email = company.email || `${username}@kasi-pos.app`;
        emailService.sendPaymentFailed({
          to: email,
          amount: '55.00',
          date: new Date().toLocaleDateString('en-ZA'),
          reason: statusMsg,
        });
      }
    } catch {
      toast.error('Could not verify payment. Please refresh the page.');
    } finally {
      setVerifying(false);
    }
  }

  function handleDemoActivate() {
    subscriptionStore.activateDemo();
    setSub(subscriptionStore.get());
    toast.success('Demo subscription activated. Full access restored.');
    setShowDemo(false);
  }

  // ── Gradient bar colour ──────────────────────────────────────────────────────
  const gradientClass = isActive
    ? 'from-accent to-accent/60'
    : isExpired
    ? 'from-destructive to-destructive/60'
    : isPending
    ? 'from-amber-500 to-amber-400'
    : 'from-primary via-secondary to-accent';

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscription</h1>
        <StatusBadge status={status} />
      </div>

      {/* Verifying overlay banner */}
      {verifying && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Verifying your payment with Paystack — please wait…
        </div>
      )}

      {/* Main card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${gradientClass}`} />
        <CardContent className="p-6 space-y-6">

          {/* Status icon + title */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isActive  ? 'bg-accent/20' :
              isExpired ? 'bg-destructive/20' :
              isPending ? 'bg-amber-100' :
              'bg-secondary/20'
            }`}>
              {isActive  ? <ShieldCheck className="w-6 h-6 text-accent" /> :
               isExpired ? <AlertTriangle className="w-6 h-6 text-destructive" /> :
               isPending ? <Loader2 className="w-6 h-6 text-amber-600 animate-spin" /> :
               <Clock className="w-6 h-6 text-secondary" />}
            </div>
            <div>
              <p className="text-lg font-bold">
                {isActive  ? `${company.businessName || 'Kasi P.O.S'} Pro` :
                 isExpired ? 'Trial Expired' :
                 isPending ? 'Payment Pending…' :
                 'Free Trial Active'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isActive  ? `Renews ${fmtDate(sub.next_renewal_date)}` :
                 isExpired ? 'Subscribe to continue using Kasi P.O.S' :
                 isPending  ? 'Awaiting payment confirmation' :
                 `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
              </p>
            </div>
          </div>

          {/* Trial countdown (trial only) */}
          {(isTrial || isExpired) && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Trial usage — {daysUsed} / {TRIAL_DAYS_TOTAL} days used</span>
                <span className="font-medium">{Math.round(trialPct)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isExpired ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${trialPct}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                Trial {isExpired ? 'ended' : 'expires'}: <span className="font-medium text-foreground">{fmtDate(trialExpiry.toISOString())}</span>
              </div>
            </div>
          )}

          {/* Active subscription info */}
          {isActive && (
            <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-accent flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Active Subscription — R{PLAN_PRICE_ZAR}/month
              </p>
              {sub.last_payment_date && (
                <p className="text-xs text-muted-foreground">Last payment: {fmtDate(sub.last_payment_date)}</p>
              )}
              {sub.next_renewal_date && (
                <p className="text-xs text-muted-foreground">Next renewal: <span className="font-medium text-foreground">{fmtDate(sub.next_renewal_date)}</span></p>
              )}
            </div>
          )}

          {/* Features list */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium">What's included:</p>
            {[
              'Unlimited sales & transactions',
              'Full inventory management',
              'Multi-user support (Admin + Cashiers)',
              'Daily sales reports & activity log',
              'Barcode scanning & generation',
              'Returns management',
              'Prepaid airtime & data sales',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {/* Trial-expired limitations */}
          {isExpired && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">Trial limitations now active:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Maximum 5 sales per day</li>
                <li>Cannot add new products</li>
                <li>Cannot add new users</li>
              </ul>
            </div>
          )}

          {/* Pricing block */}
          {!isActive && (
            <div className="rounded-xl bg-muted/50 border p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Subscription plan</p>
              <p className="text-3xl font-bold text-foreground">
                R{PLAN_PRICE_ZAR}<span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isExpired ? 'Subscribe now to unlock full access' : 'Subscribe before your trial ends — no interruptions'}
              </p>
            </div>
          )}

          {/* Upgrade CTA — admin only */}
          {!isActive && isAdmin && (
            <Button
              className="w-full h-12"
              variant={isExpired ? 'destructive' : 'default'}
              disabled={loading || verifying || isPending}
              onClick={handleUpgrade}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {loading   ? 'Creating checkout…' :
               verifying ? 'Verifying payment…' :
               isPending ? 'Payment pending…' :
               isExpired ? `Subscribe Now — R${PLAN_PRICE_ZAR}/month` :
               `Upgrade to Pro — R${PLAN_PRICE_ZAR}/month`}
            </Button>
          )}

          {/* Cashier read-only notice */}
          {!isActive && !isAdmin && (
            <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground text-center">
              Contact your administrator to manage the subscription.
            </div>
          )}

        </CardContent>
      </Card>

      {/* Payment history */}
      {history.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" /> Payment History
            </p>
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between text-sm rounded-lg border px-3 py-2.5">
                  <div>
                    <p className="font-medium">{fmtDate(h.date)}</p>
                    <p className="text-xs text-muted-foreground">{h.gateway} · {h.reference.slice(0, 16)}{h.reference.length > 16 ? '…' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">R {h.amount.toFixed(2)}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${h.status === 'success' ? 'border-green-300 text-green-700' : h.status === 'pending' ? 'border-amber-300 text-amber-700' : 'border-red-300 text-red-700'}`}
                    >
                      {h.status === 'success' ? '✓ Paid' : h.status === 'pending' ? '⏳ Pending' : '✗ Failed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo / fallback dialog (when Paystack is not yet configured) */}
      <Dialog open={showDemo} onOpenChange={setShowDemo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Activate Subscription
            </DialogTitle>
            <DialogDescription>
              Paystack is not yet configured. Add your <code className="text-xs bg-muted px-1 rounded">PAYSTACK_SECRET_KEY</code> to <code className="text-xs bg-muted px-1 rounded">.env</code> to enable live card payments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">To configure Paystack:</p>
              <p>1. Sign up at <span className="font-mono">paystack.com</span></p>
              <p>2. Copy your <span className="font-mono">Secret Key</span> (starts with <span className="font-mono">sk_test_...</span> or <span className="font-mono">sk_live_...</span>)</p>
              <p>3. Add <span className="font-mono">PAYSTACK_SECRET_KEY=sk_...</span> to your <span className="font-mono">.env</span> file</p>
              <p>4. Restart the dev server</p>
            </div>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">demo / testing only</span></div>
            </div>
            <Button className="w-full h-11" onClick={handleDemoActivate}>
              <ShieldCheck className="w-4 h-4 mr-2" /> Activate Demo Subscription
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowDemo(false)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
